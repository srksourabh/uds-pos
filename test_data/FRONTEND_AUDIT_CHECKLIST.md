# Frontend Audit Checklist

This document lists potential issues and areas to verify in the frontend code after loading test data.

## Overview

After analyzing the frontend code in `src/pages/` and `src/components/`, the following items need verification.

---

## 1. Dashboard (`src/pages/Dashboard.tsx`)

### Status: ✅ Likely Working
The Dashboard queries appear to match the schema correctly.

### Queries Used:
```javascript
// Devices - status field
supabase.from('devices').select('status')

// Calls - status and completed_at
supabase.from('calls').select('status, completed_at')

// Engineers count
supabase.from('user_profiles').select('id').eq('role', 'engineer')

// Map data
supabase.from('user_profiles').select('id, full_name, last_location_lat, last_location_lng, phone, active, last_location_updated_at').eq('role', 'engineer')
supabase.from('calls').select('id, call_number, type, status, priority, client_name, client_address, latitude, longitude, assigned_engineer, scheduled_date').in('status', ['pending', 'assigned', 'in_progress'])

// Device distribution by bank
supabase.from('devices').select('status, device_bank(name)')
```

### Potential Issues:
- [ ] **Line 189-204**: Device distribution chart accesses `device.device_bank?.name` - verify this join works
- [ ] **Line 142-146**: Completed today filter uses `completed_at` field - verify date comparison works

### Verification Steps:
1. Login as admin
2. Check stat cards show correct counts
3. Verify pie chart and bar chart render
4. Verify map shows engineers and calls with locations

---

## 2. Calls Page (`src/pages/Calls.tsx`)

### Status: ✅ Likely Working

### Queries Used:
```javascript
supabase.from('calls').select(`
  *,
  bank:client_bank(id, name, code),
  engineer:assigned_engineer(id, full_name)
`).order('scheduled_date', { ascending: false })
```

### Potential Issues:
- [ ] **Line 197**: Bank name display: `call.bank?.name` - aliased join should work
- [ ] **Line 201**: Engineer display: `call.engineer?.full_name` - aliased join should work

### Verification Steps:
1. Navigate to /calls
2. Verify all calls display with bank names
3. Verify assigned calls show engineer names
4. Test search functionality
5. Test status filter dropdown

---

## 3. Devices Page (`src/pages/Devices.tsx`)

### Status: ✅ Likely Working

### Queries Used:
```javascript
supabase.from('devices').select(`
  *,
  bank:device_bank(id, name, code),
  assigned_engineer:assigned_to(id, full_name)
`).order('created_at', { ascending: false })
```

### Potential Issues:
- [ ] **Line 258**: Bank name display: `device.bank?.name`
- [ ] **Line 266**: Engineer display: `device.assigned_engineer?.full_name`
- [ ] **TID Display**: Currently NOT extracted from metadata JSONB

### ISSUE FOUND: TID Not Displayed
The Devices page displays `serial_number` and `model` but does NOT display the `tid` from metadata.
- TID is stored in `metadata->>'tid'`
- This is a common display requirement

### Recommendation:
Add TID column to devices table or extract from metadata in query:
```javascript
// Option 1: Display from metadata
const tid = device.metadata?.tid || '-';

// Option 2: Add computed column in SQL
```

### Verification Steps:
1. Navigate to /devices
2. Verify devices show bank names correctly
3. Verify assigned engineers show correctly
4. Check if TID display is needed (currently missing)

---

## 4. Stock Page (`src/pages/Stock.tsx`)

### Status: ⚠️ Has Issues

### Queries Used:
Uses custom hook `useDevices` from `src/lib/api-hooks.ts`

### Potential Issues:
- [ ] **Line 144**: Bank filter dropdown uses `bank.bank_name` but schema uses `bank.name`
- [ ] **Line 203**: Bank display uses `device.banks?.bank_code` but schema uses `device.banks?.code`
- [ ] **Line 205**: Location display shows `device.assigned_to` (UUID) instead of engineer name

### ISSUES FOUND:

#### Issue 1: Wrong Column Name (Line 144)
```javascript
// CURRENT (wrong)
<option key={bank.id} value={bank.id}>{bank.bank_name}</option>

// SHOULD BE
<option key={bank.id} value={bank.id}>{bank.name}</option>
```

#### Issue 2: Wrong Bank Code Property (Line 203)
```javascript
// CURRENT (wrong)
<td className="px-6 py-4 text-gray-600">{device.banks?.bank_code}</td>

// SHOULD BE
<td className="px-6 py-4 text-gray-600">{device.banks?.code}</td>
```

#### Issue 3: Location Shows UUID (Line 205)
```javascript
// CURRENT
{device.installed_at_client || device.assigned_to || 'Warehouse'}

// SHOULD BE - need to join and get engineer name
{device.installed_at_client || device.assigned_engineer?.full_name || 'Warehouse'}
```

### Verification Steps:
1. Navigate to /stock
2. Check if bank names display in dropdown
3. Check if bank code displays in table
4. Verify location column doesn't show UUIDs

---

## 5. Engineers Page (`src/pages/Engineers.tsx`)

### Status: ✅ Likely Working

### Queries Used:
```javascript
supabase.from('user_profiles').select(`
  *,
  bank:bank_id(id, name, code)
`).eq('role', 'engineer').order('full_name', { ascending: true })
```

### Potential Issues:
- [ ] **Line 136**: Bank name display: `engineer.bank?.name` - should work if bank_id is set

### CRITICAL DEPENDENCY:
Engineers MUST have `bank_id` set in `user_profiles` for bank names to display.
The original `production_realistic_test_data.sql` was MISSING this field.
The `production_data_cleaned.sql` includes the fix.

### Verification Steps:
1. Navigate to /engineers
2. Verify engineer cards show bank names under "Assigned Bank"
3. If showing "Not assigned", check that `bank_id` is set in `user_profiles`

---

## 6. API Hooks (`src/lib/api-hooks.ts`)

### Status: ✅ Generally Correct

### Key Observations:
- Uses correct column names (`name`, `code` instead of `bank_name`, `bank_code`)
- Proper type definitions with `DeviceWithBank`, `CallWithRelations`
- Sanitizes search input

---

## Summary of Issues to Fix

### High Priority (Will Break Display)

| File | Line | Issue | Fix |
|------|------|-------|-----|
| Stock.tsx | 144 | `bank.bank_name` should be `bank.name` | Change property name |
| Stock.tsx | 203 | `device.banks?.bank_code` should be `device.banks?.code` | Change property name |
| Stock.tsx | 205 | Shows UUID for assigned_to | Need to join engineer name |

### Medium Priority (Missing Features)

| File | Line | Issue | Fix |
|------|------|-------|-----|
| Devices.tsx | - | TID not displayed | Extract from metadata or add column |
| Engineers.tsx | 136 | Bank shows "Not assigned" | Ensure bank_id is set in test data |

### Low Priority (Potential Issues)

| File | Line | Issue | Fix |
|------|------|-------|-----|
| Dashboard.tsx | 189 | device_bank join | Verify works with test data |

---

## Verification Workflow

### Step 1: Load Test Data
```sql
-- Option A: Production realistic (requires bank_id fix)
\i test_data/production_data_cleaned.sql

-- Option B: Comprehensive (more data, new engineers)
\i test_data/comprehensive_test_data.sql
```

### Step 2: Start Dev Server
```bash
npm run dev
```

### Step 3: Test Each Page

#### As Admin:
1. Dashboard - Check all stats, charts, map
2. Calls - Check list, filters, bank names
3. Devices - Check list, bank names, engineer names
4. Stock - Check dropdown, table columns
5. Engineers - Check bank names display

#### As Engineer:
1. Dashboard - Check engineer-specific view
2. Calls - Check filtered to assigned calls only
3. Stock - Check inventory view

### Step 4: Check Browser Console
Look for errors like:
- "Cannot read property 'name' of undefined"
- PostgreSQL errors
- Auth errors

---

## Quick Fix Script

If Stock.tsx needs fixing, here are the edits:

```typescript
// Line 144 - Fix bank dropdown
{banks.map(bank => (
  <option key={bank.id} value={bank.id}>{bank.name}</option>  // was bank.bank_name
))}

// Line 203 - Fix bank code display
<td className="px-6 py-4 text-gray-600">{device.banks?.code}</td>  // was bank_code
```

---

## Database Schema Reference

### banks table
- `id` (uuid)
- `name` (varchar) - ✅ Use this for display
- `code` (varchar) - ✅ Use this for short code
- NOT `bank_name` or `bank_code`

### user_profiles table
- `id` (uuid)
- `full_name` (varchar)
- `bank_id` (uuid, FK to banks) - ⚠️ Must be set for engineers

### devices table
- `serial_number` (varchar)
- `device_bank` (uuid, FK to banks)
- `assigned_to` (uuid, FK to user_profiles)
- `metadata` (jsonb) - Contains `tid`, `brand`, etc.

### calls table
- `client_bank` (uuid, FK to banks)
- `assigned_engineer` (uuid, FK to user_profiles)
- `client_name` (varchar) - Merchant name stored here
