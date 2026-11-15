/**
 * Produits, stocks et catégories.
 */

const express = require('express');
const { requirePermission } = require('../lib/auth');
const { db, save } = require('../store/database');

const router = express.Router();

router.get('/api/products', (req, res) => {
  let items = [...db.products];
  const { category, search, sort } = req.query;
  if (category)
    items = items.filter((p) => p.category === category || (p.extraCategories || []).includes(category));
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

router.get('/api/products/:id', (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit non trouvé' });
  res.json({ ...product, lowStock: product.stock <= product.minStock });
});

router.get('/api/stocks', requirePermission('stocks:read'), (req, res) => {
  const stocks = db.products.map((p) => ({
    ...p,
    status: p.stock <= p.minStock ? 'bas' : p.stock <= p.minStock * 1.5 ? 'moyen' : 'ok',
    value: p.stock * p.price,
    coverage: Math.min(100, Math.round((p.stock / Math.max(p.minStock * 3, 1)) * 100))
  }));
  res.json(stocks);
});

router.patch('/api/products/:id/stock', requirePermission('stocks:write'), (req, res) => {
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

module.exports = router;
