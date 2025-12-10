# Loading Test Data - Step by Step

## Overview

This guide walks you through loading test data into your UDS-POS Supabase database. Follow each step carefully.

---

## Step 1: Create Auth Users (5 minutes)

1. Go to **Supabase Dashboard**
2. Click **Authentication** → **Users**
3. Click **Add User** → **Create new user**
4. Create 3 users:

### Admin User
- **Email:** admin@uds.com
- **Password:** Admin@123
- **Auto Confirm:** YES (check the box)
- Click **Create User**

### Engineer 1
- **Email:** rajesh@uds.com
- **Password:** Engineer@123
- **Auto Confirm:** YES
- Click **Create User**

### Engineer 2
- **Email:** priya@uds.com
- **Password:** Engineer@123
- **Auto Confirm:** YES
- Click **Create User**

---

## Step 2: Get User UUIDs

1. Go to **SQL Editor**
2. Run this query:
```sql
SELECT id, email FROM auth.users ORDER BY email;
```
3. Copy the UUIDs - you'll see something like:
```
id                                   | email
-------------------------------------|------------------
a1b2c3d4-e5f6-7890-abcd-ef1234567890 | admin@uds.com
b2c3d4e5-f6a7-8901-bcde-f12345678901 | priya@uds.com
c3d4e5f6-a7b8-9012-cdef-123456789012 | rajesh@uds.com
```
4. Write down each UUID next to the email

---

## Step 3: Edit Test Data SQL

1. Open the file: `test_data/02_minimal_test_data.sql`
2. Find these 3 lines in PART 2:
```sql
('ADMIN-UUID-HERE', 'admin@uds.com', ...
('RAJESH-UUID-HERE', 'rajesh@uds.com', ...
('PRIYA-UUID-HERE', 'priya@uds.com', ...
```
3. Replace the placeholder text with actual UUIDs from Step 2

4. Also find these lines in PART 6:
```sql
SET assigned_engineer = 'RAJESH-UUID-HERE'
SET assigned_engineer = 'PRIYA-UUID-HERE',
SET assigned_engineer = 'RAJESH-UUID-HERE',
```
5. Replace with actual UUIDs (there are 3 places total)

### Example:
Before:
```sql
('ADMIN-UUID-HERE', 'admin@uds.com', 'Admin User', ...
```
After:
```sql
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@uds.com', 'Admin User', ...
```

6. **Save the file**

---

## Step 4: Run Schema Setup (First!)

1. Go to **Supabase SQL Editor**
2. Open file: `test_data/01_clean_schema_setup.sql`
3. Copy **ALL** contents
4. Paste into SQL Editor
5. Click **Run**
6. You should see: `Schema setup completed successfully!`

**If you see errors:** Copy the error message - we'll need to fix the schema first.

---

## Step 5: Run Test Data

1. Copy your **EDITED** `02_minimal_test_data.sql` (with real UUIDs)
2. Paste in SQL Editor
3. Click **Run**
4. You should see a result showing:
```
banks_count | profiles_count | devices_count | calls_count | message
3           | 3              | 10            | 5           | Test data loaded successfully!
```

---

## Step 6: Verify Data

1. Go to **Table Editor** in Supabase
2. Check each table has data:

| Table | Expected Rows |
|-------|---------------|
| banks | 3 |
| user_profiles | 3 |
| devices | 10 |
| calls | 5 |
| warehouses | 2 |
| couriers | 3 |

---

## Step 7: Test Login

1. Open your UDS-POS app in browser
2. **Login as Admin:**
   - Email: admin@uds.com
   - Password: Admin@123
3. You should see dashboard with 5 calls
4. Logout

5. **Login as Engineer:**
   - Email: rajesh@uds.com
   - Password: Engineer@123
6. Should see assigned calls (2 calls)

---

## Troubleshooting

### Error: "foreign key violation"
**Cause:** UUID doesn't match an auth.users record
**Fix:** Double-check you replaced ALL placeholder UUIDs correctly

### Error: "duplicate key"
**Cause:** Data already exists
**Fix:** Run cleanup first:
```sql
DELETE FROM stock_movements;
DELETE FROM call_devices;
DELETE FROM calls;
DELETE FROM devices;
DELETE FROM warehouses;
DELETE FROM couriers;
DELETE FROM user_profiles;
DELETE FROM banks;
```
Then run the test data script again.

### Error: "relation does not exist"
**Cause:** Schema not set up
**Fix:** Run `01_clean_schema_setup.sql` first

### Login doesn't work
**Cause:** Auth users not created properly
**Fix:**
1. Check Authentication → Users in Supabase
2. Make sure users are confirmed (green checkmark)
3. Try resetting password in Supabase dashboard

### Dashboard is empty after login
**Cause:** Data not loaded or RLS blocking access
**Fix:**
1. Check Table Editor - is data there?
2. If no data, run test data script again
3. If data exists but not showing, check RLS policies

### Error: "invalid input syntax for type uuid"
**Cause:** You have 'ADMIN-UUID-HERE' instead of an actual UUID
**Fix:** Replace ALL placeholder text with actual UUIDs from auth.users

---

## Quick Reference

### Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@uds.com | Admin@123 |
| Engineer | rajesh@uds.com | Engineer@123 |
| Engineer | priya@uds.com | Engineer@123 |

### Test Banks
| Bank | Code |
|------|------|
| HDFC Bank | HDFC |
| ICICI Bank | ICICI |
| Axis Bank | AXIS |

### Test Calls
| Call Number | Status | Type |
|-------------|--------|------|
| CALL-2024-001 | pending | install |
| CALL-2024-002 | assigned | maintenance |
| CALL-2024-003 | in_progress | swap |
| CALL-2024-004 | completed | install |
| CALL-2024-005 | pending | breakdown |

---

## Files Summary

| File | Purpose | Run Order |
|------|---------|-----------|
| 01_clean_schema_setup.sql | Create/fix database tables | 1st |
| 02_minimal_test_data.sql | Load test data | 2nd |
| check_actual_schema.sql | Diagnose schema issues | As needed |
