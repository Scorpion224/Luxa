/**
 * Tableau de bord.
 */

const express = require('express');
const { requirePermission } = require('../lib/auth');
const { activeQuotes, enrichQuote } = require('../lib/quotes');
const { db } = require('../store/database');

const router = express.Router();

router.get('/api/dashboard', requirePermission('devis:read'), (req, res) => {
  const quotes = activeQuotes();
  const relance = quotes.filter((q) => q.relance);
  const kpis = {
    enCours: quotes.length,
    valeur: quotes.reduce((s, q) => s + q.total, 0),
    relancer: relance.length
  };
  const sort = req.query.sort || 'recent';
  const page = Number(req.query.page) || 1;
  const perPage = 3;
  let sorted = [...quotes];
  if (sort === 'amount_desc') sorted.sort((a, b) => b.total - a.total);
  else if (sort === 'client') sorted.sort((a, b) => a.clientName.localeCompare(b.clientName, 'fr'));
  else sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const items = sorted.slice((current - 1) * perPage, current * perPage).map(enrichQuote);
  res.json({
    kpis,
    quotes: { items, total: sorted.length, page: current, perPage, pages },
    sales: {
      paid: db.payments.reduce((s, p) => s + p.amount, 0),
      chantiers: db.chantiers.filter((c) => c.status === 'en_cours').length
    }
  });
});

module.exports = router;
