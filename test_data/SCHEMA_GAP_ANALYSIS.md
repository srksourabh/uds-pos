# Schema Gap Analysis - UDS POS System

This document compares the real production data structure with the current database schema to identify gaps and required changes.

---

## 1. Engineers/FSE (user_profiles table)

### Columns in Real Data NOT in Current Schema:

| Real Data Column | Description | Action Required |
|-----------------|-------------|-----------------|
| `Employee ID` | UDSPL1384 format | **ADD** `emp_id VARCHAR(20)` - Critical for matching |
| `Coordinator Name` | Supervising coordinator | **ADD** `coordinator_id UUID` FK to user_profiles |
| `Designation` | "Field Engineer", etc. | **ADD** `designation VARCHAR(100)` |
| `Relative Mobile Number` | Emergency contact | **ADD** `alternate_phone VARCHAR(20)` |
| `Personal Email Address` | Personal email | Can use existing `email` field |
| `Address` | Full residential | **ADD** `address TEXT` |
| `Location` | Area/locality | **ADD** `locality VARCHAR(100)` |
| `City/District` | City name | **ADD** `city VARCHAR(100)` |
| `State` | State name | **ADD** `state VARCHAR(50)` |
| `Pin` | PIN code | **ADD** `pin_code VARCHAR(10)` |
| `Joining Date` | Employment start | **ADD** `joining_date DATE` |
| `Cover Location/City/District` | Coverage areas | **ADD** `coverage_areas TEXT[]` |

### Columns in Schema NOT in Real Data:

| Schema Column | Keep/Remove | Reason |
|--------------|-------------|--------|
| `bank_id` | KEEP | For multi-bank support |
| `skills` | KEEP | Useful for device expertise |
| `avatar_url` | KEEP | UI requirement |
| `totp_enabled` | KEEP | Security |
| `status` | MODIFY | Change enum values |

### Column Name Differences:

| Real Data | Current Schema | Recommendation |
|-----------|---------------|----------------|
| Employee Full Name | full_name | OK - matches |
| Mobile Number | phone | OK - matches |
| Status (Active/Deactive) | status enum | MODIFY enum values |
| Region | region | OK - but add sub_region |

### Data Type Mismatches:

| Field | Real Type | Schema Type | Action |
|-------|-----------|-------------|--------|
| Status | "Active"/"Deactive" | UserStatus enum | Add 'deactive' to enum |
| Lat/Long | String with comma | number | Parse and convert |
| Joining Date | Various formats | - | Add as DATE |

### Recommended Schema Changes for user_profiles:

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emp_id VARCHAR(20) UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS locality VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS coverage_areas TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES user_profiles(id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sub_region VARCHAR(50);
```

---

## 2. Calls Table

### Columns in Real Data NOT in Current Schema:

| Real Data Column | Description | Action Required |
|-----------------|-------------|-----------------|
| `FSP Region` | Region code | **ADD** `fsp_region VARCHAR(50)` |
| `FSP SubRegion` | Sub-region | **ADD** `fsp_sub_region VARCHAR(50)` |
| `Alias Name` | Coordinator name | **ADD** `coordinator_name VARCHAR(100)` |
| `Categorization` | Tier 1/2/3 | **ADD** `categorization VARCHAR(20)` |
| `ME Type` | Merchant type | **ADD** to merchants table |
| `Grade` | Standard/Premium | **ADD** `grade VARCHAR(20)` |
| `MID` | Merchant ID (15 digits) | **ADD** `mid VARCHAR(20)` |
| `TID` | Terminal ID | **ADD** `tid VARCHAR(20)` |
| `Institution` | Bank name | Use existing `client_bank` |
| `MCCCode` | Merchant category code | **ADD** to merchants table |
| `Zone Name` | Geographic zone | **ADD** `zone_name VARCHAR(50)` |
| `BranchCode` | Bank branch code | **ADD** `branch_code VARCHAR(20)` |
| `BranchName` | Bank branch name | **ADD** `branch_name VARCHAR(100)` |
| `BranchManager` | Manager name | **ADD** `branch_manager VARCHAR(100)` |
| `Branch Manager Mobile NO` | Manager phone | **ADD** `branch_manager_phone VARCHAR(20)` |
| `Sub Status` | Detailed status | **ADD** `sub_status VARCHAR(50)` |
| `No Of Visit` | Visit count | **ADD** `visit_count INTEGER` |
| `Ageing` | Days since created | Calculated field |
| `Ageing Band` | Age category | Calculated field |
| `Last Site Ready Date` | When site ready | **ADD** `site_ready_date TIMESTAMP` |
| `Tentative Date` | Expected completion | **ADD** `tentative_date TIMESTAMP` |
| `Part No` | Device model | **ADD** `device_model VARCHAR(50)` |
| `Old Model` | Previous model | **ADD** `old_model VARCHAR(50)` |
| `New Model` | New model | **ADD** `new_model VARCHAR(50)` |
| `Action Taken` | Last action | **ADD** `last_action TEXT` |
| `Problem Code` | Issue category | **ADD** `problem_code VARCHAR(50)` |
| `Problem Subcode` | Issue subcategory | **ADD** `problem_subcode VARCHAR(50)` |
| `Requested ConType` | Device type | **ADD** `device_type VARCHAR(50)` |
| `GoolgedDistance` | Distance to site | **ADD** `googled_distance DECIMAL` |
| `Created By` | Creator | **ADD** `created_by VARCHAR(50)` |
| `Offline/Online` | Mode | **ADD** `call_mode VARCHAR(20)` |
| `App ID` | Application ID | **ADD** `app_id VARCHAR(50)` |

### Call Number Patterns Need Support:
- Installation: PPSINKOOR0073220, PPSINKOWB0046419
- Breakdown: FB2560445
- Paper Roll: RR1210953

### Call Type Mapping:
| Real Data | Current Schema | Action |
|-----------|---------------|--------|
| Installation | install | OK |
| Break Down | breakdown | OK |
| De-Installation | deinstall | OK |
| Asset Swap | swap | OK |
| Paper Roll | - | **ADD** 'paper_roll' to CallType enum |

### Call Status Mapping:
| Real Data | Current Schema | Action |
|-----------|---------------|--------|
| Call Allocated | assigned | OK |
| Pending for Activity | pending | OK |
| CallAccepted | - | **ADD** 'call_accepted' |
| Site Ready | - | **ADD** 'site_ready' |
| Work in Progress | in_progress | OK |
| Completed | completed | OK |
| Pending for Unit | pending | Use sub_status |
| Pending for MMS Updation | - | Use sub_status |

### Recommended Schema Changes for calls:

```sql
-- Add new call type
ALTER TYPE call_type ADD VALUE IF NOT EXISTS 'paper_roll';

-- Add new call statuses
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'call_accepted';
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'site_ready';

-- Add new columns
ALTER TABLE calls ADD COLUMN IF NOT EXISTS mid VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS tid VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS fsp_region VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS fsp_sub_region VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS categorization VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS grade VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS zone_name VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS branch_manager VARCHAR(100);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS branch_manager_phone VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sub_status VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS site_ready_date TIMESTAMP;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS tentative_date TIMESTAMP;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS device_model VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS old_model VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS new_model VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS last_action TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS problem_code VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS problem_subcode VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS googled_distance DECIMAL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_mode VARCHAR(20);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS app_id VARCHAR(50);
```

---

## 3. Devices/Inventory Table

### Columns in Real Data NOT in Current Schema:

| Real Data Column | Description | Action Required |
|-----------------|-------------|-----------------|
| `Brand` | Device manufacturer | **ADD** `brand VARCHAR(50)` |
| `Part Category` | Unit/Battery/Adaptor | **ADD** `part_category VARCHAR(50)` |
| `Part No` | Model number | Map to existing `model` |
| `Part Description` | Full description | **ADD** `description TEXT` |
| `Ageing` | Days in inventory | Calculated field |
| `Ageing Band` | Age category | Calculated field |
| `Good Type` | Good/Defect | Map to `status` |
| `Quantity` | Count | Always 1 for devices |
| `Owner Type` | Bank/MSP/Vendor | **ADD** `owner_type VARCHAR(50)` |
| `Owner Name` | Owner organization | **ADD** `owner_name VARCHAR(100)` |
| `Categorization` | Tier level | **ADD** `tier VARCHAR(20)` |
| `Purchase Date` | Acquisition date | **ADD** `purchase_date DATE` |
| `Invoice Number` | Purchase invoice | **ADD** `invoice_number VARCHAR(50)` |
| `AssetOwner Identification` | HITACHI/ATOS | **ADD** `asset_owner VARCHAR(50)` |
| `SIM Bifurcation` | SIM info | **ADD** `sim_info TEXT` |
| `OEM Status` | OEM status | **ADD** `oem_status VARCHAR(50)` |
| `Defective Reason` | Why defective | **ADD** `defective_reason VARCHAR(100)` |

### Device Status Mapping:
| Real Data (Good Type) | Current Schema | Action |
|----------------------|----------------|--------|
| Good | warehouse/issued | Context-dependent |
| Defect | faulty | OK |

### Brand Values to Support:
- Ingenico
- VeriFone
- FUJIAN
- Any Data
- VISA (test cards)

### Part Categories:
- Unit (main device)
- Battery
- Adaptor
- Power Cord
- Data Cable
- BASE
- Test Cards
- Modem

### Recommended Schema Changes for devices:

```sql
ALTER TABLE devices ADD COLUMN IF NOT EXISTS brand VARCHAR(50);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS part_category VARCHAR(50);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS owner_type VARCHAR(50);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS tier VARCHAR(20);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS asset_owner VARCHAR(50);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS sim_info TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS oem_status VARCHAR(50);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS defective_reason VARCHAR(100);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS tid VARCHAR(20);
```

---

## 4. New Table Required: Merchants

Real data shows extensive merchant information not currently in schema:

```sql
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mid VARCHAR(20) UNIQUE NOT NULL,
  merchant_name VARCHAR(200) NOT NULL,
  me_type VARCHAR(50), -- Retail, etc.
  grade VARCHAR(20), -- Standard, Premium
  mcc_code VARCHAR(10),
  mcc_description TEXT,

  -- Location
  location VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(50),
  state_code VARCHAR(5),
  address TEXT,
  zip VARCHAR(10),
  latitude DECIMAL,
  longitude DECIMAL,
  geo_location TEXT,

  -- Contact
  contact_name VARCHAR(100),
  telephone VARCHAR(20),
  mobile VARCHAR(20),
  email VARCHAR(100),

  -- Bank relationship
  bank_id UUID REFERENCES banks(id),
  zone_name VARCHAR(50),
  branch_code VARCHAR(20),
  branch_name VARCHAR(100),
  branch_manager VARCHAR(100),
  branch_manager_phone VARCHAR(20),

  -- Metadata
  sponsor_bank VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_merchants_mid ON merchants(mid);
CREATE INDEX idx_merchants_city ON merchants(city);
```

---

## 5. New Table Required: Terminals (TIDs)

Each merchant can have multiple terminals:

```sql
CREATE TABLE IF NOT EXISTS terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tid VARCHAR(20) UNIQUE NOT NULL,
  merchant_id UUID REFERENCES merchants(id),
  device_id UUID REFERENCES devices(id),

  con_type VARCHAR(50), -- SOUNDBOX, Android, NFC PGPRS, etc.
  model VARCHAR(50),
  serial_number VARCHAR(100),

  sim_model VARCHAR(50),
  sim_serial VARCHAR(50),

  installation_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_terminals_tid ON terminals(tid);
CREATE INDEX idx_terminals_merchant ON terminals(merchant_id);
```

---

## Summary of Required Changes

### Priority 1 - Critical for Basic Operations:
1. Add `emp_id` to user_profiles
2. Add `mid`, `tid` to calls
3. Add `brand`, `part_category` to devices
4. Create merchants table
5. Update CallType enum to include 'paper_roll'

### Priority 2 - Important for Reports:
1. Add engineer address fields
2. Add call tracking fields (visit_count, site_ready_date)
3. Add device tracking fields (purchase_date, invoice_number)
4. Create terminals table

### Priority 3 - Nice to Have:
1. Add coordinator relationship
2. Add branch manager tracking
3. Add rating system fields
4. Add distance tracking

### Enum Changes Required:

```sql
-- CallType
ALTER TYPE call_type ADD VALUE IF NOT EXISTS 'paper_roll';

-- CallStatus (extend)
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'call_accepted';
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'site_ready';

-- UserStatus (extend)
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'deactive';
```
