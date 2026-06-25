import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/)[1].trim()
const s = createClient(url, key)

const TASKS = [
  // THÁNG 1
  {month:1,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:1,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:1,d:15, name:'Gửi BCTC tạm tính năm trước (xác định nộp 80% thuế TNDN)'},
  {month:1,d:15, name:'Gửi báo cáo thuế tháng 12 xác nhận với khách hàng'},
  {month:1,d:15, name:'Truy vấn nợ thuế'},
  {month:1,d:20, name:'Nộp báo cáo thuế tháng 12'},
  {month:1,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN + Tạm nộp 80% Thuế TNDN năm)'},
  {month:1,d:25, name:'Gửi BCT tạm tính tháng 1'},
  {month:1,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 1'},
  {month:1,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:1,d:30, name:'Gửi mail bộ báo cáo thuế tháng 12 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 2
  {month:2,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:2,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:2,d:15, name:'Gửi BCTC tạm tính năm trước (xác định nộp 80% thuế TNDN)'},
  {month:2,d:15, name:'Gửi báo cáo thuế tháng 1 xác nhận với khách hàng'},
  {month:2,d:15, name:'Truy vấn nợ thuế'},
  {month:2,d:20, name:'Nộp báo cáo thuế tháng 1'},
  {month:2,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:2,d:25, name:'Gửi BCT tạm tính tháng 2 + Báo cáo KQKD tháng 1'},
  {month:2,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 1'},
  {month:2,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:2,d:30, name:'Gửi mail bộ báo cáo thuế tháng 1 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 3
  {month:3,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:3,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:3,d:10, name:'Gửi BCTC năm hoàn thành cho khách hàng'},
  {month:3,d:15, name:'Gửi báo cáo thuế tháng 2 xác nhận với khách hàng'},
  {month:3,d:15, name:'Truy vấn nợ thuế'},
  {month:3,d:20, name:'Nộp báo cáo thuế tháng 2'},
  {month:3,d:20, name:'Nộp báo cáo tài chính năm hoàn thành'},
  {month:3,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN + TNDN)'},
  {month:3,d:25, name:'Gửi BCT tạm tính tháng 3 + Báo cáo KQKD tháng 2'},
  {month:3,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 2'},
  {month:3,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:3,d:30, name:'Gửi mail bộ báo cáo thuế tháng 2 + BCTC năm (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 4
  {month:4,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:4,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:4,d:15, name:'Gửi báo cáo thuế tháng 3 xác nhận với khách hàng'},
  {month:4,d:15, name:'Truy vấn nợ thuế'},
  {month:4,d:20, name:'Nộp báo cáo thuế tháng 3'},
  {month:4,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:4,d:25, name:'Gửi BCT tạm tính tháng 4 + Báo cáo KQKD tháng 3'},
  {month:4,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 3'},
  {month:4,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:4,d:30, name:'Gửi mail bộ báo cáo thuế tháng 3 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 5
  {month:5,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:5,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:5,d:15, name:'Gửi báo cáo thuế tháng 4 xác nhận với khách hàng'},
  {month:5,d:15, name:'Truy vấn nợ thuế'},
  {month:5,d:20, name:'Nộp báo cáo thuế tháng 4'},
  {month:5,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:5,d:25, name:'Gửi BCT tạm tính tháng 5 + Báo cáo KQKD tháng 4'},
  {month:5,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 4'},
  {month:5,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:5,d:30, name:'Gửi mail bộ báo cáo thuế tháng 4 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 6
  {month:6,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:6,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:6,d:15, name:'Gửi báo cáo thuế tháng 5 xác nhận với khách hàng'},
  {month:6,d:15, name:'Truy vấn nợ thuế'},
  {month:6,d:20, name:'Nộp báo cáo thuế tháng 5'},
  {month:6,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:6,d:25, name:'Gửi BCT tạm tính tháng 6 + Báo cáo KQKD tháng 5'},
  {month:6,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 5'},
  {month:6,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:6,d:30, name:'Gửi mail bộ báo cáo thuế tháng 5 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 7
  {month:7,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:7,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:7,d:15, name:'Gửi báo cáo thuế tháng 6 xác nhận với khách hàng'},
  {month:7,d:15, name:'Truy vấn nợ thuế'},
  {month:7,d:20, name:'Nộp báo cáo thuế tháng 6'},
  {month:7,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:7,d:25, name:'Gửi BCT tạm tính tháng 7 + Báo cáo KQKD tháng 6'},
  {month:7,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 6'},
  {month:7,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:7,d:30, name:'Gửi mail bộ báo cáo thuế tháng 6 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 8
  {month:8,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:8,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:8,d:15, name:'Gửi báo cáo thuế tháng 7 xác nhận với khách hàng'},
  {month:8,d:15, name:'Truy vấn nợ thuế'},
  {month:8,d:20, name:'Nộp báo cáo thuế tháng 7'},
  {month:8,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:8,d:25, name:'Gửi BCT tạm tính tháng 8 + Báo cáo KQKD tháng 7'},
  {month:8,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 7'},
  {month:8,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:8,d:30, name:'Gửi mail bộ báo cáo thuế tháng 7 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 9
  {month:9,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:9,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:9,d:15, name:'Gửi báo cáo thuế tháng 8 xác nhận với khách hàng'},
  {month:9,d:15, name:'Truy vấn nợ thuế'},
  {month:9,d:20, name:'Nộp báo cáo thuế tháng 8'},
  {month:9,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:9,d:25, name:'Gửi BCT tạm tính tháng 9 + Báo cáo KQKD đến tháng 9'},
  {month:9,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 8'},
  {month:9,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:9,d:30, name:'Gửi mail bộ báo cáo thuế tháng 8 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 10
  {month:10,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:10,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:10,d:15, name:'Gửi báo cáo thuế tháng 9 xác nhận với khách hàng'},
  {month:10,d:15, name:'Truy vấn nợ thuế'},
  {month:10,d:20, name:'Nộp báo cáo thuế tháng 9'},
  {month:10,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:10,d:25, name:'Gửi BCT tạm tính tháng 10 + Báo cáo KQKD đến tháng 9'},
  {month:10,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 9'},
  {month:10,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:10,d:30, name:'Gửi mail bộ báo cáo thuế tháng 9 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 11
  {month:11,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:11,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:11,d:15, name:'Gửi báo cáo thuế tháng 10 xác nhận với khách hàng'},
  {month:11,d:15, name:'Truy vấn nợ thuế'},
  {month:11,d:20, name:'Nộp báo cáo thuế tháng 10'},
  {month:11,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:11,d:25, name:'Gửi BCT tạm tính tháng 11 + Báo cáo KQKD đến tháng 10'},
  {month:11,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 10'},
  {month:11,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:11,d:30, name:'Gửi mail bộ báo cáo thuế tháng 10 (Tờ khai + Thông báo chấp nhận)'},
  // THÁNG 12
  {month:12,d:5,  name:'Gửi thông báo cung cấp chứng từ'},
  {month:12,d:10, name:'Cập nhật file đề nghị xuất hóa đơn cho khách hàng'},
  {month:12,d:15, name:'Gửi báo cáo thuế tháng 11 xác nhận với khách hàng'},
  {month:12,d:15, name:'Truy vấn nợ thuế'},
  {month:12,d:15, name:'Báo cáo KQKD đến tháng 11'},
  {month:12,d:20, name:'Nộp báo cáo thuế tháng 11'},
  {month:12,d:20, name:'Nộp các khoản thuế phải nộp (GTGT + TNCN)'},
  {month:12,d:25, name:'Gửi BCT tạm tính tháng 12 + Báo cáo KQKD đến tháng 12'},
  {month:12,d:25, name:'Đối chiếu kho + Đối chiếu công nợ tháng 11'},
  {month:12,d:28, name:'Gửi đề nghị thanh toán cho khách hàng'},
  {month:12,d:30, name:'Gửi mail bộ báo cáo thuế tháng 11 (Tờ khai + Thông báo chấp nhận)'},
]

async function run() {
  // Delete all tasks without month
  const del = await s.from('task_definitions').delete().is('month', null)
  if (del.error) console.log('Delete err:', del.error.message)
  else console.log('Deleted old tasks (no month)')

  // Insert all new tasks with month
  const inserts = TASKS.map((t, i) => ({
    name: t.name,
    deadline_day: t.d,
    month: t.month,
    report_type: 'monthly',
    applies_to: 'monthly',
    is_active: true,
    sort_order: t.month * 100 + t.d * 10 + i
  }))

  const ins = await s.from('task_definitions').insert(inserts).select('id')
  if (ins.error) console.log('Insert err:', ins.error.message)
  else console.log('SUCCESS! Inserted', ins.data.length, 'tasks')
}
run()
