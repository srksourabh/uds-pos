/*
  # Create Engineer Aggregates Table

  ## Overview
  Pre-computed performance metrics and statistics for engineers, updated
  periodically for fast dashboard queries and performance analytics.

  ## New Table: engineer_aggregates
  Stores time-based aggregations including:
  - Call completion statistics
  - Average resolution times
  - Device installation counts
  - Performance scores
  - Detailed breakdowns in JSONB (by type, priority, bank)

  ## Aggregation Periods
  - daily: Daily statistics
  - weekly: Weekly rollups
  - monthly: Monthly performance
  - quarterly: Quarterly reviews
  - yearly: Annual summaries
  - all_time: Lifetime statistics

  ## Update Strategy
  - Computed by scheduled Edge Function or cron job
  - Can be recomputed as needed
  - Eventually consistent (not real-time)

  ## Security
  - Admins can view all aggregates
  - Engineers can view only their own aggregates
*/

-- Create period type enum
DO $$ BEGIN
  CREATE TYPE aggregate_period_type AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'yearly',
    'all_time'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create engineer_aggregates table
CREATE TABLE IF NOT EXISTS engineer_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  period_type aggregate_period_type NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Call statistics
  total_calls_assigned integer NOT NULL DEFAULT 0,
  total_calls_completed integer NOT NULL DEFAULT 0,
  total_calls_cancelled integer NOT NULL DEFAULT 0,
  total_calls_in_progress integer NOT NULL DEFAULT 0,
  
  -- Performance metrics
  completion_rate numeric(5,2),
  average_resolution_time_minutes integer,
  on_time_completion_rate numeric(5,2),
  
  -- Device statistics
  total_devices_installed integer DEFAULT 0,
  total_devices_swapped integer DEFAULT 0,
  total_devices_deinstalled integer DEFAULT 0,
  
  -- Distance tracking
  total_distance_traveled_km numeric(10,2),
  
  -- Detailed breakdowns (JSONB)
  calls_by_type jsonb DEFAULT '{}'::jsonb,
  calls_by_priority jsonb DEFAULT '{}'::jsonb,
  calls_by_bank jsonb DEFAULT '{}'::jsonb,
  
  -- Overall scores
  performance_score numeric(5,2),
  customer_satisfaction_avg numeric(3,2),
  
  -- Photo documentation
  total_photos_uploaded integer DEFAULT 0,
  
  -- Flexible metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure no duplicate periods for same engineer
  CONSTRAINT unique_engineer_period UNIQUE (engineer_id, period_type, period_start)
);

-- Enable RLS
ALTER TABLE engineer_aggregates ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_engineer_aggregates_engineer ON engineer_aggregates(engineer_id);
CREATE INDEX IF NOT EXISTS idx_engineer_aggregates_period_type ON engineer_aggregates(period_type);
CREATE INDEX IF NOT EXISTS idx_engineer_aggregates_period_start ON engineer_aggregates(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_engineer_aggregates_performance ON engineer_aggregates(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_engineer_aggregates_completion_rate ON engineer_aggregates(completion_rate DESC);
CREATE INDEX IF NOT EXISTS idx_engineer_aggregates_engineer_period ON engineer_aggregates(engineer_id, period_type, period_start);

-- Check constraint for valid completion rate
ALTER TABLE engineer_aggregates
  ADD CONSTRAINT valid_completion_rate CHECK (
    completion_rate IS NULL OR (completion_rate >= 0 AND completion_rate <= 100)
  );

-- Check constraint for valid period dates
ALTER TABLE engineer_aggregates
  ADD CONSTRAINT valid_period_dates CHECK (period_end >= period_start);

-- Check constraint for valid performance score
ALTER TABLE engineer_aggregates
  ADD CONSTRAINT valid_performance_score CHECK (
    performance_score IS NULL OR (performance_score >= 0 AND performance_score <= 100)
  );

-- RLS Policies

-- Admins can view all aggregates
CREATE POLICY "Admins can view all engineer aggregates"
  ON engineer_aggregates FOR SELECT
  TO authenticated
  USING (is_admin() AND is_user_active());

-- Engineers can view their own aggregates
CREATE POLICY "Engineers can view own aggregates"
  ON engineer_aggregates FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND
    is_user_active() AND
    engineer_id = auth.uid()
  );

-- Admins can insert/update aggregates (for recomputation)
CREATE POLICY "Admins can manage aggregates"
  ON engineer_aggregates FOR ALL
  TO authenticated
  USING (is_admin() AND is_user_active())
  WITH CHECK (is_admin() AND is_user_active());

-- Function to calculate engineer aggregates for a period
CREATE OR REPLACE FUNCTION calculate_engineer_aggregates(
  p_engineer_id uuid,
  p_period_start date,
  p_period_end date,
  p_period_type aggregate_period_type
)
RETURNS void AS $$
DECLARE
  v_total_assigned integer;
  v_total_completed integer;
  v_total_cancelled integer;
  v_total_in_progress integer;
  v_avg_resolution_minutes numeric;
  v_completion_rate numeric;
  v_calls_by_type jsonb;
  v_calls_by_priority jsonb;
  v_calls_by_bank jsonb;
  v_total_photos integer;
BEGIN
  -- Calculate call statistics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'in_progress'),
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL)
  INTO
    v_total_assigned,
    v_total_completed,
    v_total_cancelled,
    v_total_in_progress,
    v_avg_resolution_minutes
  FROM calls
  WHERE assigned_engineer = p_engineer_id
    AND created_at::date BETWEEN p_period_start AND p_period_end;
  
  -- Calculate completion rate
  IF v_total_assigned > 0 THEN
    v_completion_rate := (v_total_completed::numeric / v_total_assigned::numeric) * 100;
  ELSE
    v_completion_rate := NULL;
  END IF;
  
  -- Aggregate calls by type
  SELECT jsonb_object_agg(type, count)
  INTO v_calls_by_type
  FROM (
    SELECT type, COUNT(*) as count
    FROM calls
    WHERE assigned_engineer = p_engineer_id
      AND created_at::date BETWEEN p_period_start AND p_period_end
    GROUP BY type
  ) t;
  
  -- Aggregate calls by priority
  SELECT jsonb_object_agg(priority, count)
  INTO v_calls_by_priority
  FROM (
    SELECT priority, COUNT(*) as count
    FROM calls
    WHERE assigned_engineer = p_engineer_id
      AND created_at::date BETWEEN p_period_start AND p_period_end
    GROUP BY priority
  ) t;
  
  -- Aggregate calls by bank
  SELECT jsonb_object_agg(client_bank::text, count)
  INTO v_calls_by_bank
  FROM (
    SELECT client_bank, COUNT(*) as count
    FROM calls
    WHERE assigned_engineer = p_engineer_id
      AND created_at::date BETWEEN p_period_start AND p_period_end
    GROUP BY client_bank
  ) t;
  
  -- Count photos uploaded
  SELECT COUNT(*)
  INTO v_total_photos
  FROM photos
  WHERE uploaded_by = p_engineer_id
    AND created_at::date BETWEEN p_period_start AND p_period_end;
  
  -- Insert or update aggregate record
  INSERT INTO engineer_aggregates (
    engineer_id,
    period_type,
    period_start,
    period_end,
    total_calls_assigned,
    total_calls_completed,
    total_calls_cancelled,
    total_calls_in_progress,
    completion_rate,
    average_resolution_time_minutes,
    calls_by_type,
    calls_by_priority,
    calls_by_bank,
    total_photos_uploaded,
    last_calculated_at
  ) VALUES (
    p_engineer_id,
    p_period_type,
    p_period_start,
    p_period_end,
    COALESCE(v_total_assigned, 0),
    COALESCE(v_total_completed, 0),
    COALESCE(v_total_cancelled, 0),
    COALESCE(v_total_in_progress, 0),
    v_completion_rate,
    v_avg_resolution_minutes::integer,
    COALESCE(v_calls_by_type, '{}'::jsonb),
    COALESCE(v_calls_by_priority, '{}'::jsonb),
    COALESCE(v_calls_by_bank, '{}'::jsonb),
    COALESCE(v_total_photos, 0),
    now()
  )
  ON CONFLICT (engineer_id, period_type, period_start)
  DO UPDATE SET
    total_calls_assigned = EXCLUDED.total_calls_assigned,
    total_calls_completed = EXCLUDED.total_calls_completed,
    total_calls_cancelled = EXCLUDED.total_calls_cancelled,
    total_calls_in_progress = EXCLUDED.total_calls_in_progress,
    completion_rate = EXCLUDED.completion_rate,
    average_resolution_time_minutes = EXCLUDED.average_resolution_time_minutes,
    calls_by_type = EXCLUDED.calls_by_type,
    calls_by_priority = EXCLUDED.calls_by_priority,
    calls_by_bank = EXCLUDED.calls_by_bank,
    total_photos_uploaded = EXCLUDED.total_photos_uploaded,
    last_calculated_at = EXCLUDED.last_calculated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;