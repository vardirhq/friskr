-- ============================================================================
-- Friskr — seed.sql  (reference data + global product catalogue)
-- Runs automatically on `supabase db reset`. Idempotent via upserts.
-- Values mirror friskr-data.jsx (CATEGORIES, LOCATIONS, PRODUCTS).
-- ============================================================================

-- ── categories ───────────────────────────────────────────────────────────────
insert into public.categories (id, label, icon, hue, sort) values
  ('meieri', 'Meieri',        'catDairy',   198,  1),
  ('kjott',  'Kjøtt',         'catMeat',      8,  2),
  ('fisk',   'Fisk',          'catFish',    210,  3),
  ('frukt',  'Frukt & grønt', 'catProduce', 128,  4),
  ('brod',   'Brød & korn',   'catBread',    36,  5),
  ('palegg', 'Pålegg',        'catSpread',   22,  6),
  ('ferdig', 'Ferdigmat',     'catReady',   280,  7),
  ('drikke', 'Drikke',        'catDrink',   250,  8),
  ('snacks', 'Snacks',        'catSnack',    48,  9),
  ('annet',  'Annet',         'catOther',   160, 10)
on conflict (id) do update
  set label = excluded.label, icon = excluded.icon, hue = excluded.hue, sort = excluded.sort;

-- ── locations ────────────────────────────────────────────────────────────────
insert into public.locations (id, label, icon, hue, sort, freezer) values
  ('kjoleskap',  'Kjøleskap',  'locFridge',  198, 1, false),
  ('fryser',     'Fryser',     'locFreezer', 210, 2, true),
  ('spiskammer', 'Spiskammer', 'locPantry',   32, 3, false)
on conflict (id) do update
  set label = excluded.label, icon = excluded.icon, hue = excluded.hue, sort = excluded.sort, freezer = excluded.freezer;

-- ── global product catalogue (household_id NULL) ─────────────────────────────
-- Stable UUIDs so re-running the seed updates rather than duplicates.
insert into public.products (id, household_id, name, brand, category_id, default_shelf_days) values
  ('00000000-0000-4000-8000-000000000001', null, 'Tine Helmelk 1L',   'Tine',      'meieri',   9),
  ('00000000-0000-4000-8000-000000000002', null, 'Norvegia skivet',   'Tine',      'meieri',  28),
  ('00000000-0000-4000-8000-000000000003', null, 'Kyllingfilet 600g', 'Prior',     'kjott',    6),
  ('00000000-0000-4000-8000-000000000004', null, 'Laksefilet',        'Salma',     'fisk',     4),
  ('00000000-0000-4000-8000-000000000005', null, 'Egg 12-pk',         'Prior',     'meieri',  21),
  ('00000000-0000-4000-8000-000000000006', null, 'Bananer',           '',          'frukt',    6),
  ('00000000-0000-4000-8000-000000000007', null, 'Grovbrød',          'Bakehuset', 'brod',     5),
  ('00000000-0000-4000-8000-000000000008', null, 'Leverpostei',       'Stabburet', 'palegg',  14),
  ('00000000-0000-4000-8000-000000000009', null, 'Pizza Grandiosa',   'Stabburet', 'ferdig', 240),
  ('00000000-0000-4000-8000-00000000000a', null, 'Solo 1,5L',         'Solo',      'drikke', 120),
  ('00000000-0000-4000-8000-00000000000b', null, 'Yoghurt naturell',  'Tine',      'meieri',  16),
  ('00000000-0000-4000-8000-00000000000c', null, 'Kjøttdeig 400g',    'Gilde',     'kjott',    5),
  ('00000000-0000-4000-8000-00000000000d', null, 'Gulrøtter 1kg',     '',          'frukt',   18),
  ('00000000-0000-4000-8000-00000000000e', null, 'Bremykt',           'TINE',      'meieri',  40),
  ('00000000-0000-4000-8000-00000000000f', null, 'Jarlsberg',         'Tine',      'meieri',  30),
  ('00000000-0000-4000-8000-000000000010', null, 'Knekkebrød',        'Wasa',      'brod',   120)
on conflict (id) do update
  set name = excluded.name, brand = excluded.brand,
      category_id = excluded.category_id, default_shelf_days = excluded.default_shelf_days;
