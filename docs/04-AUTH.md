# 04 — Auth

## Auth Provider (`src/context/AuthContext.tsx`)

Wraps entire app (`App.tsx:83`): `<AuthProvider>` -> `<NotificationsProvider>` -> `<PremiumProvider>` -> `<AppContent>`.

## Session Establishment
- On mount: `supabase.auth.getSession()` (`AuthContext.tsx:41`), then loads profile from `profiles` table
- `onAuthStateChange` listener (`AuthContext.tsx:52`) updates user state
- `persistSession: true`, `autoRefreshToken: true` (`src/lib/supabase.ts:8-9`) — token in localStorage, auto-refreshed

## User Type (`src/types/index.ts:1-7`)
```typescript
export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}
```

## Sign In / Sign Up / Sign Out
- **signIn:** `supabase.auth.signInWithPassword({ email, password })` (`AuthContext.tsx:70`)
- **signUp:** `supabase.auth.signUp({ email, password, options: { data: { display_name } } })` (`AuthContext.tsx:75-78`)
- **signOut:** `supabase.auth.signOut()` + `setUser(null)` (`AuthContext.tsx:83-86`)

No email confirmation, no magic links, no social providers.

## Auto-Profile Creation
Trigger `handle_new_user()` (`001_profiles_auth.sql:70-85`) fires `AFTER INSERT ON auth.users`, creates `profiles` row. `SECURITY DEFINER` (bypasses RLS). First user gets `is_admin = true` automatically.

## Dual Admin Auth

### 1. Regular app admin (`profiles.is_admin` column)
The `is_admin` boolean on `profiles` (`001:46`). The `is_admin()` SQL function (`001:99-109`) checks this. Used by RLS policies for admin-only writes. However, client code NEVER checks `is_admin` to gate UI — the field exists but is not referenced for access control.

### 2. Admin dashboard — password-only gate (separate from login)
Admin page at `#/admin` (`App.tsx:30`) uses a completely separate password-based auth that does NOT require Supabase login.

- Admin enters password (`AdminPage.tsx:182-188`) -> sent to `verify_admin_password` RPC (`AdminPage.tsx:144`)
- `verify_admin_password` (`1a_fix_admin_credentials.sql:43`) compares against `admin_password_hash` using `crypt()`/`pgcrypto`
- Password kept in React state, passed as `p_password` to every admin RPC
- Admin RPCs granted to `anon, authenticated` (`7a_restore_anon_admin_rpc_grants.sql:21-61`) — admin dashboard works without Supabase login

### Password history
- Migration `009`: plaintext `admin_password` default `admin123`
- Migration `1a`: replaced with `admin_password_hash` (crypt hash), dropped plaintext column
- `admin_password_hash` protected: `REVOKE SELECT` from authenticated (`6c:18`), only `verify_admin_password` (SECURITY DEFINER) can read it

## Route Guards
| Route | Guard | Condition |
|---|---|---|
| `/admin` | Password gate | Rendered before auth check (`App.tsx:30`) — accessible without login |
| All other routes | Auth required | `if (!user) return <AuthScreen />` (`App.tsx:45`) |

No per-route guard beyond single auth check. No route-level premium guard — premium features gated at component level.

## Password Change
`admin_change_password(p_password, p_new_password)` (`1a:74`) — called from `AdminPage.tsx:2418` Settings tab. Enforces only 4-char minimum (`AdminPage.tsx:2416`).
