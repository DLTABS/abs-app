// Khôi phục dữ liệu từ file backup hàng tuần (bucket Storage "db-backups", sinh bởi
// app/api/cron/backup/route.js — định dạng { generated_at, tables: { <tên bảng>: [dòng] } }).
//
//   node scripts/restore-backup.mjs                                  # liệt kê các bản backup có sẵn
//   node scripts/restore-backup.mjs backup-2026-11-13.json           # XEM TRƯỚC, không ghi gì
//   node scripts/restore-backup.mjs backup-2026-11-13.json --only=staff,clients
//   node scripts/restore-backup.mjs backup-2026-11-13.json --confirm # GHI THẬT vào database
//   node scripts/restore-backup.mjs --file=D:/tmp/backup.json        # dùng file JSON đã tải về máy
//
// Cách ghi: UPSERT theo khoá chính, KHÔNG xoá dòng nào. Nghĩa là:
//   • dòng bị mất/bị sửa sai sau thời điểm backup  -> được ghi lại đúng như lúc backup
//   • dòng được tạo MỚI sau thời điểm backup       -> vẫn còn nguyên, không bị xoá
// Vậy đây là "lấp lại dữ liệu đã mất", KHÔNG phải quay database về đúng trạng thái lúc backup.
// Muốn về đúng trạng thái đó thì phải xoá tay phần phát sinh sau (cân nhắc rất kỹ, mất dữ liệu thật).
//
// KHÔNG nằm trong file backup, phải xử lý riêng:
//   • Tài khoản đăng nhập (Supabase Auth) — mất thì vào Nhân viên > "Đặt lại MK" để app cấp lại
//     tài khoản theo đúng mã nhân viên cũ (xem app/api/admin/reset-password/route.js).
//   • File đính kèm công ty trong Storage bucket "client-files".
//   • Cấu trúc bảng / RLS / constraint — dựng lại bằng các file trong sql/ theo thứ tự.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/)[1].trim()
const s = createClient(url, key)

const BUCKET = 'db-backups'
const PAGE = 500

// Thứ tự BẮT BUỘC — bảng cha trước bảng con, nếu không sẽ vi phạm khoá ngoại.
const ORDER = [
  'rooms', 'roles', 'permissions', 'role_permissions',
  'staff', 'clients',
  'client_secondary_staff', 'client_credentials', 'client_change_log',
  'task_definitions', 'task_records',
  'service_fees', 'fee_collections', 'debt_rollovers',
]

const args = process.argv.slice(2)
const flag = (name) => args.find(a => a.startsWith('--' + name + '='))?.split('=').slice(1).join('=')
const confirm = args.includes('--confirm')
const only = flag('only')?.split(',').map(t => t.trim()).filter(Boolean)
const localFile = flag('file')
const fileName = args.find(a => !a.startsWith('--'))

async function listBackups() {
  const { data, error } = await s.storage.from(BUCKET).list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } })
  if (error) throw new Error('Không đọc được bucket ' + BUCKET + ': ' + error.message)
  return (data || []).filter(f => f.name.endsWith('.json'))
}

async function loadPayload() {
  if (localFile) return JSON.parse(readFileSync(localFile, 'utf8'))
  const { data, error } = await s.storage.from(BUCKET).download(fileName)
  if (error) throw new Error('Không tải được ' + fileName + ': ' + error.message)
  return JSON.parse(await data.text())
}

async function countRows(table) {
  const { count, error } = await s.from(table).select('*', { count: 'exact', head: true })
  return error ? null : count
}

async function main() {
if (!fileName && !localFile) {
  const files = await listBackups()
  console.log('Các bản backup trong bucket "' + BUCKET + '" (mới nhất trước):\n')
  for (const f of files) {
    console.log('  ' + f.name.padEnd(26) + Math.round((f.metadata?.size || 0) / 1024) + 'KB   ' + (f.created_at || '').slice(0, 10))
  }
  console.log('\nXem trước một bản:  node scripts/restore-backup.mjs ' + (files[0]?.name || 'backup-YYYY-MM-DD.json'))
  return
}

const payload = await loadPayload()
const tables = payload.tables || {}
const targets = ORDER.filter(t => tables[t] && (!only || only.includes(t)))
const skipped = Object.keys(tables).filter(t => !ORDER.includes(t))

console.log('Nguồn      :', localFile || (BUCKET + '/' + fileName))
console.log('Tạo lúc    :', payload.generated_at || '(không rõ)')
console.log('Chế độ     :', confirm ? '*** GHI THẬT VÀO DATABASE ***' : 'XEM TRƯỚC (không ghi gì)')
if (only) console.log('Chỉ bảng   :', only.join(', '))
if (skipped.length) console.log('Bỏ qua     :', skipped.join(', '), '(không có trong thứ tự khôi phục)')
console.log('')
console.log('Bảng'.padEnd(26) + 'Trong backup'.padStart(13) + 'Trong DB'.padStart(11))
for (const t of targets) {
  const now = await countRows(t)
  console.log('  ' + t.padEnd(24) + String(tables[t].length).padStart(13) + String(now ?? 'LỖI ĐỌC').padStart(11))
}

if (!confirm) {
  console.log('\nChưa ghi gì cả. Muốn khôi phục thật thì thêm --confirm:')
  console.log('  node scripts/restore-backup.mjs ' + (fileName || '--file=' + localFile) + (only ? ' --only=' + only.join(',') : '') + ' --confirm')
  return
}

console.log('\nBắt đầu khôi phục...')
let totalWritten = 0
for (const t of targets) {
  const rows = tables[t]
  if (rows.length === 0) { console.log('  ' + t.padEnd(24) + 'rỗng, bỏ qua'); continue }
  let written = 0
  for (let i = 0; i < rows.length; i += PAGE) {
    const chunk = rows.slice(i, i + PAGE)
    const { error } = await s.from(t).upsert(chunk)
    if (error) {
      console.log('  ' + t.padEnd(24) + 'LỖI: ' + error.message)
      console.log('    (dừng bảng này, các bảng sau vẫn chạy tiếp — xem lại rồi chạy --only=' + t + ')')
      break
    }
    written += chunk.length
  }
  totalWritten += written
  console.log('  ' + t.padEnd(24) + written + '/' + rows.length + ' dòng')
}
console.log('\nXong. Đã ghi ' + totalWritten + ' dòng.')
console.log('Kiểm tra lại trên app: Danh sách công ty, Checklist, Công nợ, Nhân viên.')
console.log('Nhân viên không đăng nhập được -> Nhân viên > "Đặt lại MK" để cấp lại tài khoản.')
}

main().catch(e => { console.error('LỖI:', e.message); process.exitCode = 1 })
