-- 0004_extras.sql
-- ROLLBACK: drop table code_attempts, plan_features, ads, push_subscriptions cascade;
--   drop function public.admin_save_features(jsonb), public.admin_list_ads(), public.admin_create_ad(text,text,text),
--   public.admin_delete_ad(uuid), public.admin_set_artwork(uuid,text), public.register_push(text,text,text), public.unregister_push(text);
--   then restore is_admin() and join_room_by_code() from 0001.

-- Admin must have completed two-step login (aal2) for every admin action.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' $$;

-- Invite-code rate limit: 10 wrong codes per user per hour.
create table public.code_attempts (user_id uuid not null, at timestamptz not null default now());
create index code_attempts_idx on public.code_attempts (user_id, at);
alter table public.code_attempts enable row level security; -- no policies: only the function below touches it
create or replace function public.join_room_by_code(p_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from code_attempts where at < now() - interval '1 day';
  if (select count(*) from code_attempts where user_id = auth.uid() and at > now() - interval '1 hour') >= 10 then raise exception 'RATE_LIMITED'; end if;
  select id into rid from rooms where invite_code = upper(trim(p_code));
  if rid is null then insert into code_attempts(user_id) values (auth.uid()); return null; end if;
  insert into room_members(room_id, user_id, status, joined_via, decided_at) values (rid, auth.uid(), 'active', 'invite', now())
    on conflict (room_id, user_id) do update set status = 'active', decided_at = now() where room_members.status <> 'active';
  return rid;
end $$;

-- Premium feature list (public read, admin write via function)
create table public.plan_features (id uuid primary key default gen_random_uuid(), label text not null check (char_length(label) between 1 and 120),
  enabled boolean not null default true, sort_order int not null default 0);
alter table public.plan_features enable row level security;
grant select on public.plan_features to anon, authenticated;
create policy p_feat_read on public.plan_features for select using (true); -- features are public marketing text
create function public.admin_save_features(p_features jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_features) <> 'array' then raise exception 'INVALID'; end if;
  delete from plan_features where true;
  insert into plan_features(label, enabled, sort_order)
    select trim(e ->> 'label'), coalesce((e ->> 'enabled')::boolean, true), ord::int from jsonb_array_elements(p_features) with ordinality as t(e, ord);
end $$;

-- Track artwork
create function public.admin_set_artwork(p_track uuid, p_path text) returns void language plpgsql security definer set search_path = public as $$
begin if not is_admin() then raise exception 'FORBIDDEN'; end if; update tracks set artwork_path = p_path where id = p_track; end $$;

-- Ads (upload only; nothing displays them yet)
create table public.ads (id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 1 and 80),
  video_path text not null, poster_path text, is_active boolean not null default false, created_at timestamptz not null default now());
alter table public.ads enable row level security; -- no policies: admin functions only
create function public.admin_list_ads() returns setof public.ads language plpgsql stable security definer set search_path = public as
$$ begin if not is_admin() then raise exception 'FORBIDDEN'; end if; return query select * from ads order by created_at desc; end $$;
create function public.admin_create_ad(p_name text, p_video text, p_poster text) returns void language plpgsql security definer set search_path = public as
$$ begin if not is_admin() then raise exception 'FORBIDDEN'; end if; insert into ads(name, video_path, poster_path) values (trim(p_name), p_video, p_poster); end $$;
create function public.admin_delete_ad(p_id uuid) returns void language plpgsql security definer set search_path = public as
$$ begin if not is_admin() then raise exception 'FORBIDDEN'; end if; delete from ads where id = p_id; end $$;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('ads', 'ads', true, 209715200, array['video/mp4','video/webm','image/jpeg','image/webp','image/png']) on conflict (id) do nothing;
create policy ads_read on storage.objects for select using (bucket_id = 'ads'); -- ad media is intentionally public
create policy ads_admin_write on storage.objects for all to authenticated using (bucket_id = 'ads' and public.is_admin()) with check (bucket_id = 'ads' and public.is_admin());

-- Push subscriptions
create table public.push_subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null, created_at timestamptz not null default now());
alter table public.push_subscriptions enable row level security; -- no policies: functions + service role only
create function public.register_push(p_endpoint text, p_p256dh text, p_auth text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into push_subscriptions(user_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth)
    on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
create function public.unregister_push(p_endpoint text) returns void language sql security definer set search_path = public as
$$ delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid() $$;

revoke execute on function public.admin_save_features(jsonb), public.admin_set_artwork(uuid,text), public.admin_list_ads(),
  public.admin_create_ad(text,text,text), public.admin_delete_ad(uuid), public.register_push(text,text,text), public.unregister_push(text)
  from public, anon, authenticated;
grant execute on function public.admin_save_features(jsonb), public.admin_set_artwork(uuid,text), public.admin_list_ads(),
  public.admin_create_ad(text,text,text), public.admin_delete_ad(uuid), public.register_push(text,text,text), public.unregister_push(text) to authenticated;
