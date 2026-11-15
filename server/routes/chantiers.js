/**
 * Chantiers.
 */

const express = require('express');
const { requirePermission } = require('../lib/auth');
const { db, save } = require('../store/database');

const router = express.Router();

/* ------------------------------------------------------------------ */
router.get('/api/chantiers', requirePermission('chantiers:read'), (req, res) => {
  res.json(db.chantiers.map((c) => ({ ...c, progress: Number(c.progress) || 0 })));
});

router.post('/api/chantiers', requirePermission('chantiers:write'), (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'Le nom du chantier est obligatoire' });
  const client = db.clients.find((c) => c.id === body.clientId);
  const chantier = {
    id: `CH-2026-${String(db.counters.chantier++).padStart(3, '0')}`,
    name: body.name,
    clientId: body.clientId || null,
    clientName: client ? client.name : body.clientName || '—',
    city: body.city || (client ? client.city : 'Conakry'),
    quoteId: body.quoteId || null,
    budget: Number(body.budget) || 0,
    spent: 0,
    progress: 0,
    status: body.status || 'planifie',
    startDate: body.startDate || new Date().toISOString().slice(0, 10),
    endDate: body.endDate || null,
    chef: body.chef || '—',
    team: Number(body.team) || 0,
    tasks: body.tasks || []
  };
  db.chantiers.push(chantier);
  save();
  res.status(201).json(chantier);
});

router.patch('/api/chantiers/:id', requirePermission('chantiers:write'), (req, res) => {
  const chantier = db.chantiers.find((c) => c.id === req.params.id);
  if (!chantier) return res.status(404).json({ error: 'Chantier non trouvé' });
  ['progress', 'status', 'spent', 'chef', 'team', 'endDate'].forEach((key) => {
    if (req.body[key] !== undefined) chantier[key] = req.body[key];
  });
  if (chantier.progress >= 100) chantier.status = 'termine';
  save();
  res.json(chantier);
});

module.exports = router;
