# QR CODE & PHOTO PROOF EVIDENCE REQUIREMENTS (CoSTAR)

**Policy Version**: 1.0  
**Effective Date**: 2025-11-29  
**Document Owner**: Engineering & Operations  
**Review Cycle**: Annual

---

## EXECUTIVE SUMMARY

This policy establishes mandatory standards for device identification via QR codes and photographic evidence requirements for field service operations. Compliance ensures traceability, accountability, and regulatory adherence throughout the device lifecycle.

**Key Requirements**:
- All devices must have QR labels with cryptographic checksums
- Installation calls require minimum 3 photos with GPS metadata
- Photos must meet quality standards (720p minimum, GPS when available)
- Evidence retained for 7 years for audit compliance
- Non-compliance blocks call completion

---

## 1. QR CODE GENERATION & ENCODING

### 1.1 QR Code Payload Structure

Each device QR code encodes a JSON payload:

```json
{
  "serial": "ABC123456",
  "model": "PAX-A920",
  "bank": "FNB",
  "checksum": "sha256_hash",
  "version": "1.0",
  "generated_at": 1732896000
}
```

**Checksum Calculation**:
```
SHA256(serial + model + bank + SECRET_KEY)
```

**Security**: Secret key stored server-side only, prevents QR forgery.

### 1.2 QR Label Specifications

**Physical Label**:
- Size: 50mm x 30mm minimum
- Material: Durable polyester/vinyl with permanent adhesive
- QR Code: 25mm x 25mm (scannable from 30cm)
- Print Quality: 300 DPI minimum
- Color: Black QR on white background
- Human-Readable: Serial printed below QR in 8pt font

**Label Content Layout**:
```
┌──────────────────────────────┐
│  [Bank Logo]      [QR Code]  │
│                     25x25mm   │
│  Serial: ABC123456           │
│  Model: PAX-A920             │
└──────────────────────────────┘
```

**Placement**:
- Primary: Back panel near serial number plate
- Secondary: Inside battery compartment (if applicable)
- Must not cover ventilation or regulatory labels

**Durability Requirements**:
- Survive 12 months outdoor exposure
- Resist alcohol-based cleaning solutions
- Withstand -10°C to 50°C temperatures

### 1.3 Label Printing Process

1. Admin exports QR codes from system as batch PDF
2. Print on thermal transfer or laser printer (300 DPI)
3. Quality check: Scan each label before affixing
4. Record label application date in database
5. Failed labels destroyed and regenerated

**Database Update**:
```sql
UPDATE devices SET 
  qr_generated_at = NOW(),
  qr_code_version = '1.0',
  label_applied_date = CURRENT_DATE
WHERE id = device_id;
```

---

## 2. QR SCANNING BEHAVIOR

### 2.1 Engineer Workflow

1. Engineer navigates to active call detail page
2. Taps "Scan Device" button
3. Device camera activates with scan overlay
4. Engineer aligns QR code within frame
5. System auto-decodes QR payload
6. Edge Function `/scan-device` validates in real-time
7. UI displays success (green) or error (red) with specific message

### 2.2 Validation Sequence

**Server-Side Checks** (performed by `/scan-device` endpoint):

1. **QR Decode Validation**
   - ✅ Valid JSON structure
   - ✅ All required fields present
   - ❌ Error: "Invalid QR code format"

2. **Checksum Verification**
   ```sql
   SELECT validate_qr_checksum(qr_payload::jsonb);
   ```
   - ✅ Checksum matches
   - ❌ Error: "QR code tampered or invalid"

3. **Device Existence Check**
   - Query: `SELECT * FROM devices WHERE serial_number = $serial`
   - ❌ Error: `DEVICE_NOT_FOUND` (404)

4. **Bank Matching**
   - Compare QR `bank` code with call's `client_bank`
   - ❌ Error: `BANK_MISMATCH` (400)
   - Display both bank names prominently

5. **Device Status Check**
   - ✅ Status: `issued`, `warehouse`, `returned` → Continue
   - ❌ Status: `faulty` → "Device marked faulty, cannot use"
   - ⚠️ Status: `installed` → Warning: "Already installed elsewhere"

6. **Engineer Assignment Check**
   - ✅ `devices.assigned_to = current_user.id`
   - ❌ Error: `DEVICE_NOT_ASSIGNED_TO_YOU` (403)

### 2.3 Error Handling

**Error Display Standards**:
- Duration: Remain on screen for 5 seconds or until dismissed
- Color: Red background with white text
- Icon: ❌ for critical errors, ⚠️ for warnings
- Sound: Short error beep (optional)
- Retry: "Try Again" button to rescan

**Common Error Messages**:

| Error Code | User Message | Action Required |
|------------|--------------|-----------------|
| `DEVICE_NOT_FOUND` | "Device serial ABC123456 not found in system. Contact admin." | Admin must register device |
| `BANK_MISMATCH` | "❌ Device Bank Mismatch<br>Device: FNB<br>Call Bank: Standard Bank" | Use correct device |
| `DEVICE_NOT_ASSIGNED_TO_YOU` | "Device assigned to John Smith. Contact admin." | Request transfer |
| `DEVICE_FAULTY` | "Device marked faulty. Cannot use." | Use different device |
| `QR_CODE_INVALID` | "QR code damaged. Enter serial manually." | Manual entry fallback |

**Manual Serial Entry Fallback**:
- After 3 failed scans, offer "Enter Serial Manually" button
- Manual entry triggers same validation checks
- Log event for audit (potential QR label quality issue)

---

## 3. PHOTO EVIDENCE REQUIREMENTS

### 3.1 Mandatory Photos by Call Type

#### 3.1.1 Install Calls (Minimum 3 Photos)

1. **Pre-Installation Site Photo** (`before`)
   - Wide shot showing installation location
   - Timing: Before any work begins

2. **Device Serial Number Close-Up** (`serial_number`)
   - Clear, legible photo of serial plate
   - Serial must be readable (OCR-validated)

3. **Completed Installation Photo** (`installation`)
   - Installed device with merchant/CSR visible
   - Device powered on, display visible

#### 3.1.2 Swap Calls (Minimum 5 Photos)

1. Old Device Before Removal (`before`)
2. Old Device Serial Number (`serial_number`)
3. New Device Serial Number (`serial_number`)
4. New Device Installed (`installation`)
5. Old Device Returned (`after`)

#### 3.1.3 Maintenance/Breakdown Calls (Minimum 2 Photos)

1. Issue/Damage Photo (`damage`)
2. Post-Repair Photo (`after`)

#### 3.1.4 Deinstall Calls (Minimum 2 Photos)

1. Device Before Removal (`before`)
2. Device Serial Number (`serial_number`)

### 3.2 Photo Metadata Requirements

**Mandatory Metadata** (Captured Automatically):

```typescript
{
  // Database fields
  id: uuid,
  device_id: uuid,
  call_id: uuid,
  uploaded_by: uuid,
  photo_type: enum,
  storage_path: string,
  caption: string | null,
  
  // GPS Coordinates (mandatory if available)
  gps_latitude: number,          // -90 to 90
  gps_longitude: number,         // -180 to 180
  gps_accuracy: number,          // Meters
  
  // Photo Technical Details
  file_size_bytes: number,
  image_width: number,           // Pixels
  image_height: number,          // Pixels
  mime_type: string,             // "image/jpeg", "image/png"
  captured_at: timestamp,        // ISO 8601 from EXIF
  
  // Validation Results
  validation_status: enum,       // 'pending', 'approved', 'rejected', 'flagged'
  quality_score: number,         // 0-100
  blur_score: number,            // Higher = sharper
  brightness_score: number,      // 40-80 = optimal
  serial_detected: boolean,      // OCR found serial
  detected_serial_number: string,
  face_detected: boolean,        // For CSR photos
  
  created_at: timestamp
}
```

**GPS Requirements**:
- Mandatory: Yes, unless device lacks GPS or permissions denied
- Accuracy Threshold: Must be ≤ 50 meters
- Timeout: 10 seconds to acquire fix, proceed without if unavailable
- Offline Handling: Cache photo locally, upload when connection restored

**Timestamp Requirements**:
- Source: Device system clock (not user-editable)
- Format: ISO 8601 with timezone
- Validation: Server compares upload timestamp with EXIF
- If difference > 24 hours → Warning logged (clock drift)

### 3.3 Photo Capture UX Guidelines

**In-App Camera Experience**:

1. **Camera Overlay**: Display framing guidelines
   - "Fit serial number in rectangle" (for serial photos)
   - "Include device and CSR in frame" (for installation)

2. **Auto-Capture Assist**:
   - Tap-to-focus enabled
   - Focus confirmation (green square)
   - Grid overlay for composition

3. **Real-Time Validation**:
   - Blur detection: "Photo may be blurry, tap to retry"
   - Brightness: "Too dark" or "Overexposed"
   - Serial OCR: Green checkmark if serial detected

4. **Photo Review**:
   - Show captured photo for 3 seconds
   - "Retake" or "Use Photo" buttons
   - Allow adding caption (optional, max 200 chars)

5. **Upload Progress**:
   - Show progress bar
   - Display thumbnail with status badge
   - Queue for background upload if offline

---

## 4. PHOTO VALIDATION RULES

### 4.1 Upload Validation

**Pre-Upload Checks** (Client-Side):

1. File Size: Max 10 MB per photo
2. Format: JPEG, PNG, HEIC only
3. Resolution: Min 1280x720 pixels (720p)
4. Aspect Ratio: Between 4:3 and 16:9
5. Photo Count: Max 20 photos per call

**Server-Side Validation** (Edge Function `/upload-photo`):

```typescript
Validation Steps:
1. Authenticate user
2. Verify file size ≤ 10 MB → Error: FILE_TOO_LARGE
3. Verify format → Error: INVALID_FORMAT
4. Verify device_id exists → Error: DEVICE_NOT_FOUND
5. Verify call_id assigned to user → Error: CALL_NOT_ASSIGNED
6. Extract EXIF metadata
7. Validate GPS (if provided) → Error: INVALID_GPS_COORDINATES
8. Compress image (max 2048px longest dimension)
9. Upload to Supabase Storage: call-photos/{call_id}/{photo_id}.jpg
10. Create photos table record
11. Queue for OCR processing (async)
12. Return success with photo_id and signed URL
```

### 4.2 Quality Checks

**Automated Quality Validation**:

1. **Blur Detection** (Laplacian variance):
   - Score < 100 → Likely blurry
   - Score < 50 → Definitely blurry, flag for review

2. **Brightness Analysis**:
   - Mean luminosity < 40 → Too dark
   - Mean luminosity > 200 → Overexposed
   - Optimal: 80-180 range

3. **Face Detection** (for CSR photos):
   - Validate at least 1 face present
   - Store `face_detected: true/false`

**Manual Review Triggers**:
- All photos flagged as poor quality
- Engineer has >20% photo rejection rate
- High-value installations (>$5000 equipment)

### 4.3 Photo Compliance Check

Before call submission, system validates:

```sql
SELECT validate_photo_evidence(call_id);
```

**Returns**:
```json
{
  "valid": boolean,
  "photo_count": 5,
  "required_count": 3,
  "has_gps": true,
  "has_serial_photo": true,
  "missing_types": [],
  "blocks_completion": false
}
```

**Submission Blocked If**:
- Missing mandatory photos
- Zero photos uploaded (for calls with `requires_photo = true`)
- Device not scanned (for install/swap calls)

---

## 5. STORAGE & RETENTION POLICY

### 5.1 Storage Infrastructure

**Supabase Storage Configuration**:

```sql
-- Bucket: call-photos
-- Privacy: Private (authenticated access only)
-- File Size Limit: 10 MB
-- Allowed Types: image/jpeg, image/png, image/heic
```

**Folder Structure**:
```
call-photos/
  ├── {call_id}/
  │   ├── {photo_id}_serial.jpg
  │   ├── {photo_id}_installation.jpg
  │   └── {photo_id}_before.jpg
  └── thumbnails/
      └── {call_id}/
          └── {photo_id}_thumb.jpg (300px)
```

### 5.2 Retention Schedule

| Period | Status | Storage Tier | Access | Cost/GB/mo |
|--------|--------|--------------|--------|-----------|
| 0-7 years | Active | Hot (Supabase) | Instant | $0.021 |
| 7-10 years | Archive | Cold (S3 Glacier) | 24-48h | $0.004 |
| >10 years | Deleted | N/A | None | $0 |

**Compliance Notes**:
- GDPR Right to Erasure: Customer can request deletion after 7 years
- POPIA Compliance (South Africa): Align with financial records
- PCI-DSS: Follow payment device evidence guidelines

### 5.3 Export & Audit Access

**Admin Photo Export**:

1. **Bulk Export Tool**:
   - Filter by date range, bank, engineer, call type
   - Generate ZIP archive with photos + metadata CSV
   - Download link expires after 24 hours

2. **Single Call Export**:
   ```sql
   SELECT generate_evidence_export(call_id);
   ```
   - Generates PDF report with:
     - Call details, device details
     - All photos embedded with timestamps
     - GPS coordinates map snapshot

3. **Audit Trail Export**:
   ```sql
   SELECT * FROM get_photo_audit_trail(start_date, end_date, bank_id, engineer_id);
   ```
   - Monthly automated report for compliance
   - Lists uploads, validations, anomalies

---

## 6. COMPLIANCE & AUDIT

### 6.1 Pre-Submission Checklist

**Device Evidence**:
- ✅ At least 1 device scanned
- ✅ Device serial matches QR and database
- ✅ Device bank matches call bank

**Photo Evidence**:
- ✅ Minimum photo count met
- ✅ All mandatory photo types present
- ✅ At least 1 photo has valid GPS
- ✅ All photos uploaded successfully
- ✅ Photo timestamps within call timeframe

**Warnings** (Non-Blocking):
- ⚠️ No GPS data (connectivity issue?)
- ⚠️ Photos captured before call start (clock skew?)
- ⚠️ Low photo quality detected

### 6.2 Post-Submission Verification

**Automated Jobs**:

1. **OCR Serial Verification** (5 minutes):
   - Extract serial from photos
   - Compare with device serial
   - Create alert if mismatch

2. **GPS Clustering Analysis** (daily):
   - Verify GPS clusters around client address
   - Flag calls with GPS >5km from address

3. **Photo Duplicate Detection** (weekly):
   - Compare photo hashes
   - Flag same photo used for multiple calls

4. **Timestamp Anomaly Detection**:
   - Flag photos captured outside call window
   - Detect clock tampering

### 6.3 Admin Audit Dashboard

**Evidence Completeness Report**:
- List calls with missing/incomplete evidence
- Filter by engineer, date range, bank
- Export to CSV for compliance

**Quality Review Queue**:
- Calls flagged for manual review
- Admin views photos side-by-side with details
- Actions: Approve, Reject, Request Re-Capture

**Audit Metrics**:
- % Calls with complete photo evidence
- Average photo quality score by engineer
- % Calls with GPS data
- Photo rejection rate by engineer
- Time from call completion to upload

---

## 7. EXCEPTION HANDLING

### 7.1 Offline Photo Capture

**Scenario**: No cellular/WiFi connectivity

**Behavior**:
1. Photos stored locally with metadata
2. App shows "📶 Offline - Photos will upload when connected"
3. Background sync when connection restored
4. Call completion blocked until uploads complete

**Constraints**:
- Max 50 photos in offline queue
- Photos older than 7 days auto-deleted
- Require 100MB free device storage

### 7.2 Damaged QR Codes

**Fallback**:
1. After 3 scan failures, "Enter Serial Manually" button
2. Manual entry validated via API (same checks)
3. Event logged with photo of damaged QR
4. Admin notified: "QR label quality issue"
5. Device queued for label replacement

### 7.3 Missing GPS Permissions

**Policy**:
- Up to 2 calls/month allowed without GPS
- >2 calls without GPS → Engineer suspended pending review
- High-risk calls (>$5000) → GPS mandatory (blocks submission)

### 7.4 Storage Failures

**Resilience**:
1. Retry Logic: Exponential backoff (1s, 2s, 4s, 8s, 16s)
2. Local Cache: Keep photos until confirmed uploaded
3. Alternative: Fallback to direct S3 upload
4. User Notification: "Upload delayed, do not delete app"
5. Admin Alert: "Storage degraded, X photos pending"

---

## 8. QA TEST SCENARIOS

### 8.1 QR Code Testing

✅ **Test 1**: Valid QR scan → Device auto-fills  
✅ **Test 2**: Bank mismatch → Error displayed, blocked  
✅ **Test 3**: Checksum tampered → "Invalid QR code"  
✅ **Test 4**: QR damaged (25% loss) → Error correction OR manual entry  
✅ **Test 5**: Non-existent device → "Device not found"

### 8.2 Photo Validation Testing

✅ **Test 6**: Blurred photo → Warning, allow submission  
✅ **Test 7**: Missing GPS → Warning, allow submission  
✅ **Test 8**: Wrong serial in photo → OCR detects mismatch, alert  
✅ **Test 9**: Photo too large (15MB) → Error "File too large"  
✅ **Test 10**: Incomplete set → Submission blocked, "2 more photos required"

### 8.3 Edge Cases

✅ **Test 11**: Offline capture → Auto-upload when online  
✅ **Test 12**: Clock skew (2h behind) → Server logs discrepancy, accepts  
✅ **Test 13**: Duplicate photo → Second upload rejected  
✅ **Test 14**: Storage quota exceeded → Error "Storage full"  
✅ **Test 15**: Upload during submission → Blocked "Wait for uploads"

---

## 9. IMPLEMENTATION STATUS

**Database Functions**: ✅ Implemented
- `generate_qr_code_payload()` - QR JSON with checksum
- `validate_qr_checksum()` - Verify authenticity
- `validate_photo_evidence()` - Check compliance
- `get_photo_audit_trail()` - Audit reporting

**Edge Functions**: ✅ Implemented
- `/upload-photo` - Photo upload with validation
- `/scan-device` - QR validation (enhanced)

**Database Schema**: ✅ Implemented
- Enhanced `photos` table with GPS, quality scores, validation
- Added QR metadata to `devices` table
- Indexes for performance optimization

**Mobile App**: 🔄 Ready for Integration
- QR scanner library integration required
- Camera capture UI implementation
- GPS metadata collection
- Offline photo queue

---

## 10. TRAINING & ROLLOUT

**Engineer Training** (2 hours):
1. QR code scanning workflow (30 min)
2. Photo evidence requirements (45 min)
3. Error handling and troubleshooting (30 min)
4. Q&A and hands-on practice (15 min)

**Admin Training** (1 hour):
1. Photo audit dashboard (20 min)
2. Evidence export tools (20 min)
3. Quality review process (20 min)

**Rollout Plan**:
- Week 1: Pilot with 5 engineers
- Week 2: Expand to 20 engineers
- Week 3: Full rollout
- Week 4: Optimization based on feedback

---

## DOCUMENT APPROVAL

**Prepared By**: Engineering Team  
**Reviewed By**: Compliance Officer, Operations Manager  
**Approved By**: Chief Technology Officer  
**Effective Date**: Upon Implementation  
**Next Review**: 2026-11-29

---

**END OF POLICY DOCUMENT**
