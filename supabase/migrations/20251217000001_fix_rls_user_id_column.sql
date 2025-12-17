/*
  # Fix RLS Policies - Correct Column Name

  ## Issue
  RLS policies were using `user_profiles.user_id` but the actual column is `user_profiles.id`
  This caused all RLS policy checks to fail, blocking data access.

  ## Fix
  Recreate affected policies with correct column reference: `user_profiles.id = auth.uid()`
*/

-- =====================================================
-- FIX STOCK_MOVEMENTS TABLE POLICIES
-- =====================================================

-- Drop and recreate admin policy with correct column
DROP POLICY IF EXISTS "Admins can view all stock movements" ON stock_movements;
CREATE POLICY "Admins can view all stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FIX PHOTOS TABLE POLICIES
-- =====================================================

-- Drop and recreate admin policy with correct column
DROP POLICY IF EXISTS "Admins can view all photos" ON photos;
CREATE POLICY "Admins can view all photos"
  ON photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FIX ENGINEER_AGGREGATES TABLE POLICIES
-- =====================================================

-- Drop and recreate admin policy with correct column
DROP POLICY IF EXISTS "Admins can view all engineer aggregates" ON engineer_aggregates;
CREATE POLICY "Admins can view all engineer aggregates"
  ON engineer_aggregates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FIX STOCK_ALERTS TABLE POLICIES
-- =====================================================

-- Drop and recreate admin view policy with correct column
DROP POLICY IF EXISTS "Admins can view all stock alerts" ON stock_alerts;
CREATE POLICY "Admins can view all stock alerts"
  ON stock_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Drop and recreate admin insert policy with correct column
DROP POLICY IF EXISTS "Admins can insert stock alerts" ON stock_alerts;
CREATE POLICY "Admins can insert stock alerts"
  ON stock_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Drop and recreate admin update policy with correct column
DROP POLICY IF EXISTS "Admins can update stock alerts" ON stock_alerts;
CREATE POLICY "Admins can update stock alerts"
  ON stock_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FIX OTHER TABLES THAT MAY HAVE THE SAME ISSUE
-- =====================================================

-- Fix banks policies
DROP POLICY IF EXISTS "Admins can manage banks" ON banks;
CREATE POLICY "Admins can manage banks"
  ON banks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Ensure banks are readable by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view banks" ON banks;
CREATE POLICY "Authenticated users can view banks"
  ON banks FOR SELECT
  TO authenticated
  USING (true);

-- Fix devices policies
DROP POLICY IF EXISTS "Admins can manage devices" ON devices;
CREATE POLICY "Admins can manage devices"
  ON devices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Ensure devices are readable by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view devices" ON devices;
CREATE POLICY "Authenticated users can view devices"
  ON devices FOR SELECT
  TO authenticated
  USING (true);

-- Fix calls policies
DROP POLICY IF EXISTS "Admins can manage calls" ON calls;
CREATE POLICY "Admins can manage calls"
  ON calls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Ensure calls are readable by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view calls" ON calls;
CREATE POLICY "Authenticated users can view calls"
  ON calls FOR SELECT
  TO authenticated
  USING (true);

-- Fix user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;
CREATE POLICY "Admins can manage profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
    )
  );

-- Ensure all authenticated can view engineers (for assignment dropdowns)
DROP POLICY IF EXISTS "Authenticated users can view engineers" ON user_profiles;
CREATE POLICY "Authenticated users can view engineers"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Fix call_devices policies
DROP POLICY IF EXISTS "Authenticated users can view call devices" ON call_devices;
CREATE POLICY "Authenticated users can view call devices"
  ON call_devices FOR SELECT
  TO authenticated
  USING (true);

-- Fix inventory_movements policies
DROP POLICY IF EXISTS "Authenticated users can view inventory movements" ON inventory_movements;
CREATE POLICY "Authenticated users can view inventory movements"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- VERIFICATION COMMENT
-- =====================================================
COMMENT ON POLICY "Authenticated users can view banks" ON banks IS 'Fixed: Changed user_profiles.user_id to user_profiles.id';
