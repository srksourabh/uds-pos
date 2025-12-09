/*
  ============================================
  FIX HELPER FUNCTIONS - SAFE VERSION
  ============================================

  This script safely recreates the helper functions
  without dropping dependent RLS policies.

  The trick: We use CREATE OR REPLACE but ensure
  the return types match exactly.
*/

-- =====================================================
-- STEP 1: Recreate functions with exact same signatures
-- =====================================================

-- These functions return BOOLEAN - should be safe to replace
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

CREATE OR REPLACE FUNCTION is_user_active()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT status = 'active' FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- These return UUID
CREATE OR REPLACE FUNCTION get_user_bank()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT bank_id FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- These return TEXT
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_status()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT status FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This returns SETOF user_profiles
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF user_profiles AS $$
BEGIN
  RETURN QUERY SELECT * FROM user_profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Ensure test users exist
-- =====================================================

-- Create admin user if not exists
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
    RAISE NOTICE 'Admin auth user already exists with id: %', admin_id;
  END IF;

  -- Create or update admin profile
  INSERT INTO user_profiles (id, email, full_name, role, status)
  VALUES (
    admin_id,
    'admin@uds.com',
    'System Admin',
    'admin',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  RAISE NOTICE 'Admin profile ready';
END $$;

-- Create engineer user if not exists
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
    RAISE NOTICE 'Engineer auth user already exists with id: %', engineer_id;
  END IF;

  -- Create or update engineer profile
  INSERT INTO user_profiles (id, email, full_name, role, status)
  VALUES (
    engineer_id,
    'engineer@uds.com',
    'Test Engineer',
    'engineer',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'engineer',
    status = 'active',
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  RAISE NOTICE 'Engineer profile ready';
END $$;

-- =====================================================
-- STEP 3: Verify
-- =====================================================

DO $$
DECLARE
  admin_exists boolean;
  engineer_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@uds.com') INTO admin_exists;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'engineer@uds.com') INTO engineer_exists;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SETUP COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Admin exists: %', admin_exists;
  RAISE NOTICE 'Engineer exists: %', engineer_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'Test Credentials:';
  RAISE NOTICE '  Admin: admin@uds.com / Admin@123';
  RAISE NOTICE '  Engineer: engineer@uds.com / Engineer@123';
  RAISE NOTICE '============================================';
END $$;
