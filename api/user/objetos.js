const mysql = require('mysql2/promise');

function getDbConfig() {
  const host = process.env.DB_HOST || 'tu-host.aivencloud.com';
  const port = parseInt(process.env.DB_PORT, 10) || 15482;
  const config = {
    host,
    port,
    database: process.env.DB_ESTATICOS || 'bustar_estaticos',
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
    return res.status(401).json({ success: false, message: 'Sesión inválida.' });
  }

  const q = String(req.query.q || req.query.nombre || '').trim();
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
    let sql = 'SELECT id, nombre FROM objetos_modelo';
    const params = [];
    if (q) {
      sql += ' WHERE nombre LIKE ? OR id = ?';
      params.push('%' + q + '%', isNaN(parseInt(q, 10)) ? -1 : parseInt(q, 10));
    }
    sql += ' ORDER BY id ASC LIMIT 300';
    const [rows] = await conn.execute(sql, params.length ? params : undefined);
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[user/objetos]', err.message);
    res.status(500).json({ success: false, message: 'Error al buscar objetos.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
};
