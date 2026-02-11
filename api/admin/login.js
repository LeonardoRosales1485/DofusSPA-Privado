const adminPassword = process.env.ADMIN_PASSWORD || '210696Crows';

function checkPassword(req) {
  const p = req.headers['x-admin-password'] || (req.body && req.body.password);
  return p === adminPassword;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Método no permitido.' });
    return;
  }

  let body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  if (Object.keys(body).length === 0 && typeof req.body === 'string') {
    try { body = JSON.parse(req.body || '{}'); } catch (e) {}
  }

  const ok = checkPassword(req) || (body && body.password === adminPassword);
  res.status(200).json({ success: ok });
};
