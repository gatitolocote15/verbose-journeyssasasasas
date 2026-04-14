// https://bincheck.io/  (scraping ligero; último fallback)
async function bincheckIo(bin, signal) {
  const res = await fetch(`https://bincheck.io/details/${bin}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BINService/1.0)',
    },
    signal,
  });
  if (!res.ok) throw new Error(`bincheckIo ${res.status}`);
  const html = await res.text();

  const pick = (label) => {
    const re = new RegExp(`${label}[\\s\\S]{0,200}?<[^>]+>([^<]+)</`, 'i');
    const m = html.match(re);
    return m ? m[1].trim() : '';
  };

  const bank = pick('Issuing Bank');
  const scheme = pick('Card Brand') || pick('Scheme');
  const type = pick('Card Type');
  const country = pick('Country');

  if (!bank && !scheme) throw new Error('bincheckIo empty');
  return { source: 'bincheckIo', bank, scheme, type, country };
}

module.exports = bincheckIo;
