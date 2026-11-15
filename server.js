/**
 * Peinture Pro Guinée — Serveur de l'application de gestion
 * Express + persistance JSON locale (data/db.json)
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const seed = require('./data/seed');
const roles = require('./data/roles');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

/* ------------------------------------------------------------------ */
/* Base de données locale                                              */
/* ------------------------------------------------------------------ */
function seedDatabase() {
  return {
    company: seed.COMPANY,
    users: seed.USERS,
    products: seed.PRODUCTS,
    clients: seed.CLIENTS,
    quotes: seed.QUOTES,
    payments: seed.PAYMENTS,
    chantiers: seed.CHANTIERS,
    draftQuote: seed.DRAFT_QUOTE,
    counters: { quote: 32, payment: 15, client: 9, chantier: 8 }
  };
}

let db;
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch (err) {
  db = seedDatabase();
}
// migration douce : une base créée avant l'arrivée des comptes utilisateurs
if (!Array.isArray(db.users)) db.users = seed.USERS;

function save() {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Impossible d’enregistrer les données :', err.message);
  }
}
save();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const STATUS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  en_retard: 'En retard'
};

const round1 = (n) => Math.round(n * 10) / 10;

function findQuote(id) {
  return db.quotes.find((q) => q.id === id);
}

function activeQuotes() {
  return db.quotes.filter((q) => ['brouillon', 'envoye', 'accepte', 'en_retard'].includes(q.status));
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function enrichQuote(q) {
  const paid = db.payments
    .filter((p) => p.quoteId === q.id)
    .reduce((sum, p) => sum + p.amount, 0);
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
  const rooms = Array.isArray(payload.rooms) && payload.rooms.length
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

  const DOOR = 2;      // m² par porte (2,00 × 1,00)
  const WINDOW = 1.5;  // m² par fenêtre (1,50 × 1,00)

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
      length, width, height, doors, windows
    };
  });

  const surface = round1(details.reduce((sum, r) => sum + r.surface, 0));
  const liters = Math.max(0, Math.ceil((surface * coats / rendement) * (1 + waste)));
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
    { icon: 'paint', designation: 'Peinture intérieure', detail: finish || 'Finition mate • Blanc Cassé', qty: d.peinture.qty, unit: d.peinture.unit, unitPrice: d.peinture.unitPrice, amount: d.peinture.amount },
    { icon: 'labor', designation: 'Main-d’œuvre', detail: 'Application (2 couches)', qty: d.mainOeuvre.qty, unit: d.mainOeuvre.unit, unitPrice: d.mainOeuvre.unitPrice, amount: d.mainOeuvre.amount },
    { icon: 'transport', designation: 'Transport', detail: 'Livraison sur site', qty: 1, unit: 'forfait', unitPrice: d.transport.unitPrice, amount: d.transport.amount }
  ];
}

/* ------------------------------------------------------------------ */
/* API — Référentiel                                                   */
/* ------------------------------------------------------------------ */
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

app.get('/api/company', (req, res) => res.json(db.company));

/* ------------------------------------------------------------------ */
/* Utilisateurs & authentification (démonstration)                     */
/* ------------------------------------------------------------------ */
const ROLE_LABEL = roles.ROLE_LABEL;

// Le mot de passe ne sort jamais de l'API
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABEL[user.role] || user.role,
    permissions: roles.permissionsFor(user.role),
    phone: user.phone || '',
    initials: (user.name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  };
}

app.get('/api/roles', (req, res) => {
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

app.get('/api/users', (req, res) => {
  const role = String(req.query.role || '').toLowerCase();
  const list = db.users.filter((u) => !role || u.role === role);
  res.json(list.map(publicUser));
});

app.get('/api/users/:id', (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json(publicUser(user));
});

app.post('/api/auth/login', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  const user = db.users.find((u) => u.email.toLowerCase() === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  user.lastLoginAt = new Date().toISOString();
  save();
  res.json({
    token: 'demo-' + user.id + '-' + Date.now(),
    user: publicUser(user)
  });
});

app.get('/api/categories', (req, res) => {
  const fixed = ['FOM intérieurs', 'FOM extérieurs', 'Mastiques pour murs', 'Peintures à huile', 'Accessoires et consommables'];
  res.json(fixed.map((name) => ({
    name,
    count: db.products.filter((p) => p.category === name || (p.extraCategories || []).includes(name)).length
  })));
});

app.get('/api/products', (req, res) => {
  let items = [...db.products];
  const { category, search, sort } = req.query;
  if (category) items = items.filter((p) => p.category === category || (p.extraCategories || []).includes(category));
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }
  if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
  else if (sort === 'stock_desc') items.sort((a, b) => b.stock - a.stock);
  else items.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  res.json(items.map((p) => ({ ...p, lowStock: p.stock <= p.minStock })));
});

app.get('/api/products/:id', (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit non trouvé' });
  res.json({ ...product, lowStock: product.stock <= product.minStock });
});

app.get('/api/stocks', (req, res) => {
  const stocks = db.products.map((p) => ({
    ...p,
    status: p.stock <= p.minStock ? 'bas' : p.stock <= p.minStock * 1.5 ? 'moyen' : 'ok',
    value: p.stock * p.price,
    coverage: Math.min(100, Math.round((p.stock / Math.max(p.minStock * 3, 1)) * 100))
  }));
  res.json(stocks);
});

app.patch('/api/products/:id/stock', (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit non trouvé' });
  const delta = Number(req.body.delta) || 0;
  product.stock = Math.max(0, product.stock + delta);
  const location = req.body.location || product.location;
  if (product.stockByLocation && product.stockByLocation[location] !== undefined) {
    product.stockByLocation[location] = Math.max(0, product.stockByLocation[location] + delta);
  }
  save();
  res.json({ ...product, lowStock: product.stock <= product.minStock });
});

/* ------------------------------------------------------------------ */
/* API — Clients                                                       */
/* ------------------------------------------------------------------ */
app.get('/api/clients', (req, res) => {
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
      lastQuoteAt: quotes.map((q) => q.createdAt).sort().pop() || null
    };
  });
  res.json(withStats);
});

app.post('/api/clients', (req, res) => {
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

app.get('/api/clients/:id', (req, res) => {
  const client = db.clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client non trouvé' });
  res.json({
    ...client,
    quotes: db.quotes.filter((q) => q.clientId === client.id).map(enrichQuote),
    payments: db.payments.filter((p) => p.clientId === client.id),
    chantiers: db.chantiers.filter((c) => c.clientId === client.id)
  });
});

/* ------------------------------------------------------------------ */
/* API — Devis                                                         */
/* ------------------------------------------------------------------ */
app.get('/api/quotes', (req, res) => {
  const { status, search, sort = 'recent', page = 1, perPage = 20 } = req.query;
  let items = activeQuotes();
  if (status) items = items.filter((q) => q.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter((x) => x.id.toLowerCase().includes(q) || x.clientName.toLowerCase().includes(q) || x.subject.toLowerCase().includes(q));
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

app.get('/api/quotes/:id', (req, res) => {
  const quote = findQuote(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  res.json(enrichQuote(quote));
});

app.post('/api/quotes/calculate', (req, res) => {
  res.json(calculateQuote(req.body || {}));
});

app.get('/api/quotes-draft', (req, res) => {
  res.json(db.draftQuote);
});

app.post('/api/quotes', (req, res) => {
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
  const tvaAmount = body.tvaAmount !== undefined
    ? Number(body.tvaAmount)
    : (tvaEnabled ? Math.round(subtotal * tvaRate) : 0);
  const total = body.total !== undefined ? Number(body.total) : subtotal + tvaAmount;
  const quote = {
    id: `DV-2026-${String(db.counters.quote++).padStart(3, '0')}`,
    clientId: body.clientId || (client ? client.id : null),
    clientName: client ? client.name : (body.clientName || 'Client'),
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

app.patch('/api/quotes/:id', (req, res) => {
  const quote = findQuote(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  const allowed = ['clientId', 'clientName', 'subject', 'site', 'status', 'relance', 'notes', 'validUntil', 'total', 'subtotal', 'tvaAmount', 'lines', 'rooms', 'surface', 'finish'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) quote[key] = req.body[key];
  });
  save();
  res.json(enrichQuote(quote));
});

app.post('/api/quotes/:id/status', (req, res) => {
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

app.delete('/api/quotes/:id', (req, res) => {
  const index = db.quotes.findIndex((q) => q.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Devis non trouvé' });
  db.quotes.splice(index, 1);
  save();
  res.json({ success: true });
});

app.get('/api/dashboard', (req, res) => {
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

/* ------------------------------------------------------------------ */
/* API — Paiements / Peinture Flex                                     */
/* ------------------------------------------------------------------ */
function paymentSummary(quote) {
  const schedule = quote.schedule || [];
  const paidSteps = schedule.filter((s) => s.status === 'paye' || s.status === 'paye_partiel');
  const paidTotal = db.payments.filter((p) => p.quoteId === quote.id).reduce((s, p) => s + p.amount, 0);
  const remaining = schedule
    .filter((s) => s.amount && s.status !== 'paye')
    .reduce((s, p) => s + p.amount, 0);
  return {
    schedule,
    financing: quote.financing || null,
    paidTotal,
    paidSteps: paidSteps.length,
    remaining,
    progress: Math.min(100, Math.round((paidTotal / Math.max(quote.total, 1)) * 100))
  };
}

app.get('/api/payments/quotes', (req, res) => {
  const items = db.quotes
    .filter((q) => (q.schedule && q.schedule.length) || ['accepte', 'en_retard'].includes(q.status))
    .map((q) => ({ id: q.id, label: `${q.id} — ${q.clientName}`, total: q.total, clientName: q.clientName, status: q.status }));
  res.json(items);
});

app.get('/api/payments/:quoteId', (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  res.json({
    quote: {
      id: quote.id, clientName: quote.clientName, total: quote.total, status: quote.status,
      statusLabel: STATUS[quote.status], financing: quote.financing
    },
    ...paymentSummary(quote),
    payments: db.payments.filter((p) => p.quoteId === quote.id)
  });
});

app.post('/api/payments/:quoteId/pay', (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  const body = req.body || {};
  const amount = Number(body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });
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
  const step = (quote.schedule || []).find((s) => s.id === body.stepId);
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

app.post('/api/payments/:quoteId/schedule', (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
  const { step, amount, dueDate } = req.body || {};
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

app.post('/api/payments/:quoteId/schedule/init', (req, res) => {
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

app.get('/api/acomptes', (req, res) => {
  let items = [...db.payments];
  const { clientId, quoteId } = req.query;
  if (clientId) items = items.filter((p) => p.clientId === clientId);
  if (quoteId) items = items.filter((p) => p.quoteId === quoteId);
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(items);
});

app.post('/api/acomptes', (req, res) => {
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

app.delete('/api/acomptes/:id', (req, res) => {
  const index = db.payments.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Acompte non trouvé' });
  db.payments.splice(index, 1);
  save();
  res.json({ success: true });
});


function nowLabel() {
  const d = new Date();
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return date.replace('.', '.') + ' à ' + time;
}

app.post('/api/payments/:quoteId/financing/advance', (req, res) => {
  const quote = findQuote(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
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
    return res.json({ financing: quote.financing });
  }
  const steps = quote.financing.steps;
  const decision = steps.find((s) => s.name === 'Décision de la banque');
  const transmitted = steps.find((s) => s.name === 'Transmis');
  steps.forEach((s) => {
    if (!s.date) s.date = nowLabel();
    if (s.status === 'en_attente') s.status = 'en_cours';
  });
  if (transmitted) { transmitted.status = 'en_cours'; transmitted.label = 'En cours'; }
  if (decision && decision.status === 'en_cours' && !decision.decisionSent) {
    decision.decisionSent = true;
    decision.status = 'en_cours';
    decision.label = 'En cours';
  } else if (decision && decision.decisionSent) {
    decision.status = 'valide';
    decision.label = 'Validée';
    decision.date = nowLabel();
  }
  save();
  res.json({ financing: quote.financing });
});

/* ------------------------------------------------------------------ */
/* API — Chantiers                                                     */
/* ------------------------------------------------------------------ */
app.get('/api/chantiers', (req, res) => {
  res.json(db.chantiers.map((c) => ({ ...c, progress: Number(c.progress) || 0 })));
});

app.post('/api/chantiers', (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'Le nom du chantier est obligatoire' });
  const client = db.clients.find((c) => c.id === body.clientId);
  const chantier = {
    id: `CH-2026-${String(db.counters.chantier++).padStart(3, '0')}`,
    name: body.name,
    clientId: body.clientId || null,
    clientName: client ? client.name : (body.clientName || '—'),
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

app.patch('/api/chantiers/:id', (req, res) => {
  const chantier = db.chantiers.find((c) => c.id === req.params.id);
  if (!chantier) return res.status(404).json({ error: 'Chantier non trouvé' });
  ['progress', 'status', 'spent', 'chef', 'team', 'endDate'].forEach((key) => {
    if (req.body[key] !== undefined) chantier[key] = req.body[key];
  });
  if (chantier.progress >= 100) chantier.status = 'termine';
  save();
  res.json(chantier);
});

/* ------------------------------------------------------------------ */
/* API — Finance                                                       */
/* ------------------------------------------------------------------ */
const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

app.get('/api/finance', (req, res) => {
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
        status: due === 0 ? 'payee' : (q.schedule || []).some((s) => s.status === 'en_retard') ? 'en_retard' : 'envoyee'
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
      panierMoyen: accepted.length ? Math.round(accepted.reduce((s, q) => s + q.total, 0) / accepted.length) : 0
    },
    series,
    factures,
    payments
  });
});

/* ------------------------------------------------------------------ */
/* Frontend                                                            */
/* ------------------------------------------------------------------ */
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Peinture Pro Guinée — serveur démarré sur http://localhost:${PORT}\n`);
});
