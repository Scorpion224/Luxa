/**
 * Devis : liste, détail, création, changement de statut.
 */

const express = require('express');
const { requirePermission } = require('../lib/auth');
const { STATUS } = require('../lib/format');
const {
  activeQuotes,
  buildLinesFromCalculation,
  calculateQuote,
  enrichQuote,
  findQuote
} = require('../lib/quotes');
const { db, save } = require('../store/database');
const seed = require('../../data/seed');

const router = express.Router();

/* ------------------------------------------------------------------ */
router.get('/api/quotes', requirePermission('devis:read'), (req, res) => {
  const { status, search, sort = 'recent', page = 1, perPage = 20 } = req.query;
  let items = activeQuotes();
  if (status) items = items.filter((q) => q.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter(
      (x) =>
        x.id.toLowerCase().includes(q) ||
        x.clientName.toLowerCase().includes(q) ||
        x.subject.toLowerCase().includes(q)
    );
  }
  if (sort === 'recent') items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === 'amount_desc') items.sort((a, b) => b.total - a.total);
  if (sort === 'amount_asc') items.sort((a, b) => a.total - b.total);
  if (sort === 'client') items.sort((a, b) => a.clientName.localeCompare(b.clientName, 'fr'));

  const total = items.length;
  const size = Math.max(1, Number(perPage));
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Number(page)), pages);
  const paged = items.slice((current - 1) * size, current * size).map(enrichQuote);
  res.json({ items: paged, total, page: current, perPage: size, pages });
});

router.get('/api/quotes/:id', requirePermission('devis:read'), (req, res) => {
  const quote = findQuote(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  res.json(enrichQuote(quote));
});

router.post('/api/quotes/calculate', (req, res) => {
  res.json(calculateQuote(req.body || {}));
});

router.get('/api/quotes-draft', requirePermission('devis:read'), (req, res) => {
  res.json(db.draftQuote);
});

router.post('/api/quotes', requirePermission('devis:write'), (req, res) => {
  const body = req.body || {};
  const client = db.clients.find((c) => c.id === body.clientId);
  const calc = calculateQuote({
    rooms: body.rooms,
    productId: body.productId,
    rendement: body.rendement,
    coats: body.coats,
    waste: body.waste,
    laborPrice: body.laborPrice,
    transport: body.transport,
    tvaRate: body.tvaRate,
    tvaEnabled: body.tvaEnabled
  });
  const useStored = body.lines && body.lines.length;
  const lines = useStored ? body.lines : buildLinesFromCalculation(calc, body.finish);
  const subtotal = useStored ? body.lines.reduce((s, l) => s + Number(l.amount), 0) : calc.subtotal;
  const tvaEnabled = body.tvaEnabled !== false;
  const tvaRate = Number(body.tvaRate ?? 0.18);
  const tvaAmount =
    body.tvaAmount !== undefined ? Number(body.tvaAmount) : tvaEnabled ? Math.round(subtotal * tvaRate) : 0;
  const total = body.total !== undefined ? Number(body.total) : subtotal + tvaAmount;
  const quote = {
    id: `DV-2026-${String(db.counters.quote++).padStart(3, '0')}`,
    clientId: body.clientId || (client ? client.id : null),
    clientName: client ? client.name : body.clientName || 'Client',
    clientCompany: client ? client.company : null,
    subject: body.subject || 'Nouveau devis',
    site: body.site || (client ? client.city : ''),
    createdAt: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'brouillon',
    relance: false,
    surface: useStored ? Number(body.surface) || calc.surface : calc.surface,
    rooms: body.rooms || [],
    productId: body.productId || 'p1',
    finish: body.finish || '',
    lines,
    subtotal,
    tvaRate,
    tvaEnabled,
    tvaAmount,
    total,
    schedule: [],
    financing: null,
    notes: body.notes || ''
  };
  db.quotes.push(quote);
  save();
  res.status(201).json(quote);
});

router.patch('/api/quotes/:id', requirePermission('devis:write'), (req, res) => {
  const quote = findQuote(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  const allowed = [
    'clientId',
    'clientName',
    'subject',
    'site',
    'status',
    'relance',
    'notes',
    'validUntil',
    'total',
    'subtotal',
    'tvaAmount',
    'lines',
    'rooms',
    'surface',
    'finish'
  ];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) quote[key] = req.body[key];
  });
  save();
  res.json(enrichQuote(quote));
});

router.post('/api/quotes/:id/status', requirePermission('devis:write'), (req, res) => {
  const quote = findQuote(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  const status = req.body.status;
  if (!STATUS[status]) return res.status(400).json({ error: 'Statut invalide' });
  quote.status = status;
  if (status !== 'envoye') quote.relance = false;
  if (status === 'accepte' && !quote.schedule.length) {
    quote.schedule = seed.defaultSchedule(quote.total);
  }
  save();
  res.json(enrichQuote(quote));
});

router.delete('/api/quotes/:id', requirePermission('devis:write'), (req, res) => {
  const index = db.quotes.findIndex((q) => q.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Devis non trouvé' });
  db.quotes.splice(index, 1);
  save();
  res.json({ success: true });
});

module.exports = router;
