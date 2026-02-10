// Prueba: abre en el navegador https://tu-app.vercel.app/api/health
// Si ves {"ok":true} el backend está corriendo. Si 404, Vercel no está ejecutando las funciones.
module.exports = (req, res) => {
  console.log('[health] GET /api/health');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ ok: true, message: 'Backend serverless OK' });
};
