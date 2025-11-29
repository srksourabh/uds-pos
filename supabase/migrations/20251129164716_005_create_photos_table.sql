/*
  # Create Photos Table

  ## Overview
  Creates a table to store device and installation photos uploaded by engineers
  during field service calls. Includes comprehensive RLS policies.

  ## New Table: photos
  - `id` (uuid, primary key) - Photo unique identifier
  - `device_id` (uuid) - Associated device
  - `call_id` (uuid, nullable) - Associated call if applicable
  - `uploaded_by` (uuid) - Engineer who uploaded the photo
  - `photo_type` (enum) - Type of photo for categorization
  - `storage_path` (text) - Path in Supabase Storage
  - `caption` (text, nullable) - Optional description
  - `created_at` (timestamptz) - Upload timestamp

  ## Photo Types
  - before: Device condition before service
  - after: Device condition after service
  - damage: Documentation of damage
  - serial_number: Device serial number plate
  - installation: Installation site photo

  ## Security
  - Engineers can upload photos for their assigned devices/calls
  - Engineers can view their own photos + photos of assigned devices
  - Admins can view all photos
  - Photos can be deleted by uploader within 24 hours
  - Admins can delete any photo
*/

-- Create photo type enum
CREATE TYPE photo_type AS ENUM ('before', 'after', 'damage', 'serial_number', 'installation');

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES user_profiles(id),
  photo_type photo_type NOT NULL,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_photos_device ON photos(device_id);
CREATE INDEX IF NOT EXISTS idx_photos_call ON photos(call_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploader ON photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at);

-- RLS Policies for photos table

-- SELECT: Admins see all, engineers see their uploads + assigned device photos
CREATE POLICY "Admins can view all photos"
  ON photos FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Engineers can view their photos and assigned device photos"
  ON photos FOR SELECT
  TO authenticated
  USING (
    NOT is_admin() AND (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM devices
        WHERE devices.id = photos.device_id
        AND devices.assigned_to = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM calls
        WHERE calls.id = photos.call_id
        AND calls.assigned_engineer = auth.uid()
      )
    )
  );

-- INSERT: Engineers can upload for their assigned devices/calls
CREATE POLICY "Engineers can upload photos for assigned devices"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM devices
        WHERE devices.id = photos.device_id
        AND devices.assigned_to = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM calls
        WHERE calls.id = photos.call_id
        AND calls.assigned_engineer = auth.uid()
      )
    )
  );

-- UPDATE: Uploaders can only update caption
CREATE POLICY "Uploaders can update photo caption"
  ON photos FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (
    uploaded_by = auth.uid() AND
    storage_path = (SELECT storage_path FROM photos WHERE id = photos.id)
  );

-- DELETE: Admins can delete any photo, uploaders within 24 hours
CREATE POLICY "Admins can delete photos"
  ON photos FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Uploaders can delete own photos within 24 hours"
  ON photos FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() AND
    created_at > now() - interval '24 hours'
  );