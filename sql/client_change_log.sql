-- Lịch sử thay đổi thông tin công ty (credentials + phí dịch vụ hàng tháng)
create table if not exists client_change_log (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  entity       text not null,              -- 'credential' | 'monthly_fee'
  entity_label text,                       -- VD: "TK ngân hàng — Vietcombank"
  field        text,                       -- VD: 'password', 'monthly_fee'
  old_value    text,
  new_value    text,
  action       text not null default 'update', -- 'create' | 'update' | 'delete'
  changed_by   uuid references staff(id),
  changed_at   timestamptz default now()
);

create index if not exists idx_client_change_log_client on client_change_log(client_id, changed_at desc);

alter table client_change_log enable row level security;
drop policy if exists "allow_all_client_change_log" on client_change_log;
create policy "allow_all_client_change_log" on client_change_log
  for all using (true) with check (true);
