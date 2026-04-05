// ================================================================
//  PRESFOR CAVALLY - Serveur Railway avec stockage persistant
//  Volume Railway monté sur /data pour la persistance
// ================================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Dossier de données : Volume Railway ou dossier local ──
const DATA_DIR = process.env.DATA_DIR || '/data';
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true}); } catch(e) {
  console.log('Volume non disponible, utilisation du dossier local');
}

const FILES = {
  programmes : path.join(DATA_DIR, 'programmes.json'),
  saisies    : path.join(DATA_DIR, 'saisies.json'),
  dossiers   : path.join(DATA_DIR, 'dossiers.json'),
  absences   : path.join(DATA_DIR, 'absences.json'),
  connexions : path.join(DATA_DIR, 'connexions.json'),
};

// Cache mémoire
const CACHE = { programmes:null, saisies:null, dossiers:null, absences:null, connexions:null };

function lire(f) {
  const key = Object.keys(FILES).find(k=>FILES[k]===f);
  if(key && CACHE[key]) return CACHE[key];
  try {
    const data = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,'utf8')) || [] : [];
    if(key) CACHE[key] = data;
    return data;
  } catch(e) { return CACHE[key] || []; }
}

function ecrire(f, d) {
  const key = Object.keys(FILES).find(k=>FILES[k]===f);
  if(key) CACHE[key] = d;
  try { fs.writeFileSync(f, JSON.stringify(d,null,2),'utf8'); return true; }
  catch(e) { console.error('Erreur écriture:', e.message); return false; }
}

function now() { return new Date().toLocaleString('fr-FR'); }

app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use(express.static(__dirname));

// ══════════════════════════════════════════
// API SAUVEGARDE GLOBALE (push/pull tout)
// ══════════════════════════════════════════

// Charger toutes les données en une seule requête
app.get('/api/sync', (req, res) => {
  res.json({
    ok: true,
    data: {
      programmes : lire(FILES.programmes),
      saisies    : lire(FILES.saisies),
      dossiers   : lire(FILES.dossiers),
      absences   : lire(FILES.absences),
    },
    timestamp: new Date().toISOString()
  });
});

// Sauvegarder toutes les données en une seule requête
app.post('/api/sync', (req, res) => {
  const { programmes, saisies, dossiers, absences } = req.body;
  let ok = true;
  if(programmes !== undefined) ok = ecrire(FILES.programmes, programmes) && ok;
  if(saisies    !== undefined) ok = ecrire(FILES.saisies,    saisies)    && ok;
  if(dossiers   !== undefined) ok = ecrire(FILES.dossiers,   dossiers)   && ok;
  if(absences   !== undefined) ok = ecrire(FILES.absences,   absences)   && ok;
  console.log('Sync sauvegardée —', 
    (programmes||[]).length, 'programmes,',
    (saisies||[]).length, 'saisies,',
    (dossiers||[]).length, 'dossiers');
  res.json({ ok, timestamp: new Date().toISOString() });
});

// ── PROGRAMMES ──
app.get('/api/programmes', (req, res) => {
  let d = lire(FILES.programmes);
  if(req.query.agent)  d = d.filter(p=>p.agent===req.query.agent);
  if(req.query.dept)   d = d.filter(p=>p.dept===req.query.dept);
  if(req.query.statut) d = d.filter(p=>p.statut===req.query.statut);
  res.json({ok:true, data:d});
});
app.post('/api/programmes', (req, res) => {
  const d = lire(FILES.programmes);
  if(d.find(p=>p.id===req.body.id)) return res.status(400).json({ok:false,error:'ID existant'});
  d.unshift({...req.body,created_at:now(),updated_at:now()});
  ecrire(FILES.programmes,d);
  res.json({ok:true,id:req.body.id});
});
app.put('/api/programmes/:id', (req, res) => {
  const d=lire(FILES.programmes), i=d.findIndex(p=>p.id===req.params.id);
  if(i===-1) return res.status(404).json({ok:false,error:'Introuvable'});
  d[i]={...d[i],...req.body,updated_at:now()};
  ecrire(FILES.programmes,d); res.json({ok:true});
});
app.delete('/api/programmes/:id', (req, res) => {
  ecrire(FILES.programmes,lire(FILES.programmes).filter(p=>p.id!==req.params.id));
  res.json({ok:true});
});

// ── SAISIES ──
app.get('/api/saisies', (req, res) => {
  let d=lire(FILES.saisies);
  if(req.query.agent) d=d.filter(s=>s.agent===req.query.agent);
  if(req.query.date)  d=d.filter(s=>s.date===req.query.date);
  res.json({ok:true,data:d});
});
app.post('/api/saisies', (req, res) => {
  const d=lire(FILES.saisies);
  if(d.find(s=>s.id===req.body.id)) return res.status(400).json({ok:false,error:'ID existant'});
  d.unshift({...req.body,created_at:now()});
  ecrire(FILES.saisies,d); res.json({ok:true,id:req.body.id});
});
app.put('/api/saisies/:id', (req, res) => {
  const d=lire(FILES.saisies), i=d.findIndex(s=>s.id===req.params.id);
  if(i===-1) return res.status(404).json({ok:false,error:'Introuvable'});
  d[i]={...d[i],...req.body,updated_at:now()};
  ecrire(FILES.saisies,d); res.json({ok:true});
});
app.delete('/api/saisies/:id', (req, res) => {
  ecrire(FILES.saisies,lire(FILES.saisies).filter(s=>s.id!==req.params.id));
  res.json({ok:true});
});

// ── DOSSIERS ──
app.get('/api/dossiers', (req, res) => {
  let d=lire(FILES.dossiers);
  if(req.query.dept)  d=d.filter(x=>x.dept===req.query.dept);
  if(req.query.agent) d=d.filter(x=>x.agent===req.query.agent);
  res.json({ok:true,data:d});
});
app.post('/api/dossiers', (req, res) => {
  const d=lire(FILES.dossiers);
  if(d.find(x=>x.id===req.body.id)) return res.status(400).json({ok:false,error:'ID existant'});
  d.unshift({...req.body,created_at:now()});
  ecrire(FILES.dossiers,d); res.json({ok:true,id:req.body.id});
});
app.put('/api/dossiers/:id', (req, res) => {
  const d=lire(FILES.dossiers), i=d.findIndex(x=>x.id===req.params.id);
  if(i===-1) return res.status(404).json({ok:false,error:'Introuvable'});
  d[i]={...d[i],...req.body,updated_at:now()};
  ecrire(FILES.dossiers,d); res.json({ok:true});
});
app.delete('/api/dossiers/:id', (req, res) => {
  ecrire(FILES.dossiers,lire(FILES.dossiers).filter(x=>x.id!==req.params.id));
  res.json({ok:true});
});

// ── ABSENCES ──
app.get('/api/absences', (req,res) => res.json({ok:true,data:lire(FILES.absences)}));
app.post('/api/absences', (req,res) => {
  const d=lire(FILES.absences);
  d.unshift({...req.body,created_at:now()});
  ecrire(FILES.absences,d); res.json({ok:true});
});

// ── PING & STATS ──
app.get('/api/ping', (req, res) => {
  res.json({ok:true, heure:now(),
    base:{
      programmes:lire(FILES.programmes).length,
      saisies:lire(FILES.saisies).length,
      dossiers:lire(FILES.dossiers).length,
    }
  });
});

app.get('/api/stats', (req, res) => {
  const progs=lire(FILES.programmes), saisies=lire(FILES.saisies);
  const today=new Date().toISOString().split('T')[0];
  res.json({ok:true, data:{
    programmes:{total:progs.length,en_cours:progs.filter(p=>p.statut==='En cours').length},
    saisies:{total:saisies.length,aujourd_hui:saisies.filter(s=>s.date===today).length,
      dossiers_total:saisies.reduce((s,x)=>s+(x.ndos||0),0)},
  }});
});

// Export CSV
app.get('/api/export/saisies.csv', (req, res) => {
  const saisies=lire(FILES.saisies);
  const h='id,date,agent,dept,sp,village,etape,ndos,superficie,obs,prog_ref';
  const l=saisies.map(s=>[s.id,s.date,s.agent,s.dept,s.sp||'',s.village,s.etape,s.ndos,s.superficie||0,s.obs||'',s.prog_ref||''].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(','));
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename=presfor_saisies.csv');
  res.send('\uFEFF'+[h,...l].join('\n'));
});

// Démarrage
app.listen(PORT, '0.0.0.0', () => {
  const ips=Object.values(os.networkInterfaces()).flat().filter(i=>i.family==='IPv4'&&!i.internal);
  console.log('\n  PRESFOR CAVALLY — Serveur démarré');
  console.log('  Port:', PORT);
  console.log('  Données:', DATA_DIR);
  if(ips.length) ips.forEach(i=>console.log('  Agents:', 'http://'+i.address+':'+PORT));
  console.log('');
});
