const mysql = require('mysql2/promise');

function getDbConfig(database) {
  const host = process.env.DB_HOST || 'tu-host.aivencloud.com';
  const port = parseInt(process.env.DB_PORT, 10) || 15482;
  const config = {
    host,
    port,
    database: database || 'bustar_dinamicos',
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
  const personajeId = parseInt(req.query.personajeId, 10);
  if (!cuentaId || isNaN(cuentaId) || !personajeId || isNaN(personajeId)) {
    return res.status(400).json({ success: false, message: 'Sesión o personaje inválido.' });
  }

  const dbDinamicos = getDbConfig(process.env.DB_DINAMICOS || 'bustar_dinamicos');
  const dbEstaticos = getDbConfig(process.env.DB_ESTATICOS || 'bustar_estaticos');
  let connD = null;
  let connE = null;

  try {
    connD = await mysql.createConnection(dbDinamicos);
    let [[row]] = await connD.execute('SELECT id, nombre, objetos FROM personajes WHERE id = ? AND cuenta = ?', [personajeId, cuentaId]);
    if (!row) {
      const connCuentas = await mysql.createConnection(getDbConfig(process.env.DB_NAME || 'bustar_cuentas'));
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
    console.error('[user/inventario]', err.message);
    res.status(500).json({ success: false, message: 'Error al cargar inventario.' });
  } finally {
    if (connD) try { connD.end(); } catch (e) {}
    if (connE) try { connE.end(); } catch (e) {}
  }
};
