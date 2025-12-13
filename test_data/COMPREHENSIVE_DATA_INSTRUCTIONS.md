# Comprehensive Test Data Loading Instructions

## Overview

This document provides instructions for loading the comprehensive test data into the UDS-POS database.

## Files in this Directory

| File | Purpose | Order |
|------|---------|-------|
| `01_reset_schema.sql` | Resets and creates schema | 1 (optional, for fresh start) |
| `02_base_test_data.sql` | Base users, banks, initial data | 2 |
| `03_reset_test_users.sql` | Reset test user passwords | 3 (if needed) |
| `comprehensive_test_data.sql` | Additional 20 devices, 15 calls | 4 |
| `production_data_cleaned.sql` | Production-realistic format data | Alternative to comprehensive |

## Loading Order

### Option A: Fresh Database Setup

1. Reset the schema (if needed):
```sql
-- Run in Supabase SQL Editor
\i test_data/01_reset_schema.sql
```

2. Load base test data:
```sql
\i test_data/02_base_test_data.sql
```

3. Load comprehensive test data (adds more data):
```sql
\i test_data/comprehensive_test_data.sql
```

### Option B: Adding to Existing Data

If you already have base data loaded:

```sql
\i test_data/comprehensive_test_data.sql
```

## What Gets Created

### comprehensive_test_data.sql

**New Engineers (2):**
| Employee ID | Name | Region | Email |
|-------------|------|--------|-------|
| UDSPL1400 | Sunil Kumar | UDS-PATNA | sunil.kumar@uds.test |
| UDSPL1401 | Rajesh Dey | UDS-SILIGURI | rajesh.dey@uds.test |

**New Devices (20):**
| Type | Count | Status Breakdown |
|------|-------|------------------|
| Soundbox (ET389) | 6 | 2 warehouse, 4 issued |
| Android POS (A910s/A920) | 6 | 2 warehouse, 3 issued, 1 faulty |
| Ingenico (IWL/ICT/MOVE) | 4 | 1 warehouse, 2 issued, 1 faulty |
| VeriFone (E285/Vx520) | 4 | 1 warehouse, 2 issued, 1 faulty |

**New Calls (15):**
| Status | Count | Types |
|--------|-------|-------|
| pending | 6 | 4 install, 2 breakdown |
| assigned | 5 | 3 install, 2 maintenance |
| in_progress | 3 | 2 install, 1 swap |
| completed | 1 | 1 install |

**New Merchants (via call metadata):**
1. SHREE GANESH KIRANA STORE - Patna
2. PATNA MEDICAL HALL - Patna
3. HIMALAYAN TEA STALL - Siliguri
4. SILIGURI ELECTRONICS - Siliguri
5. NALANDA SWEETS - Patna
6. DARJEELING TEA HOUSE - Siliguri
7. BIHAR STATE COOP BANK - Patna
8. HOTEL MAURYA - Patna
9. TENZING MART - Siliguri
10. NALANDA UNIVERSITY CANTEEN - Rajgir (completed)

**Stock Movements (14):**
- 11 issuance records (warehouse → issued)
- 2 faulty return records (issued → faulty)
- 1 installation record (issued → installed)

## UUID Conventions

This test data uses the following UUID patterns for easy identification:

| Entity Type | UUID Pattern | Example |
|------------|--------------|---------|
| Banks | `b0000001-0000-...` | b0000001-0000-0000-0000-000000000001 |
| Devices | `d1000XXX-0000-...` | d1000001-0000-0000-0000-000000000001 |
| Calls | `c1000XXX-0000-...` | c1000001-0000-0000-0000-000000000001 |
| Engineers | `e1400XXX-0000-...` | e1400001-0000-0000-0000-000000000001 |
| Stock Movements | `sm10000X-0000-...` | sm100001-0000-0000-0000-000000000001 |
| Call Devices | `cd10000X-0000-...` | cd100001-0000-0000-0000-000000000001 |

## Production-Realistic Formats

### TID Formats
- **Soundbox:** `SB######` (e.g., SB250001)
- **Android/One Device:** `OD######` (e.g., OD100001)
- **WBNW (West Bengal):** `WB######` (e.g., WB100001)
- **Breakdown:** `BR######` (e.g., BR100001)

### Call Number Formats
- **Installation:** `PPSINKOBR#######` (Bihar), `PPSINKOWB#######` (West Bengal)
- **Breakdown:** `FB#######`
- **Swap:** `SW#######`
- **Maintenance:** `RR#######`

### MID Formats
- 15-digit numbers: `022211900600001`

### Device Serial Number Formats
- **FUJIAN Soundbox:** `XGZ25012025#####`
- **PAX Android:** `F3601025A######`
- **Ingenico:** Model prefix + numbers
- **VeriFone:** `500-100-###`

## Test Account Credentials

After loading, these accounts can be used:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | super@uds.test | super123 |
| Admin | admin@uds.test | admin123 |
| Engineer (UDSPL1400) | sunil.kumar@uds.test | engineer123 |
| Engineer (UDSPL1401) | rajesh.dey@uds.test | engineer123 |

## Verification Queries

After loading, verify the data:

```sql
-- Count devices by status
SELECT status, COUNT(*) FROM devices GROUP BY status;

-- Count calls by status
SELECT status, COUNT(*) FROM calls GROUP BY status;

-- Count engineers
SELECT COUNT(*) FROM user_profiles WHERE role = 'engineer';

-- List assigned calls with engineer names
SELECT c.call_number, c.status, c.client_name, u.full_name as engineer
FROM calls c
LEFT JOIN user_profiles u ON c.assigned_engineer = u.id
WHERE c.status IN ('assigned', 'in_progress')
ORDER BY c.scheduled_date;

-- Check stock movements
SELECT COUNT(*) as movement_count, movement_type
FROM stock_movements
GROUP BY movement_type;
```

## Troubleshooting

### Foreign Key Errors
If you get foreign key constraint errors:
1. Ensure banks table has required entries
2. Ensure auth.users entries exist for engineers
3. Load data in correct order

### Duplicate Key Errors
The SQL uses `ON CONFLICT DO UPDATE` to handle re-runs. Duplicate errors should not occur unless there are UUID collisions.

### Stock Movement Errors
If `stock_movements` table has validation issues:
1. Check that `movement_type` is one of: `status_change`, `assignment`, `transfer`, `return`, `issuance`
2. Ensure `actor_id` references a valid user
3. Verify device_id exists in devices table

## Next Steps

After loading test data:
1. Start the development server: `npm run dev`
2. Login with test credentials
3. Navigate to Dashboard to see statistics
4. Check Calls page for new calls
5. Check Devices page for inventory
6. Test engineer view by logging in as engineer
