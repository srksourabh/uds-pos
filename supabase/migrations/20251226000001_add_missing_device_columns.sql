/*
  # Add Missing Device Columns

  This migration adds all missing columns to the devices table that are referenced
  in the TypeScript types and application code but don't exist in the database.

  ## Changes Made
  1. Add Phase 2 extended device tracking fields
  2. Add location tracking fields
  3. Add receiving/inventory fields
  4. Add device categorization fields
*/

-- ============================================================================
-- Add missing columns to DEVICES table
-- ============================================================================

DO $$
BEGIN
  -- Add current_location_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'current_location_name') THEN
    ALTER TABLE devices ADD COLUMN current_location_name TEXT;
  END IF;

  -- Add current_location_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'current_location_type') THEN
    ALTER TABLE devices ADD COLUMN current_location_type TEXT;
  END IF;

  -- Add customer_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'customer_id') THEN
    ALTER TABLE devices ADD COLUMN customer_id UUID REFERENCES banks(id) ON DELETE SET NULL;
  END IF;

  -- Add device_category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'device_category') THEN
    ALTER TABLE devices ADD COLUMN device_category TEXT;
  END IF;

  -- Add condition_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'condition_status') THEN
    ALTER TABLE devices ADD COLUMN condition_status TEXT CHECK (condition_status IN ('good', 'faulty', 'returned'));
  END IF;

  -- Add whereabouts column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'whereabouts') THEN
    ALTER TABLE devices ADD COLUMN whereabouts TEXT CHECK (whereabouts IN ('warehouse', 'intransit', 'engineer', 'installed'));
  END IF;

  -- Add unique_entry_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'unique_entry_id') THEN
    ALTER TABLE devices ADD COLUMN unique_entry_id TEXT UNIQUE;
  END IF;

  -- Add make column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'make') THEN
    ALTER TABLE devices ADD COLUMN make TEXT;
  END IF;

  -- Add receiving_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'receiving_date') THEN
    ALTER TABLE devices ADD COLUMN receiving_date DATE;
  END IF;

  -- Add tid column (Terminal ID)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'tid') THEN
    ALTER TABLE devices ADD COLUMN tid TEXT;
  END IF;

  -- Add old_serial_number column (for tracking device swaps)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'old_serial_number') THEN
    ALTER TABLE devices ADD COLUMN old_serial_number TEXT;
  END IF;

  -- Add old_sim_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'old_sim_number') THEN
    ALTER TABLE devices ADD COLUMN old_sim_number TEXT;
  END IF;

  -- Add new_sim_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'new_sim_number') THEN
    ALTER TABLE devices ADD COLUMN new_sim_number TEXT;
  END IF;

  -- Add used_for_tid column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'used_for_tid') THEN
    ALTER TABLE devices ADD COLUMN used_for_tid TEXT;
  END IF;

  -- Add used_for_mid column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'used_for_mid') THEN
    ALTER TABLE devices ADD COLUMN used_for_mid TEXT;
  END IF;

  -- Add used_for_ticket column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'used_for_ticket') THEN
    ALTER TABLE devices ADD COLUMN used_for_ticket TEXT;
  END IF;

  -- Add used_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'used_date') THEN
    ALTER TABLE devices ADD COLUMN used_date DATE;
  END IF;

  -- Add ageing_days column (calculated field for inventory ageing)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'ageing_days') THEN
    ALTER TABLE devices ADD COLUMN ageing_days INTEGER;
  END IF;

  -- Add assigned_engineer column (alias for assigned_to for clarity)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'assigned_engineer') THEN
    ALTER TABLE devices ADD COLUMN assigned_engineer UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- Add indexes for new columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_device_category ON devices(device_category) WHERE device_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_condition_status ON devices(condition_status) WHERE condition_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_whereabouts ON devices(whereabouts) WHERE whereabouts IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_unique_entry_id ON devices(unique_entry_id) WHERE unique_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_receiving_date ON devices(receiving_date) WHERE receiving_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_tid ON devices(tid) WHERE tid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_assigned_engineer ON devices(assigned_engineer) WHERE assigned_engineer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_current_location_type ON devices(current_location_type) WHERE current_location_type IS NOT NULL;

-- ============================================================================
-- Update existing devices to have default values
-- ============================================================================

-- Set current_location_type for warehouse devices
UPDATE devices
SET current_location_type = 'warehouse',
    current_location_name = 'Main Warehouse'
WHERE status = 'warehouse' AND current_location_type IS NULL;

-- Set current_location_type for issued devices
UPDATE devices
SET current_location_type = 'engineer'
WHERE status = 'issued' AND current_location_type IS NULL;

-- Set current_location_type for installed devices
UPDATE devices
SET current_location_type = 'client'
WHERE status = 'installed' AND current_location_type IS NULL;

-- Sync customer_id with device_bank where not set
UPDATE devices
SET customer_id = device_bank
WHERE customer_id IS NULL;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Added missing device columns successfully';
END $$;
