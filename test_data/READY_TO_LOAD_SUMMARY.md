# Ready to Load Summary - UDS POS Test Data

## Quick Assessment

| Item | Status | Notes |
|------|--------|-------|
| Test Data Production-Realistic? | **YES** | Matches exact production formats |
| Schema Changes Required? | **YES** | Uses metadata JSONB workaround |
| Can Load Now? | **YES** | Works with current schema |

---

## 1. Schema Changes Analysis

### Current Approach: JSONB Metadata (No Schema Changes Needed)

The test data uses the existing `metadata JSONB` column to store production fields without requiring schema changes:

```sql
-- Example: Employee ID stored in metadata
metadata = '{"emp_id": "UDSPL1191", "designation": "Field Engineer", ...}'

-- Example: MID/TID stored in call metadata
metadata = '{"mid": "022211900519443", "tid": "SB223535", ...}'
```

### Future Schema Changes (Recommended for Performance)

If you want dedicated columns instead of JSONB, these changes are documented in `SCHEMA_GAP_ANALYSIS.md`:

**Priority 1 - Critical (12 columns):**
| Table | Columns to Add |
|-------|---------------|
| `user_profiles` | `emp_id`, `designation`, `city`, `state`, `pin_code` |
| `calls` | `mid`, `tid`, `fsp_sub_region`, `device_type`, `sub_status`, `visit_count` |
| `devices` | `brand`, `part_category` |

**Priority 2 - Enum Changes:**
```sql
ALTER TYPE call_type ADD VALUE IF NOT EXISTS 'paper_roll';
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'call_accepted';
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'site_ready';
```

**Priority 3 - New Tables:**
- `merchants` table (MID-based merchant tracking)
- `terminals` table (TID-based terminal tracking)

---

## 2. Test Data Verification - PRODUCTION REALISTIC ✓

### Employee IDs ✓
```
Format: UDSPL + 4 digits
Examples in test data:
- UDSPL1191 (Mukesh Sahoo - Bhubaneswar)
- UDSPL1218 (Hemanta Pramanik - Kolkata)
- UDSPL1326 (Tankeshwar Sahu - Guwahati)
- UDSPL1195 (Prabin Kumar Munda - Rourkela)
- UDSPL1373 (Brahmdeo Mahto - Ranchi)
```

### MIDs (Merchant IDs) ✓
```
Format: 15 digits starting with 022
Examples in test data:
- 022211900519443
- 022211900554112
- 022211900508875
- 022000000280328
- 022211000532634
```

### TIDs (Terminal IDs) ✓
```
Format: State/Type prefix + 6 digits
Examples in test data:
- SB223535, SB133415 (Soundbox)
- OD046294, OD083601 (Odisha)
- WB032097, WB076374 (West Bengal)
- AS046375, AS066140 (Assam)
- AR034547 (Arunachal Pradesh)
```

### Device Brands ✓
```
Brands in test data:
- FUJIAN (Soundbox ET389)
- PAX (Android A910s)
- Ingenico (IWL220, ICT220, MOVE-2500)
- VeriFone (E285, Vx-520)
- SunMI (SR600 Mini DQR)
```

### Serial Number Formats ✓
```
Vendor-specific formats:
- FUJIAN: XQZ2111202400894, XGZ1909202518443
- PAX: F3601014A808511, 2841650783
- Ingenico: 13364WL21273323, 14103CT21749159
- VeriFone: 401-552-061, 286-869-256
```

### Call Number Patterns ✓
```
Installation: PPSINKOOR0073220, PPSINKOWB0046419, PPSINKOAS0061510
Breakdown: FB2560445, FB2560438
Paper Roll: RR1210953, RR1210937
```

---

## 3. Step-by-Step Loading Instructions

### Option A: Load Test Data Only (Recommended)

```bash
# 1. Connect to Supabase
npx supabase db connect

# 2. Load production-realistic test data
psql -f test_data/production_realistic_test_data.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `test_data/production_realistic_test_data.sql`
3. Run the query

### Option B: Full Reset with Test Data

```bash
# 1. Reset schema (WARNING: deletes all data)
psql -f test_data/01_clean_schema_setup.sql

# 2. Load production-realistic test data
psql -f test_data/production_realistic_test_data.sql
```

### Option C: Apply Schema Changes First

```bash
# 1. Apply schema updates (adds new columns)
psql -f test_data/04_schema_update_business_logic.sql

# 2. Load test data
psql -f test_data/production_realistic_test_data.sql
```

---

## 4. What to Verify After Loading

### Quick Verification Queries

```sql
-- 1. Check engineers loaded with correct emp_id format
SELECT
  full_name,
  metadata->>'emp_id' as emp_id,
  region
FROM user_profiles
WHERE role = 'engineer';
-- Expected: 5 engineers with UDSPL#### format

-- 2. Check devices with brand info
SELECT
  serial_number,
  model,
  metadata->>'brand' as brand,
  metadata->>'tid' as tid,
  status
FROM devices
LIMIT 10;
-- Expected: FUJIAN, PAX, Ingenico, VeriFone brands

-- 3. Check calls with MID/TID
SELECT
  call_number,
  type,
  status,
  metadata->>'mid' as mid,
  metadata->>'tid' as tid
FROM calls
ORDER BY created_at DESC
LIMIT 10;
-- Expected: 15-digit MIDs, SB/OD/WB/AS/AR TIDs

-- 4. Count summary
SELECT
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'engineer') as engineers,
  (SELECT COUNT(*) FROM devices) as devices,
  (SELECT COUNT(*) FROM calls) as calls,
  (SELECT COUNT(*) FROM calls WHERE status = 'pending') as pending_calls,
  (SELECT COUNT(*) FROM calls WHERE status = 'in_progress') as in_progress_calls,
  (SELECT COUNT(*) FROM calls WHERE status = 'completed') as completed_calls;
-- Expected: 5 engineers, 30 devices, 20 calls (8 pending, 7 in_progress, 5 completed)
```

### Expected Results

| Entity | Count | Key Fields |
|--------|-------|------------|
| Engineers | 5 | emp_id: UDSPL1191, 1218, 1326, 1195, 1373 |
| Devices | 30 | Brands: FUJIAN, PAX, Ingenico, VeriFone |
| Calls (Pending) | 8 | Types: install, breakdown, maintenance |
| Calls (In Progress) | 7 | All with assigned engineers |
| Calls (Completed) | 5 | With resolution notes, ratings |

### UI Verification Checklist

- [ ] Admin Dashboard shows 5 engineers
- [ ] Device inventory shows 30 devices with brands
- [ ] Pending calls list shows 8 calls
- [ ] Call details show MID/TID in metadata
- [ ] Engineer profiles show employee IDs
- [ ] Stock movements show device lifecycle

---

## 5. Files Reference

| File | Purpose |
|------|---------|
| `production_realistic_test_data.sql` | **Load this** - Main test data file |
| `SCHEMA_GAP_ANALYSIS.md` | Schema changes if you want dedicated columns |
| `REAL_DATA_ANALYSIS.md` | Documentation of production data patterns |
| `REAL_TO_SCHEMA_MAPPING.md` | Column mapping reference |
| `PRODUCTION_REPORT_QUERIES.sql` | SQL views for production-style reports |

---

## Summary

**The test data is PRODUCTION-READY and can be loaded immediately.**

- Uses exact production formats (UDSPL IDs, 15-digit MIDs, SB/OD/WB TIDs)
- Works with current schema via JSONB metadata
- Includes 5 engineers, 30 devices, 20 calls across all statuses
- Covers all regions: Bhubaneswar, Kolkata, Guwahati, Rourkela, Ranchi
- Includes all device brands: FUJIAN, PAX, Ingenico, VeriFone, SunMI
