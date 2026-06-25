-- View giúp xem/tìm "client_credentials" theo Mã khách hàng + Tên công ty
-- thay vì chỉ thấy client_id (uuid khó đọc).
-- View này LUÔN tự cập nhật theo bảng clients — không cần đồng bộ tay.
create or replace view client_credentials_readable as
select
  cc.id,
  c.client_code  as ma_khach_hang,
  c.name         as ten_cong_ty,
  cc.category,
  cc.label,
  cc.username,
  cc.password,
  cc.extra,
  cc.note,
  cc.updated_at,
  cc.updated_by,
  cc.client_id,
  cc.sort_order
from client_credentials cc
join clients c on c.id = cc.client_id
order by c.name, cc.category, cc.sort_order;
