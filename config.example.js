/**
 * Plantilla de configuración. config.js no se sube al repositorio (.gitignore).
 * Por defecto se usa MySQL local. Para Aiven u otro remoto, define DB_HOST, DB_PORT, DB_USER, DB_PASS.
 *
 * Opciones:
 * 1) Usar config.js: copia este archivo a config.js y ajusta host, user, password.
 * 2) Variables de entorno: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, DB_DINAMICOS, DB_ESTATICOS.
 */
module.exports = {
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
