/*
  # Add Expenses Table

  ## Overview
  Creates an expenses table for tracking engineer expense claims.
  Supports photo receipts, call association, and approval workflow.

  ## Tables Created
  - expenses: Engineer expense claims

  ## Features
  - Amount validation (>= 0)
  - Status workflow (pending, approved, rejected)
  - Receipt photo support
  - Call association (optional)
  - Approval tracking

  ## Security
  - Engineers can view/create own expenses
  - Admins can view all and approve/reject
*/

-- =====================================================
-- CREATE EXPENSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
  engineer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL CHECK (amount >= 0),
  expense_type varchar(50) NOT NULL,
  reason text NOT NULL,
  receipt_photo_url text,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_expenses_engineer ON expenses(engineer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_call ON expenses(call_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_pending ON expenses(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- SELECT: Engineer sees own, Admins see all
CREATE POLICY "Engineers can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    engineer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'coordinator')
    )
  );

-- INSERT: Engineers can create own expenses only
CREATE POLICY "Engineers can create own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    engineer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'engineer'
    )
  );

-- UPDATE: Admins can approve/reject, engineers can update pending expenses
CREATE POLICY "Admins can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    -- Admin/coordinator can update any expense
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'coordinator')
    )
    OR
    -- Engineers can update their own pending expenses
    (
      engineer_id = auth.uid() AND
      status = 'pending'
    )
  )
  WITH CHECK (
    -- Admin/coordinator can update any expense
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'coordinator')
    )
    OR
    -- Engineers can update their own pending expenses
    (
      engineer_id = auth.uid() AND
      status = 'pending'
    )
  );

-- DELETE: Only super_admin can delete
CREATE POLICY "Super admin can delete expenses"
  ON expenses FOR DELETE
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

CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON expenses;
CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get pending expense count for notification badges
CREATE OR REPLACE FUNCTION get_pending_expense_count()
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM expenses
    WHERE status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get engineer's expense summary for a period
CREATE OR REPLACE FUNCTION get_engineer_expense_summary(
  p_engineer_id uuid,
  p_start_date date DEFAULT date_trunc('month', current_date)::date,
  p_end_date date DEFAULT current_date
)
RETURNS TABLE (
  total_amount decimal,
  pending_amount decimal,
  approved_amount decimal,
  rejected_amount decimal,
  expense_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(e.amount), 0)::decimal AS total_amount,
    COALESCE(SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END), 0)::decimal AS pending_amount,
    COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0)::decimal AS approved_amount,
    COALESCE(SUM(CASE WHEN e.status = 'rejected' THEN e.amount ELSE 0 END), 0)::decimal AS rejected_amount,
    COUNT(*)::bigint AS expense_count
  FROM expenses e
  WHERE e.engineer_id = p_engineer_id
    AND e.created_at >= p_start_date
    AND e.created_at <= p_end_date + interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve an expense
CREATE OR REPLACE FUNCTION approve_expense(p_expense_id uuid)
RETURNS boolean AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Check user role
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF v_user_role NOT IN ('admin', 'super_admin', 'coordinator') THEN
    RAISE EXCEPTION 'Only admins can approve expenses';
  END IF;

  UPDATE expenses
  SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = p_expense_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject an expense
CREATE OR REPLACE FUNCTION reject_expense(p_expense_id uuid, p_reason text)
RETURNS boolean AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Check user role
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF v_user_role NOT IN ('admin', 'super_admin', 'coordinator') THEN
    RAISE EXCEPTION 'Only admins can reject expenses';
  END IF;

  UPDATE expenses
  SET
    status = 'rejected',
    approved_by = auth.uid(),
    approved_at = now(),
    rejection_reason = p_reason
  WHERE id = p_expense_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE expenses IS 'Engineer expense claims and reimbursements';
COMMENT ON COLUMN expenses.call_id IS 'Optional reference to associated call';
COMMENT ON COLUMN expenses.engineer_id IS 'Engineer who submitted the expense';
COMMENT ON COLUMN expenses.amount IS 'Expense amount (must be >= 0)';
COMMENT ON COLUMN expenses.expense_type IS 'Type of expense (references expense_types)';
COMMENT ON COLUMN expenses.reason IS 'Description/reason for the expense';
COMMENT ON COLUMN expenses.receipt_photo_url IS 'URL to uploaded receipt photo';
COMMENT ON COLUMN expenses.status IS 'Approval status: pending, approved, rejected';
COMMENT ON COLUMN expenses.approved_by IS 'User who approved/rejected';
COMMENT ON COLUMN expenses.approved_at IS 'Timestamp of approval/rejection';
COMMENT ON COLUMN expenses.rejection_reason IS 'Reason if rejected';

COMMENT ON FUNCTION get_pending_expense_count IS 'Get count of pending expenses for badges';
COMMENT ON FUNCTION get_engineer_expense_summary IS 'Get expense summary for an engineer';
COMMENT ON FUNCTION approve_expense IS 'Approve a pending expense (admin only)';
COMMENT ON FUNCTION reject_expense IS 'Reject a pending expense with reason (admin only)';

-- =====================================================
-- ROLLBACK SCRIPT (commented)
-- =====================================================
/*
  -- To rollback this migration:
  DROP TABLE IF EXISTS expenses CASCADE;
  DROP FUNCTION IF EXISTS update_expenses_updated_at();
  DROP FUNCTION IF EXISTS get_pending_expense_count();
  DROP FUNCTION IF EXISTS get_engineer_expense_summary(uuid, date, date);
  DROP FUNCTION IF EXISTS approve_expense(uuid);
  DROP FUNCTION IF EXISTS reject_expense(uuid, text);
*/
