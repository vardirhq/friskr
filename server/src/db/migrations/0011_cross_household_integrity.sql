-- Cross-household referential integrity for stock_items.
--
-- A stock item must reference a product and a location that belong either to the
-- same household or to no household at all (global/shared rows). A composite FK
-- can't express "NULL household is allowed" without breaking global rows, so we
-- enforce it with a trigger instead.

create or replace function enforce_stock_item_household()
returns trigger as $$
declare
  product_household uuid;
  location_household uuid;
begin
  select household_id into product_household from products where id = new.product_id;
  if product_household is not null and product_household <> new.household_id then
    raise exception 'stock_items.product_id % belongs to a different household', new.product_id
      using errcode = 'check_violation';
  end if;

  select household_id into location_household from locations where id = new.location_id;
  if location_household is not null and location_household <> new.household_id then
    raise exception 'stock_items.location_id % belongs to a different household', new.location_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists stock_items_household_guard on stock_items;
create trigger stock_items_household_guard
  before insert or update of household_id, product_id, location_id on stock_items
  for each row execute function enforce_stock_item_household();
