# CarbonYeah — Product Decision Record

This document records the product decisions made during development, the reasoning behind them, and what was explicitly deferred. It is the authoritative reference for why the app works the way it does.

---

## Core Concept

CarbonYeah is a **carbon tracking and trading app for communities**. The central idea is:

> Every person on Earth has a fair share of the carbon budget. CarbonYeah makes that tangible — helping individuals and communities see whether they're living within it.

The app is not about guilt. It's about awareness, community accountability, and eventually enabling people to act (trade, offset, reduce).

---

## The Allocation Model

### Decision: fair-share allocation, not offset-based credits

The app measures personal consumption against a **globally fair annual allowance** — not against purchased offsets or credits.

**Annual allocation per person: 2,000 kg CO₂e**
- Derived from: ~50 Gt global GHG budget ÷ ~8 billion people
- This is the approximately safe per-capita emissions level to avoid runaway climate change
- Monthly allocation: 2,000 ÷ 12 ≈ 167 kg CO₂e

This figure is baked into the app as `ANNUAL_ALLOCATION_KG = 2000` in `app/(tabs)/index.tsx`.

**Why not credits?** Credits were discussed and explicitly set aside in v1.0. The allocation model is simpler, more honest, and more universally understandable. Credits (trading, earning, buying) are deferred to a later version.

---

## Emission Categories

**Categories (v1.0):** Travel | Energy | Food | Other

These were chosen for breadth and familiarity. The full list was deliberately kept short — four categories covers the vast majority of personal footprint and is simple enough for casual users to navigate.

Each category has subcategories and activities in the `emission_factors` table (seeded in `001_core_schema.sql`).

---

## Emission Logging

### Decision: activity-based entry, not raw kg input

Users describe what they did (e.g. "took a flight to Geneva") rather than entering kg CO₂e directly. The app calculates the figure. Users can override the calculated value if they know it's wrong.

**Reasoning:** Users don't know their kg footprint. Asking them to enter it directly creates friction and inaccuracy. The app should do the work.

### Decision: lookup table for v1.0 calculations

Emission factors are stored in a Supabase table (`emission_factors`) seeded with values from established sources (DESNZ, IPCC, published lifecycle analyses).

**v1.1 planned replacement:** Call an external emissions API (e.g. Climatiq) for more accurate, updatable factors. The calculation is isolated in `lib/emissions.ts::calculateKgCo2e()` specifically to make this swap easy.

### Decision: distance auto-calculation via geocoding

For km-based activities (flights, car, train, etc.) the app shows **From / To** inputs and auto-calculates distance using OpenStreetMap Nominatim + haversine formula. Users never enter raw km.

**Reasoning:** "I flew to Geneva" is how people think. Asking for km creates friction and errors.

### Decision: manual override on kg CO₂e

In the edit modal (`edit-log.tsx`), users can toggle "Override manually" to type the kg figure directly. This handles cases where the lookup table estimate is wrong for their specific situation.

### v1.1 integration placeholders

The following are stub functions in `lib/emissions.ts` with clear interfaces, ready to be implemented:

| Placeholder | Integration | Notes |
|---|---|---|
| `estimateFromDescription` | LLM / NLP | Parse free text/voice → factor + quantity |
| `importFromBankFeed` | Open Banking / Plaid / TrueLayer | Auto-import transactions |
| `importFromTravelApp` | TripIt / Google Maps Timeline | Auto-import trips |
| `importFromMotionData` | Expo Location + activity recognition | Passive travel detection |

**Voice input** was discussed for manual entry but is explicitly deferred to v1.1.

---

## Communities

### Decision: freeform communities, anyone can create

A community is any named group. Anyone can create one. Users can belong to **multiple communities**.

**Future:** If communities become formal (e.g. a Council Ward or NHS Trust), secondary verification will be required to prove membership. Not in scope for v1.0.

### Decision: community emissions = sum of member logs

The community's total CO₂e is simply the sum of all its members' logged entries for the period. There is no separate community-level emission log in v1.0.

### Dashboard community panel

The dashboard shows the user's **primary community** (first membership returned by Supabase). The community allocation scales with member count: `members × 2,000 kg`.

**Future:** Let users select which community to feature on the dashboard. Show all communities on the Community tab.

---

## Dashboard Design

### Decision: three donut panels at the top

Three allocation panels:
1. **This month** — personal emissions vs monthly allocation (167 kg)
2. **This year** — personal emissions vs annual allocation (2,000 kg)
3. **My community** — community total vs community allocation

**Visual:** CSS conic-gradient donut charts. Colour coding:
- Green: < 75% of allocation used
- Amber: 75–99%
- Red: ≥ 100% (over budget)

**Why donuts?** The circular form makes the "how full is the bucket" intuition immediate. The full circle = the full allocation makes the metaphor concrete.

### Decision: "no data" state shows allocation, not zero

When a user has no logs yet, the donut shows `—` in the centre and the footer shows "X kg allocated" rather than a zero reading. This avoids the impression that 0 kg is a good score.

---

## Trade Tab

The Trade tab exists in the navigation but shows a placeholder. Carbon credit trading is explicitly out of scope for v1.0. It will be designed once the tracking model is stable and user-tested.

---

## What's Not Built Yet (explicit deferrals)

| Feature | Status | Notes |
|---|---|---|
| Carbon credit trading | Deferred | Trade tab is a placeholder |
| Voice input for logging | Deferred to v1.1 | Placeholder in lib/emissions.ts |
| Bank feed integration | Deferred to v1.1 | Stub in lib/emissions.ts |
| Travel app integration | Deferred to v1.1 | Stub in lib/emissions.ts |
| Motion/GPS passive tracking | Deferred to v1.1 | Stub in lib/emissions.ts |
| External emissions API (Climatiq) | Deferred to v1.1 | Swap calculateKgCo2e() |
| Community tab (member breakdown) | Not started | Stacked bar chart per member planned |
| Community creation UI | Not started | Schema exists, no UI yet |
| Multiple community switcher | Not started | Dashboard shows first community only |
| Community formal verification | Deferred | For councils/official bodies |
| User profile (name, location, home community) | Not started | Only email shown |
| Push notifications | Not started | |
| Offline support | Not started | |
| Native (iOS/Android) donut charts | Not started | Web uses conic-gradient; native needs SVG |
