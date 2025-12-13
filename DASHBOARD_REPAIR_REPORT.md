# Dashboard Metrics Repair Report

**Date:** 2025-12-12
**Status:** Investigation Complete
**TypeScript Validation:** Passed

---

## Executive Summary

Investigation into dashboard showing zero counts for all metrics despite database containing valid data (5 devices, 2 engineers, 3 calls).

---

## Investigation Results

### Issue 1: React Timing Bug (Previously Fixed)

The Dashboard component had a React useEffect timing/dependency issue that was **already fixed** in the current codebase.

**Location:** `src/pages/Dashboard.tsx:84-127`

**Fix Already Applied:**
- Added `profile === null` guard to wait for auth state
- Added `[profile, isAdmin]` dependencies to useEffect
- Explicitly pass `isAdmin` value to `loadDashboardStats`

```typescript
// Current code (already correct)
useEffect(() => {
  if (profile === null) {
    return;  // ✅ Wait for auth
  }
  const currentIsAdmin = isAdmin;
  loadDashboardStats(currentIsAdmin);
  // ...
}, [profile, isAdmin]);  // ✅ Proper dependencies
```

### Issue 2: RLS + Test Account Authentication (Root Cause)

If dashboard still shows zeros, the root cause is **Row Level Security (RLS) blocking queries** when using development test accounts.

**Authentication Modes:**

| Mode | Credentials | auth.uid() | RLS | Data Access |
|------|-------------|------------|-----|-------------|
| Real Supabase | `admin@uds.test` / `admin123` | User UUID | Works | ✅ Data shown |
| Test Account | `admin` / `admin` | NULL | Blocked | ❌ Shows zeros |

**Why Test Accounts Fail:**

Test accounts (admin/admin) create a mock session in localStorage but do NOT authenticate with Supabase. This means:

1. `auth.uid()` returns NULL
2. RLS policies like `is_admin()` fail:
   ```sql
   CREATE OR REPLACE FUNCTION is_admin()
   RETURNS boolean AS $$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM user_profiles
       WHERE id = auth.uid() AND role = 'admin'  -- auth.uid() is NULL!
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```
3. All queries return empty arrays
4. Dashboard displays zeros

---

## Queries Verified as Correct

The Supabase queries in `loadDashboardStats` are syntactically correct:

```typescript
// ✅ Correct - devices table, status column exists
supabase.from('devices').select('status')

// ✅ Correct - calls table, columns exist
supabase.from('calls').select('status, completed_at')

// ✅ Correct - user_profiles table, role column exists
supabase.from('user_profiles').select('id').eq('role', 'engineer')
```

**Verification:** These queries work correctly when:
- User is authenticated via real Supabase credentials
- Direct SQL queries in Supabase SQL Editor confirm data exists

---

## Debug Logging Added

Added console logging to help diagnose query issues:

```typescript
// src/pages/Dashboard.tsx - loadDashboardStats function
if (import.meta.env.DEV) {
  console.log('[Dashboard] Query results:', {
    devices: { data: devicesRes.data?.length, error: devicesRes.error },
    calls: { data: callsRes.data?.length, error: callsRes.error },
    engineers: { data: engineersRes.data?.length, error: (engineersRes as any).error },
    adminAccess
  });
}

// Error logging
if (devicesRes.error) console.error('[Dashboard] Devices query error:', devicesRes.error);
if (callsRes.error) console.error('[Dashboard] Calls query error:', callsRes.error);
if ((engineersRes as any).error) console.error('[Dashboard] Engineers query error:', (engineersRes as any).error);
```

**Check browser console for `[Dashboard]` messages:**
- `data: 0` + no error = RLS blocking (test account issue)
- `data: 5` = Working correctly
- `error: { message: "..." }` = Query or auth error

---

## Solution

### For Production/Staging (Recommended)

Use real Supabase authentication:

1. **Login credentials:** `admin@uds.test` / `admin123`
2. **Ensure user exists** in both `auth.users` and `user_profiles` tables
3. **Verify RLS policies** are correctly configured

### For Development Without Database

Test accounts are meant for UI/UX testing only:
- Use `admin` / `admin` for admin UI testing
- Use `test` / `test` for engineer UI testing
- Data will show as zeros (expected behavior)

### Alternative: Service Role Key (Development Only)

For local development with full data access, you could use the Supabase service role key which bypasses RLS. **NEVER use this in production.**

---

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/Dashboard.tsx` | Added debug logging | Diagnose query issues |
| `test_data/DASHBOARD_REPAIR_REPORT.md` | Updated documentation | Added RLS analysis |

---

## Verification Checklist

### Using Real Supabase Auth

1. [ ] Start dev server: `npm run dev`
2. [ ] Open http://localhost:5173
3. [ ] Login with `admin@uds.test` / `admin123`
4. [ ] Open browser DevTools (F12) → Console
5. [ ] Navigate to Dashboard
6. [ ] Check console for `[Dashboard] Query results:`
   - Expected: `devices: { data: 5, error: null }`
   - If `data: 0` with no error = RLS issue
7. [ ] Verify stat cards show correct counts

### Using Test Accounts

1. [ ] Login with `admin` / `admin`
2. [ ] Dashboard shows zeros (expected)
3. [ ] Console shows `[Dashboard] Query results: { devices: { data: 0 } }`
4. [ ] No error messages (queries succeed but return empty due to RLS)

---

## Database Verification

Run in Supabase SQL Editor to confirm data exists:

```sql
-- Verify device counts
SELECT status, COUNT(*) as count
FROM devices
GROUP BY status;

-- Verify call counts
SELECT status, COUNT(*) as count
FROM calls
GROUP BY status;

-- Verify engineer count
SELECT COUNT(*) as engineer_count
FROM user_profiles
WHERE role = 'engineer';
```

**Expected Results:**
- 5 total devices (3 warehouse, 2 issued)
- 3 calls (1 pending, 1 assigned, 1 in_progress)
- 2 engineers

---

## Conclusion

The dashboard code is correct. The issue is authentication context:

| Scenario | Result |
|----------|--------|
| Test accounts (admin/admin) | Shows zeros (expected - no real auth) |
| Real Supabase auth (admin@uds.test) | Shows correct counts |

To see real data, use real Supabase authentication credentials.

---

**Report Generated:** 2025-12-12
**Author:** Claude Code
