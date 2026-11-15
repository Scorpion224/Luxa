/**
 * Page Stocks.
 */

import { emptyState, pageHead } from '../ui/dom.js';
import { api, badge, esc, fmt, money } from '../core/format.js';
import { can, state } from '../core/state.js';
import { pages } from '../core/registry.js';

export async function renderStocks() {
  const stocks = await api('/api/stocks');
  const term = state.stocksSearch.toLowerCase();
  const filtered = stocks.filter(
    (p) => !term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
  );
  const totalValue = stocks.reduce((s, p) => s + p.value, 0);
  const low = stocks.filter((p) => p.status === 'bas').length;
  const units = stocks.reduce((s, p) => s + p.stock, 0);

  const rows = filtered
    .map(
      (p) =>
        '<tr>' +
        '<td><div class="line-item stock-product">' +
        '<span class="line-ico">' +
        (p.image ? '<img src="' + p.image + '" alt="">' : '<i class="fa-solid fa-box"></i>') +
        '</span>' +
        '<div><div class="line-desig">' +
        esc(p.name) +
        '</div><div class="line-detail">' +
        esc(p.category) +
        '</div></div>' +
        '</div></td>' +
        '<td>' +
        esc(p.location) +
        '</td>' +
        '<td class="right num">' +
        p.stock +
        ' ' +
        esc(p.unit) +
        '</td>' +
        '<td class="right num">' +
        p.minStock +
        '</td>' +
        '<td><div class="stock-bar"><span class="' +
        p.status +
        '" style="width:' +
        Math.min(100, Math.max(6, Math.round((p.stock / Math.max(p.minStock * 3, 1)) * 100))) +
        '%"></span></div></td>' +
        '<td>' +
        badge(p.status, p.status === 'bas' ? 'Stock bas' : p.status === 'moyen' ? 'Moyen' : 'OK') +
        '</td>' +
        '<td class="right num">' +
        money(p.value) +
        '</td>' +
        '<td class="right" style="white-space:nowrap">' +
        (can('stocks:write')
          ? '<button class="btn btn-ghost btn-xs" data-action="stock-adjust" data-id="' +
            esc(p.id) +
            '" data-delta="-1" aria-label="Retirer"><i class="fa-solid fa-minus"></i></button> ' +
            '<button class="btn btn-ghost btn-xs" data-action="stock-adjust" data-id="' +
            esc(p.id) +
            '" data-delta="1" aria-label="Ajouter"><i class="fa-solid fa-plus"></i></button>'
          : '<span class="muted-dash">—</span>') +
        '</td>' +
        '</tr>'
    )
    .join('');

  return (
    pageHead({
      title: 'Stocks',
      sub: 'Suivez les quantités disponibles, les alertes et la valorisation du stock.'
    }) +
    '<div class="page-body">' +
    '<div class="kpis k-equal">' +
    '<div class="kpi"><div class="kpi-icon teal"><i class="fa-solid fa-warehouse"></i></div><div><div class="kpi-label">Valeur du stock</div><div class="kpi-value sm">' +
    money(totalValue) +
    '</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon rust"><i class="fa-solid fa-triangle-exclamation"></i></div><div><div class="kpi-label">Références en alerte</div><div class="kpi-value">' +
    low +
    '</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon orange"><i class="fa-solid fa-cube"></i></div><div><div class="kpi-label">Références</div><div class="kpi-value">' +
    stocks.length +
    '</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon green"><i class="fa-solid fa-boxes-stacked"></i></div><div><div class="kpi-label">Unités disponibles</div><div class="kpi-value">' +
    fmt(units) +
    '</div></div></div>' +
    '</div>' +
    '<div class="card">' +
    '<div class="card-head">' +
    '<span class="card-icon"><i class="fa-solid fa-cube"></i></span>' +
    '<span class="card-title">État des stocks</span>' +
    '<span class="spacer"></span>' +
    '<div class="search-field" style="max-width:280px"><i class="fa-solid fa-magnifying-glass"></i>' +
    '<input class="input" id="stocksSearch" type="search" placeholder="Rechercher un produit..." value="' +
    esc(state.stocksSearch) +
    '"></div>' +
    '</div>' +
    '<table class="data stock-table">' +
    '<thead><tr><th>Produit</th><th>Emplacement</th><th class="right">Stock</th><th class="right">Seuil</th><th>Niveau</th><th>Statut</th><th class="right">Valeur</th><th class="right">Ajuster</th></tr></thead>' +
    '<tbody>' +
    (rows || '<tr><td colspan="8">' + emptyState('fa-box-open', 'Aucun produit trouvé') + '</td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>'
  );
}

/* Enregistrement de la page dans le routeur */
pages['stocks'] = renderStocks;
