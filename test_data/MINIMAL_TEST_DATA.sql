-- =====================================================
-- MINIMAL TEST DATA - Works with Current Schema
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Banks
INSERT INTO banks (id, name, code, active) VALUES
('11111111-1111-1111-1111-111111111111', 'HDFC Bank', 'HDFC', true),
('22222222-2222-2222-2222-222222222222', 'ICICI Bank', 'ICICI', true),
('33333333-3333-3333-3333-333333333333', 'Axis Bank', 'AXIS', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Warehouses (using actual schema columns)
INSERT INTO warehouses (id, name, code, address, manager_name, manager_phone, capacity, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Delhi Warehouse', 'WH-DEL', 'Nehru Place, New Delhi, Delhi', 'Ramesh Gupta', '+919876500001', 500, true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mumbai Warehouse', 'WH-MUM', 'Andheri, Mumbai, Maharashtra', 'Suresh Patil', '+919876500002', 500, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. Update Admin User (assuming already exists from auth)
UPDATE user_profiles SET
  full_name = 'Admin User',
  phone = '+919999999999',
  role = 'admin',
  status = 'active',
  active = true
WHERE id = '6092ed26-43ac-4f6b-bcba-61da32adb75c';

-- 4. Update Engineers (assuming already exist from auth)
UPDATE user_profiles SET
  full_name = 'Rajesh Kumar',
  phone = '+919876543210',
  role = 'engineer',
  bank_id = '11111111-1111-1111-1111-111111111111',
  status = 'active',
  active = true,
  region = 'North',
  last_location_lat = 28.6304,
  last_location_lng = 77.2177,
  metadata = '{"emp_id": "UDSPL1191", "city": "Delhi", "state": "Delhi"}'::jsonb
WHERE id = '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8';

UPDATE user_profiles SET
  full_name = 'Priya Singh',
  phone = '+919876543211',
  role = 'engineer',
  bank_id = '22222222-2222-2222-2222-222222222222',
  status = 'active',
  active = true,
  region = 'West',
  last_location_lat = 19.1136,
  last_location_lng = 72.8697,
  metadata = '{"emp_id": "UDSPL1218", "city": "Mumbai", "state": "Maharashtra"}'::jsonb
WHERE id = 'ea4583ec-e579-45a2-baf8-dbe048d258b2';

-- 5. Devices (using actual schema - no current_location_type/id)
INSERT INTO devices (id, serial_number, model, device_bank, status, assigned_to, notes, metadata) VALUES
-- Warehouse devices (not assigned)
('d0010001-0001-0001-0001-000000000001', 'ING-2024-001', 'iCT250', '11111111-1111-1111-1111-111111111111', 'warehouse', NULL, 'Delhi warehouse stock', '{"tid": "SB223535", "brand": "Ingenico", "warehouse": "WH-DEL"}'::jsonb),
('d0020002-0002-0002-0002-000000000002', 'VRF-2024-001', 'VX520', '11111111-1111-1111-1111-111111111111', 'warehouse', NULL, 'Delhi warehouse stock', '{"tid": "SB223536", "brand": "VeriFone", "warehouse": "WH-DEL"}'::jsonb),
('d0030003-0003-0003-0003-000000000003', 'FUJ-2024-001', 'ET389-WIFI', '22222222-2222-2222-2222-222222222222', 'warehouse', NULL, 'Mumbai warehouse stock', '{"tid": "OD046294", "brand": "FUJIAN", "warehouse": "WH-MUM"}'::jsonb),
-- Issued to engineers
('d0040004-0004-0004-0004-000000000004', 'ING-2024-002', 'iCT250', '11111111-1111-1111-1111-111111111111', 'issued', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Issued to Rajesh Kumar', '{"tid": "SB223537", "brand": "Ingenico"}'::jsonb),
('d0050005-0005-0005-0005-000000000005', 'VRF-2024-002', 'VX520', '22222222-2222-2222-2222-222222222222', 'issued', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Issued to Priya Singh', '{"tid": "WB032097", "brand": "VeriFone"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  serial_number = EXCLUDED.serial_number,
  model = EXCLUDED.model,
  status = EXCLUDED.status,
  assigned_to = EXCLUDED.assigned_to,
  metadata = EXCLUDED.metadata;

-- 6. Calls (using actual schema - no merchant_id, mid, device_id columns)
-- Store merchant/device info in metadata JSONB
INSERT INTO calls (id, call_number, type, status, priority, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, description, metadata) VALUES
-- Pending call (unassigned)
('c0010001-0001-0001-0001-000000000001', 'CALL-2024-0001', 'install', 'pending', 'high', '11111111-1111-1111-1111-111111111111', 'Sharma Electronics', 'Vikram Sharma', '+919111222333', 'Connaught Place, New Delhi, Delhi 110001', 28.6304, 77.2177, CURRENT_DATE, 'New POS installation', '{"mid": "022211900519443", "tid": "SB223535", "device_type": "POS Terminal"}'::jsonb),
-- Assigned call
('c0020002-0002-0002-0002-000000000002', 'CALL-2024-0002', 'maintenance', 'assigned', 'medium', '22222222-2222-2222-2222-222222222222', 'Khan Store', 'Imran Khan', '+919222333444', 'Andheri West, Mumbai, Maharashtra 400053', 19.1136, 72.8697, CURRENT_DATE, 'Routine maintenance check', '{"mid": "022211900519444", "tid": "OD046294", "device_type": "POS Terminal"}'::jsonb),
-- In-progress call
('c0030003-0003-0003-0003-000000000003', 'CALL-2024-0003', 'breakdown', 'in_progress', 'urgent', '33333333-3333-3333-3333-333333333333', 'Gupta Mart', 'Anil Gupta', '+919333444555', 'Koramangala, Bangalore, Karnataka 560095', 12.9352, 77.6245, CURRENT_DATE, 'Device not powering on', '{"mid": "022211900519445", "tid": "WB032097", "device_type": "POS Terminal", "problem": "Power failure"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  call_number = EXCLUDED.call_number,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata;

-- 7. Assign engineers to calls
UPDATE calls SET assigned_engineer = '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8'
WHERE id = 'c0020002-0002-0002-0002-000000000002';

UPDATE calls SET
  assigned_engineer = 'ea4583ec-e579-45a2-baf8-dbe048d258b2',
  started_at = NOW() - INTERVAL '1 hour'
WHERE id = 'c0030003-0003-0003-0003-000000000003';

-- 8. Stock Movements (showing device issuance)
INSERT INTO stock_movements (id, device_id, movement_type, from_status, to_status, to_engineer, actor_id, reason, notes, metadata) VALUES
('sm010001-0001-0001-0001-000000000001', 'd0040004-0004-0004-0004-000000000004', 'issuance', 'warehouse', 'issued', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', '4d41c32a-dd3c-4090-80dd-a1f8a422f6c8', 'Stock issuance', 'Device issued from Delhi warehouse', '{}'::jsonb),
('sm020002-0002-0002-0002-000000000002', 'd0050005-0005-0005-0005-000000000005', 'issuance', 'warehouse', 'issued', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'ea4583ec-e579-45a2-baf8-dbe048d258b2', 'Stock issuance', 'Device issued from Mumbai warehouse', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  movement_type = EXCLUDED.movement_type,
  from_status = EXCLUDED.from_status,
  to_status = EXCLUDED.to_status;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '✅ DATA LOADED!' as status;

SELECT 'Banks' as entity, COUNT(*) as count FROM banks
UNION ALL
SELECT 'Users', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'Warehouses', COUNT(*) FROM warehouses
UNION ALL
SELECT 'Devices', COUNT(*) FROM devices
UNION ALL
SELECT 'Calls', COUNT(*) FROM calls
UNION ALL
SELECT 'Stock Movements', COUNT(*) FROM stock_movements;

-- Show engineers
SELECT id, full_name, role, region, bank_id, status
FROM user_profiles
WHERE role = 'engineer';

-- Show calls with assignments
SELECT c.call_number, c.type, c.status, c.client_name, u.full_name as engineer
FROM calls c
LEFT JOIN user_profiles u ON c.assigned_engineer = u.id;

-- Show devices with assignments
SELECT d.serial_number, d.model, d.status, u.full_name as assigned_to
FROM devices d
LEFT JOIN user_profiles u ON d.assigned_to = u.id;
