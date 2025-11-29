/*
  # Create Stock Movements Table (Enhanced Inventory Audit)

  ## Overview
  Enhanced version of inventory_movements with additional fields for comprehensive
  stock tracking, movement types, and location tracking.

  ## New Table: stock_movements
  Tracks all device inventory movements with detailed metadata including:
  - Movement types (status_change, assignment, transfer, return, issuance)
  - Location tracking (from/to locations)
  - Quantity tracking (future-proof for bulk operations)
  - Complete audit trail with actor and reason

  ## Key Features
  - Immutable audit trail (no updates/deletes allowed via RLS)
  - Links to devices, engineers, and calls
  - Flexible metadata field for movement-specific data
  - Automatic timestamp tracking

  ## Security
  - RLS policies allow insert only by authenticated users
  - No updates or deletes permitted (audit integrity)
  - Admins can view all movements
  - Engineers can view movements involving their devices
*/

-- Create movement type enum
DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM (
    'status_change',
    'assignment',
    'transfer',
    'return',
    'issuance'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  movement_type movement_type NOT NULL,
  from_status text NOT NULL,
  to_status text NOT NULL,
  from_engineer uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  to_engineer uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  from_location text,
  to_location text,
  quantity integer DEFAULT 1,
  call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  notes text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_device ON stock_movements(device_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_from_engineer ON stock_movements(from_engineer);
CREATE INDEX IF NOT EXISTS idx_stock_movements_to_engineer ON stock_movements(to_engineer);
CREATE INDEX IF NOT EXISTS idx_stock_movements_call ON stock_movements(call_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_actor ON stock_movements(actor_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_device_created ON stock_movements(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

-- RLS Policies

-- Admins can view all movements
CREATE POLICY "Admins can view all stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (is_admin() AND is_user_active());

-- Engineers can view movements involving their devices
CREATE POLICY "Engineers can view relevant stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND
    is_user_active() AND
    (
      from_engineer = auth.uid() OR
      to_engineer = auth.uid() OR
      actor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM devices
        WHERE devices.id = stock_movements.device_id
        AND devices.assigned_to = auth.uid()
      )
    )
  );

-- Allow authenticated users to create movements
CREATE POLICY "Users can create stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- No updates allowed (immutable audit trail)
-- No delete policy (immutable audit trail)

-- Function to auto-create stock movement on device status change
CREATE OR REPLACE FUNCTION create_stock_movement_on_device_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create movement if status or assignment changed
  IF (OLD.status != NEW.status) OR (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO stock_movements (
      device_id,
      movement_type,
      from_status,
      to_status,
      from_engineer,
      to_engineer,
      from_location,
      to_location,
      actor_id,
      reason,
      notes
    ) VALUES (
      NEW.id,
      CASE
        WHEN OLD.status = 'warehouse' AND NEW.status = 'issued' THEN 'issuance'::movement_type
        WHEN NEW.status = 'warehouse' THEN 'return'::movement_type
        WHEN OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN 'assignment'::movement_type
        ELSE 'status_change'::movement_type
      END,
      OLD.status,
      NEW.status,
      OLD.assigned_to,
      NEW.assigned_to,
      CASE
        WHEN OLD.status = 'warehouse' THEN 'Central Warehouse'
        WHEN OLD.installed_at_client IS NOT NULL THEN 'Client: ' || OLD.installed_at_client
        ELSE NULL
      END,
      CASE
        WHEN NEW.status = 'warehouse' THEN 'Central Warehouse'
        WHEN NEW.installed_at_client IS NOT NULL THEN 'Client: ' || NEW.installed_at_client
        ELSE NULL
      END,
      COALESCE(NEW.updated_by, auth.uid()),
      'Automatic movement record',
      'Auto-generated on device update'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_by field to devices table for tracking actor
DO $$ BEGIN
  ALTER TABLE devices ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES user_profiles(id);
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Create trigger for auto-generating stock movements
DROP TRIGGER IF EXISTS auto_create_stock_movement ON devices;
CREATE TRIGGER auto_create_stock_movement
  AFTER UPDATE ON devices
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
  EXECUTE FUNCTION create_stock_movement_on_device_change();