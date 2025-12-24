-- Phase 2: Comprehensive Update Migration
-- Date: December 25, 2025
-- Purpose: Add all new fields for Engineer, Call, and Device enhancements

-- ================================================================
-- 1. ENGINEER/USER PROFILE UPDATES
-- ================================================================

-- Add new columns to user_profiles for enhanced engineer management
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS date_of_joining DATE,
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS referred_by VARCHAR(100);

-- Create sequence for auto-generating employee IDs
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START WITH 1001;

-- Function to auto-generate employee ID
CREATE OR REPLACE FUNCTION generate_employee_id()
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN 'UDSPL' || LPAD(nextval('employee_id_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 2. CALLS TABLE UPDATES - Extended Call Fields
-- ================================================================

-- Add new columns to calls for comprehensive call tracking
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS tid VARCHAR(50),
ADD COLUMN IF NOT EXISTS mid VARCHAR(50),
ADD COLUMN IF NOT EXISTS call_ticket VARCHAR(100),
ADD COLUMN IF NOT EXISTS existing_device_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS sim_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS alternate_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS request_date DATE;

-- Rename existing latitude/longitude columns if they exist differently
-- (latitude and longitude already exist as 'latitude' and 'longitude')

-- ================================================================
-- 3. DEVICES TABLE UPDATES
-- ================================================================

-- Add new columns to devices for enhanced tracking
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES banks(id),
ADD COLUMN IF NOT EXISTS device_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS condition_status VARCHAR(20) DEFAULT 'good',
ADD COLUMN IF NOT EXISTS whereabouts VARCHAR(50) DEFAULT 'warehouse',
ADD COLUMN IF NOT EXISTS unique_entry_id VARCHAR(100);

-- Create constraint for new condition_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'devices_condition_status_check'
  ) THEN
    ALTER TABLE devices ADD CONSTRAINT devices_condition_status_check 
    CHECK (condition_status IN ('good', 'faulty', 'returned'));
  END IF;
END $$;

-- Create constraint for whereabouts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'devices_whereabouts_check'
  ) THEN
    ALTER TABLE devices ADD CONSTRAINT devices_whereabouts_check 
    CHECK (whereabouts IN ('warehouse', 'intransit', 'engineer', 'installed'));
  END IF;
END $$;

-- Function to generate unique entry ID for devices
CREATE OR REPLACE FUNCTION generate_device_entry_id()
RETURNS TRIGGER AS $$
DECLARE
  entry_id VARCHAR(100);
BEGIN
  -- Generate unique entry ID based on customer, receiving date, and serial number
  entry_id := COALESCE(NEW.customer_id::TEXT, 'NOCUST') || '-' || 
              COALESCE(TO_CHAR(NEW.receiving_date, 'YYYYMMDD'), TO_CHAR(NOW(), 'YYYYMMDD')) || '-' ||
              COALESCE(NEW.serial_number, 'NOSER') || '-' ||
              LPAD(nextval('device_entry_seq')::TEXT, 6, '0');
  NEW.unique_entry_id := entry_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for device entry IDs
CREATE SEQUENCE IF NOT EXISTS device_entry_seq START WITH 1;

-- Create trigger for auto-generating device entry IDs
DROP TRIGGER IF EXISTS device_entry_id_trigger ON devices;
CREATE TRIGGER device_entry_id_trigger
BEFORE INSERT ON devices
FOR EACH ROW
WHEN (NEW.unique_entry_id IS NULL)
EXECUTE FUNCTION generate_device_entry_id();

-- ================================================================
-- 4. SHIPMENTS TABLE UPDATES (In Transit enhancements)
-- ================================================================

ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS consignment_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS consignment_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS consignment_date DATE,
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES banks(id);

-- ================================================================
-- 5. CREATE CUSTOMERS TABLE IF NOT EXISTS
-- (Banks table is being used as customers, so we'll add an alias view)
-- ================================================================

-- Create a view for customers (alias to banks for clarity)
CREATE OR REPLACE VIEW customers AS
SELECT 
  id,
  name as customer_name,
  code as customer_code,
  active,
  contact_person,
  contact_email,
  contact_phone,
  address,
  metadata,
  created_at
FROM banks;

-- ================================================================
-- 6. ENSURE COURIERS TABLE HAS DATA
-- ================================================================

-- Insert default couriers if none exist
INSERT INTO couriers (id, name, code, is_active)
SELECT 
  gen_random_uuid(), 
  courier_name, 
  courier_code, 
  true
FROM (VALUES 
  ('Blue Dart', 'BLUEDART'),
  ('DTDC', 'DTDC'),
  ('Delhivery', 'DELHIVERY'),
  ('FedEx', 'FEDEX'),
  ('Gati', 'GATI'),
  ('Ecom Express', 'ECOM'),
  ('Xpressbees', 'XPRESS'),
  ('Professional Courier', 'PROFESSIONAL')
) AS couriers(courier_name, courier_code)
WHERE NOT EXISTS (SELECT 1 FROM couriers WHERE code = courier_code);

-- ================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_id ON user_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_calls_customer_name ON calls(customer_name);
CREATE INDEX IF NOT EXISTS idx_calls_tid ON calls(tid);
CREATE INDEX IF NOT EXISTS idx_calls_mid ON calls(mid);
CREATE INDEX IF NOT EXISTS idx_calls_call_ticket ON calls(call_ticket);
CREATE INDEX IF NOT EXISTS idx_calls_region ON calls(region);
CREATE INDEX IF NOT EXISTS idx_calls_pincode ON calls(pincode);
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_category ON devices(device_category);
CREATE INDEX IF NOT EXISTS idx_devices_condition_status ON devices(condition_status);
CREATE INDEX IF NOT EXISTS idx_devices_whereabouts ON devices(whereabouts);
CREATE INDEX IF NOT EXISTS idx_devices_unique_entry_id ON devices(unique_entry_id);

-- ================================================================
-- 8. GRANT PERMISSIONS
-- ================================================================

GRANT SELECT ON customers TO authenticated;
GRANT USAGE ON SEQUENCE employee_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE device_entry_seq TO authenticated;

COMMENT ON TABLE user_profiles IS 'Enhanced user profiles with employee details for engineers';
COMMENT ON TABLE calls IS 'Service calls with extended fields for complete call tracking';
COMMENT ON TABLE devices IS 'Device inventory with category and condition tracking';
