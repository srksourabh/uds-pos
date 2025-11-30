/*
  # Enhance Existing Tables with Additional Fields

  ## Overview
  Adds additional fields to existing tables (devices, calls, banks) to support
  the complete data model with warranty tracking, maintenance scheduling,
  contact information, and enhanced metadata.

  ## Changes to devices table
  - installation_date, warranty_expiry, firmware_version, last_maintenance_date, metadata

  ## Changes to calls table
  - client_contact, client_phone, scheduled_time_window, resolution_notes
  - estimated_duration_minutes, actual_duration_minutes, requires_photo, metadata

  ## Changes to banks table
  - contact_person, contact_email, contact_phone, address, metadata

  ## Security
  - All new fields follow existing RLS policies
*/

-- Enhance devices table
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS installation_date date,
  ADD COLUMN IF NOT EXISTS warranty_expiry date,
  ADD COLUMN IF NOT EXISTS firmware_version text,
  ADD COLUMN IF NOT EXISTS last_maintenance_date date,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create indexes for new device fields
CREATE INDEX IF NOT EXISTS idx_devices_warranty_expiry ON devices(warranty_expiry) WHERE warranty_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_last_maintenance ON devices(last_maintenance_date) WHERE last_maintenance_date IS NOT NULL;

-- Enhance calls table
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS client_contact text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS scheduled_time_window text,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS requires_photo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Enhance banks table
ALTER TABLE banks
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Update database types in existing tables to include new fields
COMMENT ON COLUMN devices.installation_date IS 'Date when device was installed at current location';
COMMENT ON COLUMN devices.warranty_expiry IS 'Manufacturer warranty expiration date';
COMMENT ON COLUMN devices.firmware_version IS 'Current firmware version running on device';
COMMENT ON COLUMN devices.last_maintenance_date IS 'Most recent maintenance or service date';
COMMENT ON COLUMN devices.metadata IS 'Flexible JSONB field for device-specific data (vendor, specs, etc.)';

COMMENT ON COLUMN calls.client_contact IS 'Contact person name at client location';
COMMENT ON COLUMN calls.client_phone IS 'Phone number for client contact';
COMMENT ON COLUMN calls.scheduled_time_window IS 'Preferred time window for service (e.g., "9:00 AM - 12:00 PM")';
COMMENT ON COLUMN calls.resolution_notes IS 'Notes added by engineer upon completion';
COMMENT ON COLUMN calls.estimated_duration_minutes IS 'Expected time to complete call in minutes';
COMMENT ON COLUMN calls.actual_duration_minutes IS 'Actual time taken, calculated or manually entered';
COMMENT ON COLUMN calls.requires_photo IS 'Whether photo documentation is mandatory for this call';
COMMENT ON COLUMN calls.metadata IS 'Flexible JSONB field for call-specific data (access codes, instructions, etc.)';

COMMENT ON COLUMN banks.contact_person IS 'Primary contact person at the bank';
COMMENT ON COLUMN banks.contact_email IS 'Email address for bank communications';
COMMENT ON COLUMN banks.contact_phone IS 'Phone number for bank contact';
COMMENT ON COLUMN banks.address IS 'Physical address of bank headquarters';
COMMENT ON COLUMN banks.metadata IS 'Flexible JSONB field for bank data (contract details, SLA terms, etc.)';

-- Function to calculate actual call duration automatically
CREATE OR REPLACE FUNCTION calculate_actual_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- If call is completed and has both started_at and completed_at
  IF NEW.status = 'completed' AND NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
    -- Calculate duration in minutes
    NEW.actual_duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate duration
DROP TRIGGER IF EXISTS auto_calculate_call_duration ON calls;
CREATE TRIGGER auto_calculate_call_duration
  BEFORE UPDATE ON calls
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION calculate_actual_call_duration();