# Checklist nhân bản app (dựng bản sao độc lập cho đơn vị mới)

Dùng khi cần dựng 1 bản sao **hoàn toàn độc lập** của app (GitHub/Supabase/Vercel/domain riêng,
dữ liệu trắng) cho 1 đơn vị khác, trong khi app gốc vẫn chạy bình thường.

Copy file này thành bản mới cho mỗi lần nhân bản, đổi tên theo đơn vị, tick từng dòng khi xong.

> **Phần II bên dưới là quan trọng nhất.** Đó là các bẫy đã dính THẬT khi nhân bản
> Savitax → ABS (2026-07 → 2026-09). Mỗi mục ghi rõ: triệu chứng thấy được, nguyên nhân, cách
> sửa. Đọc trước khi bắt đầu sẽ tiết kiệm rất nhiều thời gian dò lỗi.

**Nguyên tắc bảo mật — không ghi secret thật vào file này** (service_role key, mật khẩu DB, PAT
token...). Chỉ ghi TÊN/URL/nơi lưu (vd ".env.local trên máy dev").

---

## Thông tin lần nhân bản này

| | |
|---|---|
| Tên đơn vị | ___________________________ |
| Domain đích | ___________________________ |
| Ngày bắt đầu | ___________________________ |

---

# PHẦN I — CÁC BƯỚC

## Bước 0 — Chốt thông tin trước khi bắt đầu

- [ ] Tên hiển thị: dạng ngắn (sidebar/badge) và dạng đầy đủ (tiêu đề trang, login)
- [ ] File logo PNG nền trong suốt
- [ ] **Thông tin pháp lý + ngân hàng của đơn vị mới** — bắt buộc phải có TRƯỚC khi đụng tới
      hợp đồng/ĐNTT (xem Bẫy #7): tên công ty đầy đủ, địa chỉ, MST, tên ngân hàng, **số tài
      khoản**, tên người nhận, người đại diện ký, điện thoại
- [ ] Dùng chung bộ checklist mẫu (`task_definitions`) của app gốc? (khuyến nghị: có)
- [ ] Cơ cấu vai trò của đơn vị mới (VD ABS: Quản trị viên / Kế toán trưởng / Kế toán viên)
- [ ] Email admin đầu tiên: `admin@<domain-mới>`
- [ ] Domain đã đăng ký chưa?

## Bước 1 — GitHub

- [ ] Tạo repo **trống hoàn toàn** (không tick "Add README")
- [ ] Mirror clone giữ lịch sử:
      ```
      git clone --mirror <URL-repo-goc>
      cd <repo>.git && git push --mirror <URL-repo-moi>
      ```
- [ ] Ghi lại URL repo mới → `___________________________`

## Bước 2 — Supabase

- [ ] Tạo project mới — Region **Singapore** (khớp Vercel `sin1`)
- [ ] Lấy 3 giá trị ở Settings → API dán thẳng vào `.env.local`
- [ ] **Dựng schema**: các bảng cốt lõi KHÔNG có sẵn file `CREATE TABLE` trong repo (bảng gốc
      tạo tay qua Dashboard). Cách đã kiểm chứng: gọi PostgREST OpenAPI spec của project GỐC
      (`<PROJECT_URL>/rest/v1/` + header `Accept: application/openapi+json` + service_role key)
      để sinh `CREATE TABLE`. Kết quả đã có sẵn: `sql/00_bootstrap_core_tables.sql`
- [ ] Chạy trong SQL Editor theo thứ tự: `00_bootstrap_core_tables.sql` →
      `client_credentials_view.sql` → `client_change_log_view.sql` →
      `fix_security_definer_views.sql` → `05_grants.sql` → **`06_fix_missing_constraints.sql`**
- [ ] ⚠️ **`05_grants.sql` là bước hay quên nhất** — bảng tạo bằng SQL Editor KHÔNG tự có GRANT
      cho `anon`/`authenticated`/`service_role`; thiếu là `permission denied` kể cả với
      service_role. Kiểm nhanh: `GET <URL>/rest/v1/clients?select=id` bằng service_role phải ra
      `200` (mảng rỗng là bình thường)
- [ ] ⚠️ **`06_fix_missing_constraints.sql`** — bù UNIQUE constraint + bảng `fee_collections` mà
      cách bootstrap qua OpenAPI không lấy được (xem Bẫy #1, #2). **Bắt buộc**, nếu thiếu thì
      tick việc và ghi phí sẽ hỏng
- [ ] Chạy kiểm chứng sau khi dựng xong (xem Bẫy #1 để biết script):
      `grep -rn "onConflict:" app` rồi test từng upsert
- [ ] **Tạo Storage bucket** (không tự có, xem Bẫy #3): `client-files` và `db-backups` — cả hai
      để **private**. Kiểm: `supabase.storage.listBuckets()` phải trả về đủ 2
- [ ] **Seed bảng `permissions`** đủ 9 quyền + role `admin` (`is_system=true`). Thiếu thì trang
      "Vai trò & phân quyền" trống trơn (Bẫy #4). Danh sách quyền: `manage_staff`,
      `manage_clients`, `manage_rooms`, `manage_checklist_template`, `manage_roles`,
      `manage_database`, `view_all_debt`, `view_kpi_report`, `view_all_rooms`
- [ ] Tạo các vai trò của đơn vị mới + gán quyền qua trang Vai trò & phân quyền
- [ ] Tạo admin đầu tiên: Supabase Auth (Authentication → Add user), rồi thêm dòng vào bảng
      `staff` với **`id` trùng UUID của Auth user** và `role='admin'`
- [ ] Import `task_definitions` từ app gốc (nếu dùng chung checklist mẫu)

## Bước 3 — Vercel

- [ ] Tạo project qua **Dashboard** (`vercel.com/new`), import từ repo Bước 1 — CLI cần đăng
      nhập OAuth qua trình duyệt nên không tự động hoá được (Bẫy #12)
- [ ] Env vars (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, và `CRON_SECRET` nếu bật backup tự động (**tự sinh chuỗi mới,
      không dùng lại của app gốc**)
- [ ] ⚠️ Thêm env var SAU khi đã deploy thì phải **Redeploy** mới có hiệu lực
- [ ] Region `sin1` đã cấu hình sẵn trong `vercel.json` — không cần chỉnh
- [ ] Deploy, xác nhận build thành công

## Bước 4 — Domain

- [ ] Vercel project → Settings → Domains → thêm domain → lấy bản ghi DNS (thường là
      `CNAME  app  →  <hash>.vercel-dns-0xx.com`)
- [ ] Thêm bản ghi ở nhà cung cấp domain
- [ ] Kiểm bằng DNS công cộng: `nslookup app.<domain> 8.8.8.8` — nếu công cộng đã đúng mà máy
      mình vẫn báo lỗi thì là cache local: `ipconfig /flushdns` (Bẫy #13)

## Bước 5 — Đổi thương hiệu trong code

Chạy `grep -rin "<tên app gốc>" app components lib templates` và xử lý hết. Danh sách đầy đủ
các chỗ đã phải sửa khi làm ABS:

- [ ] `components/Sidebar.js` — tên + subtitle + logo + màu thương hiệu
- [ ] `app/login/page.js` — logo, tên, subtitle, placeholder email, màu nút
- [ ] `components/AppShell.js` — logo + tên ở thanh trên mobile
- [ ] `app/layout.js` — metadata title/description
- [ ] `public/logo-*.png` — thay logo mới, **xoá logo cũ**
- [ ] `app/icon.png` + `app/favicon.ico` — **rất hay quên**, đây là favicon của Next.js
- [ ] Màu thương hiệu hard-code (grep mã màu cũ, VD `8B1A1A`/`C9A84C`) ở: dashboard, checklist,
      my-debt, change-password, login, Sidebar
- [ ] Fallback dò vai trò `email === 'admin@<app-gốc>.vn'` — có ở **4 file**: `Sidebar.js`,
      `app/clients/page.js`, `app/admin/checklist/page.js`, `app/room/[roomId]/page.js`
- [ ] Placeholder email nhân viên (`nv@...`, `ten@...`)
- [ ] Tên người gửi email backup (`app/api/cron/backup/route.js`)
- [ ] 🔴 **`app/api/admin/dntt/route.js`** — tên/địa chỉ/điện thoại công ty, **mã ngân hàng + số
      tài khoản + tên người nhận trong QR**, mã phiếu (`SVT.MB13` → `<XXX>.MB13`), hậu tố nội
      dung QR (Bẫy #7)
- [ ] 🔴 **`app/api/admin/contract/route.js`** — toàn bộ thông tin Bên B (tên, địa chỉ, MST, ngân
      hàng, số TK, người đại diện, điện thoại), logo, màu
- [ ] 🔴 **`templates/hop-dong-dich-vu.docx`** — thông tin Bên B là **text cứng trong file Word**,
      không phải tag điền động; phải sửa XML bên trong (Bẫy #8)
- [ ] `lib/contractDates.js` — tiền tố số hợp đồng (`HĐTVT-<XXX>`)
- [ ] `components/ClientChecklist.js` — hậu tố nội dung QR
- [ ] ⚠️ **Không hard-code mã vai trò** trong logic mới (Bẫy #5)

## Bước 6 — Kiểm thử trước khi dùng thật

- [ ] Đăng nhập admin, vào đủ các trang Quản trị
- [ ] **Tick 1 việc trong checklist** (bắt lỗi thiếu UNIQUE constraint — Bẫy #1)
- [ ] **Thêm 1 công ty test có phí** → kiểm bảng `service_fees` có ghi được dòng không (fail âm
      thầm nếu thiếu constraint)
- [ ] Ghi nhận thu phí, xem công nợ, xuất ĐNTT → **kiểm kỹ số tài khoản trong mã QR**
- [ ] Xuất hợp đồng cả PDF lẫn Word → kiểm thông tin Bên B
- [ ] Gọi thử `/api/cron/backup` (kèm header `Authorization: Bearer <CRON_SECRET>`) → xác nhận
      file lưu vào bucket của project MỚI
- [ ] Kiểm bảo mật: gọi thẳng `/api/admin/roles` khi chưa đăng nhập → phải trả **401**
- [ ] **Xoá sạch dữ liệu test**
- [ ] Xác nhận app gốc không bị ảnh hưởng

## Bước 7 — Vận hành lâu dài

- [ ] Thư mục local riêng + `.env.local` riêng + `.claude/launch.json` riêng (port khác app gốc)
- [ ] ⚠️ **Supabase gói Free tự pause sau ~1 tuần không hoạt động** (Bẫy #10) — cân nhắc nâng Pro
      nếu là app dùng thật
- [ ] Thu hồi các PAT token tạm đã dùng để push
- [ ] Ghi chú lại app mới dùng Supabase/Vercel/GitHub project nào

---

# PHẦN II — BẪY ĐÃ DÍNH THẬT (đọc trước khi làm)

### Bẫy #1 — Bootstrap schema qua OpenAPI KHÔNG lấy được UNIQUE constraint
**Triệu chứng:** tick việc trong checklist không lưu được, Console báo
`there is no unique or exclusion constraint matching the ON CONFLICT specification`.
Tệ hơn: ghi phí ban đầu khi thêm công ty **fail âm thầm** — không báo lỗi gì, chỉ là không có
dòng nào được tạo trong `service_fees` (vì code không kiểm `error` của lệnh upsert đó).

**Nguyên nhân:** OpenAPI spec chỉ trả cột/kiểu/default/PK/FK/NOT NULL — **không có** UNIQUE
constraint, CHECK constraint, index phụ, trigger. Mọi lệnh `upsert(..., { onConflict: 'a,b,c' })`
đều đòi phải có UNIQUE đúng bộ cột đó.

**Cách phòng cho lần sau:** ngay sau khi bootstrap, chạy
`grep -rn "onConflict:" app` để liệt kê mọi bộ cột cần UNIQUE, rồi test THẬT từng cái bằng script
Node (upsert 1 dòng giả, xoá sau). Đừng đợi test tay phát hiện.

**Đã bù:** `sql/06_fix_missing_constraints.sql`.

### Bẫy #2 — Có bảng code dùng nhưng chưa từng tồn tại trong DB
`fee_collections` được `app/clients/page.js` dùng để ghi nhận thu phí nhanh, nhưng bảng chưa
từng được tạo ở project nào. Cách phát hiện: đối chiếu danh sách `.from('<bảng>')` trong code với
danh sách bảng thật.

### Bẫy #3 — Storage bucket không tự có
`listBuckets()` trả mảng rỗng → tính năng đính kèm file công ty và backup đều hỏng. Phải tự tạo
`client-files` + `db-backups`, để **private** (code dùng signed URL, không dùng public URL).

### Bẫy #4 — Trang "Vai trò & phân quyền" trống trơn
Bảng `permissions` không có dữ liệu mặc định → mở vai trò ra không có ô tick nào. Phải seed đủ
9 quyền (danh sách ở Bước 2). Không có API tạo quyền — phải seed bằng SQL/script.

### Bẫy #5 — 🔴 Hard-code mã vai trò trong logic
**Triệu chứng:** ô "Nhân viên xuất sắc nhất" ở Trang chủ hiện "Chưa có dữ liệu" vĩnh viễn dù có
nhân viên đủ điều kiện.

**Nguyên nhân:** code lọc `s.role === 'staff'` — mã vai trò của app gốc. Đơn vị mới đặt tên vai
trò riêng (ABS: `ke_toan_vien`, `ke_toan_truong`) nên không ai khớp.

**Nguyên tắc:** mọi logic phân biệt cấp bậc phải dựa vào **QUYỀN** (`can(role, 'manage_staff',
permData)`), không dựa vào tên/mã vai trò. Như vậy đơn vị nào cũng đúng và thêm vai trò mới
không phải sửa code.

### Bẫy #6 — Fallback dò vai trò theo email admin của app gốc
`email === 'admin@<app-gốc>.vn' ? 'admin' : 'staff'` nằm rải ở 4 file. Không sửa thì admin của
đơn vị mới bị rơi về quyền nhân viên trong một số luồng.

### Bẫy #7 — 🔴🔴 SỐ TÀI KHOẢN NGÂN HÀNG TRONG ĐNTT/QR
**Rủi ro nghiêm trọng nhất của cả quy trình:** phiếu ĐNTT sinh mã QR VietQR từ mã ngân hàng + số
tài khoản **hard-code trong code**. Nếu quên đổi, **khách hàng của đơn vị mới quét QR sẽ chuyển
tiền thẳng vào tài khoản của công ty gốc**.

Phải đổi đồng thời: `bankId`, `accountNo`, `accountName` trong URL QR, dòng hiển thị số TK dưới
mã QR, và toàn bộ khối thông tin công ty ở đầu phiếu. Kiểm bằng cách xuất 1 phiếu thật và **soi
kỹ số tài khoản** trước khi cho nhân viên dùng.

### Bẫy #8 — File Word mẫu chứa text cứng, không phải tag
`templates/hop-dong-dich-vu.docx` được điền bằng docxtemplater, nhưng **chỉ thông tin Bên A
(khách hàng) là tag động**; thông tin Bên B (công ty mình), header, footer và **2 ảnh logo nhúng**
đều là nội dung cứng trong file Word.

**Cách sửa (đã làm được, không cần Word/LibreOffice):**
```
unzip file.docx -d unpacked/
# sửa unpacked/word/document.xml, header2.xml, footer1.xml (text cứng)
# thay unpacked/word/media/image1.png, image2.jpeg (logo nhúng)
# zip lại bằng Python zipfile (máy dev Windows không có lệnh zip)
```
Lưu ý: dùng `python` (không phải `python3` — alias đó bị Windows Store chặn). Sau khi zip lại,
test bằng chính API `/api/admin/contract?format=word` chứ đừng chỉ mở file bằng mắt.

### Bẫy #9 — favicon/icon
`app/icon.png` và `app/favicon.ico` là favicon của Next.js — không nằm trong `public/` nên grep
theo tên file logo sẽ không ra. Tạo icon mới bằng cách crop phần biểu tượng từ logo (bỏ phần
chữ) cho vuông.

### Bẫy #10 — Supabase Free tự pause
**Triệu chứng cực dễ hiểu lầm:** đăng nhập báo *"Email hoặc mật khẩu không đúng"* dù mật khẩu
đúng 100%. Thật ra project Supabase đang **paused** (gói Free tự pause sau ~1 tuần không hoạt
động), trang login chỉ hiện thông báo chung chung cho mọi lỗi.

**Xử lý:** Supabase Dashboard → "Resume project" (dữ liệu còn nguyên). Pause/resume cũng **huỷ
hết phiên đăng nhập cũ** → sau đó trình duyệt sẽ báo `Invalid Refresh Token`, chỉ cần đăng nhập
lại.

### Bẫy #11 — PostgREST âm thầm cắt query ở 1000 dòng
Mọi query Supabase **không lọc theo phòng/tháng cụ thể** (gộp toàn công ty) sẽ bị cắt về tối đa
1000 dòng **mà không báo lỗi** → %-KPI và số liệu sai lệch ngẫu nhiên khi dữ liệu lớn dần. Phải
dùng `fetchAllRows()` (phân trang qua `.range()`) — đã áp dụng cho `kpi-overview`, `work-log`,
`room`, `debt-overview`, `debtRollover`, backup.

### Bẫy #12 — Vercel CLI cần OAuth trình duyệt
Không tự động hoá được từ terminal. Tạo project + thêm env var qua Dashboard. Bước import GitHub
cũng bắt buộc xác nhận GitHub App trên trình duyệt.

### Bẫy #13 — DNS đã đúng nhưng máy vẫn báo lỗi
`nslookup app.<domain> 8.8.8.8` trả đúng mà trình duyệt vẫn `DNS_PROBE_FINISHED_NXDOMAIN` → cache
DNS trên máy/router. Chạy `ipconfig /flushdns`, hoặc thử bằng 4G.

### Bẫy #14 — Extension trình duyệt làm hỏng chữ tiếng Việt
Chrome hiện "Quản trị viên" thành "có trị viên", "Kế toán trưởng" thành "Kế hoach trưởng", trong
khi Firefox bình thường. **Không phải lỗi app** — do extension gõ tiếng Việt tự sửa chữ trên
trang. Kiểm bằng cửa sổ ẩn danh (tắt extension) trước khi đi tìm lỗi trong code.

### Bẫy #15 — Push GitHub bị 403
Remote `origin` cache sẵn tài khoản GitHub của app gốc → `Permission denied`. Cách làm:
```
git remote add temp https://<PAT>@github.com/<org>/<repo>.git
git push temp main
git remote remove temp          # xoá ngay, token KHÔNG được lưu vào .git/config
```

---

# PHẦN III — ĐỒNG BỘ FIX TỪ APP GỐC VỀ SAU

2 repo **không tự đồng bộ** sau khi tách (`git push --mirror` chỉ chạy 1 lần). Fix nghiệp vụ bên
app gốc phải tự mang sang định kỳ.

```
git remote add src <đường-dẫn-hoặc-URL-repo-gốc>
git fetch src main
git log src/main --oneline        # so với hash đã đồng bộ lần trước
git cherry-pick <hash>            # từng commit, theo thứ tự thời gian
git remote remove src
```

### ⚠️ Bẫy khi app gốc đã rẽ nhánh (thêm module riêng của họ)
Khi app gốc phát triển tính năng mà bản clone **không lấy** (VD Savitax thêm module HCNS,
"Kiêm nhiệm nhiều phòng"), các commit sửa lỗi nghiệp vụ sau đó **nằm chung file** với tính năng
đó. Khi cherry-pick:

- Git auto-merge sẽ **âm thầm kéo theo lời gọi hàm/biến của tính năng không lấy** mà **không báo
  conflict** → `ReferenceError` lúc chạy. Đã dính 4 lần: `hcnsClient`, `hcnsFeeByPeriod`,
  `loadExtraRoles`, `canWriteAccountingDebt`
- Khi resolve conflict: **giữ cả 2 bên** — giữ giá trị/thương hiệu/số tài khoản của bản clone +
  lấy phần logic mới của app gốc. Đừng chọn nguyên 1 bên
- Commit nào sau khi gỡ hết phần không lấy mà thành **rỗng** → `git reset --hard HEAD^`

**Bắt buộc chạy sau mỗi đợt cherry-pick:**
```
grep -rn "<tên tính năng không lấy>" app components lib --include=*.js
npm run build     # phải ra "Generating static pages (57/57)" không lỗi
```
`npm run build` bắt được lỗi tham chiếu treo lúc render — mạnh hơn chỉ xem dev server compile.

### Cách xác nhận bản mới đã lên production
- Có route API mới → gọi thẳng, thấy **401** (thay vì 404) là đã deploy
- Chỉ sửa giao diện → tải file JS trong `/_next/static/chunks/` rồi tìm chuỗi đặc trưng của code
  mới
