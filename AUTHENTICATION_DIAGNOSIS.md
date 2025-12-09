# AUTHENTICATION DIAGNOSIS REPORT

**Date:** December 10, 2025 (Updated)
**Status:** CRITICAL - Login Not Working
**Reported Error:** 501 (Not Implemented)

---

## EXECUTIVE SUMMARY

**ROOT CAUSE: MISSING ENVIRONMENT CONFIGURATION**

The application cannot authenticate because **no `.env` or `.env.local` file exists**. The Supabase client initialization will throw an error immediately because `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are undefined.

### Quick Fix (TL;DR)

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials from https://supabase.com/dashboard → Settings → API
3. Add `VITE_ENABLE_TEST_ACCOUNTS=true`
4. Run `npm run dev`
5. Login with `admin / admin`

---

## 1. EXACT ERROR DETAILS

### Primary Error: Missing Environment Variables
**Location:** `src/lib/supabase.ts:7-9`

```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
```

This error is thrown at app initialization, before any login attempt can even be made.

### Why You're Seeing Error 501

Error 501 (Not Implemented) is NOT coming from the UDS-POS application. The application code does NOT contain any 501 error responses. The defined error codes are:

- 400: Validation errors
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 429: Rate Limited
- 500: Internal Server Error
- 503: Service Unavailable
- 504: Gateway Timeout

**The 501 error is likely coming from:**
1. Browser auto-generated error when the app fails to initialize
2. A proxy or CDN returning 501 for unhandled requests
3. Supabase edge functions not deployed (returning 501 for non-existent endpoints)
4. n8n webhook service returning 501 if misconfigured

---

## 2. ENVIRONMENT SETUP ANALYSIS

### Files Found:
- `.env.example` - EXISTS (template only)
- `mobile-app/.env.example` - EXISTS (template only)
- `.env` - **MISSING**
- `.env.local` - **MISSING**

### Required Environment Variables (from `.env.example`):

```bash
# REQUIRED - Without these, the app will not start
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# OPTIONAL - Features will be disabled without these
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
VITE_SENTRY_DSN=your-sentry-dsn-here
VITE_N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com/webhook
VITE_ENABLE_TEST_ACCOUNTS=true
```

### What's Missing:
| Variable | Status | Impact |
|----------|--------|--------|
| `VITE_SUPABASE_URL` | **MISSING** | App will crash on load |
| `VITE_SUPABASE_ANON_KEY` | **MISSING** | App will crash on load |
| `VITE_ENABLE_TEST_ACCOUNTS` | NOT SET | Test accounts won't work |
| `VITE_N8N_WEBHOOK_BASE_URL` | NOT SET | Webhooks disabled (non-critical) |
| `VITE_GOOGLE_MAPS_API_KEY` | NOT SET | Maps disabled (non-critical) |

---

## 3. AUTHENTICATION SYSTEM IMPLEMENTATION

### Library Used: **Supabase Auth**

### Authentication Methods Supported:
1. **Email/Password** - Standard login via `supabase.auth.signInWithPassword()`
2. **Phone OTP** - SMS verification via `supabase.auth.signInWithOtp()`
3. **Test Accounts** - Development-only bypass (requires `VITE_ENABLE_TEST_ACCOUNTS=true`)

### Test Account Credentials (when enabled):

| Username | Password | Role |
|----------|----------|------|
| admin | admin | admin |
| test | test | engineer |
| super | super | super_admin |

**Important:** Test accounts only work when:
- Running in development mode (`import.meta.env.DEV` is true)
- OR `VITE_ENABLE_TEST_ACCOUNTS=true` AND not in production build

### Authentication Flow:
```
1. User enters credentials
   ↓
2. AuthContext.signIn() called
   ↓
3. Check if test account (dev only)
   ↓
4. If not test: supabase.auth.signInWithPassword()
   ↓
5. On success: loadProfile() from user_profiles table
   ↓
6. Profile found? → Dashboard
   Profile not found? → Profile Setup
   Status pending? → Pending Approval page
```

### Key Authentication Files:
- `src/contexts/AuthContext.tsx` - Main auth provider
- `src/lib/supabase.ts` - Supabase client (FAILS here)
- `src/pages/Login.tsx` - Simple login form
- `src/pages/EnhancedLogin.tsx` - Email/Phone login form
- `src/pages/mobile/MobileLogin.tsx` - Mobile engineer login
- `src/components/ProtectedRoute.tsx` - Route protection

---

## 4. DATABASE SCHEMA ANALYSIS

### User Tables Required:

**`user_profiles` table** (links to `auth.users`):
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  role user_role DEFAULT 'engineer',  -- admin, engineer, super_admin
  bank_id uuid REFERENCES banks(id),
  status text DEFAULT 'pending_approval',  -- active, pending_approval, inactive
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### RLS (Row Level Security):
- All tables have RLS enabled
- Users can only access their own profile
- Admins can access all profiles in their bank
- Super admins have full access

### Required Database Setup:
1. Migrations applied in Supabase
2. `auth.users` table populated (Supabase manages this)
3. `user_profiles` table populated with matching user records
4. User status must be 'active' to access dashboard

---

## 5. ROOT CAUSE ANALYSIS

### Priority 1: CRITICAL - Environment Variables Missing
```
IMPACT: App crashes immediately on load
CAUSE: No .env file exists
FIX: Create .env file with Supabase credentials
```

### Priority 2: HIGH - Test Accounts Not Enabled
```
IMPACT: Cannot use admin/admin, test/test logins
CAUSE: VITE_ENABLE_TEST_ACCOUNTS not set
FIX: Add VITE_ENABLE_TEST_ACCOUNTS=true to .env
```

### Priority 3: MEDIUM - Database May Not Be Set Up
```
IMPACT: Even with correct credentials, no users exist
CAUSE: Migrations may not have been applied
FIX: Run Supabase migrations and create test users
```

### Priority 4: LOW - Edge Functions May Not Be Deployed
```
IMPACT: API operations fail with errors
CAUSE: Functions not deployed to Supabase
FIX: Deploy edge functions using Supabase CLI
```

---

## 6. WHAT NEEDS TO BE FIXED (Priority Order)

### Step 1: Create .env File (IMMEDIATE)

Create file `.env` in project root with:

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-from-supabase-dashboard

# Enable Test Accounts (REQUIRED for testing)
VITE_ENABLE_TEST_ACCOUNTS=true

# Optional Features
# VITE_GOOGLE_MAPS_API_KEY=
# VITE_GEMINI_API_KEY=
# VITE_SENTRY_DSN=
# VITE_N8N_WEBHOOK_BASE_URL=
```

**How to get Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project (or create one)
3. Go to Settings > API
4. Copy "Project URL" → `VITE_SUPABASE_URL`
5. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

### Step 2: Verify Supabase Project Setup

1. Ensure Supabase project exists
2. Check if migrations have been applied:
   - Go to Supabase Dashboard > Database > Tables
   - Verify these tables exist: `user_profiles`, `banks`, `devices`, `calls`
3. If tables don't exist, run migrations:
   ```bash
   npx supabase db push
   ```

### Step 3: Create Test Users in Supabase

Option A: Use Supabase Dashboard
1. Go to Authentication > Users
2. Click "Add user"
3. Create: admin@uds.test / admin123

Option B: Use SQL (in SQL Editor):
```sql
-- First, create a user via Auth (this must be done via Auth API or Dashboard)
-- Then link the profile:

INSERT INTO user_profiles (id, email, full_name, role, status)
VALUES (
  'USER-UUID-FROM-AUTH',  -- Get this from auth.users
  'admin@uds.test',
  'Test Admin',
  'admin',
  'active'
);
```

### Step 4: Deploy Edge Functions (If Using API Features)

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR-PROJECT-ID

# Deploy all functions
supabase functions deploy
```

### Step 5: Verify Login Works

1. Start the dev server: `npm run dev`
2. Open browser console (F12)
3. Try logging in with:
   - Test account: admin / admin (if VITE_ENABLE_TEST_ACCOUNTS=true)
   - Real account: admin@uds.test / admin123 (if user created in Supabase)

---

## 7. DIAGNOSTIC CHECKLIST

Run through this checklist after making fixes:

- [ ] `.env` file exists in project root
- [ ] `VITE_SUPABASE_URL` is set and correct
- [ ] `VITE_SUPABASE_ANON_KEY` is set and correct
- [ ] `VITE_ENABLE_TEST_ACCOUNTS=true` for development
- [ ] `npm run dev` starts without errors
- [ ] Browser console shows no "Missing Supabase" errors
- [ ] Login form appears without errors
- [ ] Test account login works (admin/admin)
- [ ] After login, dashboard loads (not error page)

---

## 8. ADDITIONAL NOTES

### The 501 Error Source

Since error 501 doesn't exist in the codebase, it's coming from one of:

1. **Vite dev server** - If app fails to initialize, Vite may return 501
2. **Supabase** - Non-existent edge functions return 501
3. **Browser/Network** - Unhandled request to non-existent endpoint
4. **n8n Webhook** - If VITE_N8N_WEBHOOK_BASE_URL points to invalid endpoint

### Webhook Integration (Optional)

The n8n webhook integration is OPTIONAL. If `VITE_N8N_WEBHOOK_BASE_URL` is not set:
- Webhook calls silently fail (return success: false)
- Core functionality is not affected
- Set it only if you have an n8n instance configured

### Mobile App Configuration

The mobile app (`mobile-app/`) has its own `.env.example`:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## CONCLUSION

**The login failure is caused by missing environment configuration.** The `.env` file does not exist, causing the Supabase client to throw an error before any authentication can occur.

**Immediate Action Required:**
1. Create `.env` file with Supabase credentials
2. Set `VITE_ENABLE_TEST_ACCOUNTS=true`
3. Restart the development server

Once environment variables are configured, the test accounts (admin/admin, test/test, super/super) should work immediately in development mode.

---

## 9. COMPLETE FILE ANALYSIS

### Files Analyzed During Diagnosis:

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/supabase.ts` | Supabase client init | **FAILS** - env vars missing |
| `src/contexts/AuthContext.tsx` | Auth state management | OK - has test account bypass |
| `src/pages/EnhancedLogin.tsx` | Main login page | OK |
| `src/pages/Login.tsx` | Simple login | OK |
| `src/components/ProtectedRoute.tsx` | Route guard | OK |
| `src/components/ErrorBoundary.tsx` | Error handling | OK |
| `supabase/functions/auth-validator/index.ts` | Edge function | OK |
| `.env.example` | Template | EXISTS |
| `.env` | Actual config | **MISSING** |
| `.env.local` | Local config | **MISSING** |

### Database Migrations Available:

33 migration files exist in `supabase/migrations/` covering:
- Initial schema (001)
- RLS policies (002, 006)
- User profiles enhancement (004)
- Photos, stock movements, engineer aggregates (005-010)
- Assignment helpers (011)
- Idempotency system (012)
- QR photo evidence (013)
- Security fixes (014)
- Super admin support (017)
- Permissions system (018)

### Edge Functions Available:

15 edge functions exist (need deployment):
- `assign-calls` - Call assignment logic
- `auth-validator` - Token validation
- `bulk-import-devices` - CSV import
- `create-admin` - Admin user creation
- `create-test-engineer` - Test data
- `issue-device-to-engineer` - Device issuance
- `mark-device-faulty` - Fault reporting
- `reconciliation-export` - Data export
- `scan-device` - QR/barcode scanning
- `start-call` - Call initiation
- `submit-call-completion` - Call completion
- `swap-device` - Device swap
- `transfer-device` - Device transfer
- `trigger-webhook` - External webhooks
- `upload-photo` - Photo uploads

---

## 10. VERIFICATION COMMANDS

After fixing, run these to verify:

```bash
# 1. Check if .env exists and has required vars
cat .env | grep VITE_SUPABASE

# 2. Start dev server
npm run dev

# 3. Open browser console (F12) and look for:
#    - NO "Missing Supabase environment variables" error
#    - NO red error messages
#    - Auth state loading should complete

# 4. Test login with: admin / admin
```

---

## 11. IF STILL NOT WORKING

### Scenario A: App loads but login fails with "Invalid credentials"
- **Cause:** Test accounts not enabled
- **Fix:** Ensure `VITE_ENABLE_TEST_ACCOUNTS=true` is set
- **Note:** Only works in dev mode (`npm run dev`), NOT production builds

### Scenario B: App loads but shows "Something went wrong" error
- **Cause:** Error boundary caught an exception
- **Fix:** Check browser console for actual error message
- **Common issues:** Invalid Supabase URL format, expired anon key

### Scenario C: Login works but redirects to Profile Setup
- **Cause:** User authenticated but no profile in `user_profiles` table
- **Fix:** Run migrations in Supabase, then either:
  - Use test accounts (they have mock profiles)
  - Create profile via SQL in Supabase Dashboard

### Scenario D: Login works but redirects to Pending Approval
- **Cause:** Profile exists but status is 'pending_approval'
- **Fix:** Update profile status to 'active' in Supabase Dashboard

### Scenario E: 501 error persists after env setup
- **Cause:** Edge functions not deployed
- **Fix:** Deploy functions using Supabase CLI:
  ```bash
  npx supabase functions deploy --project-ref YOUR_PROJECT_ID
  ```

---

## 12. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                     UDS-POS Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │   React     │      │  Supabase   │      │  Supabase   │ │
│  │  Frontend   │─────▶│    Auth     │─────▶│  Database   │ │
│  │  (Vite)     │      │             │      │  (Postgres) │ │
│  └─────────────┘      └─────────────┘      └─────────────┘ │
│         │                                         ▲         │
│         │                                         │         │
│         ▼                                         │         │
│  ┌─────────────┐                          ┌──────┴──────┐  │
│  │  Supabase   │                          │    RLS      │  │
│  │   Edge      │──────────────────────────│  Policies   │  │
│  │ Functions   │                          │             │  │
│  └─────────────┘                          └─────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Required Environment Variables:                             │
│  • VITE_SUPABASE_URL        - Project URL                   │
│  • VITE_SUPABASE_ANON_KEY   - Anonymous key                 │
│  • VITE_ENABLE_TEST_ACCOUNTS - For dev testing              │
└─────────────────────────────────────────────────────────────┘
```

---

**END OF DIAGNOSIS REPORT**
