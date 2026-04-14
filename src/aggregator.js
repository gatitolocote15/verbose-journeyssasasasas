const binlist = require('./providers/binlist');
const handyapi = require('./providers/handyapi');
const binsSu = require('./providers/binsSu');
const bincheckIo = require('./providers/bincheckIo');
const { normalizeBank, normalizeScheme } = require('./normalizer');

const PROVIDERS = [binlist, handyapi, binsSu, bincheckIo];
const PROVIDER_TIMEOUT_MS = 1500;
const RACE_TIMEOUT_MS = 2500;

function withTimeout(promise, ms, controller) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

/**
 * Dispara todas las APIs en paralelo, la primera respuesta VÁLIDA
 * (con banco reconocido o scheme) gana. Si ninguna reconoce banco,
 * se queda con la que al menos devuelva scheme.
 */
async function lookupBin(bin) {
  const start = Date.now();
  const controllers = PROVIDERS.map(() => new AbortController());
  const attempts = PROVIDERS.map((fn, i) =>
    withTimeout(fn(bin, controllers[i].signal), PROVIDER_TIMEOUT_MS, controllers[i])
      .then((raw) => ({
        ...raw,
        bankSlug: normalizeBank(raw.bank),
        schemeNorm: normalizeScheme(raw.scheme),
      }))
  );

  // Primera respuesta con banco reconocido gana.
  const winner = await new Promise((resolve, reject) => {
    let resolved = false;
    let bestFallback = null;
    let remaining = attempts.length;
    const globalTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        controllers.forEach((c) => c.abort());
        if (bestFallback) resolve(bestFallback);
        else reject(new Error('all providers failed or timed out'));
      }
    }, RACE_TIMEOUT_MS);

    attempts.forEach((p) => {
      p.then((result) => {
        if (resolved) return;
        if (result.bankSlug !== 'unknown') {
          resolved = true;
          clearTimeout(globalTimer);
          controllers.forEach((c) => c.abort());
          resolve(result);
        } else if (!bestFallback && result.schemeNorm !== 'UNKNOWN') {
          bestFallback = result;
        }
      }).catch(() => {
        // ignoramos fallos individuales
      }).finally(() => {
        remaining -= 1;
        if (remaining === 0 && !resolved) {
          resolved = true;
          clearTimeout(globalTimer);
          if (bestFallback) resolve(bestFallback);
          else reject(new Error('all providers failed'));
        }
      });
    });
  });

  return {
    bin,
    bank: winner.bankSlug,
    bankRaw: winner.bank,
    scheme: winner.schemeNorm,
    type: winner.type || '',
    country: winner.country || '',
    source: winner.source,
    latencyMs: Date.now() - start,
  };
}

module.exports = { lookupBin };
