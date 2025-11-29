# Field Service Platform - POS Device Management

A comprehensive field service and inventory management platform for POS devices, built with React, TypeScript, and Supabase.

## Features

### Current Implementation (MVP)

- **Authentication & Authorization**
  - Secure login with email/password
  - Role-based access control (Admin, Engineer)
  - Session management with Supabase Auth

- **Dashboard**
  - Real-time KPIs showing device and call statistics
  - Live updates using Supabase Realtime
  - Visual charts for device and call status distribution

- **Device Management**
  - Complete device inventory tracking
  - Device status lifecycle: warehouse → issued → installed → faulty → returned
  - Bank-level device ownership
  - Search and filter capabilities
  - Automatic audit trail for all device movements

- **Call Management**
  - Field service call tracking (install, swap, deinstall, maintenance, breakdown)
  - Call assignment to engineers
  - Priority levels and status tracking
  - Client and location information
  - Real-time call updates

- **Engineer Management (Admin Only)**
  - Engineer profile management
  - Bank assignments
  - Contact information tracking

- **Security Features**
  - Row Level Security (RLS) on all database tables
  - Bank-device matching validation
  - Role-based data access
  - Automatic audit logging via database triggers

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Database**: PostgreSQL with Row Level Security

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. The Supabase project is already configured in `.env`

4. Start the development server:
   ```bash
   npm run dev
   ```

### Default Credentials

- **Email**: admin@fieldservice.com
- **Password**: admin123

## Database Schema

### Core Tables

1. **banks** - Bank organizations that own devices
2. **user_profiles** - User accounts (Admin, Engineer)
3. **devices** - POS device inventory
4. **calls** - Field service calls
5. **call_devices** - Junction table linking calls to devices
6. **inventory_movements** - Audit trail for device movements
7. **call_history** - Audit trail for call status changes
8. **notifications** - User notifications

### Key Business Rules

- **Bank Matching**: Devices can only be assigned to calls from the same bank
- **Automatic Audit**: All device status changes and call status changes are automatically logged
- **Role-Based Access**:
  - Admins see all data across all banks
  - Engineers see only their assigned calls and devices

## Architecture Decisions

### Why Supabase?

- **Unified Backend**: Eliminates need for separate auth server, API server, and database
- **Row Level Security**: Database-level security enforcement
- **Realtime**: Built-in WebSocket support for live updates
- **Edge Functions**: Serverless functions for custom logic
- **Scalability**: Production-ready PostgreSQL database

### Real-time Updates

The application uses Supabase Realtime to automatically update the UI when data changes:
- Dashboard KPIs update live when devices or calls change
- Device list reflects real-time status updates
- Call board shows live assignment changes

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
```

## Future Enhancements (V1 & V2)

### Phase V1
- Mobile engineer app (React Native/Expo)
- Photo uploads for device condition
- Barcode/QR scanning
- Location tracking and routing
- Offline support

### Phase V2
- Advanced reporting and analytics
- SMS/email notifications
- Workflow automation
- Multi-tenancy enhancements
- External API integrations

## Security Notes

- All database operations enforce RLS policies
- Service role key should never be exposed to client
- User sessions are managed securely by Supabase Auth
- Bank-device validation happens at database constraint level

## License

Proprietary - All rights reserved
