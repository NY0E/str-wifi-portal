create table house_rules_acceptances (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null,
  door_code_used text not null,
  email text not null,
  marketing_opted_in boolean not null default false,
  guest_ip text,
  user_agent text,
  client_mac text,
  ssid text not null,
  unit_id text not null,
  rules_text_snapshot text not null,
  rules_version text not null,
  accepted_at timestamptz not null default now()
);

create index house_rules_acceptances_reservation_code_idx on house_rules_acceptances (reservation_code);
create index house_rules_acceptances_email_idx on house_rules_acceptances (email);

alter table house_rules_acceptances enable row level security;
-- No policies: only the service role (server-side) can read/write this table.

create table door_code_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text,
  mac text,
  ssid text,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);

create index door_code_attempts_ip_idx on door_code_attempts (ip);
create index door_code_attempts_mac_idx on door_code_attempts (mac);
create index door_code_attempts_created_at_idx on door_code_attempts (created_at);

alter table door_code_attempts enable row level security;
-- No policies: only the service role (server-side) can read/write this table.
