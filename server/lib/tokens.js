/**
 * Jetons de session signés (HMAC SHA-256).
 *
 * Un jeton signé est vérifiable sans lecture de la base : un redémarrage du
 * serveur — ou un hébergement dont le disque n'est pas persistant — ne
 * déconnecte plus les navigateurs déjà ouverts.
 *
 * Format : `v1.<charge utile base64url>.<signature base64url>`
 */

const crypto = require('crypto');
const { db, save } = require('../store/database');

const VERSION = 'v1';

function base64url(buffer) {
  return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value) {
  return Buffer.from(String(value).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/* Le secret vient de l'environnement en production ; sinon il est généré une
   fois puis conservé dans la base pour survivre aux redémarrages. */
function resolveSecret() {
  const fromEnv = String(process.env.SESSION_SECRET || '').trim();
  if (fromEnv.length >= 16) return { secret: fromEnv, source: 'SESSION_SECRET' };
  if (typeof db.secret === 'string' && db.secret.length >= 32) {
    return { secret: db.secret, source: 'base locale' };
  }
  const secret = crypto.randomBytes(32).toString('hex');
  db.secret = secret;
  save();
  return { secret, source: 'généré' };
}

const resolved = resolveSecret();
const SECRET = resolved.secret;
const SECRET_SOURCE = resolved.source;

function sign(payload) {
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(
    crypto
      .createHmac('sha256', SECRET)
      .update(VERSION + '.' + body)
      .digest()
  );
  return VERSION + '.' + body + '.' + signature;
}

function verify(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return null;
  const expected = base64url(
    crypto
      .createHmac('sha256', SECRET)
      .update(VERSION + '.' + parts[1])
      .digest()
  );
  const given = parts[2];
  if (given.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return null;
  let payload;
  try {
    payload = JSON.parse(fromBase64url(parts[1]).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || !payload.sub) return null;
  if (!payload.exp || Number(payload.exp) < Date.now()) return null;
  return payload;
}

module.exports = { sign, verify, SECRET_SOURCE };
