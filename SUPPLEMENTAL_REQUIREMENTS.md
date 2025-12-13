# Supplemental Requirements Specification

## UDS Field Service Management System

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Status:** Authoritative Implementation Reference
**Audience:** Development Teams, QA Engineers, Solution Architects

---

## Table of Contents

1. [Document Objective](#1-document-objective)
2. [Organizational Hierarchy Specification](#2-organizational-hierarchy-specification)
3. [Call Management Detailed Specifications](#3-call-management-detailed-specifications)
4. [Stock Management Detailed Specifications](#4-stock-management-detailed-specifications)
5. [Search Functionality Specifications](#5-search-functionality-specifications)
6. [Mobile Engineer Interface Specifications](#6-mobile-engineer-interface-specifications)
7. [Data Model Extensions](#7-data-model-extensions)
8. [Critical Edge Cases and Exception Handling](#8-critical-edge-cases-and-exception-handling)
9. [Dry Run Scenario Specification](#9-dry-run-scenario-specification)
10. [Appendices](#10-appendices)

---

## 1. Document Objective

This document expands upon the architecture specification (FRONTEND_BLUEPRINT.md) with detailed business logic, workflow sequences, and edge case handling for the UDS Field Service Management system. It serves as the **authoritative reference** for implementation teams when translating architecture into code.

### Scope

- Business rules and validation logic
- Workflow state machines with transition rules
- Algorithm specifications for allocation and scoring
- Edge case handling and exception scenarios
- Data integrity constraints
- User role permissions and access control

### Relationship to Other Documents

| Document | Purpose |
|----------|---------|
| `FRONTEND_BLUEPRINT.md` | Architecture and page structure |
| `ARCHITECTURE_GAP_ANALYSIS.md` | Implementation status and gaps |
| `COSTAR_BULK_IMPORT_SPECIFICATION.md` | Bulk upload workflow details |
| `database.types.ts` | TypeScript type definitions |
| This document | Business logic and workflows |

---

## 2. Organizational Hierarchy Specification

### 2.1 Role Definitions

The system implements a four-tier organizational hierarchy with distinct responsibilities and capabilities.

#### 2.1.1 Super Admin

**Description:** Unrestricted system access with full administrative capabilities.

| Capability | Details |
|------------|---------|
| User Management | Create, edit, suspend, and delete all user types including other admins |
| System Configuration | Configure system-wide settings, thresholds, and business rules |
| Data Access | View all data across the entire organization without scope restrictions |
| Permission Management | Grant and revoke module permissions for all users |
| Audit Access | View complete audit logs and system activity |
| Bank Management | Create and manage all bank entities |
| Override Authority | Override any automated decision or workflow |

**Restrictions:** None. Super Admin has unrestricted access.

#### 2.1.2 Admin

**Description:** Broad operational access with management capabilities.

| Capability | Details |
|------------|---------|
| Coordinator Management | Create and manage coordinator accounts within their jurisdiction |
| Call Visibility | View all calls regardless of assignment status |
| Stock Visibility | View all stock across all locations and engineers |
| Engineer Management | Create, edit, and manage engineer profiles |
| Assignment Override | Manually override automatic engineer allocations |
| Bulk Operations | Perform bulk imports, bulk status changes, and batch operations |
| Reports Access | Generate and view all operational reports |

**Restrictions:**
- Cannot create or modify Super Admin accounts
- Cannot modify system-wide configuration settings
- Cannot access security audit logs

#### 2.1.3 Coordinator

**Description:** Restricted admin role with scoped visibility.

| Capability | Details |
|------------|---------|
| Scoped Engineer View | View only engineers explicitly assigned to this coordinator |
| Scoped Call View | View calls assigned to engineers within their scope |
| Scoped Stock View | View stock held by engineers within their scope |
| Transfer Within Scope | Transfer stock between engineers they manage |
| Call Assignment | Assign calls to engineers within their scope |
| Engineer Status | Update status of engineers they manage |

**Restrictions:**
- Cannot view engineers, calls, or stock outside their assigned scope
- Cannot transfer stock to engineers outside their scope
- Cannot create admin or coordinator accounts
- Cannot modify system settings or bank configurations
- Cannot perform cross-coordinator transfers without admin approval

#### 2.1.4 Engineer

**Description:** Operational access focused on field work.

| Capability | Details |
|------------|---------|
| Assigned Calls | View and work on calls assigned to them |
| Personal Stock | View and manage their personal inventory |
| Stock Acceptance | Accept or reject incoming stock transfers |
| Call Completion | Mark calls as complete with required documentation |
| Photo Upload | Capture and upload photos for call documentation |
| Location Update | Update their current GPS location |

**Restrictions:**
- Cannot view calls assigned to other engineers
- Cannot view stock held by other engineers
- Cannot initiate stock transfers (can only accept/reject)
- Cannot modify call assignments
- Cannot access administrative functions

### 2.2 Permission Matrix

#### 2.2.1 User Management Permissions

| Capability | Super Admin | Admin | Coordinator | Engineer |
|------------|:-----------:|:-----:|:-----------:|:--------:|
| Create Super Admin | ✓ | ✗ | ✗ | ✗ |
| Create Admin | ✓ | ✗ | ✗ | ✗ |
| Create Coordinator | ✓ | ✓ | ✗ | ✗ |
| Create Engineer | ✓ | ✓ | ✗ | ✗ |
| Edit Any User | ✓ | ✗ | ✗ | ✗ |
| Edit Admin | ✓ | ✗ | ✗ | ✗ |
| Edit Coordinator | ✓ | ✓ | ✗ | ✗ |
| Edit Engineer (All) | ✓ | ✓ | ✗ | ✗ |
| Edit Engineer (Scoped) | ✓ | ✓ | ✓ | ✗ |
| Edit Own Profile | ✓ | ✓ | ✓ | ✓ |
| Delete User | ✓ | ✗ | ✗ | ✗ |
| Suspend User | ✓ | ✓ | ✗ | ✗ |
| Approve Engineer | ✓ | ✓ | ✗ | ✗ |

#### 2.2.2 Call Management Permissions

| Capability | Super Admin | Admin | Coordinator | Engineer |
|------------|:-----------:|:-----:|:-----------:|:--------:|
| View All Calls | ✓ | ✓ | ✗ | ✗ |
| View Scoped Calls | ✓ | ✓ | ✓ | ✗ |
| View Assigned Calls | ✓ | ✓ | ✓ | ✓ |
| Create Call | ✓ | ✓ | ✓ | ✗ |
| Bulk Upload Calls | ✓ | ✓ | ✗ | ✗ |
| Edit Any Call | ✓ | ✓ | ✗ | ✗ |
| Edit Scoped Call | ✓ | ✓ | ✓ | ✗ |
| Assign Call (Global) | ✓ | ✓ | ✗ | ✗ |
| Assign Call (Scoped) | ✓ | ✓ | ✓ | ✗ |
| Start Call | ✓ | ✓ | ✓ | ✓ |
| Complete Call | ✓ | ✓ | ✓ | ✓ |
| Cancel Call | ✓ | ✓ | ✓ | ✗ |
| Override Assignment | ✓ | ✓ | ✗ | ✗ |

#### 2.2.3 Stock Management Permissions

| Capability | Super Admin | Admin | Coordinator | Engineer |
|------------|:-----------:|:-----:|:-----------:|:--------:|
| View All Stock | ✓ | ✓ | ✗ | ✗ |
| View Scoped Stock | ✓ | ✓ | ✓ | ✗ |
| View Personal Stock | ✓ | ✓ | ✓ | ✓ |
| Transfer Global | ✓ | ✓ | ✗ | ✗ |
| Transfer Within Scope | ✓ | ✓ | ✓ | ✗ |
| Accept Stock Transfer | ✓ | ✓ | ✓ | ✓ |
| Reject Stock Transfer | ✓ | ✓ | ✓ | ✓ |
| Force Accept Transfer | ✓ | ✓ | ✓ | ✗ |
| Mark Device Faulty | ✓ | ✓ | ✓ | ✓ |
| Return to Warehouse | ✓ | ✓ | ✓ | ✓ |
| Bulk Import Devices | ✓ | ✓ | ✗ | ✗ |

#### 2.2.4 System Administration Permissions

| Capability | Super Admin | Admin | Coordinator | Engineer |
|------------|:-----------:|:-----:|:-----------:|:--------:|
| Access System Config | ✓ | ✗ | ✗ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ | ✗ |
| Manage Banks | ✓ | ✓ | ✗ | ✗ |
| Manage Modules | ✓ | ✗ | ✗ | ✗ |
| Grant Permissions | ✓ | ✗ | ✗ | ✗ |
| View All Reports | ✓ | ✓ | ✗ | ✗ |
| View Scoped Reports | ✓ | ✓ | ✓ | ✗ |
| Export Data | ✓ | ✓ | ✓ | ✗ |

### 2.3 Coordinator Scope Management

#### 2.3.1 Scope Definition

A coordinator's scope is defined by explicit engineer assignments stored in the `coordinator_assignments` table:

```sql
-- Proposed table structure
CREATE TABLE coordinator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id UUID NOT NULL REFERENCES user_profiles(id),
  engineer_id UUID NOT NULL REFERENCES user_profiles(id),
  assigned_by UUID NOT NULL REFERENCES user_profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  UNIQUE(coordinator_id, engineer_id, effective_from)
);
```

#### 2.3.2 Scope Inheritance Rules

1. **Direct Assignment:** Engineers explicitly assigned to a coordinator
2. **Bank-Based:** Optionally, all engineers assigned to the same bank as the coordinator
3. **Region-Based:** Optionally, all engineers in the same region as the coordinator
4. **Hierarchical:** A coordinator sees all engineers assigned to sub-coordinators (if hierarchy exists)

#### 2.3.3 Scope Validation

All API requests from coordinators MUST validate scope:

```typescript
async function validateCoordinatorScope(
  coordinatorId: string,
  engineerId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('coordinator_assignments')
    .select('id')
    .eq('coordinator_id', coordinatorId)
    .eq('engineer_id', engineerId)
    .eq('status', 'active')
    .single();

  return !!data;
}
```

---

## 3. Call Management Detailed Specifications

### 3.1 Call Lifecycle State Machine

#### 3.1.1 State Definitions

| State | Description | Allowed Transitions |
|-------|-------------|---------------------|
| `pending` | Call created, awaiting assignment | `assigned`, `cancelled` |
| `assigned` | Call assigned to engineer | `in_progress`, `pending`, `cancelled` |
| `in_progress` | Engineer working on call | `completed`, `assigned`, `cancelled` |
| `completed` | Call finished successfully | None (terminal state) |
| `cancelled` | Call cancelled | None (terminal state) |

#### 3.1.2 State Transition Rules

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
┌──────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────┴──┐
│ pending  │───▶│ assigned │───▶│ in_progress │───▶│  completed  │
└────┬─────┘    └────┬─────┘    └──────┬──────┘    └─────────────┘
     │               │                 │
     │               │                 │
     │               ▼                 │
     │          ┌──────────┐           │
     └─────────▶│cancelled │◀──────────┘
                └──────────┘
```

**Transition Validations:**

| Transition | Required Conditions | Actor |
|------------|---------------------|-------|
| pending → assigned | Valid engineer selected, engineer has capacity | Admin, Coordinator |
| pending → cancelled | Cancellation reason provided | Admin, Coordinator |
| assigned → in_progress | Engineer confirms start, GPS captured | Engineer |
| assigned → pending | Reassignment reason provided | Admin, Coordinator |
| assigned → cancelled | Cancellation reason provided | Admin, Coordinator |
| in_progress → completed | Required photos uploaded, stock accounted | Engineer |
| in_progress → assigned | Reassignment reason provided (rare) | Admin |
| in_progress → cancelled | Cancellation reason provided (rare) | Admin |

### 3.2 Call Entry Channels

#### 3.2.1 Bulk Upload via Excel/CSV

**Workflow Sequence:**

```
1. Admin uploads file (.xlsx or .csv)
     ↓
2. System parses headers and detects columns
     ↓
3. Admin maps columns to canonical fields
     ↓
4. System validates each row:
   - Required fields present
   - Data types correct
   - Enums valid
   - Dates parseable
     ↓
5. Duplicate detection runs against open calls
     ↓
6. Dry-run preview shows:
   - Valid rows (will import)
   - Duplicate rows (will skip)
   - Invalid rows (will skip with errors)
     ↓
7. Admin confirms import
     ↓
8. System imports valid rows transactionally
     ↓
9. Import report generated with statistics
```

**File Format Requirements:**

| Format | Extension | Max Size | Max Rows | Encoding |
|--------|-----------|----------|----------|----------|
| Excel | .xlsx | 50 MB | 5,000 | UTF-8 |
| CSV | .csv | 50 MB | 5,000 | UTF-8 |

#### 3.2.2 Webhook/API Integration

**Endpoint:** `POST /functions/v1/create-call`

**Request Schema:**

```typescript
interface CreateCallRequest {
  call_number: string;        // External ticket number (unique)
  type: 'install' | 'swap' | 'deinstall' | 'maintenance' | 'breakdown';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  client_bank: string;        // Bank UUID or code
  client_name: string;        // Merchant name
  client_address: string;     // Full address
  client_contact?: string;    // Contact person name
  client_phone?: string;      // Contact phone
  latitude?: number;          // Site latitude
  longitude?: number;         // Site longitude
  scheduled_date: string;     // ISO date string
  description?: string;       // Call details
  metadata?: Record<string, any>; // Additional data
}
```

**Response Schema:**

```typescript
interface CreateCallResponse {
  success: boolean;
  call_id?: string;
  call_number?: string;
  duplicate?: boolean;
  duplicate_call_id?: string;
  errors?: string[];
}
```

### 3.3 Duplicate Detection Algorithm

#### 3.3.1 Primary Detection (Exact Match)

```typescript
function checkExactDuplicate(
  callNumber: string,
  existingCalls: Call[]
): Call | null {
  // Ticket number is the primary unique identifier
  return existingCalls.find(
    c => c.call_number.toLowerCase() === callNumber.toLowerCase() &&
         c.status !== 'completed' &&
         c.status !== 'cancelled'
  ) || null;
}
```

#### 3.3.2 Secondary Detection (Fuzzy Match)

```typescript
interface FuzzyMatchCriteria {
  merchantId: string;
  scheduledDate: string;
  callType: string;
}

function checkFuzzyDuplicate(
  criteria: FuzzyMatchCriteria,
  existingCalls: Call[]
): Call[] {
  // Find potential duplicates by merchant + date + type
  return existingCalls.filter(c => {
    const merchantMatch = c.metadata?.merchant_id === criteria.merchantId;
    const dateMatch = c.scheduled_date === criteria.scheduledDate;
    const typeMatch = c.type === criteria.callType;
    const isOpen = !['completed', 'cancelled'].includes(c.status);

    return merchantMatch && dateMatch && typeMatch && isOpen;
  });
}
```

#### 3.3.3 Duplicate Handling Rules

| Scenario | Action | User Feedback |
|----------|--------|---------------|
| Exact call_number match (open call) | Reject | "Duplicate: Call {number} already exists with status {status}" |
| Exact call_number match (closed call) | Allow | None (closed calls can be re-raised) |
| Fuzzy match found | Warn | "Warning: Similar call exists for {merchant} on {date}" |
| No matches | Allow | None |

### 3.4 Automatic Engineer Allocation Algorithm

#### 3.4.1 Algorithm Overview

The allocation algorithm scores each eligible engineer and selects the highest-scoring candidate.

**Scoring Formula:**

```
TotalScore = (ProximityScore × 0.35) +
             (PriorityScore × 0.25) +
             (WorkloadScore × 0.20) +
             (StockScore × 0.20)
```

#### 3.4.2 Proximity Score Calculation

Uses the Haversine formula to compute distance between call location and engineer location:

```typescript
function calculateProximityScore(
  callLat: number,
  callLng: number,
  engineerLat: number,
  engineerLng: number
): number {
  const distance = haversineDistance(
    callLat, callLng,
    engineerLat, engineerLng
  );

  // Score inversely proportional to distance
  // Max radius: 100km, beyond which score is 0
  const MAX_RADIUS_KM = 100;
  const score = Math.max(0, (1 - distance / MAX_RADIUS_KM)) * 100;

  return score;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

#### 3.4.3 Workload Score Calculation

```typescript
function calculateWorkloadScore(
  activeCallsCount: number
): number {
  // Engineers with fewer active calls score higher
  // Assumes max reasonable workload is 10 calls
  const MAX_CALLS = 10;
  const score = Math.max(0, (1 - activeCallsCount / MAX_CALLS)) * 100;

  return score;
}
```

#### 3.4.4 Stock Score Calculation

```typescript
function calculateStockScore(
  currentDeviceCount: number
): number {
  // Engineers with more stock can handle more calls
  // Assumes 10 devices is "well stocked"
  const OPTIMAL_STOCK = 10;
  const score = Math.min(currentDeviceCount / OPTIMAL_STOCK, 1) * 100;

  return score;
}
```

#### 3.4.5 Priority Score Calculation

```typescript
function calculatePriorityScore(
  callPriority: 'low' | 'medium' | 'high' | 'urgent'
): number {
  const priorityValues = {
    low: 25,
    medium: 50,
    high: 75,
    urgent: 100
  };

  return priorityValues[callPriority];
}
```

#### 3.4.6 Eligibility Filters

Before scoring, engineers are filtered by:

1. **Bank Match:** Engineer's bank_id must match call's client_bank
2. **Active Status:** Engineer must have status = 'active'
3. **Availability:** Engineer must not be on leave or marked unavailable
4. **Coordinator Scope:** If initiated by coordinator, engineer must be in their scope

```typescript
function getEligibleEngineers(
  call: Call,
  allEngineers: Engineer[],
  coordinatorId?: string
): Engineer[] {
  return allEngineers.filter(eng => {
    // Bank match
    if (eng.bank_id !== call.client_bank) return false;

    // Active status
    if (eng.status !== 'active' || !eng.active) return false;

    // Coordinator scope (if applicable)
    if (coordinatorId) {
      const inScope = isEngineerInCoordinatorScope(coordinatorId, eng.id);
      if (!inScope) return false;
    }

    return true;
  });
}
```

### 3.5 Call Completion Workflow

#### 3.5.1 Completion Requirements

| Call Type | Required Photos | Stock Action | Validations |
|-----------|-----------------|--------------|-------------|
| install | before, serial_number, installation | Consume device | Device must be in engineer inventory |
| swap | before, old_serial, new_serial, after | Consume new, return old | Both devices tracked |
| deinstall | before, serial_number | Return device | Device must exist at location |
| maintenance | before, after | None | None |
| breakdown | damage, repair | Optional consume | Based on repair action |

#### 3.5.2 Stock Deduction Logic

```typescript
async function processCallCompletion(
  callId: string,
  engineerId: string,
  consumedDevices: { deviceId: string; quantity: number }[]
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate engineer has all consumed devices
  for (const item of consumedDevices) {
    const hasDevice = await validateEngineerHasDevice(
      engineerId,
      item.deviceId,
      item.quantity
    );

    if (!hasDevice) {
      errors.push(`Insufficient stock for device ${item.deviceId}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Atomic transaction: complete call + deduct stock
  const { error } = await supabase.rpc('complete_call_with_stock', {
    p_call_id: callId,
    p_engineer_id: engineerId,
    p_consumed_devices: consumedDevices,
    p_completion_timestamp: new Date().toISOString()
  });

  if (error) {
    return { success: false, errors: [error.message] };
  }

  return { success: true, errors: [] };
}
```

#### 3.5.3 Post-Completion Actions

1. **Update Call Status:** Set status = 'completed', completed_at = NOW()
2. **Deduct Stock:** Reduce engineer inventory for consumed devices
3. **Update Device Status:** Mark installed devices as 'installed'
4. **Record Stock Movement:** Create stock_movements entries for audit
5. **Update Engineer Aggregates:** Increment completed_calls counter
6. **Trigger Notifications:** Notify coordinator of completion
7. **Generate Audit Entry:** Record completion in call_history

---

## 4. Stock Management Detailed Specifications

### 4.1 Stock Transfer Types

#### 4.1.1 Transfer Type Definitions

| Transfer Type | From | To | Initiated By | Requires Acceptance |
|--------------|------|-----|--------------|---------------------|
| Warehouse Issue | Warehouse | Engineer | Admin, Coordinator | Yes |
| Engineer to Engineer | Engineer | Engineer | Admin, Coordinator | Yes |
| Return to Warehouse | Engineer | Warehouse | Engineer, Admin | No |
| Warehouse to Warehouse | Warehouse | Warehouse | Admin | No |
| Faulty Return | Engineer | Warehouse (Faulty) | Engineer | No |

#### 4.1.2 Transfer Status Flow

```
┌────────────┐     ┌───────────────┐     ┌────────────┐
│  INITIATED │────▶│   PENDING     │────▶│  ACCEPTED  │
└────────────┘     │  ACCEPTANCE   │     └────────────┘
                   └───────┬───────┘
                           │
                           ▼
                   ┌───────────────┐
                   │   REJECTED    │
                   └───────────────┘
```

### 4.2 Transfer Acceptance Protocol

#### 4.2.1 Acceptance Workflow

```typescript
interface StockTransfer {
  id: string;
  device_id: string;
  from_location: string;      // 'warehouse' or engineer UUID
  to_location: string;        // 'warehouse' or engineer UUID
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  initiated_by: string;
  initiated_at: string;
  courier_details?: {
    courier_name: string;
    tracking_number: string;
    expected_delivery: string;
  };
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  auto_accept: boolean;
}
```

#### 4.2.2 Acceptance Actions

**Accept Transfer:**

```typescript
async function acceptTransfer(
  transferId: string,
  engineerId: string
): Promise<void> {
  // 1. Validate transfer exists and is pending
  const transfer = await getTransfer(transferId);
  if (transfer.status !== 'pending') {
    throw new Error('Transfer is not pending');
  }

  // 2. Validate engineer is the recipient
  if (transfer.to_location !== engineerId) {
    throw new Error('Not authorized to accept this transfer');
  }

  // 3. Update transfer status
  await supabase.from('stock_transfers').update({
    status: 'accepted',
    accepted_at: new Date().toISOString()
  }).eq('id', transferId);

  // 4. Update device assignment
  await supabase.from('devices').update({
    assigned_to: engineerId,
    status: 'issued',
    current_location: engineerId
  }).eq('id', transfer.device_id);

  // 5. Create stock movement record
  await createStockMovement({
    device_id: transfer.device_id,
    movement_type: 'transfer',
    from_engineer: transfer.from_location !== 'warehouse' ? transfer.from_location : null,
    to_engineer: engineerId,
    actor_id: engineerId,
    reason: 'Transfer accepted'
  });
}
```

**Reject Transfer:**

```typescript
async function rejectTransfer(
  transferId: string,
  engineerId: string,
  reason: string
): Promise<void> {
  // 1. Validate transfer exists and is pending
  const transfer = await getTransfer(transferId);
  if (transfer.status !== 'pending') {
    throw new Error('Transfer is not pending');
  }

  // 2. Validate engineer is the recipient
  if (transfer.to_location !== engineerId) {
    throw new Error('Not authorized to reject this transfer');
  }

  // 3. Update transfer status
  await supabase.from('stock_transfers').update({
    status: 'rejected',
    rejected_at: new Date().toISOString(),
    rejection_reason: reason
  }).eq('id', transferId);

  // 4. Return device to source location
  await returnDeviceToSource(transfer);

  // 5. Notify coordinator of rejection
  await notifyCoordinator(transfer, reason);
}
```

### 4.3 Pending Acceptance Timeout and Escalation

#### 4.3.1 Timeout Configuration

| Transfer Type | Timeout Period | Escalation Action |
|---------------|----------------|-------------------|
| Warehouse Issue | 48 hours | Notify coordinator |
| Engineer to Engineer | 24 hours | Notify both coordinators |
| Auto-Accept Transfer | N/A | Immediate acceptance |

#### 4.3.2 Escalation Logic

```typescript
// Scheduled job runs every hour
async function processTransferTimeouts(): Promise<void> {
  const now = new Date();
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Find overdue transfers
  const { data: overdueTransfers } = await supabase
    .from('stock_transfers')
    .select('*, device:device_id(*), recipient:to_location(*)')
    .eq('status', 'pending')
    .lt('initiated_at', cutoff48h.toISOString());

  for (const transfer of overdueTransfers || []) {
    // 1. Create escalation notification for coordinator
    await createNotification({
      user_id: transfer.recipient.coordinator_id,
      title: 'Pending Transfer Requires Attention',
      message: `Transfer of ${transfer.device.serial_number} to ${transfer.recipient.full_name} has been pending for over 48 hours.`,
      type: 'escalation',
      link: `/stock-transfers/${transfer.id}`
    });

    // 2. Mark transfer as escalated
    await supabase.from('stock_transfers').update({
      escalated: true,
      escalated_at: now.toISOString()
    }).eq('id', transfer.id);
  }
}
```

#### 4.3.3 Force Accept Capability

Coordinators can force-accept transfers for engineers in their scope:

```typescript
async function forceAcceptTransfer(
  transferId: string,
  coordinatorId: string
): Promise<void> {
  const transfer = await getTransfer(transferId);

  // Validate coordinator has authority
  const hasAuthority = await validateCoordinatorScope(
    coordinatorId,
    transfer.to_location
  );

  if (!hasAuthority) {
    throw new Error('Not authorized to force accept for this engineer');
  }

  // Perform acceptance on behalf of engineer
  await supabase.from('stock_transfers').update({
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    force_accepted: true,
    force_accepted_by: coordinatorId
  }).eq('id', transferId);

  // Update device and create movement record...
}
```

### 4.4 Automatic Stock Deduction

#### 4.4.1 Call Completion Stock Handling

```typescript
interface CallCompletionStock {
  call_id: string;
  consumed_devices: Array<{
    device_id: string;
    action: 'installed' | 'consumed' | 'returned';
    serial_number: string;
  }>;
}

async function processCallStockDeduction(
  data: CallCompletionStock,
  engineerId: string
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const device of data.consumed_devices) {
    // Validate device is assigned to engineer
    const { data: deviceData } = await supabase
      .from('devices')
      .select('id, assigned_to, status')
      .eq('id', device.device_id)
      .single();

    if (!deviceData) {
      errors.push(`Device ${device.serial_number} not found`);
      continue;
    }

    if (deviceData.assigned_to !== engineerId) {
      errors.push(`Device ${device.serial_number} not in your inventory`);
      continue;
    }

    if (deviceData.status !== 'issued') {
      errors.push(`Device ${device.serial_number} is not available (status: ${deviceData.status})`);
      continue;
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Process each device action
  for (const device of data.consumed_devices) {
    switch (device.action) {
      case 'installed':
        await supabase.from('devices').update({
          status: 'installed',
          installed_at_client: data.call_id,
          installation_date: new Date().toISOString()
        }).eq('id', device.device_id);
        break;

      case 'returned':
        await supabase.from('devices').update({
          status: 'warehouse',
          assigned_to: null,
          current_location: 'warehouse'
        }).eq('id', device.device_id);
        break;
    }

    // Create stock movement record
    await createStockMovement({
      device_id: device.device_id,
      movement_type: 'status_change',
      from_status: 'issued',
      to_status: device.action === 'installed' ? 'installed' : 'warehouse',
      from_engineer: engineerId,
      to_engineer: device.action === 'returned' ? null : engineerId,
      call_id: data.call_id,
      actor_id: engineerId,
      reason: `Call completion - ${device.action}`
    });
  }

  return { success: true, errors: [] };
}
```

---

## 5. Search Functionality Specifications

### 5.1 Global Search

#### 5.1.1 Search Bar Behavior

**Location:** Persistent in top navigation bar
**Trigger:** Focus on input, Ctrl/Cmd + K shortcut
**Debounce:** 300ms after last keystroke

#### 5.1.2 Search Query Processing

```typescript
interface GlobalSearchResult {
  type: 'call' | 'engineer' | 'device' | 'merchant';
  id: string;
  title: string;
  subtitle: string;
  metadata: Record<string, any>;
  score: number;
}

async function globalSearch(
  query: string,
  limit: number = 10
): Promise<{
  calls: GlobalSearchResult[];
  engineers: GlobalSearchResult[];
  devices: GlobalSearchResult[];
}> {
  const normalizedQuery = query.trim().toLowerCase();

  // Parallel search across entity types
  const [calls, engineers, devices] = await Promise.all([
    searchCalls(normalizedQuery, limit),
    searchEngineers(normalizedQuery, limit),
    searchDevices(normalizedQuery, limit)
  ]);

  return { calls, engineers, devices };
}
```

#### 5.1.3 Entity-Specific Search Logic

**Calls:**
- Match on: call_number, client_name, client_address
- Filter: Open calls appear first, then completed
- Sort: Most recent first within each status group

**Engineers:**
- Match on: full_name, email, employee_id (from metadata)
- Filter: Active engineers only (unless admin)
- Sort: Alphabetical by name

**Devices:**
- Match on: serial_number, model, TID (from metadata)
- Filter: All statuses
- Sort: Most recently updated first

### 5.2 Contextual Search

#### 5.2.1 Module-Specific Filters

**Calls Page Filters:**

| Filter | Type | Options |
|--------|------|---------|
| Status | Multi-select | pending, assigned, in_progress, completed, cancelled |
| Priority | Multi-select | low, medium, high, urgent |
| Bank | Select | List of active banks |
| Engineer | Select | List of engineers (scoped) |
| Date Range | Date picker | From date, To date |
| Call Type | Multi-select | install, swap, deinstall, maintenance, breakdown |

**Devices Page Filters:**

| Filter | Type | Options |
|--------|------|---------|
| Status | Multi-select | warehouse, issued, installed, faulty, returned, in_transit |
| Bank | Select | List of active banks |
| Model | Select | List of device models |
| Assigned To | Select | List of engineers (scoped) |

### 5.3 Performance Requirements

| Metric | Target | Implementation |
|--------|--------|----------------|
| Response Time | < 500ms | Database indexing, query optimization |
| Type-ahead Delay | 300ms debounce | Frontend debouncing |
| Max Results | 50 per entity type | LIMIT clause |
| Index Columns | See below | PostgreSQL B-tree indexes |

**Required Indexes:**

```sql
CREATE INDEX idx_calls_call_number ON calls (call_number);
CREATE INDEX idx_calls_client_name ON calls (client_name);
CREATE INDEX idx_devices_serial_number ON devices (serial_number);
CREATE INDEX idx_user_profiles_full_name ON user_profiles (full_name);
CREATE INDEX idx_user_profiles_email ON user_profiles (email);
```

---

## 6. Mobile Engineer Interface Specifications

### 6.1 Home Screen Layout

#### 6.1.1 Primary Elements

```
┌─────────────────────────────────────┐
│  Today's Calls                  (5) │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🔴 URGENT - PPSINBR123456       │ │
│ │    ABC Electronics Store        │ │
│ │    123 Main St, Mumbai          │ │
│ │    Install • 10:00 AM           │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 HIGH - PPSINBR123457         │ │
│ │    XYZ Mart                     │ │
│ │    456 Oak Ave, Mumbai          │ │
│ │    Maintenance • 2:00 PM        │ │
│ └─────────────────────────────────┘ │
│            ... more calls ...       │
├─────────────────────────────────────┤
│ [My Inventory]  [Profile]  [Sync]   │
└─────────────────────────────────────┘
```

#### 6.1.2 Call Card Information

| Element | Data Source | Format |
|---------|-------------|--------|
| Priority Indicator | call.priority | Color-coded dot |
| Call Number | call.call_number | Truncated if > 20 chars |
| Merchant Name | call.client_name | Full name |
| Address | call.client_address | First line only |
| Call Type | call.type | Capitalized |
| Time | call.scheduled_time_window | HH:MM AM/PM |
| Status Badge | call.status | Color-coded pill |

### 6.2 Photo Capture Requirements

#### 6.2.1 Photo Types by Call

| Call Type | Required Photos | Optional Photos |
|-----------|-----------------|-----------------|
| install | before, serial_number, installation | site_condition |
| swap | before, old_serial, new_serial, after | damage |
| deinstall | before, serial_number | site_condition |
| maintenance | before, after | damage, repair |
| breakdown | damage | before, repair |

#### 6.2.2 Photo Capture Interface

```typescript
interface CapturedPhoto {
  id: string;
  uri: string;              // Local file URI
  type: PhotoType;
  call_id: string;
  device_id?: string;
  gps: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: string;
  uploaded: boolean;
  upload_url?: string;
}

type PhotoType =
  | 'before'
  | 'after'
  | 'serial_number'
  | 'installation'
  | 'damage'
  | 'repair'
  | 'site_condition';
```

#### 6.2.3 Photo Upload Queue

```typescript
class PhotoUploadQueue {
  private queue: CapturedPhoto[] = [];

  async addPhoto(photo: CapturedPhoto): Promise<void> {
    // Save to local storage
    await this.saveLocally(photo);
    this.queue.push(photo);

    // Attempt upload if online
    if (navigator.onLine) {
      await this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    const pending = this.queue.filter(p => !p.uploaded);

    for (const photo of pending) {
      try {
        const url = await this.uploadPhoto(photo);
        photo.uploaded = true;
        photo.upload_url = url;
        await this.updateLocalStorage(photo);
      } catch (error) {
        // Will retry on next sync
        console.error('Upload failed:', error);
      }
    }
  }
}
```

### 6.3 Offline Operation Capabilities

#### 6.3.1 Cached Data Structure

```typescript
interface OfflineCache {
  user: UserProfile;
  assignedCalls: Call[];
  myDevices: Device[];
  pendingPhotos: CapturedPhoto[];
  pendingSubmissions: CallCompletion[];
  lastSyncTime: string;
  syncStatus: 'synced' | 'pending' | 'error';
}
```

#### 6.3.2 Offline-Capable Actions

| Action | Offline Support | Sync Behavior |
|--------|-----------------|---------------|
| View assigned calls | Yes (cached) | Refresh on sync |
| View call details | Yes (cached) | Refresh on sync |
| View personal inventory | Yes (cached) | Refresh on sync |
| Start call | Queue locally | Submit on sync |
| Capture photos | Save locally | Upload on sync |
| Complete call | Queue locally | Submit on sync |
| Accept stock transfer | Requires online | N/A |

#### 6.3.3 Conflict Resolution

```typescript
interface SyncConflict {
  entityType: 'call' | 'device';
  entityId: string;
  localState: any;
  serverState: any;
  conflictType: 'modified' | 'deleted' | 'status_changed';
}

async function resolveConflicts(
  conflicts: SyncConflict[]
): Promise<void> {
  for (const conflict of conflicts) {
    // Show conflict to user
    const resolution = await showConflictDialog(conflict);

    switch (resolution) {
      case 'keep_local':
        await forceLocalState(conflict);
        break;
      case 'accept_server':
        await discardLocalChanges(conflict);
        break;
      case 'merge':
        await showMergeDialog(conflict);
        break;
    }
  }
}
```

### 6.4 Stock Acceptance Flow

#### 6.4.1 Notification Display

```
┌─────────────────────────────────────┐
│  📦 Stock Transfer                  │
├─────────────────────────────────────┤
│                                     │
│  From: Central Warehouse            │
│  Courier: BlueDart                  │
│  Tracking: BD12345678               │
│                                     │
│  Items:                             │
│  • PAX A920 x 3                     │
│  • FUJIAN ET389 x 5                 │
│  • Ingenico IWL220 x 2              │
│                                     │
│  Total: 10 devices                  │
│                                     │
├─────────────────────────────────────┤
│  [✓ Accept]        [✗ Reject]       │
└─────────────────────────────────────┘
```

#### 6.4.2 Acceptance Flow

```typescript
async function handleStockTransferNotification(
  transfer: StockTransfer
): Promise<void> {
  // Show notification with transfer details
  const action = await showTransferNotification(transfer);

  if (action === 'accept') {
    await acceptTransfer(transfer.id, currentUser.id);

    // Refresh local inventory cache
    await refreshInventoryCache();

    // Show success message
    showToast('Stock added to your inventory');
  } else if (action === 'reject') {
    // Prompt for rejection reason
    const reason = await promptForRejectionReason();

    if (reason) {
      await rejectTransfer(transfer.id, currentUser.id, reason);
      showToast('Transfer rejected');
    }
  }
}
```

---

## 7. Data Model Extensions

### 7.1 Proposed New Tables

#### 7.1.1 call_stock_consumption

Records specific stock items consumed during each call completion.

```sql
CREATE TABLE call_stock_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id),
  engineer_id UUID NOT NULL REFERENCES user_profiles(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('installed', 'consumed', 'returned', 'swapped_in', 'swapped_out')),
  quantity INTEGER NOT NULL DEFAULT 1,
  serial_number VARCHAR(100),
  notes TEXT,
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(call_id, device_id, action)
);

CREATE INDEX idx_call_stock_consumption_call ON call_stock_consumption(call_id);
CREATE INDEX idx_call_stock_consumption_device ON call_stock_consumption(device_id);
CREATE INDEX idx_call_stock_consumption_engineer ON call_stock_consumption(engineer_id);
CREATE INDEX idx_call_stock_consumption_date ON call_stock_consumption(consumed_at);
```

**Use Cases:**
- Track which devices were used in each call
- Audit inventory movements tied to calls
- Analyze consumption patterns by call type
- Generate consumption reports by engineer

#### 7.1.2 stock_transfer_log

Maintains complete transfer history for auditing and reporting.

```sql
CREATE TABLE stock_transfer_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id),
  transfer_type VARCHAR(30) NOT NULL CHECK (transfer_type IN (
    'warehouse_to_engineer',
    'engineer_to_engineer',
    'engineer_to_warehouse',
    'warehouse_to_warehouse',
    'faulty_return'
  )),
  from_location_type VARCHAR(20) NOT NULL CHECK (from_location_type IN ('warehouse', 'engineer')),
  from_location_id UUID,
  to_location_type VARCHAR(20) NOT NULL CHECK (to_location_type IN ('warehouse', 'engineer')),
  to_location_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  initiated_by UUID NOT NULL REFERENCES user_profiles(id),
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  courier_name VARCHAR(100),
  courier_tracking VARCHAR(100),
  expected_delivery DATE,
  auto_accept BOOLEAN DEFAULT FALSE,
  force_accepted BOOLEAN DEFAULT FALSE,
  force_accepted_by UUID REFERENCES user_profiles(id),
  escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_transfer_log_device ON stock_transfer_log(device_id);
CREATE INDEX idx_stock_transfer_log_status ON stock_transfer_log(status);
CREATE INDEX idx_stock_transfer_log_from ON stock_transfer_log(from_location_id);
CREATE INDEX idx_stock_transfer_log_to ON stock_transfer_log(to_location_id);
CREATE INDEX idx_stock_transfer_log_date ON stock_transfer_log(initiated_at);
```

**Use Cases:**
- Complete audit trail of all transfers
- Track transfer efficiency and bottlenecks
- Identify engineers with slow acceptance rates
- Report on courier performance

#### 7.1.3 coordinator_assignments

Explicitly tracks engineer-coordinator relationships.

```sql
CREATE TABLE coordinator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id UUID NOT NULL REFERENCES user_profiles(id),
  engineer_id UUID NOT NULL REFERENCES user_profiles(id),
  assigned_by UUID NOT NULL REFERENCES user_profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')),
  transfer_from UUID REFERENCES user_profiles(id),
  transfer_to UUID REFERENCES user_profiles(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(coordinator_id, engineer_id, effective_from)
);

CREATE INDEX idx_coordinator_assignments_coordinator ON coordinator_assignments(coordinator_id);
CREATE INDEX idx_coordinator_assignments_engineer ON coordinator_assignments(engineer_id);
CREATE INDEX idx_coordinator_assignments_status ON coordinator_assignments(status);
CREATE INDEX idx_coordinator_assignments_dates ON coordinator_assignments(effective_from, effective_until);
```

**Use Cases:**
- Define coordinator scopes
- Track historical assignments
- Support organizational restructuring
- Enable scope-based permissions

### 7.2 Recommended Column Additions

#### 7.2.1 user_profiles Extensions

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  employee_id VARCHAR(50),
  coordinator_id UUID REFERENCES user_profiles(id),
  availability_status VARCHAR(20) DEFAULT 'available'
    CHECK (availability_status IN ('available', 'busy', 'on_leave', 'unavailable')),
  max_daily_calls INTEGER DEFAULT 10,
  skill_certifications JSONB DEFAULT '[]',
  preferred_regions TEXT[],
  last_sync_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_user_profiles_coordinator ON user_profiles(coordinator_id);
CREATE INDEX idx_user_profiles_availability ON user_profiles(availability_status);
```

#### 7.2.2 calls Extensions

```sql
ALTER TABLE calls ADD COLUMN IF NOT EXISTS
  source VARCHAR(30) DEFAULT 'manual'
    CHECK (source IN ('manual', 'bulk_upload', 'api', 'webhook')),
  external_reference VARCHAR(100),
  merchant_id VARCHAR(100),
  coordinator_id UUID REFERENCES user_profiles(id),
  auto_assigned BOOLEAN DEFAULT FALSE,
  assignment_score NUMERIC(5,2),
  sla_deadline TIMESTAMP WITH TIME ZONE,
  sla_breached BOOLEAN DEFAULT FALSE,
  completion_photos_count INTEGER DEFAULT 0,
  customer_signature_url TEXT;

CREATE INDEX idx_calls_source ON calls(source);
CREATE INDEX idx_calls_external_ref ON calls(external_reference);
CREATE INDEX idx_calls_merchant_id ON calls(merchant_id);
CREATE INDEX idx_calls_coordinator ON calls(coordinator_id);
CREATE INDEX idx_calls_sla ON calls(sla_deadline, sla_breached);
```

---

## 8. Critical Edge Cases and Exception Handling

### 8.1 Engineer Deletion with Open Calls

#### 8.1.1 Scenario

An admin attempts to delete an engineer who has open calls (pending, assigned, or in_progress).

#### 8.1.2 Handling Strategy

**Option A: Block Deletion (Recommended)**

```typescript
async function deleteEngineer(engineerId: string): Promise<{ success: boolean; error?: string }> {
  // Check for open calls
  const { data: openCalls } = await supabase
    .from('calls')
    .select('id')
    .eq('assigned_engineer', engineerId)
    .in('status', ['pending', 'assigned', 'in_progress']);

  if (openCalls && openCalls.length > 0) {
    return {
      success: false,
      error: `Cannot delete engineer with ${openCalls.length} open call(s). Please reassign calls first.`
    };
  }

  // Proceed with deletion
  await supabase.from('user_profiles').delete().eq('id', engineerId);
  return { success: true };
}
```

**Option B: Force Reassignment**

```typescript
async function deleteEngineerWithReassignment(
  engineerId: string,
  reassignTo: string
): Promise<{ success: boolean; reassignedCalls: number }> {
  // Reassign all open calls
  const { data: updated } = await supabase
    .from('calls')
    .update({ assigned_engineer: reassignTo })
    .eq('assigned_engineer', engineerId)
    .in('status', ['pending', 'assigned', 'in_progress'])
    .select('id');

  // Delete engineer
  await supabase.from('user_profiles').delete().eq('id', engineerId);

  return { success: true, reassignedCalls: updated?.length || 0 };
}
```

### 8.2 Stock Transfer to Deleted Engineer

#### 8.2.1 Scenario

A stock transfer is initiated, then the recipient engineer is deleted before acceptance.

#### 8.2.2 Handling Strategy

```typescript
// Run as a database trigger or scheduled job
async function cleanupOrphanedTransfers(): Promise<void> {
  // Find transfers to non-existent engineers
  const { data: orphanedTransfers } = await supabase
    .from('stock_transfer_log')
    .select(`
      id,
      device_id,
      to_location_id,
      from_location_id,
      engineer:to_location_id(id)
    `)
    .eq('status', 'pending')
    .is('engineer', null); // Engineer no longer exists

  for (const transfer of orphanedTransfers || []) {
    // Cancel transfer and return to source
    await supabase.from('stock_transfer_log').update({
      status: 'cancelled',
      metadata: {
        cancellation_reason: 'Recipient engineer deleted',
        cancelled_at: new Date().toISOString()
      }
    }).eq('id', transfer.id);

    // Return device to source location
    await returnDeviceToSource(transfer);
  }
}
```

### 8.3 Bulk Upload Partial Validation

#### 8.3.1 Scenario

Admin uploads a file with 100 rows, 80 valid and 20 invalid.

#### 8.3.2 Handling Strategy

**Transactional (All-or-Nothing):**

```typescript
async function bulkImportTransactional(
  rows: CallImportRow[]
): Promise<{ success: boolean; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  // Validate all rows first
  for (let i = 0; i < rows.length; i++) {
    const rowErrors = validateRow(rows[i]);
    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, errors: rowErrors });
    }
  }

  // If any errors, reject entire batch
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Import all rows in transaction
  const { error } = await supabase.rpc('bulk_import_calls', { calls: rows });

  return { success: !error, errors: [] };
}
```

**Partial Import (Recommended):**

```typescript
async function bulkImportPartial(
  rows: CallImportRow[]
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    totalRows: rows.length,
    imported: 0,
    duplicates: 0,
    errors: []
  };

  for (let i = 0; i < rows.length; i++) {
    // Validate row
    const rowErrors = validateRow(rows[i]);
    if (rowErrors.length > 0) {
      result.errors.push({ row: i + 1, type: 'validation', errors: rowErrors });
      continue;
    }

    // Check for duplicates
    const isDuplicate = await checkDuplicate(rows[i]);
    if (isDuplicate) {
      result.duplicates++;
      result.errors.push({ row: i + 1, type: 'duplicate', errors: ['Duplicate call detected'] });
      continue;
    }

    // Import row
    const { error } = await supabase.from('calls').insert(rows[i]);
    if (error) {
      result.errors.push({ row: i + 1, type: 'database', errors: [error.message] });
    } else {
      result.imported++;
    }
  }

  return result;
}
```

### 8.4 Coordinator Deletion with Managed Engineers

#### 8.4.1 Scenario

Admin attempts to delete a coordinator who has engineers assigned to them.

#### 8.4.2 Handling Strategy

```typescript
async function deleteCoordinator(
  coordinatorId: string,
  options: {
    reassignTo?: string;
    force?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  // Check for assigned engineers
  const { data: assignedEngineers } = await supabase
    .from('coordinator_assignments')
    .select('engineer_id')
    .eq('coordinator_id', coordinatorId)
    .eq('status', 'active');

  if (assignedEngineers && assignedEngineers.length > 0) {
    if (!options.reassignTo && !options.force) {
      return {
        success: false,
        error: `Cannot delete coordinator with ${assignedEngineers.length} assigned engineer(s). Specify reassignment target or use force delete.`
      };
    }

    if (options.reassignTo) {
      // Reassign engineers to new coordinator
      await supabase
        .from('coordinator_assignments')
        .update({
          coordinator_id: options.reassignTo,
          transfer_from: coordinatorId,
          transfer_to: options.reassignTo,
          status: 'transferred'
        })
        .eq('coordinator_id', coordinatorId)
        .eq('status', 'active');
    } else if (options.force) {
      // Deactivate assignments (engineers become unmanaged)
      await supabase
        .from('coordinator_assignments')
        .update({ status: 'inactive' })
        .eq('coordinator_id', coordinatorId)
        .eq('status', 'active');
    }
  }

  // Delete coordinator
  await supabase.from('user_profiles').delete().eq('id', coordinatorId);
  return { success: true };
}
```

### 8.5 Call Reassignment During Leave

#### 8.5.1 Scenario

An engineer marks themselves as on leave while having open calls assigned.

#### 8.5.2 Handling Strategy

```typescript
async function setEngineerOnLeave(
  engineerId: string,
  leaveStart: Date,
  leaveEnd: Date
): Promise<{ success: boolean; reassignmentRequired: boolean; openCalls: number }> {
  // Check for calls scheduled during leave period
  const { data: affectedCalls } = await supabase
    .from('calls')
    .select('id, call_number, scheduled_date')
    .eq('assigned_engineer', engineerId)
    .in('status', ['pending', 'assigned'])
    .gte('scheduled_date', leaveStart.toISOString())
    .lte('scheduled_date', leaveEnd.toISOString());

  if (affectedCalls && affectedCalls.length > 0) {
    // Option 1: Block leave request
    // return { success: false, reassignmentRequired: true, openCalls: affectedCalls.length };

    // Option 2: Allow leave but flag calls for reassignment
    await supabase
      .from('calls')
      .update({
        metadata: {
          reassignment_needed: true,
          original_engineer: engineerId,
          reassignment_reason: 'engineer_on_leave'
        }
      })
      .in('id', affectedCalls.map(c => c.id));

    // Create alert for coordinator
    await createAlert({
      type: 'call_reassignment_needed',
      title: 'Calls Need Reassignment',
      message: `${affectedCalls.length} calls need reassignment due to engineer leave`,
      metadata: { engineer_id: engineerId, call_ids: affectedCalls.map(c => c.id) }
    });
  }

  // Update engineer status
  await supabase
    .from('user_profiles')
    .update({ availability_status: 'on_leave' })
    .eq('id', engineerId);

  return {
    success: true,
    reassignmentRequired: (affectedCalls?.length || 0) > 0,
    openCalls: affectedCalls?.length || 0
  };
}
```

---

## 9. Dry Run Scenario Specification

### 9.1 Complete End-to-End Workflow Test

This scenario exercises all critical workflows from user creation through call completion.

#### 9.1.1 Phase 1: User Setup

**Step 1: Admin creates Coordinator**

```
Actor: Super Admin
Action: Create new coordinator account
Input:
  - Name: "Rajesh Coordinator"
  - Email: "rajesh.coord@uds.test"
  - Role: "coordinator" (NOTE: Currently not in system - using admin with scoped permissions)
  - Bank: "HDFC Bank"
  - Region: "Mumbai"
Expected Result:
  - Coordinator account created with status 'active'
  - Default permissions applied
  - Coordinator can log in
```

**Step 2: Admin assigns Engineers to Coordinator**

```
Actor: Admin
Action: Create 3 engineers and assign to coordinator
Engineers:
  1. Sunil Engineer - UDSPL1001 - Mumbai North
  2. Amit Engineer - UDSPL1002 - Mumbai South
  3. Priya Engineer - UDSPL1003 - Mumbai Central
Expected Result:
  - All 3 engineers in coordinator_assignments table
  - Coordinator can only see these 3 engineers
  - Coordinator cannot see other system engineers
```

**Step 3: Coordinator verifies scope**

```
Actor: Coordinator (Rajesh)
Action: Log in and view engineers
Expected Result:
  - Dashboard shows only 3 assigned engineers
  - No visibility to other engineers
  - Stock view limited to engineers' stock
  - Calls view limited to calls assigned to these engineers
```

#### 9.1.2 Phase 2: Call Import

**Step 4: Coordinator uploads call file**

```
Actor: Coordinator
Action: Bulk upload 10 calls
File Contents:
  Row 1: PPSINK001, Install, High, HDFC, Merchant A, Mumbai North
  Row 2: PPSINK002, Install, Medium, HDFC, Merchant B, Mumbai South
  Row 3: PPSINK003, Maintenance, Low, HDFC, Merchant C, Mumbai Central
  Row 4: PPSINK004, Install, Urgent, HDFC, Merchant D, Mumbai North
  Row 5: PPSINK005, Swap, High, HDFC, Merchant E, Mumbai South
  Row 6: PPSINK001, Install, High, HDFC, Merchant F, Mumbai Central  <- DUPLICATE
  Row 7: PPSINK006, Install, Medium, HDFC, Merchant G, Mumbai North
  Row 8: PPSINOLD1, Install, Low, HDFC, Merchant H, Mumbai South    <- CLOSED CALL
  Row 9: PPSINK007, Breakdown, Urgent, HDFC, Merchant I, Mumbai Central
  Row 10: PPSINK008, Deinstall, Low, HDFC, Merchant J, Mumbai North

Expected Result:
  - System detects 2 invalid rows:
    - Row 6: Duplicate of Row 1
    - Row 8: Matches closed call PPSINOLD1
  - Preview shows: 8 valid, 2 rejected
  - Import report: 8 imported, 2 skipped
```

#### 9.1.3 Phase 3: Automatic Assignment

**Step 5: System allocates calls**

```
Actor: System (automatic)
Action: Auto-assign 8 calls to 3 engineers
Algorithm Execution:
  - Engineer loads: Sunil=0, Amit=0, Priya=0
  - Sort calls by priority: URGENT, HIGH, MEDIUM, LOW

  Call PPSINK004 (Urgent, Mumbai North):
    - Sunil: proximity=95, workload=100, stock=80 → score=91.25
    - Amit: proximity=60, workload=100, stock=80 → score=78.50
    - Priya: proximity=70, workload=100, stock=80 → score=82.00
    → Assigned to Sunil (highest score)

  Call PPSINK007 (Urgent, Mumbai Central):
    - Sunil: proximity=70, workload=90, stock=80 → score=82.00 (updated load)
    - Amit: proximity=60, workload=100, stock=80 → score=78.50
    - Priya: proximity=95, workload=100, stock=80 → score=91.25
    → Assigned to Priya

  [Continue for remaining calls...]

Expected Distribution:
  - Sunil: 3 calls (higher density in North)
  - Amit: 2 calls (South area)
  - Priya: 3 calls (Central area)
```

#### 9.1.4 Phase 4: Stock Transfer

**Step 6: Coordinator initiates stock transfer**

```
Actor: Coordinator
Action: Transfer 5 devices to Sunil (who has 3 calls)
Devices:
  - PAX A920 x 2 (for installs)
  - FUJIAN ET389 x 3 (soundboxes)
Courier: BlueDart, Tracking: BD987654321

Expected Result:
  - Transfer created with status 'pending'
  - Devices show status 'in_transit'
  - Sunil receives notification
  - Stock decremented from warehouse (pending acceptance)
```

**Step 7: Engineer accepts stock**

```
Actor: Sunil Engineer
Action: Log in to mobile app, view notification, accept transfer
Process:
  1. Open app → See notification badge
  2. View transfer details:
     - From: Central Warehouse
     - Items: PAX A920 x 2, FUJIAN ET389 x 3
     - Courier: BlueDart BD987654321
  3. Tap "Accept"

Expected Result:
  - Transfer status → 'accepted'
  - Devices assigned to Sunil
  - Sunil's inventory shows 5 devices
  - Warehouse inventory decremented
  - Stock movement records created
```

#### 9.1.5 Phase 5: Call Execution

**Step 8: Engineer views and navigates to call**

```
Actor: Sunil Engineer
Action: View first assigned call, navigate to site
Call: PPSINK004 (Urgent Install)
Process:
  1. Open "Today's Calls" tab
  2. See 3 calls sorted by priority
  3. Tap PPSINK004 (Urgent)
  4. View details:
     - Merchant D
     - 123 Main St, Mumbai North
     - Install type
  5. Tap "Navigate" → Opens Google Maps

Expected Result:
  - Call details displayed correctly
  - Navigation launched with correct destination
```

**Step 9: Engineer starts call**

```
Actor: Sunil Engineer
Action: Arrive at site, start call
Process:
  1. Tap "Start Call"
  2. GPS captured: 19.0760, 72.8777
  3. Timestamp: 2025-12-12 10:30:00

Expected Result:
  - Call status → 'in_progress'
  - started_at populated
  - GPS logged in metadata
  - Call history entry created
```

**Step 10: Engineer captures photos**

```
Actor: Sunil Engineer
Action: Capture required photos
Photos:
  1. Before photo - Site condition before work
  2. Serial number - PAX A920 serial: F3601025A123456
  3. Installation - Device mounted and powered on

Expected Result:
  - 3 photos saved locally
  - Photos queued for upload
  - Upload progress shown
  - All photos uploaded successfully
```

**Step 11: Engineer completes call**

```
Actor: Sunil Engineer
Action: Mark call complete
Process:
  1. Tap "Complete Call"
  2. Select device consumed: PAX A920 (F3601025A123456)
  3. Enter resolution notes: "Installation completed successfully. Device tested and working."
  4. Submit completion

Expected Result:
  - Call status → 'completed'
  - completed_at populated
  - PAX A920 device status → 'installed'
  - Sunil's inventory: 4 devices (was 5)
  - call_stock_consumption record created
  - stock_movements record created
  - Coordinator notified
```

#### 9.1.6 Phase 6: Verification

**Step 12: Coordinator views updated stats**

```
Actor: Coordinator
Action: Check dashboard and reports
Expected:
  - Calls: 7 open, 1 completed
  - Stock: 4 devices with Sunil, warehouse decremented
  - Engineer stats: Sunil has 2 remaining calls
```

**Step 13: Admin views system-wide**

```
Actor: Admin
Action: View global dashboard
Expected:
  - Total calls processed correctly
  - Stock accounting accurate
  - No discrepancies in inventory
  - Audit trail complete
```

### 9.2 Verification Checklist

| Step | Verification Point | Pass Criteria |
|------|-------------------|---------------|
| 1 | Coordinator created | Account exists, can login |
| 2 | Engineers assigned | 3 records in coordinator_assignments |
| 3 | Scope enforced | Coordinator sees only 3 engineers |
| 4 | Bulk upload | 8 imported, 2 rejected correctly |
| 5 | Auto-assignment | All calls assigned, balanced distribution |
| 6 | Transfer initiated | Status 'pending', devices 'in_transit' |
| 7 | Transfer accepted | Inventory updated, movement logged |
| 8 | Call viewed | Correct details displayed |
| 9 | Call started | Status 'in_progress', GPS logged |
| 10 | Photos captured | 3 photos uploaded successfully |
| 11 | Call completed | Stock deducted, call closed |
| 12 | Coordinator stats | Accurate counts and status |
| 13 | Admin stats | No discrepancies, audit complete |

---

## 10. Appendices

### Appendix A: Status Code Reference

#### A.1 User Statuses

| Status | Description | Transitions To |
|--------|-------------|----------------|
| pending_approval | New registration awaiting admin approval | active, inactive |
| active | Approved and can use system | suspended, inactive |
| suspended | Temporarily disabled | active, inactive |
| inactive | Permanently disabled | None |

#### A.2 Device Statuses

| Status | Description | Transitions To |
|--------|-------------|----------------|
| warehouse | In central warehouse | issued, in_transit |
| in_transit | Being transferred | issued, warehouse |
| issued | Assigned to engineer | installed, warehouse, faulty |
| installed | Installed at merchant site | issued (if removed) |
| faulty | Marked as defective | warehouse (after repair) |
| returned | Returned from field | warehouse |

#### A.3 Call Statuses

| Status | Description | Transitions To |
|--------|-------------|----------------|
| pending | Created, awaiting assignment | assigned, cancelled |
| assigned | Assigned to engineer | in_progress, pending, cancelled |
| in_progress | Work being performed | completed, assigned, cancelled |
| completed | Successfully finished | None (terminal) |
| cancelled | Cancelled before completion | None (terminal) |

### Appendix B: Priority Definitions

| Priority | SLA Target | Visual Indicator | Use Case |
|----------|-----------|------------------|----------|
| urgent | 4 hours | Red badge | Critical system down |
| high | 24 hours | Orange badge | Important business impact |
| medium | 48 hours | Yellow badge | Standard service request |
| low | 72 hours | Green badge | Minor or scheduled work |

### Appendix C: Error Code Reference

| Code | Category | Description |
|------|----------|-------------|
| AUTH001 | Authentication | Invalid credentials |
| AUTH002 | Authentication | Session expired |
| AUTH003 | Authorization | Insufficient permissions |
| CALL001 | Call Management | Duplicate call detected |
| CALL002 | Call Management | Invalid status transition |
| CALL003 | Call Management | Missing required photos |
| STOCK001 | Stock Management | Insufficient inventory |
| STOCK002 | Stock Management | Transfer already accepted |
| STOCK003 | Stock Management | Device not found |
| USER001 | User Management | User not found |
| USER002 | User Management | Cannot delete with open items |
| VAL001 | Validation | Required field missing |
| VAL002 | Validation | Invalid format |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Next Review:** 2026-03-12
**Owner:** UDS Development Team
