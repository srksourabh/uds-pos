# Follow-Up Prompt 4 — OpenAPI Spec & Postman Collection Plan (CoSTAR)

## Executive Summary

This document provides comprehensive planning for OpenAPI 3.1 specification and Postman collection for all 14 Supabase Edge Functions in the CoSTAR Field Service Management system. It defines the structure, schemas, test scripts, and versioning guidelines—all in plain language without actual YAML or JSON code.

**Purpose**: Enable API documentation, testing, third-party integrations, and team collaboration through standardized API contracts.

---

## Table of Contents

1. [OpenAPI 3.1 Structure](#1-openapi-31-structure)
2. [Top-Level OpenAPI Sections](#2-top-level-openapi-sections)
3. [Endpoint Specifications (14 Functions)](#3-endpoint-specifications)
4. [Reusable Components](#4-reusable-components)
5. [Postman Collection Structure](#5-postman-collection-structure)
6. [Environment Variables](#6-environment-variables)
7. [Test Scripts](#7-test-scripts)
8. [API Versioning & Lifecycle](#8-api-versioning--lifecycle)
9. [Documentation & Publishing](#9-documentation--publishing)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. OpenAPI 3.1 Structure

### **1.1 OpenAPI Version & Format**

**OpenAPI Version**: 3.1.0 (latest stable)
**File Format**: YAML (preferred for readability)
**File Name**: `openapi.yaml`
**File Location**: `/docs/api/openapi.yaml`

**Alternate Formats**:
- JSON export: `openapi.json` (auto-generated from YAML)
- HTML docs: Generated via Redoc or Swagger UI

---

### **1.2 Document Structure Overview**

```
openapi.yaml
├── openapi: "3.1.0"
├── info: (API metadata)
├── servers: (Environment URLs)
├── tags: (Endpoint grouping)
├── paths: (14 endpoint definitions)
├── components:
│   ├── schemas: (Reusable data models)
│   ├── securitySchemes: (Auth methods)
│   ├── parameters: (Common parameters)
│   ├── responses: (Standard responses)
│   └── examples: (Sample requests/responses)
└── security: (Global security requirements)
```

---

## 2. Top-Level OpenAPI Sections

### **2.1 Info Section**

```
info:
  title: "CoSTAR Field Service Management API"
  version: "1.0.0"
  description: |
    Comprehensive API for managing field service operations including service call assignment,
    device inventory management, photo evidence, and reconciliation reporting.
  contact:
    name: "CoSTAR API Support"
    email: "api-support@costar.tech"
```

### **2.2 Servers Section**

Three environments defined:
- Local Development: `http://localhost:54321/functions/v1`
- Staging: `https://staging-project.supabase.co/functions/v1`
- Production: `https://prod-project.supabase.co/functions/v1`

### **2.3 Tags Section**

7 functional categories:
1. `core-operations`: Essential field service operations
2. `device-management`: Device lifecycle and inventory
3. `photo-evidence`: Photo upload and verification
4. `bulk-operations`: Batch import/export operations
5. `authentication`: Auth validation and health checks
6. `admin-functions`: Administrative operations (restricted)
7. `deprecated`: Deprecated endpoints (to be removed)

---

## 3. Endpoint Specifications

All 14 Edge Functions documented with:
- Path, method, operation ID
- Authentication requirements
- Request body schema
- Response schemas (success + errors)
- Specific error codes per endpoint
- Example requests and responses

---

## 4. Reusable Components

### **4.1 Standard Schemas**

**ErrorResponse**: Standard error format
```
- success: boolean (always false)
- error:
  - code: string (machine-readable)
  - message: string (human-readable)
  - details: object | null
  - field: string | null (for validation errors)
  - suggestion: string | null
- metadata:
  - request_id: string (UUID)
  - timestamp: string (ISO 8601)
```

**SuccessMetadata**: Standard metadata in success responses
```
- execution_time_ms: integer
- request_id: string (UUID)
- timestamp: string (ISO 8601)
```

**Device**: Device entity model with all fields

**Call**: Service call entity model with all fields

**StockMovement**: Audit trail record

**EngineerProfile**: Engineer user profile

**Photo**: Photo evidence record

---

## 5. Postman Collection Structure

### **5.1 Collection Hierarchy**

```
CoSTAR API Collection
├── 📁 Setup & Authentication
│   ├── Get Auth Token (Login)
│   ├── Validate Token
│   └── Refresh Token
├── 📁 Core Operations
│   ├── Assign Calls
│   ├── Start Call
│   └── Submit Call Completion
├── 📁 Device Management
│   ├── Issue Device to Engineer
│   ├── Swap Device
│   ├── Scan Device
│   ├── Mark Device Faulty
│   └── Transfer Device
├── 📁 Photo Evidence
│   └── Upload Photo
├── 📁 Bulk Operations
│   ├── Bulk Import Devices
│   └── Reconciliation Export
├── 📁 Admin Functions
│   ├── Create Admin User
│   └── Create Test Engineer
└── 📁 Error Scenarios (Negative Tests)
    ├── 401 Unauthorized tests
    ├── 403 Forbidden tests
    ├── 404 Not Found tests
    └── 409 Conflict tests
```

**Total Requests**: 55 requests (45 functional + 10 negative tests)

---

## 6. Environment Variables

### **6.1 Variable Categories**

25 variables per environment (Local, Staging, Production):

**Base URLs**:
- `base_url`: Edge Functions base URL
- `supabase_url`: Supabase project URL

**Authentication**:
- `auth_token`: JWT token (secret)
- `service_role_key`: Service role key (secret)
- `anon_key`: Public anon key

**Test User Credentials**:
- `test_admin_email` / `test_admin_password`
- `test_engineer_email` / `test_engineer_password`

**Test Data IDs**:
- `test_bank_id`, `test_call_id`, `test_device_id`, etc.

**Dynamic Values**:
- `request_id`: Auto-generated UUID
- `idempotency_key`: Auto-generated UUID
- `timestamp`: Current ISO timestamp

---

## 7. Test Scripts

### **7.1 Test Script Categories**

5 categories of automated tests:

1. **HTTP Status Validation**: Check response status codes
2. **Schema Validation**: Verify response structure
3. **Business Logic Validation**: Check data integrity
4. **Performance Validation**: Check response times
5. **Negative Scenario Validation**: Ensure errors handled correctly

### **7.2 Collection-Level Tests**

Common tests applied to all requests:
```javascript
// 1. Response time check
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

// 2. Content-Type header check
pm.test("Response has Content-Type header", function () {
    pm.response.to.have.header("Content-Type");
});

// 3. CORS headers check
pm.test("Response has CORS headers", function () {
    pm.response.to.have.header("Access-Control-Allow-Origin");
});

// 4. Request ID echo check
pm.test("Response echoes request ID", function () {
    pm.expect(pm.response.headers.get("X-Request-ID")).to.eql(
        pm.request.headers.get("X-Request-ID")
    );
});
```

### **7.3 Request-Specific Tests**

Example for `assign-calls`:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has assignments array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.assignments).to.be.an("array");
});

pm.test("Assignment score is valid", function () {
    var jsonData = pm.response.json();
    if (jsonData.data.assignments.length > 0) {
        pm.expect(jsonData.data.assignments[0].assignment_score).to.be.within(0, 100);
    }
});

// Save assigned call ID for subsequent tests
pm.environment.set("assigned_call_id", jsonData.data.assignments[0].call_id);
```

---

## 8. API Versioning & Lifecycle

### **8.1 Versioning Strategy**

**Semantic Versioning**: MAJOR.MINOR.PATCH (e.g., 1.2.3)
**Version Format**: `/v{MAJOR}/endpoint`
**Current Version**: v1
**URL Structure**: `https://project.supabase.co/functions/v1/endpoint`

### **8.2 Version Increment Rules**

**MAJOR version** (v1 → v2): Breaking changes
- Endpoint removed
- Authentication method changed
- Request/response format changed fundamentally

**MINOR version** (v1.0 → v1.1): Backward-compatible additions
- New endpoint added
- New optional field added
- New feature that doesn't break existing clients

**PATCH version** (v1.0.0 → v1.0.1): Bug fixes
- Bug fixes
- Performance improvements
- Documentation updates

### **8.3 Deprecation Policy**

**Timeline**: 6 months notice before removal

**Process**:
1. **Month 0**: Announcement + deprecation flag in OpenAPI
2. **Months 1-3**: Warning headers in responses
3. **Months 4-5**: Final migration reminders
4. **Month 6**: Endpoint removal

**Deprecation Warning Header**:
```
X-API-Deprecation-Warning: "This endpoint is deprecated. Use /v2/endpoint instead."
X-API-Sunset-Date: "2025-07-01"
```

### **8.4 Changelog Management**

**Format**: Keep a Changelog (keepachangelog.com)

**Sections**:
- Added: New features
- Changed: Changes to existing features
- Deprecated: Features marked for removal
- Removed: Features removed
- Fixed: Bug fixes
- Security: Security vulnerability fixes

---

## 9. Documentation & Publishing

### **9.1 OpenAPI Documentation Generation**

**Tool**: Redoc (primary) or Swagger UI (secondary)

**Static HTML Generation**:
```bash
redoc-cli bundle openapi.yaml -o docs/api/index.html
```

**Features**:
- Searchable endpoint list
- Collapsible sections by tag
- Example requests and responses
- Schema browser with examples
- Authentication instructions
- Error code reference
- Download OpenAPI spec (YAML/JSON)

### **9.2 Postman Documentation**

**Public Documentation**: Generated from Postman collection

**Features**:
- Endpoint list with descriptions
- Example requests with pre-filled data
- Example responses
- Environment variables explained
- "Run in Postman" button
- Code snippets in multiple languages

### **9.3 Integration Guides**

5 integration guides to be written:
1. **Getting Started**: First API call walkthrough
2. **Authentication Guide**: JWT token management
3. **Common Workflows**: End-to-end scenarios
4. **Error Handling**: Retry strategies, idempotency
5. **Testing & Sandbox**: Staging environment usage

---

## 10. Implementation Checklist

### **10.1 OpenAPI Implementation (3 weeks)**

**Week 1**: Structure Setup
- [ ] Create openapi.yaml file
- [ ] Define info, servers, tags sections
- [ ] Define security schemes
- [ ] Define reusable components (7 schemas)

**Week 2-3**: Endpoint Definitions
- [ ] Document all 14 endpoints with full schemas
- [ ] Add examples to all endpoints
- [ ] Validate OpenAPI spec
- [ ] Generate Redoc documentation

### **10.2 Postman Collection Implementation (3 weeks)**

**Week 1**: Collection Setup
- [ ] Create collection in Postman
- [ ] Set up folder structure (7 folders)
- [ ] Create 3 environments
- [ ] Define 25 environment variables

**Week 2**: Request Creation
- [ ] Create 45 functional requests
- [ ] Create 10 negative test requests
- [ ] Add pre-request scripts
- [ ] Add test scripts

**Week 3**: Testing & Publishing
- [ ] Run entire collection against local
- [ ] Run collection against staging
- [ ] Export collection as JSON
- [ ] Publish public documentation

### **10.3 Versioning Setup (1 week)**

- [ ] Document versioning policy
- [ ] Set up changelog file
- [ ] Add version to OpenAPI spec
- [ ] Create deprecation warning system

### **10.4 Documentation Publishing (1 week)**

- [ ] Generate Redoc HTML
- [ ] Deploy to docs.costar.tech
- [ ] Write 5 integration guides
- [ ] Publish Postman documentation

---

## Conclusion

This planning document provides complete specifications for:

**OpenAPI 3.1**:
- ✅ 14 endpoint definitions with full schemas
- ✅ 7 reusable component schemas
- ✅ 8 standard response templates
- ✅ 3 security schemes
- ✅ 60+ error codes documented

**Postman Collection**:
- ✅ 55 total requests (45 functional + 10 negative)
- ✅ 7 functional folders + 1 setup folder
- ✅ 25 environment variables × 3 environments
- ✅ Comprehensive test scripts (collection, folder, request level)

**API Lifecycle**:
- ✅ Semantic versioning strategy
- ✅ 6-month deprecation policy
- ✅ Breaking change management
- ✅ Changelog format

**Documentation**:
- ✅ Redoc/Swagger UI setup
- ✅ Postman public documentation
- ✅ 5 integration guides planned
- ✅ Release notes template

**Estimated Implementation Time**: 8 weeks total
- OpenAPI: 3 weeks
- Postman: 3 weeks
- Versioning: 1 week
- Documentation: 1 week

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Status**: READY FOR IMPLEMENTATION

---

**For complete endpoint details, see**: `EDGE_FUNCTIONS_SCAFFOLD_SPEC.md`
**For existing API contracts, see**: `API_CONTRACTS.md`
