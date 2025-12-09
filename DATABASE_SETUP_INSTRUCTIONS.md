# Database Setup Instructions

## Quick Start

### Option 1: Use Test Accounts (Fastest - No Database Setup Needed)

If you just want to test the app quickly:

1. Make sure `.env` has `VITE_ENABLE_TEST_ACCOUNTS=true`
2. Run `npm run dev`
3. Login with:
   - **Admin**: `admin` / `admin`
   - **Engineer**: `test` / `test`
   - **Super Admin**: `super` / `super`

These test accounts work WITHOUT any database setup - they're hardcoded in the frontend for development.

---

### Option 2: Full Database Setup (Production-Ready)

#### Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `mzwmebrwmxhfyohulddl`
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

#### Step 2: Run the Auth Setup Migration

Copy and paste the contents of `migrations/auth_setup_complete.sql` into the SQL Editor and click **Run**.

This creates:
- `user_profiles` table with proper schema
- Test users (admin and engineer)
- RLS policies for security
- Helper functions

#### Step 3: Verify Tables Were Created

Go to **Table Editor** in the sidebar and verify these tables exist:
- `banks`
- `user_profiles`
- `devices`
- `calls`

#### Step 4: Check Test Users

In **Authentication > Users**, you should see:
- `admin@uds.com` - Admin user
- `engineer@uds.com` - Engineer user

---

## Database Schema

### Core Tables

```
banks
├── id (uuid, PK)
├── name (text)
├── code (text, unique)
├── active (boolean)
└── created_at (timestamptz)

user_profiles
├── id (uuid, PK, FK → auth.users)
├── email (text, unique)
├── full_name (text)
├── phone (text)
├── role (enum: admin, engineer, super_admin)
├── bank_id (uuid, FK → banks)
├── status (text: active, pending_approval, inactive)
├── active (boolean)
├── created_at (timestamptz)
└── updated_at (timestamptz)

devices
├── id (uuid, PK)
├── serial_number (text, unique)
├── model (text)
├── device_bank (uuid, FK → banks)
├── status (enum: warehouse, issued, installed, faulty, returned)
├── assigned_to (uuid, FK → user_profiles)
└── ...

calls
├── id (uuid, PK)
├── call_number (text, unique)
├── type (enum: install, swap, deinstall, maintenance, breakdown)
├── status (enum: pending, assigned, in_progress, completed, cancelled)
├── client_bank (uuid, FK → banks)
├── assigned_engineer (uuid, FK → user_profiles)
└── ...
```

### User Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full system access, can create admins |
| `admin` | Manage users, devices, calls within bank |
| `engineer` | View assigned calls, manage assigned devices |

---

## Adding Users Manually

### Via Supabase Dashboard

1. Go to **Authentication > Users**
2. Click **Add user**
3. Enter email and password
4. After user is created, copy their UUID
5. Go to **SQL Editor** and run:

```sql
INSERT INTO user_profiles (id, email, full_name, role, status)
VALUES (
  'PASTE-USER-UUID-HERE',
  'user@example.com',
  'User Name',
  'engineer',  -- or 'admin'
  'active'
);
```

### Via SQL

```sql
-- Step 1: Create auth user (run in SQL Editor)
-- Note: This requires service_role access, better to use Dashboard

-- Step 2: Create profile (after user exists in auth.users)
INSERT INTO user_profiles (id, email, full_name, role, bank_id, status)
VALUES (
  'user-uuid-from-auth',
  'newuser@company.com',
  'New User',
  'engineer',
  'bank-uuid-if-engineer',
  'active'
);
```

---

## Troubleshooting

### "Missing Supabase environment variables"

Your `.env` file is missing or incorrect. Create it:

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### "Invalid login credentials"

1. **For test accounts**: Make sure `VITE_ENABLE_TEST_ACCOUNTS=true` in `.env`
2. **For real accounts**: Verify user exists in Supabase Auth > Users

### "Profile not found" after login

The user exists in auth.users but not in user_profiles. Run:

```sql
-- Replace with actual values
INSERT INTO user_profiles (id, email, full_name, role, status)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'engineer', 'active'
FROM auth.users
WHERE email = 'user@example.com';
```

### RLS Policy Errors

If you get "new row violates row-level security policy":

1. Check that you're logged in as an admin
2. Verify the user has `status = 'active'`
3. Check the RLS policies in **Database > Policies**

---

## Running All Migrations

To apply all migrations in order:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref mzwmebrwmxhfyohulddl

# Push migrations
supabase db push
```

Or manually run each file in `supabase/migrations/` in order via SQL Editor.

---

## Test Credentials Summary

| Account Type | Email/Username | Password | Role |
|--------------|----------------|----------|------|
| Test Admin (dev only) | `admin` | `admin` | admin |
| Test Engineer (dev only) | `test` | `test` | engineer |
| Test Super (dev only) | `super` | `super` | super_admin |
| Real Admin | `admin@uds.com` | `Admin@123` | admin |
| Real Engineer | `engineer@uds.com` | `Engineer@123` | engineer |

**Note**: Test accounts (admin/admin, test/test) only work when:
- Running in development mode (`npm run dev`)
- AND `VITE_ENABLE_TEST_ACCOUNTS=true` in `.env`
