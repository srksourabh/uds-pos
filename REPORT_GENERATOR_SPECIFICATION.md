# CoSTAR Report Generator Specification
## Comprehensive Reporting System for Calls & Stock Management

**Version:** 1.0
**Date:** 2025-11-30
**Status:** Design Specification

---

## 1. Executive Summary

The CoSTAR Report Generator provides administrators with comprehensive reporting capabilities for service call operations and stock management. The system enables parameterized report generation, scheduled reports, multiple output formats (Excel/PDF), photo evidence integration, and email delivery.

### Key Features
- 12 standard report templates covering all operational metrics
- Parameterized filtering (date range, bank, engineer, region, priority, status)
- Multiple output formats: Excel (XLSX with multiple sheets), PDF, CSV
- Photo proof integration with signed URLs
- Async job processing for large datasets
- Scheduled reports with email delivery
- Export preview (200 rows) for immediate viewing
- Audit trail and report history

---

## 2. Report Catalog

### 2.1 Standard Reports

#### Report 1: Call Summary
**Description:** High-level aggregation of calls by status, priority, bank, and call type.

**Purpose:** Executive dashboard view of call volume and distribution.

**Parameters:**
- Date Range (required)
- Banks (multi-select, default: all)
- Call Status (multi-select, default: all)
- Call Priority (multi-select, default: all)

**Output Sheets:**
1. **Summary** - KPI cards and totals
2. **By Status** - Pivot table: status × bank
3. **By Priority** - Pivot table: priority × call type
4. **By Bank** - Pivot table: bank × status
5. **Trends** - Daily/weekly call counts

**Columns (Summary Sheet):**
```
Total Calls | Pending | Assigned | In Progress | Completed | Cancelled |
Avg Resolution Time | Avg Response Time | On-Time % | SLA Met %
```

**Sample SQL:**
```sql
SELECT
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'assigned') as assigned_count,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at))/60) as avg_resolution_minutes,
  AVG(EXTRACT(EPOCH FROM (started_at - assigned_at))/60) as avg_response_minutes
FROM calls
WHERE scheduled_date BETWEEN $1 AND $2
  AND ($3::uuid[] IS NULL OR client_bank = ANY($3));
```

---

#### Report 2: Call Details
**Description:** Complete row-level detail for every call in the date range.

**Purpose:** Detailed analysis, auditing, and data export for external systems.

**Parameters:**
- Date Range (required)
- Banks (multi-select)
- Engineers (multi-select)
- Status (multi-select)
- Call Type (multi-select)
- Priority (multi-select)

**Output Sheets:**
1. **Call Details** - Full row-level data
2. **Metadata** - Export info and filters used

**Columns:**
```
Call Number | Call Type | Status | Priority | Client Bank | Client Name |
Client Contact | Client Phone | Client Address | Client ID | Latitude | Longitude |
Scheduled Date | Scheduled Time Window | Assigned Engineer | Assigned At |
Started At | Completed At | Response Time (min) | Resolution Time (min) |
Estimated Duration | Actual Duration | Requires Device | Requires Photo |
Description | Resolution Notes | Photos Count | Photo URLs | Created At | Updated At
```

**Photo URLs Column Format:**
```
https://storage.supabase.co/.../photo1.jpg; https://storage.supabase.co/.../photo2.jpg
```

**Sample SQL:**
```sql
SELECT
  c.call_number,
  c.type as call_type,
  c.status,
  c.priority,
  b.name as client_bank,
  c.client_name,
  c.client_contact,
  c.client_phone,
  c.client_address,
  c.client_id,
  c.latitude,
  c.longitude,
  c.scheduled_date,
  c.scheduled_time_window,
  u.full_name as assigned_engineer,
  c.assigned_at,
  c.started_at,
  c.completed_at,
  EXTRACT(EPOCH FROM (c.started_at - c.assigned_at))/60 as response_time_minutes,
  EXTRACT(EPOCH FROM (c.completed_at - c.assigned_at))/60 as resolution_time_minutes,
  c.estimated_duration_minutes,
  c.actual_duration_minutes,
  c.requires_device,
  c.requires_photo,
  c.description,
  c.resolution_notes,
  (SELECT COUNT(*) FROM photos p WHERE p.call_id = c.id) as photos_count,
  (SELECT STRING_AGG(storage_path, '; ') FROM photos p WHERE p.call_id = c.id) as photo_paths,
  c.created_at,
  c.updated_at
FROM calls c
LEFT JOIN banks b ON c.client_bank = b.id
LEFT JOIN user_profiles u ON c.assigned_engineer = u.id
WHERE c.scheduled_date BETWEEN $1 AND $2
  AND ($3::uuid[] IS NULL OR c.client_bank = ANY($3))
  AND ($4::uuid[] IS NULL OR c.assigned_engineer = ANY($4))
  AND ($5::call_status[] IS NULL OR c.status = ANY($5))
  AND ($6::call_type[] IS NULL OR c.type = ANY($6))
  AND ($7::call_priority[] IS NULL OR c.priority = ANY($7))
ORDER BY c.scheduled_date DESC, c.created_at DESC;
```

---

#### Report 3: Call Details FSP (Field Service Provider)
**Description:** Call details formatted for external FSP reporting requirements.

**Purpose:** Compliance reporting for bank clients and external auditors.

**Parameters:**
- Date Range (required)
- Banks (multi-select)

**Output Sheets:**
1. **FSP Report** - Standardized format

**Columns:**
```
Call Reference | Bank Code | Merchant Name | Merchant ID | Address | City | State |
PIN Code | Contact Person | Contact Number | Call Type | Priority | Scheduled Date |
Assigned Engineer Name | Engineer Phone | Attended Date | Completion Date |
Status | TAT (Hours) | Device Serial (if applicable) | Remarks | Photo Evidence
```

**Special Formatting:**
- Date format: DD-MM-YYYY
- TAT calculation: (Completion Date - Scheduled Date) in hours
- Photo Evidence: Hyperlinked cell with "View Photos" text

---

#### Report 4: Call Type Specific
**Description:** Separate sheets for each call type with type-specific metrics.

**Purpose:** Deep-dive analysis by installation, swap, maintenance, breakdown, deinstallation.

**Parameters:**
- Date Range (required)
- Call Type (single select, required)
- Banks (multi-select)

**Output Sheets:**
1. **Summary** - Type-specific KPIs
2. **Details** - Row-level data with type-specific fields

**Type-Specific Columns:**

**Installation:**
```
... standard columns ... | Device Serial | Device Model | Installation Photos |
Pre-Installation Checklist | Post-Installation Verification | Customer Signature
```

**Swap:**
```
... standard columns ... | Old Device Serial | New Device Serial | Swap Reason |
Old Device Status | Photos (Before/After)
```

**Maintenance:**
```
... standard columns ... | Device Serial | Maintenance Type | Issues Found |
Parts Replaced | Firmware Updated | Next Maintenance Due
```

**Breakdown:**
```
... standard columns ... | Device Serial | Fault Description | Root Cause |
Resolution Action | Downtime (hours) | Customer Impact
```

**Deinstallation:**
```
... standard columns ... | Device Serial | Deinstallation Reason |
Device Condition | Return Status | Photos (Final State)
```

---

#### Report 5: Call Details And Activity
**Description:** Calls with complete activity history and audit trail.

**Purpose:** Detailed investigation and compliance audit.

**Parameters:**
- Date Range (required)
- Banks (multi-select)
- Call Number (optional, specific call lookup)

**Output Sheets:**
1. **Calls** - Call master data
2. **Activity Log** - All status changes and actions
3. **Photos** - Photo inventory with metadata
4. **Devices** - Associated devices

**Activity Log Columns:**
```
Call Number | Timestamp | Event Type | Actor (User) | From Status | To Status |
Action Details | Notes | Location (if captured) | IP Address
```

**Sample SQL (Activity Log):**
```sql
-- Reconstruct activity from multiple sources
SELECT
  c.call_number,
  'CREATED' as event_type,
  c.created_at as timestamp,
  NULL as actor,
  NULL as from_status,
  'pending' as to_status,
  'Call created' as details
FROM calls c
WHERE c.id = $1

UNION ALL

SELECT
  c.call_number,
  'ASSIGNED' as event_type,
  c.assigned_at as timestamp,
  up.full_name as actor,
  'pending' as from_status,
  'assigned' as to_status,
  'Assigned to ' || eng.full_name as details
FROM calls c
LEFT JOIN user_profiles up ON up.id = c.updated_by
LEFT JOIN user_profiles eng ON eng.id = c.assigned_engineer
WHERE c.id = $1 AND c.assigned_at IS NOT NULL

UNION ALL

SELECT
  c.call_number,
  'STARTED' as event_type,
  c.started_at as timestamp,
  eng.full_name as actor,
  'assigned' as from_status,
  'in_progress' as to_status,
  'Engineer started work' as details
FROM calls c
LEFT JOIN user_profiles eng ON eng.id = c.assigned_engineer
WHERE c.id = $1 AND c.started_at IS NOT NULL

UNION ALL

SELECT
  c.call_number,
  'COMPLETED' as event_type,
  c.completed_at as timestamp,
  eng.full_name as actor,
  'in_progress' as from_status,
  'completed' as to_status,
  'Call completed' as details
FROM calls c
LEFT JOIN user_profiles eng ON eng.id = c.assigned_engineer
WHERE c.id = $1 AND c.completed_at IS NOT NULL

ORDER BY timestamp ASC;
```

---

#### Report 6: Rolling Volume
**Description:** Call volume trends over time with daily/weekly/monthly aggregations.

**Purpose:** Capacity planning and trend analysis.

**Parameters:**
- Date Range (required)
- Banks (multi-select)
- Granularity (daily, weekly, monthly)

**Output Sheets:**
1. **Volume Trend** - Time series data
2. **Charts** - Embedded bar/line charts
3. **Peak Analysis** - Peak days/hours

**Columns:**
```
Period | Total Calls | New Calls | Completed Calls | Cancelled Calls |
Pending (End of Period) | In Progress (End of Period) | Avg Daily Volume |
Week-over-Week Change % | Month-over-Month Change %
```

**Sample SQL (Daily):**
```sql
SELECT
  DATE(scheduled_date) as period,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE DATE(created_at) = DATE(scheduled_date)) as new_calls,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_calls,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_calls,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_end_of_day,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_end_of_day
FROM calls
WHERE scheduled_date BETWEEN $1 AND $2
  AND ($3::uuid[] IS NULL OR client_bank = ANY($3))
GROUP BY DATE(scheduled_date)
ORDER BY period;
```

---

#### Report 7: Service Performance
**Description:** Engineer-level performance metrics and comparisons.

**Purpose:** Performance management and recognition.

**Parameters:**
- Date Range (required)
- Banks (multi-select)
- Engineers (multi-select)
- Region (multi-select)

**Output Sheets:**
1. **Summary** - Leaderboard
2. **Details** - Per-engineer breakdown
3. **Benchmarks** - Averages and percentiles

**Columns:**
```
Engineer Name | Region | Bank | Total Calls Assigned | Calls Completed |
Calls In Progress | Calls Cancelled | Completion Rate % | Avg Response Time (min) |
Avg Resolution Time (min) | On-Time Completion % | First-Time Fix Rate % |
Customer Satisfaction Score | Photos Uploaded | Distance Traveled (km) |
Performance Score (0-100)
```

**Performance Score Formula:**
```
Performance Score =
  (Completion Rate × 0.30) +
  ((100 - Response Time Percentile) × 0.20) +
  ((100 - Resolution Time Percentile) × 0.20) +
  (On-Time Rate × 0.15) +
  (First-Time Fix Rate × 0.15)
```

**Sample SQL:**
```sql
SELECT
  u.full_name as engineer_name,
  u.region,
  b.name as bank,
  COUNT(*) as total_assigned,
  COUNT(*) FILTER (WHERE c.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE c.status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE c.status = 'cancelled') as cancelled,
  ROUND(COUNT(*) FILTER (WHERE c.status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as completion_rate,
  ROUND(AVG(EXTRACT(EPOCH FROM (c.started_at - c.assigned_at))/60) FILTER (WHERE c.started_at IS NOT NULL), 2) as avg_response_time,
  ROUND(AVG(EXTRACT(EPOCH FROM (c.completed_at - c.assigned_at))/60) FILTER (WHERE c.completed_at IS NOT NULL), 2) as avg_resolution_time,
  ROUND(COUNT(*) FILTER (WHERE c.completed_at <= c.scheduled_date + INTERVAL '1 day')::numeric / NULLIF(COUNT(*) FILTER (WHERE c.status = 'completed'), 0) * 100, 2) as on_time_rate,
  (SELECT COUNT(*) FROM photos p JOIN calls c2 ON p.call_id = c2.id WHERE c2.assigned_engineer = u.id) as photos_uploaded
FROM calls c
JOIN user_profiles u ON c.assigned_engineer = u.id
LEFT JOIN banks b ON u.bank_id = b.id
WHERE c.scheduled_date BETWEEN $1 AND $2
  AND ($3::uuid[] IS NULL OR u.bank_id = ANY($3))
  AND ($4::uuid[] IS NULL OR c.assigned_engineer = ANY($4))
  AND ($5::text[] IS NULL OR u.region = ANY($5))
GROUP BY u.id, u.full_name, u.region, b.name
ORDER BY completion_rate DESC, avg_resolution_time ASC;
```

---

#### Report 8: Response TAT (Turn Around Time)
**Description:** Time from call assignment to engineer starting work.

**Purpose:** Measure responsiveness and SLA compliance.

**Parameters:**
- Date Range (required)
- Banks (multi-select)
- Priority (multi-select)

**Output Sheets:**
1. **Summary** - Aggregated metrics
2. **Details** - Per-call TAT
3. **Distribution** - TAT buckets

**Columns (Summary):**
```
Bank | Priority | Total Calls | Avg Response TAT (min) | Median Response TAT (min) |
90th Percentile TAT | 95th Percentile TAT | Within SLA Count | Within SLA % |
SLA Breaches | Avg Breach Time (min)
```

**SLA Thresholds:**
- Urgent: 60 minutes
- High: 120 minutes
- Medium: 240 minutes
- Low: 480 minutes

**Sample SQL:**
```sql
SELECT
  b.name as bank,
  c.priority,
  COUNT(*) as total_calls,
  ROUND(AVG(EXTRACT(EPOCH FROM (c.started_at - c.assigned_at))/60), 2) as avg_tat,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.started_at - c.assigned_at))/60), 2) as median_tat,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.started_at - c.assigned_at))/60), 2) as p90_tat,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.started_at - c.assigned_at))/60), 2) as p95_tat,
  COUNT(*) FILTER (WHERE
    EXTRACT(EPOCH FROM (c.started_at - c.assigned_at))/60 <=
    CASE c.priority
      WHEN 'urgent' THEN 60
      WHEN 'high' THEN 120
      WHEN 'medium' THEN 240
      WHEN 'low' THEN 480
    END
  ) as within_sla,
  ROUND(COUNT(*) FILTER (WHERE
    EXTRACT(EPOCH FROM (c.started_at - c.assigned_at))/60 <=
    CASE c.priority
      WHEN 'urgent' THEN 60
      WHEN 'high' THEN 120
      WHEN 'medium' THEN 240
      WHEN 'low' THEN 480
    END
  )::numeric / NULLIF(COUNT(*), 0) * 100, 2) as sla_percentage
FROM calls c
JOIN banks b ON c.client_bank = b.id
WHERE c.scheduled_date BETWEEN $1 AND $2
  AND c.started_at IS NOT NULL
  AND ($3::uuid[] IS NULL OR c.client_bank = ANY($3))
  AND ($4::call_priority[] IS NULL OR c.priority = ANY($4))
GROUP BY b.name, c.priority
ORDER BY b.name, c.priority;
```

---

#### Report 9: Resolution TAT
**Description:** Time from call assignment to completion.

**Purpose:** Measure end-to-end efficiency.

**Parameters:**
- Date Range (required)
- Banks (multi-select)
- Call Type (multi-select)

**Output Sheets:**
1. **Summary** - Aggregated metrics by bank and call type
2. **Details** - Per-call resolution TAT
3. **Trends** - Daily resolution TAT trends

**Columns (Summary):**
```
Bank | Call Type | Total Completed | Avg Resolution TAT (min) | Median Resolution TAT (min) |
90th Percentile | 95th Percentile | Min TAT | Max TAT | Std Deviation
```

**Sample SQL:**
```sql
SELECT
  b.name as bank,
  c.type as call_type,
  COUNT(*) as total_completed,
  ROUND(AVG(EXTRACT(EPOCH FROM (c.completed_at - c.assigned_at))/60), 2) as avg_tat,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.completed_at - c.assigned_at))/60), 2) as median_tat,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.completed_at - c.assigned_at))/60), 2) as p90_tat,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.completed_at - c.assigned_at))/60), 2) as p95_tat,
  ROUND(MIN(EXTRACT(EPOCH FROM (c.completed_at - c.assigned_at))/60), 2) as min_tat,
  ROUND(MAX(EXTRACT(EPOCH FROM (c.completed_at - c.assigned_at))/60), 2) as max_tat,
  ROUND(STDDEV(EXTRACT(EPOCH FROM (c.completed_at - c.assigned_at))/60), 2) as stddev_tat
FROM calls c
JOIN banks b ON c.client_bank = b.id
WHERE c.scheduled_date BETWEEN $1 AND $2
  AND c.status = 'completed'
  AND c.completed_at IS NOT NULL
  AND ($3::uuid[] IS NULL OR c.client_bank = ANY($3))
  AND ($4::call_type[] IS NULL OR c.type = ANY($4))
GROUP BY b.name, c.type
ORDER BY b.name, c.type;
```

---

#### Report 10: Bounce Call
**Description:** Calls that were reassigned, cancelled, or rescheduled after initial assignment.

**Purpose:** Identify service quality issues and inefficiencies.

**Parameters:**
- Date Range (required)
- Banks (multi-select)

**Output Sheets:**
1. **Summary** - Bounce rate by bank and reason
2. **Details** - Bounced call list with reasons

**Bounce Reasons:**
- Engineer unavailable
- Parts not available
- Customer rescheduled
- Wrong address
- Device compatibility issue
- Other

**Columns:**
```
Call Number | Client Name | Bank | Call Type | Original Assignment Date |
Original Engineer | Bounce Date | Bounce Reason | Reassigned To | Final Status |
Total Bounces | Days Delayed
```

**Sample SQL:**
```sql
-- Detect bounces from stock_movements reassignment pattern
SELECT
  c.call_number,
  c.client_name,
  b.name as bank,
  c.type as call_type,
  c.assigned_at as original_assignment,
  u1.full_name as original_engineer,
  -- Detect reassignment pattern
  c.status as final_status
FROM calls c
JOIN banks b ON c.client_bank = b.id
LEFT JOIN user_profiles u1 ON c.assigned_engineer = u1.id
WHERE c.scheduled_date BETWEEN $1 AND $2
  AND ($3::uuid[] IS NULL OR c.client_bank = ANY($3))
  -- Logic: check if call was reassigned (metadata tracking needed)
  AND c.metadata->>'reassigned' = 'true'
ORDER BY c.assigned_at DESC;
```

**Note:** Requires enhancement to track reassignment history in `calls.metadata` or separate `call_reassignments` table.

---

#### Report 11: Pending Call Ageing
**Description:** All pending calls with days open and ageing buckets.

**Purpose:** Prioritize old pending calls and prevent SLA breaches.

**Parameters:**
- As Of Date (default: today)
- Banks (multi-select)
- Min Days Open (default: 0)

**Output Sheets:**
1. **Summary** - Ageing buckets
2. **Details** - Per-call ageing

**Ageing Buckets:**
- 0-1 days
- 2-3 days
- 4-7 days
- 8-14 days
- 15-30 days
- 31+ days

**Columns:**
```
Call Number | Client Name | Bank | Call Type | Priority | Scheduled Date |
Days Open | Ageing Bucket | Assigned Engineer | Status | Reason for Delay
```

**Sample SQL:**
```sql
SELECT
  c.call_number,
  c.client_name,
  b.name as bank,
  c.type as call_type,
  c.priority,
  c.scheduled_date,
  (CURRENT_DATE - c.scheduled_date) as days_open,
  CASE
    WHEN (CURRENT_DATE - c.scheduled_date) <= 1 THEN '0-1 days'
    WHEN (CURRENT_DATE - c.scheduled_date) BETWEEN 2 AND 3 THEN '2-3 days'
    WHEN (CURRENT_DATE - c.scheduled_date) BETWEEN 4 AND 7 THEN '4-7 days'
    WHEN (CURRENT_DATE - c.scheduled_date) BETWEEN 8 AND 14 THEN '8-14 days'
    WHEN (CURRENT_DATE - c.scheduled_date) BETWEEN 15 AND 30 THEN '15-30 days'
    ELSE '31+ days'
  END as ageing_bucket,
  u.full_name as assigned_engineer,
  c.status,
  c.metadata->>'delay_reason' as reason_for_delay
FROM calls c
JOIN banks b ON c.client_bank = b.id
LEFT JOIN user_profiles u ON c.assigned_engineer = u.id
WHERE c.status IN ('pending', 'assigned', 'in_progress')
  AND ($1::uuid[] IS NULL OR c.client_bank = ANY($1))
  AND (CURRENT_DATE - c.scheduled_date) >= $2
ORDER BY days_open DESC, c.priority DESC;
```

---

#### Report 12: Post-Installation Survey Summary and Details
**Description:** Customer feedback and satisfaction scores post-installation.

**Purpose:** Measure customer satisfaction and identify improvement areas.

**Parameters:**
- Date Range (required)
- Banks (multi-select)
- Min Rating (1-5)

**Output Sheets:**
1. **Summary** - Overall satisfaction scores
2. **Details** - Individual survey responses
3. **Comments** - Qualitative feedback

**Columns (Summary):**
```
Bank | Total Surveys | Avg Rating | 5-Star % | 4-Star % | 3-Star % | 2-Star % | 1-Star % |
NPS Score | Response Rate % | Top Issues (from comments)
```

**Columns (Details):**
```
Call Number | Client Name | Engineer Name | Installation Date | Survey Date |
Overall Rating | Installation Quality | Engineer Professionalism | Timeliness |
Device Functionality | Comments | Would Recommend (Y/N)
```

**Note:** Requires `customer_surveys` table to be created. Schema:
```sql
CREATE TABLE IF NOT EXISTS customer_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  survey_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  installation_quality INTEGER CHECK (installation_quality BETWEEN 1 AND 5),
  engineer_professionalism INTEGER CHECK (engineer_professionalism BETWEEN 1 AND 5),
  timeliness INTEGER CHECK (timeliness BETWEEN 1 AND 5),
  device_functionality INTEGER CHECK (device_functionality BETWEEN 1 AND 5),
  would_recommend BOOLEAN,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Report Parameters

### 3.1 Common Parameters

All reports support these standard parameters:

```typescript
interface CommonReportParams {
  dateFrom: string; // ISO date YYYY-MM-DD
  dateTo: string;   // ISO date YYYY-MM-DD
  banks?: string[]; // Array of bank UUIDs
  regions?: string[]; // Array of region names
  engineers?: string[]; // Array of engineer UUIDs
  status?: ('pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled')[];
  callType?: ('installation' | 'swap' | 'deinstallation' | 'maintenance' | 'breakdown')[];
  priority?: ('low' | 'medium' | 'high' | 'urgent')[];
}
```

### 3.2 Report-Specific Parameters

```typescript
interface ReportSpecificParams {
  // Report 3: Call Details FSP
  fspFormat?: 'standard' | 'custom';

  // Report 4: Call Type Specific
  selectedCallType: 'installation' | 'swap' | 'deinstallation' | 'maintenance' | 'breakdown';

  // Report 5: Call Details And Activity
  specificCallNumber?: string;

  // Report 6: Rolling Volume
  granularity: 'daily' | 'weekly' | 'monthly';

  // Report 11: Pending Call Ageing
  asOfDate?: string; // Default: today
  minDaysOpen?: number; // Default: 0

  // Report 12: Post-Installation Survey
  minRating?: number; // 1-5
}
```

### 3.3 Output Configuration

```typescript
interface OutputConfig {
  format: 'xlsx' | 'pdf' | 'csv';
  includeCharts?: boolean; // For PDF/XLSX
  includeMetadata?: boolean; // Export info sheet
  includePhotos?: boolean; // Embed or link
  photoFormat?: 'link' | 'embed'; // Links = signed URLs, Embed = base64
  maxRows?: number; // For preview mode
  isPreview?: boolean; // If true, limit to 200 rows
}
```

---

## 4. API Specification

### 4.1 Generate Report Endpoint

**Endpoint:** `POST /functions/v1/generate-report`

**Request Headers:**
```
Authorization: Bearer {supabase_anon_key}
Content-Type: application/json
```

**Request Body:**
```typescript
interface GenerateReportRequest {
  reportId: string; // 'call-summary', 'call-details', etc.
  params: CommonReportParams & ReportSpecificParams;
  output: OutputConfig;
  requestorId: string; // User UUID
  schedule?: ScheduleConfig; // If scheduling
}

interface ScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM in UTC
  recipients: string[]; // Email addresses
  timezone?: string; // IANA timezone
}
```

**Response (Sync - Small Reports):**
```typescript
interface GenerateReportResponseSync {
  success: true;
  reportId: string;
  downloadUrl: string; // Pre-signed URL valid for 1 hour
  filename: string;
  fileSize: number;
  rowCount: number;
  generatedAt: string;
  expiresAt: string;
}
```

**Response (Async - Large Reports):**
```typescript
interface GenerateReportResponseAsync {
  success: true;
  jobId: string;
  status: 'queued' | 'processing';
  estimatedCompletionSeconds: number;
  statusUrl: string; // Poll this URL for status
}
```

**Response (Error):**
```typescript
interface GenerateReportError {
  success: false;
  error: string;
  errorCode: string;
  details?: any;
}
```

**Error Codes:**
- `INVALID_REPORT_ID`: Unknown report template
- `INVALID_PARAMETERS`: Missing or invalid params
- `UNAUTHORIZED`: User not admin
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `QUERY_TIMEOUT`: Report query took too long
- `EXPORT_FAILED`: File generation failed
- `STORAGE_ERROR`: Cannot upload to storage

### 4.2 Check Report Status Endpoint

**Endpoint:** `GET /functions/v1/report-status/{jobId}`

**Response:**
```typescript
interface ReportStatusResponse {
  success: true;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  message?: string;
  downloadUrl?: string; // If completed
  error?: string; // If failed
  createdAt: string;
  completedAt?: string;
}
```

### 4.3 List Scheduled Reports Endpoint

**Endpoint:** `GET /functions/v1/scheduled-reports`

**Query Params:**
- `userId` (optional): Filter by creator

**Response:**
```typescript
interface ScheduledReportsResponse {
  success: true;
  schedules: ScheduledReport[];
}

interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  schedule: ScheduleConfig;
  lastRun?: string;
  lastRunStatus?: 'success' | 'failed';
  nextRun: string;
  createdBy: string;
  createdAt: string;
}
```

### 4.4 Report History Endpoint

**Endpoint:** `GET /functions/v1/report-history`

**Query Params:**
- `limit` (default: 50)
- `offset` (default: 0)
- `reportId` (optional): Filter by report type
- `userId` (optional): Filter by creator

**Response:**
```typescript
interface ReportHistoryResponse {
  success: true;
  reports: ReportHistory[];
  total: number;
}

interface ReportHistory {
  id: string;
  reportId: string;
  reportName: string;
  params: any;
  format: string;
  rowCount: number;
  fileSize: number;
  downloadUrl?: string; // If still available
  generatedBy: string;
  generatedAt: string;
  expiresAt?: string;
}
```

---

## 5. Database Schema

### 5.1 Report Jobs Table

```sql
CREATE TABLE IF NOT EXISTS report_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id TEXT NOT NULL UNIQUE,
  report_id TEXT NOT NULL,
  report_name TEXT NOT NULL,
  params JSONB NOT NULL,
  output_config JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,
  row_count INTEGER,
  file_size INTEGER,
  download_url TEXT,
  error TEXT,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_report_jobs_status ON report_jobs(status);
CREATE INDEX idx_report_jobs_requested_by ON report_jobs(requested_by, created_at DESC);
CREATE INDEX idx_report_jobs_job_id ON report_jobs(job_id);
```

### 5.2 Scheduled Reports Table

```sql
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id TEXT NOT NULL,
  report_name TEXT NOT NULL,
  params JSONB NOT NULL,
  output_config JSONB NOT NULL,
  schedule_config JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed')),
  last_run_error TEXT,
  next_run_at TIMESTAMPTZ NOT NULL,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE enabled = TRUE;
CREATE INDEX idx_scheduled_reports_created_by ON scheduled_reports(created_by);
```

### 5.3 Customer Surveys Table (New)

```sql
CREATE TABLE IF NOT EXISTS customer_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  survey_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  installation_quality INTEGER CHECK (installation_quality BETWEEN 1 AND 5),
  engineer_professionalism INTEGER CHECK (engineer_professionalism BETWEEN 1 AND 5),
  timeliness INTEGER CHECK (timeliness BETWEEN 1 AND 5),
  device_functionality INTEGER CHECK (device_functionality BETWEEN 1 AND 5),
  would_recommend BOOLEAN,
  comments TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(call_id) -- One survey per call
);

CREATE INDEX idx_customer_surveys_call_id ON customer_surveys(call_id);
CREATE INDEX idx_customer_surveys_survey_date ON customer_surveys(survey_date);
CREATE INDEX idx_customer_surveys_overall_rating ON customer_surveys(overall_rating);
```

### 5.4 RLS Policies

```sql
-- Report Jobs
ALTER TABLE report_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all report jobs"
  ON report_jobs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view own report jobs"
  ON report_jobs FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

-- Scheduled Reports
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all scheduled reports"
  ON scheduled_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Customer Surveys
ALTER TABLE customer_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all surveys"
  ON customer_surveys FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

## 6. Frontend Component Architecture

### 6.1 Component Hierarchy

```
<ReportsPage>
├── <ReportCatalog>
│   └── <ReportCard> (x12 for each report)
│       ├── Report icon, name, description
│       ├── <RunNowButton>
│       └── <ScheduleButton>
│
├── <ReportConfigModal>
│   ├── <CommonFilters>
│   │   ├── DateRangePicker
│   │   ├── BankMultiSelect
│   │   ├── EngineerMultiSelect
│   │   ├── RegionMultiSelect
│   │   ├── StatusMultiSelect
│   │   └── PriorityMultiSelect
│   │
│   ├── <ReportSpecificFilters> (dynamic based on report)
│   │
│   ├── <OutputFormatSelector>
│   │   ├── Format: XLSX | PDF | CSV
│   │   ├── Include Charts toggle
│   │   └── Photo Handling: Links | Embed
│   │
│   └── <PreviewButton> + <GenerateButton>
│
├── <ReportPreviewModal>
│   ├── <PreviewTable> (first 200 rows)
│   └── <GenerateFullButton>
│
├── <ReportGenerationProgress>
│   ├── Progress bar
│   ├── Status message
│   └── Cancel button
│
├── <ReportDownloadModal>
│   ├── Download link
│   ├── File info (size, rows, format)
│   ├── Expiration time
│   └── <DownloadButton>
│
├── <ScheduleReportModal>
│   ├── <FrequencySelector>
│   ├── <TimeSelector>
│   ├── <RecipientEmails>
│   └── <SaveScheduleButton>
│
└── <ReportHistoryTable>
    ├── Past reports list
    ├── Re-download links
    └── Delete button
```

### 6.2 State Management

```typescript
interface ReportsPageState {
  selectedReport: ReportTemplate | null;
  showConfigModal: boolean;
  showPreviewModal: boolean;
  showScheduleModal: boolean;

  filters: CommonReportParams & ReportSpecificParams;
  outputConfig: OutputConfig;

  previewData: {
    rows: any[];
    columns: string[];
    totalRows: number;
  } | null;

  generationStatus: {
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
  } | null;

  reportHistory: ReportHistory[];
  scheduledReports: ScheduledReport[];
}
```

### 6.3 Report Templates Definition

```typescript
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon name from lucide-react
  category: 'calls' | 'performance' | 'tat' | 'surveys';
  params: {
    common: (keyof CommonReportParams)[];
    specific?: ReportSpecificParams;
  };
  asyncThreshold: number; // Row count above which goes async
  estimatedTime: string; // e.g., "2-5 minutes"
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'call-summary',
    name: 'Call Summary',
    description: 'High-level aggregation of calls by status, priority, and bank',
    icon: 'BarChart3',
    category: 'calls',
    params: {
      common: ['dateFrom', 'dateTo', 'banks', 'status', 'priority']
    },
    asyncThreshold: 10000,
    estimatedTime: '1-2 minutes'
  },
  {
    id: 'call-details',
    name: 'Call Details',
    description: 'Complete row-level detail for every call',
    icon: 'FileText',
    category: 'calls',
    params: {
      common: ['dateFrom', 'dateTo', 'banks', 'engineers', 'status', 'callType', 'priority']
    },
    asyncThreshold: 5000,
    estimatedTime: '2-5 minutes'
  },
  // ... more reports
];
```

---

## 7. Excel Generation

### 7.1 XLSX Library

**Recommended:** `exceljs` (Node.js compatible, works in Deno Edge Functions)

**Installation:**
```typescript
import ExcelJS from 'npm:exceljs@4.4.0';
```

### 7.2 Excel Formatting Standards

**Workbook Structure:**
```
Workbook
├── Metadata Sheet (if includeMetadata = true)
├── Summary Sheet (if applicable)
├── Details Sheet (always)
├── Charts Sheet (if includeCharts = true)
└── Additional Sheets (report-specific)
```

**Header Row Styling:**
```typescript
const headerStyle = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  }
};
```

**Data Row Styling:**
```typescript
const dataStyle = {
  font: { size: 11 },
  alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
  border: {
    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }
  }
};
```

**Column Width Auto-Sizing:**
```typescript
worksheet.columns.forEach(column => {
  let maxLength = 0;
  column.eachCell({ includeEmpty: false }, cell => {
    const cellLength = cell.value?.toString().length || 0;
    maxLength = Math.max(maxLength, cellLength);
  });
  column.width = Math.min(Math.max(maxLength + 2, 10), 50);
});
```

**Photo URL Hyperlinks:**
```typescript
cell.value = {
  text: 'View Photos',
  hyperlink: signedPhotoUrl,
  tooltip: 'Click to view photos'
};
cell.font = { color: { argb: 'FF0066CC' }, underline: true };
```

### 7.3 Metadata Sheet

```typescript
const metadataSheet = workbook.addWorksheet('Export Info');
metadataSheet.addRow(['Report Name', reportName]);
metadataSheet.addRow(['Generated At', new Date().toISOString()]);
metadataSheet.addRow(['Generated By', userName]);
metadataSheet.addRow(['Date Range', `${dateFrom} to ${dateTo}`]);
metadataSheet.addRow(['Banks Filter', banksFilter.join(', ') || 'All']);
metadataSheet.addRow(['Status Filter', statusFilter.join(', ') || 'All']);
metadataSheet.addRow(['Total Records', rowCount]);
metadataSheet.addRow(['File Format', 'XLSX']);
metadataSheet.addRow(['Expires At', expiresAt]);
```

### 7.4 Charts in Excel

**Example: Bar Chart for Call Summary**
```typescript
const chart = worksheet.addChart({
  type: 'bar',
  name: 'Calls by Status',
  position: { type: 'absolute', x: 100, y: 100 }
});

chart.setTitle('Call Distribution by Status');
chart.setValues([
  { name: 'Pending', values: [pendingCount] },
  { name: 'Assigned', values: [assignedCount] },
  { name: 'In Progress', values: [inProgressCount] },
  { name: 'Completed', values: [completedCount] },
  { name: 'Cancelled', values: [cancelledCount] }
]);
```

---

## 8. PDF Generation

### 8.1 PDF Library

**Recommended:** `pdfkit` or `puppeteer` (for HTML-to-PDF)

**For Simple Reports:** Use `pdfkit`
**For Complex Reports with Charts:** Use `puppeteer` to render HTML template

### 8.2 PDF Layout

**Header:**
```
[Company Logo]                    Report Name
                                  Date Range: {dateFrom} to {dateTo}
                                  Generated: {timestamp}
----------------------------------------------------------------
```

**KPI Summary (Top Section):**
```
┌─────────────────┬─────────────────┬─────────────────┐
│  Total Calls    │  Completed      │  Avg TAT        │
│     1,234       │      950        │   45 min        │
└─────────────────┴─────────────────┴─────────────────┘
```

**Chart Section:**
```
[Bar Chart: Calls by Status]
[Line Chart: Daily Trends]
```

**Data Table:**
```
┌──────────────┬────────────┬──────────┬─────────┐
│ Call Number  │ Client     │ Status   │ TAT     │
├──────────────┼────────────┼──────────┼─────────┤
│ CALL-2025-001│ ABC Corp   │ Complete │ 42 min  │
│ CALL-2025-002│ XYZ Ltd    │ Complete │ 38 min  │
└──────────────┴────────────┴──────────┴─────────┘
```

**Footer:**
```
Page 1 of 10                                    Generated by CoSTAR v1.0
```

### 8.3 PDF with Puppeteer (Recommended)

**Advantages:**
- Render HTML/CSS (use existing React components)
- Include charts from Recharts
- Better formatting control

**Process:**
1. Render report data to HTML template
2. Use Puppeteer to open headless browser
3. Load HTML
4. Generate PDF
5. Upload to Supabase Storage

**Sample Code:**
```typescript
import puppeteer from 'npm:puppeteer@21.6.0';

async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setContent(htmlContent);

  const pdf = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  await browser.close();
  return pdf;
}
```

---

## 9. Photo Evidence Integration

### 9.1 Signed URLs

**Generate signed URLs for photos:**
```typescript
async function getSignedPhotoUrls(callId: string): Promise<string[]> {
  const { data: photos } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('call_id', callId);

  if (!photos) return [];

  const signedUrls = await Promise.all(
    photos.map(async (photo) => {
      const { data } = await supabase.storage
        .from('photos')
        .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry
      return data?.signedUrl || '';
    })
  );

  return signedUrls.filter(url => url);
}
```

### 9.2 Excel Photo Links

**Format:**
```
Cell Value: "View Photos (3)"
Hyperlink: https://storage.supabase.co/.../photo1.jpg; https://storage.supabase.co/.../photo2.jpg
```

**Implementation:**
```typescript
const photoUrls = await getSignedPhotoUrls(call.id);
if (photoUrls.length > 0) {
  cell.value = {
    text: `View Photos (${photoUrls.length})`,
    hyperlink: photoUrls[0], // First photo
    tooltip: photoUrls.join('\n')
  };
  cell.font = { color: { argb: 'FF0066CC' }, underline: true };
} else {
  cell.value = 'No photos';
}
```

### 9.3 PDF Photo Thumbnails

**Embed small thumbnails (optional):**
```typescript
// Download photo, resize to thumbnail, embed in PDF
async function embedPhotoThumbnail(doc: PDFDocument, photoUrl: string, x: number, y: number) {
  const response = await fetch(photoUrl);
  const buffer = await response.arrayBuffer();
  const image = await doc.embedJpg(buffer);

  const thumbnailSize = 50; // 50x50 pixels
  doc.image(image, x, y, { width: thumbnailSize, height: thumbnailSize });
}
```

---

## 10. Scheduled Reports & Email

### 10.1 Scheduling Logic

**Cron Job (Supabase Edge Function or External Service):**

Run every hour, check for due scheduled reports:
```sql
SELECT * FROM scheduled_reports
WHERE enabled = TRUE
  AND next_run_at <= NOW()
ORDER BY next_run_at ASC;
```

For each due report:
1. Generate report
2. Upload to storage
3. Send email to recipients
4. Update `last_run_at`, `next_run_at`, `run_count`

**Calculate Next Run:**
```typescript
function calculateNextRun(schedule: ScheduleConfig, lastRun: Date): Date {
  const next = new Date(lastRun);

  switch (schedule.frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }

  // Set time
  const [hour, minute] = schedule.time.split(':');
  next.setHours(parseInt(hour), parseInt(minute), 0, 0);

  return next;
}
```

### 10.2 Email Template

**Subject:**
```
[CoSTAR] {Report Name} - {Date Range}
```

**HTML Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .header { background: #0066CC; color: white; padding: 20px; }
    .summary { padding: 20px; background: #F5F5F5; margin: 20px 0; }
    .kpi { display: inline-block; margin: 10px 20px; }
    .kpi-label { font-size: 12px; color: #666; }
    .kpi-value { font-size: 24px; font-weight: bold; color: #0066CC; }
    .cta { background: #0066CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CoSTAR Report: {Report Name}</h1>
    <p>Date Range: {dateFrom} to {dateTo}</p>
    <p>Generated: {timestamp}</p>
  </div>

  <div class="summary">
    <h2>Summary</h2>
    <div class="kpi">
      <div class="kpi-label">Total Calls</div>
      <div class="kpi-value">{totalCalls}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Completed</div>
      <div class="kpi-value">{completedCalls}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Avg TAT</div>
      <div class="kpi-value">{avgTAT} min</div>
    </div>
  </div>

  <div style="padding: 20px;">
    <p>Your scheduled report is ready for download.</p>
    <p>
      <a href="{downloadUrl}" class="cta">Download Report</a>
    </p>
    <p style="color: #666; font-size: 12px;">
      This link expires in 24 hours. Please download the report before {expiresAt}.
    </p>
  </div>

  <div style="padding: 20px; background: #F5F5F5; font-size: 12px; color: #666;">
    <p>This is an automated email from CoSTAR. If you no longer wish to receive this report, please contact your administrator.</p>
  </div>
</body>
</html>
```

### 10.3 Email Delivery

**SMTP Configuration:**
```typescript
interface SMTPConfig {
  host: string; // e.g., smtp.gmail.com
  port: number; // 587 for TLS
  secure: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string;
  };
}

async function sendEmail(to: string[], subject: string, html: string, attachments?: any[]) {
  const transporter = nodemailer.createTransport(smtpConfig);

  await transporter.sendMail({
    from: '"CoSTAR Reports" <noreply@costar.com>',
    to: to.join(', '),
    subject,
    html,
    attachments
  });
}
```

**Alternative: Supabase Edge Function + External Email Service**
- Use SendGrid, Mailgun, or AWS SES
- Call API from Edge Function

---

## 11. Performance Optimization

### 11.1 Query Optimization

**Use Materialized Views for Expensive Aggregations:**
```sql
CREATE MATERIALIZED VIEW mv_daily_call_stats AS
SELECT
  DATE(scheduled_date) as stat_date,
  client_bank,
  status,
  priority,
  type as call_type,
  COUNT(*) as call_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at))/60) as avg_resolution_time
FROM calls
GROUP BY DATE(scheduled_date), client_bank, status, priority, type;

CREATE UNIQUE INDEX idx_mv_daily_call_stats ON mv_daily_call_stats(stat_date, client_bank, status, priority, call_type);

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_call_stats;
```

**Use Indexes for Common Filters:**
```sql
CREATE INDEX idx_calls_scheduled_date_status ON calls(scheduled_date, status);
CREATE INDEX idx_calls_bank_date ON calls(client_bank, scheduled_date);
CREATE INDEX idx_calls_engineer_date ON calls(assigned_engineer, scheduled_date);
```

### 11.2 Pagination for Large Datasets

**Stream results in batches:**
```typescript
async function* streamCallDetails(params: any, batchSize = 1000) {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .range(offset, offset + batchSize - 1)
      // ... filters
      .order('scheduled_date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    yield data;
    offset += batchSize;
    hasMore = data.length === batchSize;
  }
}
```

### 11.3 Async Processing Threshold

**Decision Logic:**
```typescript
async function shouldProcessAsync(reportId: string, params: any): Promise<boolean> {
  // Estimate row count
  const { count } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true })
    // ... apply filters from params

  const threshold = REPORT_TEMPLATES.find(r => r.id === reportId)?.asyncThreshold || 5000;

  return (count || 0) > threshold;
}
```

### 11.4 Caching Strategy

**Cache frequently accessed data:**
```typescript
const CACHE_TTL = 300; // 5 minutes

async function getCachedBanks(): Promise<Bank[]> {
  const cacheKey = 'banks:all';
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const { data } = await supabase.from('banks').select('*');
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));

  return data || [];
}
```

---

## 12. Security & Access Control

### 12.1 Authorization

**All report endpoints require admin role:**
```typescript
async function verifyAdminAccess(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return profile?.role === 'admin';
}
```

### 12.2 Rate Limiting

**Prevent report spam:**
```typescript
const RATE_LIMITS = {
  perUser: 10, // 10 reports per hour
  perIP: 20,   // 20 reports per hour per IP
};

async function checkRateLimit(userId: string, ip: string): Promise<boolean> {
  const userKey = `rate:report:user:${userId}`;
  const ipKey = `rate:report:ip:${ip}`;

  const [userCount, ipCount] = await Promise.all([
    redis.incr(userKey),
    redis.incr(ipKey)
  ]);

  if (userCount === 1) await redis.expire(userKey, 3600);
  if (ipCount === 1) await redis.expire(ipKey, 3600);

  return userCount <= RATE_LIMITS.perUser && ipCount <= RATE_LIMITS.perIP;
}
```

### 12.3 Data Filtering by Bank

**If users have bank restrictions, filter reports:**
```typescript
async function getBankAccessList(userId: string): Promise<string[]> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('bank_id, role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'admin' && !profile.bank_id) {
    // Super admin, access all banks
    const { data: banks } = await supabase.from('banks').select('id');
    return banks?.map(b => b.id) || [];
  }

  // Restricted to specific bank
  return profile?.bank_id ? [profile.bank_id] : [];
}
```

### 12.4 Signed URL Expiry

**Short expiry for security:**
```typescript
const DOWNLOAD_URL_EXPIRY = 3600; // 1 hour
const SCHEDULED_REPORT_EXPIRY = 86400; // 24 hours

async function uploadReportAndGetSignedUrl(
  fileBuffer: Buffer,
  filename: string,
  isScheduled: boolean
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(filename, fileBuffer, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  if (uploadError) throw uploadError;

  const expiry = isScheduled ? SCHEDULED_REPORT_EXPIRY : DOWNLOAD_URL_EXPIRY;

  const { data } = await supabase.storage
    .from('reports')
    .createSignedUrl(filename, expiry);

  return data?.signedUrl || '';
}
```

---

## 13. Testing Strategy

### 13.1 Test Reports

| Test Case | Report ID | Params | Expected Outcome |
|-----------|-----------|--------|------------------|
| TC-R01 | call-summary | Date: last 30 days, All banks | Summary with pivot tables |
| TC-R02 | call-details | Date: last 7 days, 1 bank, 1000 rows | XLSX with all columns |
| TC-R03 | response-tat | Date: last 30 days, Priority: urgent | TAT analysis with SLA % |
| TC-R04 | resolution-tat | Date: last 30 days, All banks | TAT by call type |
| TC-R05 | pending-ageing | As of: today, Min days: 3 | Aged pending calls list |
| TC-R06 | service-performance | Date: last 30 days, All engineers | Performance scores |
| TC-R07 | rolling-volume | Date: last 90 days, Granularity: weekly | Weekly trend chart |
| TC-R08 | call-details | Date: last 30 days, 10000 rows | Async job, completed in <5 min |
| TC-R09 | call-details-fsp | Date: last 7 days, 1 bank | FSP format compliance |
| TC-R10 | call-type-specific | Type: installation, Last 30 days | Installation-specific fields |

### 13.2 Performance Benchmarks

**Target Metrics:**
- Small report (<1000 rows): Generate in <10 seconds
- Medium report (1000-5000 rows): Generate in <30 seconds
- Large report (5000-10000 rows): Generate in <2 minutes (async)
- Very large report (10000+ rows): Generate in <5 minutes (async)

### 13.3 Edge Cases

- Empty result set (no data in date range)
- Single row result
- Missing photos (graceful handling)
- Null values in optional fields
- Timezone edge cases (DST transitions)
- Long text fields (truncation or wrapping)
- Special characters in names (Unicode)

---

## 14. Monitoring & Observability

### 14.1 Metrics to Track

**Report Generation Metrics:**
- Total reports generated (count)
- Reports by type (breakdown)
- Avg generation time by report type
- Success rate (%)
- Async job completion rate

**Performance Metrics:**
- Query execution time (p50, p95, p99)
- File generation time
- Upload to storage time
- Email delivery time (for scheduled)

**Error Metrics:**
- Failed reports by error code
- Query timeouts
- Storage upload failures
- Email delivery failures

### 14.2 Logging

**Log Structure:**
```typescript
interface ReportLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  reportId: string;
  jobId?: string;
  userId: string;
  action: string;
  duration?: number;
  rowCount?: number;
  fileSize?: number;
  error?: string;
  metadata?: any;
}
```

**Example Logs:**
```json
{
  "timestamp": "2025-11-30T10:15:00Z",
  "level": "info",
  "reportId": "call-details",
  "jobId": "job_xyz",
  "userId": "user_123",
  "action": "report_started",
  "metadata": { "dateFrom": "2025-11-01", "dateTo": "2025-11-30" }
}

{
  "timestamp": "2025-11-30T10:17:45Z",
  "level": "info",
  "reportId": "call-details",
  "jobId": "job_xyz",
  "userId": "user_123",
  "action": "report_completed",
  "duration": 165,
  "rowCount": 4523,
  "fileSize": 1245678
}
```

### 14.3 Alerts

**Critical Alerts:**
- Report generation failure rate >10%
- Query timeout rate >5%
- Scheduled report delivery failures

**Warning Alerts:**
- Report generation time >5 minutes
- Storage upload errors
- Email bounce rate >2%

---

## 15. Acceptance Criteria

### 15.1 Functional Requirements

- [ ] All 12 reports generate successfully with sample data
- [ ] Parameterized filtering works correctly (date, bank, engineer, etc.)
- [ ] Excel output has multiple sheets with correct data
- [ ] PDF output includes charts and formatted tables
- [ ] Photo URLs are signed and accessible
- [ ] Preview mode shows first 200 rows
- [ ] Async processing works for large datasets
- [ ] Progress tracking updates in real-time
- [ ] Download links expire after 1 hour
- [ ] Scheduled reports run on time and email recipients
- [ ] Report history shows past 30 days

### 15.2 Performance Requirements

- [ ] Small reports (<1000 rows) generate in <10 seconds
- [ ] Large reports (5000+ rows) process async with progress updates
- [ ] Queries use indexes and complete in <5 seconds
- [ ] File uploads to storage complete in <10 seconds
- [ ] Email delivery completes in <30 seconds

### 15.3 Security Requirements

- [ ] Only admins can access report generation
- [ ] Rate limiting prevents spam (10 reports/hour per user)
- [ ] Bank-level data filtering enforced
- [ ] Signed URLs expire properly
- [ ] Audit trail logs all report generation

### 15.4 Usability Requirements

- [ ] Report catalog shows all 12 reports with descriptions
- [ ] Filter UI is intuitive with multi-select dropdowns
- [ ] Preview loads quickly and displays data clearly
- [ ] Download button is prominent and works reliably
- [ ] Error messages are clear and actionable
- [ ] Schedule UI allows easy configuration

---

## 16. Future Enhancements

### 16.1 Phase 2 Features

1. **Custom Report Builder**
   - Drag-and-drop field selector
   - Custom aggregations and grouping
   - Save custom report templates

2. **Report Sharing**
   - Share download link with expiry
   - Share with specific users/roles
   - Public links with token

3. **Interactive Dashboards**
   - Real-time filtering
   - Drill-down capabilities
   - Export from dashboard

4. **Advanced Visualizations**
   - Heat maps for geographical data
   - Gantt charts for call timelines
   - Network graphs for engineer assignments

5. **Mobile-Optimized Reports**
   - Responsive PDF layouts
   - Mobile-friendly Excel sheets
   - Push notifications for scheduled reports

### 16.2 Phase 3 Features

1. **Predictive Analytics**
   - Call volume forecasting
   - TAT prediction models
   - Engineer workload optimization

2. **Natural Language Queries**
   - "Show me all high priority calls from last week"
   - AI-powered report generation

3. **API for External Systems**
   - REST API for report generation
   - Webhook notifications
   - Data export to BI tools

4. **Multi-Language Support**
   - Report templates in multiple languages
   - Localized date/time formats
   - Currency formatting

---

## 17. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema (report_jobs, scheduled_reports, customer_surveys)
- [ ] Edge function scaffolding
- [ ] Basic XLSX generation
- [ ] Storage integration

### Phase 2: Core Reports (Weeks 3-4)
- [ ] Implement 12 report queries
- [ ] Excel formatting and multi-sheet support
- [ ] Photo URL integration
- [ ] Preview mode

### Phase 3: Async & Progress (Week 5)
- [ ] Async job processing
- [ ] Progress tracking
- [ ] Status polling endpoint

### Phase 4: Scheduling (Week 6)
- [ ] Schedule management UI
- [ ] Cron job for scheduled reports
- [ ] Email integration

### Phase 5: PDF & Polish (Week 7)
- [ ] PDF generation with Puppeteer
- [ ] Charts in PDF/Excel
- [ ] UI refinements

### Phase 6: Testing & Launch (Week 8)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Production deployment

---

## 18. Conclusion

The CoSTAR Report Generator provides comprehensive reporting capabilities essential for field service management operations. With 12 standard reports covering calls, performance, TAT, and surveys, administrators can gain deep insights into operations, monitor SLAs, recognize top performers, and identify improvement areas.

The system is designed for scalability (async processing for large datasets), security (admin-only access, rate limiting), and usability (intuitive UI, preview mode, scheduled delivery). Photo evidence integration ensures compliance and auditability.

This specification serves as the blueprint for implementation, with clear API contracts, database schemas, frontend components, and acceptance criteria.

---

**END OF SPECIFICATION**
