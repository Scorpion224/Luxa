/**
 * Calculs de devis (surfaces, postes, totaux) — logique métier pure.
 */

const { STATUS, round1 } = require('./format');
const { db } = require('../store/database');

function findQuote(id) {
  return db.quotes.find((q) => q.id === id);
}

function activeQuotes() {
  return db.quotes.filter((q) => ['brouillon', 'envoye', 'accepte', 'en_retard'].includes(q.status));
}

function enrichQuote(q) {
  const paid = db.payments.filter((p) => p.quoteId === q.id).reduce((sum, p) => sum + p.amount, 0);
  return {
    ...q,
    statusLabel: STATUS[q.status] || q.status,
    paid,
    balance: Math.max(0, q.total - paid)
  };
}

function computeTotals(q) {
  const subtotal = q.lines.reduce((sum, l) => sum + l.amount, 0);
  const tvaAmount = q.tvaEnabled === false ? 0 : Math.round(subtotal * (q.tvaRate ?? 0.18));
  return { subtotal, tvaAmount, total: subtotal + tvaAmount };
}

function calculateQuote(payload) {
  const rooms =
    Array.isArray(payload.rooms) && payload.rooms.length
      ? payload.rooms
      : [{ length: 0, width: 0, height: 0, doors: 0, windows: 0 }];
  const product = db.products.find((p) => p.id === payload.productId) || db.products[0];
  const rendement = Number(payload.rendement ?? product.rendement ?? 10) || 10;
  const coats = Math.max(1, Number(payload.coats ?? 2));
  const waste = Number(payload.waste ?? 0.1);
  const laborPrice = Number(payload.laborPrice ?? 30000);
  const transport = Number(payload.transport ?? 250000);
  const tvaRate = Number(payload.tvaRate ?? 0.18);
  const tvaEnabled = payload.tvaEnabled !== false;

  const DOOR = 2; // m² par porte (2,00 × 1,00)
  const WINDOW = 1.5; // m² par fenêtre (1,50 × 1,00)

  const details = rooms.map((room) => {
    const length = Number(room.length) || 0;
    const width = Number(room.width) || 0;
    const height = Number(room.height) || 0;
    const doors = Number(room.doors) || 0;
    const windows = Number(room.windows) || 0;
    const wall = 2 * (length + width) * height;
    const openings = doors * DOOR + windows * WINDOW;
    const surface = Math.max(0, wall - openings);
    return {
      name: room.name || 'Pièce',
      surface: round1(surface),
      length,
      width,
      height,
      doors,
      windows
    };
  });

  const surface = round1(details.reduce((sum, r) => sum + r.surface, 0));
  const liters = Math.max(0, Math.ceil(((surface * coats) / rendement) * (1 + waste)));
  const pricePerLiter = product.format ? product.price / product.format : product.price;
  const paintAmount = Math.round(liters * pricePerLiter);
  const laborAmount = Math.round(surface * laborPrice);
  const subtotal = paintAmount + laborAmount + transport;
  const tvaAmount = tvaEnabled ? Math.round(subtotal * tvaRate) : 0;

  return {
    surface,
    liters,
    rooms: details,
    pricePerLiter: Math.round(pricePerLiter),
    details: {
      peinture: { qty: liters, unit: 'L', unitPrice: Math.round(pricePerLiter), amount: paintAmount },
      mainOeuvre: { qty: surface, unit: 'm²', unitPrice: laborPrice, amount: laborAmount },
      transport: { qty: 1, unit: 'forfait', unitPrice: transport, amount: transport }
    },
    subtotal,
    tvaRate,
    tvaAmount,
    total: subtotal + tvaAmount,
    productId: product.id,
    productName: product.name
  };
}

function buildLinesFromCalculation(calc, finish) {
  const d = calc.details;
  return [
    {
      icon: 'paint',
      designation: 'Peinture intérieure',
      detail: finish || 'Finition mate • Blanc Cassé',
      qty: d.peinture.qty,
      unit: d.peinture.unit,
      unitPrice: d.peinture.unitPrice,
      amount: d.peinture.amount
    },
    {
      icon: 'labor',
      designation: 'Main-d’œuvre',
      detail: 'Application (2 couches)',
      qty: d.mainOeuvre.qty,
      unit: d.mainOeuvre.unit,
      unitPrice: d.mainOeuvre.unitPrice,
      amount: d.mainOeuvre.amount
    },
    {
      icon: 'transport',
      designation: 'Transport',
      detail: 'Livraison sur site',
      qty: 1,
      unit: 'forfait',
      unitPrice: d.transport.unitPrice,
      amount: d.transport.amount
    }
  ];
}

module.exports = {
  activeQuotes,
  buildLinesFromCalculation,
  calculateQuote,
  computeTotals,
  enrichQuote,
  findQuote
};
