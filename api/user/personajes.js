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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Cuenta-Id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido.' });
  }

  const cuentaId = parseInt(req.headers['x-cuenta-id'] || req.query.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) {
    return res.status(401).json({ success: false, message: 'Sesión inválida. Inicia sesión de nuevo.' });
  }

  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
    const [rows] = await conn.execute(
      'SELECT id, nombre, nivel, clase FROM personajes WHERE cuenta = ? ORDER BY nombre ASC',
      [cuentaId]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[user/personajes]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar personajes.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
};
