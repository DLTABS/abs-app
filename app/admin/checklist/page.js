'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { hasPermission } from '@/lib/permissions'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ v: i + 1, l: 'Tháng ' + (i + 1) }))
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1)

const REPORT_TYPES = [
  { v: 'monthly',   l: 'Checklist BC Tháng', color: 'blue',   desc: 'Công việc cho công ty báo cáo hàng tháng' },
  { v: 'quarterly', l: 'Checklist BC Quý',   color: 'purple', desc: 'Công việc cho công ty báo cáo hàng quý' },
]

export default function AdminChecklistPage() {
  const router = useRouter()
  const now = new Date()

  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [reportType, setReportType] = useState('monthly')
  const [selMonth,   setSelMonth]   = useState(now.getMonth() + 1)
  const [editId,     setEditId]     = useState(null)
  const [editForm,   setEditForm]   = useState({})
  const [showAdd,    setShowAdd]    = useState(false)
  const [addForm,    setAddForm]    = useState({ name: '', deadline_day: 5, description: '' })
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [seeding,    setSeeding]    = useState(false)
  const [seedDone,   setSeedDone]   = useState('')

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: sd } = await supabase.auth.getSession()
      if (!sd.session) { router.push('/login'); return }
      let role = 'staff'
      const { data: me } = await supabase.from('staff').select('role').eq('id', sd.session.user.id).single()
      if (me && me.role) role = me.role
      else { role = sd.session.user.email === 'admin@savitax.vn' ? 'admin' : 'staff' }
      const allowed = await hasPermission(role, 'manage_checklist_template')
      if (!allowed) { router.push('/dashboard'); return }
      await load()
    }
    init()
  }, [router])

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/task-definitions')
    const json = await res.json()
    setTasks(json.data || [])
    setLoading(false)
  }

  // Tasks for current tab + selected month (compare as numbers)
  const monthTasks = tasks.filter(t =>
    (t.report_type || 'monthly') === reportType &&
    Number(t.month) === Number(selMonth) &&
    t.is_active !== false
  ).sort((a, b) =>
    (Number(a.deadline_day) || 0) - (Number(b.deadline_day) || 0) ||
    (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
  )

  // Count per month for the current report type (chỉ tính task đang hoạt động)
  const countByMonth = (m) => tasks.filter(t =>
    (t.report_type || 'monthly') === reportType &&
    Number(t.month) === Number(m) &&
    t.is_active !== false
  ).length

  const startEdit = (t) => {
    setEditId(t.id)
    setEditForm({ name: t.name, deadline_day: t.deadline_day, description: t.description || '' })
  }

  const saveEdit = async () => {
    if (!editForm.name) return
    setSaving(true); setError('')
    const res = await fetch('/api/admin/task-definitions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, name: editForm.name, deadline_day: Number(editForm.deadline_day), description: editForm.description }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setSaving(false); return }
    setEditId(null)
    await load()
    setSaving(false)
  }

  const saveAdd = async () => {
    if (!addForm.name) { setError('Vui lòng nhập tên công việc'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/admin/task-definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addForm.name,
        deadline_day: Number(addForm.deadline_day),
        description: addForm.description,
        report_type: reportType,
        month: selMonth,
        applies_to: 'monthly',
      }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setSaving(false); return }
    setShowAdd(false)
    setAddForm({ name: '', deadline_day: 5, description: '' })
    await load()
    setSaving(false)
  }

  const deleteTask = async (id) => {
    if (!confirm('Xóa công việc này?')) return
    setSaving(true)
    await fetch('/api/admin/task-definitions?id=' + id, { method: 'DELETE' })
    await load()
    setSaving(false)
  }

  const seedTasks = async (replace) => {
    const label = curType ? curType.l : 'checklist mẫu'
    if (replace && !confirm('Xóa toàn bộ "' + label + '" hiện có và nhập lại từ file mẫu?')) return
    setSeeding(true); setSeedDone('')
    const res = await fetch('/api/admin/seed-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replace, reportType }),
    })
    const json = await res.json()
    if (json.error) setSeedDone('Lỗi: ' + json.error)
    else setSeedDone('Đã nhập ' + json.inserted + ' công việc thành công!')
    await load()
    setSeeding(false)
  }

  const curType = REPORT_TYPES.find(r => r.v === reportType)

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-5">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">Checklist mẫu</h1>
          <p className="text-sm text-gray-400 mt-0.5">Thiết lập công việc định kỳ theo từng tháng</p>
        </div>

        {/* Report type tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
          {REPORT_TYPES.map(rt => (
            <button key={rt.v} onClick={() => { setReportType(rt.v); setEditId(null); setShowAdd(false); setSeedDone('') }}
              className={'flex-1 py-2 rounded-lg text-sm font-medium transition-all ' +
                (reportType === rt.v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {rt.l}
            </button>
          ))}
        </div>

        {/* Seed from sample checklist file */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button onClick={() => seedTasks(false)} disabled={seeding}
            className="text-xs px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 transition-colors font-medium">
            {seeding ? 'Đang nhập...' : '📥 Nhập thêm từ checklist mẫu'}
          </button>
          <button onClick={() => seedTasks(true)} disabled={seeding}
            className="text-xs px-3 py-2 rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors font-medium">
            {seeding ? 'Đang nhập...' : '🔄 Thay thế toàn bộ bằng checklist mẫu'}
          </button>
          {seedDone && (
            <span className={'text-xs font-medium ' + (seedDone.startsWith('Lỗi') ? 'text-red-500' : 'text-green-600')}>
              {seedDone}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 -mt-2 mb-4">
          Cập nhật checklist mẫu sẽ tự động áp dụng cho tất cả công ty đã chọn loại báo cáo "{curType?.l}" tương ứng.
        </p>

        {/* Show warning if tasks exist without month */}
        {tasks.filter(t => (t.report_type || 'monthly') === reportType && !t.month).length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
            <p className="text-xs text-orange-700">
              ⚠ Có {tasks.filter(t => (t.report_type || 'monthly') === reportType && !t.month).length} công việc chưa gán tháng (thêm trước khi migration).
            </p>
            <button onClick={async () => {
              const badIds = tasks.filter(t => (t.report_type || 'monthly') === reportType && !t.month).map(t => t.id)
              for (const id of badIds) await fetch('/api/admin/task-definitions?id=' + id, { method: 'DELETE' })
              await load()
            }} className="text-xs text-orange-600 font-medium hover:underline ml-2">Xóa</button>
          </div>
        )}
        <p className="text-xs text-gray-400 mb-4">{curType && curType.desc}</p>

        {/* Month selector — horizontal scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          {MONTHS.map(mo => {
            const cnt = countByMonth(mo.v)
            const isActive = selMonth === mo.v
            return (
              <button key={mo.v}
                onClick={() => { setSelMonth(mo.v); setEditId(null); setShowAdd(false) }}
                className={'flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ' +
                  (isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : cnt > 0
                      ? 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white hover:border-gray-200')}>
                T{mo.v}
                {cnt > 0 && (
                  <span className={'ml-1 ' + (isActive ? 'text-blue-200' : 'text-gray-400')}>{cnt}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected month header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Tháng {selMonth}</h2>
            <p className="text-xs text-gray-400">{monthTasks.length} công việc</p>
          </div>
          <button onClick={() => { setShowAdd(true); setEditId(null); setAddForm({ name: '', deadline_day: 5, description: '' }) }}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors font-medium">
            + Thêm
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl mb-3">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">

            {/* Add form — inline at top */}
            {showAdd && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-600 font-semibold text-sm">+ Thêm công việc — Tháng {selMonth}</span>
                </div>
                {/* Day + Name on same row */}
                <div className="flex gap-2 items-end">
                  <div className="flex-shrink-0">
                    <label className="text-xs text-gray-500 mb-1 block">Ngày hạn</label>
                    <select value={addForm.deadline_day}
                      onChange={e => setAddForm(f => ({ ...f, deadline_day: e.target.value }))}
                      className="px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {DAYS.map(d => <option key={d} value={d}>Ngày {d}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Tên công việc *</label>
                    <input type="text" value={addForm.name} autoFocus
                      onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveAdd() }}
                      placeholder="VD: Gửi báo cáo thuế cho khách hàng"
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Mô tả (không bắt buộc)</label>
                  <input type="text" value={addForm.description}
                    onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Ghi chú thêm về công việc..."
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveAdd} disabled={saving || !addForm.name}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? 'Đang lưu...' : '✓ Thêm công việc'}
                  </button>
                  <button onClick={() => { setShowAdd(false); setError('') }}
                    className="flex-1 bg-white text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 border border-gray-200 transition-colors">
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {/* Task list — grouped by deadline day for clarity */}
            {monthTasks.length === 0 && !showAdd ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-gray-500 font-medium text-sm">Tháng {selMonth} chưa có công việc</p>
                <p className="text-gray-400 text-xs mt-1">Nhấn "+ Thêm" để tạo công việc cho tháng này</p>
              </div>
            ) : (
              Array.from(new Set(monthTasks.map(t => Number(t.deadline_day)))).sort((a, b) => a - b).map(day => {
                const dayTasks = monthTasks.filter(t => Number(t.deadline_day) === day)
                return (
                  <div key={day} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    {/* Day header */}
                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-700">Ngày {day}</span>
                      <span className="text-xs text-blue-400">{dayTasks.length} việc</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {dayTasks.map(task => (
                        <div key={task.id}>
                          {editId === task.id ? (
                            /* Edit mode */
                            <div className="p-4 space-y-3 bg-gray-50">
                              <div className="flex gap-2 items-end">
                                <div className="flex-shrink-0">
                                  <label className="text-xs text-gray-500 mb-1 block">Ngày hạn</label>
                                  <select value={editForm.deadline_day}
                                    onChange={e => setEditForm(f => ({ ...f, deadline_day: e.target.value }))}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                    {DAYS.map(d => <option key={d} value={d}>Ngày {d}</option>)}
                                  </select>
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs text-gray-500 mb-1 block">Tên công việc *</label>
                                  <input type="text" value={editForm.name} autoFocus
                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                              </div>
                              <input type="text" value={editForm.description}
                                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Mô tả (không bắt buộc)"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <div className="flex gap-2">
                                <button onClick={saveEdit} disabled={saving}
                                  className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                  {saving ? 'Lưu...' : '✓ Lưu'}
                                </button>
                                <button onClick={() => { setEditId(null); setError('') }}
                                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* View mode */
                            <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-300 flex-shrink-0" />
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">{task.name}</p>
                                {task.description && (
                                  <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
                                )}
                              </div>
                              {/* Actions */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button onClick={() => { startEdit(task); setError(''); setShowAdd(false) }}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                  Sửa
                                </button>
                                <button onClick={() => deleteTask(task.id)} disabled={saving}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                  Xóa
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}

            {/* Overview of all months */}
            <div className="mt-6 bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tổng quan tất cả tháng</p>
              </div>
              <div className="divide-y divide-gray-50">
                {MONTHS.map(mo => {
                  const cnt = countByMonth(mo.v)
                  const isSelected = selMonth === mo.v
                  const tasksInMonth = tasks.filter(t =>
                    (t.report_type || 'monthly') === reportType &&
                    Number(t.month) === mo.v &&
                    t.is_active !== false
                  )
                  const days = Array.from(new Set(tasksInMonth.map(t => Number(t.deadline_day)))).sort((a, b) => a - b)
                  return (
                    <button key={mo.v} onClick={() => setSelMonth(mo.v)}
                      className={'w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ' +
                        (isSelected ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                      <span className={'text-sm font-semibold w-16 flex-shrink-0 ' + (isSelected ? 'text-blue-700' : 'text-gray-600')}>
                        Tháng {mo.v}
                      </span>
                      {cnt === 0 ? (
                        <span className="text-xs text-gray-300">Chưa có công việc</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {days.map(day => (
                            <span key={day} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              Ngày {day}: {tasksInMonth.filter(t => Number(t.deadline_day) === day).length} việc
                            </span>
                          ))}
                        </div>
                      )}
                      <span className={'text-xs flex-shrink-0 ' + (cnt > 0 ? 'text-blue-600 font-semibold' : 'text-gray-300')}>
                        {cnt > 0 ? cnt + ' việc' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
