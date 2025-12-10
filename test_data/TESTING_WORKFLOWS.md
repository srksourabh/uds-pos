# UDS-POS Testing Workflows Guide

This guide provides step-by-step testing instructions for all major workflows in the UDS-POS Field Service Management system.

## Quick Start

1. Start the development server: `npm run dev`
2. Open http://localhost:5173
3. Login with: `admin` / `admin`

---

## Application Routes Reference

### Admin Routes (require admin role)
- `/dashboard` - Main dashboard with metrics
- `/calls` - Service tickets list
- `/calls/:id` - Ticket detail view
- `/devices` - Device inventory management
- `/stock` - Stock overview
- `/stock-movements` - Inventory transaction history
- `/receive-stock` - Receive new stock
- `/in-transit` - Devices in transit
- `/alerts` - Stock alerts and notifications
- `/reports` - Performance reports (admin only)
- `/engineers` - Engineer management (admin only)
- `/banks` - Bank management (admin only)
- `/approvals` - User approvals (admin only)
- `/users` - User management (admin only)

### Mobile/Engineer Routes
- `/mobile/login` - Engineer mobile login
- `/mobile/calls` - Engineer's assigned calls
- `/mobile/calls/:id` - Call detail view
- `/mobile/calls/:id/scan` - Device scanning
- `/mobile/calls/:id/complete` - Call completion flow
- `/mobile/inventory` - Engineer's inventory
- `/mobile/photos/:id` - Photo capture
- `/mobile/install/:id` - Installation flow

---

## WORKFLOW 1: Admin Creates and Assigns Ticket

**Goal**: Create a new service ticket and assign it to an engineer

### Steps

1. **Login as Admin**
   - Navigate to http://localhost:5173
   - Enter username: `admin`
   - Enter password: `admin`
   - Click "Sign In"

2. **Navigate to Calls**
   - From the dashboard, click "Calls" in the sidebar
   - Or navigate to `/calls`

3. **Create New Ticket**
   - Click "New Call" or "+" button
   - Fill in the form:
     - **Bank**: Select "HDFC Bank"
     - **Client Name**: "Test Merchant"
     - **Address**: "123 Test Street, Mumbai"
     - **Contact**: "Test Contact"
     - **Phone**: "+91-9876543210"
     - **Call Type**: Select "breakdown"
     - **Priority**: Select "high"
     - **Description**: "POS terminal showing 'Card Reader Error' message"

4. **Add GPS Location**
   - Click "Set Location" or use the map picker
   - Either:
     - Allow browser location access, OR
     - Manually enter: Lat: 19.1234, Lng: 72.8567

5. **Submit Ticket**
   - Review all information
   - Click "Create" or "Submit"
   - Note the ticket number (e.g., TKT2024031)

6. **Assign Engineer**
   - Click on the newly created ticket in the list
   - Click "Assign" or "Assign Engineer"
   - Select "Rajesh Kumar" (Mumbai region)
   - Add assignment note if needed
   - Click "Confirm Assignment"

### Expected Results
- Ticket created with status "pending"
- Ticket status changes to "assigned" after engineer assignment
- Ticket appears in Rajesh's mobile app

---

## WORKFLOW 2: Engineer Views and Accepts Ticket

**Goal**: Engineer logs in and views assigned tickets

### Steps

1. **Login as Engineer (Mobile View)**
   - Navigate to http://localhost:5173/mobile/login
   - Login with: `test` / `test`
   - Or use: `rajesh@uds.com` / `Engineer@123`

2. **View Assigned Calls**
   - After login, you'll see `/mobile/calls`
   - Dashboard shows assigned tickets
   - Filter by status if needed

3. **View Call Details**
   - Click on an assigned ticket (e.g., TKT2024011)
   - Opens `/mobile/calls/{id}`
   - Review:
     - Merchant information
     - Issue description
     - Priority level
     - Location on map

4. **View Location**
   - Click "Navigate" or map icon
   - Opens Google Maps with merchant location

### Expected Results
- Engineer sees all assigned tickets
- Ticket details display correctly
- Navigation to merchant location works

---

## WORKFLOW 3: Engineer Starts Work on Ticket

**Goal**: Engineer arrives at location and begins work

### Steps

1. **Update Status to In Progress**
   - Open ticket detail `/mobile/calls/{id}`
   - Click "Start Work" or "Begin"
   - Status changes to "in_progress"

2. **Check In at Location**
   - Allow location access for GPS verification
   - System records arrival time and coordinates

3. **Scan Device (if applicable)**
   - Navigate to `/mobile/calls/{id}/scan`
   - Use camera to scan device serial/QR code
   - Or manually enter serial number

4. **Take Before Photos**
   - Navigate to `/mobile/photos/{id}`
   - Select "Before" photo type
   - Capture device condition
   - Add caption if needed

### Expected Results
- Status updated to "in_progress"
- Check-in time recorded
- GPS coordinates captured
- Photos uploaded successfully

---

## WORKFLOW 4: Engineer Completes Ticket

**Goal**: Finalize and close the service ticket

### Steps

1. **Navigate to Completion Flow**
   - From call detail, click "Complete Call"
   - Opens `/mobile/calls/{id}/complete`

2. **Add Resolution Details**
   - Select resolution type
   - Enter notes: "Replaced card reader module. Tested successfully."
   - Select parts used (if any)

3. **Take After Photos**
   - Capture device after repair
   - Add "After" photo type
   - Optional: Photo of replaced parts

4. **Collect Customer Signature**
   - Customer signs on screen
   - Save signature

5. **Submit Completion**
   - Review all information
   - Click "Complete" or "Submit"

### Expected Results
- Ticket status = "completed"
- Completion time recorded
- Photos and signature attached
- Stock/parts usage recorded

---

## WORKFLOW 5: Admin Reviews Dashboard

**Goal**: Admin views system overview and metrics

### Steps

1. **Login as Admin**
   - Navigate to http://localhost:5173/login
   - Login with: `admin` / `admin`

2. **View Dashboard** (`/dashboard`)
   - See ticket counts by status
   - View pending/assigned/completed metrics
   - Check alerts and notifications

3. **View Calls List** (`/calls`)
   - Filter by status: pending, assigned, in_progress, completed
   - Filter by priority
   - Filter by bank
   - Search by ticket number or merchant

4. **View Ticket Details** (`/calls/{id}`)
   - Full timeline of events
   - Photos uploaded
   - Engineer notes
   - Device information

### Expected Results
- Dashboard shows accurate counts
- Filters work correctly
- Ticket history is complete

---

## WORKFLOW 6: Admin Manages Inventory

**Goal**: View and manage POS device inventory

### Steps

1. **View Stock Overview** (`/stock`)
   - See devices by status
   - View by bank/model
   - Check warehouse inventory

2. **View Device Details** (`/devices`)
   - Filter by status: warehouse, issued, installed, faulty
   - Filter by bank
   - Filter by model
   - Search by serial number

3. **View Stock Movements** (`/stock-movements`)
   - See all device transfers
   - Filter by movement type
   - Track device history

4. **Receive New Stock** (`/receive-stock`)
   - Add new devices to warehouse
   - Enter serial numbers
   - Select bank and model

5. **View Alerts** (`/alerts`)
   - Low stock warnings
   - Warranty expiring alerts
   - Maintenance due alerts

### Expected Results
- Accurate inventory counts
- Stock movements tracked
- Alerts displayed correctly

---

## WORKFLOW 7: Admin Manages Engineers

**Goal**: View and manage field engineers

### Steps

1. **Navigate to Engineers** (`/engineers`)
   - View all engineers
   - See their status and region
   - Check assigned calls count

2. **View Engineer Details**
   - Click on an engineer
   - See their assigned calls
   - View performance metrics
   - Check current location (if available)

3. **Manage User Approvals** (`/approvals`)
   - View pending user registrations
   - Approve or reject users
   - Assign roles

4. **User Management** (`/users`)
   - View all users
   - Edit user roles
   - Deactivate users

### Expected Results
- Engineer list accurate
- Performance data available
- Approvals work correctly

---

## WORKFLOW 8: Generate Reports

**Goal**: Generate various operational reports

### Steps

1. **Access Reports** (`/reports`)
   - Admin only route

2. **View Available Reports**
   - Engineer Performance
   - Device Inventory
   - Ticket Analysis
   - Stock Movements

3. **Generate Report**
   - Select date range
   - Choose filters (bank, engineer, etc.)
   - Click "Generate"

4. **Export Report**
   - Click "Export"
   - Download as PDF or Excel

### Expected Results
- Reports generate correctly
- Data matches expectations
- Export works

---

## Test Data Quick Reference

### Quick Access Tickets

| Ticket | Status | Description |
|--------|--------|-------------|
| TKT2024001 | pending | Sharma Electronics - printer issue |
| TKT2024011 | assigned | Kapoor Mobiles - touchscreen |
| TKT2024019 | in_progress | Fashion Hub - connectivity |
| TKT2024024 | completed | Royal Sweets - keypad |
| TKT2024029 | escalated | Luxury Watches - security alert |

### Quick Access Devices

| Serial | Status | Location |
|--------|--------|----------|
| ING-2024-00001 | warehouse | Mumbai Warehouse |
| ING-2023-10001 | issued | With Rajesh Kumar |
| ING-2022-20001 | installed | Sharma Electronics |
| ING-2021-30001 | faulty | Repair Section |

### Test Credentials Summary

| Account | Login | Password | Access |
|---------|-------|----------|--------|
| Admin (Frontend) | admin | admin | Full admin |
| Engineer (Frontend) | test | test | Engineer |
| Admin (Supabase) | admin@uds.com | Admin@123 | Full admin |
| Engineer (Supabase) | rajesh@uds.com | Engineer@123 | Engineer |

---

## Mobile App Testing

### Testing on Mobile Device

1. Start dev server: `npm run dev`
2. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Access from mobile: `http://{your-ip}:5173/mobile/login`

### Mobile Routes to Test

1. `/mobile/login` - Login page
2. `/mobile/calls` - Call list
3. `/mobile/calls/{id}` - Call detail
4. `/mobile/calls/{id}/scan` - Device scanning
5. `/mobile/calls/{id}/complete` - Completion flow
6. `/mobile/inventory` - Inventory view

---

## Troubleshooting

### Cannot Login
- Check username/password
- Try frontend accounts: admin/admin, test/test
- Clear browser cache
- Check if `VITE_ENABLE_TEST_ACCOUNTS=true` in `.env`

### Ticket Not Saving
- Check all required fields
- Verify GPS coordinates format
- Check network connection
- Check browser console for errors

### Photos Not Uploading
- Check file size (max 5MB)
- Verify image format (JPG, PNG)
- Check storage permissions
- Verify Supabase storage bucket exists

### Map Not Loading
- Verify Google Maps API key in `.env`
- Check GPS coordinates are valid
- Ensure internet connection

### Data Not Appearing
- Run verification queries from DATA_VERIFICATION_REPORT.md
- Check if seed_test_data.sql ran successfully
- Verify Supabase connection in browser console
