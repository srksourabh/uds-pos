-- =====================================================
-- UDS-POS SCHEMA DIAGNOSTIC QUERY
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- Copy the results and share them to diagnose seed data issues
-- =====================================================

-- 1. Check all public tables
SELECT '=== ALL PUBLIC TABLES ===' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check photos table structure (if exists)
SELECT '=== PHOTOS TABLE COLUMNS ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'photos'
ORDER BY ordinal_position;

-- 3. Check stock_alerts table structure (if exists)
SELECT '=== STOCK_ALERTS TABLE COLUMNS ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'stock_alerts'
ORDER BY ordinal_position;

-- 4. Check engineer_aggregates table structure (if exists)
SELECT '=== ENGINEER_AGGREGATES TABLE COLUMNS ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'engineer_aggregates'
ORDER BY ordinal_position;

-- 5. Check devices table structure
SELECT '=== DEVICES TABLE COLUMNS ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'devices'
ORDER BY ordinal_position;

-- 6. Check calls table structure
SELECT '=== CALLS TABLE COLUMNS ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'calls'
ORDER BY ordinal_position;

-- 7. Check warehouses table structure
SELECT '=== WAREHOUSES TABLE COLUMNS ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'warehouses'
ORDER BY ordinal_position;

-- 8. Check couriers table structure
SELECT '=== COURIERS TABLE COLUMNS ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'couriers'
ORDER BY ordinal_position;

-- 9. Check auth users (first 5)
SELECT '=== AUTH USERS (first 5) ===' as info;
SELECT id, email, created_at
FROM auth.users
LIMIT 5;

-- 10. Current row counts
SELECT '=== CURRENT ROW COUNTS ===' as info;
SELECT
  (SELECT COUNT(*) FROM banks) as banks,
  (SELECT COUNT(*) FROM user_profiles) as user_profiles,
  (SELECT COUNT(*) FROM devices) as devices,
  (SELECT COUNT(*) FROM calls) as calls;
