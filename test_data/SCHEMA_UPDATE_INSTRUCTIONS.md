# Schema Update for Business Logic - Instructions

## Overview

The `04_schema_update_business_logic.sql` script updates your UDS-POS database schema to properly support the POS field service management business flows. This document explains what was added, why, and how to apply the changes.

---

## What Was Added

### 1. User Profiles (Engineers) - Enhanced Employee Fields

| Column | Type | Purpose |
|--------|------|---------|
| `emp_id` | TEXT | Unique employee ID for HR/payroll integration |
| `alternate_phone` | TEXT | Secondary contact number |
| `home_address` | TEXT | Engineer's home address for route planning |
| `home_pincode` | TEXT | Pincode for regional assignment |
| `date_of_joining` | DATE | Employment start date |
| `emergency_contact_name` | TEXT | Emergency contact person |
| `emergency_contact_phone` | TEXT | Emergency contact number |
| `designation` | TEXT | Job title (Sr. Engineer, Team Lead, etc.) |

**Why needed:** Engineers need employee records for HR purposes, and home address helps with optimal territory assignment.

---

### 2. Merchants Table (NEW)

The **merchants** table is critical - this is where POS terminals are installed.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `mid` | TEXT | **Merchant ID (CRITICAL)** - Bank-assigned unique identifier |
| `merchant_name` | TEXT | Business owner name |
| `business_name` | TEXT | Shop/company name |
| `business_type` | TEXT | Category: retail, restaurant, hospital, etc. |
| `contact_person` | TEXT | Primary contact at merchant |
| `contact_phone` | TEXT | Main phone number |
| `merchant_address` | TEXT | Installation address |
| `pincode` | TEXT | For regional routing |
| `city` | TEXT | City name |
| `latitude/longitude` | NUMERIC | GPS coordinates for distance calculations |
| `bank_id` | UUID | Which bank this merchant belongs to |
| `status` | TEXT | active, inactive, suspended, churned |
| `total_devices_installed` | INTEGER | Count of POS terminals at location |

**Why needed:** Every service call is to a merchant location identified by MID. The app needs to track merchants separately from one-off call addresses.

---

### 3. Devices Table - Enhanced Tracking

#### Terminal Identification
| Column | Purpose |
|--------|---------|
| `tid` | **Terminal ID (CRITICAL)** - Unique identifier assigned when installed |
| `identification_number` | Hardware identification |
| `make` | Manufacturer (Ingenico, Verifone, PAX) |

#### Location Tracking
| Column | Purpose |
|--------|---------|
| `current_location_type` | Where is the device now: warehouse, engineer, merchant, courier, etc. |
| `current_location_id` | UUID of the current location |
| `current_location_name` | Human-readable location name |
| `device_condition` | new, good, fair, faulty, damaged, under_repair, scrapped |

#### Merchant/Installation
| Column | Purpose |
|--------|---------|
| `merchant_id` | Link to merchants table |
| `installed_at_mid` | MID where currently installed |
| `installation_tid` | TID assigned at installation |
| `used_date` | When put into service |

#### Receipt/Return Chain
| Column | Purpose |
|--------|---------|
| `received_from_type/id/name` | Who gave this device to current holder |
| `returned_to_type/id/name` | Who this device was returned to |
| `consignment_number/date` | Shipping tracking info |
| `courier_id` | Which courier company |

#### Fault Tracking
| Column | Purpose |
|--------|---------|
| `error_type` | Category of fault |
| `fault_description` | Detailed problem description |
| `fault_reported_date/by` | When and who reported |

**Why needed:** The complete chain of custody must be tracked: Warehouse → Engineer → Merchant → Engineer → Courier → Warehouse. TID is the key identifier used in field operations.

---

### 4. Calls Table - Service Ticket Enhancements

| Column | Purpose |
|--------|---------|
| `merchant_id` | Link to merchants table |
| `mid` | Merchant ID being serviced |
| `tid` | Terminal ID being serviced |
| `device_id` | Link to devices table |
| `auto_allocated` | Was this assigned by system? |
| `allocation_reason` | Why this engineer was chosen |
| `distance_to_merchant` | Distance from engineer to merchant |
| `call_source` | manual, api, import, auto |
| `sla_deadline` | When must this be completed |
| `sla_breached` | Has deadline passed? |
| `escalation_level` | 0, 1, 2, 3 escalation |
| `escalated_to` | Manager handling escalation |

**Why needed:** Every call is about a specific merchant (MID) and often a specific terminal (TID). Auto-allocation and SLA tracking are core requirements.

---

### 5. Stock Movements - Complete Chain Tracking

| Column | Purpose |
|--------|---------|
| `from_location_type/id/name` | Source of movement |
| `to_location_type/id/name` | Destination of movement |
| `consignment_number` | Shipping reference |
| `courier_id/name` | Courier details |
| `requires_approval` | Needs manager sign-off? |
| `approved_by/at` | Approval record |
| `tid/mid/merchant_id` | Reference identifiers |

**Why needed:** Every device movement must be logged with complete source/destination information for audit trail.

---

### 6. Database Views

| View | Purpose |
|------|---------|
| `v_devices_full` | Complete device info with bank, merchant, warehouse, engineer joins + ageing calculation |
| `v_calls_full` | Complete call info with merchant, engineer, bank, device details |
| `v_engineer_workload` | Summary of each engineer's current workload |
| `v_warehouse_stock` | Stock count by warehouse, model, and condition |

**Why needed:** Frontend dashboards need aggregated data without multiple API calls.

---

### 7. Functions

#### `calculate_distance_km(lat1, lon1, lat2, lon2)`
Calculates distance between two GPS coordinates using Haversine formula.

#### `find_nearest_engineers(latitude, longitude, bank_id, max_distance, limit)`
Returns engineers sorted by distance from a given location, filtered by bank and availability.

#### `auto_allocate_call(call_id)`
Automatically assigns a pending call to the nearest available engineer.

**Why needed:** Auto-allocation is a core requirement - system should suggest/assign nearest engineer based on GPS.

---

## Business Flow Support

### Flow 1: New Device Receipt
```
Warehouse receives devices from vendor
→ Create device records with status='warehouse', current_location_type='warehouse'
→ Log stock_movement with movement_type='receipt_from_vendor'
```

### Flow 2: Device Issue to Engineer
```
Admin issues device to engineer
→ Update device: assigned_to=engineer, current_location_type='engineer'
→ Log stock_movement: from_location=warehouse, to_location=engineer
```

### Flow 3: Installation at Merchant
```
Engineer installs at merchant
→ Update device: merchant_id, installed_at_mid, tid, status='installed'
→ Log stock_movement: from=engineer, to=merchant
→ Update call: completed_at, resolution_notes
```

### Flow 4: Swap/Replacement
```
Engineer swaps faulty device
→ Old device: status='faulty', current_location_type='engineer'
→ New device: status='installed', merchant_id set
→ Log 2 stock_movements
→ Update call with both device references
```

### Flow 5: Device Return to Warehouse
```
Engineer returns device via courier
→ Update device: status='in_transit', current_location_type='courier'
→ Log stock_movement with courier details
→ When received: status='warehouse', location_type='warehouse'
```

### Flow 6: Auto-Allocation
```
New call created with merchant location
→ System calls find_nearest_engineers()
→ Assigns to nearest available
→ Sets auto_allocated=true, records distance
```

---

## How to Apply

### Step 1: Backup (Recommended)
```sql
-- In Supabase SQL Editor
SELECT * FROM devices INTO TEMPORARY devices_backup;
SELECT * FROM calls INTO TEMPORARY calls_backup;
SELECT * FROM user_profiles INTO TEMPORARY profiles_backup;
```

### Step 2: Run the Script
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `04_schema_update_business_logic.sql`
3. Paste and click "Run"
4. Verify output shows "Schema update completed!"

### Step 3: Verify
```sql
-- Check new columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'devices' AND column_name = 'tid';

-- Check merchants table exists
SELECT COUNT(*) FROM merchants;

-- Check views work
SELECT * FROM v_engineer_workload LIMIT 5;

-- Test distance function
SELECT calculate_distance_km(28.6139, 77.2090, 19.0760, 72.8777);
-- Should return ~1153.42 (Delhi to Mumbai distance)
```

---

## Migration Considerations

### Existing Data
- All ALTER TABLE statements use `IF NOT EXISTS` - safe to run multiple times
- Existing device records will have NULL for new columns initially
- Existing calls will have NULL for mid/tid/merchant_id

### Data Population
After schema update, you'll need to:
1. Create merchant records with MIDs
2. Update existing devices with TIDs and merchant links
3. Update existing calls with merchant references

### Application Changes Needed
The frontend will need updates to:
1. Show/edit TID and MID fields
2. Use new views for dashboards
3. Implement auto-allocation UI
4. Add merchant management screens

### Performance
New indexes are created for:
- `tid` on devices and calls
- `mid` on calls and merchants
- `merchant_id` on devices and calls
- Location-based queries on stock_movements

---

## Files in test_data/

| File | Purpose | Run Order |
|------|---------|-----------|
| `01_clean_schema_setup.sql` | Base schema (tables, indexes, RLS) | 1st |
| `02_minimal_test_data.sql` | Sample data using existing auth users | 2nd |
| `03_reset_test_users.sql` | Create new test users with password Test@123 | Optional |
| `04_schema_update_business_logic.sql` | Business logic enhancements | After base schema |
| `SCHEMA_UPDATE_INSTRUCTIONS.md` | This documentation | N/A |

---

## Quick Reference

### Key Identifiers
- **MID** (Merchant ID): Bank-assigned merchant identifier (e.g., "MID12345")
- **TID** (Terminal ID): Unique terminal identifier assigned at installation (e.g., "TID00001")
- **Serial Number**: Hardware serial number on device
- **Call Number**: Service ticket reference (e.g., "CALL-2024-0001")

### Device Status Flow
```
warehouse → issued_to_engineer → installed → faulty/maintenance →
returned_to_warehouse/in_transit → warehouse (repaired) → issued_to_engineer → ...
```

### Call Status Flow
```
pending → assigned → in_progress → completed
                  → cancelled
                  → escalated
```

### Location Types
- `warehouse` - Central/regional warehouse
- `engineer` - With field engineer
- `merchant` - Installed at merchant location
- `courier` - In transit with courier
- `service_center` - At repair center
- `in_transit` - Between locations
