# UDS-POS Test Data Setup Guide

This guide explains how to load and use the comprehensive test data for the UDS-POS Field Service Management system.

## Prerequisites

1. **Supabase Project**: Ensure you have a Supabase project set up
2. **Database Schema**: The database tables should already exist (run migrations first)
3. **Admin Access**: Access to Supabase SQL Editor or psql

## Test Data Overview

### What's Included

| Entity | Count | Description |
|--------|-------|-------------|
| Banks | 8 | Major Indian banks (SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, IndusInd) |
| Warehouses | 3 | Mumbai, Delhi, Bangalore regional warehouses |
| Couriers | 4 | Blue Dart, DTDC, FedEx India, Delhivery |
| Engineers | 5 | Field engineers across different regions |
| Devices | 50+ | POS terminals in various states |
| Service Tickets | 30 | Tickets in all workflow stages |
| Stock Movements | Multiple | Audit trail of device movements |
| Photos | Sample | Installation and issue documentation |
| Stock Alerts | Multiple | Low stock and reorder alerts |
| Notifications | Multiple | System notifications for engineers |

### Test Credentials

#### Frontend Test Accounts (No Database Required)
These work immediately in development mode:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin |
| Engineer | test | test |
| Super Admin | super | super |

#### Supabase Test Accounts (After Running SQL)
These require the database to be properly configured:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@uds.com | Admin@123 |
| Engineer | engineer@uds.com | Engineer@123 |

### Engineer Test Accounts (Created by seed_test_data.sql)

| Name | Email | Region | Phone |
|------|-------|--------|-------|
| Rajesh Kumar | rajesh.kumar@uds.com | Mumbai | +91-9876543210 |
| Priya Sharma | priya.sharma@uds.com | Delhi NCR | +91-9876543211 |
| Amit Patel | amit.patel@uds.com | Bangalore | +91-9876543212 |
| Sneha Reddy | sneha.reddy@uds.com | Hyderabad | +91-9876543213 |
| Vikram Singh | vikram.singh@uds.com | Pune | +91-9876543214 |

## Loading the Test Data

### Method 1: Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `test_data/seed_test_data.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Check the results panel for any errors

### Method 2: Using psql CLI

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the seed file
\i test_data/seed_test_data.sql
```

### Method 3: Using Supabase CLI

```bash
# Link your project
supabase link --project-ref your-project-ref

# Run the SQL file
supabase db execute -f test_data/seed_test_data.sql
```

## Data Verification

After loading, verify the data was inserted correctly:

```sql
-- Check counts
SELECT 'banks' as table_name, COUNT(*) as count FROM banks
UNION ALL
SELECT 'warehouses', COUNT(*) FROM warehouses
UNION ALL
SELECT 'couriers', COUNT(*) FROM couriers
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'devices', COUNT(*) FROM devices
UNION ALL
SELECT 'calls', COUNT(*) FROM calls
UNION ALL
SELECT 'stock_movements', COUNT(*) FROM stock_movements;
```

Expected output:
```
table_name     | count
---------------|-------
banks          | 8
warehouses     | 3
couriers       | 4
user_profiles  | 5+
devices        | 50+
calls          | 30
stock_movements| 20+
```

## GPS Coordinates

All merchant locations include real Google Maps GPS coordinates for Indian cities:

| City | Sample Coordinates |
|------|-------------------|
| Mumbai | 19.0760° N, 72.8777° E |
| Delhi | 28.6139° N, 77.2090° E |
| Bangalore | 12.9716° N, 77.5946° E |
| Hyderabad | 17.3850° N, 78.4867° E |
| Pune | 18.5204° N, 73.8567° E |
| Chennai | 13.0827° N, 80.2707° E |
| Kolkata | 22.5726° N, 88.3639° E |
| Ahmedabad | 23.0225° N, 72.5714° E |

## Device Status Distribution

The test data includes devices in all lifecycle states:

| Status | Count | Description |
|--------|-------|-------------|
| warehouse | 15+ | Available in stock |
| issued | 10+ | Assigned to engineer |
| installed | 15+ | Active at merchant |
| faulty | 5+ | Reported issues |
| returned | 3+ | Back from merchant |
| in_transit | 2+ | Being shipped |

## Ticket Status Distribution

Service tickets cover all workflow stages:

| Status | Count | Use Case |
|--------|-------|----------|
| pending | 10 | New tickets awaiting assignment |
| assigned | 8 | Assigned to engineers |
| in_progress | 5 | Engineer actively working |
| completed | 5 | Finished with documentation |
| escalated | 2 | Requires attention |

## POS Device Models

Test data includes popular POS terminal models:

- **Ingenico**: iCT250, Move/5000
- **Verifone**: VX520, VX680, V400m
- **PAX**: A920, D210, A80

## Troubleshooting

### Error: Foreign Key Constraint Violation
Ensure you run the SQL in order. The script uses CTEs and sequential inserts to handle dependencies.

### Error: Duplicate Key
The script uses `ON CONFLICT DO NOTHING` for most inserts, so re-running is safe.

### Error: Function Does Not Exist
If you get errors about missing functions like `is_admin()`, run the auth setup first:
```sql
\i migrations/auth_setup_complete.sql
```

### Error: Permission Denied
Ensure you're connected with the correct role (usually `postgres` or `service_role`).

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

## Next Steps

After loading test data:

1. **Login** using the frontend test accounts (admin/admin)
2. **Explore** the dashboard to see tickets and devices
3. **Test workflows** using the TESTING_WORKFLOWS.md guide
4. **Verify** data using the DATA_VERIFICATION_REPORT.md queries

## File Structure

```
test_data/
├── seed_test_data.sql       # Main test data SQL script
├── TEST_DATA_SETUP.md       # This file
├── TESTING_WORKFLOWS.md     # Step-by-step workflow tests
├── DATA_VERIFICATION_REPORT.md  # Data quality verification
└── photos/                  # Sample photos directory
    ├── installations/       # Installation photos
    ├── issues/             # Issue documentation
    └── signatures/         # Customer signatures
```
