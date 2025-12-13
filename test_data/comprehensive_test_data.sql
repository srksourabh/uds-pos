-- =====================================================
-- COMPREHENSIVE TEST DATA FOR UDS-POS
-- =====================================================
-- Version: 2.0
-- Date: 2025-12-12
-- Purpose: Create realistic production-like test data
--
-- IMPORTANT: Run this AFTER minimal test data is loaded
-- Uses ON CONFLICT DO NOTHING to avoid duplicates
-- =====================================================

-- =====================================================
-- SECTION 1: ADDITIONAL BANKS (if needed)
-- =====================================================
-- Existing: HDFC, ICICI, AXIS (from minimal data)
-- Adding: SBI, Kotak for variety

INSERT INTO banks (id, name, code, active, contact_person, contact_email, metadata) VALUES
('44444444-4444-4444-4444-444444444444', 'State Bank of India', 'SBI', true, 'Manoj Kumar', 'manoj.kumar@sbi.co.in', '{"region": "Pan India"}'::jsonb),
('55555555-5555-5555-5555-555555555555', 'Kotak Mahindra Bank', 'KOTAK', true, 'Preeti Sharma', 'preeti.sharma@kotak.com', '{"region": "Metro Cities"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 2: ADDITIONAL WAREHOUSES
-- =====================================================
-- Existing: Delhi (WH-DEL), Mumbai (WH-MUM)
-- Adding: Bangalore, Kolkata

INSERT INTO warehouses (id, name, code, address, manager_name, manager_phone, capacity, is_active) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Bangalore Warehouse', 'WH-BLR', 'Electronic City, Bangalore, Karnataka', 'Venkat Rao', '+919876500003', 300, true),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Kolkata Warehouse', 'WH-KOL', 'Salt Lake, Kolkata, West Bengal', 'Subhas Mondal', '+919876500004', 250, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 3: ADDITIONAL ENGINEERS (as user_profiles)
-- =====================================================
-- Note: These are inserted directly without auth.users
-- For real testing, create users in Supabase Auth first
-- Using employee IDs: UDSPL1400-1405

-- Engineer 3: Amit Verma (Delhi - HDFC)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, active, region,
  last_location_lat, last_location_lng, metadata) VALUES
('e0030003-0003-0003-0003-000000000003', 'amit.verma@uds.test', 'Amit Verma', '+919876543212',
 'engineer', '11111111-1111-1111-1111-111111111111', 'active', true, 'North',
 28.5672, 77.2100, '{"emp_id": "UDSPL1400", "city": "Delhi", "state": "Delhi"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Engineer 4: Sunita Devi (Mumbai - ICICI)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, active, region,
  last_location_lat, last_location_lng, metadata) VALUES
('e0040004-0004-0004-0004-000000000004', 'sunita.devi@uds.test', 'Sunita Devi', '+919876543213',
 'engineer', '22222222-2222-2222-2222-222222222222', 'active', true, 'West',
 19.0760, 72.8777, '{"emp_id": "UDSPL1401", "city": "Mumbai", "state": "Maharashtra"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Engineer 5: Ravi Shankar (Bangalore - AXIS)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, active, region,
  last_location_lat, last_location_lng, metadata) VALUES
('e0050005-0005-0005-0005-000000000005', 'ravi.shankar@uds.test', 'Ravi Shankar', '+919876543214',
 'engineer', '33333333-3333-3333-3333-333333333333', 'active', true, 'South',
 12.9716, 77.5946, '{"emp_id": "UDSPL1402", "city": "Bangalore", "state": "Karnataka"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Engineer 6: Mohan Das (Kolkata - SBI)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status, active, region,
  last_location_lat, last_location_lng, metadata) VALUES
('e0060006-0006-0006-0006-000000000006', 'mohan.das@uds.test', 'Mohan Das', '+919876543215',
 'engineer', '44444444-4444-4444-4444-444444444444', 'active', true, 'East',
 22.5726, 88.3639, '{"emp_id": "UDSPL1403", "city": "Kolkata", "state": "West Bengal"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 4: ADDITIONAL DEVICES (20 more, total 25)
-- =====================================================
-- TID Formats: SB###### (HDFC/ICICI), OD###### (AXIS/SBI), WB###### (KOTAK)
-- Brands: Ingenico, VeriFone, FUJIAN
-- Models: iCT250, VX520, ET389-WIFI

-- Warehouse Devices (10 additional)
INSERT INTO devices (id, serial_number, model, device_bank, status, assigned_to, notes, metadata) VALUES
-- Delhi Warehouse - HDFC
('d0060006-0006-0006-0006-000000000006', 'ING-2024-006', 'iCT250', '11111111-1111-1111-1111-111111111111', 'warehouse', NULL, 'Delhi warehouse stock', '{"tid": "SB223540", "brand": "Ingenico", "warehouse": "WH-DEL"}'::jsonb),
('d0070007-0007-0007-0007-000000000007', 'ING-2024-007', 'iCT250', '11111111-1111-1111-1111-111111111111', 'warehouse', NULL, 'Delhi warehouse stock', '{"tid": "SB223541", "brand": "Ingenico", "warehouse": "WH-DEL"}'::jsonb),
('d0080008-0008-0008-0008-000000000008', 'VRF-2024-008', 'VX520', '11111111-1111-1111-1111-111111111111', 'warehouse', NULL, 'Delhi warehouse stock', '{"tid": "SB223542", "brand": "VeriFone", "warehouse": "WH-DEL"}'::jsonb),
-- Mumbai Warehouse - ICICI
('d0090009-0009-0009-0009-000000000009', 'FUJ-2024-009', 'ET389-WIFI', '22222222-2222-2222-2222-222222222222', 'warehouse', NULL, 'Mumbai warehouse stock', '{"tid": "SB223543", "brand": "FUJIAN", "warehouse": "WH-MUM"}'::jsonb),
('d0100010-0010-0010-0010-000000000010', 'VRF-2024-010', 'VX520', '22222222-2222-2222-2222-222222222222', 'warehouse', NULL, 'Mumbai warehouse stock', '{"tid": "SB223544", "brand": "VeriFone", "warehouse": "WH-MUM"}'::jsonb),
-- Bangalore Warehouse - AXIS
('d0110011-0011-0011-0011-000000000011', 'ING-2024-011', 'iCT250', '33333333-3333-3333-3333-333333333333', 'warehouse', NULL, 'Bangalore warehouse stock', '{"tid": "OD046300", "brand": "Ingenico", "warehouse": "WH-BLR"}'::jsonb),
('d0120012-0012-0012-0012-000000000012', 'FUJ-2024-012', 'ET389-WIFI', '33333333-3333-3333-3333-333333333333', 'warehouse', NULL, 'Bangalore warehouse stock', '{"tid": "OD046301", "brand": "FUJIAN", "warehouse": "WH-BLR"}'::jsonb),
-- Kolkata Warehouse - SBI
('d0130013-0013-0013-0013-000000000013', 'VRF-2024-013', 'VX520', '44444444-4444-4444-4444-444444444444', 'warehouse', NULL, 'Kolkata warehouse stock', '{"tid": "OD046302", "brand": "VeriFone", "warehouse": "WH-KOL"}'::jsonb),
('d0140014-0014-0014-0014-000000000014', 'ING-2024-014', 'iCT250', '44444444-4444-4444-4444-444444444444', 'warehouse', NULL, 'Kolkata warehouse stock', '{"tid": "OD046303", "brand": "Ingenico", "warehouse": "WH-KOL"}'::jsonb),
-- Kotak devices
('d0150015-0015-0015-0015-000000000015', 'FUJ-2024-015', 'ET389-WIFI', '55555555-5555-5555-5555-555555555555', 'warehouse', NULL, 'Delhi warehouse - Kotak', '{"tid": "WB032100", "brand": "FUJIAN", "warehouse": "WH-DEL"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Issued Devices (5 additional - assigned to engineers)
INSERT INTO devices (id, serial_number, model, device_bank, status, assigned_to, notes, metadata) VALUES
-- Issued to Amit Verma (Delhi)
('d0160016-0016-0016-0016-000000000016', 'ING-2024-016', 'iCT250', '11111111-1111-1111-1111-111111111111', 'issued', 'e0030003-0003-0003-0003-000000000003', 'Issued to Amit Verma', '{"tid": "SB223550", "brand": "Ingenico"}'::jsonb),
('d0170017-0017-0017-0017-000000000017', 'VRF-2024-017', 'VX520', '11111111-1111-1111-1111-111111111111', 'issued', 'e0030003-0003-0003-0003-000000000003', 'Issued to Amit Verma', '{"tid": "SB223551", "brand": "VeriFone"}'::jsonb),
-- Issued to Sunita Devi (Mumbai)
('d0180018-0018-0018-0018-000000000018', 'FUJ-2024-018', 'ET389-WIFI', '22222222-2222-2222-2222-222222222222', 'issued', 'e0040004-0004-0004-0004-000000000004', 'Issued to Sunita Devi', '{"tid": "SB223552", "brand": "FUJIAN"}'::jsonb),
-- Issued to Ravi Shankar (Bangalore)
('d0190019-0019-0019-0019-000000000019', 'ING-2024-019', 'iCT250', '33333333-3333-3333-3333-333333333333', 'issued', 'e0050005-0005-0005-0005-000000000005', 'Issued to Ravi Shankar', '{"tid": "OD046310", "brand": "Ingenico"}'::jsonb),
-- Issued to Mohan Das (Kolkata)
('d0200020-0020-0020-0020-000000000020', 'VRF-2024-020', 'VX520', '44444444-4444-4444-4444-444444444444', 'issued', 'e0060006-0006-0006-0006-000000000006', 'Issued to Mohan Das', '{"tid": "OD046311", "brand": "VeriFone"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Installed Devices (3 - at merchant locations)
INSERT INTO devices (id, serial_number, model, device_bank, status, assigned_to, installed_at_client, installation_date, notes, metadata) VALUES
('d0210021-0021-0021-0021-000000000021', 'ING-2024-021', 'iCT250', '11111111-1111-1111-1111-111111111111', 'installed', NULL, 'Sharma Electronics, Delhi', CURRENT_DATE - INTERVAL '30 days', 'Installation completed', '{"tid": "SB223560", "brand": "Ingenico", "mid": "022211900519450"}'::jsonb),
('d0220022-0022-0022-0022-000000000022', 'VRF-2024-022', 'VX520', '22222222-2222-2222-2222-222222222222', 'installed', NULL, 'Khan Store, Mumbai', CURRENT_DATE - INTERVAL '15 days', 'Installation completed', '{"tid": "SB223561", "brand": "VeriFone", "mid": "022211900519451"}'::jsonb),
('d0230023-0023-0023-0023-000000000023', 'FUJ-2024-023', 'ET389-WIFI', '33333333-3333-3333-3333-333333333333', 'installed', NULL, 'Gupta Mart, Bangalore', CURRENT_DATE - INTERVAL '7 days', 'Installation completed', '{"tid": "OD046320", "brand": "FUJIAN", "mid": "022211900519452"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Faulty Devices (2)
INSERT INTO devices (id, serial_number, model, device_bank, status, assigned_to, notes, metadata) VALUES
('d0240024-0024-0024-0024-000000000024', 'ING-2024-024', 'iCT250', '11111111-1111-1111-1111-111111111111', 'faulty', NULL, 'Display malfunction - sent for repair', '{"tid": "SB223570", "brand": "Ingenico", "fault_type": "display", "fault_date": "2024-12-10"}'::jsonb),
('d0250025-0025-0025-0025-000000000025', 'VRF-2024-025', 'VX520', '22222222-2222-2222-2222-222222222222', 'faulty', NULL, 'Card reader not working', '{"tid": "SB223571", "brand": "VeriFone", "fault_type": "card_reader", "fault_date": "2024-12-08"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 5: ADDITIONAL CALLS (15 more, total 18)
-- =====================================================
-- Status Distribution: 6 pending, 5 assigned, 3 in_progress, 1 completed
-- (existing: 1 pending, 1 assigned, 1 in_progress = 3 total)
-- Adding: 5 pending, 4 assigned, 2 in_progress, 4 completed

-- PENDING CALLS (5 additional - unassigned)
INSERT INTO calls (id, call_number, type, status, priority, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, description, metadata) VALUES
-- Pending call 2 - High priority install in Delhi
('c0040004-0004-0004-0004-000000000004', 'CALL-2024-0004', 'install', 'pending', 'high', '11111111-1111-1111-1111-111111111111', 'Patel General Store', 'Ramesh Patel', '+919111222444', 'Karol Bagh, New Delhi, Delhi 110005', 28.6519, 77.1909, CURRENT_DATE + INTERVAL '1 day', 'New POS terminal installation', '{"mid": "022211900519446", "device_type": "POS Terminal"}'::jsonb),
-- Pending call 3 - Urgent breakdown in Mumbai
('c0050005-0005-0005-0005-000000000005', 'CALL-2024-0005', 'breakdown', 'pending', 'urgent', '22222222-2222-2222-2222-222222222222', 'Desai Kirana', 'Prakash Desai', '+919222333555', 'Dadar West, Mumbai, Maharashtra 400028', 19.0176, 72.8426, CURRENT_DATE, 'Device not connecting to network', '{"mid": "022211900519447", "issue": "Network connectivity"}'::jsonb),
-- Pending call 4 - Medium priority maintenance in Bangalore
('c0060006-0006-0006-0006-000000000006', 'CALL-2024-0006', 'maintenance', 'pending', 'medium', '33333333-3333-3333-3333-333333333333', 'Reddy Supermarket', 'Venkat Reddy', '+919333444666', 'Indiranagar, Bangalore, Karnataka 560038', 12.9784, 77.6408, CURRENT_DATE + INTERVAL '2 days', 'Scheduled maintenance check', '{"mid": "022211900519448", "last_maintenance": "2024-09-15"}'::jsonb),
-- Pending call 5 - Low priority swap in Kolkata
('c0070007-0007-0007-0007-000000000007', 'CALL-2024-0007', 'swap', 'pending', 'low', '44444444-4444-4444-4444-444444444444', 'Das Electronics', 'Arijit Das', '+919444555777', 'Park Street, Kolkata, West Bengal 700016', 22.5513, 88.3522, CURRENT_DATE + INTERVAL '3 days', 'Customer requested device upgrade', '{"mid": "022211900519449", "swap_reason": "upgrade"}'::jsonb),
-- Pending call 6 - High priority deinstall in Delhi
('c0080008-0008-0008-0008-000000000008', 'CALL-2024-0008', 'deinstall', 'pending', 'high', '11111111-1111-1111-1111-111111111111', 'Mehta Trading', 'Suresh Mehta', '+919555666888', 'Lajpat Nagar, New Delhi, Delhi 110024', 28.5672, 77.2373, CURRENT_DATE + INTERVAL '1 day', 'Merchant closing business', '{"mid": "022211900519453", "deinstall_reason": "business_closure"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ASSIGNED CALLS (4 additional - assigned to engineers, not started)
-- Note: Using existing engineers from minimal data + new engineers
INSERT INTO calls (id, call_number, type, status, priority, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, assigned_engineer, description, metadata) VALUES
-- Assigned to Rajesh Kumar (existing engineer)
('c0090009-0009-0009-0009-000000000009', 'CALL-2024-0009', 'install', 'assigned', 'high', '11111111-1111-1111-1111-111111111111', 'Singh Medical Store', 'Harpreet Singh', '+919666777999', 'Rajouri Garden, New Delhi, Delhi 110027', 28.6466, 77.1237, CURRENT_DATE, '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'New installation at medical store', '{"mid": "022211900519454", "device_type": "POS Terminal"}'::jsonb),
-- Assigned to Priya Singh (existing engineer)
('c0100010-0010-0010-0010-000000000010', 'CALL-2024-0010', 'maintenance', 'assigned', 'medium', '22222222-2222-2222-2222-222222222222', 'Joshi Garments', 'Nitin Joshi', '+919777888000', 'Bandra West, Mumbai, Maharashtra 400050', 19.0544, 72.8265, CURRENT_DATE + INTERVAL '1 day', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Quarterly maintenance', '{"mid": "022211900519455", "maintenance_type": "quarterly"}'::jsonb),
-- Assigned to Amit Verma (new engineer)
('c0110011-0011-0011-0011-000000000011', 'CALL-2024-0011', 'swap', 'assigned', 'high', '11111111-1111-1111-1111-111111111111', 'Kumar Hardware', 'Sanjay Kumar', '+919888999111', 'Dwarka, New Delhi, Delhi 110075', 28.5823, 77.0500, CURRENT_DATE, 'e0030003-0003-0003-0003-000000000003', 'Replace faulty device', '{"mid": "022211900519456", "old_tid": "SB223570", "swap_reason": "faulty"}'::jsonb),
-- Assigned to Ravi Shankar (new engineer)
('c0120012-0012-0012-0012-000000000012', 'CALL-2024-0012', 'install', 'assigned', 'medium', '33333333-3333-3333-3333-333333333333', 'Rao Jewellers', 'Suresh Rao', '+919999000222', 'JP Nagar, Bangalore, Karnataka 560078', 12.8917, 77.5856, CURRENT_DATE + INTERVAL '1 day', 'e0050005-0005-0005-0005-000000000005', 'New jewelry store installation', '{"mid": "022211900519457", "device_type": "POS Terminal"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- IN-PROGRESS CALLS (2 additional - engineer on site, work started)
INSERT INTO calls (id, call_number, type, status, priority, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, assigned_engineer, started_at, description, metadata) VALUES
-- In-progress by Sunita Devi (new engineer)
('c0130013-0013-0013-0013-000000000013', 'CALL-2024-0013', 'breakdown', 'in_progress', 'urgent', '22222222-2222-2222-2222-222222222222', 'Patil Pharmacy', 'Ganesh Patil', '+919000111333', 'Thane West, Mumbai, Maharashtra 400601', 19.2183, 72.9781, CURRENT_DATE, 'e0040004-0004-0004-0004-000000000004', NOW() - INTERVAL '30 minutes', 'Paper jam and printing issues', '{"mid": "022211900519458", "issue": "printer_jam", "work_started": true}'::jsonb),
-- In-progress by Mohan Das (new engineer)
('c0140014-0014-0014-0014-000000000014', 'CALL-2024-0014', 'install', 'in_progress', 'high', '44444444-4444-4444-4444-444444444444', 'Banerjee Sweet Shop', 'Dipak Banerjee', '+919111222444', 'Howrah, West Bengal 711101', 22.5958, 88.2636, CURRENT_DATE, 'e0060006-0006-0006-0006-000000000006', NOW() - INTERVAL '45 minutes', 'New installation - configuring device', '{"mid": "022211900519459", "device_type": "POS Terminal", "config_in_progress": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- COMPLETED CALLS (4 - for history and reporting)
INSERT INTO calls (id, call_number, type, status, priority, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, assigned_engineer, started_at, completed_at, resolution_notes, actual_duration_minutes, description, metadata) VALUES
-- Completed yesterday by Rajesh Kumar
('c0150015-0015-0015-0015-000000000015', 'CALL-2024-0015', 'install', 'completed', 'high', '11111111-1111-1111-1111-111111111111', 'Aggarwal Stores', 'Mohit Aggarwal', '+919222333666', 'Chandni Chowk, Delhi, Delhi 110006', 28.6560, 77.2300, CURRENT_DATE - INTERVAL '1 day', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', CURRENT_TIMESTAMP - INTERVAL '26 hours', CURRENT_TIMESTAMP - INTERVAL '25 hours', 'Installation completed successfully. Device tested with test transaction.', 60, 'New POS installation', '{"mid": "022211900519460", "installation_verified": true, "test_txn_id": "TXN001"}'::jsonb),
-- Completed 2 days ago by Priya Singh
('c0160016-0016-0016-0016-000000000016', 'CALL-2024-0016', 'maintenance', 'completed', 'medium', '22222222-2222-2222-2222-222222222222', 'Shah Brothers', 'Vikram Shah', '+919333444777', 'Worli, Mumbai, Maharashtra 400018', 19.0144, 72.8185, CURRENT_DATE - INTERVAL '2 days', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', CURRENT_TIMESTAMP - INTERVAL '50 hours', CURRENT_TIMESTAMP - INTERVAL '49 hours', 'Routine maintenance completed. Firmware updated.', 45, 'Scheduled maintenance', '{"mid": "022211900519461", "firmware_updated": true, "new_version": "v3.2.1"}'::jsonb),
-- Completed 3 days ago by Amit Verma
('c0170017-0017-0017-0017-000000000017', 'CALL-2024-0017', 'swap', 'completed', 'high', '11111111-1111-1111-1111-111111111111', 'Gupta Electronics', 'Rahul Gupta', '+919444555888', 'Saket, New Delhi, Delhi 110017', 28.5245, 77.2066, CURRENT_DATE - INTERVAL '3 days', 'e0030003-0003-0003-0003-000000000003', CURRENT_TIMESTAMP - INTERVAL '74 hours', CURRENT_TIMESTAMP - INTERVAL '73 hours', 'Device swapped. Old device collected for repair.', 75, 'Device replacement', '{"mid": "022211900519462", "old_tid": "SB223571", "new_tid": "SB223550", "swap_completed": true}'::jsonb),
-- Completed today by Ravi Shankar
('c0180018-0018-0018-0018-000000000018', 'CALL-2024-0018', 'breakdown', 'completed', 'urgent', '33333333-3333-3333-3333-333333333333', 'Naidu Textiles', 'Krishna Naidu', '+919555666999', 'MG Road, Bangalore, Karnataka 560001', 12.9758, 77.6045, CURRENT_DATE, 'e0050005-0005-0005-0005-000000000005', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'Network cable was loose. Fixed connectivity issue.', 30, 'Network connectivity issue', '{"mid": "022211900519463", "issue_fixed": "cable_reconnection", "verified_connection": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 6: CALL HISTORY (Status transitions)
-- =====================================================
-- Shows how calls progressed through statuses

INSERT INTO call_history (id, call_id, from_status, to_status, actor_id, notes, created_at) VALUES
-- History for completed call c0150015
('ch010001-0001-0001-0001-000000000001', 'c0150015-0015-0015-0015-000000000015', 'pending', 'assigned', '6092ed26-43ac-4f6b-bcba-61da32adb75c', 'Assigned to Rajesh Kumar', CURRENT_TIMESTAMP - INTERVAL '27 hours'),
('ch020002-0002-0002-0002-000000000002', 'c0150015-0015-0015-0015-000000000015', 'assigned', 'in_progress', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Engineer started work', CURRENT_TIMESTAMP - INTERVAL '26 hours'),
('ch030003-0003-0003-0003-000000000003', 'c0150015-0015-0015-0015-000000000015', 'in_progress', 'completed', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Installation completed', CURRENT_TIMESTAMP - INTERVAL '25 hours'),

-- History for completed call c0160016
('ch040004-0004-0004-0004-000000000004', 'c0160016-0016-0016-0016-000000000016', 'pending', 'assigned', '6092ed26-43ac-4f6b-bcba-61da32adb75c', 'Assigned to Priya Singh', CURRENT_TIMESTAMP - INTERVAL '51 hours'),
('ch050005-0005-0005-0005-000000000005', 'c0160016-0016-0016-0016-000000000016', 'assigned', 'in_progress', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Maintenance started', CURRENT_TIMESTAMP - INTERVAL '50 hours'),
('ch060006-0006-0006-0006-000000000006', 'c0160016-0016-0016-0016-000000000016', 'in_progress', 'completed', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Maintenance completed', CURRENT_TIMESTAMP - INTERVAL '49 hours'),

-- History for in-progress call c0130013
('ch070007-0007-0007-0007-000000000007', 'c0130013-0013-0013-0013-000000000013', 'pending', 'assigned', '6092ed26-43ac-4f6b-bcba-61da32adb75c', 'Urgent - assigned to Sunita Devi', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('ch080008-0008-0008-0008-000000000008', 'c0130013-0013-0013-0013-000000000013', 'assigned', 'in_progress', 'e0040004-0004-0004-0004-000000000004', 'Engineer on site', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),

-- History for assigned call c0090009
('ch090009-0009-0009-0009-000000000009', 'c0090009-0009-0009-0009-000000000009', 'pending', 'assigned', '6092ed26-43ac-4f6b-bcba-61da32adb75c', 'Assigned to Rajesh Kumar', CURRENT_TIMESTAMP - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 7: STOCK MOVEMENTS (Issuance and transfers)
-- =====================================================

-- Device issuances to new engineers
INSERT INTO stock_movements (id, device_id, movement_type, from_status, to_status, to_engineer, actor_id, reason, notes, metadata) VALUES
-- Issued to Amit Verma
('st010001-0001-0001-0001-000000000001', 'd0160016-0016-0016-0016-000000000016', 'issuance', 'warehouse', 'issued', 'e0030003-0003-0003-0003-000000000003', '6092ed26-43ac-4f6b-bcba-61da32adb75c', 'Stock issuance to engineer', 'Device issued from Delhi warehouse', '{"warehouse": "WH-DEL"}'::jsonb),
('st020002-0002-0002-0002-000000000002', 'd0170017-0017-0017-0017-000000000017', 'issuance', 'warehouse', 'issued', 'e0030003-0003-0003-0003-000000000003', '6092ed26-43ac-4f6b-bcba-61da32adb75c', 'Stock issuance to engineer', 'Device issued from Delhi warehouse', '{"warehouse": "WH-DEL"}'::jsonb),
-- Issued to Sunita Devi
('st030003-0003-0003-0003-000000000003', 'd0180018-0018-0018-0018-000000000018', 'issuance', 'warehouse', 'issued', 'e0040004-0004-0004-0004-000000000004', '6092ed26-43ac-4f6b-bcba-61da32adb75c', 'Stock issuance to engineer', 'Device issued from Mumbai warehouse', '{"warehouse": "WH-MUM"}'::jsonb),
-- Issued to Ravi Shankar
('st040004-0004-0004-0004-000000000004', 'd0190019-0019-0019-0019-000000000019', 'issuance', 'warehouse', 'issued', 'e0050005-0005-0005-0005-000000000005', '6092ed26-43ac-4f6b-bcba-61da32adb75c', 'Stock issuance to engineer', 'Device issued from Bangalore warehouse', '{"warehouse": "WH-BLR"}'::jsonb),
-- Issued to Mohan Das
('st050005-0005-0005-0005-000000000005', 'd0200020-0020-0020-0020-000000000020', 'issuance', 'warehouse', 'issued', 'e0060006-0006-0006-0006-000000000006', '6092ed26-43ac-4f6b-bcba-61da32adb75c', 'Stock issuance to engineer', 'Device issued from Kolkata warehouse', '{"warehouse": "WH-KOL"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Device installations (status change from issued to installed)
INSERT INTO stock_movements (id, device_id, movement_type, from_status, to_status, from_engineer, actor_id, reason, notes, metadata) VALUES
('st060006-0006-0006-0006-000000000006', 'd0210021-0021-0021-0021-000000000021', 'status_change', 'issued', 'installed', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Device installed at merchant', 'Installation at Sharma Electronics', '{"merchant": "Sharma Electronics", "mid": "022211900519450"}'::jsonb),
('st070007-0007-0007-0007-000000000007', 'd0220022-0022-0022-0022-000000000022', 'status_change', 'issued', 'installed', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Device installed at merchant', 'Installation at Khan Store', '{"merchant": "Khan Store", "mid": "022211900519451"}'::jsonb),
('st080008-0008-0008-0008-000000000008', 'd0230023-0023-0023-0023-000000000023', 'status_change', 'issued', 'installed', 'e0050005-0005-0005-0005-000000000005', 'e0050005-0005-0005-0005-000000000005', 'Device installed at merchant', 'Installation at Gupta Mart', '{"merchant": "Gupta Mart", "mid": "022211900519452"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Faulty device returns
INSERT INTO stock_movements (id, device_id, movement_type, from_status, to_status, from_engineer, actor_id, reason, notes, metadata) VALUES
('st090009-0009-0009-0009-000000000009', 'd0240024-0024-0024-0024-000000000024', 'return', 'issued', 'faulty', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Device returned faulty', 'Display malfunction - returned for repair', '{"fault_type": "display", "repair_required": true}'::jsonb),
('st100010-0010-0010-0010-000000000010', 'd0250025-0025-0025-0025-000000000025', 'return', 'issued', 'faulty', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Device returned faulty', 'Card reader not working - returned for repair', '{"fault_type": "card_reader", "repair_required": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 8: CALL_DEVICES (Link devices to calls)
-- =====================================================

INSERT INTO call_devices (id, call_id, device_id, action) VALUES
-- Completed installation calls
('cd010001-0001-0001-0001-000000000001', 'c0150015-0015-0015-0015-000000000015', 'd0210021-0021-0021-0021-000000000021', 'install'),
-- Completed maintenance calls
('cd020002-0002-0002-0002-000000000002', 'c0160016-0016-0016-0016-000000000016', 'd0220022-0022-0022-0022-000000000022', 'maintain'),
-- Completed swap calls
('cd030003-0003-0003-0003-000000000003', 'c0170017-0017-0017-0017-000000000017', 'd0240024-0024-0024-0024-000000000024', 'remove'),
('cd040004-0004-0004-0004-000000000004', 'c0170017-0017-0017-0017-000000000017', 'd0160016-0016-0016-0016-000000000016', 'install'),
-- In-progress calls
('cd050005-0005-0005-0005-000000000005', 'c0130013-0013-0013-0013-000000000013', 'd0180018-0018-0018-0018-000000000018', 'repair'),
('cd060006-0006-0006-0006-000000000006', 'c0140014-0014-0014-0014-000000000014', 'd0200020-0020-0020-0020-000000000020', 'install')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 9: ENGINEER AGGREGATES (Performance data)
-- =====================================================

INSERT INTO engineer_aggregates (id, engineer_id, period_type, period_start, period_end,
  total_calls_assigned, total_calls_completed, total_calls_in_progress, completion_rate,
  average_resolution_time_minutes, total_devices_installed, total_devices_swapped,
  calls_by_type, calls_by_priority, performance_score) VALUES
-- Rajesh Kumar stats (existing engineer)
('ea010001-0001-0001-0001-000000000001', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'monthly',
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
 8, 5, 1, 0.625, 52, 3, 1,
 '{"install": 4, "maintenance": 2, "swap": 1, "breakdown": 1}'::jsonb,
 '{"high": 4, "medium": 2, "low": 1, "urgent": 1}'::jsonb, 85.5),
-- Priya Singh stats (existing engineer)
('ea020002-0002-0002-0002-000000000002', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'monthly',
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
 6, 4, 1, 0.667, 48, 2, 0,
 '{"install": 2, "maintenance": 3, "breakdown": 1}'::jsonb,
 '{"high": 2, "medium": 3, "urgent": 1}'::jsonb, 88.0),
-- Amit Verma stats (new engineer)
('ea030003-0003-0003-0003-000000000003', 'e0030003-0003-0003-0003-000000000003', 'monthly',
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
 5, 3, 0, 0.600, 65, 2, 1,
 '{"install": 2, "swap": 2, "maintenance": 1}'::jsonb,
 '{"high": 3, "medium": 2}'::jsonb, 82.0),
-- Ravi Shankar stats (new engineer)
('ea040004-0004-0004-0004-000000000004', 'e0050005-0005-0005-0005-000000000005', 'monthly',
 DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
 4, 2, 0, 0.500, 40, 1, 0,
 '{"install": 2, "breakdown": 2}'::jsonb,
 '{"high": 1, "medium": 1, "urgent": 2}'::jsonb, 79.5)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 10: STOCK ALERTS
-- =====================================================

INSERT INTO stock_alerts (id, alert_type, severity, bank_id, engineer_id, device_type, threshold_value, current_value, status, metadata) VALUES
-- Low stock alert for HDFC
('sa010001-0001-0001-0001-000000000001', 'low_stock', 'warning', '11111111-1111-1111-1111-111111111111', NULL, 'iCT250', 5, 3, 'active', '{"warehouse": "WH-DEL", "message": "Low stock of Ingenico iCT250 devices"}'::jsonb),
-- Engineer stock alert
('sa020002-0002-0002-0002-000000000002', 'engineer_low_stock', 'info', NULL, 'e0060006-0006-0006-0006-000000000006', NULL, 2, 1, 'active', '{"message": "Engineer Mohan Das has only 1 device in hand"}'::jsonb),
-- Acknowledged faulty device alert
('sa030003-0003-0003-0003-000000000003', 'high_faulty_rate', 'warning', '22222222-2222-2222-2222-222222222222', NULL, 'VX520', 5, 8, 'acknowledged', '{"message": "High faulty rate for VeriFone VX520 devices", "acknowledged_by": "admin"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '==========================================' as separator;
SELECT '  COMPREHENSIVE TEST DATA LOADED!' as message;
SELECT '==========================================' as separator;

-- Entity counts
SELECT 'Entity Counts:' as section;
SELECT 'Banks' as entity, COUNT(*) as count FROM banks
UNION ALL SELECT 'Warehouses', COUNT(*) FROM warehouses
UNION ALL SELECT 'Users (Total)', COUNT(*) FROM user_profiles
UNION ALL SELECT 'Engineers', COUNT(*) FROM user_profiles WHERE role = 'engineer'
UNION ALL SELECT 'Admins', COUNT(*) FROM user_profiles WHERE role IN ('admin', 'super_admin')
UNION ALL SELECT 'Devices (Total)', COUNT(*) FROM devices
UNION ALL SELECT 'Devices (Warehouse)', COUNT(*) FROM devices WHERE status = 'warehouse'
UNION ALL SELECT 'Devices (Issued)', COUNT(*) FROM devices WHERE status = 'issued'
UNION ALL SELECT 'Devices (Installed)', COUNT(*) FROM devices WHERE status = 'installed'
UNION ALL SELECT 'Devices (Faulty)', COUNT(*) FROM devices WHERE status = 'faulty'
UNION ALL SELECT 'Calls (Total)', COUNT(*) FROM calls
UNION ALL SELECT 'Calls (Pending)', COUNT(*) FROM calls WHERE status = 'pending'
UNION ALL SELECT 'Calls (Assigned)', COUNT(*) FROM calls WHERE status = 'assigned'
UNION ALL SELECT 'Calls (In Progress)', COUNT(*) FROM calls WHERE status = 'in_progress'
UNION ALL SELECT 'Calls (Completed)', COUNT(*) FROM calls WHERE status = 'completed'
UNION ALL SELECT 'Stock Movements', COUNT(*) FROM stock_movements
UNION ALL SELECT 'Call History', COUNT(*) FROM call_history
UNION ALL SELECT 'Stock Alerts', COUNT(*) FROM stock_alerts;

-- Engineers summary
SELECT 'Engineers Summary:' as section;
SELECT u.full_name, u.region, b.code as bank,
       (SELECT COUNT(*) FROM devices d WHERE d.assigned_to = u.id) as devices_held,
       (SELECT COUNT(*) FROM calls c WHERE c.assigned_engineer = u.id AND c.status != 'completed') as active_calls
FROM user_profiles u
LEFT JOIN banks b ON u.bank_id = b.id
WHERE u.role = 'engineer'
ORDER BY u.full_name;

-- Calls by status and type
SELECT 'Calls Distribution:' as section;
SELECT type, status, COUNT(*) as count
FROM calls
GROUP BY type, status
ORDER BY type, status;

-- Devices by bank and status
SELECT 'Device Distribution:' as section;
SELECT b.code as bank, d.status, COUNT(*) as count
FROM devices d
JOIN banks b ON d.device_bank = b.id
GROUP BY b.code, d.status
ORDER BY b.code, d.status;
