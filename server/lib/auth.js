/**
 * Utilisateurs publics, sessions, cookies et contrôle des permissions.
 */

const { db, ensureDemoUser, save } = require('../store/database');
const tokens = require('./tokens');
const seed = require('../../data/seed');
const roles = require('../../data/roles');

/* ------------------------------------------------------------------ */
const ROLE_LABEL = roles.ROLE_LABEL;

// Le mot de passe ne sort jamais de l'API
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABEL[user.role] || user.role,
    permissions: roles.permissionsFor(user.role),
    phone: user.phone || '',
    clientId: user.clientId || null,
    initials: (user.name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  };
}

/* Sessions conservées dans db.json : un redémarrage du serveur ne déconnecte plus
   les navigateurs déjà ouverts (jetons valables 7 jours). */
const SESSION_TTL = 7 * 86400000;

const sessions = new Map();

/* Jetons révoqués (déconnexion) : ils restent refusés même s'ils sont signés.
   Les entrées expirées sont oubliées au démarrage pour ne pas faire grossir la base. */
if (!db.revoked || typeof db.revoked !== 'object') db.revoked = {};
const revoked = new Set();
Object.keys(db.revoked).forEach((token) => {
  if (Number(db.revoked[token]) > Date.now()) revoked.add(token);
  else delete db.revoked[token];
});

if (!db.sessions || typeof db.sessions !== 'object') db.sessions = {};

Object.keys(db.sessions).forEach((token) => {
  const session = db.sessions[token];
  if (!session || Date.now() - Number(session.createdAt || 0) > SESSION_TTL) {
    delete db.sessions[token];
    return;
  }
  sessions.set(token, session);
});

function createSession(token, userId) {
  const session = { userId: userId, createdAt: Date.now() };
  sessions.set(token, session);
  db.sessions[token] = session;
  save();
  return session;
}

function dropSession(token) {
  if (!token) return;
  sessions.delete(token);
  if (db.sessions && db.sessions[token]) {
    delete db.sessions[token];
  }
  // un jeton signé reste valable sans la base : on le révoque explicitement
  revoked.add(token);
  db.revoked[token] = Date.now() + SESSION_TTL;
  save();
}

function readCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  const parts = raw.split(';');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const sep = part.indexOf('=');
    if (sep === -1) continue;
    if (part.slice(0, sep).trim() === name) return decodeURIComponent(part.slice(sep + 1).trim());
  }
  return '';
}

/* Un hébergement expose l'application en HTTPS derrière un proxy : le cookie doit
   alors porter l'attribut Secure, sinon certains navigateurs le rejettent. */
function isHttps(req) {
  if (!req) return false;
  if (req.secure) return true;
  const proto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  return proto === 'https';
}

function setSessionCookie(req, res, token) {
  const secure = isHttps(req) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    'ppg_session=' +
      encodeURIComponent(token) +
      '; Path=/; Max-Age=' +
      Math.floor(SESSION_TTL / 1000) +
      '; SameSite=Lax; HttpOnly' +
      secure
  );
}

function clearSessionCookie(req, res) {
  const secure = isHttps(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', 'ppg_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly' + secure);
}

function tokenOf(req) {
  const header = String(req.headers.authorization || '');
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return bearer || readCookie(req, 'ppg_session');
}

function currentUser(req) {
  const token = tokenOf(req);
  if (!token) return null;
  if (revoked.has(token)) return null;
  const session = sessions.get(token);
  if (session) return db.users.find((u) => u.id === session.userId) || null;
  // jeton signé : vérifiable sans la base (redémarrage, disque éphémère)
  const payload = tokens.verify(token);
  if (!payload) return null;
  return db.users.find((u) => u.id === payload.sub) || null;
}

function requirePermission(permission) {
  return (req, res, next) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
    if (!roles.can(user.role, permission)) {
      return res.status(403).json({
        error: 'Action non autorisée pour votre rôle (' + (ROLE_LABEL[user.role] || user.role) + ')'
      });
    }
    req.user = user;
    next();
  };
}

function authenticate(email, password) {
  const known = db.users.find((u) => String(u.email || '').toLowerCase() === email);
  const demoAccount = seed.USERS.find((u) => String(u.email).toLowerCase() === email);
  let user = known;
  // base ancienne ou modifiée : on restaure le compte de démonstration
  if (demoAccount && (!user || String(demoAccount.password) === password)) {
    user = ensureDemoUser(demoAccount);
  }
  if (!user) {
    return {
      error:
        'Aucun compte pour cette adresse email. Utilisez un compte de démonstration ci-dessous ou créez un compte client.'
    };
  }
  if (String(user.password) !== password) {
    return { error: 'Mot de passe incorrect pour ' + user.email };
  }
  return { user };
}

function newToken(user) {
  return tokens.sign({
    sub: user.id,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL
  });
}

function openDemoSession(role) {
  const demo = seed.USERS.find((u) => u.role === String(role || '').toLowerCase());
  if (!demo) return null;
  const user = ensureDemoUser(demo);
  const token = newToken(user);
  createSession(token, user.id);
  return { token, user };
}

module.exports = {
  ROLE_LABEL,
  SESSION_TTL,
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
  sessions,
  setSessionCookie,
  isHttps,
  tokenOf
};
