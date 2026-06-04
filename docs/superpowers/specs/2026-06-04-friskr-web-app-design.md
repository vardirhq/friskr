# Friskr — Core Web App Design Spec

**Date:** 2026-06-04  
**Scope:** Pass A — Vite + React + TypeScript web app, all screens, Supabase backend fully wired (auth, stock CRUD, households, realtime). No Capacitor / native capabilities.  
**Source of truth for design:** `friskr/project/design_handoff_friskr/` (prototype) + `friskr/project/design_handoff_friskr_backend/` (backend handoff).

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Bundler | Vite | `@vitejs/plugin-react` |
| UI | React 18 + TypeScript | strict mode |
| State | Zustand | one store per domain |
| Styling | CSS custom properties + CSS Modules | tokens verbatim from prototype |
| Backend | Supabase (local → cloud) | Postgres + Auth + Realtime + Edge Functions |
| Auth | Email magic link only | Apple/Google OAuth deferred |
| Native | None in this pass | Capacitor added later |

---

## Project Structure

```
friskr/
├── src/
│   ├── lib/
│   │   ├── supabase.ts          # shared client (import.meta.env.VITE_*)
│   │   ├── database.types.ts    # CLI-generated via supabase gen types
│   │   ├── friskr.ts            # data layer: stock, products, households, stats, scan
│   │   ├── auth.ts              # signInWithEmail, signOut, onAuthChange
│   │   ├── realtime.ts          # subscribeHousehold
│   │   ├── dates.ts             # statusOf, relLabel, fmtNO, fmtShort, STATUS_META
│   │   └── reference.ts        # CATEGORIES, LOCATIONS, CATEGORY_PRICE, freezer helpers
│   ├── stores/
│   │   ├── auth.ts              # session: Session | null
│   │   ├── household.ts         # household: Household | null, members
│   │   ├── stock.ts             # items, counts, stats + async actions
│   │   ├── settings.ts          # darkMode, pushEnabled, notifyDaysAhead (localStorage)
│   │   └── ui.ts                # tab, sheet, toast, confetti
│   ├── components/
│   │   ├── icons/index.tsx      # all ~40 icons as typed named exports
│   │   ├── CatTile.tsx
│   │   ├── StatusPill.tsx
│   │   ├── FreshnessRing.tsx
│   │   ├── Segmented.tsx
│   │   ├── Press.tsx
│   │   ├── Btn.tsx
│   │   ├── Card.tsx
│   │   ├── Sheet.tsx
│   │   ├── Toast.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Confetti.tsx
│   │   ├── Phone.tsx            # dev-only frame
│   │   └── StatusBar.tsx
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── StockScreen.tsx
│   │   ├── ScanScreen.tsx
│   │   ├── ProductsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── AddSheet.tsx
│   │   ├── HouseholdScreen.tsx
│   │   ├── SignInScreen.tsx
│   │   ├── CreateOrJoinScreen.tsx   # new — post-auth, no household yet
│   │   └── Onboarding.tsx
│   ├── styles/
│   │   ├── tokens.css           # :root CSS vars (verbatim from prototype)
│   │   └── global.css           # reset, keyframes, .tnum, .noscroll, scrollbar
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   ├── migrations/
│   │   ├── 0001_schema.sql
│   │   ├── 0002_rls.sql
│   │   ├── 0003_views_realtime_rpc.sql
│   │   └── 0004_demo_seed.sql
│   └── functions/
│       ├── scan-lookup/index.ts
│       └── expiry-digest/index.ts
├── .env.local                   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── vite.config.ts
├── tsconfig.json
└── package.json
```

The existing `Friskr.html`, `friskr-*.jsx`, and `tweaks-panel.jsx` prototype files at the repo root are **deleted** once the TypeScript implementation is complete. The Tweaks panel is not reproduced.

---

## Design System

### Tokens
`src/styles/tokens.css` contains the `:root` CSS custom properties verbatim from the prototype — all color, radius, spacing, shadow, and font tokens for both light and dark themes. The `.theme-dark` class on `<html>` switches to the dark palette. `settings` store sets this class reactively.

### Icons
All icons from `friskr-icons.jsx` are ported to `src/components/icons/index.tsx` as named TypeScript React components. A shared `SvgIcon` base handles `size`, `strokeWidth`, `className` props. Icons are `currentColor` stroke, no fills except `logo`, `apple`, `google`.

### Primitives
Each primitive in `friskr-ui.jsx` becomes its own typed component. Key prop contracts:

- `CatTile`: `cat: CategoryId, size?: number`
- `StatusPill`: `off: number | null, dense?: boolean`
- `FreshnessRing`: `fresh: number, soon: number, expired: number, size?: number`
- `Btn`: `variant?: 'primary' | 'ghost' | 'soft' | 'danger', full?: boolean, icon?: React.ComponentType`
- `Sheet`: `open: boolean, onClose: () => void, title?: string, maxH?: number`
- `Press`: `onClick?: () => void, style?: CSSProperties` — applies `scale(0.97)` on pointer-down

All animation keyframes (`friskr-rise`, `friskr-sheet`, `friskr-pop`, `friskr-scanline`, `friskr-spin`, `friskr-confetti`) live in `global.css`. `prefers-reduced-motion` disables all of them globally.

---

## Screens

Six primary screens (bottom tab nav) plus four overlays. All are faithful ports of the prototype — same layout, same Norwegian copy, same interactions. No redesign.

| Screen | Tab key | Source |
|---|---|---|
| `HomeScreen` | `home` | freshness ring, savings card, quick actions, "Bruk meg først" list |
| `StockScreen` | `stock` | segmented tabs (Snart/Utløpt/Alle/Plassering), swipeable `StockRow` |
| `ScanScreen` | `scan` | dark camera mock → `scanLookup` → product card → date step → `AddSheet` |
| `ProductsScreen` | `products` | searchable catalogue, category chips, add button per row |
| `SettingsScreen` | `settings` | profile card, household row, push toggle + stepper, dark mode, sign out |

Overlays (rendered at app root, above everything):
- `AddSheet` — add or edit a stock item; bottom sheet
- `HouseholdScreen` — full-screen; manage mode (QR, invite code, members) + join mode
- `Onboarding` — full-screen; 4 steps, dot pager; shown on first run and from Settings
- `SignInScreen` — full-screen app gate; email magic link flow

`CreateOrJoinScreen` — full-screen; shown after sign-in when `getHousehold()` returns null. Two actions: "Opprett husholdning" (name input → `create_household` RPC) or "Bli med" (invite code → `join_household` RPC). Not in the prototype — new screen.

### StockRow swipe
Pointer-based, no library. `dx` tracks drag offset. Right swipe (≥150px) → `consume`; left swipe (≥150px) → `discard`. Short swipe (≥60px) peeks the action for tap confirmation. Spring easing `cubic-bezier(.22,1,.36,1)` on release. Both actions fire an undo toast (4.4s). The row flies off-screen on commit then the store removes it.

---

## Data & Store Layer

### `src/lib/`
Files ported verbatim from the handoff's `app/lib/`, with one change: `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` replaces bare `process.env`. `database.types.ts` is CLI-generated, not hand-maintained.

`StockItem` shape (what screens consume):
```ts
{
  id, pid, loc, qty,
  off: number | null,        // days until expiry, computed live — statusOf() works unchanged
  expiryDate: Date | null,   // use this instead of dateFromOffset(off) for absolute dates
  frozen, bestForOff, bestForDate,
  note, price, addedBy,
  status: 'in_stock' | 'used_up' | 'discarded',
  product: Product,          // nested, matches prototype shape
}
```

Screens query the `stock_status` **view** (not `stock_items` directly) — it returns `days_left`, `urgency`, denormalised `product_name`, `category_label`, `location_label`.

### Zustand stores

**`auth`**
```ts
{ session: Session | null }
actions: { init(), signInWithEmail(email), signOut() }
```
`init()` calls `onAuthChange` and stores the session. Called once in `main.tsx`.

**`household`**
```ts
{ household: Household | null, members: Member[] }
actions: { load(), create(name), join(code), reload() }
```

**`stock`**
```ts
{ items: StockItem[], counts: Counts, stats: Stats }
actions: {
  load(householdId),
  save(householdId, payload),      // add or edit
  consume(item),                   // optimistic remove → consumeStock → undo toast
  discard(item),                   // optimistic remove → discardStock → undo toast
  restore(id),                     // undo — restoreStock + reload
  subscribeRealtime(householdId),
  unsubscribeRealtime(),
}
```
Optimistic pattern: remove item from `items[]` immediately, call DB, expose undo via toast. Realtime reconciles after any mutation.

**`settings`** — persisted to localStorage via Zustand `persist` middleware.
```ts
{ darkMode: boolean, pushEnabled: boolean, notifyDaysAhead: number (1–14) }
```
`darkMode` toggles `.theme-dark` on `<html>` via a `useEffect` in `App.tsx`.

**`ui`**
```ts
{ tab: TabKey, sheet: SheetTarget | null, toast: Toast | null, confetti: boolean }
```
`Toast` includes optional `action: { label, onAction }` for the "Angre" pattern.

---

## Auth & First-Run Routing

`App.tsx` renders one of four states, checked in order:

1. **Loading** — session not yet known (brief, Supabase reads from localStorage)
2. **No session** → `<SignInScreen>` — email input → magic link → "Sjekk e-posten" confirmation
3. **Session, no household** → `<CreateOrJoinScreen>`
4. **Session + household** → main app (BottomNav + active screen + overlays)

Magic link redirect: Supabase sends the user back to `VITE_SITE_URL` (local: `http://localhost:5173`, cloud: the real domain). The Supabase JS client detects the auth fragment on load and fires `onAuthChange` automatically — no custom redirect handler needed.

---

## Supabase Setup

### Local dev
```bash
supabase init          # initialise supabase/ dir
supabase start         # starts Postgres, Auth, Studio (http://localhost:54323)
supabase db reset      # applies migrations 0001→0004 + seed.sql
supabase gen types typescript --local > src/lib/database.types.ts
```

### Env
`.env.local`:
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<from supabase status>
VITE_SITE_URL=http://localhost:5173
```

### Edge functions
```bash
supabase functions serve scan-lookup   # local test
supabase functions deploy scan-lookup
supabase functions deploy expiry-digest
```

### Going cloud
```bash
supabase link --project-ref <ref>
supabase db push
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

---

## What is explicitly out of scope

- Capacitor / native wrapping
- Apple / Google OAuth
- ML Kit barcode scanning (ScanScreen uses mock camera + `scanLookup` edge function for lookup; manual-add branch is the fallback)
- Expiry date OCR
- Push / local notifications
- Product photo storage
- Tweaks panel (dropped entirely)
- i18n (Norwegian only)

---

## Definition of done

- [ ] `tsc --noEmit` clean; `database.types.ts` is CLI-generated
- [ ] `supabase db reset` applies all four migrations + seed with no errors
- [ ] Sign in via email magic link → lands on Home with household data
- [ ] All 6 screens render identically to the prototype (layout, copy, interactions)
- [ ] Add / edit / use / toss / undo all persist and survive page reload
- [ ] Two browser tabs (two members) see each other's stock changes live without refresh
- [ ] `CreateOrJoinScreen` works: create new household or join by invite code
- [ ] Settings: dark mode toggle applies `.theme-dark`; notify days stepper persists
- [ ] Sign out returns to `SignInScreen`
- [ ] Deployable as a PWA (Vite `build` + serve static output)
