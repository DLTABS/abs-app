-- Hệ thống vai trò & phân quyền linh hoạt — admin tự tạo vai trò mới và
-- tích chọn quyền, không cần sửa code mỗi khi cần vai trò/quyền khác nhau.

create table if not exists roles (
  id         text primary key,          -- slug, VD: 'admin', 'leader', 'staff', 'ketoan_truong'
  label      text not null,
  is_system  boolean not null default false,  -- true = luôn có TOÀN BỘ quyền (vai trò admin), không thể xóa
  created_at timestamptz default now()
);

create table if not exists permissions (
  key        text primary key,          -- VD: 'manage_staff'
  label      text not null,
  group_name text
);

create table if not exists role_permissions (
  role_id        text not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
drop policy if exists "allow_authenticated_roles" on roles;
drop policy if exists "allow_authenticated_permissions" on permissions;
drop policy if exists "allow_authenticated_role_permissions" on role_permissions;
create policy "allow_authenticated_roles" on roles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "allow_authenticated_permissions" on permissions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "allow_authenticated_role_permissions" on role_permissions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Khởi tạo 4 vai trò hiện có (giữ đúng hành vi cũ)
insert into roles (id, label, is_system) values
  ('admin',  'Quản trị',        true),
  ('leader', 'Trưởng phòng',    false),
  ('staff',  'Nhân viên',       false),
  ('collab', 'Cộng tác viên',   false)
on conflict (id) do nothing;

-- Danh mục quyền theo từng chức năng trong app
insert into permissions (key, label, group_name) values
  ('manage_staff',              'Quản lý nhân viên (thêm/sửa/đặt lại mật khẩu)', 'Quản trị'),
  ('manage_clients',            'Quản lý khách hàng',                            'Quản trị'),
  ('manage_rooms',               'Quản lý phòng ban',                            'Quản trị'),
  ('manage_checklist_template', 'Quản lý checklist mẫu',                        'Quản trị'),
  ('manage_roles',              'Quản lý vai trò & phân quyền',                  'Quản trị'),
  ('manage_database',           'Cài đặt Database',                             'Quản trị'),
  ('view_all_debt',             'Xem công nợ toàn công ty',                      'Báo cáo'),
  ('view_kpi_report',           'Xem báo cáo KPI',                               'Báo cáo'),
  ('view_all_rooms',            'Xem & quản lý tất cả phòng nghiệp vụ',          'Phòng nghiệp vụ')
on conflict (key) do nothing;

-- Gán quyền mặc định cho vai trò Trưởng phòng (đúng hành vi hiện có trước đây)
insert into role_permissions (role_id, permission_key)
select 'leader', key from permissions
where key in ('manage_staff', 'manage_clients', 'view_kpi_report', 'view_all_rooms')
on conflict do nothing;
