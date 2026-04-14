// https://handyapi.com/  (gratis, sin key hasta cierto volumen)
async function handyapi(bin, signal) {
  const res = await fetch(`https://data.handyapi.com/bin/${bin}`, { signal });
  if (!res.ok) throw new Error(`handyapi ${res.status}`);
  const data = await res.json();
  if (data?.Status && data.Status !== 'SUCCESS') {
    throw new Error(`handyapi status ${data.Status}`);
  }
  return {
    source: 'handyapi',
    bank: data?.Issuer || '',
    scheme: data?.Scheme || '',
    type: data?.Type || '',
    country: data?.Country?.A2 || '',
  };
}

module.exports = handyapi;
