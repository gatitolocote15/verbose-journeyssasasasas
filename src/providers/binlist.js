// https://binlist.net/  (gratis, sin key)
async function binlist(bin, signal) {
  const res = await fetch(`https://lookup.binlist.net/${bin}`, {
    headers: { 'Accept-Version': '3' },
    signal,
  });
  if (!res.ok) throw new Error(`binlist ${res.status}`);
  const data = await res.json();
  return {
    source: 'binlist',
    bank: data?.bank?.name || '',
    scheme: data?.scheme || '',
    type: data?.type || '',
    country: data?.country?.alpha2 || '',
  };
}

module.exports = binlist;
