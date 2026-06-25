'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

const pctClr = (v) => v >= 90 ? 'text-green-600' : v >= 70 ? 'text-yellow-500' : 'text-red-500'
const barClr = (v) => v >= 90 ? 'bg-green-500'   : v >= 70 ? 'bg-yellow-400'   : 'bg-red-400'
const fmt    = (n) => Number(n || 0).toLocaleString('vi-VN')

function Bar({ value }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={'h-full rounded-full transition-all ' + barClr(value || 0)}
        style={{ width: Math.min(100, value || 0) + '%' }} />
    </div>
  )
}

export default function RoomsPage() {
  const router = useRouter()
  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [rooms,    setRooms]    = useState([])
  const [kpiMap,   setKpiMap]   = useState({}) // roomId → {taskPct, debtPct, ...}
  const [loading,  setLoading]  = useState(true)
  const [kpiLoading, setKpiLoading] = useState(false)

  // Last 12 months
  const monthOpts = []
  let y = now.getFullYear(), m = now.getMonth() + 1
  for (let i = 0; i < 12; i++) {
    monthOpts.push({ label: 'T' + m + '/' + y, value: y + '-' + String(m).padStart(2, '0'), y, m })
    m--; if (m === 0) { m = 12; y-- }
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: sd } = await supabase.auth.getSession()
      if (!sd.session) { router.push('/login'); return }
      const { data: roomList } = await supabase.from('rooms').select('*').order('type').order('name')
      setRooms(roomList || [])
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (rooms.length === 0) return
    loadAllKpi()
  }, [rooms, selYear, selMonth])

  const loadAllKpi = async () => {
    setKpiLoading(true)
    const results = await Promise.all(
      rooms.map(r =>
        fetch('/api/admin/room?roomId=' + r.id + '&year=' + selYear + '&month=' + selMonth)
          .then(res => res.json())
          .then(json => ({ roomId: r.id, totals: json.totals || null, staffCount: (json.staff || []).length }))
          .catch(() => ({ roomId: r.id, totals: null }))
      )
    )
    const map = {}
    for (const r of results) map[r.roomId] = r
    setKpiMap(map)
    setKpiLoading(false)
  }

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </AppShell>
  )

  // Group rooms by type
  const officeRooms = rooms.filter(r => r.type !== 'remote')
  const remoteRooms = rooms.filter(r => r.type === 'remote')

  // Overall totals
  const allKpi = Object.values(kpiMap).filter(k => k.totals)
  const totalClients = allKpi.reduce((a, k) => a + (k.totals ? k.totals.clientCount : 0), 0)
  const totalDone    = allKpi.reduce((a, k) => a + (k.totals ? k.totals.doneTasks : 0), 0)
  const totalTasks   = allKpi.reduce((a, k) => a + (k.totals ? k.totals.totalTasks : 0), 0)
  const totalFee     = allKpi.reduce((a, k) => a + (k.totals ? k.totals.totalFee : 0), 0)
  const totalCollect = allKpi.reduce((a, k) => a + (k.totals ? k.totals.collected : 0), 0)
  const overallTask  = totalTasks  === 0 ? 0 : Math.round(totalDone    / totalTasks  * 100)
  const overallDebt  = totalFee    === 0 ? 0 : Math.round(totalCollect / totalFee    * 100)

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Phòng nghiệp vụ</h1>
            <p className="text-sm text-gray-400 mt-0.5">{rooms.length} phòng · {totalClients} công ty</p>
          </div>
          <select
            value={selYear + '-' + String(selMonth).padStart(2, '0')}
            onChange={e => {
              const p = e.target.value.split('-')
              setSelYear(Number(p[0])); setSelMonth(Number(p[1]))
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {monthOpts.map(mo => (
              <option key={mo.value} value={mo.value}>{mo.label}</option>
            ))}
          </select>
        </div>

        {/* Overall summary */}
        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tổng toàn công ty</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Hoàn thành công việc</span>
                <span className={'font-bold ' + pctClr(overallTask)}>{overallTask}%</span>
              </div>
              <Bar value={overallTask} />
              <p className="text-xs text-gray-400 mt-1">{totalDone}/{totalTasks} việc</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Thu hồi công nợ</span>
                <span className={'font-bold ' + pctClr(overallDebt)}>{overallDebt}%</span>
              </div>
              <Bar value={overallDebt} />
              <p className="text-xs text-gray-400 mt-1">{fmt(totalCollect)}đ / {fmt(totalFee)}đ</p>
            </div>
          </div>
        </div>

        {/* Office rooms */}
        {officeRooms.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Phòng nghiệp vụ</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {officeRooms.map(room => (
                <RoomCard key={room.id} room={room} kpi={kpiMap[room.id]} loading={kpiLoading}
                  onClick={() => router.push('/room/' + room.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Remote rooms */}
        {remoteRooms.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Phòng remote</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {remoteRooms.map(room => (
                <RoomCard key={room.id} room={room} kpi={kpiMap[room.id]} loading={kpiLoading}
                  onClick={() => router.push('/room/' + room.id)} />
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}

function RoomCard({ room, kpi, loading, onClick }) {
  const totals     = kpi ? kpi.totals     : null
  const staffCount = kpi ? kpi.staffCount : 0
  const taskPct    = totals ? totals.taskPct  : 0
  const debtPct    = totals ? totals.debtPct  : 0
  const hasData    = totals && totals.clientCount > 0

  return (
    <button onClick={onClick}
      className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:border-blue-200 hover:shadow-sm transition-all group w-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-gray-900">Phòng {room.name}</p>
            {room.type === 'remote' && (
              <span className="text-xs bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full">Remote</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? '...' : (hasData ? staffCount + ' NV · ' + totals.clientCount + ' cty' : 'Chưa có dữ liệu')}
          </p>
        </div>
        <span className="text-gray-300 group-hover:text-blue-400 transition-colors text-xl">→</span>
      </div>
      <div className="space-y-2.5">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Hoàn thành công việc</span>
            <span className={'font-semibold ' + pctClr(taskPct)}>{loading ? '—' : taskPct + '%'}</span>
          </div>
          <Bar value={taskPct} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Thu hồi công nợ</span>
            <span className={'font-semibold ' + pctClr(debtPct)}>{loading ? '—' : debtPct + '%'}</span>
          </div>
          <Bar value={debtPct} />
        </div>
      </div>
    </button>
  )
}
