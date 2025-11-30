# Follow-Up Prompt 1 — Complete Seed Data Pack (CoSTAR)

## Executive Summary

This document provides comprehensive specifications for generating realistic seed data for the CoSTAR Field Service Management system. It includes data volumes, CSV layouts, JSON templates, seeding pipelines, and validation rules to ensure data integrity.

---

## 1. Seed Data Volume Plan

### **Overview**

| Table | Records | Purpose |
|-------|---------|---------|
| **Banks (Customers)** | 10 | Major banking clients across US regions |
| **Warehouses** | 3 | Central, West Coast, East Coast distribution centers |
| **Couriers** | 5 | Shipping companies for device transport |
| **User Profiles (Engineers)** | 20 | Field engineers distributed across banks |
| **User Profiles (Admins)** | 3 | System administrators and warehouse managers |
| **Devices** | 150 | POS terminals across various statuses |
| **Calls** | 60 | Service calls with mixed types and priorities |
| **Stock Movements** | 80 | Device lifecycle tracking records |
| **Shipments** | 15 | In-transit device shipments |
| **Photos** | 120 | Call completion evidence (2 photos per completed call) |
| **Engineer Aggregates** | 20 | Pre-calculated engineer performance metrics |
| **Stock Alerts** | 5 | Low inventory alerts per bank |

**Total Records**: ~481 records across 12 tables

---

## 2. Detailed Table Specifications

### **2.1 Banks (Customers)**

**Purpose**: Major banking clients who require POS device installations and maintenance.

**Record Count**: 10 banks

**Fields**:
```
id (uuid, pk)
name (text, unique)
bank_code (text, unique, 2-4 chars)
contact_person (text)
contact_email (text)
contact_phone (text)
address (text)
city (text)
state (text, 2-char)
zip_code (text)
created_at (timestamp)
```

**Sample Data Structure**:
```csv
name,bank_code,contact_person,contact_email,contact_phone,city,state,zip_code
Wells Fargo,WF,John Smith,john.smith@wellsfargo.com,+1-415-555-0100,San Francisco,CA,94104
Bank of America,BOA,Sarah Johnson,sarah.johnson@bofa.com,+1-704-555-0200,Charlotte,NC,28202
Chase Bank,CHASE,Michael Chen,michael.chen@chase.com,+1-212-555-0300,New York,NY,10017
Citibank,CITI,Emily Davis,emily.davis@citi.com,+1-212-555-0400,New York,NY,10022
PNC Bank,PNC,Robert Williams,robert.williams@pnc.com,+1-412-555-0500,Pittsburgh,PA,15222
US Bank,USB,Jennifer Martinez,jennifer.martinez@usbank.com,+1-651-555-0600,Minneapolis,MN,55402
TD Bank,TD,David Anderson,david.anderson@td.com,+1-856-555-0700,Cherry Hill,NJ,08002
Capital One,CAPT,Lisa Thompson,lisa.thompson@capitalone.com,+1-804-555-0800,Richmond,VA,23219
HSBC,HSBC,James Wilson,james.wilson@hsbc.com,+1-212-555-0900,New York,NY,10004
Truist Bank,TRUST,Maria Garcia,maria.garcia@truist.com,+1-704-555-1000,Charlotte,NC,28202
```

**Validation Rules**:
- All phone numbers in format: +1-XXX-XXX-XXXX
- Email format: firstname.lastname@domain.com
- Bank codes: 2-4 uppercase letters
- States: Valid 2-letter US state codes
- ZIP codes: 5-digit format

---

### **2.2 Warehouses**

**Purpose**: Distribution centers that hold device inventory.

**Record Count**: 3 warehouses

**Fields**:
```
id (uuid, pk)
name (text, unique)
code (text, unique)
manager_name (text)
phone (text)
address (text)
city (text)
state (text)
zip_code (text)
capacity (integer)
created_at (timestamp)
```

**Sample Data Structure**:
```csv
name,code,manager_name,phone,address,city,state,zip_code,capacity
Central Distribution Center,CDC,Tom Richardson,+1-312-555-2000,1000 Warehouse Blvd,Chicago,IL,60601,5000
West Coast Warehouse,WCW,Alice Chen,+1-213-555-2100,500 Distribution Way,Los Angeles,CA,90012,3000
East Coast Facility,ECF,Marcus Johnson,+1-201-555-2200,750 Logistics Dr,Newark,NJ,07102,4000
```

**Distribution Strategy**:
- Central: Serves Midwest banks (Chase, Citibank)
- West Coast: Serves Wells Fargo, US Bank
- East Coast: Serves BOA, PNC, TD Bank, Capital One, HSBC, Truist

---

### **2.3 Couriers**

**Purpose**: Shipping companies for device transport between warehouses and engineers.

**Record Count**: 5 couriers

**Fields**:
```
id (uuid, pk)
name (text, unique)
tracking_url_template (text)
contact_phone (text)
email (text)
created_at (timestamp)
```

**Sample Data Structure**:
```csv
name,tracking_url_template,contact_phone,email
FedEx,https://www.fedex.com/fedextrack/?trknbr={tracking_number},+1-800-463-3339,business@fedex.com
UPS,https://www.ups.com/track?tracknum={tracking_number},+1-800-742-5877,support@ups.com
DHL,https://www.dhl.com/us-en/home/tracking.html?tracking-id={tracking_number},+1-800-225-5345,service@dhl.com
USPS,https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number},+1-800-275-8777,help@usps.com
OnTrac,https://www.ontrac.com/tracking/?number={tracking_number},+1-800-334-5000,support@ontrac.com
```

---

### **2.4 User Profiles (Engineers)**

**Purpose**: Field engineers who perform installations, swaps, and maintenance.

**Record Count**: 20 engineers (2-3 per bank)

**Fields**:
```
id (uuid, pk, references auth.users)
email (text, unique)
full_name (text)
phone (text)
role (text, 'engineer')
bank_id (uuid, fk → banks)
status (text, 'active'|'inactive')
created_at (timestamp)
```

**Sample Data Structure**:
```csv
email,full_name,phone,bank_code,status
alex.martinez@costar.tech,Alex Martinez,+1-415-555-1001,WF,active
sophia.taylor@costar.tech,Sophia Taylor,+1-415-555-1002,WF,active
chris.rodriguez@costar.tech,Chris Rodriguez,+1-704-555-1003,BOA,active
emma.wilson@costar.tech,Emma Wilson,+1-704-555-1004,BOA,active
noah.anderson@costar.tech,Noah Anderson,+1-212-555-1005,CHASE,active
olivia.thomas@costar.tech,Olivia Thomas,+1-212-555-1006,CHASE,active
liam.jackson@costar.tech,Liam Jackson,+1-212-555-1007,CITI,active
ava.white@costar.tech,Ava White,+1-212-555-1008,CITI,active
ethan.harris@costar.tech,Ethan Harris,+1-412-555-1009,PNC,active
mia.martin@costar.tech,Mia Martin,+1-412-555-1010,PNC,active
mason.thompson@costar.tech,Mason Thompson,+1-651-555-1011,USB,active
isabella.garcia@costar.tech,Isabella Garcia,+1-651-555-1012,USB,active
william.martinez@costar.tech,William Martinez,+1-856-555-1013,TD,active
charlotte.robinson@costar.tech,Charlotte Robinson,+1-856-555-1014,TD,active
james.clark@costar.tech,James Clark,+1-804-555-1015,CAPT,active
amelia.rodriguez@costar.tech,Amelia Rodriguez,+1-804-555-1016,CAPT,active
benjamin.lewis@costar.tech,Benjamin Lewis,+1-212-555-1017,HSBC,active
harper.lee@costar.tech,Harper Lee,+1-212-555-1018,HSBC,active
lucas.walker@costar.tech,Lucas Walker,+1-704-555-1019,TRUST,active
evelyn.hall@costar.tech,Evelyn Hall,+1-704-555-1020,TRUST,active
```

**Engineer Distribution by Bank**:
```
Wells Fargo (WF): 2 engineers
Bank of America (BOA): 2 engineers
Chase (CHASE): 2 engineers
Citibank (CITI): 2 engineers
PNC (PNC): 2 engineers
US Bank (USB): 2 engineers
TD Bank (TD): 2 engineers
Capital One (CAPT): 2 engineers
HSBC (HSBC): 2 engineers
Truist (TRUST): 2 engineers
```

---

### **2.5 User Profiles (Admins)**

**Purpose**: System administrators and warehouse managers.

**Record Count**: 3 admins

**Fields**: Same as engineers, but `role = 'admin'`

**Sample Data Structure**:
```csv
email,full_name,phone,role,status
admin@costar.tech,System Administrator,+1-312-555-9001,admin,active
warehouse.manager@costar.tech,Warehouse Manager,+1-312-555-9002,admin,active
operations.lead@costar.tech,Operations Lead,+1-312-555-9003,admin,active
```

---

### **2.6 Devices**

**Purpose**: POS terminals tracked through their lifecycle.

**Record Count**: 150 devices

**Status Distribution**:
- `warehouse`: 60 devices (40%)
- `issued`: 40 devices (27%)
- `installed`: 35 devices (23%)
- `faulty`: 10 devices (7%)
- `returned`: 5 devices (3%)

**Model Distribution**:
- PAX S920: 50 devices (33%)
- PAX A920: 40 devices (27%)
- Ingenico Move5000: 35 devices (23%)
- Verifone V400c: 25 devices (17%)

**Fields**:
```
id (uuid, pk)
serial_number (text, unique)
model (text)
device_bank (uuid, fk → banks, nullable)
status (text)
assigned_to (uuid, fk → user_profiles, nullable)
installed_at_client (text, nullable)
notes (text, nullable)
created_at (timestamp)
updated_at (timestamp)
```

**Serial Number Format**: `SN-{BANK}-{YEAR}-{SEQ}`
- Example: `SN-WF-2025-0001`, `SN-BOA-2025-0012`

**Sample Data Structure**:
```csv
serial_number,model,device_bank,status,assigned_to,installed_at_client
SN-WF-2025-0001,PAX S920,WF,warehouse,NULL,NULL
SN-WF-2025-0002,PAX S920,WF,issued,alex.martinez@costar.tech,NULL
SN-WF-2025-0003,PAX A920,WF,installed,sophia.taylor@costar.tech,"Wells Fargo Main Branch, 123 Market St, San Francisco, CA 94104"
SN-BOA-2025-0001,Ingenico Move5000,BOA,warehouse,NULL,NULL
SN-BOA-2025-0002,PAX S920,BOA,issued,chris.rodriguez@costar.tech,NULL
SN-BOA-2025-0003,Verifone V400c,BOA,installed,emma.wilson@costar.tech,"Bank of America Downtown, 456 Trade St, Charlotte, NC 28202"
SN-CHASE-2025-0001,PAX A920,CHASE,faulty,NULL,"Device won't power on - returned from Madison Ave branch"
SN-CITI-2025-0001,PAX S920,CITI,warehouse,NULL,NULL
...
```

**Device Allocation by Bank** (15 devices per bank):
```
Wells Fargo: 15 devices (6 warehouse, 4 issued, 4 installed, 1 faulty)
Bank of America: 15 devices (6 warehouse, 4 issued, 4 installed, 1 faulty)
Chase: 15 devices (6 warehouse, 4 issued, 3 installed, 1 faulty, 1 returned)
Citibank: 15 devices (6 warehouse, 4 issued, 4 installed, 1 faulty)
PNC: 15 devices (6 warehouse, 4 issued, 4 installed, 1 faulty)
US Bank: 15 devices (6 warehouse, 4 issued, 4 installed, 1 faulty)
TD Bank: 15 devices (6 warehouse, 4 issued, 3 installed, 1 faulty, 1 returned)
Capital One: 15 devices (6 warehouse, 4 issued, 4 installed, 1 faulty)
HSBC: 15 devices (6 warehouse, 4 issued, 3 installed, 1 faulty, 1 returned)
Truist: 15 devices (6 warehouse, 4 issued, 3 installed, 1 faulty, 1 returned)
```

---

### **2.7 Calls (Service Calls)**

**Purpose**: Service requests for installations, swaps, maintenance, etc.

**Record Count**: 60 calls

**Type Distribution**:
- `install`: 30 calls (50%)
- `swap`: 12 calls (20%)
- `maintenance`: 10 calls (17%)
- `breakdown`: 5 calls (8%)
- `deinstall`: 3 calls (5%)

**Status Distribution**:
- `pending`: 10 calls (17%)
- `assigned`: 15 calls (25%)
- `in_progress`: 10 calls (17%)
- `completed`: 20 calls (33%)
- `cancelled`: 5 calls (8%)

**Priority Distribution**:
- `low`: 12 calls (20%)
- `medium`: 30 calls (50%)
- `high`: 15 calls (25%)
- `urgent`: 3 calls (5%)

**Fields**:
```
id (uuid, pk)
call_number (text, unique, auto-generated)
client_bank (uuid, fk → banks)
client_name (text) -- branch name
client_address (text)
client_phone (text)
type (text)
priority (text)
requires_device (boolean)
devices_needed (integer)
status (text)
assigned_engineer (uuid, fk → user_profiles, nullable)
scheduled_date (date)
started_at (timestamp, nullable)
completed_at (timestamp, nullable)
notes (text, nullable)
created_at (timestamp)
```

**Sample Data Structure**:
```csv
call_number,client_bank,client_name,client_address,client_phone,type,priority,requires_device,devices_needed,status,assigned_engineer,scheduled_date
CALL-2025-0001,WF,Main Branch,"123 Market St, San Francisco, CA 94104",+1-415-555-3001,install,high,TRUE,1,completed,alex.martinez@costar.tech,2025-01-15
CALL-2025-0002,WF,Financial District,"456 Montgomery St, San Francisco, CA 94104",+1-415-555-3002,install,medium,TRUE,2,completed,sophia.taylor@costar.tech,2025-01-16
CALL-2025-0003,BOA,Downtown Branch,"789 Trade St, Charlotte, NC 28202",+1-704-555-3003,swap,high,TRUE,1,in_progress,chris.rodriguez@costar.tech,2025-01-20
CALL-2025-0004,CHASE,Madison Avenue,"321 Madison Ave, New York, NY 10017",+1-212-555-3004,maintenance,low,FALSE,0,assigned,noah.anderson@costar.tech,2025-01-22
CALL-2025-0005,CITI,Wall Street,"555 Wall St, New York, NY 10005",+1-212-555-3005,breakdown,urgent,TRUE,1,in_progress,liam.jackson@costar.tech,2025-01-21
...
```

**Call Distribution by Type and Bank**:
- Each bank receives 6 calls on average
- Install calls: Distributed evenly (3 per bank)
- Swap calls: Only for banks with existing installations
- Maintenance: For installed devices (random banks)
- Breakdown: Urgent issues (random)
- Deinstall: Bank closures or upgrades

**Realistic Branch Names by Bank**:
```
Wells Fargo: Main Branch, Financial District, Union Square, Marina, Sunset District
Bank of America: Downtown, Trade Street, South End, Uptown, University
Chase: Madison Avenue, Park Avenue, Times Square, Financial Center, Midtown
Citibank: Wall Street, Tribeca, Upper East Side, Greenwich Village, SoHo
PNC: Liberty Avenue, Market Square, Oakland, Shadyside, Squirrel Hill
US Bank: Nicollet Mall, Downtown, Uptown, St. Paul, Bloomington
TD Bank: Cherry Hill Plaza, Main Street, Waterfront, University City, Center City
Capital One: Broad Street, Carytown, West End, Short Pump, Midlothian
HSBC: Fifth Avenue, Park Avenue, Financial District, Chinatown, Queens
Truist: Charlotte Plaza, Uptown, South Park, Ballantyne, SouthEnd
```

---

### **2.8 Stock Movements**

**Purpose**: Audit trail of device lifecycle events.

**Record Count**: 80 movements

**Movement Types**:
- `received`: 20 movements (initial warehouse receipt)
- `issued`: 40 movements (issued to engineer)
- `installed`: 35 movements (installed at client)
- `swapped`: 12 movements (device replacement)
- `returned`: 8 movements (returned to warehouse)
- `marked_faulty`: 10 movements (marked as defective)

**Fields**:
```
id (uuid, pk)
device_id (uuid, fk → devices)
call_id (uuid, fk → calls, nullable)
movement_type (text)
from_status (text, nullable)
to_status (text)
from_location (text, nullable)
to_location (text, nullable)
moved_by (uuid, fk → user_profiles, nullable)
notes (text, nullable)
created_at (timestamp)
```

**Sample Data Structure**:
```csv
device_serial,call_number,movement_type,from_status,to_status,from_location,to_location,moved_by,notes
SN-WF-2025-0001,NULL,received,NULL,warehouse,Supplier,Central Distribution Center,warehouse.manager@costar.tech,Batch delivery from PAX
SN-WF-2025-0002,CALL-2025-0001,issued,warehouse,issued,Central Distribution Center,alex.martinez@costar.tech,alex.martinez@costar.tech,Issued for installation call
SN-WF-2025-0002,CALL-2025-0001,installed,issued,installed,alex.martinez@costar.tech,"Wells Fargo Main Branch, 123 Market St",alex.martinez@costar.tech,Installation completed successfully
SN-BOA-2025-0003,CALL-2025-0003,swapped,installed,returned,"Bank of America Downtown, 456 Trade St",chris.rodriguez@costar.tech,chris.rodriguez@costar.tech,Replaced with newer model
SN-CHASE-2025-0001,CALL-2025-0010,marked_faulty,installed,faulty,"Chase Madison Ave, 321 Madison Ave",noah.anderson@costar.tech,noah.anderson@costar.tech,Device won't power on - hardware failure
...
```

**Movement Timeline Logic**:
1. **Received**: Device arrives at warehouse (initial state)
2. **Issued**: Device assigned to engineer for a specific call
3. **Installed**: Engineer completes installation at client site
4. **Swapped**: Old device removed, new device installed (2 movements)
5. **Returned**: Device brought back to warehouse
6. **Marked Faulty**: Device identified as defective

**Validation Rules**:
- Every `issued` movement must have a matching `call_id`
- Every `installed` movement must have a prior `issued` movement
- `from_status` and `to_status` must follow valid transitions
- `moved_by` must reference an active user

---

### **2.9 Shipments**

**Purpose**: Track devices in transit between warehouses and engineers.

**Record Count**: 15 shipments

**Fields**:
```
id (uuid, pk)
courier_id (uuid, fk → couriers)
tracking_number (text, unique)
from_warehouse (uuid, fk → warehouses)
to_engineer (uuid, fk → user_profiles)
status (text: 'pending'|'in_transit'|'delivered')
shipped_at (timestamp, nullable)
delivered_at (timestamp, nullable)
created_at (timestamp)
```

**Sample Data Structure**:
```csv
courier_name,tracking_number,from_warehouse,to_engineer,status,shipped_at,delivered_at
FedEx,1Z999AA10123456784,Central Distribution Center,alex.martinez@costar.tech,delivered,2025-01-10 08:00:00,2025-01-12 14:30:00
UPS,1Z999AA10123456785,West Coast Warehouse,sophia.taylor@costar.tech,delivered,2025-01-11 09:00:00,2025-01-13 16:00:00
DHL,1234567890,East Coast Facility,chris.rodriguez@costar.tech,in_transit,2025-01-18 07:00:00,NULL
FedEx,1Z999AA10123456786,Central Distribution Center,noah.anderson@costar.tech,pending,NULL,NULL
...
```

**Shipment Status Distribution**:
- `pending`: 3 shipments (20%)
- `in_transit`: 5 shipments (33%)
- `delivered`: 7 shipments (47%)

---

### **2.10 Photos (Call Completion Evidence)**

**Purpose**: Photo documentation for completed calls (before/after).

**Record Count**: 120 photos (2 per completed call × 60 calls)

**Fields**:
```
id (uuid, pk)
call_id (uuid, fk → calls)
device_id (uuid, fk → devices, nullable)
photo_type (text: 'before_installation'|'after_installation'|'faulty_device'|'site_photo')
storage_path (text, URL to Supabase Storage)
uploaded_by (uuid, fk → user_profiles)
uploaded_at (timestamp)
metadata (jsonb, optional: GPS, device info)
```

**Sample Data Structure**:
```csv
call_number,device_serial,photo_type,storage_path,uploaded_by
CALL-2025-0001,SN-WF-2025-0002,before_installation,call-photos/CALL-2025-0001/before_1.jpg,alex.martinez@costar.tech
CALL-2025-0001,SN-WF-2025-0002,after_installation,call-photos/CALL-2025-0001/after_1.jpg,alex.martinez@costar.tech
CALL-2025-0002,SN-WF-2025-0003,before_installation,call-photos/CALL-2025-0002/before_1.jpg,sophia.taylor@costar.tech
CALL-2025-0002,SN-WF-2025-0003,after_installation,call-photos/CALL-2025-0002/after_1.jpg,sophia.taylor@costar.tech
...
```

**Photo Metadata (JSON)**:
```json
{
  "gps_latitude": 37.7749,
  "gps_longitude": -122.4194,
  "timestamp": "2025-01-15T14:30:00Z",
  "device_model": "PAX S920",
  "file_size": 1048576,
  "resolution": "1920x1080"
}
```

---

### **2.11 Engineer Aggregates**

**Purpose**: Pre-calculated performance metrics for engineers.

**Record Count**: 20 aggregates (1 per engineer)

**Fields**:
```
id (uuid, pk)
engineer_id (uuid, fk → user_profiles)
total_calls (integer)
completed_calls (integer)
in_progress_calls (integer)
avg_call_duration_hours (numeric)
devices_issued (integer)
devices_installed (integer)
last_call_completed_at (timestamp, nullable)
last_updated (timestamp)
```

**Sample Data Structure**:
```csv
engineer_email,total_calls,completed_calls,in_progress_calls,avg_call_duration_hours,devices_issued,devices_installed
alex.martinez@costar.tech,8,6,1,2.5,4,3
sophia.taylor@costar.tech,7,5,1,3.0,4,4
chris.rodriguez@costar.tech,6,4,2,2.8,3,2
emma.wilson@costar.tech,5,4,0,2.2,2,2
...
```

**Calculation Logic**:
- `total_calls`: All calls assigned to engineer (any status)
- `completed_calls`: Calls with status='completed'
- `in_progress_calls`: Calls with status='in_progress'
- `avg_call_duration_hours`: AVG(completed_at - started_at) in hours
- `devices_issued`: COUNT devices with assigned_to = engineer_id
- `devices_installed`: COUNT devices with status='installed' by engineer

---

### **2.12 Stock Alerts**

**Purpose**: Inventory alerts for low stock per bank.

**Record Count**: 5 alerts (for banks below threshold)

**Fields**:
```
id (uuid, pk)
bank_id (uuid, fk → banks)
alert_type (text: 'low_stock'|'critical_stock')
threshold (integer)
current_count (integer)
message (text)
created_at (timestamp)
resolved_at (timestamp, nullable)
```

**Sample Data Structure**:
```csv
bank_code,alert_type,threshold,current_count,message,resolved_at
Wells Fargo,low_stock,10,6,"Warehouse stock below threshold for WF - only 6 devices available",NULL
Bank of America,low_stock,10,8,"Warehouse stock below threshold for BOA - only 8 devices available",NULL
Chase,critical_stock,5,3,"CRITICAL: Only 3 devices available for CHASE - immediate restocking required",NULL
...
```

---

## 3. CSV Layout Specifications

### **3.1 Master CSV Files**

#### **banks.csv**
```csv
name,bank_code,contact_person,contact_email,contact_phone,address,city,state,zip_code
"Wells Fargo","WF","John Smith","john.smith@wellsfargo.com","+1-415-555-0100","500 Montgomery St","San Francisco","CA","94104"
"Bank of America","BOA","Sarah Johnson","sarah.johnson@bofa.com","+1-704-555-0200","100 N Tryon St","Charlotte","NC","28202"
...
```

**Column Descriptions**:
- `name`: Full legal name of bank
- `bank_code`: 2-4 character unique identifier
- `contact_person`: Primary contact full name
- `contact_email`: Business email (format: first.last@domain.com)
- `contact_phone`: US phone number (+1-XXX-XXX-XXXX)
- `address`: Street address
- `city`: City name
- `state`: 2-letter state code
- `zip_code`: 5-digit ZIP

---

#### **warehouses.csv**
```csv
name,code,manager_name,phone,address,city,state,zip_code,capacity
"Central Distribution Center","CDC","Tom Richardson","+1-312-555-2000","1000 Warehouse Blvd","Chicago","IL","60601",5000
"West Coast Warehouse","WCW","Alice Chen","+1-213-555-2100","500 Distribution Way","Los Angeles","CA","90012",3000
...
```

---

#### **couriers.csv**
```csv
name,tracking_url_template,contact_phone,email
"FedEx","https://www.fedex.com/fedextrack/?trknbr={tracking_number}","+1-800-463-3339","business@fedex.com"
"UPS","https://www.ups.com/track?tracknum={tracking_number}","+1-800-742-5877","support@ups.com"
...
```

---

#### **engineers.csv**
```csv
email,full_name,phone,bank_code,role,status
"alex.martinez@costar.tech","Alex Martinez","+1-415-555-1001","WF","engineer","active"
"sophia.taylor@costar.tech","Sophia Taylor","+1-415-555-1002","WF","engineer","active"
...
```

**Note**: Password for all engineers: `Engineer123!` (set separately in auth.users)

---

#### **admins.csv**
```csv
email,full_name,phone,role,status
"admin@costar.tech","System Administrator","+1-312-555-9001","admin","active"
"warehouse.manager@costar.tech","Warehouse Manager","+1-312-555-9002","admin","active"
...
```

**Note**: Password for all admins: `Admin123!` (set separately in auth.users)

---

#### **devices.csv**
```csv
serial_number,model,bank_code,status,assigned_to_email,installed_at_client,notes
"SN-WF-2025-0001","PAX S920","WF","warehouse",NULL,NULL,NULL
"SN-WF-2025-0002","PAX S920","WF","issued","alex.martinez@costar.tech",NULL,"Issued for CALL-2025-0001"
"SN-WF-2025-0003","PAX A920","WF","installed","sophia.taylor@costar.tech","Wells Fargo Main Branch, 123 Market St, San Francisco, CA 94104",NULL
...
```

**Column Descriptions**:
- `serial_number`: Unique identifier (format: SN-{BANK}-{YEAR}-{SEQ})
- `model`: Device model (PAX S920, PAX A920, Ingenico Move5000, Verifone V400c)
- `bank_code`: Bank ownership (FK to banks.bank_code)
- `status`: Current status (warehouse|issued|installed|faulty|returned)
- `assigned_to_email`: Engineer email if issued (FK to user_profiles.email)
- `installed_at_client`: Full address if installed
- `notes`: Additional information

---

#### **calls.csv**
```csv
call_number,bank_code,client_name,client_address,client_phone,type,priority,requires_device,devices_needed,status,assigned_engineer_email,scheduled_date,notes
"CALL-2025-0001","WF","Main Branch","123 Market St, San Francisco, CA 94104","+1-415-555-3001","install","high",TRUE,1,"completed","alex.martinez@costar.tech","2025-01-15","New POS installation"
...
```

**Column Descriptions**:
- `call_number`: Unique call identifier (auto-generated: CALL-YYYY-NNNN)
- `bank_code`: Client bank (FK to banks.bank_code)
- `client_name`: Branch or location name
- `client_address`: Full street address
- `client_phone`: Branch phone number
- `type`: Service type (install|swap|maintenance|breakdown|deinstall)
- `priority`: Urgency (low|medium|high|urgent)
- `requires_device`: Boolean (TRUE/FALSE)
- `devices_needed`: Integer (0-5)
- `status`: Current status (pending|assigned|in_progress|completed|cancelled)
- `assigned_engineer_email`: Engineer assigned (FK to user_profiles.email)
- `scheduled_date`: Target date (YYYY-MM-DD)
- `notes`: Additional details

---

#### **stock_movements.csv**
```csv
device_serial,call_number,movement_type,from_status,to_status,from_location,to_location,moved_by_email,notes,created_at
"SN-WF-2025-0001",NULL,"received",NULL,"warehouse","Supplier","Central Distribution Center","warehouse.manager@costar.tech","Batch delivery from PAX","2025-01-01 08:00:00"
"SN-WF-2025-0002","CALL-2025-0001","issued","warehouse","issued","Central Distribution Center","alex.martinez@costar.tech","alex.martinez@costar.tech","Issued for installation","2025-01-14 10:00:00"
...
```

---

#### **shipments.csv**
```csv
courier_name,tracking_number,from_warehouse_code,to_engineer_email,status,shipped_at,delivered_at
"FedEx","1Z999AA10123456784","CDC","alex.martinez@costar.tech","delivered","2025-01-10 08:00:00","2025-01-12 14:30:00"
...
```

---

#### **photos.csv**
```csv
call_number,device_serial,photo_type,storage_path,uploaded_by_email,uploaded_at,metadata_json
"CALL-2025-0001","SN-WF-2025-0002","before_installation","call-photos/CALL-2025-0001/before_1.jpg","alex.martinez@costar.tech","2025-01-15 13:00:00","{\"gps_latitude\": 37.7749, \"gps_longitude\": -122.4194}"
...
```

---

## 4. JSON Data Templates

### **4.1 Complete Seed Data JSON Structure**

```json
{
  "metadata": {
    "version": "1.0.0",
    "generated_at": "2025-01-30T00:00:00Z",
    "total_records": 481,
    "description": "CoSTAR Field Service Management System - Seed Data Pack"
  },
  "banks": [
    {
      "name": "Wells Fargo",
      "bank_code": "WF",
      "contact_person": "John Smith",
      "contact_email": "john.smith@wellsfargo.com",
      "contact_phone": "+1-415-555-0100",
      "address": "500 Montgomery St",
      "city": "San Francisco",
      "state": "CA",
      "zip_code": "94104"
    },
    {
      "name": "Bank of America",
      "bank_code": "BOA",
      "contact_person": "Sarah Johnson",
      "contact_email": "sarah.johnson@bofa.com",
      "contact_phone": "+1-704-555-0200",
      "address": "100 N Tryon St",
      "city": "Charlotte",
      "state": "NC",
      "zip_code": "28202"
    }
    // ... 8 more banks
  ],
  "warehouses": [
    {
      "name": "Central Distribution Center",
      "code": "CDC",
      "manager_name": "Tom Richardson",
      "phone": "+1-312-555-2000",
      "address": "1000 Warehouse Blvd",
      "city": "Chicago",
      "state": "IL",
      "zip_code": "60601",
      "capacity": 5000
    }
    // ... 2 more warehouses
  ],
  "couriers": [
    {
      "name": "FedEx",
      "tracking_url_template": "https://www.fedex.com/fedextrack/?trknbr={tracking_number}",
      "contact_phone": "+1-800-463-3339",
      "email": "business@fedex.com"
    }
    // ... 4 more couriers
  ],
  "users": {
    "engineers": [
      {
        "email": "alex.martinez@costar.tech",
        "password": "Engineer123!",
        "full_name": "Alex Martinez",
        "phone": "+1-415-555-1001",
        "role": "engineer",
        "bank_code": "WF",
        "status": "active"
      }
      // ... 19 more engineers
    ],
    "admins": [
      {
        "email": "admin@costar.tech",
        "password": "Admin123!",
        "full_name": "System Administrator",
        "phone": "+1-312-555-9001",
        "role": "admin",
        "status": "active"
      }
      // ... 2 more admins
    ]
  },
  "devices": [
    {
      "serial_number": "SN-WF-2025-0001",
      "model": "PAX S920",
      "bank_code": "WF",
      "status": "warehouse",
      "assigned_to_email": null,
      "installed_at_client": null,
      "notes": null
    },
    {
      "serial_number": "SN-WF-2025-0002",
      "model": "PAX S920",
      "bank_code": "WF",
      "status": "issued",
      "assigned_to_email": "alex.martinez@costar.tech",
      "installed_at_client": null,
      "notes": "Issued for CALL-2025-0001"
    }
    // ... 148 more devices
  ],
  "calls": [
    {
      "call_number": "CALL-2025-0001",
      "bank_code": "WF",
      "client_name": "Main Branch",
      "client_address": "123 Market St, San Francisco, CA 94104",
      "client_phone": "+1-415-555-3001",
      "type": "install",
      "priority": "high",
      "requires_device": true,
      "devices_needed": 1,
      "status": "completed",
      "assigned_engineer_email": "alex.martinez@costar.tech",
      "scheduled_date": "2025-01-15",
      "started_at": "2025-01-15T09:00:00Z",
      "completed_at": "2025-01-15T11:30:00Z",
      "notes": "New POS installation for main branch"
    }
    // ... 59 more calls
  ],
  "stock_movements": [
    {
      "device_serial": "SN-WF-2025-0001",
      "call_number": null,
      "movement_type": "received",
      "from_status": null,
      "to_status": "warehouse",
      "from_location": "Supplier",
      "to_location": "Central Distribution Center",
      "moved_by_email": "warehouse.manager@costar.tech",
      "notes": "Batch delivery from PAX",
      "created_at": "2025-01-01T08:00:00Z"
    }
    // ... 79 more movements
  ],
  "shipments": [
    {
      "courier_name": "FedEx",
      "tracking_number": "1Z999AA10123456784",
      "from_warehouse_code": "CDC",
      "to_engineer_email": "alex.martinez@costar.tech",
      "status": "delivered",
      "shipped_at": "2025-01-10T08:00:00Z",
      "delivered_at": "2025-01-12T14:30:00Z"
    }
    // ... 14 more shipments
  ],
  "photos": [
    {
      "call_number": "CALL-2025-0001",
      "device_serial": "SN-WF-2025-0002",
      "photo_type": "before_installation",
      "storage_path": "call-photos/CALL-2025-0001/before_1.jpg",
      "uploaded_by_email": "alex.martinez@costar.tech",
      "uploaded_at": "2025-01-15T13:00:00Z",
      "metadata": {
        "gps_latitude": 37.7749,
        "gps_longitude": -122.4194,
        "resolution": "1920x1080",
        "file_size": 1048576
      }
    }
    // ... 119 more photos
  ],
  "engineer_aggregates": [
    {
      "engineer_email": "alex.martinez@costar.tech",
      "total_calls": 8,
      "completed_calls": 6,
      "in_progress_calls": 1,
      "avg_call_duration_hours": 2.5,
      "devices_issued": 4,
      "devices_installed": 3,
      "last_call_completed_at": "2025-01-20T15:30:00Z",
      "last_updated": "2025-01-25T00:00:00Z"
    }
    // ... 19 more aggregates
  ],
  "stock_alerts": [
    {
      "bank_code": "WF",
      "alert_type": "low_stock",
      "threshold": 10,
      "current_count": 6,
      "message": "Warehouse stock below threshold for WF - only 6 devices available",
      "created_at": "2025-01-25T08:00:00Z",
      "resolved_at": null
    }
    // ... 4 more alerts
  ]
}
```

---

## 5. Seed Pipeline Instructions

### **5.1 Dependency Graph**

```
┌─────────────────────────────────────────────────┐
│                   PHASE 1                       │
│            Independent Tables (No FKs)          │
└─────────────────────────────────────────────────┘
              │
              ├── banks
              ├── warehouses
              └── couriers
              │
              ▼
┌─────────────────────────────────────────────────┐
│                   PHASE 2                       │
│         Users (Depends on banks)                │
└─────────────────────────────────────────────────┘
              │
              ├── auth.users (engineers + admins)
              └── user_profiles (references auth.users, banks)
              │
              ▼
┌─────────────────────────────────────────────────┐
│                   PHASE 3                       │
│       Devices (Depends on banks, users)         │
└─────────────────────────────────────────────────┘
              │
              └── devices (references banks, user_profiles)
              │
              ▼
┌─────────────────────────────────────────────────┐
│                   PHASE 4                       │
│     Calls (Depends on banks, users, devices)    │
└─────────────────────────────────────────────────┘
              │
              └── calls (references banks, user_profiles)
              │
              ▼
┌─────────────────────────────────────────────────┐
│                   PHASE 5                       │
│    Transactional Data (Depends on all above)    │
└─────────────────────────────────────────────────┘
              │
              ├── stock_movements (references devices, calls, users)
              ├── shipments (references warehouses, couriers, users)
              └── photos (references calls, devices, users)
              │
              ▼
┌─────────────────────────────────────────────────┐
│                   PHASE 6                       │
│         Aggregates & Alerts (Computed)          │
└─────────────────────────────────────────────────┘
              │
              ├── engineer_aggregates (computed from calls, devices)
              └── stock_alerts (computed from devices count)
```

---

### **5.2 Execution Order**

**Step-by-Step Seeding Process**:

```sql
-- PHASE 1: Independent Tables
-- =========================
-- Execute in any order

-- 1.1 Banks
INSERT INTO banks (id, name, bank_code, contact_person, ...)
VALUES (...), (...), ...;

-- 1.2 Warehouses
INSERT INTO warehouses (id, name, code, manager_name, ...)
VALUES (...), (...), ...;

-- 1.3 Couriers
INSERT INTO couriers (id, name, tracking_url_template, ...)
VALUES (...), (...), ...;

-- PHASE 2: Users
-- =========================
-- MUST execute in this exact order

-- 2.1 Create auth.users (engineers)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, ...)
VALUES (gen_random_uuid(), 'alex.martinez@costar.tech', crypt('Engineer123!', gen_salt('bf')), NOW(), ...);

-- 2.2 Create user_profiles (engineers)
INSERT INTO user_profiles (id, email, full_name, phone, role, bank_id, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'alex.martinez@costar.tech'),
  'alex.martinez@costar.tech',
  'Alex Martinez',
  '+1-415-555-1001',
  'engineer',
  (SELECT id FROM banks WHERE bank_code = 'WF'),
  'active'
);

-- 2.3 Create auth.users (admins)
INSERT INTO auth.users (id, email, encrypted_password, ...)
VALUES (gen_random_uuid(), 'admin@costar.tech', crypt('Admin123!', gen_salt('bf')), ...);

-- 2.4 Create user_profiles (admins)
INSERT INTO user_profiles (id, email, full_name, role, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@costar.tech'),
  'admin@costar.tech',
  'System Administrator',
  'admin',
  'active'
);

-- PHASE 3: Devices
-- =========================

-- 3.1 Create devices
INSERT INTO devices (id, serial_number, model, device_bank, status, assigned_to, ...)
VALUES (
  gen_random_uuid(),
  'SN-WF-2025-0001',
  'PAX S920',
  (SELECT id FROM banks WHERE bank_code = 'WF'),
  'warehouse',
  NULL,
  ...
);

-- 3.2 Create issued devices (with assigned_to)
INSERT INTO devices (id, serial_number, model, device_bank, status, assigned_to, ...)
VALUES (
  gen_random_uuid(),
  'SN-WF-2025-0002',
  'PAX S920',
  (SELECT id FROM banks WHERE bank_code = 'WF'),
  'issued',
  (SELECT id FROM user_profiles WHERE email = 'alex.martinez@costar.tech'),
  ...
);

-- PHASE 4: Calls
-- =========================

-- 4.1 Create calls
INSERT INTO calls (id, call_number, client_bank, client_name, type, priority, status, assigned_engineer, ...)
VALUES (
  gen_random_uuid(),
  'CALL-2025-0001',
  (SELECT id FROM banks WHERE bank_code = 'WF'),
  'Main Branch',
  'install',
  'high',
  'completed',
  (SELECT id FROM user_profiles WHERE email = 'alex.martinez@costar.tech'),
  ...
);

-- PHASE 5: Transactional Data
-- =========================

-- 5.1 Stock Movements
INSERT INTO stock_movements (id, device_id, call_id, movement_type, from_status, to_status, moved_by, ...)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM devices WHERE serial_number = 'SN-WF-2025-0002'),
  (SELECT id FROM calls WHERE call_number = 'CALL-2025-0001'),
  'issued',
  'warehouse',
  'issued',
  (SELECT id FROM user_profiles WHERE email = 'warehouse.manager@costar.tech'),
  ...
);

-- 5.2 Shipments
INSERT INTO shipments (id, courier_id, tracking_number, from_warehouse, to_engineer, status, ...)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM couriers WHERE name = 'FedEx'),
  '1Z999AA10123456784',
  (SELECT id FROM warehouses WHERE code = 'CDC'),
  (SELECT id FROM user_profiles WHERE email = 'alex.martinez@costar.tech'),
  'delivered',
  ...
);

-- 5.3 Photos
INSERT INTO photos (id, call_id, device_id, photo_type, storage_path, uploaded_by, ...)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM calls WHERE call_number = 'CALL-2025-0001'),
  (SELECT id FROM devices WHERE serial_number = 'SN-WF-2025-0002'),
  'before_installation',
  'call-photos/CALL-2025-0001/before_1.jpg',
  (SELECT id FROM user_profiles WHERE email = 'alex.martinez@costar.tech'),
  ...
);

-- PHASE 6: Aggregates & Alerts
-- =========================

-- 6.1 Engineer Aggregates (computed)
INSERT INTO engineer_aggregates (id, engineer_id, total_calls, completed_calls, ...)
SELECT
  gen_random_uuid(),
  u.id,
  COUNT(c.id) as total_calls,
  COUNT(c.id) FILTER (WHERE c.status = 'completed') as completed_calls,
  ...
FROM user_profiles u
LEFT JOIN calls c ON c.assigned_engineer = u.id
WHERE u.role = 'engineer'
GROUP BY u.id;

-- 6.2 Stock Alerts (computed)
INSERT INTO stock_alerts (id, bank_id, alert_type, threshold, current_count, message, ...)
SELECT
  gen_random_uuid(),
  b.id,
  CASE
    WHEN COUNT(d.id) < 5 THEN 'critical_stock'
    WHEN COUNT(d.id) < 10 THEN 'low_stock'
  END,
  10,
  COUNT(d.id),
  'Warehouse stock below threshold for ' || b.bank_code || ' - only ' || COUNT(d.id) || ' devices available',
  NOW()
FROM banks b
LEFT JOIN devices d ON d.device_bank = b.id AND d.status = 'warehouse'
GROUP BY b.id, b.bank_code
HAVING COUNT(d.id) < 10;
```

---

### **5.3 Structural Seed Script Outline (No Code)**

```
Seed Data Loader Script Structure
==================================

1. INITIALIZATION
   - Load environment variables (DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
   - Establish database connection
   - Validate connection
   - Begin transaction (for atomicity)

2. PRE-SEED VALIDATION
   - Check if tables exist
   - Check if tables are empty (prevent duplicate seeding)
   - Verify schema version matches seed data
   - Create backup (optional but recommended)

3. LOAD CSV/JSON DATA FILES
   - Parse banks.csv → banks_data[]
   - Parse warehouses.csv → warehouses_data[]
   - Parse couriers.csv → couriers_data[]
   - Parse engineers.csv → engineers_data[]
   - Parse admins.csv → admins_data[]
   - Parse devices.csv → devices_data[]
   - Parse calls.csv → calls_data[]
   - Parse stock_movements.csv → movements_data[]
   - Parse shipments.csv → shipments_data[]
   - Parse photos.csv → photos_data[]

4. VALIDATION & PRE-PROCESSING
   - Validate data formats (emails, phone numbers, dates)
   - Check for duplicate serial numbers
   - Verify foreign key references exist in parent tables
   - Generate UUIDs for all records
   - Hash passwords (bcrypt for auth.users)

5. PHASE 1: SEED INDEPENDENT TABLES
   - INSERT banks (10 records)
   - INSERT warehouses (3 records)
   - INSERT couriers (5 records)
   - Store generated UUIDs in lookup maps

6. PHASE 2: SEED USERS
   - INSERT auth.users (engineers: 20, admins: 3)
   - INSERT user_profiles (link to auth.users and banks)
   - Store user_id → email mapping

7. PHASE 3: SEED DEVICES
   - INSERT devices (150 records)
   - Link device_bank to banks.id
   - Link assigned_to to user_profiles.id (if status=issued)
   - Store device_id → serial_number mapping

8. PHASE 4: SEED CALLS
   - INSERT calls (60 records)
   - Link client_bank to banks.id
   - Link assigned_engineer to user_profiles.id
   - Store call_id → call_number mapping

9. PHASE 5: SEED TRANSACTIONAL DATA
   - INSERT stock_movements (80 records)
   - INSERT shipments (15 records)
   - INSERT photos (120 records)
   - All using stored UUID mappings

10. PHASE 6: COMPUTE AGGREGATES
    - Run SQL to calculate engineer_aggregates
    - Run SQL to generate stock_alerts

11. POST-SEED VALIDATION
    - Verify record counts match expected
    - Check foreign key integrity
    - Validate device status distribution
    - Verify engineer assignment counts
    - Check stock reconciliation

12. FINALIZATION
    - COMMIT transaction (if all validations pass)
    - ROLLBACK transaction (if any validation fails)
    - Log success/failure with details
    - Output summary report

ERROR HANDLING
==============
- If any phase fails, ROLLBACK entire transaction
- Log specific error (table, record, constraint violated)
- Provide remediation suggestions
- Exit with non-zero code

IDEMPOTENCY
===========
- Check if seed data already exists
- If exists, prompt: SKIP | OVERWRITE | MERGE
- SKIP: Exit without changes
- OVERWRITE: DELETE all existing + reseed
- MERGE: Update existing, add new (complex, not recommended)
```

---

## 6. Data Integrity Checklist

### **6.1 Foreign Key Validation**

**MUST validate before inserting**:

```
✓ devices.device_bank → banks.id (MUST exist)
✓ devices.assigned_to → user_profiles.id (MUST exist if status='issued')
✓ user_profiles.bank_id → banks.id (MUST exist for engineers)
✓ calls.client_bank → banks.id (MUST exist)
✓ calls.assigned_engineer → user_profiles.id (MUST exist if status!='pending')
✓ stock_movements.device_id → devices.id (MUST exist)
✓ stock_movements.call_id → calls.id (MUST exist if movement_type='issued')
✓ stock_movements.moved_by → user_profiles.id (MUST exist)
✓ shipments.courier_id → couriers.id (MUST exist)
✓ shipments.from_warehouse → warehouses.id (MUST exist)
✓ shipments.to_engineer → user_profiles.id (MUST exist)
✓ photos.call_id → calls.id (MUST exist)
✓ photos.device_id → devices.id (MUST exist)
✓ photos.uploaded_by → user_profiles.id (MUST exist)
✓ engineer_aggregates.engineer_id → user_profiles.id (MUST exist)
✓ stock_alerts.bank_id → banks.id (MUST exist)
```

---

### **6.2 Cross-Validation Rules**

**Critical Business Logic Validations**:

1. **Bank Matching**:
   ```
   ✓ device.device_bank MUST MATCH call.client_bank if device linked to call
   ✓ engineer.bank_id MUST MATCH call.client_bank if engineer assigned to call
   ✓ device.device_bank MUST MATCH engineer.bank_id if device.assigned_to = engineer
   ```

2. **Status Consistency**:
   ```
   ✓ devices with status='issued' MUST have assigned_to != NULL
   ✓ devices with status='warehouse' MUST have assigned_to = NULL
   ✓ devices with status='installed' MUST have installed_at_client != NULL
   ✓ calls with status='assigned' MUST have assigned_engineer != NULL
   ✓ calls with status='completed' MUST have completed_at != NULL
   ```

3. **Device Inventory Balance**:
   ```
   ✓ COUNT(devices WHERE assigned_to = engineer.id) MUST EQUAL engineer_aggregates.devices_issued
   ✓ COUNT(stock_movements WHERE movement_type='issued' AND device_id=X) <= 1 per device
   ✓ Each device can only be in ONE status at a time
   ```

4. **Call-Device Linkage**:
   ```
   ✓ If call.requires_device = TRUE, MUST have stock_movement linking device to call
   ✓ If call.status = 'completed' AND call.requires_device = TRUE, MUST have 2+ photos
   ✓ Photos.call_id MUST reference completed or in_progress calls only
   ```

5. **Date Logic**:
   ```
   ✓ call.started_at MUST BE > call.created_at
   ✓ call.completed_at MUST BE > call.started_at
   ✓ stock_movement.created_at MUST BE <= device.updated_at
   ✓ shipment.delivered_at MUST BE > shipment.shipped_at
   ```

6. **Geographic Realism**:
   ```
   ✓ Wells Fargo calls should be in California (San Francisco area)
   ✓ Bank of America calls should be in North Carolina (Charlotte area)
   ✓ Chase/Citibank/HSBC calls should be in New York
   ✓ PNC calls should be in Pennsylvania (Pittsburgh area)
   ✓ US Bank calls should be in Minnesota (Minneapolis area)
   ✓ TD Bank calls should be in New Jersey (Cherry Hill area)
   ✓ Capital One calls should be in Virginia (Richmond area)
   ✓ Truist calls should be in North Carolina (Charlotte area)
   ```

7. **Engineer Workload**:
   ```
   ✓ No engineer should have > 5 active calls (status='assigned' or 'in_progress')
   ✓ No engineer should have > 10 devices issued
   ✓ Engineer cannot be assigned calls from different banks than their bank_id
   ```

---

### **6.3 Pre-Import Validation SQL**

**Run these queries BEFORE importing to ensure data integrity**:

```sql
-- 1. Check for duplicate serial numbers
SELECT serial_number, COUNT(*)
FROM devices
GROUP BY serial_number
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- 2. Check for orphaned devices (issued but no engineer)
SELECT serial_number, status, assigned_to
FROM devices
WHERE status = 'issued' AND assigned_to IS NULL;
-- Expected: 0 rows

-- 3. Check for bank mismatches (device bank != engineer bank)
SELECT
  d.serial_number,
  d.device_bank,
  u.bank_id,
  u.email
FROM devices d
JOIN user_profiles u ON d.assigned_to = u.id
WHERE d.device_bank != u.bank_id;
-- Expected: 0 rows

-- 4. Check for incomplete calls (completed but no timestamps)
SELECT call_number, status, started_at, completed_at
FROM calls
WHERE status = 'completed' AND (started_at IS NULL OR completed_at IS NULL);
-- Expected: 0 rows

-- 5. Check for missing photos (completed install/swap calls without photos)
SELECT c.call_number, c.type, c.status, COUNT(p.id) as photo_count
FROM calls c
LEFT JOIN photos p ON p.call_id = c.id
WHERE c.status = 'completed'
  AND c.type IN ('install', 'swap')
  AND c.requires_device = TRUE
GROUP BY c.id, c.call_number, c.type, c.status
HAVING COUNT(p.id) < 2;
-- Expected: 0 rows

-- 6. Verify device status distribution
SELECT status, COUNT(*) as count, ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM devices), 2) as percentage
FROM devices
GROUP BY status
ORDER BY count DESC;
-- Expected percentages: warehouse ~40%, issued ~27%, installed ~23%, faulty ~7%, returned ~3%

-- 7. Verify engineer aggregate calculations
SELECT
  u.email,
  u.full_name,
  COUNT(c.id) as actual_calls,
  ea.total_calls as aggregate_calls,
  COUNT(d.id) as actual_devices,
  ea.devices_issued as aggregate_devices
FROM user_profiles u
LEFT JOIN calls c ON c.assigned_engineer = u.id
LEFT JOIN devices d ON d.assigned_to = u.id
LEFT JOIN engineer_aggregates ea ON ea.engineer_id = u.id
WHERE u.role = 'engineer'
GROUP BY u.id, u.email, u.full_name, ea.total_calls, ea.devices_issued
HAVING COUNT(c.id) != ea.total_calls OR COUNT(d.id) != ea.devices_issued;
-- Expected: 0 rows (all aggregates match actual counts)
```

---

## 7. Implementation Pitfalls & Solutions

### **7.1 Common Errors**

| Pitfall | Impact | Solution |
|---------|--------|----------|
| **Duplicate Serial Numbers** | Violates unique constraint | Pre-validate serial numbers, use sequential generation |
| **Missing Foreign Keys** | Insert fails, transaction rollback | Validate all FKs exist before insert, use lookups |
| **Bank Mismatches** | Security violation, RLS fails | Cross-validate device.bank = engineer.bank = call.bank |
| **Inconsistent Statuses** | Business logic breaks | Validate status transitions, use state machine |
| **Orphaned Records** | Data integrity issues | Use transactions, validate cascading deletes |
| **Wrong Date Order** | Logic errors, negative durations | Validate started_at > created_at > completed_at |
| **Password Hashing** | Authentication fails | Use bcrypt with proper salt (crypt('password', gen_salt('bf'))) |
| **UUID Mismatches** | FK constraint violations | Use consistent UUID generation, store mappings |
| **Missing Photos** | Compliance violation | Validate 2 photos per completed install/swap call |
| **Engineer Overload** | Unrealistic workload | Limit to 5 active calls, 10 devices per engineer |

---

### **7.2 Troubleshooting Guide**

**Error**: `foreign key constraint violation`
```
Diagnosis: Referenced record doesn't exist in parent table
Solution:
  1. Check if parent record was inserted successfully
  2. Verify UUID/email mapping is correct
  3. Review execution order (maybe tables seeded out of order)
```

**Error**: `duplicate key value violates unique constraint "devices_serial_number_key"`
```
Diagnosis: Serial number already exists
Solution:
  1. Check for duplicates in CSV: sort devices.csv | uniq -d
  2. Verify sequential numbering per bank
  3. Clear existing data if re-seeding: DELETE FROM devices;
```

**Error**: `check constraint "devices_status_valid" failed`
```
Diagnosis: Invalid status value
Solution:
  1. Verify status is one of: warehouse|issued|installed|faulty|returned
  2. Check for typos or case sensitivity
  3. Validate CSV data before import
```

**Error**: `COUNT(*) != expected_count`
```
Diagnosis: Some records failed to insert
Solution:
  1. Check logs for specific insert failures
  2. Verify transaction wasn't partially rolled back
  3. Re-run seed script with verbose logging
```

---

## 8. Cross-Validation Queries (Post-Import)

### **8.1 Bank Consistency Check**

```sql
-- Verify all devices assigned to engineers belong to same bank
SELECT
  d.serial_number,
  d.device_bank as device_bank_id,
  b1.bank_code as device_bank_code,
  u.bank_id as engineer_bank_id,
  b2.bank_code as engineer_bank_code,
  u.email as engineer_email
FROM devices d
JOIN banks b1 ON d.device_bank = b1.id
JOIN user_profiles u ON d.assigned_to = u.id
JOIN banks b2 ON u.bank_id = b2.id
WHERE d.device_bank != u.bank_id;

-- Expected: 0 rows (no bank mismatches)
```

---

### **8.2 Inventory Reconciliation**

```sql
-- Compare engineer device counts
SELECT
  u.email,
  u.full_name,
  COUNT(d.id) as actual_device_count,
  ea.devices_issued as reported_device_count,
  CASE
    WHEN COUNT(d.id) = ea.devices_issued THEN '✓ MATCH'
    ELSE '✗ MISMATCH'
  END as status
FROM user_profiles u
LEFT JOIN devices d ON d.assigned_to = u.id AND d.status = 'issued'
LEFT JOIN engineer_aggregates ea ON ea.engineer_id = u.id
WHERE u.role = 'engineer'
GROUP BY u.id, u.email, u.full_name, ea.devices_issued
ORDER BY status DESC, u.email;

-- Expected: All rows show '✓ MATCH'
```

---

### **8.3 Realistic Merchant Geo Locations**

```sql
-- Verify geographic distribution of calls by bank
SELECT
  b.bank_code,
  b.city as bank_headquarters,
  c.client_name,
  c.client_address,
  CASE
    WHEN b.bank_code = 'WF' AND c.client_address LIKE '%San Francisco%' THEN '✓'
    WHEN b.bank_code = 'BOA' AND c.client_address LIKE '%Charlotte%' THEN '✓'
    WHEN b.bank_code IN ('CHASE', 'CITI', 'HSBC') AND c.client_address LIKE '%New York%' THEN '✓'
    WHEN b.bank_code = 'PNC' AND c.client_address LIKE '%Pittsburgh%' THEN '✓'
    WHEN b.bank_code = 'USB' AND c.client_address LIKE '%Minneapolis%' THEN '✓'
    WHEN b.bank_code = 'TD' AND c.client_address LIKE '%New Jersey%' THEN '✓'
    WHEN b.bank_code = 'CAPT' AND c.client_address LIKE '%Richmond%' THEN '✓'
    WHEN b.bank_code = 'TRUST' AND c.client_address LIKE '%Charlotte%' THEN '✓'
    ELSE '✗ WRONG LOCATION'
  END as location_check
FROM calls c
JOIN banks b ON c.client_bank = b.id
ORDER BY location_check DESC, b.bank_code;

-- Expected: All rows show '✓'
```

---

## 9. Sample CSV Files (First 5 Rows Each)

### **banks.csv**
```csv
name,bank_code,contact_person,contact_email,contact_phone,address,city,state,zip_code
Wells Fargo,WF,John Smith,john.smith@wellsfargo.com,+1-415-555-0100,500 Montgomery St,San Francisco,CA,94104
Bank of America,BOA,Sarah Johnson,sarah.johnson@bofa.com,+1-704-555-0200,100 N Tryon St,Charlotte,NC,28202
Chase Bank,CHASE,Michael Chen,michael.chen@chase.com,+1-212-555-0300,383 Madison Ave,New York,NY,10017
Citibank,CITI,Emily Davis,emily.davis@citi.com,+1-212-555-0400,388 Greenwich St,New York,NY,10013
PNC Bank,PNC,Robert Williams,robert.williams@pnc.com,+1-412-555-0500,300 Fifth Ave,Pittsburgh,PA,15222
```

### **engineers.csv**
```csv
email,full_name,phone,bank_code,role,status
alex.martinez@costar.tech,Alex Martinez,+1-415-555-1001,WF,engineer,active
sophia.taylor@costar.tech,Sophia Taylor,+1-415-555-1002,WF,engineer,active
chris.rodriguez@costar.tech,Chris Rodriguez,+1-704-555-1003,BOA,engineer,active
emma.wilson@costar.tech,Emma Wilson,+1-704-555-1004,BOA,engineer,active
noah.anderson@costar.tech,Noah Anderson,+1-212-555-1005,CHASE,engineer,active
```

### **devices.csv**
```csv
serial_number,model,bank_code,status,assigned_to_email,installed_at_client,notes
SN-WF-2025-0001,PAX S920,WF,warehouse,,,
SN-WF-2025-0002,PAX S920,WF,issued,alex.martinez@costar.tech,,Issued for CALL-2025-0001
SN-WF-2025-0003,PAX A920,WF,installed,sophia.taylor@costar.tech,"Wells Fargo Main Branch, 123 Market St, San Francisco, CA 94104",
SN-WF-2025-0004,Ingenico Move5000,WF,warehouse,,,
SN-WF-2025-0005,Verifone V400c,WF,issued,alex.martinez@costar.tech,,
```

### **calls.csv**
```csv
call_number,bank_code,client_name,client_address,client_phone,type,priority,requires_device,devices_needed,status,assigned_engineer_email,scheduled_date,notes
CALL-2025-0001,WF,Main Branch,"123 Market St, San Francisco, CA 94104",+1-415-555-3001,install,high,TRUE,1,completed,alex.martinez@costar.tech,2025-01-15,New POS installation
CALL-2025-0002,WF,Financial District,"456 Montgomery St, San Francisco, CA 94104",+1-415-555-3002,install,medium,TRUE,2,completed,sophia.taylor@costar.tech,2025-01-16,Dual terminal setup
CALL-2025-0003,BOA,Downtown Branch,"789 Trade St, Charlotte, NC 28202",+1-704-555-3003,swap,high,TRUE,1,in_progress,chris.rodriguez@costar.tech,2025-01-20,Replace faulty terminal
CALL-2025-0004,CHASE,Madison Avenue,"321 Madison Ave, New York, NY 10017",+1-212-555-3004,maintenance,low,FALSE,0,assigned,noah.anderson@costar.tech,2025-01-22,Routine checkup
CALL-2025-0005,CITI,Wall Street,"555 Wall St, New York, NY 10005",+1-212-555-3005,breakdown,urgent,TRUE,1,in_progress,liam.jackson@costar.tech,2025-01-21,Emergency repair
```

---

## 10. Final Recommendations

### **10.1 Best Practices**

1. ✅ **Use Transactions**: Wrap all inserts in BEGIN/COMMIT to ensure atomicity
2. ✅ **Validate Before Import**: Run pre-validation SQL before seeding
3. ✅ **Generate UUIDs Consistently**: Use gen_random_uuid() or pre-generate in script
4. ✅ **Hash Passwords Properly**: Use bcrypt (crypt function) with salt
5. ✅ **Store Lookup Maps**: Map emails → UUIDs, serial_numbers → device_ids
6. ✅ **Follow Execution Order**: Respect dependency graph (Phase 1 → 6)
7. ✅ **Log Everything**: Record success/failure for each phase
8. ✅ **Backup First**: Create database backup before seeding (or use dev DB)
9. ✅ **Verify Counts**: Check record counts match expected after import
10. ✅ **Test Queries**: Run cross-validation queries to verify data integrity

---

### **10.2 Testing Strategy**

```
1. DEV ENVIRONMENT
   - Seed data to local/dev database
   - Run all validation queries
   - Test Edge Functions with seed data
   - Verify UI displays data correctly

2. STAGING ENVIRONMENT
   - Seed fresh data to staging
   - Run automated integration tests
   - Perform manual UAT scenarios
   - Verify performance with realistic data volume

3. PRODUCTION
   - Use SUBSET of seed data (not full 150 devices)
   - OR use seed data structure but with REAL client data
   - NEVER seed test data to production
```

---

## 11. Conclusion

This comprehensive seed data specification provides everything needed to generate realistic test data for the CoSTAR Field Service Management system:

- ✅ **481 total records** across 12 tables
- ✅ **10 banks** with realistic contact information
- ✅ **20 engineers** distributed across banks
- ✅ **150 devices** with proper status distribution
- ✅ **60 calls** covering all service types
- ✅ **80 stock movements** tracking device lifecycle
- ✅ **Complete CSV layouts** with column descriptions
- ✅ **JSON templates** for programmatic import
- ✅ **6-phase seed pipeline** with dependency graph
- ✅ **Comprehensive validation rules** for data integrity
- ✅ **Cross-validation queries** for post-import verification
- ✅ **Geographic realism** with bank-specific locations

**Next Steps**:
1. Review this specification with stakeholders
2. Generate actual CSV/JSON files based on templates
3. Implement seed script following structural outline
4. Test in development environment
5. Execute UAT scenarios with seed data

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Status**: READY FOR IMPLEMENTATION
**Estimated Implementation Time**: 8-12 hours

---
