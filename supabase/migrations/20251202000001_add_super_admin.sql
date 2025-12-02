/*
  # Add Super Admin Role and User

  ## Changes
  1. Update role enum to include 'super_admin'
  2. Create super_admin user
  3. Add RLS policies for role hierarchy:
     - super_admin can create admins and engineers
     - admin can only create engineers (not admins or super_admins)
     - engineer cannot create anyone
*/

-- =====================================================
-- UPDATE ROLE ENUM (if using enum type)
-- =====================================================

-- First check if role column uses an enum or text
-- If it's text, we just need to ensure valid values in application logic
-- Add a check constraint for valid roles
DO $$
BEGIN
  -- Drop existing constraint if any
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

  -- Add new constraint with super_admin
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('super_admin', 'admin', 'engineer', 'warehouse', 'courier'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add role constraint: %', SQLERRM;
END $$;

-- =====================================================
-- CREATE SUPER ADMIN USER
-- =====================================================

-- Create super_admin auth user (password: superadmin123)
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

    -- Create profile
    INSERT INTO user_profiles (
      id,
      user_id,
      email,
      full_name,
      role,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      super_admin_id,
      'superadmin@uds.com',
      'Super Administrator',
      'super_admin',
      true,
      now(),
      now()
    );

    RAISE NOTICE 'Super admin created with email: superadmin@uds.com';
  ELSE
    -- Update existing user to super_admin role
    UPDATE user_profiles SET role = 'super_admin' WHERE user_id = super_admin_id;
    RAISE NOTICE 'Existing user updated to super_admin role';
  END IF;
END $$;

-- =====================================================
-- HELPER FUNCTIONS FOR ROLE HIERARCHY
-- =====================================================

-- Check if current user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is admin (includes super_admin)
CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can create a specific role
CREATE OR REPLACE FUNCTION can_create_role(target_role text)
RETURNS boolean AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role FROM user_profiles WHERE user_id = auth.uid();

  -- super_admin can create any role
  IF current_role = 'super_admin' THEN
    RETURN true;
  END IF;

  -- admin can only create engineers, warehouse, courier
  IF current_role = 'admin' AND target_role IN ('engineer', 'warehouse', 'courier') THEN
    RETURN true;
  END IF;

  -- engineers and others cannot create users
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE RLS POLICIES FOR USER MANAGEMENT
-- =====================================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;

-- New policy: Role-based user creation
CREATE POLICY "Role-based user creation"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can create anyone
    is_super_admin() OR
    -- Admin can only create engineers, warehouse, courier
    (is_admin_or_above() AND role IN ('engineer', 'warehouse', 'courier'))
  );

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile, admins can update all" ON user_profiles;

-- New policy: Role-based user updates
CREATE POLICY "Role-based user updates"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    user_id = auth.uid() OR
    -- Super admin can update anyone except other super_admins
    (is_super_admin() AND (role != 'super_admin' OR user_id = auth.uid())) OR
    -- Admin can update engineers, warehouse, courier only
    (is_admin_or_above() AND NOT is_super_admin() AND role IN ('engineer', 'warehouse', 'courier'))
  )
  WITH CHECK (
    -- Users updating own profile cannot change their role
    (user_id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE user_id = auth.uid())) OR
    -- Super admin can set any role
    is_super_admin() OR
    -- Admin can only set engineer, warehouse, courier roles
    (is_admin_or_above() AND role IN ('engineer', 'warehouse', 'courier'))
  );

-- =====================================================
-- PREVENT ROLE ESCALATION
-- =====================================================

-- Trigger to prevent role escalation
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get the role of the user making the change
  SELECT role INTO current_user_role FROM user_profiles WHERE user_id = auth.uid();

  -- Super admin can do anything
  IF current_user_role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- Admin trying to create/update to admin or super_admin role
  IF NEW.role IN ('admin', 'super_admin') AND current_user_role = 'admin' THEN
    RAISE EXCEPTION 'Admins cannot create or promote users to admin or super_admin role';
  END IF;

  -- Engineer or below trying to create users
  IF current_user_role IN ('engineer', 'warehouse', 'courier') AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'You do not have permission to create users';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON user_profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- =====================================================
-- ADD COMMENTS
-- =====================================================

COMMENT ON FUNCTION is_super_admin() IS 'Returns true if current user has super_admin role';
COMMENT ON FUNCTION is_admin_or_above() IS 'Returns true if current user has admin or super_admin role';
COMMENT ON FUNCTION can_create_role(text) IS 'Returns true if current user can create a user with the specified role';
COMMENT ON FUNCTION prevent_role_escalation() IS 'Trigger function to prevent unauthorized role escalation';
