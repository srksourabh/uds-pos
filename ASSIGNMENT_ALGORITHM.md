# Call Assignment Algorithm - Implementation Guide

**Version**: 1.0
**Last Updated**: 2025-11-29
**Status**: ✅ Implemented

---

## Overview

The intelligent call assignment algorithm automatically assigns field service calls to engineers based on multiple weighted factors while enforcing strict stock availability constraints.

### Key Features

- **Multi-Factor Scoring**: Combines proximity, priority, workload, and stock availability
- **Stock-Aware Validation**: Engineers must have available devices for install/swap calls
- **Bank Isolation**: Engineers only assigned to calls from their bank
- **Atomic Transactions**: Race-condition-free assignment with database locks
- **Configurable Weights**: Customize scoring factors via API
- **Dry-Run Mode**: Preview assignments before committing

---

## Architecture

### Components

1. **Edge Function**: `assign-calls` - Main assignment service
2. **Database Functions**:
   - `get_engineers_with_stock()` - Fetch eligible engineers with stock counts
   - `assign_call_to_engineer()` - Atomic assignment with validation
   - `get_engineer_stock_count()` - Check stock for specific engineer/bank
3. **Utilities**:
   - `geo.ts` - Haversine distance calculation
   - `scoring.ts` - Multi-factor scoring and filtering

---

## API Reference

### Endpoint

```
POST /functions/v1/assign-calls
```

### Authentication

Requires valid Supabase auth token in `Authorization` header:
```
Authorization: Bearer <token>
```

### Request Body

```typescript
{
  "call_ids": ["uuid1", "uuid2", ...],     // Required: Calls to assign
  "weight_overrides": {                     // Optional: Custom weights
    "proximity": 0.35,
    "priority": 0.25,
    "workload": 0.20,
    "stock": 0.20
  },
  "dry_run": false,                         // Optional: Preview mode
  "force_reassign": false,                  // Optional: Allow reassigning assigned calls
  "actor_id": "uuid"                        // Optional: User performing assignment
}
```

### Response

```typescript
{
  "success": true,
  "assignments": [
    {
      "call_id": "uuid",
      "call_number": "CALL-001",
      "assigned_engineer_id": "uuid",
      "engineer_name": "John Doe",
      "score": 87.5,
      "score_breakdown": {
        "proximity_score": 85.0,
        "priority_score": 75.0,
        "workload_score": 100.0,
        "stock_score": 100.0
      },
      "distance_km": 15.2,
      "stock_available": 5,
      "reason": "Best match based on: proximity, low workload, good stock",
      "assigned_at": "2025-11-29T10:30:00Z"
    }
  ],
  "unassigned": [
    {
      "call_id": "uuid",
      "call_number": "CALL-002",
      "reason": "no_stock",
      "details": "No devices available in stock for bank. 3 engineers available but all have 0 stock.",
      "eligible_count": 0,
      "considered_count": 3
    }
  ],
  "statistics": {
    "total_calls": 2,
    "assigned_count": 1,
    "unassigned_count": 1,
    "avg_score": 87.5,
    "avg_distance_km": 15.2,
    "execution_time_ms": 245,
    "engineers_utilized": 1
  }
}
```

---

## Scoring Algorithm

### Default Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| Proximity | 35% | Distance from engineer to call location |
| Priority | 25% | Call urgency level |
| Workload | 20% | Engineer's current active call count |
| Stock | 20% | Available devices for the bank |

**Total**: 100%

### 1. Proximity Score (0-100)

```
proximity_score = max(0, 100 - (distance_km / 100) × 100)
```

**Location Sources** (in order of preference):
1. Engineer's `last_location_lat/lng` if updated within 2 hours
2. Region center coordinates (fallback)
3. Neutral score of 50 if no location available

**Distance Calculation**: Haversine formula for GPS coordinates

### 2. Priority Score (0-100)

```
Base scores by priority level:
- urgent:  100 points
- high:    75 points
- medium:  50 points
- low:     25 points

Urgency boost:
- Overdue (past scheduled date): +10 points
- Today's date: +5 points
```

### 3. Workload Score (0-100)

```
workload_score = 100 - (active_calls / 10) × 100

where active_calls = count of calls with status IN ('assigned', 'in_progress')
```

**Capacity Limit**: Engineers with 10+ active calls score 0 but remain eligible

### 4. Stock Score (0-100)

```
stock_score = min(100, (available_devices / 3) × 100)

where available_devices = count of devices where:
  - device_bank = call.client_bank
  - assigned_to = engineer_id
  - status IN ('warehouse', 'issued')
```

**Stock Requirements**:
- `install` and `swap` calls: **REQUIRE** stock > 0 (hard constraint)
- `deinstall`, `maintenance`, `breakdown`: No stock requirement

**Scoring**:
- 0 devices: Ineligible (filtered out)
- 1 device: 33.3 score (risky)
- 2 devices: 66.7 score (acceptable)
- 3+ devices: 100 score (ideal)

### Final Score Calculation

```
final_score = (proximity_score × 0.35) +
              (priority_score × 0.25) +
              (workload_score × 0.20) +
              (stock_score × 0.20)
```

---

## Eligibility Filtering

Before scoring, engineers must pass these hard constraints:

1. ✅ **Bank Match**: `engineer.bank_id = call.client_bank`
2. ✅ **Active Status**: `engineer.status = 'active'`
3. ✅ **Stock Availability**: If call requires device, `stock_count > 0`
4. ✅ **Role**: `engineer.role = 'engineer'`

**Result**: Only eligible engineers are scored and ranked.

---

## Tie-Breaking

When multiple engineers have identical scores (within 0.01 tolerance):

1. **Lowest Workload** (fewer active calls)
2. **Highest Stock** (more devices available)
3. **Shortest Distance** (closer proximity)
4. **Longest Idle Time** (oldest last_assignment_at)
5. **Lexicographic ID** (deterministic fallback)

---

## Concurrency Safety

### Transaction Pattern

The `assign_call_to_engineer()` function uses:
- `FOR UPDATE NOWAIT` to lock call records
- Serializable isolation level
- Atomic validation + assignment + audit logging
- Automatic rollback on failure

### Race Condition Prevention

```sql
BEGIN TRANSACTION;
  -- Lock call
  SELECT * FROM calls WHERE id = $call_id FOR UPDATE NOWAIT;

  -- Validate engineer stock
  SELECT COUNT(*) FROM devices WHERE ... FOR UPDATE;

  -- Update call
  UPDATE calls SET assigned_engineer = $engineer_id ...;

  -- Create audit trail
  INSERT INTO call_history ...;

  -- Send notification
  INSERT INTO notifications ...;
COMMIT;
```

**Conflict Handling**: If lock fails, return error `"Call is currently being assigned by another process"`

---

## Usage Examples

### Example 1: Assign Single Call

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/assign-calls`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    call_ids: ['123e4567-e89b-12d3-a456-426614174000'],
  }),
});

const result = await response.json();
console.log('Assigned to:', result.assignments[0].engineer_name);
```

### Example 2: Bulk Assignment with Custom Weights

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/assign-calls`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    call_ids: ['call-1', 'call-2', 'call-3', ...], // 50 calls
    weight_overrides: {
      proximity: 0.50,  // Prioritize proximity
      priority: 0.20,
      workload: 0.15,
      stock: 0.15,
    },
  }),
});
```

### Example 3: Dry Run (Preview)

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/assign-calls`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    call_ids: ['call-1'],
    dry_run: true,  // No database updates
  }),
});

const result = await response.json();
console.log('Would assign to:', result.assignments[0].engineer_name);
console.log('Score breakdown:', result.assignments[0].score_breakdown);
```

---

## Error Handling

### Common Errors

| Error | HTTP Status | Retry? | Solution |
|-------|-------------|--------|----------|
| `Missing authorization header` | 401 | No | Add valid auth token |
| `Invalid call_ids: must be non-empty array` | 400 | No | Fix request payload |
| `Weights must sum to 1.0` | 400 | No | Adjust weight_overrides |
| `No eligible calls found` | 400 | No | Check call IDs and status |
| `Call is currently being assigned` | 409 | Yes | Retry after 1s |

### Unassigned Reasons

| Reason | Description | Action |
|--------|-------------|--------|
| `no_engineers_in_bank` | No engineers for this bank | Add engineers to bank |
| `no_stock` | Engineers exist but no devices | Restock devices |
| `no_eligible_engineers` | Engineers filtered out | Check eligibility criteria |
| `validation_failed` | Assignment transaction failed | Check error details |

---

## Performance Metrics

Track these KPIs for algorithm health:

| Metric | Target | Query |
|--------|--------|-------|
| Assignment Success Rate | >95% | `assigned / total × 100` |
| Average Execution Time | <500ms | From `statistics.execution_time_ms` |
| Average Distance | <30km | From `statistics.avg_distance_km` |
| Unassigned Due to Stock | <10% | Count `reason='no_stock'` |
| Load Balance (Gini) | <0.3 | STDDEV(calls per engineer) |

### Monitoring Queries

```sql
-- Success rate (last 24 hours)
SELECT
  COUNT(CASE WHEN status != 'pending' THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM calls
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Average assignment distance
SELECT
  AVG(
    6371 * 2 * ASIN(SQRT(
      POW(SIN((c.latitude - up.last_location_lat) * PI() / 180 / 2), 2) +
      COS(up.last_location_lat * PI() / 180) * COS(c.latitude * PI() / 180) *
      POW(SIN((c.longitude - up.last_location_lng) * PI() / 180 / 2), 2)
    ))
  ) as avg_distance_km
FROM calls c
JOIN user_profiles up ON c.assigned_engineer = up.id
WHERE c.status != 'pending'
  AND c.latitude IS NOT NULL
  AND up.last_location_lat IS NOT NULL;

-- Load balance across engineers
SELECT
  assigned_engineer,
  full_name,
  COUNT(*) as active_calls
FROM calls c
JOIN user_profiles up ON c.assigned_engineer = up.id
WHERE status IN ('assigned', 'in_progress')
GROUP BY assigned_engineer, full_name
ORDER BY active_calls DESC;
```

---

## Configuration

### Tunable Parameters

Located in `utils/scoring.ts`:

```typescript
const MAX_DISTANCE_KM = 100;           // Beyond this, proximity = 0
const MAX_CALLS_PER_ENGINEER = 10;     // Workload capacity limit
const IDEAL_STOCK_COUNT = 3;           // Stock for 100 score
const LOCATION_STALENESS_HOURS = 2;    // Location freshness threshold
```

### Region Centers

Default fallback locations in `utils/geo.ts`:

```typescript
const REGION_CENTERS = {
  'North': { lat: -25.7479, lng: 28.2293 },  // Pretoria
  'South': { lat: -33.9249, lng: 18.4241 },  // Cape Town
  'East': { lat: -29.8587, lng: 31.0218 },   // Durban
  'West': { lat: -28.7282, lng: 24.7499 },   // Kimberley
  'Central': { lat: -26.2041, lng: 28.0473 }, // Johannesburg
};
```

---

## Testing

### Manual Testing

1. **Create test calls**:
```sql
INSERT INTO calls (call_number, type, status, client_bank, client_name, client_address, scheduled_date, priority)
VALUES ('TEST-001', 'install', 'pending', '<bank-uuid>', 'Test Client', '123 Test St', CURRENT_DATE, 'urgent');
```

2. **Call assignment API**:
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/assign-calls" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"call_ids": ["call-uuid"]}'
```

3. **Verify result**:
```sql
SELECT * FROM calls WHERE id = 'call-uuid';
SELECT * FROM call_history WHERE call_id = 'call-uuid';
SELECT * FROM notifications WHERE link LIKE '%call-uuid%';
```

### Test Scenarios

See specification document for complete test matrix including:
- No stock scenarios
- Multiple engineer ties
- Remote engineer with stock vs close without
- Bulk assignments
- Concurrent assignment attempts

---

## Troubleshooting

### Issue: All calls unassigned

**Check**:
1. Are engineers active? `SELECT * FROM user_profiles WHERE role='engineer' AND status='active'`
2. Do engineers have stock? `SELECT assigned_to, device_bank, COUNT(*) FROM devices WHERE status IN ('warehouse','issued') GROUP BY 1,2`
3. Do banks match? Verify `call.client_bank = engineer.bank_id`

### Issue: Low scores

**Check**:
1. Engineer locations: Are they stale? Update `last_location_lat/lng`
2. Workload: Are engineers overloaded? Check active call counts
3. Stock: Are stock levels low? Restock devices

### Issue: Slow performance

**Check**:
1. Database indexes: Ensure indexes on `devices(assigned_to, device_bank, status)`
2. Function execution time: Check `statistics.execution_time_ms`
3. Bulk size: Reduce calls per request to <50

---

## Future Enhancements

1. **Skills-Based Routing**: Match engineer skills to call requirements
2. **Time Window Optimization**: Consider engineer's schedule and travel time
3. **Machine Learning**: Predict optimal assignments from historical data
4. **Route Optimization**: Sequence multiple calls for efficient routing
5. **Historical Performance**: Weight by engineer's completion rate and satisfaction
6. **Dynamic Weights**: Adjust weights based on time of day, urgency, etc.

---

## Support

For issues or questions:
1. Check error messages in response
2. Review `call_history` for audit trail
3. Check database logs for transaction failures
4. Monitor `stock_alerts` for low inventory warnings

---

**End of Documentation**
