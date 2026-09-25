import { createClient } from '@supabase/supabase-js'
import { callerHasPermission } from '@/lib/serverAuth'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// POST /api/admin/reset-password — admin/leader đặt lại mật khẩu cho nhân viên (không cần mật khẩu cũ)
export async function POST(request) {
  const auth = await callerHasPermission('manage_staff')
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const { staffId, newPassword } = body
  if (!staffId || !newPassword) return Response.json({ error: 'Thiếu staffId hoặc mật khẩu mới' }, { status: 400 })
  if (newPassword.length < 6) return Response.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })

  const supabase = getAdmin()
  const { data: target } = await supabase.from('staff').select('id, email, full_name, role').eq('id', staffId).single()
  if (!target) return Response.json({ error: 'Không tìm thấy nhân viên này' }, { status: 404 })

  // Chỉ admin mới được đổi mật khẩu tài khoản admin khác.
  if (auth.caller.role !== 'admin' && target.role === 'admin') {
    return Response.json({ error: 'Không đủ quyền đổi mật khẩu tài khoản quản trị' }, { status: 403 })
  }

  const { error } = await supabase.auth.admin.updateUserById(staffId, { password: newPassword })
  if (!error) return Response.json({ ok: true, message: 'Đã đặt lại mật khẩu thành công!' })

  // "User not found" = dòng nhân viên có trong bảng staff nhưng CHƯA có tài khoản đăng nhập
  // (thường do thêm tay vào bảng staff qua Supabase thay vì dùng nút "Thêm nhân viên" — luồng đó
  // tạo tài khoản Auth trước rồi mới ghi staff với cùng id). Trường hợp này cấp luôn tài khoản
  // thay vì báo lỗi kỹ thuật khó hiểu.
  const notFound = error.status === 404 || /user not found/i.test(error.message || '')
  if (!notFound) return Response.json({ error: error.message }, { status: 400 })

  if (!target.email) {
    return Response.json({ error: 'Nhân viên chưa có email nên không tạo được tài khoản đăng nhập. Bấm "Sửa" để bổ sung email trước.' }, { status: 400 })
  }

  // Tạo tài khoản với ĐÚNG staff.id — giữ nguyên mọi dữ liệu đang trỏ tới nhân viên này
  // (công ty phụ trách, việc đã tick, phiếu thu...). Đổi staff.id thay vì ép id sẽ làm đứt các
  // tham chiếu đó.
  const { error: createErr } = await supabase.auth.admin.createUser({
    id: target.id,
    email: target.email,
    password: newPassword,
    email_confirm: true,
    user_metadata: { full_name: target.full_name },
  })
  if (createErr) {
    const duplicated = /already|registered|exists|duplicate/i.test(createErr.message || '')
    return Response.json({
      error: duplicated
        ? 'Email ' + target.email + ' đang gắn với một tài khoản đăng nhập khác. Bấm "Sửa" đổi lại email của nhân viên này rồi thử lại.'
        : 'Không tạo được tài khoản đăng nhập: ' + createErr.message,
    }, { status: 400 })
  }

  return Response.json({
    ok: true,
    message: 'Nhân viên này chưa có tài khoản đăng nhập — đã tạo mới với mật khẩu vừa đặt. Đăng nhập bằng email ' + target.email,
  })
}
