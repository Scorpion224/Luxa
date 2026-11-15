/**
 * Clients.
 */

const express = require('express');
const { requirePermission } = require('../lib/auth');
const { enrichQuote } = require('../lib/quotes');
const { db, save } = require('../store/database');

const router = express.Router();

/* ------------------------------------------------------------------ */
router.get('/api/clients', requirePermission('clients:read'), (req, res) => {
  const withStats = db.clients.map((c) => {
    const quotes = db.quotes.filter((q) => q.clientId === c.id);
    const accepted = quotes.filter((q) => q.status === 'accepte');
    const payments = db.payments.filter((p) => p.clientId === c.id);
    return {
      ...c,
      totalQuotes: quotes.length,
      acceptedQuotes: accepted.length,
      totalAmount: accepted.reduce((s, q) => s + q.total, 0),
      paidAmount: payments.reduce((s, p) => s + p.amount, 0),
      lastQuoteAt:
        quotes
          .map((q) => q.createdAt)
          .sort()
          .pop() || null
    };
  });
  res.json(withStats);
});

router.post('/api/clients', requirePermission('clients:write'), (req, res) => {
  const { name, phone, email, city, company, contact, address, type } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Le nom est obligatoire' });
  const client = {
    id: 'c' + db.counters.client++,
    name: String(name).trim(),
    contact: contact || String(name).trim(),
    company: company || null,
    phone: phone || '',
    email: email || '',
    city: city || 'Conakry',
    address: address || '',
    type: type || (company ? 'Professionnel' : 'Particulier'),
    since: new Date().toISOString().slice(0, 10)
  };
  db.clients.push(client);
  save();
  res.status(201).json(client);
});

router.get('/api/clients/:id', requirePermission('clients:read'), (req, res) => {
  const client = db.clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client non trouvé' });
  res.json({
    ...client,
    quotes: db.quotes.filter((q) => q.clientId === client.id).map(enrichQuote),
    payments: db.payments.filter((p) => p.clientId === client.id),
    chantiers: db.chantiers.filter((c) => c.clientId === client.id)
  });
});

module.exports = router;
