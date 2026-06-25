'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { hasPermission, clearPermissionCache } from '@/lib/permissions'

export default function AdminRolesPage() {
  const router = useRouter()
  const [allowed, setAllowed]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [roles, setRoles]       = useState([])
  const [perms, setPerms]       = useState([])
  const [roleId, setRoleId]     = useState(null) // vai trò đang chọn để sửa quyền
  const [checked, setChecked]   = useState(new Set())
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [addError, setAddError] = useState('')

  const load = async () => {
    const [rolesRes, permsRes, rpRes] = await Promise.all([
      fetch('/api/admin/roles').then(r => r.json()),
      fetch('/api/admin/permissions').then(r => r.json()),
      fetch('/api/admin/role-permissions').then(r => r.json()),
    ])
    setRoles(rolesRes.data || [])
    setPerms(permsRes.data || [])
    return rpRes.data || []
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: sd } = await supabase.auth.getSession()
      if (!sd.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('staff').select('role').eq('id', sd.session.user.id).single()
      const ok = await hasPermission(me?.role, 'manage_roles')
      if (!ok) { router.push('/dashboard'); return }
      setAllowed(true)
      await load()
      setLoading(false)
    }
    init()
  }, [router])

  const openRole = async (r) => {
    if (roleId === r.id) { setRoleId(null); return }
    setRoleId(r.id); setMsg('')
    const rpRes = await fetch('/api/admin/role-permissions').then(res => res.json())
    const mine = (rpRes.data || []).filter(row => row.role_id === r.id).map(row => row.permission_key)
    setChecked(new Set(mine))
  }

  const toggle = (key) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const save = async () => {
    setSaving(true); setMsg('')
    const res = await fetch('/api/admin/role-permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId, permissionKeys: Array.from(checked) }),
    })
    const json = await res.json()
    if (json.error) setMsg('Lỗi: ' + json.error)
    else { setMsg('Đã lưu quyền cho vai trò này!'); clearPermissionCache() }
    setSaving(false)
  }

  const addRole = async () => {
    setAddError('')
    if (!newLabel.trim()) { setAddError('Vui lòng nhập tên vai trò'); return }
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel.trim() }),
    })
    const json = await res.json()
    if (json.error) { setAddError(json.error); return }
    setShowAdd(false); setNewLabel('')
    clearPermissionCache()
    await load()
  }

  const deleteRole = async (r) => {
    if (!confirm('Xóa vai trò "' + r.label + '"?')) return
    const res = await fetch('/api/admin/roles?id=' + r.id, { method: 'DELETE' })
    const json = await res.json()
    if (json.error) { alert(json.error); return }
    clearPermissionCache()
    await load()
  }

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-400 text-sm">Đang tải...</p>
      </div>
    </AppShell>
  )
  if (!allowed) return null

  // Nhóm quyền theo group_name
  const grouped = {}
  for (const p of perms) {
    const g = p.group_name || 'Khác'
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(p)
  }

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vai trò & phân quyền</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tạo vai trò mới và tích chọn quyền tương ứng</p>
          </div>
          <button onClick={() => { setShowAdd(v => !v); setAddError('') }}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors font-medium">
            + Thêm vai trò
          </button>
        </div>

        {showAdd && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Tạo vai trò mới</h2>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tên hiển thị</label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="VD: Kế toán trưởng"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">Mã vai trò sẽ tự tạo từ tên hiển thị.</p>
            </div>
            {addError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{addError}</div>}
            <div className="flex gap-2">
              <button onClick={addRole} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Tạo vai trò</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Hủy</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {roles.map(r => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <button onClick={() => openRole(r)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{r.label}</span>
                  <span className="text-xs text-gray-400 font-mono">{r.id}</span>
                  {r.is_system && (
                    <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">Toàn quyền (hệ thống)</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!r.is_system && (
                    <span onClick={(e) => { e.stopPropagation(); deleteRole(r) }}
                      className="text-xs text-gray-400 hover:text-red-500 cursor-pointer">Xóa</span>
                  )}
                  <span className={'text-gray-300 transition-transform ' + (roleId === r.id ? 'rotate-180' : '')}>▾</span>
                </div>
              </button>

              {roleId === r.id && (
                <div className="border-t border-gray-50 p-4">
                  {r.is_system ? (
                    <p className="text-sm text-gray-400">Vai trò hệ thống luôn có toàn bộ quyền, không cần gán riêng.</p>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {Object.entries(grouped).map(([group, ps]) => (
                          <div key={group}>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
                            <div className="space-y-1.5">
                              {ps.map(p => (
                                <label key={p.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                  <input type="checkbox" checked={checked.has(p.key)} onChange={() => toggle(p.key)}
                                    className="rounded border-gray-300" />
                                  {p.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <button onClick={save} disabled={saving}
                          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                          {saving ? 'Đang lưu...' : '✓ Lưu quyền'}
                        </button>
                        {msg && <span className={'text-xs font-medium ' + (msg.startsWith('Lỗi') ? 'text-red-500' : 'text-green-600')}>{msg}</span>}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
