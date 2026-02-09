/**
 * Configuración: misma BD que Multi.jar (config_MultiServidor.txt).
 * BD_HOST, BD_USUARIO, BD_PASS, BD_ACCOUNTS deben coincidir.
 */
module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bustar_cuentas',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    charset: 'utf8mb4',
  },
};
