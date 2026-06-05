-- ============================================================================
-- Friskr — 0002 Row Level Security
--
-- Security model: a user may read/write a row only if they belong to the
-- household it hangs off. Global catalogue rows (products.household_id IS NULL)
-- and the categories/locations reference tables are world-readable to any
-- authenticated user.
--
-- The is_household_member()/is_household_owner() helpers are SECURITY DEFINER,
-- so they bypass RLS when they query household_members — this is what prevents
-- infinite policy recursion. Do NOT make them SECURITY INVOKER.
-- ============================================================================

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public.is_household_member(p_household uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = p_household and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(p_household uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = p_household
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

-- ── enable RLS everywhere ────────────────────────────────────────────────────
alter table public.categories        enable row level security;
alter table public.locations         enable row level security;
alter table public.households         enable row level security;
alter table public.household_members  enable row level security;
alter table public.products           enable row level security;
alter table public.stock_items        enable row level security;

-- ── reference tables: read-only to any signed-in user ────────────────────────
create policy categories_read on public.categories
  for select to authenticated using (true);

create policy locations_read on public.locations
  for select to authenticated
  using (household_id is null or public.is_household_member(household_id));

-- Writes only ever touch a household's OWN custom locations. The shared
-- defaults (household_id null) are maintained via seed using the service role.
create policy locations_insert on public.locations
  for insert to authenticated
  with check (household_id is not null and public.is_household_member(household_id));

create policy locations_update on public.locations
  for update to authenticated
  using (household_id is not null and public.is_household_member(household_id))
  with check (household_id is not null and public.is_household_member(household_id));

create policy locations_delete on public.locations
  for delete to authenticated
  using (household_id is not null and public.is_household_member(household_id));

-- ── households ───────────────────────────────────────────────────────────────
-- Create/join go through the SECURITY DEFINER RPCs in 0003 (which also create
-- the membership row), so there is intentionally NO direct INSERT policy here.
create policy households_read on public.households
  for select to authenticated
  using (public.is_household_member(id));

create policy households_update on public.households
  for update to authenticated
  using (public.is_household_owner(id))
  with check (public.is_household_owner(id));

create policy households_delete on public.households
  for delete to authenticated
  using (public.is_household_owner(id));

-- ── household_members ─────────────────────────────────────────────────────────
-- Members can see everyone in their household (avatars, "lagt til av ...").
create policy members_read on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

-- A user may edit / remove their own membership row; an owner may manage anyone.
create policy members_update_self on public.household_members
  for update to authenticated
  using (user_id = auth.uid() or public.is_household_owner(household_id))
  with check (user_id = auth.uid() or public.is_household_owner(household_id));

create policy members_delete on public.household_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_household_owner(household_id));

-- ── products ───────────────────────────────────────────────────────────────
-- Visible: global catalogue (household_id null) OR your household's custom items.
create policy products_read on public.products
  for select to authenticated
  using (household_id is null or public.is_household_member(household_id));

-- Writes only ever touch a household's OWN custom products. The global
-- catalogue is maintained via seed/edge functions using the service role.
create policy products_insert on public.products
  for insert to authenticated
  with check (household_id is not null and public.is_household_member(household_id));

create policy products_update on public.products
  for update to authenticated
  using (household_id is not null and public.is_household_member(household_id))
  with check (household_id is not null and public.is_household_member(household_id));

create policy products_delete on public.products
  for delete to authenticated
  using (household_id is not null and public.is_household_member(household_id));

-- ── stock_items ───────────────────────────────────────────────────────────────
create policy stock_read on public.stock_items
  for select to authenticated
  using (public.is_household_member(household_id));

create policy stock_insert on public.stock_items
  for insert to authenticated
  with check (public.is_household_member(household_id) and added_by = auth.uid());

create policy stock_update on public.stock_items
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy stock_delete on public.stock_items
  for delete to authenticated
  using (public.is_household_member(household_id));
