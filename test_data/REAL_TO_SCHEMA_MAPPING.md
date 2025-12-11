# Real Data to Database Schema Mapping

This document maps each column from the real production data files to the corresponding database columns.

---

## 1. FSE Details → user_profiles

| Real Data Column | Database Column | Data Type | Notes |
|-----------------|-----------------|-----------|-------|
| Employee ID | `emp_id` | VARCHAR(20) | NEW - "UDSPL1384" format |
| Employee Full Name | `full_name` | VARCHAR(100) | Direct mapping |
| Status | `status` | user_status enum | "Active" → 'active', "Deactive" → 'inactive' |
| Mobile Number | `phone` | VARCHAR(20) | 10-digit Indian format |
| Relative Mobile Number | `alternate_phone` | VARCHAR(20) | NEW - Emergency contact |
| Personal Email Address | `email` | VARCHAR(100) | Direct mapping |
| Region | `region` | VARCHAR(50) | "UDS-BHUBANESWAR", etc. |
| Coordinator Name | `coordinator_id` | UUID FK | NEW - References user_profiles |
| Designation | `designation` | VARCHAR(100) | NEW - "Field Engineer", etc. |
| Address | `address` | TEXT | NEW - Full address |
| Location | `locality` | VARCHAR(100) | NEW - Area name |
| City/District | `city` | VARCHAR(100) | NEW |
| State | `state` | VARCHAR(50) | NEW - Full state name |
| Pin | `pin_code` | VARCHAR(10) | NEW - 6-digit PIN |
| Joining Date | `joining_date` | DATE | NEW |
| Lat | `last_location_lat` | DECIMAL | Existing - parse from string |
| Long | `last_location_lng` | DECIMAL | Existing - parse from string |
| Cover Location/City/District | `coverage_areas` | TEXT[] | NEW - Array of areas |

### Status Value Mapping:
```
"Active"   → 'active'
"Deactive" → 'inactive'
```

### Region Value Mapping:
| Real Data Region | Sub-Region |
|-----------------|------------|
| UDS-BHUBANESWAR | Bhubaneswar |
| UDS-GUWAHATI | Guwahati |
| UDS-KOLKATA (S) | Kolkata South |
| UDS-KOLKATA (R) | Kolkata Regional |
| UDS-ANDAMAN | Andaman |
| UDS-RANCHI | Ranchi |
| UDS-ROURKELA | Rourkela |

---

## 2. Pending Calls → calls table

| Real Data Column | Database Column | Data Type | Notes |
|-----------------|-----------------|-----------|-------|
| Call Ticket No | `call_number` | VARCHAR(20) | Direct - "PPSINKOOR0073220" |
| Call Type | `type` | call_type enum | Mapped (see below) |
| Request Date | `created_at` | TIMESTAMP | Parse "29/11/2025 14:35" format |
| Merchant Name | `client_name` | VARCHAR(200) | Direct mapping |
| MID | `mid` | VARCHAR(20) | NEW - "022211900519443" |
| TID | `tid` | VARCHAR(20) | NEW - "SB223535" |
| Institution | `client_bank` | UUID FK | Lookup bank by name |
| Location | Part of `client_address` | TEXT | Combined address |
| City | Part of `client_address` | TEXT | Combined |
| StateCode | Part of `client_address` | TEXT | "OD", "WB", etc. |
| Contactaddress | `client_address` | TEXT | Full address |
| ContactZip | Part of `client_address` | TEXT | PIN code |
| Contactname | `client_contact` | VARCHAR(100) | Contact person |
| TelephoneNo | `client_phone` | VARCHAR(20) | |
| MobileNo | `client_phone` | VARCHAR(20) | Prefer mobile |
| Status | `status` | call_status enum | Mapped (see below) |
| Sub Status | `sub_status` | VARCHAR(50) | NEW |
| No Of Visit | `visit_count` | INTEGER | NEW |
| Ageing | Calculated | - | `NOW() - created_at` |
| Ageing Band | Calculated | - | Based on ageing |
| Tentative Date | `tentative_date` | TIMESTAMP | NEW |
| Part No | `device_model` | VARCHAR(50) | NEW - "ET389-WIFI" |
| Old Model | `old_model` | VARCHAR(50) | NEW |
| New Model | `new_model` | VARCHAR(50) | NEW |
| Action Taken | `last_action` | TEXT | NEW |
| Requested ConType | `device_type` | VARCHAR(50) | NEW - "SOUNDBOX", "Android" |
| GoolgedDistance | `googled_distance` | DECIMAL | NEW |
| Alias Name | Lookup | - | Use to find coordinator |
| FSP SubRegion | `fsp_sub_region` | VARCHAR(50) | NEW |
| Lat | `latitude` | DECIMAL | |
| Long | `longitude` | DECIMAL | |
| Allocated Engineer | `assigned_engineer` | UUID FK | Lookup by name |
| Completed Date | `completed_at` | TIMESTAMP | |
| Start Date | `started_at` | TIMESTAMP | |

### Call Type Mapping:
```
"Installation"    → 'install'
"Break Down"      → 'breakdown'
"De-Installation" → 'deinstall'
"Asset Swap"      → 'swap'
"Paper Roll"      → 'paper_roll' (NEW enum value)
```

### Call Status Mapping:
```
"Call Allocated"              → 'assigned'
"Pending for Activity"        → 'pending'
"CallAccepted"               → 'assigned' (or new 'call_accepted')
"Site Ready"                 → 'pending' (with sub_status)
"Site Ready for De-installation" → 'pending' (with sub_status)
"Work in Progress"           → 'in_progress'
"Completed"                  → 'completed'
"Pending for Unit"           → 'pending' (with sub_status)
"Pending for MMS Updation"   → 'pending' (with sub_status)
```

### Priority Mapping (from Categorization/Grade):
```
"Tier 1" + "Standard" → 'medium'
"Tier 1" + "Premium"  → 'high'
Default               → 'medium'
```

---

## 3. Inventory → devices table

| Real Data Column | Database Column | Data Type | Notes |
|-----------------|-----------------|-----------|-------|
| Serialno | `serial_number` | VARCHAR(100) | Remove leading apostrophe |
| Part No | `model` | VARCHAR(50) | "IWL220", "Vx-520", etc. |
| Part Description | `description` | TEXT | NEW - Full description |
| Brand | `brand` | VARCHAR(50) | NEW - "Ingenico", "VeriFone" |
| Part Category | `part_category` | VARCHAR(50) | NEW - "Unit", "Battery", etc. |
| Good Type | `status` | device_status | "Good" → 'warehouse'/'issued', "Defect" → 'faulty' |
| User Name | `current_location` | VARCHAR(100) | Sub-region as location |
| EngineerName | `assigned_to` | UUID FK | Lookup by name |
| Owner Type | `owner_type` | VARCHAR(50) | NEW - "Bank Center", "MSP Center" |
| Owner Name | `owner_name` | VARCHAR(100) | NEW - "State Bank of India" |
| Categorization | `tier` | VARCHAR(20) | NEW - "Tier 1" |
| Ageing | Calculated | - | `NOW() - purchase_date` or `NOW() - created_at` |
| Ageing Band | Calculated | - | Based on ageing |
| Purchase Date | `purchase_date` | DATE | NEW - Parse "07 Mar 2014" |
| Invoice Number | `invoice_number` | VARCHAR(50) | NEW |
| AssetOwner Identification | `asset_owner` | VARCHAR(50) | NEW - "HITACHI", "ATOS" |
| Defective Reason | `defective_reason` | VARCHAR(100) | NEW |
| OEM Status | `oem_status` | VARCHAR(50) | NEW |

### Device Status Mapping:
```
"Good" (with engineer)    → 'issued'
"Good" (in warehouse)     → 'warehouse'
"Good" (at client)        → 'installed'
"Defect"                  → 'faulty'
```

### Serial Number Cleaning:
```python
# Remove leading apostrophe
serial = serial.lstrip("'")
# Examples:
# '13364WL21273323 → 13364WL21273323
# '401-552-061 → 401-552-061
```

### Brand Mapping:
```
Ingenico → ingenico
VeriFone → verifone
FUJIAN   → fujian
Any Data → any_data
VISA     → visa
```

### Part Category Mapping:
```
Unit       → unit
Battery    → battery
Adaptor    → adaptor
Power Cord → power_cord
Data Cable → data_cable
BASE       → base
Test Cards → test_cards
Modem      → modem
```

---

## 4. Closed Calls → calls table (updates)

| Real Data Column | Database Column | Data Type | Notes |
|-----------------|-----------------|-----------|-------|
| Call Ticket No | `call_number` | VARCHAR(20) | Match existing |
| Closed Date | `completed_at` | TIMESTAMP | Parse "29 Nov 2025 11:45" |
| Response Date | `started_at` | TIMESTAMP | First response |
| Resolution Date | `completed_at` | TIMESTAMP | Actual completion |
| Last Activity Date | `updated_at` | TIMESTAMP | |
| Action Taken | `resolution_notes` | TEXT | Details of work done |
| New SerialNo | Via call_devices | - | Device installed |
| Sim No | `metadata.sim_number` | JSON | NEW - SIM serial |
| Roll Type Delivered | `metadata.roll_type` | JSON | For paper roll calls |
| Roll Count Delivered | `metadata.roll_count` | JSON | Quantity delivered |
| Distance | `metadata.distance` | JSON | Distance traveled |
| Googled Distance | `googled_distance` | DECIMAL | Google Maps distance |
| EngineerName | `assigned_engineer` | UUID FK | Verify assignment |
| Rating | `metadata.rating` | JSON | 1-5 scale |
| Rating Remarks | `metadata.rating_remarks` | JSON | Customer feedback |
| Lat | `latitude` | DECIMAL | Completion location |
| Long | `longitude` | DECIMAL | Completion location |
| Geo Location | `metadata.geo_location` | JSON | Plus code/address |
| Closed By | `metadata.closed_by` | JSON | Who closed the call |

### SIM Information Mapping:
```json
{
  "sim": {
    "existing_model": "Airtel Sims",
    "existing_serial": "89919225034002439142",
    "new_model": "Airtel Sims",
    "new_serial": "89919225034002439142"
  }
}
```

---

## 5. Merchants → merchants table (NEW)

| Real Data Column | Database Column | Data Type | Notes |
|-----------------|-----------------|-----------|-------|
| MID | `mid` | VARCHAR(20) | Primary identifier |
| Merchant Name | `merchant_name` | VARCHAR(200) | |
| ME Type | `me_type` | VARCHAR(50) | "Retail" |
| Grade | `grade` | VARCHAR(20) | "Standard", "Premium" |
| MCCCode | `mcc_code` | VARCHAR(10) | 4-digit code |
| Location | `location` | VARCHAR(100) | Area name |
| City | `city` | VARCHAR(100) | |
| StateCode | `state_code` | VARCHAR(5) | "OD", "WB" |
| State | `state` | VARCHAR(50) | Full name |
| Contactaddress | `address` | TEXT | |
| ContactZip | `zip` | VARCHAR(10) | |
| Contactname | `contact_name` | VARCHAR(100) | |
| TelephoneNo | `telephone` | VARCHAR(20) | |
| MobileNo | `mobile` | VARCHAR(20) | |
| Institution | `bank_id` | UUID FK | Lookup by name |
| Zone Name | `zone_name` | VARCHAR(50) | |
| BranchCode | `branch_code` | VARCHAR(20) | |
| BranchName | `branch_name` | VARCHAR(100) | |
| BranchManager | `branch_manager` | VARCHAR(100) | |
| Branch Manager Mobile NO | `branch_manager_phone` | VARCHAR(20) | |
| Lat | `latitude` | DECIMAL | |
| Long | `longitude` | DECIMAL | |
| Geo Location | `geo_location` | TEXT | |

---

## 6. Terminals → terminals table (NEW)

| Real Data Column | Database Column | Data Type | Notes |
|-----------------|-----------------|-----------|-------|
| TID | `tid` | VARCHAR(20) | Primary identifier |
| MID | `merchant_id` | UUID FK | Lookup merchant |
| Requested ConType | `con_type` | VARCHAR(50) | Device type |
| New Model | `model` | VARCHAR(50) | Device model |
| New SerialNo | `serial_number` | VARCHAR(100) | Device serial |
| Sim No | `sim_serial` | VARCHAR(50) | SIM number |
| - | `sim_model` | VARCHAR(50) | SIM type |
| Installation Date | `installation_date` | TIMESTAMP | |
| - | `device_id` | UUID FK | Links to devices |

### TID Format Patterns:
```
Soundbox: SB + 6 digits  → SB217622, SB202153
Odisha:   OD + 6 digits  → OD081684, OD046294
West Bengal: WB + 6 digits → WB076374, WB032097
Assam:    AS + 6 digits  → AS046375, AS066140
Andaman:  AN + 6 digits  → AN015829
Arunachal: AR + 6 digits → AR034547
```

### Con Type Values:
```
SOUNDBOX      → Sound notification device
Android       → Android POS terminal
NFC PGPRS     → NFC GPRS terminal
Tap and Pay SQR → Tap and pay with QR
All in one POS → Full-featured POS
NFC DGPRS     → Dual GPRS with NFC
PSTN          → Landline terminal
GPRS          → Cellular terminal
NFC PSTN      → NFC landline
MPOS          → Mobile POS
Portable GPRS → Portable GPRS
Desktop GPRS  → Desktop GPRS
```

---

## Data Import Process

### Step 1: Import Banks
```sql
INSERT INTO banks (name, code) VALUES
('State Bank of India', 'SBI'),
('State Bank of Travancore', 'SBT'),
('State Bank of Bikaner and Jaipur', 'SBBJ')
ON CONFLICT (code) DO NOTHING;
```

### Step 2: Import Engineers (user_profiles)
```sql
-- From FSE Details CSV
INSERT INTO user_profiles (emp_id, full_name, phone, email, region, status, ...)
SELECT
  "Employee ID",
  "Employee Full Name",
  "Mobile Number",
  "Personal Email Address",
  "Region",
  CASE WHEN "Status" = 'Active' THEN 'active' ELSE 'inactive' END,
  ...
FROM staging_fse_details;
```

### Step 3: Import Merchants
```sql
-- From Calls data
INSERT INTO merchants (mid, merchant_name, city, state_code, ...)
SELECT DISTINCT
  "MID",
  "Merchant Name",
  "City",
  "StateCode",
  ...
FROM staging_calls
ON CONFLICT (mid) DO UPDATE SET updated_at = NOW();
```

### Step 4: Import Devices
```sql
-- From Inventory data
INSERT INTO devices (serial_number, model, brand, status, ...)
SELECT
  LTRIM("Serialno", ''''),
  "Part No",
  "Brand",
  CASE WHEN "Good Type" = 'Good' THEN 'warehouse' ELSE 'faulty' END,
  ...
FROM staging_inventory
WHERE "Part Category" = 'Unit';
```

### Step 5: Import Calls
```sql
-- From Pending/Closed Calls data
INSERT INTO calls (call_number, type, status, mid, tid, client_name, ...)
SELECT
  "Call Ticket No",
  CASE
    WHEN "Call Type" = 'Installation' THEN 'install'
    WHEN "Call Type" = 'Break Down' THEN 'breakdown'
    ...
  END,
  CASE
    WHEN "Status" = 'Call Allocated' THEN 'assigned'
    WHEN "Status" = 'Completed' THEN 'completed'
    ...
  END,
  "MID",
  "TID",
  "Merchant Name",
  ...
FROM staging_calls;
```
