-- Sửa lỗi "infinite recursion detected in policy for relation staff"
-- Nguyên nhân: policy cũ trên staff/clients tự truy vấn lại bảng staff để kiểm tra role,
-- gây đệ quy vô hạn và chặn luôn mọi query (kể cả qua anon key).
--
-- Toàn bộ ghi/đọc dữ liệu nhạy cảm trong app này đã đi qua API server-side (service role key,
-- bỏ qua RLS) — RLS ở đây chỉ cần chặn truy cập ẩn danh trực tiếp, không cần logic phân quyền
-- phức tạp theo role. Vì vậy dùng policy "allow tất cả cho user đã đăng nhập" đơn giản,
-- không đệ quy — đúng theo pattern đã dùng cho service_fees, client_change_log, client_credentials.

-- 1) Xóa sạch mọi policy cũ trên 2 bảng (không cần biết tên chính xác)
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename in ('staff', 'clients')
  loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- 2) Tạo lại policy đơn giản, không tham chiếu lại chính bảng staff
alter table staff   enable row level security;
alter table clients enable row level security;

create policy "allow_authenticated_staff" on staff
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "allow_authenticated_clients" on clients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
