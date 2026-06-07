create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null,
  cat text not null default 'annet',
  qty integer not null default 1,
  done boolean not null default false,
  auto boolean not null default false,
  added_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index shopping_list_items_household_idx on shopping_list_items(household_id, done);
