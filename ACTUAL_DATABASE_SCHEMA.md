# UDS-POS Actual Database Schema

> **Generated:** 2025-12-10
> **Purpose:** Document the actual database schema based on code analysis

## Important Notes

The deployed Supabase database may have schema variations depending on which migrations were run. This document reflects what the **application code expects**.

**Key Discovery:** There are multiple migration files with conflicting schemas. The actual deployed schema depends on:
1. Which migrations were applied
2. Order of migration application
3. Whether any manual schema changes were made

---

## Core Tables

### 1. banks
```sql
CREATE TABLE banks (
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
```

### 2. user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,  -- E.164 format: +919876543210
  role TEXT NOT NULL DEFAULT 'engineer',  -- 'admin', 'engineer', 'super_admin'
  bank_id UUID REFERENCES banks(id),
  region TEXT,
  skills JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending_approval',  -- 'pending_approval', 'active', 'suspended', 'inactive'
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
```

### 3. devices
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  device_bank UUID NOT NULL REFERENCES banks(id),
  status TEXT NOT NULL DEFAULT 'warehouse',  -- 'warehouse', 'issued', 'installed', 'faulty', 'returned', 'in_transit'
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
```

### 4. calls
```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_number TEXT UNIQUE NOT NULL,  -- Format: CALL-YYYY-NNNN
  type TEXT NOT NULL,  -- 'install', 'swap', 'deinstall', 'maintenance', 'breakdown'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
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
  priority TEXT NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high', 'urgent'
  description TEXT DEFAULT '',
  resolution_notes TEXT,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  requires_device BOOLEAN DEFAULT false,
  requires_photo BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  source_filename TEXT,
  source_import_id TEXT,
  source_row_number INTEGER,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5. call_devices
```sql
CREATE TABLE call_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id),
  action TEXT NOT NULL,  -- 'install', 'swap_in', 'swap_out', 'remove', 'inspect'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(call_id, device_id)
);
```

### 6. warehouses
```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  bank_id UUID REFERENCES banks(id),
  capacity INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 7. couriers
```sql
CREATE TABLE couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 8. stock_movements
```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,  -- 'received', 'issued', 'installed', 'returned', 'marked_faulty', 'transferred'
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
```

---

## Schema Variations (Migration Conflicts)

### photos table
**Multiple versions exist in migrations:**

Version A (complete_schema_migration.sql):
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls(id),
  device_id UUID REFERENCES devices(id),
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
  photo_type TEXT NOT NULL,  -- 'before_installation', 'after_installation', 'faulty_device', 'site_photo', 'other'
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Version B (app code expects):
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY,
  related_call UUID,
  related_device UUID,
  photo_type TEXT NOT NULL,
  photo_url TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### stock_alerts table
**Multiple versions exist:**

Version A (complete_schema_migration.sql):
```sql
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',  -- 'info', 'warning', 'critical'
  status TEXT NOT NULL DEFAULT 'active',  -- 'active', 'acknowledged', 'resolved'
  bank_id UUID REFERENCES banks(id),
  device_id UUID REFERENCES devices(id),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Version B (database.types.ts):
```sql
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,  -- 'info', 'warning', 'critical', 'urgent'
  bank_id UUID,
  device_id UUID,
  call_id UUID,
  engineer_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  threshold_value NUMERIC,
  current_value NUMERIC,
  status TEXT NOT NULL,  -- 'active', 'acknowledged', 'resolved', 'dismissed'
  auto_generated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### engineer_aggregates table
**Multiple versions exist:**

Version A (simple - complete_schema_migration.sql):
```sql
CREATE TABLE engineer_aggregates (
  engineer_id UUID PRIMARY KEY REFERENCES user_profiles(id),
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
```

Version B (complex - database.types.ts):
```sql
CREATE TABLE engineer_aggregates (
  id UUID PRIMARY KEY,
  engineer_id UUID NOT NULL REFERENCES user_profiles(id),
  period_type TEXT NOT NULL,  -- 'daily', 'weekly', 'monthly', etc.
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_calls_assigned INTEGER DEFAULT 0,
  total_calls_completed INTEGER DEFAULT 0,
  -- ... many more columns
);
```

---

## How to Check Your Actual Schema

Run these queries in Supabase SQL Editor:

```sql
-- Check photos table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'photos'
ORDER BY ordinal_position;

-- Check stock_alerts table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'stock_alerts'
ORDER BY ordinal_position;

-- Check engineer_aggregates table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'engineer_aggregates'
ORDER BY ordinal_position;

-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## Seed Data Strategy

Due to schema variations, the seed data script:
1. Seeds **core tables** that have consistent schemas (banks, user_profiles, devices, calls, warehouses, couriers, stock_movements)
2. **Skips** tables with schema conflicts (photos, stock_alerts, engineer_aggregates)
3. Provides instructions for manually seeding skipped tables after checking your actual schema
