# Block 11 — Testing, Monitoring, & Operational Plan (CoSTAR)

## Executive Summary

This document outlines the complete quality assurance, monitoring, and operational strategy for the CoSTAR Field Service Management system. It includes test matrices, monitoring requirements, disaster recovery procedures, and a detailed 10-day rollout plan.

---

## 1. Test Matrix & Strategy

### 1.1 Component Test Coverage Map

| Component | Unit Tests | Integration Tests | E2E Tests | Performance Tests | Security Tests |
|-----------|-----------|------------------|-----------|------------------|----------------|
| **Edge Functions** |
| - assign-calls | ✅ Required | ✅ Required | ⚠️ Optional | ✅ Required | ✅ Required |
| - issue-device-to-engineer | ✅ Required | ✅ Required | ⚠️ Optional | ⚠️ Optional | ✅ Required |
| - submit-call-completion | ✅ Required | ✅ Required | ⚠️ Optional | ⚠️ Optional | ✅ Required |
| - scan-device | ✅ Required | ✅ Required | ✅ Required | ⚠️ Optional | ✅ Required |
| - bulk-import-devices | ✅ Required | ✅ Required | ⚠️ Optional | ✅ Required | ✅ Required |
| **Admin UI** |
| - Dashboard | ⚠️ Optional | ✅ Required | ✅ Required | ⚠️ Optional | ⚠️ Optional |
| - Devices Management | ⚠️ Optional | ✅ Required | ✅ Required | ⚠️ Optional | ⚠️ Optional |
| - Calls Management | ⚠️ Optional | ✅ Required | ✅ Required | ⚠️ Optional | ⚠️ Optional |
| - Banks Management | ⚠️ Optional | ✅ Required | ✅ Required | ⚠️ Optional | ⚠️ Optional |
| - Receive Stock | ⚠️ Optional | ✅ Required | ✅ Required | ⚠️ Optional | ⚠️ Optional |
| - In Transit | ⚠️ Optional | ✅ Required | ✅ Required | ⚠️ Optional | ⚠️ Optional |
| **Mobile UI** |
| - Call List | ⚠️ Optional | ✅ Required | ✅ Required | ✅ Required | ⚠️ Optional |
| - QR Scanner | ⚠️ Optional | ✅ Required | ✅ Required | ✅ Required | ⚠️ Optional |
| - Photo Upload | ⚠️ Optional | ✅ Required | ✅ Required | ✅ Required | ⚠️ Optional |
| - Call Completion | ⚠️ Optional | ✅ Required | ✅ Required | ✅ Required | ⚠️ Optional |
| **Database** |
| - RLS Policies | N/A | ✅ Required | ✅ Required | N/A | ✅ Required |
| - Migrations | N/A | ✅ Required | ⚠️ Optional | N/A | ⚠️ Optional |
| - Functions | ✅ Required | ✅ Required | ⚠️ Optional | ⚠️ Optional | ✅ Required |

**Legend:**
- ✅ Required: Must be tested before production
- ⚠️ Optional: Nice to have, test if time permits
- N/A: Not applicable

---

### 1.2 Priority Test Cases (Critical Path)

#### **P0 - Blocker (Must Pass Before Launch)**

1. **Authentication & Authorization**
   - ✅ Admin can log in with email/password
   - ✅ Engineer can log in with email/password
   - ✅ Expired sessions redirect to login
   - ✅ RLS prevents unauthorized data access
   - ✅ Engineers cannot access admin-only pages

2. **Call Assignment Flow**
   - ✅ Admin creates call with all required fields
   - ✅ Call appears in pending calls list
   - ✅ Assignment algorithm runs and assigns engineer
   - ✅ Engineer receives call in mobile app
   - ✅ Engineer can accept/start call

3. **Device Lifecycle**
   - ✅ Receive stock with barcode scanner
   - ✅ Device appears in warehouse inventory
   - ✅ Issue device to engineer
   - ✅ Device status changes to "issued"
   - ✅ Engineer scans device QR at call site
   - ✅ Device status changes to "installed"

4. **Call Completion**
   - ✅ Engineer uploads before/after photos
   - ✅ Photo evidence validation passes
   - ✅ Engineer submits completion
   - ✅ Call status changes to "completed"
   - ✅ Admin can view completion details

5. **Stock Reconciliation**
   - ✅ Device count by status is accurate
   - ✅ Engineer device count is accurate
   - ✅ Warehouse inventory count is accurate
   - ✅ In-transit shipments tracked correctly

#### **P1 - High Priority (Should Pass Before Launch)**

6. **Bulk Operations**
   - ✅ CSV import creates multiple devices
   - ✅ Bulk device issuance to engineer
   - ✅ Multiple devices in single call

7. **Courier Tracking**
   - ✅ Create shipment with tracking number
   - ✅ Track devices in transit
   - ✅ Mark shipment as delivered
   - ✅ Device status updates on delivery

8. **Error Handling**
   - ✅ Duplicate device serial rejected
   - ✅ Invalid QR code shows error
   - ✅ Network timeout handled gracefully
   - ✅ Photo upload failure retry works

9. **Edge Cases**
   - ✅ Engineer with no assigned calls
   - ✅ Call with no available devices
   - ✅ Device already installed error
   - ✅ Photo size limit validation

#### **P2 - Medium Priority (Nice to Have)**

10. **Performance**
    - ✅ Dashboard loads < 2 seconds
    - ✅ Device list with 1000+ items loads < 3 seconds
    - ✅ Photo upload completes < 10 seconds
    - ✅ Call assignment runs < 5 seconds

11. **Mobile Offline**
    - ⚠️ Call details cached when offline
    - ⚠️ Photos queued for upload when online
    - ⚠️ Graceful degradation message shown

---

### 1.3 Test Implementation Guide

#### **Unit Tests (Edge Functions)**

```javascript
// Example: tests/assign-calls.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { calculateEngineerScore } from '../supabase/functions/assign-calls/utils/scoring';

describe('Call Assignment Scoring', () => {
  it('should prioritize engineers with fewer active calls', () => {
    const engineer1 = { active_calls: 2, distance: 10 };
    const engineer2 = { active_calls: 5, distance: 10 };

    const score1 = calculateEngineerScore(engineer1);
    const score2 = calculateEngineerScore(engineer2);

    expect(score1).toBeGreaterThan(score2);
  });

  it('should prioritize closer engineers', () => {
    const engineer1 = { active_calls: 2, distance: 5 };
    const engineer2 = { active_calls: 2, distance: 20 };

    const score1 = calculateEngineerScore(engineer1);
    const score2 = calculateEngineerScore(engineer2);

    expect(score1).toBeGreaterThan(score2);
  });
});
```

#### **Integration Tests (API)**

```javascript
// Example: tests/integration/device-lifecycle.test.ts
import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

describe('Device Lifecycle Integration', () => {
  let supabase;
  let adminSession;
  let engineerId;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    // Setup test data
    adminSession = await signInAsAdmin();
    engineerId = await createTestEngineer();
  });

  it('should complete full device lifecycle', async () => {
    // 1. Create device
    const { data: device } = await supabase
      .from('devices')
      .insert({ serial_number: 'TEST-001', model: 'PAX S920' })
      .select()
      .single();

    expect(device.status).toBe('warehouse');

    // 2. Issue to engineer
    const { data: issuance } = await fetch(`${EDGE_URL}/issue-device-to-engineer`, {
      method: 'POST',
      body: JSON.stringify({
        device_ids: [device.id],
        engineer_id: engineerId
      })
    }).then(r => r.json());

    expect(issuance.success).toBe(true);

    // 3. Verify status changed
    const { data: updatedDevice } = await supabase
      .from('devices')
      .select('status')
      .eq('id', device.id)
      .single();

    expect(updatedDevice.status).toBe('issued');
  });
});
```

#### **E2E Tests (Playwright)**

```javascript
// Example: tests/e2e/admin-create-call.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Call Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@costar.test');
    await page.fill('[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should create new call successfully', async ({ page }) => {
    // Navigate to calls page
    await page.click('text=Calls');
    await expect(page).toHaveURL('/calls');

    // Click create call button
    await page.click('text=Create Call');

    // Fill form
    await page.selectOption('[name="client_bank"]', { label: 'Test Bank' });
    await page.fill('[name="client_name"]', 'Main Branch');
    await page.fill('[name="client_address"]', '123 Test St');
    await page.fill('[name="client_phone"]', '+1234567890');
    await page.selectOption('[name="type"]', 'install');
    await page.selectOption('[name="priority"]', 'high');
    await page.fill('[name="scheduled_date"]', '2025-12-01');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=Main Branch')).toBeVisible();
  });
});
```

---

## 2. Service Level Objectives (SLOs) & Key Performance Indicators (KPIs)

### 2.1 Performance SLOs

| Metric | Target | Measurement | Alert Threshold |
|--------|--------|-------------|-----------------|
| **API Availability** | 99.9% | Uptime monitoring | < 99.5% |
| **API Response Time (p95)** | < 500ms | Edge function logs | > 1000ms |
| **API Response Time (p99)** | < 1000ms | Edge function logs | > 2000ms |
| **Database Query Time (p95)** | < 200ms | Supabase logs | > 500ms |
| **Photo Upload Time (p95)** | < 5s | Edge function logs | > 10s |
| **Dashboard Load Time** | < 2s | RUM (Real User Monitoring) | > 3s |
| **Mobile App Response** | < 1s | Client-side metrics | > 2s |

### 2.2 Business KPIs

| KPI | Target | Formula | Tracking Frequency |
|-----|--------|---------|-------------------|
| **Call Completion Rate** | > 95% | Completed / Total Calls | Daily |
| **Assignment Success Rate** | > 98% | Assigned / Pending Calls | Hourly |
| **Average Call Duration** | < 2 hours | avg(completed_at - started_at) | Daily |
| **Device Utilization** | > 80% | Installed / Total Devices | Weekly |
| **Stock Reconciliation Errors** | < 0.1% | Mismatches / Total Devices | Daily |
| **Photo Evidence Compliance** | 100% | Calls with Photos / Completed Calls | Daily |
| **Engineer Productivity** | > 6 calls/day | avg(calls per engineer) | Weekly |
| **First-Time Fix Rate** | > 90% | No Repeat Calls / Total Calls | Weekly |
| **QR Scan Success Rate** | > 99% | Successful Scans / Total Scans | Daily |
| **Shipment On-Time Rate** | > 95% | On-Time / Total Shipments | Weekly |

### 2.3 Error Rate Targets

| Error Type | Target | Alert Threshold |
|-----------|--------|-----------------|
| **API Error Rate** | < 0.5% | > 1% |
| **Authentication Failures** | < 0.1% | > 0.5% |
| **Database Deadlocks** | 0 | > 0 |
| **Failed Photo Uploads** | < 2% | > 5% |
| **QR Scan Failures** | < 1% | > 3% |
| **Assignment Algorithm Failures** | < 0.1% | > 0.5% |
| **Data Validation Errors** | < 1% | > 3% |

---

## 3. Monitoring Stack & Implementation

### 3.1 Recommended Monitoring Tools

#### **Application Performance Monitoring**
- **Sentry** (Error Tracking & Performance)
  - Frontend: React SDK
  - Backend: Edge Functions integration
  - Mobile: React Native SDK (future)

#### **Infrastructure Monitoring**
- **Supabase Dashboard**
  - Database performance
  - API logs
  - Storage metrics

- **Uptime Robot / Better Uptime**
  - Endpoint availability checks
  - SSL certificate monitoring
  - Public status page

#### **Log Aggregation**
- **Supabase Logs** (Built-in)
  - Edge function logs
  - Database logs
  - Storage logs

#### **Real User Monitoring (RUM)**
- **Vercel Analytics** or **Google Analytics 4**
  - Page load times
  - User flows
  - Conversion funnels

### 3.2 Sentry Setup (Error Tracking)

```typescript
// src/lib/sentry.ts
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENV || 'development',
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  beforeSend(event) {
    // Don't send events in development
    if (import.meta.env.DEV) return null;

    // Scrub sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }

    return event;
  },
});

// Custom context for better debugging
export const setSentryUser = (profile: UserProfile) => {
  Sentry.setUser({
    id: profile.id,
    email: profile.email,
    role: profile.role,
  });
};

export const logError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    contexts: { additional: context },
  });
};
```

### 3.3 Custom Monitoring Dashboard (Supabase)

```sql
-- Create monitoring views
CREATE OR REPLACE VIEW monitoring_daily_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_calls,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_calls,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_calls,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600)
    FILTER (WHERE completed_at IS NOT NULL) as avg_call_duration_hours,
  COUNT(DISTINCT assigned_engineer) as active_engineers
FROM calls
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Device reconciliation check
CREATE OR REPLACE VIEW monitoring_device_reconciliation AS
SELECT
  status,
  COUNT(*) as device_count,
  COUNT(*) FILTER (WHERE assigned_to IS NOT NULL) as assigned_count,
  COUNT(*) FILTER (WHERE assigned_to IS NULL) as unassigned_count
FROM devices
GROUP BY status;

-- Engineer performance metrics
CREATE OR REPLACE VIEW monitoring_engineer_performance AS
SELECT
  u.id,
  u.full_name,
  u.bank_id,
  COUNT(c.id) FILTER (WHERE c.status = 'completed' AND c.completed_at >= CURRENT_DATE - 7) as calls_last_7_days,
  AVG(EXTRACT(EPOCH FROM (c.completed_at - c.started_at))/3600)
    FILTER (WHERE c.completed_at IS NOT NULL) as avg_call_duration_hours,
  COUNT(d.id) FILTER (WHERE d.status = 'issued') as devices_issued
FROM user_profiles u
LEFT JOIN calls c ON c.assigned_engineer = u.id
LEFT JOIN devices d ON d.assigned_to = u.id
WHERE u.role = 'engineer' AND u.status = 'active'
GROUP BY u.id, u.full_name, u.bank_id
ORDER BY calls_last_7_days DESC;
```

### 3.4 Alert Definitions

#### **Critical Alerts (Page Immediately)**

1. **API Down**
   - Condition: 5 consecutive failed health checks
   - Action: Page on-call engineer
   - Escalation: 5 minutes

2. **Database Connection Errors**
   - Condition: > 10 connection errors in 5 minutes
   - Action: Page on-call engineer + database admin
   - Escalation: 5 minutes

3. **Assignment Algorithm Failure**
   - Condition: Assignment fails for > 5 calls in 10 minutes
   - Action: Alert admin team
   - Escalation: 15 minutes

#### **High Priority Alerts (Notify Within 15 mins)**

4. **High Error Rate**
   - Condition: API error rate > 1% over 15 minutes
   - Action: Slack notification to dev team
   - Escalation: 30 minutes

5. **Photo Upload Failures**
   - Condition: > 10% upload failures in 1 hour
   - Action: Alert operations team
   - Escalation: 1 hour

6. **Stock Reconciliation Mismatch**
   - Condition: Device count mismatch > 5 units
   - Action: Alert inventory manager
   - Escalation: 2 hours

#### **Medium Priority Alerts (Notify Within 1 hour)**

7. **Slow API Performance**
   - Condition: p95 response time > 1000ms for 30 minutes
   - Action: Email dev team
   - Escalation: 4 hours

8. **High Storage Usage**
   - Condition: Storage > 80% capacity
   - Action: Email admin team
   - Escalation: 24 hours

### 3.5 Monitoring Edge Functions

```typescript
// supabase/functions/_shared/monitoring.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

export interface FunctionMetrics {
  function_name: string;
  execution_time_ms: number;
  status: 'success' | 'error';
  error_message?: string;
  user_id?: string;
  request_id: string;
}

export const logMetrics = async (metrics: FunctionMetrics) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  await supabase.from('function_metrics').insert({
    ...metrics,
    timestamp: new Date().toISOString(),
  });
};

export const withMonitoring = async <T>(
  functionName: string,
  fn: () => Promise<T>,
  userId?: string
): Promise<T> => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const result = await fn();

    await logMetrics({
      function_name: functionName,
      execution_time_ms: Date.now() - startTime,
      status: 'success',
      user_id: userId,
      request_id: requestId,
    });

    return result;
  } catch (error) {
    await logMetrics({
      function_name: functionName,
      execution_time_ms: Date.now() - startTime,
      status: 'error',
      error_message: error.message,
      user_id: userId,
      request_id: requestId,
    });

    throw error;
  }
};
```

---

## 4. Disaster Recovery & Rollback Plan

### 4.1 Backup Strategy

#### **Database Backups**
- **Frequency**: Daily (automatic via Supabase)
- **Retention**: 7 days (Pro plan) or 30 days (Team plan)
- **Manual Backup**: Before major migrations
- **Testing**: Monthly backup restore test

```bash
# Manual backup script
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to S3 or cloud storage
aws s3 cp $BACKUP_FILE s3://costar-backups/database/

echo "Backup completed: $BACKUP_FILE"
```

#### **Storage Backups**
- **Photos**: Stored in Supabase Storage (redundant by default)
- **Export**: Weekly export of critical photos to external storage
- **Retention**: 90 days minimum

#### **Code & Configuration**
- **Git**: All code in version control
- **Environment Variables**: Stored in secure vault (1Password, AWS Secrets Manager)
- **Documentation**: Google Docs with version history

### 4.2 Rollback Procedures

#### **Database Migration Rollback**

```sql
-- Each migration should have a down migration
-- Example: 017_add_new_feature_up.sql
ALTER TABLE devices ADD COLUMN new_field text;

-- Example: 017_add_new_feature_down.sql
ALTER TABLE devices DROP COLUMN IF EXISTS new_field;
```

```bash
# Rollback script
#!/bin/bash
# rollback-migration.sh

MIGRATION_VERSION=$1

if [ -z "$MIGRATION_VERSION" ]; then
  echo "Usage: ./rollback-migration.sh <version>"
  exit 1
fi

# Run down migration
psql $DATABASE_URL < "migrations/${MIGRATION_VERSION}_down.sql"

# Verify rollback
psql $DATABASE_URL -c "SELECT version FROM migrations ORDER BY version DESC LIMIT 5;"
```

#### **Edge Function Rollback**

1. **Keep Previous Version**: Deploy with versioning
2. **Feature Flags**: Toggle features without redeployment
3. **Traffic Shift**: Gradually route traffic to new version

```typescript
// Feature flag example
const FEATURE_FLAGS = {
  new_assignment_algorithm: false, // Toggle to rollback
  photo_compression: true,
  offline_mode: false,
};

export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature] ?? false;
};
```

#### **Frontend Rollback**

```bash
# Rollback to previous deployment (Netlify/Vercel)
netlify rollback --site-id=<SITE_ID>

# Or redeploy specific commit
git revert HEAD
git push origin main
```

### 4.3 Incident Response Plan

#### **Severity Levels**

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|----------|
| **SEV1 - Critical** | Complete outage | 15 minutes | API down, database unreachable |
| **SEV2 - High** | Major feature broken | 1 hour | Photo uploads failing, assignments not working |
| **SEV3 - Medium** | Minor feature degraded | 4 hours | Slow dashboard, search not working |
| **SEV4 - Low** | Cosmetic issues | 1 business day | UI glitch, typo |

#### **Response Steps**

1. **Detect**: Monitoring alerts or user report
2. **Assess**: Determine severity and impact
3. **Notify**: Alert relevant stakeholders
4. **Investigate**: Review logs, metrics, recent changes
5. **Mitigate**: Rollback or hotfix
6. **Verify**: Confirm issue resolved
7. **Postmortem**: Document lessons learned

#### **Communication Template**

```markdown
## Incident Report: [Title]

**Severity**: SEV1 / SEV2 / SEV3 / SEV4
**Status**: Investigating / Identified / Monitoring / Resolved
**Started**: YYYY-MM-DD HH:MM UTC
**Resolved**: YYYY-MM-DD HH:MM UTC

### Impact
- Who was affected?
- What functionality was broken?
- How many users impacted?

### Root Cause
- What caused the issue?
- Why did it happen?

### Resolution
- What steps were taken to fix it?
- Was a rollback necessary?

### Prevention
- What can we do to prevent this in the future?
- What monitoring/alerts should be added?

### Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Verified resolved
```

---

## 5. Deployment Strategy & Feature Flags

### 5.1 Feature Flag System

```typescript
// src/lib/featureFlags.ts
export type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number; // For gradual rollout
  allowedUsers?: string[]; // For beta testing
  allowedRoles?: string[]; // Role-based access
};

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  NEW_ASSIGNMENT_ALGO: {
    key: 'new_assignment_algo',
    enabled: false,
    description: 'New proximity-based assignment algorithm',
    rolloutPercentage: 0,
  },
  OFFLINE_MODE: {
    key: 'offline_mode',
    enabled: false,
    description: 'Mobile offline support',
    allowedUsers: ['engineer@costar.test'],
  },
  BULK_PHOTO_UPLOAD: {
    key: 'bulk_photo_upload',
    enabled: true,
    description: 'Upload multiple photos at once',
    rolloutPercentage: 100,
  },
  ADVANCED_ANALYTICS: {
    key: 'advanced_analytics',
    enabled: false,
    description: 'Advanced reporting dashboard',
    allowedRoles: ['admin'],
  },
};

export const isFeatureEnabled = (
  flagKey: string,
  userId?: string,
  userRole?: string
): boolean => {
  const flag = FEATURE_FLAGS[flagKey];
  if (!flag) return false;
  if (!flag.enabled) return false;

  // Check user whitelist
  if (flag.allowedUsers && userId) {
    return flag.allowedUsers.includes(userId);
  }

  // Check role whitelist
  if (flag.allowedRoles && userRole) {
    return flag.allowedRoles.includes(userRole);
  }

  // Check rollout percentage
  if (flag.rolloutPercentage !== undefined && userId) {
    const hash = simpleHash(userId);
    return (hash % 100) < flag.rolloutPercentage;
  }

  return true;
};

const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};
```

### 5.2 Canary Deployment Strategy

```yaml
# .github/workflows/deploy-canary.yml
name: Canary Deployment

on:
  push:
    branches: [main]

jobs:
  deploy-canary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Canary (10% traffic)
        run: |
          # Deploy to canary environment
          npm run build
          netlify deploy --prod --alias canary

      - name: Run Smoke Tests
        run: npm run test:e2e:smoke

      - name: Monitor Canary for 30 mins
        run: |
          # Monitor error rates
          sleep 1800

      - name: Check Canary Health
        run: |
          ERROR_RATE=$(curl https://api.sentry.io/canary/error-rate)
          if [ $ERROR_RATE -gt 1 ]; then
            echo "High error rate detected, rolling back"
            exit 1
          fi

      - name: Promote to Production (100% traffic)
        if: success()
        run: netlify deploy --prod
```

### 5.3 Blue-Green Deployment

```bash
# Blue-Green deployment script
#!/bin/bash
# deploy-blue-green.sh

CURRENT_ENV=$(netlify env:get CURRENT_ENV)
NEW_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current environment: $CURRENT_ENV"
echo "Deploying to: $NEW_ENV"

# Deploy to inactive environment
npm run build
netlify deploy --alias $NEW_ENV

# Run health checks
./scripts/health-check.sh "https://$NEW_ENV.costar.app"

if [ $? -eq 0 ]; then
  echo "Health checks passed, switching traffic to $NEW_ENV"

  # Switch traffic
  netlify env:set CURRENT_ENV $NEW_ENV
  netlify alias $NEW_ENV production

  echo "Deployment successful!"
else
  echo "Health checks failed, keeping $CURRENT_ENV active"
  exit 1
fi
```

---

## 6. 10-Day Phased Rollout Plan

### **Overview Timeline**

```
Day 1-2:  Infrastructure Setup & Monitoring
Day 3-4:  Backend & Database Deployment
Day 5-6:  Admin UI Deployment & Internal Testing
Day 7:    Mobile Alpha Release (5 engineers)
Day 8:    QA & Bug Fixes
Day 9:    Pilot Launch (20% of engineers)
Day 10:   Full Production Launch
```

---

### **Day 1: Infrastructure Setup**

#### **Objectives**
- Set up production environment
- Configure monitoring and alerting
- Establish backup procedures

#### **Tasks**
- [ ] Create production Supabase project
- [ ] Configure custom domain and SSL
- [ ] Set up Sentry error tracking
- [ ] Configure uptime monitoring (Better Uptime)
- [ ] Set up log aggregation
- [ ] Create admin user accounts
- [ ] Test database backups
- [ ] Configure CORS and security headers

#### **Acceptance Criteria**
- ✅ All monitoring dashboards accessible
- ✅ Alerts routing to correct channels (Slack, email, SMS)
- ✅ Backup and restore tested successfully
- ✅ SSL certificate valid and HTTPS enforced
- ✅ Admin can access Supabase dashboard

#### **Rollback Plan**
- Keep staging environment active
- Document all credentials in secure vault

---

### **Day 2: Monitoring & Observability**

#### **Objectives**
- Deploy custom monitoring dashboards
- Set up performance tracking
- Create runbooks for common issues

#### **Tasks**
- [ ] Deploy monitoring SQL views
- [ ] Create Grafana/Metabase dashboards
- [ ] Set up custom metrics collection
- [ ] Configure alert thresholds
- [ ] Write incident response runbook
- [ ] Test alert channels (trigger test alerts)
- [ ] Document escalation procedures

#### **Acceptance Criteria**
- ✅ All monitoring views return data
- ✅ Dashboards show real-time metrics
- ✅ Test alerts received by all channels
- ✅ Runbook accessible to all team members
- ✅ Performance baselines established

#### **Rollback Plan**
- Monitoring is non-breaking, no rollback needed
- Can disable noisy alerts if needed

---

### **Day 3: Database Migration**

#### **Objectives**
- Run all production migrations
- Seed initial data (banks, warehouses, couriers)
- Verify RLS policies

#### **Tasks**
- [ ] Review all migration files
- [ ] Create database backup
- [ ] Run migrations in order
- [ ] Seed banks (customer data)
- [ ] Seed warehouses
- [ ] Seed courier companies
- [ ] Test RLS policies with test users
- [ ] Verify foreign key constraints
- [ ] Test data reconciliation queries

#### **Acceptance Criteria**
- ✅ All 16 migrations applied successfully
- ✅ Default data seeded (1 warehouse, 4 couriers, 5+ banks)
- ✅ RLS prevents unauthorized access
- ✅ All database views return valid data
- ✅ No orphaned records or constraint violations

#### **Rollback Plan**
```bash
# Restore from backup if migrations fail
pg_restore --clean --if-exists -d $DATABASE_URL backup_pre_migration.sql

# Verify rollback
psql $DATABASE_URL -c "SELECT version FROM migrations;"
```

---

### **Day 4: Edge Functions Deployment**

#### **Objectives**
- Deploy all Edge Functions
- Test critical flows
- Verify authentication and authorization

#### **Tasks**
- [ ] Deploy all 12 Edge Functions
- [ ] Test assign-calls function
- [ ] Test issue-device-to-engineer
- [ ] Test scan-device
- [ ] Test submit-call-completion
- [ ] Test upload-photo
- [ ] Test bulk-import-devices
- [ ] Verify JWT verification works
- [ ] Test error handling and logging
- [ ] Load test critical endpoints

#### **Acceptance Criteria**
- ✅ All functions deploy without errors
- ✅ API returns 200 OK for valid requests
- ✅ API returns 401 for unauthorized requests
- ✅ API returns 400 for invalid input
- ✅ Function logs appear in Supabase dashboard
- ✅ Performance under load acceptable (< 500ms p95)

#### **Rollback Plan**
```bash
# Redeploy previous version
supabase functions deploy assign-calls --previous-version

# Or disable problematic function
# (Remove from production routing)
```

---

### **Day 5: Admin UI Deployment**

#### **Objectives**
- Deploy admin web application
- Test all admin features
- Create demo data for testing

#### **Tasks**
- [ ] Deploy frontend to Netlify/Vercel
- [ ] Configure environment variables
- [ ] Test login flow (admin and engineer)
- [ ] Test device management (create, edit, issue)
- [ ] Test call management (create, assign, complete)
- [ ] Test bank management (create, edit)
- [ ] Test stock receiving (barcode scan)
- [ ] Test shipment tracking
- [ ] Create 50+ test devices
- [ ] Create 20+ test calls

#### **Acceptance Criteria**
- ✅ Admin can log in successfully
- ✅ All CRUD operations work correctly
- ✅ No console errors or warnings
- ✅ Page load time < 2 seconds
- ✅ Responsive design works on tablet/mobile
- ✅ Navigation works correctly
- ✅ Test data created successfully

#### **Rollback Plan**
```bash
# Rollback to previous deployment
netlify rollback

# Or point DNS back to staging
```

---

### **Day 6: Internal Testing & Bug Fixes**

#### **Objectives**
- Internal team tests all features
- Document bugs and fix critical issues
- Prepare training materials

#### **Tasks**
- [ ] Admin team tests all admin features
- [ ] Operations team tests stock receiving
- [ ] IT team tests user management
- [ ] Document all bugs in tracker
- [ ] Prioritize bugs (P0, P1, P2)
- [ ] Fix all P0 bugs
- [ ] Fix critical P1 bugs
- [ ] Create user training guide
- [ ] Create video walkthrough (admin)
- [ ] Create FAQ document

#### **Acceptance Criteria**
- ✅ All P0 bugs resolved
- ✅ Critical P1 bugs resolved
- ✅ Training materials reviewed
- ✅ No critical security issues
- ✅ Admin team comfortable with system

#### **Metrics to Track**
- Bugs found: Target < 20
- P0 bugs: Target 0
- P1 bugs: Target < 5
- Training completion: 100% of admin team

---

### **Day 7: Mobile Alpha Release**

#### **Objectives**
- Release mobile PWA to alpha testers
- Collect feedback from 5 field engineers
- Monitor mobile-specific metrics

#### **Tasks**
- [ ] Select 5 alpha test engineers
- [ ] Provide mobile access credentials
- [ ] Train engineers on mobile app
- [ ] Engineers test call acceptance
- [ ] Engineers test QR scanning
- [ ] Engineers test photo upload
- [ ] Engineers test call completion
- [ ] Collect feedback via form
- [ ] Monitor mobile error rates
- [ ] Monitor photo upload success

#### **Acceptance Criteria**
- ✅ All 5 engineers can log in
- ✅ QR scan success rate > 95%
- ✅ Photo upload success rate > 90%
- ✅ At least 10 test calls completed
- ✅ Mobile error rate < 2%
- ✅ Positive feedback from engineers

#### **Feedback Collection**
```markdown
## Alpha Tester Feedback Form

**Engineer Name**: _______
**Date**: _______
**Device**: _______

**Call Acceptance** (1-5): ___
- Issues encountered: _______

**QR Scanning** (1-5): ___
- Scan failures: ___
- Issues encountered: _______

**Photo Upload** (1-5): ___
- Upload failures: ___
- Time to upload: _______

**Call Completion** (1-5): ___
- Issues encountered: _______

**Overall Experience** (1-5): ___
**Top 3 Issues**:
1. _______
2. _______
3. _______

**Suggestions**: _______
```

---

### **Day 8: QA & Bug Bash**

#### **Objectives**
- Full QA regression testing
- Fix all critical bugs
- Optimize performance

#### **Tasks**
- [ ] Run full regression test suite
- [ ] Test all P0 critical paths
- [ ] Test edge cases and error scenarios
- [ ] Performance testing (load test)
- [ ] Security testing (penetration test)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile device testing (iOS, Android)
- [ ] Fix all remaining P0 bugs
- [ ] Fix high-impact P1 bugs
- [ ] Document known issues

#### **Test Results Template**
```markdown
## QA Test Results - Day 8

**Test Suite**: Full Regression
**Date**: YYYY-MM-DD
**Tester**: _______

| Test Case | Status | Notes |
|-----------|--------|-------|
| Admin Login | ✅ Pass | |
| Create Call | ✅ Pass | |
| Assign Call | ✅ Pass | |
| Engineer Login | ✅ Pass | |
| Accept Call | ✅ Pass | |
| Scan QR Code | ❌ Fail | Bug #123 |
| Upload Photo | ✅ Pass | |
| Complete Call | ✅ Pass | |
| Device Issuance | ✅ Pass | |
| Stock Receiving | ✅ Pass | |
| Shipment Tracking | ✅ Pass | |

**Summary**:
- Tests Run: 50
- Passed: 48
- Failed: 2
- Blocked: 0

**Critical Issues**:
1. [Bug #123] QR scan fails in low light - FIXED
2. [Bug #124] Photo upload timeout on slow network - FIXED
```

#### **Acceptance Criteria**
- ✅ Test pass rate > 95%
- ✅ All P0 bugs resolved
- ✅ All P1 bugs resolved or documented
- ✅ Performance meets SLOs
- ✅ No security vulnerabilities found

---

### **Day 9: Pilot Launch (20% Rollout)**

#### **Objectives**
- Release to 20% of engineers (pilot group)
- Monitor production metrics closely
- Gather feedback from pilot users

#### **Tasks**
- [ ] Select 20% of engineers for pilot
- [ ] Enable production access for pilot users
- [ ] Send launch announcement email
- [ ] Provide training session (live demo)
- [ ] Create support channel (Slack/WhatsApp)
- [ ] Monitor error rates hourly
- [ ] Monitor call completion rates
- [ ] Monitor photo upload success
- [ ] Collect user feedback
- [ ] Respond to support requests < 1 hour
- [ ] Daily standup with pilot users

#### **Launch Announcement Email**
```markdown
Subject: Welcome to CoSTAR Field Service - Pilot Launch!

Hello [Engineer Name],

We're excited to announce that you've been selected for the pilot launch of our new CoSTAR Field Service Management system!

**What's New:**
- Mobile-friendly call management
- QR code scanning for device tracking
- Photo evidence for completed calls
- Real-time call updates

**Getting Started:**
1. Visit: https://app.costar-field.com
2. Log in with your credentials
3. Watch the training video: [link]
4. Start accepting calls!

**Support:**
- Help Center: [link]
- WhatsApp Support: [number]
- Email: support@costar-field.com

We'll be monitoring closely and would love your feedback. Please report any issues immediately.

Thank you for being part of our pilot program!

Best regards,
CoSTAR Team
```

#### **Acceptance Criteria**
- ✅ 20% of engineers successfully onboarded
- ✅ At least 50 real calls completed
- ✅ Error rate < 1%
- ✅ Call completion rate > 90%
- ✅ Photo compliance rate 100%
- ✅ No critical bugs reported
- ✅ Average feedback score > 4/5

#### **Rollback Criteria**
```markdown
## Rollback Decision Matrix

Rollback if ANY of these occur:
- ❌ Error rate > 3% for > 30 minutes
- ❌ API availability < 95%
- ❌ > 5 critical bugs reported
- ❌ Data loss or corruption detected
- ❌ Security breach detected
- ❌ Call completion rate < 70%
- ❌ Engineers unable to complete calls

Proceed with caution if:
- ⚠️ Error rate 1-3%
- ⚠️ Minor bugs reported (< 5)
- ⚠️ Performance degradation (< 20%)

Continue if:
- ✅ Error rate < 1%
- ✅ No critical bugs
- ✅ Positive user feedback
- ✅ All KPIs meeting targets
```

---

### **Day 10: Full Production Launch**

#### **Objectives**
- Release to 100% of users
- Monitor all metrics closely
- Celebrate launch!

#### **Tasks**
- [ ] Review Day 9 metrics and feedback
- [ ] Make go/no-go decision
- [ ] Enable access for all users
- [ ] Send launch announcement to all users
- [ ] Conduct company-wide launch meeting
- [ ] Monitor error rates every 15 minutes
- [ ] Monitor all business KPIs
- [ ] Respond to support requests < 30 minutes
- [ ] Update status page
- [ ] Celebrate with team! 🎉

#### **Go/No-Go Checklist**
```markdown
## Production Launch - Go/No-Go Checklist

**Date**: YYYY-MM-DD HH:MM
**Decision Maker**: [Name]

### Technical Readiness
- [ ] ✅ All systems operational
- [ ] ✅ All tests passing
- [ ] ✅ No critical bugs
- [ ] ✅ Monitoring and alerts working
- [ ] ✅ Backup and rollback tested
- [ ] ✅ Performance meets SLOs
- [ ] ✅ Security review passed

### Pilot Results
- [ ] ✅ Error rate < 1%
- [ ] ✅ Call completion rate > 90%
- [ ] ✅ User feedback positive (> 4/5)
- [ ] ✅ No major issues reported
- [ ] ✅ Support team ready

### Business Readiness
- [ ] ✅ Training materials complete
- [ ] ✅ Support team trained
- [ ] ✅ Stakeholders informed
- [ ] ✅ Communication plan ready
- [ ] ✅ Success metrics defined

### Decision
- [ ] GO for launch
- [ ] NO-GO (reason: _______)
- [ ] DELAY (reason: _______)

**Approved By**: _______
**Signature**: _______
```

#### **Launch Day Schedule**
```
08:00 - Pre-launch meeting (tech team)
08:30 - Final system checks
09:00 - Enable 100% access
09:15 - Send launch announcement
09:30 - Company-wide launch meeting
10:00 - Monitor metrics (hourly checks)
12:00 - Mid-day status update
15:00 - Afternoon status update
17:00 - End-of-day retrospective
18:00 - Team celebration dinner
```

#### **Success Criteria (First 24 Hours)**
- ✅ System availability > 99.5%
- ✅ Error rate < 0.5%
- ✅ 100+ calls completed successfully
- ✅ Photo compliance rate 100%
- ✅ No critical bugs
- ✅ Average call completion time < 2 hours
- ✅ QR scan success rate > 99%
- ✅ User satisfaction > 4/5

---

## 7. Post-Launch: Week 1 Daily Checks

### **Daily Monitoring Checklist**

#### **Every Morning (9:00 AM)**

```markdown
## Daily Health Check - [Date]

### System Health
- [ ] Check uptime (target: 100%)
- [ ] Review error rate (target: < 0.5%)
- [ ] Check API response times (target: < 500ms p95)
- [ ] Review database performance
- [ ] Check storage usage
- [ ] Verify backups completed

### Business Metrics
- [ ] Calls created yesterday: _____
- [ ] Calls completed yesterday: _____
- [ ] Call completion rate: _____% (target: > 95%)
- [ ] Average call duration: _____ hours
- [ ] Active engineers: _____
- [ ] Devices issued: _____
- [ ] Devices installed: _____
- [ ] Stock reconciliation errors: _____ (target: 0)

### Error Review
- [ ] Review Sentry errors (group by type)
- [ ] Check for new error patterns
- [ ] Prioritize critical errors
- [ ] Assign bugs to developers

### User Feedback
- [ ] Review support tickets: _____ new
- [ ] Read user feedback/complaints
- [ ] Identify trending issues
- [ ] Update FAQ if needed

### Action Items
1. _____
2. _____
3. _____
```

#### **Error Triage Process**

```markdown
## Error Triage - Day [X]

### Top 5 Errors (by frequency)
1. [Error Type] - Count: _____ - Severity: _____
   - Impact: _____
   - Action: _____

2. [Error Type] - Count: _____ - Severity: _____
   - Impact: _____
   - Action: _____

3. [Error Type] - Count: _____ - Severity: _____
   - Impact: _____
   - Action: _____

### New Errors (appeared in last 24h)
- [Error Type] - First seen: _____ - Count: _____

### Resolved Errors
- [Error Type] - Resolved: _____ - Fix: _____
```

### **Week 1 Daily Focus Areas**

#### **Day 1 (Launch Day)**
- **Focus**: System stability and immediate bug fixes
- **Metrics**: Error rate, uptime, user login success
- **Actions**:
  - Monitor every 15 minutes
  - Fix critical bugs within 1 hour
  - Respond to all support requests within 30 minutes

#### **Day 2**
- **Focus**: Call assignment and completion flow
- **Metrics**: Assignment success rate, call completion rate, average call duration
- **Actions**:
  - Review assignment algorithm performance
  - Check for unassigned calls
  - Verify engineer workload balance

#### **Day 3**
- **Focus**: Mobile app performance and QR scanning
- **Metrics**: QR scan success rate, photo upload success, mobile error rate
- **Actions**:
  - Review mobile-specific errors
  - Check camera permissions issues
  - Optimize photo upload performance

#### **Day 4**
- **Focus**: Stock reconciliation and device tracking
- **Metrics**: Device count accuracy, stock movements, reconciliation errors
- **Actions**:
  - Run full inventory reconciliation
  - Verify device status transitions
  - Check for orphaned devices

#### **Day 5**
- **Focus**: User feedback and training
- **Metrics**: User satisfaction score, support ticket volume, training completion
- **Actions**:
  - Conduct user feedback survey
  - Schedule additional training sessions
  - Update documentation based on feedback

#### **Day 6**
- **Focus**: Performance optimization
- **Metrics**: API response times, page load times, database query performance
- **Actions**:
  - Identify slow queries
  - Optimize database indexes
  - Review and optimize edge functions

#### **Day 7**
- **Focus**: Weekly retrospective and planning
- **Metrics**: All KPIs vs targets
- **Actions**:
  - Weekly team retrospective
  - Prioritize next week's improvements
  - Celebrate wins and learn from issues

---

## 8. Continuous Improvement Process

### 8.1 Weekly Retrospective Template

```markdown
## Week [N] Retrospective - CoSTAR Field Service

**Date**: YYYY-MM-DD
**Attendees**: Dev Team, Product Manager, Operations Manager

### Metrics Review
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| System Uptime | 99.9% | _____% | ✅/❌ |
| Error Rate | < 0.5% | _____% | ✅/❌ |
| Call Completion Rate | > 95% | _____% | ✅/❌ |
| Photo Compliance | 100% | _____% | ✅/❌ |
| User Satisfaction | > 4/5 | _____ | ✅/❌ |

### What Went Well? 😊
1. _____
2. _____
3. _____

### What Didn't Go Well? 😞
1. _____
2. _____
3. _____

### What Did We Learn? 📚
1. _____
2. _____
3. _____

### Action Items for Next Week
| Action | Owner | Deadline | Priority |
|--------|-------|----------|----------|
| _____ | _____ | _____ | P0/P1/P2 |
| _____ | _____ | _____ | P0/P1/P2 |
| _____ | _____ | _____ | P0/P1/P2 |

### User Feedback Themes
1. **Most Requested Feature**: _____
2. **Top Complaint**: _____
3. **Most Praised**: _____
```

### 8.2 Monthly Review & Planning

```markdown
## Monthly Review - Month [N]

### Executive Summary
- Total Calls Completed: _____
- Total Devices Deployed: _____
- System Uptime: _____%
- Average Call Duration: _____ hours
- Engineer Productivity: _____ calls/day/engineer

### Key Achievements
1. _____
2. _____
3. _____

### Challenges Faced
1. _____
2. _____
3. _____

### Top 5 Feature Requests
1. _____ (votes: _____)
2. _____ (votes: _____)
3. _____ (votes: _____)
4. _____ (votes: _____)
5. _____ (votes: _____)

### Roadmap for Next Month
**Theme**: _____

**High Priority**:
- [ ] _____
- [ ] _____
- [ ] _____

**Medium Priority**:
- [ ] _____
- [ ] _____

**Low Priority (if time permits)**:
- [ ] _____
```

---

## 9. Operational Runbooks

### 9.1 Common Issues & Solutions

#### **Issue: High API Error Rate**

**Symptoms**: Error rate > 1%, Sentry alerts firing

**Diagnosis**:
```bash
# Check recent errors
curl https://api.sentry.io/projects/costar/errors?last=1h

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check edge function logs
supabase functions logs assign-calls --tail
```

**Resolution**:
1. Check if specific function is failing
2. Review recent deployments (rollback if needed)
3. Check database connection pool
4. Verify external service dependencies (Supabase, Sentry)
5. Scale resources if load-related

**Prevention**:
- Implement circuit breakers
- Add request timeouts
- Improve error handling
- Add retry logic

---

#### **Issue: Assignment Algorithm Not Working**

**Symptoms**: Calls stuck in "pending" status, no assignments

**Diagnosis**:
```sql
-- Check pending calls
SELECT id, call_number, created_at, priority
FROM calls
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 20;

-- Check available engineers
SELECT id, full_name, bank_id
FROM user_profiles
WHERE role = 'engineer' AND status = 'active'
AND id IN (SELECT DISTINCT assigned_engineer FROM calls WHERE status = 'in_progress');
```

**Resolution**:
1. Check if any engineers available
2. Verify engineer bank assignments match call banks
3. Check if assignment edge function is running
4. Review assignment logs for errors
5. Manually assign calls if critical

**Prevention**:
- Add monitoring for pending calls age
- Alert if pending > 30 minutes
- Implement fallback assignment logic
- Add admin override capability

---

#### **Issue: Photo Upload Failures**

**Symptoms**: Engineers report photos not uploading, high upload error rate

**Diagnosis**:
```sql
-- Check recent photo upload attempts
SELECT
  created_at,
  call_id,
  photo_type,
  status
FROM photos
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

```bash
# Check storage usage
supabase storage list --project-ref [REF]

# Check upload edge function logs
supabase functions logs upload-photo --tail
```

**Resolution**:
1. Check storage quota (upgrade if needed)
2. Verify CORS settings
3. Check file size limits
4. Review network issues (CDN, DNS)
5. Implement retry mechanism in app

**Prevention**:
- Implement client-side image compression
- Add upload retry logic
- Show upload progress indicator
- Queue failed uploads for retry

---

#### **Issue: Stock Reconciliation Mismatch**

**Symptoms**: Device counts don't match reality, inventory errors

**Diagnosis**:
```sql
-- Run reconciliation query
SELECT
  status,
  COUNT(*) as system_count
FROM devices
GROUP BY status;

-- Check for orphaned devices
SELECT id, serial_number, status, assigned_to
FROM devices
WHERE (status = 'issued' AND assigned_to IS NULL)
   OR (status = 'warehouse' AND assigned_to IS NOT NULL);
```

**Resolution**:
1. Run full inventory audit
2. Identify discrepancies
3. Manually correct device statuses
4. Update engineer assignments
5. Document cause of mismatch

**Prevention**:
- Daily automated reconciliation
- Alert on mismatches
- Implement status transition validation
- Add audit trail for all changes

---

## 10. Success Metrics Dashboard

### 10.1 Executive Dashboard (Daily View)

```sql
-- Create materialized view for dashboard
CREATE MATERIALIZED VIEW exec_dashboard_daily AS
SELECT
  CURRENT_DATE as report_date,

  -- System Health
  (SELECT COUNT(*) FROM calls WHERE created_at::date = CURRENT_DATE) as calls_today,
  (SELECT COUNT(*) FROM calls WHERE status = 'completed' AND completed_at::date = CURRENT_DATE) as completed_today,
  (SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*), 0) FROM calls WHERE status = 'completed' AND created_at >= CURRENT_DATE - 7) as completion_rate_7d,

  -- Engineer Performance
  (SELECT COUNT(DISTINCT assigned_engineer) FROM calls WHERE started_at::date = CURRENT_DATE) as active_engineers_today,
  (SELECT AVG(call_count) FROM (
    SELECT assigned_engineer, COUNT(*) as call_count
    FROM calls
    WHERE completed_at >= CURRENT_DATE - 7
    GROUP BY assigned_engineer
  ) subq) as avg_calls_per_engineer_7d,

  -- Device Tracking
  (SELECT COUNT(*) FROM devices WHERE status = 'warehouse') as devices_in_warehouse,
  (SELECT COUNT(*) FROM devices WHERE status = 'issued') as devices_issued,
  (SELECT COUNT(*) FROM devices WHERE status = 'installed') as devices_installed,
  (SELECT COUNT(*) FROM devices WHERE status = 'faulty') as devices_faulty,

  -- Stock Movements
  (SELECT COUNT(*) FROM shipments WHERE status = 'in_transit') as shipments_in_transit,
  (SELECT COUNT(*) FROM shipments WHERE delivered_at::date = CURRENT_DATE) as deliveries_today;

-- Refresh daily at midnight
CREATE OR REPLACE FUNCTION refresh_exec_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW exec_dashboard_daily;
END;
$$ LANGUAGE plpgsql;
```

### 10.2 KPI Tracking Sheet

Create a Google Sheet with weekly KPI tracking:

| Week | Uptime % | Error Rate % | Calls Completed | Completion Rate % | Avg Call Duration (hrs) | Engineer Productivity | Stock Accuracy % |
|------|----------|--------------|-----------------|-------------------|-------------------------|----------------------|------------------|
| W1   | 99.8     | 0.3          | 450             | 96.2              | 1.8                     | 6.2                  | 99.8             |
| W2   | 99.9     | 0.2          | 520             | 97.1              | 1.7                     | 6.5                  | 99.9             |
| ...  | ...      | ...          | ...             | ...               | ...                     | ...                  | ...              |

**Track weekly and set targets** for continuous improvement.

---

## 11. Conclusion

This comprehensive Testing, Monitoring, and Operational Plan provides a complete blueprint for launching and maintaining the CoSTAR Field Service Management system in production.

### Key Takeaways

1. **Test Thoroughly**: Focus on P0 critical paths before launch
2. **Monitor Proactively**: Set up alerts before issues impact users
3. **Deploy Carefully**: Use phased rollout and feature flags
4. **Respond Quickly**: Have runbooks ready for common issues
5. **Improve Continuously**: Weekly retrospectives and monthly planning
6. **Communicate Clearly**: Keep stakeholders informed at all times

### Next Steps

1. **Immediately**:
   - Set up Sentry error tracking
   - Configure uptime monitoring
   - Create monitoring dashboards

2. **Before Launch**:
   - Run all P0 test cases
   - Set up backup procedures
   - Train support team

3. **After Launch**:
   - Monitor daily for week 1
   - Collect user feedback
   - Iterate and improve

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Owner**: Engineering Team
**Review Cycle**: Monthly

---
