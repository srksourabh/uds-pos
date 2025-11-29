# Database Schema Documentation
## Field Service Platform - Complete Data Model

**Last Updated**: 2025-11-29
**Database**: Supabase Postgres
**Total Tables**: 12 tables

---

## Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Audit & Analytics Tables](#audit--analytics-tables)
4. [Alert System](#alert-system)
5. [Relationships](#relationships)
6. [Indexes](#indexes)
7. [Database Functions](#database-functions)
8. [Triggers](#triggers)

---

## Overview

The database schema supports a comprehensive field service management system with:
- Multi-bank device inventory management
- Field service call tracking and assignment
- Engineer performance analytics
- Automated stock alerts
- Complete audit trails
- Photo documentation
- Role-based access control via RLS

**Key Features**:
- Bank isolation for data security
- Immutable audit trails
- Automatic movement tracking
- Performance metrics aggregation
- Real-time alerting system
- JSONB fields for flexible data storage

---

## Core Tables

### 1. banks

**Purpose**: Bank organizations that own devices and receive field service

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `name` (text, NOT NULL) - Bank name
- `code` (text, NOT NULL, UNIQUE) - Short code (e.g., "FNB")
- `active` (boolean, DEFAULT true) - Active status
- `contact_person` (text) - Primary contact
- `contact_email` (text) - Contact email
- `contact_phone` (text) - Contact phone
- `address` (text) - Physical address
- `metadata` (jsonb, DEFAULT {}) - Flexible data
- `created_at` (timestamptz) - Creation timestamp

**Indexes**:
- Primary key on `id`
- Unique index on `code`
- Index on `active`
- Index on `name`

---

### 2. user_profiles

**Purpose**: Extended user information for authentication and RBAC

**Fields**:
- `id` (uuid, PK, FK→auth.users) - Links to Supabase Auth
- `email` (text, NOT NULL, UNIQUE) - Email address
- `full_name` (text, NOT NULL) - Complete name
- `phone` (text, UNIQUE when not null) - E.164 format phone
- `role` (enum: 'admin'|'engineer', DEFAULT 'engineer') - User role
- `bank_id` (uuid, FK→banks) - Associated bank
- `region` (text) - Geographic region
- `skills` (jsonb, DEFAULT []) - Skill codes array
- `status` (enum, DEFAULT 'pending_approval') - Account status
  - pending_approval, active, suspended, inactive
- `avatar_url` (text) - Profile picture URL
- `last_location_lat` (numeric) - Last latitude
- `last_location_lng` (numeric) - Last longitude
- `last_location_updated_at` (timestamptz) - Location timestamp
- `totp_enabled` (boolean, DEFAULT false) - MFA status
- `metadata` (jsonb, DEFAULT {}) - Flexible data
- `active` (boolean, DEFAULT true) - Legacy active flag
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Update timestamp

**Indexes**:
- Primary key on `id`
- Unique on `email`
- Unique on `phone` WHERE phone IS NOT NULL
- Index on `role`
- Index on `status`
- Index on `bank_id`
- Index on `region`
- Composite on (`role`, `status`)

**Constraints**:
- Email must be lowercase
- Phone must be E.164 format
- Engineers require bank_id (unless pending)
- Admins cannot have pending_approval status
- Skills must be JSON array

---

### 3. devices

**Purpose**: POS device inventory with lifecycle tracking

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `serial_number` (text, NOT NULL, UNIQUE) - Device serial
- `model` (text, NOT NULL) - Device model
- `device_bank` (uuid, NOT NULL, FK→banks) - Owning bank
- `status` (enum, DEFAULT 'warehouse') - Lifecycle status
  - warehouse, issued, installed, faulty, returned
- `assigned_to` (uuid, FK→user_profiles) - Current engineer
- `installed_at_client` (text) - Client name if installed
- `installation_date` (date) - Installation date
- `warranty_expiry` (date) - Warranty expiration
- `firmware_version` (text) - Firmware version
- `last_maintenance_date` (date) - Last maintenance
- `notes` (text, DEFAULT '') - Freeform notes
- `metadata` (jsonb, DEFAULT {}) - Flexible data
- `updated_by` (uuid, FK→user_profiles) - Last updater
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Update timestamp

**Indexes**:
- Primary key on `id`
- Unique on `serial_number`
- Index on `device_bank`
- Index on `status`
- Index on `assigned_to`
- Composite on (`device_bank`, `status`)
- Index on `model`
- Index on `warranty_expiry` WHERE NOT NULL
- Index on `last_maintenance_date` WHERE NOT NULL

---

### 4. calls

**Purpose**: Field service call tracking with assignment and scheduling

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `call_number` (text, NOT NULL, UNIQUE) - Human-readable ID
- `type` (enum, NOT NULL) - Call type
  - install, swap, deinstall, maintenance, breakdown
- `status` (enum, DEFAULT 'pending') - Current status
  - pending, assigned, in_progress, completed, cancelled
- `client_bank` (uuid, NOT NULL, FK→banks) - Client's bank
- `client_name` (text, NOT NULL) - Client name
- `client_contact` (text) - Contact person
- `client_phone` (text) - Contact phone
- `client_address` (text, NOT NULL) - Service address
- `latitude` (numeric) - GPS latitude
- `longitude` (numeric) - GPS longitude
- `scheduled_date` (date, NOT NULL) - Target date
- `scheduled_time_window` (text) - Time window
- `assigned_engineer` (uuid, FK→user_profiles) - Assigned engineer
- `started_at` (timestamptz) - Start time
- `completed_at` (timestamptz) - Completion time
- `priority` (enum, DEFAULT 'medium') - Priority level
  - low, medium, high, urgent
- `description` (text, DEFAULT '') - Work description
- `resolution_notes` (text) - Completion notes
- `estimated_duration_minutes` (integer) - Expected duration
- `actual_duration_minutes` (integer) - Actual duration
- `requires_photo` (boolean, DEFAULT false) - Photo required flag
- `metadata` (jsonb, DEFAULT {}) - Flexible data
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Update timestamp

**Indexes**:
- Primary key on `id`
- Unique on `call_number`
- Index on `client_bank`
- Index on `status`
- Index on `assigned_engineer`
- Index on `scheduled_date`
- Composite on (`status`, `priority`)
- Composite on (`client_bank`, `status`)
- Composite on (`assigned_engineer`, `status`)
- Index on `created_at`

---

### 5. call_devices

**Purpose**: Junction table linking calls to devices

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `call_id` (uuid, NOT NULL, FK→calls ON DELETE CASCADE) - Call reference
- `device_id` (uuid, NOT NULL, FK→devices) - Device reference
- `action` (text, NOT NULL) - Action performed
  - install, remove, swap_in, swap_out, inspect, repair
- `created_at` (timestamptz) - Creation timestamp

**Indexes**:
- Primary key on `id`
- Index on `call_id`
- Index on `device_id`
- Unique composite on (`call_id`, `device_id`)

**Constraints**:
- Device bank must match call bank (application-level validation)

---

### 6. photos

**Purpose**: Device and installation photo documentation

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `device_id` (uuid, NOT NULL, FK→devices ON DELETE CASCADE) - Device reference
- `call_id` (uuid, FK→calls ON DELETE CASCADE) - Call reference
- `uploaded_by` (uuid, NOT NULL, FK→user_profiles) - Uploader
- `photo_type` (enum, NOT NULL) - Photo classification
  - before, after, damage, serial_number, installation
- `storage_path` (text, NOT NULL) - Supabase Storage path
- `caption` (text) - Optional description
- `created_at` (timestamptz) - Upload timestamp

**Indexes**:
- Primary key on `id`
- Index on `device_id`
- Index on `call_id`
- Index on `uploaded_by`
- Index on `photo_type`
- Composite on (`device_id`, `photo_type`)
- Index on `created_at`

---

## Audit & Analytics Tables

### 7. stock_movements

**Purpose**: Comprehensive audit trail of device inventory movements

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `device_id` (uuid, NOT NULL, FK→devices ON DELETE CASCADE) - Device
- `movement_type` (enum, NOT NULL) - Movement classification
  - status_change, assignment, transfer, return, issuance
- `from_status` (text, NOT NULL) - Previous status
- `to_status` (text, NOT NULL) - New status
- `from_engineer` (uuid, FK→user_profiles) - Previous engineer
- `to_engineer` (uuid, FK→user_profiles) - New engineer
- `from_location` (text) - Previous location
- `to_location` (text) - New location
- `quantity` (integer, DEFAULT 1) - Quantity moved
- `call_id` (uuid, FK→calls) - Associated call
- `actor_id` (uuid, NOT NULL, FK→user_profiles) - Who performed movement
- `reason` (text, NOT NULL) - Reason for movement
- `notes` (text, DEFAULT '') - Additional notes
- `metadata` (jsonb, DEFAULT {}) - Flexible data
- `created_at` (timestamptz) - Movement timestamp

**Indexes**:
- Primary key on `id`
- Index on `device_id`
- Index on `from_engineer`
- Index on `to_engineer`
- Index on `call_id`
- Index on `actor_id`
- Index on `created_at` DESC
- Composite on (`device_id`, `created_at` DESC)
- Index on `movement_type`

**Security**:
- Immutable: No updates or deletes allowed via RLS
- Auto-created by trigger on device status/assignment changes

---

### 8. engineer_aggregates

**Purpose**: Pre-computed performance metrics for engineers

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `engineer_id` (uuid, NOT NULL, FK→user_profiles ON DELETE CASCADE) - Engineer
- `period_type` (enum, NOT NULL) - Aggregation period
  - daily, weekly, monthly, quarterly, yearly, all_time
- `period_start` (date, NOT NULL) - Period start date
- `period_end` (date, NOT NULL) - Period end date
- `total_calls_assigned` (integer, DEFAULT 0) - Calls assigned
- `total_calls_completed` (integer, DEFAULT 0) - Calls completed
- `total_calls_cancelled` (integer, DEFAULT 0) - Calls cancelled
- `total_calls_in_progress` (integer, DEFAULT 0) - Currently active
- `completion_rate` (numeric) - Completion percentage
- `average_resolution_time_minutes` (integer) - Avg resolution time
- `on_time_completion_rate` (numeric) - On-time percentage
- `total_devices_installed` (integer, DEFAULT 0) - Devices installed
- `total_devices_swapped` (integer, DEFAULT 0) - Devices swapped
- `total_devices_deinstalled` (integer, DEFAULT 0) - Devices removed
- `total_distance_traveled_km` (numeric) - Distance traveled
- `calls_by_type` (jsonb, DEFAULT {}) - Breakdown by call type
- `calls_by_priority` (jsonb, DEFAULT {}) - Breakdown by priority
- `calls_by_bank` (jsonb, DEFAULT {}) - Breakdown by bank
- `performance_score` (numeric) - Overall score (0-100)
- `customer_satisfaction_avg` (numeric) - Satisfaction rating
- `total_photos_uploaded` (integer, DEFAULT 0) - Photos uploaded
- `metadata` (jsonb, DEFAULT {}) - Flexible data
- `last_calculated_at` (timestamptz) - Last computation time
- `created_at` (timestamptz) - Creation timestamp

**Indexes**:
- Primary key on `id`
- Index on `engineer_id`
- Index on `period_type`
- Index on `period_start` DESC
- Index on `performance_score` DESC
- Index on `completion_rate` DESC
- Composite on (`engineer_id`, `period_type`, `period_start`)
- Unique on (`engineer_id`, `period_type`, `period_start`)

**Constraints**:
- Completion rate: 0-100
- Performance score: 0-100
- Period end >= period start

**Update Strategy**:
- Computed by scheduled Edge Function or cron job
- Eventually consistent (not real-time)

---

### 9. call_history

**Purpose**: Audit trail of call status changes

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `call_id` (uuid, NOT NULL, FK→calls) - Call reference
- `from_status` (text, NOT NULL) - Previous status
- `to_status` (text, NOT NULL) - New status
- `actor_id` (uuid, NOT NULL, FK→user_profiles) - Who changed status
- `notes` (text, DEFAULT '') - Change notes
- `created_at` (timestamptz) - Change timestamp

**Security**:
- Immutable: No updates or deletes allowed

---

### 10. inventory_movements

**Purpose**: Legacy audit trail (being replaced by stock_movements)

**Note**: This table exists for backward compatibility and will be deprecated in favor of `stock_movements`.

---

## Alert System

### 11. stock_alerts

**Purpose**: Automated alerts for inventory and operational issues

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `alert_type` (enum, NOT NULL) - Alert classification
  - low_stock, device_overdue, faulty_device, missing_device
  - warranty_expiring, maintenance_due, engineer_idle, call_overdue
- `severity` (enum, DEFAULT 'warning') - Severity level
  - info, warning, critical, urgent
- `bank_id` (uuid, FK→banks ON DELETE CASCADE) - Related bank
- `device_id` (uuid, FK→devices ON DELETE CASCADE) - Related device
- `call_id` (uuid, FK→calls ON DELETE CASCADE) - Related call
- `engineer_id` (uuid, FK→user_profiles ON DELETE CASCADE) - Related engineer
- `title` (text, NOT NULL) - Alert title
- `message` (text, NOT NULL) - Alert description
- `threshold_value` (numeric) - Threshold that triggered alert
- `current_value` (numeric) - Current value
- `status` (enum, DEFAULT 'active') - Alert status
  - active, acknowledged, resolved, dismissed
- `acknowledged_by` (uuid, FK→user_profiles) - Who acknowledged
- `acknowledged_at` (timestamptz) - Acknowledgment time
- `resolved_by` (uuid, FK→user_profiles) - Who resolved
- `resolved_at` (timestamptz) - Resolution time
- `resolution_notes` (text) - Resolution description
- `auto_generated` (boolean, DEFAULT true) - Auto-generated flag
- `expires_at` (timestamptz) - Auto-dismiss time
- `notification_sent` (boolean, DEFAULT false) - Notification sent flag
- `metadata` (jsonb, DEFAULT {}) - Flexible data
- `created_at` (timestamptz) - Creation timestamp

**Indexes**:
- Primary key on `id`
- Index on `alert_type`
- Index on `severity`
- Index on `status`
- Index on `bank_id`
- Index on `device_id`
- Index on `call_id`
- Index on `engineer_id`
- Index on `created_at` DESC
- Composite on (`status`, `severity`, `created_at` DESC)
- Index on `expires_at` WHERE NOT NULL

**Auto-Generation Functions**:
- `check_and_create_low_stock_alerts()` - Daily check for low inventory
- `check_and_create_overdue_call_alerts()` - Check for overdue calls
- `check_and_create_warranty_expiring_alerts()` - Check warranty expiration

---

### 12. notifications

**Purpose**: User notifications for events and alerts

**Fields**:
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, NOT NULL, FK→user_profiles) - Target user
- `title` (text, NOT NULL) - Notification title
- `message` (text, NOT NULL) - Notification message
- `type` (text, DEFAULT 'info') - Notification type
- `read` (boolean, DEFAULT false) - Read status
- `link` (text) - Optional link to related page
- `created_at` (timestamptz) - Creation timestamp

---

## Relationships

### Foreign Key Summary:

```
user_profiles
  └─ bank_id → banks.id

devices
  ├─ device_bank → banks.id
  ├─ assigned_to → user_profiles.id
  └─ updated_by → user_profiles.id

calls
  ├─ client_bank → banks.id
  └─ assigned_engineer → user_profiles.id

call_devices
  ├─ call_id → calls.id (ON DELETE CASCADE)
  └─ device_id → devices.id

stock_movements
  ├─ device_id → devices.id (ON DELETE CASCADE)
  ├─ from_engineer → user_profiles.id
  ├─ to_engineer → user_profiles.id
  ├─ call_id → calls.id
  └─ actor_id → user_profiles.id

engineer_aggregates
  └─ engineer_id → user_profiles.id (ON DELETE CASCADE)

photos
  ├─ device_id → devices.id (ON DELETE CASCADE)
  ├─ call_id → calls.id (ON DELETE CASCADE)
  └─ uploaded_by → user_profiles.id

stock_alerts
  ├─ bank_id → banks.id (ON DELETE CASCADE)
  ├─ device_id → devices.id (ON DELETE CASCADE)
  ├─ call_id → calls.id (ON DELETE CASCADE)
  ├─ engineer_id → user_profiles.id (ON DELETE CASCADE)
  ├─ acknowledged_by → user_profiles.id
  └─ resolved_by → user_profiles.id
```

---

## Database Functions

### Helper Functions:

1. **is_admin()** - Check if current user is admin
2. **get_user_bank()** - Get current user's bank ID
3. **get_user_role()** - Get current user's role
4. **get_user_status()** - Get current user's status
5. **is_user_active()** - Check if user status is 'active'

### Calculation Functions:

6. **calculate_engineer_aggregates()** - Compute engineer performance metrics
   - Parameters: engineer_id, period_start, period_end, period_type
   - Returns: void (inserts/updates aggregate record)

### Alert Functions:

7. **check_and_create_low_stock_alerts()** - Check for low inventory
8. **check_and_create_overdue_call_alerts()** - Check for overdue calls
9. **check_and_create_warranty_expiring_alerts()** - Check warranty expiration

### Auto-Generation Functions:

10. **create_stock_movement_on_device_change()** - Trigger function for device changes
11. **calculate_actual_call_duration()** - Auto-calculate call duration on completion

---

## Triggers

### 1. update_user_profiles_updated_at
- **Table**: user_profiles
- **Event**: BEFORE UPDATE
- **Function**: update_profile_updated_at()
- **Purpose**: Auto-update updated_at timestamp

### 2. auto_create_stock_movement
- **Table**: devices
- **Event**: AFTER UPDATE
- **Condition**: Status or assigned_to changed
- **Function**: create_stock_movement_on_device_change()
- **Purpose**: Automatically log inventory movements

### 3. auto_calculate_call_duration
- **Table**: calls
- **Event**: BEFORE UPDATE
- **Condition**: Status changed to 'completed'
- **Function**: calculate_actual_call_duration()
- **Purpose**: Auto-calculate call duration from start/end times

---

## Row Level Security (RLS)

All tables have RLS enabled with comprehensive policies:

**Admin Access**:
- Full SELECT, INSERT, UPDATE, DELETE on all tables
- Must have status='active'

**Engineer Access**:
- SELECT: Own profile, own bank's data, assigned calls/devices
- INSERT: Photos, stock movements (as actor)
- UPDATE: Own profile (limited fields), assigned call status, assigned device faulty status
- DELETE: Own photos (within 24 hours)
- Must have status='active'

**Key Restrictions**:
- Bank isolation: Engineers cannot access other banks' data
- Audit trails: No updates/deletes on stock_movements, call_history
- Status checks: All operations require status='active'
- Device-call matching: Device bank must match call bank

---

## Best Practices

1. **Always use transactions** for multi-table operations
2. **Validate device-bank matching** before linking devices to calls
3. **Use JSONB fields** for flexible, evolving data requirements
4. **Schedule aggregate recomputation** nightly or weekly
5. **Run alert checks** hourly or daily
6. **Monitor RLS performance** with query plans
7. **Index JSONB fields** if querying them frequently
8. **Archive old audit records** after retention period
9. **Back up regularly** before major migrations
10. **Test RLS policies** thoroughly for security

---

**End of Documentation**
