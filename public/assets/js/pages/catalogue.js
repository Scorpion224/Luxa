/**
 * Page Catalogue produits.
 */

import { emptyState, pageHead } from '../ui/dom.js';
import { api, esc, money } from '../core/format.js';
import { state } from '../core/state.js';
import { pages } from '../core/registry.js';

export async function renderCatalogue() {
  const cat = state.catalogue;
  const products = await api(
    '/api/products?category=' +
      (cat.search ? '' : encodeURIComponent(cat.category)) +
      '&search=' +
      encodeURIComponent(cat.search) +
      '&sort=' +
      encodeURIComponent(cat.sort)
  );
  state.products = await api('/api/products');
  const categories = [
    'FOM intérieurs',
    'FOM extérieurs',
    'Mastiques pour murs',
    'Peintures à huile',
    'Accessoires et consommables'
  ];

  const cards = products.map((p) => productCard(p)).join('');

  return (
    pageHead({
      title: 'Catalogue produits',
      sub: 'Parcourez notre gamme de peintures, mastiques et accessoires.'
    }) +
    '<div class="page-body">' +
    '<div class="catalogue-toolbar">' +
    '<div class="search-field"><i class="fa-solid fa-magnifying-glass"></i>' +
    '<input class="input" id="catalogueSearch" type="search" placeholder="Rechercher un produit..." value="' +
    esc(cat.search) +
    '"></div>' +
    '<div class="sort-group"><span class="toolbar-label">Trier par :</span>' +
    '<select class="select" id="catalogueSort">' +
    '<option value="name"' +
    (cat.sort === 'name' ? ' selected' : '') +
    '>Nom (A → Z)</option>' +
    '<option value="price_asc"' +
    (cat.sort === 'price_asc' ? ' selected' : '') +
    '>Prix croissant</option>' +
    '<option value="price_desc"' +
    (cat.sort === 'price_desc' ? ' selected' : '') +
    '>Prix décroissant</option>' +
    '<option value="stock_desc"' +
    (cat.sort === 'stock_desc' ? ' selected' : '') +
    '>Stock disponible</option>' +
    '</select>' +
    '</div>' +
    '<div class="view-toggle">' +
    '<button class="' +
    (cat.view === 'grid' ? 'active' : '') +
    '" data-action="catalogue-view" data-view="grid" aria-label="Vue grille"><i class="fa-solid fa-table-cells-large"></i></button>' +
    '<button class="' +
    (cat.view === 'list' ? 'active' : '') +
    '" data-action="catalogue-view" data-view="list" aria-label="Vue liste"><i class="fa-solid fa-bars-staggered"></i></button>' +
    '</div>' +
    '</div>' +
    '<div class="cat-row">' +
    categories
      .map(
        (c) =>
          '<button class="cat-chip ' +
          (!cat.search && c === cat.category ? 'active' : '') +
          '" data-action="catalogue-category" data-category="' +
          esc(c) +
          '">' +
          esc(c) +
          '</button>'
      )
      .join('') +
    '</div>' +
    '<div class="product-grid ' +
    (cat.view === 'list' ? 'list' : '') +
    '">' +
    (cards || emptyState('fa-box-open', 'Aucun produit ne correspond à votre recherche')) +
    '</div>' +
    '<div class="notice"><i class="fa-solid fa-triangle-exclamation"></i><span class="notice-text">Classification FOM à confirmer</span></div>' +
    '</div>'
  );
}

export function productCard(p) {
  const thumb = p.image
    ? '<img src="' + p.image + '" alt="' + esc(p.name) + '" loading="lazy">'
    : '<div class="icon-tile"><i class="fa-solid ' + esc(p.icon || 'fa-box') + '"></i></div>';
  return (
    '<article class="product-card" data-action="product-open" data-id="' +
    esc(p.id) +
    '">' +
    '<div class="product-thumb">' +
    thumb +
    '</div>' +
    '<div class="product-info">' +
    '<div class="product-name">' +
    esc(p.name) +
    '</div>' +
    '<div><span class="price-tag">' +
    money(p.price) +
    '</span></div>' +
    '<div class="stock-line"><i class="fa-solid fa-box"></i> Disponible ' +
    p.stock +
    '</div>' +
    (p.lowStock
      ? '<span class="badge stock-bas"><i class="fa-solid fa-triangle-exclamation"></i> Stock bas</span>'
      : '') +
    '</div>' +
    '</article>'
  );
}

/* Enregistrement de la page dans le routeur */
pages['catalogue'] = renderCatalogue;
