# UDS-POS Testing Workflows Guide

This guide provides step-by-step testing instructions for all major workflows in the UDS-POS Field Service Management system.

## Quick Start

1. Start the development server: `npm run dev`
2. Open http://localhost:5173
3. Login with: `admin` / `admin`

---

## WORKFLOW 1: Admin Creates and Assigns Ticket

**Goal**: Create a new service ticket and assign it to an engineer

### Steps

1. **Login as Admin**
   - Navigate to http://localhost:5173
   - Enter username: `admin`
   - Enter password: `admin`
   - Click "Sign In"

2. **Navigate to Tickets**
   - From the dashboard, click "Tickets" in the sidebar
   - Or navigate to `/tickets`

3. **Create New Ticket**
   - Click "New Ticket" or "+" button
   - Fill in the form:
     - **Bank**: Select "HDFC Bank"
     - **Merchant**: Enter "Sharma Electronics"
     - **Address**: "Shop 12, MG Road, Andheri West, Mumbai"
     - **Contact**: "Rajesh Sharma"
     - **Phone**: "+91-9876500001"
     - **Issue Type**: Select "Device Malfunction"
     - **Priority**: Select "High"
     - **Description**: "POS terminal showing 'Card Reader Error' message. Customer transactions failing."

4. **Add GPS Location**
   - Click "Set Location" button
   - Either:
     - Allow browser location access, OR
     - Manually enter: Lat: 19.1234, Lng: 72.8567

5. **Select Device (if applicable)**
   - Search for device by serial number
   - Or select from bank's device list

6. **Submit Ticket**
   - Review all information
   - Click "Create Ticket"
   - Note the ticket number (e.g., TKT2024031)

7. **Assign Engineer**
   - Click on the newly created ticket
   - Click "Assign Engineer"
   - Select "Rajesh Kumar" (Mumbai region)
   - Add assignment note: "High priority - merchant has high transaction volume"
   - Click "Assign"

### Expected Results
- ✅ Ticket created with status "pending"
- ✅ Ticket status changes to "assigned" after engineer assignment
- ✅ Engineer receives notification
- ✅ Ticket appears in engineer's dashboard

---

## WORKFLOW 2: Engineer Views and Accepts Ticket

**Goal**: Engineer logs in and accepts an assigned ticket

### Steps

1. **Login as Engineer**
   - Logout from admin account
   - Login with: `test` / `test`
   - Or use engineer email from test data

2. **View Dashboard**
   - Dashboard shows:
     - Assigned tickets count
     - Today's schedule
     - Pending tasks

3. **View Assigned Tickets**
   - Click "My Tickets" or navigate to assigned tickets list
   - Find the ticket assigned in Workflow 1

4. **Review Ticket Details**
   - Click on the ticket to open details
   - Review:
     - Merchant information
     - Issue description
     - Priority level
     - Location on map

5. **Accept Assignment**
   - Click "Accept" button
   - Confirm acceptance
   - Ticket status changes to "in_progress"

6. **View on Map**
   - Click "Navigate" or map icon
   - Opens Google Maps with merchant location

### Expected Results
- ✅ Engineer can see all assigned tickets
- ✅ Ticket details display correctly
- ✅ Status updates to "in_progress"
- ✅ Navigation to merchant location works

---

## WORKFLOW 3: Engineer Arrives and Diagnoses Issue

**Goal**: Engineer arrives at location, documents arrival, and diagnoses the issue

### Steps

1. **Mark Arrival**
   - Open the ticket in mobile view
   - Click "Check In" or "Arrived"
   - Allow location access for GPS verification
   - System records arrival time and location

2. **Document Site Conditions**
   - Take photo of merchant premises
   - Click "Add Photo" → "Installation Site"
   - Capture and upload image

3. **Inspect Device**
   - Locate the POS terminal
   - Note the serial number
   - Verify it matches ticket information

4. **Document Device Condition**
   - Take photo of device
   - Click "Add Photo" → "Device Condition"
   - Note any visible damage

5. **Run Diagnostics**
   - Check device connectivity
   - Test card reader
   - Review error logs if accessible

6. **Record Diagnosis**
   - Click "Add Diagnosis"
   - Select issue type: "Card Reader Failure"
   - Add notes: "Card reader sensor damaged. Requires replacement unit."
   - Recommend action: "Device Replacement"

### Expected Results
- ✅ Check-in time recorded
- ✅ GPS coordinates captured
- ✅ Photos uploaded to correct ticket
- ✅ Diagnosis saved with timestamp

---

## WORKFLOW 4: Engineer Performs Installation/Repair

**Goal**: Complete the device installation or repair

### Steps

1. **Request Replacement Device (if needed)**
   - Click "Request Device"
   - Select device type: "Verifone VX520"
   - Source: "Warehouse Stock" or "Swap from Inventory"

2. **Document Old Device Removal**
   - Take photo of old device
   - Record old serial number
   - Update device status to "faulty"

3. **Install New Device**
   - Unbox new terminal
   - Connect to power and network
   - Configure merchant settings

4. **Document Installation**
   - Take photo of installed device
   - Take photo of cable connections
   - Record new serial number

5. **Test New Device**
   - Run test transaction
   - Verify receipt printing
   - Test card reader (chip, swipe, contactless)

6. **Update Inventory**
   - Mark old device as "returned/faulty"
   - Mark new device as "installed"
   - System updates stock automatically

### Expected Results
- ✅ Old device marked as faulty
- ✅ New device status = "installed"
- ✅ Stock movement records created
- ✅ Installation photos attached

---

## WORKFLOW 5: Engineer Collects Customer Signature

**Goal**: Get merchant confirmation and signature

### Steps

1. **Review Work Summary**
   - Open completion form
   - Verify all work items listed
   - Check device serial numbers

2. **Present to Merchant**
   - Show work summary on device
   - Explain what was done
   - Confirm satisfaction

3. **Collect Signature**
   - Click "Collect Signature"
   - Hand device to merchant
   - Merchant signs on screen
   - Save signature

4. **Add Customer Feedback**
   - Ask for feedback
   - Record rating (1-5 stars)
   - Note any comments

### Expected Results
- ✅ Digital signature captured
- ✅ Signature attached to ticket
- ✅ Feedback recorded

---

## WORKFLOW 6: Engineer Completes Ticket

**Goal**: Finalize and close the service ticket

### Steps

1. **Complete Checklist**
   - ✅ Issue diagnosed
   - ✅ Solution implemented
   - ✅ Device tested
   - ✅ Photos uploaded
   - ✅ Signature collected

2. **Add Final Notes**
   - Click "Add Resolution Notes"
   - Enter: "Replaced faulty VX520 unit (S/N: VER001) with new unit (S/N: VER051). Tested successfully. Merchant satisfied."

3. **Submit for Completion**
   - Click "Complete Ticket"
   - Confirm all required fields
   - Submit

4. **Auto-Generated Records**
   - System creates completion timestamp
   - Engineer metrics updated
   - Inventory adjusted

### Expected Results
- ✅ Ticket status = "completed"
- ✅ Completion time recorded
- ✅ Engineer performance metrics updated
- ✅ Device history updated

---

## WORKFLOW 7: Admin Reviews Completed Tickets

**Goal**: Admin reviews and approves completed work

### Steps

1. **Login as Admin**
   - Login with: `admin` / `admin`

2. **View Completed Tickets**
   - Navigate to Tickets → Filter by "Completed"
   - Or view completion queue

3. **Review Ticket Details**
   - Click on completed ticket
   - Review:
     - Timeline of events
     - Photos uploaded
     - Diagnosis and resolution
     - Customer signature
     - Engineer notes

4. **Verify Documentation**
   - Check all photos are clear
   - Verify serial numbers match
   - Confirm work was appropriate

5. **Approve or Request Changes**
   - If satisfactory: Click "Approve"
   - If issues: Click "Request Revision" with notes

### Expected Results
- ✅ Full ticket history visible
- ✅ All photos viewable
- ✅ Approval/rejection recorded

---

## WORKFLOW 8: Admin Manages Inventory

**Goal**: View and manage POS device inventory

### Steps

1. **View Inventory Dashboard**
   - Navigate to "Inventory" or "Devices"
   - View summary by status

2. **Filter Devices**
   - By status: warehouse, issued, installed, faulty
   - By bank
   - By region
   - By device model

3. **View Device Details**
   - Click on any device
   - See full history:
     - Stock movements
     - Assignment history
     - Service history

4. **Transfer Device**
   - Select device in "warehouse" status
   - Click "Issue to Engineer"
   - Select engineer
   - Add notes
   - Confirm transfer

5. **View Stock Alerts**
   - Navigate to "Alerts"
   - View low stock warnings
   - View devices needing attention

### Expected Results
- ✅ Accurate inventory counts
- ✅ Stock movements tracked
- ✅ Low stock alerts displayed

---

## WORKFLOW 9: Generate Reports

**Goal**: Generate various operational reports

### Steps

1. **Access Reports**
   - Navigate to "Reports" section

2. **Engineer Performance Report**
   - Select "Engineer Performance"
   - Choose date range
   - Select engineers (all or specific)
   - Generate report showing:
     - Tickets completed
     - Average resolution time
     - Customer ratings

3. **Device Status Report**
   - Select "Device Inventory"
   - Filter by bank/region
   - Generate showing:
     - Devices by status
     - Age of installations
     - Faulty device trends

4. **Ticket Analysis Report**
   - Select "Ticket Analysis"
   - Choose date range
   - Generate showing:
     - Tickets by status
     - Average time to resolve
     - Common issue types

5. **Export Report**
   - Click "Export"
   - Choose format (PDF/Excel)
   - Download file

### Expected Results
- ✅ Reports generate correctly
- ✅ Data matches expectations
- ✅ Export works

---

## WORKFLOW 10: Handle Escalation

**Goal**: Escalate and resolve complex issues

### Steps

1. **Identify Escalation Need**
   - Engineer encounters issue beyond capability
   - Or ticket exceeds SLA

2. **Escalate Ticket**
   - Open ticket
   - Click "Escalate"
   - Select reason:
     - "Complex technical issue"
     - "Customer complaint"
     - "Parts unavailable"
   - Add detailed notes
   - Submit

3. **Admin Reviews Escalation**
   - Login as admin
   - View escalated tickets queue
   - Review escalation reason

4. **Take Action**
   - Reassign to senior engineer, OR
   - Arrange special parts, OR
   - Contact customer directly

5. **Resolve Escalation**
   - Update ticket with resolution
   - Close escalation
   - Return to normal workflow

### Expected Results
- ✅ Escalation recorded with reason
- ✅ Admin notified
- ✅ Escalation history maintained

---

## Test Data Shortcuts

### Quick Access Tickets

| Ticket ID | Status | Description |
|-----------|--------|-------------|
| TKT2024001 | pending | New ticket for testing assignment |
| TKT2024011 | assigned | Ready for engineer acceptance |
| TKT2024019 | in_progress | Active work in progress |
| TKT2024024 | completed | Finished ticket with photos |
| TKT2024029 | escalated | Escalation testing |

### Quick Access Devices

| Serial | Status | Location |
|--------|--------|----------|
| ING001 | warehouse | Mumbai Warehouse |
| VER010 | issued | With Rajesh Kumar |
| PAX020 | installed | HDFC Merchant |
| ING005 | faulty | Awaiting repair |

---

## Troubleshooting

### Cannot Login
- Check username/password
- Try frontend accounts: admin/admin, test/test
- Clear browser cache

### Ticket Not Saving
- Check all required fields
- Verify GPS coordinates format
- Check network connection

### Photos Not Uploading
- Check file size (max 5MB)
- Verify image format (JPG, PNG)
- Check storage permissions

### Map Not Loading
- Verify Google Maps API key
- Check GPS coordinates are valid
- Ensure internet connection

---

## Performance Testing

### Load Test Scenarios

1. **Create 50 tickets in 5 minutes**
   - Tests: Database writes, validation

2. **Assign tickets to all engineers simultaneously**
   - Tests: Concurrent updates, notifications

3. **Upload 100 photos across different tickets**
   - Tests: Storage, image processing

4. **Generate all reports for full date range**
   - Tests: Query performance, data aggregation
