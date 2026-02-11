const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');

let config;
try {
  config = require('./config');
} catch (e) {
  config = {
    port: process.env.PORT || 3000,
    db: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      database: process.env.DB_NAME || 'bustar_cuentas',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      charset: 'utf8mb4',
    },
    dbDinamicos: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      database: process.env.DB_DINAMICOS || 'bustar_dinamicos',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      charset: 'utf8mb4',
    },
    dbEstaticos: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      database: process.env.DB_ESTATICOS || 'bustar_estaticos',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      charset: 'utf8mb4',
    },
    adminPassword: process.env.ADMIN_PASSWORD || '210696Crows',
  };
}

const app = express();
const DIST = __dirname;

app.use(express.json());
app.use(express.static(DIST));

app.post('/api/registro', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const body = req.body || {};
  const cuenta = String(body.cuenta || '').trim();
  const pass = String(body.pass || '');
  const nombre = String(body.nombre || '').trim();
  const apellido = String(body.apellido || '').trim();
  const pais = String(body.pais || '').trim();
  const email = String(body.email || '').trim();
  const apodo = String(body.apodo || '').trim();

  if (!cuenta || !pass || !nombre || !apellido || !pais || !email || !apodo) {
    return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
  }

  if (cuenta.length > 30 || !/^[a-zA-Z0-9_]+$/.test(cuenta)) {
    return res.status(400).json({
      success: false,
      message: 'Nombre de cuenta no válido (solo letras, números y _; máx. 30).',
    });
  }

  if (apodo.length > 30) {
    return res.status(400).json({ success: false, message: 'Apodo máximo 30 caracteres.' });
  }

  let conn;
  try {
    conn = await mysql.createConnection(config.db);
  } catch (err) {
    console.error('Conexión BD:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error de conexión a la base de datos. Revisa que MySQL esté activo y que config.js use los mismos datos que config_MultiServidor.txt (BD_HOST, BD_USUARIO, BD_PASS, BD_ACCOUNTS).',
    });
  }

  try {
    const [rows] = await conn.execute('SELECT id FROM cuentas WHERE cuenta = ?', [cuenta]);
    if (rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Ese nombre de cuenta ya está en uso.' });
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

    res.status(200).json({ success: true, message: 'Registro exitoso.' });
  } catch (err) {
    console.error('Error registro:', err.message);
    const msg = err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE'
      ? 'Error de base de datos. Revisa que la tabla cuentas exista y tenga las columnas esperadas.'
      : 'Error al registrar. Intenta de nuevo.';
    res.status(500).json({ success: false, message: msg });
  } finally {
    if (conn) conn.end();
  }
});

// --- Login de usuarios (cuenta + contraseña → dashboard propio) ---
app.post('/api/user/login', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const body = req.body || {};
  const cuenta = String(body.cuenta || '').trim();
  const contraseña = String(body.contraseña || body.pass || '');

  if (!cuenta || !contraseña) {
    return res.status(400).json({ success: false, message: 'Cuenta y contraseña son obligatorios.' });
  }

  let conn;
  try {
    conn = await mysql.createConnection(config.db);
  } catch (err) {
    console.error('Conexión BD login:', err.message);
    return res.status(500).json({ success: false, message: 'Error de conexión.' });
  }

  try {
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
    console.error('Error login:', err.message);
    res.status(500).json({ success: false, message: 'Error al comprobar credenciales.' });
  } finally {
    if (conn) conn.end();
  }
});

// Personajes del usuario logueado (por cuentaId)
app.get('/api/user/personajes', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || req.query.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) {
    return res.status(401).json({ success: false, message: 'Sesión inválida. Inicia sesión de nuevo.' });
  }

  const dbConfig = config.dbDinamicos || { ...config.db, database: 'bustar_dinamicos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT id, nombre, nivel, clase FROM personajes WHERE cuenta = ? ORDER BY nombre ASC',
      [cuentaId]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('User personajes:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar personajes.' });
  } finally {
    if (conn) conn.end();
  }
});

// Listar objetos modelo (para buscador en "dar objeto") — requiere sesión usuario
app.get('/api/user/objetos', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || req.query.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) {
    return res.status(401).json({ success: false, message: 'Sesión inválida.' });
  }
  const q = String(req.query.q || req.query.nombre || '').trim();
  const dbConfig = config.dbEstaticos || { ...config.db, database: 'bustar_estaticos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
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
    console.error('User objetos:', err.message);
    res.status(500).json({ success: false, message: 'Error al buscar objetos.' });
  } finally {
    if (conn) conn.end();
  }
});

// Dar objetos a un personaje (usuario solo puede darse a sus propios personajes)
app.post('/api/user/dar-objetos', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || (req.body && req.body.cuentaId), 10);
  if (!cuentaId || isNaN(cuentaId)) {
    return res.status(401).json({ success: false, message: 'Sesión inválida. Inicia sesión de nuevo.' });
  }

  const personajeId = parseInt(req.body && req.body.personajeId, 10);
  let objetoIds = (req.body && req.body.objetoIds) ? String(req.body.objetoIds).trim() : '';
  if (!personajeId || isNaN(personajeId) || !objetoIds) {
    return res.status(400).json({ success: false, message: 'Faltan personaje o IDs de objetos.' });
  }

  const ids = objetoIds.replace(/,/g, '|').split(/\|/).map(s => s.trim()).filter(Boolean);
  const nuevoValor = ids.join('|');

  const dbConfig = config.dbDinamicos || { ...config.db, database: 'bustar_dinamicos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [[row]] = await conn.execute('SELECT id, objetos, cuenta FROM personajes WHERE id = ?', [personajeId]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    }
    if (Number(row.cuenta) !== cuentaId) {
      return res.status(403).json({ success: false, message: 'Solo puedes dar objetos a tus propios personajes.' });
    }
    const actual = (row.objetos || '').trim();
    const concatenado = actual ? (actual + '|' + nuevoValor) : nuevoValor;
    await conn.execute('UPDATE personajes SET objetos = ? WHERE id = ?', [concatenado, personajeId]);
    res.status(200).json({ success: true, message: 'Objetos añadidos al inventario.' });
  } catch (err) {
    console.error('User dar-objetos:', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar inventario.' });
  } finally {
    if (conn) conn.end();
  }
});

// --- Panel admin (protegido por contraseña) ---
const adminPassword = config.adminPassword || '210696Crows';

function checkAdminPassword(req) {
  const p = req.headers['x-admin-password'] || (req.body && req.body.password);
  return p === adminPassword;
}

app.post('/api/admin/login', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const ok = checkAdminPassword(req);
  res.status(200).json({ success: ok });
});

app.get('/api/admin/personajes', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!checkAdminPassword(req)) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }
  const dbConfig = config.dbDinamicos || { ...config.db, database: 'bustar_dinamicos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT id, nombre, nivel, clase, cuenta FROM personajes ORDER BY nombre ASC'
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Admin personajes:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar personajes.' });
  } finally {
    if (conn) conn.end();
  }
});

app.get('/api/admin/objetos', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!checkAdminPassword(req)) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }
  const dbConfig = config.dbEstaticos || { ...config.db, database: 'bustar_estaticos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT id, nombre FROM objetos_modelo ORDER BY id ASC'
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Admin objetos:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar objetos.' });
  } finally {
    if (conn) conn.end();
  }
});

app.post('/api/admin/dar-objetos', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!checkAdminPassword(req)) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }
  const personajeId = parseInt(req.body && req.body.personajeId, 10);
  let objetoIds = (req.body && req.body.objetoIds) ? String(req.body.objetoIds).trim() : '';
  if (!personajeId || isNaN(personajeId) || !objetoIds) {
    return res.status(400).json({ success: false, message: 'Faltan personajeId u objetoIds.' });
  }
  // Aceptar "6248|6249" o "6248, 6249" o "6248 6249"
  const ids = objetoIds.replace(/,/g, '|').split(/\|/).map(s => s.trim()).filter(Boolean);
  const nuevoValor = ids.join('|');
  const dbConfig = config.dbDinamicos || { ...config.db, database: 'bustar_dinamicos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [[row]] = await conn.execute('SELECT objetos FROM personajes WHERE id = ?', [personajeId]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    }
    const actual = (row.objetos || '').trim();
    const concatenado = actual ? (actual + '|' + nuevoValor) : nuevoValor;
    await conn.execute('UPDATE personajes SET objetos = ? WHERE id = ?', [concatenado, personajeId]);
    res.status(200).json({ success: true, message: 'Objetos añadidos al inventario.' });
  } catch (err) {
    console.error('Admin dar-objetos:', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar inventario.' });
  } finally {
    if (conn) conn.end();
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(config.port, () => {
  console.log('Servidor SPA registro en http://localhost:' + config.port);
});
