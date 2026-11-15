/**
 * Référentiel : santé, société, rôles, catégories.
 */

const express = require('express');
const { APP_VERSION } = require('../config');
const { ROLE_LABEL } = require('../lib/auth');
const { db } = require('../store/database');
const roles = require('../../data/roles');

const router = express.Router();

/* ------------------------------------------------------------------ */
router.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    version: APP_VERSION,
    users: Array.isArray(db.users) ? db.users.length : 0,
    clients: Array.isArray(db.clients) ? db.clients.length : 0,
    demoAccounts: [
      'admin@peinturepro.gn',
      'commercial@peinturepro.gn',
      'comptable@peinturepro.gn',
      'stock@peinturepro.gn',
      'client@peinturepro.gn',
      'mariama@peinturepro.gn'
    ].map((email) => ({
      email: email,
      exists: db.users.some((u) => String(u.email || '').toLowerCase() === email)
    }))
  })
);

router.get('/api/company', (req, res) => res.json(db.company));

router.get('/api/roles', (req, res) => {
  res.json({
    roles: Object.keys(roles.ROLE_PERMISSIONS).map((key) => ({
      key,
      label: ROLE_LABEL[key],
      summary: roles.ROLE_SUMMARY[key],
      permissions: roles.permissionsFor(key)
    })),
    modules: roles.MODULES
  });
});

router.get('/api/categories', (req, res) => {
  const fixed = [
    'FOM intérieurs',
    'FOM extérieurs',
    'Mastiques pour murs',
    'Peintures à huile',
    'Accessoires et consommables'
  ];
  res.json(
    fixed.map((name) => ({
      name,
      count: db.products.filter((p) => p.category === name || (p.extraCategories || []).includes(name)).length
    }))
  );
});

module.exports = router;
