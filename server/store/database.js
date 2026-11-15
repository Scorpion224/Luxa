/**
 * Base de données locale `data/db.json` : amorçage, migrations douces et persistance.
 */

const { DB_FILE } = require('../config');
const seed = require('../../data/seed');
const portal = require('../../data/portal');
const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ */
function seedDatabase() {
  return {
    company: seed.COMPANY,
    users: seed.USERS,
    products: seed.PRODUCTS,
    clients: seed.CLIENTS,
    quotes: seed.QUOTES,
    payments: seed.PAYMENTS,
    chantiers: seed.CHANTIERS,
    draftQuote: seed.DRAFT_QUOTE,
    carts: {},
    orders: seed.CLIENT_ORDERS,
    teams: portal.TEAMS,
    bookings: seed.PORTAL_BOOKINGS,
    counters: { quote: 32, payment: 15, client: 9, chantier: 8, order: 5, booking: 2 }
  };
}

let db;

try {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch (err) {
  db = seedDatabase();
}

// migration douce : une base créée avant l'arrivée des comptes utilisateurs
if (!Array.isArray(db.users)) db.users = seed.USERS;

if (!db.carts || typeof db.carts !== 'object') db.carts = {};

if (!Array.isArray(db.orders)) db.orders = seed.CLIENT_ORDERS;

if (!Array.isArray(db.teams) || !db.teams.length) db.teams = portal.TEAMS;

if (!Array.isArray(db.bookings)) db.bookings = seed.PORTAL_BOOKINGS;

if (!db.counters) db.counters = { quote: 32, payment: 15, client: 9, chantier: 8, order: 5, booking: 2 };

if (!db.counters.order) db.counters.order = 5;

if (!db.counters.booking) db.counters.booking = 2;

/* Comptes de démonstration : une base créée avant l'espace client ne contient pas
   les comptes « client » — on les ajoute (sans doublon) au démarrage. */
function ensureDemoAccounts() {
  const added = [];
  seed.USERS.forEach((u) => {
    const exists = db.users.some(
      (x) => String(x.email || '').toLowerCase() === String(u.email).toLowerCase()
    );
    if (!exists) {
      db.users.push(JSON.parse(JSON.stringify(u)));
      added.push(u.email);
    }
  });
  db.users.forEach((u) => {
    const demo = seed.USERS.find(
      (x) => String(x.email).toLowerCase() === String(u.email || '').toLowerCase()
    );
    if (!demo || demo.role !== 'client') return;
    const attached = u.clientId && db.clients.some((c) => c.id === u.clientId);
    if (!attached) {
      const target =
        db.clients.find((c) => c.id === demo.clientId) ||
        db.clients.find((c) => String(c.email || '').toLowerCase() === String(u.email).toLowerCase());
      if (target) u.clientId = target.id;
    }
  });
  return added;
}

const demoAdded = ensureDemoAccounts();

if (demoAdded.length) {
  console.log('  Migration : comptes de démonstration ajoutés → ' + demoAdded.join(', '));
}

/* Garantit qu'un compte de démonstration existe et correspond au seed
   (email, mot de passe, rôle, fiche client). Répare au passage une base abîmée. */
function ensureDemoUser(demo) {
  let user = db.users.find((u) => String(u.email || '').toLowerCase() === String(demo.email).toLowerCase());
  if (!user) {
    user = JSON.parse(JSON.stringify(demo));
    db.users.push(user);
  }
  user.role = demo.role;
  user.password = demo.password;
  if (demo.clientId) {
    const client = db.clients.find((c) => c.id === demo.clientId);
    if (client) user.clientId = client.id;
  }
  save();
  return user;
}

function save() {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Impossible d’enregistrer les données :', err.message);
  }
}

save();

module.exports = { db, save, ensureDemoAccounts, ensureDemoUser };
