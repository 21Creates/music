# 04 — Auth

## Auth Provider

**File:** `src/context/AuthContext.tsx`

The auth context wraps the entire app — `src/App.tsx:83`:
```typescript
<AuthProvider>
  <NotificationsProvider>
    <PremiumProvider>
      <AppContent />
```

## Session Establishment & Persistence

On mount, `AuthProvider` calls `supabase.auth.getSession()` (`AuthContext.tsx:41`) to check for an existing session. If a session exists, it loads the user's profile from the `profiles` table (`AuthContext.tsx:28-34`).

A `supabase.auth.onAuthStateChange` listener (`AuthContext.tsx:52`) fires on login/logout/token-refresh events and updates the user state.

The Supabase client is configured with `persistSession: true` and `autoRefreshToken: true` (`src/lib/supabase.ts:8-9`), so the session token is stored in browser localStorage and automatically refreshed.

## User Object / Type

**File:** `src/types/index.ts:1-7`
```typescript
export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}
```

The `user` state in `AuthContext` is `Profile | null` (`AuthContext.tsx:24`). Both `user` and `profile` are exposed and set to the same value (`AuthContext.tsx:97`).

## Sign In / Sign Up

- **signIn:** `supabase.auth.signInWithPassword({ email, password })` (`AuthContext.tsx:70`)
- **signUp:** `supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })` (`AuthContext.tsx:75-78`)
- **signOut:** `supabase.auth.signOut()` then `setUser(null)` (`AuthContext.tsx:83-86`)

No email confirmation, no magic links, no social providers — email/password only.

## Auto-Profile Creation on Signup

A database trigger `handle_new_user()` (`001_profiles_auth.sql:70-85`) fires `AFTER INSERT ON auth.users` and creates a `profiles` row. It is `SECURITY DEFINER` (`001:73`), so it bypasses RLS. The first user to register gets `is_admin = true` automatically (`001:81`):
```sql
(SELECT COUNT(*) = 0 FROM profiles)
```

## Admin Distinction — TWO separate mechanisms

### 1. Regular app admin (`profiles.is_admin` column)

The `is_admin` boolean column on `profiles` (`001:46`) marks a user as admin. The `is_admin()` SQL function (`001:99-109`) checks this:
```sql
SELECT COALESCE(
  (SELECT is_admin FROM profiles WHERE id = auth.uid()),
  false
)
```

This is used by RLS policies for `ads`, `premium_features`, `payment_details`, `app_settings`, `activity_logs`, `ad_impressions` tables to gate admin-only writes.

**However:** the client code NEVER checks `is_admin` on the Profile object to gate UI. The `user.is_admin` field exists in the type but is not referenced in any component for access control (confirmed by grep — NOT FOUND in any `user.is_admin` or `profile.is_admin` check in src/components or src/pages).

### 2. Admin dashboard — password-only gate (separate from login)

The admin page at `#/admin` (`App.tsx:30`) uses a **completely separate password-based auth** that does NOT require Supabase login.

**File:** `src/pages/AdminPage.tsx:133-216`

The admin enters a password (`AdminPage.tsx:182-188`) which is sent to the `verify_admin_password` RPC (`AdminPage.tsx:144`):
```typescript
const { data, error: rpcError } = await supabase.rpc('verify_admin_password', { p_password: password });
```

The `verify_admin_password` function (`1a_fix_admin_credentials.sql:43`) compares against `admin_password_hash` in `app_settings` using `crypt()`:
```sql
SELECT EXISTS (
  SELECT 1 FROM app_settings
  WHERE id = 1 AND admin_password_hash = crypt(p_password, admin_password_hash)
);
```

Once verified, the password is kept in React state and passed to every subsequent admin RPC call as `p_password`.

**History:** Migration `009` originally added `admin_password` as plaintext with default `'admin123'` (`009:44`). Migration `1a` replaced it with `admin_password_hash` (using `crypt()`/`pgcrypto`) and dropped the plaintext column (`1a:71`). Migration `1a:43-69` creates the hashed version.

The `admin_password_hash` column is protected: `REVOKE SELECT (admin_password_hash) ON app_settings FROM authenticated` (`6c:18`). Only the `verify_admin_password` function (SECURITY DEFINER) can read it.

### Admin RPC access model

All admin RPC functions accept `p_password` as their first argument and internally call `verify_admin_password(p_password)`. They are granted to `anon, authenticated` (`7a_restore_anon_admin_rpc_grants.sql:21-61`) — meaning **the admin dashboard works without any Supabase login**. The password IS the auth.

## Route Guards

| Route | Guard | File:line | Condition |
|---|---|---|---|
| `/admin` | None (password gate) | `App.tsx:30` | Rendered before auth check — accessible to anyone, but requires password |
| `/` (Home) | Auth required | `App.tsx:45` | `if (!user) return <AuthScreen />` |
| `/room` | Auth required | `App.tsx:45,55` | Same auth check |
| `/profile` | Auth required | `App.tsx:45,56` | Same auth check |
| `/offline` | Auth required | `App.tsx:45,57` | Same auth check |
| `/not-found` | Auth required | `App.tsx:45,58` | Same auth check |

The auth guard is a single check: `if (!user) return <AuthScreen />` (`App.tsx:45`). There is no per-route guard beyond this. The admin route bypasses this check entirely (`App.tsx:30` — returns before the `!user` check).

## Shared Admin Credentials

The admin password hash is stored in `app_settings.admin_password_hash` in the database. The default was `'admin123'` (plaintext, in migration `009:44`) but was replaced with a bcrypt/crypt hash in migration `1a`.

**No hardcoded credentials exist in the client code.** The password is entered by the user at the admin login screen and held only in React state.

## Password Change

`admin_change_password(p_password, p_new_password)` (`1a:74`) verifies the current password and updates the hash. Called from `AdminPage.tsx` Settings tab (confirmed by the RPC name appearing in the client RPC list).

## Logout

Regular users: `signOut()` calls `supabase.auth.signOut()` (`AuthContext.tsx:84`), clears user state. The `onAuthStateChange` listener picks this up.

Admin: `handleLogout()` (`AdminPage.tsx:155-158`) just clears the password state — no server-side session to end.
