-- Theo dõi nợ tồn tự động phát sinh khi một tháng thu thiếu phí kế toán.
-- Chạy 1 lần trong Supabase SQL Editor.

create table if not exists debt_rollovers (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients(id) on delete cascade,
  year             int not null,
  month            int not null,
  rolled_amount    numeric not null default 0,
  remaining_amount numeric not null default 0,
  created_at       timestamptz default now(),
  unique (client_id, year, month)
);

create index if not exists idx_debt_rollovers_client on debt_rollovers (client_id);
