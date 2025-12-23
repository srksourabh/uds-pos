-- Migration: 003_add_pincode_master.sql
-- Phase 2, Step 1.1: Pincode Master System
-- Safe to run: Creates new table, doesn't touch existing ones
-- Date: December 23, 2025

BEGIN;

-- ============================================================================
-- PINCODE MASTER TABLE
-- Purpose: Track serviceable pincodes with SLA hours and regional assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS pincode_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core pincode information
  pin_code VARCHAR(6) UNIQUE NOT NULL,
  area_name VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100),
  state VARCHAR(100) NOT NULL,
  region VARCHAR(100) NOT NULL,
  
  -- SLA Configuration
  sla_hours INTEGER NOT NULL DEFAULT 48,
  
  -- Coordinator assignment
  primary_coordinator_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  
  -- Service configuration
  is_serviceable BOOLEAN DEFAULT true,
  service_priority VARCHAR(20) DEFAULT 'normal' CHECK (service_priority IN ('low', 'normal', 'high', 'priority')),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- Add comment for documentation
COMMENT ON TABLE pincode_master IS 'Master table for serviceable pincodes with SLA and regional configuration';
COMMENT ON COLUMN pincode_master.sla_hours IS 'Service Level Agreement hours for completing calls in this pincode';
COMMENT ON COLUMN pincode_master.primary_coordinator_id IS 'Default coordinator responsible for this pincode area';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pincode_master_pin ON pincode_master(pin_code);
CREATE INDEX IF NOT EXISTS idx_pincode_master_region ON pincode_master(region);
CREATE INDEX IF NOT EXISTS idx_pincode_master_state ON pincode_master(state);
CREATE INDEX IF NOT EXISTS idx_pincode_master_city ON pincode_master(city);
CREATE INDEX IF NOT EXISTS idx_pincode_master_serviceable ON pincode_master(is_serviceable) WHERE is_serviceable = true;
CREATE INDEX IF NOT EXISTS idx_pincode_master_coordinator ON pincode_master(primary_coordinator_id);

-- ============================================================================
-- TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_pincode_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pincode_master_updated_at ON pincode_master;
CREATE TRIGGER trigger_update_pincode_master_updated_at
  BEFORE UPDATE ON pincode_master
  FOR EACH ROW
  EXECUTE FUNCTION update_pincode_master_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pincode_master ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view pincodes
CREATE POLICY "pincode_master_select_policy" ON pincode_master
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can insert pincodes
CREATE POLICY "pincode_master_insert_policy" ON pincode_master
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'senior_manager')
    )
  );

-- Only admins can update pincodes
CREATE POLICY "pincode_master_update_policy" ON pincode_master
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'senior_manager')
    )
  );

-- Only super_admin can delete pincodes
CREATE POLICY "pincode_master_delete_policy" ON pincode_master
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- ============================================================================
-- SEED DATA: Major Indian City Pincodes
-- ============================================================================

INSERT INTO pincode_master (pin_code, area_name, city, district, state, region, sla_hours, service_priority) VALUES
  -- Mumbai Region
  ('400001', 'Fort', 'Mumbai', 'Mumbai City', 'Maharashtra', 'Mumbai', 24, 'priority'),
  ('400020', 'Churchgate', 'Mumbai', 'Mumbai City', 'Maharashtra', 'Mumbai', 24, 'priority'),
  ('400051', 'Bandra West', 'Mumbai', 'Mumbai Suburban', 'Maharashtra', 'Mumbai', 24, 'high'),
  ('400076', 'Powai', 'Mumbai', 'Mumbai Suburban', 'Maharashtra', 'Mumbai', 36, 'normal'),
  
  -- Delhi Region
  ('110001', 'Connaught Place', 'New Delhi', 'Central Delhi', 'Delhi', 'Delhi', 24, 'priority'),
  ('110020', 'Hauz Khas', 'New Delhi', 'South Delhi', 'Delhi', 'Delhi', 36, 'high'),
  ('110055', 'Naraina', 'New Delhi', 'West Delhi', 'Delhi', 'Delhi', 36, 'normal'),
  
  -- Bangalore Region
  ('560001', 'MG Road', 'Bangalore', 'Bangalore Urban', 'Karnataka', 'Bangalore', 24, 'priority'),
  ('560034', 'Indiranagar', 'Bangalore', 'Bangalore Urban', 'Karnataka', 'Bangalore', 36, 'high'),
  ('560100', 'Electronic City', 'Bangalore', 'Bangalore Urban', 'Karnataka', 'Bangalore', 36, 'high'),
  
  -- Chennai Region
  ('600001', 'Parrys', 'Chennai', 'Chennai', 'Tamil Nadu', 'Chennai', 24, 'priority'),
  ('600017', 'T Nagar', 'Chennai', 'Chennai', 'Tamil Nadu', 'Chennai', 36, 'high'),
  
  -- Kolkata Region
  ('700001', 'BBD Bagh', 'Kolkata', 'Kolkata', 'West Bengal', 'Kolkata', 24, 'priority'),
  ('700020', 'Park Street', 'Kolkata', 'Kolkata', 'West Bengal', 'Kolkata', 36, 'high'),
  ('700091', 'Salt Lake', 'Kolkata', 'Kolkata', 'West Bengal', 'Kolkata', 36, 'normal'),
  
  -- Bhubaneswar Region
  ('751001', 'Unit 1', 'Bhubaneswar', 'Khordha', 'Odisha', 'Bhubaneswar', 48, 'normal'),
  ('751009', 'Sahid Nagar', 'Bhubaneswar', 'Khordha', 'Odisha', 'Bhubaneswar', 48, 'normal'),
  
  -- Guwahati Region
  ('781001', 'Fancy Bazar', 'Guwahati', 'Kamrup Metropolitan', 'Assam', 'Guwahati', 72, 'normal'),
  ('781005', 'Ulubari', 'Guwahati', 'Kamrup Metropolitan', 'Assam', 'Guwahati', 72, 'normal'),
  
  -- Hyderabad Region
  ('500001', 'Abids', 'Hyderabad', 'Hyderabad', 'Telangana', 'Hyderabad', 24, 'priority'),
  ('500081', 'HITEC City', 'Hyderabad', 'Hyderabad', 'Telangana', 'Hyderabad', 36, 'high'),
  
  -- Pune Region
  ('411001', 'Shivajinagar', 'Pune', 'Pune', 'Maharashtra', 'Pune', 36, 'high'),
  ('411057', 'Hinjewadi', 'Pune', 'Pune', 'Maharashtra', 'Pune', 48, 'normal'),
  
  -- Ahmedabad Region
  ('380001', 'Lal Darwaja', 'Ahmedabad', 'Ahmedabad', 'Gujarat', 'Ahmedabad', 36, 'high'),
  ('380015', 'Navrangpura', 'Ahmedabad', 'Ahmedabad', 'Gujarat', 'Ahmedabad', 48, 'normal')
  
ON CONFLICT (pin_code) DO NOTHING;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS pincode_master CASCADE;
