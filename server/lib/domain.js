/**
 * Helpers métier partagés : panier, financement PEINTURE FLEX, finances.
 */

const { db, save } = require('../store/database');
const flex = require('../../data/flex');

/* ------------------------------------------------------------------ */
function cartOf(userId) {
  if (!db.carts[userId]) db.carts[userId] = [];
  return db.carts[userId];
}

function cartSummary(userId) {
  const items = cartOf(userId)
    .map((line) => {
      const product = db.products.find((p) => p.id === line.productId);
      if (!product) return null;
      const qty = Math.max(1, Number(line.qty) || 1);
      return {
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        unit: product.unit,
        image: product.image || null,
        stock: product.stock,
        qty,
        total: product.price * qty
      };
    })
    .filter(Boolean);
  return {
    items,
    count: items.reduce((sum, i) => sum + i.qty, 0),
    total: items.reduce((sum, i) => sum + i.total, 0)
  };
}

function clientOfUser(user) {
  if (!user || !user.clientId) return null;
  return db.clients.find((c) => c.id === user.clientId) || null;
}

function clientFinancingValidated(clientId) {
  return db.quotes.filter((q) => q.clientId === clientId).some((q) => flex.isBankValidated(q));
}

/* ------------------------------------------------------------------ */
function paymentSummary(quote) {
  const schedule = quote.schedule || [];
  const paidSteps = schedule.filter((s) => s.status === 'paye' || s.status === 'paye_partiel');
  const paidTotal = db.payments.filter((p) => p.quoteId === quote.id).reduce((s, p) => s + p.amount, 0);
  const remaining = schedule.filter((s) => s.amount && s.status !== 'paye').reduce((s, p) => s + p.amount, 0);
  return {
    schedule,
    financing: quote.financing || null,
    flex: quote.flex || null,
    bankValidated: flex.isBankValidated(quote),
    flexAccess: !!quote.flex,
    installmentAllowed: !!quote.flex,
    paidTotal,
    paidSteps: paidSteps.length,
    remaining,
    progress: Math.min(100, Math.round((paidTotal / Math.max(quote.total, 1)) * 100))
  };
}

function nowLabel() {
  const d = new Date();
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return date.replace('.', '.') + ' à ' + time;
}

function advanceFinancing(quote) {
  if (!quote.financing) {
    quote.financing = {
      bank: 'Banque partenaire',
      amount: Math.round(quote.total * 0.6),
      steps: [
        { name: 'Dossier', date: nowLabel(), status: 'valide', label: 'Validé' },
        { name: 'Pièces', date: nowLabel(), status: 'completes', label: 'Complètes' },
        { name: 'Transmis', date: nowLabel(), status: 'en_cours', label: 'En cours' },
        { name: 'Décision de la banque', date: null, status: 'en_attente', label: 'En attente' }
      ]
    };
    save();
    return quote.financing;
  }
  const steps = quote.financing.steps;
  const decision = steps.find((s) => s.name === 'Décision de la banque');
  const transmitted = steps.find((s) => s.name === 'Transmis');
  steps.forEach((s) => {
    if (!s.date) s.date = nowLabel();
    if (s.name === 'Dossier') {
      s.status = 'valide';
      s.label = 'Validé';
    } else if (s.name === 'Pièces') {
      if (s.status === 'en_attente') {
        s.status = 'completes';
        s.label = 'Complètes';
      }
    } else if (s.status === 'en_attente') {
      s.status = 'en_cours';
      s.label = 'En cours';
    }
  });
  if (transmitted) {
    transmitted.status = 'en_cours';
    transmitted.label = 'En cours';
  }
  if (decision && decision.status === 'en_cours' && !decision.decisionSent) {
    decision.decisionSent = true;
    decision.status = 'en_cours';
    decision.label = 'En cours';
  } else if (decision && decision.decisionSent) {
    decision.status = 'valide';
    decision.label = 'Validée';
    decision.date = nowLabel();
  }
  if (quote.flex && flex.isBankValidated(quote)) {
    quote.flex.bankValidated = true;
    // à la validation bancaire, l'échéancier FLEX est généré
    if (!(quote.schedule || []).length) {
      const plan = flex.buildFlexPlan(quote.total, quote.flex.months, { startDate: quote.flex.startDate });
      quote.schedule = plan.schedule;
    }
  }
  save();
  return quote.financing;
}

/* ------------------------------------------------------------------ */
const MONTHS = [
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
  'Déc.'
];

module.exports = {
  MONTHS,
  advanceFinancing,
  cartOf,
  cartSummary,
  clientFinancingValidated,
  clientOfUser,
  nowLabel,
  paymentSummary
};
