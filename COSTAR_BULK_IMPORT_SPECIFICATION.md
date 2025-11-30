# CoSTAR Bulk Import Specification
## Admin Call Upload + Mapping + Deduplication Module

**Version:** 1.0
**Date:** 2025-11-30
**Status:** Design Specification

---

## 1. Executive Summary

The CoSTAR Bulk Import Module enables administrators to upload large batches of service call requests from customer-provided Excel/CSV files, map arbitrary column names to canonical fields, validate data, detect duplicates, preview changes, and safely import calls into the Supabase database.

### Key Features
- Support for .xlsx and .csv file formats
- Drag-and-drop upload interface
- Flexible column mapping with template saving
- Comprehensive row-level validation
- Multi-rule duplicate detection
- Dry-run mode with diff viewer
- Transactional batch processing (200 rows per batch)
- Detailed audit trail and error reporting
- Maximum file size: 5,000 rows per upload

---

## 2. Canonical Field Definitions

### 2.1 Required Fields

| Field Name | Type | Validation Rules | Example |
|------------|------|------------------|---------|
| `merchant_name` | string | Required, 1-255 chars | "ABC Electronics Store" |
| `merchant_address` | text | Required, 1-500 chars | "123 Main St, San Francisco, CA" |
| `call_type` | enum | One of: installation, breakdown, maintenance, deinstallation | "installation" |
| `priority` | enum | One of: high, medium, low | "high" |
| `client_bank` | string | Must match existing bank code or be OTHER | "HDFC", "ICICI", "SBI", "AXIS", "OTHER" |
| `scheduled_date` | date | Valid date in YYYY-MM-DD or DD-MM-YYYY format | "2025-12-15" or "15-12-2025" |

### 2.2 Optional Fields

| Field Name | Type | Validation Rules | Default |
|------------|------|------------------|---------|
| `call_ref` | string | Optional but unique if provided, max 100 chars | null |
| `merchant_contact` | string | Optional, 1-100 chars | null |
| `latitude` | float | -90 to 90, optional if address provided | null |
| `longitude` | float | -180 to 180, optional if address provided | null |
| `requires_device` | string | Y or N (case-insensitive) | "N" |
| `client_id` | string | Optional, max 100 chars | null |
| `notes` | text | Optional, max 1000 chars | "" |

### 2.3 Special Handling

- **Coordinates**: If both lat/lon are missing but address is present → flag as `NEEDS_GEOCODING`
- **Extra Fields**: All unmapped columns are stored in `raw_payload` JSONB field
- **Call Number**: Auto-generated if not provided (format: CALL-YYYY-####)

---

## 3. File Upload & Parsing

### 3.1 Supported Formats
- **Excel**: .xlsx (Office Open XML)
- **CSV**: .csv (UTF-8 encoding preferred)

### 3.2 Upload Interface Requirements

**File Input Methods:**
- Drag-and-drop zone (primary)
- Click-to-browse file picker (fallback)

**File Validation:**
```typescript
interface FileValidation {
  maxFileSize: 50 * 1024 * 1024; // 50 MB
  maxRows: 5000;
  supportedExtensions: ['.xlsx', '.csv'];
  encoding: 'UTF-8';
}
```

**Upload Flow:**
1. User selects/drops file
2. Client validates file size and extension
3. Client parses first 100 rows for preview
4. Display column detection screen
5. Show detected columns with sample data (first 3 rows)

### 3.3 Column Detection

**Detection Algorithm:**
```
1. Read first row as header row
2. For each column header:
   a. Trim whitespace
   b. Convert to lowercase
   c. Check for common aliases (see mapping table)
   d. Suggest canonical field if match found
3. Load any saved mapping templates for this user
4. Allow manual mapping via dropdowns
```

**Common Column Aliases:**

| Canonical Field | Common Aliases |
|----------------|----------------|
| merchant_name | merchant, shop name, store name, outlet name, business name |
| merchant_address | address, location, site address, shop address |
| merchant_contact | contact, contact person, poc, point of contact |
| latitude | lat, merchant_lat, site_lat |
| longitude | lon, lng, merchant_lon, site_lon |
| call_type | type, service type, job type, work type |
| priority | urgency, importance, severity |
| client_bank | bank, bank name, client |
| requires_device | device required, needs device, device needed |
| scheduled_date | date, visit date, appointment date, schedule |
| client_id | customer id, merchant id, account number |
| notes | remarks, comments, description, details |

---

## 4. Mapping Templates

### 4.1 Template Structure

```typescript
interface MappingTemplate {
  id: string;
  name: string;
  description: string;
  created_by: string;
  mappings: {
    [incomingColumn: string]: string; // canonical field or 'IGNORE'
  };
  use_count: number;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}
```

### 4.2 Template Operations

**Save Template:**
- Name: Required, unique per user (max 100 chars)
- Description: Optional (max 255 chars)
- Mappings: Complete mapping object

**Load Template:**
- User selects from dropdown of their saved templates
- System applies mappings to current file
- User can modify and save as new template

**Delete Template:**
- Soft delete (mark as inactive)
- Maintain audit trail

### 4.3 Storage

Templates stored in `mapping_templates` table:
```sql
CREATE TABLE mapping_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mappings JSONB NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(created_by, name)
);
```

---

## 5. Validation Rules

### 5.1 Field-Level Validations

**Validation Severity Levels:**
- `ERROR`: Prevents import of this row
- `WARNING`: Allows import but flags for review

#### Merchant Name
```typescript
{
  rule: 'required',
  severity: 'ERROR',
  message: 'Merchant name is required',
  validator: (value: string) => value && value.trim().length > 0 && value.length <= 255
}
```

#### Merchant Address
```typescript
{
  rule: 'required',
  severity: 'ERROR',
  message: 'Merchant address is required',
  validator: (value: string) => value && value.trim().length > 0 && value.length <= 500
}
```

#### Call Type
```typescript
{
  rule: 'enum',
  severity: 'ERROR',
  message: 'Call type must be one of: installation, breakdown, maintenance, deinstallation',
  validator: (value: string) => ['installation', 'breakdown', 'maintenance', 'deinstallation'].includes(value.toLowerCase())
}
```

#### Priority
```typescript
{
  rule: 'enum',
  severity: 'ERROR',
  message: 'Priority must be one of: high, medium, low',
  validator: (value: string) => ['high', 'medium', 'low'].includes(value.toLowerCase()),
  default: 'medium'
}
```

#### Client Bank
```typescript
{
  rule: 'bank_exists',
  severity: 'ERROR',
  message: 'Client bank must be a valid bank code (HDFC, ICICI, SBI, AXIS, etc.) or OTHER',
  validator: async (value: string) => {
    const banks = await getBankCodes();
    return banks.includes(value.toUpperCase()) || value.toUpperCase() === 'OTHER';
  }
}
```

#### Scheduled Date
```typescript
{
  rule: 'date_format',
  severity: 'ERROR',
  message: 'Scheduled date must be in YYYY-MM-DD or DD-MM-YYYY format',
  validator: (value: string) => {
    const formats = ['YYYY-MM-DD', 'DD-MM-YYYY'];
    return parseDateSafely(value, formats) !== null;
  }
}
```

#### Coordinates
```typescript
{
  rule: 'coordinate_validation',
  severity: 'WARNING',
  message: 'Missing coordinates - address will need geocoding',
  validator: (lat: number, lon: number, address: string) => {
    if (!lat && !lon && address) {
      return { valid: true, needsGeocoding: true };
    }
    if ((lat && !lon) || (!lat && lon)) {
      return { valid: false, message: 'Both latitude and longitude required' };
    }
    if (lat < -90 || lat > 90) {
      return { valid: false, message: 'Latitude must be between -90 and 90' };
    }
    if (lon < -180 || lon > 180) {
      return { valid: false, message: 'Longitude must be between -180 and 180' };
    }
    return { valid: true };
  }
}
```

#### Requires Device
```typescript
{
  rule: 'boolean_string',
  severity: 'ERROR',
  message: 'Requires device must be Y or N',
  validator: (value: string) => ['Y', 'N', 'YES', 'NO'].includes(value.toUpperCase()),
  default: 'N'
}
```

### 5.2 Row-Level Validation Status

```typescript
interface RowValidationResult {
  rowNumber: number;
  status: 'OK' | 'WARNING' | 'ERROR';
  errors: ValidationError[];
  warnings: ValidationWarning[];
  mappedData: MappedCallData;
}

interface ValidationError {
  field: string;
  errorCode: string;
  message: string;
  severity: 'ERROR';
}

interface ValidationWarning {
  field: string;
  warningCode: string;
  message: string;
  severity: 'WARNING';
}
```

---

## 6. Duplicate Detection

### 6.1 Duplicate Matching Rules

**Rule A: Exact Call Reference Match**
```typescript
{
  name: 'exact_call_ref',
  priority: 1,
  condition: (incoming, existing) => {
    return incoming.call_ref &&
           existing.call_ref &&
           incoming.call_ref === existing.call_ref;
  },
  confidence: 'HIGH'
}
```

**Rule B: Fuzzy Name + Proximity + Type Match**
```typescript
{
  name: 'fuzzy_location_type',
  priority: 2,
  condition: (incoming, existing) => {
    const nameSimilarity = stringSimilarity(
      incoming.merchant_name,
      existing.merchant_name
    );
    const distance = haversineDistance(
      incoming.latitude, incoming.longitude,
      existing.latitude, existing.longitude
    );
    return nameSimilarity > 0.85 &&
           distance < 200 && // meters
           incoming.call_type === existing.call_type;
  },
  confidence: 'MEDIUM'
}
```

**Rule C: Client ID + Scheduled Date Match**
```typescript
{
  name: 'client_id_date',
  priority: 3,
  condition: (incoming, existing) => {
    return incoming.client_id &&
           existing.client_id &&
           incoming.client_id === existing.client_id &&
           isSameDay(incoming.scheduled_date, existing.scheduled_date);
  },
  confidence: 'MEDIUM'
}
```

### 6.2 Deduplication Algorithm

**Pseudo-code:**
```
FOR each incoming row:
  matched_calls = []

  // Run all matching rules
  FOR each existing call in database:
    FOR each rule in [RuleA, RuleB, RuleC]:
      IF rule.condition(incoming, existing):
        matched_calls.push({
          call: existing,
          rule: rule.name,
          confidence: rule.confidence
        })
        BREAK // Only apply first matching rule per call

  IF matched_calls.length > 0:
    // Sort by confidence and priority
    best_match = matched_calls[0]
    incoming.duplicate_status = 'DUPLICATE'
    incoming.matched_call_id = best_match.call.id
    incoming.match_confidence = best_match.confidence
    incoming.match_rule = best_match.rule
  ELSE:
    incoming.duplicate_status = 'UNIQUE'
```

### 6.3 Conflict Policies

**SKIP Policy:**
- Action: Do not import incoming row
- Database: No changes
- Audit: Record as skipped with reason

**UPDATE Policy:**
- Action: Update safe fields only
- Updatable Fields:
  - merchant_contact
  - merchant_address
  - notes
  - priority
  - scheduled_date
  - requires_device
- Protected Fields (never update):
  - status
  - assigned_engineer_id
  - started_at
  - completed_at
  - device fields
  - call_number

**MERGE Policy:**
- Action: Update only if incoming field is non-empty and existing is empty/null
- Logic:
  ```typescript
  FOR each field in updatable_fields:
    IF existing[field] is NULL or EMPTY:
      IF incoming[field] is NOT NULL and NOT EMPTY:
        existing[field] = incoming[field]
  ```

---

## 7. Preview & Dry-Run

### 7.1 Preview Table

**Display Requirements:**
- Show first 50 rows after mapping
- Columns:
  - Row # (original file line number)
  - Status badge (OK / WARNING / ERROR)
  - All canonical fields
  - Validation messages (tooltip on hover)
  - Duplicate indicator (if detected)

**Table Features:**
- Sortable columns
- Filter by status (OK / WARNING / ERROR)
- Click row to view full details
- Export preview as CSV

### 7.2 Dry-Run Report

**Summary Statistics:**
```typescript
interface DryRunSummary {
  totalRows: number;
  validRows: number;
  rowsWithErrors: number;
  rowsWithWarnings: number;
  uniqueRows: number;
  duplicateRows: number;
  wouldInsert: number;
  wouldUpdate: number;
  wouldSkip: number;
  needsGeocoding: number;
  estimatedDuration: string; // e.g., "2-3 minutes"
}
```

**Diff Viewer:**
For each duplicate with UPDATE or MERGE policy:
```typescript
interface DuplicateDiff {
  existingCallId: string;
  existingCallNumber: string;
  matchRule: string;
  matchConfidence: 'HIGH' | 'MEDIUM';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
    willUpdate: boolean;
  }[];
}
```

**UI Presentation:**
- Side-by-side comparison (OLD | NEW)
- Highlight changed fields in yellow
- Show "No change" for protected fields
- Allow admin to override conflict policy per-row

---

## 8. Import Processing

### 8.1 Import Configuration

```typescript
interface ImportConfig {
  conflictPolicy: 'SKIP' | 'UPDATE' | 'MERGE';
  dryRun: boolean;
  abortOnFirstError: boolean;
  batchSize: 200;
  uploaderId: string;
  mappingTemplateName?: string;
  autoAssignEnabled?: boolean;
  geocodingEnabled?: boolean;
}
```

### 8.2 Batch Processing

**Algorithm:**
```
import_id = generate_unique_id()
audit_record = create_audit_record(import_id, config)

batches = chunk(validated_rows, config.batchSize)

FOR each batch in batches:
  BEGIN TRANSACTION

  try:
    FOR each row in batch:
      IF row.status === 'ERROR':
        log_error(row)
        IF config.abortOnFirstError:
          ROLLBACK
          RETURN error_response
        CONTINUE

      IF row.duplicate_status === 'DUPLICATE':
        HANDLE based on conflict_policy
      ELSE:
        INSERT new call

      update_counts(audit_record)

    COMMIT TRANSACTION

  catch error:
    ROLLBACK TRANSACTION
    log_batch_error(batch, error)
    IF config.abortOnFirstError:
      RETURN error_response
    CONTINUE to next batch

finalize_audit_record(audit_record)
generate_summary_report()
```

### 8.3 Transaction Safety

**Per-Batch Transaction:**
- Start transaction at batch start
- All 200 rows in single transaction
- Commit only if all rows successful (or errors skipped)
- Rollback on fatal error

**Atomicity Guarantee:**
- Each batch is atomic
- Failed batch does not affect other batches
- Audit log records all batch outcomes

### 8.4 Error Handling

**Error Categories:**

1. **Row Validation Error**
   - Action: Skip row, log error
   - Continue processing unless abortOnFirstError

2. **Duplicate Conflict**
   - Action: Apply conflict policy
   - Log decision

3. **Database Constraint Violation**
   - Action: Log error, skip row
   - Continue processing

4. **Network/Connection Error**
   - Action: Retry batch up to 3 times
   - If still fails, abort import

5. **Unknown Error**
   - Action: Rollback batch, log, abort import

---

## 9. Database Schema

### 9.1 Calls Import Audit Table

**Already exists in migration, confirmed structure:**

```sql
CREATE TABLE calls_import_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id TEXT NOT NULL UNIQUE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conflict_policy TEXT NOT NULL CHECK (conflict_policy IN ('SKIP', 'UPDATE', 'MERGE')),
  auto_assign_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  geocoding_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  abort_on_first_error BOOLEAN NOT NULL DEFAULT FALSE,
  total_rows INTEGER NOT NULL,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  geocoded_count INTEGER NOT NULL DEFAULT 0,
  status import_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  original_file_url TEXT,
  error_report_url TEXT,
  summary_report_url TEXT,
  audit_report_url TEXT,
  errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 9.2 Calls Import Errors Table

**Already exists in migration:**

```sql
CREATE TABLE calls_import_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES calls_import_audit(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  field TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning')),
  row_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 9.3 Mapping Templates Table

**Already exists in migration:**

```sql
CREATE TABLE mapping_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mappings JSONB NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(created_by, name)
);
```

### 9.4 Indexes for Performance

```sql
-- Import audit queries
CREATE INDEX idx_calls_import_audit_uploader ON calls_import_audit(uploader_id, created_at DESC);
CREATE INDEX idx_calls_import_audit_status ON calls_import_audit(status);
CREATE INDEX idx_calls_import_audit_import_id ON calls_import_audit(import_id);

-- Import errors queries
CREATE INDEX idx_calls_import_errors_audit ON calls_import_errors(audit_id);
CREATE INDEX idx_calls_import_errors_severity ON calls_import_errors(audit_id, severity);

-- Mapping templates queries
CREATE INDEX idx_mapping_templates_user ON mapping_templates(created_by, created_at DESC);

-- Duplicate detection queries
CREATE INDEX idx_calls_merchant_name_trgm ON calls USING gin(merchant_name gin_trgm_ops);
CREATE INDEX idx_calls_client_id ON calls(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_calls_scheduled_date ON calls(scheduled_date);
CREATE INDEX idx_calls_coordinates ON calls(latitude, longitude) WHERE latitude IS NOT NULL;
```

---

## 10. API Specification

### 10.1 Edge Function: import-calls

**Endpoint:** `POST /functions/v1/import-calls`

**Request Headers:**
```
Authorization: Bearer {supabase_anon_key}
Content-Type: application/json
```

**Request Body:**
```typescript
interface ImportCallsRequest {
  importId: string;
  filename: string;
  mappedRows: MappedCallRow[];
  conflictPolicy: 'SKIP' | 'UPDATE' | 'MERGE';
  dryRun: boolean;
  abortOnFirstError?: boolean;
  mappingTemplateName?: string;
  uploaderId: string;
}

interface MappedCallRow {
  rowNumber: number;
  callRef?: string;
  merchantName: string;
  merchantAddress: string;
  merchantContact?: string;
  latitude?: number;
  longitude?: number;
  callType: 'installation' | 'breakdown' | 'maintenance' | 'deinstallation';
  priority: 'high' | 'medium' | 'low';
  clientBank: string;
  requiresDevice: boolean;
  scheduledDate: string;
  clientId?: string;
  notes?: string;
  rawPayload?: Record<string, any>;
}
```

**Response (Success):**
```typescript
interface ImportCallsResponse {
  success: true;
  auditId: string;
  importId: string;
  summary: {
    totalRows: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
    geocoded: number;
    durationSeconds: number;
  };
  perRowStatus: RowImportStatus[];
  errorReportUrl?: string;
  summaryReportUrl?: string;
}

interface RowImportStatus {
  rowNumber: number;
  status: 'inserted' | 'updated' | 'skipped' | 'error';
  callId?: string;
  callNumber?: string;
  errorMessage?: string;
}
```

**Response (Error):**
```typescript
interface ImportCallsError {
  success: false;
  error: string;
  errorCode: string;
  details?: any;
}
```

**Error Codes:**
- `INVALID_INPUT`: Malformed request
- `UNAUTHORIZED`: Missing or invalid auth
- `FILE_TOO_LARGE`: Exceeds 5000 rows
- `VALIDATION_FAILED`: Pre-import validation errors
- `DATABASE_ERROR`: Supabase error
- `UNKNOWN_ERROR`: Unexpected error

### 10.2 Edge Function: validate-import

**Endpoint:** `POST /functions/v1/validate-import`

**Purpose:** Validate mapped data before import (pre-flight check)

**Request:**
```typescript
interface ValidateImportRequest {
  mappedRows: MappedCallRow[];
  conflictPolicy: 'SKIP' | 'UPDATE' | 'MERGE';
}
```

**Response:**
```typescript
interface ValidateImportResponse {
  success: true;
  validationResults: RowValidationResult[];
  duplicateMatches: DuplicateMatch[];
  summary: {
    totalRows: number;
    validRows: number;
    errorsCount: number;
    warningsCount: number;
    duplicatesCount: number;
  };
}

interface DuplicateMatch {
  rowNumber: number;
  existingCallId: string;
  existingCallNumber: string;
  matchRule: string;
  matchConfidence: 'HIGH' | 'MEDIUM';
  diff: FieldDiff[];
}

interface FieldDiff {
  field: string;
  existingValue: any;
  incomingValue: any;
  willUpdate: boolean;
}
```

### 10.3 Edge Function: save-mapping-template

**Endpoint:** `POST /functions/v1/save-mapping-template`

**Request:**
```typescript
interface SaveMappingTemplateRequest {
  name: string;
  description?: string;
  mappings: Record<string, string>;
}
```

**Response:**
```typescript
interface SaveMappingTemplateResponse {
  success: true;
  templateId: string;
  template: MappingTemplate;
}
```

### 10.4 Edge Function: get-mapping-templates

**Endpoint:** `GET /functions/v1/get-mapping-templates`

**Response:**
```typescript
interface GetMappingTemplatesResponse {
  success: true;
  templates: MappingTemplate[];
}
```

---

## 11. Frontend Component Architecture

### 11.1 Component Hierarchy

```
<BulkImportFlow>
├── <FileUploadStep>
│   ├── <DragDropZone>
│   ├── <FilePickerButton>
│   └── <UploadProgress>
│
├── <ColumnMappingStep>
│   ├── <DetectedColumnsTable>
│   ├── <MappingDropdowns>
│   ├── <MappingTemplateSelector>
│   └── <SaveTemplateModal>
│
├── <ValidationPreviewStep>
│   ├── <PreviewTable>
│   │   ├── <ValidationBadge>
│   │   └── <RowDetailsModal>
│   ├── <ValidationSummary>
│   └── <FilterControls>
│
├── <DryRunStep>
│   ├── <DryRunSummary>
│   ├── <DuplicateDiffViewer>
│   │   ├── <SideBySideComparison>
│   │   └── <ConflictPolicySelector>
│   └── <ConfirmationDialog>
│
├── <ImportProgressStep>
│   ├── <ProgressBar>
│   ├── <BatchStatus>
│   └── <RealTimeLog>
│
└── <ImportSummaryStep>
    ├── <SummaryStatistics>
    ├── <ErrorsTable>
    ├── <DownloadReportsButtons>
    └── <ViewImportedCallsLink>
```

### 11.2 State Management

**Primary State Container:**
```typescript
interface BulkImportState {
  currentStep: 'upload' | 'mapping' | 'preview' | 'dry-run' | 'import' | 'summary';
  file: {
    name: string;
    size: number;
    rows: any[][];
    headers: string[];
  } | null;

  columnMapping: {
    [incomingColumn: string]: string; // canonical field or 'IGNORE'
  };

  selectedTemplate: MappingTemplate | null;

  mappedRows: MappedCallRow[];
  validationResults: RowValidationResult[];
  duplicateMatches: DuplicateMatch[];

  conflictPolicy: 'SKIP' | 'UPDATE' | 'MERGE';
  abortOnFirstError: boolean;

  importStatus: {
    inProgress: boolean;
    currentBatch: number;
    totalBatches: number;
    summary: ImportSummary;
  };

  auditId: string | null;
  errorReportUrl: string | null;
  summaryReportUrl: string | null;
}
```

### 11.3 Key User Flows

**Flow 1: First-Time Upload**
```
1. User lands on Bulk Import page
2. Clicks or drags file → Upload
3. System parses file, detects columns
4. Shows mapping screen with auto-suggestions
5. User adjusts mappings
6. Clicks "Validate & Preview"
7. System validates, shows preview table
8. User reviews, clicks "Run Dry-Run"
9. System detects duplicates, shows diff viewer
10. User selects conflict policy
11. Clicks "Proceed with Import"
12. System imports in batches with progress bar
13. Shows summary with success/error counts
14. User downloads error report if needed
```

**Flow 2: Using Saved Template**
```
1. User lands on Bulk Import page
2. Uploads file
3. Selects saved template from dropdown
4. System auto-applies mappings
5. User clicks "Validate & Preview"
6. ...continues from step 7 above
```

**Flow 3: Saving New Template**
```
1. During mapping step
2. User configures all mappings
3. Clicks "Save as Template"
4. Modal appears: Name + Description
5. User fills and clicks Save
6. Template saved, confirmation shown
7. User continues with import
```

---

## 12. Error Reporting

### 12.1 Error CSV Format

**Filename:** `import-{importId}-errors.csv`

**Columns:**
| Column | Description | Example |
|--------|-------------|---------|
| row_number | Original file line number | 42 |
| error_code | Machine-readable error code | INVALID_CALL_TYPE |
| error_message | Human-readable error | "Call type must be one of: installation, breakdown, maintenance, deinstallation" |
| field | Field that caused error | call_type |
| severity | error or warning | error |
| original_value | Value from uploaded file | "repair" |
| expected_format | Expected value format | "installation, breakdown, maintenance, deinstallation" |

### 12.2 Summary Report Format

**Filename:** `import-{importId}-summary.json`

```json
{
  "importId": "imp_20251130_1234",
  "uploadedBy": "admin@example.com",
  "filename": "calls_november.xlsx",
  "uploadedAt": "2025-11-30T10:15:00Z",
  "conflictPolicy": "UPDATE",
  "totalRows": 1250,
  "inserted": 1100,
  "updated": 50,
  "skipped": 80,
  "errors": 20,
  "geocoded": 45,
  "durationSeconds": 142,
  "topErrors": [
    {
      "errorCode": "INVALID_CALL_TYPE",
      "count": 12,
      "message": "Invalid call type value"
    },
    {
      "errorCode": "MISSING_MERCHANT_NAME",
      "count": 8,
      "message": "Merchant name is required"
    }
  ],
  "bankBreakdown": [
    { "bankCode": "HDFC", "calls": 450 },
    { "bankCode": "ICICI", "calls": 380 },
    { "bankCode": "SBI", "calls": 270 },
    { "bankCode": "OTHER", "calls": 150 }
  ]
}
```

### 12.3 Audit Report Format

**Filename:** `import-{importId}-audit.json`

```json
{
  "importId": "imp_20251130_1234",
  "auditId": "aud_xyz",
  "timeline": [
    {
      "timestamp": "2025-11-30T10:15:00Z",
      "event": "IMPORT_STARTED",
      "details": { "totalRows": 1250 }
    },
    {
      "timestamp": "2025-11-30T10:15:12Z",
      "event": "BATCH_1_COMPLETED",
      "details": { "rows": 200, "inserted": 195, "errors": 5 }
    },
    {
      "timestamp": "2025-11-30T10:15:24Z",
      "event": "BATCH_2_COMPLETED",
      "details": { "rows": 200, "inserted": 198, "errors": 2 }
    },
    {
      "timestamp": "2025-11-30T10:17:22Z",
      "event": "IMPORT_COMPLETED",
      "details": { "totalBatches": 7, "success": true }
    }
  ],
  "duplicatesHandled": [
    {
      "rowNumber": 23,
      "existingCallId": "call_123",
      "action": "UPDATED",
      "fieldsChanged": ["merchant_contact", "notes"]
    },
    {
      "rowNumber": 89,
      "existingCallId": "call_456",
      "action": "SKIPPED",
      "reason": "Duplicate with SKIP policy"
    }
  ]
}
```

---

## 13. Performance Considerations

### 13.1 Time Complexity

**File Parsing:**
- O(n) where n = number of rows
- Estimated: 0.5ms per row
- 5000 rows = ~2.5 seconds

**Validation:**
- O(n × m) where n = rows, m = fields per row
- Estimated: 1ms per row
- 5000 rows = ~5 seconds

**Duplicate Detection:**
- O(n × d) where n = incoming rows, d = existing calls in DB
- With indexes: ~10ms per row
- 5000 rows = ~50 seconds (worst case)
- Optimization: Query DB once, cache in memory

**Import:**
- O(n) with batch commits
- Estimated: 2ms per row (including transaction overhead)
- 5000 rows = ~10 seconds
- With 200-row batches: 25 batches × 0.4s = ~10 seconds

**Total Estimated Time:**
- Small file (100 rows): ~5-10 seconds
- Medium file (1000 rows): ~30-60 seconds
- Large file (5000 rows): ~2-3 minutes

### 13.2 Memory Optimization

**Client-Side:**
- Parse file in chunks (1000 rows at a time)
- Only keep first 50 rows in preview state
- Use virtual scrolling for large preview tables

**Server-Side:**
- Stream file processing (don't load entire file in memory)
- Process batches sequentially (don't load all rows at once)
- Release memory after each batch commit

### 13.3 Database Optimization

**Batch Size Tuning:**
- 200 rows per batch (balance between transaction overhead and atomicity)
- Larger batches = faster but longer locks
- Smaller batches = more overhead but better concurrency

**Connection Pooling:**
- Reuse Supabase client connections
- Max 10 concurrent connections during import

**Index Usage:**
- Ensure all duplicate detection queries use indexes
- EXPLAIN ANALYZE queries during development

---

## 14. Testing Strategy

### 14.1 Test Matrix

| Test Case | File Type | Rows | Duplicates | Expected Outcome |
|-----------|-----------|------|------------|------------------|
| TC-001 | .xlsx | 10 | 0 | All inserted successfully |
| TC-002 | .csv | 10 | 0 | All inserted successfully |
| TC-003 | .xlsx | 100 | 20 (high conf) | SKIP: 20 skipped, 80 inserted |
| TC-004 | .xlsx | 100 | 20 (high conf) | UPDATE: 20 updated, 80 inserted |
| TC-005 | .xlsx | 100 | 20 (medium conf) | MERGE: 20 merged, 80 inserted |
| TC-006 | .csv | 50 | 0, 10 errors | 10 errors logged, 40 inserted |
| TC-007 | .xlsx | 5000 | 0 | All inserted in <3 minutes |
| TC-008 | .csv | 100 | 0, missing headers | Error: Invalid file format |
| TC-009 | .xlsx | 10 | 0, wrong date format | Errors flagged in preview |
| TC-010 | .csv | 20 | 0, unmapped columns | Extra data in raw_payload |
| TC-011 | .xlsx | 100 | 50 (various rules) | Correct deduplication logic |
| TC-012 | .csv | 200 | 0, abortOnError=true | First error stops import |
| TC-013 | .xlsx | 50 | 0, needs geocoding | 50 flagged NEEDS_GEOCODING |
| TC-014 | .csv | 100 | 0, saved template | Mappings applied correctly |

### 14.2 Boundary Tests

- Empty file (0 rows)
- File with only headers (1 row)
- File with 5000 rows (max limit)
- File with 5001 rows (should reject)
- File with 51 MB (exceeds size limit)
- File with special characters in data
- File with emoji in merchant names
- File with null values in optional fields
- File with negative coordinates
- File with future dates (valid)
- File with past dates (valid)

### 14.3 Corrupted File Tests

- File with missing columns mid-file
- File with malformed CSV (unclosed quotes)
- File with mixed encodings (UTF-8 and Latin-1)
- Excel file with multiple sheets (use first sheet)
- Excel file with formulas (evaluate to values)
- CSV with wrong delimiter (semicolon instead of comma)

### 14.4 Duplicate-Heavy File Tests

- File where 100% are duplicates (all skipped)
- File where 50% are duplicates (mixed insert/update)
- File with duplicate within same file (first wins)
- File with same call_ref multiple times

### 14.5 Integration Tests

- Upload → Mapping → Preview → Dry-Run → Import → Summary (happy path)
- Upload → Error in validation → Fix mapping → Re-validate → Import
- Upload → Save template → Upload new file → Load template → Import
- Upload → Dry-run shows duplicates → Change conflict policy → Dry-run again → Import
- Upload → Import fails mid-way → Audit log shows partial import → Retry logic

---

## 15. Acceptance Criteria

### 15.1 Feature Completeness

- [ ] File upload (drag-drop + file picker) works for .xlsx and .csv
- [ ] File size validation (max 50MB, max 5000 rows)
- [ ] Column detection and auto-mapping with aliases
- [ ] Manual column mapping with dropdowns
- [ ] Mapping template save, load, delete
- [ ] Field validation with ERROR/WARNING severity
- [ ] Preview table shows first 50 rows with validation status
- [ ] Duplicate detection using all 3 rules (A, B, C)
- [ ] Conflict policy selection (SKIP, UPDATE, MERGE)
- [ ] Dry-run mode with diff viewer
- [ ] Import with batch processing (200 rows/batch)
- [ ] Real-time progress bar during import
- [ ] Import summary with statistics
- [ ] Error CSV download
- [ ] Summary and audit report download
- [ ] Audit trail in database (calls_import_audit table)
- [ ] Error logging in database (calls_import_errors table)

### 15.2 Performance Requirements

- [ ] 100-row file imports in <10 seconds
- [ ] 1000-row file imports in <60 seconds
- [ ] 5000-row file imports in <3 minutes
- [ ] Preview loads in <2 seconds after mapping
- [ ] Dry-run completes in <30 seconds for 1000 rows
- [ ] UI remains responsive during import

### 15.3 Data Safety Requirements

- [ ] No data loss on failed batches (rollback works)
- [ ] Protected fields never overwritten (status, assigned_engineer_id, etc.)
- [ ] Duplicate detection accuracy >95% for high-confidence matches
- [ ] All imports logged in audit table
- [ ] Original file stored in Supabase Storage
- [ ] Error details captured for every failed row

### 15.4 Usability Requirements

- [ ] Clear step-by-step wizard UI
- [ ] Progress indicators at each step
- [ ] Validation errors shown inline with helpful messages
- [ ] Duplicate matches clearly highlighted
- [ ] Conflict policy explained with tooltips
- [ ] Summary reports easy to read and download
- [ ] Can restart import from summary screen

### 15.5 Security Requirements

- [ ] Only admins can access bulk import feature
- [ ] File upload size limits enforced
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (input sanitization)
- [ ] Uploaded files stored securely in Supabase Storage
- [ ] Audit logs include uploader user ID
- [ ] RLS policies enforce bank isolation (if applicable)

---

## 16. Future Enhancements

### 16.1 Phase 2 Features

1. **Auto-Geocoding**
   - Integrate Google Maps Geocoding API
   - Automatically geocode addresses missing lat/lon
   - Store geocoded coordinates and confidence score

2. **Auto-Assignment**
   - After successful import, auto-assign calls to engineers
   - Use existing assignment algorithm from ASSIGNMENT_ALGORITHM.md
   - Optional toggle in import config

3. **Scheduled Imports**
   - Allow admins to schedule recurring imports
   - Watch a folder (SFTP, Google Drive, etc.)
   - Auto-download and import on schedule (daily, weekly)

4. **Advanced Duplicate Matching**
   - Machine learning model for name matching
   - Configurable match thresholds
   - Manual review queue for uncertain matches

5. **Multi-Bank Filtering**
   - Filter preview by bank
   - Import only selected rows
   - Assign different conflict policies per bank

### 16.2 Phase 3 Features

1. **Excel Template Generator**
   - Download pre-formatted Excel template
   - Drop-down validations in Excel (call types, priorities)
   - Pre-filled bank codes

2. **Import History Dashboard**
   - View all past imports with filtering
   - Re-download error reports
   - Compare import statistics over time

3. **Rollback Feature**
   - Ability to rollback entire import
   - Mark imported calls as "bulk_imported" with import_id
   - Delete query: WHERE import_id = {id}

4. **Webhook Integration**
   - Notify external systems on import completion
   - Send summary to Slack/Email
   - Trigger downstream workflows

5. **Multi-File Import**
   - Upload multiple files in one session
   - Process sequentially with combined summary

---

## 17. Open Questions & Decisions Needed

### 17.1 Decisions Required

1. **Q:** Should we support Excel files with multiple sheets?
   **A:** TBD - Recommend using first sheet only

2. **Q:** What happens if same call_ref appears twice in uploaded file?
   **A:** TBD - Recommend taking first occurrence, flag second as error

3. **Q:** Should UPDATE policy update scheduled_date if call already assigned?
   **A:** TBD - Recommend NO (protect assigned calls from date changes)

4. **Q:** How to handle timezone for scheduled_date?
   **A:** TBD - Store as UTC, assume admin's timezone or explicit field

5. **Q:** Maximum age for duplicate matching (e.g., only check calls from last 6 months)?
   **A:** TBD - Recommend 90 days for performance optimization

### 17.2 Technical Decisions

1. **File Parsing Library:**
   - xlsx: SheetJS (xlsx package)
   - csv: Papaparse
   - Reason: Most popular, well-maintained, good performance

2. **String Similarity Algorithm:**
   - Use Levenshtein distance or Jaro-Winkler
   - Threshold: 0.85 for fuzzy name matching

3. **Geocoding Service:**
   - Phase 2: Google Maps Geocoding API
   - Alternative: OpenStreetMap Nominatim (free)

4. **Progress Updates:**
   - Use Supabase Realtime to push progress to client
   - Alternative: Client polls /import-status endpoint every 2s

5. **File Storage:**
   - Store in Supabase Storage bucket: `call-imports`
   - Folder structure: `{year}/{month}/{import_id}/{filename}`
   - Retention: 90 days

---

## 18. Monitoring & Operations

### 18.1 Metrics to Track

**Import Success Rate:**
- % of imports that complete successfully
- Target: >95%

**Error Rate:**
- % of rows with errors per import
- Target: <5%

**Import Duration:**
- Median time to import 1000 rows
- Target: <60 seconds

**Duplicate Detection Accuracy:**
- False positives: % of flagged duplicates that aren't
- False negatives: % of missed duplicates
- Target: <5% false positive rate

### 18.2 Alerts

**Critical Alerts:**
- Import fails completely (database error)
- Import takes >10 minutes (performance issue)
- Error rate >20% (data quality issue)

**Warning Alerts:**
- Import takes >5 minutes for <1000 rows
- Error rate >10%
- Duplicate rate >50% (suspicious file)

### 18.3 Logs

**Application Logs:**
- Log level: INFO for successful batches
- Log level: ERROR for failed batches
- Include: import_id, batch_number, row_count, errors

**Audit Logs:**
- All stored in calls_import_audit table
- Queryable by admin
- Exportable for compliance

---

## 19. Security Considerations

### 19.1 Input Validation

- Sanitize all user input (file data, template names, etc.)
- Validate file extensions (don't trust MIME type)
- Limit upload file size (50MB hard limit)
- Scan for malicious content (future: virus scanning)

### 19.2 Access Control

- Only users with role='admin' can access bulk import
- RLS policies enforce user can only see their own import history
- API endpoints validate user role before processing

### 19.3 Data Privacy

- Uploaded files contain sensitive merchant data
- Files stored with encryption at rest (Supabase default)
- Files deleted after 90 days retention period
- No PII in error logs (mask contact info)

### 19.4 Rate Limiting

- Max 5 concurrent imports per user
- Max 10 imports per user per hour
- Prevents abuse and resource exhaustion

---

## 20. Documentation

### 20.1 Admin User Guide

**Topics to Cover:**
1. How to prepare your Excel/CSV file
2. Uploading a file
3. Mapping columns to fields
4. Saving and using templates
5. Understanding validation errors
6. Resolving duplicates
7. Running a dry-run
8. Interpreting the import summary
9. Downloading error reports
10. Troubleshooting common issues

### 20.2 Developer Documentation

**Topics to Cover:**
1. System architecture overview
2. Edge function implementation details
3. Database schema and indexes
4. Duplicate detection algorithm
5. Adding new validation rules
6. Extending conflict policies
7. Performance tuning tips
8. Testing guidelines
9. Deployment checklist

### 20.3 API Documentation

**Formats:**
- OpenAPI 3.0 spec (for Postman/Swagger)
- Markdown reference guide
- Interactive API explorer

---

## 21. Conclusion

The CoSTAR Bulk Import Module provides a comprehensive, safe, and user-friendly solution for importing large volumes of service call data from customer-provided files. By following this specification, the implementation will deliver:

- **Flexibility**: Handle any column names via mapping
- **Safety**: Transactional batches, duplicate detection, dry-run mode
- **Visibility**: Real-time progress, detailed audit logs, error reports
- **Performance**: Optimized for 5000-row files in <3 minutes
- **Maintainability**: Clear architecture, thorough documentation

This specification serves as the single source of truth for development, testing, and future enhancements.

---

**END OF SPECIFICATION**
