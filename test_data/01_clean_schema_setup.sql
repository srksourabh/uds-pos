-- ==================================================
-- UDS-POS CLEAN SCHEMA SETUP
-- ==================================================
-- This script resolves schema conflicts by:
-- 1. Dropping conflicting tables
-- 2. Creating consistent, simplified versions
-- 3. Adding indexes and RLS policies
-- ==================================================

-- ==================================================
-- PART 1: DROP CONFLICTING TABLES (if they exist)
-- ==================================================

DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS stock_alerts CASCADE;
DROP TABLE IF EXISTS engineer_aggregates CASCADE;

-- ==================================================
-- PART 2: CREATE CORE TABLES (if not exist)
-- ==================================================

-- Banks table (core - no conflicts)
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles (core - no conflicts)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'engineer',
  bank_id UUID REFERENCES banks(id),
  region TEXT,
  skills JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  last_location_lat NUMERIC(10,7),
  last_location_lng NUMERIC(10,7),
  last_location_updated_at TIMESTAMPTZ,
  totp_enabled BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Devices (core - no conflicts)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  device_bank UUID NOT NULL REFERENCES banks(id),
  status TEXT NOT NULL DEFAULT 'warehouse',
  assigned_to UUID REFERENCES user_profiles(id),
  installed_at_client TEXT,
  installation_date DATE,
  warranty_expiry DATE,
  firmware_version TEXT,
  last_maintenance_date DATE,
  notes TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Calls (core - no conflicts)
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  client_bank UUID NOT NULL REFERENCES banks(id),
  client_name TEXT NOT NULL,
  client_contact TEXT,
  client_phone TEXT,
  client_address TEXT NOT NULL,
  client_id TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  scheduled_date DATE NOT NULL,
  scheduled_time_window TEXT,
  assigned_engineer UUID REFERENCES user_profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium',
  description TEXT DEFAULT '',
  resolution_notes TEXT,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  requires_device BOOLEAN DEFAULT false,
  requires_photo BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Call devices junction table
CREATE TABLE IF NOT EXISTS call_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id),
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(call_id, device_id)
);

-- Warehouses (no bank_id - matches deployed schema)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  capacity INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Couriers
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stock movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_location TEXT,
  to_location TEXT,
  call_id UUID REFERENCES calls(id),
  performed_by UUID REFERENCES user_profiles(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================================================
-- PART 3: CREATE SIMPLIFIED VERSIONS OF CONFLICT TABLES
-- ==================================================

-- Photos (simplified version)
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id),
  uploaded_by UUID REFERENCES user_profiles(id),
  photo_type TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock alerts (simplified version)
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  status TEXT NOT NULL DEFAULT 'active',
  bank_id UUID REFERENCES banks(id),
  device_id UUID REFERENCES devices(id),
  call_id UUID REFERENCES calls(id),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Engineer aggregates (simplified version)
CREATE TABLE engineer_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID UNIQUE NOT NULL REFERENCES user_profiles(id),
  total_calls_completed INTEGER DEFAULT 0,
  total_calls_assigned INTEGER DEFAULT 0,
  active_calls_count INTEGER DEFAULT 0,
  devices_issued_count INTEGER DEFAULT 0,
  avg_completion_time_minutes NUMERIC(10,2),
  last_call_completed_at TIMESTAMPTZ,
  performance_score NUMERIC(5,2),
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==================================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_devices_bank ON devices(device_bank);
CREATE INDEX IF NOT EXISTS idx_devices_assigned ON devices(assigned_to);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

CREATE INDEX IF NOT EXISTS idx_calls_bank ON calls(client_bank);
CREATE INDEX IF NOT EXISTS idx_calls_engineer ON calls(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_date ON calls(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_photos_call ON photos(call_id);
CREATE INDEX IF NOT EXISTS idx_photos_device ON photos(device_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_device ON stock_movements(device_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_call ON stock_movements(call_id);

-- ==================================================
-- PART 5: ENABLE ROW LEVEL SECURITY
-- ==================================================

ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_aggregates ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- PART 6: CREATE BASIC RLS POLICIES
-- ==================================================

-- Drop existing policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS banks_read_policy ON banks;
DROP POLICY IF EXISTS devices_read_policy ON devices;
DROP POLICY IF EXISTS calls_read_policy ON calls;
DROP POLICY IF EXISTS profiles_read_own_policy ON user_profiles;
DROP POLICY IF EXISTS profiles_read_admin_policy ON user_profiles;
DROP POLICY IF EXISTS photos_read_policy ON photos;
DROP POLICY IF EXISTS alerts_read_policy ON stock_alerts;
DROP POLICY IF EXISTS aggregates_read_policy ON engineer_aggregates;

-- Allow authenticated users to read all banks
CREATE POLICY banks_read_policy ON banks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to read all devices
CREATE POLICY devices_read_policy ON devices
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to read all calls
CREATE POLICY calls_read_policy ON calls
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to read their own profile
CREATE POLICY profiles_read_own_policy ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow admins to read all profiles
CREATE POLICY profiles_read_admin_policy ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow authenticated users to read photos
CREATE POLICY photos_read_policy ON photos
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to read stock alerts
CREATE POLICY alerts_read_policy ON stock_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to read engineer aggregates
CREATE POLICY aggregates_read_policy ON engineer_aggregates
  FOR SELECT USING (auth.role() = 'authenticated');

-- ==================================================
-- SUCCESS MESSAGE
-- ==================================================
SELECT 'Schema setup completed successfully!' as message;
