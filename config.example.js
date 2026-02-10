/**
 * Plantilla de configuración. Copia a config.js y rellena con tus datos.
 * config.js no se sube al repositorio (está en .gitignore).
 * En Vercel se usan las variables de entorno DB_*.
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
