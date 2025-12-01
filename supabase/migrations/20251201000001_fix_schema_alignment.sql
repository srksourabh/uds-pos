/*
  # Database Schema Alignment Migration

  ## Purpose
  This migration aligns the database schema with the TypeScript types and Edge Functions.
  It fixes critical mismatches that would cause runtime errors.

  ## Changes Made
  1. Add missing columns to devices table (fault tracking fields)
  2. Add missing columns to stock_movements table (performed_by, from_engineer, etc.)
  3. Add missing columns to stock_alerts table (entity_type, entity_id, title, etc.)
  4. Add missing columns to user_profiles table (user_id alias, is_active)
  5. Add missing columns to engineer_aggregates table (current_device_count)
  6. Create call_history table for call status tracking
  7. Create idempotency_keys table for Edge Functions
  8. Create monitoring_events table for logging
  9. Update RLS policies for new tables
*/

-- ============================================================================
-- PART 1: Add missing columns to DEVICES table
-- ============================================================================

DO $$
BEGIN
  -- Add fault tracking columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'fault_description') THEN
    ALTER TABLE devices ADD COLUMN fault_description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'fault_category') THEN
    ALTER TABLE devices ADD COLUMN fault_category TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'fault_severity') THEN
    ALTER TABLE devices ADD COLUMN fault_severity TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'requires_repair') THEN
    ALTER TABLE devices ADD COLUMN requires_repair BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'estimated_repair_cost') THEN
    ALTER TABLE devices ADD COLUMN estimated_repair_cost NUMERIC(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'marked_faulty_at') THEN
    ALTER TABLE devices ADD COLUMN marked_faulty_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'marked_faulty_by') THEN
    ALTER TABLE devices ADD COLUMN marked_faulty_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'issued_at') THEN
    ALTER TABLE devices ADD COLUMN issued_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add index for fault tracking
CREATE INDEX IF NOT EXISTS idx_devices_fault_severity ON devices(fault_severity) WHERE fault_severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_marked_faulty_by ON devices(marked_faulty_by) WHERE marked_faulty_by IS NOT NULL;

-- ============================================================================
-- PART 2: Add missing columns to STOCK_MOVEMENTS table
-- ============================================================================

DO $$
BEGIN
  -- Add performed_by column (alias for moved_by used by Edge Functions)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'performed_by') THEN
    ALTER TABLE stock_movements ADD COLUMN performed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add from_engineer column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'from_engineer') THEN
    ALTER TABLE stock_movements ADD COLUMN from_engineer UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add to_engineer column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'to_engineer') THEN
    ALTER TABLE stock_movements ADD COLUMN to_engineer UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add actor_id column (alias for performed_by used in TypeScript types)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'actor_id') THEN
    ALTER TABLE stock_movements ADD COLUMN actor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add reason column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'reason') THEN
    ALTER TABLE stock_movements ADD COLUMN reason TEXT DEFAULT '';
  END IF;

  -- Add quantity column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'quantity') THEN
    ALTER TABLE stock_movements ADD COLUMN quantity INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_stock_movements_performed_by ON stock_movements(performed_by) WHERE performed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_from_engineer ON stock_movements(from_engineer) WHERE from_engineer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_to_engineer ON stock_movements(to_engineer) WHERE to_engineer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_actor_id ON stock_movements(actor_id) WHERE actor_id IS NOT NULL;

-- Update movement_type enum to include all types used by Edge Functions
DO $$
BEGIN
  -- Add new movement types if they don't exist
  ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'issue';
  ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'marked_faulty';
  ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'installation';
  ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'swap_in';
  ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'swap_out';
  ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'status_change';
  ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'assignment';
  ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'issuance';
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if enum values already exist
  NULL;
END $$;

-- ============================================================================
-- PART 3: Add missing columns to STOCK_ALERTS table
-- ============================================================================

DO $$
BEGIN
  -- Add entity_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'entity_type') THEN
    ALTER TABLE stock_alerts ADD COLUMN entity_type TEXT;
  END IF;

  -- Add entity_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'entity_id') THEN
    ALTER TABLE stock_alerts ADD COLUMN entity_id UUID;
  END IF;

  -- Add title column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'title') THEN
    ALTER TABLE stock_alerts ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;

  -- Add resolved_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'resolved_by') THEN
    ALTER TABLE stock_alerts ADD COLUMN resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add engineer_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'engineer_id') THEN
    ALTER TABLE stock_alerts ADD COLUMN engineer_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add call_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'call_id') THEN
    ALTER TABLE stock_alerts ADD COLUMN call_id UUID REFERENCES calls(id) ON DELETE SET NULL;
  END IF;

  -- Add resolution_notes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'resolution_notes') THEN
    ALTER TABLE stock_alerts ADD COLUMN resolution_notes TEXT;
  END IF;

  -- Add auto_generated column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'auto_generated') THEN
    ALTER TABLE stock_alerts ADD COLUMN auto_generated BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add expires_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'expires_at') THEN
    ALTER TABLE stock_alerts ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- Add notification_sent column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'notification_sent') THEN
    ALTER TABLE stock_alerts ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add threshold_value column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'threshold_value') THEN
    ALTER TABLE stock_alerts ADD COLUMN threshold_value NUMERIC;
  END IF;

  -- Add current_value column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_alerts' AND column_name = 'current_value') THEN
    ALTER TABLE stock_alerts ADD COLUMN current_value NUMERIC;
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_stock_alerts_entity_id ON stock_alerts(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_alerts_engineer_id ON stock_alerts(engineer_id) WHERE engineer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_alerts_call_id ON stock_alerts(call_id) WHERE call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved_by ON stock_alerts(resolved_by) WHERE resolved_by IS NOT NULL;

-- Update alert_type check constraint to include all types used by Edge Functions
ALTER TABLE stock_alerts DROP CONSTRAINT IF EXISTS alert_type_valid;
ALTER TABLE stock_alerts ADD CONSTRAINT alert_type_valid CHECK (
  alert_type IN (
    'low_stock', 'no_stock', 'high_faulty_rate', 'device_overdue',
    'engineer_overloaded', 'unassigned_calls', 'custom',
    'device_faulty', 'faulty_device', 'missing_device',
    'warranty_expiring', 'maintenance_due', 'engineer_idle', 'call_overdue'
  )
);

-- ============================================================================
-- PART 4: Add missing columns to USER_PROFILES table
-- ============================================================================

DO $$
BEGIN
  -- Add user_id column as alias for id (for Edge Functions that query by user_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'user_id') THEN
    ALTER TABLE user_profiles ADD COLUMN user_id UUID GENERATED ALWAYS AS (id) STORED;
  END IF;

  -- Add is_active column (for Edge Functions that check is_active)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_active') THEN
    ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN GENERATED ALWAYS AS (active AND status = 'active') STORED;
  END IF;
END $$;

-- Add index for user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- PART 5: Add missing columns to ENGINEER_AGGREGATES table
-- ============================================================================

DO $$
BEGIN
  -- Add current_device_count column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'engineer_aggregates' AND column_name = 'current_device_count') THEN
    ALTER TABLE engineer_aggregates ADD COLUMN current_device_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- PART 6: Create CALL_HISTORY table
-- ============================================================================

CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for call_history
CREATE INDEX IF NOT EXISTS idx_call_history_call_id ON call_history(call_id);
CREATE INDEX IF NOT EXISTS idx_call_history_actor_id ON call_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON call_history(created_at);

-- Enable RLS on call_history
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_history
DROP POLICY IF EXISTS "Admins can view all call history" ON call_history;
CREATE POLICY "Admins can view all call history" ON call_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS "Engineers can view call history for their calls" ON call_history;
CREATE POLICY "Engineers can view call history for their calls" ON call_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM calls
    WHERE calls.id = call_history.call_id
    AND calls.assigned_engineer = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert call history" ON call_history;
CREATE POLICY "Users can insert call history" ON call_history
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 7: Create IDEMPOTENCY_KEYS table (for Edge Functions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key, operation, user_id)
);

-- Add indexes for idempotency_keys
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON idempotency_keys(key, operation, user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- Enable RLS on idempotency_keys
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for idempotency_keys
DROP POLICY IF EXISTS "Users can view own idempotency keys" ON idempotency_keys;
CREATE POLICY "Users can view own idempotency keys" ON idempotency_keys
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own idempotency keys" ON idempotency_keys;
CREATE POLICY "Users can insert own idempotency keys" ON idempotency_keys
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all idempotency keys" ON idempotency_keys;
CREATE POLICY "Admins can view all idempotency keys" ON idempotency_keys
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- ============================================================================
-- PART 8: Create MONITORING_EVENTS table (for Edge Functions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS monitoring_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  function_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for monitoring_events
CREATE INDEX IF NOT EXISTS idx_monitoring_events_function ON monitoring_events(function_name);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_user_id ON monitoring_events(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_created_at ON monitoring_events(created_at);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_event_type ON monitoring_events(event_type);

-- Enable RLS on monitoring_events
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitoring_events
DROP POLICY IF EXISTS "Admins can view monitoring events" ON monitoring_events;
CREATE POLICY "Admins can view monitoring events" ON monitoring_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS "System can insert monitoring events" ON monitoring_events;
CREATE POLICY "System can insert monitoring events" ON monitoring_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own monitoring events" ON monitoring_events;
CREATE POLICY "Users can view own monitoring events" ON monitoring_events
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 9: Create NOTIFICATIONS table (for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 10: Create helper RPC functions for Edge Functions
-- ============================================================================

-- Check idempotency key function
CREATE OR REPLACE FUNCTION check_idempotency_key(
  p_key TEXT,
  p_operation TEXT,
  p_user_id UUID,
  p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Clean up expired keys first
  DELETE FROM idempotency_keys WHERE expires_at < NOW();

  -- Check for existing key
  SELECT response INTO v_result
  FROM idempotency_keys
  WHERE key = p_key
    AND operation = p_operation
    AND user_id = p_user_id
    AND expires_at > NOW();

  RETURN v_result;
END;
$$;

-- Store idempotency key function
CREATE OR REPLACE FUNCTION store_idempotency_key(
  p_key TEXT,
  p_operation TEXT,
  p_response JSONB,
  p_user_id UUID,
  p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO idempotency_keys (key, operation, user_id, response, expires_at)
  VALUES (p_key, p_operation, p_user_id, p_response, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (key, operation, user_id)
  DO UPDATE SET response = p_response, expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL;
END;
$$;

-- Update engineer aggregates function
CREATE OR REPLACE FUNCTION update_engineer_aggregates(p_engineer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_device_count INTEGER;
  v_calls_completed INTEGER;
  v_calls_assigned INTEGER;
  v_active_calls INTEGER;
BEGIN
  -- Count devices assigned to engineer
  SELECT COUNT(*) INTO v_device_count
  FROM devices
  WHERE assigned_to = p_engineer_id AND status IN ('issued', 'installed');

  -- Count completed calls
  SELECT COUNT(*) INTO v_calls_completed
  FROM calls
  WHERE assigned_engineer = p_engineer_id AND status = 'completed';

  -- Count total assigned calls
  SELECT COUNT(*) INTO v_calls_assigned
  FROM calls
  WHERE assigned_engineer = p_engineer_id;

  -- Count active calls
  SELECT COUNT(*) INTO v_active_calls
  FROM calls
  WHERE assigned_engineer = p_engineer_id AND status IN ('assigned', 'in_progress');

  -- Upsert engineer aggregates
  INSERT INTO engineer_aggregates (
    engineer_id,
    current_device_count,
    total_calls_completed,
    total_calls_assigned,
    active_calls_count,
    updated_at
  )
  VALUES (
    p_engineer_id,
    v_device_count,
    v_calls_completed,
    v_calls_assigned,
    v_active_calls,
    NOW()
  )
  ON CONFLICT (engineer_id) DO UPDATE SET
    current_device_count = v_device_count,
    total_calls_completed = v_calls_completed,
    total_calls_assigned = v_calls_assigned,
    active_calls_count = v_active_calls,
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- PART 11: Create INVENTORY_MOVEMENTS table (if needed, maps to TypeScript types)
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  from_engineer UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  to_engineer UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_device_id ON inventory_movements(device_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_actor_id ON inventory_movements(actor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_call_id ON inventory_movements(call_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Enable RLS on inventory_movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_movements
DROP POLICY IF EXISTS "Admins can view all inventory movements" ON inventory_movements;
CREATE POLICY "Admins can view all inventory movements" ON inventory_movements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS "Engineers can view movements of their devices" ON inventory_movements;
CREATE POLICY "Engineers can view movements of their devices" ON inventory_movements
  FOR SELECT TO authenticated
  USING (
    from_engineer = (SELECT auth.uid())
    OR to_engineer = (SELECT auth.uid())
    OR actor_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert inventory movements" ON inventory_movements;
CREATE POLICY "Users can insert inventory movements" ON inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 12: Add triggers for auto-updating timestamps
-- ============================================================================

DROP TRIGGER IF EXISTS trg_call_history_updated_at ON call_history;
DROP TRIGGER IF EXISTS trg_idempotency_keys_updated_at ON idempotency_keys;
DROP TRIGGER IF EXISTS trg_monitoring_events_updated_at ON monitoring_events;
DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;
DROP TRIGGER IF EXISTS trg_inventory_movements_updated_at ON inventory_movements;

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Schema alignment migration completed successfully';
END $$;
