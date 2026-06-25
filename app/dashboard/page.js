'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

const pctColor = (v) => v >= 90 ? 'text-green-600' : v >= 70 ? 'text-yellow-600' : 'text-red-500'
const barColor = (v) => v >= 90 ? 'bg-green-500' : v >= 70 ? 'bg-yellow-400' : 'bg-red-400'

function Bar({ value }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${barColor(value)}`}
        style={{ width: `${Math.min(100, value ?? 0)}%` }}
      />
    </div>
  )
}

function RoomCard({ room, kpi, onNavigate }) {
  const taskPct = kpi ? kpi.avg_task_pct : 0
  const debtPct = kpi ? kpi.avg_debt_pct : 0
  const staffCount = kpi ? kpi.staff_count : 0

  return (
    <button
      onClick={() => onNavigate('/room/' + room.id)}
      className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:border-blue-200 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-base font-semibold text-gray-900">Phòng {room.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {staffCount ? staffCount + ' nhân viên' : 'Chưa có dữ liệu'}
          </p>
        </div>
        <span className="text-gray-300 group-hover:text-blue-400 transition-colors text-xl leading-none">
          →
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">Hoàn thành công việc</span>
            <span className={'font-semibold ' + pctColor(taskPct)}>{taskPct}%</span>
          </div>
          <Bar value={taskPct} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">Thu hồi công nợ</span>
            <span className={'font-semibold ' + pctColor(debtPct)}>{debtPct}%</span>
          </div>
          <Bar value={debtPct} />
        </div>
      </div>
    </button>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState([])
  const [kpiMap, setKpiMap] = useState({})
  const [myStaff, setMyStaff] = useState(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) { router.push('/login'); return }

      const [resMe, resRooms, resKpi] = await Promise.all([
        supabase.from('staff').select('*, rooms(name)').eq('id', session.user.id).single(),
        supabase.from('rooms').select('*').order('type').order('name'),
        fetch(`/api/admin/kpi-overview?year=${year}&month=${month}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      ])

      setMyStaff(resMe.data)
      setRooms(resRooms.data ?? [])

      const map = {}
      for (const k of (resKpi.rooms ?? [])) map[k.room_id] = k
      setKpiMap(map)

      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-400 text-sm">Đang tải...</p>
      </div>
    </AppShell>
  )

  const mainRooms = rooms.filter(r => r.type !== 'remote')
  const remoteRooms = rooms.filter(r => r.type === 'remote')

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-5">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tháng {month}/{year}</p>
        </div>

        {/* Main rooms */}
        {mainRooms.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Phòng nghiệp vụ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mainRooms.map(room => <RoomCard key={room.id} room={room} kpi={kpiMap[room.id]} onNavigate={router.push} />)}
            </div>
          </div>
        )}

        {/* Remote rooms */}
        {remoteRooms.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Phòng remote
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {remoteRooms.map(room => <RoomCard key={room.id} room={room} kpi={kpiMap[room.id]} onNavigate={router.push} />)}
            </div>
          </div>
        )}

        {rooms.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            Không có dữ liệu phòng ban
          </div>
        )}

      </div>
    </AppShell>
  )
}
