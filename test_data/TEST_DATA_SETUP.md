# UDS-POS Test Data Setup Guide

This guide explains how to load and use the comprehensive test data for the UDS-POS Field Service Management system.

## Prerequisites

1. **Supabase Project**: Ensure you have a Supabase project set up
2. **Database Schema**: Run migrations first (the initial schema migration)
3. **Auth Setup**: Run `auth_setup_complete.sql` before the seed data
4. **Admin Access**: Access to Supabase SQL Editor or psql

## Test Data Overview

### What's Included

| Entity | Count | Description |
|--------|-------|-------------|
| Banks | 8 | Major Indian banks (SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, IndusInd) |
| Warehouses | 3 | Mumbai, Delhi, Bangalore regional warehouses |
| Couriers | 4 | Blue Dart, DTDC, FedEx India, Delhivery |
| Engineers | 5 | Field engineers across different regions |
| Devices | 50+ | POS terminals in various states (warehouse, issued, installed, faulty) |
| Service Tickets | 30 | Tickets in all workflow stages |
| Stock Movements | 20+ | Audit trail of device movements |
| Photos | 15+ | Installation and issue documentation (placeholder URLs) |
| Stock Alerts | 7 | Low stock, maintenance due, and other alerts |
| Notifications | 8+ | System notifications for engineers and admin |
| Engineer Aggregates | 10+ | Performance metrics (daily and monthly) |

---

## Test Credentials

### Frontend Test Accounts (Development Mode)
These work immediately without database setup when `VITE_ENABLE_TEST_ACCOUNTS=true`:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin |
| Engineer | test | test |
| Super Admin | super | super |

### Supabase Test Accounts (After Running SQL)
These require the database to be properly seeded:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@uds.com | Admin@123 |

### Engineer Test Accounts

| Name | Email | Password | Region | Specialization |
|------|-------|----------|--------|----------------|
| Rajesh Kumar | rajesh@uds.com | Engineer@123 | Mumbai | POS Installation, Ingenico Certified |
| Priya Singh | priya@uds.com | Engineer@123 | Delhi NCR | Network Expert, Verifone/PAX Certified |
| Amit Patel | amit@uds.com | Engineer@123 | Bangalore | Hardware Repair, Soldering |
| Sneha Reddy | sneha@uds.com | Engineer@123 | Hyderabad | Software Troubleshooting, Firmware Updates |
| Vikram Joshi | vikram@uds.com | Engineer@123 | Pune | General Technician, Multi-brand Expert |

---

## Loading the Test Data

### Step 1: Run Auth Setup (if not done)

First, ensure the authentication setup is complete:

```sql
-- Run auth_setup_complete.sql first
\i supabase/migrations/auth_setup_complete.sql
```

### Step 2: Load Seed Data

#### Method 1: Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `test_data/seed_test_data.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Check the Messages/Notices panel for the summary output

#### Method 2: Using psql CLI

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the seed file
\i test_data/seed_test_data.sql
```

#### Method 3: Using Supabase CLI

```bash
# Link your project
supabase link --project-ref your-project-ref

# Run the SQL file
supabase db execute -f test_data/seed_test_data.sql
```

---

## Data Verification

After loading, verify the data was inserted correctly:

```sql
-- Quick count verification
SELECT 'banks' as table_name, COUNT(*) as count FROM banks
UNION ALL SELECT 'warehouses', COUNT(*) FROM warehouses
UNION ALL SELECT 'couriers', COUNT(*) FROM couriers
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'devices', COUNT(*) FROM devices
UNION ALL SELECT 'calls', COUNT(*) FROM calls
UNION ALL SELECT 'stock_movements', COUNT(*) FROM stock_movements
UNION ALL SELECT 'photos', COUNT(*) FROM photos
UNION ALL SELECT 'stock_alerts', COUNT(*) FROM stock_alerts;
```

### Expected Results

| Table | Minimum Count |
|-------|---------------|
| banks | 8 |
| warehouses | 3 |
| couriers | 4 |
| user_profiles | 5+ |
| devices | 50+ |
| calls | 30 |
| stock_movements | 20+ |
| photos | 15+ |
| stock_alerts | 7 |

---

## Test Data Details

### Merchants (15 Real Indian Businesses)

| Business | Location | Bank | Device Model |
|----------|----------|------|--------------|
| Sharma Electronics | Connaught Place, Delhi | SBI | Ingenico iCT250 |
| Khan General Store | Andheri West, Mumbai | SBI | Ingenico iCT250 |
| Gupta Supermart | Koramangala, Bangalore | HDFC | Verifone VX520 |
| Singh Medical | Karol Bagh, Delhi | ICICI | Verifone VX680 |
| Reddy Restaurant | Banjara Hills, Hyderabad | Axis | PAX A920 |
| Patel Hardware | CG Road, Ahmedabad | Kotak | PAX D210 |
| Verma Jewellers | Chandni Chowk, Delhi | PNB | Ingenico Move5000 |
| Desai Textiles | Ring Road, Surat | BOB | Verifone V400m |
| Nair Bakery | MG Road, Kochi | IndusInd | PAX A80 |
| Mehta Pharmacy | FC Road, Pune | SBI | Ingenico Desk5000 |
| Iyer Provisions | T Nagar, Chennai | HDFC | Verifone VX675 |
| Kapoor Mobiles | Sector 18, Noida | ICICI | PAX A920 |
| Saxena Garments | Commercial Street, Bangalore | Axis | Ingenico iCT250 |
| Agarwal Sweets | Salt Lake, Kolkata | Kotak | Verifone VX520 |
| Bhatia Opticals | Lajpat Nagar, Delhi | PNB | PAX D210 |

### GPS Coordinates by City

| City | Sample Coordinates |
|------|-------------------|
| Mumbai | 19.0760° N, 72.8777° E |
| Delhi NCR | 28.6139° N, 77.2090° E |
| Bangalore | 12.9716° N, 77.5946° E |
| Hyderabad | 17.3850° N, 78.4867° E |
| Pune | 18.5204° N, 73.8567° E |
| Chennai | 13.0827° N, 80.2707° E |
| Kolkata | 22.5726° N, 88.3639° E |
| Ahmedabad | 23.0225° N, 72.5714° E |
| Surat | 21.1702° N, 72.8311° E |
| Kochi | 9.9816° N, 76.2999° E |

### Device Status Distribution

| Status | Count | Description |
|--------|-------|-------------|
| warehouse | 20 | Available in stock at warehouses |
| issued | 10 | Assigned to engineers for installation |
| installed | 15 | Active at merchant locations |
| faulty | 5 | Reported issues, awaiting repair |

### Ticket Status Distribution

| Status | Count | Use Case |
|--------|-------|----------|
| pending | 10 | New tickets awaiting assignment |
| assigned | 8 | Assigned to engineers, not started |
| in_progress | 5 | Engineer actively working |
| completed | 5 | Finished with documentation |
| escalated | 2 | Requires admin attention |

### POS Device Models

Test data includes popular POS terminal models:
- **Ingenico**: iCT250, Move5000, Desk5000
- **Verifone**: VX520, VX680, V400m, VX675
- **PAX**: A920, D210, A80

---

## Troubleshooting

### Error: Foreign Key Constraint Violation
Ensure you run the SQL in order. The script uses `ON CONFLICT DO NOTHING` for safe re-running.

### Error: Duplicate Key
The script handles duplicates gracefully with `ON CONFLICT` clauses. Re-running is safe.

### Error: Function Does Not Exist
If you get errors about missing functions like `is_admin()`, run the auth setup first:
```sql
\i migrations/auth_setup_complete.sql
```

### Error: Permission Denied
Ensure you're connected with the correct role (usually `postgres` or `service_role`).

### Engineers Not Created
If engineers fail to create, check if auth.users table exists and RLS is properly configured.

---

## Resetting Test Data

To reset and reload test data:

```sql
-- WARNING: This deletes all data!
TRUNCATE TABLE
  notifications,
  stock_alerts,
  engineer_aggregates,
  photos,
  stock_movements,
  call_devices,
  call_history,
  calls,
  devices,
  shipments,
  couriers,
  warehouses,
  user_profiles,
  banks
CASCADE;

-- Then reload
\i test_data/seed_test_data.sql
```

---

## Next Steps

After loading test data:

1. **Start Development Server**: `npm run dev`
2. **Login**: Use frontend test accounts (admin/admin) or Supabase accounts
3. **Explore Dashboard**: View tickets, devices, and inventory
4. **Test Workflows**: Follow the TESTING_WORKFLOWS.md guide
5. **Verify Data**: Run queries from DATA_VERIFICATION_REPORT.md

---

## File Structure

```
test_data/
├── seed_test_data.sql          # Main test data SQL script
├── TEST_DATA_SETUP.md          # This file
├── TESTING_WORKFLOWS.md        # Step-by-step workflow tests
└── DATA_VERIFICATION_REPORT.md # Data quality verification queries

public/test-photos/
├── before/                     # Before repair photos
├── after/                      # After repair photos
├── parts/                      # Replaced parts photos
├── signatures/                 # Customer signatures
└── installations/              # Installation site photos
```
