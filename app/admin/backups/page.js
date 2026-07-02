'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { hasPermission } from '@/lib/permissions'

const fmtSize = (bytes) => {
  if (!bytes) return '0 KB'
  const kb = bytes / 1024
  return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB'
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BackupDataPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [backups, setBackups] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: sd } = await supabase.auth.getSession()
      if (!sd.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('staff').select('role').eq('id', sd.session.user.id).single()
      const ok = await hasPermission(me?.role, 'manage_database')
      if (!ok) { router.push('/dashboard'); return }
      setAllowed(true)
      setChecking(false)
      load()
    }
    init()
  }, [router])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/backups', { cache: 'no-store' })
      const json = await res.json()
      if (json.error) setError(json.error)
      else setBackups(json.data || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (checking) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-400 text-sm">Đang tải...</p>
      </div>
    </AppShell>
  )
  if (!allowed) return null

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-5">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Backup dữ liệu</h1>
            <p className="text-sm text-gray-500 mt-1">
              Bản sao dữ liệu tự động hàng tuần (Thứ 7) — lưu 8 tuần gần nhất, dùng để phục hồi khi có sự cố.
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="text-xs px-3 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors font-medium flex-shrink-0">
            {loading ? 'Đang tải...' : '↻ Tải lại'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 text-sm text-red-600">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin border-blue-500" />
          </div>
        ) : backups.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-gray-700 font-medium">Chưa có bản backup nào</p>
            <p className="text-sm text-gray-400 mt-1">Backup đầu tiên sẽ tự động chạy vào Thứ 7 tới.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {backups.map(b => (
                <div key={b.name} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(b.created_at)} · {fmtSize(b.size)}</p>
                  </div>
                  {b.downloadUrl ? (
                    <a href={b.downloadUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium transition-colors flex-shrink-0">
                      ⬇ Tải về
                    </a>
                  ) : (
                    <span className="text-xs text-gray-300 flex-shrink-0">Không có link</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
