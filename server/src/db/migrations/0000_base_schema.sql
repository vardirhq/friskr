-- Base schema: all app tables.
-- On an existing Supabase DB these already exist; on a fresh DB (e.g. friskr_test) they don't.

create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null,
  role         text not null default 'member',
  display_name text,
  color_hue    integer default 145,
  joined_at    timestamptz not null default now()
);

create table if not exists categories (
  id    text primary key,
  label text not null,
  icon  text not null,
  hue   integer not null default 160,
  sort  integer not null default 100
);

create table if not exists locations (
  id           text primary key,
  label        text not null,
  icon         text not null,
  hue          integer not null default 160,
  sort         integer not null default 100,
  freezer      boolean not null default false,
  household_id uuid references households(id) on delete cascade
);

create table if not exists products (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid references households(id) on delete cascade,
  name               text not null,
  brand              text default '',
  category_id        text not null references categories(id),
  default_shelf_days integer,
  barcode            text,
  created_at         timestamptz not null default now()
);

create table if not exists stock_items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  product_id   uuid not null references products(id),
  location_id  text not null references locations(id),
  quantity     numeric not null default 1,
  expiry_date  date,
  frozen       boolean not null default false,
  best_for_date date,
  note         text,
  price_nok    numeric(10,2),
  status       text not null default 'in_stock',
  added_by     uuid,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
