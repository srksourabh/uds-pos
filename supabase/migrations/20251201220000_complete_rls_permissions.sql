/*
  # Complete RLS and Permissions

  ## Changes
  1. Add super_admin protection (cannot be deleted)
  2. Add RLS policies for stock_movements
  3. Add RLS policies for photos
  4. Add RLS policies for engineer_aggregates
  5. Add RLS policies for stock_alerts
  6. Add engineers ability to update devices during calls
*/

-- =====================================================
-- SUPER ADMIN PROTECTION
-- =====================================================

-- Function to check if user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Protect super_admin from deletion
CREATE OR REPLACE FUNCTION prevent_super_admin_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF is_super_admin(OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete super_admin user';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS prevent_super_admin_delete_trigger ON user_profiles;
CREATE TRIGGER prevent_super_admin_delete_trigger
  BEFORE DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_delete();

-- Prevent super_admin role from being changed
CREATE OR REPLACE FUNCTION prevent_super_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF is_super_admin(OLD.id) AND NEW.role != 'super_admin' THEN
    RAISE EXCEPTION 'Cannot change super_admin role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_super_admin_role_change_trigger ON user_profiles;
CREATE TRIGGER prevent_super_admin_role_change_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_role_change();

-- =====================================================
-- STOCK_MOVEMENTS TABLE POLICIES
-- =====================================================

-- Enable RLS if not enabled
ALTER TABLE IF EXISTS stock_movements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Engineers can view their stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated can insert stock movements" ON stock_movements;

-- Admins can view all stock movements
CREATE POLICY "Admins can view all stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Engineers can view their own stock movements
CREATE POLICY "Engineers can view their stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    from_engineer = auth.uid() OR
    to_engineer = auth.uid() OR
    actor_id = auth.uid()
  );

-- Authenticated users can insert stock movements (for tracking)
CREATE POLICY "Authenticated can insert stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- PHOTOS TABLE POLICIES
-- =====================================================

-- Enable RLS if not enabled
ALTER TABLE IF EXISTS photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all photos" ON photos;
DROP POLICY IF EXISTS "Engineers can view their uploaded photos" ON photos;
DROP POLICY IF EXISTS "Engineers can view photos for their calls" ON photos;
DROP POLICY IF EXISTS "Authenticated can insert photos" ON photos;

-- Admins can view all photos
CREATE POLICY "Admins can view all photos"
  ON photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Engineers can view their uploaded photos
CREATE POLICY "Engineers can view their uploaded photos"
  ON photos FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Engineers can view photos for their assigned calls
CREATE POLICY "Engineers can view photos for their calls"
  ON photos FOR SELECT
  TO authenticated
  USING (
    call_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = photos.call_id
      AND calls.assigned_engineer = auth.uid()
    )
  );

-- Authenticated users can insert photos
CREATE POLICY "Authenticated can insert photos"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- =====================================================
-- ENGINEER_AGGREGATES TABLE POLICIES
-- =====================================================

-- Enable RLS if not enabled
ALTER TABLE IF EXISTS engineer_aggregates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all engineer aggregates" ON engineer_aggregates;
DROP POLICY IF EXISTS "Engineers can view their own aggregates" ON engineer_aggregates;
DROP POLICY IF EXISTS "System can manage engineer aggregates" ON engineer_aggregates;

-- Admins can view all engineer aggregates
CREATE POLICY "Admins can view all engineer aggregates"
  ON engineer_aggregates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Engineers can view their own aggregates
CREATE POLICY "Engineers can view their own aggregates"
  ON engineer_aggregates FOR SELECT
  TO authenticated
  USING (engineer_id = auth.uid());

-- System can manage engineer aggregates (via service role)
CREATE POLICY "System can manage engineer aggregates"
  ON engineer_aggregates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STOCK_ALERTS TABLE POLICIES
-- =====================================================

-- Enable RLS if not enabled
ALTER TABLE IF EXISTS stock_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all stock alerts" ON stock_alerts;
DROP POLICY IF EXISTS "Engineers can view alerts involving them" ON stock_alerts;
DROP POLICY IF EXISTS "Admins can manage stock alerts" ON stock_alerts;

-- Admins can view all stock alerts
CREATE POLICY "Admins can view all stock alerts"
  ON stock_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Engineers can view alerts involving them
CREATE POLICY "Engineers can view alerts involving them"
  ON stock_alerts FOR SELECT
  TO authenticated
  USING (engineer_id = auth.uid());

-- Admins can insert stock alerts
CREATE POLICY "Admins can insert stock alerts"
  ON stock_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can update stock alerts
CREATE POLICY "Admins can update stock alerts"
  ON stock_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- ENHANCED DEVICE POLICIES FOR ENGINEERS
-- =====================================================

-- Allow engineers to update devices during their calls (e.g., mark as installed)
DROP POLICY IF EXISTS "Engineers can update devices in their calls" ON devices;
CREATE POLICY "Engineers can update devices in their calls"
  ON devices FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM call_devices
      JOIN calls ON calls.id = call_devices.call_id
      WHERE call_devices.device_id = devices.id
      AND calls.assigned_engineer = auth.uid()
      AND calls.status IN ('assigned', 'in_progress')
    )
  )
  WITH CHECK (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM call_devices
      JOIN calls ON calls.id = call_devices.call_id
      WHERE call_devices.device_id = devices.id
      AND calls.assigned_engineer = auth.uid()
      AND calls.status IN ('assigned', 'in_progress')
    )
  );

-- Allow engineers to insert call_devices for their assigned calls
DROP POLICY IF EXISTS "Engineers can insert call devices for their calls" ON call_devices;
CREATE POLICY "Engineers can insert call devices for their calls"
  ON call_devices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_devices.call_id
      AND calls.assigned_engineer = auth.uid()
      AND calls.status IN ('assigned', 'in_progress')
    )
  );

-- =====================================================
-- VERIFY ALL TABLES HAVE RLS ENABLED
-- =====================================================

-- This is a safe operation - it will enable RLS if not already enabled
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- =====================================================
-- ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON FUNCTION is_super_admin IS 'Checks if a user has super_admin role - super_admins cannot be deleted or have their role changed';
COMMENT ON FUNCTION prevent_super_admin_delete IS 'Trigger function to prevent deletion of super_admin users';
COMMENT ON FUNCTION prevent_super_admin_role_change IS 'Trigger function to prevent changing super_admin role';
