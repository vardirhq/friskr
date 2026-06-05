-- ============================================================================
-- Friskr — 0004 demo-data helper (optional)
--
-- Recreates the prototype's "Familien Eikeland" household and its 16 stock
-- items for a given user, so a fresh signup can see a populated app instantly.
-- Offsets (`off` days in friskr-data.jsx) are resolved to current_date + off,
-- so urgency stays realistic no matter when it is run.
--
-- Usage after signing in:  select public.seed_demo_household(auth.uid());
-- (or from SQL editor with a known user id). Requires seed.sql catalogue loaded.
-- ============================================================================

create or replace function public.seed_demo_household(p_user uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  h_id uuid;
  rec  record;
  prod uuid;
begin
  insert into public.households (name) values ('Familien Eikeland') returning id into h_id;

  insert into public.household_members (household_id, user_id, role, display_name, color_hue)
  values (h_id, p_user, 'owner', 'Mari', 145);

  -- (product name, location, quantity, days-to-expiry, frozen, best-for-days)
  for rec in
    select * from (values
      ('Laksefilet',        'kjoleskap',  1,  -1, false, null),
      ('Tine Helmelk 1L',   'kjoleskap',  2,   1, false, null),
      ('Kyllingfilet 600g', 'kjoleskap',  1,   2, false, null),
      ('Bananer',           'spiskammer', 6,   2, false, null),
      ('Grovbrød',          'spiskammer', 1,   3, false, null),
      ('Yoghurt naturell',  'kjoleskap',  4,   5, false, null),
      ('Kjøttdeig 400g',    'fryser',     2, 118, true,     4),
      ('Egg 12-pk',         'kjoleskap',  1,   9, false, null),
      ('Leverpostei',       'kjoleskap',  1,  11, false, null),
      ('Jarlsberg',         'kjoleskap',  1,  14, false, null),
      ('Gulrøtter 1kg',     'kjoleskap',  1,  16, false, null),
      ('Norvegia skivet',   'kjoleskap',  1,  24, false, null),
      ('Bremykt',           'kjoleskap',  1,  33, false, null),
      ('Solo 1,5L',         'spiskammer', 3,  95, false, null),
      ('Knekkebrød',        'spiskammer', 1, 110, false, null),
      ('Pizza Grandiosa',   'fryser',     2, 188, true,   120)
    ) as t(pname, loc, qty, off, frz, bfoff)
  loop
    select id into prod from public.products
      where name = rec.pname and household_id is null limit 1;
    if prod is not null then
      insert into public.stock_items
        (household_id, product_id, location_id, quantity, expiry_date, frozen, best_for_date, added_by)
      values
        (h_id, prod, rec.loc, rec.qty, current_date + rec.off, rec.frz,
         case when rec.bfoff is null then null else current_date + rec.bfoff end, p_user);
    end if;
  end loop;

  return h_id;
end;
$$;
