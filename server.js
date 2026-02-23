'use strict';

// ============================================================
// COMITÉ D'ÉTHIQUE — SERVEUR BACKEND (Production Ready)
// ============================================================

const express     = require('express');
const session     = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt      = require('bcryptjs');
const helmet      = require('helmet');
const cors        = require('cors');
const path        = require('path');
const Database    = require('better-sqlite3');

const app  = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD  = NODE_ENV === 'production';

// SESSION_SECRET : obligatoire en prod, fallback aléatoire en dev
const SECRET = process.env.SESSION_SECRET || (
  IS_PROD
    ? (console.error('[ERREUR] SESSION_SECRET non défini en production !'), process.exit(1))
    : 'dev_secret_local_' + Math.random()
);

// ============================================================
// BASE DE DONNÉES SQLite
// ============================================================
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'comite.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plaintes (
    id          TEXT    PRIMARY KEY,
    date        TEXT    NOT NULL,
    anonymous   INTEGER NOT NULL DEFAULT 0,
    plaignant   TEXT,
    grade       TEXT,
    personne    TEXT    NOT NULL,
    categorie   TEXT    NOT NULL,
    gravite     TEXT    NOT NULL,
    date_faits  TEXT,
    description TEXT    NOT NULL,
    demandes    TEXT,
    status      TEXT    NOT NULL DEFAULT 'EN_ATTENTE',
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id           TEXT PRIMARY KEY,
    date         TEXT NOT NULL,
    expediteur   TEXT,
    destinataire TEXT NOT NULL,
    nature       TEXT NOT NULL,
    sujet        TEXT NOT NULL,
    message      TEXT NOT NULL,
    urgent       INTEGER DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'NON_LU',
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL,
    anonymous   INTEGER DEFAULT 0,
    auteur      TEXT,
    domaine     TEXT NOT NULL,
    titre       TEXT NOT NULL,
    description TEXT NOT NULL,
    priorite    TEXT NOT NULL DEFAULT 'NORMALE',
    status      TEXT NOT NULL DEFAULT 'NON_LU',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS protocols (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    category   TEXT NOT NULL,
    version    TEXT NOT NULL DEFAULT 'v1.0',
    date       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS site_content (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ============================================================
// DONNÉES PAR DÉFAUT
// ============================================================
const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('aze23aze23', 12);
  db.prepare('INSERT INTO admins (username, password, name) VALUES (?, ?, ?)')
    .run('aze', hash, 'Aze');
  console.log('[INIT] Compte admin créé : admin / comite2026');
  console.log('[⚠]   Changez ce mot de passe via le panneau admin !');
}

const protoCount = db.prepare('SELECT COUNT(*) as n FROM protocols').get().n;
if (protoCount === 0) {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO protocols (id, title, category, version, date, content) VALUES (?, ?, ?, ?, ?, ?)'
  );
  ins.run('CE-2026-01', 'Code de Conduite Général', 'ÉTHIQUE', 'v3.2', '2026-01-10',
    "PROTOCOLE CE-2026-01 — CODE DE CONDUITE GÉNÉRAL\n\nARTICLE 1 — PRINCIPES FONDAMENTAUX\nTout membre s'engage à respecter les principes d'intégrité, d'impartialité et de professionnalisme.\n\nARTICLE 2 — OBLIGATIONS\n2.1 Respecter la hiérarchie et les procédures établies\n2.2 Traiter toutes les parties avec équité\n2.3 Signaler tout conflit d'intérêt potentiel\n2.4 Maintenir la confidentialité des informations sensibles\n\nARTICLE 3 — SANCTIONS\nTout manquement est passible de sanctions disciplinaires pouvant aller jusqu'à l'exclusion."
  );
  ins.run('CE-2026-02', 'Traitement des Plaintes', 'PROCÉDURE', 'v2.1', '2026-01-15',
    "PROTOCOLE CE-2026-02 — TRAITEMENT DES PLAINTES\n\nÉTAPE 1 : RÉCEPTION — Accusé de réception sous 48h ouvrées.\nÉTAPE 2 : INSTRUCTION — Rapporteur nommé. Délai d'instruction : 30 jours.\nÉTAPE 3 : DÉLIBÉRATION — Examen en séance plénière. Vote à la majorité simple.\nÉTAPE 4 : DÉCISION — Notification aux parties. Possibilité d'appel sous 15 jours."
  );
  ins.run('CE-2026-03', 'Sécurité des Données', 'SÉCURITÉ', 'v1.5', '2026-01-20',
    "PROTOCOLE CE-2026-03 — SÉCURITÉ DES DONNÉES\n\nCLASSIFICATION\n- NIVEAU 0 : Public\n- NIVEAU 1 : Usage interne\n- NIVEAU 2 : Confidentiel\n- NIVEAU 3 : Secret\n\nAccès niveaux 2+ : habilitation explicite requise du Président."
  );
  ins.run('CE-2026-04', "Protocole d'Urgence Éthique", 'URGENCE', 'v1.0', '2026-02-15',
    "PROTOCOLE CE-2026-04 — URGENCE ÉTHIQUE\n\nActivation : Signalement immédiat au Président.\nConvocation extraordinaire sous 24h.\nMesures conservatoires immédiates si nécessaire.\nRapport préliminaire sous 72h."
  );
  ins.run('CE-2025-08', "Gestion des Conflits d'Intérêt", 'ÉTHIQUE', 'v2.0', '2025-11-03',
    "PROTOCOLE CE-2025-08 — CONFLITS D'INTÉRÊT\n\nTout membre doit déclarer tout conflit d'intérêt avant toute délibération.\nLe membre concerné se retire de la délibération.\nLe Comité statue sur la suite à donner."
  );
  console.log('[INIT] Protocoles par défaut créés.');
}

const contentExists = db.prepare("SELECT key FROM site_content WHERE key = 'description'").get();
if (!contentExists) {
  db.prepare('INSERT INTO site_content (key, value) VALUES (?, ?)').run(
    'description',
    "Le Comité d'Éthique est l'instance indépendante chargée de veiller au respect des principes éthiques, déontologiques et réglementaires au sein de l'organisation. Fondé comme organe délibératif supérieur, il représente la conscience institutionnelle de la structure et garantit l'intégrité de toutes ses opérations.\n\nLe Comité exerce une autorité consultative et disciplinaire sur l'ensemble des membres, protocoles et décisions susceptibles d'affecter le cadre éthique de l'organisation."
  );
}

// ============================================================
// MIDDLEWARES
// ============================================================

// CORS — autorise le même domaine uniquement
app.use(cors({ origin: false }));

// Helmet avec CSP adapté (onclick inline autorisés)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],        // ← autorise onclick="..."
      styleSrc:      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:       ["'self'", "https://fonts.gstatic.com"],
      imgSrc:        ["'self'", "data:"],
      connectSrc:    ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false               // évite des blocages sur certains hébergeurs
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// Trust proxy — nécessaire sur Render/Railway (HTTPS derrière un reverse proxy)
app.set('trust proxy', 1);

// Sessions sécurisées stockées côté serveur dans SQLite
const SESS_DB_DIR = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : __dirname;
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: SESS_DB_DIR }),
  secret: SECRET,
  name: 'ce_sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: IS_PROD,          // true en HTTPS (Render/Railway), false en local
    sameSite: IS_PROD ? 'none' : 'strict',  // 'none' requis pour HTTPS cross-site
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// Fichiers statiques (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.status(401).json({ error: 'Accès refusé — Authentification requise' });
}

// Anti brute-force login
const loginAttempts = {};
function rateLimitLogin(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  if (!loginAttempts[ip]) loginAttempts[ip] = [];
  loginAttempts[ip] = loginAttempts[ip].filter(function(t) { return now - t < 15 * 60 * 1000; });
  if (loginAttempts[ip].length >= 10) {
    return res.status(429).json({ error: 'Trop de tentatives. Attendez 15 minutes.' });
  }
  loginAttempts[ip].push(now);
  next();
}

// ============================================================
// UTILITAIRES
// ============================================================
function generateId(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase().slice(-6) +
    Math.random().toString(36).slice(2, 5).toUpperCase();
}

// ============================================================
// ROUTES AUTH
// ============================================================
app.post('/api/login', rateLimitLogin, function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }
  var admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username.trim());
  if (!admin) {
    bcrypt.compareSync('dummy', '$2a$12$invalidhashtopreventtimingattac');
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  var valid = bcrypt.compareSync(password, admin.password);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  req.session.regenerate(function(err) {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    req.session.admin = { id: admin.id, username: admin.username, name: admin.name };
    res.json({ success: true, name: admin.name });
  });
});

app.post('/api/logout', function(req, res) {
  req.session.destroy(function() {
    res.clearCookie('ce_sid');
    res.json({ success: true });
  });
});

app.get('/api/me', function(req, res) {
  if (req.session && req.session.admin) {
    res.json({ logged: true, name: req.session.admin.name });
  } else {
    res.json({ logged: false });
  }
});

// ============================================================
// ROUTES PUBLIQUES
// ============================================================
app.get('/api/stats', function(req, res) {
  res.json({
    plaintes:    db.prepare('SELECT COUNT(*) as n FROM plaintes').get().n,
    messages:    db.prepare('SELECT COUNT(*) as n FROM messages').get().n,
    suggestions: db.prepare('SELECT COUNT(*) as n FROM suggestions').get().n,
    protocols:   db.prepare('SELECT COUNT(*) as n FROM protocols').get().n
  });
});

app.get('/api/protocols', function(req, res) {
  var q   = req.query.q   || '';
  var cat = req.query.cat || '';
  var sql = 'SELECT * FROM protocols WHERE 1=1';
  var params = [];
  if (q)   { sql += ' AND (title LIKE ? OR id LIKE ?)'; params.push('%'+q+'%', '%'+q+'%'); }
  if (cat) { sql += ' AND category = ?'; params.push(cat); }
  sql += ' ORDER BY date DESC';
  var stmt = db.prepare(sql);
  res.json(stmt.all.apply(stmt, params));
});

app.get('/api/content', function(req, res) {
  var rows = db.prepare('SELECT * FROM site_content').all();
  var content = {};
  rows.forEach(function(r) { content[r.key] = r.value; });
  res.json(content);
});

// ============================================================
// ROUTES SOUMISSIONS PUBLIQUES
// ============================================================
app.post('/api/plaintes', function(req, res) {
  var d = req.body;
  if (!d.personne || !d.categorie || !d.gravite || !d.description) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  if (d.description.length < 20) {
    return res.status(400).json({ error: 'Description trop courte (minimum 20 caractères)' });
  }
  var id = generateId('CE');
  db.prepare(
    'INSERT INTO plaintes (id,date,anonymous,plaignant,grade,personne,categorie,gravite,date_faits,description,demandes) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).run(id, new Date().toISOString(), d.anonymous ? 1 : 0, d.plaignant || 'ANONYME',
    d.grade || '', d.personne, d.categorie, d.gravite,
    d.date_faits || '', d.description, d.demandes || '');
  res.json({ success: true, id: id });
});

app.post('/api/messages', function(req, res) {
  var d = req.body;
  if (!d.destinataire || !d.nature || !d.sujet || !d.message) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  var id = generateId('MSG');
  db.prepare(
    'INSERT INTO messages (id,date,expediteur,destinataire,nature,sujet,message,urgent) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, new Date().toISOString(), d.expediteur || 'Anonyme',
    d.destinataire, d.nature, d.sujet, d.message, d.urgent ? 1 : 0);
  res.json({ success: true, id: id });
});

app.post('/api/suggestions', function(req, res) {
  var d = req.body;
  if (!d.domaine || !d.titre || !d.description) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  var id = generateId('SUG');
  db.prepare(
    'INSERT INTO suggestions (id,date,anonymous,auteur,domaine,titre,description,priorite) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, new Date().toISOString(), d.anonymous ? 1 : 0, d.auteur || 'Anonyme',
    d.domaine, d.titre, d.description, d.priorite || 'NORMALE');
  res.json({ success: true, id: id });
});

// ============================================================
// ROUTES ADMIN
// ============================================================
app.get('/api/admin/plaintes', requireAdmin, function(req, res) {
  res.json(db.prepare('SELECT * FROM plaintes ORDER BY created_at DESC').all());
});

app.patch('/api/admin/plaintes/:id', requireAdmin, function(req, res) {
  var allowed = ['EN_ATTENTE', 'EN_COURS', 'RESOLU', 'CLASSE'];
  if (allowed.indexOf(req.body.status) === -1) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  db.prepare('UPDATE plaintes SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/messages', requireAdmin, function(req, res) {
  res.json(db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all());
});

app.patch('/api/admin/messages/:id', requireAdmin, function(req, res) {
  db.prepare("UPDATE messages SET status = 'LU' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/suggestions', requireAdmin, function(req, res) {
  res.json(db.prepare('SELECT * FROM suggestions ORDER BY created_at DESC').all());
});

app.patch('/api/admin/suggestions/:id', requireAdmin, function(req, res) {
  db.prepare("UPDATE suggestions SET status = 'LU' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/protocols', requireAdmin, function(req, res) {
  var d = req.body;
  if (!d.id || !d.title || !d.category || !d.content) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  db.prepare(
    'INSERT OR REPLACE INTO protocols (id,title,category,version,date,content) VALUES (?,?,?,?,?,?)'
  ).run(d.id, d.title, d.category, d.version || 'v1.0',
    new Date().toISOString().slice(0, 10), d.content);
  res.json({ success: true });
});

app.delete('/api/admin/protocols/:id', requireAdmin, function(req, res) {
  db.prepare('DELETE FROM protocols WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/admin/content', requireAdmin, function(req, res) {
  var key = req.body.key;
  var value = req.body.value;
  if (!key || value === undefined) return res.status(400).json({ error: 'Données invalides' });
  db.prepare('INSERT OR REPLACE INTO site_content (key, value) VALUES (?, ?)').run(key, value);
  res.json({ success: true });
});

app.get('/api/admin/accounts', requireAdmin, function(req, res) {
  res.json(db.prepare('SELECT id, username, name, created_at FROM admins').all());
});

app.post('/api/admin/accounts', requireAdmin, function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var name     = req.body.name;
  if (!username || !password || password.length < 8) {
    return res.status(400).json({ error: 'Identifiant requis, mot de passe min. 8 caractères' });
  }
  if (db.prepare('SELECT id FROM admins WHERE username = ?').get(username.trim())) {
    return res.status(409).json({ error: 'Cet identifiant existe déjà' });
  }
  var hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO admins (username, password, name) VALUES (?, ?, ?)')
    .run(username.trim(), hash, name || username);
  res.json({ success: true });
});

app.delete('/api/admin/accounts/:id', requireAdmin, function(req, res) {
  var id = parseInt(req.params.id, 10);
  if (id === req.session.admin.id) {
    return res.status(403).json({ error: 'Impossible de supprimer votre propre compte' });
  }
  if (db.prepare('SELECT COUNT(*) as n FROM admins').get().n <= 1) {
    return res.status(403).json({ error: 'Impossible de supprimer le dernier compte' });
  }
  db.prepare('DELETE FROM admins WHERE id = ?').run(id);
  res.json({ success: true });
});

// Route catch-all — renvoie index.html pour toute route non-API
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// DÉMARRAGE
// ============================================================
app.listen(PORT, function() {
  var url = IS_PROD ? 'https://votre-app.onrender.com' : 'http://localhost:' + PORT;
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   COMITÉ D\'ÉTHIQUE — SERVEUR ' + (IS_PROD ? 'PRODUCTION  ' : 'DÉVELOPPEMENT') + '        ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║   URL     : ' + url);
  console.log('║   PORT    : ' + PORT);
  console.log('║   MODE    : ' + NODE_ENV);
  console.log('║   BASE DB : ' + DB_PATH);
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
});
