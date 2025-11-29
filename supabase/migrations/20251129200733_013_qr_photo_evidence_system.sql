/*
  # QR Code & Photo Evidence System

  1. Enhancements
    - Add QR code generation and validation support
    - Enhance photos table with comprehensive metadata
    - Add photo validation and quality tracking
    - Create audit trail for evidence compliance

  2. New Functions
    - generate_qr_code_payload() - Generate QR JSON with checksum
    - validate_qr_checksum() - Verify QR code authenticity
    - validate_photo_evidence() - Check photo compliance for calls
    - get_photo_audit_trail() - Retrieve photo history for audits
*/

-- Add QR code metadata to devices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devices' AND column_name = 'qr_generated_at'
  ) THEN
    ALTER TABLE devices
      ADD COLUMN qr_generated_at timestamptz,
      ADD COLUMN qr_code_version text DEFAULT '1.0',
      ADD COLUMN label_applied_date date,
      ADD COLUMN needs_label_replacement boolean DEFAULT false;
  END IF;
END $$;

-- Enhance photos table with comprehensive metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE photos
      ADD COLUMN file_size_bytes integer,
      ADD COLUMN image_width integer,
      ADD COLUMN image_height integer,
      ADD COLUMN mime_type text,
      ADD COLUMN gps_latitude numeric,
      ADD COLUMN gps_longitude numeric,
      ADD COLUMN gps_accuracy numeric,
      ADD COLUMN captured_at timestamptz,
      ADD COLUMN validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected', 'flagged')),
      ADD COLUMN validation_notes text,
      ADD COLUMN quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 100),
      ADD COLUMN blur_score numeric,
      ADD COLUMN brightness_score numeric,
      ADD COLUMN serial_detected boolean DEFAULT false,
      ADD COLUMN detected_serial_number text,
      ADD COLUMN face_detected boolean DEFAULT false,
      ADD COLUMN is_duplicate boolean DEFAULT false,
      ADD COLUMN duplicate_of uuid REFERENCES photos(id);
  END IF;
END $$;

-- Add indexes for photo queries
CREATE INDEX IF NOT EXISTS idx_photos_validation_status ON photos(validation_status);
CREATE INDEX IF NOT EXISTS idx_photos_gps ON photos(gps_latitude, gps_longitude) WHERE gps_latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_captured_at ON photos(captured_at);
CREATE INDEX IF NOT EXISTS idx_photos_quality_score ON photos(quality_score) WHERE quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_type_call ON photos(photo_type, call_id);

-- Function to generate QR code payload with checksum
CREATE OR REPLACE FUNCTION generate_qr_code_payload(
  p_serial_number text,
  p_model text,
  p_bank_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret_key text;
  v_checksum text;
  v_payload jsonb;
BEGIN
  v_secret_key := 'costar-qr-secret-2025';
  v_checksum := encode(
    digest(p_serial_number || p_model || p_bank_code || v_secret_key, 'sha256'),
    'hex'
  );
  v_payload := jsonb_build_object(
    'serial', p_serial_number,
    'model', p_model,
    'bank', p_bank_code,
    'checksum', v_checksum,
    'version', '1.0',
    'generated_at', extract(epoch from now())::bigint
  );
  RETURN v_payload;
END;
$$;

-- Function to validate QR code checksum
CREATE OR REPLACE FUNCTION validate_qr_checksum(
  p_qr_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret_key text;
  v_expected_checksum text;
  v_provided_checksum text;
  v_serial text;
  v_model text;
  v_bank text;
BEGIN
  v_serial := p_qr_payload->>'serial';
  v_model := p_qr_payload->>'model';
  v_bank := p_qr_payload->>'bank';
  v_provided_checksum := p_qr_payload->>'checksum';
  IF v_serial IS NULL OR v_model IS NULL OR v_bank IS NULL OR v_provided_checksum IS NULL THEN
    RETURN false;
  END IF;
  v_secret_key := 'costar-qr-secret-2025';
  v_expected_checksum := encode(
    digest(v_serial || v_model || v_bank || v_secret_key, 'sha256'),
    'hex'
  );
  RETURN v_expected_checksum = v_provided_checksum;
END;
$$;

-- Function to validate photo evidence compliance for a call
CREATE OR REPLACE FUNCTION validate_photo_evidence(p_call_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_call record;
  v_photo_count integer;
  v_required_types text[];
  v_missing_types text[];
  v_has_gps boolean;
  v_has_serial boolean;
  v_result jsonb;
BEGIN
  SELECT * INTO v_call FROM calls WHERE id = p_call_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Call not found');
  END IF;
  SELECT COUNT(*) INTO v_photo_count FROM photos WHERE call_id = p_call_id;
  SELECT EXISTS(SELECT 1 FROM photos WHERE call_id = p_call_id AND gps_latitude IS NOT NULL) INTO v_has_gps;
  SELECT EXISTS(SELECT 1 FROM photos WHERE call_id = p_call_id AND photo_type = 'serial_number') INTO v_has_serial;
  CASE v_call.type
    WHEN 'install' THEN v_required_types := ARRAY['before', 'serial_number', 'installation'];
    WHEN 'swap' THEN v_required_types := ARRAY['before', 'serial_number', 'installation', 'after'];
    WHEN 'maintenance', 'breakdown' THEN v_required_types := ARRAY['damage', 'after'];
    WHEN 'deinstall' THEN v_required_types := ARRAY['before', 'serial_number'];
    ELSE v_required_types := ARRAY[]::text[];
  END CASE;
  SELECT ARRAY_AGG(required_type) INTO v_missing_types
  FROM unnest(v_required_types) AS required_type
  WHERE NOT EXISTS (SELECT 1 FROM photos WHERE call_id = p_call_id AND photo_type::text = required_type);
  v_result := jsonb_build_object(
    'valid', v_photo_count >= array_length(v_required_types, 1) AND v_missing_types IS NULL,
    'photo_count', v_photo_count,
    'required_count', array_length(v_required_types, 1),
    'has_gps', v_has_gps,
    'has_serial_photo', v_has_serial,
    'missing_types', COALESCE(v_missing_types, ARRAY[]::text[]),
    'call_type', v_call.type,
    'requires_photo_flag', v_call.requires_photo
  );
  IF v_call.requires_photo AND (v_missing_types IS NOT NULL OR v_photo_count = 0) THEN
    v_result := v_result || jsonb_build_object('blocks_completion', true);
  END IF;
  RETURN v_result;
END;
$$;

-- Function to get photo audit trail
CREATE OR REPLACE FUNCTION get_photo_audit_trail(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_bank_id uuid DEFAULT NULL,
  p_engineer_id uuid DEFAULT NULL
)
RETURNS TABLE (
  call_id uuid, call_number text, call_type text, bank_name text,
  engineer_name text, photo_count bigint, has_gps boolean, has_serial boolean,
  avg_quality_score numeric, uploaded_at timestamptz, completed_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.call_number, c.type, b.name, up.full_name,
    COUNT(p.id), bool_or(p.gps_latitude IS NOT NULL), bool_or(p.photo_type = 'serial_number'),
    AVG(p.quality_score), MAX(p.created_at), c.completed_at
  FROM calls c
  LEFT JOIN photos p ON c.id = p.call_id
  LEFT JOIN banks b ON c.client_bank = b.id
  LEFT JOIN user_profiles up ON c.assigned_engineer = up.id
  WHERE (p_start_date IS NULL OR c.completed_at::date >= p_start_date)
    AND (p_end_date IS NULL OR c.completed_at::date <= p_end_date)
    AND (p_bank_id IS NULL OR c.client_bank = p_bank_id)
    AND (p_engineer_id IS NULL OR c.assigned_engineer = p_engineer_id)
    AND c.status = 'completed'
  GROUP BY c.id, c.call_number, c.type, b.name, up.full_name, c.completed_at
  ORDER BY c.completed_at DESC;
END;
$$;