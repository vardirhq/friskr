-- Users table (replaces Supabase auth.users)
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists otp_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  code       text not null,
  expires_at timestamptz not null,
  used       boolean not null default false
);

create table if not exists refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token      text not null unique,
  expires_at timestamptz not null,
  revoked    boolean not null default false
);
