const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  try {
    const imagePath = path.join(__dirname, '..', 'images.jfif');
    const buffer = fs.readFileSync(imagePath);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(404).end();
  }
};
