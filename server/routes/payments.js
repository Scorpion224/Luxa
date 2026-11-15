/**
 * Paiements, acomptes, échéanciers et financement PEINTURE FLEX.
 */

const express = require('express');
const { requirePermission } = require('../lib/auth');
const { advanceFinancing, paymentSummary } = require('../lib/domain');
const { STATUS } = require('../lib/format');
const { findQuote } = require('../lib/quotes');
const { db, save } = require('../store/database');
const seed = require('../../data/seed');
const flex = require('../../data/flex');

const router = express.Router();

router.get('/api/payments/quotes', requirePermission('paiement:read'), (req, res) => {
  const items = db.quotes
    .filter((q) => (q.schedule && q.schedule.length) || ['accepte', 'en_retard'].includes(q.status))
    .map((q) => ({
      id: q.id,
      label: `${q.id} — ${q.clientName}`,
      total: q.total,
      clientName: q.clientName,
      status: q.status
    }));
  res.json(items);
});

router.get('/api/payments/:quoteId', requirePermission('paiement:read'), (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  res.json({
    quote: {
      id: quote.id,
      clientName: quote.clientName,
      total: quote.total,
      status: quote.status,
      statusLabel: STATUS[quote.status],
      financing: quote.financing
    },
    ...paymentSummary(quote),
    payments: db.payments.filter((p) => p.quoteId === quote.id)
  });
});

router.post('/api/payments/:quoteId/pay', requirePermission('paiement:write'), (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  const body = req.body || {};
  const amount = Number(body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });
  const step = (quote.schedule || []).find((s) => s.id === body.stepId);
  if (body.stepId && !step) {
    return res.status(400).json({ error: 'Échéance inconnue' });
  }
  if (step && !quote.flex) {
    return res.status(400).json({
      error: 'Le paiement par échéance est réservé aux devis ayant accès à la formule PEINTURE FLEX'
    });
  }
  if (step && step.kind === 'installment' && !flex.isBankValidated(quote)) {
    return res
      .status(400)
      .json({ error: 'Le dossier bancaire doit être validé avant de régler les échéances de crédit' });
  }
  const client = db.clients.find((c) => c.id === quote.clientId);
  const payment = {
    id: `AC-2026-${String(db.counters.payment++).padStart(3, '0')}`,
    clientId: quote.clientId,
    clientName: quote.clientName,
    quoteId: quote.id,
    amount,
    date: body.date || new Date().toISOString().slice(0, 10),
    method: body.method || 'especes',
    reference: body.reference || '',
    notes: body.notes || '',
    stepId: body.stepId || null,
    createdAt: new Date().toISOString()
  };
  db.payments.unshift(payment);
  if (step) {
    if (step.amount === null) {
      step.amount = amount;
      step.status = 'paye';
    } else if (amount >= step.amount) {
      step.status = 'paye';
    } else {
      step.amount = Math.round(step.amount - amount);
      step.partial = Math.round((step.partial || 0) + amount);
      if (step.status === 'paye') step.status = 'en_retard';
    }
    step.paidAt = payment.date;
  } else if (quote.schedule) {
    const next = quote.schedule.find((s) => s.amount && s.status !== 'paye');
    if (next) next.status = 'paye';
  }
  const remaining = (quote.schedule || []).filter((s) => s.amount && s.status !== 'paye');
  if (!remaining.length && quote.status !== 'refuse') quote.status = 'accepte';
  if (client) client.lastPaymentAt = payment.date;
  save();
  res.status(201).json({ payment, ...paymentSummary(quote) });
});

router.post('/api/payments/:quoteId/schedule', requirePermission('paiement:write'), (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  const { step, amount, dueDate, months } = req.body || {};

  /* Mise en place (ou recalcul) d'un plan PEINTURE FLEX */
  if (months) {
    const duration = Math.round(Number(months));
    if (!(duration >= flex.FLEX.minMonths && duration <= flex.FLEX.maxMonths)) {
      return res.status(400).json({ error: 'La durée doit être comprise entre 1 et 12 mois' });
    }
    if ((quote.schedule || []).some((s) => s.status === 'paye')) {
      return res
        .status(400)
        .json({ error: 'Des échéances sont déjà réglées : la durée ne peut plus être modifiée' });
    }
    const plan = flex.buildFlexPlan(quote.total, duration, { startDate: (req.body || {}).startDate });
    quote.flex = {
      months: plan.months,
      rate: plan.rate,
      subscription: plan.subscription,
      financed: plan.financed,
      interest: plan.interest,
      totalCredit: plan.totalCredit,
      monthly: plan.monthly,
      total: plan.total,
      startDate: plan.startDate,
      bankValidated: flex.isBankValidated(quote)
    };
    quote.schedule = plan.schedule;
    if (!quote.financing) {
      quote.financing = {
        bank: flex.FLEX.bank,
        amount: plan.financed,
        steps: [
          { name: 'Dossier', date: null, status: 'en_attente', label: 'En attente' },
          { name: 'Pièces', date: null, status: 'en_attente', label: 'En attente' },
          { name: 'Transmis', date: null, status: 'en_attente', label: 'En attente' },
          { name: 'Décision de la banque', date: null, status: 'en_attente', label: 'En attente' }
        ]
      };
    }
    if (quote.status === 'brouillon' || quote.status === 'envoye') quote.status = 'accepte';
    save();
    return res.status(201).json(paymentSummary(quote));
  }

  if (!step || !amount) return res.status(400).json({ error: 'Étape et montant obligatoires' });
  quote.schedule = quote.schedule || [];
  quote.schedule.push({
    id: 's' + (quote.schedule.length + 1),
    step,
    amount: Number(amount),
    dueDate: dueDate || null,
    status: 'a_venir'
  });
  save();
  res.status(201).json(paymentSummary(quote));
});

router.post('/api/payments/:quoteId/schedule/init', requirePermission('paiement:write'), (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  if (!quote.schedule || !quote.schedule.length) {
    quote.schedule = seed.defaultSchedule(quote.total);
  }
  if (!quote.financing) {
    quote.financing = {
      bank: 'Banque partenaire',
      amount: Math.round(quote.total * 0.6),
      steps: [
        { name: 'Dossier', date: null, status: 'en_attente', label: 'En attente' },
        { name: 'Pièces', date: null, status: 'en_attente', label: 'En attente' },
        { name: 'Transmis', date: null, status: 'en_attente', label: 'En attente' },
        { name: 'Décision de la banque', date: null, status: 'en_attente', label: 'En attente' }
      ]
    };
  }
  if (quote.status === 'brouillon' || quote.status === 'envoye') quote.status = 'accepte';
  save();
  res.status(201).json(paymentSummary(quote));
});

router.get('/api/acomptes', requirePermission('paiement:read'), (req, res) => {
  let items = [...db.payments];
  const { clientId, quoteId } = req.query;
  if (clientId) items = items.filter((p) => p.clientId === clientId);
  if (quoteId) items = items.filter((p) => p.quoteId === quoteId);
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(items);
});

router.post('/api/acomptes', requirePermission('paiement:write'), (req, res) => {
  const { clientId, quoteId, amount, date, method, reference, notes } = req.body || {};
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Client non trouvé' });
  if (!Number(amount) || Number(amount) <= 0) return res.status(400).json({ error: 'Montant invalide' });
  const payment = {
    id: `AC-2026-${String(db.counters.payment++).padStart(3, '0')}`,
    clientId,
    clientName: client.name,
    quoteId: quoteId || null,
    amount: Number(amount),
    date: date || new Date().toISOString().slice(0, 10),
    method: method || 'especes',
    reference: reference || '',
    notes: notes || '',
    createdAt: new Date().toISOString()
  };
  db.payments.unshift(payment);
  save();
  res.status(201).json(payment);
});

router.delete('/api/acomptes/:id', requirePermission('paiement:write'), (req, res) => {
  const index = db.payments.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Acompte non trouvé' });
  db.payments.splice(index, 1);
  save();
  res.json({ success: true });
});

router.post('/api/payments/:quoteId/financing/advance', requirePermission('paiement:write'), (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  res.json({ financing: advanceFinancing(quote) });
});

module.exports = router;
