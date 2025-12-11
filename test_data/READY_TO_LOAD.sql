-- =====================================================
-- Production Realistic Test Data for UDS-POS
-- READY TO LOAD - Uses your existing user UUIDs
-- =====================================================
-- This test data matches EXACT patterns from production:
-- - Employee IDs: UDSPL + 4 digits
-- - Call Numbers: PPSINKOOR/PPSINKOWB/FB/RR + digits
-- - TIDs: SB/OD/WB + 6 digits
-- - MIDs: 15-digit numbers starting with 022
-- - Serial Numbers: Various vendor formats
-- =====================================================

-- Your existing UUIDs:
-- Admin:     6092ed26-43ac-4f6b-bcba-61da32adb75c
-- Engineer1: 4d41c32a-dd3c-4090-80dd-a1f8a422f6c8
-- Engineer2: ea4583ec-e579-45a2-baf8-dbe048d258b2

-- First, ensure we have the bank
INSERT INTO banks (id, name, code, active) VALUES
('b0000001-0000-0000-0000-000000000001', 'State Bank of India', 'SBI', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- =====================================================
-- UPDATE EXISTING USERS with production-realistic data
-- =====================================================

-- Update Engineer 1 (your existing engineer1@uds.com)
UPDATE user_profiles SET
  full_name = 'Mukesh Sahoo',
  phone = '9937990629',
  role = 'engineer',
  status = 'active',
  region = 'UDS-BHUBANESWAR',
  active = true,
  last_location_lat = 20.4798355,
  last_location_lng = 85.8206754,
  metadata = '{"emp_id": "UDSPL1191", "designation": "Field Engineer", "coordinator": "Dev Narayan Samal", "city": "CUTTACK", "state": "Odisha", "pin_code": "753001", "coverage_areas": ["CUTTACK", "JAGATSINGHPUR"]}'::jsonb
WHERE id = '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8';

-- Update Engineer 2 (your existing engineer2@uds.com)
UPDATE user_profiles SET
  full_name = 'Hemanta Pramanik',
  phone = '7679588187',
  role = 'engineer',
  status = 'active',
  region = 'UDS-KOLKATA (S)',
  active = true,
  last_location_lat = 23.3318,
  last_location_lng = 86.2605,
  metadata = '{"emp_id": "UDSPL1218", "designation": "Field Engineer", "coordinator": "Ujjwal Chatterjee", "city": "PURULIYA", "state": "West Bengal", "pin_code": "723102", "coverage_areas": ["PURULIYA"]}'::jsonb
WHERE id = 'ea4583ec-e579-45a2-baf8-dbe048d258b2';

-- =====================================================
-- CREATE 3 MORE ENGINEERS (new users)
-- =====================================================

-- Engineer 3: Guwahati Region
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('e3333333-3333-3333-3333-333333333333', 'tankeshwar.sahu@uds.test', crypt('engineer123', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_profiles (
  id, email, full_name, phone, role, status, region, active,
  last_location_lat, last_location_lng,
  bank_id,
  metadata
) VALUES (
  'e3333333-3333-3333-3333-333333333333',
  'tankeshwar.sahu@uds.test',
  'Tankeshwar Sahu',
  '+918720991951',
  'engineer',
  'active',
  'UDS-GUWAHATI',
  true,
  27.4765, 95.0168,
  'b0000001-0000-0000-0000-000000000001',
  '{"emp_id": "UDSPL1326", "designation": "Field Engineer", "coordinator": "Sourav Ghatak", "city": "DIBRUGARH", "state": "Assam", "pin_code": "786012", "coverage_areas": ["DIBRUGARH", "Tinsukia", "Arunachal Pradesh"]}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  region = EXCLUDED.region,
  bank_id = EXCLUDED.bank_id,
  metadata = EXCLUDED.metadata;

-- Engineer 4: Rourkela Region
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('e4444444-4444-4444-4444-444444444444', 'prabin.munda@uds.test', crypt('engineer123', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_profiles (
  id, email, full_name, phone, role, status, region, active,
  last_location_lat, last_location_lng,
  bank_id,
  metadata
) VALUES (
  'e4444444-4444-4444-4444-444444444444',
  'prabin.munda@uds.test',
  'Prabin Kumar Munda',
  '+917381441889',
  'engineer',
  'active',
  'UDS-ROURKELA',
  true,
  22.0138, 84.0432,
  'b0000001-0000-0000-0000-000000000001',
  '{"emp_id": "UDSPL1195", "designation": "Field Engineer", "coordinator": "Priyanka Priyadarsani Nayak", "city": "SUNDARGARH", "state": "Odisha", "pin_code": "770019", "coverage_areas": ["SUNDARGARH", "JHARSUGUDA"]}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  region = EXCLUDED.region,
  bank_id = EXCLUDED.bank_id,
  metadata = EXCLUDED.metadata;

-- Engineer 5: Ranchi Region
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('e5555555-5555-5555-5555-555555555555', 'brahmdeo.mahto@uds.test', crypt('engineer123', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_profiles (
  id, email, full_name, phone, role, status, region, active,
  last_location_lat, last_location_lng,
  bank_id,
  metadata
) VALUES (
  'e5555555-5555-5555-5555-555555555555',
  'brahmdeo.mahto@uds.test',
  'Brahmdeo Mahto',
  '+918789276982',
  'engineer',
  'active',
  'UDS-RANCHI',
  true,
  23.3520, 85.3155,
  'b0000001-0000-0000-0000-000000000001',
  '{"emp_id": "UDSPL1373", "designation": "Field Engineer", "coordinator": "Puspita Bhaduri", "city": "RANCHI", "state": "Jharkhand", "pin_code": "834002", "coverage_areas": ["RANCHI", "LOHARDAGA", "KHUNTI", "RAMGARH", "GUMLA"]}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  region = EXCLUDED.region,
  bank_id = EXCLUDED.bank_id,
  metadata = EXCLUDED.metadata;

-- =====================================================
-- DEVICES (30 devices matching inventory patterns)
-- Uses YOUR existing engineer UUIDs
-- =====================================================

-- Soundbox Devices (ET389)
INSERT INTO devices (id, serial_number, model, device_bank, status, current_location, assigned_to, notes, metadata) VALUES
('d0000001-0000-0000-0000-000000000001', 'XQZ2111202400894', 'ET389-WIFI', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Soundbox device', '{"brand": "FUJIAN", "part_category": "Unit", "tid": "SB217622", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000002-0000-0000-0000-000000000002', 'XGZ1909202518443', 'ET389-WIFI', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-KOLKATA (S)', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Soundbox device', '{"brand": "FUJIAN", "part_category": "Unit", "tid": "SB202153", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000003-0000-0000-0000-000000000003', 'XGZ1709202502317', 'ET389-WIFI', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-KOLKATA (S)', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Soundbox device', '{"brand": "FUJIAN", "part_category": "Unit", "tid": "SB133327", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000004-0000-0000-0000-000000000004', 'XGZ1809202517051', 'ET389-WIFI', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-ROURKELA', 'e4444444-4444-4444-4444-444444444444', 'Soundbox device', '{"brand": "FUJIAN", "part_category": "Unit", "tid": "SB158523", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000005-0000-0000-0000-000000000005', '38250306910163', 'ET389-WIFI', 'b0000001-0000-0000-0000-000000000001', 'warehouse', 'UDS-BHUBANESWAR', NULL, 'Soundbox in stock', '{"brand": "FUJIAN", "part_category": "Unit", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000006-0000-0000-0000-000000000006', '38241212910678', 'ET389-WIFI', 'b0000001-0000-0000-0000-000000000001', 'warehouse', 'UDS-ROURKELA', NULL, 'Soundbox in stock', '{"brand": "FUJIAN", "part_category": "Unit", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000007-0000-0000-0000-000000000007', '38250715322116', 'ET389-WIFI', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-GUWAHATI', 'e3333333-3333-3333-3333-333333333333', 'Soundbox device', '{"brand": "FUJIAN", "part_category": "Unit", "tid": "SB179725", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),

-- Android POS Devices (A910s)
('d0000008-0000-0000-0000-000000000008', 'F3601014A808511', 'A910s', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Android POS', '{"brand": "PAX", "part_category": "Unit", "tid": "OD081684", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000009-0000-0000-0000-000000000009', 'F3601014A813429', 'A910s', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-KOLKATA (S)', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Android POS', '{"brand": "PAX", "part_category": "Unit", "tid": "WB076374", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000010-0000-0000-0000-000000000010', 'F3601014A816296', 'A910s', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-KOLKATA (S)', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Android POS', '{"brand": "PAX", "part_category": "Unit", "tid": "WB049932", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),

-- Ingenico Devices
('d0000011-0000-0000-0000-000000000011', '13364WL21273323', 'IWL220', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Portable GPRS terminal', '{"brand": "Ingenico", "part_category": "Unit", "ageing": 417, "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000012-0000-0000-0000-000000000012', '14103CT21749159', 'ICT220', 'b0000001-0000-0000-0000-000000000001', 'warehouse', 'UDS-BHUBANESWAR', NULL, 'Countertop terminal', '{"brand": "Ingenico", "part_category": "Unit", "ageing": 74, "owner_type": "Bank Center", "owner_name": "State Bank of India", "defective_reason": "De-Installation Close"}'::jsonb),
('d0000013-0000-0000-0000-000000000013', '203357303131155318426517', 'MOVE-2500 3GPLUS', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Mobile POS', '{"brand": "Ingenico", "part_category": "Unit", "ageing": 88, "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000014-0000-0000-0000-000000000014', '182957313121062303343096', 'MPOS-LINK2500', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'MPOS device', '{"brand": "Ingenico", "part_category": "Unit", "ageing": 168, "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000015-0000-0000-0000-000000000015', '16360CT26156131', 'ICT220-CTLS', 'b0000001-0000-0000-0000-000000000001', 'faulty', 'UDS-KOLKATA (S)', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'NFC terminal - defective', '{"brand": "Ingenico", "part_category": "Unit", "ageing": 44, "good_type": "Defect", "owner_type": "Bank Center", "owner_name": "State Bank of India", "defective_reason": "De-Installation Close"}'::jsonb),

-- VeriFone Devices
('d0000016-0000-0000-0000-000000000016', '401-552-061', 'E285 3G BW', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'VeriFone E285', '{"brand": "VeriFone", "part_category": "Unit", "ageing": 191, "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000017-0000-0000-0000-000000000017', '286-869-256', 'Vx-520 (PSTN)', 'b0000001-0000-0000-0000-000000000001', 'faulty', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'VeriFone Vx-520 - defective', '{"brand": "VeriFone", "part_category": "Unit", "ageing": 119, "good_type": "Defect", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000018-0000-0000-0000-000000000018', '282-357-488', 'Vx-520 (PSTN)', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'VeriFone Vx-520', '{"brand": "VeriFone", "part_category": "Unit", "ageing": 88, "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000019-0000-0000-0000-000000000019', '289-794-872', 'Vx-520-CTLS (PSTN)', 'b0000001-0000-0000-0000-000000000001', 'warehouse', 'UDS-BHUBANESWAR', NULL, 'VeriFone NFC terminal', '{"brand": "VeriFone", "part_category": "Unit", "ageing": 60, "owner_type": "Bank Center", "owner_name": "State Bank of India", "defective_reason": "Asset Swap Close"}'::jsonb),
('d0000020-0000-0000-0000-000000000020', '261-309-246', 'Vx-520 (DGPRS) CTLS', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'VeriFone GPRS', '{"brand": "VeriFone", "part_category": "Unit", "ageing": 176, "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000021-0000-0000-0000-000000000021', '401-685-961', 'E285 3G BW', 'b0000001-0000-0000-0000-000000000001', 'faulty', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'VeriFone E285 - defective', '{"brand": "VeriFone", "part_category": "Unit", "ageing": 348, "good_type": "Defect", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000022-0000-0000-0000-000000000022', '261-299-916', 'Vx-520-CTLS (PSTN)', 'b0000001-0000-0000-0000-000000000001', 'faulty', 'UDS-KOLKATA (S)', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Defective unit', '{"brand": "VeriFone", "part_category": "Unit", "ageing": 21, "good_type": "Defect", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000023-0000-0000-0000-000000000023', '17013WL25641004', 'IWL220 CTLS', 'b0000001-0000-0000-0000-000000000001', 'warehouse', 'UDS-KOLKATA (S)', NULL, 'In stock', '{"brand": "Ingenico", "part_category": "Unit", "ageing": 20, "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),

-- More soundbox devices for testing
('d0000024-0000-0000-0000-000000000024', 'XGZ1909202511092', 'ET389-WIFI', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-KOLKATA (S)', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Soundbox device', '{"brand": "FUJIAN", "part_category": "Unit", "tid": "SB187087", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000025-0000-0000-0000-000000000025', 'XGZ1809202504964', 'ET389-WIFI', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-GUWAHATI', 'e3333333-3333-3333-3333-333333333333', 'Soundbox device', '{"brand": "FUJIAN", "part_category": "Unit", "tid": "SB143702", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000026-0000-0000-0000-000000000026', '00001504QR70W032400', 'SR600 Mini DQR', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-GUWAHATI', 'e3333333-3333-3333-3333-333333333333', 'All in one POS', '{"brand": "SunMI", "part_category": "Unit", "tid": "SB137741", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000027-0000-0000-0000-000000000027', '2841650783', 'A910s', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-BHUBANESWAR', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Android POS', '{"brand": "PAX", "part_category": "Unit", "tid": "OD083601", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000028-0000-0000-0000-000000000028', '2841650894', 'A910s', 'b0000001-0000-0000-0000-000000000001', 'warehouse', 'UDS-KOLKATA (S)', NULL, 'Android POS in stock', '{"brand": "PAX", "part_category": "Unit", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000029-0000-0000-0000-000000000029', '2841650181', 'A910s', 'b0000001-0000-0000-0000-000000000001', 'issued', 'UDS-GUWAHATI', 'e3333333-3333-3333-3333-333333333333', 'Android POS', '{"brand": "PAX", "part_category": "Unit", "tid": "AS046375", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb),
('d0000030-0000-0000-0000-000000000030', '14324CT22939310', 'ICT220 D-GPRS', 'b0000001-0000-0000-0000-000000000001', 'faulty', 'UDS-GUWAHATI', 'e3333333-3333-3333-3333-333333333333', 'Defective terminal', '{"brand": "Ingenico", "part_category": "Unit", "ageing": 128, "good_type": "Defect", "owner_type": "Bank Center", "owner_name": "State Bank of India"}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  serial_number = EXCLUDED.serial_number,
  model = EXCLUDED.model,
  status = EXCLUDED.status,
  current_location = EXCLUDED.current_location,
  assigned_to = EXCLUDED.assigned_to,
  metadata = EXCLUDED.metadata;

-- =====================================================
-- CALLS (20 calls: 8 pending, 7 in_progress, 5 completed)
-- Uses YOUR existing engineer UUIDs
-- =====================================================

-- PENDING CALLS (8)
INSERT INTO calls (id, call_number, type, status, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, priority, description, metadata) VALUES

-- Installation calls
('c0000001-0000-0000-0000-000000000001', 'PPSINKOOR0073220', 'install', 'pending', 'b0000001-0000-0000-0000-000000000001', 'MAA BHAIRABI TRADERS', 'RINKU MAHARANA', '7978141385', 'HALADIAPADAR BERHMUPRE, GANJAM, ODISHA 760003', 19.3169, 84.7982, NOW() + INTERVAL '1 day', 'medium', 'Soundbox Installation', '{"mid": "022211900519443", "tid": "SB223535", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-BHUBANESWAR", "device_type": "SOUNDBOX", "device_model": "ET389-WIFI", "ageing": 0, "ageing_band": "[<=5 Days]", "status": "Call Allocated", "sub_status": "Call Allocated"}'::jsonb),

('c0000002-0000-0000-0000-000000000002', 'PPSINKOOR0073219', 'install', 'pending', 'b0000001-0000-0000-0000-000000000001', 'MAA BHAGAWATI OFFICE', 'ASHISH SUNA', '9827547587', 'TITILAGARH DAV COLLEGE FIELD, BALANGIR, ODISHA 767042', 20.2907, 83.3944, NOW() + INTERVAL '2 days', 'medium', 'Soundbox Installation', '{"mid": "022211900554112", "tid": "SB133415", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-BHUBANESWAR", "device_type": "SOUNDBOX", "device_model": "ET389-WIFI", "ageing": 0, "ageing_band": "[<=5 Days]"}'::jsonb),

('c0000003-0000-0000-0000-000000000003', 'PPSINKOAS0061510', 'install', 'pending', 'b0000001-0000-0000-0000-000000000001', 'MS C Y ENTERPRISE', 'CHIKHI YASAP', '7627931905', 'YACHULI, LOWER SUBANSIRI, ARUNACHAL PRADESH 791120', 27.3926, 93.8486, NOW() + INTERVAL '3 days', 'medium', 'Soundbox Installation - Remote Area', '{"mid": "022211900508875", "tid": "SB195854", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-GUWAHATI", "device_type": "SOUNDBOX", "device_model": "ET389-WIFI", "ageing": 0, "ageing_band": "[<=5 Days]"}'::jsonb),

('c0000004-0000-0000-0000-000000000004', 'PPSINKOWB0046419', 'install', 'pending', 'b0000001-0000-0000-0000-000000000001', 'A B MOTORS', 'RAHAMAT MOMIN', '9635115646', 'MY ORIGINAL PIN CODE 732209, ENGLISH BAZAR SOVANAGAR NH 131A, MALDA, WEST BENGAL 732202', 25.0081, 88.1365, NOW() + INTERVAL '1 day', 'medium', 'Soundbox Installation', '{"mid": "022211900513863", "tid": "SB205072", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-KOLKATA (S)", "device_type": "SOUNDBOX", "device_model": "ET389-WIFI", "ageing": 0, "ageing_band": "[<=5 Days]"}'::jsonb),

-- Breakdown calls
('c0000005-0000-0000-0000-000000000005', 'FB2560445', 'breakdown', 'pending', 'b0000001-0000-0000-0000-000000000001', 'POWER GRID CORPORATION OF INDIA LTD', 'Aninda Deb Laskar', '9918901721', '800 Kv HVDC Multi Terminal Converter Station Aliporduar, JALPAIGURI, WEST BENGAL 736121', 26.4941, 89.5275, NOW(), 'high', 'NFC PGPRS terminal not working', '{"mid": "022000000280328", "tid": "WB032097", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-KOLKATA (S)", "device_type": "NFC PGPRS", "old_model": "V210 4G", "ageing": 0, "ageing_band": "[<=5 Days]"}'::jsonb),

('c0000006-0000-0000-0000-000000000006', 'FB2560438', 'breakdown', 'pending', 'b0000001-0000-0000-0000-000000000001', 'MAJUMDER AND CO', 'MAJUMDER CO', '8918738044', 'NIL MERCHANT ROAD JALPAIGURI, WEST BENGAL 735101', 26.5165, 88.7194, NOW(), 'high', 'NFC PGPRS terminal issue', '{"mid": "022000000446520", "tid": "WB081042", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-KOLKATA (S)", "device_type": "NFC PGPRS", "old_model": "V210 4G", "ageing": 0, "ageing_band": "[<=5 Days]"}'::jsonb),

-- Paper Roll calls
('c0000007-0000-0000-0000-000000000007', 'RR1210953', 'maintenance', 'pending', 'b0000001-0000-0000-0000-000000000001', 'IG BSF SPLOPS THQ RUM FUND', 'HQ IG BSF BANGALORE', '8917512737', 'BADATOTA JATANI KHORDHA ODISHA 752050', 20.1509, 85.7050, NOW() + INTERVAL '2 days', 'low', 'Paper roll delivery required', '{"mid": "022000000356706", "tid": "OD046324", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-BHUBANESWAR", "device_type": "Android", "old_model": "X990", "call_type_original": "Paper Roll", "ageing": 0}'::jsonb),

('c0000008-0000-0000-0000-000000000008', 'RR1210937', 'maintenance', 'pending', 'b0000001-0000-0000-0000-000000000001', 'NATIONAL SEED NURSERY', 'NASIR ALI ISLAM', '9435506789', 'BAZAR ROAD WARD 9 KOKRAJHAR ASSAM 783370', 26.4043, 90.2655, NOW() + INTERVAL '3 days', 'low', 'Paper roll delivery', '{"mid": "020000500432572", "tid": "AS009663", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-GUWAHATI", "device_type": "Android", "old_model": "A910s", "call_type_original": "Paper Roll", "ageing": 0}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  call_number = EXCLUDED.call_number,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  client_name = EXCLUDED.client_name,
  metadata = EXCLUDED.metadata;

-- IN PROGRESS CALLS (7) - Using YOUR existing engineer UUIDs
INSERT INTO calls (id, call_number, type, status, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, assigned_engineer, started_at, priority, description, metadata) VALUES

('c0000009-0000-0000-0000-000000000009', 'PPSINKOOR0073214', 'install', 'in_progress', 'b0000001-0000-0000-0000-000000000001', 'MS BAZAR FASHION VATIKA', 'ANANTA NARAYAN DAS', '9777739509', 'STATION ROAD PRAFULLA NAGAR BARIPADA, MAYURBHANJ, ODISHA 757001', 21.9326, 86.7267, NOW(), '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', NOW() - INTERVAL '2 hours', 'high', 'Android POS Installation - Multiple units', '{"mid": "022211900520683", "tid": "OD046294", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-BHUBANESWAR", "device_type": "Android", "device_model": "A910s", "ageing": 0, "visit_count": 1}'::jsonb),

('c0000010-0000-0000-0000-000000000010', 'PPSINKOAS0061508', 'install', 'in_progress', 'b0000001-0000-0000-0000-000000000001', 'M H ENTERPRISE', 'KHAIRUN NISSA', '9707383169', 'MASJID GALI HEM BARUAH ROAD KAMARPATTY GUWAHATI, KAMRUP, ASSAM 781001', 26.1870, 91.7469, NOW(), 'e3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 hour', 'medium', 'Tap and Pay SQR Installation', '{"mid": "022211900536230", "tid": "SB144155", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-GUWAHATI", "device_type": "Tap and Pay SQR", "device_model": "ET389 Pro ( SQR )", "ageing": 0}'::jsonb),

('c0000011-0000-0000-0000-000000000011', 'FB2560427', 'breakdown', 'in_progress', 'b0000001-0000-0000-0000-000000000001', 'GHAROA', 'BABUMANI DAS', '7980413196', '36 NELINAGAR COLONY-2, HALTU, KOLKATA, WEST BENGAL 700078', 22.5028, 88.3923, NOW(), 'ea4583ec-e579-45a2-baf8-dbe048d258b2', NOW() - INTERVAL '3 hours', 'high', 'Android terminal not working', '{"mid": "022211900303330", "tid": "WB095064", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-KOLKATA (S)", "device_type": "Android", "old_model": "A910s", "ageing": 0}'::jsonb),

('c0000012-0000-0000-0000-000000000012', 'FB2560422', 'breakdown', 'in_progress', 'b0000001-0000-0000-0000-000000000001', 'SADAGRAM INDANE GRAMIN VITRAK', 'CHAPAL KUMAR DAS', '7002659611', 'FOREST ROAD SADAGRAM DHOLAI CACHAR ASSAM 788114', 24.6792, 92.7642, NOW(), 'e3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '4 hours', 'high', 'Android terminal issue', '{"mid": "022211900393079", "tid": "AS066140", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-GUWAHATI", "device_type": "Android", "old_model": "A910s", "ageing": 0}'::jsonb),

('c0000013-0000-0000-0000-000000000013', 'PPSINKOOR0073211', 'install', 'in_progress', 'b0000001-0000-0000-0000-000000000001', 'SARANGADA SARASWATI CHICKEN', 'SARASWATI BEHERA', '9437734169', 'SARANGADA KANDHAMAL ODISHA 762106', 20.0978, 83.9853, NOW(), '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', NOW() - INTERVAL '30 minutes', 'medium', 'Soundbox Installation', '{"mid": "022211900540839", "tid": "SB184441", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-BHUBANESWAR", "device_type": "SOUNDBOX", "device_model": "ET389-WIFI", "ageing": 0}'::jsonb),

('c0000014-0000-0000-0000-000000000014', 'PPSINKOAS0061506', 'install', 'in_progress', 'b0000001-0000-0000-0000-000000000001', 'THE CRUMB KITCHEN', 'AMANDA PERTIN', '7641018281', 'JAMOH BUILDING ZILUNG VILLAGE 5 MILE PASIGHAT, EAST SIANG, ARUNACHAL PRADESH 791102', 28.0682, 95.3333, NOW(), 'e3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '5 hours', 'medium', 'Android POS Installation', '{"mid": "022211900500194", "tid": "AR034547", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-GUWAHATI", "device_type": "Android", "device_model": "F360", "ageing": 0}'::jsonb),

('c0000015-0000-0000-0000-000000000015', 'PPSINKOUR0010354', 'install', 'in_progress', 'b0000001-0000-0000-0000-000000000001', 'JAYKISHAN ROHIDAS', 'JAYKISHAN ROHIDAS', '9861979284', 'MANAPALI, KINABAGA, SAMBALPUR, ODISHA 768224', 21.2899, 83.7518, NOW(), 'e4444444-4444-4444-4444-444444444444', NOW() - INTERVAL '2 hours', 'medium', 'Soundbox Installation', '{"mid": "022211000498970", "tid": "SB117167", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-ROURKELA", "device_type": "SOUNDBOX", "device_model": "ET389-WIFI", "ageing": 2}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  call_number = EXCLUDED.call_number,
  status = EXCLUDED.status,
  assigned_engineer = EXCLUDED.assigned_engineer,
  started_at = EXCLUDED.started_at,
  metadata = EXCLUDED.metadata;

-- COMPLETED CALLS (5) - Using YOUR existing engineer UUIDs
INSERT INTO calls (id, call_number, type, status, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, assigned_engineer, started_at, completed_at, priority, description, resolution_notes, metadata) VALUES

('c0000016-0000-0000-0000-000000000016', 'PPSINKOOR0072801', 'install', 'completed', 'b0000001-0000-0000-0000-000000000001', 'MO PASANDA FASHION', 'MO PASANDA', '8088864828', '67 LEMALO LEMALO MALIGAN MALIGAN CUTTACK CUTTACK ODISHA 754293', 20.4798, 85.8207, NOW() - INTERVAL '2 days', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', NOW() - INTERVAL '2 days' + INTERVAL '2 hours', NOW() - INTERVAL '2 days' + INTERVAL '4 hours', 'medium', 'Soundbox Installation', 'installation done', '{"mid": "022211000532634", "tid": "SB217622", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-BHUBANESWAR", "device_type": "SOUNDBOX", "new_serial": "XQZ2111202400894", "sim_number": "89919225034002439142", "sim_model": "Airtel Sims", "googled_distance": 37.36, "rating": 5}'::jsonb),

('c0000017-0000-0000-0000-000000000017', 'PPSINKOWB0045767', 'install', 'completed', 'b0000001-0000-0000-0000-000000000001', 'SONAR BANGLA SUPERMART', 'SONAR BANGLA', '7863908770', 'PATHARMAHRA MANBAZAR, PURULIYA, WEST BENGAL 723131', 23.3534, 86.2782, NOW() - INTERVAL '1 day', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', NOW() - INTERVAL '1 day' + INTERVAL '3 hours', 'medium', 'Soundbox Installation', 'Installation done with all training given to merchant yono SBI merchant app install', '{"mid": "022211000488063", "tid": "SB202153", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-KOLKATA (S)", "device_type": "SOUNDBOX", "new_serial": "XGZ1909202518443", "sim_number": "89919225034002599333", "sim_model": "Airtel Sims", "googled_distance": 187.59, "rating": 5}'::jsonb),

('c0000018-0000-0000-0000-000000000018', 'PPSINKOWB0046201', 'install', 'completed', 'b0000001-0000-0000-0000-000000000001', 'TARAPADA BHANDAR', 'TARAPADA', '7074591611', 'HOLDING NO 1223 DIGRA ROAD PO SARADAPALLY, BHADRESWAR, HOOGHLY, WEST BENGAL 712124', 22.8952, 88.2449, NOW() - INTERVAL '12 hours', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', NOW() - INTERVAL '12 hours' + INTERVAL '30 minutes', NOW() - INTERVAL '12 hours' + INTERVAL '2 hours', 'medium', 'Soundbox Installation', 'installation done with all tranning given to me', '{"mid": "022211000486650", "tid": "SB133327", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-KOLKATA (S)", "device_type": "SOUNDBOX", "new_serial": "XGZ1709202502317", "sim_number": "89919225034002596891", "sim_model": "Airtel Sims", "googled_distance": 36.19, "rating": 4}'::jsonb),

('c0000019-0000-0000-0000-000000000019', 'PPSINKOAS0060941', 'install', 'completed', 'b0000001-0000-0000-0000-000000000001', 'AYUSSHKALP HEALTHCARE DIAGNOSTIC CENTRE', 'AYUSSHKALP', '9101394129', 'MAA PVOLI BHAWAN MIRZA PALASBARI ROAD PO MIRZA, KAMRUP, ASSAM 781125', 26.1288, 91.7987, NOW() - INTERVAL '3 days', 'e3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '3 days' + INTERVAL '2 hours', NOW() - INTERVAL '3 days' + INTERVAL '4 hours', 'medium', 'Soundbox Installation', 'installation done', '{"mid": "022211000513767", "tid": "SB143702", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-GUWAHATI", "device_type": "SOUNDBOX", "new_serial": "XGZ1809202504964", "sim_number": "89919225034002559691", "sim_model": "Airtel Sims", "googled_distance": 26.16, "rating": 5}'::jsonb),

('c0000020-0000-0000-0000-000000000020', 'PPSINKOOR0072979', 'install', 'completed', 'b0000001-0000-0000-0000-000000000001', 'KRUSHNA SHANKAR FABRICATION', 'KRUSHNA SHANKAR', '9937977103', 'MELCHHAMUNDA GHESS BARGARH ODISHA 768034', 21.3296, 83.6100, NOW() - INTERVAL '4 days', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', NOW() - INTERVAL '4 days' + INTERVAL '3 hours', NOW() - INTERVAL '4 days' + INTERVAL '5 hours', 'medium', 'Android POS Installation', 'installation done', '{"mid": "022211000495083", "tid": "OD083601", "fsp_region": "UDS-KOLKATA (R)", "fsp_sub_region": "UDS-BHUBANESWAR", "device_type": "Android", "new_serial": "2841650783", "sim_number": "8991200054505028883", "sim_model": "Vodafone Sims", "googled_distance": 274.06, "rating": 5}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  call_number = EXCLUDED.call_number,
  status = EXCLUDED.status,
  completed_at = EXCLUDED.completed_at,
  resolution_notes = EXCLUDED.resolution_notes,
  metadata = EXCLUDED.metadata;

-- =====================================================
-- STOCK MOVEMENTS (showing device lifecycle)
-- =====================================================

INSERT INTO stock_movements (id, device_id, movement_type, from_status, to_status, from_engineer, to_engineer, call_id, actor_id, reason, notes, metadata) VALUES
-- Device issued to engineer
('sm000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'issuance', 'warehouse', 'issued', NULL, '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', NULL, '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Stock issuance', 'Soundbox issued for installation', '{"awb_no": "DELHUB123456"}'::jsonb),

-- Device installed at merchant
('sm000002-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000001', 'status_change', 'issued', 'installed', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', NULL, 'c0000016-0000-0000-0000-000000000016', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Installation complete', 'Installed at MO PASANDA FASHION', '{"tid": "SB217622", "mid": "022211000532634"}'::jsonb),

-- Another device issued
('sm000003-0000-0000-0000-000000000003', 'd0000002-0000-0000-0000-000000000002', 'issuance', 'warehouse', 'issued', NULL, 'ea4583ec-e579-45a2-baf8-dbe048d258b2', NULL, 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Stock issuance', 'Soundbox issued for installation', '{}'::jsonb),

-- Device installed
('sm000004-0000-0000-0000-000000000004', 'd0000002-0000-0000-0000-000000000002', 'status_change', 'issued', 'installed', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', NULL, 'c0000017-0000-0000-0000-000000000017', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Installation complete', 'Installed at SONAR BANGLA SUPERMART', '{"tid": "SB202153"}'::jsonb),

-- Faulty device returned
('sm000005-0000-0000-0000-000000000005', 'd0000015-0000-0000-0000-000000000015', 'return', 'installed', 'faulty', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', NULL, NULL, 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Device faulty', 'ICT220-CTLS returned due to NFC failure', '{"defective_reason": "NFC module not working"}'::jsonb),

-- Transfer between engineers
('sm000006-0000-0000-0000-000000000006', 'd0000008-0000-0000-0000-000000000008', 'transfer', 'issued', 'issued', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', NULL, 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Inter-engineer transfer', 'Transferred for Bhubaneswar area coverage', '{}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  movement_type = EXCLUDED.movement_type,
  from_status = EXCLUDED.from_status,
  to_status = EXCLUDED.to_status;

-- =====================================================
-- CALL DEVICES (linking calls to devices)
-- =====================================================

INSERT INTO call_devices (id, call_id, device_id, action) VALUES
('cd000001-0000-0000-0000-000000000001', 'c0000016-0000-0000-0000-000000000016', 'd0000001-0000-0000-0000-000000000001', 'install'),
('cd000002-0000-0000-0000-000000000002', 'c0000017-0000-0000-0000-000000000017', 'd0000002-0000-0000-0000-000000000002', 'install'),
('cd000003-0000-0000-0000-000000000003', 'c0000018-0000-0000-0000-000000000018', 'd0000003-0000-0000-0000-000000000003', 'install'),
('cd000004-0000-0000-0000-000000000004', 'c0000019-0000-0000-0000-000000000019', 'd0000025-0000-0000-0000-000000000025', 'install'),
('cd000005-0000-0000-0000-000000000005', 'c0000020-0000-0000-0000-000000000020', 'd0000027-0000-0000-0000-000000000027', 'install')
ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action;

-- =====================================================
-- Summary Statistics
-- =====================================================
-- Engineers: 5 total (2 existing + 3 new)
--   - 4d41c32a... (Mukesh Sahoo - Bhubaneswar) - YOUR engineer1
--   - ea4583ec... (Hemanta Pramanik - Kolkata S) - YOUR engineer2
--   - e3333333... (Tankeshwar Sahu - Guwahati) - NEW
--   - e4444444... (Prabin Munda - Rourkela) - NEW
--   - e5555555... (Brahmdeo Mahto - Ranchi) - NEW
-- Devices: 30 (Soundbox: 10, Android: 8, Ingenico: 7, VeriFone: 5)
-- Calls: 20 (Pending: 8, In Progress: 7, Completed: 5)
-- Stock Movements: 6 (showing complete lifecycle)
-- Call-Device Links: 5 (for completed installations)
