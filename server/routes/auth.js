/**
 * Authentification, connexions de démonstration et comptes utilisateurs.
 */

const express = require('express');
const {
  authenticate,
  clearSessionCookie,
  createSession,
  currentUser,
  dropSession,
  newToken,
  openDemoSession,
  publicUser,
  readCookie,
  requirePermission,
  setSessionCookie,
  tokenOf
} = require('../lib/auth');
const { db, save } = require('../store/database');

const router = express.Router();

router.get('/api/users', requirePermission('utilisateurs:read'), (req, res) => {
  const role = String(req.query.role || '').toLowerCase();
  const list = db.users.filter((u) => !role || u.role === role);
  res.json(list.map(publicUser));
});

router.get('/api/users/:id', requirePermission('utilisateurs:read'), (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json(publicUser(user));
});

// Utile quand l'aperçu intégré ne transmet pas les clics.
router.get('/demo/:role', (req, res) => {
  const opened = openDemoSession(req.params.role);
  if (!opened)
    return res.redirect(
      303,
      '/?erreur=' + encodeURIComponent('Espace de démonstration inconnu : ' + req.params.role)
    );
  setSessionCookie(res, opened.token);
  res.redirect(303, '/?espace=' + encodeURIComponent(opened.user.role) + '#/');
});

router.get('/api/auth/demo-link/:role', (req, res) => {
  const opened = openDemoSession(req.params.role);
  if (!opened) return res.status(404).json({ error: 'Espace inconnu' });
  setSessionCookie(res, opened.token);
  res.json({ token: opened.token, user: publicUser(opened.user) });
});

// Repli sans JavaScript : un formulaire HTML classique connecte et redirige.
router.post('/api/auth/demo-form', (req, res) => {
  const opened = openDemoSession((req.body && req.body.role) || '');
  if (!opened) return res.redirect(303, '/?erreur=' + encodeURIComponent('Espace de démonstration inconnu.'));
  setSessionCookie(res, opened.token);
  res.redirect(303, '/?espace=' + encodeURIComponent(opened.user.role) + '#/');
});

router.post('/api/auth/login-form', (req, res) => {
  const email = String((req.body && req.body.email) || '')
    .trim()
    .toLowerCase();
  const password = String((req.body && req.body.password) || '');
  if (!email || !password)
    return res.redirect(303, '/?erreur=' + encodeURIComponent('Email et mot de passe requis.'));
  const result = authenticate(email, password);
  if (result.error) return res.redirect(303, '/?erreur=' + encodeURIComponent(result.error));
  const token = newToken(result.user);
  createSession(token, result.user.id);
  setSessionCookie(res, token);
  res.redirect(303, '/#/');
});

router.post('/api/auth/login', (req, res) => {
  const email = String((req.body && req.body.email) || '')
    .trim()
    .toLowerCase();
  const password = String((req.body && req.body.password) || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  const result = authenticate(email, password);
  if (result.error) return res.status(401).json({ error: result.error });
  const user = result.user;
  user.lastLoginAt = new Date().toISOString();
  save();
  const token = newToken(user);
  createSession(token, user.id);
  setSessionCookie(res, token);
  res.json({ token, user: publicUser(user) });
});

/* Connexion de démonstration en un clic : ne peut pas échouer (le compte est créé/réparé) */
router.post('/api/auth/demo', (req, res) => {
  const role = String((req.body && req.body.role) || '').toLowerCase();
  const opened = openDemoSession(role);
  if (!opened)
    return res.status(400).json({ error: 'Rôle de démonstration inconnu : ' + (role || '(vide)') });
  setSessionCookie(res, opened.token);
  res.json({ token: opened.token, user: publicUser(opened.user) });
});

router.post('/api/auth/register', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nom, email et mot de passe sont obligatoires' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse email' });
  }
  const city = String(body.zone || '').trim() || 'Conakry';
  const existing = db.clients.find(
    (c) => String(c.email || '').toLowerCase() === email && !db.users.some((u) => u.clientId === c.id)
  );
  if (existing) {
    existing.name = existing.name || name;
    existing.contact = existing.contact || name;
    existing.phone = existing.phone || String(body.phone || '').trim();
    existing.address = existing.address || String(body.address || '').trim();
    existing.zone = existing.zone || city;
  }
  const client = existing || {
    id: 'c' + db.counters.client++,
    name: name,
    contact: name,
    company: String(body.company || '').trim(),
    phone: String(body.phone || '').trim(),
    email: email,
    city: city,
    zone: String(body.zone || '').trim(),
    address: String(body.address || '').trim(),
    type: body.company ? 'Professionnel' : 'Particulier',
    since: new Date().toISOString().slice(0, 10)
  };
  db.clients.push(client);
  const user = {
    id: 'u' + (db.users.length + 1),
    name: name,
    email: email,
    password: password,
    role: 'client',
    phone: client.phone,
    clientId: client.id,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  save();
  const token =
    'demo-' + user.id + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  createSession(token, user.id);
  res.status(201).json({ token: token, user: publicUser(user), client: client });
});

router.post('/api/auth/logout', (req, res) => {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : readCookie(req, 'ppg_session');
  if (token) dropSession(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/api/auth/me', (req, res) => {
  const sent = tokenOf(req);
  const user = currentUser(req);
  // Visiteur sans jeton : réponse neutre (pas d'erreur dans la console du navigateur).
  if (!sent) return res.json({ token: null, user: null });
  if (!user) return res.status(401).json({ error: 'Session expirée' });
  res.json({ token: sent, user: publicUser(user) });
});

module.exports = router;
