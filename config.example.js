/**
 * Plantilla de configuración. config.js no se sube al repositorio (.gitignore).
 * Localhost y deploy usan SIEMPRE la BD de Aiven (nunca MySQL local).
 *
 * Opciones:
 * 1) Usar config.js: copia este archivo a config.js y pon tu host Aiven y password.
 * 2) Variables de entorno: DB_HOST, DB_USER, DB_PASS (en .env local o en Vercel).
 */
module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST || 'tu-host.aivencloud.com',
    port: parseInt(process.env.DB_PORT, 10) || 15482,
    database: process.env.DB_NAME || 'bustar_cuentas',
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASS || '',
    charset: 'utf8mb4',
  },
};
