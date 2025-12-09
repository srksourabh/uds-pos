/*
  ============================================
  COMPLETE AUTH SETUP FOR UDS-POS
  ============================================

  Run this script in Supabase SQL Editor to set up:
  1. Required tables (if not exist)
  2. Test admin and engineer users
  3. RLS policies for authentication
  4. Helper functions

  After running this, you can login with:
  - admin@uds.com / Admin@123 (admin role)
  - engineer@uds.com / Engineer@123 (engineer role)
*/

-- =====================================================
-- STEP 1: CREATE BANKS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  contact_person text,
  contact_email text,
  contact_phone text,
  address text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Insert a default bank for testing
INSERT INTO banks (id, name, code, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Bank', 'DEFAULT', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- STEP 2: CREATE USER_PROFILES TABLE (if not exists)
-- =====================================================

-- Check if table exists and create with proper schema
DO $$
BEGIN
  -- Create table if not exists
  CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    full_name text NOT NULL,
    phone text,
    role text DEFAULT 'engineer',
    bank_id uuid REFERENCES banks(id) ON DELETE SET NULL,
    region text,
    skills jsonb DEFAULT '{}',
    status text DEFAULT 'pending_approval',
    avatar_url text,
    last_location_lat numeric(10,6),
    last_location_lng numeric(10,6),
    last_location_updated_at timestamptz,
    totp_enabled boolean DEFAULT false,
    metadata jsonb DEFAULT '{}',
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN
    RAISE NOTICE 'user_profiles table already exists';
END $$;

-- Add missing columns if table exists but is older schema
DO $$
BEGIN
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_approval';
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS region text;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '{}';
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_location_lat numeric(10,6);
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_location_lng numeric(10,6);
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_location_updated_at timestamptz;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS totp_enabled boolean DEFAULT false;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Some columns may already exist: %', SQLERRM;
END $$;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Add role constraint
DO $$
BEGIN
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('super_admin', 'admin', 'engineer', 'warehouse', 'courier'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add role constraint: %', SQLERRM;
END $$;

-- Add status constraint
DO $$
BEGIN
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_status_check;
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_status_check
    CHECK (status IN ('active', 'pending_approval', 'suspended', 'inactive'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add status constraint: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- =====================================================

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_super_admin();
DROP FUNCTION IF EXISTS get_user_bank();
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_status();
DROP FUNCTION IF EXISTS is_user_active();
DROP FUNCTION IF EXISTS get_my_profile();

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's bank
CREATE OR REPLACE FUNCTION get_user_bank()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT bank_id FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's status
CREATE OR REPLACE FUNCTION get_user_status()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT status FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is active
CREATE OR REPLACE FUNCTION is_user_active()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT status = 'active' FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get own profile (RLS bypass for self)
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF user_profiles AS $$
BEGIN
  RETURN QUERY SELECT * FROM user_profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: CREATE RLS POLICIES
-- =====================================================

-- Banks policies
DROP POLICY IF EXISTS "Anyone authenticated can view banks" ON banks;
CREATE POLICY "Anyone authenticated can view banks"
  ON banks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage banks" ON banks;
CREATE POLICY "Admins can manage banks"
  ON banks FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- User profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;
CREATE POLICY "Admins can manage profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() OR is_admin());

-- =====================================================
-- STEP 5: CREATE TEST USERS
-- =====================================================

-- Create admin user
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if admin already exists
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@uds.com';

  IF admin_id IS NULL THEN
    -- Create admin in auth.users
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
      'admin@uds.com',
      crypt('Admin@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"System Admin"}',
      false,
      'authenticated',
      'authenticated',
      ''
    ) RETURNING id INTO admin_id;

    -- Create identity for admin
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
      admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@uds.com'),
      'email',
      admin_id::text,
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Admin auth user created: admin@uds.com';
  ELSE
    RAISE NOTICE 'Admin auth user already exists';
  END IF;

  -- Create or update admin profile
  INSERT INTO user_profiles (id, email, full_name, role, status, bank_id)
  VALUES (
    admin_id,
    'admin@uds.com',
    'System Admin',
    'admin',
    'active',
    '00000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  RAISE NOTICE 'Admin profile created/updated';
END $$;

-- Create engineer user
DO $$
DECLARE
  engineer_id uuid;
BEGIN
  -- Check if engineer already exists
  SELECT id INTO engineer_id FROM auth.users WHERE email = 'engineer@uds.com';

  IF engineer_id IS NULL THEN
    -- Create engineer in auth.users
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
      'engineer@uds.com',
      crypt('Engineer@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Test Engineer"}',
      false,
      'authenticated',
      'authenticated',
      ''
    ) RETURNING id INTO engineer_id;

    -- Create identity for engineer
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
      engineer_id,
      jsonb_build_object('sub', engineer_id::text, 'email', 'engineer@uds.com'),
      'email',
      engineer_id::text,
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Engineer auth user created: engineer@uds.com';
  ELSE
    RAISE NOTICE 'Engineer auth user already exists';
  END IF;

  -- Create or update engineer profile
  INSERT INTO user_profiles (id, email, full_name, role, status, bank_id)
  VALUES (
    engineer_id,
    'engineer@uds.com',
    'Test Engineer',
    'engineer',
    'active',
    '00000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'engineer',
    status = 'active',
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  RAISE NOTICE 'Engineer profile created/updated';
END $$;

-- =====================================================
-- STEP 6: VERIFY SETUP
-- =====================================================

-- Output verification
DO $$
DECLARE
  bank_count int;
  user_count int;
  admin_exists boolean;
  engineer_exists boolean;
BEGIN
  SELECT COUNT(*) INTO bank_count FROM banks;
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@uds.com') INTO admin_exists;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'engineer@uds.com') INTO engineer_exists;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'AUTH SETUP COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Banks: %', bank_count;
  RAISE NOTICE 'User Profiles: %', user_count;
  RAISE NOTICE 'Admin exists: %', admin_exists;
  RAISE NOTICE 'Engineer exists: %', engineer_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'Test Credentials:';
  RAISE NOTICE '  Admin: admin@uds.com / Admin@123';
  RAISE NOTICE '  Engineer: engineer@uds.com / Engineer@123';
  RAISE NOTICE '============================================';
END $$;
