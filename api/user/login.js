const mysql = require('mysql2/promise');

function getDbConfig() {
  const host = process.env.DB_HOST || 'tu-host.aivencloud.com';
  const port = parseInt(process.env.DB_PORT, 10) || 15482;
  const config = {
    host,
    port,
    database: process.env.DB_NAME || 'bustar_cuentas',
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
  const cuenta = String(body.cuenta || '').trim();
  const contraseña = String(body.contraseña || body.pass || '');

  if (!cuenta || !contraseña) {
    return res.status(400).json({ success: false, message: 'Cuenta y contraseña son obligatorios.' });
  }

  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
    const [cols] = await conn.execute("SHOW COLUMNS FROM cuentas WHERE Field IN ('pass', 'contraseña')");
    const passColumn = cols.length && cols.find(c => c.Field === 'contraseña') ? 'contraseña' : 'pass';
    const [rows] = await conn.execute(
      `SELECT id, cuenta FROM cuentas WHERE cuenta = ? AND \`${passColumn}\` = ?`,
      [cuenta, contraseña]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Cuenta o contraseña incorrectos.' });
    }
    const { id: cuentaId, cuenta: cuentaNombre } = rows[0];
    res.status(200).json({ success: true, cuentaId: Number(cuentaId), cuenta: cuentaNombre });
  } catch (err) {
    console.error('[user/login]', err.message);
    res.status(500).json({ success: false, message: 'Error al comprobar credenciales.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
};
