# Đóng gói app Đại lý thuế ABS để mang sang máy khác / bàn giao. Tạo HAI file zip:
#   1. <tên-folder>-ma-nguon-<ngày>.zip : toàn bộ mã nguồn + lịch sử git (.git) để tiếp tục push.
#      KHÔNG có node_modules / .next (cài lại bằng `npm ci`), KHÔNG có khoá.
#   2. <tên-folder>-BI-MAT-<ngày>.zip   : .env.local (khoá Supabase + CRON_SECRET).
#      Chuyển bằng USB / trao tay, KHÔNG gửi qua email, Zalo, chat. Chép xong thì xoá file zip này.
#
# Chạy (PowerShell, đứng ở thư mục app):
#   powershell -ExecutionPolicy Bypass -File scripts\dong-goi-ban-giao.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\dong-goi-ban-giao.ps1 -Ra D:\ban-giao
# Mặc định file zip ra thư mục CHA của folder app (vd D:\). Xem BAN-GIAO.md.
param([string]$Ra = '')

$ErrorActionPreference = 'Stop'
$goc  = Split-Path $PSScriptRoot -Parent
$cha  = Split-Path $goc -Parent
$ten  = Split-Path $goc -Leaf
$ngay = Get-Date -Format 'yyyy-MM-dd'
if (-not $Ra) { $Ra = $cha }
# Gốc ổ đĩa (D:\) đã tồn tại — New-Item trên gốc ổ báo lỗi, nên chỉ tạo khi thư mục chưa có.
if (-not (Test-Path -LiteralPath $Ra)) { New-Item -ItemType Directory -Force -Path $Ra | Out-Null }
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
if (-not (Test-Path $tar)) { throw 'Không thấy tar.exe của Windows (cần Windows 10 bản 1803 trở lên).' }

# ── 0. Nhắc việc git còn dở ─────────────────────────────────────────────────────
Push-Location $goc
try {
  $chuaCommit = git status --porcelain
  if ($chuaCommit) { Write-Warning 'Còn thay đổi CHƯA COMMIT — vẫn được đóng gói, nhưng nên commit + push trước.' }
  git fetch -q origin 2>$null
  $chuaPush = git log --oneline 'origin/main..HEAD' 2>$null
  if ($chuaPush) { Write-Warning 'Còn commit CHƯA PUSH lên GitHub — nên `git push` trước khi bàn giao.' }
} finally { Pop-Location }

# ── 1. Gói mã nguồn ─────────────────────────────────────────────────────────────
$zipMa = Join-Path $Ra "$ten-ma-nguon-$ngay.zip"
if (Test-Path $zipMa) { Remove-Item $zipMa -Force }
$boQua = @('node_modules', '.next', '.next-build', '.claude', '.env.local', '.env', '.env.vercel',
           'tmp-*', 'snapshots', '.vercel', '*.pem')
$thamSo = @('-a', '-c', '-f', $zipMa, '-C', $cha)
foreach ($b in $boQua) { $thamSo += "--exclude=$b" }
$thamSo += $ten
& $tar @thamSo
if ($LASTEXITCODE -ne 0) { throw "Đóng gói mã nguồn lỗi (tar trả $LASTEXITCODE)." }

# Soát lại: gói mã nguồn tuyệt đối không được chứa khoá.
$lot = & $tar -t -f $zipMa | Where-Object { $_ -match '(^|/)\.env\.local$|\.pem$|(^|/)node_modules/' }
if ($lot) { Remove-Item $zipMa -Force; throw ('Gói mã nguồn lẫn file không được phép: ' + ($lot -join ', ')) }
Write-Host ('[1/2] Mã nguồn : ' + $zipMa + '  (' + [math]::Round((Get-Item $zipMa).Length / 1MB, 1) + ' MB)')

# ── 2. Gói bí mật ───────────────────────────────────────────────────────────────
$tam = Join-Path $env:TEMP "$ten-BI-MAT-$ngay"
if (Test-Path $tam) { Remove-Item $tam -Recurse -Force }
New-Item -ItemType Directory -Path $tam | Out-Null
$coGi = @()
$env1 = Join-Path $goc '.env.local'
if (Test-Path $env1) { Copy-Item $env1 (Join-Path $tam '.env.local'); $coGi += '.env.local' }
@"
GÓI BÍ MẬT — APP ĐẠI LÝ THUẾ ABS ($ngay)

.env.local  -> chép vào thư mục app (cạnh package.json).

Trong đây có SUPABASE_SERVICE_ROLE_KEY = khoá TOÀN QUYỀN cơ sở dữ liệu (đọc/ghi/xoá mọi bảng,
bỏ qua mọi phân quyền), và CRON_SECRET bảo vệ đường backup.

Cất bản gốc ở nơi an toàn (trình quản lý mật khẩu / USB cất két). Chép xong thì xoá file zip này
khỏi máy trung gian. Nếu nghi khoá bị lộ: Supabase -> Project Settings -> API Keys, tạo lại khoá,
rồi cập nhật .env.local + biến môi trường trên Vercel và Redeploy.
"@ | Set-Content -Path (Join-Path $tam 'DOC-KY.txt') -Encoding UTF8

$zipBm = Join-Path $Ra "$ten-BI-MAT-$ngay.zip"
if (Test-Path $zipBm) { Remove-Item $zipBm -Force }
& $tar -a -c -f $zipBm -C $env:TEMP "$ten-BI-MAT-$ngay"
$ma = $LASTEXITCODE
Remove-Item $tam -Recurse -Force
if ($ma -ne 0) { throw "Đóng gói bí mật lỗi (tar trả $ma)." }
Write-Host ('[2/2] Bí mật   : ' + $zipBm + '  (gồm: ' + ($coGi -join ', ') + ')')
if (-not $coGi) { Write-Warning 'Gói bí mật RỖNG — máy này không có .env.local.' }
Write-Host ''
Write-Host 'Gói bí mật: chuyển bằng USB / trao tay, KHÔNG gửi qua email/Zalo/chat. Xem BAN-GIAO.md.'
