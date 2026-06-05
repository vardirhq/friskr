create or replace function notify_household_change()
returns trigger language plpgsql as $$
begin
  perform pg_notify(
    'friskr_changes',
    coalesce(NEW.household_id, OLD.household_id)::text
  );
  return null;
end;
$$;

drop trigger if exists stock_items_notify on stock_items;
create trigger stock_items_notify
  after insert or update or delete on stock_items
  for each row execute function notify_household_change();

drop trigger if exists household_members_notify on household_members;
create trigger household_members_notify
  after insert or update or delete on household_members
  for each row execute function notify_household_change();
