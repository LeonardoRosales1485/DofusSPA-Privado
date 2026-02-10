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

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(config.port, () => {
  console.log('Servidor SPA registro en http://localhost:' + config.port);
});
