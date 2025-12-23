/*
  # Add Call Enhancements for SLA Tracking

  ## Overview
  Enhances the calls table with SLA tracking, problem codes, and additional
  metadata fields for better call management and reporting.

  ## New Columns
  - old_serial_number: Previous device serial (for swaps)
  - old_sim_number: Previous SIM number
  - new_sim_number: New SIM number
  - visit_count: Number of visits for this call
  - problem_code: Reference to problem_codes table
  - sla_hours: SLA duration in hours
  - sla_due_date: Computed SLA deadline
  - system_sync_date: Date synced with external system
  - ageing_days: Days since call creation (computed)
  - is_overdue: Whether call is past SLA (computed)
  - todays_poa_date: Date added to Today's POA
  - action_taken: Engineer's action notes
  - distance_covered: Distance traveled for this call

  ## Features
  - Auto-calculation of sla_due_date based on sla_hours
  - Computed ageing_days and is_overdue fields
  - Indexes for performance optimization
*/

-- =====================================================
-- ADD NEW COLUMNS TO CALLS TABLE
-- =====================================================

-- Serial number tracking for swaps
ALTER TABLE calls ADD COLUMN IF NOT EXISTS old_serial_number varchar(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS old_sim_number varchar(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS new_sim_number varchar(50);

-- Visit and problem tracking
ALTER TABLE calls ADD COLUMN IF NOT EXISTS visit_count integer DEFAULT 1;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS problem_code varchar(50);

-- SLA tracking
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sla_hours integer;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sla_due_date timestamptz;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS system_sync_date timestamptz;

-- Today's POA fields
ALTER TABLE calls ADD COLUMN IF NOT EXISTS todays_poa_date date;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS action_taken text;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS distance_covered decimal(10,2) DEFAULT 0;

-- =====================================================
-- CREATE FUNCTION FOR SLA DUE DATE CALCULATION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_sla_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate SLA due date based on sla_hours
  IF NEW.sla_hours IS NOT NULL THEN
    -- Use created_at for new records, or recalculate if sla_hours changed
    IF TG_OP = 'INSERT' THEN
      NEW.sla_due_date := COALESCE(NEW.created_at, now()) + (NEW.sla_hours || ' hours')::INTERVAL;
    ELSIF OLD.sla_hours IS DISTINCT FROM NEW.sla_hours THEN
      -- Recalculate based on original created_at
      NEW.sla_due_date := NEW.created_at + (NEW.sla_hours || ' hours')::INTERVAL;
    END IF;
  ELSIF NEW.sla_hours IS NULL THEN
    NEW.sla_due_date := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for SLA calculation
DROP TRIGGER IF EXISTS trigger_calculate_sla ON calls;
CREATE TRIGGER trigger_calculate_sla
  BEFORE INSERT OR UPDATE OF sla_hours ON calls
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sla_due_date();

-- =====================================================
-- CREATE VIEW FOR COMPUTED FIELDS
-- =====================================================

-- Create a view that includes computed ageing and overdue status
CREATE OR REPLACE VIEW calls_with_sla AS
SELECT
  c.*,
  EXTRACT(DAY FROM (now() - c.created_at))::INTEGER AS ageing_days,
  CASE
    WHEN c.sla_due_date IS NOT NULL
      AND c.sla_due_date < now()
      AND c.status NOT IN ('completed', 'cancelled')
    THEN true
    ELSE false
  END AS is_overdue,
  CASE
    WHEN c.sla_due_date IS NULL THEN NULL
    WHEN c.status IN ('completed', 'cancelled') THEN NULL
    WHEN c.sla_due_date < now() THEN
      -1 * EXTRACT(EPOCH FROM (now() - c.sla_due_date)) / 3600
    ELSE
      EXTRACT(EPOCH FROM (c.sla_due_date - now())) / 3600
  END AS hours_remaining
FROM calls c;

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_calls_sla_due_date
  ON calls(sla_due_date)
  WHERE status NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_calls_problem_code
  ON calls(problem_code);

CREATE INDEX IF NOT EXISTS idx_calls_created_at
  ON calls(created_at);

CREATE INDEX IF NOT EXISTS idx_calls_poa_date
  ON calls(assigned_engineer, todays_poa_date);

CREATE INDEX IF NOT EXISTS idx_calls_visit_count
  ON calls(visit_count)
  WHERE visit_count > 1;

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINT (optional, soft reference)
-- =====================================================

-- Note: We use a soft reference to allow flexibility
-- Uncomment below for strict enforcement:
-- ALTER TABLE calls ADD CONSTRAINT fk_calls_problem_code
--   FOREIGN KEY (problem_code) REFERENCES problem_codes(code) ON DELETE SET NULL;

-- =====================================================
-- HELPER FUNCTION: GET OVERDUE CALLS
-- =====================================================

CREATE OR REPLACE FUNCTION get_overdue_calls()
RETURNS TABLE (
  id uuid,
  call_number text,
  client_name text,
  sla_due_date timestamptz,
  hours_overdue numeric,
  assigned_engineer uuid,
  problem_code varchar
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.call_number,
    c.client_name,
    c.sla_due_date,
    EXTRACT(EPOCH FROM (now() - c.sla_due_date)) / 3600 AS hours_overdue,
    c.assigned_engineer,
    c.problem_code
  FROM calls c
  WHERE c.sla_due_date < now()
    AND c.status NOT IN ('completed', 'cancelled')
  ORDER BY c.sla_due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: GET SLA SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION get_sla_summary()
RETURNS TABLE (
  total_calls bigint,
  within_sla bigint,
  approaching_sla bigint,
  overdue bigint,
  no_sla bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_calls,
    COUNT(*) FILTER (
      WHERE sla_due_date IS NOT NULL
        AND sla_due_date > now() + interval '4 hours'
        AND status NOT IN ('completed', 'cancelled')
    )::bigint AS within_sla,
    COUNT(*) FILTER (
      WHERE sla_due_date IS NOT NULL
        AND sla_due_date <= now() + interval '4 hours'
        AND sla_due_date > now()
        AND status NOT IN ('completed', 'cancelled')
    )::bigint AS approaching_sla,
    COUNT(*) FILTER (
      WHERE sla_due_date IS NOT NULL
        AND sla_due_date < now()
        AND status NOT IN ('completed', 'cancelled')
    )::bigint AS overdue,
    COUNT(*) FILTER (
      WHERE sla_due_date IS NULL
        AND status NOT IN ('completed', 'cancelled')
    )::bigint AS no_sla
  FROM calls
  WHERE status NOT IN ('completed', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN calls.old_serial_number IS 'Previous device serial number (for swaps)';
COMMENT ON COLUMN calls.old_sim_number IS 'Previous SIM number';
COMMENT ON COLUMN calls.new_sim_number IS 'New SIM number after swap';
COMMENT ON COLUMN calls.visit_count IS 'Number of engineer visits for this call';
COMMENT ON COLUMN calls.problem_code IS 'Reference to problem_codes table';
COMMENT ON COLUMN calls.sla_hours IS 'SLA duration in hours from call creation';
COMMENT ON COLUMN calls.sla_due_date IS 'Computed SLA deadline (auto-calculated)';
COMMENT ON COLUMN calls.system_sync_date IS 'Date when synced with external system';
COMMENT ON COLUMN calls.todays_poa_date IS 'Date when added to Today''s Plan of Action';
COMMENT ON COLUMN calls.action_taken IS 'Engineer''s notes on action taken';
COMMENT ON COLUMN calls.distance_covered IS 'Distance traveled for this call in km';

COMMENT ON VIEW calls_with_sla IS 'View with computed SLA fields (ageing_days, is_overdue, hours_remaining)';
COMMENT ON FUNCTION calculate_sla_due_date IS 'Trigger function to auto-calculate SLA due date';
COMMENT ON FUNCTION get_overdue_calls IS 'Get all calls that have exceeded their SLA';
COMMENT ON FUNCTION get_sla_summary IS 'Get summary counts of SLA status across all active calls';

-- =====================================================
-- ROLLBACK SCRIPT (commented)
-- =====================================================
/*
  -- To rollback this migration:
  DROP VIEW IF EXISTS calls_with_sla;
  DROP FUNCTION IF EXISTS calculate_sla_due_date();
  DROP FUNCTION IF EXISTS get_overdue_calls();
  DROP FUNCTION IF EXISTS get_sla_summary();
  DROP TRIGGER IF EXISTS trigger_calculate_sla ON calls;

  ALTER TABLE calls DROP COLUMN IF EXISTS old_serial_number;
  ALTER TABLE calls DROP COLUMN IF EXISTS old_sim_number;
  ALTER TABLE calls DROP COLUMN IF EXISTS new_sim_number;
  ALTER TABLE calls DROP COLUMN IF EXISTS visit_count;
  ALTER TABLE calls DROP COLUMN IF EXISTS problem_code;
  ALTER TABLE calls DROP COLUMN IF EXISTS sla_hours;
  ALTER TABLE calls DROP COLUMN IF EXISTS sla_due_date;
  ALTER TABLE calls DROP COLUMN IF EXISTS system_sync_date;
  ALTER TABLE calls DROP COLUMN IF EXISTS todays_poa_date;
  ALTER TABLE calls DROP COLUMN IF EXISTS action_taken;
  ALTER TABLE calls DROP COLUMN IF EXISTS distance_covered;

  DROP INDEX IF EXISTS idx_calls_sla_due_date;
  DROP INDEX IF EXISTS idx_calls_problem_code;
  DROP INDEX IF EXISTS idx_calls_created_at;
  DROP INDEX IF EXISTS idx_calls_poa_date;
  DROP INDEX IF EXISTS idx_calls_visit_count;
*/
