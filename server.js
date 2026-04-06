const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  
  if (req.url === '/api/ping') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ok: true}));
    return;
  }

  // Servir index.html pour toutes les requêtes
  fs.readFile(INDEX, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Erreur: ' + err.message);
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(data),
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('PRESFOR Cavally - Port ' + PORT);
  console.log('index.html:', fs.existsSync(INDEX) ? fs.statSync(INDEX).size + ' bytes' : 'MANQUANT');
});
