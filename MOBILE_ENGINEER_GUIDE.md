# Engineer Mobile Workflow - Implementation Guide

**Version**: 1.0
**Last Updated**: 2025-11-29
**Status**: ✅ Implemented

---

## Overview

The Engineer Mobile Workflow is a mobile-responsive web application that enables field engineers to manage their assigned service calls from start to completion. Engineers can view calls, navigate to locations, scan devices, capture photos, and complete calls with full offline support.

---

## Features Implemented

### ✅ Core Features
- **Call Management**: View assigned and in-progress calls with filters
- **Call Lifecycle**: Start call → Scan device → Complete call workflow
- **Device Validation**: Real-time bank matching validation
- **GPS Tracking**: Location capture at start and completion
- **Duration Tracking**: Live timer during active calls
- **Offline Indicators**: Clear status when working offline
- **Mobile Navigation**: Integration with Google Maps/Apple Maps

### ✅ Edge Functions
1. **start-call**: Mark call as started with GPS and timestamp
2. **scan-device**: Validate device with critical bank matching
3. **submit-call-completion**: Atomic completion with full validation

### ✅ Validation Rules
- Bank matching (CRITICAL): Device bank must equal call bank
- Device ownership: Device must be assigned to engineer
- Device status: Must be warehouse or issued for installation
- Minimum photos: 2 required for install/swap calls (UI ready, upload pending)
- Resolution notes: Minimum 20 characters required
- Started call: Must start call before completing

---

## User Journey

### 1. Login
**Route**: `/login`

Engineers use the existing EnhancedLogin component with email/password authentication.

**Future Enhancement**: Add phone OTP authentication for mobile-first experience.

---

### 2. Calls List
**Route**: `/mobile/calls`

**Features**:
- View all assigned and in-progress calls
- Filter by: All, Assigned, In Progress, Overdue, Today
- Search by call number, client name, or address
- Visual priority indicators (urgent=red, high=orange, medium=yellow, low=gray)
- Visual type badges (install, swap, deinstall, maintenance, breakdown)
- Offline status banner
- Last sync timestamp
- Pull-to-refresh capability

**UI Elements**:
- Call cards with:
  - Call number and type badge
  - Priority badge
  - Client name and address
  - Scheduled date
  - Status badge (assigned, in_progress)
  - Overdue/Due Today warnings

---

### 3. Call Detail
**Route**: `/mobile/calls/:id`

**Information Displayed**:
- Call number, type, and priority badges
- Live duration timer (when in progress)
- Client information (name, contact, phone, address)
- Call description
- Scheduled date
- Progress indicators (devices scanned, photos taken, start time)
- List of scanned devices with actions
- Call history timeline

**Actions Available**:

**When status = 'assigned'**:
- **Start Call** button (green, prominent)
  - Captures GPS coordinates
  - Records timestamp
  - Changes status to 'in_progress'
  - Starts duration timer

**When status = 'in_progress'**:
- **Navigate** button: Opens Google Maps/Apple Maps with destination
- **Scan Device** button: Navigate to scanner
- **Take Photo** button: Navigate to photo capture (UI ready, implementation pending)
- **Complete Call** button: Navigate to completion form
  - Disabled until requirements met
  - Shows error message if incomplete

---

### 4. Device Scanning
**Route**: `/mobile/calls/:id/scan`

**Features**:
- Manual serial number entry (QR scanning ready for mobile implementation)
- Real-time device validation against database
- Critical bank matching enforcement
- Device status checking
- Action selection (install, swap_in, swap_out, remove, inspect)

**Validation Flow**:
1. Engineer enters/scans serial number
2. Taps "Validate Device"
3. System calls `/functions/v1/scan-device` Edge Function
4. Edge Function checks:
   - Device exists in database
   - Device bank matches call bank (CRITICAL)
   - Device assigned to engineer
   - Device status is warehouse or issued
5. If validation fails: Show error with specific reason
6. If validation succeeds: Show device details and action selector
7. Engineer selects action and confirms
8. Device added to call_devices table
9. Device status updated
10. Return to Call Detail

**Bank Mismatch Error**:
```
CRITICAL ERROR: Bank Mismatch!

Device Bank: ABSA
Call Bank: FNB

You CANNOT install a device from one bank at a merchant of another bank.

Please scan a different device from your FNB inventory.
```

**Success Flow**:
- Device details displayed
- Green checkmark: "Bank Match Confirmed"
- Action selector dropdown
- "Confirm Device Action" button
- Success message and return to Call Detail

---

### 5. Call Completion
**Route**: `/mobile/calls/:id/complete`

**Validation Checklist**:
- ✅ Call started (has started_at timestamp)
- ✅ Device scanned (for install/swap calls)
- ✅ Resolution notes entered (minimum 20 characters)

**Form Fields**:
1. **Resolution Notes** (Required):
   - Textarea with 20 character minimum
   - Character counter (current/minimum and current/maximum)
   - Placeholder with guidance

2. **Merchant Satisfaction** (Optional):
   - 5-star rating selector
   - Visual feedback on selection

**Call Summary Display**:
- Started at: [timestamp]
- Duration: [calculated minutes]
- Devices: [count] with details

**Submit Process**:
1. Validate all requirements met
2. Calculate duration (completed_at - started_at)
3. Attempt to capture GPS coordinates
4. Call `/functions/v1/submit-call-completion` Edge Function
5. Edge Function performs atomic transaction:
   - Update call status to 'completed'
   - Update devices statuses based on actions
   - Create call_devices records
   - Create stock_movements records
   - Create call_history record
   - Update engineer_aggregates
6. Show success message
7. Return to Calls List

---

## Edge Functions Details

### 1. start-call

**Endpoint**: `POST /functions/v1/start-call`

**Request**:
```json
{
  "call_id": "uuid",
  "start_gps": {
    "latitude": 12.345,
    "longitude": 67.890
  },
  "start_timestamp": "2025-11-29T10:30:00Z"
}
```

**Process**:
1. Validate call exists and assigned to engineer
2. Validate call status is 'assigned'
3. Update call:
   - status = 'in_progress'
   - started_at = timestamp
   - metadata.start_gps = coordinates
4. Create call_history record
5. Return success

**Response**:
```json
{
  "success": true,
  "call_id": "uuid",
  "started_at": "2025-11-29T10:30:00Z",
  "message": "Call started successfully"
}
```

---

### 2. scan-device

**Endpoint**: `POST /functions/v1/scan-device`

**Request**:
```json
{
  "call_id": "uuid",
  "serial_number": "SN-123456",
  "scan_timestamp": "2025-11-29T10:35:00Z",
  "scan_gps": {
    "latitude": 12.345,
    "longitude": 67.890
  }
}
```

**Validation Process**:
1. Query device by serial_number with bank JOIN
2. Query call by call_id with bank JOIN
3. Check device exists
4. **CRITICAL**: Check device.device_bank = call.client_bank
5. Check device.assigned_to = engineer_id
6. Check device.status IN ('warehouse', 'issued')
7. Return result

**Success Response**:
```json
{
  "success": true,
  "device": {
    "id": "uuid",
    "serial_number": "SN-123456",
    "model": "Model X",
    "device_bank": "uuid",
    "bank_name": "First National Bank",
    "bank_code": "FNB",
    "status": "issued",
    "assigned_to": "uuid",
    "bank_match": true
  },
  "message": "Device validated successfully"
}
```

**Bank Mismatch Response**:
```json
{
  "success": false,
  "error_code": "BANK_MISMATCH",
  "error_message": "Device bank does not match call bank",
  "device": {
    "device_bank": "uuid",
    "device_bank_name": "ABSA",
    "device_bank_code": "ABSA"
  },
  "call": {
    "client_bank": "uuid",
    "client_bank_name": "FNB",
    "client_bank_code": "FNB"
  },
  "bank_match": false
}
```

---

### 3. submit-call-completion

**Endpoint**: `POST /functions/v1/submit-call-completion`

**Request**:
```json
{
  "call_id": "uuid",
  "resolution_notes": "Device installed successfully...",
  "actual_duration_minutes": 45,
  "completion_timestamp": "2025-11-29T11:15:00Z",
  "completion_gps": {
    "latitude": 12.345,
    "longitude": 67.890
  },
  "merchant_rating": 5,
  "devices": [
    {
      "device_id": "uuid",
      "serial_number": "SN-123456",
      "action": "install",
      "notes": ""
    }
  ]
}
```

**Atomic Transaction**:
1. Validate call status is 'in_progress'
2. Validate resolution notes >= 20 characters
3. Validate devices for call type
4. Validate device banks match call bank
5. BEGIN TRANSACTION
6. Update call status to 'completed'
7. Update devices statuses based on actions:
   - install/swap_in → 'installed', set installed_at_client
   - swap_out/remove → 'returned', clear installed_at_client
8. Create call_devices records
9. Create stock_movements records
10. Create call_history record
11. Update engineer_aggregates
12. COMMIT TRANSACTION
13. Return success

**Success Response**:
```json
{
  "success": true,
  "call_id": "uuid",
  "call_number": "CALL-001",
  "completed_at": "2025-11-29T11:15:00Z",
  "devices_updated": 1,
  "message": "Call completed successfully!"
}
```

---

## Offline Support (Implemented UI, Sync Pending)

### Current Implementation

**Offline Detection**:
- Listens to `online`/`offline` browser events
- Updates UI indicator in real-time
- Shows warning banner when offline

**Offline Indicators**:
- Red banner: "Working offline. Changes will sync when online."
- WiFi icon with slash
- Disabled refresh button when offline
- Last sync timestamp displayed

**Cached Data**:
- Calls list cached in localStorage
- Loaded from cache when offline
- Shows cached data with offline indicator

### Future Implementation Needed

**Offline Queue System**:
1. Create IndexedDB or SQLite database for offline queue
2. Queue all write operations when offline:
   - start-call actions
   - scan-device actions
   - submit-call-completion actions
3. Auto-sync when connection restored
4. Handle conflicts with server state
5. Retry failed operations with exponential backoff

**Sync Queue Structure**:
```typescript
interface SyncQueueItem {
  id: string;
  action_type: 'start_call' | 'scan_device' | 'complete_call';
  payload: any;
  created_at: string;
  retry_count: number;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
  error_message?: string;
}
```

---

## Photo Capture (UI Ready, Implementation Pending)

### Current State

The "Take Photo" button navigates to `/mobile/calls/:id/photo` but the component is not yet implemented.

### Implementation Needed

**Component**: `src/pages/mobile/MobilePhotoCapture.tsx`

**Features Required**:
1. Camera access using browser MediaDevices API
2. Photo type selector: Installation, Serial Number, Signature, Before, After, Damage
3. Capture button with flash toggle
4. Photo preview with retake/confirm options
5. Local storage until uploaded
6. Upload to Supabase Storage
7. Create photos table records
8. Thumbnail generation
9. EXIF data preservation (timestamp, GPS)
10. Compression (max 2MB per photo)

**Supabase Storage Setup**:
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-photos', 'call-photos', false);

-- RLS policies
CREATE POLICY "Engineers can upload photos for their calls"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call-photos' AND
  EXISTS (
    SELECT 1 FROM calls
    WHERE calls.id::text = (storage.foldername(name))[1]
    AND calls.assigned_engineer = auth.uid()
  )
);

CREATE POLICY "Engineers can view photos for their calls"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-photos' AND
  EXISTS (
    SELECT 1 FROM calls
    WHERE calls.id::text = (storage.foldername(name))[1]
    AND calls.assigned_engineer = auth.uid()
  )
);
```

---

## Testing Guide

### Manual Testing Checklist

**1. Login Flow**:
- [ ] Login with engineer credentials
- [ ] Verify redirect to /mobile/calls or default dashboard

**2. Calls List**:
- [ ] View assigned calls
- [ ] Filter by status (assigned, in_progress, overdue, today)
- [ ] Search by call number, name, address
- [ ] Verify priority colors (red, orange, yellow, gray)
- [ ] Verify type badges (install, swap, etc.)
- [ ] Test pull-to-refresh
- [ ] Test offline indicator

**3. Call Detail**:
- [ ] View call details
- [ ] Tap phone number to call
- [ ] Tap navigate to open maps
- [ ] Start call successfully
- [ ] Verify duration timer starts
- [ ] Verify status changes to in_progress

**4. Device Scanning**:
- [ ] Navigate to scan page
- [ ] Enter valid serial number
- [ ] Verify validation success
- [ ] Test bank mismatch scenario
- [ ] Test device not found scenario
- [ ] Test device not assigned scenario
- [ ] Select action and confirm
- [ ] Verify device appears in call detail

**5. Call Completion**:
- [ ] Navigate to completion form
- [ ] Verify validation checklist
- [ ] Enter resolution notes (< 20 chars, verify error)
- [ ] Enter resolution notes (>= 20 chars, verify success)
- [ ] Rate merchant satisfaction
- [ ] Submit completion
- [ ] Verify call status changes to completed
- [ ] Verify device status updated

**6. Bank Mismatch**:
- [ ] Create test data: Engineer with FNB calls and ABSA devices
- [ ] Start FNB call
- [ ] Attempt to scan ABSA device
- [ ] Verify critical error message displayed
- [ ] Verify cannot proceed with mismatched device
- [ ] Scan FNB device
- [ ] Verify success and can proceed

**7. Offline Mode**:
- [ ] Load calls while online
- [ ] Disconnect network
- [ ] Verify offline banner appears
- [ ] Verify calls still visible (cached)
- [ ] Verify refresh button disabled
- [ ] Reconnect network
- [ ] Verify offline banner disappears

---

## Database Schema Dependencies

### Tables Used

1. **calls**: Main call data
2. **call_devices**: Junction table for devices used in calls
3. **call_history**: Audit trail of status changes
4. **devices**: Device inventory
5. **stock_movements**: Device movement audit trail
6. **user_profiles**: Engineer profiles
7. **banks**: Bank information (for validation)
8. **photos** (pending): Photo documentation

### Key Relationships

```
calls.assigned_engineer → user_profiles.id
calls.client_bank → banks.id
devices.device_bank → banks.id
devices.assigned_to → user_profiles.id
call_devices.call_id → calls.id
call_devices.device_id → devices.id
```

---

## Security Considerations

### Authentication
- All routes require authentication via ProtectedRoute
- JWT token passed in Authorization header
- Token validation in Edge Functions

### Authorization
- Engineers can only view/modify their assigned calls
- Engineers can only scan devices assigned to them
- RLS policies enforce row-level security

### Critical Validations
- Bank matching enforced at multiple levels:
  - Edge Function validation
  - UI validation
  - Database constraint (via triggers)
- Device ownership verified
- Call assignment verified
- No bypass mechanisms

---

## Future Enhancements

### High Priority
1. ✅ Photo capture and upload implementation
2. ✅ Offline queue with IndexedDB
3. ✅ Conflict resolution for offline edits
4. ✅ Push notifications for new assignments
5. ✅ Real QR code scanning (using device camera)

### Medium Priority
6. Route optimization for multiple calls
7. Digital signature capture for merchant sign-off
8. Voice notes for resolution notes
9. Bulk photo upload optimization
10. Progressive Web App (PWA) installation

### Low Priority
11. Dark mode support
12. Multilingual support
13. Accessibility improvements (screen readers)
14. Performance metrics dashboard

---

## Troubleshooting

### Issue: Call not starting

**Symptoms**: "Start Call" button doesn't work

**Checks**:
1. Verify call status is 'assigned'
2. Verify call is assigned to current engineer
3. Check browser console for errors
4. Verify Edge Function is deployed
5. Check Supabase auth token is valid

**Solution**: Check call assignment and status in database

---

### Issue: Device scan fails

**Symptoms**: "Device not found" or "Bank mismatch" error

**Checks**:
1. Verify serial number is correct
2. Verify device exists in devices table
3. Check device.device_bank matches call.client_bank
4. Verify device.assigned_to equals engineer ID
5. Check device.status is 'warehouse' or 'issued'

**Solution**: Verify device data and bank matching in database

---

### Issue: Cannot complete call

**Symptoms**: "Complete Call" button disabled

**Checks**:
1. Verify call status is 'in_progress'
2. Check devices scanned (for install/swap)
3. Verify resolution notes >= 20 characters
4. Check validation checklist on completion form

**Solution**: Complete all required steps before submission

---

### Issue: Offline mode not working

**Symptoms**: App doesn't show cached data when offline

**Checks**:
1. Verify localStorage has cached_calls
2. Check browser console for errors
3. Verify offline event listener attached
4. Test with browser DevTools network throttling

**Solution**: Clear cache and reload while online

---

## API Reference Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/functions/v1/start-call` | POST | Start a call | Yes |
| `/functions/v1/scan-device` | POST | Validate and scan device | Yes |
| `/functions/v1/submit-call-completion` | POST | Complete a call | Yes |

---

## Mobile-First Design

### Responsive Breakpoints
- Mobile: 0-640px (primary target)
- Tablet: 641-1024px
- Desktop: 1025px+

### Touch-Friendly Design
- Large tap targets (minimum 44x44px)
- Prominent action buttons
- Bottom-fixed navigation for easy thumb access
- Swipe gestures for navigation (future)
- Pull-to-refresh for data sync

### Performance Optimizations
- Lazy loading for images
- Code splitting by route
- Compressed assets
- Minimal bundle size
- Fast initial page load

---

## Deployment Notes

### Environment Variables Required
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Edge Functions Deployed
- start-call
- scan-device
- submit-call-completion
- assign-calls (from previous block)

### Build Command
```bash
npm run build
```

### Preview
```bash
npm run preview
```

---

## Support & Maintenance

### Monitoring
- Check Edge Function logs in Supabase dashboard
- Monitor call completion rates
- Track bank mismatch errors
- Review offline queue failures

### Updates
- Keep Supabase client library updated
- Monitor for security patches
- Update browser compatibility matrix
- Test on new mobile OS versions

---

**End of Guide**
