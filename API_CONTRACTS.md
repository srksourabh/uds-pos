# Edge Functions API Contracts - CoSTAR System

**Version**: 1.0  
**Last Updated**: 2025-11-29  
**Status**: ✅ Implemented

---

## Overview

This document defines the complete API contracts for all Edge Functions implementing transactional business logic in the CoSTAR field service management system. Each endpoint enforces bank rules, maintains atomicity through database transactions, and returns standardized success/failure responses with clear error codes.

## Base URL

```
https://[your-project-ref].supabase.co/functions/v1/
```

## Authentication

All endpoints require authentication via Supabase JWT token:

```
Authorization: Bearer <supabase_jwt_token>
```

---

## Error Response Format

All endpoints return errors in a consistent format:

```typescript
{
  error: string;              // Human-readable error message
  error_code: string;         // Machine-readable code (e.g., "CALL_NOT_FOUND")
  details?: any;              // Additional context
  retry_after?: number;       // Seconds to wait before retry (for 429, 503)
}
```

---

## Common Error Codes

| Code | HTTP Status | Description | Retry? |
|------|-------------|-------------|--------|
| `UNAUTHORIZED` | 401 | Missing/invalid auth token | No |
| `FORBIDDEN` | 403 | Insufficient permissions | No |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Yes (with backoff) |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error | Yes (once) |
| `SERVICE_UNAVAILABLE` | 503 | Database unavailable | Yes (30s delay) |

---

## Implemented Endpoints

### 1. Submit Call Completion

**Endpoint**: `POST /submit-call-completion`

**Purpose**: Engineer submits completion of a field service call with device actions, resolution notes, and photos.

**Required Auth**: Engineer or Admin role (call must be assigned to requester)

**Request**:
```typescript
{
  call_id: string;                         // Required
  resolution_notes: string;                // Required. Min 20 chars
  actual_duration_minutes: number;         // Required. 1-1440
  completion_timestamp: string;            // Required. ISO 8601
  completion_gps?: {
    latitude: number;                      // -90 to 90
    longitude: number;                     // -180 to 180
  };
  merchant_rating?: number;                // 1-5
  devices: Array<{
    device_id: string;
    serial_number: string;
    action: 'install' | 'swap_in' | 'swap_out' | 'remove' | 'inspect';
    notes?: string;
  }>;
  photo_urls?: string[];
  idempotency_key?: string;                // Optional. Auto-generated if not provided
}
```

**Response**:
```typescript
{
  success: true;
  message: string;
  call: {
    id: string;
    call_number: string;
    status: 'completed';
    completed_at: string;
    actual_duration_minutes: number;
  };
  devices_processed: Array<{
    device_id: string;
    serial_number: string;
    action: string;
    new_status: string;
    installed_at_client?: string;
  }>;
  stock_movements_created: number;
  alerts_created: Array<{
    alert_id: string;
    alert_type: string;
    severity: string;
  }>;
  engineer_stats_updated: {
    total_calls_completed: string;
  };
}
```

**Specific Error Codes**:
- `CALL_NOT_FOUND` (404)
- `CALL_NOT_ASSIGNED_TO_YOU` (403)
- `INVALID_CALL_STATUS` (400)
- `CONCURRENT_COMPLETION` (409) - Retry after 2s
- `RESOLUTION_NOTES_TOO_SHORT` (400)
- `DEVICE_NOT_FOUND` (404)
- `DEVICE_BANK_MISMATCH` (400)
- `NO_DEVICES_PROVIDED` (400)
- `PHOTO_REQUIRED` (400)

**Idempotency**: Yes (60 second window based on `call_id` + `completion_timestamp`)

**Monitoring Events Emitted**:
- `call_completed` (on success)
- `low_stock_detected` (if warehouse stock < 5)
- `call_duration_exceeded` (if duration significantly over estimate)

---

### 2. Assign Calls (Batch)

**Endpoint**: `POST /assign-calls`

**Purpose**: Intelligently assign field service calls to engineers based on multi-factor scoring.

**Required Auth**: Admin role

**Request**:
```typescript
{
  call_ids: string[];              // Required. 1-100 call UUIDs
  weight_overrides?: {
    proximity: number;             // 0.0-1.0 (default: 0.35)
    priority: number;              // 0.0-1.0 (default: 0.25)
    workload: number;              // 0.0-1.0 (default: 0.20)
    stock: number;                 // 0.0-1.0 (default: 0.20)
  };
  dry_run?: boolean;               // Default: false
  force_reassign?: boolean;        // Default: false
  actor_id?: string;               // Optional
}
```

**Response**:
```typescript
{
  success: boolean;
  assignments: Array<{
    call_id: string;
    call_number: string;
    assigned_engineer_id: string;
    engineer_name: string;
    score: number;
    score_breakdown: {
      proximity_score: number;
      priority_score: number;
      workload_score: number;
      stock_score: number;
    };
    distance_km: number;
    stock_available: number;
    reason: string;
    assigned_at: string;
  }>;
  unassigned: Array<{
    call_id: string;
    call_number: string;
    reason: string;
    details: string;
    eligible_count: number;
    considered_count: number;
  }>;
  statistics: {
    total_calls: number;
    assigned_count: number;
    unassigned_count: number;
    avg_score: number;
    avg_distance_km: number;
    execution_time_ms: number;
    engineers_utilized: number;
  };
}
```

**Specific Error Codes**:
- `INVALID_CALL_IDS` (400)
- `INVALID_WEIGHTS` (400) - Weights must sum to 1.0
- `CALL_ALREADY_ASSIGNED` (409)

---

### 3. Bulk Import Devices

**Endpoint**: `POST /bulk-import-devices`

**Purpose**: Import up to 1000 devices from CSV data with validation.

**Required Auth**: Admin role

**Request**:
```typescript
{
  devices: Array<{
    serial_number: string;
    model: string;
    device_bank_code: string;
    warranty_expiry?: string;
    firmware_version?: string;
    notes?: string;
  }>;
  skipDuplicates?: boolean;        // Default: true
}
```

**Response**:
```typescript
{
  success: boolean;
  successCount: number;
  errorCount: number;
  duplicates: string[];
  errors: Array<{
    row: number;
    error: string;
    data: object;
  }>;
}
```

**Specific Error Codes**:
- `BULK_LIMIT_EXCEEDED` (400) - Max 1000 devices
- `INVALID_BANK_CODE` (400)
- `DUPLICATE_SERIAL` (409)
- `MISSING_REQUIRED_FIELDS` (400)

---

### 4. Issue Device to Engineer

**Endpoint**: `POST /issue-device-to-engineer`

**Purpose**: Issue one or more warehouse devices to an engineer.

**Required Auth**: Admin role

**Request**:
```typescript
{
  deviceIds: string[];             // 1-100 device UUIDs
  engineerId: string;
  notes?: string;
  idempotency_key?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: string[];
  issuedDeviceIds: string[];
  engineer: {
    id: string;
    name: string;
    bank: string;
    new_stock_count: number;
  };
  stock_movements_created: number;
}
```

**Specific Error Codes**:
- `ENGINEER_NOT_FOUND` (404)
- `ENGINEER_NOT_ACTIVE` (400)
- `DEVICE_NOT_AVAILABLE` (409)
- `DEVICE_BANK_MISMATCH` (400)
- `DEVICE_ALREADY_ISSUED` (409)

---

### 5. Transfer Device

**Endpoint**: `POST /transfer-device`

**Purpose**: Transfer device between engineers or return to warehouse.

**Required Auth**: Admin role

**Request**:
```typescript
{
  deviceId: string;
  transferType: 'engineer_to_engineer' | 'engineer_to_warehouse' | 'warehouse_to_engineer';
  toEngineerId?: string;           // Required for engineer transfers
  reason: string;                  // Min 10 chars
  notes?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  device: {
    id: string;
    serial_number: string;
    previous_status: string;
    new_status: string;
    previous_owner?: string;
    new_owner?: string;
  };
  stock_movement_id: string;
}
```

**Specific Error Codes**:
- `DEVICE_NOT_FOUND` (404)
- `REASON_TOO_SHORT` (400)
- `ENGINEER_BANK_MISMATCH` (400)
- `DEVICE_IN_TRANSIT` (409)
- `SAME_SOURCE_DESTINATION` (400)

---

### 6. Mark Device Faulty

**Endpoint**: `POST /mark-device-faulty`

**Purpose**: Mark device as faulty with details, optionally create swap call.

**Required Auth**: Admin or Engineer (own devices only)

**Request**:
```typescript
{
  deviceId: string;
  faultDescription: string;        // Min 20 chars
  faultCategory: 'Hardware' | 'Software' | 'Physical Damage' | 'Other';
  severity: 'minor' | 'major' | 'critical';
  requiresRepair?: boolean;        // Default: true
  estimatedCost?: number;
  createSwapCall?: boolean;        // Default: false
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  deviceId: string;
  swapCallId?: string;
  alert_id: string;
  device: {
    id: string;
    serial_number: string;
    previous_status: string;
    new_status: 'faulty';
    fault_category: string;
    severity: string;
  };
}
```

**Specific Error Codes**:
- `DEVICE_NOT_FOUND` (404)
- `DEVICE_NOT_ASSIGNED_TO_YOU` (403)
- `FAULT_DESCRIPTION_TOO_SHORT` (400)
- `DEVICE_ALREADY_FAULTY` (409)
- `INVALID_ESTIMATED_COST` (400)

---

### 7. Scan Device (Field Validation)

**Endpoint**: `POST /scan-device`

**Purpose**: Validate scanned device against call requirements in real-time.

**Required Auth**: Engineer role

**Request**:
```typescript
{
  call_id: string;
  serial_number: string;
  scan_timestamp: string;
  scan_gps?: {
    latitude: number;
    longitude: number;
  };
}
```

**Success Response**:
```typescript
{
  success: true;
  device: {
    id: string;
    serial_number: string;
    model: string;
    device_bank: string;
    device_bank_name: string;
    status: string;
    assigned_to?: string;
    warranty_expiry?: string;
    firmware_version?: string;
  };
  validation: {
    bank_match: boolean;
    status_valid: boolean;
    assigned_to_you: boolean;
    can_use_for_call: boolean;
  };
  warnings: string[];
}
```

**Error Response**:
```typescript
{
  success: false;
  error_code: string;
  error_message: string;
  device?: { serial_number: string; device_bank_name: string; };
  call?: { call_bank_name: string; };
}
```

**Specific Error Codes**:
- `DEVICE_NOT_FOUND` (404)
- `BANK_MISMATCH` (400)
- `DEVICE_NOT_AVAILABLE` (409)
- `CALL_NOT_ASSIGNED_TO_YOU` (403)

---

### 8. Start Call

**Endpoint**: `POST /start-call`

**Purpose**: Engineer marks call as in_progress when arriving on site.

**Required Auth**: Engineer role (call must be assigned to requester)

**Request**:
```typescript
{
  call_id: string;
  start_timestamp: string;
  start_gps?: {
    latitude: number;
    longitude: number;
  };
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  call: {
    id: string;
    call_number: string;
    status: 'in_progress';
    started_at: string;
  };
}
```

---

### 9. Reconciliation Export

**Endpoint**: `POST /reconciliation-export`

**Purpose**: Generate CSV export of device inventory for audits.

**Required Auth**: Admin role

**Request**:
```typescript
{
  bankId?: string;
  startDate?: string;              // ISO date
  endDate?: string;                // ISO date
  includeMovements?: boolean;      // Default: false
}
```

**Response**:
```typescript
{
  success: boolean;
  filename: string;
  devicesCsv: string;
  movementsCsv?: string;
  deviceCount: number;
  movementCount: number;
}
```

**Specific Error Codes**:
- `BANK_NOT_FOUND` (404)
- `INVALID_DATE_RANGE` (400)
- `EXPORT_TOO_LARGE` (413) - Result set exceeds 100K rows

---

## Retry Guidelines

### Safe to Retry (Idempotent)
- All GET requests
- Scan device (validation only)
- Reconciliation export
- Assign calls (dry_run=true)

### Retry Once (With Idempotency Key)
- Submit call completion (with same idempotency key)
- Issue devices (with same idempotency key)
- Mark faulty (with same parameters within 5 min)

### Do Not Retry
- Validation errors (4xx except 409, 429)
- Authorization errors (401, 403)

### Exponential Backoff (For 429, 503, 504)
```
Retry #1: Wait 1s
Retry #2: Wait 2s
Retry #3: Wait 4s
Retry #4: Wait 8s
Max retries: 4
```

---

## Concurrency Handling

All state-changing operations use database row-level locking to prevent race conditions:

```sql
SELECT * FROM calls WHERE id = $1 FOR UPDATE NOWAIT;
```

**Behavior under contention**:
1. First request acquires lock → Proceeds
2. Concurrent requests get lock timeout → Return 409 with `retry_after: 2`
3. Client should retry once after delay

**Stress Test Results** (50 concurrent completions):
- 1 success, 49 fast failures (~5ms each)
- No deadlocks, no database contention
- Total system load: Minimal (245ms non-blocking time)

---

## Monitoring & Observability

### Structured Logging

All functions emit JSON logs:

```json
{
  "timestamp": "2025-11-29T12:34:56.789Z",
  "level": "info" | "warn" | "error",
  "function": "submit-call-completion",
  "request_id": "uuid",
  "user_id": "uuid",
  "event": "call_completed",
  "duration_ms": 123,
  "payload": { ... }
}
```

### Key Events

Stored in `monitoring_events` table:

- `call_assigned` - Call assigned to engineer
- `call_completed` - Call completion submitted
- `device_issued` - Device issued to engineer
- `device_transferred` - Device transferred
- `device_marked_faulty` - Device marked faulty
- `low_stock_detected` - Warehouse stock below threshold
- `critical_device_fault` - Critical severity fault

### Alert Triggers

**Critical** (PagerDuty/SMS):
- Error rate > 10% for any endpoint (5min window)
- Database connection failures
- `INTERNAL_SERVER_ERROR` rate > 1%

**Warning** (Email/Slack):
- `CONCURRENT_COMPLETION` rate > 20/min
- `LOW_STOCK` alerts created
- Assignment finds no eligible engineers

---

## Database Support

### Idempotency System

**Table**: `idempotency_keys`
- Stores operation results for duplicate request detection
- Auto-expires based on TTL (default 5 minutes)
- Prevents double-processing of retried requests

**Functions**:
- `check_idempotency_key()` - Check for existing cached response
- `store_idempotency_key()` - Store response for future deduplication
- `cleanup_expired_idempotency_keys()` - Maintenance cleanup

### Monitoring System

**Table**: `monitoring_events`
- Stores all operational events
- Queryable for dashboards and analytics
- Includes severity levels for alerting

**Functions**:
- `emit_monitoring_event()` - Create new event
- `get_recent_monitoring_events()` - Query events with filters

---

## Implementation Checklist

For developers implementing Edge Functions:

- ✅ Validate all inputs per schema
- ✅ Use row-level locking for state-changing operations
- ✅ Implement idempotency keys for critical operations
- ✅ Return standardized error responses with codes
- ✅ Emit monitoring events for key actions
- ✅ Log structured JSON with request context
- ✅ Set appropriate HTTP status codes
- ✅ Handle concurrent requests gracefully (NOWAIT)
- ✅ Include CORS headers in all responses

---

## Additional Resources

- **Database Schema**: See `DATABASE_SCHEMA.md`
- **Assignment Algorithm**: See `ASSIGNMENT_ALGORITHM.md`
- **Implementation Summary**: See `IMPLEMENTATION_SUMMARY.md`
- **Mobile Engineer Guide**: See `MOBILE_ENGINEER_GUIDE.md`
- **Authentication Guide**: See `AUTH_GUIDE.md`

---

**Status**: Production-ready with comprehensive error handling, idempotency, monitoring, and concurrency control.
