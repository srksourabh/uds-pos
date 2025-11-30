/*
  # Initial Schema - Field Service Platform

  ## Overview
  Creates the foundational schema for the field service management system including:
  - Bank organizations (multi-tenant)
  - User profiles with RBAC
  - Device inventory tracking
  - Service call management
  - Call-device linkage
  - Audit trails (call history, inventory movements)
  - Notifications system

  ## New Tables
  1. **banks** - Bank organizations that own devices
  2. **user_profiles** - Extended user data linked to auth.users
  3. **devices** - POS device inventory
  4. **calls** - Field service calls/tickets
  5. **call_devices** - Junction table for calls↔devices
  6. **inventory_movements** - Legacy audit trail
  7. **call_history** - Call status change audit
  8. **notifications** - User notifications

  ## Security
  - All tables have RLS enabled
  - Policies will be added in migration 002
*/

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'engineer');

-- =====================================================
-- BANKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_banks_active ON banks(active);
CREATE INDEX IF NOT EXISTS idx_banks_code ON banks(code);
CREATE INDEX IF NOT EXISTS idx_banks_name ON banks(name);

-- =====================================================
-- USER_PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  role user_role DEFAULT 'engineer',
  bank_id uuid REFERENCES banks(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_bank ON user_profiles(bank_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_bank ON user_profiles(role, bank_id);

-- =====================================================
-- DEVICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text NOT NULL UNIQUE,
  model text NOT NULL,
  device_bank uuid NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'warehouse',
  assigned_to uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  installed_at_client text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_serial ON devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_devices_bank ON devices(device_bank);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_assigned ON devices(assigned_to);
CREATE INDEX IF NOT EXISTS idx_devices_bank_status ON devices(device_bank, status);
CREATE INDEX IF NOT EXISTS idx_devices_model ON devices(model);

-- Add constraint for valid status
ALTER TABLE devices ADD CONSTRAINT valid_device_status
  CHECK (status IN ('warehouse', 'issued', 'installed', 'faulty', 'returned'));

-- =====================================================
-- CALLS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_number text NOT NULL UNIQUE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  client_bank uuid NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_address text NOT NULL,
  latitude numeric(10,6),
  longitude numeric(10,6),
  scheduled_date date NOT NULL,
  assigned_engineer uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  priority text DEFAULT 'medium',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_number ON calls(call_number);
CREATE INDEX IF NOT EXISTS idx_calls_bank ON calls(client_bank);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_engineer ON calls(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_calls_scheduled_date ON calls(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_calls_status_priority ON calls(status, priority);
CREATE INDEX IF NOT EXISTS idx_calls_bank_status ON calls(client_bank, status);
CREATE INDEX IF NOT EXISTS idx_calls_engineer_status ON calls(assigned_engineer, status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);

-- Add constraints
ALTER TABLE calls ADD CONSTRAINT valid_call_type
  CHECK (type IN ('install', 'swap', 'deinstall', 'maintenance', 'breakdown'));

ALTER TABLE calls ADD CONSTRAINT valid_call_status
  CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE calls ADD CONSTRAINT valid_call_priority
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- =====================================================
-- CALL_DEVICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS call_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_call_device UNIQUE (call_id, device_id)
);

-- Enable RLS
ALTER TABLE call_devices ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_devices_call ON call_devices(call_id);
CREATE INDEX IF NOT EXISTS idx_call_devices_device ON call_devices(device_id);

-- =====================================================
-- INVENTORY_MOVEMENTS TABLE (Legacy)
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  from_engineer uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  to_engineer uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_device ON inventory_movements(device_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_from ON inventory_movements(from_engineer);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_to ON inventory_movements(to_engineer);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at DESC);

-- =====================================================
-- CALL_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  actor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_history_call ON call_history(call_id);
CREATE INDEX IF NOT EXISTS idx_call_history_actor ON call_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_call_history_created ON call_history(created_at DESC);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);