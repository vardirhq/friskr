-- Add columns that exist in the schema but were missing from the original Supabase table
alter table stock_items add column if not exists frozen       boolean not null default false;
alter table stock_items add column if not exists best_for_date date;
alter table stock_items add column if not exists note         text;
alter table stock_items add column if not exists price_nok    numeric(10,2);
