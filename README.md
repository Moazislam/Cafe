# Cafe Management V1

Single-cafe operations dashboard built with React, Vite, and Supabase.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In the Supabase SQL editor, run the SQL files in `supabase/migrations` in numeric order. Migration `003_harden_rpc_and_realtime.sql` locks down operational RPCs and enables Realtime for the live dashboard.
4. In Supabase Authentication, create an admin or staff email/password user. The migration creates a `STAFF` profile automatically and uses the first part of the email as the default username.
5. Start the app with `npm run dev`.

To make a profile an administrator, run this in the SQL editor after the user has signed in once:

```sql
update public.profiles set role = 'ADMIN' where id = 'AUTH_USER_UUID';
```

## Deploy to Cloudflare Pages

Use build command `npm run build` and output directory `dist`. Add the two `VITE_SUPABASE_*` variables in the Cloudflare Pages project settings.

The `_redirects` file keeps client-side routes working on refresh.
