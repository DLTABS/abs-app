# Bàn giao hệ thống Đại lý thuế ABS — app.dailythueabs.vn

> Ngày lập: **2026-11-20**. Phiên bản code: nhánh `main` trên https://github.com/DLTABS/abs-app.
> Tài liệu này gồm 3 phần: **A. Vận hành** (cho người dùng/quản trị ABS) — **B. Kỹ thuật**
> (cho người tiếp quản code & hạ tầng) — **C. Trạng thái bàn giao** (số liệu, việc còn treo,
> checklist chuyển quyền sở hữu).
>
> Tài liệu liên quan trong repo:
> - `README.md` — tóm tắt, cách chạy, cách triển khai lần đầu.
> - `AGENTS.md` — quy ước nghiệp vụ & code, đọc trước khi sửa code.
> - `docs/clone-app-checklist.md` — cách nhân bản app này cho đơn vị khác + 15 bẫy đã dính thật.

---

## Gói bàn giao

Tạo bằng script sẵn có (chạy trên máy đang giữ app):

```
powershell -ExecutionPolicy Bypass -File scripts\dong-goi-ban-giao.ps1
```

Ra **2 file zip** ở thư mục cha của folder app (mặc định `D:\`):

1. **`abs-app-ma-nguon-<ngày>.zip`** — mã nguồn + lịch sử git (để tiếp tục `git push`).
   Không có `node_modules`/`.next` (cài lại bằng `npm ci`), **không có khoá** → chuyển qua kênh
   nào cũng được. Script tự soát lại, lẫn khoá là hủy gói và báo lỗi.
2. **`abs-app-BI-MAT-<ngày>.zip`** — `.env.local` (khoá Supabase toàn quyền + `CRON_SECRET`) kèm
   `DOC-KY.txt` hướng dẫn. **Chỉ chuyển bằng USB / trao tay**, không gửi email, Zalo, chat.
   Chép xong thì xóa file zip khỏi máy trung gian.

Script cũng cảnh báo nếu còn thay đổi chưa commit hoặc commit chưa push.

---

## Tóm tắt 1 phút

| Hạng mục | Giá trị |
|---|---|
| App chạy tại | https://app.dailythueabs.vn (Vercel, region Singapore) |
| Mã nguồn | https://github.com/DLTABS/abs-app, nhánh `main` — push là tự deploy (~1-2 phút) |
| Database | Supabase (Postgres + Auth + Storage), project ref `nqerqxmqplyszhfggrqm`, region Singapore |
| Tài khoản quản trị | `admin@dailythueabs.vn` (vai trò `admin`, toàn quyền) |
| Backup | Tự động **19:00 thứ Sáu hằng tuần**, lưu 8 tuần gần nhất trong Supabase Storage |
| Khôi phục | `node scripts/restore-backup.mjs` (xem mục B7) |
| Đang dùng thật | 96 công ty, 21 nhân viên, 1 phòng nghiệp vụ |

---

# PHẦN A — VẬN HÀNH

## A1. Đăng nhập & mật khẩu

- Vào https://app.dailythueabs.vn, đăng nhập bằng **email + mật khẩu** do quản trị cấp.
- Tự đổi mật khẩu: bấm tên mình ở đầu thanh menu bên trái → **Đổi mật khẩu**.
- Quên mật khẩu: **không có** chức năng tự gửi mail đặt lại. Nhân viên báo quản trị,
  quản trị vào **Quản lý nhân viên → Đặt lại MK** (mục A4).

## A2. Vai trò và ai thấy được gì

Hệ thống đang có 3 vai trò (sửa tại **Vai trò & phân quyền**):

| Vai trò | Mã | Ghi chú |
|---|---|---|
| Quản trị viên | `admin` | Vai trò hệ thống — **luôn toàn quyền**, không cần gán quyền lẻ |
| Kế toán trưởng | `ke_toan_truong` | Hiện được gán 4 quyền (xem bảng dưới) |
| Kế toán viên | `ke_toan_vien` | Không gán quyền quản trị — chỉ làm việc trên công ty mình phụ trách |

9 quyền có thể gán, và hiện trạng:

| Quyền | Ý nghĩa | Kế toán trưởng | Kế toán viên |
|---|---|---|---|
| `manage_staff` | Quản lý nhân viên (thêm/sửa/đặt lại mật khẩu) | ✅ | — |
| `manage_clients` | Quản lý khách hàng | ✅ | — |
| `view_kpi_report` | Xem báo cáo KPI | ✅ | — |
| `view_all_rooms` | Xem & quản lý tất cả phòng nghiệp vụ | ✅ | — |
| `manage_rooms` | Quản lý phòng ban | — | — |
| `manage_checklist_template` | Quản lý checklist mẫu | — | — |
| `manage_roles` | Quản lý vai trò & phân quyền | — | — |
| `manage_database` | Cài đặt Database | — | — |
| `view_all_debt` | Xem công nợ toàn công ty | — | — |

Thay đổi phân quyền: **Vai trò & phân quyền** → tick/bỏ tick → lưu. Có hiệu lực ngay khi
người đó tải lại trang (quyền được nhớ tạm trong trình duyệt).

**Nhân viên chính và nhân viên phụ của một công ty:**
- **Nhân viên chính** (1 người): toàn quyền trên công ty đó, **doanh thu tính cho người này
  và phòng của họ**.
- **Nhân viên phụ** (nhiều người): chỉ theo dõi/cùng làm, **KHÔNG cộng doanh thu** cho ai.

## A3. Các trang trong app

Mọi người đều thấy:

| Trang | Dùng để |
|---|---|
| 🏠 Trang chủ | Tổng quan: việc tới hạn, tỉ lệ hoàn thành, nhân viên xuất sắc |
| 🏢 Danh sách công ty | Danh sách khách hàng mình phụ trách, mở ra xem/sửa chi tiết, đính kèm file |
| 📋 Checklist công việc | Tick việc đã làm theo từng công ty, từng tháng |
| 💰 Quản lý công nợ | Phí dịch vụ phải thu / đã thu của công ty mình phụ trách, xuất phiếu ĐNTT |

Thêm cho người có quyền tương ứng:

| Trang | Cần quyền |
|---|---|
| 📔 Nhật ký làm việc | `manage_staff` / `manage_clients` / `view_all_rooms` |
| 📊 Báo cáo KPI | `view_kpi_report` |
| 👥 Nhân viên ABS | `manage_staff` |
| 🏛️ Quản lý phòng ban | `manage_rooms` |
| 👤 Quản lý nhân viên | `manage_staff` |
| 💼 Quản lý khách hàng | `manage_clients` |
| 📋 Checklist mẫu | `manage_checklist_template` |
| 💵 Công nợ toàn công ty | `view_all_debt` |
| 🔑 Vai trò & phân quyền | `manage_roles` |
| 💾 Backup dữ liệu | `manage_database` |
| 🗄️ Cài đặt Database | `manage_database` |

## A4. Quản trị nhân viên

**Thêm nhân viên** — vào **Quản lý nhân viên → Thêm nhân viên**, điền họ tên, email, mật khẩu
tạm, vai trò, phòng. App tự tạo tài khoản đăng nhập cùng lúc với hồ sơ nhân viên.

> ⚠️ **Tuyệt đối không thêm nhân viên bằng cách chèn dòng thẳng vào bảng `staff` trên
> Supabase.** Làm vậy chỉ có hồ sơ mà **không có tài khoản đăng nhập** → người đó không
> đăng nhập được. (Đã xảy ra thật 2 lần.) Nếu đã lỡ: bấm **Đặt lại MK** cho người đó, app
> sẽ tự cấp tài khoản đăng nhập theo đúng mã nhân viên cũ, không mất dữ liệu nào.

**Đặt lại mật khẩu** — **Quản lý nhân viên → Đặt lại MK** → nhập mật khẩu mới (tối thiểu 6 ký
tự) → Xác nhận. Thông báo xanh hiện ngay dưới dòng nhân viên đó. Chỉ Quản trị viên thấy nút này.

**Khóa nhân viên nghỉ việc** — bấm **Vô hiệu hóa** (không xóa). Người đó không đăng nhập được
nữa nhưng **dữ liệu công việc và doanh thu cũ vẫn còn nguyên** trong báo cáo. Chỉ **Xóa** khi
nhân viên tạo sai và chưa có dữ liệu gì.

**Chuyển công ty sang nhân viên khác** — vào **Quản lý khách hàng** (hoặc chi tiết công ty) đổi
nhân viên chính. Doanh thu các tháng trước vẫn thuộc nhân viên cũ.

## A5. Khách hàng & checklist

- **Thêm công ty**: Danh sách công ty → Thêm. Nhập MST có nút tra cứu tự động tên/địa chỉ.
  Chọn **loại báo cáo** `Tháng` hoặc `Quý` — đây là cái quyết định công ty đó nhận bộ checklist nào.
- **Checklist mẫu** (trang 📋 Checklist mẫu) là bộ việc dùng chung: mỗi `loại báo cáo` + `tháng`
  có bộ việc riêng, kèm **ngày hạn**. Sửa checklist mẫu **tự áp dụng cho mọi công ty cùng loại
  báo cáo**, không phải sửa từng công ty.
- Việc chỉ chuyển sang **"Quá hạn"** sau khi **qua hết ngày hạn** (0h ngày kế tiếp). Ngày hạn
  lớn hơn số ngày của tháng sẽ tự lùi về ngày cuối tháng (ví dụ ngày 30 ở tháng 2 → 28/29).
- File đính kèm của công ty lưu trong Supabase Storage, tải lên/tải về ngay tại chi tiết công ty.

## A6. Công nợ & phiếu Đề nghị thanh toán (ĐNTT)

- Phí dịch vụ của mỗi công ty ghi theo **tháng**. Có 3 loại:
  `ketoan` (phí dịch vụ kế toán chính) — `khach` (phí thu khác) — `fee_plan` (lịch sử đổi mức
  phí, **không phải tiền đã thu**).
- Thu thiếu trong tháng sẽ tự sinh dòng **nợ tồn** chuyển sang tháng sau. Khi thu nợ tồn, tiền
  được trừ song song vào dòng nợ của **tháng gốc**.
- **Phiếu ĐNTT** (mã `ABS.MB13`) xuất từ trang công nợ — có **mã QR chuyển khoản** trỏ về
  Vietcombank **0351001043923 — ABS GROUP**. ⚠️ Nếu ABS đổi số tài khoản thì **bắt buộc** sửa
  trong `app/api/admin/dntt/route.js` (số tài khoản nằm trong code, không có màn hình cấu hình).
- Trang **Công nợ toàn công ty** (cần `view_all_debt`) có 4 thẻ tổng quan + thẻ "Phí thu khác",
  bấm vào mở bảng chi tiết.

## A7. KPI

Cách tính (đã chốt, đừng tự đổi khi chưa trao đổi):
- % của **một công ty** → trung bình cộng theo **nhân viên** → trung bình cộng theo **phòng**.
- Hiển thị **2 chỉ số riêng** (% hoàn thành công việc và % thu hồi công nợ), **không** gộp
  thành một điểm KPI chung.
- Chỉ nhân viên có công ty phụ trách và không có quyền quản trị mới được xếp hạng
  "Nhân viên xuất sắc nhất".

## A8. Những việc KHÔNG nên làm

1. Thêm/sửa nhân viên, công ty trực tiếp trong Supabase thay vì qua app (mục A4).
2. Xóa cứng việc trong checklist mẫu — hãy để app tự đánh dấu ngừng dùng, vì các tháng cũ còn
   tham chiếu tới. Xóa cứng sẽ làm lỗi dữ liệu cũ.
3. Xóa nhân viên đã có dữ liệu — dùng **Vô hiệu hóa**.
4. Đổi số tài khoản ngân hàng mà chỉ sửa trên giấy tờ, quên sửa QR trong app (mục A6).
5. Để dữ liệu test lẫn vào dữ liệu thật — xóa ngay sau khi thử.

---

# PHẦN B — KỸ THUẬT

## B1. Hạ tầng & quyền sở hữu

| Thành phần | Chi tiết | Ai đang sở hữu |
|---|---|---|
| Mã nguồn | GitHub `DLTABS/abs-app`, nhánh `main` | tổ chức GitHub `DLTABS` |
| Hosting | Vercel project `abs-app`, team "dltabs' projects" (gói Hobby), region `sin1` | tài khoản Vercel của DLTABS |
| Database/Auth/Storage | Supabase project ref `nqerqxmqplyszhfggrqm`, region Singapore, **gói Free** | tài khoản Supabase của DLTABS |
| Tên miền | `app.dailythueabs.vn` → CNAME `app` → `8aac719dbaf68b41.vercel-dns-017.com.` | nhà cung cấp DNS của dailythueabs.vn |

Hạ tầng **tách biệt hoàn toàn** với app.savitax.vn — không dùng chung tài khoản, database,
bucket hay domain nào.

⚠️ **Supabase gói Free tự tạm dừng (pause) sau ~1 tuần không có truy cập.** Dấu hiệu: đăng nhập
báo "Email hoặc mật khẩu không đúng" dù mật khẩu đúng. Xử lý: vào Supabase Dashboard bấm
**Resume project** (không mất dữ liệu). Nâng lên gói Pro sẽ hết hiện tượng này.

## B2. Biến môi trường

Khai báo ở 2 nơi: file `.env.local` (máy dev, **không commit**) và Vercel → Settings →
Environment Variables (production). Đổi giá trị trên Vercel **phải redeploy** mới có hiệu lực.

| Biến | Dùng để | Lấy ở đâu |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Địa chỉ Supabase project | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Khóa công khai, chỉ để kiểm tra phiên đăng nhập ở trình duyệt | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa **bí mật**, mọi đọc/ghi nghiệp vụ phía server | Supabase → Settings → API |
| `CRON_SECRET` | Chuỗi bí mật bảo vệ `/api/cron/backup` | tự sinh, phải khớp giữa Vercel và lúc gọi tay |
| `SUPABASE_DB_URL` | Chuỗi kết nối Postgres trực tiếp | Supabase → Settings → Database (**không dùng được từ máy dev vì project chỉ có IPv6**) |

**Giá trị thật của các khóa này không ghi trong repo** và không nằm trong tài liệu này — lấy
từ Supabase Dashboard hoặc từ Vercel env vars.

## B3. Dựng máy mới & chạy local

**Dựng máy của người tiếp quản (làm một lần):**

1. Cài **Node.js LTS** bản 20.9 trở lên (khuyên 22 hoặc 24): https://nodejs.org
2. Cài **Git for Windows**: https://git-scm.com/download/win (để mặc định, có Git Credential
   Manager).
3. Giải nén gói mã nguồn, ví dụ ra `D:\abs-app`.
4. Từ gói bí mật: chép `.env.local` vào `D:\abs-app\` (cạnh `package.json`).
5. Mở PowerShell tại `D:\abs-app`:
   ```bash
   npm ci
   npm run dev -- --port 3002
   ```
   Mở http://localhost:3002 và đăng nhập thử. Chạy trên máy sẽ chậm hơn bản online vì mỗi lượt
   đọc dữ liệu phải đi sang Singapore — bình thường.
6. Lần đầu `git push`, Windows bật cửa sổ đăng nhập GitHub → đăng nhập bằng tài khoản có quyền
   ghi repo `DLTABS/abs-app`.

**Hằng ngày:** sửa code → `npm run build` (kiểm tra sạch) → `git commit` → `git push`. Có thể
dùng cấu hình `abs-dev` trong `.claude/launch.json` thay cho lệnh `npm run dev` dài.

Nếu dev server bỗng trả 404 cho API route đang có thật → xóa thư mục `.next` rồi chạy lại (cache
Turbopack hỏng, đã gặp).

## B4. Deploy

Push lên `main` là Vercel tự build & deploy ra `app.dailythueabs.vn`, khoảng 1-2 phút, không
cần thao tác gì thêm.

```bash
npm run build          # luôn build sạch trước khi push
git push origin main
```

## B5. Cấu trúc & quy ước code

- **Next.js 16 App Router, React 19, JavaScript thuần (không TypeScript), Tailwind.**
- **Mọi đọc/ghi dữ liệu nghiệp vụ đi qua API route** trong `app/api/admin/**/route.js`, dùng
  `SUPABASE_SERVICE_ROLE_KEY` (bỏ qua RLS). Trình duyệt chỉ dùng anon key (`lib/supabase.js`)
  để kiểm tra phiên đăng nhập — **không** đọc/ghi nghiệp vụ trực tiếp từ trình duyệt.
- **Phân quyền**: bảng `roles` / `permissions` / `role_permissions`, helper `lib/permissions.js`
  (`loadPermissionData()`, `can(role, key, data)`, `hasPermission(role, key)`). Trang/API mới
  **phải gate bằng quyền**, tuyệt đối không viết cứng mã vai trò kiểu `role === 'staff'` —
  đơn vị khác đặt tên vai trò khác là logic chết lặng lẽ (đã dính thật ở ô "Nhân viên xuất sắc").
- **PostgREST âm thầm cắt query ở 1000 dòng.** Mọi truy vấn không giới hạn theo phòng/tháng
  (gộp toàn công ty: `kpi-overview`, `work-log`, `room`, `debt-overview`, `debtRollover`,
  backup...) **phải** phân trang bằng `fetchAllRows()` / `.range()`, kể cả khi hiện tại chưa tới
  1000 dòng.
- **File đính kèm** lưu bucket `client-files`; key phải encode **base64url** (dùng
  `encodeURIComponent` thường vẫn bị từ chối với tên file tiếng Việt/có khoảng trắng).
- Thư mục: `app/` (trang + API), `components/` (AppShell, Sidebar, ClientChecklist,
  NotificationBell), `lib/` (supabase, serverAuth, permissions, feeDue...), `sql/` (migration),
  `scripts/` (tiện ích chạy tay), `templates/` (file Word mẫu), `docs/`.

## B6. Database & migration

17 bảng/view, quan trọng nhất: `clients`, `staff`, `rooms`, `roles`/`permissions`/
`role_permissions`, `task_definitions`/`task_records`, `service_fees`/`fee_collections`/
`debt_rollovers`, `client_secondary_staff`, `client_credentials`, `client_change_log`.
(`debt_records` là bảng tồn dư của lần migrate đầu, rỗng, không còn dùng.)

**Quy trình thêm/sửa schema** — máy dev **không kết nối Postgres trực tiếp được** (project chỉ
có IPv6), nên:
1. Viết file `.sql` mới vào `sql/`, viết idempotent (chạy lại nhiều lần không lỗi).
2. Mở Supabase → SQL Editor → dán nội dung → chạy tay.
3. Commit file SQL cùng code dùng nó.

Thứ tự dựng lại từ đầu (nếu phải tạo project Supabase mới):
`sql/00_bootstrap_core_tables.sql` → `sql/roles_permissions.sql` → các file `add_*.sql` /
`*_view.sql` → `sql/05_grants.sql` → `sql/06_fix_missing_constraints.sql`.

> ⚠️ `00_bootstrap_core_tables.sql` được sinh từ OpenAPI spec nên **không có** UNIQUE constraint,
> CHECK constraint, index phụ, trigger. Sau khi bootstrap **phải** chạy
> `06_fix_missing_constraints.sql` và rà lại mọi `onConflict:` trong code
> (`grep -rn "onConflict:" app lib components`) — thiếu constraint thì tick việc/ghi phí **fail
> âm thầm** không báo lỗi.

Bảng tạo qua SQL Editor **không tự có quyền** cho `anon`/`authenticated`/`service_role` —
thiếu `05_grants.sql` thì ngay cả service role cũng bị "permission denied".

## B7. Backup & khôi phục

**Backup tự động** — `app/api/cron/backup/route.js`, chạy qua Vercel Cron theo `vercel.json`:
`0 19 * * 5` (**19:00 UTC thứ Sáu**). Đọc toàn bộ 14 bảng nghiệp vụ (có phân trang), gộp thành
1 file JSON `backup-YYYY-MM-DD.json`, lưu vào Supabase Storage bucket **`db-backups`** (private),
tự xóa bản cũ hơn **8 tuần**. Xem danh sách bản backup ngay trên app: **💾 Backup dữ liệu**.

Gọi tay để kiểm tra:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://app.dailythueabs.vn/api/cron/backup
```

**Khôi phục** — `scripts/restore-backup.mjs` (chạy từ máy dev, cần `.env.local`):
```bash
node scripts/restore-backup.mjs                             # liệt kê các bản backup có sẵn
node scripts/restore-backup.mjs backup-2026-11-13.json      # XEM TRƯỚC: so dòng backup vs database
node scripts/restore-backup.mjs backup-2026-11-13.json --only=task_records
node scripts/restore-backup.mjs backup-2026-11-13.json --confirm   # GHI THẬT
```
Script ghi theo kiểu **upsert theo khóa chính, không xóa dòng nào**, theo đúng thứ tự khóa ngoại
(bảng cha trước bảng con). Nghĩa là:
- dòng bị mất hoặc bị sửa sai sau thời điểm backup → **được ghi lại đúng như lúc backup**;
- dòng tạo mới sau thời điểm backup → **vẫn còn nguyên**.

Nên đây là "lấp lại dữ liệu đã mất", **không phải** quay database về đúng trạng thái lúc backup.
Muốn về đúng trạng thái đó thì phải xóa tay phần phát sinh sau — cân nhắc rất kỹ.

**Những thứ file backup KHÔNG chứa** (phải xử lý riêng):

| Không có trong backup | Cách xử lý khi mất |
|---|---|
| Tài khoản đăng nhập (Supabase Auth) | Quản lý nhân viên → **Đặt lại MK**: app tự cấp lại tài khoản theo đúng mã nhân viên cũ |
| File đính kèm công ty (bucket `client-files`) | Không có bản sao — cân nhắc bật backup Storage nếu dữ liệu này quan trọng |
| Cấu trúc bảng, RLS, constraint, trigger | Dựng lại bằng các file trong `sql/` theo thứ tự ở mục B6 |

## B8. Sự cố thường gặp

| Hiện tượng | Nguyên nhân thật | Cách xử lý |
|---|---|---|
| Đăng nhập báo sai mật khẩu dù chắc chắn đúng | Supabase Free **tự pause** | Supabase Dashboard → Resume project |
| Tick việc / ghi phí không ăn, không báo lỗi | Thiếu UNIQUE constraint cho `onConflict` | Chạy `sql/06_fix_missing_constraints.sql` |
| "User not found" khi đặt lại mật khẩu | Hồ sơ nhân viên thêm tay vào DB, chưa có tài khoản Auth | Đã tự xử lý trong app — bấm lại "Đặt lại MK" |
| Tự nhiên bị văng khỏi app sau ~1 giờ | `setAll` trong `lib/serverAuth.js` không ghi lại cookie refresh token | Kiểm tra `setAll` của file này trước tiên |
| Báo cáo/KPI thiếu dữ liệu khi data tăng | PostgREST cắt ở 1000 dòng | Chuyển query đó sang `fetchAllRows()` |
| Dev server trả 404 cho API đang có | Cache `.next` hỏng | Xóa `.next`, chạy lại |

## B9. Quy tắc an toàn

- **Không bao giờ commit `.env.local`**, không dán khóa vào chat / email / tài liệu.
  `SUPABASE_SERVICE_ROLE_KEY` = toàn quyền dữ liệu, bỏ qua mọi phân quyền trong app.
- Hai bucket `client-files` và `db-backups` phải để **private**. Bật "Public bucket" là ai có
  đường dẫn file cũng tải được mà không cần đăng nhập — app đã tải file bằng đường dẫn ký tạm nên
  không cần bật.
- **Không tắt** việc gate theo quyền ở trang/API mới, và không viết cứng mã vai trò (mục B5).
- Dữ liệu trên app là **dữ liệu production thật**. Khi cần thử nghiệm (tạo nhân viên, ghi công
  nợ...), dùng bản ghi tạm rồi **xóa sạch ngay** sau khi xác nhận.
- Supabase gói Free **tự tạm dừng sau ~7 ngày không ai truy cập** (dữ liệu không mất, bấm Resume).
  Nghỉ dài ngày thì nhớ điều này, hoặc nâng gói Pro.
- Vercel gói Hobby theo điều khoản chỉ dành cho mục đích cá nhân — dùng chính thức cho công ty
  thì nên nâng Pro.
- Nếu nghi khóa bị lộ: Supabase → Project Settings → API Keys tạo lại khóa, cập nhật `.env.local`
  + biến môi trường trên Vercel rồi **Redeploy**.

## B10. Đồng bộ fix từ app gốc savitax-app

`abs-app` tách ra từ `savitax-app` ngày 2026-07-08 và **không tự đồng bộ** sau đó. Từ 2026-08
Savitax đã rẽ nhánh lớn (thêm module HCNS, tính năng "Kiêm nhiệm", đổi công thức %-công nợ) —
**ABS đã chốt chỉ lấy phần Kế toán & Công nợ, KHÔNG lấy 3 thứ đó.**

Đã đồng bộ chọn lọc tới commit `eadcbdf` của savitax-app (2026-08-31).

⚠️ **Bẫy**: commit kế toán sau tháng 8 nằm chung file với HCNS/Kiêm nhiệm, nên `git cherry-pick`
sẽ **âm thầm kéo theo lời gọi hàm/biến của tính năng không lấy** mà không báo conflict → lỗi
`ReferenceError` lúc chạy. Sau **mỗi** đợt cherry-pick bắt buộc chạy:
```bash
grep -rn "hcns\|Hcns\|HCNS\|loadExtraRoles\|debtScope\|feeCap\|extraRoles" app components lib --include=*.js
npm run build
```
Quy trình chi tiết + cách xử lý xung đột: xem `docs/clone-app-checklist.md` phần III.

---

# PHẦN C — TRẠNG THÁI BÀN GIAO

## C1. Số liệu tại ngày bàn giao (2026-11-20)

| Dữ liệu | Số lượng |
|---|---|
| Công ty khách hàng | **96** (92 đang sử dụng, 4 ngừng) — 76 báo cáo quý, 20 báo cáo tháng |
| Nhân viên | **21** (1 quản trị, 1 kế toán trưởng, 19 kế toán viên) |
| Phòng nghiệp vụ | 1 ("Công Ty ABS") |
| Checklist mẫu | 558 dòng việc |
| Việc đã ghi nhận | 470 bản ghi |
| Phí dịch vụ | 49 dòng · Nợ tồn chuyển kỳ: 43 dòng |
| Hồ sơ tài khoản khai thuế | 6 |
| Backup đang lưu | 8 bản, mới nhất `backup-2026-11-13.json` (361KB) |

Đã kiểm tra tại ngày bàn giao: app chạy bình thường (HTTPS, trang đăng nhập HTTP 200), backup
tự động chạy đều đủ 8 tuần liên tiếp, script khôi phục đã thử nghiệm thành công cả đường xem
trước và đường ghi.

## C2. Việc còn treo

| # | Việc | Mức độ | Ghi chú |
|---|---|---|---|
| 1 | Xóa công ty test **"CÔNG TY CỔ PHẦN ĐẦU TƯ VÀ PHÁT TRIỂN CHÍ THANH E&C"** (MST 3603468890, id `8956128a-8c17-4b50-b40c-6b0a2f6b9867`) | Nên làm | Đang ở trạng thái "ngừng sử dụng" nên không ảnh hưởng báo cáo, nhưng là dữ liệu test lẫn trong dữ liệu thật |
| 2 | Hồ sơ **Nguyễn Văn An** (`nvan@dailythueabs.vn`) chưa có tài khoản đăng nhập, đang bị vô hiệu hóa | Thấp | Nếu không dùng thì xóa hồ sơ; nếu dùng thì bấm "Đặt lại MK" để cấp tài khoản |
| 3 | **Backup chưa bao gồm file đính kèm** (bucket `client-files`) và **tài khoản đăng nhập** | Cân nhắc | Xem bảng ở mục B7 |
| 4 | Thu hồi (revoke) các **GitHub PAT token tạm** đã dùng để push | Bảo mật | GitHub → Settings → Developer settings → Personal access tokens |
| 5 | Cân nhắc nâng **Supabase lên gói Pro** | Cân nhắc | Hết hiện tượng tự pause (mục B1), có backup cấp database của Supabase |
| 6 | Sửa credential Git của remote `origin` cho người tiếp quản | Thấp | Máy dev cũ từng phải push qua remote tạm có token |

## C3. Checklist chuyển quyền sở hữu

Khi giao hệ thống cho người/đơn vị khác quản lý, chuyển đủ 6 thứ sau — thiếu bất kỳ thứ nào là
không tự vận hành được:

- [ ] **GitHub**: thêm người tiếp quản vào tổ chức `DLTABS` với quyền ghi repo `abs-app` (hoặc
      chuyển quyền sở hữu repo).
- [ ] **Vercel**: thêm vào team "dltabs' projects" (hoặc chuyển project `abs-app`). Lưu ý
      project phải giữ được quyền đọc repo GitHub để tiếp tục auto-deploy.
- [ ] **Supabase**: thêm thành viên vào project `nqerqxmqplyszhfggrqm`. Người tiếp quản tự lấy
      lại các khóa API, **không gửi khóa service role qua chat/email**.
- [ ] **DNS tên miền** `dailythueabs.vn`: quyền sửa bản ghi CNAME `app`.
- [ ] **Tài khoản quản trị app** `admin@dailythueabs.vn`: đổi mật khẩu và giao lại.
- [ ] **`CRON_SECRET`**: sinh chuỗi mới, cập nhật trên Vercel rồi redeploy (chuỗi cũ coi như đã
      lộ sau khi bàn giao).

Tài liệu cần đọc, theo thứ tự: `BAN-GIAO.md` (file này) → `README.md` → `AGENTS.md` →
`docs/clone-app-checklist.md`.

## C4. Dọn máy cũ sau khi bàn giao

Khi muốn cắt hẳn quyền truy cập của máy đang giữ app hiện nay:

1. Xóa folder `D:\abs-app` (gồm `.env.local`).
2. Xóa 2 file zip bàn giao đã tạo.
3. Gỡ đăng nhập GitHub: Control Panel → **Credential Manager** → Windows Credentials → xóa mục
   `git:https://github.com` của tài khoản dùng cho repo này (giữ nguyên mục của tài khoản GitHub
   khác nếu máy còn dùng).
4. Đăng xuất khỏi GitHub, Vercel, Supabase trên trình duyệt của máy đó.
5. Đổi mật khẩu tài khoản GitHub/Vercel/Supabase, và nếu muốn chắc tuyệt đối thì xoay khóa: tạo
   lại khóa API trong Supabase → Project Settings → API Keys (khóa anon và service_role đổi theo),
   cập nhật Vercel + `.env.local` rồi Redeploy. Sinh `CRON_SECRET` mới cùng lúc.
