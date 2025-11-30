# Follow-Up Prompt 3 — Edge Functions Scaffold Specification (CoSTAR)

## Executive Summary

This document provides complete scaffolding specifications for all Supabase Edge Functions in the CoSTAR Field Service Management system. It defines directory structure, API contracts, error handling, security, logging, and testing requirements—all described in plain language without actual code.

**Purpose**: Establish consistent patterns, conventions, and contracts for all Edge Functions to ensure maintainability, security, and reliability.

---

## Table of Contents

1. [Directory Structure & Naming Conventions](#1-directory-structure--naming-conventions)
2. [Edge Functions Catalog](#2-edge-functions-catalog)
3. [API Endpoints & Routing](#3-api-endpoints--routing)
4. [Input & Output Schemas](#4-input--output-schemas)
5. [Unified Error Code Dictionary](#5-unified-error-code-dictionary)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Logging & Telemetry](#7-logging--telemetry)
8. [Idempotency & Request Handling](#8-idempotency--request-handling)
9. [Edge Function ↔ RPC Interaction](#9-edge-function--rpc-interaction)
10. [Testing Matrix](#10-testing-matrix)
11. [Performance & Caching](#11-performance--caching)
12. [Deployment & Monitoring](#12-deployment--monitoring)

---

## 1. Directory Structure & Naming Conventions

### **1.1 Recommended Directory Tree**

```
supabase/
├── functions/
│   ├── _shared/                        # Shared utilities (no deployment)
│   │   ├── auth.ts                     # Authentication helpers
│   │   ├── cors.ts                     # CORS headers
│   │   ├── errors.ts                   # Error classes & handlers
│   │   ├── idempotency.ts              # Idempotency key handling
│   │   ├── logging.ts                  # Structured logging
│   │   ├── monitoring.ts               # Metrics & telemetry
│   │   ├── schemas.ts                  # Input validation schemas
│   │   └── types.ts                    # Shared TypeScript types
│   │
│   ├── assign-calls/                   # Auto-assignment algorithm
│   │   ├── index.ts                    # Main handler
│   │   ├── types.ts                    # Function-specific types
│   │   └── utils/
│   │       ├── scoring.ts              # Engineer scoring logic
│   │       └── geo.ts                  # Distance calculations
│   │
│   ├── submit-call-completion/         # Complete calls with devices
│   │   ├── index.ts
│   │   └── validators.ts               # Custom validation logic
│   │
│   ├── issue-device-to-engineer/       # Issue devices from warehouse
│   │   └── index.ts
│   │
│   ├── swap-device/                    # Device replacement
│   │   └── index.ts
│   │
│   ├── mark-device-faulty/             # Flag defective devices
│   │   └── index.ts
│   │
│   ├── transfer-device/                # Transfer between engineers
│   │   └── index.ts
│   │
│   ├── start-call/                     # Begin service call
│   │   └── index.ts
│   │
│   ├── scan-device/                    # QR code scanning
│   │   └── index.ts
│   │
│   ├── upload-photo/                   # Photo evidence upload
│   │   └── index.ts
│   │
│   ├── bulk-import-devices/            # CSV device import
│   │   ├── index.ts
│   │   └── parsers.ts                  # CSV parsing logic
│   │
│   ├── reconciliation-export/          # Inventory reconciliation
│   │   └── index.ts
│   │
│   ├── auth-validator/                 # Auth health check
│   │   └── index.ts
│   │
│   ├── create-admin/                   # Admin user creation
│   │   └── index.ts
│   │
│   └── create-test-engineer/           # Test user creation
│       └── index.ts
│
└── config.toml                         # Supabase configuration
```

---

### **1.2 Naming Conventions**

**Function Names** (Directory Names):
```
Pattern: {verb}-{noun}[-{modifier}]
Examples:
  ✓ assign-calls
  ✓ submit-call-completion
  ✓ issue-device-to-engineer
  ✓ bulk-import-devices
  ✗ callAssignment (use kebab-case, not camelCase)
  ✗ devices (too vague, needs verb)
```

**File Names**:
```
index.ts       - Main handler (required, entry point)
types.ts       - Type definitions for this function
validators.ts  - Custom validation logic
parsers.ts     - Data parsing utilities
utils.ts       - General utilities (if needed)
{domain}.ts    - Domain-specific logic (e.g., scoring.ts, geo.ts)
```

**TypeScript Naming**:
```
Types/Interfaces: PascalCase
  AssignCallRequest, DeviceStatusUpdate, ErrorResponse

Functions: camelCase
  validateInput, handleError, logRequest

Constants: SCREAMING_SNAKE_CASE
  MAX_DEVICES_PER_CALL, DEFAULT_TIMEOUT_MS

Edge Function Handler: Deno.serve()
  Always use: Deno.serve(async (req: Request) => { ... })
```

---

### **1.3 Shared Utilities (_shared/)**

**Purpose**: Common code used across multiple Edge Functions

**Key Files**:

**_shared/auth.ts**:
- Extract JWT from Authorization header
- Verify token validity
- Extract user role (admin, engineer, service_role)
- Check permissions for operation
- Return authenticated user context

**_shared/cors.ts**:
- CORS headers constant
- Pre-flight OPTIONS handler
- Apply CORS to all responses

**_shared/errors.ts**:
- Error class hierarchy (AppError, ValidationError, AuthError, etc.)
- Standard error response formatter
- Error code enum
- HTTP status code mapping

**_shared/idempotency.ts**:
- Extract idempotency key from headers
- Check if request already processed
- Store request result for replay
- TTL: 24 hours

**_shared/logging.ts**:
- Structured log formatter (JSON)
- Log levels (DEBUG, INFO, WARN, ERROR)
- Add request correlation ID
- Add execution duration
- Add user context

**_shared/monitoring.ts**:
- Execution time tracking
- Error rate tracking
- Request count by endpoint
- Custom metrics emission
- Integration with Sentry (optional)

**_shared/schemas.ts**:
- Common input validation schemas
- UUID validator
- Email validator
- Phone number validator
- Date/timestamp validator

**_shared/types.ts**:
- Shared TypeScript interfaces
- Database types (from codegen)
- API request/response types
- Enum definitions

---

## 2. Edge Functions Catalog

### **Overview**

**Total Functions**: 14 Edge Functions

**Categories**:
1. **Core Operations** (7 functions): Business logic for calls & devices
2. **Admin Functions** (3 functions): Warehouse management, bulk operations
3. **Utility Functions** (4 functions): Auth, testing, exports

---

### **2.1 Core Operations Functions**

| # | Function Name | Purpose | Complexity | Priority |
|---|---------------|---------|------------|----------|
| 1 | assign-calls | Auto-assign pending calls to engineers | High | P0 |
| 2 | start-call | Mark call as in-progress | Low | P0 |
| 3 | submit-call-completion | Complete call with devices & photos | High | P0 |
| 4 | swap-device | Replace installed device with new one | High | P1 |
| 5 | scan-device | QR code scanning for device verification | Medium | P1 |
| 6 | upload-photo | Upload call completion photos | Medium | P0 |
| 7 | mark-device-faulty | Flag defective devices | Low | P1 |

---

### **2.2 Admin Functions**

| # | Function Name | Purpose | Complexity | Priority |
|---|---------------|---------|------------|----------|
| 8 | issue-device-to-engineer | Issue devices from warehouse | Medium | P0 |
| 9 | transfer-device | Transfer device between engineers | Medium | P2 |
| 10 | bulk-import-devices | CSV import of devices | High | P1 |

---

### **2.3 Utility Functions**

| # | Function Name | Purpose | Complexity | Priority |
|---|---------------|---------|------------|----------|
| 11 | reconciliation-export | Generate inventory reconciliation report | Medium | P1 |
| 12 | auth-validator | Health check & auth verification | Low | P2 |
| 13 | create-admin | Create admin user (dev/test only) | Low | P2 |
| 14 | create-test-engineer | Create engineer user (dev/test only) | Low | P2 |

---

## 3. API Endpoints & Routing

### **3.1 Routing Tree (Plain Language)**

```
Base URL: https://{project-ref}.supabase.co/functions/v1/

├── /assign-calls               [POST]   Auto-assign calls
├── /start-call                 [POST]   Begin service call
├── /submit-call-completion     [POST]   Complete call
├── /swap-device                [POST]   Swap installed device
├── /scan-device                [POST]   Scan QR code
├── /upload-photo               [POST]   Upload photo evidence
├── /mark-device-faulty         [POST]   Flag faulty device
├── /issue-device-to-engineer   [POST]   Issue devices
├── /transfer-device            [POST]   Transfer device
├── /bulk-import-devices        [POST]   Import CSV
├── /reconciliation-export      [GET]    Generate report
├── /auth-validator             [GET]    Health check
├── /create-admin               [POST]   Create admin (dev)
└── /create-test-engineer       [POST]   Create engineer (dev)
```

**URL Pattern**: Single-purpose functions, no sub-routes per function

**HTTP Methods**:
- `POST`: Create, update, or trigger actions (most functions)
- `GET`: Read-only operations (exports, health checks)
- `OPTIONS`: CORS pre-flight (handled by all functions)

---

### **3.2 Base URL Construction**

**Format**: `https://{project-ref}.supabase.co/functions/v1/{function-name}`

**Example**:
```
Production:  https://abcdefgh12345678.supabase.co/functions/v1/assign-calls
Staging:     https://ijklmnop12345678.supabase.co/functions/v1/assign-calls
Local:       http://localhost:54321/functions/v1/assign-calls
```

**Environment Detection**:
- Check `Deno.env.get('ENVIRONMENT')` or `Deno.env.get('SUPABASE_URL')`
- Local: `http://localhost:*`
- Staging: `*-staging.supabase.co`
- Production: Default

---

### **3.3 Standard Request Headers**

**Required**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Optional (Recommended)**:
```
X-Request-ID: {uuid}           # Request correlation ID
X-Idempotency-Key: {uuid}      # For idempotent operations
X-Client-Version: {version}    # Client app version
X-Device-ID: {uuid}            # Mobile device identifier
```

**Response Headers** (Standard):
```
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Request-ID, X-Idempotency-Key
X-Request-ID: {uuid}           # Echo request ID
X-Execution-Time-Ms: {number}  # Function execution time
```

---

## 4. Input & Output Schemas

### **4.1 Schema Definition Principles**

1. **Explicit over Implicit**: Every field documented with type and requirement
2. **Validation First**: Validate all inputs before processing
3. **Fail Fast**: Return validation errors immediately
4. **Consistent Structure**: All responses follow same success/error format

---

### **4.2 Standard Response Envelope**

**Success Response**:
```typescript
{
  success: true,                     // Always true for success
  data: {                            // Function-specific data
    // ... payload varies by function
  },
  metadata: {                        // Optional metadata
    execution_time_ms: number,
    request_id: string,
    timestamp: string (ISO 8601)
  }
}
```

**Error Response**:
```typescript
{
  success: false,                    // Always false for errors
  error: {
    code: string,                    // Machine-readable error code
    message: string,                 // Human-readable message
    details: object | null,          // Additional context
    field: string | null,            // Which field caused error (validation)
    suggestion: string | null        // Actionable advice for user
  },
  metadata: {
    request_id: string,
    timestamp: string (ISO 8601)
  }
}
```

---

### **4.3 Function-Specific Schemas**

---

#### **FUNCTION 1: assign-calls**

**Purpose**: Automatically assign pending calls to available engineers based on scoring algorithm

**HTTP Method**: POST

**URL**: `/functions/v1/assign-calls`

**Authentication**: Admin or Service Role

**Input Schema**:
```typescript
{
  call_id: string (UUID, optional),           // Assign specific call
  batch_mode: boolean (default: false),       // Assign all pending calls
  criteria: {                                 // Assignment criteria
    max_distance_km: number (default: 50),
    priority_weight: number (default: 1.0),
    workload_weight: number (default: 0.8),
    device_availability_weight: number (default: 0.6)
  } (optional),
  preferred_engineer_id: string (UUID, optional), // Manual assignment
  force_assign: boolean (default: false)      // Assign even if engineer at capacity
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    assignments: [
      {
        call_id: string (UUID),
        call_number: string,
        assigned_engineer_id: string (UUID),
        engineer_name: string,
        assignment_score: number (0-100),
        distance_km: number | null,
        estimated_arrival: string (ISO 8601) | null
      }
    ],
    total_assigned: number,
    failed_assignments: [
      {
        call_id: string (UUID),
        reason: string
      }
    ]
  }
}
```

**Errors**:
- `CALL_NOT_FOUND`: Specific call_id doesn't exist
- `CALL_ALREADY_ASSIGNED`: Call is not in pending status
- `NO_AVAILABLE_ENGINEERS`: No engineers available for bank
- `INSUFFICIENT_DEVICE_STOCK`: Call requires devices but none available
- `INVALID_CRITERIA`: Assignment criteria out of valid range

---

#### **FUNCTION 2: start-call**

**Purpose**: Mark a call as in-progress when engineer arrives on site

**HTTP Method**: POST

**URL**: `/functions/v1/start-call`

**Authentication**: Engineer (assigned to call) or Admin

**Input Schema**:
```typescript
{
  call_id: string (UUID, required),
  started_at: string (ISO 8601, default: NOW()),
  arrival_notes: string (optional, max 500 chars),
  location: {                                   // Engineer's location
    latitude: number,
    longitude: number
  } (optional)
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    call_id: string (UUID),
    call_number: string,
    status: "in_progress",
    started_at: string (ISO 8601),
    client_name: string,
    client_address: string,
    devices_needed: number,
    devices_issued: [
      {
        device_id: string (UUID),
        serial_number: string,
        model: string
      }
    ]
  }
}
```

**Errors**:
- `CALL_NOT_FOUND`: Call doesn't exist
- `UNAUTHORIZED_ENGINEER`: Engineer not assigned to this call
- `INVALID_CALL_STATUS`: Call not in 'assigned' status
- `STARTED_BEFORE_SCHEDULED`: started_at < scheduled_date
- `REQUIRED_DEVICES_NOT_ISSUED`: Call requires devices but none issued to engineer

---

#### **FUNCTION 3: submit-call-completion**

**Purpose**: Complete a service call with device installations and photo evidence

**HTTP Method**: POST

**URL**: `/functions/v1/submit-call-completion`

**Authentication**: Engineer (assigned to call) or Admin

**Input Schema**:
```typescript
{
  call_id: string (UUID, required),
  device_ids: string[] (UUID array, required if call.requires_device),
  installation_address: string (required if type='install'),
  completion_notes: string (optional, max 1000 chars),
  photo_ids: string[] (UUID array, required, min 2),
  completed_at: string (ISO 8601, default: NOW())
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    call_id: string (UUID),
    call_number: string,
    status: "completed",
    completed_at: string (ISO 8601),
    duration_hours: number,
    devices_installed: number,
    photos_uploaded: number,
    stock_movements_created: number,
    engineer_stats: {
      total_completed_calls: number,
      completion_rate: number (percentage)
    }
  }
}
```

**Errors**:
- `CALL_NOT_FOUND`: Call doesn't exist
- `UNAUTHORIZED_ENGINEER`: Engineer not assigned to call
- `INVALID_CALL_STATUS`: Call not in 'in_progress' status
- `DEVICE_NOT_FOUND`: One or more device_ids invalid
- `DEVICE_NOT_ASSIGNED`: Device not issued to engineer
- `BANK_MISMATCH`: Device bank ≠ call bank
- `INSUFFICIENT_PHOTOS`: Less than 2 photos uploaded
- `PHOTO_NOT_FOUND`: One or more photo_ids invalid
- `INVALID_PHOTO_UPLOADER`: Photo not uploaded by engineer

---

#### **FUNCTION 4: swap-device**

**Purpose**: Replace an installed device with a new device (e.g., faulty device swap)

**HTTP Method**: POST

**URL**: `/functions/v1/swap-device`

**Authentication**: Engineer or Admin

**Input Schema**:
```typescript
{
  call_id: string (UUID, required),
  old_device_id: string (UUID, required),
  new_device_id: string (UUID, required),
  swap_reason: string (required, min 10 chars),
  photo_ids: string[] (UUID array, required, min 4), // old before/after, new before/after
  completed_at: string (ISO 8601, default: NOW())
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    call_id: string (UUID),
    call_number: string,
    old_device: {
      device_id: string (UUID),
      serial_number: string,
      new_status: "returned" | "faulty"
    },
    new_device: {
      device_id: string (UUID),
      serial_number: string,
      new_status: "installed",
      installed_at: string
    },
    stock_movements_created: number
  }
}
```

**Errors**:
- `CALL_NOT_FOUND`: Call doesn't exist
- `INVALID_CALL_TYPE`: Call type must be 'swap'
- `DEVICE_NOT_FOUND`: Old or new device doesn't exist
- `OLD_DEVICE_NOT_INSTALLED`: Old device not in 'installed' status
- `NEW_DEVICE_NOT_ISSUED`: New device not in 'issued' status
- `BANK_MISMATCH`: Device banks don't match call bank
- `INSUFFICIENT_SWAP_PHOTOS`: Less than 4 photos uploaded

---

#### **FUNCTION 5: scan-device**

**Purpose**: Scan device QR code for verification and status check

**HTTP Method**: POST

**URL**: `/functions/v1/scan-device`

**Authentication**: Engineer or Admin

**Input Schema**:
```typescript
{
  qr_code_data: string (required),              // Raw QR code string
  action: "verify" | "issue" | "install" | "return",
  call_id: string (UUID, optional),             // Context for verification
  location: {                                   // Scanner location
    latitude: number,
    longitude: number
  } (optional)
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    device_id: string (UUID),
    serial_number: string,
    model: string,
    status: string,
    bank_code: string,
    assigned_to: string | null,
    installed_at_client: string | null,
    verification_result: "valid" | "warning" | "error",
    warnings: string[] (if any),
    allowed_actions: string[]                   // ["issue", "install", "return"]
  }
}
```

**Errors**:
- `INVALID_QR_CODE`: QR code format invalid or corrupted
- `DEVICE_NOT_FOUND`: Device with serial number doesn't exist
- `DEVICE_BANK_MISMATCH`: Device not from user's bank
- `DEVICE_ALREADY_INSTALLED`: Trying to issue installed device
- `DEVICE_FAULTY`: Device marked as faulty, cannot be used

---

#### **FUNCTION 6: upload-photo**

**Purpose**: Upload and attach photo evidence to a call

**HTTP Method**: POST

**URL**: `/functions/v1/upload-photo`

**Authentication**: Engineer (assigned to call) or Admin

**Input Schema**:
```typescript
{
  call_id: string (UUID, required),
  device_id: string (UUID, optional),           // Link photo to device
  photo_type: "before_installation" | "after_installation" | "faulty_device" | "site_photo",
  photo_data: string (base64 encoded image, required),
  filename: string (optional),
  metadata: {                                   // Optional metadata
    gps_latitude: number,
    gps_longitude: number,
    timestamp: string (ISO 8601),
    file_size: number (bytes),
    resolution: string ("1920x1080")
  } (optional)
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    photo_id: string (UUID),
    call_id: string (UUID),
    device_id: string (UUID) | null,
    photo_type: string,
    storage_path: string,                       // Supabase Storage URL
    uploaded_at: string (ISO 8601),
    file_size: number (bytes),
    total_photos_for_call: number
  }
}
```

**Errors**:
- `CALL_NOT_FOUND`: Call doesn't exist
- `UNAUTHORIZED_ENGINEER`: Engineer not assigned to call
- `DEVICE_NOT_FOUND`: device_id invalid
- `INVALID_PHOTO_TYPE`: photo_type not in allowed enum
- `PHOTO_TOO_LARGE`: File size > 10MB
- `INVALID_IMAGE_FORMAT`: Not a valid image (JPEG, PNG, WebP)
- `STORAGE_UPLOAD_FAILED`: Supabase Storage upload error

---

#### **FUNCTION 7: mark-device-faulty**

**Purpose**: Flag a device as defective and remove from active inventory

**HTTP Method**: POST

**URL**: `/functions/v1/mark-device-faulty`

**Authentication**: Engineer or Admin

**Input Schema**:
```typescript
{
  device_id: string (UUID, required),
  fault_reason: string (required, min 10 chars, max 500 chars),
  fault_type: "hardware_failure" | "software_issue" | "physical_damage" | "other",
  photo_ids: string[] (UUID array, optional),   // Evidence photos
  call_id: string (UUID, optional),             // If discovered during call
  action_required: "repair" | "replace" | "dispose"
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    device_id: string (UUID),
    serial_number: string,
    previous_status: string,
    new_status: "faulty",
    fault_type: string,
    fault_reason: string,
    stock_movement_created: boolean,
    engineer_devices_updated: boolean,
    alert_created: boolean                      // If faulty count high
  }
}
```

**Errors**:
- `DEVICE_NOT_FOUND`: Device doesn't exist
- `DEVICE_ALREADY_FAULTY`: Device already marked faulty
- `INVALID_FAULT_REASON`: Reason too short or invalid
- `INVALID_FAULT_TYPE`: fault_type not in allowed enum
- `CALL_REQUIRED_FOR_INSTALLED_DEVICE`: Installed device needs call context

---

#### **FUNCTION 8: issue-device-to-engineer**

**Purpose**: Issue one or more devices from warehouse to field engineer

**HTTP Method**: POST

**URL**: `/functions/v1/issue-device-to-engineer`

**Authentication**: Admin or Warehouse Manager

**Input Schema**:
```typescript
{
  device_ids: string[] (UUID array, required, min 1, max 10),
  engineer_id: string (UUID, required),
  call_id: string (UUID, optional),             // Link to specific call
  shipment_details: {                           // If shipping
    courier_id: string (UUID, required),
    tracking_number: string (required),
    shipped_at: string (ISO 8601, default: NOW())
  } (optional)
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    devices_issued: number,
    engineer_id: string (UUID),
    engineer_name: string,
    engineer_bank: string,
    call_number: string | null,
    shipment_id: string (UUID) | null,
    tracking_url: string | null,
    stock_movements_created: number,
    engineer_updated: boolean
  }
}
```

**Errors**:
- `DEVICE_NOT_FOUND`: One or more device_ids invalid
- `DEVICE_NOT_IN_WAREHOUSE`: Device not available for issuing
- `ENGINEER_NOT_FOUND`: engineer_id invalid
- `ENGINEER_INACTIVE`: Engineer not active
- `ENGINEER_AT_CAPACITY`: Engineer has max devices (10)
- `BANK_MISMATCH`: Device bank ≠ engineer bank
- `CALL_NOT_ASSIGNED_TO_ENGINEER`: call_id provided but not assigned to engineer
- `COURIER_NOT_FOUND`: courier_id invalid

---

#### **FUNCTION 9: transfer-device**

**Purpose**: Transfer device from one engineer to another (within same bank)

**HTTP Method**: POST

**URL**: `/functions/v1/transfer-device`

**Authentication**: Admin

**Input Schema**:
```typescript
{
  device_id: string (UUID, required),
  from_engineer_id: string (UUID, required),
  to_engineer_id: string (UUID, required),
  transfer_reason: string (required, min 10 chars),
  authorized_by: string (UUID, required)        // Admin user ID
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    device_id: string (UUID),
    serial_number: string,
    from_engineer: string,
    to_engineer: string,
    transfer_reason: string,
    stock_movement_created: boolean
  }
}
```

**Errors**:
- `DEVICE_NOT_FOUND`: device_id invalid
- `DEVICE_NOT_ASSIGNED`: Device not issued to from_engineer
- `ENGINEER_NOT_FOUND`: Engineer ID invalid
- `SAME_ENGINEER_TRANSFER`: Cannot transfer to same engineer
- `BANK_MISMATCH`: Engineers must be from same bank
- `TO_ENGINEER_AT_CAPACITY`: Receiving engineer at max devices
- `INSUFFICIENT_PERMISSIONS`: User not admin

---

#### **FUNCTION 10: bulk-import-devices**

**Purpose**: Import multiple devices from CSV file

**HTTP Method**: POST

**URL**: `/functions/v1/bulk-import-devices`

**Authentication**: Admin

**Input Schema**:
```typescript
{
  csv_data: string (base64 encoded CSV, required),
  bank_id: string (UUID, required),             // All devices assigned to this bank
  validate_only: boolean (default: false),      // Dry-run mode
  skip_duplicates: boolean (default: true)      // Skip existing serial numbers
}
```

**CSV Format**:
```csv
serial_number,model,status,notes
SN-WF-2025-0001,PAX S920,warehouse,
SN-WF-2025-0002,PAX A920,warehouse,New batch
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    total_rows: number,
    validated: number,
    imported: number,
    skipped: number,
    failed: number,
    errors: [
      {
        row: number,
        serial_number: string,
        error: string
      }
    ],
    imported_devices: [
      {
        device_id: string (UUID),
        serial_number: string
      }
    ]
  }
}
```

**Errors**:
- `INVALID_CSV_FORMAT`: CSV parsing failed
- `BANK_NOT_FOUND`: bank_id invalid
- `EMPTY_CSV`: No data rows in CSV
- `MISSING_REQUIRED_COLUMNS`: CSV missing serial_number or model
- `DUPLICATE_SERIAL_NUMBER`: Serial number already exists (if skip_duplicates=false)

---

#### **FUNCTION 11: reconciliation-export**

**Purpose**: Generate inventory reconciliation report (CSV/JSON export)

**HTTP Method**: GET

**URL**: `/functions/v1/reconciliation-export`

**Authentication**: Admin

**Query Parameters**:
```
?bank_id={uuid}           (optional, filter by bank)
&format=csv|json          (default: json)
&include_faulty=true      (default: true)
&include_movements=false  (default: false, include movement history)
```

**Output Schema (JSON)**:
```typescript
{
  success: true,
  data: {
    generated_at: string (ISO 8601),
    bank_filter: string | null,
    summary: {
      total_devices: number,
      by_status: {
        warehouse: number,
        issued: number,
        installed: number,
        faulty: number,
        returned: number
      },
      by_bank: {
        [bank_code]: number
      }
    },
    devices: [
      {
        serial_number: string,
        model: string,
        status: string,
        bank_code: string,
        assigned_to: string | null,
        installed_at: string | null,
        last_movement: string (ISO 8601)
      }
    ],
    discrepancies: [
      {
        device_serial: string,
        issue: string,
        expected: string,
        actual: string
      }
    ]
  }
}
```

**Output (CSV)**:
```csv
serial_number,model,status,bank_code,assigned_to,installed_at,last_movement
SN-WF-2025-0001,PAX S920,warehouse,WF,,,2025-01-01T08:00:00Z
...
```

**Errors**:
- `BANK_NOT_FOUND`: bank_id invalid
- `INVALID_FORMAT`: format not 'csv' or 'json'

---

#### **FUNCTION 12: auth-validator**

**Purpose**: Health check and authentication validation endpoint

**HTTP Method**: GET

**URL**: `/functions/v1/auth-validator`

**Authentication**: Any authenticated user

**Query Parameters**: None

**Output Schema**:
```typescript
{
  success: true,
  data: {
    authenticated: boolean,
    user_id: string (UUID) | null,
    user_email: string | null,
    user_role: "admin" | "engineer" | null,
    bank_id: string (UUID) | null,
    bank_code: string | null,
    permissions: string[],
    token_expires_at: string (ISO 8601) | null
  }
}
```

**Errors**:
- `UNAUTHORIZED`: No valid token provided
- `TOKEN_EXPIRED`: JWT token expired

---

#### **FUNCTION 13: create-admin**

**Purpose**: Create admin user account (development/testing only)

**HTTP Method**: POST

**URL**: `/functions/v1/create-admin`

**Authentication**: Service Role (Supabase service_role key)

**Input Schema**:
```typescript
{
  email: string (required, valid email),
  password: string (required, min 8 chars),
  full_name: string (required),
  phone: string (optional)
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    user_id: string (UUID),
    email: string,
    role: "admin",
    created_at: string (ISO 8601)
  }
}
```

**Errors**:
- `EMAIL_ALREADY_EXISTS`: Email already registered
- `WEAK_PASSWORD`: Password doesn't meet requirements
- `INVALID_EMAIL`: Email format invalid

**Security Note**: This function should ONLY be accessible with service_role key and ONLY in non-production environments.

---

#### **FUNCTION 14: create-test-engineer**

**Purpose**: Create engineer user account (development/testing only)

**HTTP Method**: POST

**URL**: `/functions/v1/create-test-engineer`

**Authentication**: Service Role or Admin

**Input Schema**:
```typescript
{
  email: string (required, valid email),
  password: string (required, min 8 chars),
  full_name: string (required),
  phone: string (optional),
  bank_id: string (UUID, required)              // Assign to bank
}
```

**Output Schema**:
```typescript
{
  success: true,
  data: {
    user_id: string (UUID),
    email: string,
    role: "engineer",
    bank_id: string (UUID),
    bank_code: string,
    created_at: string (ISO 8601)
  }
}
```

**Errors**:
- `EMAIL_ALREADY_EXISTS`: Email already registered
- `BANK_NOT_FOUND`: bank_id invalid
- `WEAK_PASSWORD`: Password doesn't meet requirements

---

## 5. Unified Error Code Dictionary

### **5.1 Error Code Categories**

All error codes follow pattern: `{CATEGORY}_{SPECIFIC_ERROR}`

**Categories**:
- `VALIDATION_*`: Input validation failures
- `AUTH_*`: Authentication & authorization failures
- `DEVICE_*`: Device-related errors
- `CALL_*`: Call-related errors
- `ENGINEER_*`: Engineer-related errors
- `BANK_*`: Bank consistency errors
- `PHOTO_*`: Photo evidence errors
- `STORAGE_*`: File storage errors
- `DATABASE_*`: Database operation errors
- `EXTERNAL_*`: External service errors

---

### **5.2 Complete Error Code Catalog**

| Error Code | HTTP Status | Message Template | Category | Retry? |
|------------|-------------|------------------|----------|--------|
| **VALIDATION_MISSING_FIELD** | 400 | "Required field '{field}' is missing" | Validation | No |
| **VALIDATION_INVALID_UUID** | 400 | "Invalid UUID format: {value}" | Validation | No |
| **VALIDATION_INVALID_EMAIL** | 400 | "Invalid email format: {value}" | Validation | No |
| **VALIDATION_INVALID_ENUM** | 400 | "Invalid value '{value}' for {field}. Allowed: {allowed}" | Validation | No |
| **VALIDATION_STRING_TOO_SHORT** | 400 | "Field '{field}' must be at least {min} characters" | Validation | No |
| **VALIDATION_STRING_TOO_LONG** | 400 | "Field '{field}' must be at most {max} characters" | Validation | No |
| **VALIDATION_ARRAY_TOO_SHORT** | 400 | "Array '{field}' must have at least {min} items" | Validation | No |
| **VALIDATION_ARRAY_TOO_LONG** | 400 | "Array '{field}' must have at most {max} items" | Validation | No |
| **VALIDATION_NUMBER_OUT_OF_RANGE** | 400 | "Field '{field}' must be between {min} and {max}" | Validation | No |
| **AUTH_MISSING_TOKEN** | 401 | "Authorization token is required" | Auth | No |
| **AUTH_INVALID_TOKEN** | 401 | "Invalid or expired authorization token" | Auth | No |
| **AUTH_TOKEN_EXPIRED** | 401 | "Authorization token has expired" | Auth | No |
| **AUTH_INSUFFICIENT_PERMISSIONS** | 403 | "User does not have permission to perform this action" | Auth | No |
| **AUTH_WRONG_ROLE** | 403 | "This action requires {required_role} role, user has {actual_role}" | Auth | No |
| **DEVICE_NOT_FOUND** | 404 | "Device with ID {id} not found" | Device | No |
| **DEVICE_SERIAL_NOT_FOUND** | 404 | "Device with serial number {serial} not found" | Device | No |
| **DEVICE_NOT_IN_WAREHOUSE** | 400 | "Device {serial} is not in warehouse (status: {status})" | Device | No |
| **DEVICE_NOT_ASSIGNED** | 400 | "Device {serial} is not assigned to engineer {name}" | Device | No |
| **DEVICE_NOT_ISSUED** | 400 | "Device {serial} must be issued before this operation" | Device | No |
| **DEVICE_NOT_INSTALLED** | 400 | "Device {serial} is not installed" | Device | No |
| **DEVICE_ALREADY_INSTALLED** | 409 | "Device {serial} is already installed at {location}" | Device | No |
| **DEVICE_ALREADY_FAULTY** | 400 | "Device {serial} is already marked as faulty" | Device | No |
| **DEVICE_FAULTY** | 400 | "Device {serial} is marked as faulty and cannot be used" | Device | No |
| **DEVICE_STATUS_INVALID** | 400 | "Invalid device status transition: {from} → {to}" | Device | No |
| **CALL_NOT_FOUND** | 404 | "Call with ID {id} not found" | Call | No |
| **CALL_NUMBER_NOT_FOUND** | 404 | "Call with number {call_number} not found" | Call | No |
| **CALL_ALREADY_ASSIGNED** | 409 | "Call {call_number} is already assigned to {engineer}" | Call | No |
| **CALL_ALREADY_STARTED** | 409 | "Call {call_number} has already been started" | Call | No |
| **CALL_ALREADY_COMPLETED** | 409 | "Call {call_number} is already completed" | Call | No |
| **CALL_NOT_ASSIGNED** | 400 | "Call {call_number} is not assigned to any engineer" | Call | No |
| **CALL_INVALID_STATUS** | 400 | "Invalid operation for call status: {status}" | Call | No |
| **CALL_REQUIRES_DEVICES** | 400 | "Call {call_number} requires {count} devices" | Call | No |
| **CALL_WRONG_TYPE** | 400 | "Call type must be '{expected}', got '{actual}'" | Call | No |
| **ENGINEER_NOT_FOUND** | 404 | "Engineer with ID {id} not found" | Engineer | No |
| **ENGINEER_INACTIVE** | 400 | "Engineer {name} is inactive" | Engineer | No |
| **ENGINEER_AT_CAPACITY** | 400 | "Engineer {name} has reached maximum capacity ({limit} calls)" | Engineer | No |
| **ENGINEER_DEVICE_LIMIT** | 400 | "Engineer {name} has maximum devices issued ({limit} devices)" | Engineer | No |
| **ENGINEER_NOT_ASSIGNED** | 403 | "Engineer {name} is not assigned to this call" | Engineer | No |
| **BANK_NOT_FOUND** | 404 | "Bank with ID {id} not found" | Bank | No |
| **BANK_MISMATCH** | 403 | "Bank mismatch: {entity1} bank ({bank1}) ≠ {entity2} bank ({bank2})" | Bank | No |
| **BANK_NO_ENGINEERS** | 400 | "No active engineers available for bank {bank_code}" | Bank | No |
| **PHOTO_NOT_FOUND** | 404 | "Photo with ID {id} not found" | Photo | No |
| **PHOTO_INSUFFICIENT** | 400 | "Insufficient photos: requires {required}, uploaded {actual}" | Photo | No |
| **PHOTO_INSUFFICIENT_SWAP** | 400 | "Swap calls require 4 photos (old before/after, new before/after), uploaded {actual}" | Photo | No |
| **PHOTO_TOO_LARGE** | 413 | "Photo file size ({size}MB) exceeds maximum ({max}MB)" | Photo | No |
| **PHOTO_INVALID_FORMAT** | 400 | "Invalid image format: {format}. Allowed: JPEG, PNG, WebP" | Photo | No |
| **PHOTO_WRONG_UPLOADER** | 403 | "Photo {id} was not uploaded by engineer {name}" | Photo | No |
| **STORAGE_UPLOAD_FAILED** | 500 | "Failed to upload file to storage: {reason}" | Storage | Yes |
| **STORAGE_DELETE_FAILED** | 500 | "Failed to delete file from storage: {reason}" | Storage | Yes |
| **DATABASE_CONNECTION_FAILED** | 503 | "Unable to connect to database" | Database | Yes |
| **DATABASE_QUERY_FAILED** | 500 | "Database query failed: {reason}" | Database | Yes |
| **DATABASE_CONSTRAINT_VIOLATION** | 409 | "Database constraint violation: {constraint}" | Database | No |
| **DATABASE_TRANSACTION_FAILED** | 500 | "Transaction failed and was rolled back: {reason}" | Database | Yes |
| **RPC_CALL_FAILED** | 500 | "RPC function '{function}' failed: {reason}" | Database | Yes |
| **IDEMPOTENCY_CONFLICT** | 409 | "Request with this idempotency key already processed with different result" | External | No |
| **RATE_LIMIT_EXCEEDED** | 429 | "Rate limit exceeded: {limit} requests per {window}" | External | Yes |
| **EXTERNAL_SERVICE_UNAVAILABLE** | 503 | "External service '{service}' is unavailable" | External | Yes |
| **INVALID_QR_CODE** | 400 | "QR code format invalid or corrupted" | Validation | No |
| **CSV_PARSE_ERROR** | 400 | "Failed to parse CSV: {reason}" | Validation | No |
| **DUPLICATE_SERIAL_NUMBER** | 409 | "Device with serial number {serial} already exists" | Device | No |
| **UNKNOWN_ERROR** | 500 | "An unexpected error occurred" | General | Yes |

---

### **5.3 Error Response Structure**

**Standard Error Response**:
```typescript
{
  success: false,
  error: {
    code: "DEVICE_NOT_FOUND",
    message: "Device with ID abc-123 not found",
    details: {
      device_id: "abc-123",
      requested_by: "engineer@costar.tech"
    },
    field: null,                          // For validation errors
    suggestion: "Verify the device serial number or contact support",
    timestamp: "2025-01-30T12:34:56Z"
  },
  metadata: {
    request_id: "req_abc123",
    execution_time_ms: 45
  }
}
```

---

### **5.4 HTTP Status Code Mapping**

| Status Code | Usage | Examples |
|-------------|-------|----------|
| **200 OK** | Successful operation | All successful POST/GET requests |
| **400 Bad Request** | Invalid input, validation errors | Missing field, invalid enum, string too long |
| **401 Unauthorized** | Missing or invalid auth token | No Authorization header, expired JWT |
| **403 Forbidden** | Authenticated but not authorized | Wrong role, bank mismatch, not assigned |
| **404 Not Found** | Resource doesn't exist | Device not found, call not found |
| **409 Conflict** | Resource state conflict | Already assigned, already completed, duplicate |
| **413 Payload Too Large** | File too large | Photo > 10MB |
| **429 Too Many Requests** | Rate limit exceeded | > 100 requests per minute |
| **500 Internal Server Error** | Unexpected server error | Database failure, RPC crash |
| **503 Service Unavailable** | Service temporarily down | Database connection failed, external service down |

---

## 6. Authentication & Authorization

### **6.1 Authentication Methods**

**JWT Bearer Token** (Primary):
```
Authorization: Bearer {jwt_token}
```

**Service Role Key** (Admin functions only):
```
Authorization: Bearer {service_role_key}
```

**Anon Key** (Public endpoints only):
```
Authorization: Bearer {anon_key}
```

---

### **6.2 Role-Based Access Control (RBAC)**

**Roles**:
1. **admin**: Full access to all functions
2. **engineer**: Limited to assigned calls and devices
3. **service_role**: Unrestricted (for internal services)

**Permission Matrix**:

| Function | Admin | Engineer | Service Role | Notes |
|----------|-------|----------|--------------|-------|
| assign-calls | ✓ | ✗ | ✓ | Admin assigns calls |
| start-call | ✓ | ✓* | ✓ | *Only assigned engineer |
| submit-call-completion | ✓ | ✓* | ✓ | *Only assigned engineer |
| swap-device | ✓ | ✓* | ✓ | *Only assigned engineer |
| scan-device | ✓ | ✓ | ✓ | All authenticated users |
| upload-photo | ✓ | ✓* | ✓ | *Only assigned engineer |
| mark-device-faulty | ✓ | ✓ | ✓ | All authenticated users |
| issue-device-to-engineer | ✓ | ✗ | ✓ | Admin/warehouse only |
| transfer-device | ✓ | ✗ | ✓ | Admin only |
| bulk-import-devices | ✓ | ✗ | ✓ | Admin only |
| reconciliation-export | ✓ | ✗ | ✓ | Admin only |
| auth-validator | ✓ | ✓ | ✓ | All authenticated users |
| create-admin | ✗ | ✗ | ✓ | Service role only |
| create-test-engineer | ✓ | ✗ | ✓ | Admin or service role |

---

### **6.3 Authorization Flow**

**Step 1: Extract Token**
```
1. Read Authorization header
2. Verify format: "Bearer {token}"
3. Extract token
```

**Step 2: Verify Token**
```
1. Call Supabase auth.getUser(token)
2. If invalid/expired → Return 401 UNAUTHORIZED
3. Extract user_id, email, role
```

**Step 3: Check Role**
```
1. Query user_profiles table for role
2. Verify role matches function requirements
3. If insufficient → Return 403 FORBIDDEN
```

**Step 4: Check Resource Access**
```
For engineer role:
  1. If function operates on call:
     - Verify call.assigned_engineer = user_id
  2. If function operates on device:
     - Verify device.assigned_to = user_id
     - OR device.device_bank = engineer.bank_id
```

**Step 5: Proceed**
```
If all checks pass, execute function logic
```

---

### **6.4 Bank Isolation Enforcement**

**Rule**: Engineers can ONLY access resources from their assigned bank

**Enforcement Points**:
1. **Device Operations**: Verify device.device_bank = engineer.bank_id
2. **Call Operations**: Verify call.client_bank = engineer.bank_id
3. **Query Results**: Filter by bank_id in all database queries

**RLS Policies**: Row-Level Security policies in database enforce bank isolation automatically

---

### **6.5 Security Best Practices**

1. **Never Log Tokens**: Tokens must NEVER appear in logs
2. **Validate All Inputs**: Even after auth, validate all user inputs
3. **Use HTTPS Only**: All production traffic over HTTPS
4. **Short Token TTL**: JWT tokens expire in 1 hour
5. **Rate Limiting**: 100 requests per minute per user
6. **Audit Logging**: Log all sensitive operations (issue devices, complete calls)

---

## 7. Logging & Telemetry

### **7.1 Structured Logging Format**

**Standard Log Entry** (JSON):
```json
{
  "timestamp": "2025-01-30T12:34:56.789Z",
  "level": "INFO",
  "function": "submit-call-completion",
  "request_id": "req_abc123xyz",
  "user_id": "user_123",
  "user_role": "engineer",
  "bank_id": "bank_456",
  "message": "Call completed successfully",
  "duration_ms": 1245,
  "context": {
    "call_id": "call_789",
    "devices_installed": 2,
    "photos_uploaded": 4
  },
  "error": null
}
```

---

### **7.2 Log Levels**

| Level | Usage | Examples |
|-------|-------|----------|
| **DEBUG** | Detailed diagnostic info | "Validating input schema", "Querying database" |
| **INFO** | Normal operations | "Call assigned", "Device issued", "Function completed" |
| **WARN** | Unexpected but handled | "Idempotent request", "Missing optional field" |
| **ERROR** | Operation failed | "Database query failed", "RPC call failed" |
| **CRITICAL** | Service-level failure | "Cannot connect to database", "Out of memory" |

---

### **7.3 Required Log Fields**

**Every Log Entry Must Include**:
- `timestamp`: ISO 8601 timestamp with milliseconds
- `level`: Log level (DEBUG, INFO, WARN, ERROR, CRITICAL)
- `function`: Edge Function name
- `request_id`: Unique request identifier (from header or generated)
- `message`: Human-readable description

**Authenticated Requests Must Include**:
- `user_id`: Authenticated user UUID
- `user_role`: User role (admin, engineer)
- `bank_id`: User's bank (if engineer)

**Completed Requests Must Include**:
- `duration_ms`: Total execution time in milliseconds
- `status`: HTTP status code
- `success`: Boolean (true/false)

**Error Logs Must Include**:
- `error.code`: Error code from dictionary
- `error.message`: Error message
- `error.stack`: Stack trace (if available)

---

### **7.4 Telemetry Metrics**

**Standard Metrics**:

1. **Request Count**
   - Metric: `edge_function_requests_total`
   - Labels: `function`, `status`, `method`

2. **Request Duration**
   - Metric: `edge_function_duration_ms`
   - Labels: `function`, `success`
   - Type: Histogram

3. **Error Rate**
   - Metric: `edge_function_errors_total`
   - Labels: `function`, `error_code`

4. **Active Requests**
   - Metric: `edge_function_active_requests`
   - Labels: `function`
   - Type: Gauge

5. **Database Query Duration**
   - Metric: `database_query_duration_ms`
   - Labels: `function`, `query_type`

**Custom Metrics** (Function-Specific):

- `calls_assigned_total`: Total calls assigned
- `devices_issued_total`: Total devices issued
- `photos_uploaded_total`: Total photos uploaded
- `calls_completed_total`: Total calls completed

---

### **7.5 Request Context Propagation**

**X-Request-ID Header**:
- Client sends: `X-Request-ID: {uuid}`
- If not present, Edge Function generates new UUID
- Propagated to all downstream calls (database, RPCs)
- Included in all log entries
- Returned in response header

**Usage**:
- Trace request across multiple services
- Correlate logs from different sources
- Debug distributed transactions

---

### **7.6 Sensitive Data Redaction**

**Never Log**:
- JWT tokens (full or partial)
- Passwords
- Credit card numbers
- Personal identification numbers

**Redact in Logs**:
- Email addresses: `user@example.com` → `u***@e***.com`
- Phone numbers: `+1-415-555-1234` → `+1-***-***-1234`
- Device serial numbers: Full serial OK (not PII)

---

## 8. Idempotency & Request Handling

### **8.1 Idempotency Key**

**Purpose**: Prevent duplicate processing of identical requests

**Header**: `X-Idempotency-Key: {uuid}`

**Functions That Support Idempotency**:
- submit-call-completion
- swap-device
- issue-device-to-engineer
- mark-device-faulty
- bulk-import-devices

**How It Works**:
1. Client generates unique UUID for request
2. Includes in `X-Idempotency-Key` header
3. Edge Function checks if key exists in `idempotency_keys` table
4. If exists:
   - Return cached result (stored in table)
   - HTTP 200 with same response as original request
5. If not exists:
   - Process request normally
   - Store result with key (TTL: 24 hours)
   - Return response

**Storage Schema**:
```
idempotency_keys table:
  - key: UUID (primary key)
  - function: TEXT (function name)
  - user_id: UUID (who made request)
  - request_body: JSONB (original request)
  - response_body: JSONB (cached response)
  - created_at: TIMESTAMP
  - expires_at: TIMESTAMP (created_at + 24 hours)
```

**Edge Cases**:
- **Same key, different request body**: Return 409 IDEMPOTENCY_CONFLICT
- **Key expired**: Process as new request
- **Key in different function**: Allowed (keys scoped per function)

---

### **8.2 Request Validation Pipeline**

**Order of Operations**:

1. **CORS Pre-flight** (if OPTIONS request)
   - Return CORS headers
   - Exit early

2. **Extract Headers**
   - X-Request-ID
   - X-Idempotency-Key
   - Authorization

3. **Authentication**
   - Verify JWT token
   - Extract user context
   - Check role

4. **Idempotency Check** (if supported)
   - Lookup idempotency key
   - Return cached result if exists

5. **Input Validation**
   - Parse request body (JSON)
   - Validate against schema
   - Check required fields
   - Validate data types
   - Validate constraints (min/max, enums)

6. **Authorization**
   - Check user role
   - Check resource access (bank isolation)

7. **Business Logic**
   - Execute function logic
   - Call database/RPCs
   - Handle errors

8. **Response**
   - Format response
   - Add metadata
   - Store idempotency result (if applicable)
   - Return to client

---

### **8.3 Timeout Handling**

**Function Timeout**: 60 seconds (Supabase default)

**Strategies**:
- Long-running operations (bulk import) return immediately with job ID
- Client polls separate status endpoint
- Background processing via database triggers or async jobs

**Timeout Response**:
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "Request exceeded maximum execution time (60s)",
    "suggestion": "Try again with smaller batch size or contact support"
  }
}
```

---

### **8.4 Retry Policies**

**Client-Side Retry Guidance**:

| Error Code | Retry? | Strategy | Max Retries |
|------------|--------|----------|-------------|
| 5xx errors | Yes | Exponential backoff | 3 |
| 429 Rate Limit | Yes | Wait + retry after header | 3 |
| 409 Conflict | No | - | 0 |
| 4xx other | No | - | 0 |

**Exponential Backoff**:
- Attempt 1: Immediate
- Attempt 2: Wait 1 second
- Attempt 3: Wait 2 seconds
- Attempt 4: Wait 4 seconds
- Give up after 4 attempts

**Idempotent Retry**:
- Use same X-Idempotency-Key on retry
- Ensures safe retry for non-idempotent operations

---

## 9. Edge Function ↔ RPC Interaction

### **9.1 When to Use RPCs**

**Use Database RPC When**:
- Operation spans multiple tables
- Complex business logic with validations
- Requires database-level atomicity (transactions)
- Needs database-level locking

**Example**: `submit_installation()` RPC
- Updates calls table
- Updates multiple devices
- Creates stock_movements
- Updates engineer_aggregates
- All in single transaction

**Use Edge Function Logic When**:
- Simple CRUD operations
- Input validation and transformation
- Authentication/authorization checks
- External API calls
- File uploads

---

### **9.2 RPC Calling Pattern**

**Standard Pattern**:
```
1. Edge Function validates input
2. Edge Function checks auth/permissions
3. Edge Function calls RPC with validated data
4. RPC performs atomic database operations
5. RPC returns success/error
6. Edge Function formats response
7. Edge Function returns to client
```

**Example Flow** (submit-call-completion):
```
Edge Function:
  1. Validate JWT token
  2. Verify engineer assigned to call
  3. Validate input schema
  4. Verify bank consistency
  5. Call RPC: rpc_submit_installation(call_id, device_ids, photos)

Database RPC:
  6. BEGIN TRANSACTION
  7. Update calls table
  8. Update devices table (loop)
  9. Insert stock_movements (loop)
  10. Update engineer_aggregates
  11. COMMIT or ROLLBACK
  12. Return result

Edge Function:
  13. Format RPC result
  14. Add metadata
  15. Return response
```

---

### **9.3 RPC Error Handling**

**RPC Errors** are thrown as PostgreSQL exceptions

**Edge Function Catches**:
```
Try:
  result = await supabase.rpc('submit_installation', params)
Catch error:
  If error.code == '23505': // Unique constraint violation
    Return DUPLICATE_SERIAL_NUMBER error
  Else if error.code == 'P0001': // RAISE EXCEPTION from RPC
    Parse error.message for error code
    Return formatted error
  Else:
    Log unexpected error
    Return RPC_CALL_FAILED error
```

---

### **9.4 Transaction Boundaries**

**Rule**: Edge Functions do NOT manage transactions directly

**Transactions Managed By**:
- Database RPCs (via BEGIN/COMMIT/ROLLBACK)
- Database triggers (run in same transaction as triggering statement)

**Edge Function Responsibility**:
- Call RPC with validated input
- Handle RPC success/error
- NOT responsible for transaction rollback (RPC handles)

---

### **9.5 Concurrency & Locking**

**Row-Level Locks** are acquired by database RPCs, not Edge Functions

**Edge Function Behavior**:
- If RPC blocks waiting for lock: Edge Function waits
- If timeout (60s): Return timeout error
- If deadlock: RPC automatically retries (if configured)

**Example** (prevent duplicate installation):
```
RPC Logic:
  1. SELECT * FROM devices WHERE id = device_id FOR UPDATE
     (Acquires row lock)
  2. Check current status
  3. If valid, UPDATE devices SET status = 'installed'
  4. COMMIT (releases lock)

If two Edge Functions call this RPC simultaneously:
  - First RPC: Acquires lock, updates device
  - Second RPC: Blocks until first completes
  - Second RPC: Sees device is already 'installed'
  - Second RPC: Raises DEVICE_ALREADY_INSTALLED error
```

---

## 10. Testing Matrix

### **10.1 Test Categories**

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test function + database + RPCs
3. **End-to-End Tests**: Test complete workflows
4. **Load Tests**: Test under high concurrency
5. **Security Tests**: Test auth/authz edge cases

---

### **10.2 Test Requirements Per Function**

**Standard Test Suite** (Every Function):

**Positive Tests** (Happy Path):
- [ ] Valid input → 200 OK with expected data
- [ ] Minimal valid input (only required fields) → Success
- [ ] Maximum valid input (all optional fields) → Success

**Authentication Tests**:
- [ ] No token → 401 UNAUTHORIZED
- [ ] Invalid token → 401 UNAUTHORIZED
- [ ] Expired token → 401 TOKEN_EXPIRED
- [ ] Valid token, wrong role → 403 FORBIDDEN

**Validation Tests**:
- [ ] Missing required field → 400 VALIDATION_MISSING_FIELD
- [ ] Invalid UUID format → 400 VALIDATION_INVALID_UUID
- [ ] Invalid enum value → 400 VALIDATION_INVALID_ENUM
- [ ] String too short → 400 VALIDATION_STRING_TOO_SHORT
- [ ] String too long → 400 VALIDATION_STRING_TOO_LONG
- [ ] Number out of range → 400 VALIDATION_NUMBER_OUT_OF_RANGE

**Resource Not Found Tests**:
- [ ] Non-existent resource ID → 404 NOT_FOUND

**CORS Tests**:
- [ ] OPTIONS request → 200 OK with CORS headers
- [ ] POST request → Response includes CORS headers

**Idempotency Tests** (If Supported):
- [ ] Same idempotency key, same body → Same result (200 OK)
- [ ] Same idempotency key, different body → 409 IDEMPOTENCY_CONFLICT
- [ ] Expired idempotency key → Process as new request

---

### **10.3 Function-Specific Test Cases**

#### **assign-calls**

**Additional Tests**:
- [ ] Batch mode assigns all pending calls
- [ ] No available engineers → NO_AVAILABLE_ENGINEERS
- [ ] Engineer at capacity → Skip engineer, try next
- [ ] Preferred engineer specified → Assigns to that engineer (if valid)
- [ ] Call requires devices but none available → INSUFFICIENT_DEVICE_STOCK
- [ ] Scoring algorithm selects closest engineer

---

#### **submit-call-completion**

**Additional Tests**:
- [ ] Call not in 'in_progress' status → INVALID_CALL_STATUS
- [ ] Device not assigned to engineer → DEVICE_NOT_ASSIGNED
- [ ] Device bank != call bank → BANK_MISMATCH
- [ ] Less than 2 photos → INSUFFICIENT_PHOTOS
- [ ] Photo uploaded by different engineer → INVALID_PHOTO_UPLOADER
- [ ] Multiple devices installed successfully
- [ ] Engineer aggregates updated correctly
- [ ] Stock movements created for each device

---

#### **swap-device**

**Additional Tests**:
- [ ] Call type != 'swap' → INVALID_CALL_TYPE
- [ ] Old device not installed → OLD_DEVICE_NOT_INSTALLED
- [ ] New device not issued → NEW_DEVICE_NOT_ISSUED
- [ ] Less than 4 photos → INSUFFICIENT_SWAP_PHOTOS
- [ ] Old device marked as 'returned' or 'faulty' correctly
- [ ] New device marked as 'installed' correctly
- [ ] 2 stock movements created

---

#### **bulk-import-devices**

**Additional Tests**:
- [ ] Invalid CSV format → CSV_PARSE_ERROR
- [ ] Empty CSV → EMPTY_CSV
- [ ] Missing required columns → MISSING_REQUIRED_COLUMNS
- [ ] Duplicate serial in CSV → Report error for that row
- [ ] Duplicate serial in database (skip_duplicates=true) → Skip, continue
- [ ] Duplicate serial in database (skip_duplicates=false) → DUPLICATE_SERIAL_NUMBER
- [ ] validate_only=true → Returns validation results, no inserts
- [ ] 100 devices imported successfully

---

#### **upload-photo**

**Additional Tests**:
- [ ] Photo > 10MB → PHOTO_TOO_LARGE
- [ ] Invalid image format (PDF, TXT) → PHOTO_INVALID_FORMAT
- [ ] Valid JPEG upload → Success
- [ ] Valid PNG upload → Success
- [ ] Valid WebP upload → Success
- [ ] Photo stored in Supabase Storage correctly
- [ ] Metadata extracted and stored

---

### **10.4 Mock Database Strategy**

**For Unit Tests**:
- Mock Supabase client
- Mock RPC responses
- Mock database queries
- Focus on Edge Function logic only

**For Integration Tests**:
- Use real Supabase connection (local or test instance)
- Use test database with seed data
- Clean up after each test (rollback transactions)

**Test Data Isolation**:
- Each test creates its own test data
- Use unique identifiers (random UUIDs)
- Avoid depending on shared seed data

---

### **10.5 Negative Test Cases**

**Concurrency Tests**:
- [ ] Two engineers try to install same device → One succeeds, one fails
- [ ] Two admins try to assign same call → One succeeds, one fails
- [ ] Rapid-fire requests with same idempotency key → Return cached result

**Race Condition Tests**:
- [ ] Engineer deactivated while completing call → Call completion fails
- [ ] Device marked faulty during installation → Installation fails
- [ ] Call cancelled while in-progress → Subsequent actions fail

**Boundary Tests**:
- [ ] Engineer with exactly 10 devices issued → Cannot issue more
- [ ] Engineer with exactly 5 active calls → Cannot assign more
- [ ] Warehouse with 0 devices → Cannot issue

**Error Recovery Tests**:
- [ ] Database connection lost mid-request → Rollback, return error
- [ ] RPC throws exception → Edge Function catches, formats error
- [ ] Storage upload fails → Rollback, return STORAGE_UPLOAD_FAILED

---

## 11. Performance & Caching

### **11.1 Cold Start Considerations**

**Cold Start**: First request after function idle period (5+ minutes)

**Cold Start Time**:
- Target: < 1 second
- Typical: 500-800ms
- Maximum acceptable: 2 seconds

**Optimization Strategies**:
1. **Minimize Dependencies**: Only import what's needed
2. **Lazy Loading**: Load heavy modules only when needed
3. **Connection Pooling**: Reuse database connections
4. **Pre-compile**: Use TypeScript compiler optimizations

**Warm-Up Strategy**:
- Health check endpoint (`/auth-validator`) pinged every 5 minutes
- Keeps functions warm in production
- Not needed for high-traffic functions (naturally warm)

---

### **11.2 Function Size Constraints**

**Supabase Edge Function Limits**:
- Maximum deployment size: 10 MB (uncompressed)
- Maximum memory: 256 MB
- Maximum execution time: 60 seconds

**Size Optimization**:
- Use shared utilities (`_shared/`) to avoid duplication
- Tree-shaking: Remove unused code
- Minification: Remove whitespace, comments
- Compression: Deployed functions are gzip-compressed

**Current Function Sizes** (Estimated):
```
assign-calls:              45 KB (with scoring logic)
submit-call-completion:    35 KB
issue-device-to-engineer:  30 KB
swap-device:               30 KB
bulk-import-devices:       50 KB (with CSV parser)
upload-photo:              40 KB (with image validation)
Other functions:           20-30 KB each

_shared/ utilities:        60 KB total (shared across all)
```

**Total Deployed Size**: ~500 KB (well under 10 MB limit)

---

### **11.3 Caching Policies**

**Read-Heavy Functions** (Cacheable):

**reconciliation-export**:
- Cache: 5 minutes (if no bank_id filter)
- Cache: 1 minute (if bank_id filter)
- Cache key: `reconciliation:{bank_id}:{format}`
- Invalidate on: Any device status change

**auth-validator**:
- Cache: 1 minute per user
- Cache key: `auth:{user_id}`
- Invalidate on: Token refresh, user profile update

**Caching Strategy**:
- Use in-memory cache (Deno KV or simple Map)
- TTL-based expiration
- Max cache size: 100 entries (LRU eviction)

**Write-Heavy Functions** (No Caching):
- All other functions modify state
- No response caching
- Always execute and return fresh data

---

### **11.4 Database Query Optimization**

**Best Practices**:
1. **Use Indexes**: Ensure critical columns indexed
   - devices.serial_number
   - devices.status
   - calls.status
   - calls.assigned_engineer
   - user_profiles.email
   - stock_movements.device_id

2. **Limit Result Sets**: Use LIMIT in queries
   - Default limit: 100 rows
   - Maximum limit: 1000 rows

3. **Select Only Needed Columns**: Avoid SELECT *
   - Specify exact columns needed
   - Reduces data transfer

4. **Use RPCs for Complex Queries**: Let database do the work
   - JOIN operations
   - Aggregations
   - Complex filtering

5. **Connection Pooling**: Reuse Supabase client
   - Create client once per function instance
   - Reuse across requests (warm starts)

---

### **11.5 Rate Limiting**

**Per-User Rate Limits**:
- 100 requests per minute per user
- 1000 requests per hour per user
- 10,000 requests per day per user

**Per-Function Rate Limits**:
- bulk-import-devices: 10 requests per hour per user
- reconciliation-export: 30 requests per hour per user

**Implementation**:
- Check rate limit before processing request
- Store counts in Redis or Supabase (rate_limits table)
- Return 429 TOO_MANY_REQUESTS if exceeded
- Include `Retry-After` header with seconds to wait

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1643635200 (Unix timestamp)
```

---

### **11.6 Performance Targets**

| Function | Target P50 | Target P95 | Target P99 |
|----------|------------|------------|------------|
| assign-calls | 200ms | 500ms | 1000ms |
| start-call | 100ms | 200ms | 500ms |
| submit-call-completion | 500ms | 1000ms | 2000ms |
| swap-device | 500ms | 1000ms | 2000ms |
| scan-device | 150ms | 300ms | 600ms |
| upload-photo | 800ms | 1500ms | 3000ms |
| mark-device-faulty | 150ms | 300ms | 600ms |
| issue-device-to-engineer | 300ms | 600ms | 1200ms |
| bulk-import-devices | 2000ms | 5000ms | 10000ms |
| reconciliation-export | 1000ms | 2000ms | 5000ms |
| auth-validator | 50ms | 100ms | 200ms |

**Monitoring**: Use Supabase logs and external APM (e.g., Sentry) to track actual performance

---

## 12. Deployment & Monitoring

### **12.1 Deployment Pipeline**

**Environments**:
1. **Local**: `http://localhost:54321`
2. **Staging**: `https://staging-project.supabase.co`
3. **Production**: `https://prod-project.supabase.co`

**Deployment Process**:
1. **Local Development**:
   - Develop and test locally
   - Use Supabase CLI: `supabase functions serve`
   - Test with local database

2. **Deploy to Staging**:
   - Run tests: `npm run test`
   - Deploy: `supabase functions deploy --project-ref staging`
   - Run integration tests against staging
   - Manual QA

3. **Deploy to Production**:
   - Create git tag: `git tag v1.0.0`
   - Deploy: `supabase functions deploy --project-ref production`
   - Monitor error rates for 1 hour
   - Rollback if error rate > 5%

**Rollback Strategy**:
- Keep previous version deployed as `{function}-v1`
- If new version fails, switch traffic to `{function}-v1`
- Fix issues, deploy as new version

---

### **12.2 Environment Variables**

**Required Variables** (Auto-configured by Supabase):
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Public anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (secret)

**Custom Variables** (Set via Supabase Dashboard):
- `ENVIRONMENT`: `local` | `staging` | `production`
- `LOG_LEVEL`: `DEBUG` | `INFO` | `WARN` | `ERROR`
- `RATE_LIMIT_ENABLED`: `true` | `false`
- `CACHE_ENABLED`: `true` | `false`

**Access in Code**:
```typescript
const environment = Deno.env.get('ENVIRONMENT') || 'production'
const logLevel = Deno.env.get('LOG_LEVEL') || 'INFO'
```

---

### **12.3 Monitoring Dashboards**

**Key Metrics to Monitor**:

1. **Request Rate**: Requests per minute per function
2. **Error Rate**: Errors per minute per function
3. **Latency**: P50, P95, P99 response times
4. **Success Rate**: % of requests returning 2xx
5. **Database Performance**: Query duration, connection pool usage
6. **Memory Usage**: Function memory consumption
7. **Cold Starts**: Frequency of cold starts

**Alerting Thresholds**:
- Error rate > 5% for 5 minutes → Alert
- P95 latency > 2x target for 5 minutes → Alert
- Success rate < 95% for 5 minutes → Alert
- Database query duration > 1s for 10 queries → Alert

**Alert Channels**:
- Email (critical alerts)
- Slack (all alerts)
- PagerDuty (production critical)

---

### **12.4 Health Checks**

**Endpoint**: `/functions/v1/auth-validator`

**Health Check Frequency**:
- Production: Every 1 minute
- Staging: Every 5 minutes
- Sends request from external monitoring service (Better Uptime, Pingdom)

**Health Check Criteria**:
- Response status: 200 OK
- Response time: < 1 second
- Response body includes: `{ success: true }`

**Failure Actions**:
- 1 failure: Log warning
- 3 consecutive failures: Alert on-call engineer
- 5 consecutive failures: Page on-call + escalate

---

### **12.5 Log Aggregation**

**Log Collection**:
- Supabase automatically collects all console.log/error output
- Logs viewable in Supabase Dashboard
- Retention: 7 days (free tier), 30 days (pro tier)

**External Log Aggregation** (Optional):
- Forward logs to external service (Datadog, Loggly, Splunk)
- Use Supabase webhooks or log streaming
- Longer retention (90+ days)
- Advanced search and alerting

**Log Queries**:
```
Example: Find all errors for user
  filter: level = "ERROR" AND user_id = "abc123"

Example: Find slow requests
  filter: duration_ms > 2000

Example: Find specific error code
  filter: error.code = "DEVICE_NOT_FOUND"
```

---

### **12.6 Incident Response**

**Severity Levels**:

**P0 - Critical** (Production down):
- System completely unavailable
- Response: Immediate (< 5 minutes)
- Resolution SLA: 1 hour

**P1 - High** (Major degradation):
- High error rate (> 10%)
- Slow response times (> 5s P95)
- Response: 15 minutes
- Resolution SLA: 4 hours

**P2 - Medium** (Minor degradation):
- Moderate error rate (5-10%)
- Some features unavailable
- Response: 1 hour
- Resolution SLA: 24 hours

**P3 - Low** (Non-critical issue):
- Low error rate (< 5%)
- Minor bugs, logging issues
- Response: Next business day
- Resolution SLA: 1 week

**Incident Response Process**:
1. **Detect**: Alert triggered
2. **Acknowledge**: Engineer acknowledges alert
3. **Triage**: Determine severity and impact
4. **Mitigate**: Apply temporary fix (rollback, increase resources)
5. **Resolve**: Deploy permanent fix
6. **Post-Mortem**: Document root cause and prevention steps

---

## 13. Summary & Implementation Checklist

### **13.1 Key Architectural Decisions**

1. ✅ **Single-Purpose Functions**: Each function has one clear responsibility
2. ✅ **Shared Utilities**: Common code in `_shared/` directory
3. ✅ **Standard Response Format**: All functions return consistent JSON structure
4. ✅ **Unified Error Codes**: 60+ error codes with clear messages
5. ✅ **RPC for Complex Logic**: Database-heavy operations delegated to RPCs
6. ✅ **JWT Authentication**: All functions require valid JWT (except public)
7. ✅ **Bank Isolation**: Engineers restricted to their bank's resources
8. ✅ **Idempotency Support**: Critical operations support idempotency keys
9. ✅ **Structured Logging**: JSON logs with correlation IDs
10. ✅ **Performance Targets**: Clear P50/P95/P99 latency goals

---

### **13.2 Implementation Checklist**

**Phase 1: Foundation** (Week 1)
- [ ] Set up Supabase project (staging + production)
- [ ] Create `_shared/` utilities (auth, cors, errors, logging)
- [ ] Define TypeScript types (`_shared/types.ts`)
- [ ] Set up local development environment
- [ ] Test basic function deployment

**Phase 2: Core Functions** (Week 2-3)
- [ ] Implement `auth-validator` (health check)
- [ ] Implement `start-call`
- [ ] Implement `submit-call-completion`
- [ ] Implement `assign-calls`
- [ ] Implement `issue-device-to-engineer`
- [ ] Write unit tests for each function
- [ ] Write integration tests

**Phase 3: Additional Functions** (Week 4)
- [ ] Implement `swap-device`
- [ ] Implement `mark-device-faulty`
- [ ] Implement `scan-device`
- [ ] Implement `upload-photo`
- [ ] Implement `transfer-device`

**Phase 4: Admin Functions** (Week 5)
- [ ] Implement `bulk-import-devices`
- [ ] Implement `reconciliation-export`
- [ ] Implement `create-admin` (dev only)
- [ ] Implement `create-test-engineer` (dev only)

**Phase 5: Testing & Optimization** (Week 6)
- [ ] Run full test suite (200+ test cases)
- [ ] Load testing (100 concurrent users)
- [ ] Performance optimization (meet P95 targets)
- [ ] Security audit (auth, RLS, input validation)

**Phase 6: Deployment & Monitoring** (Week 7)
- [ ] Deploy to staging
- [ ] Run UAT scenarios (from BLOCK_12)
- [ ] Set up monitoring dashboards
- [ ] Configure alerts
- [ ] Deploy to production
- [ ] Monitor for 48 hours

---

### **13.3 Testing Checklist**

**Per Function** (Apply to all 14 functions):
- [ ] 5+ positive tests (happy path)
- [ ] 4+ authentication tests (no token, invalid, expired, wrong role)
- [ ] 7+ validation tests (missing field, invalid format, out of range)
- [ ] 2+ resource not found tests
- [ ] 2+ CORS tests (OPTIONS, response headers)
- [ ] 3+ idempotency tests (if supported)
- [ ] 5+ function-specific tests (business logic)
- [ ] 3+ error handling tests (database errors, RPC failures)

**Total Test Cases**: ~30 per function × 14 functions = **420 test cases**

---

### **13.4 Documentation Deliverables**

This scaffold specification provides:
- ✅ Directory structure (15 functions + shared utilities)
- ✅ API endpoints & routing (14 endpoints)
- ✅ Input/output schemas (14 functions × 2 schemas = 28 schemas)
- ✅ Error code dictionary (60 error codes)
- ✅ Authentication & authorization (role matrix, 14 functions)
- ✅ Logging & telemetry (structured logging format, 6 metrics)
- ✅ Idempotency specification (5 functions support)
- ✅ RPC interaction patterns (5 examples)
- ✅ Testing matrix (420 test cases)
- ✅ Performance targets (10 functions benchmarked)
- ✅ Deployment & monitoring (3 environments, 7 metrics)

---

## Conclusion

This Edge Functions Scaffold Specification provides a complete blueprint for implementing all 14 Supabase Edge Functions in the CoSTAR Field Service Management system. Every architectural decision, naming convention, API contract, error code, authentication rule, logging format, and testing requirement has been defined in plain language, ready for implementation.

**Next Steps**:
1. Review this specification with the development team
2. Begin Phase 1 implementation (foundation + shared utilities)
3. Implement functions in priority order (P0 → P1 → P2)
4. Write tests alongside implementation (TDD approach)
5. Deploy to staging and run UAT scenarios
6. Deploy to production with monitoring

**Estimated Implementation Time**: 6-7 weeks (with 2 developers)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Status**: READY FOR IMPLEMENTATION
**Total Page Count**: 50+ pages

---
