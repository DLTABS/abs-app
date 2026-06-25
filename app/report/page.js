'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { loadPermissionData, can } from '@/lib/permissions'

const pctColor = (v) => v >= 90 ? 'text-green-600' : v >= 70 ? 'text-yellow-600' : 'text-red-500'
const barColor = (v) => v >= 90 ? 'bg-green-500' : v >= 70 ? 'bg-yellow-400' : 'bg-red-400'
const kpiScore = (task, debt) => Math.round((task * 0.5) + (debt * 0.5))
const kpiColor = (v) => v >= 90 ? 'text-green-700 bg-green-50' : v >= 70 ? 'text-yellow-700 bg-yellow-50' : 'text-red-600 bg-red-50'

function Bar({ value }) {
  return (
    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${barColor(value)}`} style={{ width: `${Math.min(100, value ?? 0)}%` }} />
    </div>
  )
}

export default function ReportPage() {
  const router = useRouter()
  const [myStaff, setMyStaff] = useState(null)
  const [permData, setPermData] = useState(null)
  const [roomKpis, setRoomKpis] = useState([])
  const [staffKpis, setStaffKpis] = useState([])
  const [rooms, setRooms] = useState([])
  const [clientCounts, setClientCounts] = useState({}) // staff_id → count
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('room')
  const [expandedRoom, setExpandedRoom] = useState(null)
  const [filterRoom, setFilterRoom] = useState('')

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) { router.push('/login'); return }

      const { data: me } = await supabase
        .from('staff').select('*, rooms(name)').eq('id', session.user.id).single()
      setMyStaff(me)
      setPermData(await loadPermissionData())

      const [resRk, resSk, resRl, resClients] = await Promise.all([
        supabase.from('room_kpi').select('*').eq('year', year).eq('month', month).order('room_name'),
        supabase.from('staff_kpi').select('*').eq('year', year).eq('month', month).order('task_pct', { ascending: false }),
        supabase.from('rooms').select('*').order('name'),
        supabase.from('clients').select('assigned_to').eq('is_active', true),
      ])
      setRoomKpis(resRk.data ?? [])
      setStaffKpis(resSk.data ?? [])
      setRooms(resRl.data ?? [])

      // Client count per staff
      const counts = {}
      for (const c of (resClients.data ?? [])) {
        counts[c.assigned_to] = (counts[c.assigned_to] ?? 0) + 1
      }
      setClientCounts(counts)
      setLoading(false)
    }
    load()
  }, [router, year, month])

  const isAdminOrManager = can(myStaff?.role, 'view_kpi_report', permData)

  // Tab 2: filter + sort by KPI
  const filteredStaff = staffKpis
    .filter(s => !filterRoom || s.room_id === filterRoom)
    .map(s => ({ ...s, kpi: kpiScore(s.task_pct, s.debt_pct) }))
    .sort((a, b) => b.kpi - a.kpi)

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-400 text-sm">Đang tải...</p>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-5">

        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Báo cáo KPI</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tháng {month}/{year}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <select value={month} onChange={e => { setMonth(Number(e.target.value)); setExpandedRoom(null) }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select value={year} onChange={e => { setYear(Number(e.target.value)); setExpandedRoom(null) }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { k: 'room', l: 'Theo phòng' },
            { k: 'staff', l: 'Theo nhân viên' },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>{t.l}</button>
          ))}
        </div>

        {/* ── TAB 1: Theo phòng ── */}
        {tab === 'room' && (
          <div className="space-y-3">
            {roomKpis.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-400">Chưa có dữ liệu tháng {month}/{year}</p>
              </div>
            ) : (
              roomKpis.map(room => {
                const isExpanded = expandedRoom === room.room_id
                const roomStaff = staffKpis.filter(s => s.room_id === room.room_id)
                  .map(s => ({ ...s, kpi: kpiScore(s.task_pct, s.debt_pct) }))
                  .sort((a, b) => b.kpi - a.kpi)

                return (
                  <div key={room.room_id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                    isExpanded ? 'border-blue-200 shadow-sm' : 'border-gray-100'
                  }`}>
                    {/* Room header */}
                    <button onClick={() => setExpandedRoom(isExpanded ? null : room.room_id)}
                      className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Phòng {room.room_name}</p>
                          <p className="text-xs text-gray-400">{room.staff_count} nhân viên</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${kpiColor(kpiScore(room.avg_task_pct, room.avg_debt_pct))}`}>
                            KPI {kpiScore(room.avg_task_pct, room.avg_debt_pct)}%
                          </span>
                          <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">TB công việc</span>
                            <span className={'font-semibold ' + pctColor(room.avg_task_pct)}>{room.avg_task_pct}%</span>
                          </div>
                          <Bar value={room.avg_task_pct} />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">TB thu nợ</span>
                            <span className={'font-semibold ' + pctColor(room.avg_debt_pct)}>{room.avg_debt_pct}%</span>
                          </div>
                          <Bar value={room.avg_debt_pct} />
                        </div>
                      </div>
                    </button>

                    {/* Staff detail — expanded */}
                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {roomStaff.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">Chưa có dữ liệu</p>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {roomStaff.map((s, i) => (
                              <div key={s.staff_id} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs text-gray-300 w-4 flex-shrink-0">{i + 1}</span>
                                    <p className="text-sm font-medium text-gray-900 truncate">{s.full_name}</p>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                    <div className="text-right hidden sm:block">
                                      <p className="text-xs text-gray-400">Công việc</p>
                                      <p className={`text-sm font-semibold ${pctColor(s.task_pct)}`}>{s.task_pct}%</p>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                      <p className="text-xs text-gray-400">Thu nợ</p>
                                      <p className={`text-sm font-semibold ${pctColor(s.debt_pct)}`}>{s.debt_pct}%</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kpiColor(s.kpi)}`}>
                                      {s.kpi}%
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 ml-6">
                                  <Bar value={s.task_pct} />
                                  <Bar value={s.debt_pct} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── TAB 2: Theo nhân viên ── */}
        {tab === 'staff' && (
          <div>
            {/* Room filter */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              <button onClick={() => setFilterRoom('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !filterRoom ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                Tất cả phòng
              </button>
              {rooms.map(r => (
                <button key={r.id} onClick={() => setFilterRoom(r.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterRoom === r.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  Phòng {r.name}
                </button>
              ))}
            </div>

            {/* KPI formula note */}
            <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-xl mb-4">
              Điểm KPI = (% công việc × 50%) + (% thu nợ × 50%)
            </div>

            {filteredStaff.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-400">Chưa có dữ liệu tháng {month}/{year}</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_60px_60px_60px_72px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400">Nhân viên</p>
                  <p className="text-xs font-semibold text-gray-400 text-right">Công ty</p>
                  <p className="text-xs font-semibold text-gray-400 text-right">CV%</p>
                  <p className="text-xs font-semibold text-gray-400 text-right">Nợ%</p>
                  <p className="text-xs font-semibold text-gray-400 text-right">KPI</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredStaff.map((s, i) => (
                    <div key={s.staff_id} className="grid grid-cols-[1fr_60px_60px_60px_72px] gap-2 px-4 py-3 items-center">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-300 w-4">{i + 1}</span>
                          <p className="text-sm font-medium text-gray-900 truncate">{s.full_name}</p>
                        </div>
                        <p className="text-xs text-gray-400 ml-5">Phòng {s.room_name}</p>
                      </div>
                      <p className="text-sm text-gray-600 text-right">{clientCounts[s.staff_id] ?? 0}</p>
                      <p className={`text-sm font-semibold text-right ${pctColor(s.task_pct)}`}>{s.task_pct}%</p>
                      <p className={`text-sm font-semibold text-right ${pctColor(s.debt_pct)}`}>{s.debt_pct}%</p>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kpiColor(s.kpi)}`}>
                          {s.kpi}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
