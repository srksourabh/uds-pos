/*
  # Permissions System for Role-Based Access Control

  ## Overview
  - Super Admin: Full access to everything, can assign permissions to admins
  - Admin: Module-based access controlled by super_admin
  - Engineer: Access only to their assigned calls and inventory

  ## Modules
  1. dashboard - View dashboard and KPIs
  2. calls - Manage service calls
  3. devices - Manage device inventory
  4. stock_movements - View/manage stock movements
  5. engineers - Manage engineers
  6. banks - Manage banks/organizations
  7. reports - View and generate reports
  8. user_management - Create and manage users
  9. settings - System settings
  10. map - Live map view
  11. alerts - Stock alerts and notifications
  12. approvals - Approval workflows
*/

-- =====================================================
-- CREATE MODULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  icon text,
  route text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Insert available modules
INSERT INTO modules (name, display_name, description, icon, route, sort_order) VALUES
  ('dashboard', 'Dashboard', 'View dashboard with KPIs and overview', 'LayoutDashboard', '/dashboard', 1),
  ('calls', 'Calls Management', 'View and manage service calls', 'ClipboardList', '/calls', 2),
  ('devices', 'Device Inventory', 'Manage POS devices', 'Smartphone', '/devices', 3),
  ('stock_movements', 'Stock Movements', 'Track inventory movements', 'ArrowLeftRight', '/stock-movements', 4),
  ('stock', 'Stock Management', 'Manage warehouse stock', 'Package', '/stock', 5),
  ('engineers', 'Engineers', 'Manage field engineers', 'Users', '/engineers', 6),
  ('banks', 'Banks', 'Manage bank organizations', 'Building', '/banks', 7),
  ('reports', 'Reports', 'View and generate reports', 'FileText', '/reports', 8),
  ('user_management', 'User Management', 'Create and manage users', 'UserCog', '/users', 9),
  ('map', 'Live Map', 'View live map with engineers and calls', 'Map', '/map', 10),
  ('alerts', 'Alerts', 'Stock alerts and notifications', 'Bell', '/alerts', 11),
  ('approvals', 'Approvals', 'User approval workflows', 'CheckSquare', '/approvals', 12),
  ('settings', 'Settings', 'System settings', 'Settings', '/settings', 13)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- CREATE USER PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  can_view boolean DEFAULT true,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module_id ON user_permissions(module_id);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Modules: Everyone can view active modules
CREATE POLICY "Anyone can view active modules"
  ON modules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User Permissions: Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    is_super_admin()
  );

-- Only super_admin can manage permissions
CREATE POLICY "Super admin can manage all permissions"
  ON user_permissions FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user has permission for a module
CREATE OR REPLACE FUNCTION has_module_access(module_name text, permission_type text DEFAULT 'view')
RETURNS boolean AS $$
DECLARE
  user_role text;
  has_permission boolean;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM user_profiles WHERE user_id = auth.uid();

  -- Super admin has all permissions
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Engineers have limited predefined access
  IF user_role = 'engineer' THEN
    -- Engineers can only view their calls and inventory
    IF module_name IN ('dashboard', 'calls') AND permission_type = 'view' THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;

  -- Check admin permissions from user_permissions table
  IF user_role = 'admin' THEN
    SELECT
      CASE permission_type
        WHEN 'view' THEN can_view
        WHEN 'create' THEN can_create
        WHEN 'edit' THEN can_edit
        WHEN 'delete' THEN can_delete
        ELSE can_view
      END INTO has_permission
    FROM user_permissions up
    JOIN modules m ON m.id = up.module_id
    WHERE up.user_id = auth.uid() AND m.name = module_name;

    RETURN COALESCE(has_permission, false);
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all modules user has access to
CREATE OR REPLACE FUNCTION get_user_modules()
RETURNS TABLE (
  module_name text,
  display_name text,
  icon text,
  route text,
  can_view boolean,
  can_create boolean,
  can_edit boolean,
  can_delete boolean
) AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM user_profiles WHERE user_id = auth.uid();

  -- Super admin gets all modules
  IF user_role = 'super_admin' THEN
    RETURN QUERY
    SELECT
      m.name,
      m.display_name,
      m.icon,
      m.route,
      true,
      true,
      true,
      true
    FROM modules m
    WHERE m.is_active = true
    ORDER BY m.sort_order;
    RETURN;
  END IF;

  -- Engineer gets limited modules
  IF user_role = 'engineer' THEN
    RETURN QUERY
    SELECT
      m.name,
      m.display_name,
      m.icon,
      m.route,
      true,
      false,
      m.name = 'calls', -- can edit calls
      false
    FROM modules m
    WHERE m.is_active = true AND m.name IN ('dashboard', 'calls')
    ORDER BY m.sort_order;
    RETURN;
  END IF;

  -- Admin gets assigned modules
  IF user_role = 'admin' THEN
    RETURN QUERY
    SELECT
      m.name,
      m.display_name,
      m.icon,
      m.route,
      up.can_view,
      up.can_create,
      up.can_edit,
      up.can_delete
    FROM modules m
    JOIN user_permissions up ON up.module_id = m.id
    WHERE m.is_active = true
      AND up.user_id = auth.uid()
      AND up.can_view = true
    ORDER BY m.sort_order;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant all permissions to a user (for super_admin to use)
CREATE OR REPLACE FUNCTION grant_all_permissions(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Only super_admin can do this
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can grant all permissions';
  END IF;

  INSERT INTO user_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete, granted_by)
  SELECT
    target_user_id,
    m.id,
    true,
    true,
    true,
    true,
    auth.uid()
  FROM modules m
  WHERE m.is_active = true
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET
    can_view = true,
    can_create = true,
    can_edit = true,
    can_delete = true,
    granted_by = auth.uid(),
    granted_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant specific module permission
CREATE OR REPLACE FUNCTION grant_module_permission(
  target_user_id uuid,
  module_name text,
  p_can_view boolean DEFAULT true,
  p_can_create boolean DEFAULT false,
  p_can_edit boolean DEFAULT false,
  p_can_delete boolean DEFAULT false
)
RETURNS void AS $$
DECLARE
  mod_id uuid;
BEGIN
  -- Only super_admin can do this
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can grant permissions';
  END IF;

  SELECT id INTO mod_id FROM modules WHERE name = module_name;

  IF mod_id IS NULL THEN
    RAISE EXCEPTION 'Module not found: %', module_name;
  END IF;

  INSERT INTO user_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete, granted_by)
  VALUES (target_user_id, mod_id, p_can_view, p_can_create, p_can_edit, p_can_delete, auth.uid())
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET
    can_view = p_can_view,
    can_create = p_can_create,
    can_edit = p_can_edit,
    can_delete = p_can_delete,
    granted_by = auth.uid(),
    granted_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke module permission
CREATE OR REPLACE FUNCTION revoke_module_permission(target_user_id uuid, module_name text)
RETURNS void AS $$
BEGIN
  -- Only super_admin can do this
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can revoke permissions';
  END IF;

  DELETE FROM user_permissions
  WHERE user_id = target_user_id
    AND module_id = (SELECT id FROM modules WHERE name = module_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ADD PERMISSIONS COLUMN TO USER_PROFILES (for quick access)
-- =====================================================

-- Add permissions summary to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}';

COMMENT ON COLUMN user_profiles.permissions IS 'Quick access permissions summary, synced from user_permissions table';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE modules IS 'Available system modules for permission assignment';
COMMENT ON TABLE user_permissions IS 'User-specific permissions for each module';
COMMENT ON FUNCTION has_module_access IS 'Check if current user has access to a specific module';
COMMENT ON FUNCTION get_user_modules IS 'Get all modules the current user has access to';
COMMENT ON FUNCTION grant_all_permissions IS 'Grant all module permissions to a user (super_admin only)';
COMMENT ON FUNCTION grant_module_permission IS 'Grant specific module permission to a user (super_admin only)';
