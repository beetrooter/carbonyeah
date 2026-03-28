# carbonyeah

Carbon tracking and trading app for communities.

## Stack

- **Expo + expo-router** — file-based routing, iOS/Android/Web
- **NativeWind v4** — Tailwind CSS for React Native
- **Supabase** — auth, Postgres database, realtime
- **Zustand** — auth & app state

## Getting started

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your Project URL and anon key into `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Install dependencies and run:

```bash
npm install
npm start
```

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
