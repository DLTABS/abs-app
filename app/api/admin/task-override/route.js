import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// POST /api/admin/task-override
// Body: { recordId, deadlineDate }
// Chỉ Quản trị dùng để sửa 1 task đã "Hoàn thành trễ hạn" thành "Hoàn thành đúng hạn"
// (chỉnh done_at về đúng ngày hạn — không đổi is_done).
export async function POST(request) {
  try {
    const { recordId, deadlineDate } = await request.json()
    if (!recordId || !deadlineDate) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getAdmin()
    const { data: record } = await supabase.from('task_records').select('is_done').eq('id', recordId).single()
    if (!record || !record.is_done) {
      return Response.json({ error: 'Task chưa hoàn thành, không thể sửa trạng thái' }, { status: 400 })
    }

    const { error } = await supabase.from('task_records').update({ done_at: deadlineDate }).eq('id', recordId)
    if (error) {
      console.error('task-override error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (e) {
    console.error('task-override exception:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
