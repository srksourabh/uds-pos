# Frontend Blueprint - CoSTAR Field Service Platform

**Version**: 1.0
**Last Updated**: 2025-11-30
**Implementation Status**: Block 10 Complete

---

## Overview

This document provides a complete blueprint for building two frontend applications:
1. **Admin Web Application** (Next.js/React)
2. **Engineer Mobile Application** (Expo/React Native)

Both applications integrate with Supabase backend services (Auth, Database, Storage, Edge Functions).

---

## Architecture Summary

```
┌─────────────────────┐         ┌──────────────────────┐
│   Admin Web App     │         │ Engineer Mobile App  │
│   (Next.js/React)   │         │  (Expo/React Native) │
│                     │         │                      │
│  - Dashboard        │         │  - My Calls          │
│  - Device Mgmt      │         │  - Device Scanning   │
│  - Call Assignment  │         │  - Photo Upload      │
│  - Approvals        │         │  - Call Completion   │
│  - Analytics        │         │  - Offline Support   │
└──────────┬──────────┘         └──────────┬───────────┘
           │                               │
           └───────────┬───────────────────┘
                       │
           ┌───────────▼────────────┐
           │   Supabase Backend     │
           │  - PostgreSQL + RLS    │
           │  - Auth (JWT)          │
           │  - Storage (Photos)    │
           │  - Edge Functions      │
           │  - Realtime            │
           └────────────────────────┘
```

---

## 1. Admin Web Application (Next.js)

### 1.1 Page Structure

#### Public Pages
| Route | Component | Props | Data Dependencies |
|-------|-----------|-------|-------------------|
| `/login` | `LoginPage` | None | None |
| `/` | Redirect to `/login` or `/dashboard` | None | Auth session |

#### Protected Pages (Admin Only)
| Route | Component | Props | Data Dependencies | Realtime? |
|-------|-----------|-------|-------------------|-----------|
| `/dashboard` | `DashboardPage` | None | devices, calls, banks | Yes |
| `/devices` | `DevicesPage` | None | devices, banks, user_profiles | Yes |
| `/devices/:id` | `DeviceDetailPage` | `{ id: string }` | devices, stock_movements, call_devices | No |
| `/calls` | `CallsPage` | None | calls, devices, user_profiles, banks | Yes |
| `/calls/:id` | `CallDetailPage` | `{ id: string }` | calls, call_devices, call_history, photos | Yes |
| `/engineers` | `EngineersPage` | None | user_profiles, banks | Yes |
| `/engineers/:id` | `EngineerDetailPage` | `{ id: string }` | user_profiles, engineer_aggregates, calls | No |
| `/approvals` | `ApprovalsPage` | None | user_profiles (status=pending) | Yes |
| `/stock-movements` | `StockMovementsPage` | None | stock_movements, devices, user_profiles | No |
| `/alerts` | `AlertsPage` | None | stock_alerts, banks, devices | Yes |
| `/settings` | `SettingsPage` | None | user_profiles (current user) | No |

### 1.2 Page Details & Contracts

#### Dashboard Page
**Purpose**: Real-time KPI overview and system health
**Data Fetching Strategy**:
- Initial SSR for KPIs (Server Component)
- Realtime subscriptions for live updates
- Client-side charts rendering

**Props/State**:
```typescript
interface DashboardData {
  kpis: {
    totalDevices: number;
    warehouseDevices: number;
    issuedDevices: number;
    installedDevices: number;
    faultyDevices: number;
    pendingCalls: number;
    assignedCalls: number;
    inProgressCalls: number;
    completedCallsToday: number;
  };
  recentCalls: Call[];
  devicesByBank: Record<string, number>;
  callsByPriority: Record<string, number>;
  recentAlerts: StockAlert[];
}
```

**Realtime Subscriptions**:
- `devices` table: status changes
- `calls` table: new/updated calls
- `stock_alerts` table: new alerts

---

#### Devices Page
**Purpose**: Device inventory management with bulk operations
**Data Fetching Strategy**:
- Client-side with Supabase query
- Realtime for status updates
- Server-side pagination (1000+ devices)

**Props/State**:
```typescript
interface DevicesPageState {
  devices: Device[];
  banks: Bank[];
  engineers: UserProfile[];
  filters: {
    search: string;
    status: DeviceStatus | 'all';
    bank: string | 'all';
    assignedTo: string | 'all';
  };
  selectedDevices: string[]; // For bulk operations
}
```

**Actions**:
- Bulk import via CSV (Edge Function)
- Issue devices to engineer (Edge Function)
- Transfer device (Edge Function)
- Mark faulty (Edge Function)
- View device history

---

#### Calls Page
**Purpose**: Call management and assignment
**Data Fetching Strategy**:
- Client-side with filters
- Realtime for assignments
- Intelligent assignment via Edge Function

**Props/State**:
```typescript
interface CallsPageState {
  calls: Call[];
  engineers: UserProfile[];
  devices: Device[];
  filters: {
    status: CallStatus | 'all';
    priority: Priority | 'all';
    bank: string | 'all';
    engineer: string | 'all';
    dateRange: { from: Date; to: Date };
  };
}
```

**Actions**:
- Create new call
- Auto-assign calls (Edge Function)
- Manual assign to engineer
- View call details
- Cancel call

---

#### Approvals Page
**Purpose**: Review and approve pending engineer registrations
**Data Fetching Strategy**:
- Client-side query: `status = 'pending_approval'`
- Realtime for new registrations

**Props/State**:
```typescript
interface ApprovalsPageState {
  pendingEngineers: UserProfile[];
  banks: Bank[];
}

interface ApprovalAction {
  engineerId: string;
  bankId: string;
  region: string;
  status: 'active' | 'suspended';
}
```

---

### 1.3 Shared Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `Sidebar` | Navigation menu | `{ user: User; activePath: string }` |
| `Header` | Top bar with user menu | `{ user: User; notifications: Notification[] }` |
| `DataTable` | Reusable table with sorting/filtering | `{ columns, data, onRowClick, actions }` |
| `Modal` | Base modal wrapper | `{ isOpen, onClose, title, children }` |
| `DeviceCard` | Device summary card | `{ device: Device }` |
| `CallCard` | Call summary card | `{ call: Call }` |
| `StatusBadge` | Status indicator | `{ status: string; type: 'device' | 'call' }` |
| `PriorityBadge` | Priority indicator | `{ priority: Priority }` |
| `LoadingSpinner` | Loading indicator | `{ size?: 'sm' | 'md' | 'lg' }` |
| `EmptyState` | Empty data placeholder | `{ title: string; description: string; action?: ReactNode }` |
| `ConfirmDialog` | Confirmation modal | `{ title, message, onConfirm, onCancel }` |
| `Toast` | Toast notifications | `{ message, type: 'success' | 'error' | 'warning' }` |

---

## 2. Engineer Mobile Application (Expo/React Native)

### 2.1 Screen Structure

#### Public Screens
| Route | Component | Props | Data Dependencies |
|-------|-----------|-------|-------------------|
| `/auth` | `AuthScreen` | None | None (Phone OTP) |
| `/profile-setup` | `ProfileSetupScreen` | `{ phoneNumber: string }` | None |
| `/pending-approval` | `PendingApprovalScreen` | None | user_profiles (current) |

#### Protected Screens (Engineer Only)
| Route | Component | Props | Data Dependencies | Offline Support |
|-------|-----------|-------|-------------------|----|
| `/calls` | `CallsListScreen` | None | calls (assigned), devices | Yes (cached) |
| `/calls/:id` | `CallDetailScreen` | `{ callId: string }` | calls, call_devices, photos | Yes (cached) |
| `/scan` | `ScanDeviceScreen` | `{ callId: string }` | devices (QR data validation) | Partial |
| `/complete-call` | `CompleteCallScreen` | `{ callId: string }` | calls, devices, photos | Yes (queue) |
| `/photo-capture` | `PhotoCaptureScreen` | `{ callId, deviceId, type }` | None | Yes (queue) |
| `/my-devices` | `MyDevicesScreen` | None | devices (assigned to me) | Yes (cached) |
| `/profile` | `ProfileScreen` | None | user_profiles (current) | Yes (cached) |

### 2.2 Screen Details & Contracts

#### Calls List Screen
**Purpose**: View assigned calls with offline support
**Data Fetching Strategy**:
- Initial: Fetch assigned calls
- Cache in AsyncStorage for offline
- Sync when online

**Props/State**:
```typescript
interface CallsListState {
  calls: Call[];
  filter: 'pending' | 'in_progress' | 'completed';
  isOnline: boolean;
  lastSyncTime: Date;
}
```

---

#### Call Detail Screen
**Purpose**: View call details and start call
**Data Fetching Strategy**:
- Fetch call with devices
- Cache for offline viewing
- Enable "Start Call" button

**Props/State**:
```typescript
interface CallDetailState {
  call: Call;
  devices: Device[];
  photos: Photo[];
  canStart: boolean;
  isOnline: boolean;
}
```

**Actions**:
- Start call (Edge Function)
- View map/directions
- Call client
- Scan device

---

#### Scan Device Screen
**Purpose**: QR code scanning and device validation
**Data Fetching Strategy**:
- Camera permission request
- QR code parsing
- Device validation (Edge Function)

**Props/State**:
```typescript
interface ScanDeviceState {
  callId: string;
  hasPermission: boolean;
  scannedData: QRPayload | null;
  validatedDevice: Device | null;
  action: 'install' | 'swap_in' | 'swap_out' | 'remove' | 'inspect';
}

interface QRPayload {
  serial: string;
  model: string;
  bank: string;
  checksum: string;
  version: string;
  generated_at: number;
}
```

**Validation Flow**:
1. Scan QR code
2. Validate checksum (client-side)
3. Validate device exists (Edge Function)
4. Validate device bank matches call bank
5. Link device to call
6. Show success/error

---

#### Complete Call Screen
**Purpose**: Submit call completion with photos
**Data Fetching Strategy**:
- Offline-first: Queue submission
- Upload photos when online
- Submit completion (Edge Function)

**Props/State**:
```typescript
interface CompleteCallState {
  callId: string;
  resolutionNotes: string;
  merchantRating: number; // 1-5
  photos: LocalPhoto[];
  uploadProgress: Record<string, number>;
  isSubmitting: boolean;
  queuedForSubmission: boolean;
}

interface LocalPhoto {
  id: string;
  uri: string;
  type: PhotoType;
  deviceId: string;
  uploaded: boolean;
  uploadedUrl?: string;
}
```

**Offline Queue**:
- Store completion data in AsyncStorage
- Show "Queued for submission" indicator
- Auto-submit when online
- Show sync status

---

#### Photo Capture Screen
**Purpose**: Capture and annotate photos
**Data Fetching Strategy**:
- Camera permission request
- Location permission (GPS tagging)
- Local storage until upload

**Props/State**:
```typescript
interface PhotoCaptureState {
  callId: string;
  deviceId: string;
  photoType: PhotoType;
  hasPermission: boolean;
  capturedPhoto: {
    uri: string;
    base64?: string;
    gps?: { latitude: number; longitude: number };
    timestamp: Date;
  } | null;
  caption: string;
}
```

**Required Photos by Call Type**:
- Install: before, serial_number, installation
- Swap: before, serial_number, installation, after
- Maintenance: damage, after
- Deinstall: before, serial_number

---

### 2.3 Offline Support Strategy

**Cached Data** (AsyncStorage):
```typescript
{
  user: UserProfile;
  assignedCalls: Call[];
  myDevices: Device[];
  pendingSubmissions: CompletionData[];
  pendingPhotos: LocalPhoto[];
  lastSyncTime: Date;
}
```

**Sync Logic**:
1. On app launch: Check connectivity
2. If online: Sync cached data
3. If offline: Show cached data with indicator
4. On connectivity change: Auto-sync queued items
5. Manual sync button available

**Queue Management**:
- Priority: Call completion > Photo uploads > Device scans
- Retry logic: Exponential backoff
- Error handling: Show failed items, allow retry
- Success feedback: Clear from queue

---

## 3. Environment Variables

### 3.1 Admin Web App (Next.js)

**Build-time** (`.env.local`):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Server-side only, never expose

# Edge Functions
NEXT_PUBLIC_EDGE_FN_BASE=https://[project-ref].supabase.co/functions/v1

# App Config
NEXT_PUBLIC_APP_NAME=CoSTAR Admin
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENV=development # development | staging | production

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=UA-XXXXX

# Optional: Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Runtime** (Vercel Environment Variables):
- Same as above, set in Vercel dashboard
- Separate values for Preview/Production environments

### 3.2 Engineer Mobile App (Expo)

**Build-time** (`.env`):
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Edge Functions
EXPO_PUBLIC_EDGE_FN_BASE=https://[project-ref].supabase.co/functions/v1

# App Config
EXPO_PUBLIC_APP_NAME=CoSTAR Engineer
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENV=development

# Camera & Location
EXPO_PUBLIC_REQUIRE_GPS=true
EXPO_PUBLIC_REQUIRE_CAMERA=true

# Offline
EXPO_PUBLIC_OFFLINE_MODE=true
EXPO_PUBLIC_CACHE_TTL=86400 # 24 hours in seconds
```

**EAS Build** (`eas.json`):
```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_ENV": "staging"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  }
}
```

---

## 4. Data-Fetching Strategy

### 4.1 Admin Web App

| Data Type | Strategy | Reason | Implementation |
|-----------|----------|--------|----------------|
| Dashboard KPIs | Server-side (SSR) | SEO, fast initial load | Next.js Server Components |
| Device List | Client-side | Filtering, pagination | Supabase JS Client + Realtime |
| Call List | Client-side | Realtime updates | Supabase JS Client + Realtime |
| Engineer Stats | Server-side (SSG) | Static data | ISR with 1-hour revalidation |
| Stock Movements | Client-side | Read-only, paginated | Supabase JS Client |
| Heavy Transactions | Edge Function | Atomicity, validation | `assign-calls`, `submit-call-completion` |

**Realtime Subscriptions**:
```typescript
// Dashboard
supabase.channel('dashboard')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'devices'
  }, handleDeviceChange)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'calls'
  }, handleCallChange)
  .subscribe();

// Calls Page
supabase.channel('calls')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'calls'
  }, handleNewCall)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'calls',
    filter: 'status=eq.assigned'
  }, handleAssignment)
  .subscribe();
```

### 4.2 Engineer Mobile App

| Data Type | Strategy | Offline Support | Implementation |
|-----------|----------|-----------------|----------------|
| My Calls | Client-side cached | Yes | AsyncStorage + periodic sync |
| My Devices | Client-side cached | Yes | AsyncStorage + periodic sync |
| Device Scan | Edge Function | Validation only | QR parse locally, validate online |
| Photo Upload | Client-side queued | Yes | LocalFileSystem + upload queue |
| Call Completion | Edge Function queued | Yes | AsyncStorage queue + auto-submit |
| Call Start | Edge Function | Required online | Immediate API call |

**Sync Strategy**:
```typescript
// On App Launch
async function initializeApp() {
  const isOnline = await NetInfo.fetch();

  if (isOnline.isConnected) {
    await syncData();
  } else {
    await loadCachedData();
  }

  // Subscribe to connectivity changes
  NetInfo.addEventListener(handleConnectivityChange);
}

// Sync Function
async function syncData() {
  // 1. Upload queued photos
  await uploadQueuedPhotos();

  // 2. Submit queued call completions
  await submitQueuedCompletions();

  // 3. Fetch fresh data
  const calls = await fetchMyCalls();
  const devices = await fetchMyDevices();

  // 4. Cache locally
  await cacheData({ calls, devices });

  // 5. Update last sync time
  await AsyncStorage.setItem('lastSyncTime', new Date().toISOString());
}
```

---

## 5. Deployment Configuration

### 5.1 Admin Web App (Next.js + Vercel)

**Deployment Pipeline**:
```
GitHub Push → Vercel → Build → Deploy
  │
  ├─ main branch → Production
  ├─ staging branch → Preview (Staging)
  └─ feature/* → Preview (Per-PR)
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key"
  }
}
```

**Secrets Handling**:
1. Store in Vercel Environment Variables
2. Separate values for Preview/Production
3. Never commit `.env.local` to git
4. Use Vercel CLI for local development: `vercel env pull`

**Domain Configuration**:
- Production: `admin.costar.com`
- Staging: `admin-staging.costar.com`
- Preview: Auto-generated by Vercel

**Build Checks**:
- TypeScript compilation
- ESLint validation
- Lighthouse score > 90
- Bundle size < 500KB

---

### 5.2 Engineer Mobile App (Expo + EAS)

**Deployment Pipeline**:
```
GitHub Push → EAS Build → Submit → Stores
  │
  ├─ main → Production (App Store + Play Store)
  ├─ staging → Internal Testing
  └─ feature/* → Development Build
```

**EAS Configuration** (`eas.json`):
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "ios": {
        "bundleIdentifier": "com.costar.engineer"
      },
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "admin@costar.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account.json",
        "track": "production"
      }
    }
  }
}
```

**Secrets Handling**:
1. Store in EAS Secrets: `eas secret:create`
2. Reference in `eas.json`: `"EXPO_PUBLIC_SUPABASE_URL": "$SUPABASE_URL"`
3. Never commit `.env` to git
4. Use `eas env:pull` for local development

**Over-the-Air (OTA) Updates**:
- Use Expo Updates for JS bundle changes
- No app store review needed
- Instant rollout to users
- Command: `eas update --branch production --message "Bug fixes"`

**Version Management**:
- Semantic versioning: `1.0.0`
- iOS: Increment build number automatically
- Android: Increment versionCode automatically
- Update `app.json` version before production build

---

## 6. CI/CD Pipeline Configuration

### 6.1 GitHub Actions - Admin Web App

**File**: `.github/workflows/admin-deploy.yml`

```yaml
name: Deploy Admin Web App

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test # If tests exist

  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 6.2 GitHub Actions - Engineer Mobile App

**File**: `.github/workflows/mobile-deploy.yml`

```yaml
name: Deploy Engineer Mobile App

on:
  push:
    branches: [main, staging]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - run: npm install
      - run: npx eas-cli build --platform all --non-interactive --no-wait
        if: github.ref == 'refs/heads/main'

      - run: npx eas-cli update --branch production --message "${{ github.event.head_commit.message }}"
        if: github.ref == 'refs/heads/main'
```

---

## 7. Integration QA Checklist

### 7.1 Admin Web App

#### Authentication
- [ ] Email/password login works
- [ ] Remember me persists session
- [ ] Session expires after 1 hour of inactivity
- [ ] Logout clears session completely
- [ ] Protected routes redirect to login
- [ ] Admin-only routes deny engineer access

#### Dashboard
- [ ] KPIs load correctly
- [ ] Realtime updates reflect immediately
- [ ] Charts render with correct data
- [ ] Recent alerts display
- [ ] No console errors

#### Device Management
- [ ] Device list loads with pagination
- [ ] Search/filter works correctly
- [ ] Bulk select devices
- [ ] Issue devices to engineer (Edge Function)
- [ ] Transfer device (Edge Function)
- [ ] Mark faulty (Edge Function)
- [ ] View device history
- [ ] Realtime updates on status change

#### Call Management
- [ ] Create new call
- [ ] Auto-assign calls (Edge Function)
- [ ] Manual assign to engineer
- [ ] Filter by status/priority/bank
- [ ] View call details
- [ ] Cancel call
- [ ] Realtime updates on assignment

#### Engineer Approvals
- [ ] Pending engineers list loads
- [ ] Approve engineer with bank/region selection
- [ ] Reject engineer
- [ ] Realtime updates on new registrations

### 7.2 Engineer Mobile App

#### Authentication
- [ ] Phone OTP login works
- [ ] Profile setup completes
- [ ] Pending approval screen shows
- [ ] Session persists on app restart
- [ ] Logout clears session

#### Permissions
- [ ] Camera permission requested on scan
- [ ] Location permission requested on photo capture
- [ ] Permission denial handled gracefully
- [ ] Settings link provided to enable permissions

#### Call Management
- [ ] My calls list loads
- [ ] Filter by status works
- [ ] Call details display correctly
- [ ] Start call (Edge Function) succeeds
- [ ] Map/directions link works
- [ ] Call client phone link works

#### Device Scanning
- [ ] QR code scanner opens camera
- [ ] QR code parsing works
- [ ] Checksum validation succeeds
- [ ] Device validation (Edge Function) works
- [ ] Bank mismatch error displays
- [ ] Link device to call succeeds

#### Photo Capture
- [ ] Camera opens for photo
- [ ] GPS coordinates captured
- [ ] Photo preview displays
- [ ] Caption can be added
- [ ] Photo saved locally
- [ ] Upload queued when offline

#### Call Completion
- [ ] Resolution notes validation
- [ ] Merchant rating selection
- [ ] Required photos checked
- [ ] Submit call (Edge Function) succeeds
- [ ] Offline queue works
- [ ] Auto-submit on reconnection

#### Offline Support
- [ ] Cached calls display when offline
- [ ] Cached devices display when offline
- [ ] Offline indicator shows
- [ ] Queued items display
- [ ] Sync on reconnection works
- [ ] Manual sync button works
- [ ] Last sync time displays

### 7.3 Integration Tests

#### Auth Flow
```typescript
describe('Authentication', () => {
  test('Admin can login with email/password', async () => {
    // Test implementation
  });

  test('Engineer can login with phone OTP', async () => {
    // Test implementation
  });

  test('Session persists on page reload', async () => {
    // Test implementation
  });
});
```

#### Device Operations
```typescript
describe('Device Management', () => {
  test('Admin can issue device to engineer', async () => {
    // Test Edge Function call
  });

  test('Engineer receives device notification', async () => {
    // Test realtime update
  });
});
```

#### Call Workflow
```typescript
describe('Call Workflow', () => {
  test('Admin creates call and auto-assigns', async () => {
    // Test Edge Function
  });

  test('Engineer starts and completes call', async () => {
    // Test mobile workflow
  });

  test('Call completion creates audit trail', async () => {
    // Test database triggers
  });
});
```

---

## 8. Accessibility Checklist (Admin UI)

### WCAG 2.1 Level AA Compliance

#### Semantic HTML
- [ ] Use semantic tags: `<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`
- [ ] Headings in logical order (H1 → H2 → H3)
- [ ] Forms have associated `<label>` elements
- [ ] Tables have proper `<th>` and `scope` attributes

#### Keyboard Navigation
- [ ] All interactive elements accessible via Tab
- [ ] Focus indicators visible (outline, ring)
- [ ] Skip to main content link
- [ ] Modal traps focus correctly
- [ ] Escape key closes modals
- [ ] Arrow keys navigate tables/lists

#### Screen Reader Support
- [ ] Images have alt text
- [ ] Icons have aria-label
- [ ] Buttons have descriptive text (not just icons)
- [ ] Form errors announced
- [ ] Loading states announced
- [ ] Success/error toasts announced

#### Color & Contrast
- [ ] Text contrast ratio ≥ 4.5:1 (normal text)
- [ ] Text contrast ratio ≥ 3:1 (large text)
- [ ] Interactive elements contrast ratio ≥ 3:1
- [ ] Do not rely on color alone for information
- [ ] Focus indicators meet contrast requirements

#### Responsive Design
- [ ] Text scales with browser zoom (up to 200%)
- [ ] No horizontal scrolling at 320px width
- [ ] Touch targets ≥ 44x44 pixels
- [ ] Mobile-friendly navigation

#### Testing Tools
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Run Lighthouse accessibility audit (score > 90)
- [ ] Use axe DevTools for automated checks
- [ ] Test keyboard-only navigation

---

## 9. Mobile Offline Handling Test

### Test Scenarios

#### Scenario 1: Go Offline While Viewing Call
**Steps**:
1. Open call detail screen
2. Disable network connection
3. Verify cached data still displays
4. Verify offline indicator appears
5. Re-enable network
6. Verify sync indicator appears
7. Verify data refreshes

**Expected**:
- No crash or blank screen
- Offline badge visible
- Manual sync button available
- Auto-sync on reconnection

---

#### Scenario 2: Submit Call Completion While Offline
**Steps**:
1. Complete call with photos
2. Disable network
3. Submit completion
4. Verify queued indicator
5. Re-enable network
6. Verify auto-submission
7. Verify success feedback

**Expected**:
- Completion queued in AsyncStorage
- User notified of queue status
- Auto-submit when online
- Queue cleared on success

---

#### Scenario 3: Scan Device While Offline
**Steps**:
1. Scan QR code
2. Disable network before validation
3. Attempt to link device

**Expected**:
- QR parse succeeds (client-side)
- Validation fails with clear error
- Prompt to retry when online
- Do not link device without validation

---

#### Scenario 4: Extended Offline Period
**Steps**:
1. Go offline for 24+ hours
2. Open app
3. Verify cached data still accessible
4. Add multiple queued items
5. Re-enable network
6. Verify all items sync in order

**Expected**:
- Cached data available indefinitely
- Queue persists across app restarts
- Sync in correct order (priority)
- No data loss

---

#### Scenario 5: Sync Conflict Resolution
**Steps**:
1. Admin updates call while engineer offline
2. Engineer submits completion with outdated data
3. Conflict detected on sync

**Expected**:
- Show conflict warning
- Provide options: Keep server data / Override
- Log conflict for admin review
- Do not auto-override without confirmation

---

### Offline Testing Checklist

- [ ] Airplane mode testing on iOS
- [ ] Airplane mode testing on Android
- [ ] Slow network simulation (3G)
- [ ] Intermittent connectivity testing
- [ ] Battery impact assessment
- [ ] Storage usage monitoring
- [ ] AsyncStorage data inspection
- [ ] Queue retry logic verification
- [ ] Sync conflict handling
- [ ] Manual sync button functionality

---

## 10. Performance Benchmarks

### Admin Web App
| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.8s | Lighthouse |
| Time to Interactive | < 3.9s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Total Blocking Time | < 300ms | Lighthouse |
| Bundle Size (Initial) | < 500KB | Webpack Bundle Analyzer |
| Bundle Size (Total) | < 2MB | Webpack Bundle Analyzer |

### Engineer Mobile App
| Metric | Target | Tool |
|--------|--------|------|
| App Launch Time | < 2s | Expo DevTools |
| Time to Interactive | < 3s | Expo DevTools |
| Memory Usage (Idle) | < 100MB | Xcode Instruments |
| Memory Usage (Active) | < 200MB | Xcode Instruments |
| Battery Drain (1hr usage) | < 10% | Device Testing |
| App Size (iOS) | < 50MB | App Store Connect |
| App Size (Android) | < 30MB | Google Play Console |

---

## 11. Security Checklist

### Authentication
- [ ] JWT tokens stored securely (HttpOnly cookies or secure storage)
- [ ] Tokens rotated on refresh
- [ ] Expired tokens handled gracefully
- [ ] CSRF protection enabled
- [ ] XSS protection enabled

### Data Security
- [ ] RLS policies enforced on all tables
- [ ] Service role key never exposed to client
- [ ] User inputs sanitized
- [ ] SQL injection prevented (Supabase handles)
- [ ] File upload validation (type, size)

### Network Security
- [ ] HTTPS only (Supabase enforces)
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Sensitive data not logged

### Mobile Security
- [ ] Secure storage for tokens (Keychain/Keystore)
- [ ] Certificate pinning for API calls
- [ ] Jailbreak/root detection
- [ ] Code obfuscation in production builds

---

## 12. Monitoring & Analytics

### Admin Web App
**Tools**: Vercel Analytics, Sentry, LogRocket

**Metrics to Track**:
- Page load times
- API response times
- Error rates
- User journeys
- Feature usage

**Alerts**:
- Error rate > 1%
- API latency > 2s
- Crash rate > 0.1%

### Engineer Mobile App
**Tools**: Expo Analytics, Sentry, Firebase Analytics

**Metrics to Track**:
- App launches
- Session duration
- Crash reports
- API failures
- Offline usage

**Alerts**:
- Crash rate > 0.5%
- ANR (Android Not Responding) > 0.1%
- API failure rate > 2%

---

## 13. Launch Readiness Checklist

### Pre-Launch
- [ ] All QA tests passing
- [ ] Accessibility audit complete
- [ ] Performance benchmarks met
- [ ] Security review complete
- [ ] Load testing done (100+ concurrent users)
- [ ] Backup/restore tested
- [ ] Disaster recovery plan documented
- [ ] User documentation complete
- [ ] Admin training complete
- [ ] Engineer onboarding flow tested

### Launch Day
- [ ] Monitoring dashboards ready
- [ ] On-call rotation scheduled
- [ ] Rollback plan prepared
- [ ] Status page setup
- [ ] Support channels ready
- [ ] Launch announcement prepared

### Post-Launch
- [ ] Monitor error rates (first 24 hours)
- [ ] User feedback collection
- [ ] Performance monitoring
- [ ] Quick hotfix readiness
- [ ] Incident response drills

---

## Conclusion

This frontend blueprint provides a complete specification for building the CoSTAR Field Service Platform with:
- Detailed page/screen structures
- Data fetching strategies
- Environment configuration
- CI/CD pipelines
- Comprehensive QA checklists
- Accessibility guidelines
- Offline support testing
- Security best practices

**Ready for implementation** by development teams with clear contracts, dependencies, and deployment paths.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Maintained By**: CoSTAR Development Team
