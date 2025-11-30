/*
  # Security Fixes and Performance Optimization

  This migration addresses critical security and performance issues identified by Supabase linter:

  ## 1. Missing Indexes on Foreign Keys
    - devices.updated_by
    - photos.duplicate_of
    - stock_alerts.acknowledged_by
    - stock_alerts.resolved_by

  ## 2. RLS Policy Performance Optimization
    - Wrap auth.uid() calls with (SELECT auth.uid()) to avoid re-evaluation per row
    - Affects 23 policies across multiple tables

  ## 3. Duplicate Indexes
    - Remove duplicate indexes on calls.call_number, devices.serial_number, user_profiles.email

  ## 4. Missing RLS Policies
    - Add policies for idempotency_keys and monitoring_events tables

  ## 5. Function Security
    - Set SECURITY DEFINER and fixed search_path for all helper functions
*/

-- ============================================================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_devices_updated_by 
  ON devices(updated_by) 
  WHERE updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_photos_duplicate_of 
  ON photos(duplicate_of) 
  WHERE duplicate_of IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_alerts_acknowledged_by 
  ON stock_alerts(acknowledged_by) 
  WHERE acknowledged_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved_by 
  ON stock_alerts(resolved_by) 
  WHERE resolved_by IS NOT NULL;

-- ============================================================================
-- PART 2: Remove Duplicate Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_calls_number;
DROP INDEX IF EXISTS idx_devices_serial;
DROP INDEX IF EXISTS idx_profiles_email;

-- ============================================================================
-- PART 3: Optimize RLS Policies - Replace auth.uid() with (SELECT auth.uid())
-- ============================================================================

-- user_profiles policies
DROP POLICY IF EXISTS "Users can always view own profile" ON user_profiles;
CREATE POLICY "Users can always view own profile"
  ON user_profiles FOR SELECT
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "First-time users can create own profile" ON user_profiles;
CREATE POLICY "First-time users can create own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (
    (id = (SELECT auth.uid())) 
    AND (role = 'engineer'::user_role) 
    AND (status = 'pending_approval'::account_status)
  );

DROP POLICY IF EXISTS "Users can update own non-critical fields" ON user_profiles;
CREATE POLICY "Users can update own non-critical fields"
  ON user_profiles FOR UPDATE
  USING (
    (id = (SELECT auth.uid())) 
    AND (role = (SELECT role FROM user_profiles WHERE id = (SELECT auth.uid())))
  )
  WITH CHECK (
    (id = (SELECT auth.uid())) 
    AND (role = (SELECT role FROM user_profiles WHERE id = (SELECT auth.uid())))
    AND (status = (SELECT status FROM user_profiles WHERE id = (SELECT auth.uid())))
    AND (bank_id = (SELECT bank_id FROM user_profiles WHERE id = (SELECT auth.uid())))
  );

-- calls policies
DROP POLICY IF EXISTS "Active engineers can view assigned and pending calls" ON calls;
CREATE POLICY "Active engineers can view assigned and pending calls"
  ON calls FOR SELECT
  USING (
    (NOT is_admin()) 
    AND is_user_active() 
    AND (
      (assigned_engineer = (SELECT auth.uid())) 
      OR ((status = 'pending'::text) AND (client_bank = get_user_bank()))
    )
  );

DROP POLICY IF EXISTS "Active engineers can update assigned call status" ON calls;
CREATE POLICY "Active engineers can update assigned call status"
  ON calls FOR UPDATE
  USING (
    (NOT is_admin()) 
    AND is_user_active() 
    AND (assigned_engineer = (SELECT auth.uid()))
  )
  WITH CHECK (
    (NOT is_admin()) 
    AND is_user_active() 
    AND (assigned_engineer = (SELECT auth.uid()))
    AND (assigned_engineer = (SELECT assigned_engineer FROM calls WHERE id = calls.id))
    AND (client_bank = (SELECT client_bank FROM calls WHERE id = calls.id))
  );

-- devices policies
DROP POLICY IF EXISTS "Engineers can view devices in their bank or assigned to them" ON devices;
CREATE POLICY "Engineers can view devices in their bank or assigned to them"
  ON devices FOR SELECT
  USING (
    (NOT is_admin()) 
    AND (
      (device_bank = get_user_bank()) 
      OR (assigned_to = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Active engineers can mark assigned devices as faulty" ON devices;
CREATE POLICY "Active engineers can mark assigned devices as faulty"
  ON devices FOR UPDATE
  USING (
    (NOT is_admin()) 
    AND is_user_active() 
    AND (assigned_to = (SELECT auth.uid()))
    AND (status <> 'faulty'::text)
  )
  WITH CHECK (
    (NOT is_admin()) 
    AND is_user_active() 
    AND (assigned_to = (SELECT auth.uid()))
    AND (status = 'faulty'::text)
  );

-- photos policies
DROP POLICY IF EXISTS "Engineers can view their photos and assigned device photos" ON photos;
CREATE POLICY "Engineers can view their photos and assigned device photos"
  ON photos FOR SELECT
  USING (
    (NOT is_admin()) 
    AND (
      (uploaded_by = (SELECT auth.uid()))
      OR (EXISTS (
        SELECT 1 FROM devices 
        WHERE devices.id = photos.device_id 
          AND devices.assigned_to = (SELECT auth.uid())
      ))
      OR (EXISTS (
        SELECT 1 FROM calls 
        WHERE calls.id = photos.call_id 
          AND calls.assigned_engineer = (SELECT auth.uid())
      ))
    )
  );

DROP POLICY IF EXISTS "Engineers can upload photos for assigned devices" ON photos;
CREATE POLICY "Engineers can upload photos for assigned devices"
  ON photos FOR INSERT
  WITH CHECK (
    (uploaded_by = (SELECT auth.uid()))
    AND (
      (EXISTS (
        SELECT 1 FROM devices 
        WHERE devices.id = photos.device_id 
          AND devices.assigned_to = (SELECT auth.uid())
      ))
      OR (EXISTS (
        SELECT 1 FROM calls 
        WHERE calls.id = photos.call_id 
          AND calls.assigned_engineer = (SELECT auth.uid())
      ))
    )
  );

DROP POLICY IF EXISTS "Uploaders can update photo caption" ON photos;
CREATE POLICY "Uploaders can update photo caption"
  ON photos FOR UPDATE
  USING (uploaded_by = (SELECT auth.uid()))
  WITH CHECK (
    (uploaded_by = (SELECT auth.uid()))
    AND (storage_path = (SELECT storage_path FROM photos WHERE id = photos.id))
  );

DROP POLICY IF EXISTS "Uploaders can delete own photos within 24 hours" ON photos;
CREATE POLICY "Uploaders can delete own photos within 24 hours"
  ON photos FOR DELETE
  USING (
    (uploaded_by = (SELECT auth.uid()))
    AND (created_at > (now() - '24:00:00'::interval))
  );

-- stock_movements policies
DROP POLICY IF EXISTS "Engineers can view relevant stock movements" ON stock_movements;
CREATE POLICY "Engineers can view relevant stock movements"
  ON stock_movements FOR SELECT
  USING (
    (NOT is_admin()) 
    AND is_user_active() 
    AND (
      (from_engineer = (SELECT auth.uid()))
      OR (to_engineer = (SELECT auth.uid()))
      OR (actor_id = (SELECT auth.uid()))
      OR (EXISTS (
        SELECT 1 FROM devices 
        WHERE devices.id = stock_movements.device_id 
          AND devices.assigned_to = (SELECT auth.uid())
      ))
    )
  );

DROP POLICY IF EXISTS "Users can create stock movements" ON stock_movements;
CREATE POLICY "Users can create stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (actor_id = (SELECT auth.uid()));

-- engineer_aggregates policies
DROP POLICY IF EXISTS "Engineers can view own aggregates" ON engineer_aggregates;
CREATE POLICY "Engineers can view own aggregates"
  ON engineer_aggregates FOR SELECT
  USING (
    (NOT is_admin()) 
    AND (engineer_id = (SELECT auth.uid()))
  );

-- stock_alerts policies
DROP POLICY IF EXISTS "Engineers can view relevant alerts" ON stock_alerts;
CREATE POLICY "Engineers can view relevant alerts"
  ON stock_alerts FOR SELECT
  USING (
    (NOT is_admin()) 
    AND (
      (engineer_id = (SELECT auth.uid()))
      OR (EXISTS (
        SELECT 1 FROM calls 
        WHERE calls.id = stock_alerts.call_id 
          AND calls.assigned_engineer = (SELECT auth.uid())
      ))
      OR (EXISTS (
        SELECT 1 FROM devices 
        WHERE devices.id = stock_alerts.device_id 
          AND devices.assigned_to = (SELECT auth.uid())
      ))
    )
  );

DROP POLICY IF EXISTS "Engineers can acknowledge alerts" ON stock_alerts;
CREATE POLICY "Engineers can acknowledge alerts"
  ON stock_alerts FOR UPDATE
  USING (
    (NOT is_admin()) 
    AND is_user_active() 
    AND (
      (engineer_id = (SELECT auth.uid()))
      OR (EXISTS (
        SELECT 1 FROM calls 
        WHERE calls.id = stock_alerts.call_id 
          AND calls.assigned_engineer = (SELECT auth.uid())
      ))
    )
  )
  WITH CHECK (
    (acknowledged_by = (SELECT auth.uid())) 
    OR (resolved_by = (SELECT auth.uid()))
  );

-- call_devices policies (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'call_devices' 
      AND policyname = 'Engineers can view call devices for their calls'
  ) THEN
    DROP POLICY "Engineers can view call devices for their calls" ON call_devices;
    CREATE POLICY "Engineers can view call devices for their calls"
      ON call_devices FOR SELECT
      USING (
        (NOT is_admin())
        AND (EXISTS (
          SELECT 1 FROM calls 
          WHERE calls.id = call_devices.call_id 
            AND calls.assigned_engineer = (SELECT auth.uid())
        ))
      );
  END IF;
END $$;

-- inventory_movements policies (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_movements' 
      AND policyname = 'Engineers can view movements of their devices'
  ) THEN
    DROP POLICY "Engineers can view movements of their devices" ON inventory_movements;
    CREATE POLICY "Engineers can view movements of their devices"
      ON inventory_movements FOR SELECT
      USING (
        (NOT is_admin())
        AND (
          (from_engineer = (SELECT auth.uid()))
          OR (to_engineer = (SELECT auth.uid()))
        )
      );
  END IF;
END $$;

-- call_history policies (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'call_history' 
      AND policyname = 'Engineers can view history of their calls'
  ) THEN
    DROP POLICY "Engineers can view history of their calls" ON call_history;
    CREATE POLICY "Engineers can view history of their calls"
      ON call_history FOR SELECT
      USING (
        (NOT is_admin())
        AND (EXISTS (
          SELECT 1 FROM calls 
          WHERE calls.id = call_history.call_id 
            AND calls.assigned_engineer = (SELECT auth.uid())
        ))
      );
  END IF;
END $$;

-- notifications policies (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
      AND policyname = 'Users can view their own notifications'
  ) THEN
    DROP POLICY "Users can view their own notifications" ON notifications;
    CREATE POLICY "Users can view their own notifications"
      ON notifications FOR SELECT
      USING (user_id = (SELECT auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
      AND policyname = 'Users can update their own notifications'
  ) THEN
    DROP POLICY "Users can update their own notifications" ON notifications;
    CREATE POLICY "Users can update their own notifications"
      ON notifications FOR UPDATE
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
      AND policyname = 'Users can delete their own notifications'
  ) THEN
    DROP POLICY "Users can delete their own notifications" ON notifications;
    CREATE POLICY "Users can delete their own notifications"
      ON notifications FOR DELETE
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- PART 4: Add Missing RLS Policies for idempotency_keys and monitoring_events
-- ============================================================================

-- idempotency_keys: Only the user who created the key can see it
CREATE POLICY "Users can view own idempotency keys"
  ON idempotency_keys FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own idempotency keys"
  ON idempotency_keys FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all idempotency keys"
  ON idempotency_keys FOR SELECT
  USING (is_admin());

-- monitoring_events: System table - only admins and system can access
CREATE POLICY "Admins can view monitoring events"
  ON monitoring_events FOR SELECT
  USING (is_admin());

CREATE POLICY "System can insert monitoring events"
  ON monitoring_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own monitoring events"
  ON monitoring_events FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 5: Fix Function Security - Set SECURITY DEFINER with fixed search_path
-- ============================================================================

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (SELECT role FROM user_profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (SELECT role = 'admin' FROM user_profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION get_user_status()
RETURNS account_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (SELECT status FROM user_profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION is_user_active()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (
    SELECT status = 'active' AND active = true 
    FROM user_profiles 
    WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_user_bank()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (SELECT bank_id FROM user_profiles WHERE id = auth.uid());
END;
$$;
