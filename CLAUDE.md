# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UDS-POS is a field service and POS device management platform with three main components:
- **Web App** (root): React/TypeScript admin dashboard for managing devices, calls, engineers, and inventory
- **Mobile App** (`mobile-app/`): React Native (Expo) app for field engineers
- **MCP Server** (`mcp-server/`): Model Context Protocol server for Claude Desktop AI integrations

Backend: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)

## Development Commands

### Web App (root directory)
```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Production build
npm run typecheck    # TypeScript validation
npm run lint         # ESLint check
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Tests with coverage report
```

### Mobile App
```bash
cd mobile-app
npm start            # Start Expo dev server
npm run android      # Run on Android emulator
npm run ios          # Run on iOS simulator
npm run lint         # ESLint check
npm run typecheck    # TypeScript validation
```

### MCP Server
```bash
cd mcp-server
npm run build        # Compile TypeScript
npm run dev          # Build and run
npm run watch        # Watch mode for development
```

## Architecture

### Web App Structure
- `src/App.tsx` - Root component with all routes (React Router v7)
- `src/contexts/` - Auth and Permissions providers (wrap entire app)
- `src/lib/` - Core utilities:
  - `supabase.ts` - Supabase client singleton
  - `database.types.ts` - Generated TypeScript types from Supabase schema
  - `permissions.ts` - Module-based permission helpers
  - `assignment.ts` - Call assignment algorithm
  - `webhooks.ts` - n8n webhook integration
  - `ocr.ts` / `gemini.ts` - OCR for device serial number scanning
- `src/pages/` - Page components including `/mobile/*` routes for engineer PWA
- `src/components/` - Reusable UI components; `ui/` has base components

### Mobile App Structure (Expo Router)
- `app/` - File-based routing screens
  - `(tabs)/` - Tab navigation (calls, inventory, profile)
  - `login.tsx` - Authentication screen
- `lib/auth.tsx` - Auth context with Supabase
- `lib/supabase.ts` - Supabase client with secure storage

### Edge Functions (`supabase/functions/`)
Key functions: `assign-calls`, `submit-call-completion`, `scan-device`, `swap-device`, `mark-device-faulty`, `transfer-device`, `upload-photo`
- `_shared/` - Common utilities (cors.ts, errors.ts, idempotency.ts, monitoring.ts)

### Database Migrations
Located in `supabase/migrations/` - numbered SQL files for schema evolution

## Key Patterns

### Authentication
- Supabase Auth with role-based access
- Roles: `super_admin`, `admin`, `engineer`, `warehouse`, `courier`
- Test accounts available in dev mode (admin/admin, test/test, super/super)
- `AuthContext` manages auth state; `PermissionsContext` handles module permissions

### Protected Routes
```tsx
<ProtectedRoute requireAdmin>  {/* Admin-only routes */}
  <Component />
</ProtectedRoute>
```

### Data Fetching
Uses TanStack React Query. Supabase client in `src/lib/supabase.ts`.

### State Management
- React Query for server state
- React Context for auth/permissions
- No Redux - component state for UI

## Testing

Tests use Vitest with jsdom. Test files: `src/**/*.{test,spec}.{ts,tsx}`
Setup file: `src/test/setup.ts`

Run a single test file:
```bash
npx vitest run src/lib/permissions.test.ts
```

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Optional:
```
VITE_GOOGLE_MAPS_API_KEY=...  # For map features
VITE_GEMINI_API_KEY=...       # For OCR
VITE_SENTRY_DSN=...           # Error monitoring
VITE_N8N_WEBHOOK_BASE_URL=... # Automation webhooks
VITE_ENABLE_TEST_ACCOUNTS=true # Dev only - never in production
```

## Database Tables

Core tables: `user_profiles`, `banks`, `devices`, `calls`, `call_devices`, `inventory_movements`, `user_permissions`, `modules`, `photos`, `stock_alerts`

Device statuses: `warehouse`, `issued`, `installed`, `faulty`, `returned`
Call types: `install`, `swap`, `deinstall`, `maintenance`, `breakdown`
Call statuses: `pending`, `assigned`, `in_progress`, `completed`, `cancelled`

## Deployment

- Web app deploys to Vercel (configured in `vercel.json`)
- Edge functions deploy via `supabase functions deploy`
- Mobile app builds via EAS: `eas build --profile production --platform all`
