/*
  # Add Call Cancellation Fields

  This migration adds fields to track call cancellations with mandatory reasons.

  ## Changes Made
  1. Add cancellation_reason field to calls table
  2. Add cancelled_at timestamp field to calls table
*/

-- Add cancellation fields to calls table
DO $$
BEGIN
  -- Add cancellation_reason column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE calls ADD COLUMN cancellation_reason TEXT;
  END IF;

  -- Add cancelled_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'cancelled_at') THEN
    ALTER TABLE calls ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add index for cancelled_at
CREATE INDEX IF NOT EXISTS idx_calls_cancelled_at ON calls(cancelled_at) WHERE cancelled_at IS NOT NULL;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Added cancellation fields to calls table';
END $$;
