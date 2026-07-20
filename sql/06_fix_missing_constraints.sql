-- Bổ sung UNIQUE constraint + bảng còn thiếu do sql/00_bootstrap_core_tables.sql dựng qua
-- OpenAPI spec không lấy được UNIQUE constraint (đã ghi chú sẵn ở đầu file đó). Phát hiện khi
-- test tick việc ở checklist bị lỗi "there is no unique or exclusion constraint matching the
-- ON CONFLICT specification" — rà thêm thì thấy service_fees và fee_collections cũng thiếu.
-- An toàn chạy nhiều lần (idempotent).

-- ── TASK_RECORDS: cần cho tick hoàn thành việc (app/api/admin/task-toggle) ──────────────
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_records_client_task_year_month_key'
  ) then
    alter table task_records add constraint task_records_client_task_year_month_key
      unique (client_id, task_def_id, year, month);
  end if;
end $$;

-- ── SERVICE_FEES: cần cho ghi phí ban đầu khi thêm công ty + lịch sử đổi phí (fee_plan) +
-- ĐNTT (ketoan/khach). 4 cột vì 1 công ty có thể có nhiều type khác nhau cùng kỳ (AGENTS.md:
-- ketoan/khach/fee_plan tồn tại song song, không ghi đè nhau).
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_fees_client_year_month_type_key'
  ) then
    alter table service_fees add constraint service_fees_client_year_month_type_key
      unique (client_id, year, month, type);
  end if;
end $$;

-- ── FEE_COLLECTIONS: bảng chưa tồn tại — dùng ở app/clients/page.js (ghi nhận thu phí nhanh
-- theo tháng ngay tại trang Danh sách công ty).
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
drop policy if exists "allow_authenticated_fee_collections" on fee_collections;
create policy "allow_authenticated_fee_collections" on fee_collections
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all privileges on fee_collections to service_role, authenticated;
grant select on fee_collections to anon;
