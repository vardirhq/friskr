alter table stock_items
  add constraint stock_items_quantity_positive
  check (quantity > 0 and quantity <= 9999);

alter table stock_items
  add constraint stock_items_price_nonnegative
  check (price_nok is null or (price_nok >= 0 and price_nok <= 1000000));

alter table stock_items
  add constraint stock_items_status_valid
  check (status in ('in_stock', 'used_up', 'discarded'));

alter table shopping_list_items
  add constraint shopping_list_items_qty_positive
  check (qty > 0 and qty <= 9999);

alter table household_members
  add constraint household_members_role_valid
  check (role in ('owner', 'member'));
