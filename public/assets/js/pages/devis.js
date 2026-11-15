/**
 * Page Devis / tableau de bord.
 */

import { emptyState, pageHead } from '../ui/dom.js';
import { api, badge, esc, money } from '../core/format.js';
import { can, currentUser, state } from '../core/state.js';
import { pages } from '../core/registry.js';

/* Page — Tableau de bord / Devis                                       */
export async function renderDevis() {
  const data = await api(
    '/api/dashboard?sort=' + encodeURIComponent(state.quotes.sort) + '&page=' + state.quotes.page
  );
  const k = data.kpis;
  const q = data.quotes;
  const shown = q.items.slice(0, 3);
  const total = Math.min(3, q.total);
  const first = total === 0 ? 0 : 1;
  const last = shown.length;

  const rows = shown
    .map(
      (item) =>
        '<tr>' +
        '<td class="quote-row-id">' +
        esc(item.id) +
        '</td>' +
        '<td class="quote-row-client">' +
        esc(item.clientName) +
        '</td>' +
        '<td class="num">' +
        money(item.total) +
        '</td>' +
        '<td>' +
        badge(item.status, item.statusLabel) +
        '</td>' +
        '<td class="right"><button class="pill-link" data-action="quote-open" data-id="' +
        esc(item.id) +
        '">Voir</button></td>' +
        '</tr>'
    )
    .join('');

  const pager = (() => {
    let html = '<button disabled><i class="fa-solid fa-chevron-left"></i></button>';
    html += '<button class="active" data-action="quotes-page" data-page="1">1</button>';
    html += '<button disabled><i class="fa-solid fa-chevron-right"></i></button>';
    return html;
  })();

  const greetingRole = (currentUser() && (currentUser().roleLabel || currentUser().role)) || 'Commercial';
  return (
    pageHead({
      title: 'Bonjour ' + esc(greetingRole) + ' !',
      sub: 'Gérez vos devis, explorez notre catalogue et développez votre activité.'
    }) +
    '<div class="page-body">' +
    '<div class="kpis">' +
    '<div class="kpi">' +
    '<div class="kpi-icon teal"><i class="fa-solid fa-file-lines"></i></div>' +
    '<div><div class="kpi-label">Devis en cours</div><div class="kpi-value">' +
    k.enCours +
    '</div></div>' +
    '</div>' +
    '<div class="kpi">' +
    '<div class="kpi-icon orange"><i class="fa-solid fa-coins"></i></div>' +
    '<div><div class="kpi-label">Valeur</div><div class="kpi-value sm">' +
    money(k.valeur) +
    '</div></div>' +
    '</div>' +
    '<div class="kpi">' +
    '<div class="kpi-icon rust"><i class="fa-solid fa-bell"></i></div>' +
    '<div><div class="kpi-label">À relancer</div><div class="kpi-value">' +
    k.relancer +
    '</div></div>' +
    '</div>' +
    '<div class="kpi green-tint">' +
    '<div class="kpi-icon green"><i class="fa-solid fa-check"></i></div>' +
    '<div><div class="kpi-label">Données de<br>démonstration</div></div>' +
    '</div>' +
    '</div>' +
    '<div class="dashboard-grid">' +
    '<div class="card">' +
    '<div class="card-head">' +
    '<span class="card-icon"><i class="fa-solid fa-file-lines"></i></span>' +
    '<span class="card-title">Mes devis en cours</span>' +
    '<span class="spacer"></span>' +
    '<span class="toolbar-label">Trier par :</span>' +
    '<select class="select" id="quoteSort" aria-label="Trier les devis" style="width:150px">' +
    '<option value="recent"' +
    (state.quotes.sort === 'recent' ? ' selected' : '') +
    '>Date récente</option>' +
    '<option value="amount_desc"' +
    (state.quotes.sort === 'amount_desc' ? ' selected' : '') +
    '>Montant décroissant</option>' +
    '<option value="client"' +
    (state.quotes.sort === 'client' ? ' selected' : '') +
    '>Client (A → Z)</option>' +
    '</select>' +
    (can('devis:write')
      ? '<button class="btn btn-soft btn-sm" data-action="new-quote" title="Nouveau devis"><i class="fa-solid fa-plus"></i><span class="btn-label">Nouveau devis</span></button>'
      : '') +
    '</div>' +
    '<table class="data">' +
    '<thead><tr><th>N° Devis</th><th>Client</th><th>Montant</th><th>Statut</th><th class="right">Action</th></tr></thead>' +
    '<tbody>' +
    (rows || '<tr><td colspan="5">' + emptyState('fa-file-lines', 'Aucun devis en cours') + '</td></tr>') +
    '</tbody>' +
    '</table>' +
    '<div class="table-foot">' +
    '<span>Affichage de ' +
    first +
    ' à ' +
    last +
    ' sur ' +
    total +
    ' devis</span>' +
    '<div class="pager">' +
    pager +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="card">' +
    '<div class="card-head">' +
    '<span class="card-icon"><i class="fa-solid fa-table-cells-large"></i></span>' +
    '<span class="card-title">Catalogue rapide</span>' +
    '</div>' +
    '<div class="quick-search">' +
    '<div class="search-field"><i class="fa-solid fa-magnifying-glass"></i>' +
    '<input class="input" id="quickSearch" type="search" placeholder="Rechercher un produit"></div>' +
    '</div>' +
    '<div class="quick-list">' +
    '<button class="quick-item" data-action="catalogue-category" data-category="FOM intérieurs">' +
    '<span class="quick-thumb"><img src="assets/quick-fan.png" alt=""></span>' +
    '<span class="quick-name">FOM intérieurs</span>' +
    '<i class="fa-solid fa-chevron-right"></i>' +
    '</button>' +
    '<button class="quick-item" data-action="catalogue-category" data-category="Mastiques pour murs">' +
    '<span class="quick-thumb"><img src="assets/quick-pot.png" alt=""></span>' +
    '<span class="quick-name">Mastic en pâte</span>' +
    '<i class="fa-solid fa-chevron-right"></i>' +
    '</button>' +
    '</div>' +
    '<div class="quick-foot">' +
    '<button class="btn btn-primary" data-action="go" data-route="catalogue">Voir tout le catalogue <i class="fa-solid fa-chevron-right"></i></button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/* Enregistrement de la page dans le routeur */
pages['devis'] = renderDevis;
