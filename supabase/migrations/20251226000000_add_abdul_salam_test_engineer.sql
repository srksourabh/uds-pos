/*
  # Add Abdul Salam Test Engineer Account

  This migration creates a test engineer account for Abdul Salam
  to allow testing of call assignments and engineer workflows.

  ## Test Credentials
    - abdul.salam@costar.test / AbdulSalam123!
*/

-- Insert Abdul Salam auth user
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
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '00000000-0000-0000-0000-000000000000',
  'abdul.salam@costar.test',
  crypt('AbdulSalam123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Abdul Salam"}',
  false,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Insert Abdul Salam user profile
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  phone,
  role,
  status,
  active,
  bank_id,
  region,
  pincode,
  designation,
  employee_id
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'abdul.salam@costar.test',
  'Abdul Salam',
  '+91-9876543210',
  'engineer',
  'active',
  true,
  '11111111-1111-1111-1111-111111111111',
  'North',
  '110001',
  'Field Service Engineer',
  'ENG001'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  active = EXCLUDED.active,
  bank_id = EXCLUDED.bank_id,
  region = EXCLUDED.region,
  pincode = EXCLUDED.pincode,
  designation = EXCLUDED.designation,
  employee_id = EXCLUDED.employee_id,
  updated_at = now();
