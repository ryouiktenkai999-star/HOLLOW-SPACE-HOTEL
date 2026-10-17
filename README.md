# HOLLOW-SPACE-HOTEL

Hollow Space Hotel web application built with React, Vite, React Router, and Supabase.

---

## Deploying to Vercel

This repository is pre-configured to deploy seamlessly to [Vercel](https://vercel.com).

### Quick Deployment Steps:

1. **Import the Git Repository** into your Vercel Dashboard.
2. **Framework Preset**: Vercel will detect **Vite**.
3. **Root Directory**:
   - You can leave Root Directory as `./` (the root configuration will automatically build `hollow-space-hotel` and output `hollow-space-hotel/dist`).
   - Or you can set Root Directory to `hollow-space-hotel`. Both options work!
4. **Environment Variables**:
   In your Vercel Project Settings under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: `https://izbruprsersqpeoaomez.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6YnJ1cHJzZXJzcXBlb2FvbWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTEwMzQsImV4cCI6MjEwNTk4NzAzNH0.p-KdCMorhd0EnyG3MYYQvGGfl6kv_2cY51FG7VFRnP4`
5. Click **Deploy**.

### Included Vercel Configurations:
- **SPA Client Routing**: `vercel.json` rewrites all route requests (`/client-login`, `/rooms`, `/booking`, `/admin`, `/register`) to `/index.html` to eliminate 404 errors on page reload.
- **Fail-safe Supabase Client**: Guards against invalid or unconfigured URLs during deployment so the app loads smoothly.
- **Root Delegation**: Root `package.json` and root `vercel.json` forward build commands to the Vite application.
