/**
 * Handler único para /api/user/* y /api/admin/* (límite 12 funciones en Vercel Hobby).
 * Se invoca mediante rewrites: /api/user/:path -> /api/handler?scope=user&path=:path
 */
const mysql = require('mysql2/promise');

const adminPassword = process.env.ADMIN_PASSWORD || '210696Crows';

// IDs de objetos con "pan" en el nombre (SELECT id FROM objetos_modelo WHERE nombre LIKE '%pan%' ORDER BY id)
const PANES_IDS = [286, 333, 468, 492, 520, 521, 522, 524, 526, 527, 528, 536, 539, 692, 700, 760, 878, 931, 1058, 1339, 1597, 1635, 1737, 1738, 1750, 1751, 1752, 1753, 1756, 2020, 2028, 2031, 2038, 2089, 2351, 2635, 2636, 5335, 5692, 6209, 6672, 7041, 7042, 7045, 7046, 7047, 7055, 7059, 7060, 7089, 7105, 7174, 7177, 7222, 7223, 7224, 7225, 7258, 7259, 7260, 7295, 7297, 7302, 7303, 7307, 7308, 7309, 7313, 7346, 7379, 7384, 7393, 7405, 7406, 7407, 7466, 7923, 7970, 7987, 8158, 8399, 8400, 8401, 8561, 8564, 8565, 8567, 8568, 8659, 8691, 9010, 9055, 9072, 9088, 9122, 9123, 9124, 9125, 9126, 9127, 9128, 9129, 9148, 9455, 9515, 9912, 10079, 10208, 10260, 10296, 10309, 10490, 10638, 10639, 10640, 10641, 10663, 10705, 10706, 10707, 10708, 10717, 10751, 10793, 10814, 10933];

function getDbConfig(database) {
  const db = database || process.env.DB_DINAMICOS || 'bustar_dinamicos';
  const host = process.env.DB_HOST || 'tu-host.aivencloud.com';
  const port = parseInt(process.env.DB_PORT, 10) || 15482;
  const config = {
    host,
    port,
    database: db,
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASS || '',
    charset: 'utf8mb4',
  };
  if (port !== 3306 || host.includes('aivencloud')) config.ssl = { rejectUnauthorized: false };
  return config;
}

function checkAdmin(req) {
  return (req.headers['x-admin-password'] || (req.body && req.body.password)) === adminPassword;
}

function setCors(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cuenta-Id, X-Admin-Password');
}

// --- User: login ---
async function userLogin(req, res) {
  const body = req.body || {};
  const cuenta = String(body.cuenta || '').trim();
  const contraseña = String(body.contraseña || body.pass || '');
  if (!cuenta || !contraseña) {
    return res.status(400).json({ success: false, message: 'Cuenta y contraseña son obligatorios.' });
  }
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig(process.env.DB_NAME || 'bustar_cuentas'));
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
    console.error('[handler user/login]', err.message);
    res.status(500).json({ success: false, message: 'Error al comprobar credenciales.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- User: personajes ---
async function userPersonajes(req, res) {
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
    console.error('[handler user/personajes]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar personajes.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- User: objetos ---
async function userObjetos(req, res) {
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || req.query.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) return res.status(401).json({ success: false, message: 'Sesión inválida.' });
  const q = String(req.query.q || req.query.nombre || '').trim();
  const nivelMin = parseInt(req.query.nivelMin, 10);
  const nivelMax = parseInt(req.query.nivelMax, 10);
  const hasNivelMin = !isNaN(nivelMin) && nivelMin >= 0;
  const hasNivelMax = !isNaN(nivelMax) && nivelMax >= 0;
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig(process.env.DB_ESTATICOS || 'bustar_estaticos'));
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
    console.error('[handler user/objetos]', err.message);
    res.status(500).json({ success: false, message: 'Error al buscar objetos.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- User: inventario ---
async function userInventario(req, res) {
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || req.query.cuentaId, 10);
  const personajeId = parseInt(req.query.personajeId, 10);
  if (!cuentaId || isNaN(cuentaId) || !personajeId || isNaN(personajeId)) {
    return res.status(400).json({ success: false, message: 'Sesión o personaje inválido.' });
  }
  const dbD = getDbConfig(process.env.DB_DINAMICOS || 'bustar_dinamicos');
  const dbE = getDbConfig(process.env.DB_ESTATICOS || 'bustar_estaticos');
  let connD = null, connE = null;
  try {
    connD = await mysql.createConnection(dbD);
    let [[row]] = await connD.execute('SELECT id, nombre, objetos FROM personajes WHERE id = ? AND cuenta = ?', [personajeId, cuentaId]);
    if (!row) {
      const connC = await mysql.createConnection(getDbConfig(process.env.DB_NAME || 'bustar_cuentas'));
      const [[cr]] = await connC.execute('SELECT cuenta FROM cuentas WHERE id = ?', [cuentaId]).catch(() => [[null]]);
      connC.end();
      if (cr && cr.cuenta) [[row]] = await connD.execute('SELECT id, nombre, objetos FROM personajes WHERE id = ? AND cuenta = ?', [personajeId, cr.cuenta]);
    }
    if (!row) return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    const raw = String(row.objetos || '').trim();
    const instanceIdStrs = raw ? raw.split(/\|/).map(s => String(s).trim()).filter(Boolean) : [];
    const personajeNombre = String(row.nombre || '');
    if (instanceIdStrs.length === 0) return res.status(200).json({ success: true, data: [], personajeNombre });
    const instanceIds = instanceIdStrs.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    if (instanceIds.length === 0) return res.status(200).json({ success: true, data: [], personajeNombre });
    const [instances] = await connD.execute(`SELECT id, modelo FROM objetos WHERE id IN (${instanceIds.map(() => '?').join(',')})`, instanceIds);
    const modeloById = {};
    (instances || []).forEach(r => { modeloById[r.id] = r.modelo; });
    const modeloIds = [...new Set(Object.values(modeloById).filter(x => x != null))];
    let nombresByModelo = {};
    if (modeloIds.length > 0) {
      connE = await mysql.createConnection(dbE);
      const [modelos] = await connE.execute(`SELECT id, nombre FROM objetos_modelo WHERE id IN (${modeloIds.map(() => '?').join(',')})`, modeloIds);
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
    console.error('[handler user/inventario]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar inventario.' });
  } finally {
    if (connD) try { connD.end(); } catch (e) {}
    if (connE) try { connE.end(); } catch (e) {}
  }
}

// --- User: dar-objetos ---
async function userDarObjetos(req, res) {
  const body = req.body || {};
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || body.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) return res.status(401).json({ success: false, message: 'Sesión inválida. Inicia sesión de nuevo.' });
  const personajeId = parseInt(body.personajeId, 10);
  const objetoIds = (body.objetoIds ? String(body.objetoIds).trim() : '').replace(/,/g, '|').split(/\|/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  if (!personajeId || isNaN(personajeId) || objetoIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Faltan personaje o IDs de objetos.' });
  }
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
    const [[row]] = await conn.execute('SELECT id, objetos, cuenta FROM personajes WHERE id = ?', [personajeId]);
    if (!row) return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    if (Number(row.cuenta) !== cuentaId) return res.status(403).json({ success: false, message: 'Solo puedes dar objetos a tus propios personajes.' });
    const [[{ maxId }]] = await conn.execute('SELECT COALESCE(MAX(id), 0) AS maxId FROM objetos');
    let nextId = Number(maxId) + 1;
    const newInstanceIds = [];
    for (const modeloId of objetoIds) {
      await conn.execute('INSERT INTO objetos (id, modelo, cantidad, posicion, stats, objevivo, precio) VALUES (?, ?, 1, -1, ?, 0, 0)', [nextId, modeloId, '']);
      newInstanceIds.push(nextId);
      nextId += 1;
    }
    const actual = String(row.objetos || '').trim();
    const concatenado = actual ? (actual + '|' + newInstanceIds.join('|')) : newInstanceIds.join('|');
    await conn.execute('UPDATE personajes SET objetos = ? WHERE id = ?', [concatenado, personajeId]);
    res.status(200).json({ success: true, message: 'Objetos añadidos al inventario.' });
  } catch (err) {
    console.error('[handler user/dar-objetos]', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar inventario.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- Admin: login ---
function adminLogin(req, res) {
  res.status(200).json({ success: checkAdmin(req) });
}

// --- Admin: personajes ---
async function adminPersonajes(req, res) {
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
    const [rows] = await conn.execute('SELECT id, nombre, nivel, clase, cuenta FROM personajes ORDER BY nombre ASC');
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[handler admin/personajes]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar personajes.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- Admin: objetos ---
async function adminObjetos(req, res) {
  const q = String(req.query.q || req.query.nombre || '').trim();
  const nivelMin = parseInt(req.query.nivelMin, 10);
  const nivelMax = parseInt(req.query.nivelMax, 10);
  const hasNivelMin = !isNaN(nivelMin) && nivelMin >= 0;
  const hasNivelMax = !isNaN(nivelMax) && nivelMax >= 0;
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig(process.env.DB_ESTATICOS || 'bustar_estaticos'));
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
    console.error('[handler admin/objetos]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar objetos.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- Admin: inventario ---
async function adminInventario(req, res) {
  const personajeId = parseInt(req.query.personajeId, 10);
  if (!personajeId || isNaN(personajeId)) return res.status(400).json({ success: false, message: 'personajeId obligatorio.' });
  const dbD = getDbConfig(process.env.DB_DINAMICOS || 'bustar_dinamicos');
  const dbE = getDbConfig(process.env.DB_ESTATICOS || 'bustar_estaticos');
  let connD = null, connE = null;
  try {
    connD = await mysql.createConnection(dbD);
    const [[row]] = await connD.execute('SELECT id, nombre, objetos FROM personajes WHERE id = ?', [personajeId]);
    if (!row) return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    const raw = String(row.objetos || '').trim();
    const instanceIdStrs = raw ? raw.split(/\|/).map(s => String(s).trim()).filter(Boolean) : [];
    const personajeNombre = String(row.nombre || '');
    if (instanceIdStrs.length === 0) return res.status(200).json({ success: true, data: [], personajeNombre });
    const instanceIds = instanceIdStrs.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    if (instanceIds.length === 0) return res.status(200).json({ success: true, data: [], personajeNombre });
    const [instances] = await connD.execute(`SELECT id, modelo FROM objetos WHERE id IN (${instanceIds.map(() => '?').join(',')})`, instanceIds);
    const modeloById = {};
    (instances || []).forEach(r => { modeloById[r.id] = r.modelo; });
    const modeloIds = [...new Set(Object.values(modeloById).filter(x => x != null))];
    let nombresByModelo = {};
    if (modeloIds.length > 0) {
      connE = await mysql.createConnection(dbE);
      const [modelos] = await connE.execute(`SELECT id, nombre FROM objetos_modelo WHERE id IN (${modeloIds.map(() => '?').join(',')})`, modeloIds);
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
    console.error('[handler admin/inventario]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar inventario.' });
  } finally {
    if (connD) try { connD.end(); } catch (e) {}
    if (connE) try { connE.end(); } catch (e) {}
  }
}

// --- Admin: dar-objetos (INSERT en objetos + update personajes) ---
async function adminDarObjetos(req, res) {
  let body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  if (Object.keys(body).length === 0 && typeof req.body === 'string') { try { body = JSON.parse(req.body || '{}'); } catch (e) {} }
  const personajeId = parseInt(body.personajeId, 10);
  const objetoIds = (body.objetoIds != null ? String(body.objetoIds).trim() : '').replace(/,/g, '|').split(/\|/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  if (!personajeId || isNaN(personajeId) || objetoIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Faltan personajeId u objetoIds.' });
  }
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
    const [[row]] = await conn.execute('SELECT objetos FROM personajes WHERE id = ?', [personajeId]);
    if (!row) return res.status(404).json({ success: false, message: 'Personaje no encontrado.' });
    const [[{ maxId }]] = await conn.execute('SELECT COALESCE(MAX(id), 0) AS maxId FROM objetos');
    let nextId = Number(maxId) + 1;
    const newInstanceIds = [];
    for (const modeloId of objetoIds) {
      await conn.execute('INSERT INTO objetos (id, modelo, cantidad, posicion, stats, objevivo, precio) VALUES (?, ?, 1, -1, ?, 0, 0)', [nextId, modeloId, '']);
      newInstanceIds.push(nextId);
      nextId += 1;
    }
    const actual = String(row.objetos || '').trim();
    const concatenado = actual ? (actual + '|' + newInstanceIds.join('|')) : newInstanceIds.join('|');
    await conn.execute('UPDATE personajes SET objetos = ? WHERE id = ?', [concatenado, personajeId]);
    res.status(200).json({ success: true, message: 'Objetos añadidos al inventario.' });
  } catch (err) {
    console.error('[handler admin/dar-objetos]', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar inventario.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- User: lista de panes (filtro AND: nombre y rango de nivel) ---
async function userPanes(req, res) {
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || req.query.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) return res.status(401).json({ success: false, message: 'Sesión inválida.' });
  if (!PANES_IDS.length) return res.status(200).json({ success: true, data: [] });
  const q = String(req.query.q || req.query.nombre || '').trim();
  const nivelMin = parseInt(req.query.nivelMin, 10);
  const nivelMax = parseInt(req.query.nivelMax, 10);
  const hasNivelMin = !isNaN(nivelMin) && nivelMin >= 0;
  const hasNivelMax = !isNaN(nivelMax) && nivelMax >= 0;
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig(process.env.DB_ESTATICOS || 'bustar_estaticos'));
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
    console.error('[handler user/panes]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar panes.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- Admin: lista de panes (filtro AND: nombre y rango de nivel) ---
async function adminPanes(req, res) {
  if (!PANES_IDS.length) return res.status(200).json({ success: true, data: [] });
  const q = String(req.query.q || req.query.nombre || '').trim();
  const nivelMin = parseInt(req.query.nivelMin, 10);
  const nivelMax = parseInt(req.query.nivelMax, 10);
  const hasNivelMin = !isNaN(nivelMin) && nivelMin >= 0;
  const hasNivelMax = !isNaN(nivelMax) && nivelMax >= 0;
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig(process.env.DB_ESTATICOS || 'bustar_estaticos'));
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
    console.error('[handler admin/panes]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar panes.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- User: dar-panes (un solo tipo de pan, cantidad N) ---
async function userDarPanes(req, res) {
  const body = req.body || {};
  const cuentaId = parseInt(req.headers['x-cuenta-id'] || body.cuentaId, 10);
  if (!cuentaId || isNaN(cuentaId)) return res.status(401).json({ success: false, message: 'Sesión inválida.' });
  const personajeId = parseInt(body.personajeId, 10);
  const objetoId = parseInt(body.objetoId, 10);
  let cantidad = parseInt(body.cantidad, 10);
  if (!personajeId || isNaN(personajeId) || !objetoId || isNaN(objetoId)) {
    return res.status(400).json({ success: false, message: 'Faltan personaje o tipo de pan.' });
  }
  if (!PANES_IDS.length || PANES_IDS.indexOf(objetoId) === -1) {
    return res.status(400).json({ success: false, message: 'Solo se pueden dar panes de la lista.' });
  }
  if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
  if (cantidad > 999) cantidad = 999;
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
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
    console.error('[handler user/dar-panes]', err.message);
    res.status(500).json({ success: false, message: 'Error al dar panes.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

// --- Admin: dar-panes ---
async function adminDarPanes(req, res) {
  let body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  if (Object.keys(body).length === 0 && typeof req.body === 'string') { try { body = JSON.parse(req.body || '{}'); } catch (e) {} }
  const personajeId = parseInt(body.personajeId, 10);
  const objetoId = parseInt(body.objetoId, 10);
  let cantidad = parseInt(body.cantidad, 10);
  if (!personajeId || isNaN(personajeId) || !objetoId || isNaN(objetoId)) {
    return res.status(400).json({ success: false, message: 'Faltan personaje o tipo de pan.' });
  }
  if (!PANES_IDS.length || PANES_IDS.indexOf(objetoId) === -1) {
    return res.status(400).json({ success: false, message: 'Solo se pueden dar panes de la lista.' });
  }
  if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
  if (cantidad > 999) cantidad = 999;
  let conn;
  try {
    conn = await mysql.createConnection(getDbConfig());
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
    console.error('[handler admin/dar-panes]', err.message);
    res.status(500).json({ success: false, message: 'Error al dar panes.' });
  } finally {
    if (conn) try { conn.end(); } catch (e) {}
  }
}

const userRoutes = {
  login: { method: 'POST', fn: userLogin },
  personajes: { method: 'GET', fn: userPersonajes },
  objetos: { method: 'GET', fn: userObjetos },
  panes: { method: 'GET', fn: userPanes },
  inventario: { method: 'GET', fn: userInventario },
  'dar-objetos': { method: 'POST', fn: userDarObjetos },
  'dar-panes': { method: 'POST', fn: userDarPanes },
};

const adminRoutes = {
  login: { method: 'POST', fn: adminLogin },
  personajes: { method: 'GET', fn: adminPersonajes },
  objetos: { method: 'GET', fn: adminObjetos },
  panes: { method: 'GET', fn: adminPanes },
  inventario: { method: 'GET', fn: adminInventario },
  'dar-objetos': { method: 'POST', fn: adminDarObjetos },
  'dar-panes': { method: 'POST', fn: adminDarPanes },
};

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const scope = req.query.scope;
  const path = req.query.path;

  if (scope === 'user' && path && userRoutes[path]) {
    const r = userRoutes[path];
    if (req.method !== r.method) {
      return res.status(405).json({ success: false, message: 'Método no permitido.' });
    }
    return r.fn(req, res);
  }

  if (scope === 'admin' && path && adminRoutes[path]) {
    const r = adminRoutes[path];
    if (req.method !== r.method) {
      return res.status(405).json({ success: false, message: 'Método no permitido.' });
    }
    if (path !== 'login' && !checkAdmin(req)) {
      return res.status(401).json({ success: false, message: 'No autorizado.' });
    }
    return r.fn(req, res);
  }

  res.status(404).json({ success: false, message: 'Ruta no encontrada.' });
};
