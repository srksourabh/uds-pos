/*
  # Add Warehouses and Couriers Tables

  1. New Tables
    - `warehouses`
      - `id` (uuid, primary key)
      - `name` (text)
      - `code` (text, unique)
      - `address` (text)
      - `manager_name` (text)
      - `manager_phone` (text)
      - `capacity` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `couriers`
      - `id` (uuid, primary key)
      - `name` (text) - Courier company name
      - `code` (text, unique) - Short code
      - `contact_person` (text)
      - `contact_phone` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `shipments`
      - `id` (uuid, primary key)
      - `tracking_number` (text, unique)
      - `courier_id` (uuid, references couriers)
      - `device_ids` (text[]) - Array of device serial numbers
      - `source_type` (text) - 'warehouse', 'engineer', 'bank'
      - `source_id` (uuid)
      - `destination_type` (text)
      - `destination_id` (uuid)
      - `status` (text) - 'pending', 'in_transit', 'delivered', 'returned'
      - `shipped_at` (timestamptz)
      - `delivered_at` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admins can manage all records
    - Authenticated users can view records
*/

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  address text,
  manager_name text,
  manager_phone text,
  capacity integer DEFAULT 1000,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage warehouses"
  ON warehouses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'active'
    )
  );

CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);

-- Create couriers table
CREATE TABLE IF NOT EXISTS couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  contact_person text,
  contact_phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view couriers"
  ON couriers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage couriers"
  ON couriers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'active'
    )
  );

CREATE INDEX IF NOT EXISTS idx_couriers_active ON couriers(is_active);
CREATE INDEX IF NOT EXISTS idx_couriers_code ON couriers(code);

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number text NOT NULL UNIQUE,
  courier_id uuid REFERENCES couriers(id) ON DELETE SET NULL,
  device_ids text[] DEFAULT '{}',
  source_type text NOT NULL CHECK (source_type IN ('warehouse', 'engineer', 'bank')),
  source_id uuid,
  destination_type text NOT NULL CHECK (destination_type IN ('warehouse', 'engineer', 'bank', 'client')),
  destination_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'returned')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view shipments"
  ON shipments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create shipments"
  ON shipments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update shipments"
  ON shipments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.status = 'active'
    )
  );

CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_courier ON shipments(courier_id);

-- Insert default warehouse
INSERT INTO warehouses (name, code, address, manager_name, is_active)
VALUES ('Main Warehouse', 'WH001', '123 Main Street', 'Warehouse Manager', true)
ON CONFLICT (code) DO NOTHING;

-- Insert default couriers
INSERT INTO couriers (name, code, contact_person, is_active) VALUES
  ('FedEx', 'FEDEX', 'FedEx Support', true),
  ('UPS', 'UPS', 'UPS Support', true),
  ('DHL', 'DHL', 'DHL Support', true),
  ('Local Courier', 'LOCAL', 'Local Delivery', true)
ON CONFLICT (code) DO NOTHING;
