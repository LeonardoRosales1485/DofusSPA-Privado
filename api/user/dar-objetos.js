const mysql = require('mysql2/promise');

function getDbConfig() {
  const host = process.env.DB_HOST || 'tu-host.aivencloud.com';
  const port = parseInt(process.env.DB_PORT, 10) || 15482;
  const config = {
    host,
    port,
    database: process.env.DB_DINAMICOS || 'bustar_dinamicos',
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASS || '',
    charset: 'utf8mb4',
  };
  if (port !== 3306 || host.includes('aivencloud')) config.ssl = { rejectUnauthorized: false };
  return config;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido.' });
  }

  const body = req.body || {};
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || body.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) {
    return res.status(401).json({ success: false, message: 'Sesión inválida. Inicia sesión de nuevo.' });
  }

  const personajeId = parseInt(body.personajeId, 10);
  let objetoIds = body.objetoIds ? String(body.objetoIds).trim() : '';
  if (!personajeId || isNaN(personajeId) || !objetoIds) {
    return res.status(400).json({ success: false, message: 'Faltan personaje o IDs de objetos.' });
  }

  const modeloIds = objetoIds.replace(/,/g, '|').split(/\|/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  if (modeloIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Indica al menos un ID de objeto (modelo) válido.' });
  }

  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
    const [[row]] = await conn.execute('SELECT id, objetos, cuenta FROM personajes WHERE id = ?', [personajeId]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    }
    if (Number(row.cuenta) !== cuentaId) {
      return res.status(403).json({ success: false, message: 'Solo puedes dar objetos a tus propios personajes.' });
    }

    const [[{ maxId }]] = await conn.execute('SELECT COALESCE(MAX(id), 0) AS maxId FROM objetos');
    let nextId = Number(maxId) + 1;
    const newInstanceIds = [];
    for (const modeloId of modeloIds) {
      await conn.execute(
        'INSERT INTO objetos (id, modelo, cantidad, posicion, stats, objevivo, precio) VALUES (?, ?, 1, -1, ?, 0, 0)',
        [nextId, modeloId, '']
      );
      newInstanceIds.push(nextId);
      nextId += 1;
    }
    const actual = String(row.objetos || '').trim();
    const concatenado = actual ? (actual + '|' + newInstanceIds.join('|')) : newInstanceIds.join('|');
    await conn.execute('UPDATE personajes SET objetos = ? WHERE id = ?', [concatenado, personajeId]);
    res.status(200).json({ success: true, message: 'Objetos añadidos al inventario.' });
  } catch (err) {
    console.error('[user/dar-objetos]', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar inventario.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
};
