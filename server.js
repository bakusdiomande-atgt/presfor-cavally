const express = require('express');
const cors    = require('cors');
const path    = require('path');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/ping', (req, res) => {
  res.json({ ok:true, message:'PRESFOR Cavally actif' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('PRESFOR Cavally - Port ' + PORT);
});
