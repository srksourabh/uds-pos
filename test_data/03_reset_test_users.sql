-- ==================================================
-- RESET AND CREATE TEST USERS
-- ==================================================
-- This script:
-- 1. Deletes all existing user data
-- 2. Creates new auth users with known passwords
-- 3. Creates corresponding user profiles
-- ==================================================

-- ==================================================
-- PART 1: CLEAN UP EXISTING DATA
-- ==================================================

-- Delete in correct order to avoid foreign key violations
DELETE FROM engineer_aggregates;
DELETE FROM stock_alerts;
DELETE FROM photos;
DELETE FROM stock_movements;
DELETE FROM call_devices;
DELETE FROM calls;
DELETE FROM devices;
DELETE FROM warehouses;
DELETE FROM couriers;
DELETE FROM user_profiles;
DELETE FROM banks;

-- Delete all auth users (this will cascade to user_profiles due to FK)
DELETE FROM auth.users;

-- ==================================================
-- PART 2: CREATE TEST AUTH USERS
-- ==================================================
-- Password for all users: Test@123
-- Password hash for 'Test@123' using Supabase's bcrypt

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
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES
-- Super Admin
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000000',
  'superadmin@test.com',
  crypt('Test@123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Super Admin"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
),
-- Admin
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '00000000-0000-0000-0000-000000000000',
  'admin@test.com',
  crypt('Test@123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Admin User"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
),
-- Engineer 1
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '00000000-0000-0000-0000-000000000000',
  'engineer1@test.com',
  crypt('Test@123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Rahul Kumar"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
),
-- Engineer 2
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '00000000-0000-0000-0000-000000000000',
  'engineer2@test.com',
  crypt('Test@123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Priya Singh"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- ==================================================
-- PART 3: CREATE BANKS
-- ==================================================

INSERT INTO banks (id, name, code, active) VALUES
('11111111-1111-1111-1111-111111111111', 'HDFC Bank', 'HDFC', true),
('22222222-2222-2222-2222-222222222222', 'ICICI Bank', 'ICICI', true),
('33333333-3333-3333-3333-333333333333', 'Axis Bank', 'AXIS', true);

-- ==================================================
-- PART 4: CREATE USER PROFILES
-- ==================================================

INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, region, active) VALUES
-- Super Admin
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'superadmin@test.com', 'Super Admin', '+919999900001', 'super_admin', NULL, 'active', 'All India', true),
-- Admin
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin@test.com', 'Admin User', '+919999900002', 'admin', NULL, 'active', 'All India', true),
-- Engineer 1 - HDFC Bank
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'engineer1@test.com', 'Rahul Kumar', '+919999900003', 'engineer', '11111111-1111-1111-1111-111111111111', 'active', 'North', true),
-- Engineer 2 - ICICI Bank
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'engineer2@test.com', 'Priya Singh', '+919999900004', 'engineer', '22222222-2222-2222-2222-222222222222', 'active', 'South', true);

-- ==================================================
-- PART 5: CREATE WAREHOUSES & COURIERS
-- ==================================================

INSERT INTO warehouses (name, code, address, manager_name, is_active) VALUES
('Delhi Warehouse', 'WH-DEL', 'Nehru Place, New Delhi', 'Amit Kumar', true),
('Mumbai Warehouse', 'WH-MUM', 'Andheri East, Mumbai', 'Pradeep Shah', true);

INSERT INTO couriers (name, code, is_active) VALUES
('Blue Dart', 'BD', true),
('DTDC', 'DTDC', true);

-- ==================================================
-- PART 6: CREATE DEVICES
-- ==================================================

INSERT INTO devices (serial_number, model, device_bank, status) VALUES
('SN-TEST-001', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'warehouse'),
('SN-TEST-002', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'warehouse'),
('SN-TEST-003', 'Verifone VX520', '22222222-2222-2222-2222-222222222222', 'warehouse'),
('SN-TEST-004', 'Verifone VX520', '22222222-2222-2222-2222-222222222222', 'warehouse'),
('SN-TEST-005', 'PAX D210', '33333333-3333-3333-3333-333333333333', 'warehouse'),
('SN-TEST-006', 'PAX A920', '11111111-1111-1111-1111-111111111111', 'warehouse');

-- ==================================================
-- PART 7: CREATE SERVICE CALLS
-- ==================================================

INSERT INTO calls (
  call_number, type, status, client_bank, client_name,
  client_contact, client_phone, client_address,
  latitude, longitude, scheduled_date, priority, description
) VALUES
-- Pending
('CALL-2024-0001', 'install', 'pending', '11111111-1111-1111-1111-111111111111',
 'Sharma Electronics', 'Mr. Sharma', '+919111222333',
 'Connaught Place, New Delhi', 28.6304, 77.2177,
 CURRENT_DATE, 'high', 'New POS installation'),

-- Assigned to Engineer 1
('CALL-2024-0002', 'maintenance', 'assigned', '11111111-1111-1111-1111-111111111111',
 'Kumar Store', 'Mr. Kumar', '+919222333444',
 'Karol Bagh, New Delhi', 28.6519, 77.1909,
 CURRENT_DATE, 'medium', 'POS not printing'),

-- In Progress by Engineer 2
('CALL-2024-0003', 'breakdown', 'in_progress', '22222222-2222-2222-2222-222222222222',
 'Gupta Mart', 'Ms. Gupta', '+919333444555',
 'Andheri West, Mumbai', 19.1136, 72.8697,
 CURRENT_DATE, 'urgent', 'Device not working'),

-- Completed
('CALL-2024-0004', 'install', 'completed', '22222222-2222-2222-2222-222222222222',
 'Singh Medical', 'Dr. Singh', '+919444555666',
 'Bandra, Mumbai', 19.0596, 72.8295,
 CURRENT_DATE - 1, 'medium', 'Installation done');

-- Assign engineers to calls
UPDATE calls SET assigned_engineer = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
WHERE call_number = 'CALL-2024-0002';

UPDATE calls SET
  assigned_engineer = 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  started_at = NOW() - INTERVAL '1 hour'
WHERE call_number = 'CALL-2024-0003';

UPDATE calls SET
  assigned_engineer = 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  started_at = NOW() - INTERVAL '25 hours',
  completed_at = NOW() - INTERVAL '24 hours',
  resolution_notes = 'Installation completed successfully'
WHERE call_number = 'CALL-2024-0004';

-- ==================================================
-- VERIFICATION
-- ==================================================

SELECT 'AUTH USERS:' as info;
SELECT id, email FROM auth.users;

SELECT 'USER PROFILES:' as info;
SELECT id, email, full_name, role, status FROM user_profiles;

SELECT 'DATA COUNTS:' as info;
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM user_profiles) as profiles,
  (SELECT COUNT(*) FROM banks) as banks,
  (SELECT COUNT(*) FROM devices) as devices,
  (SELECT COUNT(*) FROM calls) as calls;

SELECT '
============================================
TEST ACCOUNTS CREATED SUCCESSFULLY!
============================================
Login Credentials (Password: Test@123)

SUPER ADMIN:
  Email: superadmin@test.com
  Password: Test@123

ADMIN:
  Email: admin@test.com
  Password: Test@123

ENGINEER 1:
  Email: engineer1@test.com
  Password: Test@123

ENGINEER 2:
  Email: engineer2@test.com
  Password: Test@123
============================================
' as credentials;
