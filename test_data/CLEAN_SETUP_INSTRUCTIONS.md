# Clean Schema Setup Instructions

## Purpose
This script resolves all schema conflicts by dropping problematic tables and recreating them with a consistent, simplified schema.

## What This Script Does

### 1. Drops Conflicting Tables
- `photos` - Had multiple schema versions
- `stock_alerts` - Had column mismatches
- `engineer_aggregates` - Had simple vs complex versions

### 2. Creates Core Tables (if not exist)
- `banks`
- `user_profiles`
- `devices`
- `calls`
- `call_devices`
- `warehouses`
- `couriers`
- `stock_movements`

### 3. Creates Simplified Conflict Tables
New consistent versions of:
- `photos` - with `call_id`, `device_id`, `uploaded_by`, `photo_type`, `photo_url`, `notes`, `metadata`
- `stock_alerts` - with `alert_type`, `severity`, `status`, `bank_id`, `device_id`, `call_id`, `message`, `details`
- `engineer_aggregates` - with basic metrics: `engineer_id`, `total_calls_completed`, `total_calls_assigned`, etc.

### 4. Adds Performance Indexes
Indexes on frequently queried columns for faster lookups.

### 5. Enables Row Level Security
RLS enabled on all tables with basic read policies.

## How to Run

### Step 1: Backup (Optional but Recommended)
If you have existing data you want to keep, export it first from Supabase Dashboard.

### Step 2: Run the Script
1. Go to Supabase Dashboard > SQL Editor
2. Copy entire contents of `01_clean_schema_setup.sql`
3. Paste and click **Run**

### Step 3: Verify Success
You should see: `Schema setup completed successfully!`

### Step 4: Run Seed Data
After schema setup succeeds, run the updated `seed_test_data.sql` to populate test data.

## Order of Execution

```
1. 01_clean_schema_setup.sql  (this file - run first)
2. seed_test_data.sql         (run second - populates test data)
```

## Schema Summary

### Photos Table (New Schema)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| call_id | UUID | Reference to calls table |
| device_id | UUID | Reference to devices table |
| uploaded_by | UUID | Reference to user who uploaded |
| photo_type | TEXT | 'before', 'after', 'site', etc. |
| photo_url | TEXT | URL to photo storage |
| notes | TEXT | Optional notes |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMPTZ | Creation timestamp |

### Stock Alerts Table (New Schema)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| alert_type | TEXT | 'low_stock', 'device_overdue', etc. |
| severity | TEXT | 'info', 'warning', 'critical' |
| status | TEXT | 'active', 'acknowledged', 'resolved' |
| bank_id | UUID | Related bank |
| device_id | UUID | Related device |
| call_id | UUID | Related call |
| message | TEXT | Alert message |
| details | JSONB | Additional details |
| acknowledged_by | UUID | Who acknowledged |
| acknowledged_at | TIMESTAMPTZ | When acknowledged |
| resolved_at | TIMESTAMPTZ | When resolved |
| created_at | TIMESTAMPTZ | Creation timestamp |

### Engineer Aggregates Table (New Schema)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| engineer_id | UUID | Reference to engineer (unique) |
| total_calls_completed | INTEGER | Total completed calls |
| total_calls_assigned | INTEGER | Total assigned calls |
| active_calls_count | INTEGER | Currently active calls |
| devices_issued_count | INTEGER | Devices currently issued |
| avg_completion_time_minutes | NUMERIC | Average completion time |
| last_call_completed_at | TIMESTAMPTZ | Last completion timestamp |
| performance_score | NUMERIC | Performance score (0-100) |
| metadata | JSONB | Additional metrics |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Troubleshooting

### Error: "permission denied"
You may need to run as a superuser or check your Supabase project permissions.

### Error: "relation already exists"
The `CREATE TABLE IF NOT EXISTS` should handle this, but if issues persist, you can manually drop the table first.

### Error: "foreign key constraint"
Make sure you're running the script in order - core tables must exist before conflict tables can reference them.
