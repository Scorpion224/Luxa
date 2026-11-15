/**
 * Tests de l'API — lancés par `npm test`.
 *
 * Le serveur est démarré sur un port dédié avec une base temporaire : les tests
 * ne touchent jamais `data/db.json`.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PORT = 3111;
const BASE = `http://127.0.0.1:${PORT}`;
const dossier = mkdtempSync(path.join(tmpdir(), 'ppg-tests-'));
let serveur;

before(async () => {
  serveur = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(PORT), DB_FILE: path.join(dossier, 'db.json') },
    stdio: 'ignore'
  });
  // attente de disponibilité (max 10 s)
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(BASE + '/api/health');
      if (r.ok) return;
    } catch {
      /* serveur pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Le serveur de test ne répond pas');
});

after(() => {
  serveur?.kill();
  rmSync(dossier, { recursive: true, force: true });
});

const login = async (role) => {
  const r = await fetch(BASE + '/api/auth/demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
  assert.equal(r.status, 200, `connexion ${role}`);
  return r.json();
};

const appel = (token, url, options = {}) =>
  fetch(BASE + url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: 'Bearer ' + token }
  });

test('santé du serveur', async () => {
  const r = await fetch(BASE + '/api/health');
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.status, 'ok');
  assert.ok(body.version.startsWith('3.0'));
  assert.ok(body.demoAccounts.every((a) => a.exists));
});

test('les cinq espaces de démonstration se connectent', async () => {
  for (const role of ['admin', 'commercial', 'comptable', 'stockiste', 'client']) {
    const data = await login(role);
    assert.ok(data.token, role);
    assert.equal(data.user.role, role);
    assert.equal(data.user.password, undefined, 'le mot de passe ne doit jamais sortir');
  }
});

test('le jeton donne accès à la session courante', async () => {
  const { token, user } = await login('admin');
  const r = await appel(token, '/api/auth/me');
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.user.email, user.email);
});

test('un jeton invalide renvoie 401', async () => {
  const r = await appel('jeton-inexistant', '/api/auth/me');
  assert.equal(r.status, 401);
});

test('les permissions sont appliquées côté API', async () => {
  const stock = await login('stockiste');
  const interdit = await appel(stock.token, '/api/finance');
  assert.equal(interdit.status, 403);

  const admin = await login('admin');
  const autorise = await appel(admin.token, '/api/finance');
  assert.equal(autorise.status, 200);
});

test('le catalogue est accessible et cohérent', async () => {
  const r = await fetch(BASE + '/api/products');
  assert.equal(r.status, 200);
  const body = await r.json();
  const produits = body.products || body;
  assert.ok(Array.isArray(produits) && produits.length > 0);
  assert.ok(produits.every((p) => typeof p.price === 'number'));
});

test('parcours client : panier puis commande', async () => {
  const client = await login('client');
  const produits = await (await fetch(BASE + '/api/products')).json();
  const produit = (produits.products || produits)[0];

  const ajout = await appel(client.token, '/api/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: produit.id, qty: 2 })
  });
  assert.equal(ajout.status, 201);

  const commande = await appel(client.token, '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'cash', paymentMethod: 'cash' })
  });
  assert.equal(commande.status, 201);
  const body = await commande.json();
  assert.ok(body.id.startsWith('CMD-'));
  assert.equal(body.total, produit.price * 2);
});

test('le paiement par échéance est refusé hors financement FLEX validé', async () => {
  const admin = await login('admin');
  const liste = await (await appel(admin.token, '/api/quotes')).json();
  const devis = (liste.items || liste.quotes || []).find((q) => !q.flex);
  assert.ok(devis, 'un devis sans financement FLEX est attendu');
  const r = await appel(admin.token, `/api/payments/${devis.id}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stepId: 'S1', amount: 100000 })
  });
  assert.equal(r.status, 400);
  const corps = await r.json();
  assert.match(corps.error, /FLEX|échéance/i);
});

test('connexion par URL /demo/:role', async () => {
  const r = await fetch(BASE + '/demo/client', { redirect: 'manual' });
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), /espace=client/);
  assert.match(r.headers.get('set-cookie') || '', /ppg_session=/);
});
