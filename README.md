# App Đại lý thuế ABS — Hệ thống quản lý nội bộ

Quản lý khách hàng · Checklist công việc tháng/quý · Công nợ dịch vụ & phiếu đề nghị thanh toán ·
KPI nhân viên/phòng · Phân quyền theo vai trò. Next.js 16 + Supabase, deploy Vercel.

Đang chạy tại **https://app.dailythueabs.vn**

## Chạy trên máy

```bash
npm ci
cp .env.example .env.local   # rồi điền khoá Supabase của ABS
npm run dev -- --port 3002   # http://localhost:3002
```

## Triển khai lần đầu (dựng bản mới)

1. Supabase mới (region Singapore) → chạy SQL theo thứ tự ở `BAN-GIAO.md` mục B6.
2. Tạo 2 Storage bucket **private**: `client-files`, `db-backups`.
3. Vercel: import repo, khai biến môi trường theo `.env.example`, region `sin1` (đã có trong
   `vercel.json`), gắn tên miền.
4. Đổi thông tin pháp lý/ngân hàng trong `app/api/admin/dntt/route.js` và
   `app/api/admin/contract/route.js` — **số tài khoản trong mã QR nằm trong code**.

Nhân bản app này cho đơn vị khác: `docs/clone-app-checklist.md` (kèm 15 bẫy đã dính thật).

## Tài liệu

| File | Nội dung |
|---|---|
| `BAN-GIAO.md` | Bàn giao: hướng dẫn vận hành, hạ tầng, backup/khôi phục, việc còn treo |
| `AGENTS.md` | Quy ước nghiệp vụ & code — đọc trước khi sửa code |
| `docs/clone-app-checklist.md` | Nhân bản app cho đơn vị mới + đồng bộ fix từ app gốc |
