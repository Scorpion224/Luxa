/**
 * Page Clients.
 */

import { emptyState, pageHead } from '../ui/dom.js';
import { api, badge, dateShort, esc, money } from '../core/format.js';
import { can, state } from '../core/state.js';
import { pages } from '../core/registry.js';

export async function renderClients() {
  const clients = await api('/api/clients');
  state.clients = clients;
  const term = state.clientsSearch.toLowerCase();
  const filtered = clients.filter(
    (c) =>
      !term ||
      c.name.toLowerCase().includes(term) ||
      (c.company || '').toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term)
  );

  const cards = filtered
    .map(
      (c) =>
        '<article class="card client-card" data-action="client-open" data-id="' +
        esc(c.id) +
        '">' +
        '<div class="client-top">' +
        '<div class="client-avatar">' +
        esc(initials(c.name)) +
        '</div>' +
        '<div style="flex:1;min-width:0"><div class="client-name">' +
        esc(c.name) +
        '</div>' +
        '<div class="client-company">' +
        esc(c.contact || c.company || c.type) +
        '</div></div>' +
        '</div>' +
        '<div class="client-meta">' +
        '<div><i class="fa-solid fa-phone"></i> ' +
        esc(c.phone || '—') +
        '</div>' +
        '<div><i class="fa-solid fa-envelope"></i> ' +
        esc(c.email || '—') +
        '</div>' +
        '<div class="city-row"><span><i class="fa-solid fa-location-dot"></i> ' +
        esc(c.city) +
        '</span>' +
        badge(c.type === 'Revendeur' ? 'envoye' : c.type === 'Particulier' ? 'neutral' : 'accepte', c.type) +
        '</div>' +
        '</div>' +
        '<div class="client-stats">' +
        '<div class="client-stat"><div class="lbl">Devis</div><div class="val">' +
        c.totalQuotes +
        '</div></div>' +
        '<div class="client-stat"><div class="lbl">Encaissé</div><div class="val money">' +
        money(c.paidAmount) +
        '</div></div>' +
        '<div class="client-stat"><div class="lbl">Devis acceptés</div><div class="val">' +
        c.acceptedQuotes +
        '</div></div>' +
        '<div class="client-stat"><div class="lbl">Dernier devis</div><div class="val">' +
        (c.lastQuoteAt ? dateShort(c.lastQuoteAt) : '—') +
        '</div></div>' +
        '</div>' +
        '</article>'
    )
    .join('');

  return (
    pageHead({ title: 'Clients', sub: 'Votre portefeuille clients, leurs devis et leurs règlements.' }) +
    '<div class="page-body">' +
    '<div class="catalogue-toolbar">' +
    '<div class="search-field"><i class="fa-solid fa-magnifying-glass"></i>' +
    '<input class="input" id="clientsSearch" type="search" placeholder="Rechercher un client..." value="' +
    esc(state.clientsSearch) +
    '"></div>' +
    '<span class="toolbar-label">' +
    filtered.length +
    ' client' +
    (filtered.length > 1 ? 's' : '') +
    '</span>' +
    (can('clients:write')
      ? '<button class="btn btn-primary" data-action="client-new"><i class="fa-solid fa-plus"></i> Nouveau client</button>'
      : '') +
    '</div>' +
    '<div class="client-grid">' +
    (cards || emptyState('fa-user-group', 'Aucun client trouvé')) +
    '</div>' +
    '</div>'
  );
}

export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/* Enregistrement de la page dans le routeur */
pages['clients'] = renderClients;
