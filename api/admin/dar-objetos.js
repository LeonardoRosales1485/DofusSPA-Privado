const mysql = require('mysql2/promise');

const adminPassword = process.env.ADMIN_PASSWORD || '210696Crows';

function checkPassword(req) {
  const p = req.headers['x-admin-password'];
  return p === adminPassword;
}

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Método no permitido.' });
    return;
  }

  if (!checkPassword(req)) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }

  let body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  if (Object.keys(body).length === 0 && typeof req.body === 'string') {
    try { body = JSON.parse(req.body || '{}'); } catch (e) {}
  }

  const personajeId = parseInt(body.personajeId, 10);
  let objetoIds = (body.objetoIds != null) ? String(body.objetoIds).trim() : '';
  if (!personajeId || isNaN(personajeId) || !objetoIds) {
    return res.status(400).json({ success: false, message: 'Faltan personajeId u objetoIds.' });
  }

  const ids = objetoIds.replace(/,/g, '|').split(/\|/).map(s => s.trim()).filter(Boolean);
  const nuevoValor = ids.join('|');

  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
    const [[row]] = await conn.execute('SELECT objetos FROM personajes WHERE id = ?', [personajeId]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    }
    const actual = (row.objetos || '').trim();
    const concatenado = actual ? actual + '|' + nuevoValor : nuevoValor;
    await conn.execute('UPDATE personajes SET objetos = ? WHERE id = ?', [concatenado, personajeId]);
    res.status(200).json({ success: true, message: 'Objetos añadidos al inventario.' });
  } catch (err) {
    console.error('[admin dar-objetos]', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar inventario.' });
  } finally {
    if (conn) conn.end();
  }
};
