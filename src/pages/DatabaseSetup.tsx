import { useState } from 'react';
import { CheckCircle, Copy, ExternalLink, Database, Shield, Users } from 'lucide-react';

const MIGRATION_1_SUPER_ADMIN = `/*
  # Add Super Admin Role

  Your user_profiles table uses:
  - id = auth.users.id (primary key)
  - role = user_role ENUM ('admin', 'engineer')

  This migration adds 'super_admin' to the role enum.
*/

-- Step 1: Add 'super_admin' to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';

-- Step 2: Drop constraint that blocks super_admin status
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS admin_must_be_active_status;

-- Step 3: Add updated constraint that allows super_admin
ALTER TABLE user_profiles ADD CONSTRAINT admin_must_be_active_status
  CHECK (role NOT IN ('admin', 'super_admin') OR status != 'pending_approval');

-- Step 4: Create super_admin user
DO $$
DECLARE
  super_admin_id uuid;
BEGIN
  -- Check if super_admin already exists
  SELECT id INTO super_admin_id FROM auth.users WHERE email = 'superadmin@uds.com';

  IF super_admin_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'superadmin@uds.com',
      crypt('superadmin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Administrator"}',
      false,
      'authenticated',
      'authenticated',
      ''
    )
    RETURNING id INTO super_admin_id;

    -- Create identity
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      super_admin_id,
      jsonb_build_object('sub', super_admin_id, 'email', 'superadmin@uds.com'),
      'email',
      super_admin_id::text,
      now(),
      now(),
      now()
    );

    -- Create profile (id = user_id in your schema)
    INSERT INTO user_profiles (
      id,
      email,
      full_name,
      role,
      status,
      active,
      created_at,
      updated_at
    ) VALUES (
      super_admin_id,
      'superadmin@uds.com',
      'Super Administrator',
      'super_admin',
      'active',
      true,
      now(),
      now()
    );

    RAISE NOTICE 'Super admin created: superadmin@uds.com';
  ELSE
    -- Update existing user to super_admin role
    UPDATE user_profiles SET role = 'super_admin', status = 'active' WHERE id = super_admin_id;
    RAISE NOTICE 'Existing user updated to super_admin';
  END IF;
END $$;

-- Step 5: Helper functions
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_create_role(target_role text)
RETURNS boolean AS $$
DECLARE
  current_role user_role;
BEGIN
  SELECT role INTO current_role FROM user_profiles WHERE id = auth.uid();
  IF current_role = 'super_admin' THEN RETURN true; END IF;
  IF current_role = 'admin' AND target_role = 'engineer' THEN RETURN true; END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const MIGRATION_2_PERMISSIONS = `/*
  # Permissions System for Module-Based Access Control
*/

-- Create modules table
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
  ('dashboard', 'Dashboard', 'View dashboard with KPIs', 'LayoutDashboard', '/dashboard', 1),
  ('calls', 'Calls', 'Manage service calls', 'ClipboardList', '/calls', 2),
  ('devices', 'Devices', 'Manage POS devices', 'Smartphone', '/devices', 3),
  ('stock_movements', 'Stock Movements', 'Track inventory', 'ArrowLeftRight', '/stock-movements', 4),
  ('stock', 'Stock', 'Warehouse stock', 'Package', '/stock', 5),
  ('engineers', 'Engineers', 'Manage engineers', 'Users', '/engineers', 6),
  ('banks', 'Banks', 'Manage banks', 'Building', '/banks', 7),
  ('reports', 'Reports', 'Generate reports', 'FileText', '/reports', 8),
  ('alerts', 'Alerts', 'Stock alerts', 'Bell', '/alerts', 9),
  ('approvals', 'Approvals', 'User approvals', 'CheckSquare', '/approvals', 10),
  ('receive_stock', 'Receive Stock', 'Receive stock', 'PackagePlus', '/receive-stock', 11),
  ('in_transit', 'In Transit', 'Track transit', 'Truck', '/in-transit', 12)
ON CONFLICT (name) DO NOTHING;

-- Create user permissions table
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

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module_id ON user_permissions(module_id);

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active modules"
  ON modules FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Super admin manages permissions"
  ON user_permissions FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Permission check function
CREATE OR REPLACE FUNCTION has_module_access(module_name text, permission_type text DEFAULT 'view')
RETURNS boolean AS $$
DECLARE
  user_role_val user_role;
  has_permission boolean;
BEGIN
  SELECT role INTO user_role_val FROM user_profiles WHERE id = auth.uid();

  -- Super admin has all permissions
  IF user_role_val = 'super_admin' THEN RETURN true; END IF;

  -- Engineer has limited access
  IF user_role_val = 'engineer' THEN
    IF module_name IN ('dashboard', 'calls') AND permission_type = 'view' THEN RETURN true; END IF;
    RETURN false;
  END IF;

  -- Admin checks permissions table
  IF user_role_val = 'admin' THEN
    SELECT CASE permission_type
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

-- Grant all permissions function
CREATE OR REPLACE FUNCTION grant_all_permissions(target_user_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can grant permissions';
  END IF;

  INSERT INTO user_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete, granted_by)
  SELECT target_user_id, m.id, true, true, true, true, auth.uid()
  FROM modules m WHERE m.is_active = true
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    can_view = true, can_create = true, can_edit = true, can_delete = true,
    granted_by = auth.uid(), granted_at = now();
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
) RETURNS void AS $$
DECLARE
  mod_id uuid;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can grant permissions';
  END IF;

  SELECT id INTO mod_id FROM modules WHERE name = module_name;
  IF mod_id IS NULL THEN
    RAISE EXCEPTION 'Module not found: %', module_name;
  END IF;

  INSERT INTO user_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete, granted_by)
  VALUES (target_user_id, mod_id, p_can_view, p_can_create, p_can_edit, p_can_delete, auth.uid())
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    can_view = p_can_view, can_create = p_can_create, can_edit = p_can_edit, can_delete = p_can_delete,
    granted_by = auth.uid(), granted_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

export function DatabaseSetup() {
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract project ID from Supabase URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'your-project-id';
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Database Setup</h1>
              <p className="text-gray-500">Run these migrations in Supabase SQL Editor</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              <strong>Instructions:</strong> Run Step 1 first, wait for it to complete, then run Step 2.
              After setup, remove the /setup route from your app for security.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <a
              href={sqlEditorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Supabase SQL Editor
            </a>
            <button
              onClick={() => copyToClipboard(MIGRATION_1_SUPER_ADMIN + '\n\n' + MIGRATION_2_PERMISSIONS, setCopiedAll)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {copiedAll ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiedAll ? 'Copied All!' : 'Copy All SQL'}
            </button>
          </div>

          {/* Project Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 text-sm">
            <span className="text-gray-600">Project ID: </span>
            <code className="bg-gray-200 px-2 py-0.5 rounded">{projectId}</code>
          </div>

          {/* Migration 1 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Step 1: Super Admin Role</h2>
              </div>
              <button
                onClick={() => copyToClipboard(MIGRATION_1_SUPER_ADMIN, setCopied1)}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                {copied1 ? <CheckCircle className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied1 ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto">
              <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">{MIGRATION_1_SUPER_ADMIN}</pre>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Adds super_admin to role enum and creates superadmin@uds.com user.
            </p>
          </div>

          {/* Migration 2 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Step 2: Permissions System</h2>
              </div>
              <button
                onClick={() => copyToClipboard(MIGRATION_2_PERMISSIONS, setCopied2)}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                {copied2 ? <CheckCircle className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied2 ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto">
              <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">{MIGRATION_2_PERMISSIONS}</pre>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Creates modules and user_permissions tables for granular access control.
            </p>
          </div>

          {/* Credentials */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Super Admin Credentials</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Email:</span>
                <code className="ml-2 bg-blue-100 px-2 py-0.5 rounded">superadmin@uds.com</code>
              </div>
              <div>
                <span className="text-blue-700">Password:</span>
                <code className="ml-2 bg-blue-100 px-2 py-0.5 rounded">superadmin123</code>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Change this password immediately after first login!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
