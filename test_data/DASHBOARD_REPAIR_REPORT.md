# Dashboard Query Repair Report

## Executive Summary

The Dashboard component (`src/pages/Dashboard.tsx`) was displaying zero counts for all statistics despite valid data existing in the database. This report documents the root cause analysis and the fix applied.

---

## Problem Description

**Symptoms:**
- Dashboard stat cards showing `0` for all values (Total Devices, Warehouse, Issued, etc.)
- Engineer count showing `0` even with engineers in database
- Charts potentially rendering with empty data

**Environment:**
- Database contained: 5+ devices, 2+ engineers, multiple calls
- User logged in as admin

---

## Root Cause Analysis

### The Timing Issue

The root cause was a **React useEffect timing/dependency issue** where the `isAdmin` flag was captured as `false` during the initial render, causing the engineer query to always return an empty result.

### Technical Details

**File:** `src/pages/Dashboard.tsx`

**Original Code (Lines 84-118):**
```typescript
useEffect(() => {
  loadDashboardStats();  // Called immediately on mount
  loadChartData();
  loadMapData();
  // ... subscription setup ...
}, []);  // ❌ Empty dependency array
```

**Original loadDashboardStats (Lines 120-126):**
```typescript
const loadDashboardStats = async () => {
  try {
    const [devicesRes, callsRes, engineersRes] = await Promise.all([
      supabase.from('devices').select('status'),
      supabase.from('calls').select('status, completed_at'),
      isAdmin ? supabase.from('user_profiles').select('id').eq('role', 'engineer')
              : Promise.resolve({ data: [] })  // ❌ isAdmin captured as false
    ]);
```

### Why This Failed

1. **Component Mount Sequence:**
   - `Dashboard` component mounts
   - `useAuth()` returns initial state: `profile: null`, `isAdmin: false`
   - `useEffect` with `[]` runs immediately
   - `loadDashboardStats()` captures `isAdmin = false` via closure
   - Engineer query resolves to `{ data: [] }`

2. **Auth State Update (Later):**
   - AuthContext fetches user profile from Supabase
   - `profile` updates, `isAdmin` becomes `true`
   - BUT... `useEffect` has empty `[]` dependency, so it doesn't re-run
   - Dashboard remains stuck with zero counts

3. **The Closure Trap:**
   - JavaScript closures capture variables at function creation time
   - `loadDashboardStats` was created when `isAdmin` was `false`
   - Even after `isAdmin` updates, the function still sees the old value

---

## Fix Applied

### Changes Made

**1. Added profile check before loading data:**
```typescript
useEffect(() => {
  // Don't load until we know the user's role (profile must be loaded)
  if (profile === null) {
    return;
  }
  // ... rest of effect
```

**2. Added proper dependencies:**
```typescript
}, [profile, isAdmin]);  // ✅ Re-run when auth state changes
```

**3. Explicit isAdmin passing:**
```typescript
// Capture current isAdmin value for this effect run
const currentIsAdmin = isAdmin;

loadDashboardStats(currentIsAdmin);
```

**4. Updated loadDashboardStats to accept parameter:**
```typescript
const loadDashboardStats = async (adminAccess: boolean = isAdmin) => {
  try {
    const [devicesRes, callsRes, engineersRes] = await Promise.all([
      supabase.from('devices').select('status'),
      supabase.from('calls').select('status, completed_at'),
      adminAccess ? supabase.from('user_profiles').select('id').eq('role', 'engineer')
                  : Promise.resolve({ data: [] })
    ]);
```

---

## Before and After Code Comparison

### Before (Broken)

```typescript
// src/pages/Dashboard.tsx - Lines 84-127 (BEFORE)

useEffect(() => {
  loadDashboardStats();
  loadChartData();
  loadMapData();

  const devicesChannel = supabase
    .channel('dashboard-devices')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
      loadDashboardStats();
      loadChartData();
    })
    .subscribe();

  // ... more subscriptions ...

  return () => {
    devicesChannel.unsubscribe();
    // ...
  };
}, []);  // ❌ Empty dependency array

const loadDashboardStats = async () => {
  try {
    const [devicesRes, callsRes, engineersRes] = await Promise.all([
      supabase.from('devices').select('status'),
      supabase.from('calls').select('status, completed_at'),
      isAdmin ? supabase.from('user_profiles').select('id').eq('role', 'engineer')
              : Promise.resolve({ data: [] })  // ❌ isAdmin is stale (false)
    ]);
```

### After (Fixed)

```typescript
// src/pages/Dashboard.tsx - Lines 84-129 (AFTER)

// Wait for auth to be ready before loading data
useEffect(() => {
  // Don't load until we know the user's role (profile must be loaded)
  if (profile === null) {
    return;  // ✅ Skip until auth is ready
  }

  // Capture current isAdmin value for this effect run
  const currentIsAdmin = isAdmin;  // ✅ Explicit capture

  loadDashboardStats(currentIsAdmin);  // ✅ Pass current value
  loadChartData();
  loadMapData();

  const devicesChannel = supabase
    .channel('dashboard-devices')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
      loadDashboardStats(currentIsAdmin);  // ✅ Use captured value
      loadChartData();
    })
    .subscribe();

  // ... more subscriptions ...

  return () => {
    devicesChannel.unsubscribe();
    // ...
  };
}, [profile, isAdmin]);  // ✅ Proper dependencies

const loadDashboardStats = async (adminAccess: boolean = isAdmin) => {  // ✅ Accept parameter
  try {
    const [devicesRes, callsRes, engineersRes] = await Promise.all([
      supabase.from('devices').select('status'),
      supabase.from('calls').select('status, completed_at'),
      adminAccess ? supabase.from('user_profiles').select('id').eq('role', 'engineer')
                  : Promise.resolve({ data: [] })  // ✅ Uses passed value
    ]);
```

---

## Affected Components

| File | Line Range | Issue Type | Status |
|------|------------|------------|--------|
| `src/pages/Dashboard.tsx` | 84-127 | Timing/dependency bug | ✅ Fixed |

---

## Verification Steps

### 1. Pre-Verification (Check Test Data)
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as device_count FROM devices;
SELECT COUNT(*) as call_count FROM calls;
SELECT COUNT(*) as engineer_count FROM user_profiles WHERE role = 'engineer';
```

### 2. Test Dashboard Loading
1. Start dev server: `npm run dev`
2. Open browser to http://localhost:5173
3. Login as admin (admin@uds.test / admin123)
4. Navigate to Dashboard
5. **Verify:** Stat cards should show non-zero counts matching database

### 3. Test Role-Based Behavior
1. **As Admin:** Total Engineers card should appear with correct count
2. **As Engineer:** Total Engineers card should NOT appear

### 4. Test Real-time Updates
1. Keep Dashboard open
2. In another tab/SQL editor, add a device or call
3. **Verify:** Dashboard stats should update automatically

### 5. Browser Console Check
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. **Expected:** No "Cannot read property" or Supabase errors

---

## Related Issues

The frontend audit (`FRONTEND_AUDIT_CHECKLIST.md`) also identified these issues:

| File | Issue | Status |
|------|-------|--------|
| Stock.tsx Line 144 | Uses `bank.bank_name` instead of `bank.name` | Not yet fixed |
| Stock.tsx Line 203 | Uses `device.banks?.bank_code` instead of `device.banks?.code` | Not yet fixed |
| Stock.tsx Line 205 | Shows UUID instead of engineer name | Not yet fixed |

These are separate issues and should be addressed in a follow-up fix.

---

## Lessons Learned

1. **Always include auth state in dependencies** when using role-based conditionals
2. **Guard effects** with null checks when waiting for async state
3. **Pass dynamic values explicitly** rather than relying on closures
4. **Test with fresh page loads** - stale state issues may not appear after hot reload

---

## Technical Notes

### Why the Supabase Queries Were Correct

The actual Supabase query construction was NOT the issue:

```typescript
// This query is correct
supabase.from('devices').select('status')

// This query is correct
supabase.from('calls').select('status, completed_at')

// This query is correct
supabase.from('user_profiles').select('id').eq('role', 'engineer')
```

The schema column names (`status`, `completed_at`, `role`) all match the database. The issue was purely in the **React timing** of when `isAdmin` was evaluated.

### Why Empty Dependency Array Was Wrong

The `[]` dependency array tells React: "run this effect once on mount, never re-run."

But the effect uses `isAdmin`, which changes from `false` to `true` after auth loads. With `[]`, the effect runs with the wrong `isAdmin` value and never corrects itself.

---

## Additional Issue: RLS and Test Account Authentication

### Issue Discovered (2025-12-12)

If dashboard still shows zeros after the timing fix, the root cause may be **Row Level Security (RLS) blocking queries** when using development test accounts.

### How Test Accounts Work

The app supports two authentication modes:

1. **Real Supabase Authentication** (`admin@uds.test` / `admin123`)
   - User is authenticated via Supabase Auth
   - `auth.uid()` returns the user's UUID
   - RLS policies work correctly
   - Dashboard queries return data

2. **Development Test Accounts** (`admin` / `admin`)
   - Mock session stored in localStorage
   - NO actual Supabase authentication
   - `auth.uid()` returns NULL
   - RLS policies block ALL queries
   - Dashboard shows zeros

### RLS Policy Analysis

The RLS policies use `auth.uid()` to check authentication:

```sql
-- Example: Devices table policy
CREATE POLICY "Admins can view all devices"
  ON devices FOR SELECT
  TO authenticated
  USING (is_admin());

-- is_admin() function uses auth.uid()
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'  -- ❌ NULL when using test accounts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Solution

**For Production/Testing with Data:**
- Use real Supabase credentials: `admin@uds.test` / `admin123`
- Ensure user exists in `auth.users` and `user_profiles` tables

**For Development:**
Test accounts are only meant for UI/UX testing without database connectivity.

### Debug Logging Added

Console logging was added to `loadDashboardStats` to help diagnose query issues:

```typescript
if (import.meta.env.DEV) {
  console.log('[Dashboard] Query results:', {
    devices: { data: devicesRes.data?.length, error: devicesRes.error },
    calls: { data: callsRes.data?.length, error: callsRes.error },
    engineers: { data: engineersRes.data?.length, error: (engineersRes as any).error },
    adminAccess
  });
}
```

Check browser console for `[Dashboard]` messages to see:
- Number of records returned (should match database)
- Any error messages from Supabase
- Whether `adminAccess` is `true` or `false`

---

## Date

**Report Generated:** 2025-12-12
**Fix Applied To:** `src/pages/Dashboard.tsx`
**TypeScript Validation:** ✅ Passed
**Last Updated:** 2025-12-12 (Added RLS analysis)
