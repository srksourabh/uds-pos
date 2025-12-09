# UDS-POS Test Data Verification Report

This document provides SQL queries and expected results to verify the test data was loaded correctly.

## Quick Verification

Run this single query to get an overview:

```sql
SELECT 'banks' as entity, COUNT(*) as count FROM banks
UNION ALL SELECT 'warehouses', COUNT(*) FROM warehouses
UNION ALL SELECT 'couriers', COUNT(*) FROM couriers
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'devices', COUNT(*) FROM devices
UNION ALL SELECT 'calls (tickets)', COUNT(*) FROM calls
UNION ALL SELECT 'call_devices', COUNT(*) FROM call_devices
UNION ALL SELECT 'stock_movements', COUNT(*) FROM stock_movements
UNION ALL SELECT 'photos', COUNT(*) FROM photos
UNION ALL SELECT 'stock_alerts', COUNT(*) FROM stock_alerts
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'engineer_aggregates', COUNT(*) FROM engineer_aggregates
ORDER BY entity;
```

### Expected Results

| Entity | Minimum Count |
|--------|---------------|
| banks | 8 |
| warehouses | 3 |
| couriers | 4 |
| user_profiles | 5 |
| devices | 50 |
| calls (tickets) | 30 |
| call_devices | 30 |
| stock_movements | 20 |
| photos | 15 |
| stock_alerts | 5 |
| notifications | 10 |
| engineer_aggregates | 5 |

---

## Detailed Verification Queries

### 1. Banks Verification

```sql
SELECT
  name,
  code,
  active,
  contact_email,
  CASE WHEN contact_phone IS NOT NULL THEN '✅' ELSE '❌' END as has_phone,
  CASE WHEN address IS NOT NULL THEN '✅' ELSE '❌' END as has_address
FROM banks
ORDER BY name;
```

**Expected**: 8 banks (SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, IndusInd)

### 2. Warehouses Verification

```sql
SELECT
  name,
  code,
  address,
  CONCAT(latitude, ', ', longitude) as coordinates,
  manager_name,
  active
FROM warehouses
ORDER BY name;
```

**Expected**: 3 warehouses (Mumbai, Delhi, Bangalore)

### 3. Couriers Verification

```sql
SELECT
  name,
  code,
  tracking_url_template,
  active
FROM couriers
ORDER BY name;
```

**Expected**: 4 couriers (Blue Dart, DTDC, FedEx, Delhivery)

### 4. Engineers Verification

```sql
SELECT
  full_name,
  email,
  phone,
  role,
  region,
  status,
  (SELECT name FROM banks WHERE id = user_profiles.bank_id) as bank
FROM user_profiles
WHERE role = 'engineer'
ORDER BY full_name;
```

**Expected**: 5 engineers (Rajesh, Priya, Amit, Sneha, Vikram)

### 5. Devices by Status

```sql
SELECT
  status,
  COUNT(*) as count,
  COUNT(DISTINCT bank_id) as banks,
  COUNT(DISTINCT model) as models
FROM devices
GROUP BY status
ORDER BY count DESC;
```

**Expected Distribution**:
| Status | Approx Count |
|--------|--------------|
| warehouse | 15+ |
| installed | 15+ |
| issued | 10+ |
| faulty | 5+ |
| returned | 3+ |
| in_transit | 2+ |

### 6. Devices by Model

```sql
SELECT
  model,
  COUNT(*) as count,
  COUNT(DISTINCT status) as status_variety
FROM devices
GROUP BY model
ORDER BY count DESC;
```

**Expected Models**:
- Ingenico iCT250
- Verifone VX520
- Verifone VX680
- PAX A920
- PAX D210
- Verifone V400m
- PAX A80

### 7. Tickets by Status

```sql
SELECT
  status,
  COUNT(*) as count,
  COUNT(DISTINCT assigned_to) as engineers_involved,
  COUNT(DISTINCT bank_id) as banks_affected
FROM calls
GROUP BY status
ORDER BY
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'assigned' THEN 2
    WHEN 'in_progress' THEN 3
    WHEN 'completed' THEN 4
    WHEN 'escalated' THEN 5
    WHEN 'cancelled' THEN 6
  END;
```

**Expected Distribution**:
| Status | Count |
|--------|-------|
| pending | 10 |
| assigned | 8 |
| in_progress | 5 |
| completed | 5 |
| escalated | 2 |

### 8. Tickets by Priority

```sql
SELECT
  priority,
  COUNT(*) as count,
  AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::decimal(3,2) as completion_rate
FROM calls
GROUP BY priority
ORDER BY
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;
```

### 9. GPS Coordinates Verification

```sql
SELECT
  ticket_number,
  merchant_name,
  merchant_city,
  merchant_lat,
  merchant_lng,
  CASE
    WHEN merchant_lat BETWEEN -90 AND 90
     AND merchant_lng BETWEEN -180 AND 180
    THEN '✅ Valid'
    ELSE '❌ Invalid'
  END as gps_status
FROM calls
WHERE merchant_lat IS NOT NULL
LIMIT 10;
```

**Expected**: All coordinates should be valid (India region: Lat 8-35, Lng 68-97)

### 10. Stock Movements Audit Trail

```sql
SELECT
  movement_type,
  COUNT(*) as count,
  COUNT(DISTINCT device_id) as unique_devices
FROM stock_movements
GROUP BY movement_type
ORDER BY count DESC;
```

**Expected Movement Types**:
- receipt
- issue
- return
- transfer
- installation
- removal

### 11. Photos Verification

```sql
SELECT
  photo_type,
  COUNT(*) as count,
  COUNT(DISTINCT call_id) as tickets_with_photos
FROM photos
GROUP BY photo_type
ORDER BY count DESC;
```

**Expected Photo Types**:
- installation
- device
- signature
- issue
- before
- after

### 12. Engineer Workload Distribution

```sql
SELECT
  u.full_name as engineer,
  u.region,
  COUNT(c.id) as total_tickets,
  SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN c.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN c.status = 'assigned' THEN 1 ELSE 0 END) as assigned
FROM user_profiles u
LEFT JOIN calls c ON u.id = c.assigned_to
WHERE u.role = 'engineer'
GROUP BY u.id, u.full_name, u.region
ORDER BY total_tickets DESC;
```

### 13. Bank Device Distribution

```sql
SELECT
  b.name as bank,
  COUNT(d.id) as total_devices,
  SUM(CASE WHEN d.status = 'installed' THEN 1 ELSE 0 END) as installed,
  SUM(CASE WHEN d.status = 'warehouse' THEN 1 ELSE 0 END) as in_warehouse,
  SUM(CASE WHEN d.status = 'faulty' THEN 1 ELSE 0 END) as faulty
FROM banks b
LEFT JOIN devices d ON b.id = d.bank_id
GROUP BY b.id, b.name
ORDER BY total_devices DESC;
```

### 14. Stock Alerts Verification

```sql
SELECT
  alert_type,
  severity,
  warehouse_id,
  (SELECT name FROM warehouses WHERE id = stock_alerts.warehouse_id) as warehouse,
  device_model,
  current_quantity,
  threshold_quantity,
  resolved
FROM stock_alerts
ORDER BY severity DESC, created_at DESC;
```

### 15. Notification Distribution

```sql
SELECT
  type,
  COUNT(*) as count,
  SUM(CASE WHEN read THEN 1 ELSE 0 END) as read_count,
  SUM(CASE WHEN NOT read THEN 1 ELSE 0 END) as unread_count
FROM notifications
GROUP BY type
ORDER BY count DESC;
```

---

## Data Integrity Checks

### Foreign Key Integrity

```sql
-- Check devices have valid banks
SELECT COUNT(*) as orphan_devices
FROM devices d
WHERE d.bank_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM banks b WHERE b.id = d.bank_id);

-- Check calls have valid engineers
SELECT COUNT(*) as orphan_tickets
FROM calls c
WHERE c.assigned_to IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM user_profiles u WHERE u.id = c.assigned_to);

-- Check call_devices have valid devices
SELECT COUNT(*) as orphan_call_devices
FROM call_devices cd
WHERE NOT EXISTS (SELECT 1 FROM devices d WHERE d.id = cd.device_id);
```

**Expected**: All queries should return 0

### Timestamp Consistency

```sql
-- Check for future dates
SELECT
  'calls' as table_name,
  COUNT(*) as future_records
FROM calls
WHERE created_at > NOW()
UNION ALL
SELECT 'devices', COUNT(*) FROM devices WHERE created_at > NOW()
UNION ALL
SELECT 'stock_movements', COUNT(*) FROM stock_movements WHERE created_at > NOW();
```

**Expected**: All should return 0

### Required Fields Check

```sql
-- Check tickets have required fields
SELECT
  COUNT(*) as total_tickets,
  SUM(CASE WHEN ticket_number IS NULL THEN 1 ELSE 0 END) as missing_ticket_num,
  SUM(CASE WHEN merchant_name IS NULL THEN 1 ELSE 0 END) as missing_merchant,
  SUM(CASE WHEN bank_id IS NULL THEN 1 ELSE 0 END) as missing_bank
FROM calls;
```

**Expected**: All missing_* counts should be 0

---

## Performance Queries

### Index Usage Check

```sql
-- Check common query patterns will use indexes
EXPLAIN ANALYZE
SELECT * FROM calls WHERE status = 'pending' LIMIT 10;

EXPLAIN ANALYZE
SELECT * FROM devices WHERE bank_id = '11111111-1111-1111-1111-111111111111' LIMIT 10;

EXPLAIN ANALYZE
SELECT * FROM calls WHERE assigned_to IS NOT NULL AND status = 'assigned' LIMIT 10;
```

### Query Performance Baseline

```sql
-- Measure dashboard query performance
EXPLAIN ANALYZE
SELECT
  status,
  COUNT(*) as count
FROM calls
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status;
```

---

## Summary Verification

Run this comprehensive check:

```sql
DO $$
DECLARE
  bank_count INT;
  engineer_count INT;
  device_count INT;
  ticket_count INT;
  issues TEXT := '';
BEGIN
  SELECT COUNT(*) INTO bank_count FROM banks;
  SELECT COUNT(*) INTO engineer_count FROM user_profiles WHERE role = 'engineer';
  SELECT COUNT(*) INTO device_count FROM devices;
  SELECT COUNT(*) INTO ticket_count FROM calls;

  IF bank_count < 8 THEN
    issues := issues || 'Banks: Expected 8, got ' || bank_count || E'\n';
  END IF;

  IF engineer_count < 5 THEN
    issues := issues || 'Engineers: Expected 5, got ' || engineer_count || E'\n';
  END IF;

  IF device_count < 50 THEN
    issues := issues || 'Devices: Expected 50+, got ' || device_count || E'\n';
  END IF;

  IF ticket_count < 30 THEN
    issues := issues || 'Tickets: Expected 30, got ' || ticket_count || E'\n';
  END IF;

  IF issues = '' THEN
    RAISE NOTICE E'\n✅ DATA VERIFICATION PASSED\n';
    RAISE NOTICE 'Banks: %', bank_count;
    RAISE NOTICE 'Engineers: %', engineer_count;
    RAISE NOTICE 'Devices: %', device_count;
    RAISE NOTICE 'Tickets: %', ticket_count;
  ELSE
    RAISE WARNING E'\n❌ DATA VERIFICATION FAILED\n%', issues;
  END IF;
END $$;
```

---

## Test Data Quality Checklist

- [ ] All 8 banks created with contact info
- [ ] All 3 warehouses with GPS coordinates
- [ ] All 4 couriers with tracking URLs
- [ ] 5 engineers with profiles and regions
- [ ] 50+ devices across all statuses
- [ ] 30 tickets with varied statuses
- [ ] Stock movements tracking device history
- [ ] Photos attached to completed tickets
- [ ] Stock alerts for low inventory
- [ ] Notifications for engineers
- [ ] Engineer aggregates populated
- [ ] GPS coordinates within India bounds
- [ ] All foreign keys valid
- [ ] No null required fields
- [ ] Ticket numbers sequential (TKT2024001-030)
- [ ] Device serials follow pattern (ING/VER/PAX prefix)

---

## Verification Complete

After running these queries, you should have confidence that:

1. **Data Volume**: Sufficient test data exists for all entities
2. **Data Distribution**: Data is spread across statuses, regions, and banks
3. **Data Integrity**: Foreign keys and constraints are satisfied
4. **Data Quality**: Required fields populated, GPS valid, timestamps correct
5. **Data Realism**: Indian addresses, phone numbers, and business names

If any verification fails, re-run the `seed_test_data.sql` script or check for migration issues.
