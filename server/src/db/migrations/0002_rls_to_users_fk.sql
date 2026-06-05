-- Re-point household_members.user_id from auth.users to users.
-- Run AFTER migrating existing auth.users rows into users.
-- If starting fresh (no existing Supabase data), this is safe to run as-is.

alter table household_members
  drop constraint if exists household_members_user_id_fkey;

alter table household_members
  add constraint household_members_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;

-- Also fix stock_items.added_by if it references auth.users
alter table stock_items
  drop constraint if exists stock_items_added_by_fkey;

alter table stock_items
  add constraint stock_items_added_by_fkey
  foreign key (added_by) references users(id);
