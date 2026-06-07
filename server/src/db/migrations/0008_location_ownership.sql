alter table locations
  add column if not exists freezer boolean not null default false;

alter table locations
  add column if not exists household_id uuid references households(id) on delete cascade;

create index if not exists locations_household_idx
  on locations (household_id, sort, label);
