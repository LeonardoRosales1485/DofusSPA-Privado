/**
 * Genera string de stats aleatorias para un objeto, a partir de statsModelo (objetos_modelo.statsModelo).
 * Replica la lógica de ObjetoModelo.generarStatsModelo(CAPACIDAD_STATS.RANDOM) del emulador.
 * Formato: cada stat es "statID#min#max#x#y" (hex); se genera valor aleatorio entre min y max.
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

// STAT_RECIBIDO_EL = 42 (0x2a) en el emulador: stat de fecha de recepción
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
    // STAT_RECIBIDO_EL: fecha actual en hex (año, mes*100+dia, hora*100+min)
    if (statID === STAT_RECIBIDO_EL) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const hour = now.getHours();
      const min = now.getMinutes();
      const h1 = (year).toString(16);
      const h2 = (month * 100 + day).toString(16);
      const h3 = (hour * 100 + min).toString(16);
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
    const valorHex = valor.toString(16);
    const stats3 = stats[3] != null ? stats[3] : '0';
    out.push(stats[0] + '#' + valorHex + '#0#' + stats3 + '#0d0+' + valor);
  }
  return out.join(',');
}

module.exports = { generateStatsFromModelo };
