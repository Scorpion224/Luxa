/**
 * Espace client : demandes de devis, financement FLEX, réservations.
 */

const express = require('express');
const { currentUser, requirePermission } = require('../lib/auth');
const { advanceFinancing, cartSummary, clientOfUser, nowLabel, paymentSummary } = require('../lib/domain');
const { STATUS } = require('../lib/format');
const { buildLinesFromCalculation, calculateQuote, findQuote } = require('../lib/quotes');
const { db, save } = require('../store/database');
const flex = require('../../data/flex');
const portal = require('../../data/portal');

const router = express.Router();

/* Demande de devis « peindre ma maison » */
router.post('/api/portal/quotes', requirePermission('demande:write'), (req, res) => {
  const body = req.body || {};
  const client = clientOfUser(req.user);
  if (!client) return res.status(400).json({ error: 'Aucune fiche client rattachée à ce compte' });
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
  const lines = buildLinesFromCalculation(calc, body.finish);
  const quote = {
    id: `DV-2026-${String(db.counters.quote++).padStart(3, '0')}`,
    clientId: client.id,
    clientName: client.name,
    clientCompany: client.company,
    subject: body.subject || 'Peinture de ma maison',
    site: body.site || (client.address ? client.address + ', ' + client.city : client.city),
    createdAt: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'envoye',
    relance: false,
    origin: 'portail',
    surface: calc.surface,
    rooms: calc.rooms,
    productId: calc.productId,
    finish: body.finish || '',
    lines,
    subtotal: calc.subtotal,
    tvaRate: calc.tvaRate,
    tvaEnabled: true,
    tvaAmount: calc.tvaAmount,
    total: calc.total,
    schedule: [],
    flex: null,
    financing: null,
    notes: body.notes || 'Demande envoyée depuis l’espace client.'
  };
  db.quotes.push(quote);
  save();
  res.status(201).json(quote);
});

/* Demande de financement PEINTURE FLEX */
router.post('/api/portal/flex', requirePermission('demande:write'), (req, res) => {
  const quote = findQuote((req.body || {}).quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  const client = clientOfUser(req.user);
  if (client && quote.clientId !== client.id) {
    return res.status(403).json({ error: 'Ce devis appartient à un autre client' });
  }
  const months = Math.min(
    flex.FLEX.maxMonths,
    Math.max(flex.FLEX.minMonths, Math.round(Number((req.body || {}).months) || 6))
  );
  const plan = flex.buildFlexPlan(quote.total, months);
  if (!(quote.schedule || []).some((s) => s.status === 'paye')) {
    quote.schedule = plan.schedule;
  }
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
    bankValidated: false,
    requestedAt: new Date().toISOString().slice(0, 10)
  };
  if (!quote.financing) {
    quote.financing = {
      bank: flex.FLEX.bank,
      amount: plan.financed,
      steps: [
        { name: 'Dossier', date: nowLabel(), status: 'en_cours', label: 'En cours' },
        { name: 'Pièces', date: null, status: 'en_attente', label: 'En attente' },
        { name: 'Transmis', date: null, status: 'en_attente', label: 'En attente' },
        { name: 'Décision de la banque', date: null, status: 'en_attente', label: 'En attente' }
      ]
    };
  }
  save();
  res.status(201).json(paymentSummary(quote));
});

router.get('/api/portal/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Session expirée' });
  const client = clientOfUser(user);
  const mine = (list, key) =>
    client ? list.filter((item) => item[key] === client.id) : list.filter((item) => item.userId === user.id);
  const quotes = mine(db.quotes, 'clientId')
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  res.json({
    client: client,
    cart: cartSummary(user.id),
    quotes: quotes.map((q) => ({
      id: q.id,
      subject: q.subject,
      createdAt: q.createdAt,
      status: q.status,
      statusLabel: STATUS[q.status] || q.status,
      total: q.total,
      surface: q.surface,
      rooms: (q.rooms || []).length,
      flex: q.flex || null,
      financing: q.financing || null,
      bankValidated: flex.isBankValidated(q),
      schedule: (q.schedule || []).length
        ? {
            count: q.schedule.filter((s) => s.kind === 'installment').length,
            monthly: (q.schedule.find((s) => s.kind === 'installment') || {}).amount || 0,
            paid: q.schedule.filter((s) => s.status === 'paye').length
          }
        : null
    })),
    orders: mine(db.orders, 'clientId'),
    bookings: mine(db.bookings || [], 'clientId'),
    teams: db.teams || portal.TEAMS
  });
});

/* Équipes et planning */
router.get('/api/teams', (req, res) => {
  res.json(db.teams || portal.TEAMS);
});

router.get('/api/planning/slots', (req, res) => {
  const days = Number(req.query.days) || 14;
  res.json(portal.buildCalendar(db.bookings || [], { days }));
});

router.get('/api/bookings', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Session expirée' });
  const list = user.clientId
    ? (db.bookings || []).filter((b) => b.clientId === user.clientId)
    : db.bookings || [];
  res.json(list);
});

router.post('/api/bookings', requirePermission('reservation:write'), (req, res) => {
  const body = req.body || {};
  const quote = findQuote(body.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  if (!flex.isBankValidated(quote)) {
    return res
      .status(400)
      .json({ error: 'Le financement doit être validé par la banque avant de réserver une intervention' });
  }
  const day = portal.buildCalendar(db.bookings || [], { days: 15 }).find((d) => d.date === body.date);
  if (!day || day.closed) return res.status(400).json({ error: 'Date indisponible' });
  const slot = day.slots.find((s) => s.slot === body.slot);
  if (!slot || !slot.available) return res.status(400).json({ error: 'Créneau complet' });
  const teamId = slot.teamIds.includes(body.teamId) ? body.teamId : slot.teamIds[0];
  if (!teamId) return res.status(400).json({ error: 'Aucune équipe disponible sur ce créneau' });
  const team = (db.teams || portal.TEAMS).find((t) => t.id === teamId);
  const client = clientOfUser(req.user);
  const booking = {
    id: 'RDV-2026-' + String(db.counters.booking++).padStart(3, '0'),
    quoteId: quote.id,
    clientId: client ? client.id : quote.clientId,
    clientName: client ? client.name : quote.clientName,
    date: body.date,
    slot: body.slot,
    slotLabel: slot.label,
    teamId,
    teamName: team ? team.name : '',
    status: 'demande',
    createdAt: new Date().toISOString().slice(0, 10)
  };
  db.bookings.unshift(booking);
  save();
  res.status(201).json(booking);
});

router.patch('/api/bookings/:id', requirePermission('planning:manage'), (req, res) => {
  const booking = (db.bookings || []).find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Réservation non trouvée' });
  const status = (req.body || {}).status;
  if (!['confirme', 'refuse'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  booking.status = status;
  booking.decidedAt = nowLabel();
  save();
  res.json(booking);
});

/* Le client fait avancer son propre dossier de financement */
router.post('/api/portal/financing/:quoteId/advance', requirePermission('demande:write'), (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  const client = clientOfUser(currentUser(req));
  if (client && quote.clientId !== client.id) {
    return res.status(403).json({ error: 'Ce devis appartient à un autre client' });
  }
  if (!quote.flex) {
    return res.status(400).json({ error: 'Aucune demande PEINTURE FLEX sur ce devis' });
  }
  res.json({ financing: advanceFinancing(quote), bankValidated: flex.isBankValidated(quote) });
});

module.exports = router;
