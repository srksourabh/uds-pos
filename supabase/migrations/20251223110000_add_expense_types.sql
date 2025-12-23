/*
  # Add Expense Types Table

  ## Overview
  Creates an expense_types table to define the categories of expenses
  that field engineers can claim.

  ## Tables Created
  - expense_types: Master table for expense categories

  ## Initial Data
  - 5 common expense types with limits

  ## Security
  - SELECT: All authenticated users
  - INSERT/UPDATE: Super Admin, Admin only
*/

-- =====================================================
-- CREATE EXPENSE TYPES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS expense_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) UNIQUE NOT NULL,
  description text NOT NULL,
  is_active boolean DEFAULT true,
  requires_receipt boolean DEFAULT true,
  max_amount decimal(10,2) DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expense_types_active ON expense_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_expense_types_name ON expense_types(name);

-- =====================================================
-- INSERT COMMON EXPENSE TYPES
-- =====================================================

INSERT INTO expense_types (name, description, requires_receipt, max_amount) VALUES
  ('FUEL', 'Fuel/Petrol expenses for travel', true, 2000.00),
  ('TOLL', 'Toll charges for highways', true, 500.00),
  ('PARKING', 'Parking fees', true, 200.00),
  ('FOOD', 'Food/Meal allowance during field work', false, 500.00),
  ('OTHER', 'Other miscellaneous expenses', true, 1000.00)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view
CREATE POLICY "Authenticated users can view expense types"
  ON expense_types FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only admins and super_admin
CREATE POLICY "Admins can create expense types"
  ON expense_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- UPDATE: Only admins and super_admin
CREATE POLICY "Admins can update expense types"
  ON expense_types FOR UPDATE
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

-- DELETE: Only super_admin
CREATE POLICY "Super admin can delete expense types"
  ON expense_types FOR DELETE
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

CREATE OR REPLACE FUNCTION update_expense_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expense_types_updated_at ON expense_types;
CREATE TRIGGER trigger_expense_types_updated_at
  BEFORE UPDATE ON expense_types
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_types_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE expense_types IS 'Master table for expense categories';
COMMENT ON COLUMN expense_types.name IS 'Unique identifier for expense type (e.g., FUEL, TOLL)';
COMMENT ON COLUMN expense_types.description IS 'Human-readable description';
COMMENT ON COLUMN expense_types.requires_receipt IS 'Whether a receipt photo is required';
COMMENT ON COLUMN expense_types.max_amount IS 'Maximum claimable amount per expense';
COMMENT ON COLUMN expense_types.is_active IS 'Whether this type is currently active';

-- =====================================================
-- ROLLBACK SCRIPT (commented)
-- =====================================================
/*
  -- To rollback this migration:
  DROP TABLE IF EXISTS expense_types CASCADE;
  DROP FUNCTION IF EXISTS update_expense_types_updated_at();
*/
