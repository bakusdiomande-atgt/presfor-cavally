const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

app.get('/api/ping', (req, res) => {
  res.json({ ok: true, message: 'PRESFOR Cavally actif' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('PRESFOR Cavally - Port ' + PORT);
});
