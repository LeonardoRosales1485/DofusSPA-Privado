require('dotenv').config();

const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');

let config;
try {
  config = require('./config');
} catch (e) {
  // Por defecto Aiven (localhost y deploy usan la misma BD en la nube)
  const dbBase = {
    host: process.env.DB_HOST || 'tu-host.aivencloud.com',
    port: parseInt(process.env.DB_PORT, 10) || 15482,
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASS || '',
    charset: 'utf8mb4',
  };
  config = {
    port: process.env.PORT || 3000,
    db: { ...dbBase, database: process.env.DB_NAME || 'bustar_cuentas' },
    dbDinamicos: { ...dbBase, database: process.env.DB_DINAMICOS || 'bustar_dinamicos' },
    dbEstaticos: { ...dbBase, database: process.env.DB_ESTATICOS || 'bustar_estaticos' },
    adminPassword: process.env.ADMIN_PASSWORD || '210696Crows',
  };
}

const fs = require('fs');
const app = express();
const DIST = __dirname;

app.use(express.json());
app.use(express.static(DIST));
// Iconos de objetos (copiados del cliente): /api/user/items/<gfx>.swf
app.use('/api/user/items', express.static(path.join(DIST, 'api', 'user', 'items'), { maxAge: '1d' }));

app.get('/api/serve-favicon', (req, res) => {
  try {
    const faviconPath = path.join(DIST, 'favicon.ico');
    const buffer = fs.readFileSync(faviconPath);
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(404).end();
  }
});

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
  const nivelMin = parseInt(req.query.nivelMin, 10);
  const nivelMax = parseInt(req.query.nivelMax, 10);
  const hasNivelMin = !isNaN(nivelMin) && nivelMin >= 0;
  const hasNivelMax = !isNaN(nivelMax) && nivelMax >= 0;
  const dbConfig = config.dbEstaticos || { ...config.db, database: 'bustar_estaticos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    let sql = 'SELECT id, nombre, COALESCE(nivel, 0) AS nivel FROM objetos_modelo';
    const params = [];
    const conditions = [];
    if (q) {
      conditions.push('(nombre LIKE ? OR id = ?)');
      params.push('%' + q + '%', isNaN(parseInt(q, 10)) ? -1 : parseInt(q, 10));
    }
    if (hasNivelMin) { conditions.push('COALESCE(nivel, 0) >= ?'); params.push(nivelMin); }
    if (hasNivelMax) { conditions.push('COALESCE(nivel, 0) <= ?'); params.push(nivelMax); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
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

// Detalle de un objeto por ID (todas las columnas de objetos_modelo)
app.get('/api/user/objeto-detalle', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || req.query.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) {
    return res.status(401).json({ success: false, message: 'Sesión inválida.' });
  }
  const id = parseInt(req.query.id, 10);
  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID de objeto inválido.' });
  }
  const dbConfig = config.dbEstaticos || { ...config.db, database: 'bustar_estaticos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT * FROM objetos_modelo WHERE id = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Objeto no encontrado.' });
    }
    const raw = rows[0];
    function anyKey(obj, ...names) {
      for (const n of names) if (obj[n] !== undefined) return obj[n]; return undefined;
    }
    const data = {
      ...raw,
      nombre: anyKey(raw, 'nombre', 'Nombre'),
      nivel: anyKey(raw, 'nivel', 'Nivel'),
      pods: anyKey(raw, 'pods', 'Pods'),
      gfx: anyKey(raw, 'gfx', 'Gfx'),
      condicion: anyKey(raw, 'condicion', 'Condicion'),
      statsModelo: anyKey(raw, 'statsModelo', 'statsmodelo', 'stats_modelo'),
      infosArma: anyKey(raw, 'infosArma', 'infosarma', 'infos_arma'),
      setID: anyKey(raw, 'setID', 'setid', 'set_id'),
    };
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('User objeto-detalle:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar detalle.' });
  } finally {
    if (conn) conn.end();
  }
});

// Inventario de un personaje (usuario solo sus personajes)
app.get('/api/user/inventario', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || req.query.cuentaId, 10);
  const personajeId = parseInt(req.query.personajeId, 10);
  if (!cuentaId || isNaN(cuentaId) || !personajeId || isNaN(personajeId)) {
    return res.status(400).json({ success: false, message: 'Sesión o personaje inválido.' });
  }
  const dbDinamicos = config.dbDinamicos || { ...config.db, database: 'bustar_dinamicos' };
  const dbEstaticos = config.dbEstaticos || { ...config.db, database: 'bustar_estaticos' };
  let connD = null;
  let connE = null;
  try {
    connD = await mysql.createConnection(dbDinamicos);
    let [[row]] = await connD.execute('SELECT id, nombre, objetos FROM personajes WHERE id = ? AND cuenta = ?', [personajeId, cuentaId]);
    if (!row) {
      const connCuentas = await mysql.createConnection(config.db);
      const [[cuentaRow]] = await connCuentas.execute('SELECT cuenta FROM cuentas WHERE id = ?', [cuentaId]).catch(() => [[null]]);
      connCuentas.end();
      if (cuentaRow && cuentaRow.cuenta) {
        [[row]] = await connD.execute('SELECT id, nombre, objetos FROM personajes WHERE id = ? AND cuenta = ?', [personajeId, cuentaRow.cuenta]);
      }
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    }
    const raw = String(row.objetos || '').trim();
    const instanceIdStrs = raw ? raw.split(/\|/).map(s => String(s).trim()).filter(Boolean) : [];
    const personajeNombre = String(row.nombre || '');
    if (instanceIdStrs.length === 0) {
      return res.status(200).json({ success: true, data: [], personajeNombre });
    }
    const instanceIds = instanceIdStrs.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    if (instanceIds.length === 0) {
      return res.status(200).json({ success: true, data: [], personajeNombre });
    }
    const placeholdersD = instanceIds.map(() => '?').join(',');
    const [instances] = await connD.execute(
      `SELECT id, modelo FROM objetos WHERE id IN (${placeholdersD})`,
      instanceIds
    );
    const modeloById = {};
    (instances || []).forEach(r => { modeloById[r.id] = r.modelo; });
    const modeloIds = [...new Set(Object.values(modeloById).filter(x => x != null))];
    let nombresByModelo = {};
    if (modeloIds.length > 0) {
      connE = await mysql.createConnection(dbEstaticos);
      const placeholdersE = modeloIds.map(() => '?').join(',');
      const [modelos] = await connE.execute(
        `SELECT id, nombre FROM objetos_modelo WHERE id IN (${placeholdersE})`,
        modeloIds
      );
      (modelos || []).forEach(o => { nombresByModelo[o.id] = String(o.nombre || ''); });
    }
    const data = instanceIdStrs.map(s => {
      const instId = parseInt(s, 10);
      const idObjeto = modeloById[instId];
      const nombre = idObjeto != null ? (nombresByModelo[idObjeto] || '(ID ' + idObjeto + ')') : '(instancia ' + s + ')';
      return { id: idObjeto != null ? idObjeto : s, nombre };
    });
    res.status(200).json({ success: true, data, personajeNombre });
  } catch (err) {
    console.error('User inventario:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar inventario.' });
  } finally {
    if (connD) try { connD.end(); } catch (e) {}
    if (connE) try { connE.end(); } catch (e) {}
  }
});

// Dar objetos a un personaje (usuario solo puede darse a sus propios personajes)
// objetoIds = IDs de modelo (objetos_modelo). Se crean filas en tabla objetos y se enlazan al personaje.
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

  const modeloIds = objetoIds.replace(/,/g, '|').split(/\|/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  if (modeloIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Indica al menos un ID de objeto (modelo) válido.' });
  }

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

app.get('/api/admin/inventario', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!checkAdminPassword(req)) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }
  const personajeId = parseInt(req.query.personajeId, 10);
  if (!personajeId || isNaN(personajeId)) {
    return res.status(400).json({ success: false, message: 'personajeId obligatorio.' });
  }
  const dbDinamicos = config.dbDinamicos || { ...config.db, database: 'bustar_dinamicos' };
  const dbEstaticos = config.dbEstaticos || { ...config.db, database: 'bustar_estaticos' };
  let connD = null;
  let connE = null;
  try {
    connD = await mysql.createConnection(dbDinamicos);
    const [[row]] = await connD.execute('SELECT id, nombre, objetos FROM personajes WHERE id = ?', [personajeId]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    }
    const raw = String(row.objetos || '').trim();
    const instanceIdStrs = raw ? raw.split(/\|/).map(s => String(s).trim()).filter(Boolean) : [];
    const personajeNombre = String(row.nombre || '');
    if (instanceIdStrs.length === 0) {
      return res.status(200).json({ success: true, data: [], personajeNombre });
    }
    const instanceIds = instanceIdStrs.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    if (instanceIds.length === 0) {
      return res.status(200).json({ success: true, data: [], personajeNombre });
    }
    const placeholdersD = instanceIds.map(() => '?').join(',');
    const [instances] = await connD.execute(
      `SELECT id, modelo FROM objetos WHERE id IN (${placeholdersD})`,
      instanceIds
    );
    const modeloById = {};
    (instances || []).forEach(r => { modeloById[r.id] = r.modelo; });
    const modeloIds = [...new Set(Object.values(modeloById).filter(x => x != null))];
    let nombresByModelo = {};
    if (modeloIds.length > 0) {
      connE = await mysql.createConnection(dbEstaticos);
      const placeholdersE = modeloIds.map(() => '?').join(',');
      const [modelos] = await connE.execute(
        `SELECT id, nombre FROM objetos_modelo WHERE id IN (${placeholdersE})`,
        modeloIds
      );
      (modelos || []).forEach(o => { nombresByModelo[o.id] = String(o.nombre || ''); });
    }
    const data = instanceIdStrs.map(s => {
      const instId = parseInt(s, 10);
      const idObjeto = modeloById[instId];
      const nombre = idObjeto != null ? (nombresByModelo[idObjeto] || '(ID ' + idObjeto + ')') : '(instancia ' + s + ')';
      return { id: idObjeto != null ? idObjeto : s, nombre };
    });
    res.status(200).json({ success: true, data, personajeNombre });
  } catch (err) {
    console.error('Admin inventario:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar inventario.' });
  } finally {
    if (connD) try { connD.end(); } catch (e) {}
    if (connE) try { connE.end(); } catch (e) {}
  }
});

app.get('/api/admin/objetos', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!checkAdminPassword(req)) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }
  const q = String(req.query.q || req.query.nombre || '').trim();
  const nivelMin = parseInt(req.query.nivelMin, 10);
  const nivelMax = parseInt(req.query.nivelMax, 10);
  const hasNivelMin = !isNaN(nivelMin) && nivelMin >= 0;
  const hasNivelMax = !isNaN(nivelMax) && nivelMax >= 0;
  const dbConfig = config.dbEstaticos || { ...config.db, database: 'bustar_estaticos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    let sql = 'SELECT id, nombre, COALESCE(nivel, 0) AS nivel FROM objetos_modelo';
    const params = [];
    const conditions = [];
    if (q) {
      conditions.push('(nombre LIKE ? OR id = ?)');
      params.push('%' + q + '%', isNaN(parseInt(q, 10)) ? -1 : parseInt(q, 10));
    }
    if (hasNivelMin) { conditions.push('COALESCE(nivel, 0) >= ?'); params.push(nivelMin); }
    if (hasNivelMax) { conditions.push('COALESCE(nivel, 0) <= ?'); params.push(nivelMax); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY id ASC LIMIT 300';
    const [rows] = await conn.execute(sql, params.length ? params : undefined);
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Admin objetos:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar objetos.' });
  } finally {
    if (conn) conn.end();
  }
});

// Dar objetos: objetoIds = IDs de modelo (objetos_modelo). Se crean filas en tabla objetos y se enlazan al personaje.
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
  const modeloIds = objetoIds.replace(/,/g, '|').split(/\|/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  if (modeloIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Indica al menos un ID de objeto (modelo) válido.' });
  }
  const dbConfig = config.dbDinamicos || { ...config.db, database: 'bustar_dinamicos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [[row]] = await conn.execute('SELECT objetos FROM personajes WHERE id = ?', [personajeId]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
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
    console.error('Admin dar-objetos:', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar inventario.' });
  } finally {
    if (conn) conn.end();
  }
});

// --- Panes (IDs con "pan" en nombre; misma lista que api/handler.js PANES_IDS) ---
const PANES_IDS = [286, 333, 468, 492, 520, 521, 522, 524, 526, 527, 528, 536, 539, 692, 700, 760, 878, 931, 1058, 1339, 1597, 1635, 1737, 1738, 1750, 1751, 1752, 1753, 1756, 2020, 2028, 2031, 2038, 2089, 2351, 2635, 2636, 5335, 5692, 6209, 6672, 7041, 7042, 7045, 7046, 7047, 7055, 7059, 7060, 7089, 7105, 7174, 7177, 7222, 7223, 7224, 7225, 7258, 7259, 7260, 7295, 7297, 7302, 7303, 7307, 7308, 7309, 7313, 7346, 7379, 7384, 7393, 7405, 7406, 7407, 7466, 7923, 7970, 7987, 8158, 8399, 8400, 8401, 8561, 8564, 8565, 8567, 8568, 8659, 8691, 9010, 9055, 9072, 9088, 9122, 9123, 9124, 9125, 9126, 9127, 9128, 9129, 9148, 9455, 9515, 9912, 10079, 10208, 10260, 10296, 10309, 10490, 10638, 10639, 10640, 10641, 10663, 10705, 10706, 10707, 10708, 10717, 10751, 10793, 10814, 10933];

app.get('/api/user/panes', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || req.query.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) return res.status(401).json({ success: false, message: 'Sesión inválida.' });
  if (!PANES_IDS.length) return res.status(200).json({ success: true, data: [] });
  const q = String(req.query.q || req.query.nombre || '').trim();
  const nivelMin = parseInt(req.query.nivelMin, 10);
  const nivelMax = parseInt(req.query.nivelMax, 10);
  const hasNivelMin = !isNaN(nivelMin) && nivelMin >= 0;
  const hasNivelMax = !isNaN(nivelMax) && nivelMax >= 0;
  const dbConfig = config.dbEstaticos || { ...config.db, database: 'bustar_estaticos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const placeholders = PANES_IDS.map(() => '?').join(',');
    let sql = 'SELECT id, nombre, COALESCE(nivel, 0) AS nivel FROM objetos_modelo WHERE id IN (' + placeholders + ')';
    const params = [...PANES_IDS];
    if (q) {
      sql += ' AND (nombre LIKE ? OR id = ?)';
      params.push('%' + q + '%', isNaN(parseInt(q, 10)) ? -1 : parseInt(q, 10));
    }
    if (hasNivelMin) { sql += ' AND COALESCE(nivel, 0) >= ?'; params.push(nivelMin); }
    if (hasNivelMax) { sql += ' AND COALESCE(nivel, 0) <= ?'; params.push(nivelMax); }
    sql += ' ORDER BY id';
    const [rows] = await conn.execute(sql, params);
    res.status(200).json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('User panes:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar panes.' });
  } finally {
    if (conn) conn.end();
  }
});

app.post('/api/user/dar-panes', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || (req.body && req.body.cuentaId), 10);
  if (!cuentaId || isNaN(cuentaId)) return res.status(401).json({ success: false, message: 'Sesión inválida.' });
  const personajeId = parseInt(req.body && req.body.personajeId, 10);
  const objetoId = parseInt(req.body && req.body.objetoId, 10);
  let cantidad = parseInt(req.body && req.body.cantidad, 10);
  if (!personajeId || isNaN(personajeId) || !objetoId || isNaN(objetoId)) {
    return res.status(400).json({ success: false, message: 'Faltan personaje o tipo de pan.' });
  }
  if (!PANES_IDS.length || PANES_IDS.indexOf(objetoId) === -1) {
    return res.status(400).json({ success: false, message: 'Solo se pueden dar panes de la lista.' });
  }
  if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
  if (cantidad > 999) cantidad = 999;
  const dbConfig = config.dbDinamicos || { ...config.db, database: 'bustar_dinamicos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [[row]] = await conn.execute('SELECT id, objetos, cuenta FROM personajes WHERE id = ?', [personajeId]);
    if (!row) return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    if (Number(row.cuenta) !== cuentaId) return res.status(403).json({ success: false, message: 'Solo puedes dar a tus personajes.' });
    const [[{ maxId }]] = await conn.execute('SELECT COALESCE(MAX(id), 0) AS maxId FROM objetos');
    const nextId = Number(maxId) + 1;
    await conn.execute('INSERT INTO objetos (id, modelo, cantidad, posicion, stats, objevivo, precio) VALUES (?, ?, ?, -1, ?, 0, 0)', [nextId, objetoId, cantidad, '']);
    const actual = String(row.objetos || '').trim();
    const concatenado = actual ? (actual + '|' + nextId) : String(nextId);
    await conn.execute('UPDATE personajes SET objetos = ? WHERE id = ?', [concatenado, personajeId]);
    res.status(200).json({ success: true, message: 'Panes añadidos al inventario.' });
  } catch (err) {
    console.error('User dar-panes:', err.message);
    res.status(500).json({ success: false, message: 'Error al dar panes.' });
  } finally {
    if (conn) conn.end();
  }
});

app.get('/api/admin/panes', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!checkAdminPassword(req)) return res.status(401).json({ success: false, message: 'No autorizado.' });
  if (!PANES_IDS.length) return res.status(200).json({ success: true, data: [] });
  const q = String(req.query.q || req.query.nombre || '').trim();
  const nivelMin = parseInt(req.query.nivelMin, 10);
  const nivelMax = parseInt(req.query.nivelMax, 10);
  const hasNivelMin = !isNaN(nivelMin) && nivelMin >= 0;
  const hasNivelMax = !isNaN(nivelMax) && nivelMax >= 0;
  const dbConfig = config.dbEstaticos || { ...config.db, database: 'bustar_estaticos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const placeholders = PANES_IDS.map(() => '?').join(',');
    let sql = 'SELECT id, nombre, COALESCE(nivel, 0) AS nivel FROM objetos_modelo WHERE id IN (' + placeholders + ')';
    const params = [...PANES_IDS];
    if (q) {
      sql += ' AND (nombre LIKE ? OR id = ?)';
      params.push('%' + q + '%', isNaN(parseInt(q, 10)) ? -1 : parseInt(q, 10));
    }
    if (hasNivelMin) { sql += ' AND COALESCE(nivel, 0) >= ?'; params.push(nivelMin); }
    if (hasNivelMax) { sql += ' AND COALESCE(nivel, 0) <= ?'; params.push(nivelMax); }
    sql += ' ORDER BY id';
    const [rows] = await conn.execute(sql, params);
    res.status(200).json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('Admin panes:', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar panes.' });
  } finally {
    if (conn) conn.end();
  }
});

app.post('/api/admin/dar-panes', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!checkAdminPassword(req)) return res.status(401).json({ success: false, message: 'No autorizado.' });
  const personajeId = parseInt(req.body && req.body.personajeId, 10);
  const objetoId = parseInt(req.body && req.body.objetoId, 10);
  let cantidad = parseInt(req.body && req.body.cantidad, 10);
  if (!personajeId || isNaN(personajeId) || !objetoId || isNaN(objetoId)) {
    return res.status(400).json({ success: false, message: 'Faltan personaje o tipo de pan.' });
  }
  if (!PANES_IDS.length || PANES_IDS.indexOf(objetoId) === -1) {
    return res.status(400).json({ success: false, message: 'Solo se pueden dar panes de la lista.' });
  }
  if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
  if (cantidad > 999) cantidad = 999;
  const dbConfig = config.dbDinamicos || { ...config.db, database: 'bustar_dinamicos' };
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [[row]] = await conn.execute('SELECT objetos FROM personajes WHERE id = ?', [personajeId]);
    if (!row) return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    const [[{ maxId }]] = await conn.execute('SELECT COALESCE(MAX(id), 0) AS maxId FROM objetos');
    const nextId = Number(maxId) + 1;
    await conn.execute('INSERT INTO objetos (id, modelo, cantidad, posicion, stats, objevivo, precio) VALUES (?, ?, ?, -1, ?, 0, 0)', [nextId, objetoId, cantidad, '']);
    const actual = String(row.objetos || '').trim();
    const concatenado = actual ? (actual + '|' + nextId) : String(nextId);
    await conn.execute('UPDATE personajes SET objetos = ? WHERE id = ?', [concatenado, personajeId]);
    res.status(200).json({ success: true, message: 'Panes añadidos al inventario.' });
  } catch (err) {
    console.error('Admin dar-panes:', err.message);
    res.status(500).json({ success: false, message: 'Error al dar panes.' });
  } finally {
    if (conn) conn.end();
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(config.port, () => {
  const dbHost = (config.db && config.db.host) || '';
  console.log('Servidor SPA registro en http://localhost:' + config.port);
  console.log('BD: host =', dbHost || '(no definido; define DB_HOST o crea config.js)');
});
