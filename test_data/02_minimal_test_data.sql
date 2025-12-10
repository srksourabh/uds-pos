-- ==================================================
-- UDS-POS MINIMAL TEST DATA
-- ==================================================
-- Using existing auth users from your Supabase instance
-- ==================================================

-- ==================================================
-- PART 1: BANKS
-- ==================================================

INSERT INTO banks (id, name, code, active) VALUES
('11111111-1111-1111-1111-111111111111', 'HDFC Bank', 'HDFC', true),
('22222222-2222-2222-2222-222222222222', 'ICICI Bank', 'ICICI', true),
('33333333-3333-3333-3333-333333333333', 'Axis Bank', 'AXIS', true)
ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- PART 2: USER PROFILES (using your existing auth users)
-- ==================================================

-- Admin: superadmin@uds.com
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, region) VALUES
('c21048c7-a7bc-4ebe-96e7-e2a79a87bd30', 'superadmin@uds.com', 'Super Admin', '+919999999999', 'admin', NULL, 'active', 'All India')
ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';

-- Admin 2: admin@posultimate.com
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, region) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@posultimate.com', 'Admin POS', '+919999999998', 'admin', NULL, 'active', 'All India')
ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';

-- Engineer 1: rahul.kumar@posultimate.com (HDFC Bank)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, region) VALUES
('e1111111-1111-1111-1111-111111111111', 'rahul.kumar@posultimate.com', 'Rahul Kumar', '+919876543210', 'engineer', '11111111-1111-1111-1111-111111111111', 'active', 'North')
ON CONFLICT (id) DO UPDATE SET role = 'engineer', status = 'active', bank_id = '11111111-1111-1111-1111-111111111111';

-- Engineer 2: sunita.devi@posultimate.com (ICICI Bank)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, region) VALUES
('e2222222-2222-2222-2222-222222222222', 'sunita.devi@posultimate.com', 'Sunita Devi', '+919876543211', 'engineer', '22222222-2222-2222-2222-222222222222', 'active', 'South')
ON CONFLICT (id) DO UPDATE SET role = 'engineer', status = 'active', bank_id = '22222222-2222-2222-2222-222222222222';

-- Engineer 3: mohan.singh@posultimate.com (Axis Bank)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, region) VALUES
('e3333333-3333-3333-3333-333333333331', 'mohan.singh@posultimate.com', 'Mohan Singh', '+919876543212', 'engineer', '33333333-3333-3333-3333-333333333333', 'active', 'West')
ON CONFLICT (id) DO UPDATE SET role = 'engineer', status = 'active', bank_id = '33333333-3333-3333-3333-333333333333';

-- Engineer 4: vijay.sharma@posultimate.com (HDFC Bank)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, region) VALUES
('e1111111-1111-1111-1111-111111111112', 'vijay.sharma@posultimate.com', 'Vijay Sharma', '+919876543213', 'engineer', '11111111-1111-1111-1111-111111111111', 'active', 'North')
ON CONFLICT (id) DO UPDATE SET role = 'engineer', status = 'active', bank_id = '11111111-1111-1111-1111-111111111111';

-- Engineer 5: ganesh.patil@posultimate.com (ICICI Bank)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, region) VALUES
('e4444444-4444-4444-4444-444444444441', 'ganesh.patil@posultimate.com', 'Ganesh Patil', '+919876543214', 'engineer', '22222222-2222-2222-2222-222222222222', 'active', 'West')
ON CONFLICT (id) DO UPDATE SET role = 'engineer', status = 'active', bank_id = '22222222-2222-2222-2222-222222222222';

-- ==================================================
-- PART 3: WAREHOUSES
-- ==================================================

INSERT INTO warehouses (name, code, address, manager_name, is_active) VALUES
('Delhi Central Warehouse', 'WH-DEL', 'Nehru Place, New Delhi', 'Amit Kumar', true),
('Mumbai Warehouse', 'WH-MUM', 'Andheri East, Mumbai', 'Pradeep Shah', true),
('Bangalore Warehouse', 'WH-BLR', 'Koramangala, Bangalore', 'Venkat Rao', true)
ON CONFLICT (code) DO NOTHING;

-- ==================================================
-- PART 4: COURIERS
-- ==================================================

INSERT INTO couriers (name, code) VALUES
('Blue Dart', 'BD'),
('DTDC', 'DTDC'),
('India Post', 'IP')
ON CONFLICT (code) DO NOTHING;

-- ==================================================
-- PART 5: DEVICES
-- ==================================================

INSERT INTO devices (serial_number, model, device_bank, status) VALUES
('SN001001', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'warehouse'),
('SN001002', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'warehouse'),
('SN001003', 'Verifone VX520', '22222222-2222-2222-2222-222222222222', 'warehouse'),
('SN001004', 'Verifone VX520', '22222222-2222-2222-2222-222222222222', 'warehouse'),
('SN001005', 'PAX D210', '33333333-3333-3333-3333-333333333333', 'warehouse'),
('SN001006', 'PAX D210', '33333333-3333-3333-3333-333333333333', 'warehouse'),
('SN001007', 'Ingenico Move 5000', '11111111-1111-1111-1111-111111111111', 'warehouse'),
('SN001008', 'Ingenico Move 5000', '22222222-2222-2222-2222-222222222222', 'warehouse'),
('SN001009', 'Verifone VX820', '11111111-1111-1111-1111-111111111111', 'warehouse'),
('SN001010', 'PAX A920', '22222222-2222-2222-2222-222222222222', 'warehouse'),
('SN001011', 'Ingenico iCT250', '33333333-3333-3333-3333-333333333333', 'warehouse'),
('SN001012', 'Verifone VX520', '11111111-1111-1111-1111-111111111111', 'warehouse')
ON CONFLICT (serial_number) DO NOTHING;

-- ==================================================
-- PART 6: CALLS (SERVICE TICKETS)
-- ==================================================

INSERT INTO calls (
  call_number, type, status, client_bank, client_name,
  client_contact, client_phone, client_address,
  latitude, longitude, scheduled_date, priority, description
) VALUES
-- Pending tickets
('CALL-2024-0001', 'install', 'pending', '11111111-1111-1111-1111-111111111111',
 'Sharma Electronics', 'Mr. Sharma', '+919111222333',
 'Connaught Place, New Delhi', 28.6304, 77.2177,
 CURRENT_DATE, 'high', 'New POS terminal installation required'),

('CALL-2024-0002', 'breakdown', 'pending', '22222222-2222-2222-2222-222222222222',
 'Singh Medical', 'Dr. Singh', '+919555666777',
 'Civil Lines, Jaipur', 26.9196, 75.8119,
 CURRENT_DATE, 'urgent', 'POS device completely non-functional'),

-- Assigned tickets
('CALL-2024-0003', 'maintenance', 'assigned', '22222222-2222-2222-2222-222222222222',
 'Khan General Store', 'Mr. Khan', '+919222333444',
 'Andheri West, Mumbai', 19.1136, 72.8697,
 CURRENT_DATE, 'medium', 'POS not printing receipts'),

('CALL-2024-0004', 'install', 'assigned', '11111111-1111-1111-1111-111111111111',
 'Verma Textiles', 'Mrs. Verma', '+919666777888',
 'Karol Bagh, New Delhi', 28.6519, 77.1909,
 CURRENT_DATE + 1, 'medium', 'New installation for textile shop'),

-- In progress tickets
('CALL-2024-0005', 'swap', 'in_progress', '33333333-3333-3333-3333-333333333333',
 'Gupta Supermart', 'Ms. Gupta', '+919333444555',
 'Koramangala, Bangalore', 12.9352, 77.6245,
 CURRENT_DATE, 'high', 'Swapping faulty device'),

('CALL-2024-0006', 'maintenance', 'in_progress', '11111111-1111-1111-1111-111111111111',
 'Reddy Pharmacy', 'Mr. Reddy', '+919777888999',
 'Banjara Hills, Hyderabad', 17.4156, 78.4347,
 CURRENT_DATE, 'medium', 'Annual maintenance check'),

-- Completed tickets
('CALL-2024-0007', 'install', 'completed', '11111111-1111-1111-1111-111111111111',
 'Patel Hardware', 'Mr. Patel', '+919444555666',
 'Satellite, Ahmedabad', 23.0258, 72.5873,
 CURRENT_DATE - 1, 'medium', 'Installation completed successfully'),

('CALL-2024-0008', 'breakdown', 'completed', '22222222-2222-2222-2222-222222222222',
 'Joshi Sweets', 'Mr. Joshi', '+919888999000',
 'MG Road, Pune', 18.5196, 73.8553,
 CURRENT_DATE - 2, 'high', 'Fixed connectivity issue')
ON CONFLICT (call_number) DO NOTHING;

-- ==================================================
-- PART 7: ASSIGN ENGINEERS TO CALLS
-- ==================================================

-- Assign CALL-2024-0003 to Sunita Devi
UPDATE calls
SET assigned_engineer = 'e2222222-2222-2222-2222-222222222222'
WHERE call_number = 'CALL-2024-0003';

-- Assign CALL-2024-0004 to Rahul Kumar
UPDATE calls
SET assigned_engineer = 'e1111111-1111-1111-1111-111111111111'
WHERE call_number = 'CALL-2024-0004';

-- Assign CALL-2024-0005 to Mohan Singh (in progress)
UPDATE calls
SET assigned_engineer = 'e3333333-3333-3333-3333-333333333331',
    started_at = NOW() - INTERVAL '45 minutes'
WHERE call_number = 'CALL-2024-0005';

-- Assign CALL-2024-0006 to Vijay Sharma (in progress)
UPDATE calls
SET assigned_engineer = 'e1111111-1111-1111-1111-111111111112',
    started_at = NOW() - INTERVAL '30 minutes'
WHERE call_number = 'CALL-2024-0006';

-- Assign CALL-2024-0007 to Rahul Kumar (completed)
UPDATE calls
SET assigned_engineer = 'e1111111-1111-1111-1111-111111111111',
    started_at = NOW() - INTERVAL '26 hours',
    completed_at = NOW() - INTERVAL '25 hours',
    actual_duration_minutes = 60,
    resolution_notes = 'Device installed and tested successfully. Customer signed off.'
WHERE call_number = 'CALL-2024-0007';

-- Assign CALL-2024-0008 to Ganesh Patil (completed)
UPDATE calls
SET assigned_engineer = 'e4444444-4444-4444-4444-444444444441',
    started_at = NOW() - INTERVAL '50 hours',
    completed_at = NOW() - INTERVAL '49 hours',
    actual_duration_minutes = 45,
    resolution_notes = 'Network cable was loose. Reconnected and tested all functions.'
WHERE call_number = 'CALL-2024-0008';

-- ==================================================
-- SUCCESS MESSAGE
-- ==================================================
SELECT
  (SELECT COUNT(*) FROM banks) as banks_count,
  (SELECT COUNT(*) FROM user_profiles) as profiles_count,
  (SELECT COUNT(*) FROM devices) as devices_count,
  (SELECT COUNT(*) FROM calls) as calls_count,
  (SELECT COUNT(*) FROM warehouses) as warehouses_count,
  (SELECT COUNT(*) FROM couriers) as couriers_count,
  'Test data loaded successfully!' as message;
