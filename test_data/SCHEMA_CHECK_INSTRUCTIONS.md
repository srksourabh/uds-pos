# Schema Check Instructions

## Purpose
The seed data SQL script is failing due to schema mismatches between the migration files and the actual deployed database. We need to check what schema is actually deployed.

## Steps

### Step 1: Copy the SQL
Open the file `check_actual_schema.sql` in this folder and copy its entire contents.

### Step 2: Run in Supabase
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Paste the entire SQL script
4. Click **Run**

### Step 3: Save Results
The query will return multiple result sets showing:
- All tables in your public schema
- Column details for conflicting tables (photos, stock_alerts, engineer_aggregates)
- Column details for core tables (devices, calls, warehouses, couriers)
- Auth users list
- Current row counts

### Step 4: Share Results
Copy/paste the results back so we can:
1. Identify which schema version is deployed
2. Update the seed data SQL to match your actual schema
3. Successfully seed test data

## What We're Looking For

### Photos Table
- **Version A columns**: `call_id`, `device_id`, `uploaded_by`, `storage_path`, `file_size`, `mime_type`
- **Version B columns**: `related_call`, `related_device`, `photo_url`, `notes`

### Stock Alerts Table
- **Version A columns**: `message`, `details` (JSONB)
- **Version B columns**: `title`, `message`, `threshold_value`, `current_value`, `metadata`

### Engineer Aggregates Table
- **Version A (simple)**: `engineer_id` as PRIMARY KEY, basic metrics
- **Version B (complex)**: `id` as PRIMARY KEY, `period_type`, `period_start`, `period_end`, many columns

## Quick Reference

```sql
-- Just check which tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check a specific table's columns
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'YOUR_TABLE_NAME' ORDER BY ordinal_position;
```
