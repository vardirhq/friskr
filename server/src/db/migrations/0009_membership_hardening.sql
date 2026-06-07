create unique index if not exists household_members_user_unique_idx
  on household_members (user_id);

create index if not exists household_members_household_user_idx
  on household_members (household_id, user_id);

create index if not exists refresh_tokens_user_active_idx
  on refresh_tokens (user_id, revoked, expires_at);

create index if not exists otp_codes_user_active_idx
  on otp_codes (user_id, used, expires_at);
