const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Servir index.html explicitement sur toutes les routes
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html non trouvé');
  }
});

app.get('/api/ping', (req, res) => {
  res.json({ ok: true, message: 'PRESFOR Cavally actif' });
});

// Servir les autres fichiers statiques
app.use(express.static(__dirname, { maxAge: 0 }));

app.listen(PORT, '0.0.0.0', () => {
  console.log('PRESFOR Cavally - Port ' + PORT);
  console.log('index.html existe:', fs.existsSync(path.join(__dirname, 'index.html')));
  console.log('Taille:', fs.existsSync(path.join(__dirname, 'index.html')) ? 
    fs.statSync(path.join(__dirname, 'index.html')).size + ' bytes' : 'N/A');
});
