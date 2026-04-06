const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

// Route principale — lire et envoyer index.html directement
app.get('/', (req, res) => {
  try {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).send(html);
  } catch(e) {
    res.status(500).send('Erreur: ' + e.message);
  }
});

app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('PRESFOR Cavally - Port ' + PORT);
  console.log('index.html:', fs.existsSync(path.join(__dirname, 'index.html')) ? 'OK' : 'MANQUANT');
});
