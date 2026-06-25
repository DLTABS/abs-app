-- Thêm cột is_active cho bảng staff (đang thiếu, khiến "Vô hiệu hóa nhân viên" không lưu được)
alter table staff add column if not exists is_active boolean not null default true;
