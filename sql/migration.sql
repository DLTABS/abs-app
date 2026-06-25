-- =============================================
-- SAVITAX MIGRATION — chạy trong Supabase SQL Editor
-- =============================================

-- 1. Thêm cột vào bảng clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS transferred_to UUID REFERENCES staff(id),
  ADD COLUMN IF NOT EXISTS report_type VARCHAR(10) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(15,0) DEFAULT 0;

-- 2. Bảng lịch sử phí dịch vụ
CREATE TABLE IF NOT EXISTS service_fees (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year       INT NOT NULL,
  month      INT NOT NULL,
  amount     NUMERIC(15,0) NOT NULL DEFAULT 0,
  note       TEXT,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, year, month)
);

-- 3. Bảng ảnh xác nhận công việc
CREATE TABLE IF NOT EXISTS task_attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_record_id UUID NOT NULL REFERENCES task_records(id) ON DELETE CASCADE,
  image_url      TEXT NOT NULL,
  uploaded_by    UUID REFERENCES staff(id),
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Thêm cột applies_to vào task_definitions
ALTER TABLE task_definitions
  ADD COLUMN IF NOT EXISTS applies_to VARCHAR(10) DEFAULT 'monthly';

-- Đánh dấu 5 task hiện có là monthly
UPDATE task_definitions SET applies_to = 'monthly';

-- 5. Thêm 6 task còn thiếu (kiểm tra tránh duplicate)
INSERT INTO task_definitions (name, deadline_day, sort_order, applies_to)
SELECT 'Bảng kê mua vào bán ra', 25, 6, 'monthly'
WHERE NOT EXISTS (SELECT 1 FROM task_definitions WHERE name = 'Bảng kê mua vào bán ra');

INSERT INTO task_definitions (name, deadline_day, sort_order, applies_to)
SELECT 'Kho', 25, 7, 'monthly'
WHERE NOT EXISTS (SELECT 1 FROM task_definitions WHERE name = 'Kho');

INSERT INTO task_definitions (name, deadline_day, sort_order, applies_to)
SELECT 'Công nợ', 25, 8, 'monthly'
WHERE NOT EXISTS (SELECT 1 FROM task_definitions WHERE name = 'Công nợ');

INSERT INTO task_definitions (name, deadline_day, sort_order, applies_to)
SELECT 'Bảng cân đối kế toán', 25, 9, 'monthly'
WHERE NOT EXISTS (SELECT 1 FROM task_definitions WHERE name = 'Bảng cân đối kế toán');

INSERT INTO task_definitions (name, deadline_day, sort_order, applies_to)
SELECT 'Gửi báo cáo thuế khách hàng xác nhận (lần 2)', 25, 10, 'monthly'
WHERE NOT EXISTS (SELECT 1 FROM task_definitions WHERE name LIKE 'Gửi báo cáo thuế khách hàng xác nhận%' AND sort_order = 10);

INSERT INTO task_definitions (name, deadline_day, sort_order, applies_to)
SELECT 'Gửi báo cáo thuế quý', 30, 11, 'quarterly'
WHERE NOT EXISTS (SELECT 1 FROM task_definitions WHERE name = 'Gửi báo cáo thuế quý');

-- 6. Thêm cột phone và is_active vào staff
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 7. Đảm bảo clients có đủ cột mới
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(15,0) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'monthly';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS transferred_to UUID REFERENCES staff(id);

-- 8. Storage bucket cho ảnh (chạy riêng nếu cần)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true)
-- ON CONFLICT DO NOTHING;
