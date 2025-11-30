/*
  # Create Assignment Algorithm Helper Functions

  ## Overview
  Database functions to support the intelligent call assignment algorithm with
  stock-aware validation and multi-factor scoring.

  ## Functions Created
  1. get_engineers_with_stock - Fetch engineers with stock counts by bank
  2. get_engineer_stock_count - Get stock count for specific engineer/bank
  3. calculate_engineer_workload - Get active call count for engineer
  4. assign_call_to_engineer - Atomic assignment with validation

  ## Security
  - SECURITY DEFINER to access all data
  - Called only by authenticated admin users
*/

-- Function to get engineers with stock counts for assignment algorithm
CREATE OR REPLACE FUNCTION get_engineers_with_stock(bank_ids uuid[])
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  bank_id uuid,
  region text,
  skills jsonb,
  status account_status,
  last_location_lat numeric,
  last_location_lng numeric,
  last_location_updated_at timestamptz,
  stock_count_by_bank jsonb,
  active_calls_count bigint,
  last_assignment_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.full_name,
    up.email,
    up.bank_id,
    up.region,
    up.skills,
    up.status,
    up.last_location_lat,
    up.last_location_lng,
    up.last_location_updated_at,
    COALESCE(
      (
        SELECT jsonb_object_agg(device_bank::text, count)
        FROM (
          SELECT device_bank, COUNT(*) as count
          FROM devices
          WHERE assigned_to = up.id
            AND status IN ('warehouse', 'issued')
            AND device_bank = ANY(bank_ids)
          GROUP BY device_bank
        ) stock_agg
      ),
      '{}'::jsonb
    ) as stock_count_by_bank,
    COALESCE(
      (
        SELECT COUNT(*)::bigint
        FROM calls
        WHERE assigned_engineer = up.id
          AND status IN ('assigned', 'in_progress')
      ),
      0
    ) as active_calls_count,
    (
      SELECT MAX(updated_at)
      FROM calls
      WHERE assigned_engineer = up.id
        AND status != 'pending'
    ) as last_assignment_at
  FROM user_profiles up
  WHERE up.role = 'engineer'
    AND up.status = 'active'
    AND up.bank_id = ANY(bank_ids)
  ORDER BY up.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get stock count for specific engineer and bank
CREATE OR REPLACE FUNCTION get_engineer_stock_count(
  p_engineer_id uuid,
  p_bank_id uuid
)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM devices
    WHERE assigned_to = p_engineer_id
      AND device_bank = p_bank_id
      AND status IN ('warehouse', 'issued')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to calculate current workload for engineer
CREATE OR REPLACE FUNCTION calculate_engineer_workload(p_engineer_id uuid)
RETURNS TABLE (
  active_calls integer,
  calls_today integer,
  avg_completion_time_minutes integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(CASE WHEN status IN ('assigned', 'in_progress') THEN 1 END)::integer as active_calls,
    COUNT(CASE WHEN scheduled_date = CURRENT_DATE THEN 1 END)::integer as calls_today,
    AVG(CASE WHEN actual_duration_minutes IS NOT NULL THEN actual_duration_minutes END)::integer as avg_completion_time_minutes
  FROM calls
  WHERE assigned_engineer = p_engineer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to perform atomic assignment with validation
CREATE OR REPLACE FUNCTION assign_call_to_engineer(
  p_call_id uuid,
  p_engineer_id uuid,
  p_actor_id uuid,
  p_reason text DEFAULT 'Auto-assigned via algorithm'
)
RETURNS jsonb AS $$
DECLARE
  v_call record;
  v_engineer record;
  v_stock_count integer;
  v_result jsonb;
BEGIN
  SELECT * INTO v_call
  FROM calls
  WHERE id = p_call_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Call not found'
    );
  END IF;
  
  IF v_call.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Call is not in pending status',
      'current_status', v_call.status
    );
  END IF;
  
  SELECT * INTO v_engineer
  FROM user_profiles
  WHERE id = p_engineer_id
    AND status = 'active'
    AND role = 'engineer'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Engineer not found or not active'
    );
  END IF;
  
  IF v_engineer.bank_id != v_call.client_bank THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bank mismatch',
      'engineer_bank', v_engineer.bank_id,
      'call_bank', v_call.client_bank
    );
  END IF;
  
  IF v_call.type IN ('install', 'swap') THEN
    v_stock_count := get_engineer_stock_count(p_engineer_id, v_call.client_bank);
    
    IF v_stock_count = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Insufficient stock',
        'stock_count', v_stock_count
      );
    END IF;
  END IF;
  
  UPDATE calls
  SET 
    assigned_engineer = p_engineer_id,
    status = 'assigned',
    updated_at = NOW()
  WHERE id = p_call_id;
  
  INSERT INTO call_history (call_id, from_status, to_status, actor_id, notes)
  VALUES (p_call_id, v_call.status, 'assigned', p_actor_id, p_reason);
  
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    p_engineer_id,
    'New Call Assigned',
    'You have been assigned call ' || v_call.call_number || ' for ' || v_call.client_name,
    'assignment',
    '/calls/' || p_call_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'call_id', p_call_id,
    'call_number', v_call.call_number,
    'engineer_id', p_engineer_id,
    'engineer_name', v_engineer.full_name,
    'assigned_at', NOW()
  );
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Call is currently being assigned by another process'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_engineers_with_stock IS 'Fetch all active engineers with stock counts by bank for assignment algorithm';
COMMENT ON FUNCTION get_engineer_stock_count IS 'Get available device count for specific engineer and bank';
COMMENT ON FUNCTION calculate_engineer_workload IS 'Calculate current workload statistics for an engineer';
COMMENT ON FUNCTION assign_call_to_engineer IS 'Atomically assign a call to an engineer with full validation';