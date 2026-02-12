const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  try {
    const noimgPath = path.join(__dirname, 'user', 'items', 'noimg.jpg');
    const buffer = fs.readFileSync(noimgPath);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(404).end();
  }
};
