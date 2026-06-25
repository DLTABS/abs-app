-- Thêm cột phone cho bảng staff (đang thiếu, khiến SĐT nhập khi tạo nhân viên bị mất)
alter table staff add column if not exists phone text;
