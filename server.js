// ================================================================
//  PRESFOR CAVALLY - Serveur local multi-utilisateurs
//  Stockage : fichiers JSON (aucune compilation requise)
//  Lancer   : node server.js
// ================================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');

const app  = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const FILES = {
  programmes : path.join(DATA_DIR, 'programmes.json'),
  saisies    : path.join(DATA_DIR, 'saisies.json'),
  connexions : path.join(DATA_DIR, 'connexions.json'),
};

function lire(f) {
  try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) || [] : []; }
  catch(e) { return []; }
}
function ecrire(f, d) {
  try { fs.writeFileSync(f, JSON.stringify(d, null, 2), 'utf8'); return true; }
  catch(e) { return false; }
}
function now() { return new Date().toLocaleString('fr-FR'); }

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── PROGRAMMES ──
app.get('/api/programmes', (req, res) => {
  let d = lire(FILES.programmes);
  if (req.query.agent)  d = d.filter(p => p.agent  === req.query.agent);
  if (req.query.dept)   d = d.filter(p => p.dept   === req.query.dept);
  if (req.query.statut) d = d.filter(p => p.statut === req.query.statut);
  d.sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''));
  res.json({ ok:true, data:d });
});

app.get('/api/programmes/:id', (req, res) => {
  const p = lire(FILES.programmes).find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'Introuvable' });
  res.json({ ok:true, data:p });
});

app.post('/api/programmes', (req, res) => {
  const d = lire(FILES.programmes);
  if (d.find(p => p.id === req.body.id)) return res.status(400).json({ ok:false, error:'ID existant' });
  d.unshift({ ...req.body, created_at:now(), updated_at:now() });
  ecrire(FILES.programmes, d);
  console.log('Programme cree:', req.body.id, '-', req.body.agent);
  res.json({ ok:true, id:req.body.id });
});

app.put('/api/programmes/:id', (req, res) => {
  const d = lire(FILES.programmes);
  const i = d.findIndex(p => p.id === req.params.id);
  if (i===-1) return res.status(404).json({ ok:false, error:'Introuvable' });
  d[i] = { ...d[i], ...req.body, updated_at:now() };
  ecrire(FILES.programmes, d);
  res.json({ ok:true });
});

app.delete('/api/programmes/:id', (req, res) => {
  const liees = lire(FILES.saisies).filter(s => s.prog_ref === req.params.id).length;
  if (liees > 0) return res.status(400).json({ ok:false, error: liees+' saisie(s) liee(s). Supprimez-les d abord.' });
  ecrire(FILES.programmes, lire(FILES.programmes).filter(p => p.id !== req.params.id));
  res.json({ ok:true });
});

// ── SAISIES ──
app.get('/api/saisies', (req, res) => {
  let d = lire(FILES.saisies);
  if (req.query.agent)    d = d.filter(s => s.agent    === req.query.agent);
  if (req.query.dept)     d = d.filter(s => s.dept     === req.query.dept);
  if (req.query.date)     d = d.filter(s => s.date     === req.query.date);
  if (req.query.prog_ref) d = d.filter(s => s.prog_ref === req.query.prog_ref);
  d.sort((a,b) => (b.date||'').localeCompare(a.date||''));
  res.json({ ok:true, data:d });
});

app.post('/api/saisies', (req, res) => {
  const d = lire(FILES.saisies);
  if (d.find(s => s.id === req.body.id)) return res.status(400).json({ ok:false, error:'ID existant' });
  d.unshift({ ...req.body, created_at:now() });
  ecrire(FILES.saisies, d);
  if (req.body.prog_ref) majRealise(req.body.prog_ref);
  console.log('Saisie creee:', req.body.id, '-', req.body.agent, '-', req.body.date, '-', req.body.ndos, 'dossiers');
  res.json({ ok:true, id:req.body.id });
});

app.put('/api/saisies/:id', (req, res) => {
  const d = lire(FILES.saisies);
  const i = d.findIndex(s => s.id === req.params.id);
  if (i===-1) return res.status(404).json({ ok:false, error:'Introuvable' });
  const old = d[i].prog_ref;
  d[i] = { ...d[i], ...req.body, updated_at:now() };
  ecrire(FILES.saisies, d);
  if (old) majRealise(old);
  if (req.body.prog_ref && req.body.prog_ref !== old) majRealise(req.body.prog_ref);
  res.json({ ok:true });
});

app.delete('/api/saisies/:id', (req, res) => {
  let d = lire(FILES.saisies);
  const s = d.find(s => s.id === req.params.id);
  ecrire(FILES.saisies, d.filter(s => s.id !== req.params.id));
  if (s && s.prog_ref) majRealise(s.prog_ref);
  res.json({ ok:true });
});

function majRealise(progRef) {
  const saisies = lire(FILES.saisies);
  const progs   = lire(FILES.programmes);
  const total   = saisies.filter(s => s.prog_ref === progRef).reduce((sum,s) => sum+(s.ndos||0), 0);
  const i       = progs.findIndex(p => p.id === progRef);
  if (i !== -1) { progs[i].realise = total; progs[i].updated_at = now(); ecrire(FILES.programmes, progs); }
}

// ── STATS ──
app.get('/api/stats', (req, res) => {
  const progs   = lire(FILES.programmes);
  const saisies = lire(FILES.saisies);
  const today   = new Date().toISOString().split('T')[0];
  const parAgent = {};
  saisies.forEach(s => {
    if (!parAgent[s.agent]) parAgent[s.agent] = { agent:s.agent, nb_saisies:0, total_dossiers:0, derniere_saisie:'' };
    parAgent[s.agent].nb_saisies++;
    parAgent[s.agent].total_dossiers += (s.ndos||0);
    if (s.date > parAgent[s.agent].derniere_saisie) parAgent[s.agent].derniere_saisie = s.date;
  });
  res.json({ ok:true, data: {
    programmes: {
      total:     progs.length,
      en_cours:  progs.filter(p=>p.statut==='En cours').length,
      planifie:  progs.filter(p=>p.statut==='Planifie').length,
      en_retard: progs.filter(p=>p.statut==='En retard').length,
      termine:   progs.filter(p=>p.statut==='Termine').length,
    },
    saisies: {
      total:                saisies.length,
      aujourd_hui:          saisies.filter(s=>s.date===today).length,
      dossiers_total:       saisies.reduce((sum,s)=>sum+(s.ndos||0),0),
      dossiers_aujourd_hui: saisies.filter(s=>s.date===today).reduce((sum,s)=>sum+(s.ndos||0),0),
    },
    par_agent: Object.values(parAgent).sort((a,b)=>b.total_dossiers-a.total_dossiers),
  }});
});

// Log connexion
app.post('/api/connexion', (req, res) => {
  const cx = lire(FILES.connexions);
  cx.unshift({ agent:req.body.agent, ip:req.ip||'', connecte_a:now() });
  ecrire(FILES.connexions, cx.slice(0,200));
  console.log('Connexion:', req.body.agent);
  res.json({ ok:true });
});

// Export CSV
app.get('/api/export/saisies.csv', (req, res) => {
  const saisies = lire(FILES.saisies);
  const h = 'id,date,agent,dept,sp,village,etape,ndos,hdep,hret,duree,km,incident,meteo,obs,prog_ref,created_at';
  const l = saisies.map(s=>[s.id,s.date,s.agent,s.dept,s.sp||'',s.village,s.etape,s.ndos,s.hdep||'',s.hret||'',s.duree||'',s.km||0,s.incident||'',s.meteo||'',s.obs||'',s.prog_ref||'',s.created_at||''].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(','));
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename=presfor_saisies.csv');
  res.send('\uFEFF'+[h,...l].join('\n'));
});

// Ping
app.get('/api/ping', (req, res) => {
  res.json({ ok:true, message:'PRESFOR Cavally - serveur actif', heure:now(), base:{ programmes:lire(FILES.programmes).length, saisies:lire(FILES.saisies).length } });
});

// Demarrage
app.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i=>i.family==='IPv4'&&!i.internal);
  console.log('');
  console.log('  PRESFOR CAVALLY - Serveur demarre');
  console.log('  ====================================');
  console.log('  Acces local : http://localhost:'+PORT);
  if (ips.length) { console.log('  Acces agents (hotspot WiFi) :'); ips.forEach(i=>console.log('    http://'+i.address+':'+PORT)); }
  console.log('  Donnees dans : '+DATA_DIR);
  console.log('  Ctrl+C pour arreter.');
  console.log('');
});
