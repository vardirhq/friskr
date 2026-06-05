-- ============================================================================
-- Friskr — 0003 views, realtime, RPCs
-- ============================================================================

-- ── stock_status: stock_items enriched with urgency + denormalised labels ───
-- The prototype computes status from `off` (days to expiry) relative to a fixed
-- "today". Here it is derived live from expiry_date vs current_date.
--   days_left < 0       -> 'expired'  (Utløpt)
--   days_left 0..3      -> 'soon'     (Utløper snart)
--   else / no date      -> 'fresh'    (Fersk)
--
-- security_invoker = on makes the view honour the querying user's RLS on the
-- underlying tables (Postgres 15+ / Supabase default behaviour we rely on).
create or replace view public.stock_status
with (security_invoker = on) as
select
  s.id,
  s.household_id,
  s.product_id,
  s.location_id,
  s.quantity,
  s.expiry_date,
  s.frozen,
  s.best_for_date,
  s.note,
  s.price_nok,
  s.status,
  l.freezer as location_freezer,
  s.added_by,
  s.created_at,
  s.resolved_at,
  (s.expiry_date - current_date) as days_left,
  (s.best_for_date - current_date) as best_for_days_left,
  case
    when s.status <> 'in_stock'                       then s.status
    when s.expiry_date is null                        then 'fresh'
    when s.expiry_date <  current_date                then 'expired'
    when s.expiry_date <= current_date + 3            then 'soon'
    else 'fresh'
  end as urgency,
  p.name        as product_name,
  p.brand       as product_brand,
  p.category_id,
  c.label       as category_label,
  c.hue         as category_hue,
  l.label       as location_label
from public.stock_items s
join public.products   p on p.id = s.product_id
join public.categories c on c.id = p.category_id
join public.locations  l on l.id = s.location_id;

-- ── create_household: make a household and join the caller as owner ─────────
create or replace function public.create_household(p_name text, p_display_name text default null)
returns public.households
language plpgsql security definer set search_path = public as $$
declare h public.households;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.households (name) values (p_name) returning * into h;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (h.id, auth.uid(), 'owner', coalesce(p_display_name, split_part(auth.email(), '@', 1)));

  return h;
end;
$$;

-- ── join_household: join an existing household by invite code ───────────────
create or replace function public.join_household(p_code text, p_display_name text default null)
returns public.households
language plpgsql security definer set search_path = public as $$
declare h public.households;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into h from public.households where invite_code = upper(p_code);
  if h.id is null then
    raise exception 'invalid invite code';
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (h.id, auth.uid(), 'member', coalesce(p_display_name, split_part(auth.email(), '@', 1)))
  on conflict (household_id, user_id) do nothing;

  return h;
end;
$$;

-- ── realtime: push live changes to the household's connected members ────────
-- The app's multi-member sync ("lagt til av Jonas" appearing instantly) relies
-- on these. Subscribe client-side filtered by household_id.
alter publication supabase_realtime add table public.stock_items;
alter publication supabase_realtime add table public.household_members;
