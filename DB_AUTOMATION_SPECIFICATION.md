# Follow-Up Prompt 2 — SQL RPCs, Triggers & DB Automation Specification (CoSTAR)

## Executive Summary

This document provides comprehensive specifications for all database-level automations in the CoSTAR Field Service Management system. It defines Remote Procedure Calls (RPCs), database triggers, transactional invariants, concurrency rules, and error handling—all described in plain language without actual SQL code.

**Purpose**: Ensure data integrity, automate business logic, maintain consistency across tables, and prevent race conditions in a multi-user environment.

---

## Table of Contents

1. [RPC Catalog](#1-rpc-catalog)
2. [Trigger Catalog](#2-trigger-catalog)
3. [Transactional Invariants](#3-transactional-invariants)
4. [Cross-Table Dependency Map](#4-cross-table-dependency-map)
5. [Concurrency & Locking Rules](#5-concurrency--locking-rules)
6. [Error Handling Specification](#6-error-handling-specification)
7. [Validation Test Checklist](#7-validation-test-checklist)
8. [Rollback & Recovery Rules](#8-rollback--recovery-rules)
9. [Trigger Cascade Flowcharts](#9-trigger-cascade-flowcharts)

---

## 1. RPC Catalog

### Overview

Remote Procedure Calls (RPCs) encapsulate complex business logic that spans multiple tables and requires atomic operations. All RPCs run with `SECURITY DEFINER` privileges and enforce RLS policies internally.

**Total RPCs**: 15 core functions

---

### **RPC-001: submit_installation**

**Purpose**: Mark a call as completed with device installation, update device status, create stock movement records, and update engineer aggregates.

**When to Use**: When a field engineer completes an installation and submits the call with photo evidence.

**Input Contract**:
```
{
  call_id: UUID (required),
  device_ids: UUID[] (required, 1-5 devices),
  installation_address: TEXT (required),
  completion_notes: TEXT (optional),
  photo_ids: UUID[] (required, minimum 2 photos),
  completed_at: TIMESTAMP (required),
  engineer_id: UUID (required, for verification)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  call_id: UUID,
  devices_installed: INTEGER,
  stock_movements_created: INTEGER,
  completed_at: TIMESTAMP,
  message: "Installation completed successfully"
}

Error:
{
  success: FALSE,
  error_code: TEXT,
  error_message: TEXT,
  details: JSONB (optional)
}
```

**Business Rules Enforced**:
1. Call must exist and be in status 'in_progress'
2. Call must be assigned to the engineer_id provided
3. All device_ids must exist and be assigned to this engineer
4. All devices must have status 'issued'
5. All devices must belong to the same bank as the call
6. Minimum 2 photos required (before/after installation)
7. All photos must be uploaded by the engineer
8. Installation address must be provided

**Validations & Rejection Conditions**:
- ❌ Call not found → Error: `CALL_NOT_FOUND`
- ❌ Call not assigned to engineer → Error: `UNAUTHORIZED_ENGINEER`
- ❌ Call status != 'in_progress' → Error: `INVALID_CALL_STATUS`
- ❌ Device not found → Error: `DEVICE_NOT_FOUND`
- ❌ Device not assigned to engineer → Error: `DEVICE_NOT_ASSIGNED`
- ❌ Device status != 'issued' → Error: `INVALID_DEVICE_STATUS`
- ❌ Device bank != call bank → Error: `BANK_MISMATCH`
- ❌ Less than 2 photos → Error: `INSUFFICIENT_PHOTOS`
- ❌ Photo not uploaded by engineer → Error: `INVALID_PHOTO_UPLOADER`

**Atomic Operations Performed**:
1. Update call: status = 'completed', completed_at = timestamp
2. Update each device: status = 'installed', installed_at_client = address
3. Insert stock_movements for each device (movement_type = 'installed')
4. Recompute engineer_aggregates for the engineer
5. Check warehouse stock levels, create alert if low

**Transaction Scope**: All operations in single transaction, rollback on any failure

**Execution Time**: < 2 seconds for 5 devices

---

### **RPC-002: assign_call_to_engineer**

**Purpose**: Assign a pending call to an available engineer based on assignment algorithm (proximity, workload, device availability).

**When to Use**: When an admin creates a new call or when auto-assignment is triggered.

**Input Contract**:
```
{
  call_id: UUID (required),
  preferred_engineer_id: UUID (optional, for manual assignment),
  auto_assign: BOOLEAN (default TRUE),
  assignment_criteria: JSONB (optional) {
    max_distance_km: INTEGER,
    priority_weight: FLOAT,
    workload_weight: FLOAT
  }
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  call_id: UUID,
  assigned_engineer_id: UUID,
  engineer_name: TEXT,
  assignment_score: FLOAT,
  estimated_arrival: TIMESTAMP,
  devices_available: INTEGER,
  message: "Call assigned successfully"
}

Error:
{
  success: FALSE,
  error_code: TEXT,
  error_message: TEXT,
  reason: TEXT
}
```

**Business Rules Enforced**:
1. Call must be in status 'pending'
2. Call bank must have at least 1 active engineer
3. If call requires devices, available devices must exist for that bank
4. Engineer must have capacity (< 5 active calls)
5. Engineer must have available device slots (< 10 devices issued)
6. If preferred_engineer_id provided, that engineer must be valid and available

**Assignment Algorithm** (when auto_assign = TRUE):
1. Filter engineers by call.client_bank
2. Filter engineers with status = 'active'
3. Calculate score for each engineer:
   - Distance score (lower is better, based on last known location)
   - Workload score (fewer active calls is better)
   - Device inventory score (more available devices is better)
   - Priority modifier (urgent calls get best available engineer)
4. Select engineer with highest combined score
5. If no suitable engineer, leave in 'pending' status and create alert

**Validations & Rejection Conditions**:
- ❌ Call not found → Error: `CALL_NOT_FOUND`
- ❌ Call status != 'pending' → Error: `INVALID_CALL_STATUS`
- ❌ No active engineers for bank → Error: `NO_AVAILABLE_ENGINEERS`
- ❌ Requires devices but none available → Error: `INSUFFICIENT_DEVICE_STOCK`
- ❌ Preferred engineer at capacity → Error: `ENGINEER_AT_CAPACITY`
- ❌ Preferred engineer wrong bank → Error: `ENGINEER_BANK_MISMATCH`

**Atomic Operations Performed**:
1. Update call: status = 'assigned', assigned_engineer = engineer_id, assigned_at = NOW()
2. Update engineer_aggregates: increment active_calls_count
3. If devices required, reserve devices (status unchanged, but marked as reserved)
4. Log assignment event

**Transaction Scope**: Single transaction, rollback on failure

**Execution Time**: < 1 second

---

### **RPC-003: issue_device_to_engineer**

**Purpose**: Issue one or more devices from warehouse to a field engineer for a specific call.

**When to Use**: When warehouse manager prepares devices for engineer pickup or shipment.

**Input Contract**:
```
{
  device_ids: UUID[] (required, 1-10 devices),
  engineer_id: UUID (required),
  call_id: UUID (optional, link to specific call),
  issued_by: UUID (required, admin/warehouse manager),
  shipment_details: JSONB (optional) {
    courier_id: UUID,
    tracking_number: TEXT,
    shipped_at: TIMESTAMP
  }
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  devices_issued: INTEGER,
  engineer_id: UUID,
  engineer_name: TEXT,
  call_number: TEXT (if linked),
  stock_movements_created: INTEGER,
  shipment_id: UUID (if shipped),
  message: "Devices issued successfully"
}

Error:
{
  success: FALSE,
  error_code: TEXT,
  error_message: TEXT,
  failed_devices: TEXT[] (serial numbers)
}
```

**Business Rules Enforced**:
1. All devices must exist and have status 'warehouse'
2. All devices must belong to same bank as engineer
3. Engineer must be active
4. Engineer must have capacity (< 10 devices already issued)
5. If call_id provided, call must exist and be assigned to this engineer
6. issued_by must be an admin or warehouse manager

**Validations & Rejection Conditions**:
- ❌ Device not found → Error: `DEVICE_NOT_FOUND`
- ❌ Device status != 'warehouse' → Error: `DEVICE_NOT_IN_WAREHOUSE`
- ❌ Device bank != engineer bank → Error: `BANK_MISMATCH`
- ❌ Engineer not active → Error: `ENGINEER_INACTIVE`
- ❌ Engineer at capacity → Error: `ENGINEER_DEVICE_LIMIT_REACHED`
- ❌ Call not assigned to engineer → Error: `CALL_NOT_ASSIGNED_TO_ENGINEER`
- ❌ Issuer not admin → Error: `INSUFFICIENT_PERMISSIONS`

**Atomic Operations Performed**:
1. Update each device: status = 'issued', assigned_to = engineer_id
2. Insert stock_movements for each device (movement_type = 'issued', to_location = engineer email)
3. If shipment_details provided, create shipment record
4. Update engineer_aggregates: increment devices_issued
5. Decrement warehouse stock count

**Transaction Scope**: Single transaction, rollback on any failure

**Execution Time**: < 1 second per 10 devices

---

### **RPC-004: swap_device**

**Purpose**: Replace an installed device with a new one (for faulty device replacement, upgrades, etc.).

**When to Use**: When a field engineer performs a device swap at a client site.

**Input Contract**:
```
{
  call_id: UUID (required),
  old_device_id: UUID (required, device to remove),
  new_device_id: UUID (required, device to install),
  swap_reason: TEXT (required),
  photo_ids: UUID[] (required, minimum 4 photos: old before/after, new before/after),
  engineer_id: UUID (required, for verification),
  completed_at: TIMESTAMP (required)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  call_id: UUID,
  old_device_serial: TEXT,
  new_device_serial: TEXT,
  old_device_status: TEXT (returned or faulty),
  stock_movements_created: INTEGER,
  message: "Device swapped successfully"
}

Error:
{
  success: FALSE,
  error_code: TEXT,
  error_message: TEXT
}
```

**Business Rules Enforced**:
1. Call must exist and be in status 'in_progress'
2. Call type must be 'swap'
3. Both devices must exist
4. Old device must have status 'installed' and be at the client address
5. New device must have status 'issued' and be assigned to the engineer
6. Both devices must belong to same bank as call
7. Minimum 4 photos required
8. Swap reason must be provided

**Validations & Rejection Conditions**:
- ❌ Call not found → Error: `CALL_NOT_FOUND`
- ❌ Call type != 'swap' → Error: `INVALID_CALL_TYPE`
- ❌ Old device not installed → Error: `DEVICE_NOT_INSTALLED`
- ❌ New device not issued → Error: `NEW_DEVICE_NOT_ISSUED`
- ❌ Bank mismatch → Error: `BANK_MISMATCH`
- ❌ Less than 4 photos → Error: `INSUFFICIENT_SWAP_PHOTOS`
- ❌ Engineer not assigned to call → Error: `UNAUTHORIZED_ENGINEER`

**Atomic Operations Performed**:
1. Update old_device: status = 'returned' or 'faulty' (based on swap_reason), installed_at_client = NULL
2. Update new_device: status = 'installed', installed_at_client = old device's location
3. Insert 2 stock_movements:
   - Old device: movement_type = 'swapped_out', from_status = 'installed', to_status = 'returned'
   - New device: movement_type = 'swapped_in', from_status = 'issued', to_status = 'installed'
4. Update call: status = 'completed', completed_at = timestamp
5. Update engineer_aggregates

**Transaction Scope**: Single transaction, rollback on any failure

**Execution Time**: < 2 seconds

---

### **RPC-005: mark_device_faulty**

**Purpose**: Mark a device as defective/faulty and remove it from active inventory.

**When to Use**: When a device is found to be non-functional during installation, testing, or maintenance.

**Input Contract**:
```
{
  device_id: UUID (required),
  fault_reason: TEXT (required),
  fault_type: TEXT (required: 'hardware_failure' | 'software_issue' | 'physical_damage' | 'other'),
  photo_ids: UUID[] (optional, evidence of fault),
  reported_by: UUID (required, engineer or admin),
  call_id: UUID (optional, if discovered during a call)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  device_id: UUID,
  device_serial: TEXT,
  previous_status: TEXT,
  previous_location: TEXT,
  stock_movement_created: BOOLEAN,
  message: "Device marked as faulty"
}

Error:
{
  success: FALSE,
  error_code: TEXT,
  error_message: TEXT
}
```

**Business Rules Enforced**:
1. Device must exist
2. Device cannot already be faulty
3. Fault reason must be provided (minimum 10 characters)
4. Fault type must be valid enum value
5. Reporter must be an engineer or admin
6. If device is installed, call must be provided

**Validations & Rejection Conditions**:
- ❌ Device not found → Error: `DEVICE_NOT_FOUND`
- ❌ Device already faulty → Error: `DEVICE_ALREADY_FAULTY`
- ❌ Fault reason too short → Error: `INVALID_FAULT_REASON`
- ❌ Invalid fault type → Error: `INVALID_FAULT_TYPE`
- ❌ Reporter not authorized → Error: `INSUFFICIENT_PERMISSIONS`
- ❌ Device installed but no call_id → Error: `CALL_REQUIRED_FOR_INSTALLED_DEVICE`

**Atomic Operations Performed**:
1. Capture previous_status and previous_location
2. Update device: status = 'faulty', assigned_to = NULL, notes = fault details
3. Insert stock_movement: movement_type = 'marked_faulty', notes = fault_reason
4. If device was issued, update engineer_aggregates (decrement devices_issued)
5. Update warehouse stock counts
6. Create stock alert if faulty device count > threshold

**Transaction Scope**: Single transaction, rollback on failure

**Execution Time**: < 1 second

---

### **RPC-006: return_device_to_warehouse**

**Purpose**: Return a device from field engineer back to warehouse.

**When to Use**: When an engineer returns unused devices, faulty devices, or after call completion.

**Input Contract**:
```
{
  device_id: UUID (required),
  engineer_id: UUID (required),
  return_reason: TEXT (required),
  condition: TEXT (required: 'good' | 'faulty' | 'damaged'),
  received_by: UUID (required, warehouse manager),
  warehouse_id: UUID (required)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  device_id: UUID,
  device_serial: TEXT,
  new_status: TEXT (warehouse or faulty),
  warehouse_name: TEXT,
  message: "Device returned to warehouse"
}

Error:
{
  success: FALSE,
  error_code: TEXT,
  error_message: TEXT
}
```

**Business Rules Enforced**:
1. Device must be assigned to the engineer
2. Device status must be 'issued' or 'returned' (in-transit)
3. Engineer must be active
4. Warehouse manager must be admin role
5. If condition = 'faulty', device status becomes 'faulty'
6. If condition = 'good', device status becomes 'warehouse'

**Validations & Rejection Conditions**:
- ❌ Device not assigned to engineer → Error: `DEVICE_NOT_ASSIGNED`
- ❌ Invalid condition → Error: `INVALID_CONDITION`
- ❌ Receiver not warehouse manager → Error: `UNAUTHORIZED_RECEIVER`
- ❌ Warehouse not found → Error: `WAREHOUSE_NOT_FOUND`

**Atomic Operations Performed**:
1. Update device: status = 'warehouse' or 'faulty', assigned_to = NULL
2. Insert stock_movement: movement_type = 'returned', to_location = warehouse
3. Update engineer_aggregates: decrement devices_issued
4. Increment warehouse stock count

**Transaction Scope**: Single transaction

**Execution Time**: < 1 second

---

### **RPC-007: start_call**

**Purpose**: Mark a call as started when engineer begins work.

**When to Use**: When a field engineer arrives at the site and starts the service call.

**Input Contract**:
```
{
  call_id: UUID (required),
  engineer_id: UUID (required, for verification),
  started_at: TIMESTAMP (required),
  arrival_notes: TEXT (optional)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  call_id: UUID,
  call_number: TEXT,
  started_at: TIMESTAMP,
  message: "Call started successfully"
}

Error:
{
  success: FALSE,
  error_code: TEXT,
  error_message: TEXT
}
```

**Business Rules Enforced**:
1. Call must be assigned to engineer
2. Call status must be 'assigned'
3. Started_at must be >= scheduled_date
4. Engineer must have all required devices issued (if call requires devices)

**Validations & Rejection Conditions**:
- ❌ Call not assigned to engineer → Error: `UNAUTHORIZED_ENGINEER`
- ❌ Call status != 'assigned' → Error: `INVALID_CALL_STATUS`
- ❌ Started too early → Error: `STARTED_BEFORE_SCHEDULED_DATE`
- ❌ Missing required devices → Error: `REQUIRED_DEVICES_NOT_ISSUED`

**Atomic Operations Performed**:
1. Update call: status = 'in_progress', started_at = timestamp, arrival_notes
2. Update engineer_aggregates: increment in_progress_calls

**Transaction Scope**: Single transaction

**Execution Time**: < 500ms

---

### **RPC-008: cancel_call**

**Purpose**: Cancel a call and release assigned resources.

**When to Use**: When a call is cancelled by admin or client.

**Input Contract**:
```
{
  call_id: UUID (required),
  cancelled_by: UUID (required),
  cancellation_reason: TEXT (required),
  cancelled_at: TIMESTAMP (required)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  call_id: UUID,
  devices_released: INTEGER,
  engineer_notified: BOOLEAN,
  message: "Call cancelled successfully"
}

Error:
{
  success: FALSE,
  error_code: TEXT,
  error_message: TEXT
}
```

**Business Rules Enforced**:
1. Call cannot be cancelled if status = 'completed'
2. Call can be cancelled if status = 'pending', 'assigned', or 'in_progress'
3. Cancellation reason required
4. Admin or assigned engineer can cancel

**Atomic Operations Performed**:
1. Update call: status = 'cancelled', cancelled_at, cancelled_by, notes = reason
2. Release assigned devices (if any were reserved/issued for this call)
3. Update engineer_aggregates: decrement active_calls

**Transaction Scope**: Single transaction

**Execution Time**: < 1 second

---

### **RPC-009: recompute_engineer_aggregates**

**Purpose**: Recalculate all performance metrics for one or all engineers.

**When to Use**: After bulk data imports, data corrections, or on scheduled maintenance.

**Input Contract**:
```
{
  engineer_id: UUID (optional, if NULL recompute all engineers),
  force_refresh: BOOLEAN (default FALSE)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  engineers_updated: INTEGER,
  execution_time_ms: INTEGER,
  message: "Aggregates recomputed successfully"
}

Error:
{
  success: FALSE,
  error_code: TEXT,
  error_message: TEXT
}
```

**Calculations Performed**:
1. **total_calls**: COUNT all calls assigned to engineer (any status)
2. **completed_calls**: COUNT calls with status = 'completed'
3. **in_progress_calls**: COUNT calls with status = 'in_progress'
4. **cancelled_calls**: COUNT calls with status = 'cancelled'
5. **avg_call_duration_hours**: AVG(completed_at - started_at) for completed calls
6. **devices_issued**: COUNT devices with assigned_to = engineer AND status = 'issued'
7. **devices_installed**: COUNT devices with status = 'installed' AND last_modified_by = engineer
8. **last_call_completed_at**: MAX(completed_at) for completed calls
9. **total_working_hours**: SUM(completed_at - started_at) for all completed calls
10. **completion_rate**: completed_calls / total_calls (percentage)

**Transaction Scope**: Can run outside transaction (read-heavy)

**Execution Time**: < 5 seconds for all engineers

---

### **RPC-010: recompute_warehouse_aggregates**

**Purpose**: Recalculate inventory counts and statistics for warehouses.

**When to Use**: After stock movements, data imports, or scheduled maintenance.

**Input Contract**:
```
{
  warehouse_id: UUID (optional, if NULL recompute all warehouses),
  bank_id: UUID (optional, filter by bank)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  warehouses_updated: INTEGER,
  total_devices_counted: INTEGER,
  execution_time_ms: INTEGER
}
```

**Calculations Performed**:
1. **total_devices**: COUNT devices with status = 'warehouse' per warehouse
2. **devices_by_model**: COUNT grouped by model
3. **devices_by_bank**: COUNT grouped by bank
4. **faulty_devices_count**: COUNT devices with status = 'faulty'
5. **utilization_rate**: (devices_issued + devices_installed) / total_devices
6. **stock_turnover**: Devices moved in last 30 days / total_devices

**Transaction Scope**: Read-heavy, can run outside transaction

**Execution Time**: < 3 seconds for all warehouses

---

### **RPC-011: get_engineer_availability**

**Purpose**: Calculate availability score for engineers based on workload, location, and device inventory.

**When to Use**: During call assignment algorithm or for workload balancing.

**Input Contract**:
```
{
  bank_id: UUID (required),
  call_location: JSONB (optional) {
    latitude: FLOAT,
    longitude: FLOAT
  },
  call_priority: TEXT (optional),
  scheduled_date: DATE (optional)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  available_engineers: [
    {
      engineer_id: UUID,
      engineer_name: TEXT,
      availability_score: FLOAT (0-100),
      active_calls: INTEGER,
      devices_available: INTEGER,
      distance_km: FLOAT (if location provided),
      estimated_availability: TIMESTAMP
    }
  ]
}
```

**Scoring Algorithm**:
1. **Base Score**: 100 points
2. **Workload Penalty**: -10 points per active call (max -40)
3. **Device Capacity Penalty**: -5 points per device over 5 (max -25)
4. **Distance Penalty**: -1 point per 10km from call location (max -20)
5. **Scheduled Availability Bonus**: +15 points if available on scheduled_date
6. **Priority Modifier**: Urgent calls get engineers with score > 70 only

**Transaction Scope**: Read-only

**Execution Time**: < 500ms

---

### **RPC-012: get_device_stock_summary**

**Purpose**: Generate stock summary report by bank, status, and model.

**When to Use**: For dashboard displays, inventory reports, and stock alerts.

**Input Contract**:
```
{
  bank_id: UUID (optional, filter by bank),
  status_filter: TEXT[] (optional, filter by statuses),
  include_details: BOOLEAN (default FALSE)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  summary: {
    total_devices: INTEGER,
    by_status: {
      warehouse: INTEGER,
      issued: INTEGER,
      installed: INTEGER,
      faulty: INTEGER,
      returned: INTEGER
    },
    by_model: {
      "PAX S920": INTEGER,
      "PAX A920": INTEGER,
      ...
    },
    by_bank: {
      "WF": INTEGER,
      "BOA": INTEGER,
      ...
    },
    low_stock_banks: TEXT[] (banks below threshold)
  },
  details: [...] (if include_details = TRUE)
}
```

**Transaction Scope**: Read-only

**Execution Time**: < 1 second

---

### **RPC-013: validate_device_movement**

**Purpose**: Pre-validate a device movement operation before execution.

**When to Use**: Before calling issue_device, swap_device, or return_device RPCs.

**Input Contract**:
```
{
  device_id: UUID (required),
  target_status: TEXT (required),
  target_engineer_id: UUID (optional),
  target_call_id: UUID (optional)
}
```

**Output Contract**:
```
Success (valid):
{
  valid: TRUE,
  device_serial: TEXT,
  current_status: TEXT,
  target_status: TEXT,
  warnings: TEXT[] (non-blocking warnings)
}

Success (invalid):
{
  valid: FALSE,
  errors: [
    {
      error_code: TEXT,
      error_message: TEXT,
      field: TEXT
    }
  ]
}
```

**Validations Performed**:
1. Device exists
2. Current status allows transition to target status
3. Bank matching (device, engineer, call)
4. Engineer capacity check
5. Call assignment verification

**Transaction Scope**: Read-only

**Execution Time**: < 200ms

---

### **RPC-014: create_stock_alert**

**Purpose**: Create or update stock alert when inventory falls below threshold.

**When to Use**: Automatically triggered after stock movements or manually by admins.

**Input Contract**:
```
{
  bank_id: UUID (required),
  alert_type: TEXT (required: 'low_stock' | 'critical_stock' | 'overstock'),
  threshold: INTEGER (required),
  current_count: INTEGER (required),
  auto_resolve: BOOLEAN (default TRUE)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  alert_id: UUID,
  alert_created: BOOLEAN,
  alert_updated: BOOLEAN,
  message: TEXT
}
```

**Business Rules**:
1. **Low Stock**: warehouse count < 10 devices
2. **Critical Stock**: warehouse count < 5 devices
3. **Overstock**: warehouse count > 80% capacity
4. Auto-resolve if stock returns above threshold

**Transaction Scope**: Single transaction

**Execution Time**: < 500ms

---

### **RPC-015: reconcile_inventory**

**Purpose**: Identify discrepancies between expected and actual device counts.

**When to Use**: During audits, data corrections, or scheduled reconciliation jobs.

**Input Contract**:
```
{
  bank_id: UUID (optional, reconcile specific bank),
  fix_discrepancies: BOOLEAN (default FALSE, dry-run mode)
}
```

**Output Contract**:
```
Success:
{
  success: TRUE,
  discrepancies_found: INTEGER,
  discrepancies: [
    {
      device_serial: TEXT,
      expected_status: TEXT,
      actual_status: TEXT,
      expected_location: TEXT,
      actual_location: TEXT,
      last_movement: TIMESTAMP,
      suggested_fix: TEXT
    }
  ],
  corrections_applied: INTEGER (if fix_discrepancies = TRUE)
}
```

**Checks Performed**:
1. Devices marked 'issued' but assigned_to is NULL
2. Devices marked 'installed' but no call record
3. Stock movement count != device status transitions
4. Engineer aggregate counts != actual device counts
5. Orphaned stock movements (device doesn't exist)

**Transaction Scope**: Read-only for dry-run, transaction for fixes

**Execution Time**: < 10 seconds for full reconciliation

---

## 2. Trigger Catalog

### Overview

Database triggers automatically maintain data consistency, update aggregates, and enforce business rules in response to data changes.

**Total Triggers**: 12 core triggers

---

### **TRIGGER-001: trg_after_device_status_change**

**Event**: `AFTER UPDATE ON devices` (when status column changes)

**When It Fires**: Any time a device.status is updated

**Purpose**: Automatically create stock_movement record and update aggregates

**Actions Performed**:
1. Detect old status vs new status
2. Insert row into stock_movements table:
   - device_id = changed device
   - movement_type = inferred from status change
   - from_status = OLD.status
   - to_status = NEW.status
   - from_location = OLD.assigned_to or OLD.installed_at_client
   - to_location = NEW.assigned_to or NEW.installed_at_client
   - moved_by = current_user
   - created_at = NOW()
3. Update engineer_aggregates if assigned_to changed
4. Update warehouse stock counts
5. Check stock levels, create alert if below threshold

**Prevents**:
- Manual stock_movement entry errors
- Missing audit trail for device movements

**Performance**: < 100ms per device update

---

### **TRIGGER-002: trg_after_call_status_change**

**Event**: `AFTER UPDATE ON calls` (when status column changes)

**When It Fires**: Any time a call.status is updated

**Purpose**: Update timestamps and engineer aggregates based on call status transitions

**Actions Performed**:

**If status changes to 'assigned'**:
1. Set assigned_at = NOW() (if NULL)
2. Increment engineer_aggregates.total_calls
3. Notify engineer (via notifications table or external service)

**If status changes to 'in_progress'**:
1. Set started_at = NOW() (if NULL)
2. Decrement engineer_aggregates.total_calls (from pending)
3. Increment engineer_aggregates.in_progress_calls

**If status changes to 'completed'**:
1. Set completed_at = NOW() (if NULL)
2. Validate completion requirements:
   - If requires_device = TRUE, must have photos
   - Must have started_at timestamp
3. Decrement engineer_aggregates.in_progress_calls
4. Increment engineer_aggregates.completed_calls
5. Calculate call_duration = completed_at - started_at
6. Update engineer_aggregates.avg_call_duration_hours

**If status changes to 'cancelled'**:
1. Set cancelled_at = NOW() (if NULL)
2. Decrement engineer_aggregates.active_calls
3. Release reserved devices (if any)

**Prevents**:
- Incomplete call records
- Stale aggregate counts
- Missing timestamps

**Performance**: < 200ms per call update

---

### **TRIGGER-003: trg_validate_device_bank_consistency**

**Event**: `BEFORE INSERT OR UPDATE ON devices`

**When It Fires**: Before any device insert or update that changes bank or assignment

**Purpose**: Enforce bank consistency (device.bank = engineer.bank)

**Validation Rules**:
1. If assigned_to is NOT NULL:
   - Lookup engineer's bank_id from user_profiles
   - Verify device.device_bank = engineer.bank_id
   - If mismatch, RAISE EXCEPTION 'BANK_MISMATCH'
2. If status = 'issued' but assigned_to is NULL:
   - RAISE EXCEPTION 'ISSUED_DEVICE_MUST_HAVE_ENGINEER'
3. If status = 'warehouse' but assigned_to is NOT NULL:
   - RAISE EXCEPTION 'WAREHOUSE_DEVICE_CANNOT_BE_ASSIGNED'

**Prevents**:
- Cross-bank device assignments (security violation)
- Inconsistent device states

**Performance**: < 50ms (single lookup)

---

### **TRIGGER-004: trg_validate_call_assignment**

**Event**: `BEFORE INSERT OR UPDATE ON calls`

**When It Fires**: Before assigning an engineer to a call

**Purpose**: Enforce that engineer.bank = call.client_bank

**Validation Rules**:
1. If assigned_engineer is NOT NULL:
   - Lookup engineer's bank_id from user_profiles
   - Verify engineer.bank_id = call.client_bank
   - If mismatch, RAISE EXCEPTION 'ENGINEER_BANK_MISMATCH'
2. If status = 'assigned' but assigned_engineer is NULL:
   - RAISE EXCEPTION 'ASSIGNED_CALL_MUST_HAVE_ENGINEER'

**Prevents**:
- Engineers working on calls for different banks
- Security violations in multi-bank setup

**Performance**: < 50ms

---

### **TRIGGER-005: trg_update_device_timestamps**

**Event**: `BEFORE UPDATE ON devices`

**When It Fires**: Before any device update

**Purpose**: Automatically update updated_at timestamp

**Actions Performed**:
1. Set NEW.updated_at = NOW()
2. Record who made the change (if audit field exists)

**Prevents**:
- Stale timestamps
- Missing audit information

**Performance**: < 10ms

---

### **TRIGGER-006: trg_update_call_timestamps**

**Event**: `BEFORE UPDATE ON calls`

**When It Fires**: Before any call update

**Purpose**: Automatically set started_at, completed_at, cancelled_at based on status

**Actions Performed**:

**If status changes to 'in_progress' AND started_at is NULL**:
1. Set NEW.started_at = NOW()

**If status changes to 'completed' AND completed_at is NULL**:
1. Set NEW.completed_at = NOW()
2. Validate started_at is NOT NULL (cannot complete before starting)

**If status changes to 'cancelled' AND cancelled_at is NULL**:
1. Set NEW.cancelled_at = NOW()

**Always**:
1. Set NEW.updated_at = NOW()

**Prevents**:
- Missing timestamps
- Illogical timestamp sequences

**Performance**: < 10ms

---

### **TRIGGER-007: trg_after_stock_movement_insert**

**Event**: `AFTER INSERT ON stock_movements`

**When It Fires**: After a new stock movement is recorded

**Purpose**: Update aggregate tables and check for alerts

**Actions Performed**:
1. Update warehouse stock counts based on movement type
2. Update engineer device counts if movement involves engineer
3. Check if movement creates low stock condition
4. If low stock detected, call create_stock_alert RPC

**Prevents**:
- Stale inventory counts
- Missed stock alerts

**Performance**: < 200ms

---

### **TRIGGER-008: trg_validate_stock_movement**

**Event**: `BEFORE INSERT ON stock_movements`

**When It Fires**: Before recording a stock movement

**Purpose**: Validate that movement is consistent with device state

**Validation Rules**:
1. device_id must exist
2. from_status must match current device.status (if provided)
3. to_status must be a valid state transition from from_status
4. If movement_type = 'issued', call_id should be provided
5. moved_by must be a valid user

**Valid State Transitions**:
- warehouse → issued
- issued → installed
- issued → returned
- installed → faulty
- installed → returned
- faulty → warehouse (after repair)

**Prevents**:
- Invalid state transitions
- Inconsistent audit trail

**Performance**: < 100ms

---

### **TRIGGER-009: trg_after_photo_upload**

**Event**: `AFTER INSERT ON photos`

**When It Fires**: After a photo is uploaded and linked to a call

**Purpose**: Track photo completion for calls requiring evidence

**Actions Performed**:
1. Count total photos for the call
2. If call.type = 'install' AND photo_count >= 2:
   - Mark call as photo_requirements_met = TRUE
3. If call.type = 'swap' AND photo_count >= 4:
   - Mark call as photo_requirements_met = TRUE

**Prevents**:
- Incomplete call evidence
- Non-compliance with photo policy

**Performance**: < 50ms

---

### **TRIGGER-010: trg_prevent_duplicate_installation**

**Event**: `BEFORE UPDATE ON devices`

**When It Fires**: Before changing device status to 'installed'

**Purpose**: Prevent race conditions where two engineers try to install the same device simultaneously

**Validation Rules**:
1. If NEW.status = 'installed' AND OLD.status = 'issued':
   - Check if another transaction is updating the same device
   - Use row-level lock: SELECT ... FOR UPDATE
   - Verify no other device with same serial_number has status = 'installed'
   - If duplicate detected, RAISE EXCEPTION 'DUPLICATE_INSTALLATION_ATTEMPT'

**Prevents**:
- Double installations (critical bug)
- Data corruption from race conditions

**Performance**: < 100ms (includes lock acquisition)

---

### **TRIGGER-011: trg_enforce_photo_requirements**

**Event**: `BEFORE UPDATE ON calls`

**When It Fires**: Before marking a call as 'completed'

**Purpose**: Enforce photo evidence policy

**Validation Rules**:
1. If NEW.status = 'completed' AND call.requires_device = TRUE:
   - Count photos for this call
   - If call.type IN ('install', 'swap') AND photo_count < 2:
     - RAISE EXCEPTION 'INSUFFICIENT_PHOTOS'
   - If call.type = 'swap' AND photo_count < 4:
     - RAISE EXCEPTION 'INSUFFICIENT_SWAP_PHOTOS'

**Prevents**:
- Non-compliance with photo policy
- Incomplete documentation

**Performance**: < 100ms

---

### **TRIGGER-012: trg_cascade_engineer_deactivation**

**Event**: `AFTER UPDATE ON user_profiles`

**When It Fires**: When an engineer's status changes to 'inactive'

**Purpose**: Handle active assignments when engineer is deactivated

**Actions Performed**:
1. Find all calls assigned to engineer with status IN ('assigned', 'in_progress')
2. For 'assigned' calls: Change status back to 'pending', assigned_engineer = NULL
3. For 'in_progress' calls: Create admin alert (manual intervention required)
4. Find all devices issued to engineer
5. Mark devices as 'returned' (requires warehouse processing)
6. Update engineer_aggregates

**Prevents**:
- Orphaned calls
- Lost devices

**Performance**: < 500ms (can affect multiple records)

---

## 3. Transactional Invariants

### Overview

Transactional invariants are rules that MUST ALWAYS be true at the end of any transaction. These are enforced through triggers, constraints, and RPC logic.

---

### **Invariant Set 1: Device State Consistency**

**Rule 1.1**: A device with status = 'issued' MUST have assigned_to != NULL
```
Enforcement: TRIGGER-003 (BEFORE UPDATE)
Check: COUNT(devices WHERE status = 'issued' AND assigned_to IS NULL) = 0
```

**Rule 1.2**: A device with status = 'warehouse' MUST have assigned_to = NULL
```
Enforcement: TRIGGER-003 (BEFORE UPDATE)
Check: COUNT(devices WHERE status = 'warehouse' AND assigned_to IS NOT NULL) = 0
```

**Rule 1.3**: A device with status = 'installed' MUST have installed_at_client != NULL
```
Enforcement: RPC validation, application logic
Check: COUNT(devices WHERE status = 'installed' AND installed_at_client IS NULL) = 0
```

**Rule 1.4**: A device can only be in ONE status at a time (enforced by enum constraint)
```
Enforcement: Database CHECK constraint
```

**Rule 1.5**: If device.assigned_to = engineer, then device.device_bank MUST = engineer.bank_id
```
Enforcement: TRIGGER-003 (BEFORE UPDATE)
Check: No rows in query:
  SELECT * FROM devices d
  JOIN user_profiles u ON d.assigned_to = u.id
  WHERE d.device_bank != u.bank_id
```

---

### **Invariant Set 2: Call State Consistency**

**Rule 2.1**: A call with status = 'assigned' MUST have assigned_engineer != NULL
```
Enforcement: TRIGGER-004 (BEFORE UPDATE)
Check: COUNT(calls WHERE status = 'assigned' AND assigned_engineer IS NULL) = 0
```

**Rule 2.2**: A call with status = 'in_progress' MUST have started_at != NULL
```
Enforcement: TRIGGER-006 (BEFORE UPDATE)
Check: COUNT(calls WHERE status = 'in_progress' AND started_at IS NULL) = 0
```

**Rule 2.3**: A call with status = 'completed' MUST have completed_at != NULL
```
Enforcement: TRIGGER-006 (BEFORE UPDATE)
Check: COUNT(calls WHERE status = 'completed' AND completed_at IS NULL) = 0
```

**Rule 2.4**: For a completed call, completed_at MUST be > started_at
```
Enforcement: TRIGGER-006 (BEFORE UPDATE)
Check: COUNT(calls WHERE status = 'completed' AND completed_at <= started_at) = 0
```

**Rule 2.5**: If call.assigned_engineer = engineer, then call.client_bank MUST = engineer.bank_id
```
Enforcement: TRIGGER-004 (BEFORE UPDATE)
Check: No rows in query:
  SELECT * FROM calls c
  JOIN user_profiles u ON c.assigned_engineer = u.id
  WHERE c.client_bank != u.bank_id
```

**Rule 2.6**: A completed install/swap call with requires_device = TRUE MUST have >= 2 photos
```
Enforcement: TRIGGER-011 (BEFORE UPDATE)
Check: No rows in query:
  SELECT c.* FROM calls c
  LEFT JOIN photos p ON p.call_id = c.id
  WHERE c.status = 'completed'
    AND c.requires_device = TRUE
    AND c.type IN ('install', 'swap')
  GROUP BY c.id
  HAVING COUNT(p.id) < 2
```

---

### **Invariant Set 3: Stock Movement Consistency**

**Rule 3.1**: Every device status change MUST have a corresponding stock_movement record
```
Enforcement: TRIGGER-001 (AFTER UPDATE)
Verification: Device update count = Stock movement insert count (in transaction)
```

**Rule 3.2**: stock_movement.device_id MUST reference an existing device
```
Enforcement: Foreign Key constraint
```

**Rule 3.3**: stock_movement.from_status → to_status MUST be a valid transition
```
Enforcement: TRIGGER-008 (BEFORE INSERT)
Valid transitions matrix:
  warehouse → issued ✓
  issued → installed ✓
  issued → returned ✓
  installed → faulty ✓
  installed → returned ✓
  faulty → warehouse ✓
  All other transitions: ✗
```

---

### **Invariant Set 4: Aggregate Consistency**

**Rule 4.1**: engineer_aggregates.devices_issued MUST = COUNT(devices WHERE assigned_to = engineer AND status = 'issued')
```
Enforcement: TRIGGER-001, TRIGGER-007
Verification Query:
  SELECT
    ea.engineer_id,
    ea.devices_issued as aggregate_count,
    COUNT(d.id) as actual_count
  FROM engineer_aggregates ea
  LEFT JOIN devices d ON d.assigned_to = ea.engineer_id AND d.status = 'issued'
  GROUP BY ea.engineer_id, ea.devices_issued
  HAVING ea.devices_issued != COUNT(d.id)
  -- Should return 0 rows
```

**Rule 4.2**: engineer_aggregates.completed_calls MUST = COUNT(calls WHERE assigned_engineer = engineer AND status = 'completed')
```
Enforcement: TRIGGER-002
Verification Query:
  SELECT
    ea.engineer_id,
    ea.completed_calls as aggregate_count,
    COUNT(c.id) as actual_count
  FROM engineer_aggregates ea
  LEFT JOIN calls c ON c.assigned_engineer = ea.engineer_id AND c.status = 'completed'
  GROUP BY ea.engineer_id, ea.completed_calls
  HAVING ea.completed_calls != COUNT(c.id)
  -- Should return 0 rows
```

**Rule 4.3**: Warehouse stock counts MUST = COUNT(devices WHERE status = 'warehouse' AND device_bank = bank)
```
Enforcement: TRIGGER-001, TRIGGER-007
Verification: Run reconcile_inventory RPC
```

---

### **Invariant Set 5: Bank Isolation**

**Rule 5.1**: An engineer can ONLY work on calls from their assigned bank
```
Enforcement: TRIGGER-004, RLS policies
Check: No rows in query:
  SELECT * FROM calls c
  JOIN user_profiles u ON c.assigned_engineer = u.id
  WHERE c.client_bank != u.bank_id
```

**Rule 5.2**: An engineer can ONLY be issued devices from their assigned bank
```
Enforcement: TRIGGER-003, RLS policies
Check: No rows in query:
  SELECT * FROM devices d
  JOIN user_profiles u ON d.assigned_to = u.id
  WHERE d.device_bank != u.bank_id
```

**Rule 5.3**: A call's assigned devices MUST belong to the call's bank
```
Enforcement: RPC validation in submit_installation, swap_device
Check: No rows in query:
  SELECT c.call_number, d.serial_number
  FROM calls c
  JOIN stock_movements sm ON sm.call_id = c.id
  JOIN devices d ON sm.device_id = d.id
  WHERE d.device_bank != c.client_bank
```

---

## 4. Cross-Table Dependency Map

### Dependency Graph (ASCII)

```
┌────────────────────────────────────────────────┐
│              INDEPENDENT TABLES                 │
│          (No Foreign Key Dependencies)          │
└────────────────────────────────────────────────┘
              │
              ├── banks
              ├── warehouses
              └── couriers
              │
              ▼
┌────────────────────────────────────────────────┐
│           AUTHENTICATION & USERS                │
│         (Depends on: banks)                     │
└────────────────────────────────────────────────┘
              │
              ├── auth.users (Supabase managed)
              └── user_profiles ───→ banks.id
              │
              ▼
┌────────────────────────────────────────────────┐
│               DEVICES TABLE                     │
│    (Depends on: banks, user_profiles)           │
└────────────────────────────────────────────────┘
              │
              └── devices ───→ banks.id (device_bank)
                           ───→ user_profiles.id (assigned_to)
              │
              ▼
┌────────────────────────────────────────────────┐
│                CALLS TABLE                      │
│    (Depends on: banks, user_profiles)           │
└────────────────────────────────────────────────┘
              │
              └── calls ───→ banks.id (client_bank)
                         ───→ user_profiles.id (assigned_engineer)
              │
              ▼
┌────────────────────────────────────────────────┐
│           TRANSACTIONAL TABLES                  │
│  (Depends on: devices, calls, users, etc.)      │
└────────────────────────────────────────────────┘
              │
              ├── stock_movements ───→ devices.id
              │                   ───→ calls.id
              │                   ───→ user_profiles.id (moved_by)
              │
              ├── shipments ───→ couriers.id
              │              ───→ warehouses.id (from_warehouse)
              │              ───→ user_profiles.id (to_engineer)
              │
              └── photos ───→ calls.id
                          ───→ devices.id
                          ───→ user_profiles.id (uploaded_by)
              │
              ▼
┌────────────────────────────────────────────────┐
│         AGGREGATE & COMPUTED TABLES             │
│        (Depends on: all above tables)           │
└────────────────────────────────────────────────┘
              │
              ├── engineer_aggregates ───→ user_profiles.id (engineer_id)
              │                       (computed from calls, devices)
              │
              └── stock_alerts ───→ banks.id
                                (computed from devices counts)
```

---

### Detailed Dependency Matrix

| Table | Depends On (Foreign Keys) | Updates When | Triggers Cascading Updates To |
|-------|---------------------------|--------------|-------------------------------|
| **banks** | None | Rarely | devices, calls, user_profiles, stock_alerts |
| **warehouses** | None | Rarely | shipments, stock counts |
| **couriers** | None | Rarely | shipments |
| **auth.users** | None | User registration | user_profiles |
| **user_profiles** | banks, auth.users | User creation/update | devices, calls, engineer_aggregates |
| **devices** | banks, user_profiles | Frequently | stock_movements, engineer_aggregates, stock_alerts |
| **calls** | banks, user_profiles | Frequently | stock_movements, photos, engineer_aggregates |
| **stock_movements** | devices, calls, user_profiles | Every device change | engineer_aggregates, warehouse stock counts |
| **shipments** | couriers, warehouses, user_profiles | Device shipping | Device status (when delivered) |
| **photos** | calls, devices, user_profiles | Call completion | Call photo_requirements_met flag |
| **engineer_aggregates** | user_profiles | Computed | None (end of chain) |
| **stock_alerts** | banks | Computed | None (notification target) |

---

### Update Cascade Paths

**Path 1: Device Status Change**
```
User action: Update devices.status
  ↓
TRIGGER-001: Create stock_movement
  ↓
TRIGGER-007: Update engineer_aggregates
  ↓
TRIGGER-014: Check stock levels → create stock_alert if needed
```

**Path 2: Call Completion**
```
User action: RPC submit_installation()
  ↓
Update call.status = 'completed'
  ↓
TRIGGER-002: Update engineer_aggregates
  ↓
Update devices.status = 'installed' (multiple devices)
  ↓
TRIGGER-001: Create stock_movements (multiple)
  ↓
TRIGGER-007: Update warehouse stock counts
  ↓
Check stock levels → create stock_alert if needed
```

**Path 3: Engineer Deactivation**
```
User action: Update user_profiles.status = 'inactive'
  ↓
TRIGGER-012: Cascade engineer deactivation
  ↓
Update calls: assigned_engineer = NULL for pending calls
  ↓
TRIGGER-002: Update engineer_aggregates
  ↓
Update devices: status = 'returned' for issued devices
  ↓
TRIGGER-001: Create stock_movements
  ↓
TRIGGER-007: Update warehouse stock counts
```

---

## 5. Concurrency & Locking Rules

### Overview

Multi-user systems require careful handling of concurrent operations to prevent race conditions, deadlocks, and data corruption.

---

### **Locking Strategy**

**Row-Level Locking** (Preferred):
```
Use: SELECT ... FOR UPDATE
When: Before modifying a record that multiple users might access
Duration: Hold lock for minimum time (within transaction only)
```

**Table-Level Locking** (Avoid):
```
Use: LOCK TABLE ... IN EXCLUSIVE MODE
When: Bulk operations (e.g., recompute_engineer_aggregates for all)
Duration: Only during maintenance windows
```

---

### **Concurrency Rules by Operation**

#### **RULE C-1: Device Status Changes**

**Scenario**: Two engineers try to use the same device simultaneously

**Problem**: Both SELECT device, both see status='issued', both try to UPDATE to 'installed'

**Solution**:
```
1. Before updating device:
   SELECT * FROM devices WHERE id = device_id FOR UPDATE
   (This locks the row)

2. Check current status is still valid for transition

3. Perform update

4. COMMIT (releases lock)
```

**Implementation**: TRIGGER-010 enforces this with row lock

**Result**: Second engineer's transaction blocks until first completes, then fails validation

---

#### **RULE C-2: Call Assignment**

**Scenario**: Auto-assignment algorithm assigns same call to two engineers

**Problem**: Race condition in assign_call_to_engineer RPC

**Solution**:
```
1. Lock call row:
   SELECT * FROM calls WHERE id = call_id FOR UPDATE

2. Verify status = 'pending' (not already assigned)

3. Update call: status = 'assigned', assigned_engineer = engineer_id

4. COMMIT
```

**Implementation**: RPC-002 (assign_call_to_engineer) uses row lock

**Result**: Only one assignment succeeds, second attempt fails validation

---

#### **RULE C-3: Aggregate Updates**

**Scenario**: Multiple calls complete simultaneously, all try to update same engineer_aggregates row

**Problem**: Lost updates (last write wins)

**Solution Option A (Pessimistic Locking)**:
```
1. Lock engineer_aggregates row:
   SELECT * FROM engineer_aggregates WHERE engineer_id = X FOR UPDATE

2. Read current values

3. Compute new values

4. UPDATE engineer_aggregates

5. COMMIT
```

**Solution Option B (Optimistic Locking with Retry)**:
```
1. Read current values (no lock)

2. Compute new values

3. UPDATE engineer_aggregates
   WHERE engineer_id = X
     AND version = old_version
   RETURNING *

4. If no rows updated (version changed), RETRY from step 1

5. COMMIT
```

**Implementation**: TRIGGER-002 uses optimistic locking with version field

**Result**: All updates eventually succeed, no data loss

---

#### **RULE C-4: Stock Movement Recording**

**Scenario**: Device status changes while stock_movement is being recorded

**Problem**: Movement record doesn't match final device state

**Solution**:
```
1. Device update and stock_movement insert MUST be in same transaction

2. Use TRIGGER-001 to atomically create movement when device updates

3. If trigger fails, entire transaction rolls back

4. Device status remains unchanged
```

**Implementation**: TRIGGER-001 runs in same transaction as device UPDATE

**Result**: Device and stock_movements always consistent

---

#### **RULE C-5: Inventory Reconciliation**

**Scenario**: Reconciliation runs while devices are being moved

**Problem**: Counts are inconsistent (snapshot in time issue)

**Solution**:
```
1. Use transaction isolation level: REPEATABLE READ

2. All queries in reconciliation see consistent snapshot

3. Do not acquire locks (read-only operation)

4. Report discrepancies based on snapshot

5. COMMIT (no changes)
```

**Implementation**: RPC-015 (reconcile_inventory) uses REPEATABLE READ

**Result**: Reconciliation reports accurate point-in-time state

---

### **Deadlock Prevention Rules**

**Rule D-1**: Always acquire locks in consistent order
```
Order: banks → user_profiles → devices → calls → stock_movements
Never lock in reverse order
```

**Rule D-2**: Keep transactions short
```
Maximum transaction duration: 5 seconds
Use optimistic locking for long-running operations
```

**Rule D-3**: Avoid nested transactions
```
Use savepoints instead of nested BEGIN/COMMIT
Allows partial rollback without aborting entire transaction
```

**Rule D-4**: Retry transient failures
```
If deadlock detected (SQLSTATE 40P01):
  - Wait random interval (100-500ms)
  - Retry operation (max 3 attempts)
  - If still fails, return error to user
```

---

## 6. Error Handling Specification

### Error Code Taxonomy

All errors follow format: `CATEGORY_SPECIFIC_ERROR`

**Categories**:
- `DEVICE_*` - Device-related errors
- `CALL_*` - Call-related errors
- `ENGINEER_*` - Engineer-related errors
- `BANK_*` - Bank consistency errors
- `PHOTO_*` - Photo evidence errors
- `PERMISSION_*` - Authorization errors
- `VALIDATION_*` - Input validation errors
- `CONCURRENCY_*` - Race condition errors

---

### Error Catalog

| Error Code | HTTP Status | Error Message | When It Occurs | User Action |
|------------|-------------|---------------|----------------|-------------|
| **DEVICE_NOT_FOUND** | 404 | "Device with ID {id} not found" | Device ID doesn't exist | Check device ID, verify not deleted |
| **DEVICE_NOT_IN_WAREHOUSE** | 400 | "Device {serial} is not in warehouse (status: {status})" | Trying to issue non-warehouse device | Check device status, may already be issued |
| **DEVICE_NOT_ASSIGNED** | 400 | "Device {serial} is not assigned to engineer {name}" | Engineer tries to use unassigned device | Verify device was issued to engineer |
| **DEVICE_ALREADY_INSTALLED** | 409 | "Device {serial} is already installed at {location}" | Duplicate installation attempt | Use different device, or check if this is the right call |
| **INVALID_DEVICE_STATUS** | 400 | "Invalid device status transition: {from} → {to}" | Trying to change status to invalid state | Check valid status transitions |
| **BANK_MISMATCH** | 403 | "Device bank ({device_bank}) does not match {entity_type} bank ({entity_bank})" | Cross-bank operation attempted | Verify all entities belong to same bank |
| **CALL_NOT_FOUND** | 404 | "Call with ID {id} not found" | Call ID doesn't exist | Check call ID, verify not deleted |
| **INVALID_CALL_STATUS** | 400 | "Invalid operation for call status: {status}" | Operation not allowed in current call state | Check call status, may need to start call first |
| **UNAUTHORIZED_ENGINEER** | 403 | "Engineer {name} is not authorized for this call" | Engineer tries to access another engineer's call | Verify call assignment |
| **ENGINEER_AT_CAPACITY** | 400 | "Engineer {name} has reached maximum capacity ({limit} calls)" | Trying to assign to overloaded engineer | Assign to different engineer or wait for completion |
| **ENGINEER_DEVICE_LIMIT_REACHED** | 400 | "Engineer {name} has maximum devices issued ({limit} devices)" | Trying to issue more devices than allowed | Return unused devices or complete installations |
| **ENGINEER_BANK_MISMATCH** | 403 | "Engineer {name} (bank: {bank}) cannot work on calls for bank {call_bank}" | Cross-bank assignment attempt | Assign engineer from correct bank |
| **NO_AVAILABLE_ENGINEERS** | 400 | "No available engineers for bank {bank_code}" | Auto-assignment fails | Add more engineers or wait for availability |
| **INSUFFICIENT_DEVICE_STOCK** | 400 | "Insufficient devices for bank {bank_code} ({available} available, {needed} needed)" | Not enough devices to assign | Restock warehouse or use devices from another location |
| **INSUFFICIENT_PHOTOS** | 400 | "Call requires minimum {required} photos, only {actual} uploaded" | Trying to complete call without enough photos | Upload required photos before completion |
| **INSUFFICIENT_SWAP_PHOTOS** | 400 | "Swap calls require 4 photos (old before/after, new before/after), only {actual} uploaded" | Swap call without all photos | Upload all 4 required photos |
| **INVALID_PHOTO_UPLOADER** | 403 | "Photo {id} was not uploaded by engineer {name}" | Using photo uploaded by different engineer | Only use photos you uploaded |
| **DUPLICATE_INSTALLATION_ATTEMPT** | 409 | "Device {serial} is being installed by another engineer" | Race condition detected | Wait and retry, or use different device |
| **INSUFFICIENT_PERMISSIONS** | 403 | "User {email} does not have permission to perform this action" | Non-admin trying admin action | Contact administrator |
| **VALIDATION_INVALID_UUID** | 400 | "Invalid UUID format: {value}" | Malformed UUID in request | Check UUID format |
| **VALIDATION_MISSING_FIELD** | 400 | "Required field '{field}' is missing" | Required parameter not provided | Provide all required fields |
| **VALIDATION_INVALID_ENUM** | 400 | "Invalid value '{value}' for field '{field}'. Allowed values: {allowed}" | Enum field has invalid value | Use one of allowed values |
| **CONCURRENCY_DEADLOCK_DETECTED** | 409 | "Operation failed due to concurrent access. Please retry." | Database deadlock occurred | Retry operation after brief delay |
| **TRANSACTION_ROLLBACK** | 500 | "Transaction rolled back due to error: {reason}" | Any validation fails mid-transaction | Fix underlying issue and retry |

---

### Error Response Format

**JSON Structure**:
```json
{
  "success": false,
  "error": {
    "code": "DEVICE_NOT_FOUND",
    "message": "Device with ID abc123 not found",
    "details": {
      "device_id": "abc123",
      "requested_by": "engineer@costar.tech",
      "timestamp": "2025-01-30T12:34:56Z"
    },
    "suggestion": "Check if the device serial number is correct. Contact admin if device should exist.",
    "support_code": "ERR-20250130-123456-XYZ"
  }
}
```

**Fields**:
- `success`: Always `false` for errors
- `error.code`: Machine-readable error code
- `error.message`: Human-readable description
- `error.details`: Additional context (optional)
- `error.suggestion`: Actionable advice for user (optional)
- `error.support_code`: Unique reference for support team (optional)

---

### Error Logging

**What to Log**:
1. Error code and message
2. User ID and role
3. Input parameters (sanitized)
4. Timestamp and duration
5. Stack trace (for 500 errors)
6. Transaction ID (if applicable)

**Where to Log**:
- Application logs (Supabase Edge Function logs)
- Error tracking service (Sentry)
- Database audit table (critical errors only)

**Log Levels**:
- `ERROR`: 400-499 errors (client issues)
- `CRITICAL`: 500-599 errors (server issues)
- `WARNING`: Non-blocking validation failures
- `INFO`: Successful operations with warnings

---

## 7. Validation Test Checklist

### Pre-Deployment Tests

**Category 1: RPC Functional Tests**

- [ ] **RPC-001: submit_installation**
  - [ ] Test: Complete installation with 2 devices and 2 photos → SUCCESS
  - [ ] Test: Try to complete without photos → ERROR: INSUFFICIENT_PHOTOS
  - [ ] Test: Try to complete with wrong engineer → ERROR: UNAUTHORIZED_ENGINEER
  - [ ] Test: Try to complete with wrong bank devices → ERROR: BANK_MISMATCH
  - [ ] Test: Verify devices status changed to 'installed'
  - [ ] Test: Verify stock_movements created
  - [ ] Test: Verify engineer_aggregates updated

- [ ] **RPC-002: assign_call_to_engineer**
  - [ ] Test: Auto-assign call to best available engineer → SUCCESS
  - [ ] Test: Manually assign to specific engineer → SUCCESS
  - [ ] Test: Try to assign when no engineers available → ERROR: NO_AVAILABLE_ENGINEERS
  - [ ] Test: Try to assign call requiring devices when none available → ERROR: INSUFFICIENT_DEVICE_STOCK
  - [ ] Test: Try to assign to engineer at capacity → ERROR: ENGINEER_AT_CAPACITY

- [ ] **RPC-003: issue_device_to_engineer**
  - [ ] Test: Issue 3 devices to engineer → SUCCESS
  - [ ] Test: Try to issue non-warehouse device → ERROR: DEVICE_NOT_IN_WAREHOUSE
  - [ ] Test: Try to issue device from wrong bank → ERROR: BANK_MISMATCH
  - [ ] Test: Try to issue to engineer at capacity → ERROR: ENGINEER_DEVICE_LIMIT_REACHED
  - [ ] Test: Verify stock_movements created

- [ ] **RPC-004: swap_device**
  - [ ] Test: Swap installed device with new device + 4 photos → SUCCESS
  - [ ] Test: Try to swap without enough photos → ERROR: INSUFFICIENT_SWAP_PHOTOS
  - [ ] Test: Try to swap device from wrong bank → ERROR: BANK_MISMATCH
  - [ ] Test: Verify old device status = 'returned', new device status = 'installed'
  - [ ] Test: Verify 2 stock_movements created

- [ ] **RPC-005: mark_device_faulty**
  - [ ] Test: Mark device as faulty with reason → SUCCESS
  - [ ] Test: Try to mark already faulty device → ERROR: DEVICE_ALREADY_FAULTY
  - [ ] Test: Try to mark without reason → ERROR: INVALID_FAULT_REASON
  - [ ] Test: Verify device status = 'faulty'
  - [ ] Test: Verify engineer_aggregates updated (if device was issued)

- [ ] **RPC-009: recompute_engineer_aggregates**
  - [ ] Test: Recompute for single engineer → SUCCESS
  - [ ] Test: Recompute for all engineers → SUCCESS
  - [ ] Test: Verify aggregates match actual counts (run validation query)
  - [ ] Test: Measure execution time (must be < 5s for all engineers)

- [ ] **RPC-015: reconcile_inventory**
  - [ ] Test: Run reconciliation in dry-run mode → SUCCESS (list discrepancies)
  - [ ] Test: Run with fix_discrepancies=TRUE → SUCCESS (apply corrections)
  - [ ] Test: Verify no discrepancies after fix

---

**Category 2: Trigger Tests**

- [ ] **TRIGGER-001: trg_after_device_status_change**
  - [ ] Test: Update device status → Verify stock_movement created automatically
  - [ ] Test: Update 5 devices → Verify 5 stock_movements created
  - [ ] Test: Verify movement_type inferred correctly from status transition

- [ ] **TRIGGER-002: trg_after_call_status_change**
  - [ ] Test: Change call to 'assigned' → Verify assigned_at set
  - [ ] Test: Change call to 'in_progress' → Verify started_at set
  - [ ] Test: Change call to 'completed' → Verify completed_at set
  - [ ] Test: Verify engineer_aggregates updated for each transition

- [ ] **TRIGGER-003: trg_validate_device_bank_consistency**
  - [ ] Test: Try to assign device to engineer from different bank → ERROR: BANK_MISMATCH
  - [ ] Test: Try to set status='issued' without assigned_to → ERROR
  - [ ] Test: Try to set status='warehouse' with assigned_to → ERROR

- [ ] **TRIGGER-004: trg_validate_call_assignment**
  - [ ] Test: Try to assign call to engineer from different bank → ERROR: ENGINEER_BANK_MISMATCH
  - [ ] Test: Try to set status='assigned' without engineer → ERROR

- [ ] **TRIGGER-010: trg_prevent_duplicate_installation**
  - [ ] Test: Two engineers try to install same device simultaneously → Only one succeeds
  - [ ] Test: Second engineer receives ERROR: DUPLICATE_INSTALLATION_ATTEMPT
  - [ ] Test: Row lock acquired and released properly

- [ ] **TRIGGER-011: trg_enforce_photo_requirements**
  - [ ] Test: Try to complete install call with 0 photos → ERROR: INSUFFICIENT_PHOTOS
  - [ ] Test: Try to complete install call with 1 photo → ERROR: INSUFFICIENT_PHOTOS
  - [ ] Test: Complete install call with 2 photos → SUCCESS
  - [ ] Test: Try to complete swap call with 2 photos → ERROR: INSUFFICIENT_SWAP_PHOTOS
  - [ ] Test: Complete swap call with 4 photos → SUCCESS

---

**Category 3: Concurrency Tests**

- [ ] **Test: Concurrent Device Assignments**
  - [ ] Scenario: 2 engineers try to issue same device at exact same time
  - [ ] Expected: Only 1 succeeds, other gets ERROR: DEVICE_NOT_IN_WAREHOUSE
  - [ ] Verify: Device assigned to only 1 engineer

- [ ] **Test: Concurrent Call Assignments**
  - [ ] Scenario: Auto-assignment algorithm runs twice for same call
  - [ ] Expected: Only 1 assignment succeeds
  - [ ] Verify: Call assigned to only 1 engineer

- [ ] **Test: Concurrent Aggregate Updates**
  - [ ] Scenario: 5 calls complete for same engineer simultaneously
  - [ ] Expected: All 5 updates succeed, aggregate counts correct
  - [ ] Verify: completed_calls = previous + 5

- [ ] **Test: Deadlock Handling**
  - [ ] Scenario: Two transactions each lock different rows in opposite order
  - [ ] Expected: Deadlock detected, one transaction retried
  - [ ] Verify: Both transactions eventually succeed

---

**Category 4: Invariant Validation**

- [ ] **Invariant 1.1**: Verify no issued devices without assigned_to
  ```sql
  SELECT COUNT(*) FROM devices WHERE status = 'issued' AND assigned_to IS NULL;
  -- Expected: 0
  ```

- [ ] **Invariant 1.5**: Verify device.bank = engineer.bank
  ```sql
  SELECT COUNT(*)
  FROM devices d
  JOIN user_profiles u ON d.assigned_to = u.id
  WHERE d.device_bank != u.bank_id;
  -- Expected: 0
  ```

- [ ] **Invariant 2.5**: Verify call.bank = engineer.bank
  ```sql
  SELECT COUNT(*)
  FROM calls c
  JOIN user_profiles u ON c.assigned_engineer = u.id
  WHERE c.client_bank != u.bank_id;
  -- Expected: 0
  ```

- [ ] **Invariant 2.6**: Verify completed calls have photos
  ```sql
  SELECT COUNT(*)
  FROM calls c
  LEFT JOIN photos p ON p.call_id = c.id
  WHERE c.status = 'completed'
    AND c.requires_device = TRUE
  GROUP BY c.id
  HAVING COUNT(p.id) < 2;
  -- Expected: 0
  ```

- [ ] **Invariant 4.1**: Verify engineer_aggregates.devices_issued = actual count
  ```sql
  SELECT
    ea.engineer_id,
    ea.devices_issued,
    COUNT(d.id) as actual
  FROM engineer_aggregates ea
  LEFT JOIN devices d ON d.assigned_to = ea.engineer_id AND d.status = 'issued'
  GROUP BY ea.engineer_id, ea.devices_issued
  HAVING ea.devices_issued != COUNT(d.id);
  -- Expected: 0 rows
  ```

---

**Category 5: Rollback Tests**

- [ ] **Test: Partial Installation Failure**
  - [ ] Scenario: Install 3 devices, 3rd device fails validation
  - [ ] Expected: Entire transaction rolls back, no devices installed
  - [ ] Verify: All 3 devices still status='issued', call still status='in_progress'

- [ ] **Test: Photo Upload Failure During Completion**
  - [ ] Scenario: Complete call, but photo validation fails
  - [ ] Expected: Call remains 'in_progress', devices remain 'issued'
  - [ ] Verify: No stock_movements created

- [ ] **Test: Aggregate Update Failure**
  - [ ] Scenario: Device update succeeds, but aggregate update fails
  - [ ] Expected: Entire transaction rolls back
  - [ ] Verify: Device status unchanged, no stock_movement created

---

## 8. Rollback & Recovery Rules

### Rollback Triggers

**Automatic Rollback** occurs when:
1. Any validation fails in trigger (RAISE EXCEPTION)
2. Foreign key constraint violation
3. Check constraint violation
4. Deadlock detected (after retry limit exceeded)
5. RPC logic raises an error
6. Connection lost mid-transaction

**Manual Rollback** may be needed when:
1. User realizes data entry error after commit
2. Admin needs to reverse a bulk operation
3. Testing/demo data needs to be reset

---

### Transaction Rollback Rules

**Rule R-1: All-or-Nothing Device Movements**

If ANY step in a multi-device operation fails, ALL devices must remain unchanged.

**Example**: Installing 5 devices at once
```
BEGIN TRANSACTION;
  Update device 1 → SUCCESS
  Update device 2 → SUCCESS
  Update device 3 → ERROR: BANK_MISMATCH
  -- Rollback triggered
ROLLBACK;

Result: Devices 1 and 2 remain in their original status
```

---

**Rule R-2: Call Completion Atomicity**

Call can only transition to 'completed' if ALL requirements met:
- All devices updated
- All stock_movements created
- All photos uploaded
- Timestamps set

If ANY requirement fails → ROLLBACK entire operation

---

**Rule R-3: Cascade Rollback**

If child record fails, parent record must also rollback.

**Example**: Engineer deactivation
```
BEGIN TRANSACTION;
  Update user_profiles.status = 'inactive'
  Trigger: Reassign 5 pending calls
    Call 1 reassigned → SUCCESS
    Call 2 reassigned → SUCCESS
    Call 3 reassigned → ERROR: NO_AVAILABLE_ENGINEERS
  -- Entire operation fails
ROLLBACK;

Result: Engineer remains active, all 5 calls still assigned to them
```

---

### Recovery Procedures

**Scenario 1: Transaction Timeout**

**Problem**: Long-running transaction exceeds timeout (5 seconds)

**Recovery**:
1. Transaction automatically rolls back
2. Return ERROR: TRANSACTION_TIMEOUT to user
3. Log timeout event with query details
4. User retries operation
5. If timeout persists, investigate query performance

---

**Scenario 2: Deadlock Detected**

**Problem**: Two transactions waiting for each other's locks

**Recovery**:
1. PostgreSQL detects deadlock automatically
2. Aborts one transaction (victim)
3. RPC catches error SQLSTATE 40P01
4. Wait random interval (100-500ms)
5. Retry transaction (max 3 attempts)
6. If still fails, return error to user
7. Log deadlock event for analysis

---

**Scenario 3: Corrupt Aggregate Data**

**Problem**: engineer_aggregates.devices_issued != actual count

**Detection**:
```sql
-- Run reconcile_inventory RPC
SELECT reconcile_inventory(engineer_id := NULL, fix_discrepancies := FALSE);
```

**Recovery**:
1. Identify affected engineers from reconciliation report
2. For each affected engineer:
   ```sql
   SELECT recompute_engineer_aggregates(engineer_id := engineer.id, force_refresh := TRUE);
   ```
3. Verify counts now match
4. Investigate root cause (trigger failure, manual UPDATE, etc.)

---

**Scenario 4: Lost Stock Movement Records**

**Problem**: Device status changed, but no stock_movement record

**Detection**:
```sql
-- Find devices with no movements
SELECT d.serial_number, d.status, d.updated_at
FROM devices d
LEFT JOIN stock_movements sm ON sm.device_id = d.id
WHERE d.created_at < NOW() - INTERVAL '1 hour'
  AND sm.id IS NULL
  AND d.status != 'warehouse';
-- Warehouse is initial status, so no movement expected
```

**Recovery**:
1. For each missing movement:
   ```sql
   INSERT INTO stock_movements (device_id, movement_type, from_status, to_status, ...)
   VALUES (...infer from device history...);
   ```
2. Investigate why TRIGGER-001 didn't fire
3. Check if device was updated with triggers disabled
4. Fix trigger if broken

---

**Scenario 5: Orphaned Devices (issued but no engineer)**

**Problem**: Device status='issued' but assigned_to=NULL (violates invariant)

**Detection**:
```sql
SELECT * FROM devices WHERE status = 'issued' AND assigned_to IS NULL;
```

**Recovery**:
```sql
-- Option A: Return to warehouse
UPDATE devices
SET status = 'warehouse', assigned_to = NULL
WHERE status = 'issued' AND assigned_to IS NULL;

-- Option B: Assign to engineer (if known from context)
UPDATE devices
SET assigned_to = engineer.id
WHERE id = device.id AND status = 'issued';
```

---

### Point-in-Time Recovery (Database Level)

**Backup Strategy**:
1. **Daily Full Backup**: Entire database at midnight UTC
2. **Hourly Incremental Backup**: Changes since last backup
3. **Continuous WAL Archiving**: Write-Ahead Log for point-in-time recovery
4. **Retention**: 30 days for prod, 7 days for dev

**Recovery Process** (if catastrophic failure):
1. Identify recovery point (timestamp)
2. Restore latest full backup before that timestamp
3. Apply incremental backups up to recovery point
4. Replay WAL logs to exact timestamp
5. Verify data integrity
6. Bring database online

**Recovery Time Objective (RTO)**: < 4 hours
**Recovery Point Objective (RPO)**: < 15 minutes (data loss)

---

## 9. Trigger Cascade Flowcharts

### Flowchart 1: Device Status Update → Cascading Effects

```
┌─────────────────────────────────────────┐
│ USER ACTION: Update devices.status     │
│ (e.g., 'issued' → 'installed')         │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-005: Update devices.updated_at  │
│ (BEFORE UPDATE)                         │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-003: Validate bank consistency  │
│ (BEFORE UPDATE)                         │
│ - Check device.bank = engineer.bank     │
│ - Check status rules                    │
└─────────────────────────────────────────┘
              │
              ├─ FAIL → RAISE EXCEPTION → ROLLBACK
              │
              ▼ PASS
┌─────────────────────────────────────────┐
│ UPDATE COMMITTED TO devices TABLE       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-001: After device status change │
│ (AFTER UPDATE)                          │
│ - Insert stock_movements record         │
│ - Set movement_type based on transition │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-007: After stock movement insert│
│ (AFTER INSERT on stock_movements)       │
│ - Update engineer_aggregates            │
│ - Update warehouse stock counts         │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ CHECK: Warehouse stock below threshold? │
└─────────────────────────────────────────┘
              │
              ├─ NO → END
              │
              ▼ YES
┌─────────────────────────────────────────┐
│ RPC: create_stock_alert()               │
│ - Create or update alert record         │
│ - Notify admins                         │
└─────────────────────────────────────────┘
              │
              ▼
           [ END ]
```

---

### Flowchart 2: Call Completion → Multi-Table Updates

```
┌─────────────────────────────────────────┐
│ USER ACTION: RPC submit_installation()  │
│ Input: call_id, device_ids[], photos[]  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ RPC VALIDATION                          │
│ - Call exists & status='in_progress'    │
│ - Engineer authorized                   │
│ - All devices exist & status='issued'   │
│ - Bank consistency                      │
│ - Photo count >= 2                      │
└─────────────────────────────────────────┘
              │
              ├─ FAIL → Return error → No changes
              │
              ▼ PASS
┌─────────────────────────────────────────┐
│ BEGIN TRANSACTION                       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 1: Update calls table              │
│ SET status = 'completed'                │
│     completed_at = NOW()                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-006: Set completed_at timestamp │
│ (BEFORE UPDATE on calls)                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-011: Enforce photo requirements │
│ (BEFORE UPDATE on calls)                │
│ - Check photo count >= 2                │
└─────────────────────────────────────────┘
              │
              ├─ FAIL → ROLLBACK TRANSACTION
              │
              ▼ PASS
┌─────────────────────────────────────────┐
│ TRIGGER-002: After call status change   │
│ (AFTER UPDATE on calls)                 │
│ - Update engineer_aggregates:           │
│   * completed_calls++                   │
│   * in_progress_calls--                 │
│   * avg_call_duration recalculated      │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 2: Update devices (LOOP)          │
│ FOR EACH device in device_ids[]:        │
│   SET status = 'installed'              │
│       installed_at_client = address     │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-003: Validate device (per loop) │
│ (BEFORE UPDATE on devices)              │
│ - Check bank consistency                │
└─────────────────────────────────────────┘
              │
              ├─ FAIL → ROLLBACK TRANSACTION
              │
              ▼ PASS (for all devices)
┌─────────────────────────────────────────┐
│ TRIGGER-001: Create movements (per loop)│
│ (AFTER UPDATE on devices)               │
│ - Insert stock_movements record         │
│   movement_type = 'installed'           │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-007: Update aggregates (per mv) │
│ (AFTER INSERT on stock_movements)       │
│ - Update warehouse stock counts         │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 3: Verify all operations succeeded │
└─────────────────────────────────────────┘
              │
              ├─ ANY FAILURE → ROLLBACK
              │
              ▼ ALL SUCCESS
┌─────────────────────────────────────────┐
│ COMMIT TRANSACTION                      │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ RETURN SUCCESS                          │
│ Output: {                               │
│   success: true,                        │
│   devices_installed: N,                 │
│   stock_movements_created: N            │
│ }                                       │
└─────────────────────────────────────────┘
              │
              ▼
           [ END ]
```

---

### Flowchart 3: Engineer Deactivation → Cascade Effects

```
┌─────────────────────────────────────────┐
│ USER ACTION: Update user_profiles       │
│ SET status = 'inactive'                 │
│ WHERE id = engineer.id                  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ UPDATE COMMITTED TO user_profiles       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-012: Cascade engineer deact.    │
│ (AFTER UPDATE on user_profiles)         │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 1: Find assigned calls             │
│ SELECT * FROM calls                     │
│ WHERE assigned_engineer = engineer.id   │
│   AND status IN ('assigned','in_prog')  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ BRANCH: Call status?                    │
└─────────────────────────────────────────┘
              │
              ├─ STATUS = 'assigned'
              │    │
              │    ▼
              │  ┌──────────────────────────────┐
              │  │ UPDATE calls                 │
              │  │ SET status = 'pending'       │
              │  │     assigned_engineer = NULL │
              │  └──────────────────────────────┘
              │    │
              │    ▼
              │  ┌──────────────────────────────┐
              │  │ TRIGGER-002: Update aggs     │
              │  │ - Decrement active_calls     │
              │  └──────────────────────────────┘
              │
              └─ STATUS = 'in_progress'
                   │
                   ▼
                 ┌──────────────────────────────┐
                 │ CREATE admin alert           │
                 │ "Engineer deactivated with   │
                 │  active in-progress calls -  │
                 │  manual intervention needed" │
                 └──────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 2: Find issued devices             │
│ SELECT * FROM devices                   │
│ WHERE assigned_to = engineer.id         │
│   AND status = 'issued'                 │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ UPDATE devices (LOOP)                   │
│ SET status = 'returned'                 │
│     assigned_to = NULL                  │
│ (Requires warehouse processing)         │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-001: Create movements (per dev) │
│ - Insert stock_movements                │
│   movement_type = 'returned'            │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ TRIGGER-007: Update warehouse counts    │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ STEP 3: Update engineer_aggregates      │
│ SET active_calls = 0                    │
│     devices_issued = 0                  │
└─────────────────────────────────────────┘
              │
              ▼
           [ END ]
```

---

## 10. Summary & Implementation Checklist

### Key Takeaways

**RPCs**: 15 atomic business logic functions that encapsulate complex operations
**Triggers**: 12 automatic data consistency enforcers
**Invariants**: 17 rules that MUST always be true
**Concurrency**: Row-level locking + optimistic updates prevent race conditions
**Errors**: 28 specific error codes with clear messages and remediation advice
**Rollback**: All-or-nothing transactions ensure data integrity

---

### Implementation Order

**Phase 1: Core Constraints & Triggers** (Week 1)
1. Create database constraints (UNIQUE, CHECK, FK)
2. Implement TRIGGER-003 (device bank validation)
3. Implement TRIGGER-004 (call bank validation)
4. Implement TRIGGER-005 (device timestamps)
5. Implement TRIGGER-006 (call timestamps)
6. Test: Basic CRUD operations with validation

**Phase 2: Audit & Aggregates** (Week 2)
7. Implement TRIGGER-001 (device movements)
8. Implement TRIGGER-002 (call status changes)
9. Implement TRIGGER-007 (stock movement effects)
10. Implement TRIGGER-009 (photo tracking)
11. Test: Verify stock_movements created, aggregates updated

**Phase 3: Concurrency & Safety** (Week 3)
12. Implement TRIGGER-010 (prevent duplicate installation)
13. Implement TRIGGER-011 (enforce photo requirements)
14. Implement TRIGGER-012 (cascade engineer deactivation)
15. Add row-level locking to critical operations
16. Test: Concurrent operations, deadlock handling

**Phase 4: RPCs** (Week 4-5)
17. Implement RPC-007 (start_call)
18. Implement RPC-008 (cancel_call)
19. Implement RPC-005 (mark_device_faulty)
20. Implement RPC-006 (return_device_to_warehouse)
21. Implement RPC-003 (issue_device_to_engineer)
22. Implement RPC-001 (submit_installation)
23. Implement RPC-004 (swap_device)
24. Implement RPC-002 (assign_call_to_engineer)
25. Test: End-to-end workflows

**Phase 5: Utilities & Maintenance** (Week 6)
26. Implement RPC-009 (recompute_engineer_aggregates)
27. Implement RPC-010 (recompute_warehouse_aggregates)
28. Implement RPC-011 (get_engineer_availability)
29. Implement RPC-012 (get_device_stock_summary)
30. Implement RPC-013 (validate_device_movement)
31. Implement RPC-014 (create_stock_alert)
32. Implement RPC-015 (reconcile_inventory)
33. Test: Aggregate recalculations, reconciliation

**Phase 6: Integration & Load Testing** (Week 7)
34. Integration tests: All UAT scenarios from BLOCK_12
35. Load testing: 100 concurrent users
36. Stress testing: 10,000 devices, 1,000 calls
37. Performance tuning: Query optimization, index creation
38. Security review: RLS policies, SQL injection prevention

---

### Pre-Production Validation

Before deploying to production, run this validation suite:

```sql
-- 1. Check all triggers exist
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
-- Expected: 12 triggers

-- 2. Check all RPCs exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name LIKE '%device%' OR routine_name LIKE '%call%' OR routine_name LIKE '%engineer%'
ORDER BY routine_name;
-- Expected: 15 functions

-- 3. Validate all invariants (run queries from Section 3)

-- 4. Test error handling (trigger each error code once)

-- 5. Test rollback scenarios (3 scenarios from Section 8)

-- 6. Run reconcile_inventory (should find 0 discrepancies)
SELECT reconcile_inventory();

-- 7. Performance test (measure execution times)
-- All RPCs should complete < 5 seconds
```

---

## Conclusion

This database automation specification provides a complete blueprint for implementing robust, secure, and performant business logic in PostgreSQL. The combination of RPCs, triggers, and transactional invariants ensures data consistency, prevents race conditions, and maintains audit trails across all operations.

**Next Steps**:
1. Review this specification with database team
2. Begin implementation in phased approach (6-7 weeks)
3. Execute comprehensive testing at each phase
4. Integrate with Edge Functions (API layer)
5. Deploy to production with monitoring

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Status**: READY FOR IMPLEMENTATION
**Estimated Implementation Time**: 6-7 weeks

---
