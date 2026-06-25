'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { hasPermission } from '@/lib/permissions'

export default function MigratePage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [status, setStatus] = useState(null) // null | 'running' | 'done' | 'error'
  const [result, setResult] = useState(null)
  const [dbUrl, setDbUrl] = useState('')

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
    }
    init()
  }, [router])

  const run = async () => {
    setStatus('running')
    setResult(null)
    try {
      const res = await fetch('/api/admin/migrate', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        setStatus('error')
        setResult(json)
      } else {
        setStatus('done')
        setResult(json)
      }
    } catch (e) {
      setStatus('error')
      setResult({ error: e.message })
    }
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
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Cài đặt Database</h1>
          <p className="text-sm text-gray-500 mt-1">Tự động tạo/cập nhật toàn bộ schema Supabase</p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Trước khi chạy, thêm vào file <code className="bg-blue-100 px-1 rounded">.env.local</code>:</p>
          <div className="bg-white rounded-xl border border-blue-200 p-3">
            <p className="text-xs font-mono text-gray-700 break-all">SUPABASE_DB_URL=postgresql://postgres:[db-password]@db.[project-ref].supabase.co:5432/postgres</p>
          </div>
          <div className="space-y-1.5 text-xs text-blue-700">
            <p>📍 <strong>project-ref</strong>: lấy từ URL Supabase của bạn (VD: <code>abcxyzabc123</code>)</p>
            <p>🔑 <strong>db-password</strong>: Supabase Dashboard → Settings → Database → Database password</p>
            <p>🌏 <strong>Region</strong>: thay <code>ap-southeast-1</code> nếu project ở region khác</p>
          </div>
        </div>

        {/* What will be created */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Schema sẽ được tạo/cập nhật:</p>
          <div className="space-y-2 text-sm text-gray-600">
            {[
              ['clients', 'Thêm cột: status, is_active, report_type, monthly_fee, fee_period, address, tax_status, assigned_to'],
              ['staff', 'Thêm cột: role, room_id · Set admin@savitax.vn = admin'],
              ['service_fees', 'Tạo mới (lịch sử thay đổi phí) + RLS policy'],
              ['fee_collections', 'Tạo mới (ghi nhận thu phí hàng tháng) + RLS policy'],
              ['task_records', 'Thêm cột: note'],
              ['debt_records', 'Tạo mới nếu chưa có + RLS policy'],
            ].map(([table, desc]) => (
              <div key={table} className="flex gap-3">
                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded flex-shrink-0 h-fit">{table}</span>
                <span className="text-xs text-gray-500">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={run}
          disabled={status === 'running'}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
        >
          {status === 'running' ? '⏳ Đang chạy migration...' : '🚀 Chạy Migration'}
        </button>

        {/* Result */}
        {result && (
          <div className={'mt-4 rounded-2xl p-4 border ' +
            (status === 'done' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}>
            {status === 'done' ? (
              <div>
                <p className="text-sm font-semibold text-green-700 mb-2">
                  ✅ Migration hoàn thành! {result.total} câu lệnh, {result.failed} lỗi
                </p>
                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-xs text-red-600 bg-white rounded-lg p-2 border border-red-100">
                        <span className="font-mono">{e.stmt}...</span>
                        <br />{e.error}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-green-600 mt-2">Reload lại app để áp dụng thay đổi →</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">❌ Lỗi</p>
                <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">{result.error}</pre>
                {result.error && result.error.includes('SUPABASE_DB_URL') && (
                  <p className="text-xs text-red-500 mt-2">
                    Hãy thêm <code>SUPABASE_DB_URL</code> vào file <code>.env.local</code> rồi restart server.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
