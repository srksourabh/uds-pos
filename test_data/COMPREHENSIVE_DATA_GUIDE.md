# Comprehensive Test Data Guide

**Version:** 2.0
**Date:** 2025-12-12
**File:** `test_data/comprehensive_test_data.sql`

---

## Overview

This guide documents the comprehensive test data created for the UDS-POS application. The data is designed to enable realistic testing of all application features including dashboards, call management, device tracking, stock management, and reporting.

---

## Data Summary

### Entity Counts (After Loading)

| Entity | Count | Notes |
|--------|-------|-------|
| **Banks** | 5 | HDFC, ICICI, AXIS, SBI, Kotak |
| **Warehouses** | 4 | Delhi, Mumbai, Bangalore, Kolkata |
| **Engineers** | 6 | 2 existing + 4 new across regions |
| **Admin Users** | 1-2 | From minimal data |
| **Devices Total** | 25 | 5 from minimal + 20 comprehensive |
| **Devices (Warehouse)** | 13 | Ready for issuance |
| **Devices (Issued)** | 7 | Held by engineers |
| **Devices (Installed)** | 3 | At merchant locations |
| **Devices (Faulty)** | 2 | Returned for repair |
| **Calls Total** | 18 | 3 from minimal + 15 comprehensive |
| **Calls (Pending)** | 6 | Awaiting assignment |
| **Calls (Assigned)** | 5 | Assigned, not started |
| **Calls (In Progress)** | 3 | Engineer on site |
| **Calls (Completed)** | 4 | Historical data |
| **Stock Movements** | 10 | Issuances, installations, returns |
| **Call History** | 9 | Status transition records |
| **Stock Alerts** | 3 | Low stock and faulty rate alerts |

---

## Banks and Warehouses

### Banks

| Code | Name | Region | Contact |
|------|------|--------|---------|
| HDFC | HDFC Bank | Pan India | amit.sharma@hdfc.com |
| ICICI | ICICI Bank | Pan India | neha.verma@icici.com |
| AXIS | Axis Bank | Pan India | raj.patel@axisbank.com |
| SBI | State Bank of India | Pan India | manoj.kumar@sbi.co.in |
| KOTAK | Kotak Mahindra Bank | Metro Cities | preeti.sharma@kotak.com |

### Warehouses

| Code | Name | Location | Manager |
|------|------|----------|---------|
| WH-DEL | Delhi Warehouse | Nehru Place, Delhi | Vikram Singh |
| WH-MUM | Mumbai Warehouse | Andheri East, Mumbai | Ajay Patil |
| WH-BLR | Bangalore Warehouse | Electronic City, Bangalore | Venkat Rao |
| WH-KOL | Kolkata Warehouse | Salt Lake, Kolkata | Subhas Mondal |

---

## Engineers

### Existing Engineers (from minimal data)

| Name | Email | Region | Bank | Employee ID |
|------|-------|--------|------|-------------|
| Rajesh Kumar | rajesh.kumar@uds.test | North | HDFC | N/A |
| Priya Singh | priya.singh@uds.test | West | ICICI | N/A |

### New Engineers (from comprehensive data)

| Name | Email | Region | Bank | Employee ID | Location |
|------|-------|--------|------|-------------|----------|
| Amit Verma | amit.verma@uds.test | North | HDFC | UDSPL1400 | Delhi |
| Sunita Devi | sunita.devi@uds.test | West | ICICI | UDSPL1401 | Mumbai |
| Ravi Shankar | ravi.shankar@uds.test | South | AXIS | UDSPL1402 | Bangalore |
| Mohan Das | mohan.das@uds.test | East | SBI | UDSPL1403 | Kolkata |

---

## Devices

### Device Distribution by Status

| Status | Count | Description |
|--------|-------|-------------|
| Warehouse | 13 | Available stock across 4 warehouses |
| Issued | 7 | Assigned to engineers for field work |
| Installed | 3 | Active at merchant locations |
| Faulty | 2 | Returned for repair |

### Device Models and TID Formats

| Brand | Model | TID Format | Banks |
|-------|-------|------------|-------|
| Ingenico | iCT250 | SB###### | HDFC, ICICI |
| VeriFone | VX520 | SB###### | HDFC, ICICI |
| FUJIAN | ET389-WIFI | OD###### | AXIS, SBI |
| FUJIAN | ET389-WIFI | WB###### | KOTAK |

### Serial Number Format

`{BRAND}-{YEAR}-{SEQ}`
Examples: `ING-2024-006`, `VRF-2024-010`, `FUJ-2024-015`

### MID Format

15-digit format: `022211900519###`
Example: `022211900519450`

---

## Calls

### Call Distribution by Status

| Status | Count | Description |
|--------|-------|-------------|
| Pending | 6 | Unassigned, awaiting engineer assignment |
| Assigned | 5 | Assigned to engineer, work not started |
| In Progress | 3 | Engineer on site, work in progress |
| Completed | 4 | Historical completed calls |

### Call Types

| Type | Description | Priority Range |
|------|-------------|----------------|
| install | New POS terminal installation | medium to high |
| swap | Device replacement | low to high |
| maintenance | Routine/scheduled maintenance | low to medium |
| breakdown | Urgent repair needed | medium to urgent |
| deinstall | Device removal | medium to high |

### Call Number Format

`CALL-{YEAR}-{SEQ}`
Examples: `CALL-2024-0001`, `CALL-2024-0018`

---

## Test Scenarios Enabled

### 1. Dashboard Testing

**Stats Cards:**
- Total devices: 25
- Warehouse stock: 13
- Issued devices: 7
- Installed devices: 3
- Faulty devices: 2
- Total engineers: 6
- Active calls: 14

**Charts:**
- Device distribution by bank (5 banks)
- Call status distribution (4 statuses)
- Device status pie chart

**Map View:**
- Engineers with location data across 4 cities
- Calls with coordinates across India

### 2. Call Management Testing

**Call Lifecycle:**
1. Create new call → status: pending
2. Assign to engineer → status: assigned
3. Engineer starts work → status: in_progress
4. Complete work → status: completed

**Test Scenarios:**
- View pending calls awaiting assignment
- Assign calls to engineers
- Track in-progress work
- Review completed call history
- Filter by status, priority, type, bank
- View call history showing status transitions

### 3. Stock Management Testing

**Inventory Operations:**
- Issue device to engineer (warehouse → issued)
- Track device installation (issued → installed)
- Mark device faulty (issued → faulty)
- Return faulty device (faulty → warehouse)

**Test Scenarios:**
- View warehouse stock by location
- Track devices held by each engineer
- Monitor installed devices at merchants
- Review faulty device queue
- View stock movement history

### 4. Device Tracking Testing

**Device Lifecycle:**
```
warehouse → issued → installed → [faulty → warehouse]
```

**Test Scenarios:**
- Search devices by serial number
- Filter by bank, status, warehouse
- View device assignment history
- Track installation location and date
- Review device metadata (TID, brand, MID)

### 5. Engineer Management Testing

**Test Scenarios:**
- View engineer list with bank assignments
- Check devices held by each engineer
- Monitor active calls per engineer
- Review engineer performance metrics
- Filter by region (North, South, East, West)

### 6. Reports and Analytics Testing

**Available Data:**
- Call completion rates (62-66%)
- Average resolution times (40-65 minutes)
- Devices installed/swapped per engineer
- Calls by type and priority distribution

**Test Scenarios:**
- Generate reports filtered by bank
- View engineer performance aggregates
- Analyze call type distribution
- Review stock movement reports

---

## How to Load the Data

### Prerequisites

1. Minimal test data must be loaded first (creates base users, banks, warehouses)
2. Valid Supabase connection credentials

### Loading Steps

**Option 1: Supabase SQL Editor**
```sql
-- Step 1: Load minimal data (if not already loaded)
-- Copy contents of MINIMAL_TEST_DATA.sql and execute

-- Step 2: Load comprehensive data
-- Copy contents of comprehensive_test_data.sql and execute
```

**Option 2: Command Line (psql)**
```bash
# Navigate to project directory
cd uds-pos

# Load minimal data first
psql $DATABASE_URL -f test_data/MINIMAL_TEST_DATA.sql

# Load comprehensive data
psql $DATABASE_URL -f test_data/comprehensive_test_data.sql
```

---

## Verification Steps

### 1. Check Entity Counts

Run the verification queries at the end of the SQL file to see counts:

```sql
-- Expected output:
-- Banks: 5
-- Warehouses: 4
-- Engineers: 6
-- Devices (Total): 25
-- Calls (Total): 18
```

### 2. Verify Dashboard

1. Start dev server: `npm run dev`
2. Login with real Supabase credentials: `admin@uds.test` / `admin123`
3. Navigate to Dashboard
4. Verify:
   - Stat cards show non-zero counts
   - Charts render with data
   - Map shows engineer and call markers

### 3. Verify Calls Page

1. Navigate to `/calls`
2. Verify:
   - All 18 calls appear in list
   - Status badges show correct colors
   - Bank names display correctly
   - Engineer names show for assigned calls
   - "View Details" navigates to call detail

### 4. Verify Stock Page

1. Navigate to `/stock`
2. Verify:
   - Bank dropdown shows all 5 banks
   - Status filter works
   - Device list shows correct counts
   - Bank codes display in table

### 5. Verify Engineers Page

1. Navigate to `/engineers`
2. Verify:
   - All 6 engineers listed
   - Bank assignments show correctly
   - Regional distribution visible

---

## Troubleshooting

### Issue: Dashboard shows zero counts

**Cause:** Using test accounts (admin/admin) instead of real Supabase auth

**Solution:** Login with `admin@uds.test` / `admin123` (requires user in Supabase Auth)

See `DASHBOARD_REPAIR_REPORT.md` for details.

### Issue: Foreign key constraint errors

**Cause:** Minimal data not loaded first

**Solution:** Load `MINIMAL_TEST_DATA.sql` before comprehensive data

### Issue: Duplicate key errors

**Cause:** Data already loaded

**Solution:** Safe to ignore - SQL uses `ON CONFLICT DO NOTHING`

### Issue: Dropdowns empty

**Cause:** useEffect data loading issues (now fixed)

**Solution:** Ensure you have latest code with Bug Fix Report changes

---

## UUID Reference

### Entity UUID Patterns

| Entity | Pattern | Example |
|--------|---------|---------|
| Banks | `########-####-####-####-############` | `11111111-1111-1111-1111-111111111111` |
| Warehouses | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` |
| Devices | `d0######-####-####-####-############` | `d0060006-0006-0006-0006-000000000006` |
| Calls | `c0######-####-####-####-############` | `c0040004-0004-0004-0004-000000000004` |
| Engineers | `e0######-####-####-####-############` | `e0030003-0003-0003-0003-000000000003` |
| Call History | `ch######-####-####-####-############` | `ch010001-0001-0001-0001-000000000001` |
| Stock Movements | `st######-####-####-####-############` | `st010001-0001-0001-0001-000000000001` |

---

## Data Relationships

```
banks ─────────────────────────────────────────┐
   │                                           │
   ├──► user_profiles (engineers via bank_id)  │
   │         │                                 │
   │         └──► calls (via assigned_engineer)│
   │                   │                       │
   │                   └──► call_devices ◄─────┼──► devices
   │                           │               │        │
   │                           └──► call_history       │
   │                                            │       │
   └──► devices (via device_bank) ◄────────────┘       │
            │                                          │
            └──► stock_movements ◄─────────────────────┘

warehouses ──► devices (via metadata.warehouse)
```

---

## Related Documentation

- `MINIMAL_TEST_DATA.sql` - Base test data (run first)
- `DASHBOARD_REPAIR_REPORT.md` - Dashboard zero counts troubleshooting
- `BUG_FIX_REPORT.md` - Frontend bug fixes documentation
- `FRONTEND_AUDIT_CHECKLIST.md` - UI verification checklist

---

**Document Generated:** 2025-12-12
**Author:** Claude Code
