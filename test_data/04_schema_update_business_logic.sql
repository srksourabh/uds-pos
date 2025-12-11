-- ========================================
-- UDS-POS SCHEMA UPDATE - BUSINESS LOGIC
-- ========================================
-- This script updates the database schema to match
-- actual business requirements for POS field service
-- ========================================

-- ========================================
-- PART 1: UPDATE USER_PROFILES (ENGINEERS)
-- ========================================

-- Add employee-specific fields
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emp_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS home_pincode TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS date_of_joining DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS designation TEXT;

-- Create unique index on emp_id (allows NULL but unique when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_emp_id ON user_profiles(emp_id) WHERE emp_id IS NOT NULL;

-- ========================================
-- PART 2: CREATE MERCHANTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mid TEXT UNIQUE NOT NULL,  -- Merchant ID (CRITICAL - like MID12345)
  merchant_name TEXT NOT NULL,
  business_name TEXT,
  business_type TEXT,  -- retail, restaurant, hospital, etc.
  contact_person TEXT,
  contact_phone TEXT NOT NULL,
  alternate_phone TEXT,
  contact_email TEXT,
  merchant_address TEXT NOT NULL,
  landmark TEXT,
  pincode TEXT,
  city TEXT,
  state TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  bank_id UUID REFERENCES banks(id),
  status TEXT NOT NULL DEFAULT 'active',
  onboarded_date DATE DEFAULT CURRENT_DATE,
  last_service_date DATE,
  total_devices_installed INTEGER DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_merchant_status CHECK (status IN ('active', 'inactive', 'suspended', 'churned'))
);

-- Indexes for merchants
CREATE INDEX IF NOT EXISTS idx_merchants_mid ON merchants(mid);
CREATE INDEX IF NOT EXISTS idx_merchants_bank ON merchants(bank_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_city ON merchants(city);
CREATE INDEX IF NOT EXISTS idx_merchants_pincode ON merchants(pincode);

-- ========================================
-- PART 3: UPDATE DEVICES TABLE (CRITICAL)
-- ========================================

-- Add Terminal ID (TID) - THE MOST CRITICAL FIELD
ALTER TABLE devices ADD COLUMN IF NOT EXISTS tid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_tid ON devices(tid) WHERE tid IS NOT NULL;

-- Add identification and tracking fields
ALTER TABLE devices ADD COLUMN IF NOT EXISTS identification_number TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS make TEXT;  -- manufacturer
ALTER TABLE devices ADD COLUMN IF NOT EXISTS receiving_date DATE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_condition TEXT DEFAULT 'new';

-- Location tracking fields
ALTER TABLE devices ADD COLUMN IF NOT EXISTS current_location_type TEXT DEFAULT 'warehouse';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS current_location_id UUID;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS current_location_name TEXT;

-- Merchant/Installation fields
ALTER TABLE devices ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS installed_at_mid TEXT;  -- MID where installed
ALTER TABLE devices ADD COLUMN IF NOT EXISTS installation_tid TEXT;  -- TID assigned at installation
ALTER TABLE devices ADD COLUMN IF NOT EXISTS used_date DATE;

-- Receipt/Return tracking
ALTER TABLE devices ADD COLUMN IF NOT EXISTS received_from_type TEXT;  -- 'warehouse', 'courier', 'engineer', 'merchant'
ALTER TABLE devices ADD COLUMN IF NOT EXISTS received_from_id UUID;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS received_from_name TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS returned_to_type TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS returned_to_id UUID;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS returned_to_name TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS return_date DATE;

-- Consignment/Shipping details
ALTER TABLE devices ADD COLUMN IF NOT EXISTS consignment_name TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS consignment_number TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS consignment_date DATE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES couriers(id);

-- Fault/Error tracking
ALTER TABLE devices ADD COLUMN IF NOT EXISTS error_type TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS fault_description TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS incident_report TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS fault_reported_date DATE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS fault_reported_by UUID REFERENCES user_profiles(id);

-- Approval workflow
ALTER TABLE devices ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Add constraints
ALTER TABLE devices DROP CONSTRAINT IF EXISTS check_device_condition;
ALTER TABLE devices ADD CONSTRAINT check_device_condition
  CHECK (device_condition IS NULL OR device_condition IN ('new', 'good', 'fair', 'faulty', 'damaged', 'under_repair', 'scrapped'));

ALTER TABLE devices DROP CONSTRAINT IF EXISTS check_location_type;
ALTER TABLE devices ADD CONSTRAINT check_location_type
  CHECK (current_location_type IS NULL OR current_location_type IN ('warehouse', 'engineer', 'merchant', 'courier', 'in_transit', 'service_center'));

-- More indexes
CREATE INDEX IF NOT EXISTS idx_devices_merchant ON devices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_devices_condition ON devices(device_condition);
CREATE INDEX IF NOT EXISTS idx_devices_location_type ON devices(current_location_type);

-- ========================================
-- PART 4: UPDATE WAREHOUSES/OFFICES
-- ========================================

ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS office_type TEXT DEFAULT 'warehouse';
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS total_capacity INTEGER DEFAULT 1000;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;

ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS check_office_type;
ALTER TABLE warehouses ADD CONSTRAINT check_office_type
  CHECK (office_type IS NULL OR office_type IN ('head_office', 'regional_office', 'warehouse', 'service_center', 'hub'));

-- ========================================
-- PART 5: ENHANCE STOCK_MOVEMENTS
-- ========================================

-- Add detailed movement tracking
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS from_location_type TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS from_location_id UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS from_location_name TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS to_location_type TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS to_location_id UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS to_location_name TEXT;

-- Consignment details for courier movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS consignment_number TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES couriers(id);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS courier_name TEXT;

-- Approval workflow
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

-- Reference fields
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS tid TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS mid TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_tid ON stock_movements(tid);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location ON stock_movements(from_location_type, to_location_type);

-- ========================================
-- PART 6: UPDATE CALLS TABLE (TID/MID)
-- ========================================

-- Add merchant reference
ALTER TABLE calls ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS mid TEXT;

-- Add TID reference (the device/terminal being serviced)
ALTER TABLE calls ADD COLUMN IF NOT EXISTS tid TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES devices(id);

-- Auto-allocation fields
ALTER TABLE calls ADD COLUMN IF NOT EXISTS auto_allocated BOOLEAN DEFAULT false;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS allocation_reason TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS allocation_timestamp TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS distance_to_merchant NUMERIC(10,2);

-- Source tracking
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_source TEXT DEFAULT 'manual';  -- 'manual', 'api', 'import', 'auto'
ALTER TABLE calls ADD COLUMN IF NOT EXISTS source_reference TEXT;

-- SLA tracking
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS breach_reason TEXT;

-- Escalation
ALTER TABLE calls ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS escalated_to UUID REFERENCES user_profiles(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calls_mid ON calls(mid);
CREATE INDEX IF NOT EXISTS idx_calls_tid ON calls(tid);
CREATE INDEX IF NOT EXISTS idx_calls_merchant ON calls(merchant_id);
CREATE INDEX IF NOT EXISTS idx_calls_sla ON calls(sla_deadline) WHERE sla_breached = false;

-- ========================================
-- PART 7: CREATE VIEWS
-- ========================================

-- View: Complete device information
DROP VIEW IF EXISTS v_devices_full;
CREATE VIEW v_devices_full AS
SELECT
  d.id,
  d.serial_number,
  d.tid,
  d.model,
  d.make,
  d.status,
  d.device_condition,
  d.current_location_type,
  d.current_location_name,
  d.receiving_date,
  CASE
    WHEN d.receiving_date IS NOT NULL
    THEN (CURRENT_DATE - d.receiving_date::DATE)::INTEGER
    ELSE NULL
  END as ageing_days,
  d.installed_at_mid,
  d.installation_tid,
  d.used_date,
  d.error_type,
  d.fault_description,
  b.name as bank_name,
  b.code as bank_code,
  m.merchant_name,
  m.mid,
  m.merchant_address,
  m.city as merchant_city,
  w.name as warehouse_name,
  e.full_name as assigned_engineer_name,
  e.emp_id as engineer_emp_id,
  e.phone as engineer_phone,
  d.created_at,
  d.updated_at
FROM devices d
LEFT JOIN banks b ON d.device_bank = b.id
LEFT JOIN merchants m ON d.merchant_id = m.id
LEFT JOIN warehouses w ON d.current_location_type = 'warehouse' AND d.current_location_id = w.id
LEFT JOIN user_profiles e ON d.assigned_to = e.id;

-- View: Calls with full details
DROP VIEW IF EXISTS v_calls_full;
CREATE VIEW v_calls_full AS
SELECT
  c.id,
  c.call_number,
  c.type,
  c.status,
  c.priority,
  c.mid,
  c.tid,
  c.scheduled_date,
  c.sla_deadline,
  c.sla_breached,
  c.auto_allocated,
  c.distance_to_merchant,
  c.started_at,
  c.completed_at,
  c.description,
  c.resolution_notes,
  -- Merchant details
  m.merchant_name,
  m.business_name,
  m.merchant_address,
  m.city as merchant_city,
  m.contact_person,
  m.contact_phone as merchant_phone,
  m.latitude as merchant_lat,
  m.longitude as merchant_lng,
  -- Engineer details
  e.full_name as engineer_name,
  e.emp_id as engineer_emp_id,
  e.phone as engineer_phone,
  e.last_location_lat as engineer_lat,
  e.last_location_lng as engineer_lng,
  -- Bank details
  b.name as bank_name,
  b.code as bank_code,
  -- Device details
  dev.serial_number,
  dev.model as device_model,
  c.created_at,
  c.updated_at
FROM calls c
LEFT JOIN merchants m ON c.merchant_id = m.id
LEFT JOIN user_profiles e ON c.assigned_engineer = e.id
LEFT JOIN banks b ON c.client_bank = b.id
LEFT JOIN devices dev ON c.device_id = dev.id;

-- View: Engineer workload summary
DROP VIEW IF EXISTS v_engineer_workload;
CREATE VIEW v_engineer_workload AS
SELECT
  e.id,
  e.emp_id,
  e.full_name,
  e.phone,
  e.region,
  e.designation,
  e.last_location_lat,
  e.last_location_lng,
  e.last_location_updated_at,
  COUNT(CASE WHEN c.status = 'pending' AND c.assigned_engineer = e.id THEN 1 END) as pending_calls,
  COUNT(CASE WHEN c.status = 'assigned' THEN 1 END) as assigned_calls,
  COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END) as active_calls,
  COUNT(CASE WHEN c.status = 'completed' AND c.completed_at >= CURRENT_DATE THEN 1 END) as completed_today,
  (SELECT COUNT(*) FROM devices d WHERE d.assigned_to = e.id AND d.current_location_type = 'engineer') as devices_in_hand
FROM user_profiles e
LEFT JOIN calls c ON c.assigned_engineer = e.id AND c.status IN ('assigned', 'in_progress')
WHERE e.role = 'engineer' AND e.status = 'active'
GROUP BY e.id, e.emp_id, e.full_name, e.phone, e.region, e.designation,
         e.last_location_lat, e.last_location_lng, e.last_location_updated_at;

-- View: Stock by warehouse
DROP VIEW IF EXISTS v_warehouse_stock;
CREATE VIEW v_warehouse_stock AS
SELECT
  w.id as warehouse_id,
  w.name as warehouse_name,
  w.code as warehouse_code,
  w.city,
  d.model,
  d.device_condition,
  COUNT(*) as quantity
FROM warehouses w
LEFT JOIN devices d ON d.current_location_type = 'warehouse' AND d.current_location_id = w.id
WHERE d.id IS NOT NULL
GROUP BY w.id, w.name, w.code, w.city, d.model, d.device_condition
ORDER BY w.name, d.model;

-- ========================================
-- PART 8: DISTANCE CALCULATION FUNCTION
-- ========================================

-- Haversine formula for distance calculation
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 NUMERIC, lon1 NUMERIC,
  lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  R CONSTANT NUMERIC := 6371; -- Earth radius in kilometers
  dLat NUMERIC;
  dLon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);

  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN ROUND((R * c)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- PART 9: FIND NEAREST ENGINEER FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION find_nearest_engineers(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_bank_id UUID DEFAULT NULL,
  p_max_distance_km NUMERIC DEFAULT 50,
  p_limit INTEGER DEFAULT 5
) RETURNS TABLE(
  engineer_id UUID,
  emp_id TEXT,
  engineer_name TEXT,
  phone TEXT,
  distance_km NUMERIC,
  current_workload INTEGER,
  last_location_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.emp_id,
    e.full_name,
    e.phone,
    calculate_distance_km(p_latitude, p_longitude, e.last_location_lat, e.last_location_lng) as dist,
    (SELECT COUNT(*)::INTEGER FROM calls c WHERE c.assigned_engineer = e.id AND c.status IN ('assigned', 'in_progress')) as workload,
    e.last_location_updated_at
  FROM user_profiles e
  WHERE e.role = 'engineer'
    AND e.status = 'active'
    AND e.active = true
    AND e.last_location_lat IS NOT NULL
    AND e.last_location_lng IS NOT NULL
    AND (p_bank_id IS NULL OR e.bank_id = p_bank_id)
    AND calculate_distance_km(p_latitude, p_longitude, e.last_location_lat, e.last_location_lng) <= p_max_distance_km
  ORDER BY dist ASC, workload ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 10: AUTO-ALLOCATE CALL FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION auto_allocate_call(
  p_call_id UUID
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  allocated_to UUID,
  engineer_name TEXT,
  distance_km NUMERIC
) AS $$
DECLARE
  v_call RECORD;
  v_merchant RECORD;
  v_engineer RECORD;
BEGIN
  -- Get call details
  SELECT * INTO v_call FROM calls WHERE id = p_call_id;

  IF v_call IS NULL THEN
    RETURN QUERY SELECT false, 'Call not found'::TEXT, NULL::UUID, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  IF v_call.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Call is not in pending status'::TEXT, NULL::UUID, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Get merchant location
  SELECT * INTO v_merchant FROM merchants WHERE id = v_call.merchant_id;

  IF v_merchant IS NULL OR v_merchant.latitude IS NULL THEN
    -- Try using call's latitude/longitude
    IF v_call.latitude IS NULL THEN
      RETURN QUERY SELECT false, 'No location data for merchant or call'::TEXT, NULL::UUID, NULL::TEXT, NULL::NUMERIC;
      RETURN;
    END IF;
    v_merchant.latitude := v_call.latitude;
    v_merchant.longitude := v_call.longitude;
  END IF;

  -- Find nearest engineer
  SELECT * INTO v_engineer
  FROM find_nearest_engineers(
    v_merchant.latitude,
    v_merchant.longitude,
    v_call.client_bank,
    100,  -- max 100km
    1     -- just need 1
  ) LIMIT 1;

  IF v_engineer IS NULL THEN
    RETURN QUERY SELECT false, 'No available engineers within range'::TEXT, NULL::UUID, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Allocate the call
  UPDATE calls SET
    assigned_engineer = v_engineer.engineer_id,
    status = 'assigned',
    auto_allocated = true,
    allocation_reason = 'Nearest available engineer',
    allocation_timestamp = NOW(),
    distance_to_merchant = v_engineer.distance_km,
    updated_at = NOW()
  WHERE id = p_call_id;

  RETURN QUERY SELECT
    true,
    'Call allocated successfully'::TEXT,
    v_engineer.engineer_id,
    v_engineer.engineer_name,
    v_engineer.distance_km;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 11: ENABLE RLS ON NEW TABLE
-- ========================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- Basic read policy for merchants
DROP POLICY IF EXISTS merchants_read_policy ON merchants;
CREATE POLICY merchants_read_policy ON merchants
  FOR SELECT USING (auth.role() = 'authenticated');

-- ========================================
-- VERIFICATION
-- ========================================

SELECT 'Schema update completed!' as status;

-- Show new columns added
SELECT
  'user_profiles' as table_name,
  COUNT(*) as new_columns
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('emp_id', 'alternate_phone', 'home_address', 'date_of_joining', 'designation')

UNION ALL

SELECT
  'merchants' as table_name,
  COUNT(*) as new_columns
FROM information_schema.columns
WHERE table_name = 'merchants'

UNION ALL

SELECT
  'devices (new cols)' as table_name,
  COUNT(*) as new_columns
FROM information_schema.columns
WHERE table_name = 'devices'
  AND column_name IN ('tid', 'merchant_id', 'current_location_type', 'device_condition', 'error_type');
