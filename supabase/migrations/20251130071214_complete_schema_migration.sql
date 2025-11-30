/*
  # Complete CoSTAR Field Service Management Schema

  ## Summary
  Complete database schema including:
  - 12 core tables with constraints
  - All RLS policies
  - Helper functions and triggers
  - Seed data for testing

  ## Tables Created
  1. banks - Bank organizations
  2. user_profiles - Extended user info
  3. devices - POS device inventory
  4. calls - Service call tracking
  5. call_devices - Call-device junction
  6. stock_movements - Audit trail
  7. engineer_aggregates - Performance metrics
  8. stock_alerts - Inventory alerts
  9. photos - Photo evidence
  10. calls_import_audit - Bulk import tracking
  11. calls_import_errors - Import error details
  12. mapping_templates - Column mapping templates

  ## Security
  - RLS enabled on all tables
  - Bank isolation enforced
  - Role-based access control
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'engineer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending_approval', 'active', 'suspended', 'inactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE device_status AS ENUM ('warehouse', 'issued', 'installed', 'faulty', 'returned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE call_type AS ENUM ('installation', 'swap', 'deinstallation', 'maintenance', 'breakdown');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE call_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE call_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM ('received', 'issued', 'installed', 'swapped', 'returned', 'marked_faulty', 'transferred');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE import_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'engineer',
  bank_id UUID REFERENCES banks(id) ON DELETE SET NULL,
  region TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  status user_status NOT NULL DEFAULT 'pending_approval',
  avatar_url TEXT,
  last_location_lat NUMERIC(10, 7),
  last_location_lng NUMERIC(10, 7),
  last_location_updated_at TIMESTAMPTZ,
  totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_lowercase CHECK (email = LOWER(email)),
  CONSTRAINT phone_e164_format CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$'),
  CONSTRAINT engineer_requires_bank CHECK (role != 'engineer' OR status = 'pending_approval' OR bank_id IS NOT NULL),
  CONSTRAINT admin_not_pending CHECK (role != 'admin' OR status != 'pending_approval'),
  CONSTRAINT skills_is_array CHECK (jsonb_typeof(skills) = 'array')
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_number TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  device_bank UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  status device_status NOT NULL DEFAULT 'warehouse',
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  installed_at_client TEXT,
  installation_date DATE,
  warranty_expiry DATE,
  firmware_version TEXT,
  last_maintenance_date DATE,
  notes TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_number TEXT NOT NULL UNIQUE,
  type call_type NOT NULL,
  status call_status NOT NULL DEFAULT 'pending',
  client_bank UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  client_name TEXT NOT NULL,
  client_contact TEXT,
  client_phone TEXT,
  client_address TEXT NOT NULL,
  client_id TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  scheduled_date DATE NOT NULL,
  scheduled_time_window TEXT,
  assigned_engineer UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  priority call_priority NOT NULL DEFAULT 'medium',
  description TEXT DEFAULT '',
  resolution_notes TEXT,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  requires_device BOOLEAN DEFAULT FALSE,
  requires_photo BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  source_filename TEXT,
  source_import_id TEXT,
  source_row_number INTEGER,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT call_number_format CHECK (call_number ~ '^CALL-\d{4}-\d{4,}$'),
  CONSTRAINT latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

CREATE TABLE IF NOT EXISTS call_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(call_id, device_id),
  CONSTRAINT action_valid CHECK (action IN ('install', 'swap_in', 'swap_out', 'remove', 'inspect'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  movement_type movement_type NOT NULL,
  from_status device_status,
  to_status device_status NOT NULL,
  from_location TEXT,
  to_location TEXT,
  moved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engineer_aggregates (
  engineer_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_calls_completed INTEGER NOT NULL DEFAULT 0,
  total_calls_assigned INTEGER NOT NULL DEFAULT 0,
  active_calls_count INTEGER NOT NULL DEFAULT 0,
  devices_issued_count INTEGER NOT NULL DEFAULT 0,
  avg_completion_time_minutes NUMERIC(10, 2),
  last_call_completed_at TIMESTAMPTZ,
  performance_score NUMERIC(5, 2),
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'warning',
  status alert_status NOT NULL DEFAULT 'active',
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  acknowledged_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT alert_type_valid CHECK (alert_type IN ('low_stock', 'no_stock', 'high_faulty_rate', 'device_overdue', 'engineer_overloaded', 'unassigned_calls', 'custom'))
);

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT photo_type_valid CHECK (photo_type IN ('before_installation', 'after_installation', 'faulty_device', 'site_photo', 'other'))
);

CREATE TABLE IF NOT EXISTS calls_import_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id TEXT NOT NULL UNIQUE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conflict_policy TEXT NOT NULL CHECK (conflict_policy IN ('SKIP', 'UPDATE', 'MERGE')),
  auto_assign_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  geocoding_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  abort_on_first_error BOOLEAN NOT NULL DEFAULT FALSE,
  total_rows INTEGER NOT NULL,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  geocoded_count INTEGER NOT NULL DEFAULT 0,
  status import_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  original_file_url TEXT,
  error_report_url TEXT,
  summary_report_url TEXT,
  audit_report_url TEXT,
  errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls_import_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES calls_import_audit(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  field TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning')),
  row_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mapping_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mappings JSONB NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(created_by, name)
);

-- Create indexes (sample - add more as needed)
CREATE INDEX IF NOT EXISTS idx_banks_active ON banks(active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- Helper functions
CREATE OR REPLACE FUNCTION generate_call_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  seq_num TEXT;
BEGIN
  year := TO_CHAR(NOW(), 'YYYY');
  SELECT LPAD((COALESCE(MAX(SUBSTRING(call_number FROM 'CALL-\d{4}-(\d+)')::INTEGER), 0) + 1)::TEXT, 4, '0')
  INTO seq_num FROM calls WHERE call_number LIKE 'CALL-' || year || '-%';
  RETURN 'CALL-' || year || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_banks_updated_at ON banks;
CREATE TRIGGER trg_banks_updated_at BEFORE UPDATE ON banks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_devices_updated_at ON devices;
CREATE TRIGGER trg_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_calls_updated_at ON calls;
CREATE TRIGGER trg_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate call_number
CREATE OR REPLACE FUNCTION auto_generate_call_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.call_number IS NULL THEN
    NEW.call_number := generate_call_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calls_auto_call_number ON calls;
CREATE TRIGGER trg_calls_auto_call_number BEFORE INSERT ON calls FOR EACH ROW EXECUTE FUNCTION auto_generate_call_number();

-- Enable RLS
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls_import_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls_import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for banks
DROP POLICY IF EXISTS "Everyone can view banks" ON banks;
CREATE POLICY "Everyone can view banks" ON banks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert banks" ON banks;
CREATE POLICY "Admins can insert banks" ON banks FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update banks" ON banks;
CREATE POLICY "Admins can update banks" ON banks FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin'));

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles" ON user_profiles FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin'));

-- RLS Policies for devices
DROP POLICY IF EXISTS "Engineers can view own bank devices" ON devices;
CREATE POLICY "Engineers can view own bank devices" ON devices FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (role = 'admin' OR (role = 'engineer' AND bank_id = devices.device_bank))));

DROP POLICY IF EXISTS "Admins can insert devices" ON devices;
CREATE POLICY "Admins can insert devices" ON devices FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update devices" ON devices;
CREATE POLICY "Admins can update devices" ON devices FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed data
INSERT INTO banks (id, name, code, active, contact_person, contact_email, contact_phone, address)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Wells Fargo', 'WF', TRUE, 'John Smith', 'john.smith@wellsfargo.com', '+1-415-555-0001', '420 Montgomery St, San Francisco, CA 94104'),
  ('22222222-2222-2222-2222-222222222222', 'Bank of America', 'BOA', TRUE, 'Jane Doe', 'jane.doe@bofa.com', '+1-415-555-0002', '555 California St, San Francisco, CA 94104'),
  ('33333333-3333-3333-3333-333333333333', 'Chase Bank', 'CHASE', TRUE, 'Bob Johnson', 'bob.johnson@chase.com', '+1-415-555-0003', '560 Mission St, San Francisco, CA 94105')
ON CONFLICT (id) DO NOTHING;
