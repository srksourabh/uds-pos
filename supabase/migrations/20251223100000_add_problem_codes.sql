/*
  # Add Problem Codes Table

  ## Overview
  Creates a problem_codes table to standardize issue categorization for calls.
  This enables better reporting and SLA tracking based on problem types.

  ## Tables Created
  - problem_codes: Master table for problem/issue codes

  ## Initial Data
  - 8 common problem codes with categories

  ## Security
  - SELECT: All authenticated users
  - INSERT/UPDATE/DELETE: Admin, Super Admin only
*/

-- =====================================================
-- CREATE PROBLEM CODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS problem_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) UNIQUE NOT NULL,
  description text NOT NULL,
  category varchar(100) NOT NULL,
  is_active boolean DEFAULT true,
  default_sla_hours integer DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_problem_codes_active ON problem_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_problem_codes_category ON problem_codes(category);
CREATE INDEX IF NOT EXISTS idx_problem_codes_code ON problem_codes(code);

-- =====================================================
-- INSERT COMMON PROBLEM CODES
-- =====================================================

INSERT INTO problem_codes (code, description, category, default_sla_hours) VALUES
  ('NO_POWER', 'Device not powering on', 'Hardware', 24),
  ('CONN_FAIL', 'Network/Connection failure', 'Network', 12),
  ('PAPER_JAM', 'Paper jam or printing issues', 'Hardware', 48),
  ('SW_ERROR', 'Software error or crash', 'Software', 24),
  ('CARD_READ', 'Card reading/swipe issues', 'Hardware', 24),
  ('INSTALL', 'New device installation', 'Installation', 72),
  ('SWAP', 'Device swap/replacement required', 'Maintenance', 48),
  ('UNINSTALL', 'Device de-installation', 'Maintenance', 72)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE problem_codes ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view
CREATE POLICY "Authenticated users can view problem codes"
  ON problem_codes FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Only admins and super_admin
CREATE POLICY "Admins can manage problem codes"
  ON problem_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update problem codes"
  ON problem_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Super admin can delete problem codes"
  ON problem_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_problem_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_problem_codes_updated_at ON problem_codes;
CREATE TRIGGER trigger_problem_codes_updated_at
  BEFORE UPDATE ON problem_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_problem_codes_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE problem_codes IS 'Master table for standardized problem/issue codes';
COMMENT ON COLUMN problem_codes.code IS 'Unique code identifier (e.g., NO_POWER, CONN_FAIL)';
COMMENT ON COLUMN problem_codes.description IS 'Human-readable description of the problem';
COMMENT ON COLUMN problem_codes.category IS 'Category grouping (Hardware, Software, Network, etc.)';
COMMENT ON COLUMN problem_codes.default_sla_hours IS 'Default SLA hours for this problem type';
COMMENT ON COLUMN problem_codes.is_active IS 'Whether this code is currently active for selection';

-- =====================================================
-- ROLLBACK SCRIPT (commented)
-- =====================================================
/*
  -- To rollback this migration:
  DROP TABLE IF EXISTS problem_codes CASCADE;
  DROP FUNCTION IF EXISTS update_problem_codes_updated_at();
*/
