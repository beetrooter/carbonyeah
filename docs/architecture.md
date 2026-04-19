# CarbonYeah — Architecture

## Overview

CarbonYeah is a carbon tracking and community app built with **Expo (React Native)** targeting web-first, with iOS/Android planned. Users log their carbon-producing activities, see their consumption against a fair-share global allocation, and compare within communities.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Expo SDK 55 / React Native 0.83 | File-based routing via expo-router |
| Language | TypeScript 5.9 | Strict mode |
| Styling | NativeWind 4 (Tailwind CSS) | `className` props on RN components |
| Backend / Auth / DB | Supabase | Postgres + Row Level Security + Auth |
| State management | Zustand 5 | Auth store only; server state queried directly |
| Navigation | expo-router (file-based) | Stack + Tabs |
| E2E tests | Playwright | Auth flows covered |

---

## Repository Structure

```
app/
  _layout.tsx          — Root Stack; session hydration; auth state listener
  index.tsx            — Redirects to /(tabs) or /(auth)/sign-in based on session
  (auth)/
    _layout.tsx        — Auth Stack (headerless)
    sign-in.tsx
    sign-up.tsx
    forgot-password.tsx
    update-password.tsx
  (tabs)/
    _layout.tsx        — Bottom tab bar (Dashboard, Community, Trade, Profile)
    index.tsx          — Dashboard (donut charts + recent activity)
    community.tsx      — Community tab (placeholder)
    trade.tsx          — Trade tab (placeholder)
    profile.tsx        — Profile + sign out
  log.tsx              — Modal: 3-step emission entry (category → activity → detail)
  edit-log.tsx         — Modal: edit or delete an existing emission log entry

lib/
  supabase.ts          — Supabase client (AsyncStorage on native, localStorage on web)
  emissions.ts         — Emission queries, calculation, v1.1 integration placeholders
  geocode.ts           — OpenStreetMap Nominatim geocoding + haversine distance

store/
  auth.ts              — Zustand auth store (session, user, signIn/Out/Up, password)

supabase/
  migrations/
    001_core_schema.sql — Tables, RLS, seeded emission factors

docs/                  — Architecture and decision records (this folder)

assets/                — App icons and splash screen
e2e/                   — Playwright tests (auth flows)
```

---

## Authentication Flow

```
App launch
  → app/index.tsx checks Zustand auth store
    → loading=true  → render null (blank, prevents flash)
    → session=null  → Redirect /(auth)/sign-in
    → session=set   → Redirect /(tabs)

_layout.tsx:
  - supabase.auth.getSession() on mount → setSession()
  - onAuthStateChange listener → keeps session live
  - PASSWORD_RECOVERY event → router.replace /(auth)/update-password

Post password-update: user is signed out to clear the active session
  (prevents stale JWT after credential change)
```

---

## Database Schema (Supabase)

### Tables

**`communities`**
- `id` uuid PK
- `name` text
- `created_by` uuid → auth.users
- `created_at` timestamptz

**`community_members`**
- `id` uuid PK
- `community_id` uuid → communities
- `user_id` uuid → auth.users
- `joined_at` timestamptz
- UNIQUE(community_id, user_id)

**`emission_factors`** (seeded, read-only to users)
- `id` uuid PK
- `category` text — Travel | Energy | Food | Other
- `subcategory` text — flight | car | electricity | beef …
- `activity` text — human-readable label
- `kg_co2e_per_unit` numeric
- `unit` text — km | kWh | kg | hour | item
- `notes` text
- `source` text — default 'internal_lookup' (v1.1: swap to API)

**`emission_logs`**
- `id` uuid PK
- `user_id` uuid → auth.users
- `category` text
- `subcategory` text
- `description` text — free text or voice transcription
- `quantity` numeric — e.g. 500 km, 2.5 kWh
- `unit` text
- `kg_co2e` numeric — always calculated, never user-entered
- `data_source` text — manual | bank | travel_app | motion
- `external_ref` text — booking ref, transaction ID (v1.1)
- `logged_at` timestamptz
- `created_at` timestamptz

### Row Level Security

- `communities`: select = member or creator; insert/update/delete = creator only
- `community_members`: select = any member of same community; insert/delete = own rows
- `emission_factors`: select = any authenticated user (read-only)
- `emission_logs`: full CRUD on own rows only

---

## Emission Calculation

`lib/emissions.ts` exposes:
- `getEmissionFactors(category?)` — fetches from Supabase
- `calculateKgCo2e(factor, quantity)` — `factor.kg_co2e_per_unit × quantity`
- `getEmissionsForPeriod(userId, from, to)` — sums kg_co2e from logs
- `getCommunityEmissionsForPeriod(communityId, from, to)` — sums all members' logs
- `logEmission(userId, entry)` — inserts a new log row

**v1.1 placeholder functions** (return empty/null, wired for replacement):
- `estimateFromDescription(description)` — NLP/LLM → factor + quantity
- `importFromBankFeed(userId)` — Open Banking / Plaid / TrueLayer
- `importFromTravelApp(userId)` — TripIt / Google Maps Timeline
- `importFromMotionData(userId)` — Expo Location + activity recognition

---

## Distance Calculation (for km-based activities)

`lib/geocode.ts`:
- `geocodePlace(query)` — OpenStreetMap Nominatim, no API key required
- `haversineKm(a, b)` — great circle distance
- Used in `log.tsx` and `edit-log.tsx` when unit is `km`
- 600ms debounce on input; auto-fires when both origin and destination are filled

---

## Known Quirks & Gotchas

- **`useFocusEffect`** is NOT re-exported from `expo-router`'s main index in SDK 55. Import from `expo-router/build/useFocusEffect` directly.
- **Donut charts** use CSS `conic-gradient` via `backgroundImage` style (web-only). `react-native-svg` was avoided due to Metro resolver issues on web. On native, these will need a proper SVG-based implementation.
- **`@ts-ignore`** on the `backgroundImage` style prop — this is intentional; it's a web-only CSS property not in React Native's type definitions.
- **`supabase.from().single()`** returns `{ data: null, error }` (not a throw) when no rows exist. Dashboard handles this gracefully by checking `if (memberships)`.
- **NativeWind** requires `global.css` imported at the root layout and `withNativeWind` in `metro.config.js`.
- **Node version**: requires Node ≥ 20. Managed via nvm. The system default (v12) is too old.
