const mysql = require('mysql2/promise');

function getDbConfig() {
  const host = process.env.DB_HOST || 'localhost';
  const isCloud = host !== 'localhost' && !host.startsWith('127.');
  const config = {
    host: host,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'bustar_cuentas',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    charset: 'utf8mb4',
  };
  if (isCloud) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

async function doRegistro(body) {
  console.log('[registro] body keys:', Object.keys(body || {}));

  const cuenta = String(body.cuenta || '').trim();
  const pass = String(body.pass || '');
  const nombre = String(body.nombre || '').trim();
  const apellido = String(body.apellido || '').trim();
  const pais = String(body.pais || '').trim();
  const email = String(body.email || '').trim();
  const apodo = String(body.apodo || '').trim();

  if (!cuenta || !pass || !nombre || !apellido || !pais || !email || !apodo) {
    console.log('[registro] validación: faltan datos', { cuenta: !!cuenta, pass: !!pass, nombre: !!nombre, apellido: !!apellido, pais: !!pais, email: !!email, apodo: !!apodo });
    return { status: 400, json: { success: false, message: 'Faltan datos obligatorios.' } };
  }

  if (cuenta.length > 30 || !/^[a-zA-Z0-9_]+$/.test(cuenta)) {
    return {
      status: 400,
      json: { success: false, message: 'Nombre de cuenta no válido (solo letras, números y _; máx. 30).' },
    };
  }

  if (apodo.length > 30) {
    return { status: 400, json: { success: false, message: 'Apodo máximo 30 caracteres.' } };
  }

  const dbConfig = getDbConfig();
  console.log('[registro] conectando BD', { host: dbConfig.host, port: dbConfig.port, database: dbConfig.database, user: dbConfig.user, hasPassword: !!dbConfig.password, ssl: !!dbConfig.ssl });

  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('[registro] conexión BD OK');
  } catch (err) {
    console.error('[registro] Conexión BD fallida:', err.code, err.message, err.cause || '');
    return {
      status: 500,
      json: {
        success: false,
        message: 'Error de conexión a la base de datos. Revisa las variables de entorno (DB_HOST, DB_NAME, DB_USER, DB_PASS).',
      },
    };
  }

  try {
    const [rows] = await conn.execute('SELECT id FROM cuentas WHERE cuenta = ?', [cuenta]);
    if (rows.length > 0) {
      return { status: 400, json: { success: false, message: 'Ese nombre de cuenta ya está en uso.' } };
    }

    const [[{ maxId }]] = await conn.execute('SELECT COALESCE(MAX(id), 0) AS maxId FROM cuentas');
    const nextId = Number(maxId) + 1;

    const [cols] = await conn.execute("SHOW COLUMNS FROM cuentas WHERE Field IN ('pass', 'contraseña')");
    const passColumn = cols.length ? (cols.find(c => c.Field === 'contraseña') ? 'contraseña' : 'pass') : 'contraseña';

    const rango = 1;
    const idioma = 'ES';
    const ipRegistro = '127.0.0.1';
    const cumpleanos = '1~1~2011';
    const pregunta = 'aa';
    const respuesta = 'aa';
    const creditos = 166;
    const ogrinas = 86335;
    const votos = 163;
    const actualizar = 1;
    const ultimoVoto = '1526149045';
    const abono = 4702293884447;
    const baneado = 0;
    const logeado = 0;
    const ultimaIP = '127.0.0.1';
    const fechaCreacion = String(Math.round(Date.now()));
    const ticket = '';

    const sql = `INSERT INTO cuentas (id, cuenta, \`${passColumn}\`, rango, nombre, apellido, pais, idioma, ipRegistro, \`cumpleaños\`, email, ultimaIP, pregunta, respuesta, apodo, baneado, logeado, creditos, ogrinas, votos, actualizar, ultimoVoto, abono, fechaCreacion, ticket) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await conn.execute(sql, [
      nextId,
      cuenta,
      pass,
      rango,
      nombre,
      apellido,
      pais,
      idioma,
      ipRegistro,
      cumpleanos,
      email,
      ultimaIP,
      pregunta,
      respuesta,
      apodo,
      baneado,
      logeado,
      creditos,
      ogrinas,
      votos,
      actualizar,
      ultimoVoto,
      abono,
      fechaCreacion,
      ticket,
    ]);

    console.log('[registro] INSERT OK, id:', nextId);
    return { status: 200, json: { success: true, message: 'Registro exitoso.' } };
  } catch (err) {
    console.error('[registro] Error registro:', err.code, err.message, err.sql || '');
    const msg =
      err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE'
        ? 'Error de base de datos. Revisa que la tabla cuentas exista y tenga las columnas esperadas.'
        : 'Error al registrar. Intenta de nuevo.';
    return { status: 500, json: { success: false, message: msg } };
  } finally {
    if (conn) conn.end();
  }
}

module.exports = async (req, res) => {
  console.log('[registro] request', req.method, req.url || '');

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    console.log('[registro] GET (prueba): función ejecutándose');
    res.status(200).json({ api: 'registro', method: 'GET', message: 'Backend OK. Usa POST para registrar.' });
    return;
  }

  if (req.method !== 'POST') {
    console.log('[registro] método no permitido:', req.method);
    res.status(405).json({ success: false, message: 'Método no permitido.' });
    return;
  }

  let body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  if (Object.keys(body).length === 0 && typeof req.body === 'string') {
    try { body = JSON.parse(req.body); } catch (e) { console.log('[registro] body parse error:', e.message); }
  }
  console.log('[registro] body después de parse:', typeof req.body, Object.keys(body || {}).length);

  const result = await doRegistro(body);
  console.log('[registro] respuesta', result.status, result.json?.success);
  res.status(result.status).json(result.json);
};
