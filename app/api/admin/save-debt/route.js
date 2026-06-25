import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// POST /api/admin/save-debt
// Body: { clientId, year, month, type, amount, note, createdBy }
export async function POST(request) {
  try {
    const { clientId, year, month, type, amount, note, createdBy } = await request.json()

    if (!clientId || !year || !month || !type || amount === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getAdmin()

    const { error } = await supabase.from('service_fees').upsert({
      client_id:  clientId,
      year:       Number(year),
      month:      Number(month),
      type:       type,
      amount:     Number(amount),
      note:       note || null,
      created_by: createdBy || null,
      created_at: new Date().toISOString(),
    }, { onConflict: 'client_id,year,month,type' })

    if (error) {
      console.error('save-debt error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (e) {
    console.error('save-debt exception:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
