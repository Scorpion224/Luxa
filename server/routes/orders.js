/**
 * Panier et commandes boutique.
 */

const express = require('express');
const { currentUser, requirePermission } = require('../lib/auth');
const { cartOf, cartSummary, clientFinancingValidated, clientOfUser } = require('../lib/domain');
const { db, save } = require('../store/database');
const roles = require('../../data/roles');

const router = express.Router();

router.get('/api/cart', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Session expirée' });
  res.json(cartSummary(user.id));
});

router.post('/api/cart/items', requirePermission('panier:write'), (req, res) => {
  const { productId, qty } = req.body || {};
  const product = db.products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Produit non trouvé' });
  const cart = cartOf(req.user.id);
  const line = cart.find((l) => l.productId === productId);
  const quantity = Math.max(1, Number(qty) || 1);
  if (line) line.qty = Math.min(999, Number(line.qty) + quantity);
  else cart.push({ productId, qty: quantity });
  save();
  res.status(201).json(cartSummary(req.user.id));
});

router.patch('/api/cart/items/:productId', requirePermission('panier:write'), (req, res) => {
  const cart = cartOf(req.user.id);
  const line = cart.find((l) => l.productId === req.params.productId);
  if (!line) return res.status(404).json({ error: 'Ligne de panier non trouvée' });
  const qty = Number((req.body || {}).qty);
  if (!qty || qty < 1) {
    db.carts[req.user.id] = cart.filter((l) => l.productId !== req.params.productId);
  } else {
    line.qty = Math.min(999, Math.round(qty));
  }
  save();
  res.json(cartSummary(req.user.id));
});

router.delete('/api/cart/items/:productId', requirePermission('panier:write'), (req, res) => {
  db.carts[req.user.id] = cartOf(req.user.id).filter((l) => l.productId !== req.params.productId);
  save();
  res.json(cartSummary(req.user.id));
});

router.delete('/api/cart', requirePermission('panier:write'), (req, res) => {
  db.carts[req.user.id] = [];
  save();
  res.json(cartSummary(req.user.id));
});

router.post('/api/orders', requirePermission('commande:write'), (req, res) => {
  const summary = cartSummary(req.user.id);
  const mode = (req.body || {}).mode === 'flex' ? 'flex' : 'cash';
  if (!summary.items.length) return res.status(400).json({ error: 'Votre panier est vide' });
  const client = clientOfUser(req.user);
  if (mode === 'flex' && !clientFinancingValidated(client ? client.id : null)) {
    return res
      .status(400)
      .json({ error: 'Le financement PEINTURE FLEX de la banque doit être validé avant cet achat à crédit' });
  }
  const order = {
    id: 'CMD-2026-' + String(db.counters.order++).padStart(3, '0'),
    clientId: client ? client.id : null,
    clientName: client ? client.name : req.user.name,
    userId: req.user.id,
    mode,
    status: mode === 'cash' ? 'a_preparer' : 'en_financement',
    items: summary.items.map((i) => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })),
    total: summary.total,
    createdAt: new Date().toISOString().slice(0, 10),
    paidAt: null
  };
  db.orders.unshift(order);
  db.carts[req.user.id] = [];
  save();
  res.status(201).json(order);
});

router.get('/api/orders', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Session expirée' });
  const mine = db.orders.filter(
    (o) => o.userId === user.id || (user.clientId && o.clientId === user.clientId)
  );
  const all = roles.can(user.role, 'commande:read') && user.role !== 'client';
  res.json(all ? db.orders : mine);
});

router.patch('/api/orders/:id', requirePermission('commande:write'), (req, res) => {
  const user = currentUser(req);
  if (!user || user.role === 'client') {
    return res.status(403).json({ error: 'Action réservée à l’équipe commerciale' });
  }
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
  const status = (req.body || {}).status;
  if (!['a_preparer', 'en_financement', 'livree', 'annulee'].includes(status)) {
    return res.status(400).json({ error: 'Statut de commande invalide' });
  }
  order.status = status;
  if (status === 'livree') order.deliveredAt = new Date().toISOString().slice(0, 10);
  save();
  res.json(order);
});

module.exports = router;
