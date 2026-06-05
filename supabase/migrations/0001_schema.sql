-- ============================================================================
-- Friskr — 0001 schema
-- Pantry / freshness tracker. Multi-member households, a shared product
-- catalogue, and stock items with expiry dates.
--
-- Mirrors the prototype data model in friskr-data.jsx:
--   CATEGORIES  -> categories        (reference)
--   LOCATIONS   -> locations         (reference)
--   PRODUCTS    -> products          (global catalogue + per-household custom)
--   STOCK       -> stock_items       (off:days -> expiry_date:date)
--   HOUSEHOLD   -> households + household_members
-- ============================================================================

create extension if not exists pgcrypto;

-- ── reference: product categories (seeded, not user-writable) ──────────────
create table public.categories (
  id    text primary key,          -- e.g. 'meieri'
  label text not null,             -- 'Meieri'
  icon  text not null,             -- icon key in friskr-icons.jsx, e.g. 'catDairy'
  hue   int  not null default 160, -- 0-360, used for the tinted category chip
  sort  int  not null default 100
);

-- ── households (must come before locations and products) ────────────────────
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                          -- 'Familien Eikeland'
  invite_code text not null unique
              default 'FRISK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)),
  created_at  timestamptz not null default now()
);

-- ── reference: storage locations (Kjøleskap / Fryser / Spiskammer) ─────────
create table public.locations (
  id    text primary key,          -- e.g. 'kjoleskap' (defaults) or app-generated slug for custom
  label text not null,
  icon  text not null,             -- e.g. 'locFridge'
  hue   int  not null default 160,
  sort  int  not null default 100,
  freezer      boolean not null default false,
  -- NULL = shared default; non-null = household's custom location
  household_id uuid references public.households(id) on delete cascade
);
create index on public.locations (household_id);

-- ── household membership (joins auth.users) ─────────────────────────────────
create table public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id)        on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  display_name text,                                  -- 'Mari'
  color_hue    int default 145,                       -- avatar tint
  joined_at    timestamptz not null default now(),
  unique (household_id, user_id)
);
create index household_members_user_idx on public.household_members(user_id);

-- ── products: catalogue + per-household custom items ────────────────────────
-- household_id NULL  => global catalogue row (shared, read-only to clients)
-- household_id set   => a custom product owned by that household
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid references public.households(id) on delete cascade,
  name              text not null,                    -- 'Tine Helmelk 1L'
  brand             text default '',                  -- 'Tine'
  category_id       text not null references public.categories(id),
  default_shelf_days int,                             -- prototype `shelf`
  barcode           text,                             -- EAN/GTIN for scan lookup
  created_at        timestamptz not null default now()
);
create index products_barcode_idx   on public.products(barcode);
create index products_household_idx on public.products(household_id);

-- ── stock items: a physical thing in a pantry with an expiry date ───────────
create table public.stock_items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  product_id   uuid not null references public.products(id),
  location_id  text not null references public.locations(id),
  quantity     numeric not null default 1 check (quantity >= 0),
  expiry_date  date,                                  -- prototype `off` resolves to a real date
  -- freezer model (mirrors prototype `frozen` / `bestForOff`):
  -- when frozen, expiry_date holds the extended freezer horizon and best_for_date
  -- preserves the printed "best før". See AI_ON_DEVICE.md / FRONTEND_INTEGRATION.md.
  frozen       boolean not null default false,
  best_for_date date,                                 -- original printed date, kept when frozen
  note         text,                                  -- optional free-text note
  price_nok    numeric(10,2),                          -- optional hint, never shown as a savings figure alone
  status       text not null default 'in_stock'
               check (status in ('in_stock', 'used_up', 'discarded')),
  added_by     uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz                            -- set when status leaves 'in_stock'
);
create index stock_household_idx        on public.stock_items(household_id);
create index stock_household_status_idx on public.stock_items(household_id, status);
create index stock_expiry_idx           on public.stock_items(expiry_date);

-- keep resolved_at in sync with status
create or replace function public.tg_stock_resolved()
returns trigger language plpgsql as $$
begin
  if new.status = 'in_stock' then
    new.resolved_at := null;
  elsif new.status is distinct from old.status then
    new.resolved_at := now();
  end if;
  return new;
end;
$$;

create trigger stock_resolved_at
  before update on public.stock_items
  for each row execute function public.tg_stock_resolved();
