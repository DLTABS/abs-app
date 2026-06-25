-- Dọn cảnh báo "Security Definer view" — chuyển 2 view sang security_invoker = true
-- (view sẽ chạy với quyền của người truy vấn thay vì quyền người tạo view)
alter view client_credentials_readable set (security_invoker = true);
alter view client_change_log_readable  set (security_invoker = true);
