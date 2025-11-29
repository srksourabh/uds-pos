# Enhanced Authentication & RBAC System Guide

## Overview

The Field Service Platform now features a comprehensive dual authentication system with advanced role-based access control (RBAC). This guide explains the authentication flows, security policies, and implementation details.

## Authentication Flows

### Admin Authentication (Email/Password)

**Purpose**: Secure access for administrators via web dashboard

**Flow**:
1. Navigate to `/login`
2. Toggle to "Sign in with email (Admins)"
3. Enter email and password
4. Optional: Check "Remember me for 7 days" for extended session
5. System validates credentials and checks profile status
6. Redirects to dashboard upon successful authentication

**Credentials**:
- Email: `admin@fieldservice.com`
- Password: `admin123`

**Features**:
- Remember Me: Extends session from 1 hour to 7 days
- Account status validation (must be 'active')
- Role verification (must be 'admin')
- TOTP MFA support (optional, can be enabled per user)

### Engineer Authentication (Phone OTP)

**Purpose**: Mobile-first authentication for field engineers

**Flow**:
1. Navigate to `/login`
2. Toggle to "Sign in with phone number (Engineers)"
3. Enter phone number with country code (e.g., `+1234567890`)
4. Receive 6-digit OTP via SMS
5. Enter OTP code within 5 minutes
6. **First-time users**: Redirected to profile setup
7. **Returning users**: Redirected to pending approval or dashboard

**First-Time User Setup**:
1. After OTP verification, fill profile form:
   - Full Name (required)
   - Email (optional but recommended)
   - Phone (pre-filled from authentication)
2. Profile created with status: `pending_approval`
3. User logged out and shown pending approval message
4. Cannot access system until admin approves

**Admin Approval Process**:
1. Admin logs in and navigates to `/approvals`
2. Views pending engineer profiles
3. Assigns bank and region (optional)
4. Approves or rejects account
5. Approved engineers receive notification and can access system

## User Roles & Permissions

### Admin Role

**Access**:
- Full read/write access to all data across all banks
- Can create, update, delete:
  - Banks
  - User profiles (including other admins)
  - Devices
  - Calls
  - Photos
- Can view all audit trails (inventory movements, call history)
- Can approve/reject pending engineer accounts

**Restrictions**:
- Must have status = 'active' to perform operations
- Account cannot be set to 'pending_approval' (constraint enforced)

### Engineer Role

**Access**:
- **Calls**: View assigned calls + pending calls in their bank
- **Devices**: View assigned devices + warehouse devices in their bank
- **Photos**: Upload photos for assigned devices/calls, view own uploads
- **Profile**: View own profile + basic info of other engineers
- **Updates**: Can update status of assigned calls, mark devices as faulty

**Restrictions**:
- Cannot view data from other banks
- Cannot view unassigned calls (except pending in their bank)
- Cannot create/delete any records (except upload photos)
- Cannot modify critical profile fields (role, bank_id, status)
- Must have status = 'active' to access system
- If status = 'pending_approval': Redirected to pending approval page

## Database Schema Enhancements

### user_profiles Table - New Fields

```sql
-- Geographic & Skills
region text                    -- Engineer's assigned region (North, South, etc.)
skills jsonb DEFAULT '[]'      -- Array of skill codes

-- Account Status
status account_status DEFAULT 'pending_approval'
-- Enum: pending_approval, active, suspended, inactive

-- Profile & Location
avatar_url text                -- Profile picture URL in Supabase Storage
last_location_lat numeric(10,6)       -- Last known latitude
last_location_lng numeric(10,6)       -- Last known longitude
last_location_updated_at timestamptz  -- Location update timestamp

-- Security
totp_enabled boolean DEFAULT false    -- MFA status (admins only)
metadata jsonb DEFAULT '{}'           -- Flexible field for extensions

-- Timestamps
updated_at timestamptz DEFAULT now()  -- Auto-updated via trigger
```

### photos Table - New

Stores device and installation photos uploaded by engineers:

```sql
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id),
  call_id uuid REFERENCES calls(id),
  uploaded_by uuid NOT NULL REFERENCES user_profiles(id),
  photo_type enum('before', 'after', 'damage', 'serial_number', 'installation'),
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);
```

**Photo Types**:
- `before`: Device condition before service
- `after`: Device condition after service
- `damage`: Documentation of damage
- `serial_number`: Device serial number plate
- `installation`: Installation site photo

## Row Level Security (RLS) Policies

### Key Principles

1. **Status-Based Access**: Only users with status='active' can perform operations
2. **Bank Isolation**: Engineers only access data from their assigned bank
3. **Audit Trail Protection**: Inventory movements and call history cannot be modified
4. **Minimal Permissions**: Engineers can only modify data they own/are assigned

### Enhanced Policies

**profiles Table**:
- Admins: View all profiles (if active)
- Engineers: View own profile + other engineer profiles (if active)
- First-time users: Can create own profile with status='pending_approval'
- Users: Update own non-critical fields only
- Admins: Update any profile including role/status/bank

**calls Table**:
- Admins: Full access (if active)
- Engineers: View assigned calls + pending calls in their bank (if active)
- Engineers: Update status of assigned calls only (cannot change bank or assignment)

**devices Table**:
- Admins: Full access (if active)
- Engineers: View assigned devices + warehouse devices in their bank (if active)
- Engineers: Can mark assigned devices as 'faulty' only

**photos Table**:
- Admins: View/delete all photos (if active)
- Engineers: View own photos + photos of assigned devices
- Engineers: Upload photos for assigned devices/calls
- Engineers: Delete own photos within 24 hours
- Uploaders: Can only update photo caption

## Security Features

### Database Constraints

```sql
-- Email must be lowercase
ALTER TABLE user_profiles ADD CONSTRAINT email_lowercase
  CHECK (email = LOWER(email));

-- Phone must be E.164 format
ALTER TABLE user_profiles ADD CONSTRAINT phone_e164_format
  CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$');

-- Engineers must have bank_id (unless pending approval)
ALTER TABLE user_profiles ADD CONSTRAINT engineer_requires_bank
  CHECK (role != 'engineer' OR bank_id IS NOT NULL OR status = 'pending_approval');

-- Admins cannot be pending
ALTER TABLE user_profiles ADD CONSTRAINT admin_must_be_active_status
  CHECK (role != 'admin' OR status != 'pending_approval');

-- Skills must be JSON array
ALTER TABLE user_profiles ADD CONSTRAINT skills_is_array
  CHECK (jsonb_typeof(skills) = 'array');
```

### Helper Functions

```sql
-- Check if user is admin
is_admin() RETURNS boolean

-- Get user's bank ID
get_user_bank() RETURNS uuid

-- Get user's role
get_user_role() RETURNS user_role

-- Get user's status
get_user_status() RETURNS account_status

-- Check if user is active
is_user_active() RETURNS boolean
```

## Session Management

### Token Expiration

**Access Token**:
- Default: 1 hour (3600 seconds)
- With "Remember me": Session extended (managed by Supabase)
- Stored in: Browser localStorage (web) / Secure Storage (mobile)

**Refresh Token**:
- Default: 30 days
- Rotates on each use
- Old tokens invalidated after rotation
- Prevents token replay attacks

### Session Behavior

**Web**:
- Auto-restore session on page load via `onAuthStateChange`
- Expired sessions redirect to `/login`
- Active sessions persist across browser close/reopen if "Remember me"

**Mobile** (Future):
- Check session validity on app launch
- Auto-refresh in background if expired
- Show "Session expired" modal if refresh fails

## Edge Function: auth-validator

**Purpose**: Reusable authentication validation for custom Edge Functions

**Endpoint**: `/functions/v1/auth-validator`

**Usage**:
```typescript
// In your Edge Function
const authHeader = req.headers.get('Authorization');
const validation = await validateAuth(authHeader);

if (!validation.valid) {
  return new Response(JSON.stringify({ error: validation.error }), {
    status: 401
  });
}

// validation.user contains { id, email, phone }
// validation.profile contains { id, role, status, bank_id }
```

**Checks**:
1. Authorization header present
2. JWT valid and not expired
3. User exists in auth.users
4. Profile exists in user_profiles
5. Profile status is 'active'

## Error Messages

### Authentication Errors

| Scenario | User-Facing Message |
|----------|---------------------|
| Invalid email/password | "Invalid email or password. Please try again." |
| Invalid OTP code | "Invalid code. Please check and try again." |
| OTP expired | "This code has expired. Please request a new one." |
| Account locked | "Your account has been locked for security. Contact support." |
| Account pending | "Your account is pending approval. We'll notify you when it's ready!" |
| Account suspended | "Your account has been suspended. Please contact your administrator." |
| Session expired | "Your session has expired. Please sign in again." |

### Permission Errors

| Scenario | User-Facing Message |
|----------|---------------------|
| Non-admin accessing admin page | Redirected to dashboard |
| Pending user accessing app | Redirected to pending approval page |
| Inactive user accessing app | Redirected to login |
| Engineer viewing other bank's data | No data visible (RLS enforced) |

## Testing Checklist

### Authentication Tests

- [ ] Admin can log in with email/password
- [ ] "Remember me" extends session duration
- [ ] Engineer can log in with phone OTP
- [ ] OTP expires after 5 minutes
- [ ] Resend OTP cooldown works (60 seconds)
- [ ] First-time user redirected to profile setup
- [ ] Profile created with status='pending_approval'
- [ ] Pending user sees approval waiting screen
- [ ] Approved user can access dashboard

### Authorization Tests

- [ ] Admin can view all data across all banks
- [ ] Engineer can view only their bank's data
- [ ] Engineer can view assigned calls
- [ ] Engineer can view pending calls in their bank
- [ ] Engineer CANNOT view other banks' calls
- [ ] Engineer can mark device as faulty
- [ ] Engineer CANNOT delete records
- [ ] Pending user CANNOT access app
- [ ] Suspended user CANNOT access app

### Security Tests

- [ ] Bank-device matching enforced (cannot assign device from Bank A to call from Bank B)
- [ ] Engineers cannot modify audit trails
- [ ] Service role key NOT exposed in client code
- [ ] RLS policies block unauthorized access
- [ ] Status checks prevent inactive users from operating

## Mobile Implementation (Future)

### Permission Requests

**Camera Permission**:
- Required for barcode scanning and photo uploads
- Prompt: "Allow Field Service to access your camera? We need this to scan device serial numbers and take photos of installations."

**Location Permission**:
- Required for location tracking and route optimization
- Prompt: "Allow Field Service to access your location? We use this to verify you're at the service location and optimize your route."

**Notification Permission**:
- Required for urgent call alerts
- Prompt: "Allow Field Service to send you notifications? We'll alert you about new urgent calls and important updates."

### Permission Denial Handling

- Camera denied: Show manual serial number entry field
- Location denied: Show manual check-in button
- Both denied: App still functional but degraded experience

## Troubleshooting

### "Profile not found" after login

**Cause**: User authenticated but profile doesn't exist in user_profiles table

**Solution**: Redirect to `/profile-setup` to create profile

### "Account status: pending_approval" error

**Cause**: Engineer profile awaiting admin approval

**Solution**: User should wait for admin to approve account from `/approvals` page

### Phone OTP not received

**Possible Causes**:
1. Phone number format incorrect (must be E.164: +1234567890)
2. Twilio not configured (check Supabase Auth settings)
3. SMS quota exceeded

**Solution**: Check phone format, verify Twilio integration, check SMS logs

### RLS policy blocking access

**Symptom**: User logged in but sees empty data

**Cause**: RLS policy too restrictive or user status not 'active'

**Solution**:
1. Check user profile status in database
2. Verify RLS policies allow user's role
3. Check user has correct bank_id assigned

## Best Practices

1. **Never expose service role key** in client code
2. **Always use RLS** as first line of defense
3. **Validate in Edge Functions** for sensitive operations
4. **Check status='active'** before allowing operations
5. **Rotate tokens** on each refresh (Supabase handles automatically)
6. **Log security events** (failed logins, permission denials)
7. **Test bank isolation** thoroughly to prevent data leaks
8. **Use helper functions** (is_admin, get_user_bank) in RLS policies

## Support

For questions or issues with the authentication system:
1. Check this guide first
2. Review RLS policies in migration files
3. Test with different user roles/statuses
4. Check browser console for detailed errors
5. Verify database constraints aren't blocking operations

---

**Last Updated**: 2025-11-29
**Version**: 2.0.0 (Enhanced Auth & RBAC)
