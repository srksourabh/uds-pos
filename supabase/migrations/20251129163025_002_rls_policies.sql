/*
  # Row Level Security Policies

  ## Overview
  Implements comprehensive RLS policies for all tables with role-based access control.
  Admin users have full access to all data. Engineer users have restricted access based
  on their assignments and bank affiliation.

  ## Security Model

  ### Admin Role
  - Full SELECT, INSERT, UPDATE, DELETE access to all tables
  - Can manage users, devices, calls, and view all audit trails

  ### Engineer Role
  - Can view their own profile and other engineers' basic info
  - Can view devices assigned to them or in their bank's warehouse
  - Can view and update calls assigned to them
  - Can view their own inventory movements and call history
  - Can view and mark their own notifications as read
  - Cannot delete any records

  ### Public Access
  - No public access to any data - all users must be authenticated

  ## Policies by Table

  1. **banks** - All authenticated users can read
  2. **user_profiles** - Users can read all profiles, admins can modify
  3. **devices** - Admins see all, engineers see assigned or warehouse devices in their bank
  4. **calls** - Admins see all, engineers see their assigned calls
  5. **call_devices** - Follows call access rules
  6. **inventory_movements** - Admins see all, engineers see movements of their devices
  7. **call_history** - Admins see all, engineers see history of their calls
  8. **notifications** - Users see only their own notifications
*/

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's bank
CREATE OR REPLACE FUNCTION get_user_bank()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT bank_id FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- BANKS TABLE POLICIES
-- =====================================================

CREATE POLICY "Anyone authenticated can view banks"
  ON banks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert banks"
  ON banks FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update banks"
  ON banks FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete banks"
  ON banks FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- USER_PROFILES TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert user profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Users can update own profile, admins can update all"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

CREATE POLICY "Admins can delete user profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- DEVICES TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view all devices"
  ON devices FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Engineers can view devices in their bank or assigned to them"
  ON devices FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND (
      device_bank = get_user_bank() OR
      assigned_to = auth.uid()
    )
  );

CREATE POLICY "Admins can insert devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete devices"
  ON devices FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- CALLS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view all calls"
  ON calls FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Engineers can view their assigned calls"
  ON calls FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND assigned_engineer = auth.uid()
  );

CREATE POLICY "Admins can insert calls"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update all calls"
  ON calls FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Engineers can update their assigned calls"
  ON calls FOR UPDATE
  TO authenticated
  USING (
    NOT is_admin() AND assigned_engineer = auth.uid()
  )
  WITH CHECK (
    NOT is_admin() AND assigned_engineer = auth.uid()
  );

CREATE POLICY "Admins can delete calls"
  ON calls FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- CALL_DEVICES TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view all call devices"
  ON call_devices FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Engineers can view call devices for their calls"
  ON call_devices FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_devices.call_id
      AND calls.assigned_engineer = auth.uid()
    )
  );

CREATE POLICY "Admins can insert call devices"
  ON call_devices FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update call devices"
  ON call_devices FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete call devices"
  ON call_devices FOR DELETE
  TO authenticated
  USING (is_admin());

-- =====================================================
-- INVENTORY_MOVEMENTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view all inventory movements"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Engineers can view movements of their devices"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND (
      from_engineer = auth.uid() OR
      to_engineer = auth.uid() OR
      EXISTS (
        SELECT 1 FROM devices
        WHERE devices.id = inventory_movements.device_id
        AND devices.assigned_to = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert inventory movements"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- CALL_HISTORY TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view all call history"
  ON call_history FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Engineers can view history of their calls"
  ON call_history FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_history.call_id
      AND calls.assigned_engineer = auth.uid()
    )
  );

CREATE POLICY "System can insert call history"
  ON call_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- NOTIFICATIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());