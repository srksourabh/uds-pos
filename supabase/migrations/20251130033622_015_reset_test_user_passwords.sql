/*
  # Reset Test User Passwords

  This migration resets the passwords for test users to ensure they can log in.

  ## Changes
    - Delete existing test users
    - Recreate them with proper passwords
    - Ensure email confirmation is set
    - Link to existing profiles

  ## Test Credentials
    - admin@costar.test / Admin123!
    - engineer@costar.test / Engineer123!
*/

-- Delete existing auth users
DELETE FROM auth.users WHERE email IN ('admin@costar.test', 'engineer@costar.test');

-- Insert admin with known password
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
  aud
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000000',
  'admin@costar.test',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"System Administrator"}',
  false,
  'authenticated',
  'authenticated'
);

-- Insert engineer with known password
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
  aud
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '00000000-0000-0000-0000-000000000000',
  'engineer@costar.test',
  crypt('Engineer123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Field Engineer"}',
  false,
  'authenticated',
  'authenticated'
);

-- Ensure profiles exist and are properly configured
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  status,
  active,
  bank_id
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'admin@costar.test',
  'System Administrator',
  'admin',
  'active',
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  status,
  active,
  bank_id
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'engineer@costar.test',
  'Field Engineer',
  'engineer',
  'active',
  true,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  active = EXCLUDED.active,
  bank_id = EXCLUDED.bank_id,
  updated_at = now();
