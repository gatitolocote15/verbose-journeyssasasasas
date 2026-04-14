const { LRUCache } = require('lru-cache');

// Caché de 24h, hasta 5000 BINs en memoria.
const cache = new LRUCache({
  max: 5000,
  ttl: 1000 * 60 * 60 * 24, // 24 horas
});

module.exports = cache;
