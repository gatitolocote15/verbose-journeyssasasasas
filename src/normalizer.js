// Normaliza el nombre del banco devuelto por cualquier proveedor al slug interno
// que usan el <select> de payment.html y el bankLogoMap del frontend.

const BANK_PATTERNS = [
  // ── Bancos colombianos (prioridad alta) ────────────────────────────────────
  { slug: 'bancolombia',    regex: /bancolombia/i },
  { slug: 'davivienda',     regex: /davivienda/i },
  { slug: 'bogota',         regex: /\bbogot[aá]\b|banco.*bogot[aá]|bogot[aá].*banco/i },
  { slug: 'bbva',           regex: /\bbbva\b/i },
  { slug: 'popular',        regex: /banco popular/i },
  { slug: 'occidente',      regex: /occidente|ocidente/i },
  { slug: 'colpatria',      regex: /colpatria|scotiabank.*col/i },
  { slug: 'agrario',        regex: /agrario/i },
  { slug: 'caja-social',    regex: /caja social|cajasocial/i },
  { slug: 'av-villas',      regex: /av[\s-]?villas|avvillas/i },
  { slug: 'falabella',      regex: /falabella/i },
  { slug: 'santander',      regex: /santander/i },
  { slug: 'citibank',       regex: /citi(bank)?/i },
  { slug: 'finandina',      regex: /finandina/i },
  { slug: 'bancoomeva',     regex: /bancoomeva|coomeva/i },
  { slug: 'serfinansa',     regex: /serfinansa|serfi/i },
  { slug: 'nequi',          regex: /nequi/i },
  { slug: 'nubank',         regex: /\bnu\b|nubank|nu colombia/i },
  { slug: 'rappipay',       regex: /rappi(pay)?/i },
  { slug: 'dale',           regex: /\bdale\b/i },
  { slug: 'lulo',           regex: /lulo/i },
  { slug: 'pibank',         regex: /pibank/i },
  { slug: 'littio',         regex: /littio/i },
  { slug: 'sudameris',      regex: /sudameris/i },
  // ── Bancos ecuatorianos ────────────────────────────────────────────────────
  { slug: 'pichincha',        regex: /pichincha/i },
  { slug: 'produbanco',       regex: /produbanco|promerica/i },
  { slug: 'pacifico',         regex: /pac[ií]fico/i },
  { slug: 'guayaquil',        regex: /guayaquil/i },
  { slug: 'internacional',    regex: /internacional/i },
  { slug: 'bolivariano',      regex: /bolivariano/i },
  { slug: 'austro',           regex: /austro/i },
  { slug: 'desarrollo-ecuador', regex: /desarrollo.*ecuador|ecuador.*desarrollo/i },
  { slug: 'ruminahui',        regex: /rumi[ñn]ahui|general rumi/i },
  { slug: 'machala',          regex: /machala/i },
  { slug: 'solidario',        regex: /solidario/i },
  { slug: 'banecuador',       regex: /banecuador|ban ecuador/i },
  { slug: 'loja',             regex: /\bloja\b/i },
  { slug: 'citibank',         regex: /citi(bank)?/i },
  { slug: 'procredit',        regex: /procredit/i },
  { slug: 'amazonas',         regex: /amazonas/i },
  { slug: 'desarrollo',       regex: /desarrollo/i },
  { slug: 'coopnacional',     regex: /coopnacional|coop nacional|bcn/i },
  { slug: 'visionfund',       regex: /visionfund|vision fund/i },
  { slug: 'd-miro',           regex: /d[-\s]?miro/i },
  { slug: 'amibank',          regex: /amibank/i },
  { slug: 'comercial-manabi', regex: /comercial.*manab[ií]|manab[ií].*comercial/i },
  { slug: 'capital',          regex: /\bcapital\b/i },
  { slug: 'biess',            regex: /biess/i },
  { slug: 'litoral',          regex: /litoral/i },
  { slug: 'delbank',          regex: /delbank|dellbank/i },
];

function normalizeBank(bankName) {
  if (!bankName || typeof bankName !== 'string') return 'unknown';
  for (const { slug, regex } of BANK_PATTERNS) {
    if (regex.test(bankName)) return slug;
  }
  return 'unknown';
}

function normalizeScheme(scheme) {
  if (!scheme) return 'UNKNOWN';
  const s = scheme.toString().toUpperCase();
  if (s.includes('VISA')) return 'VISA';
  if (s.includes('MASTER')) return 'MC';
  if (s === 'MC') return 'MC';
  if (s.includes('AMERICAN') || s === 'AMEX' || s === 'AM') return 'AM';
  if (s.includes('DINERS')) return 'DINERS';
  if (s.includes('DISCOVER')) return 'DISCOVER';
  if (s.includes('UATP')) return 'UATP';
  if (s.includes('JCB')) return 'JCB';
  return s;
}

module.exports = { normalizeBank, normalizeScheme };
