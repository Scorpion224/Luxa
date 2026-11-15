/**
 * Finances : encaissements et factures.
 */

const express = require('express');
const { requirePermission } = require('../lib/auth');
const { MONTHS } = require('../lib/domain');
const { db } = require('../store/database');

const router = express.Router();

router.get('/api/finance', requirePermission('finance:read'), (req, res) => {
  const accepted = db.quotes.filter((q) => ['accepte', 'en_retard'].includes(q.status));
  const payments = [...db.payments].sort((a, b) => new Date(b.date) - new Date(a.date));
  const encaisse = payments.reduce((s, p) => s + p.amount, 0);
  const overdue = db.quotes.reduce((sum, q) => {
    const late = (q.schedule || []).filter((s) => s.status === 'en_retard' && s.amount);
    return sum + late.reduce((a, s) => a + s.amount, 0);
  }, 0);
  const enAttente = accepted.reduce((s, q) => {
    const paid = db.payments.filter((p) => p.quoteId === q.id).reduce((a, p) => a + p.amount, 0);
    return s + Math.max(0, q.total - paid);
  }, 0);

  const monthly = {};
  payments.forEach((p) => {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + p.amount;
  });
  const series = [];
  const anchor = payments.length
    ? new Date(Math.max(...payments.map((p) => new Date(p.date + 'T00:00:00').getTime())))
    : new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    series.push({ label: MONTHS[d.getMonth()], value: monthly[key] || 0 });
  }

  const factures = accepted
    .map((q, i) => {
      const paid = db.payments.filter((p) => p.quoteId === q.id).reduce((a, p) => a + p.amount, 0);
      const due = Math.max(0, q.total - paid);
      return {
        id: 'FA-2026-' + String(14 - i).padStart(3, '0'),
        quoteId: q.id,
        clientName: q.clientName,
        clientCompany: q.clientCompany,
        issueDate: q.createdAt,
        dueDate: q.validUntil,
        total: q.total,
        paid,
        due,
        status:
          due === 0
            ? 'payee'
            : (q.schedule || []).some((s) => s.status === 'en_retard')
              ? 'en_retard'
              : 'envoyee'
      };
    })
    .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

  res.json({
    kpis: {
      encaisse,
      enAttente: Math.max(0, enAttente),
      enRetard: overdue,
      acceptes: accepted.length,
      acceptesValeur: accepted.reduce((s, q) => s + q.total, 0),
      panierMoyen: accepted.length
        ? Math.round(accepted.reduce((s, q) => s + q.total, 0) / accepted.length)
        : 0
    },
    series,
    factures,
    payments
  });
});

module.exports = router;
