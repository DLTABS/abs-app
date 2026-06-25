-- =============================================
-- SAVITAX APP - Full Schema Migration
-- Safe to run multiple times (idempotent)
-- =============================================

-- ── CLIENTS table ─────────────────────────────
alter table clients add column if not exists status       text    default 'active';
alter table clients add column if not exists is_active    boolean default true;
alter table clients add column if not exists report_type  text    default 'monthly';
alter table clients add column if not exists monthly_fee  numeric default 0;
alter table clients add column if not exists fee_period   text    default 'monthly';
alter table clients add column if not exists address      text;
alter table clients add column if not exists tax_status   text;
alter table clients add column if not exists assigned_to  uuid    references auth.users(id);
alter table clients add column if not exists transferred_to uuid;

alter table clients add column if not exists other_debt   numeric default 0;
alter table clients add column if not exists client_code    text;
alter table clients add column if not exists representative text; -- Người đại diện / Giám đốc

-- Backfill nulls
update clients set status      = 'active'  where status      is null;
update clients set is_active   = true      where is_active   is null;
update clients set report_type = 'monthly' where report_type is null;
update clients set monthly_fee = 0         where monthly_fee is null;
update clients set fee_period  = 'monthly' where fee_period  is null;

-- ── STAFF table ────────────────────────────────
alter table staff add column if not exists role    text default 'staff';
alter table staff add column if not exists room_id uuid references rooms(id);

-- Set admin role
update staff
set role = 'admin'
where id = (select id from auth.users where email = 'admin@savitax.vn')
  and (role is null or role = 'staff');

-- ── SERVICE_FEES table ─────────────────────────
create table if not exists service_fees (
  id         uuid        primary key default gen_random_uuid(),
  client_id  uuid        not null references clients(id) on delete cascade,
  year       int         not null,
  month      int         not null,
  amount     numeric     not null default 0,
  note       text,
  created_by uuid,
  created_at timestamptz default now(),
  unique(client_id, year, month)
);

-- RLS
alter table service_fees enable row level security;
drop policy if exists "allow_all_service_fees" on service_fees;
create policy "allow_all_service_fees" on service_fees
  for all using (true) with check (true);

-- ── FEE_COLLECTIONS table ──────────────────────
create table if not exists fee_collections (
  id           uuid        primary key default gen_random_uuid(),
  client_id    uuid        not null references clients(id) on delete cascade,
  year         int         not null,
  month        int         not null,
  amount       numeric     not null default 0,
  note         text,
  collected_by uuid,
  collected_at timestamptz default now(),
  unique(client_id, year, month)
);

alter table fee_collections enable row level security;
drop policy if exists "allow_all_fee_collections" on fee_collections;
create policy "allow_all_fee_collections" on fee_collections
  for all using (true) with check (true);

-- ── TASK_DEFINITIONS ──────────────────────────
alter table task_definitions add column if not exists applies_to  text default 'monthly';
alter table task_definitions add column if not exists report_type text default 'monthly';
alter table task_definitions add column if not exists is_active   boolean default true;
alter table task_definitions add column if not exists description text;
alter table task_definitions add column if not exists month       int; -- 1-12, NULL = every month

-- ── TASK_RECORDS ──────────────────────────────
alter table task_records add column if not exists note text;
-- Add unique constraint for upsert (safe to run if already exists)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_records_client_task_year_month_key'
  ) then
    alter table task_records add constraint task_records_client_task_year_month_key
      unique (client_id, task_def_id, year, month);
  end if;
end $$;
-- RLS for task_records
alter table task_records enable row level security;
drop policy if exists "allow_all_task_records" on task_records;
create policy "allow_all_task_records" on task_records for all using (true) with check (true);

-- ── DEBT_RECORDS table (if not exists) ─────────
create table if not exists debt_records (
  id                uuid        primary key default gen_random_uuid(),
  client_id         uuid        not null references clients(id) on delete cascade,
  year              int         not null,
  month             int         not null,
  amount_billed     numeric     default 0,
  amount_collected  numeric     default 0,
  note              text,
  created_by        uuid,
  updated_at        timestamptz default now(),
  unique(client_id, year, month)
);

alter table debt_records enable row level security;
drop policy if exists "allow_all_debt_records" on debt_records;
create policy "allow_all_debt_records" on debt_records
  for all using (true) with check (true);
