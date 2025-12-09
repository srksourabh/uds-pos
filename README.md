# UDS-POS - Field Service & POS Device Management Platform

A comprehensive field service and inventory management platform for POS devices, built with React, TypeScript, and Supabase.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e.svg)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-79%20passing-brightgreen.svg)](#testing)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Security](#security)
- [Contributing](#contributing)

## Features

### Core Functionality

- **Dashboard** - Real-time KPIs, device statistics, and call metrics with live updates
- **Device Management** - Full lifecycle tracking from warehouse to installation
- **Call Management** - Service call creation, assignment, and completion workflow
- **Engineer Management** - Profile management, skill tracking, and workload visibility
- **Stock Movements** - Inventory transfers between warehouses, engineers, and clients
- **Bank Management** - Multi-tenant bank/client organization support

### User Roles

| Role | Access Level |
|------|--------------|
| Super Admin | Full system access, user management, all banks |
| Admin | Bank-level management, engineer oversight |
| Engineer | Assigned calls, device operations, mobile access |
| Warehouse | Stock management, receive/issue devices |
| Courier | In-transit shipment management |

### Advanced Features

- **Module-Based Permissions** - Granular access control per feature
- **OCR Integration** - Automatic device serial number scanning
- **Photo Documentation** - Before/after photos for installations
- **Webhook Integration** - n8n workflow automation support
- **Error Monitoring** - Sentry integration for production monitoring
- **Real-time Updates** - Live data sync via Supabase Realtime

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript 5, Vite |
| Styling | TailwindCSS, Lucide Icons |
| State | React Query, Context API |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Functions | Supabase Edge Functions (Deno) |
| Testing | Vitest, Testing Library |
| Monitoring | Sentry |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for backend services)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd uds-pos

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables (see below)

# Start development server
npm run dev
```

### Development Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run typecheck    # TypeScript validation
npm run lint         # ESLint check
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage report
```

## Project Structure

```
uds-pos/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/        # Base UI components (Button, Input, etc.)
│   │   ├── Layout.tsx # Main app layout with navigation
│   │   └── ...        # Feature-specific components
│   ├── contexts/      # React Context providers
│   │   ├── AuthContext.tsx       # Authentication state
│   │   └── PermissionsContext.tsx # Permission checking
│   ├── lib/           # Utilities and services
│   │   ├── supabase.ts      # Supabase client
│   │   ├── database.types.ts # Generated DB types
│   │   ├── permissions.ts   # Permission helpers
│   │   ├── webhooks.ts      # Webhook integration
│   │   └── sentry.ts        # Error monitoring
│   ├── pages/         # Page components (routes)
│   └── App.tsx        # Root component with routing
├── supabase/
│   ├── functions/     # Edge Functions
│   │   ├── _shared/   # Shared utilities
│   │   └── ...        # Individual functions
│   └── migrations/    # Database migrations
├── mcp-server/        # MCP server for AI integrations
└── public/            # Static assets
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Required - Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional - Monitoring
VITE_SENTRY_DSN=your-sentry-dsn

# Optional - Webhook Integration
VITE_N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com/webhook

# Development Only
VITE_ENABLE_TEST_ACCOUNTS=true  # Never enable in production
```

## Testing

The project includes 79+ unit tests covering:

- Permission module functions
- OCR text extraction
- Call assignment algorithms
- Webhook integrations
- Utility functions

```bash
# Run all tests
npm run test:run

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test
```

## Deployment

### Production Build

```bash
# Build the application
npm run build

# The build output is in the 'dist' directory
```

### Deployment Options

1. **Vercel** (Recommended)
   - Connect your Git repository
   - Set environment variables in Vercel dashboard
   - Automatic deployments on push

2. **Netlify**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Docker**
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   EXPOSE 80
   ```

### Supabase Configuration

1. Create a new Supabase project
2. Run database migrations from `supabase/migrations/`
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy
   ```
4. Configure RLS policies (included in migrations)
5. Set up storage buckets for photos

## API Reference

### Supabase Edge Functions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/create-admin` | POST | Create admin user |
| `/assign-calls` | POST | Assign calls to engineers |
| `/scan-device` | POST | Scan device barcode |
| `/upload-photo` | POST | Upload call photos |
| `/submit-call-completion` | POST | Complete a call |
| `/mark-device-faulty` | POST | Mark device as faulty |
| `/swap-device` | POST | Swap device during call |
| `/transfer-device` | POST | Transfer device ownership |

### Database Tables

| Table | Description |
|-------|-------------|
| `user_profiles` | User accounts and roles |
| `banks` | Bank/client organizations |
| `devices` | POS device inventory |
| `calls` | Field service calls |
| `call_devices` | Call-device junction |
| `inventory_movements` | Device movement audit |
| `user_permissions` | Per-module permissions |
| `modules` | System modules |
| `photos` | Call documentation photos |
| `stock_alerts` | Inventory alerts |

## Security

### Best Practices Implemented

- **Row Level Security (RLS)** - All tables protected with RLS policies
- **Role-Based Access Control** - Module-level permissions
- **Input Sanitization** - Search queries sanitized to prevent injection
- **CORS Configuration** - Environment-based origin whitelisting
- **Test Account Protection** - Disabled in production builds
- **Error Monitoring** - Sentry integration for production

### Security Checklist for Production

- [ ] Set `VITE_ENABLE_TEST_ACCOUNTS` to `false` or remove
- [ ] Configure `ALLOWED_ORIGINS` in Edge Functions
- [ ] Enable Supabase RLS on all tables
- [ ] Review and restrict API key permissions
- [ ] Set up Sentry for error monitoring
- [ ] Configure SSL/HTTPS
- [ ] Implement rate limiting

## Database Schema

### Core Tables

```sql
-- Users with roles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'engineer', 'warehouse', 'courier')),
  ...
);

-- Devices with status tracking
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  serial_number TEXT UNIQUE,
  status TEXT CHECK (status IN ('warehouse', 'issued', 'installed', 'faulty', 'returned')),
  bank_id UUID REFERENCES banks(id),
  ...
);

-- Service calls
CREATE TABLE calls (
  id UUID PRIMARY KEY,
  call_number TEXT UNIQUE,
  type TEXT CHECK (type IN ('install', 'swap', 'deinstall', 'maintenance', 'breakdown')),
  status TEXT CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  ...
);
```

## MCP Server

The project includes an MCP (Model Context Protocol) server for AI integrations:

```bash
cd mcp-server
npm install
npm run build

# Configure in your MCP client
```

Available tools:
- `list_calls` - Query service calls
- `list_devices` - Query device inventory
- `search_devices` - Search by serial/model
- `get_engineer_workload` - Check engineer assignments
- `get_dashboard_summary` - Get KPIs

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm run test:run`)
4. Run type check (`npm run typecheck`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

Proprietary - All rights reserved

---

Built with React, TypeScript, and Supabase
