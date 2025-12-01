-- Fix RLS recursion issue on user_profiles table
-- The problem: Policies on user_profiles were querying user_profiles, causing infinite recursion
-- The solution: Use SECURITY DEFINER functions that bypass RLS to check user roles

-- ============================================================================
-- Step 1: Create SECURITY DEFINER helper functions
-- These functions bypass RLS and can safely query user_profiles
-- ============================================================================

-- Drop existing functions if they exist (to recreate with SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.get_user_bank();
DROP FUNCTION IF EXISTS public.get_user_status();
DROP FUNCTION IF EXISTS public.is_user_active();
DROP FUNCTION IF EXISTS public.auth_user_role();

-- Function to check if current user is admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM user_profiles WHERE id = auth.uid()
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Function to get user's bank_id
CREATE OR REPLACE FUNCTION public.get_user_bank()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bank_id FROM user_profiles WHERE id = auth.uid()
$$;

-- Function to get user's status
CREATE OR REPLACE FUNCTION public.get_user_status()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status::TEXT FROM user_profiles WHERE id = auth.uid()
$$;

-- Function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND status = 'active'
  )
$$;

-- ============================================================================
-- Step 2: Drop ALL existing policies on user_profiles
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow admins to view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow admins to update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to create their profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow admins to create profiles" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_admin" ON user_profiles;

-- ============================================================================
-- Step 3: Create new non-recursive RLS policies using helper functions
-- ============================================================================

-- Enable RLS (in case it's not enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own profile (no subquery needed)
CREATE POLICY "user_profiles_select_own"
ON user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- SELECT: Admins can view all profiles (uses SECURITY DEFINER function)
CREATE POLICY "user_profiles_select_admin"
ON user_profiles
FOR SELECT
TO authenticated
USING (is_admin());

-- UPDATE: Users can update their own profile
CREATE POLICY "user_profiles_update_own"
ON user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- UPDATE: Admins can update all profiles
CREATE POLICY "user_profiles_update_admin"
ON user_profiles
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- INSERT: Users can create their own profile (for first-time setup)
CREATE POLICY "user_profiles_insert_own"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- INSERT: Admins can create any profile
CREATE POLICY "user_profiles_insert_admin"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- DELETE: Only admins can delete profiles
CREATE POLICY "user_profiles_delete_admin"
ON user_profiles
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- Step 4: Grant execute permissions on helper functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bank() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active() TO authenticated;

-- ============================================================================
-- Step 5: Fix RLS policies on other tables that reference user_profiles
-- ============================================================================

-- Fix devices policies
DROP POLICY IF EXISTS "Engineers can view devices in their bank" ON devices;
DROP POLICY IF EXISTS "Admins can view all devices" ON devices;
DROP POLICY IF EXISTS "Admins can insert devices" ON devices;
DROP POLICY IF EXISTS "Admins can update devices" ON devices;
DROP POLICY IF EXISTS "Engineers can update assigned devices" ON devices;

CREATE POLICY "devices_select_by_bank"
ON devices
FOR SELECT
TO authenticated
USING (
  bank_id = get_user_bank() OR is_admin()
);

CREATE POLICY "devices_insert_admin"
ON devices
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "devices_update_admin"
ON devices
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "devices_update_engineer"
ON devices
FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid() AND NOT is_admin())
WITH CHECK (assigned_to = auth.uid() AND NOT is_admin());

-- Fix calls policies
DROP POLICY IF EXISTS "Engineers can view calls in their bank" ON calls;
DROP POLICY IF EXISTS "Admins can view all calls" ON calls;
DROP POLICY IF EXISTS "Admins can manage calls" ON calls;
DROP POLICY IF EXISTS "Engineers can update assigned calls" ON calls;

CREATE POLICY "calls_select_by_bank"
ON calls
FOR SELECT
TO authenticated
USING (
  bank_id = get_user_bank() OR is_admin()
);

CREATE POLICY "calls_insert_admin"
ON calls
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "calls_update_admin"
ON calls
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "calls_update_engineer"
ON calls
FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- Fix stock_movements policies
DROP POLICY IF EXISTS "Users can view stock movements in their bank" ON stock_movements;
DROP POLICY IF EXISTS "Admins can view all stock movements" ON stock_movements;

CREATE POLICY "stock_movements_select_by_bank"
ON stock_movements
FOR SELECT
TO authenticated
USING (
  bank_id = get_user_bank() OR is_admin()
);

CREATE POLICY "stock_movements_insert"
ON stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  bank_id = get_user_bank() OR is_admin()
);

-- Fix banks policies
DROP POLICY IF EXISTS "Authenticated users can view banks" ON banks;
DROP POLICY IF EXISTS "Admins can manage banks" ON banks;

CREATE POLICY "banks_select_authenticated"
ON banks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "banks_manage_admin"
ON banks
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- Step 6: Add comment for documentation
-- ============================================================================

COMMENT ON FUNCTION public.is_admin() IS 'SECURITY DEFINER function to check if current user is admin. Bypasses RLS to prevent recursion.';
COMMENT ON FUNCTION public.get_user_bank() IS 'SECURITY DEFINER function to get current user bank_id. Bypasses RLS to prevent recursion.';
