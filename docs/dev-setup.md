# CarbonYeah — Developer Setup

## Prerequisites

- Node.js ≥ 20 (use nvm: `nvm install 20 && nvm use 20`)
- A Supabase project

## Local Setup

```bash
git clone -b develop https://github.com/beetrooter/carbonyeah.git
cd carbonyeah
npm install --legacy-peer-deps
```

Create `.env` in the project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## Database

Run `supabase/migrations/001_core_schema.sql` in the Supabase SQL editor:
- Creates: `communities`, `community_members`, `emission_factors`, `emission_logs`
- Sets up RLS policies on all tables
- Seeds `emission_factors` with v1.0 lookup values

## Running the App

```bash
npx expo start --web       # web (primary target)
npx expo start --ios       # iOS simulator
npx expo start --android   # Android emulator
```

Open http://localhost:8081 for web.

## Running E2E Tests

```bash
npm run test:e2e           # run Playwright tests
npm run test:e2e:ui        # Playwright UI mode
```

Tests cover: login, register, reset password flows (`e2e/auth/`).

## Key Environment Notes

- `--legacy-peer-deps` required due to `babel-preset-expo` canary version pinned in package.json
- `useFocusEffect` must be imported from `expo-router/build/useFocusEffect`, NOT from `expo-router` (not re-exported in SDK 55 main index)
- Donut charts use CSS `conic-gradient` (web only). Native implementation will need `react-native-svg`
- The Supabase anon key uses the newer `sb_publishable_*` format (supabase-js v2.99+ required)

## Branch Strategy

- `develop` — active development branch
- `main` — not in active use yet
