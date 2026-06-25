-- Cho phép 1 công ty có thêm "nhân viên phụ" (ngoài nhân viên chính ở clients.assigned_to),
-- có thể ở phòng khác. Nhân viên phụ thấy & theo dõi được công ty này (công việc, thông tin,
-- công nợ) trong giao diện của họ, nhưng doanh thu/công nợ vẫn chỉ tính cho nhân viên chính
-- và phòng của nhân viên chính — tránh cộng trùng số liệu báo cáo tổng.
create table if not exists client_secondary_staff (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  staff_id   uuid not null references staff(id) on delete cascade,
  added_by   uuid references staff(id),
  created_at timestamptz default now(),
  unique (client_id, staff_id)
);

create index if not exists idx_css_client on client_secondary_staff(client_id);
create index if not exists idx_css_staff  on client_secondary_staff(staff_id);

alter table client_secondary_staff enable row level security;
drop policy if exists "allow_authenticated_client_secondary_staff" on client_secondary_staff;
create policy "allow_authenticated_client_secondary_staff" on client_secondary_staff
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
