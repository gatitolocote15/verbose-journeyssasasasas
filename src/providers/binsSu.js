// https://bins.su/  (scraping del HTML, gratis sin key; fallback)
async function binsSu(bin, signal) {
  const res = await fetch(`https://bins.su/search?action=searchbins&bins=${bin}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BINService/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal,
  });
  if (!res.ok) throw new Error(`binsSu ${res.status}`);
  const html = await res.text();

  // bins.su devuelve una tabla HTML; extraemos la primera fila con regex simple.
  // Columnas típicas: BIN | Brand | Type | Category | Issuer | Country
  const rowMatch = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of rowMatch) {
    if (row.includes(bin.slice(0, 6))) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
        m[1].replace(/<[^>]+>/g, '').trim()
      );
      if (cells.length >= 5) {
        return {
          source: 'binsSu',
          bank: cells[4] || '',
          scheme: cells[1] || '',
          type: cells[2] || '',
          country: cells[5] || '',
        };
      }
    }
  }
  throw new Error('binsSu no match');
}

module.exports = binsSu;
