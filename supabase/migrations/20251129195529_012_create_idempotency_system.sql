/*
  # Create Idempotency System for Edge Functions

  1. New Tables
    - `idempotency_keys`
      - Stores idempotency keys for operation deduplication
      - Prevents duplicate processing of retried requests
      - Auto-expires after configured TTL

  2. Security
    - Enable RLS on idempotency_keys
    - Only service role can access (Edge Functions only)

  3. Indexes
    - Primary key on id
    - Unique index on key (hash)
    - Index on expires_at for cleanup
*/

-- Create idempotency_keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  operation text NOT NULL,
  response jsonb NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_attempted_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_id ON idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_operation ON idempotency_keys(operation);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON idempotency_keys(created_at DESC);

-- Enable RLS (service role only)
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Function to clean up expired keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM idempotency_keys
  WHERE expires_at < now();
END;
$$;

-- Function to check and store idempotency key
CREATE OR REPLACE FUNCTION check_idempotency_key(
  p_key text,
  p_operation text,
  p_user_id uuid,
  p_ttl_seconds integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response jsonb;
BEGIN
  -- Try to find existing key
  SELECT response INTO v_response
  FROM idempotency_keys
  WHERE key = p_key
    AND expires_at > now();

  IF FOUND THEN
    -- Update last attempted timestamp
    UPDATE idempotency_keys
    SET last_attempted_at = now()
    WHERE key = p_key;
    
    RETURN v_response;
  END IF;

  -- Key not found or expired, return null
  RETURN NULL;
END;
$$;

-- Function to store idempotency key result
CREATE OR REPLACE FUNCTION store_idempotency_key(
  p_key text,
  p_operation text,
  p_response jsonb,
  p_user_id uuid,
  p_ttl_seconds integer DEFAULT 300
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO idempotency_keys (key, operation, response, user_id, expires_at)
  VALUES (
    p_key,
    p_operation,
    p_response,
    p_user_id,
    now() + (p_ttl_seconds || ' seconds')::interval
  )
  ON CONFLICT (key) DO UPDATE
  SET 
    response = EXCLUDED.response,
    last_attempted_at = now();
END;
$$;

-- Create monitoring events table for observability
CREATE TABLE IF NOT EXISTS monitoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_name text NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  severity text DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for monitoring events
CREATE INDEX IF NOT EXISTS idx_monitoring_events_event_name ON monitoring_events(event_name);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_event_type ON monitoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_created_at ON monitoring_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_severity ON monitoring_events(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_user_id ON monitoring_events(user_id);

-- Enable RLS for monitoring events
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;

-- Function to emit monitoring event
CREATE OR REPLACE FUNCTION emit_monitoring_event(
  p_event_type text,
  p_event_name text,
  p_user_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO monitoring_events (
    event_type,
    event_name,
    user_id,
    entity_type,
    entity_id,
    metadata,
    severity
  )
  VALUES (
    p_event_type,
    p_event_name,
    p_user_id,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_severity
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Function to get recent events for monitoring dashboard
CREATE OR REPLACE FUNCTION get_recent_monitoring_events(
  p_event_type text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  event_type text,
  event_name text,
  user_id uuid,
  user_name text,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  severity text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    me.id,
    me.event_type,
    me.event_name,
    me.user_id,
    up.full_name as user_name,
    me.entity_type,
    me.entity_id,
    me.metadata,
    me.severity,
    me.created_at
  FROM monitoring_events me
  LEFT JOIN user_profiles up ON me.user_id = up.id
  WHERE 
    (p_event_type IS NULL OR me.event_type = p_event_type)
    AND (p_severity IS NULL OR me.severity = p_severity)
  ORDER BY me.created_at DESC
  LIMIT p_limit;
END;
$$;
