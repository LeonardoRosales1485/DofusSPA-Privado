/**
 * Genera string de stats aleatorias para un objeto (misma lógica que SPA/lib/generateItemStats.js).
 * Para uso en api/handler.js (Vercel).
 */
function parseHex(s) {
  if (s == null || s === '') return NaN;
  const n = parseInt(String(s).trim(), 16);
  return isNaN(n) ? NaN : n;
}

function randomInt(min, max) {
  if (min > max) [min, max] = [max, min];
  min = Math.floor(min);
  max = Math.floor(max);
  if (min === max) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

const STAT_RECIBIDO_EL = 0x2a;

function generateStatsFromModelo(statsModelo) {
  if (statsModelo == null || typeof statsModelo !== 'string') return '';
  const parts = statsModelo.split(',');
  const out = [];
  for (const s of parts) {
    const seg = s.trim();
    if (!seg) continue;
    const stats = seg.split('#');
    if (stats.length < 3) {
      out.push(seg);
      continue;
    }
    const statID = parseHex(stats[0]);
    if (isNaN(statID)) {
      out.push(seg);
      continue;
    }
    if (statID === STAT_RECIBIDO_EL) {
      const now = new Date();
      const h1 = (now.getFullYear()).toString(16);
      const h2 = ((now.getMonth() + 1) * 100 + now.getDate()).toString(16);
      const h3 = (now.getHours() * 100 + now.getMinutes()).toString(16);
      out.push(stats[0] + '#' + h1 + '#' + h2 + '#' + h3);
      continue;
    }
    const min = parseHex(stats[1]);
    let max = parseHex(stats[2]);
    if (isNaN(min) && isNaN(max)) {
      out.push(seg);
      continue;
    }
    if (isNaN(max) || max < min) max = min;
    const valor = Math.max(0, randomInt(min, max));
    const stats3 = stats[3] != null ? stats[3] : '0';
    out.push(stats[0] + '#' + valor.toString(16) + '#0#' + stats3 + '#0d0+' + valor);
  }
  return out.join(',');
}

module.exports = { generateStatsFromModelo };
