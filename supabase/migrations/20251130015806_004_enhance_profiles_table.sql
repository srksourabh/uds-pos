/*
  # Enhance Profiles Table for Advanced RBAC

  ## Overview
  Adds new fields to user_profiles table to support:
  - Geographic regions for engineer assignment
  - Skills-based routing
  - Location tracking for field engineers
  - TOTP multi-factor authentication
  - Flexible metadata storage
  - Enhanced account status management

  ## New Fields Added
  - `region` (text) - Geographic region assignment
  - `skills` (jsonb) - Array of skill codes for engineer capabilities
  - `status` (enum) - Account activation status
  - `avatar_url` (text) - Profile picture URL
  - `last_location_lat` (numeric) - Last known latitude
  - `last_location_lng` (numeric) - Last known longitude
  - `last_location_updated_at` (timestamptz) - Location update timestamp
  - `totp_enabled` (boolean) - MFA status for admins
  - `metadata` (jsonb) - Flexible field for extensions

  ## Constraints Added
  - Email must be lowercase
  - Phone must be E.164 format
  - Engineers must have bank_id
  - Admins cannot have pending_approval status
  - Skills must be JSON array

  ## Security
  - Maintains existing RLS policies
  - Adds status-based access control
*/

-- Create status enum if not exists
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('pending_approval', 'active', 'suspended', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to user_profiles
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status account_status DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS last_location_lat numeric(10,6),
  ADD COLUMN IF NOT EXISTS last_location_lng numeric(10,6),
  ADD COLUMN IF NOT EXISTS last_location_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update existing active users to have active status
UPDATE user_profiles SET status = 'active' WHERE active = true AND status = 'pending_approval';

-- Add constraints
DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT email_lowercase CHECK (email = LOWER(email));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT phone_e164_format 
    CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT engineer_requires_bank 
    CHECK (role != 'engineer' OR bank_id IS NOT NULL OR status = 'pending_approval');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT admin_must_be_active_status 
    CHECK (role != 'admin' OR status != 'pending_approval');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT skills_is_array 
    CHECK (jsonb_typeof(skills) = 'array');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON user_profiles(region);
CREATE INDEX IF NOT EXISTS idx_profiles_totp ON user_profiles(totp_enabled);

-- Create unique index for active phone numbers
DROP INDEX IF EXISTS unique_active_phone;
CREATE UNIQUE INDEX unique_active_phone ON user_profiles (phone) WHERE phone IS NOT NULL;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_updated_at();

-- Function to get user role (for RLS policies)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user status (for RLS policies)
CREATE OR REPLACE FUNCTION get_user_status()
RETURNS account_status AS $$
BEGIN
  RETURN (
    SELECT status FROM user_profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is active
CREATE OR REPLACE FUNCTION is_user_active()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;