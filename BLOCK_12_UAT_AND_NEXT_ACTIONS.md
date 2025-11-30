# Block 12 — Reflection, UAT, & Next Prompt Actions (CoSTAR)

## Executive Summary

This document provides the final validation steps, User Acceptance Testing (UAT) scenarios, and actionable next steps for completing the CoSTAR Field Service Management system implementation. It includes specific Bolt.new prompts that can be executed in sequence to automate remaining development tasks.

---

## 1. User Acceptance Testing (UAT) Scenarios

### UAT Scenario Matrix

These 10 scenarios must pass before pilot launch. Each scenario includes preconditions, steps, and expected outcomes.

---

### **UAT-001: Engineer Login & OTP Authentication**

**Priority**: P0 (Critical)
**Role**: Field Engineer
**Preconditions**:
- Engineer account exists in system
- Engineer has received login credentials
- Mobile device has internet connection

**Test Steps**:
1. Navigate to mobile app login page
2. Enter email: `engineer@costar.test`
3. Enter password: `Engineer123!`
4. Click "Sign In"
5. Verify redirect to calls dashboard

**Expected Results**:
- ✅ Login successful within 2 seconds
- ✅ User redirected to `/mobile/calls`
- ✅ Engineer name displayed in header
- ✅ Active calls list visible
- ✅ Session persists on page refresh

**Acceptance Criteria**:
- Login success rate: 100%
- No authentication errors in logs
- Session token stored securely
- Auto-logout after 24 hours of inactivity

**Rollback/Failure Action**:
- If login fails, check RLS policies on user_profiles
- Verify auth.users record exists
- Check CORS configuration

---

### **UAT-002: Admin Login & Dashboard Access**

**Priority**: P0 (Critical)
**Role**: System Administrator
**Preconditions**:
- Admin account exists with role='admin'
- Admin has received credentials

**Test Steps**:
1. Navigate to admin portal: `https://app.costar-field.com/login`
2. Enter email: `admin@costar.test`
3. Enter password: `Admin123!`
4. Click "Sign In"
5. Verify dashboard loads with charts

**Expected Results**:
- ✅ Login successful
- ✅ Dashboard shows 6 metric cards (Total Calls, Active Engineers, etc.)
- ✅ Charts render data
- ✅ Navigation shows admin-only menu items (Engineers, Banks, Approvals)
- ✅ Engineer-only routes are inaccessible

**Acceptance Criteria**:
- Dashboard loads < 2 seconds
- All metrics display accurate counts
- Charts show last 7 days of data
- Admin can access all pages
- Non-admin users cannot access admin pages (verified via direct URL)

**Test Data Setup**:
```sql
-- Create admin user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@costar.test', crypt('Admin123!', gen_salt('bf')), NOW());

INSERT INTO user_profiles (id, email, full_name, role, status)
VALUES ((SELECT id FROM auth.users WHERE email = 'admin@costar.test'),
        'admin@costar.test', 'System Admin', 'admin', 'active');
```

---

### **UAT-003: Call Assignment with No Available Stock**

**Priority**: P1 (High)
**Role**: System Administrator
**Preconditions**:
- At least 1 active bank exists
- At least 1 active engineer assigned to bank
- **No devices in warehouse stock**
- Admin is logged in

**Test Steps**:
1. Navigate to Calls page
2. Click "Create Call"
3. Fill in form:
   - Bank: Test Bank
   - Client Name: Main Branch
   - Address: 123 Test St
   - Phone: +1234567890
   - Type: Install
   - Priority: High
   - Scheduled Date: Tomorrow
4. Submit form
5. Wait for assignment algorithm to run (< 5 seconds)
6. Check call status

**Expected Results**:
- ✅ Call created successfully with status='pending'
- ✅ Assignment algorithm runs
- ⚠️ Call remains in 'pending' status (no devices available)
- ✅ Admin sees alert/notification: "No devices available for assignment"
- ✅ Call visible in Pending Approvals or Calls list with indicator
- ✅ Engineer does NOT receive call assignment

**Acceptance Criteria**:
- System gracefully handles no-stock scenario
- Clear messaging to admin
- Call can be manually assigned later when stock arrives
- No system errors logged
- Assignment algorithm doesn't crash

**Edge Cases to Test**:
- Devices exist but all are 'issued' or 'installed'
- Devices exist but assigned to different bank
- Devices exist but marked as 'faulty'

---

### **UAT-004: Successful Device Installation Flow**

**Priority**: P0 (Critical)
**Role**: Field Engineer
**Preconditions**:
- Engineer is logged in to mobile app
- Call is assigned to engineer with status='assigned'
- Device is issued to engineer
- QR code is generated for device

**Test Steps**:
1. Engineer opens mobile app
2. Views call in "My Calls" list
3. Taps call to view details
4. Taps "Start Call" button
5. Call status changes to 'in_progress'
6. Taps "Scan Device" button
7. Scans device QR code using camera
8. QR code validates successfully
9. Takes "Before Installation" photo
10. Completes installation
11. Takes "After Installation" photo
12. Fills in completion notes
13. Taps "Submit Completion"

**Expected Results**:
- ✅ Call status: pending → assigned → in_progress → completed
- ✅ QR scan success in < 2 seconds
- ✅ Device status: issued → installed
- ✅ Device.installed_at_client = client address
- ✅ Photos uploaded successfully (both before/after)
- ✅ Call.completed_at timestamp recorded
- ✅ Engineer sees success confirmation
- ✅ Admin can view completed call with photos

**Acceptance Criteria**:
- End-to-end flow completes in < 5 minutes
- All status transitions logged correctly
- Photos visible in admin dashboard
- Device trackable in admin system
- No orphaned records

**Photo Requirements**:
- Format: JPEG, PNG
- Max size: 5MB per photo
- Min resolution: 640x480
- Metadata: Timestamp, GPS coordinates (if available)

**Test with Multiple Scenarios**:
- ✅ Install 1 device
- ✅ Install 2 devices (same call)
- ✅ Install with poor lighting
- ✅ Install with slow network (simulate 3G)

---

### **UAT-005: Bank Mismatch Blocked (Security Test)**

**Priority**: P0 (Critical)
**Role**: Field Engineer
**Preconditions**:
- Engineer is assigned to Bank A
- Call is for Bank B (different bank)
- Engineer attempts to access call

**Test Steps**:
1. Admin creates call for Bank B
2. System attempts to assign call
3. Engineer from Bank A tries to view call
4. Engineer from Bank A tries to scan device from Bank B
5. Verify security blocks unauthorized access

**Expected Results**:
- ✅ Assignment algorithm DOES NOT assign Bank B call to Bank A engineer
- ✅ If engineer tries direct URL access, receives 403 Forbidden
- ✅ QR scan of Bank B device by Bank A engineer is REJECTED
- ✅ Error message: "Device not assigned to your bank"
- ✅ Security event logged in audit trail
- ✅ Admin receives alert for security violation attempt

**Acceptance Criteria**:
- RLS policies enforce bank separation
- No data leakage across banks
- Clear error messages (no technical details exposed)
- All security events logged
- Zero successful unauthorized access attempts

**Security Verification**:
```sql
-- Verify RLS blocks cross-bank access
SET SESSION ROLE engineer;
SET SESSION "app.user_id" = '<engineer-from-bank-A-id>';

-- This should return ZERO rows for Bank B calls
SELECT * FROM calls WHERE client_bank = '<bank-B-id>';

-- This should return empty set
SELECT * FROM devices WHERE device_bank = '<bank-B-id>';
```

---

### **UAT-006: Device Swap (Replace Faulty Device)**

**Priority**: P1 (High)
**Role**: Field Engineer
**Preconditions**:
- Device #1 is installed at client site (status='installed')
- Device #1 becomes faulty
- Device #2 is available in warehouse
- Swap call is created

**Test Steps**:
1. Admin creates call type='swap' for client
2. Call assigned to engineer with Device #2
3. Engineer arrives at site
4. Engineer scans Device #1 QR (device to remove)
5. System validates Device #1 is currently installed at this location
6. Engineer takes "Before" photo showing faulty device
7. Engineer removes Device #1
8. Engineer scans Device #2 QR (new device)
9. Engineer installs Device #2
10. Engineer takes "After" photo showing new device
11. Engineer submits completion

**Expected Results**:
- ✅ Device #1 status: installed → returned (or faulty)
- ✅ Device #1.installed_at_client = NULL
- ✅ Device #2 status: issued → installed
- ✅ Device #2.installed_at_client = client address
- ✅ Call type='swap' recorded
- ✅ Both devices tracked in stock_movements
- ✅ Photos show both old and new devices
- ✅ Client maintains service continuity

**Acceptance Criteria**:
- Device swap completes in < 10 minutes
- No service downtime recorded
- Both devices properly tracked
- Photos mandatory (before/after)
- Stock counts accurate

**Stock Movement Verification**:
```sql
-- Verify both devices recorded in stock movements
SELECT
  device_id,
  movement_type,
  from_status,
  to_status,
  created_at
FROM stock_movements
WHERE call_id = '<swap-call-id>'
ORDER BY created_at;

-- Expected 2 movements:
-- 1. Device #1: installed → returned
-- 2. Device #2: issued → installed
```

---

### **UAT-007: Mark Device as Faulty**

**Priority**: P1 (High)
**Role**: Field Engineer / Admin
**Preconditions**:
- Device exists with status='issued' or 'installed'
- User has permission to mark devices faulty

**Test Steps** (Engineer Scenario):
1. Engineer attempts installation
2. Device fails to power on or function
3. Engineer taps "Report Issue" button
4. Selects "Device Faulty"
5. Takes photo of defective device
6. Enters fault description: "Device won't power on"
7. Submits report

**Test Steps** (Admin Scenario):
1. Admin views device in Devices page
2. Clicks device actions menu
3. Selects "Mark as Faulty"
4. Enters reason: "Customer reported malfunction"
5. Confirms action

**Expected Results**:
- ✅ Device status changes to 'faulty'
- ✅ Device removed from engineer's inventory (if issued)
- ✅ Device flagged for return to warehouse
- ✅ Photo evidence attached (engineer scenario)
- ✅ Fault reason recorded in device.notes
- ✅ Stock counts updated (-1 available)
- ✅ Alert sent to inventory manager
- ✅ Device excluded from future assignments

**Acceptance Criteria**:
- Faulty devices never assigned to calls
- Clear audit trail of who marked faulty and when
- Photo evidence required for field-reported faults
- Inventory alerts trigger at threshold (e.g., < 10% available)

**Reversal Process**:
```sql
-- Admin can reverse if device is repaired
UPDATE devices
SET status = 'warehouse',
    notes = 'Repaired and tested'
WHERE id = '<device-id>' AND status = 'faulty';
```

---

### **UAT-008: Concurrent Installation Attempts (Race Condition)**

**Priority**: P1 (High)
**Role**: System Test (2 Engineers simultaneously)
**Preconditions**:
- Device #1 is assigned to Engineer A for Call X
- System experiences edge case where Device #1 is also shown to Engineer B for Call Y (race condition)

**Test Steps**:
1. Engineer A starts Call X, scans Device #1 at Site X
2. **Simultaneously** (within 1 second), Engineer B starts Call Y, attempts to scan Device #1 at Site Y
3. System must detect duplicate installation attempt
4. First scan (Engineer A) succeeds
5. Second scan (Engineer B) fails with error

**Expected Results**:
- ✅ Engineer A's scan succeeds
- ✅ Device #1 status changes to 'installed' for Call X
- ❌ Engineer B's scan REJECTED with error
- ✅ Error message: "Device already installed. Please scan a different device."
- ✅ Engineer B prompted to select another device
- ✅ No data corruption or duplicate installations
- ✅ Idempotency check prevents duplicate submissions

**Acceptance Criteria**:
- Database constraints prevent duplicate installations
- Idempotency keys used for all mutations
- Clear error messaging to second engineer
- No system crashes or deadlocks
- Transaction rollback works correctly

**Database Protection**:
```sql
-- Unique constraint prevents duplicate installations
ALTER TABLE devices
ADD CONSTRAINT devices_installation_unique
UNIQUE (serial_number, installed_at_client)
WHERE status = 'installed';

-- Check constraint validates status transitions
ALTER TABLE devices
ADD CONSTRAINT devices_status_transition_valid
CHECK (
  (status = 'warehouse' AND assigned_to IS NULL) OR
  (status = 'issued' AND assigned_to IS NOT NULL) OR
  (status = 'installed' AND installed_at_client IS NOT NULL) OR
  (status IN ('faulty', 'returned'))
);
```

**Load Testing**:
- Simulate 10 concurrent installation attempts
- Verify only 1 succeeds per device
- Verify all others receive clear rejection

---

### **UAT-009: Mobile Offline Sync (Progressive Enhancement)**

**Priority**: P2 (Nice to Have)
**Role**: Field Engineer
**Preconditions**:
- Engineer is logged in on mobile device
- Engineer is viewing assigned call details
- Network connection is lost (airplane mode)

**Test Steps**:
1. Engineer opens mobile app with internet
2. Loads call details (cached)
3. **Disable network** (airplane mode)
4. Engineer views call details (should still display from cache)
5. Engineer takes photos (saved locally)
6. Engineer fills completion form (saved locally)
7. Engineer attempts to submit (queued)
8. **Re-enable network**
9. App auto-syncs queued data
10. Verify data submitted successfully

**Expected Results**:
- ✅ Call details visible offline (from cache)
- ✅ Photos saved to local storage
- ✅ Form data saved to IndexedDB/localStorage
- ⚠️ "Submit" button shows "Queued for upload" message
- ✅ Upon reconnection, data auto-syncs within 10 seconds
- ✅ User sees "Sync complete" confirmation
- ✅ No data loss

**Acceptance Criteria** (If Implemented):
- Offline mode gracefully degrades
- User aware of offline status (indicator)
- Queued actions retry automatically
- Maximum 5 retry attempts with exponential backoff
- Manual sync trigger available

**Implementation Status**:
- ⚠️ **Phase 1**: Not implemented (show error message)
- ✅ **Phase 2**: Implement Service Worker caching
- ✅ **Phase 3**: Implement IndexedDB queue
- ✅ **Phase 4**: Background sync API

**Graceful Degradation** (Current):
```typescript
// If offline, show clear error message
if (!navigator.onLine) {
  alert('You are offline. Please connect to the internet to submit this call.');
  return;
}

// Queue for future implementation
// queueForSync(callData, photos);
```

---

### **UAT-010: Stock Reconciliation Export & Accuracy**

**Priority**: P1 (High)
**Role**: Inventory Manager / Admin
**Preconditions**:
- System has been running for at least 7 days
- Multiple device movements have occurred
- Stock counts may have drifted

**Test Steps**:
1. Admin navigates to Stock Movements page
2. Clicks "Run Reconciliation"
3. System generates reconciliation report
4. Compare system counts vs physical warehouse counts
5. Identify discrepancies
6. Export reconciliation report to CSV
7. Review exported data

**Expected Results**:
- ✅ Reconciliation report generated in < 10 seconds
- ✅ Report shows:
  - Total devices by status (warehouse, issued, installed, faulty)
  - Devices assigned to each engineer
  - Devices at each location
  - Discrepancies highlighted
- ✅ CSV export includes:
  - Serial number
  - Model
  - Status
  - Assigned to (engineer name)
  - Location
  - Last movement date
- ✅ Accuracy: 99.9%+ match with physical counts

**Acceptance Criteria**:
- Reconciliation identifies mismatches
- Discrepancies <= 0.1% of total inventory
- Export completes in < 5 seconds for 1000 devices
- CSV format compatible with Excel
- Data includes all required fields for audit

**Reconciliation SQL**:
```sql
-- Generate reconciliation report
SELECT
  status,
  COUNT(*) as system_count,
  ARRAY_AGG(serial_number ORDER BY serial_number) as devices
FROM devices
GROUP BY status

UNION ALL

SELECT
  'total' as status,
  COUNT(*) as system_count,
  NULL as devices
FROM devices;

-- Identify orphaned devices (data integrity check)
SELECT
  d.serial_number,
  d.status,
  d.assigned_to,
  d.installed_at_client,
  'Issue: Issued but no engineer' as problem
FROM devices d
WHERE d.status = 'issued' AND d.assigned_to IS NULL

UNION ALL

SELECT
  d.serial_number,
  d.status,
  d.assigned_to,
  d.installed_at_client,
  'Issue: Installed but no location' as problem
FROM devices d
WHERE d.status = 'installed' AND d.installed_at_client IS NULL;
```

**Export API**:
```typescript
// Edge function: reconciliation-export
const response = await fetch('/functions/v1/reconciliation-export', {
  headers: { Authorization: `Bearer ${token}` }
});

const csv = await response.text();
// Returns CSV with headers:
// serial_number,model,bank,status,assigned_to,location,last_movement
```

**Discrepancy Resolution**:
- If mismatch found, investigate last 5 movements
- Check stock_movements table for audit trail
- Manually correct status if needed
- Document reason for adjustment

---

## 2. Follow-Up Bolt.new Prompts (Automation Chain)

These 5 prompts should be executed **in order** to complete system implementation. Each prompt is self-contained and can be pasted directly into Bolt.new or Claude Code.

### **Recommended Execution Order**:
```
1. Generate Seed Data (Day 1)
   ↓
2. Create SQL RPCs & Triggers (Day 2)
   ↓
3. Scaffold Edge Functions (Day 3)
   ↓
4. Generate OpenAPI Spec (Day 4)
   ↓
5. Create CI/CD Pipeline (Day 5)
```

---

### **Prompt 1: Generate Comprehensive Seed Data**

#### **Title**: Generate Production-Ready Seed Data for CoSTAR System

#### **Prompt to Paste**:
```
Generate comprehensive seed data for the CoSTAR Field Service Management system with the following requirements:

1. **Banks/Customers** (10 realistic banks):
   - Include major banks: Wells Fargo, Bank of America, Chase, Citibank, etc.
   - Each with full contact details (name, code, address, contact person, email, phone)
   - Mix of active and inactive banks
   - Realistic addresses in different US states

2. **Warehouses** (3 warehouses):
   - Main Warehouse (New York)
   - West Coast Warehouse (Los Angeles)
   - Central Warehouse (Chicago)
   - Include manager names, phone numbers, capacity

3. **Couriers** (5 courier companies):
   - FedEx, UPS, DHL, USPS, Local Courier
   - Include tracking URL patterns
   - Contact information

4. **Field Engineers** (20 engineers):
   - Distribute across banks (2-3 engineers per bank)
   - Realistic names, emails (firstname.lastname@costar.test)
   - Phone numbers in format +1-XXX-XXX-XXXX
   - Mix of active/inactive status

5. **Devices** (200 POS devices):
   - Serial numbers: Format SN-BANK-YYYY-NNNN (e.g., SN-WF-2025-0001)
   - Models: PAX S920, PAX A920, Ingenico Move5000, Verifone V400c
   - Status distribution: 60% warehouse, 25% issued, 10% installed, 5% faulty
   - Properly linked to banks and engineers

6. **Service Calls** (50 calls):
   - Types: Install (40%), Swap (20%), Maintenance (20%), Breakdown (10%), Deinstall (10%)
   - Priorities: Low (20%), Medium (50%), High (20%), Urgent (10%)
   - Status distribution: Pending (20%), Assigned (30%), In Progress (20%), Completed (30%)
   - Scheduled dates: Mix of past, today, and future (next 30 days)
   - Realistic client addresses (bank branches)

Generate SQL INSERT statements that can be executed in Supabase. Include:
- Proper foreign key relationships
- UUIDs where needed (use gen_random_uuid())
- Timestamps (use NOW() with offsets for historical data)
- Data validation (no orphaned records)

Output format: Single .sql file with clear section headers and comments.
```

#### **Expected Output**:
- `seed_data.sql` file with ~500 lines
- Executable SQL statements
- Realistic, coherent data
- Proper constraints and relationships

#### **Usage**:
```bash
# Apply seed data to database
psql $DATABASE_URL < seed_data.sql

# Or via Supabase CLI
supabase db reset  # Clear and reseed
```

---

### **Prompt 2: Create SQL RPCs & Database Triggers**

#### **Title**: Generate SQL Stored Procedures & Triggers for Business Logic

#### **Prompt to Paste**:
```
Create SQL Remote Procedure Calls (RPCs) and database triggers for the CoSTAR Field Service Management system:

1. **RPC: Get Engineer Availability**
   - Function name: `get_engineer_availability(p_bank_id UUID, p_date DATE)`
   - Returns: List of engineers with their active call count, device inventory count, and distance score
   - Use for assignment algorithm optimization

2. **RPC: Get Device Stock Summary**
   - Function name: `get_device_stock_summary(p_bank_id UUID DEFAULT NULL)`
   - Returns: Aggregated device counts by status and bank
   - Include: total, available, issued, installed, faulty, in_transit

3. **RPC: Create Stock Movement**
   - Function name: `create_stock_movement(p_device_id UUID, p_from_status TEXT, p_to_status TEXT, p_call_id UUID DEFAULT NULL, p_notes TEXT DEFAULT NULL)`
   - Inserts into stock_movements table
   - Validates status transitions
   - Returns: Movement record with timestamp

4. **RPC: Reconcile Inventory**
   - Function name: `reconcile_inventory(p_bank_id UUID DEFAULT NULL)`
   - Returns: Discrepancies between expected and actual counts
   - Checks for orphaned records (issued but no engineer, installed but no location)

5. **Trigger: Auto-Create Stock Movement**
   - Trigger name: `trg_device_status_change`
   - Fires on: UPDATE of devices.status
   - Action: Automatically insert into stock_movements table
   - Include: old status, new status, changed_by user

6. **Trigger: Update Call Timestamps**
   - Trigger name: `trg_call_status_timestamps`
   - Fires on: UPDATE of calls.status
   - Action: Set started_at when status changes to 'in_progress', set completed_at when 'completed'

7. **Trigger: Validate Device Bank Assignments**
   - Trigger name: `trg_validate_device_bank`
   - Fires on: INSERT or UPDATE of calls
   - Action: Ensure assigned device belongs to same bank as call
   - Raise exception if mismatch

8. **Trigger: Update Engineer Aggregates**
   - Trigger name: `trg_update_engineer_stats`
   - Fires on: UPDATE of calls.status or devices.assigned_to
   - Action: Refresh engineer_aggregates materialized view (or update counter cache)

Requirements:
- Use SECURITY DEFINER where appropriate
- Add proper error handling (RAISE EXCEPTION with meaningful messages)
- Include comments explaining business logic
- Return structured JSON for RPCs
- Add RETURNS TABLE or RETURNS SETOF definitions
- Use proper transaction handling

Output format: Single migration file `018_create_rpcs_and_triggers.sql`
```

#### **Expected Output**:
- Migration file with 8 RPCs and 4 triggers
- Comprehensive error handling
- Performance-optimized queries
- Documentation comments

#### **Usage**:
```bash
# Apply migration
supabase migration up

# Test RPC
SELECT * FROM get_engineer_availability('bank-uuid', CURRENT_DATE);
```

---

### **Prompt 3: Scaffold All Edge Functions**

#### **Title**: Generate Edge Function Scaffolds with TypeScript, Validation, and Error Handling

#### **Prompt to Paste**:
```
Create production-ready Edge Function scaffolds for the CoSTAR Field Service Management system. Generate complete TypeScript implementations for all 12 Edge Functions:

**Core Functions**:
1. `assign-calls` - Assign pending calls to available engineers
2. `issue-device-to-engineer` - Issue devices from warehouse to engineer
3. `scan-device` - Validate QR code and verify device
4. `start-call` - Engineer starts working on assigned call
5. `submit-call-completion` - Engineer completes call with photos
6. `upload-photo` - Upload and validate photo evidence
7. `mark-device-faulty` - Mark device as faulty with reason
8. `transfer-device` - Transfer device between engineers
9. `bulk-import-devices` - CSV import of multiple devices
10. `create-shipment` - Create courier shipment tracking
11. `reconciliation-export` - Export inventory reconciliation CSV
12. `auth-validator` - Validate JWT and extract user claims

**Requirements for Each Function**:

1. **Structure**:
   - Import required dependencies (Supabase client, validation libraries)
   - Define TypeScript interfaces for request/response
   - Implement CORS headers (required for browser access)
   - Handle OPTIONS preflight requests
   - Use try-catch error handling
   - Return structured JSON responses

2. **Authentication**:
   - Extract JWT from Authorization header
   - Verify user is authenticated
   - Check user role (admin vs engineer)
   - Validate RLS policies apply

3. **Input Validation**:
   - Validate all required fields present
   - Check data types and formats
   - Validate UUIDs, emails, phone numbers
   - Return 400 Bad Request for invalid input

4. **Business Logic**:
   - Implement core functionality
   - Use database transactions where needed
   - Call RPCs for complex operations
   - Update multiple tables atomically

5. **Error Handling**:
   - Use custom error classes (BadRequestError, UnauthorizedError, NotFoundError)
   - Return appropriate HTTP status codes (200, 400, 401, 403, 404, 500)
   - Log errors to Supabase logs
   - Include request ID for tracking

6. **Monitoring**:
   - Use shared monitoring utility (withMonitoring wrapper)
   - Log execution time
   - Track success/error rates
   - Include user_id in logs

7. **Idempotency**:
   - Accept idempotency-key header (optional)
   - Check if operation already completed
   - Return cached result if duplicate request

**Shared Utilities** (create in `_shared/`):
- `cors.ts` - CORS headers configuration
- `errors.ts` - Custom error classes
- `validation.ts` - Input validation helpers
- `monitoring.ts` - Performance tracking
- `idempotency.ts` - Idempotency key handling
- `supabase.ts` - Supabase client factory

**Example Function Structure**:
```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withMonitoring } from '../_shared/monitoring.ts';
import { BadRequestError } from '../_shared/errors.ts';

interface RequestBody {
  field1: string;
  field2: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return withMonitoring('function-name', async () => {
    // Implementation
  });
});
```

Output format: Complete directory structure with all 12 functions + 6 shared utilities.
```

#### **Expected Output**:
- 12 Edge Function directories with `index.ts`
- 6 shared utilities in `_shared/`
- TypeScript types in each function
- Comprehensive error handling
- ~200 lines per function

#### **Usage**:
```bash
# Deploy all functions
for func in supabase/functions/*/; do
  supabase functions deploy $(basename $func)
done

# Test function locally
supabase functions serve assign-calls --env-file .env.local
```

---

### **Prompt 4: Generate OpenAPI 3.0 Specification**

#### **Title**: Create Complete OpenAPI 3.0 Spec for All API Endpoints

#### **Prompt to Paste**:
```
Generate a complete OpenAPI 3.0 specification document for the CoSTAR Field Service Management system API.

**Requirements**:

1. **General Information**:
   - Title: CoSTAR Field Service Management API
   - Version: 1.0.0
   - Description: RESTful API for field service management, device tracking, and call assignment
   - Base URL: https://[project-ref].supabase.co/functions/v1
   - Contact: support@costar-field.com

2. **Authentication**:
   - Security scheme: Bearer JWT
   - Header: Authorization: Bearer <token>
   - Describe how to obtain token (POST /auth/login)

3. **Document All 12 Edge Functions**:
   For each endpoint, include:
   - Path (e.g., /assign-calls)
   - HTTP method (POST, GET, etc.)
   - Summary (one-line description)
   - Description (detailed explanation)
   - Request body schema (JSON)
   - Query parameters (if any)
   - Response schemas (200, 400, 401, 403, 404, 500)
   - Example requests and responses
   - Required authentication
   - Rate limiting notes

4. **Schemas** (define in components/schemas):
   - Call
   - Device
   - Engineer (UserProfile)
   - Bank
   - Shipment
   - Photo
   - StockMovement
   - Error (standard error response)

5. **Response Examples**:
   - Include realistic example data
   - Show both success and error responses
   - Include pagination for list endpoints

6. **Tags** (group endpoints):
   - Calls Management
   - Device Management
   - Stock & Inventory
   - Engineers
   - Admin Operations
   - Media Upload

7. **Additional Sections**:
   - Rate limiting: 100 requests/minute per user
   - Pagination: Use `limit` and `offset` query params
   - Error handling: Standard error format
   - Versioning: API version in URL path
   - Webhooks: (future) Describe webhook events

**Output Format**:
- YAML file: `openapi.yaml`
- Valid OpenAPI 3.0 format
- Passes validation with Swagger Editor
- Include example values for all fields

**Usage Instructions**:
```bash
# Validate spec
npx swagger-cli validate openapi.yaml

# Generate interactive docs
npx redoc-cli bundle openapi.yaml -o docs/api.html

# Host with Swagger UI
docker run -p 8080:8080 -e SWAGGER_JSON=/api/openapi.yaml -v $(pwd):/api swaggerapi/swagger-ui
```
```

#### **Expected Output**:
- `openapi.yaml` file (~800-1000 lines)
- Complete API documentation
- Validated against OpenAPI 3.0 spec
- Ready for Swagger UI or Redoc

#### **Benefits**:
- Auto-generated client SDKs (TypeScript, Python, Go)
- Interactive API documentation
- Contract testing
- API versioning strategy

---

### **Prompt 5: Create GitHub Actions CI/CD Pipeline**

#### **Title**: Generate Complete CI/CD Pipeline with Testing, Linting, and Deployment

#### **Prompt to Paste**:
```
Create a comprehensive GitHub Actions CI/CD pipeline for the CoSTAR Field Service Management system.

**Required Workflows**:

1. **`ci.yml` - Continuous Integration** (runs on every push/PR):
   - Checkout code
   - Setup Node.js 20.x
   - Install dependencies (npm ci)
   - Run linter (ESLint)
   - Run type checking (TypeScript)
   - Run unit tests (if implemented)
   - Run build (npm run build)
   - Upload build artifacts
   - Runs on: push to main, pull requests

2. **`deploy-staging.yml` - Deploy to Staging** (runs on push to `develop` branch):
   - Checkout code
   - Install dependencies
   - Run tests
   - Build application
   - Deploy to Netlify staging environment
   - Deploy Edge Functions to Supabase staging project
   - Run smoke tests
   - Post deployment notification to Slack

3. **`deploy-production.yml` - Deploy to Production** (runs on push to `main` branch):
   - Checkout code
   - Install dependencies
   - Run full test suite
   - Build application with production config
   - Run security scan (npm audit)
   - Deploy to Netlify production
   - Deploy Edge Functions to Supabase production
   - Run E2E smoke tests
   - Tag release (semantic versioning)
   - Create GitHub release notes
   - Post to Slack with deployment details

4. **`database-migration.yml` - Database Migrations** (manual trigger or scheduled):
   - Checkout code
   - Setup Supabase CLI
   - Connect to production database
   - Run migration dry-run (verify safety)
   - Backup database before migration
   - Apply migrations
   - Verify migrations applied successfully
   - Run post-migration validation
   - Rollback on failure

5. **`scheduled-tests.yml` - Nightly Regression Tests** (runs daily at 2 AM UTC):
   - Checkout code
   - Run full E2E test suite against staging
   - Generate test report
   - Upload results to GitHub Pages
   - Notify team if failures detected

6. **`security-scan.yml` - Security Scanning** (weekly schedule):
   - Run npm audit for vulnerabilities
   - Run Snyk security scan
   - Scan Docker images (if applicable)
   - Check for leaked secrets (truffleHog)
   - Generate security report
   - Create GitHub issue if high-severity vulnerabilities found

**Required GitHub Secrets**:
```yaml
# Add to repository secrets
SUPABASE_PROJECT_REF_STAGING: "..."
SUPABASE_ACCESS_TOKEN_STAGING: "..."
SUPABASE_PROJECT_REF_PROD: "..."
SUPABASE_ACCESS_TOKEN_PROD: "..."
NETLIFY_AUTH_TOKEN: "..."
NETLIFY_SITE_ID_STAGING: "..."
NETLIFY_SITE_ID_PROD: "..."
SLACK_WEBHOOK_URL: "..."
SENTRY_AUTH_TOKEN: "..." (optional)
```

**Deployment Configuration**:
- Use environment-specific .env files
- Staging: Auto-deploy on `develop` branch
- Production: Manual approval required (use GitHub Environments)
- Rollback: Keep last 3 deployments for quick rollback

**Notification Templates**:
- Slack notification on deployment success/failure
- GitHub PR comments with test results
- Email on production deployment

**Advanced Features**:
- Parallel job execution where possible
- Caching for node_modules, build outputs
- Conditional workflows (skip if only docs changed)
- Matrix builds (test on multiple Node versions)
- Deployment preview URLs for PRs

**Output Format**:
- Directory: `.github/workflows/`
- 6 YAML workflow files
- README explaining each workflow
- Setup instructions for secrets

**Example Workflow Structure**:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
```
```

#### **Expected Output**:
- 6 GitHub Actions workflow files
- Complete CI/CD pipeline
- Environment-specific deployments
- Automated testing and security scans
- Deployment notifications

#### **Benefits**:
- Automated quality checks
- Fast feedback on PRs
- Zero-downtime deployments
- Rollback capability
- Security monitoring

---

## 3. Pre-Implementation Preflight Checklist

Before beginning development, ensure all required accounts, API keys, and services are configured.

### **✅ Required Accounts & Services**

#### **1. Supabase (Database & Backend)**
- [ ] Supabase account created: https://supabase.com/
- [ ] Production project created
- [ ] Staging project created (optional but recommended)
- [ ] Project URLs and API keys recorded
- [ ] Database password set (strong password, store in vault)
- [ ] Organization plan selected (Pro or Team for production)

**Required Values**:
```bash
SUPABASE_URL_PROD="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY_PROD="eyJ..."
SUPABASE_SERVICE_ROLE_KEY_PROD="eyJ..." # Keep secret!
DATABASE_URL_PROD="postgresql://..."
```

**Access**:
- Admin access to Supabase dashboard
- Service role key for Edge Functions
- Database connection string for migrations

---

#### **2. Supabase Storage Bucket (Photo Storage)**
- [ ] Storage enabled in Supabase project
- [ ] Bucket created: `call-photos`
- [ ] Bucket policies configured (RLS):
  - Engineers can upload to their own calls
  - Admins can view all photos
  - Public access disabled
- [ ] File size limit set: 5MB per photo
- [ ] Allowed file types: image/jpeg, image/png
- [ ] CDN enabled for fast photo delivery

**Bucket Configuration**:
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-photos', 'call-photos', false);

-- RLS policy: Engineers can upload photos for their calls
CREATE POLICY "Engineers can upload photos for their calls"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM calls WHERE assigned_engineer = auth.uid()
  )
);

-- RLS policy: Users can view photos for their calls
CREATE POLICY "Users can view photos for their calls"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-photos' AND
  (
    auth.jwt() ->> 'role' = 'admin' OR
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM calls WHERE assigned_engineer = auth.uid()
    )
  )
);
```

---

#### **3. Hosting Platform (Frontend)**
- [ ] Account created: Netlify (recommended) or Vercel
- [ ] Site created for production
- [ ] Site created for staging (optional)
- [ ] Custom domain configured (e.g., app.costar-field.com)
- [ ] SSL certificate provisioned (automatic)
- [ ] Environment variables set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ENV=production`

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  VITE_ENV = "production"

[context.staging.environment]
  VITE_ENV = "staging"
```

---

#### **4. Error Tracking (Sentry)**
- [ ] Sentry account created: https://sentry.io/
- [ ] Project created: "costar-field-service"
- [ ] DSN key obtained
- [ ] Source maps upload configured
- [ ] Alert rules configured:
  - Critical errors: Notify immediately
  - High error rate: Notify if > 1%
  - New issues: Notify on first occurrence

**Required Values**:
```bash
VITE_SENTRY_DSN="https://...@sentry.io/..."
SENTRY_AUTH_TOKEN="..." # For uploading source maps
```

**Alert Configuration**:
- Email notifications to: dev-team@costar.com
- Slack integration: #costar-alerts channel
- PagerDuty for critical (SEV1) errors

---

#### **5. Monitoring (Uptime & Performance)**
- [ ] Uptime monitoring service: Better Uptime or UptimeRobot
- [ ] Monitors configured:
  - Web app: https://app.costar-field.com (check every 1 min)
  - API health: https://[project].supabase.co/rest/v1/ (check every 1 min)
  - Edge Functions: https://[project].supabase.co/functions/v1/health (every 5 min)
- [ ] Alert contacts added (email, SMS, Slack)
- [ ] Public status page created (optional): status.costar-field.com

**Uptime Checks**:
```yaml
# Better Uptime monitors configuration
monitors:
  - name: "CoSTAR Web App"
    url: "https://app.costar-field.com"
    interval: 60 # seconds
    method: GET
    expected_status: 200
    timeout: 10

  - name: "Supabase API"
    url: "https://[project].supabase.co/rest/v1/"
    interval: 60
    headers:
      apikey: "${SUPABASE_ANON_KEY}"

  - name: "Edge Functions Health"
    url: "https://[project].supabase.co/functions/v1/health"
    interval: 300
```

---

#### **6. Git Repository & Version Control**
- [ ] GitHub organization/account
- [ ] Repository created: `costar-field-service`
- [ ] Branch protection rules:
  - `main` branch: Require PR reviews (1+), require status checks
  - `develop` branch: Require status checks
- [ ] GitHub Actions enabled
- [ ] Secrets configured (see CI/CD section)
- [ ] Team members added with appropriate permissions

**Branch Strategy**:
```
main (production) ← merge from release branches
  ↑
develop (staging) ← merge from feature branches
  ↑
feature/feature-name (individual features)
```

---

#### **7. Google Maps API (Optional - for geo features)**
- [ ] Google Cloud Platform account
- [ ] Project created
- [ ] Maps JavaScript API enabled
- [ ] Geocoding API enabled (for address validation)
- [ ] Distance Matrix API enabled (for engineer routing)
- [ ] API key created
- [ ] API key restrictions set:
  - HTTP referrer: app.costar-field.com/*
  - API restrictions: Maps, Geocoding, Distance Matrix only
- [ ] Billing enabled (with budget alerts)

**Required Values**:
```bash
VITE_GOOGLE_MAPS_API_KEY="AIza..."
```

**Usage**:
- Show call locations on map
- Calculate distance between engineer and call site
- Optimize routing for multi-call assignments

**Cost Estimation**:
- Maps load: $7 per 1000 loads
- Geocoding: $5 per 1000 requests
- Distance Matrix: $5-10 per 1000 requests
- Expected monthly cost: ~$50-100 (for 10,000 calls/month)

---

#### **8. SMS/Notifications (Optional - Twilio)**
- [ ] Twilio account created: https://www.twilio.com/
- [ ] Phone number purchased (for SMS)
- [ ] Account SID and Auth Token obtained
- [ ] Messaging service configured
- [ ] Budget alerts set (prevent overages)

**Required Values**:
```bash
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..." # Keep secret!
TWILIO_PHONE_NUMBER="+1234567890"
```

**Usage** (Future):
- Send OTP codes for engineer login
- Notify engineers of urgent call assignments
- Send completion confirmations to clients

**Cost Estimation**:
- SMS: $0.0075 per message (US)
- Phone number: $1.15/month
- Expected monthly cost: ~$50 (for 5,000 SMS/month)

---

#### **9. CI/CD & Deployment**
- [ ] GitHub Actions enabled (included with GitHub)
- [ ] Netlify deploy keys configured
- [ ] Supabase access tokens created (for CLI deployments)
- [ ] Environment secrets stored in GitHub
- [ ] Slack webhook for notifications (optional)

**Required GitHub Secrets**:
```yaml
# Supabase
SUPABASE_ACCESS_TOKEN: "sbp_..."
SUPABASE_PROJECT_REF_PROD: "..."
SUPABASE_PROJECT_REF_STAGING: "..."

# Netlify
NETLIFY_AUTH_TOKEN: "..."
NETLIFY_SITE_ID_PROD: "..."
NETLIFY_SITE_ID_STAGING: "..."

# Notifications
SLACK_WEBHOOK_URL: "https://hooks.slack.com/..."

# Monitoring
SENTRY_AUTH_TOKEN: "..."
```

---

### **✅ Local Development Setup**

Before running the application locally:

#### **1. Install Required Tools**
```bash
# Node.js (v20+)
node --version # Should output v20.x.x

# npm (v10+)
npm --version

# Git
git --version

# Supabase CLI
npm install -g supabase
supabase --version

# (Optional) Docker - for local Supabase
docker --version
```

#### **2. Clone Repository**
```bash
git clone https://github.com/your-org/costar-field-service.git
cd costar-field-service
```

#### **3. Install Dependencies**
```bash
npm install
```

#### **4. Configure Environment Variables**
Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Supabase
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Environment
VITE_ENV=development

# Optional
VITE_GOOGLE_MAPS_API_KEY=AIza...
VITE_SENTRY_DSN=https://...@sentry.io/...
```

#### **5. Run Database Migrations**
```bash
# Link to Supabase project
supabase link --project-ref [your-project-ref]

# Apply migrations
supabase db push

# Or run specific migration
supabase migration up
```

#### **6. Start Development Server**
```bash
npm run dev
```

Application should open at: http://localhost:5173

---

### **✅ Security Checklist**

Before going to production:

- [ ] **Environment Variables**: No secrets in Git (use .env, .gitignore)
- [ ] **API Keys**: Restricted to specific domains/IPs
- [ ] **Service Role Key**: Never exposed to frontend
- [ ] **Database RLS**: All tables have RLS enabled
- [ ] **HTTPS**: Enforced on all domains
- [ ] **CORS**: Configured correctly for Edge Functions
- [ ] **SQL Injection**: All queries use parameterized statements
- [ ] **XSS Protection**: User input sanitized
- [ ] **CSRF Protection**: Tokens used for state-changing operations
- [ ] **Rate Limiting**: API endpoints rate-limited
- [ ] **Authentication**: JWT tokens expire after 24 hours
- [ ] **Password Policy**: Minimum 8 characters, complexity requirements
- [ ] **Audit Logging**: All sensitive operations logged
- [ ] **Backups**: Daily automated backups enabled
- [ ] **Disaster Recovery**: Rollback plan tested

---

### **✅ Performance Checklist**

- [ ] **Database Indexes**: Created on frequently queried columns
- [ ] **Image Optimization**: Photos compressed before upload (< 1MB)
- [ ] **Lazy Loading**: Images lazy-loaded in lists
- [ ] **Code Splitting**: Dynamic imports for large components
- [ ] **CDN**: Assets served from CDN (Netlify/Vercel edge)
- [ ] **Caching**: API responses cached where appropriate
- [ ] **Bundle Size**: Main bundle < 500KB gzipped
- [ ] **Lighthouse Score**: > 90 on Performance, Accessibility, Best Practices, SEO

---

### **✅ Final Pre-Launch Checklist**

- [ ] All 10 UAT scenarios pass
- [ ] All P0 test cases pass (100%)
- [ ] All P1 test cases pass (> 95%)
- [ ] No critical (SEV1) bugs
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Monitoring and alerts configured
- [ ] Backup and restore tested
- [ ] Rollback plan documented and tested
- [ ] Team trained on system
- [ ] Support documentation complete
- [ ] Stakeholder sign-off obtained

---

## 4. Recommended Execution Order

### **Phase 1: Foundation (Week 1)**
1. ✅ Complete preflight checklist (Day 1-2)
2. ✅ Set up all accounts and services (Day 1-2)
3. ✅ Run Prompt 1: Generate seed data (Day 3)
4. ✅ Verify database migrations applied (Day 3)
5. ✅ Run Prompt 2: Create RPCs and triggers (Day 4)

### **Phase 2: Backend (Week 2)**
6. ✅ Run Prompt 3: Scaffold Edge Functions (Day 5-7)
7. ✅ Deploy Edge Functions to staging (Day 8)
8. ✅ Test Edge Functions with Postman/curl (Day 8)
9. ✅ Run Prompt 4: Generate OpenAPI spec (Day 9)
10. ✅ Review and validate API documentation (Day 9)

### **Phase 3: DevOps (Week 3)**
11. ✅ Run Prompt 5: Create CI/CD pipeline (Day 10-11)
12. ✅ Configure GitHub secrets and environments (Day 11)
13. ✅ Test CI/CD pipeline with sample commits (Day 12)
14. ✅ Set up monitoring and alerting (Day 12)
15. ✅ Configure error tracking (Sentry) (Day 13)

### **Phase 4: Testing & QA (Week 4)**
16. ✅ Run UAT scenarios 1-5 (Day 14-15)
17. ✅ Run UAT scenarios 6-10 (Day 16-17)
18. ✅ Fix all critical bugs (Day 18-19)
19. ✅ Performance testing and optimization (Day 20)
20. ✅ Security review and penetration testing (Day 21)

### **Phase 5: Launch (Week 5)**
21. ✅ Follow 10-day rollout plan from Block 11 (Day 22-31)
22. ✅ Day 1-2: Infrastructure setup
23. ✅ Day 3-4: Backend deployment
24. ✅ Day 5-6: Admin UI deployment
25. ✅ Day 7: Mobile alpha release
26. ✅ Day 8: QA and bug bash
27. ✅ Day 9: Pilot launch (20% rollout)
28. ✅ Day 10: Full production launch
29. ✅ Week 1 post-launch: Daily monitoring and support

---

## 5. Success Metrics & Validation

### **How to Know You're Ready to Launch**

#### **Technical Readiness** (All must be ✅)
- [ ] System uptime > 99.9% in staging for 7 days
- [ ] API error rate < 0.5% in staging
- [ ] All Edge Functions deployed and tested
- [ ] Database migrations applied without errors
- [ ] RLS policies prevent unauthorized access
- [ ] Backups tested (restore successful)
- [ ] Monitoring dashboards showing live data
- [ ] Alerts triggering correctly (test alert sent)

#### **Functional Readiness** (All must be ✅)
- [ ] All 10 UAT scenarios pass
- [ ] Admin can create/assign calls
- [ ] Engineer can accept/complete calls
- [ ] QR scanning works reliably (> 99% success)
- [ ] Photo upload works reliably (> 95% success)
- [ ] Device tracking accurate (stock reconciliation < 0.1% error)
- [ ] Banks and engineers can be managed
- [ ] Shipments can be tracked

#### **Operational Readiness** (All must be ✅)
- [ ] Support team trained
- [ ] User documentation complete
- [ ] Incident response plan documented
- [ ] Rollback plan tested
- [ ] Communication plan ready
- [ ] Stakeholders informed

#### **Business Readiness** (All must be ✅)
- [ ] Seed data loaded (banks, engineers, devices)
- [ ] User accounts created
- [ ] Training sessions conducted
- [ ] Go-live date confirmed
- [ ] Success criteria defined
- [ ] Pilot users selected

---

## 6. Post-Launch: Continuous Monitoring

### **Daily Checks (First 30 Days)**

Run this checklist every morning:

```markdown
## Daily Health Check - [Date]

### 1. System Health
- [ ] Uptime: ______% (target: > 99.9%)
- [ ] Error rate: ______% (target: < 0.5%)
- [ ] API response time (p95): ______ ms (target: < 500ms)

### 2. Business Metrics
- [ ] Calls created yesterday: ______
- [ ] Calls completed yesterday: ______
- [ ] Completion rate: ______% (target: > 95%)
- [ ] Photo compliance: ______% (target: 100%)

### 3. Issues
- [ ] Critical errors: ______ (target: 0)
- [ ] High priority errors: ______ (target: < 5)
- [ ] Support tickets: ______ new

### 4. User Feedback
- [ ] Positive feedback: ______
- [ ] Complaints: ______
- [ ] Feature requests: ______

### 5. Action Items
1. ______________________________
2. ______________________________
3. ______________________________
```

### **Weekly Review (Ongoing)**

Every Friday, conduct a retrospective:

1. Review all metrics against targets
2. Identify top 3 issues from the week
3. Celebrate wins
4. Plan improvements for next week
5. Update roadmap based on feedback

---

## 7. Final Recommendations

### **Do's**
✅ Run prompts in recommended order
✅ Test each component thoroughly before moving to next
✅ Document any deviations from plan
✅ Collect user feedback early and often
✅ Monitor metrics daily for first month
✅ Celebrate small wins with team
✅ Iterate based on real usage data

### **Don'ts**
❌ Skip UAT scenarios (all 10 must pass)
❌ Deploy to production without staging testing
❌ Ignore error logs ("it works on my machine")
❌ Skip rollback plan testing
❌ Forget to back up before major changes
❌ Launch without monitoring in place
❌ Assume users understand the system (provide training)

---

## 8. Questions to Ask Before Launch

Have a final "go/no-go" meeting and answer these:

1. **Can we roll back in < 5 minutes if needed?** (Yes/No)
2. **Do we have 24/7 on-call coverage?** (Yes/No)
3. **Is the support team trained and ready?** (Yes/No)
4. **Are all stakeholders informed of launch date?** (Yes/No)
5. **Do we have a communication plan for outages?** (Yes/No)
6. **Have we tested the rollback procedure?** (Yes/No)
7. **Is monitoring showing green across all systems?** (Yes/No)
8. **Are we confident in our testing coverage?** (Yes/No)
9. **Do we have budget approved for cloud costs?** (Yes/No)
10. **Is everyone on the team excited and ready?** (Yes/No)

**Decision**: If all answers are "Yes", **GO FOR LAUNCH!** 🚀

If any answer is "No", delay launch and address the concern first.

---

## 9. Conclusion

You now have:
- ✅ 10 comprehensive UAT scenarios to validate the system
- ✅ 5 follow-up Bolt.new prompts to complete automation
- ✅ Complete preflight checklist with all required accounts
- ✅ Recommended execution order for next 5 weeks
- ✅ Success criteria and validation checkpoints
- ✅ Post-launch monitoring and support plan

### **Next Steps**

1. **Immediately**: Review and approve this plan with stakeholders
2. **Day 1**: Complete preflight checklist (set up accounts)
3. **Day 2-5**: Run Prompts 1-5 in order
4. **Week 2-4**: Execute UAT scenarios and fix bugs
5. **Week 5**: Follow 10-day rollout plan from Block 11
6. **Week 6+**: Monitor, support, and iterate

### **Your Responsibility**

- Execute prompts in recommended order
- Validate outputs at each step
- Run all 10 UAT scenarios before launch
- Monitor daily for first 30 days
- Collect and act on user feedback

---

**You are now ready to build, test, and launch the CoSTAR Field Service Management system!** 🎉

**Good luck, and remember**: Start small, test thoroughly, launch confidently, and iterate quickly.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Owner**: Engineering Team
**Review Date**: Weekly for first month, then monthly

---
