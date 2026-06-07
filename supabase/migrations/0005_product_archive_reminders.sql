alter table public.products
  add column if not exists archived_at timestamptz;

alter table public.stock_items
  add column if not exists reminder_days_before integer;

alter table public.stock_items
  drop constraint if exists stock_items_reminder_days_before_check;

alter table public.stock_items
  add constraint stock_items_reminder_days_before_check
  check (
    reminder_days_before is null
    or reminder_days_before between -1 and 14
  );

create index if not exists products_household_active_idx
  on public.products (household_id, name)
  where archived_at is null;
