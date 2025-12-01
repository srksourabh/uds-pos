-- ============================================================================
-- UDS-POS DATABASE FIX SCRIPT
-- ============================================================================
-- Run this script in Supabase SQL Editor (https://supabase.com/dashboard)
-- Navigate to: SQL Editor > New Query > Paste this script > Run
-- ============================================================================

-- Step 1: Create helper functions (SECURITY DEFINER to bypass RLS)
-- ============================================================================

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.get_user_bank();
DROP FUNCTION IF EXISTS public.get_my_profile();
DROP FUNCTION IF EXISTS public.upsert_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT);

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

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM user_profiles WHERE id = auth.uid();
END;
$$;

-- Function to upsert profile (for first-time setup)
CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'engineer',
  p_status TEXT DEFAULT 'pending_approval'
)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_profiles;
BEGIN
  INSERT INTO user_profiles (id, email, full_name, phone, role, status, created_at, updated_at)
  VALUES (
    auth.uid(),
    COALESCE(p_email, (SELECT email FROM auth.users WHERE id = auth.uid())),
    p_full_name,
    p_phone,
    p_role::user_role,
    p_status::user_status,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bank() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Step 2: Fix RLS policies on user_profiles
-- ============================================================================

-- Disable RLS temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', r.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Users can access their own row
CREATE POLICY "user_profiles_self_access" ON user_profiles
FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins can access all rows (uses SECURITY DEFINER function)
CREATE POLICY "user_profiles_admin_access" ON user_profiles
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Service role has full access
CREATE POLICY "user_profiles_service_role" ON user_profiles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Step 3: Ensure test users exist with correct profiles
-- ============================================================================

-- First, check if auth users exist and create profiles for them
DO $$
DECLARE
  admin_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  engineer_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN
  -- Create admin profile if not exists
  INSERT INTO user_profiles (id, email, full_name, role, status, created_at, updated_at)
  VALUES (admin_id, 'admin@uds.com', 'Admin User', 'admin', 'active', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    updated_at = NOW();

  -- Create engineer profile if not exists
  INSERT INTO user_profiles (id, email, full_name, role, status, created_at, updated_at)
  VALUES (engineer_id, 'engineer@uds.com', 'Test Engineer', 'engineer', 'active', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    role = 'engineer',
    status = 'active',
    updated_at = NOW();

  RAISE NOTICE 'Test user profiles created/updated successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Note: Could not create test profiles (auth users may not exist): %', SQLERRM;
END $$;

-- Step 4: Fix other table policies if they exist
-- ============================================================================

-- Banks - everyone can read
DO $$
BEGIN
  DROP POLICY IF EXISTS "banks_select_authenticated" ON banks;
  CREATE POLICY "banks_select_authenticated" ON banks
  FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'banks table does not exist, skipping';
END $$;

-- Devices - admins and bank members can access
DO $$
BEGIN
  DROP POLICY IF EXISTS "devices_select_policy" ON devices;
  CREATE POLICY "devices_select_policy" ON devices
  FOR SELECT TO authenticated
  USING (bank_id = get_user_bank() OR is_admin());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'devices table does not exist, skipping';
END $$;

-- Calls - admins and bank members can access
DO $$
BEGIN
  DROP POLICY IF EXISTS "calls_select_policy" ON calls;
  CREATE POLICY "calls_select_policy" ON calls
  FOR SELECT TO authenticated
  USING (bank_id = get_user_bank() OR is_admin());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'calls table does not exist, skipping';
END $$;

-- ============================================================================
-- DONE! Refresh your browser and try logging in again.
-- ============================================================================

SELECT 'Database fix completed successfully!' as result;
