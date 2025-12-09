# Testing Authentication Guide

## Quick Test (No Database Setup Required)

The fastest way to test authentication is using the built-in test accounts that work entirely in the frontend.

### Prerequisites

1. `.env` file exists with Supabase credentials
2. `VITE_ENABLE_TEST_ACCOUNTS=true` in `.env`
3. Running in development mode (`npm run dev`)

### Test Accounts

| Username | Password | Role | Access Level |
|----------|----------|------|--------------|
| `admin` | `admin` | Admin | Full dashboard access |
| `test` | `test` | Engineer | Limited access, assigned calls only |
| `super` | `super` | Super Admin | Full system access |

### Testing Steps

#### 1. Start the Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

#### 2. Test Admin Login

1. Go to http://localhost:5173/login
2. Enter: `admin` / `admin`
3. Click "Sign In"
4. **Expected Result:** Redirected to `/dashboard`
5. **Verify:**
   - Dashboard loads without errors
   - Can see all menu items (Devices, Calls, Engineers, etc.)
   - User name shows "Test Admin" in the header

#### 3. Test Engineer Login

1. Log out (click user menu → Sign Out)
2. Go to http://localhost:5173/login
3. Enter: `test` / `test`
4. Click "Sign In"
5. **Expected Result:** Redirected to `/dashboard`
6. **Verify:**
   - Dashboard loads
   - Some menu items may be hidden (admin-only features)
   - User name shows "Test Engineer"

#### 4. Test Super Admin Login

1. Log out
2. Enter: `super` / `super`
3. Click "Sign In"
4. **Expected Result:** Redirected to `/dashboard`
5. **Verify:**
   - Full access to all features
   - Can access User Management

#### 5. Test Logout

1. Click the user avatar/menu in the header
2. Click "Sign Out"
3. **Expected Result:** Redirected to `/login`
4. **Verify:**
   - Session cleared
   - Cannot access `/dashboard` without logging in

#### 6. Test Protected Routes

1. Without logging in, try to access http://localhost:5173/dashboard
2. **Expected Result:** Redirected to `/login`
3. Log in, then try to access the dashboard
4. **Expected Result:** Dashboard loads normally

---

## Full Database Test (Production-Like)

### Prerequisites

1. Supabase project configured
2. Migrations run (see `DATABASE_SETUP_INSTRUCTIONS.md`)
3. Test users created in Supabase

### Test Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@uds.com` | `Admin@123` | Admin |
| `engineer@uds.com` | `Engineer@123` | Engineer |

### Testing Steps

1. Disable test accounts by removing `VITE_ENABLE_TEST_ACCOUNTS` from `.env`
2. Restart the dev server
3. Try logging in with `admin@uds.com` / `Admin@123`
4. **Expected Result:**
   - User authenticated via Supabase
   - Profile loaded from `user_profiles` table
   - Redirected to dashboard

---

## Common Issues and Solutions

### Issue: "Invalid email or password"

**For test accounts (admin/admin):**
- Check `VITE_ENABLE_TEST_ACCOUNTS=true` in `.env`
- Make sure you're running `npm run dev` (not production build)
- Restart the dev server after changing `.env`

**For Supabase accounts:**
- Verify user exists in Supabase Dashboard → Authentication → Users
- Check password is correct
- Verify email is confirmed

### Issue: Login succeeds but redirects to Profile Setup

- User exists in `auth.users` but not in `user_profiles` table
- Run the migration: `migrations/auth_setup_complete.sql`
- Or manually create profile in SQL Editor

### Issue: Login succeeds but redirects to Pending Approval

- User's profile has `status = 'pending_approval'`
- Update in Supabase: `UPDATE user_profiles SET status = 'active' WHERE email = 'user@email.com';`

### Issue: "Missing Supabase environment variables"

- Create `.env` file if it doesn't exist
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Get values from Supabase Dashboard → Settings → API

### Issue: Console shows network errors

- Check internet connection
- Verify Supabase project is active
- Check browser console for CORS errors

### Issue: 501 Not Implemented error

- This error comes from Edge Functions not being deployed
- **Quick fix:** The app should still work for basic auth - edge functions are only needed for advanced features
- **Full fix:** Deploy edge functions with `npx supabase functions deploy`

---

## What to Check After Login

### Admin Dashboard

- [ ] Dashboard loads without errors
- [ ] KPI cards show data (or zeros if no data)
- [ ] Charts render (may be empty)
- [ ] Side navigation works
- [ ] Can access all menu items

### Protected Features

- [ ] `/devices` - Device management page
- [ ] `/calls` - Call management page
- [ ] `/engineers` - Engineer management (admin only)
- [ ] `/banks` - Bank management (admin only)
- [ ] `/reports` - Reports (admin only)

### Session Persistence

- [ ] Refresh the page - should stay logged in
- [ ] Close and reopen browser - should stay logged in (if "Remember me")
- [ ] Log out and in - should work correctly

---

## Browser Console Checks

Open browser DevTools (F12) → Console tab.

### No errors should appear for:
- ✅ Successful login
- ✅ Page navigation
- ✅ Data loading

### Acceptable warnings:
- ⚠️ "Profile not found" - OK for new users
- ⚠️ React key warnings - cosmetic, not critical

### Errors requiring attention:
- ❌ "Missing Supabase environment variables"
- ❌ "NetworkError" or "Failed to fetch"
- ❌ "Invalid JSON"
- ❌ Any red error messages

---

## Test Checklist

```
[ ] npm run dev starts without errors
[ ] Login page loads at /login
[ ] admin / admin login works
[ ] test / test login works
[ ] super / super login works
[ ] Dashboard loads after login
[ ] Logout works
[ ] Protected routes redirect to login
[ ] No console errors during normal use
[ ] Session persists on page refresh
```

---

## Need Help?

1. Check `AUTHENTICATION_DIAGNOSIS.md` for detailed troubleshooting
2. Check `DATABASE_SETUP_INSTRUCTIONS.md` for database setup
3. Review browser console for specific error messages
