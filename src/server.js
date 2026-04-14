const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { lookupBin } = require('./aggregator');
const cache = require('./cache');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));
app.use(
  cors({
    origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN.split(',').map((s) => s.trim()),
  })
);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/bin-check', limiter);

// --- Healthcheck para el autoping ---
app.get('/ping', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), uptime: process.uptime() });
});

app.get('/', (_req, res) => {
  res.json({ service: 'bin-service', status: 'up' });
});

// --- Endpoint principal ---
async function handleBinCheck(bin, res) {
  if (!/^\d{6,8}$/.test(bin)) {
    return res.status(400).json({ error: 'invalid bin, must be 6-8 digits' });
  }

  const cached = cache.get(bin);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const result = await lookupBin(bin);
    cache.set(bin, result);
    res.json({ ...result, cached: false });
  } catch (err) {
    console.error(`[bin-check] ${bin} -> ${err.message}`);
    res.status(502).json({
      error: 'all providers failed',
      bin,
      bank: 'unknown',
      scheme: 'UNKNOWN',
    });
  }
}

app.post('/bin-check', async (req, res) => {
  const bin = String(req.body?.bin || '').replace(/\D/g, '').slice(0, 8);
  return handleBinCheck(bin, res);
});

app.get('/bin-check/:bin', async (req, res) => {
  const bin = String(req.params.bin || '').replace(/\D/g, '').slice(0, 8);
  return handleBinCheck(bin, res);
});

// --- Autoping interno (capa 1) ---
// Si está configurada PUBLIC_URL, el server se pinga a sí mismo cada 10 min
// para que Render no lo duerma por inactividad.
const PUBLIC_URL = process.env.PUBLIC_URL;
if (PUBLIC_URL) {
  const PING_INTERVAL_MS = 10 * 60 * 1000;
  setInterval(async () => {
    try {
      const r = await fetch(`${PUBLIC_URL.replace(/\/$/, '')}/ping`);
      console.log(`[autoping] ${r.status} @ ${new Date().toISOString()}`);
    } catch (e) {
      console.error(`[autoping] failed: ${e.message}`);
    }
  }, PING_INTERVAL_MS);
  console.log(`[autoping] enabled -> ${PUBLIC_URL}/ping every 10min`);
}

app.listen(PORT, () => {
  console.log(`bin-service listening on :${PORT}`);
  console.log(`CORS origin: ${ALLOWED_ORIGIN}`);
});
