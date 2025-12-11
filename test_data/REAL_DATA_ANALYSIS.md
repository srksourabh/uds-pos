# Real Client Data Analysis - UDS POS System

This document analyzes real production data from UDS (Ultimate Digital Solution) POS system to understand actual field patterns, formats, and business rules.

---

## 1. FSE_Details.csv (Field Service Engineers)

### All Columns (18 total):
1. `Region` - FSP Region code (e.g., "UDS-BHUBANESWAR", "HPY-UDS-ANDAMAN-DEDICATED")
2. `Employee ID` - Unique employee identifier (e.g., "UDSPL1384")
3. `Employee Full Name` - Full name of engineer
4. `Status` - Active/Deactive status
5. `Coordinator Name` - Supervising coordinator name
6. `Designation` - Job title (e.g., "Field Engineer", "Field Engineer (Dedicated)")
7. `Mobile Number` - Primary mobile (10 digits, sometimes with slash for alternate)
8. `Relative Mobile Number` - Alternate/emergency contact
9. `Personal Email Address` - Gmail accounts primarily
10. `Address` - Full residential address (multi-line in some cases)
11. `Location` - Area/locality name
12. `City/District` - City or district name
13. `State` - State name (full names like "Odisha", "Assam")
14. `Pin` - 6-digit PIN code
15. `Joining Date` - Date joined (various formats: DD-MM-YYYY, or Excel serial number)
16. `Lat` - Latitude coordinate
17. `Long` - Longitude coordinate
18. `Cover Loctaion/City/District` - Coverage area(s), comma-separated

### Sample Data:
| Region | Employee ID | Employee Full Name | Status | Mobile Number | City/District | State |
|--------|-------------|-------------------|--------|---------------|---------------|-------|
| HPY-UDS-ANDAMAN-DEDICATED | UDSPL1384 | Mohammed Shahid | Active | 9121025720 | Haddo | Andaman |
| UDS-ANDAMAN | UDSPL1101 | Abdul Salam | Active | 9476016024 | Port Blair | Andaman |
| UDS-BHUBANESWAR | UDSPL1179 | Amitav Mitra | Active | 7377971169 | PURI | Odisha |

### Data Patterns Observed:

**Employee ID Format:**
- Pattern: `UDSPL` + 4-digit number
- Examples: UDSPL1384, UDSPL1101, UDSPL1179
- Sequential, starting from ~1100

**Phone Number Format:**
- 10-digit Indian mobile numbers
- Sometimes contains alternate: "9658620600/ 9937628781"
- No country code prefix

**Status Values:**
- `Active` - Currently employed
- `Deactive` - Not currently active (typo in source data)

**Designation Values:**
- "Field Engineer" (most common)
- "Field Engineer (Dedicated)" (for dedicated accounts)
- "Field Engineer & Stock Executive" (combined role)

**Region/Sub-Region Patterns:**
- Main regions: UDS-KOLKATA (R), UDS-BHUBANESWAR, UDS-GUWAHATI, UDS-ANDAMAN, UDS-RANCHI, UDS-ROURKELA, UDS-KOLKATA (S)
- Special: HPY-UDS-ANDAMAN-DEDICATED (dedicated engineers)

**Coordinator Names (unique):**
- BABULI MALLICK
- Somen Halder
- Dev Narayan Samal
- Priyanka Priyadarsani Nayak
- Bhaben Borah
- Sourav Ghatak
- Ujjwal Chatterjee
- Jayanta Mondal
- Puspita Bhaduri

**States Covered:**
- Odisha, Assam, West Bengal, Andaman, Jharkhand, Arunachal Pradesh, Meghalaya, Tripura, Mizoram, Nagaland, Manipur, Sikkim

### Key Business Rules:
- Each engineer has a primary coverage area (region)
- Engineers can cover multiple cities (Cover Location field)
- Dedicated engineers marked with special region prefix
- Coordinates stored for location tracking

---

## 2. Pending_Calls.xlsx (Active Service Calls)

### All Columns (74 total):
1. `FSP Center` - "ULTIMATE DIGITAL SOLUTION"
2. `FSP Region` - Always "UDS-KOLKATA (R)"
3. `FSP SubRegion` - Sub-region assignment
4. `Alias Name` - Coordinator name
5. `Call Type` - Type of service call
6. `Call Ticket No` - Unique ticket identifier
7. `Request Date` - When call was created
8. `Merchant Name` - Business name
9. `ME Type` - Merchant Entity type (Retail)
10. `Grade` - Standard/Premium
11. `MID` - Merchant ID (15 digits)
12. `TID` - Terminal ID
13. `Institution` - Bank name
14. `Location` - Area name
15. `City` - City name
16. `StateCode` - 2-letter state code
17. `MCCCode` - Merchant Category Code
18. `Zone Name` - Geographic zone
19. `BranchCode` - Bank branch code
20. `BranchName` - Bank branch name
21. `BranchManager` - Bank branch manager
22. `Branch Manager Mobile NO` - Manager contact
23. `SponsorBank - Payment` - Payment sponsor
24. `Contactaddress` - Full address
25. `ContactZip` - PIN code
26. `Contactname` - Contact person name
27. `TelephoneNo` - Landline
28. `MobileNo` - Mobile number
29. `Status` - Call status
30. `Sub Status` - Detailed status
31. `No Of Visit` - Visit count
32. `Ageing` - Days since created
33. `Ageing Band` - Age category
34. `Last Site Ready Date` - When site was ready
35. `Tentative Date` - Expected completion
36. `Part No` - Device model/part
37. `Old Model` - Previous device model
38. `New Model` - New device model
39. `Action Taken` - Last action
40. `Problem Code` - Issue category
41. `problem Subcode` - Issue sub-category
42. `Roll Type Request` - Paper roll type
43. `Roll Count Requst` - Roll quantity
44. `Problem Description` - Issue details
45. `CDMA Modelno` - CDMA device model
46. `Requested ConType` - Device type requested
47. `Start Date` - Work start date
48. `Completed Date` - Completion date
49. `Created By` - Creator username
50. `Flag` - Special flags
51-74. Additional tracking fields...

### Sample Data:
| Call Ticket No | Call Type | Merchant Name | MID | TID | City | Status |
|---------------|-----------|---------------|-----|-----|------|--------|
| PPSINKOOR0073220 | Installation | MAA BHAIRABI TRADERS | 022211900519443 | SB223535 | GANJAM | Call Allocated |
| PPSINKOOR0073219 | Installation | MAA BHAGAWATI OFFICE | 022211900554112 | SB133415 | BALANGIR | Call Allocated |
| FB2560445 | Break Down | POWER GRID CORPORATION | 022000000280328 | WB032097 | JALPAIGURI | Call Allocated |

### Data Patterns Observed:

**Call Ticket Number Formats:**
- Installation: `PPSINKOOR0073220`, `PPSINKOWB0046419`, `PPSINKOAS0061510`
  - Pattern: `PPSIN` + state code + `0` + 7-digit number
  - OR: `PPSINIRIA0020759` (special format)
- Breakdown: `FB2560445`
  - Pattern: `FB` + 7-digit number
- Paper Roll: `RR1210953`
  - Pattern: `RR` + 7-digit number

**Call Types (5 types):**
- `Installation` - New device installation
- `Break Down` - Device malfunction/repair
- `Paper Roll` - Paper roll delivery
- `De-Installation` - Device removal
- `Asset Swap` - Device replacement

**Status Values (8 statuses):**
- `Call Allocated` - Assigned to engineer
- `Pending for Activity` - Awaiting action
- `CallAccepted` - Engineer accepted
- `Site Ready` - Site is prepared
- `Site Ready for De-installation` - Ready for removal
- `Work in Progress` - Currently being worked on
- `Pending for MMS Updation` - Awaiting system update
- `Pending for Unit` - Awaiting device

**Ageing Bands:**
- `[<=5 Days]`
- `[>5 DAYS & <=10 DAYS]`
- `[>10 DAYS & <=20 DAYS]`
- `[>20 DAYS & <=50 DAYS]`
- `[>50 DAYS]`

**MID Format:**
- 15 digits: `022211900519443`
- Prefix `022` common for this region

**TID Format (Terminal ID):**
- Soundbox: `SB` + 6 digits (e.g., SB223535, SB133415)
- State-based: `OD` + 6 digits (Odisha), `WB` + 6 digits (West Bengal)
- Other: `AS` + 6 digits (Assam), `AN` + 6 digits (Andaman), `AR` + 6 digits (Arunachal)

**Device Types (Requested ConType):**
- `SOUNDBOX` - Audio payment notification device
- `Android` - Android POS terminal
- `NFC PGPRS` - NFC-enabled GPRS terminal
- `Tap and Pay SQR` - Tap and pay with QR
- `All in one POS` - Full-featured POS
- `NFC DGPRS` - Dual GPRS with NFC
- `PSTN` - Landline terminal
- `GPRS` - Cellular terminal
- `NFC PSTN` - NFC landline terminal
- `MPOS` - Mobile POS

**State Codes:**
- OD (Odisha), AR (Arunachal Pradesh), WB (West Bengal), AS (Assam)
- AN (Andaman), JH (Jharkhand), ML (Meghalaya), TR (Tripura)
- MZ (Mizoram), NL (Nagaland), MN (Manipur), SK (Sikkim)

### Assignment Logic:
- Auto-allocation based on FSP SubRegion
- Engineers matched by coverage area
- "Auto - Call Allocated" action indicates system assignment
- Distance-based allocation (GoolgedDistance field)

---

## 3. Inventory_Stock_Details_Report.xls (Device Inventory)

### All Columns (24 total):
1. `FSP Center` - "ULTIMATE DIGITAL SOLUTION"
2. `FSP Region` - "UDS-KOLKATA (R)"
3. `User Type` - "FSP SubRegion"
4. `User Name` - Sub-region name
5. `Brand` - Device manufacturer
6. `Part Category` - Type of part
7. `Part No` - Part/model number
8. `Part Description` - Full description
9. `Serialno` - Serial number
10. `Ageing` - Days in inventory
11. `Ageing Band` - Age category
12. `Good Type` - Good/Defect
13. `Quantity` - Always 1
14. `Owner Type` - Bank Center/MSP Center
15. `Owner Name` - Bank name
16. `Categorization` - Tier level
17. `Purchase Date` - When acquired
18. `Invoice Number` - Purchase invoice
19. `AssetOwner Identification` - HITACHI/ATOS
20. `SIM Bifurcation` - SIM info
21. `EngineerName` - Assigned engineer
22. `Eng MobileNo` - Engineer mobile
23. `OEM Status` - OEM status
24. `Defective Reason` - Why defective

### Sample Data:
| Brand | Part Category | Part No | Serialno | Ageing | Good Type | EngineerName |
|-------|--------------|---------|----------|--------|-----------|--------------|
| Ingenico | Unit | IWL220 | '13364WL21273323 | 417 | Good | NIRMAL BAHERA |
| VeriFone | Unit | E285 3G BW | '401-552-061 | 191 | Good | SITARAM SWAIN |
| Ingenico | Unit | MOVE-2500 3GPLUS | '203357303131155318426517 | 88 | Good | Sameer Siya |

### Data Patterns Observed:

**Serial Number Formats:**
- Ingenico IWL: `'13364WL21273323` (apostrophe prefix, alphanumeric)
- VeriFone: `'401-552-061` or `'286-869-256` (dash-separated)
- Ingenico MOVE: `'203357303131155318426517` (long numeric)
- ICT220: `'14103CT21749159` (model prefix)
- NFC Test Cards: `'NFCTEST-4786799999902785`

**Brand Values:**
- Ingenico
- VeriFone
- FUJIAN
- Any Data
- VISA (for test cards)

**Part Categories:**
- Unit - Main device
- Battery
- Adaptor
- Power Cord
- Data Cable
- BASE (base station)
- Test Cards
- Modem

**Part Numbers (Models):**
- Ingenico: IWL220, ICT220, MOVE-2500, DX8000, LINK2500, MPOS
- VeriFone: Vx-520, Vx-675, E285, X990, V210, V240M
- Soundbox: ET389 (FUJIAN brand)

**Good Type:**
- `Good` - Working condition
- `Defect` - Defective/faulty

**Ageing Bands (inventory):**
- `[>30 DAYS]`
- `[>20 DAYS & <=30 DAYS]`
- `[>10 DAYS & <=20 DAYS]`
- Empty for accessories

**Owner Types:**
- `Bank Center` - Owned by bank
- `MSP Center` - Owned by MSP (Managed Service Provider)
- `Inventory Vendor` - Vendor inventory

**Defective Reasons:**
- De-Installation Close
- Asset Swap Close
- (blank for working devices)

**Asset Ownership:**
- HITACHI
- ATOS
- (blank for older devices)

---

## 4. Closed_Call_Details.csv (Completed Service Calls)

### Key Columns (326 total - major ones listed):
1-50: Call identification and merchant details
51-100: Status tracking and timing
101-150: Device and SIM information
151-200: Bank and branch details
201-250: Actions and engineering details
251-326: Additional tracking, ratings, location

### Sample Data:
| Call Ticket No | Call Type | Merchant Name | TID | Status | EngineerName | Closed Date |
|---------------|-----------|---------------|-----|--------|--------------|-------------|
| PPSINKOOR0072801 | Installation | MO PASANDA FASHION | SB217622 | Completed | MUKESH | 29 Nov 2025 |
| PPSINKOWB0045767 | Installation | SONAR BANGLA SUPERMART | SB202153 | Completed | HEMANTA PARAMANIK | 29 Nov 2025 |

### Data Patterns Observed:

**Completion Fields:**
- `Closed Date` - When call was closed
- `Response Date` - First response time
- `Resolution Date` - When resolved
- `Completed Date` - Work completion time
- `Last Activity Date` - Last update

**Resolution Tracking:**
- `Action Taken` - What was done
- `Resolution Notes` - Engineer notes
- `Roll Type Delivered` - Paper roll type given
- `Roll Count Delivered` - Number of rolls given

**SIM Information:**
- `Existing Sim Model` - Current SIM type
- `Existing Sim SerialNo` - Current SIM number
- `New SIM Model` - New SIM type
- `New SIMNo` - New SIM number

**SIM Types:**
- Airtel Sims
- Vodafone Sims
- JIO Sims

**SIM Serial Format:**
- Airtel: `89919225034002439142` (20 digits)
- Vodafone: `8991200054505028875`
- JIO: `89918740507061497851`

**Rating System:**
- `Rating` - 1-5 scale
- `Rating Remarks` - Customer feedback

**Distance Tracking:**
- `Distance` - Calculated distance
- `Googled Distance` - Google Maps distance
- `Least Distance Engineer` - Nearest available
- `Actual Engineer Distance` - Actual travel distance

**Action Taken Values:**
- "installation done"
- "Installation done with all training given to merchant yono SBI merchant app install"
- "installation done with all tranning given to me"
- "sound box installation done"
- "installation call done"

---

## Summary of Key Patterns

### ID Formats
| Entity | Format | Example |
|--------|--------|---------|
| Employee ID | UDSPL + 4 digits | UDSPL1384 |
| Call Ticket (Install) | PPSIN + state + 7 digits | PPSINKOOR0073220 |
| Call Ticket (Breakdown) | FB + 7 digits | FB2560445 |
| Call Ticket (Paper Roll) | RR + 7 digits | RR1210953 |
| MID | 15 digits | 022211900519443 |
| TID (Soundbox) | SB + 6 digits | SB217622 |
| TID (State POS) | State code + 6 digits | OD081684, WB076374 |
| Serial Number | Various alphanumeric | 13364WL21273323 |
| SIM Number | 19-20 digits | 89919225034002439142 |

### Status Mappings
| Real Data Status | Suggested DB Status |
|-----------------|---------------------|
| Call Allocated | assigned |
| Pending for Activity | pending |
| CallAccepted | assigned |
| Site Ready | pending |
| Work in Progress | in_progress |
| Completed | completed |
| Pending for Unit | pending |

### Call Type Mappings
| Real Data | Suggested DB Type |
|-----------|-------------------|
| Installation | install |
| Break Down | breakdown |
| De-Installation | deinstall |
| Asset Swap | swap |
| Paper Roll | maintenance |
