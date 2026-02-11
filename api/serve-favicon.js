const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  try {
    const faviconPath = path.join(__dirname, '..', 'favicon.ico');
    const buffer = fs.readFileSync(faviconPath);
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(404).end();
  }
};
