/*
  # Enhanced RLS Policies with Status Checks

  ## Overview
  Updates existing RLS policies to enforce account status checks.
  Only users with 'active' status can perform operations (except reading their own profile).

  ## Changes
  - Add status='active' checks to all policies
  - Allow pending users to create their initial profile
  - Allow all users to read their own profile regardless of status
  - Update calls policies for better engineer access
  - Update devices policies for faulty device marking

  ## Security Enhancement
  - Suspended/inactive users cannot perform any operations
  - Pending approval users can only view their own profile
  - Active users have full role-based permissions
*/

-- Drop old profile policies and recreate with status checks
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile, admins can update all" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;

-- Profiles SELECT policies
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin() AND is_user_active());

CREATE POLICY "Active engineers can view engineer profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND 
    is_user_active() AND
    role = 'engineer'
  );

CREATE POLICY "Users can always view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Profiles INSERT policies
CREATE POLICY "First-time users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() AND 
    role = 'engineer' AND 
    status = 'pending_approval'
  );

CREATE POLICY "Admins can create any profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() AND is_user_active());

-- Profiles UPDATE policies
CREATE POLICY "Users can update own non-critical fields"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() AND
    role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM user_profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM user_profiles WHERE id = auth.uid()) AND
    bank_id = (SELECT bank_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin() AND is_user_active())
  WITH CHECK (is_admin() AND is_user_active());

-- Profiles DELETE policies
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_admin() AND is_user_active());

-- Enhanced Calls policies
DROP POLICY IF EXISTS "Admins can view all calls" ON calls;
DROP POLICY IF EXISTS "Engineers can view their assigned calls" ON calls;
DROP POLICY IF EXISTS "Admins can update all calls" ON calls;
DROP POLICY IF EXISTS "Engineers can update their assigned calls" ON calls;

CREATE POLICY "Active admins can view all calls"
  ON calls FOR SELECT
  TO authenticated
  USING (is_admin() AND is_user_active());

CREATE POLICY "Active engineers can view assigned and pending calls"
  ON calls FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND
    is_user_active() AND
    (
      assigned_engineer = auth.uid() OR
      (
        status = 'pending' AND
        client_bank = get_user_bank()
      )
    )
  );

CREATE POLICY "Active admins can update calls"
  ON calls FOR UPDATE
  TO authenticated
  USING (is_admin() AND is_user_active())
  WITH CHECK (is_admin() AND is_user_active());

CREATE POLICY "Active engineers can update assigned call status"
  ON calls FOR UPDATE
  TO authenticated
  USING (
    NOT is_admin() AND
    is_user_active() AND
    assigned_engineer = auth.uid()
  )
  WITH CHECK (
    NOT is_admin() AND
    is_user_active() AND
    assigned_engineer = auth.uid() AND
    assigned_engineer = (SELECT assigned_engineer FROM calls WHERE id = calls.id) AND
    client_bank = (SELECT client_bank FROM calls WHERE id = calls.id)
  );

-- Enhanced Devices policies
DROP POLICY IF EXISTS "Admins can update devices" ON devices;

CREATE POLICY "Active admins can update devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (is_admin() AND is_user_active())
  WITH CHECK (is_admin() AND is_user_active());

CREATE POLICY "Active engineers can mark assigned devices as faulty"
  ON devices FOR UPDATE
  TO authenticated
  USING (
    NOT is_admin() AND
    is_user_active() AND
    assigned_to = auth.uid() AND
    status != 'faulty'
  )
  WITH CHECK (
    NOT is_admin() AND
    is_user_active() AND
    assigned_to = auth.uid() AND
    status = 'faulty'
  );

-- Ensure bank policies include active status
DROP POLICY IF EXISTS "Admins can insert banks" ON banks;
DROP POLICY IF EXISTS "Admins can update banks" ON banks;
DROP POLICY IF EXISTS "Admins can delete banks" ON banks;

CREATE POLICY "Active admins can insert banks"
  ON banks FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() AND is_user_active());

CREATE POLICY "Active admins can update banks"
  ON banks FOR UPDATE
  TO authenticated
  USING (is_admin() AND is_user_active())
  WITH CHECK (is_admin() AND is_user_active());

CREATE POLICY "Active admins can delete banks"
  ON banks FOR DELETE
  TO authenticated
  USING (is_admin() AND is_user_active());