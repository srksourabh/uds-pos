-- ==================================================
-- UDS-POS FINAL INTEGRATED TEST DATA
-- ==================================================
-- Ready to run - Uses actual auth.users UUIDs
-- ==================================================
-- Auth Users:
--   superadmin@test.com = aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
--   admin@test.com      = bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
--   engineer1@test.com  = cccccccc-cccc-cccc-cccc-cccccccccccc
--   engineer2@test.com  = dddddddd-dddd-dddd-dddd-dddddddddddd
-- ==================================================

-- ==================================================
-- PART 0: CLEANUP (Optional - uncomment if needed)
-- ==================================================
-- DELETE FROM stock_movements;
-- DELETE FROM engineer_aggregates;
-- DELETE FROM stock_alerts;
-- DELETE FROM photos;
-- DELETE FROM call_devices;
-- DELETE FROM calls;
-- DELETE FROM devices;
-- DELETE FROM merchants;
-- DELETE FROM warehouses;
-- DELETE FROM couriers;
-- DELETE FROM user_profiles;
-- DELETE FROM banks;

-- ==================================================
-- PART 1: BANKS (3 major banks)
-- ==================================================

INSERT INTO banks (id, name, code, active, contact_person, contact_email, contact_phone, address) VALUES
('11111111-1111-1111-1111-111111111111', 'HDFC Bank', 'HDFC', true, 'Rajesh Mehta', 'pos.support@hdfc.com', '+912261606161', 'HDFC House, Senapati Bapat Marg, Mumbai'),
('22222222-2222-2222-2222-222222222222', 'ICICI Bank', 'ICICI', true, 'Priya Sharma', 'merchant.support@icici.com', '+912233667777', 'ICICI Bank Tower, Bandra-Kurla Complex, Mumbai'),
('33333333-3333-3333-3333-333333333333', 'Axis Bank', 'AXIS', true, 'Vikram Singh', 'pos.helpdesk@axisbank.com', '+912240555555', 'Axis House, Wadia International Centre, Mumbai')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  contact_person = EXCLUDED.contact_person,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  address = EXCLUDED.address;

-- ==================================================
-- PART 2: WAREHOUSES & OFFICES (5 locations)
-- ==================================================

INSERT INTO warehouses (id, name, code, address, manager_name, manager_phone, is_active, office_type, latitude, longitude, pincode, city, state, total_capacity, current_stock) VALUES
-- Head Office - Noida
('a1111111-1111-1111-1111-111111111111', 'UDS Head Office', 'HO-DEL',
 'A-45, Sector 62, Noida, Uttar Pradesh', 'Amit Kumar', '+919811234567',
 true, 'head_office', 28.6270, 77.3726, '201301', 'Noida', 'Uttar Pradesh', 500, 45),

-- Warehouse - Delhi
('a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse', 'WH-DEL',
 'Plot 15, Okhla Industrial Area Phase 2, New Delhi', 'Suresh Yadav', '+919899123456',
 true, 'warehouse', 28.5355, 77.2718, '110020', 'New Delhi', 'Delhi', 2000, 320),

-- Warehouse - Mumbai
('a3333333-3333-3333-3333-333333333333', 'Mumbai Warehouse', 'WH-MUM',
 'Unit 7, MIDC Andheri, Andheri East, Mumbai', 'Pradeep Shah', '+919820456789',
 true, 'warehouse', 19.1136, 72.8697, '400093', 'Mumbai', 'Maharashtra', 1500, 215),

-- Regional Office - Bangalore
('a4444444-4444-4444-4444-444444444444', 'Bangalore Regional Office', 'RO-BLR',
 '2nd Floor, Brigade Gateway, Rajajinagar, Bangalore', 'Venkat Rao', '+919845678901',
 true, 'regional_office', 12.9965, 77.5545, '560010', 'Bangalore', 'Karnataka', 300, 78),

-- Regional Office - Pune
('a5555555-5555-5555-5555-555555555555', 'Pune Regional Office', 'RO-PUN',
 'Office 401, Cerebrum IT Park, Kalyani Nagar, Pune', 'Sachin Kulkarni', '+919822345678',
 true, 'regional_office', 18.5463, 73.9020, '411006', 'Pune', 'Maharashtra', 200, 42)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  manager_name = EXCLUDED.manager_name,
  manager_phone = EXCLUDED.manager_phone,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  office_type = EXCLUDED.office_type;

-- ==================================================
-- PART 3: COURIERS (3 courier partners)
-- ==================================================

INSERT INTO couriers (id, name, code, contact_person, contact_phone, is_active) VALUES
('b1111111-1111-1111-1111-111111111111', 'Blue Dart Express', 'BD', 'Dispatch Desk', '+911800113456', true),
('b2222222-2222-2222-2222-222222222222', 'DTDC Courier', 'DTDC', 'Corporate Desk', '+911800227788', true),
('b3333333-3333-3333-3333-333333333333', 'Delhivery', 'DELV', 'Business Support', '+919555123456', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  contact_person = EXCLUDED.contact_person,
  contact_phone = EXCLUDED.contact_phone;

-- ==================================================
-- PART 4: USER PROFILES (Using actual auth.users UUIDs)
-- ==================================================

-- Super Admin (superadmin@test.com)
INSERT INTO user_profiles (
  id, email, full_name, phone, role, bank_id, status, region, active,
  emp_id, designation
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'superadmin@test.com', 'Super Admin', '+919999900000',
  'super_admin', NULL, 'active', 'All India', true,
  'SA001', 'Super Administrator'
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  emp_id = EXCLUDED.emp_id,
  designation = EXCLUDED.designation,
  status = 'active';

-- Admin (admin@test.com)
INSERT INTO user_profiles (
  id, email, full_name, phone, role, bank_id, status, region, active,
  emp_id, designation
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'admin@test.com', 'Admin User', '+919999900001',
  'admin', NULL, 'active', 'All India', true,
  'ADM001', 'System Administrator'
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  emp_id = EXCLUDED.emp_id,
  designation = EXCLUDED.designation,
  status = 'active';

-- Engineer 1 - Rahul Kumar (Delhi/NCR) - engineer1@test.com
INSERT INTO user_profiles (
  id, email, full_name, phone, role, bank_id, status, region, active,
  emp_id, alternate_phone, home_address, home_pincode, date_of_joining,
  emergency_contact_name, emergency_contact_phone, designation,
  last_location_lat, last_location_lng, last_location_updated_at
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'engineer1@test.com', 'Rahul Kumar', '+919876543210',
  'engineer', '11111111-1111-1111-1111-111111111111', 'active', 'North', true,
  'E001', '+919811111111',
  '45-B, Sector 15, Rohini, New Delhi', '110085',
  '2022-03-15',
  'Sunita Kumar', '+919812222222',
  'Senior Field Engineer',
  28.7041, 77.1025, NOW() - INTERVAL '15 minutes'
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  bank_id = EXCLUDED.bank_id,
  emp_id = EXCLUDED.emp_id,
  alternate_phone = EXCLUDED.alternate_phone,
  home_address = EXCLUDED.home_address,
  home_pincode = EXCLUDED.home_pincode,
  date_of_joining = EXCLUDED.date_of_joining,
  emergency_contact_name = EXCLUDED.emergency_contact_name,
  emergency_contact_phone = EXCLUDED.emergency_contact_phone,
  designation = EXCLUDED.designation,
  last_location_lat = EXCLUDED.last_location_lat,
  last_location_lng = EXCLUDED.last_location_lng,
  last_location_updated_at = EXCLUDED.last_location_updated_at,
  status = 'active';

-- Engineer 2 - Priya Singh (Mumbai) - engineer2@test.com
INSERT INTO user_profiles (
  id, email, full_name, phone, role, bank_id, status, region, active,
  emp_id, alternate_phone, home_address, home_pincode, date_of_joining,
  emergency_contact_name, emergency_contact_phone, designation,
  last_location_lat, last_location_lng, last_location_updated_at
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'engineer2@test.com', 'Priya Singh', '+919876543211',
  'engineer', '22222222-2222-2222-2222-222222222222', 'active', 'West', true,
  'E002', '+919822333333',
  'Flat 302, Shanti Apartments, Andheri West, Mumbai', '400053',
  '2021-08-10',
  'Ajay Singh', '+919823444444',
  'Field Engineer',
  19.1196, 72.8464, NOW() - INTERVAL '30 minutes'
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  bank_id = EXCLUDED.bank_id,
  emp_id = EXCLUDED.emp_id,
  alternate_phone = EXCLUDED.alternate_phone,
  home_address = EXCLUDED.home_address,
  home_pincode = EXCLUDED.home_pincode,
  date_of_joining = EXCLUDED.date_of_joining,
  emergency_contact_name = EXCLUDED.emergency_contact_name,
  emergency_contact_phone = EXCLUDED.emergency_contact_phone,
  designation = EXCLUDED.designation,
  last_location_lat = EXCLUDED.last_location_lat,
  last_location_lng = EXCLUDED.last_location_lng,
  last_location_updated_at = EXCLUDED.last_location_updated_at,
  status = 'active';

-- ==================================================
-- PART 5: MERCHANTS (10 merchants with MIDs)
-- ==================================================

INSERT INTO merchants (
  id, mid, merchant_name, business_name, business_type,
  contact_person, contact_phone, alternate_phone, contact_email,
  merchant_address, landmark, pincode, city, state,
  latitude, longitude, bank_id, status, onboarded_date
) VALUES
-- Delhi Merchants (HDFC Bank)
('e0000001-0001-0001-0001-000000000001', 'MID001',
 'Raj Kumar', 'Sharma Electronics', 'retail',
 'Raj Kumar', '+919111222001', '+919111222002', 'sharma.electronics@email.com',
 'Shop 15, Connaught Place, New Delhi', 'Near PVR Plaza', '110001', 'New Delhi', 'Delhi',
 28.6315, 77.2167, '11111111-1111-1111-1111-111111111111', 'active', '2023-06-15'),

('e0000001-0001-0001-0001-000000000002', 'MID002',
 'Amit Gupta', 'Gupta Medical Store', 'pharmacy',
 'Amit Gupta', '+919111222003', NULL, 'guptamedical@email.com',
 '23, Karol Bagh Main Market, New Delhi', 'Opposite Metro Station', '110005', 'New Delhi', 'Delhi',
 28.6519, 77.1909, '11111111-1111-1111-1111-111111111111', 'active', '2023-07-20'),

('e0000001-0001-0001-0001-000000000003', 'MID003',
 'Suresh Verma', 'Verma Textiles', 'retail',
 'Suresh Verma', '+919111222004', '+919111222005', NULL,
 'Shop 45, Lajpat Nagar Central Market', 'Near Central Market Gate', '110024', 'New Delhi', 'Delhi',
 28.5700, 77.2432, '11111111-1111-1111-1111-111111111111', 'active', '2023-04-10'),

-- Mumbai Merchants (ICICI Bank)
('e0000001-0001-0001-0001-000000000004', 'MID004',
 'Prakash Shah', 'Shah Jewellers', 'jewellery',
 'Prakash Shah', '+919222333001', '+919222333002', 'shahjewellers@email.com',
 'Shop 12, Zaveri Bazaar, Mumbai', 'Near Mumbadevi Temple', '400002', 'Mumbai', 'Maharashtra',
 18.9467, 72.8355, '22222222-2222-2222-2222-222222222222', 'active', '2023-05-25'),

('e0000001-0001-0001-0001-000000000005', 'MID005',
 'Fatima Khan', 'Khan General Store', 'grocery',
 'Fatima Khan', '+919222333003', NULL, NULL,
 '78, Hill Road, Bandra West, Mumbai', 'Near Mount Mary Church', '400050', 'Mumbai', 'Maharashtra',
 19.0544, 72.8214, '22222222-2222-2222-2222-222222222222', 'active', '2023-08-12'),

('e0000001-0001-0001-0001-000000000006', 'MID006',
 'Rajan Nair', 'Nair Restaurant', 'restaurant',
 'Rajan Nair', '+919222333004', '+919222333005', 'nairrestaurant@email.com',
 '45, Linking Road, Santacruz West, Mumbai', 'Near Shoppers Stop', '400054', 'Mumbai', 'Maharashtra',
 19.0825, 72.8374, '22222222-2222-2222-2222-222222222222', 'active', '2023-02-18'),

-- Bangalore Merchants (Axis Bank)
('e0000001-0001-0001-0001-000000000007', 'MID007',
 'Ramesh Iyengar', 'Iyengar Bakery', 'food',
 'Ramesh Iyengar', '+919333444001', NULL, 'iyengarbakery@email.com',
 '23, Church Street, Bangalore', 'Near MG Road Metro', '560001', 'Bangalore', 'Karnataka',
 12.9758, 77.6045, '33333333-3333-3333-3333-333333333333', 'active', '2023-03-05'),

('e0000001-0001-0001-0001-000000000008', 'MID008',
 'Dr. Sanjay Murthy', 'Murthy Clinic', 'hospital',
 'Dr. Sanjay Murthy', '+919333444002', '+919333444003', 'murthyclinic@email.com',
 '56, 100 Feet Road, Indiranagar, Bangalore', 'Near Indiranagar Metro', '560038', 'Bangalore', 'Karnataka',
 12.9784, 77.6408, '33333333-3333-3333-3333-333333333333', 'active', '2023-01-22'),

('e0000001-0001-0001-0001-000000000009', 'MID009',
 'Lakshmi Devi', 'Lakshmi Sarees', 'retail',
 'Lakshmi Devi', '+919333444004', NULL, NULL,
 '89, Commercial Street, Bangalore', 'Near Shivaji Nagar Bus Stand', '560001', 'Bangalore', 'Karnataka',
 12.9823, 77.6061, '33333333-3333-3333-3333-333333333333', 'active', '2023-09-01'),

-- Pune Merchant (ICICI Bank)
('e0000001-0001-0001-0001-000000000010', 'MID010',
 'Nitin Joshi', 'Joshi Sweets', 'food',
 'Nitin Joshi', '+919444555001', '+919444555002', 'joshisweets@email.com',
 '34, FC Road, Pune', 'Near Fergusson College', '411004', 'Pune', 'Maharashtra',
 18.5267, 73.8409, '22222222-2222-2222-2222-222222222222', 'active', '2023-07-08')

ON CONFLICT (mid) DO UPDATE SET
  merchant_name = EXCLUDED.merchant_name,
  business_name = EXCLUDED.business_name,
  contact_person = EXCLUDED.contact_person,
  contact_phone = EXCLUDED.contact_phone,
  merchant_address = EXCLUDED.merchant_address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

-- ==================================================
-- PART 6: DEVICES (20 devices with various states)
-- ==================================================

INSERT INTO devices (
  id, serial_number, tid, model, make, device_bank, status, device_condition,
  current_location_type, current_location_id, current_location_name,
  receiving_date, notes
) VALUES
-- 5 devices in warehouse
('f0000001-0001-0001-0001-000000000001', 'SN-ING-2024-0001', NULL, 'iCT250', 'Ingenico',
 '11111111-1111-1111-1111-111111111111', 'warehouse', 'new',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 CURRENT_DATE - 5, 'New stock received'),

('f0000001-0001-0001-0001-000000000002', 'SN-ING-2024-0002', NULL, 'iCT250', 'Ingenico',
 '11111111-1111-1111-1111-111111111111', 'warehouse', 'new',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 CURRENT_DATE - 5, 'New stock received'),

('f0000001-0001-0001-0001-000000000003', 'SN-VFN-2024-0001', NULL, 'VX520', 'Verifone',
 '22222222-2222-2222-2222-222222222222', 'warehouse', 'new',
 'warehouse', 'a3333333-3333-3333-3333-333333333333', 'Mumbai Warehouse',
 CURRENT_DATE - 10, 'Fresh inventory'),

('f0000001-0001-0001-0001-000000000004', 'SN-PAX-2024-0001', NULL, 'A920', 'PAX',
 '33333333-3333-3333-3333-333333333333', 'warehouse', 'good',
 'warehouse', 'a4444444-4444-4444-4444-444444444444', 'Bangalore Regional Office',
 CURRENT_DATE - 30, 'Refurbished unit'),

('f0000001-0001-0001-0001-000000000005', 'SN-PAX-2024-0002', NULL, 'D210', 'PAX',
 '33333333-3333-3333-3333-333333333333', 'warehouse', 'new',
 'warehouse', 'a4444444-4444-4444-4444-444444444444', 'Bangalore Regional Office',
 CURRENT_DATE - 15, 'New batch'),

-- 3 devices with Engineer E001 (Rahul Kumar - cccccccc)
('f0000001-0001-0001-0001-000000000006', 'SN-ING-2024-0003', NULL, 'iCT250', 'Ingenico',
 '11111111-1111-1111-1111-111111111111', 'issued', 'new',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 CURRENT_DATE - 3, 'Issued for installation'),

('f0000001-0001-0001-0001-000000000007', 'SN-ING-2024-0004', NULL, 'Move5000', 'Ingenico',
 '11111111-1111-1111-1111-111111111111', 'issued', 'new',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 CURRENT_DATE - 2, 'For Verma Textiles installation'),

('f0000001-0001-0001-0001-000000000008', 'SN-VFN-2024-0002', NULL, 'VX520', 'Verifone',
 '11111111-1111-1111-1111-111111111111', 'issued', 'good',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 CURRENT_DATE - 7, 'Swap unit for Gupta Medical'),

-- 3 devices with Engineer E002 (Priya Singh - dddddddd)
('f0000001-0001-0001-0001-000000000009', 'SN-VFN-2024-0003', NULL, 'VX520', 'Verifone',
 '22222222-2222-2222-2222-222222222222', 'issued', 'new',
 'engineer', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Priya Singh (E002)',
 CURRENT_DATE - 4, 'For new installation'),

('f0000001-0001-0001-0001-000000000010', 'SN-PAX-2024-0003', NULL, 'A920', 'PAX',
 '22222222-2222-2222-2222-222222222222', 'issued', 'new',
 'engineer', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Priya Singh (E002)',
 CURRENT_DATE - 1, 'High priority installation'),

('f0000001-0001-0001-0001-000000000011', 'SN-ING-2024-0005', NULL, 'iCT250', 'Ingenico',
 '22222222-2222-2222-2222-222222222222', 'issued', 'good',
 'engineer', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Priya Singh (E002)',
 CURRENT_DATE - 8, 'Replacement unit'),

-- 5 devices installed at merchants (with TID and MID)
('f0000001-0001-0001-0001-000000000012', 'SN-ING-2023-0001', 'TID001', 'iCT250', 'Ingenico',
 '11111111-1111-1111-1111-111111111111', 'installed', 'good',
 'merchant', 'e0000001-0001-0001-0001-000000000001', 'Sharma Electronics (MID001)',
 CURRENT_DATE - 180, 'Installed 6 months ago'),

('f0000001-0001-0001-0001-000000000013', 'SN-ING-2023-0002', 'TID002', 'Move5000', 'Ingenico',
 '11111111-1111-1111-1111-111111111111', 'installed', 'good',
 'merchant', 'e0000001-0001-0001-0001-000000000002', 'Gupta Medical Store (MID002)',
 CURRENT_DATE - 150, 'Working fine'),

('f0000001-0001-0001-0001-000000000014', 'SN-VFN-2023-0001', 'TID003', 'VX520', 'Verifone',
 '22222222-2222-2222-2222-222222222222', 'installed', 'good',
 'merchant', 'e0000001-0001-0001-0001-000000000004', 'Shah Jewellers (MID004)',
 CURRENT_DATE - 200, 'High transaction volume'),

('f0000001-0001-0001-0001-000000000015', 'SN-PAX-2023-0001', 'TID004', 'A920', 'PAX',
 '33333333-3333-3333-3333-333333333333', 'installed', 'good',
 'merchant', 'e0000001-0001-0001-0001-000000000007', 'Iyengar Bakery (MID007)',
 CURRENT_DATE - 120, 'Android terminal'),

('f0000001-0001-0001-0001-000000000016', 'SN-VFN-2023-0002', 'TID005', 'VX820', 'Verifone',
 '22222222-2222-2222-2222-222222222222', 'installed', 'fair',
 'merchant', 'e0000001-0001-0001-0001-000000000005', 'Khan General Store (MID005)',
 CURRENT_DATE - 250, 'Needs maintenance soon'),

-- 2 devices in courier (returning to warehouse)
('f0000001-0001-0001-0001-000000000017', 'SN-ING-2023-0003', NULL, 'iCT250', 'Ingenico',
 '11111111-1111-1111-1111-111111111111', 'returned', 'faulty',
 'courier', 'b1111111-1111-1111-1111-111111111111', 'Blue Dart (AWB: BD123456789)',
 CURRENT_DATE - 90, 'Returning for repair'),

('f0000001-0001-0001-0001-000000000018', 'SN-VFN-2023-0003', NULL, 'VX520', 'Verifone',
 '22222222-2222-2222-2222-222222222222', 'returned', 'faulty',
 'courier', 'b2222222-2222-2222-2222-222222222222', 'DTDC (AWB: DTDC987654321)',
 CURRENT_DATE - 60, 'Screen damage - returning'),

-- 2 faulty devices (at warehouse for repair)
('f0000001-0001-0001-0001-000000000019', 'SN-PAX-2023-0002', NULL, 'D210', 'PAX',
 '33333333-3333-3333-3333-333333333333', 'faulty', 'damaged',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 CURRENT_DATE - 45, 'Keypad not working'),

('f0000001-0001-0001-0001-000000000020', 'SN-ING-2023-0004', NULL, 'iCT250', 'Ingenico',
 '11111111-1111-1111-1111-111111111111', 'faulty', 'under_repair',
 'warehouse', 'a3333333-3333-3333-3333-333333333333', 'Mumbai Warehouse',
 CURRENT_DATE - 20, 'Sent for RMA')

ON CONFLICT (serial_number) DO UPDATE SET
  tid = EXCLUDED.tid,
  status = EXCLUDED.status,
  device_condition = EXCLUDED.device_condition,
  current_location_type = EXCLUDED.current_location_type,
  current_location_id = EXCLUDED.current_location_id,
  current_location_name = EXCLUDED.current_location_name;

-- Update installed devices with merchant details
UPDATE devices SET
  merchant_id = 'e0000001-0001-0001-0001-000000000001',
  installed_at_mid = 'MID001',
  installation_tid = 'TID001',
  used_date = CURRENT_DATE - 180
WHERE serial_number = 'SN-ING-2023-0001';

UPDATE devices SET
  merchant_id = 'e0000001-0001-0001-0001-000000000002',
  installed_at_mid = 'MID002',
  installation_tid = 'TID002',
  used_date = CURRENT_DATE - 150
WHERE serial_number = 'SN-ING-2023-0002';

UPDATE devices SET
  merchant_id = 'e0000001-0001-0001-0001-000000000004',
  installed_at_mid = 'MID004',
  installation_tid = 'TID003',
  used_date = CURRENT_DATE - 200
WHERE serial_number = 'SN-VFN-2023-0001';

UPDATE devices SET
  merchant_id = 'e0000001-0001-0001-0001-000000000007',
  installed_at_mid = 'MID007',
  installation_tid = 'TID004',
  used_date = CURRENT_DATE - 120
WHERE serial_number = 'SN-PAX-2023-0001';

UPDATE devices SET
  merchant_id = 'e0000001-0001-0001-0001-000000000005',
  installed_at_mid = 'MID005',
  installation_tid = 'TID005',
  used_date = CURRENT_DATE - 250
WHERE serial_number = 'SN-VFN-2023-0002';

-- Update engineer-assigned devices (E001 = cccccccc, E002 = dddddddd)
UPDATE devices SET
  assigned_to = 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  received_from_type = 'warehouse',
  received_from_id = 'a2222222-2222-2222-2222-222222222222',
  received_from_name = 'Delhi Central Warehouse'
WHERE serial_number IN ('SN-ING-2024-0003', 'SN-ING-2024-0004', 'SN-VFN-2024-0002');

UPDATE devices SET
  assigned_to = 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  received_from_type = 'warehouse',
  received_from_id = 'a3333333-3333-3333-3333-333333333333',
  received_from_name = 'Mumbai Warehouse'
WHERE serial_number IN ('SN-VFN-2024-0003', 'SN-PAX-2024-0003', 'SN-ING-2024-0005');

-- Update courier devices with fault details
UPDATE devices SET
  consignment_number = 'BD123456789',
  consignment_date = CURRENT_DATE - 2,
  courier_id = 'b1111111-1111-1111-1111-111111111111',
  error_type = 'hardware_failure',
  fault_description = 'Printer motor burnt out',
  fault_reported_date = CURRENT_DATE - 5
WHERE serial_number = 'SN-ING-2023-0003';

UPDATE devices SET
  consignment_number = 'DTDC987654321',
  consignment_date = CURRENT_DATE - 1,
  courier_id = 'b2222222-2222-2222-2222-222222222222',
  error_type = 'physical_damage',
  fault_description = 'Screen cracked - customer dropped device',
  fault_reported_date = CURRENT_DATE - 3
WHERE serial_number = 'SN-VFN-2023-0003';

-- Update faulty devices at warehouse
UPDATE devices SET
  error_type = 'hardware_failure',
  fault_description = 'Keypad buttons 1,4,7 not responding',
  fault_reported_date = CURRENT_DATE - 10
WHERE serial_number = 'SN-PAX-2023-0002';

UPDATE devices SET
  error_type = 'hardware_failure',
  fault_description = 'Card reader malfunction - unable to read chip cards',
  fault_reported_date = CURRENT_DATE - 8,
  incident_report = 'RMA raised with Ingenico - Reference: ING-RMA-2024-0056'
WHERE serial_number = 'SN-ING-2023-0004';

-- ==================================================
-- PART 7: SERVICE CALLS (15 calls)
-- ==================================================

INSERT INTO calls (
  id, call_number, type, status, client_bank,
  merchant_id, mid, tid, device_id,
  client_name, client_contact, client_phone, client_address,
  latitude, longitude, scheduled_date, priority,
  description, call_source, sla_deadline
) VALUES
-- 3 PENDING calls (need auto-allocation)
('ca110001-0001-0001-0001-000000000001', 'CALL-2024-0001', 'install', 'pending',
 '33333333-3333-3333-3333-333333333333',
 'e0000001-0001-0001-0001-000000000009', 'MID009', NULL, NULL,
 'Lakshmi Sarees', 'Lakshmi Devi', '+919333444004',
 '89, Commercial Street, Bangalore', 12.9823, 77.6061,
 CURRENT_DATE, 'high',
 'New POS terminal installation - high priority merchant',
 'api', NOW() + INTERVAL '4 hours'),

('ca110001-0001-0001-0001-000000000002', 'CALL-2024-0002', 'breakdown', 'pending',
 '22222222-2222-2222-2222-222222222222',
 'e0000001-0001-0001-0001-000000000010', 'MID010', NULL, NULL,
 'Joshi Sweets', 'Nitin Joshi', '+919444555001',
 '34, FC Road, Pune', 18.5267, 73.8409,
 CURRENT_DATE, 'urgent',
 'POS device completely non-functional - no power',
 'manual', NOW() + INTERVAL '2 hours'),

('ca110001-0001-0001-0001-000000000003', 'CALL-2024-0003', 'maintenance', 'pending',
 '11111111-1111-1111-1111-111111111111',
 'e0000001-0001-0001-0001-000000000003', 'MID003', NULL, NULL,
 'Verma Textiles', 'Suresh Verma', '+919111222004',
 'Shop 45, Lajpat Nagar Central Market', 28.5700, 77.2432,
 CURRENT_DATE + 1, 'medium',
 'Scheduled maintenance - paper roll replacement and cleaning',
 'auto', NOW() + INTERVAL '24 hours'),

-- 5 ASSIGNED calls
('ca110001-0001-0001-0001-000000000004', 'CALL-2024-0004', 'install', 'assigned',
 '11111111-1111-1111-1111-111111111111',
 'e0000001-0001-0001-0001-000000000003', 'MID003', NULL, 'f0000001-0001-0001-0001-000000000007',
 'Verma Textiles', 'Suresh Verma', '+919111222004',
 'Shop 45, Lajpat Nagar Central Market', 28.5700, 77.2432,
 CURRENT_DATE, 'medium',
 'New terminal installation - second device for billing counter',
 'manual', NOW() + INTERVAL '8 hours'),

('ca110001-0001-0001-0001-000000000005', 'CALL-2024-0005', 'swap', 'assigned',
 '11111111-1111-1111-1111-111111111111',
 'e0000001-0001-0001-0001-000000000002', 'MID002', 'TID002', 'f0000001-0001-0001-0001-000000000008',
 'Gupta Medical Store', 'Amit Gupta', '+919111222003',
 '23, Karol Bagh Main Market, New Delhi', 28.6519, 77.1909,
 CURRENT_DATE, 'high',
 'Device showing errors - customer requested swap',
 'manual', NOW() + INTERVAL '6 hours'),

('ca110001-0001-0001-0001-000000000006', 'CALL-2024-0006', 'install', 'assigned',
 '22222222-2222-2222-2222-222222222222',
 'e0000001-0001-0001-0001-000000000006', 'MID006', NULL, 'f0000001-0001-0001-0001-000000000009',
 'Nair Restaurant', 'Rajan Nair', '+919222333004',
 '45, Linking Road, Santacruz West, Mumbai', 19.0825, 72.8374,
 CURRENT_DATE, 'medium',
 'New installation for restaurant',
 'api', NOW() + INTERVAL '10 hours'),

('ca110001-0001-0001-0001-000000000007', 'CALL-2024-0007', 'maintenance', 'assigned',
 '22222222-2222-2222-2222-222222222222',
 'e0000001-0001-0001-0001-000000000005', 'MID005', 'TID005', 'f0000001-0001-0001-0001-000000000016',
 'Khan General Store', 'Fatima Khan', '+919222333003',
 '78, Hill Road, Bandra West, Mumbai', 19.0544, 72.8214,
 CURRENT_DATE + 1, 'low',
 'Annual maintenance check - device is 8 months old',
 'auto', NOW() + INTERVAL '48 hours'),

('ca110001-0001-0001-0001-000000000008', 'CALL-2024-0008', 'install', 'assigned',
 '33333333-3333-3333-3333-333333333333',
 'e0000001-0001-0001-0001-000000000008', 'MID008', NULL, NULL,
 'Murthy Clinic', 'Dr. Sanjay Murthy', '+919333444002',
 '56, 100 Feet Road, Indiranagar, Bangalore', 12.9784, 77.6408,
 CURRENT_DATE + 2, 'medium',
 'New POS for clinic reception',
 'manual', NOW() + INTERVAL '72 hours'),

-- 3 IN_PROGRESS calls
('ca110001-0001-0001-0001-000000000009', 'CALL-2024-0009', 'breakdown', 'in_progress',
 '11111111-1111-1111-1111-111111111111',
 'e0000001-0001-0001-0001-000000000001', 'MID001', 'TID001', 'f0000001-0001-0001-0001-000000000012',
 'Sharma Electronics', 'Raj Kumar', '+919111222001',
 'Shop 15, Connaught Place, New Delhi', 28.6315, 77.2167,
 CURRENT_DATE, 'urgent',
 'Device not printing receipts - thermal printer issue',
 'manual', NOW() + INTERVAL '3 hours'),

('ca110001-0001-0001-0001-000000000010', 'CALL-2024-0010', 'maintenance', 'in_progress',
 '22222222-2222-2222-2222-222222222222',
 'e0000001-0001-0001-0001-000000000004', 'MID004', 'TID003', 'f0000001-0001-0001-0001-000000000014',
 'Shah Jewellers', 'Prakash Shah', '+919222333001',
 'Shop 12, Zaveri Bazaar, Mumbai', 18.9467, 72.8355,
 CURRENT_DATE, 'medium',
 'Software update and key injection',
 'api', NOW() + INTERVAL '5 hours'),

('ca110001-0001-0001-0001-000000000011', 'CALL-2024-0011', 'breakdown', 'in_progress',
 '33333333-3333-3333-3333-333333333333',
 'e0000001-0001-0001-0001-000000000007', 'MID007', 'TID004', 'f0000001-0001-0001-0001-000000000015',
 'Iyengar Bakery', 'Ramesh Iyengar', '+919333444001',
 '23, Church Street, Bangalore', 12.9758, 77.6045,
 CURRENT_DATE, 'high',
 'Network connectivity issues - unable to process transactions',
 'manual', NOW() + INTERVAL '4 hours'),

-- 4 COMPLETED calls
('ca110001-0001-0001-0001-000000000012', 'CALL-2024-0012', 'install', 'completed',
 '11111111-1111-1111-1111-111111111111',
 'e0000001-0001-0001-0001-000000000001', 'MID001', 'TID001', 'f0000001-0001-0001-0001-000000000012',
 'Sharma Electronics', 'Raj Kumar', '+919111222001',
 'Shop 15, Connaught Place, New Delhi', 28.6315, 77.2167,
 CURRENT_DATE - 180, 'high',
 'Initial POS terminal installation',
 'manual', (CURRENT_DATE - 180)::TIMESTAMPTZ + INTERVAL '8 hours'),

('ca110001-0001-0001-0001-000000000013', 'CALL-2024-0013', 'install', 'completed',
 '22222222-2222-2222-2222-222222222222',
 'e0000001-0001-0001-0001-000000000004', 'MID004', 'TID003', 'f0000001-0001-0001-0001-000000000014',
 'Shah Jewellers', 'Prakash Shah', '+919222333001',
 'Shop 12, Zaveri Bazaar, Mumbai', 18.9467, 72.8355,
 CURRENT_DATE - 200, 'medium',
 'New POS installation for jewellery store',
 'api', (CURRENT_DATE - 200)::TIMESTAMPTZ + INTERVAL '10 hours'),

('ca110001-0001-0001-0001-000000000014', 'CALL-2024-0014', 'maintenance', 'completed',
 '33333333-3333-3333-3333-333333333333',
 'e0000001-0001-0001-0001-000000000007', 'MID007', 'TID004', 'f0000001-0001-0001-0001-000000000015',
 'Iyengar Bakery', 'Ramesh Iyengar', '+919333444001',
 '23, Church Street, Bangalore', 12.9758, 77.6045,
 CURRENT_DATE - 30, 'low',
 'Routine maintenance and paper roll replacement',
 'auto', (CURRENT_DATE - 30)::TIMESTAMPTZ + INTERVAL '24 hours'),

('ca110001-0001-0001-0001-000000000015', 'CALL-2024-0015', 'breakdown', 'completed',
 '22222222-2222-2222-2222-222222222222',
 'e0000001-0001-0001-0001-000000000005', 'MID005', 'TID005', 'f0000001-0001-0001-0001-000000000016',
 'Khan General Store', 'Fatima Khan', '+919222333003',
 '78, Hill Road, Bandra West, Mumbai', 19.0544, 72.8214,
 CURRENT_DATE - 15, 'urgent',
 'Device showing error E05 - card reader malfunction',
 'manual', (CURRENT_DATE - 15)::TIMESTAMPTZ + INTERVAL '4 hours')

ON CONFLICT (call_number) DO UPDATE SET
  status = EXCLUDED.status,
  merchant_id = EXCLUDED.merchant_id,
  mid = EXCLUDED.mid,
  tid = EXCLUDED.tid;

-- Assign engineers to calls (E001 = cccccccc, E002 = dddddddd)
UPDATE calls SET
  assigned_engineer = 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  auto_allocated = false,
  distance_to_merchant = 5.2
WHERE call_number IN ('CALL-2024-0004', 'CALL-2024-0005');

UPDATE calls SET
  assigned_engineer = 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  auto_allocated = true,
  allocation_reason = 'Nearest available engineer',
  distance_to_merchant = 3.8
WHERE call_number IN ('CALL-2024-0006', 'CALL-2024-0007');

-- Note: CALL-2024-0008 is in Bangalore - no engineer available there yet

-- In progress calls
UPDATE calls SET
  assigned_engineer = 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  started_at = NOW() - INTERVAL '45 minutes',
  distance_to_merchant = 4.5
WHERE call_number = 'CALL-2024-0009';

UPDATE calls SET
  assigned_engineer = 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  started_at = NOW() - INTERVAL '30 minutes',
  distance_to_merchant = 7.2
WHERE call_number = 'CALL-2024-0010';

-- CALL-2024-0011 in Bangalore - in progress but unassigned (for testing)

-- Completed calls
UPDATE calls SET
  assigned_engineer = 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  started_at = (CURRENT_DATE - 180)::TIMESTAMPTZ + INTERVAL '10 hours',
  completed_at = (CURRENT_DATE - 180)::TIMESTAMPTZ + INTERVAL '11 hours 30 minutes',
  actual_duration_minutes = 90,
  resolution_notes = 'Device installed and configured. Test transactions completed successfully. Merchant trained on usage.',
  distance_to_merchant = 4.2
WHERE call_number = 'CALL-2024-0012';

UPDATE calls SET
  assigned_engineer = 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  started_at = (CURRENT_DATE - 200)::TIMESTAMPTZ + INTERVAL '11 hours',
  completed_at = (CURRENT_DATE - 200)::TIMESTAMPTZ + INTERVAL '13 hours',
  actual_duration_minutes = 120,
  resolution_notes = 'Installation completed. Special configuration for jewelry store with higher transaction limits.',
  distance_to_merchant = 8.5
WHERE call_number = 'CALL-2024-0013';

UPDATE calls SET
  assigned_engineer = 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  started_at = (CURRENT_DATE - 30)::TIMESTAMPTZ + INTERVAL '14 hours',
  completed_at = (CURRENT_DATE - 30)::TIMESTAMPTZ + INTERVAL '14 hours 45 minutes',
  actual_duration_minutes = 45,
  resolution_notes = 'Routine maintenance completed. Replaced paper roll, cleaned card reader, updated firmware to v2.5.1',
  distance_to_merchant = 2.3
WHERE call_number = 'CALL-2024-0014';

UPDATE calls SET
  assigned_engineer = 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  started_at = (CURRENT_DATE - 15)::TIMESTAMPTZ + INTERVAL '9 hours',
  completed_at = (CURRENT_DATE - 15)::TIMESTAMPTZ + INTERVAL '10 hours',
  actual_duration_minutes = 60,
  resolution_notes = 'Card reader cleaned with IPA solution. Firmware reflashed. Error resolved. No hardware replacement needed.',
  distance_to_merchant = 5.1
WHERE call_number = 'CALL-2024-0015';

-- ==================================================
-- PART 8: STOCK MOVEMENTS (20 movements)
-- ==================================================

INSERT INTO stock_movements (
  id, device_id, movement_type,
  from_status, to_status,
  from_location_type, from_location_id, from_location_name,
  to_location_type, to_location_id, to_location_name,
  performed_by, notes, created_at
) VALUES

-- Movement 1-3: Warehouse receipts (new stock)
('5a000001-0001-0001-0001-000000000001',
 'f0000001-0001-0001-0001-000000000001', 'receipt_from_vendor',
 NULL, 'warehouse',
 NULL, NULL, 'Ingenico India Pvt Ltd',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'New stock - Invoice INV-2024-0891',
 NOW() - INTERVAL '5 days'),

('5a000001-0001-0001-0001-000000000002',
 'f0000001-0001-0001-0001-000000000002', 'receipt_from_vendor',
 NULL, 'warehouse',
 NULL, NULL, 'Ingenico India Pvt Ltd',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'New stock - Invoice INV-2024-0891',
 NOW() - INTERVAL '5 days'),

('5a000001-0001-0001-0001-000000000003',
 'f0000001-0001-0001-0001-000000000003', 'receipt_from_vendor',
 NULL, 'warehouse',
 NULL, NULL, 'Verifone India',
 'warehouse', 'a3333333-3333-3333-3333-333333333333', 'Mumbai Warehouse',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'New stock - PO-2024-1205',
 NOW() - INTERVAL '10 days'),

-- Movement 4-6: Warehouse → Engineer (issue)
('5a000001-0001-0001-0001-000000000004',
 'f0000001-0001-0001-0001-000000000006', 'issue_to_engineer',
 'warehouse', 'issued',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Issued for installation at MID003',
 NOW() - INTERVAL '3 days'),

('5a000001-0001-0001-0001-000000000005',
 'f0000001-0001-0001-0001-000000000007', 'issue_to_engineer',
 'warehouse', 'issued',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'For Verma Textiles new terminal',
 NOW() - INTERVAL '2 days'),

('5a000001-0001-0001-0001-000000000006',
 'f0000001-0001-0001-0001-000000000009', 'issue_to_engineer',
 'warehouse', 'issued',
 'warehouse', 'a3333333-3333-3333-3333-333333333333', 'Mumbai Warehouse',
 'engineer', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Priya Singh (E002)',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'New installation assignment',
 NOW() - INTERVAL '4 days'),

-- Movement 7-9: Engineer → Merchant (installation)
('5a000001-0001-0001-0001-000000000007',
 'f0000001-0001-0001-0001-000000000012', 'installation',
 'issued', 'installed',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 'merchant', 'e0000001-0001-0001-0001-000000000001', 'Sharma Electronics (MID001)',
 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Installation completed - TID001 assigned',
 NOW() - INTERVAL '180 days'),

('5a000001-0001-0001-0001-000000000008',
 'f0000001-0001-0001-0001-000000000014', 'installation',
 'issued', 'installed',
 'engineer', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Priya Singh (E002)',
 'merchant', 'e0000001-0001-0001-0001-000000000004', 'Shah Jewellers (MID004)',
 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'High-value merchant - TID003 assigned',
 NOW() - INTERVAL '200 days'),

('5a000001-0001-0001-0001-000000000009',
 'f0000001-0001-0001-0001-000000000015', 'installation',
 'issued', 'installed',
 'engineer', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Priya Singh (E002)',
 'merchant', 'e0000001-0001-0001-0001-000000000007', 'Iyengar Bakery (MID007)',
 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Android POS installed - TID004',
 NOW() - INTERVAL '120 days'),

-- Movement 10-11: Swap (Merchant → Engineer, Engineer → Merchant)
('5a000001-0001-0001-0001-000000000010',
 'f0000001-0001-0001-0001-000000000017', 'pickup_from_merchant',
 'installed', 'issued',
 'merchant', 'e0000001-0001-0001-0001-000000000002', 'Gupta Medical Store (MID002)',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Faulty device picked up for return',
 NOW() - INTERVAL '7 days'),

('5a000001-0001-0001-0001-000000000011',
 'f0000001-0001-0001-0001-000000000013', 'installation',
 'issued', 'installed',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 'merchant', 'e0000001-0001-0001-0001-000000000002', 'Gupta Medical Store (MID002)',
 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Swap completed - new device TID002',
 NOW() - INTERVAL '7 days'),

-- Movement 12-13: Engineer → Courier (return)
('5a000001-0001-0001-0001-000000000012',
 'f0000001-0001-0001-0001-000000000017', 'handover_to_courier',
 'issued', 'returned',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 'courier', 'b1111111-1111-1111-1111-111111111111', 'Blue Dart (AWB: BD123456789)',
 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Faulty device sent for repair',
 NOW() - INTERVAL '5 days'),

('5a000001-0001-0001-0001-000000000013',
 'f0000001-0001-0001-0001-000000000018', 'handover_to_courier',
 'issued', 'returned',
 'engineer', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Priya Singh (E002)',
 'courier', 'b2222222-2222-2222-2222-222222222222', 'DTDC (AWB: DTDC987654321)',
 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Screen damage - customer claim filed',
 NOW() - INTERVAL '3 days'),

-- Movement 14-15: Courier → Warehouse (return receipt)
('5a000001-0001-0001-0001-000000000014',
 'f0000001-0001-0001-0001-000000000019', 'receipt_from_courier',
 'returned', 'faulty',
 'courier', 'b3333333-3333-3333-3333-333333333333', 'Delhivery',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Received faulty - keypad issue',
 NOW() - INTERVAL '45 days'),

('5a000001-0001-0001-0001-000000000015',
 'f0000001-0001-0001-0001-000000000020', 'receipt_from_courier',
 'returned', 'faulty',
 'courier', 'b1111111-1111-1111-1111-111111111111', 'Blue Dart',
 'warehouse', 'a3333333-3333-3333-3333-333333333333', 'Mumbai Warehouse',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Card reader malfunction',
 NOW() - INTERVAL '20 days'),

-- Movement 16: Inter-warehouse transfer
('5a000001-0001-0001-0001-000000000016',
 'f0000001-0001-0001-0001-000000000004', 'inter_warehouse_transfer',
 'warehouse', 'warehouse',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 'warehouse', 'a4444444-4444-4444-4444-444444444444', 'Bangalore Regional Office',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Stock rebalancing for Bangalore region',
 NOW() - INTERVAL '30 days'),

-- Movement 17-18: Recent engineer issues
('5a000001-0001-0001-0001-000000000017',
 'f0000001-0001-0001-0001-000000000010', 'issue_to_engineer',
 'warehouse', 'issued',
 'warehouse', 'a3333333-3333-3333-3333-333333333333', 'Mumbai Warehouse',
 'engineer', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Priya Singh (E002)',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'High priority - for Nair Restaurant',
 NOW() - INTERVAL '1 day'),

('5a000001-0001-0001-0001-000000000018',
 'f0000001-0001-0001-0001-000000000008', 'issue_to_engineer',
 'warehouse', 'issued',
 'warehouse', 'a2222222-2222-2222-2222-222222222222', 'Delhi Central Warehouse',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Swap unit for Gupta Medical',
 NOW() - INTERVAL '7 days'),

-- Movement 19-20: Installation at Khan General Store & more
('5a000001-0001-0001-0001-000000000019',
 'f0000001-0001-0001-0001-000000000016', 'installation',
 'issued', 'installed',
 'engineer', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Priya Singh (E002)',
 'merchant', 'e0000001-0001-0001-0001-000000000005', 'Khan General Store (MID005)',
 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Installation completed - TID005',
 NOW() - INTERVAL '250 days'),

('5a000001-0001-0001-0001-000000000020',
 'f0000001-0001-0001-0001-000000000013', 'installation',
 'issued', 'installed',
 'engineer', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rahul Kumar (E001)',
 'merchant', 'e0000001-0001-0001-0001-000000000002', 'Gupta Medical Store (MID002)',
 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Initial installation - TID002',
 NOW() - INTERVAL '150 days')

ON CONFLICT (id) DO NOTHING;

-- Update stock movements with TID/MID where applicable
UPDATE stock_movements SET
  tid = 'TID001', mid = 'MID001',
  merchant_id = 'e0000001-0001-0001-0001-000000000001'
WHERE id = '5a000001-0001-0001-0001-000000000007';

UPDATE stock_movements SET
  tid = 'TID003', mid = 'MID004',
  merchant_id = 'e0000001-0001-0001-0001-000000000004'
WHERE id = '5a000001-0001-0001-0001-000000000008';

UPDATE stock_movements SET
  tid = 'TID004', mid = 'MID007',
  merchant_id = 'e0000001-0001-0001-0001-000000000007'
WHERE id = '5a000001-0001-0001-0001-000000000009';

UPDATE stock_movements SET
  mid = 'MID002',
  merchant_id = 'e0000001-0001-0001-0001-000000000002'
WHERE id IN ('5a000001-0001-0001-0001-000000000010', '5a000001-0001-0001-0001-000000000011');

UPDATE stock_movements SET
  consignment_number = 'BD123456789',
  courier_id = 'b1111111-1111-1111-1111-111111111111',
  courier_name = 'Blue Dart Express'
WHERE id = '5a000001-0001-0001-0001-000000000012';

UPDATE stock_movements SET
  consignment_number = 'DTDC987654321',
  courier_id = 'b2222222-2222-2222-2222-222222222222',
  courier_name = 'DTDC Courier'
WHERE id = '5a000001-0001-0001-0001-000000000013';

-- ==================================================
-- PART 9: ENGINEER AGGREGATES
-- ==================================================

INSERT INTO engineer_aggregates (
  engineer_id, total_calls_completed, total_calls_assigned,
  active_calls_count, devices_issued_count, avg_completion_time_minutes,
  last_call_completed_at, performance_score
) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 45, 52, 3, 3, 75.5,
 NOW() - INTERVAL '2 days', 92.5),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 38, 42, 2, 3, 82.3,
 NOW() - INTERVAL '15 days', 88.0)
ON CONFLICT (engineer_id) DO UPDATE SET
  total_calls_completed = EXCLUDED.total_calls_completed,
  total_calls_assigned = EXCLUDED.total_calls_assigned,
  active_calls_count = EXCLUDED.active_calls_count,
  devices_issued_count = EXCLUDED.devices_issued_count,
  avg_completion_time_minutes = EXCLUDED.avg_completion_time_minutes,
  last_call_completed_at = EXCLUDED.last_call_completed_at,
  performance_score = EXCLUDED.performance_score,
  updated_at = NOW();

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

SELECT '====== FINAL INTEGRATED TEST DATA LOADED ======' as status;

SELECT
  'SUMMARY' as info,
  (SELECT COUNT(*) FROM banks) as banks,
  (SELECT COUNT(*) FROM warehouses) as warehouses,
  (SELECT COUNT(*) FROM couriers) as couriers,
  (SELECT COUNT(*) FROM user_profiles) as users,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'engineer') as engineers,
  (SELECT COUNT(*) FROM merchants) as merchants,
  (SELECT COUNT(*) FROM devices) as devices,
  (SELECT COUNT(*) FROM calls) as calls,
  (SELECT COUNT(*) FROM stock_movements) as stock_movements;

-- Device status distribution
SELECT 'DEVICE STATUS' as info, status, COUNT(*) as count
FROM devices GROUP BY status ORDER BY count DESC;

-- Call status distribution
SELECT 'CALL STATUS' as info, status, COUNT(*) as count
FROM calls GROUP BY status ORDER BY count DESC;

-- User profiles
SELECT 'USER PROFILES' as info, email, role, emp_id, region
FROM user_profiles ORDER BY role, email;

-- Engineer workload
SELECT 'ENGINEER WORKLOAD' as info,
  e.full_name,
  e.emp_id,
  e.region,
  COUNT(CASE WHEN c.status IN ('assigned', 'in_progress') THEN 1 END) as active_calls,
  (SELECT COUNT(*) FROM devices d WHERE d.assigned_to = e.id) as devices_in_hand
FROM user_profiles e
LEFT JOIN calls c ON c.assigned_engineer = e.id
WHERE e.role = 'engineer'
GROUP BY e.id, e.full_name, e.emp_id, e.region;

SELECT '
============================================
TEST DATA LOADED SUCCESSFULLY!
============================================
Login Credentials (Password: Test@123)

SUPER ADMIN:
  Email: superadmin@test.com

ADMIN:
  Email: admin@test.com

ENGINEER 1 (Delhi - HDFC):
  Email: engineer1@test.com
  Emp ID: E001

ENGINEER 2 (Mumbai - ICICI):
  Email: engineer2@test.com
  Emp ID: E002
============================================
' as credentials;
