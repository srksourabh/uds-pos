/*
  ============================================
  UDS-POS COMPREHENSIVE TEST DATA
  ============================================

  This script creates realistic test data for complete workflow testing.

  Contents:
  - 8 Banks (major Indian banks)
  - 6 Users (1 admin + 5 engineers)
  - 15 Merchants/Clients with realistic Indian addresses
  - 50+ POS Devices in various statuses
  - 30+ Service Tickets in various states
  - Inventory movements and stock transactions
  - Warehouses and couriers
  - Sample photos and alerts

  Run this in Supabase SQL Editor after running auth_setup_complete.sql

  Test Credentials:
  - Admin: admin@uds.com / Admin@123
  - Engineers: rajesh@uds.com, priya@uds.com, etc. / Engineer@123
*/

-- =====================================================
-- PART 1: BANKS (8 Major Indian Banks)
-- =====================================================

-- Clear existing test data (optional - comment out if you want to preserve data)
-- TRUNCATE banks CASCADE;

INSERT INTO banks (id, name, code, active, contact_person, contact_email, contact_phone, address, metadata) VALUES
-- Major Banks
('11111111-1111-1111-1111-111111111111', 'State Bank of India', 'SBI', true, 'Rajendra Sharma', 'rajendra.sharma@sbi.co.in', '+91-22-22021000', 'SBI Corporate Center, Madame Cama Road, Mumbai 400021', '{"swift_code": "SBININBB", "ifsc_prefix": "SBIN", "type": "public_sector"}'),
('22222222-2222-2222-2222-222222222222', 'HDFC Bank', 'HDFC', true, 'Priya Menon', 'priya.menon@hdfcbank.com', '+91-22-67521000', 'HDFC Bank House, Senapati Bapat Marg, Lower Parel, Mumbai 400013', '{"swift_code": "HDFCINBB", "ifsc_prefix": "HDFC", "type": "private_sector"}'),
('33333333-3333-3333-3333-333333333333', 'ICICI Bank', 'ICICI', true, 'Amit Patel', 'amit.patel@icicibank.com', '+91-22-26531414', 'ICICI Bank Towers, Bandra-Kurla Complex, Mumbai 400051', '{"swift_code": "ABORINBB", "ifsc_prefix": "ICIC", "type": "private_sector"}'),
('44444444-4444-4444-4444-444444444444', 'Axis Bank', 'AXIS', true, 'Sneha Reddy', 'sneha.reddy@axisbank.com', '+91-22-24252525', 'Axis House, Bombay Dyeing Mills Compound, Pandurang Budhkar Marg, Mumbai 400025', '{"swift_code": "AXISINBB", "ifsc_prefix": "UTIB", "type": "private_sector"}'),
('55555555-5555-5555-5555-555555555555', 'Kotak Mahindra Bank', 'KOTAK', true, 'Vikram Joshi', 'vikram.joshi@kotak.com', '+91-22-66056666', '27 BKC, C 27, G Block, Bandra Kurla Complex, Mumbai 400051', '{"swift_code": "ABORINBB", "ifsc_prefix": "KKBK", "type": "private_sector"}'),
('66666666-6666-6666-6666-666666666666', 'Punjab National Bank', 'PNB', true, 'Harpreet Singh', 'harpreet.singh@pnb.co.in', '+91-11-25744270', 'PNB Head Office, Bhikaji Cama Place, New Delhi 110066', '{"swift_code": "PUNBINBB", "ifsc_prefix": "PUNB", "type": "public_sector"}'),
('77777777-7777-7777-7777-777777777777', 'Bank of Baroda', 'BOB', true, 'Meera Nair', 'meera.nair@bankofbaroda.com', '+91-265-2316704', 'Baroda Corporate Centre, C-26, G-Block, BKC, Mumbai 400051', '{"swift_code": "BARBINBB", "ifsc_prefix": "BARB", "type": "public_sector"}'),
('88888888-8888-8888-8888-888888888888', 'IndusInd Bank', 'INDUS', true, 'Karan Malhotra', 'karan.malhotra@indusind.com', '+91-22-26412121', '2401, Gen. Thimmayya Road, Cantonment, Pune 411001', '{"swift_code": "INDBINBB", "ifsc_prefix": "INDB", "type": "private_sector"}')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  contact_person = EXCLUDED.contact_person,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  address = EXCLUDED.address,
  metadata = EXCLUDED.metadata;

-- =====================================================
-- PART 2: WAREHOUSES (3 Regional Warehouses)
-- =====================================================

INSERT INTO warehouses (id, name, code, address, manager_name, manager_phone, is_active) VALUES
('aaaa1111-1111-1111-1111-111111111111', 'Mumbai Central Warehouse', 'WH-MUM', 'Plot 45, MIDC Industrial Area, Andheri East, Mumbai 400093', 'Suresh Kumar', '+919876543210', true),
('aaaa2222-2222-2222-2222-222222222222', 'Delhi NCR Warehouse', 'WH-DEL', 'Unit 12, Okhla Industrial Estate, Phase 2, New Delhi 110020', 'Pankaj Gupta', '+919876543211', true),
('aaaa3333-3333-3333-3333-333333333333', 'Bangalore Tech Hub Warehouse', 'WH-BLR', 'No. 78, Electronic City Phase 1, Bangalore 560100', 'Naresh Rao', '+919876543212', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  manager_name = EXCLUDED.manager_name,
  manager_phone = EXCLUDED.manager_phone;

-- =====================================================
-- PART 3: COURIERS (4 Courier Companies)
-- =====================================================

INSERT INTO couriers (id, name, code, contact_phone, is_active) VALUES
('cccc1111-1111-1111-1111-111111111111', 'Blue Dart Express', 'BLUEDART', '+91-1800-233-1234', true),
('cccc2222-2222-2222-2222-222222222222', 'DTDC Courier', 'DTDC', '+91-1800-102-5882', true),
('cccc3333-3333-3333-3333-333333333333', 'FedEx India', 'FEDEX', '+91-1800-209-6161', true),
('cccc4444-4444-4444-4444-444444444444', 'Delhivery', 'DELHIVERY', '+91-1800-103-5577', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  contact_phone = EXCLUDED.contact_phone;

-- =====================================================
-- PART 4: TEST ENGINEERS (5 Field Engineers)
-- =====================================================

-- Note: Run this AFTER auth_setup_complete.sql which creates the base admin user

-- Create engineer auth users
DO $$
DECLARE
  eng_id uuid;
  engineers_data jsonb := '[
    {"email": "rajesh@uds.com", "name": "Rajesh Kumar", "phone": "+919876500001", "region": "Mumbai", "skills": ["POS Installation", "Network Troubleshooting", "Ingenico Certified"]},
    {"email": "priya@uds.com", "name": "Priya Singh", "phone": "+919876500002", "region": "Delhi NCR", "skills": ["Network Expert", "Verifone Certified", "PAX Certified"]},
    {"email": "amit@uds.com", "name": "Amit Patel", "phone": "+919876500003", "region": "Bangalore", "skills": ["Hardware Repair", "Ingenico Certified", "Soldering"]},
    {"email": "sneha@uds.com", "name": "Sneha Reddy", "phone": "+919876500004", "region": "Hyderabad", "skills": ["Software Troubleshooting", "PAX Certified", "Firmware Updates"]},
    {"email": "vikram@uds.com", "name": "Vikram Joshi", "phone": "+919876500005", "region": "Pune", "skills": ["General Technician", "Multi-brand Expert", "Network Setup"]}
  ]';
  engineer jsonb;
BEGIN
  FOR engineer IN SELECT * FROM jsonb_array_elements(engineers_data)
  LOOP
    -- Check if user already exists
    SELECT id INTO eng_id FROM auth.users WHERE email = engineer->>'email';

    IF eng_id IS NULL THEN
      -- Create auth user
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
        is_super_admin, role, aud, confirmation_token
      ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        engineer->>'email',
        crypt('Engineer@123', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', engineer->>'name'),
        false, 'authenticated', 'authenticated', ''
      ) RETURNING id INTO eng_id;

      -- Create identity
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), eng_id,
        jsonb_build_object('sub', eng_id::text, 'email', engineer->>'email'),
        'email', eng_id::text, now(), now(), now()
      );

      RAISE NOTICE 'Created engineer: %', engineer->>'email';
    ELSE
      RAISE NOTICE 'Engineer already exists: %', engineer->>'email';
    END IF;

    -- Create or update user profile
    INSERT INTO user_profiles (
      id, email, full_name, phone, role, bank_id, region, skills, status, active,
      last_location_lat, last_location_lng, last_location_updated_at
    ) VALUES (
      eng_id,
      engineer->>'email',
      engineer->>'name',
      engineer->>'phone',
      'engineer',
      '11111111-1111-1111-1111-111111111111', -- Default to SBI
      engineer->>'region',
      (engineer->'skills')::jsonb,
      'active',
      true,
      -- Set initial location based on region
      CASE engineer->>'region'
        WHEN 'Mumbai' THEN 19.0760
        WHEN 'Delhi NCR' THEN 28.6139
        WHEN 'Bangalore' THEN 12.9716
        WHEN 'Hyderabad' THEN 17.3850
        WHEN 'Pune' THEN 18.5204
        ELSE 19.0760
      END,
      CASE engineer->>'region'
        WHEN 'Mumbai' THEN 72.8777
        WHEN 'Delhi NCR' THEN 77.2090
        WHEN 'Bangalore' THEN 77.5946
        WHEN 'Hyderabad' THEN 78.4867
        WHEN 'Pune' THEN 73.8567
        ELSE 72.8777
      END,
      now() - interval '30 minutes'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = 'engineer',
      region = EXCLUDED.region,
      skills = EXCLUDED.skills,
      status = 'active',
      last_location_lat = EXCLUDED.last_location_lat,
      last_location_lng = EXCLUDED.last_location_lng,
      last_location_updated_at = EXCLUDED.last_location_updated_at;
  END LOOP;
END $$;

-- =====================================================
-- PART 5: POS DEVICES (60+ Devices)
-- =====================================================

-- Get engineer IDs for assignment
DO $$
DECLARE
  rajesh_id uuid;
  priya_id uuid;
  amit_id uuid;
  sneha_id uuid;
  vikram_id uuid;
BEGIN
  SELECT id INTO rajesh_id FROM user_profiles WHERE email = 'rajesh@uds.com';
  SELECT id INTO priya_id FROM user_profiles WHERE email = 'priya@uds.com';
  SELECT id INTO amit_id FROM user_profiles WHERE email = 'amit@uds.com';
  SELECT id INTO sneha_id FROM user_profiles WHERE email = 'sneha@uds.com';
  SELECT id INTO vikram_id FROM user_profiles WHERE email = 'vikram@uds.com';

  -- Insert devices with various statuses
  -- Warehouse stock (20 devices) - no current_location column, store location in notes/metadata
  INSERT INTO devices (id, serial_number, model, device_bank, status, warranty_expiry, firmware_version, notes, metadata) VALUES
  (gen_random_uuid(), 'ING-2024-00001', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'warehouse', '2026-12-31', '5.2.1', 'New stock arrival Dec 2024', '{"color": "black", "connectivity": "ethernet", "location": "Mumbai Central Warehouse - Rack A1"}'),
  (gen_random_uuid(), 'ING-2024-00002', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'warehouse', '2026-12-31', '5.2.1', 'New stock arrival Dec 2024', '{"color": "black", "connectivity": "ethernet", "location": "Mumbai Central Warehouse - Rack A1"}'),
  (gen_random_uuid(), 'ING-2024-00003', 'Ingenico iCT250', '22222222-2222-2222-2222-222222222222', 'warehouse', '2026-12-31', '5.2.1', 'HDFC Bank stock', '{"color": "white", "connectivity": "wifi", "location": "Mumbai Central Warehouse - Rack A2"}'),
  (gen_random_uuid(), 'VFN-2024-00001', 'Verifone VX520', '22222222-2222-2222-2222-222222222222', 'warehouse', '2026-06-30', '4.1.3', 'HDFC Bank stock', '{"color": "gray", "connectivity": "gprs", "location": "Delhi NCR Warehouse - Rack B1"}'),
  (gen_random_uuid(), 'VFN-2024-00002', 'Verifone VX520', '33333333-3333-3333-3333-333333333333', 'warehouse', '2026-06-30', '4.1.3', 'ICICI Bank stock', '{"color": "gray", "connectivity": "gprs", "location": "Delhi NCR Warehouse - Rack B1"}'),
  (gen_random_uuid(), 'VFN-2024-00003', 'Verifone VX680', '33333333-3333-3333-3333-333333333333', 'warehouse', '2026-09-30', '4.2.0', 'Portable model with printer', '{"color": "black", "connectivity": "wifi+gprs", "battery": true, "location": "Delhi NCR Warehouse - Rack B2"}'),
  (gen_random_uuid(), 'PAX-2024-00001', 'PAX A920', '44444444-4444-4444-4444-444444444444', 'warehouse', '2027-03-31', '3.5.2', 'Android terminal', '{"os": "android", "touchscreen": true, "location": "Bangalore Tech Hub Warehouse - Rack C1"}'),
  (gen_random_uuid(), 'PAX-2024-00002', 'PAX A920', '44444444-4444-4444-4444-444444444444', 'warehouse', '2027-03-31', '3.5.2', 'Android terminal', '{"os": "android", "touchscreen": true, "location": "Bangalore Tech Hub Warehouse - Rack C1"}'),
  (gen_random_uuid(), 'PAX-2024-00003', 'PAX D210', '55555555-5555-5555-5555-555555555555', 'warehouse', '2027-01-31', '2.8.1', 'Compact model', '{"compact": true, "connectivity": "bluetooth", "location": "Bangalore Tech Hub Warehouse - Rack C2"}'),
  (gen_random_uuid(), 'PAX-2024-00004', 'PAX D210', '55555555-5555-5555-5555-555555555555', 'warehouse', '2027-01-31', '2.8.1', 'Compact model', '{"compact": true, "connectivity": "bluetooth", "location": "Mumbai Central Warehouse - Rack A3"}'),
  (gen_random_uuid(), 'ING-2024-00004', 'Ingenico Move5000', '66666666-6666-6666-6666-666666666666', 'warehouse', '2027-06-30', '6.0.1', 'Latest model with NFC', '{"nfc": true, "contactless": true, "location": "Delhi NCR Warehouse - Rack B3"}'),
  (gen_random_uuid(), 'ING-2024-00005', 'Ingenico Move5000', '66666666-6666-6666-6666-666666666666', 'warehouse', '2027-06-30', '6.0.1', 'Latest model with NFC', '{"nfc": true, "contactless": true, "location": "Delhi NCR Warehouse - Rack B3"}'),
  (gen_random_uuid(), 'VFN-2024-00004', 'Verifone V400m', '77777777-7777-7777-7777-777777777777', 'warehouse', '2027-04-30', '5.0.0', 'Multi-lane terminal', '{"multi_lane": true, "color": "white", "location": "Mumbai Central Warehouse - Rack A4"}'),
  (gen_random_uuid(), 'VFN-2024-00005', 'Verifone V400m', '77777777-7777-7777-7777-777777777777', 'warehouse', '2027-04-30', '5.0.0', 'Multi-lane terminal', '{"multi_lane": true, "color": "white", "location": "Mumbai Central Warehouse - Rack A4"}'),
  (gen_random_uuid(), 'PAX-2024-00005', 'PAX A80', '88888888-8888-8888-8888-888888888888', 'warehouse', '2026-11-30', '3.2.0', 'Desktop model', '{"desktop": true, "printer_type": "thermal", "location": "Bangalore Tech Hub Warehouse - Rack C3"}'),
  (gen_random_uuid(), 'PAX-2024-00006', 'PAX A80', '88888888-8888-8888-8888-888888888888', 'warehouse', '2026-11-30', '3.2.0', 'Desktop model', '{"desktop": true, "printer_type": "thermal", "location": "Bangalore Tech Hub Warehouse - Rack C3"}'),
  (gen_random_uuid(), 'ING-2024-00006', 'Ingenico Desk5000', '11111111-1111-1111-1111-111111111111', 'warehouse', '2027-02-28', '5.5.0', 'Large screen model', '{"screen_size": "5inch", "color": "black", "location": "Mumbai Central Warehouse - Rack A5"}'),
  (gen_random_uuid(), 'ING-2024-00007', 'Ingenico Desk5000', '22222222-2222-2222-2222-222222222222', 'warehouse', '2027-02-28', '5.5.0', 'Large screen model', '{"screen_size": "5inch", "color": "white", "location": "Delhi NCR Warehouse - Rack B4"}'),
  (gen_random_uuid(), 'VFN-2024-00006', 'Verifone VX675', '33333333-3333-3333-3333-333333333333', 'warehouse', '2026-08-31', '4.0.5', 'Wireless model', '{"wireless": true, "battery_hours": 8, "location": "Mumbai Central Warehouse - Rack A6"}'),
  (gen_random_uuid(), 'VFN-2024-00007', 'Verifone VX675', '44444444-4444-4444-4444-444444444444', 'warehouse', '2026-08-31', '4.0.5', 'Wireless model', '{"wireless": true, "battery_hours": 8, "location": "Bangalore Tech Hub Warehouse - Rack C4"}')
  ON CONFLICT (serial_number) DO NOTHING;

  -- Issued to engineers (10 devices)
  INSERT INTO devices (id, serial_number, model, device_bank, status, assigned_to, warranty_expiry, firmware_version, notes, metadata) VALUES
  (gen_random_uuid(), 'ING-2023-10001', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'issued', rajesh_id, '2025-12-31', '5.1.8', 'Ready for installation', '{"color": "black", "tested": true, "location": "With Rajesh Kumar - Mumbai"}'),
  (gen_random_uuid(), 'ING-2023-10002', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'issued', rajesh_id, '2025-12-31', '5.1.8', 'Ready for installation', '{"color": "black", "tested": true, "location": "With Rajesh Kumar - Mumbai"}'),
  (gen_random_uuid(), 'VFN-2023-10001', 'Verifone VX520', '22222222-2222-2222-2222-222222222222', 'issued', priya_id, '2025-06-30', '4.1.0', 'Spare for swap', '{"color": "gray", "tested": true, "location": "With Priya Singh - Delhi"}'),
  (gen_random_uuid(), 'VFN-2023-10002', 'Verifone VX680', '33333333-3333-3333-3333-333333333333', 'issued', priya_id, '2025-09-30', '4.1.5', 'Portable backup', '{"color": "black", "battery": true, "location": "With Priya Singh - Delhi"}'),
  (gen_random_uuid(), 'PAX-2023-10001', 'PAX A920', '44444444-4444-4444-4444-444444444444', 'issued', amit_id, '2026-03-31', '3.4.8', 'For new installation', '{"os": "android", "tested": true, "location": "With Amit Patel - Bangalore"}'),
  (gen_random_uuid(), 'PAX-2023-10002', 'PAX D210', '55555555-5555-5555-5555-555555555555', 'issued', amit_id, '2026-01-31', '2.7.9', 'Compact model', '{"compact": true, "location": "With Amit Patel - Bangalore"}'),
  (gen_random_uuid(), 'ING-2023-10003', 'Ingenico Move5000', '66666666-6666-6666-6666-666666666666', 'issued', sneha_id, '2026-06-30', '5.9.5', 'NFC enabled', '{"nfc": true, "location": "With Sneha Reddy - Hyderabad"}'),
  (gen_random_uuid(), 'VFN-2023-10003', 'Verifone V400m', '77777777-7777-7777-7777-777777777777', 'issued', sneha_id, '2026-04-30', '4.9.0', 'Multi-lane', '{"multi_lane": true, "location": "With Sneha Reddy - Hyderabad"}'),
  (gen_random_uuid(), 'PAX-2023-10003', 'PAX A80', '88888888-8888-8888-8888-888888888888', 'issued', vikram_id, '2025-11-30', '3.1.8', 'Desktop model', '{"desktop": true, "location": "With Vikram Joshi - Pune"}'),
  (gen_random_uuid(), 'ING-2023-10004', 'Ingenico Desk5000', '11111111-1111-1111-1111-111111111111', 'issued', vikram_id, '2026-02-28', '5.4.5', 'Large screen', '{"screen_size": "5inch", "location": "With Vikram Joshi - Pune"}')
  ON CONFLICT (serial_number) DO NOTHING;

  -- Installed at clients (15 devices) - Real Indian businesses with GPS
  INSERT INTO devices (id, serial_number, model, device_bank, status, installed_at_client, installation_date, warranty_expiry, firmware_version, last_maintenance_date, notes, metadata) VALUES
  -- Delhi merchants
  (gen_random_uuid(), 'ING-2022-20001', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'installed', 'Sharma Electronics', '2023-03-15', '2025-03-15', '5.0.5', '2024-09-15', 'Running smoothly', '{"tid": "SBI00001", "mid": "MER00001", "lat": 28.6315, "lng": 77.2167, "address": "Sharma Electronics, Connaught Place, Delhi"}'),
  -- Mumbai merchants
  (gen_random_uuid(), 'ING-2022-20002', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'installed', 'Khan General Store', '2023-04-20', '2025-04-20', '5.0.5', '2024-10-20', 'Regular usage', '{"tid": "SBI00002", "mid": "MER00002", "lat": 19.1197, "lng": 72.8464, "address": "Khan General Store, Andheri West, Mumbai"}'),
  -- Bangalore merchants
  (gen_random_uuid(), 'VFN-2022-20001', 'Verifone VX520', '22222222-2222-2222-2222-222222222222', 'installed', 'Gupta Supermart', '2023-05-10', '2025-05-10', '4.0.2', '2024-11-10', 'High transaction volume', '{"tid": "HDFC00001", "mid": "MER00003", "lat": 12.9352, "lng": 77.6245, "address": "Gupta Supermart, Koramangala, Bangalore"}'),
  -- Delhi - Medical
  (gen_random_uuid(), 'VFN-2022-20002', 'Verifone VX680', '33333333-3333-3333-3333-333333333333', 'installed', 'Singh Medical', '2023-06-05', '2025-06-05', '4.1.0', '2024-12-05', 'Portable for counter', '{"tid": "ICICI00001", "mid": "MER00004", "battery": true, "lat": 28.6519, "lng": 77.1909, "address": "Singh Medical, Karol Bagh, Delhi"}'),
  -- Hyderabad - Restaurant
  (gen_random_uuid(), 'PAX-2022-20001', 'PAX A920', '44444444-4444-4444-4444-444444444444', 'installed', 'Reddy Restaurant', '2023-07-12', '2025-07-12', '3.4.0', '2024-07-12', 'Touch screen preferred', '{"tid": "AXIS00001", "mid": "MER00005", "touchscreen": true, "lat": 17.4156, "lng": 78.4347, "address": "Reddy Restaurant, Banjara Hills, Hyderabad"}'),
  -- Ahmedabad - Hardware
  (gen_random_uuid(), 'PAX-2022-20002', 'PAX D210', '55555555-5555-5555-5555-555555555555', 'installed', 'Patel Hardware', '2023-08-18', '2025-08-18', '2.7.5', '2024-08-18', 'Compact counter model', '{"tid": "KOTAK00001", "mid": "MER00006", "compact": true, "lat": 23.0350, "lng": 72.5612, "address": "Patel Hardware, CG Road, Ahmedabad"}'),
  -- Delhi - Jewellery
  (gen_random_uuid(), 'ING-2022-20003', 'Ingenico Move5000', '66666666-6666-6666-6666-666666666666', 'installed', 'Verma Jewellers', '2023-09-22', '2025-09-22', '5.8.0', '2024-09-22', 'High value transactions', '{"tid": "PNB00001", "mid": "MER00007", "nfc": true, "lat": 28.6562, "lng": 77.2307, "address": "Verma Jewellers, Chandni Chowk, Delhi"}'),
  -- Surat - Textiles
  (gen_random_uuid(), 'VFN-2022-20003', 'Verifone V400m', '77777777-7777-7777-7777-777777777777', 'installed', 'Desai Textiles', '2023-10-08', '2025-10-08', '4.8.5', '2024-10-08', 'Multi-counter setup', '{"tid": "BOB00001", "mid": "MER00008", "multi_lane": true, "lat": 21.1702, "lng": 72.8311, "address": "Desai Textiles, Ring Road, Surat"}'),
  -- Kochi - Bakery
  (gen_random_uuid(), 'PAX-2022-20003', 'PAX A80', '88888888-8888-8888-8888-888888888888', 'installed', 'Nair Bakery', '2023-11-14', '2025-11-14', '3.1.2', '2024-11-14', 'Daily high usage', '{"tid": "INDUS00001", "mid": "MER00009", "desktop": true, "lat": 9.9816, "lng": 76.2999, "address": "Nair Bakery, MG Road, Kochi"}'),
  -- Pune - Pharmacy
  (gen_random_uuid(), 'ING-2022-20004', 'Ingenico Desk5000', '11111111-1111-1111-1111-111111111111', 'installed', 'Mehta Pharmacy', '2023-12-01', '2025-12-01', '5.4.0', '2024-12-01', 'Large display preferred', '{"tid": "SBI00003", "mid": "MER00010", "screen_size": "5inch", "lat": 18.5308, "lng": 73.8475, "address": "Mehta Pharmacy, FC Road, Pune"}'),
  -- Chennai - Provisions
  (gen_random_uuid(), 'VFN-2022-20004', 'Verifone VX675', '22222222-2222-2222-2222-222222222222', 'installed', 'Iyer Provisions', '2024-01-15', '2026-01-15', '4.0.0', NULL, 'Wireless preferred', '{"tid": "HDFC00002", "mid": "MER00011", "wireless": true, "lat": 13.0418, "lng": 80.2341, "address": "Iyer Provisions, T Nagar, Chennai"}'),
  -- Noida - Mobiles
  (gen_random_uuid(), 'PAX-2022-20004', 'PAX A920', '33333333-3333-3333-3333-333333333333', 'installed', 'Kapoor Mobiles', '2024-02-20', '2026-02-20', '3.4.5', NULL, 'Android for EMI apps', '{"tid": "ICICI00002", "mid": "MER00012", "os": "android", "lat": 28.5700, "lng": 77.3219, "address": "Kapoor Mobiles, Sector 18, Noida"}'),
  -- Bangalore - Garments
  (gen_random_uuid(), 'ING-2022-20005', 'Ingenico iCT250', '44444444-4444-4444-4444-444444444444', 'installed', 'Saxena Garments', '2024-03-10', '2026-03-10', '5.1.5', NULL, 'Regular retail', '{"tid": "AXIS00002", "mid": "MER00013", "lat": 12.9830, "lng": 77.6093, "address": "Saxena Garments, Commercial Street, Bangalore"}'),
  -- Kolkata - Sweets
  (gen_random_uuid(), 'VFN-2022-20005', 'Verifone VX520', '55555555-5555-5555-5555-555555555555', 'installed', 'Agarwal Sweets', '2024-04-05', '2026-04-05', '4.1.2', NULL, 'Festival season heavy usage', '{"tid": "KOTAK00002", "mid": "MER00014", "lat": 22.5726, "lng": 88.3639, "address": "Agarwal Sweets, Salt Lake, Kolkata"}'),
  -- Delhi - Opticals
  (gen_random_uuid(), 'PAX-2022-20005', 'PAX D210', '66666666-6666-6666-6666-666666666666', 'installed', 'Bhatia Opticals', '2024-05-12', '2026-05-12', '2.8.0', NULL, 'Compact for small counter', '{"tid": "PNB00002", "mid": "MER00015", "compact": true, "lat": 28.5672, "lng": 77.2399, "address": "Bhatia Opticals, Lajpat Nagar, Delhi"}')
  ON CONFLICT (serial_number) DO NOTHING;

  -- Faulty devices (5 devices)
  INSERT INTO devices (id, serial_number, model, device_bank, status, last_maintenance_date, warranty_expiry, firmware_version, notes, metadata) VALUES
  (gen_random_uuid(), 'ING-2021-30001', 'Ingenico iCT250', '11111111-1111-1111-1111-111111111111', 'faulty', '2024-11-01', '2024-06-30', '4.9.0', 'Printer head damaged - needs replacement', '{"fault_type": "printer", "repair_priority": "medium", "location": "Mumbai Central Warehouse - Repair Section"}'),
  (gen_random_uuid(), 'VFN-2021-30001', 'Verifone VX520', '22222222-2222-2222-2222-222222222222', 'faulty', '2024-10-15', '2024-03-31', '3.9.5', 'Keypad not responding - PCB issue', '{"fault_type": "keypad", "repair_priority": "low", "location": "Delhi NCR Warehouse - Repair Section"}'),
  (gen_random_uuid(), 'PAX-2021-30001', 'PAX A920', '33333333-3333-3333-3333-333333333333', 'faulty', '2024-09-20', '2024-09-30', '3.2.0', 'Screen cracked - physical damage', '{"fault_type": "screen", "repair_priority": "high", "warranty_void": true, "location": "Bangalore Tech Hub Warehouse - Repair Section"}'),
  (gen_random_uuid(), 'ING-2021-30002', 'Ingenico Move5000', '44444444-4444-4444-4444-444444444444', 'faulty', '2024-08-25', '2025-02-28', '5.7.0', 'NFC reader malfunction', '{"fault_type": "nfc", "repair_priority": "high", "location": "Mumbai Central Warehouse - Repair Section"}'),
  (gen_random_uuid(), 'VFN-2021-30002', 'Verifone V400m', '55555555-5555-5555-5555-555555555555', 'faulty', '2024-07-30', '2025-01-31', '4.7.0', 'Network connectivity intermittent', '{"fault_type": "network", "repair_priority": "medium", "location": "Delhi NCR Warehouse - Repair Section"}')
  ON CONFLICT (serial_number) DO NOTHING;

END $$;

-- =====================================================
-- PART 6: SERVICE CALLS/TICKETS (30+ Tickets)
-- =====================================================

DO $$
DECLARE
  rajesh_id uuid;
  priya_id uuid;
  amit_id uuid;
  sneha_id uuid;
  vikram_id uuid;
BEGIN
  SELECT id INTO rajesh_id FROM user_profiles WHERE email = 'rajesh@uds.com';
  SELECT id INTO priya_id FROM user_profiles WHERE email = 'priya@uds.com';
  SELECT id INTO amit_id FROM user_profiles WHERE email = 'amit@uds.com';
  SELECT id INTO sneha_id FROM user_profiles WHERE email = 'sneha@uds.com';
  SELECT id INTO vikram_id FROM user_profiles WHERE email = 'vikram@uds.com';

  -- OPEN TICKETS (10 tickets) - Pending assignment
  INSERT INTO calls (id, call_number, type, status, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, scheduled_time_window, priority, description, requires_photo, metadata) VALUES
  -- Sharma Electronics - Delhi
  (gen_random_uuid(), 'TKT2024001', 'breakdown', 'pending', '11111111-1111-1111-1111-111111111111', 'Sharma Electronics', 'Rajiv Sharma', '+919811234567', '15, Connaught Place, Block A, New Delhi 110001', 28.6315, 77.2167, CURRENT_DATE, '10:00-13:00', 'high', 'POS not printing receipts. Customer complaints increasing. Printer making grinding noise.', true, '{"reported_via": "phone", "issue_category": "hardware"}'),
  -- Khan General Store - Mumbai
  (gen_random_uuid(), 'TKT2024002', 'breakdown', 'pending', '22222222-2222-2222-2222-222222222222', 'Khan General Store', 'Imran Khan', '+919820123456', 'Shop 12, Andheri West Market, Mumbai 400058', 19.1197, 72.8464, CURRENT_DATE, '14:00-17:00', 'urgent', 'Network connectivity issue. Unable to process any transactions since morning.', true, '{"reported_via": "email", "issue_category": "network"}'),
  -- Gupta Supermart - Bangalore
  (gen_random_uuid(), 'TKT2024003', 'breakdown', 'pending', '33333333-3333-3333-3333-333333333333', 'Gupta Supermart', 'Anil Gupta', '+919886123456', '45, 100 Feet Road, Koramangala 4th Block, Bangalore 560034', 12.9352, 77.6245, CURRENT_DATE + 1, '09:00-12:00', 'medium', 'Screen display is flickering intermittently. Sometimes goes blank.', false, '{"reported_via": "portal", "issue_category": "display"}'),
  -- Singh Medical - Delhi
  (gen_random_uuid(), 'TKT2024004', 'breakdown', 'pending', '44444444-4444-4444-4444-444444444444', 'Singh Medical', 'Dr. Harpreet Singh', '+919999876543', '28, Karol Bagh Main Market, New Delhi 110005', 28.6519, 77.1909, CURRENT_DATE + 1, '11:00-14:00', 'high', 'Card reader showing error E05. Cannot read chip cards.', true, '{"reported_via": "phone", "issue_category": "card_reader"}'),
  -- Reddy Restaurant - Hyderabad
  (gen_random_uuid(), 'TKT2024005', 'breakdown', 'pending', '55555555-5555-5555-5555-555555555555', 'Reddy Restaurant', 'Krishna Reddy', '+919848012345', 'Road No. 12, Banjara Hills, Hyderabad 500034', 17.4156, 78.4347, CURRENT_DATE + 1, '16:00-19:00', 'urgent', 'POS machine completely dead. Won''t turn on at all.', true, '{"reported_via": "phone", "issue_category": "power"}'),
  -- New Age Boutique - Mumbai
  (gen_random_uuid(), 'TKT2024006', 'install', 'pending', '66666666-6666-6666-6666-666666666666', 'New Age Boutique', 'Priyanka Malhotra', '+919876012345', '23, Linking Road, Bandra West, Mumbai 400050', 19.0596, 72.8295, CURRENT_DATE + 2, '10:00-13:00', 'medium', 'New merchant onboarding. Requires fresh POS installation with training.', true, '{"reported_via": "sales_team", "issue_category": "new_installation"}'),
  -- Desai Textiles - Surat
  (gen_random_uuid(), 'TKT2024007', 'maintenance', 'pending', '77777777-7777-7777-7777-777777777777', 'Desai Textiles', 'Mukesh Desai', '+919825012345', '234, Ring Road, Surat 395002', 21.1702, 72.8311, CURRENT_DATE + 2, '14:00-17:00', 'low', 'Scheduled quarterly maintenance. Check firmware and clean hardware.', false, '{"reported_via": "scheduled", "issue_category": "preventive_maintenance"}'),
  -- Nair Bakery - Kochi
  (gen_random_uuid(), 'TKT2024008', 'swap', 'pending', '88888888-8888-8888-8888-888888888888', 'Nair Bakery', 'Suresh Nair', '+919846012345', '78, MG Road, Ernakulam, Kochi 682011', 9.9816, 76.2999, CURRENT_DATE + 3, '09:00-12:00', 'medium', 'Merchant requested upgrade to newer model with NFC capability.', true, '{"reported_via": "email", "issue_category": "upgrade"}'),
  -- Mehta Pharmacy - Pune
  (gen_random_uuid(), 'TKT2024009', 'breakdown', 'pending', '11111111-1111-1111-1111-111111111111', 'Mehta Pharmacy', 'Dinesh Mehta', '+919822012345', '56, FC Road, Shivajinagar, Pune 411005', 18.5308, 73.8475, CURRENT_DATE + 3, '11:00-14:00', 'high', 'Paper jam error. Already tried clearing but error persists.', false, '{"reported_via": "phone", "issue_category": "paper_jam"}'),
  -- Closing Store XYZ - Thane
  (gen_random_uuid(), 'TKT2024010', 'deinstall', 'pending', '22222222-2222-2222-2222-222222222222', 'Closing Store XYZ', 'Former Owner', '+919833012345', '99, Old Market Road, Thane 400601', 19.2183, 72.9781, CURRENT_DATE + 4, '14:00-17:00', 'low', 'Business closing. Need to deinstall and return POS terminal.', true, '{"reported_via": "bank_request", "issue_category": "closure"}')
  ON CONFLICT (call_number) DO NOTHING;

  -- ASSIGNED TICKETS (8 tickets) - Assigned to engineers, not started
  INSERT INTO calls (id, call_number, type, status, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, scheduled_time_window, assigned_engineer, priority, description, requires_photo, metadata) VALUES
  (gen_random_uuid(), 'TKT2024011', 'breakdown', 'assigned', '33333333-3333-3333-3333-333333333333', 'Kapoor Mobiles', 'Ravi Kapoor', '+919810123456', 'Shop 45, Sector 18 Market, Noida 201301', 28.5700, 77.3219, CURRENT_DATE, '10:00-13:00', priya_id, 'high', 'Touchscreen not responding to inputs. Android terminal.', true, '{"reported_via": "phone", "issue_category": "touchscreen"}'),
  (gen_random_uuid(), 'TKT2024012', 'breakdown', 'assigned', '44444444-4444-4444-4444-444444444444', 'Saxena Garments', 'Vikram Saxena', '+919845123456', '89, Commercial Street, Bangalore 560001', 12.9830, 77.6093, CURRENT_DATE, '14:00-17:00', amit_id, 'medium', 'Slow transaction processing. Takes 30+ seconds per transaction.', false, '{"reported_via": "email", "issue_category": "performance"}'),
  (gen_random_uuid(), 'TKT2024013', 'install', 'assigned', '55555555-5555-5555-5555-555555555555', 'Fresh Mart', 'Ajay Patel', '+919879123456', '12, CG Road, Navrangpura, Ahmedabad 380009', 23.0350, 72.5612, CURRENT_DATE + 1, '09:00-12:00', vikram_id, 'medium', 'New supermarket branch. Install 2 POS terminals at billing counters.', true, '{"reported_via": "sales_team", "issue_category": "new_installation", "terminal_count": 2}'),
  (gen_random_uuid(), 'TKT2024014', 'swap', 'assigned', '66666666-6666-6666-6666-666666666666', 'Verma Jewellers', 'Sanjay Verma', '+919871123456', '1567, Chandni Chowk, Old Delhi 110006', 28.6562, 77.2307, CURRENT_DATE + 1, '11:00-14:00', priya_id, 'high', 'Replace faulty unit with working spare. High value jewellery transactions affected.', true, '{"reported_via": "phone", "issue_category": "emergency_swap"}'),
  (gen_random_uuid(), 'TKT2024015', 'breakdown', 'assigned', '77777777-7777-7777-7777-777777777777', 'Kumar Electronics', 'Sunil Kumar', '+919823123456', '45, MG Road, Camp, Pune 411001', 18.5196, 73.8553, CURRENT_DATE + 1, '15:00-18:00', vikram_id, 'urgent', 'Complete system freeze. Need urgent attention - major electronics sale ongoing.', true, '{"reported_via": "phone", "issue_category": "system_freeze"}'),
  (gen_random_uuid(), 'TKT2024016', 'maintenance', 'assigned', '88888888-8888-8888-8888-888888888888', 'Hotel Grand', 'Manager Reception', '+919850123456', '123, MG Road, Secunderabad 500003', 17.4399, 78.4983, CURRENT_DATE + 2, '10:00-12:00', sneha_id, 'low', 'Quarterly maintenance for 3 POS terminals at restaurant, reception, spa.', false, '{"reported_via": "scheduled", "issue_category": "preventive_maintenance", "terminal_count": 3}'),
  (gen_random_uuid(), 'TKT2024017', 'breakdown', 'assigned', '11111111-1111-1111-1111-111111111111', 'City Pharmacy', 'Dr. Ramesh', '+919881123456', '78, Residency Road, Bangalore 560025', 12.9719, 77.5937, CURRENT_DATE + 2, '14:00-17:00', amit_id, 'high', 'Card swipe not working. Chip reader ok but magnetic stripe fails.', true, '{"reported_via": "phone", "issue_category": "card_reader"}'),
  (gen_random_uuid(), 'TKT2024018', 'install', 'assigned', '22222222-2222-2222-2222-222222222222', 'Artisan Cafe', 'Owner', '+919769123456', '56, Linking Road, Santacruz, Mumbai 400054', 19.0821, 72.8380, CURRENT_DATE + 2, '16:00-19:00', rajesh_id, 'medium', 'New cafe opening. Need POS with contactless payment support.', true, '{"reported_via": "sales_team", "issue_category": "new_installation", "features": ["contactless", "nfc"]}')
  ON CONFLICT (call_number) DO NOTHING;

  -- IN-PROGRESS TICKETS (5 tickets) - Engineers actively working
  INSERT INTO calls (id, call_number, type, status, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, scheduled_time_window, assigned_engineer, started_at, priority, description, requires_photo, metadata) VALUES
  (gen_random_uuid(), 'TKT2024019', 'breakdown', 'in_progress', '33333333-3333-3333-3333-333333333333', 'Fashion Hub', 'Rita Malhotra', '+919811987654', '34, South Extension Part 2, New Delhi 110049', 28.5672, 77.2222, CURRENT_DATE, '09:00-12:00', priya_id, now() - interval '45 minutes', 'high', 'Engineer en-route. POS showing communication error with bank server.', true, '{"reported_via": "phone", "issue_category": "connectivity", "engineer_status": "en_route"}'),
  (gen_random_uuid(), 'TKT2024020', 'breakdown', 'in_progress', '44444444-4444-4444-4444-444444444444', 'Quick Bites', 'Rahul Sharma', '+919845987654', '23, Indiranagar 100ft Road, Bangalore 560038', 12.9784, 77.6408, CURRENT_DATE, '10:00-13:00', amit_id, now() - interval '30 minutes', 'urgent', 'Diagnosis in progress. Suspected power supply unit failure.', true, '{"reported_via": "phone", "issue_category": "hardware", "engineer_status": "diagnosing"}'),
  (gen_random_uuid(), 'TKT2024021', 'swap', 'in_progress', '55555555-5555-5555-5555-555555555555', 'Gourmet Kitchen', 'Chef Sanjeev', '+919823987654', '67, FC Road, Deccan, Pune 411004', 18.5167, 73.8411, CURRENT_DATE, '11:00-14:00', vikram_id, now() - interval '1 hour', 'medium', 'Waiting for parts. Old terminal removed, new one being configured.', true, '{"reported_via": "email", "issue_category": "upgrade", "engineer_status": "waiting_parts"}'),
  (gen_random_uuid(), 'TKT2024022', 'breakdown', 'in_progress', '66666666-6666-6666-6666-666666666666', 'Electronics World', 'Amit Jain', '+919876987654', 'Plot 12, Nehru Place, New Delhi 110019', 28.5494, 77.2517, CURRENT_DATE, '12:00-15:00', priya_id, now() - interval '2 hours', 'high', 'Parts ordered. Waiting for printer head delivery from warehouse.', true, '{"reported_via": "phone", "issue_category": "printer", "engineer_status": "parts_ordered", "expected_delivery": "today"}'),
  (gen_random_uuid(), 'TKT2024023', 'maintenance', 'in_progress', '77777777-7777-7777-7777-777777777777', 'Super Bazaar', 'Store Manager', '+919869987654', '890, LBS Marg, Mulund West, Mumbai 400080', 19.1724, 72.9571, CURRENT_DATE, '13:00-16:00', rajesh_id, now() - interval '90 minutes', 'medium', 'Testing solution. Firmware update completed, running transaction tests.', false, '{"reported_via": "scheduled", "issue_category": "firmware_update", "engineer_status": "testing"}')
  ON CONFLICT (call_number) DO NOTHING;

  -- RESOLVED/COMPLETED TICKETS (5 tickets) - Recently closed
  INSERT INTO calls (id, call_number, type, status, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, scheduled_time_window, assigned_engineer, started_at, completed_at, actual_duration_minutes, priority, description, resolution_notes, requires_photo, metadata) VALUES
  (gen_random_uuid(), 'TKT2024024', 'breakdown', 'completed', '88888888-8888-8888-8888-888888888888', 'Royal Sweets', 'Mohan Das', '+919848987654', '45, Abids, Hyderabad 500001', 17.3927, 78.4743, CURRENT_DATE - 1, '09:00-12:00', sneha_id, CURRENT_DATE - 1 + interval '9 hours 15 minutes', CURRENT_DATE - 1 + interval '11 hours 30 minutes', 135, 'high', 'Keypad buttons 2 and 5 not working', 'Replaced keypad membrane. Tested all buttons, working perfectly. Customer signature obtained.', true, '{"reported_via": "phone", "issue_category": "keypad", "parts_used": ["keypad_membrane"], "customer_rating": 5}'),
  (gen_random_uuid(), 'TKT2024025', 'install', 'completed', '11111111-1111-1111-1111-111111111111', 'New Delhi Books', 'Anand Verma', '+919811987655', '23, Khan Market, New Delhi 110003', 28.6003, 77.2274, CURRENT_DATE - 1, '14:00-17:00', priya_id, CURRENT_DATE - 1 + interval '14 hours 30 minutes', CURRENT_DATE - 1 + interval '16 hours 45 minutes', 135, 'medium', 'New bookstore installation with demo and training', 'Installed Ingenico iCT250. Provided 30 min training to staff. Test transactions successful.', true, '{"reported_via": "sales_team", "issue_category": "new_installation", "training_provided": true, "customer_rating": 5}'),
  (gen_random_uuid(), 'TKT2024026', 'swap', 'completed', '22222222-2222-2222-2222-222222222222', 'Metro Grocery', 'Vijay Singh', '+919820987654', '78, Lokhandwala Complex, Andheri West, Mumbai 400053', 19.1396, 72.8278, CURRENT_DATE - 2, '10:00-13:00', rajesh_id, CURRENT_DATE - 2 + interval '10 hours 20 minutes', CURRENT_DATE - 2 + interval '12 hours 10 minutes', 110, 'urgent', 'Emergency swap - old terminal completely dead', 'Swapped with new PAX A920. Old terminal ING-2021-30001 collected for repair. Data migrated successfully.', true, '{"reported_via": "phone", "issue_category": "emergency_swap", "old_device": "ING-2021-30001", "new_device": "PAX-2023-10001", "customer_rating": 4}'),
  (gen_random_uuid(), 'TKT2024027', 'maintenance', 'completed', '33333333-3333-3333-3333-333333333333', 'City Center Mall', 'Mall Admin', '+919845987655', 'City Center Mall, Sector 25, Gurugram 122001', 28.4595, 77.0266, CURRENT_DATE - 2, '08:00-11:00', priya_id, CURRENT_DATE - 2 + interval '8 hours 15 minutes', CURRENT_DATE - 2 + interval '10 hours 45 minutes', 150, 'low', 'Quarterly maintenance for 5 food court terminals', 'Cleaned all terminals. Updated firmware to v5.2.1. Replaced paper rolls. All terminals tested OK.', false, '{"reported_via": "scheduled", "issue_category": "preventive_maintenance", "terminal_count": 5, "parts_used": ["paper_rolls_5"], "customer_rating": 5}'),
  (gen_random_uuid(), 'TKT2024028', 'breakdown', 'completed', '44444444-4444-4444-4444-444444444444', 'Green Pharmacy', 'Dr. Shalini', '+919812987654', '34, HSR Layout, Bangalore 560102', 12.9121, 77.6446, CURRENT_DATE - 3, '15:00-18:00', amit_id, CURRENT_DATE - 3 + interval '15 hours 10 minutes', CURRENT_DATE - 3 + interval '16 hours 40 minutes', 90, 'high', 'Network connectivity drops every few transactions', 'Found loose ethernet connector. Replaced cable and crimped new RJ45. Network stable now.', true, '{"reported_via": "phone", "issue_category": "network", "parts_used": ["ethernet_cable", "rj45_connector"], "customer_rating": 5}')
  ON CONFLICT (call_number) DO NOTHING;

  -- ESCALATED TICKETS (2 tickets) - Require admin attention
  INSERT INTO calls (id, call_number, type, status, client_bank, client_name, client_contact, client_phone, client_address, latitude, longitude, scheduled_date, scheduled_time_window, assigned_engineer, started_at, priority, description, requires_photo, metadata) VALUES
  (gen_random_uuid(), 'TKT2024029', 'breakdown', 'in_progress', '55555555-5555-5555-5555-555555555555', 'Luxury Watches', 'Store Manager', '+919823987655', 'UB City Mall, Vittal Mallya Road, Bangalore 560001', 12.9716, 77.5946, CURRENT_DATE - 1, '10:00-13:00', amit_id, CURRENT_DATE - 1 + interval '10 hours', 'urgent', 'ESCALATED: Terminal shows tamper alert. High-value store - security concern. Needs immediate senior tech visit.', true, '{"reported_via": "phone", "issue_category": "security", "escalated": true, "escalation_reason": "security_alert"}'::jsonb),
  (gen_random_uuid(), 'TKT2024030', 'breakdown', 'in_progress', '66666666-6666-6666-6666-666666666666', 'Airport Retail', 'Duty Manager', '+919876987655', 'Terminal 2, IGI Airport, New Delhi 110037', 28.5562, 77.1000, CURRENT_DATE - 1, '06:00-09:00', priya_id, CURRENT_DATE - 1 + interval '6 hours 30 minutes', 'urgent', 'ESCALATED: Multiple terminals failing. Possible firmware corruption. Airport operations affected.', true, '{"reported_via": "phone", "issue_category": "firmware", "escalated": true, "escalation_reason": "multiple_failures", "terminal_count": 3}'::jsonb)
  ON CONFLICT (call_number) DO NOTHING;

END $$;

-- =====================================================
-- PART 7: CALL HISTORY (Audit Trail)
-- =====================================================

-- Add history entries for completed and in-progress tickets
DO $$
DECLARE
  admin_id uuid;
  call_rec RECORD;
BEGIN
  SELECT id INTO admin_id FROM user_profiles WHERE email = 'admin@uds.com';

  -- If no admin found, try to get any admin
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
  END IF;

  -- Skip if still no admin
  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found, skipping call history';
    RETURN;
  END IF;

  -- Add status change history for existing calls
  FOR call_rec IN
    SELECT c.id, c.call_number, c.status, c.assigned_engineer, c.started_at, c.completed_at, c.created_at
    FROM calls c
    WHERE c.status != 'pending'
  LOOP
    -- Initial creation
    INSERT INTO call_history (call_id, from_status, to_status, actor_id, notes, created_at)
    VALUES (call_rec.id, 'new', 'pending', admin_id, 'Ticket created', call_rec.created_at)
    ON CONFLICT DO NOTHING;

    -- Assignment (if assigned)
    IF call_rec.assigned_engineer IS NOT NULL THEN
      INSERT INTO call_history (call_id, from_status, to_status, actor_id, notes, created_at)
      VALUES (call_rec.id, 'pending', 'assigned', admin_id, 'Assigned to engineer', call_rec.created_at + interval '30 minutes')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Started (if in_progress or completed)
    IF call_rec.status IN ('in_progress', 'completed') AND call_rec.started_at IS NOT NULL THEN
      INSERT INTO call_history (call_id, from_status, to_status, actor_id, notes, created_at)
      VALUES (call_rec.id, 'assigned', 'in_progress', call_rec.assigned_engineer, 'Work started', call_rec.started_at)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Completed
    IF call_rec.status = 'completed' AND call_rec.completed_at IS NOT NULL THEN
      INSERT INTO call_history (call_id, from_status, to_status, actor_id, notes, created_at)
      VALUES (call_rec.id, 'in_progress', 'completed', call_rec.assigned_engineer, 'Work completed', call_rec.completed_at)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- PART 8: STOCK MOVEMENTS (Inventory Transactions)
-- =====================================================

-- Create sample inventory movements
DO $$
DECLARE
  admin_id uuid;
  rajesh_id uuid;
  priya_id uuid;
  amit_id uuid;
  device_rec RECORD;
BEGIN
  SELECT id INTO admin_id FROM user_profiles WHERE email = 'admin@uds.com';
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
  END IF;

  SELECT id INTO rajesh_id FROM user_profiles WHERE email = 'rajesh@uds.com';
  SELECT id INTO priya_id FROM user_profiles WHERE email = 'priya@uds.com';
  SELECT id INTO amit_id FROM user_profiles WHERE email = 'amit@uds.com';

  -- Skip if no admin found
  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found, skipping stock movements';
    RETURN;
  END IF;

  -- Stock received movements (devices arriving at warehouse)
  FOR device_rec IN
    SELECT id, serial_number FROM devices WHERE status = 'warehouse' LIMIT 10
  LOOP
    INSERT INTO stock_movements (device_id, movement_type, from_status, to_status, from_location, to_location, actor_id, reason, notes, created_at)
    VALUES (device_rec.id, 'status_change', 'incoming', 'warehouse', 'Supplier', 'Mumbai Central Warehouse', admin_id, 'New stock arrival', 'Received from manufacturer shipment', now() - interval '30 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Issuance to engineers
  FOR device_rec IN
    SELECT id, serial_number, assigned_to FROM devices WHERE status = 'issued' AND assigned_to IS NOT NULL LIMIT 5
  LOOP
    INSERT INTO stock_movements (device_id, movement_type, from_status, to_status, to_engineer, actor_id, reason, notes, created_at)
    VALUES (device_rec.id, 'issuance', 'warehouse', 'issued', device_rec.assigned_to, admin_id, 'Issued for field work', 'Engineer collected from warehouse', now() - interval '15 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Installation movements
  FOR device_rec IN
    SELECT id, serial_number FROM devices WHERE status = 'installed' LIMIT 5
  LOOP
    INSERT INTO stock_movements (device_id, movement_type, from_status, to_status, actor_id, reason, notes, created_at)
    VALUES (device_rec.id, 'status_change', 'issued', 'installed', COALESCE(rajesh_id, admin_id), 'Installation completed', 'Installed at client location', now() - interval '10 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Faulty returns
  FOR device_rec IN
    SELECT id, serial_number FROM devices WHERE status = 'faulty' LIMIT 3
  LOOP
    INSERT INTO stock_movements (device_id, movement_type, from_status, to_status, actor_id, reason, notes, created_at)
    VALUES (device_rec.id, 'return', 'installed', 'faulty', COALESCE(amit_id, admin_id), 'Hardware failure', 'Returned for repair', now() - interval '5 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

END $$;

-- =====================================================
-- PART 9: SAMPLE PHOTOS (Skipped - schema mismatch)
-- =====================================================
-- NOTE: Photos table schema varies between migrations.
-- Photos should be added manually after verifying your deployed schema.
-- Run this query in Supabase to check your photos table columns:
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'photos';
--
-- Then manually insert test photos using the correct columns.

-- =====================================================
-- PART 10: STOCK ALERTS (Skipped - schema mismatch)
-- =====================================================
-- NOTE: Stock alerts table schema varies between migrations.
-- Run this query in Supabase to check your stock_alerts table columns:
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stock_alerts';
--
-- Then manually insert test alerts using the correct columns.

-- =====================================================
-- PART 11: ENGINEER AGGREGATES (Skipped - schema mismatch)
-- =====================================================
-- NOTE: engineer_aggregates table has multiple schema versions in migrations.
-- Run this query in Supabase to check your engineer_aggregates table columns:
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'engineer_aggregates';
--
-- Then manually insert test aggregates using the correct columns.

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $$
DECLARE
  bank_count int;
  user_count int;
  device_count int;
  call_count int;
  warehouse_count int;
  courier_count int;
  movement_count int;
BEGIN
  SELECT COUNT(*) INTO bank_count FROM banks;
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  SELECT COUNT(*) INTO device_count FROM devices;
  SELECT COUNT(*) INTO call_count FROM calls;
  SELECT COUNT(*) INTO warehouse_count FROM warehouses;
  SELECT COUNT(*) INTO courier_count FROM couriers;
  SELECT COUNT(*) INTO movement_count FROM stock_movements;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST DATA SEEDING COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Banks: %', bank_count;
  RAISE NOTICE 'Users: %', user_count;
  RAISE NOTICE 'Devices: %', device_count;
  RAISE NOTICE 'Service Calls: %', call_count;
  RAISE NOTICE 'Warehouses: %', warehouse_count;
  RAISE NOTICE 'Couriers: %', courier_count;
  RAISE NOTICE 'Stock Movements: %', movement_count;
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Photos, stock_alerts, and engineer_aggregates skipped due to schema variations.';
  RAISE NOTICE 'Check ACTUAL_DATABASE_SCHEMA.md for instructions to add these manually.';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Credentials:';
  RAISE NOTICE '  Admin: admin@uds.com / Admin@123';
  RAISE NOTICE '  Engineers: rajesh@uds.com, priya@uds.com, etc. / Engineer@123';
  RAISE NOTICE '============================================';
END $$;
