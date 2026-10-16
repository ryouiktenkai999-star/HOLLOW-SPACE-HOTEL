# Hollow Space Hotel

A React and Vite hotel booking app with client authentication, room reservations,
a waiting queue, and an admin dashboard. Supabase provides authentication and
booking/access-history storage.

## Run locally

1. Install dependencies with `npm install`.
2. Set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or
   `VITE_SUPABASE_ANON_KEY` in `.env.local`.
3. Start the development server with `npm run dev`.

Available checks:

- `npm run lint`
- `npm run build`

## Routes

- `/client-login` — client sign-in
- `/register` — client registration
- `/rooms` — room listings
- `/booking` — reservation form, personal booking history, cancellation, and waiting list
- `/admin` — admin dashboard and access history

## Client booking management

Before using client reservations, run
[`supabase/client_booking_management.sql`](./supabase/client_booking_management.sql)
in the Supabase SQL Editor. The migration adds booking ownership and stable
client booking references, applies owner/admin Row Level Security, and creates
the persistent waiting-list table and guarded booking/cancellation functions.
It checks for the booking columns already used by the app and stops if the live
date columns are not PostgreSQL `date` values.

Existing booking rows receive a booking reference and booking timestamp, but
their owner remains `NULL`: the app cannot safely infer which account made an
older booking. They remain visible to admins and are not exposed to clients.
The room catalog has no room counts, so availability conservatively treats
each room type as one reservable unit. Waiting-list requests are stored for
admin review; automatic availability notifications are not configured.

## Admin setup

The admin dashboard uses Supabase Auth. Create the admin account under
**Authentication → Users**, then assign its server-managed admin role in the
Supabase SQL Editor using the account's Auth user ID:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = 'YOUR_AUTH_USER_ID';
```

Sign out and back in after changing the role so the session receives the updated
claim. Only accounts with `app_metadata.role = 'admin'` can read access history
or record admin sign-ins/sign-outs.

To enable access-history logging, run
[`supabase/admin_access_logs.sql`](./supabase/admin_access_logs.sql) in the
Supabase SQL Editor. Anonymous page views are stored without an identity. Never
put a Supabase `service_role` key in the browser app.

For local development only, optional `VITE_ADMIN_TEST_EMAIL` and
`VITE_ADMIN_TEST_PASSWORD` values can prefill the admin login form. Keep them in
an ignored development environment file; never set a test password in a
production build.
