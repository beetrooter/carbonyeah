# carbonyeah

Carbon tracking and trading app for communities.

## Stack

- **Expo + expo-router** — file-based routing, iOS/Android/Web
- **NativeWind v4** — Tailwind CSS for React Native
- **Supabase** — auth, Postgres database, realtime
- **Zustand** — auth & app state

## Getting started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project ([supabase.com](https://supabase.com))

### Local setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You'll find both values in your Supabase project under **Settings → API**.

3. Start the dev server:

```bash
# Web (recommended for local development)
npm run web

# iOS simulator
npm run ios

# Android emulator
npm run android

# Interactive (lets you choose platform)
npm start
```

4. Open [http://localhost:8081](http://localhost:8081) for the web version.

## Tests

End-to-end tests use [Playwright](https://playwright.dev) against the running web dev server.

Authenticated tests (dashboard, log activity, community) require a test Supabase account. Set the credentials before running:

```bash
export TEST_USER_EMAIL=your-test-user@example.com
export TEST_USER_PASSWORD=your-test-password
```

```bash
# Run all tests (dev server must be running on :8081)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui
```

Tests that require credentials are automatically skipped if the env vars are not set.

## Project structure

```
app/
  _layout.tsx          # Root layout — session listener
  index.tsx            # Auth redirect guard
  (auth)/
    sign-in.tsx
    sign-up.tsx
  (tabs)/
    index.tsx          # Dashboard
    community.tsx
    trade.tsx
    profile.tsx
lib/
  supabase.ts          # Supabase client (AsyncStorage on native)
store/
  auth.ts              # Zustand auth store
components/
  ui/                  # Shared UI components
```
