# Database Migration Summary - CoSTAR System

## Migration Status: ✅ COMPLETED

**Date**: 2025-11-30
**Migration File**: `complete_schema_migration`
**Status**: Successfully applied to Supabase database

---

## What Was Created

### 📊 **12 Core Tables**

1. **banks** - Bank organizations (3 seed records: WF, BOA, CHASE)
2. **user_profiles** - Extended user information with RBAC
3. **devices** - POS device inventory tracking
4. **calls** - Service call management
5. **call_devices** - Junction table for call-device relationships
6. **stock_movements** - Complete audit trail for device movements
7. **engineer_aggregates** - Performance metrics aggregation
8. **stock_alerts** - Automated inventory alerts
9. **photos** - Photo evidence documentation
10. **calls_import_audit** - Bulk import tracking
11. **calls_import_errors** - Import error details
12. **mapping_templates** - Reusable column mapping configurations

---

### 🔐 **10 Custom Enums**

1. `user_role` - admin, engineer
2. `user_status` - pending_approval, active, suspended, inactive
3. `device_status` - warehouse, issued, installed, faulty, returned
4. `call_type` - installation, swap, deinstallation, maintenance, breakdown
5. `call_status` - pending, assigned, in_progress, completed, cancelled
6. `call_priority` - low, medium, high, urgent
7. `movement_type` - received, issued, installed, swapped, returned, marked_faulty, transferred
8. `alert_severity` - info, warning, critical
9. `alert_status` - active, acknowledged, resolved
10. `import_status` - pending, in_progress, completed, failed

---

### ⚡ **Key Functions & Triggers**

**Helper Functions**:
- `generate_call_number()` - Auto-generates CALL-YYYY-NNNN format
- `update_updated_at_column()` - Auto-updates timestamps

**Triggers**:
- `trg_banks_updated_at` - Auto-update banks.updated_at
- `trg_user_profiles_updated_at` - Auto-update user_profiles.updated_at
- `trg_devices_updated_at` - Auto-update devices.updated_at
- `trg_calls_updated_at` - Auto-update calls.updated_at
- `trg_calls_auto_call_number` - Auto-generate call numbers on insert

---

### 🔒 **Row Level Security (RLS)**

**All 12 tables have RLS enabled** with the following policies:

**Banks**:
- ✅ Everyone can view banks
- ✅ Admins can insert/update banks

**User Profiles**:
- ✅ Users can view own profile
- ✅ Admins can view all profiles
- ✅ Users can update own profile
- ✅ Admins can update all profiles

**Devices**:
- ✅ Engineers can view own bank devices
- ✅ Admins can view all devices
- ✅ Admins can insert/update devices

**Calls**:
- ✅ Engineers can view own bank calls
- ✅ Engineers can view assigned calls
- ✅ Admins can insert/update calls
- ✅ Engineers can update assigned calls

**Other Tables**:
- ✅ Appropriate RLS policies for stock_movements, engineer_aggregates, stock_alerts, photos
- ✅ Import audit tables protected (admin-only or uploader)
- ✅ Mapping templates (user-owned)

---

### 📈 **Indexes Created**

**Performance-optimized indexes** on all critical columns:
- Primary keys (UUID) on all tables
- Foreign key indexes
- Status/role enum indexes
- Date/timestamp indexes
- Composite indexes for common queries:
  - `(device_bank, status)`
  - `(client_bank, status)`
  - `(assigned_engineer, status)`
  - `(role, status)`

---

### 🌱 **Seed Data**

**3 Banks Created**:
```
1. Wells Fargo (WF)
   - ID: 11111111-1111-1111-1111-111111111111
   - Contact: John Smith
   - Email: john.smith@wellsfargo.com
   - Phone: +1-415-555-0001
   - Address: 420 Montgomery St, San Francisco, CA 94104

2. Bank of America (BOA)
   - ID: 22222222-2222-2222-2222-222222222222
   - Contact: Jane Doe
   - Email: jane.doe@bofa.com
   - Phone: +1-415-555-0002
   - Address: 555 California St, San Francisco, CA 94104

3. Chase Bank (CHASE)
   - ID: 33333333-3333-3333-3333-333333333333
   - Contact: Bob Johnson
   - Email: bob.johnson@chase.com
   - Phone: +1-415-555-0003
   - Address: 560 Mission St, San Francisco, CA 94105
```

---

### ✅ **Constraints & Validation**

**User Profiles**:
- Email must be lowercase
- Phone must be E.164 format (+1-XXX-XXX-XXXX)
- Engineers require bank_id (unless pending_approval)
- Admins cannot be in pending_approval status
- Skills must be JSON array

**Devices**:
- Status and assigned_to consistency
- Installed devices must have client name

**Calls**:
- Call number format: CALL-YYYY-NNNN
- Latitude range: -90 to 90
- Longitude range: -180 to 180
- Status consistency checks (assigned → engineer, completed → timestamps)
- Completed timestamp must be after started timestamp

**Stock Alerts**:
- Alert type validation
- Severity validation

**Photos**:
- Photo type validation

---

## Database Schema Statistics

| Metric | Count |
|--------|-------|
| Total Tables | 12 |
| Tables with RLS | 12 (100%) |
| Total Enums | 10 |
| Total Triggers | 5 |
| Helper Functions | 2 |
| RLS Policies | 20+ |
| Indexes | 50+ |
| Foreign Keys | 30+ |
| Check Constraints | 15+ |
| Seed Records | 3 banks |

---

## Verification Queries

### Check Tables Exist
```sql
SELECT table_name, rls_enabled
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Check Banks Seed Data
```sql
SELECT id, name, code, active
FROM banks
ORDER BY code;
```

### Check Enums
```sql
SELECT typname, enum_range(NULL::user_role) as values
FROM pg_type
WHERE typname IN (
  'user_role', 'user_status', 'device_status',
  'call_type', 'call_status', 'call_priority'
);
```

### Check RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check Triggers
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

---

## Next Steps

### 1. Create Admin User
Use Edge Function: `POST /functions/v1/create-admin`
```json
{
  "email": "admin@costar.tech",
  "password": "YourSecurePassword123!",
  "full_name": "System Administrator"
}
```

### 2. Create Test Engineers
Use Edge Function: `POST /functions/v1/create-test-engineer`
```json
{
  "email": "engineer@costar.tech",
  "password": "Engineer123!",
  "full_name": "Test Engineer",
  "bank_id": "11111111-1111-1111-1111-111111111111"
}
```

### 3. Import Devices
Use Edge Function: `POST /functions/v1/bulk-import-devices`

### 4. Import Calls
Use Admin UI: `/admin/calls/upload`

### 5. Test Assignment
Use Edge Function: `POST /functions/v1/assign-calls`

---

## Migration Files Reference

**Applied Migration**: `complete_schema_migration`

**Related Documentation**:
- `DATABASE_SCHEMA.md` - Complete schema documentation
- `DB_AUTOMATION_SPECIFICATION.md` - RPC and trigger specifications
- `ADMIN_CALLS_UPLOAD_SPEC.md` - Bulk import feature spec
- `API_CONTRACTS.md` - Edge Function contracts
- `EDGE_FUNCTIONS_SCAFFOLD_SPEC.md` - Complete API specifications

---

## Rollback Instructions

If you need to rollback this migration:

```sql
-- WARNING: This will delete ALL data!

-- Drop tables in reverse order (respect foreign keys)
DROP TABLE IF EXISTS mapping_templates CASCADE;
DROP TABLE IF EXISTS calls_import_errors CASCADE;
DROP TABLE IF EXISTS calls_import_audit CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS stock_alerts CASCADE;
DROP TABLE IF EXISTS engineer_aggregates CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS call_devices CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS banks CASCADE;

-- Drop types
DROP TYPE IF EXISTS import_status CASCADE;
DROP TYPE IF EXISTS alert_status CASCADE;
DROP TYPE IF EXISTS alert_severity CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS call_priority CASCADE;
DROP TYPE IF EXISTS call_status CASCADE;
DROP TYPE IF EXISTS call_type CASCADE;
DROP TYPE IF EXISTS device_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS auto_generate_call_number() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_call_number() CASCADE;
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: RLS blocking queries
**Solution**: Ensure user is authenticated and has proper role

**Issue**: Foreign key constraint violations
**Solution**: Ensure referenced records exist (banks, user_profiles)

**Issue**: Enum validation errors
**Solution**: Use exact enum values (case-sensitive)

**Issue**: Call number format errors
**Solution**: Auto-generated, don't manually set call_number

---

## Additional Resources

- Supabase Dashboard: Check table structure, RLS policies, indexes
- Database Logs: Monitor query performance and errors
- Edge Functions: Deploy functions for business logic
- Frontend: Build admin UI and mobile app

---

**Migration Complete! ✅**

The CoSTAR Field Service Management database is now fully configured and ready for application development.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Status**: PRODUCTION READY
