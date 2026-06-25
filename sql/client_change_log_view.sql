-- View giúp xem/tìm "client_change_log" theo Mã khách hàng + Tên công ty
-- thay vì chỉ thấy client_id (uuid khó đọc).
-- View này LUÔN tự cập nhật theo bảng clients — không cần đồng bộ tay.
create or replace view client_change_log_readable as
select
  l.id,
  c.client_code  as ma_khach_hang,
  c.name         as ten_cong_ty,
  l.entity,
  l.entity_label,
  l.field,
  l.old_value,
  l.new_value,
  l.action,
  l.changed_at,
  s.full_name    as nguoi_thay_doi,
  l.changed_by,
  l.client_id
from client_change_log l
join clients c on c.id = l.client_id
left join staff s on s.id = l.changed_by
order by l.changed_at desc;
