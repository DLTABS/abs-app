export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mst = (searchParams.get('mst') || '').trim()
  if (!mst || !/^\d+$/.test(mst)) {
    return Response.json({ error: 'MST không hợp lệ' }, { status: 400 })
  }

  // Try VietQR business lookup API (free, no auth needed for basic queries)
  try {
    const res = await fetch('https://api.vietqr.io/v2/business/' + mst, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (res.ok) {
      const json = await res.json()
      if (json.code === '00' && json.data) {
        const d = json.data
        return Response.json({
          name:           d.name || d.shortName || '',
          address:        d.address || '',
          status:         d.status || '',
          representative: d.internationalName || d.representative || '',
        })
      }
    }
  } catch (_) {
    // fall through to next source
  }

  // Fallback: masothue.com HTML scraping
  try {
    const res = await fetch('https://masothue.com/' + mst, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    })

    if (res.ok) {
      const html = await res.text()
      const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

      // Parser linh hoạt: thử nhiều cấu trúc HTML
      function extract(label) {
        const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // 1. <dt>label</dt><dd>value</dd>
        let m = html.match(new RegExp('<dt[^>]*>[^<]*' + esc + '[^<]*<\\/dt>\\s*<dd[^>]*>(.*?)<\\/dd>', 'si'))
        if (m) return clean(m[1])
        // 2. <td>...label...</td><td>value</td> (table row)
        m = html.match(new RegExp('<td[^>]*>[^<]*' + esc + '[^<]*<\\/td>\\s*<td[^>]*>(.*?)<\\/td>', 'si'))
        if (m) return clean(m[1])
        // 3. <td>icon + label</td><td>value</td> (icon inside td)
        m = html.match(new RegExp('<td[^>]*>(?:<[^>]+>)*[^<]*' + esc + '[^<]*(?:<[^>]+>)*<\\/td>\\s*<td[^>]*>(.*?)<\\/td>', 'si'))
        if (m) return clean(m[1])
        // 4. label after any tag, then any container with value
        m = html.match(new RegExp(esc + '[^<]*<\\/[^>]+>\\s*<[^>]+>(.*?)<\\/[^>]+>', 'si'))
        if (m) return clean(m[1])
        return ''
      }

      // Lấy người đại diện đặc biệt — chỉ lấy dòng đầu (trước "Ngoài ra")
      function extractRep() {
        const raw = extract('Người đại diện') || extract('Đại diện pháp luật') || extract('Người ĐDPL')
        if (!raw) return ''
        // Cắt tại "Ngoài ra" hoặc dấu xuống dòng đặc biệt
        return raw.split(/Ngoài ra|ngoài ra|\bHộ kinh|\bCÔNG TY/i)[0].trim()
      }

      let name = ''
      const h1fn = html.match(/<h1[^>]*class="[^"]*fn[^"]*"[^>]*>(.*?)<\/h1>/si)
      if (h1fn) name = clean(h1fn[1])
      else {
        const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/si)
        if (h1) name = clean(h1[1])
      }
      if (!name) {
        const titleM = html.match(/<title>(.*?)<\/title>/i)
        if (titleM) name = titleM[1].split('-')[0].split('|')[0].trim()
      }

      const address        = extract('Địa chỉ Thuế') || extract('Địa chỉ')
      const status         = extract('Tình trạng')
      const representative = extractRep()

      if (name || address) {
        return Response.json({ name, address, status, representative })
      }
    }
  } catch (_) {
    // fall through
  }

  return Response.json({ error: 'Không tìm thấy thông tin cho MST này. Vui lòng nhập tay.' }, { status: 404 })
}
