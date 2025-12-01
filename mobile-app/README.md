# UDS POS Mobile App

React Native mobile application for field engineers using Expo.

## Features

- **Login**: Email/password and OTP authentication
- **Today's Calls**: View and manage assigned service calls
- **My Inventory**: View assigned devices
- **Profile**: User profile and settings
- **QR Scanner**: Scan device barcodes/QR codes
- **Location Tracking**: GPS location for engineers
- **Offline Support**: Queue actions when offline

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for development)

## Setup

1. Install dependencies:
   ```bash
   cd mobile-app
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Configure your Supabase credentials in `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Development

Start the development server:
```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your device

## Build

### Development Build
```bash
eas build --profile development --platform all
```

### Production Build
```bash
eas build --profile production --platform all
```

## Project Structure

```
mobile-app/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigation screens
│   │   ├── _layout.tsx     # Tab layout
│   │   ├── calls.tsx       # Today's calls
│   │   ├── inventory.tsx   # My inventory
│   │   └── profile.tsx     # Profile screen
│   ├── call/[id].tsx       # Call details
│   ├── scan/[callId].tsx   # Device scanner
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Entry point
│   └── login.tsx           # Login screen
├── lib/                    # Shared libraries
│   ├── auth.tsx            # Auth context
│   └── supabase.ts         # Supabase client
├── components/             # Reusable components
├── assets/                 # Images, fonts, etc.
├── app.json                # Expo configuration
└── package.json            # Dependencies
```

## Test Accounts

- **Engineer**: engineer@uds.com / engineer123

## License

Proprietary - UDS POS
