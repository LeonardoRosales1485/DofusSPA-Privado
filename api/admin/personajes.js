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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Admin-Password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, message: 'Método no permitido.' });
    return;
  }

  if (!checkPassword(req)) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }

  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
    const [rows] = await conn.execute(
      'SELECT id, nombre, nivel, clase, cuenta FROM personajes ORDER BY nombre ASC'
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin personajes]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar personajes.' });
  } finally {
    if (conn) conn.end();
  }
};
