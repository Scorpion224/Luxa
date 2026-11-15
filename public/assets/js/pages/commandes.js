/**
 * Commandes boutique (côté personnel).
 */

import { emptyState, pageHead } from '../ui/dom.js';
import { api, badge, dateShort, esc, money } from '../core/format.js';
import { can, isClientUser } from '../core/state.js';
import { ORDER_LABEL } from './espace-client.js';
import { pages } from '../core/registry.js';

export async function renderCommandes() {
  const orders = await api('/api/orders');
  const count = (status) => orders.filter((o) => o.status === status).length;
  const cash = orders.filter((o) => o.mode === 'cash').reduce((sum, o) => sum + o.total, 0);
  const flex = orders.filter((o) => o.mode === 'flex').reduce((sum, o) => sum + o.total, 0);
  const canDecide = can('commande:write') && !isClientUser();

  const rows = orders
    .map((o) => {
      const items = (o.items || []).map((i) => esc(i.name) + ' × ' + i.qty).join(' · ');
      return (
        '<tr>' +
        '<td class="quote-row-id">' +
        esc(o.id) +
        '</td>' +
        '<td>' +
        dateShort(o.createdAt) +
        '</td>' +
        '<td><div class="quote-row-client">' +
        esc(o.clientName) +
        '</div>' +
        '<div class="line-detail">' +
        (o.mode === 'flex' ? 'PEINTURE FLEX' : 'Espèces') +
        '</div></td>' +
        '<td><div class="order-items">' +
        (items || '—') +
        '</div></td>' +
        '<td class="num strong">' +
        money(o.total) +
        '</td>' +
        '<td>' +
        badge(
          o.status === 'livree' ? 'accepte' : o.status === 'annulee' ? 'refuse' : 'envoye',
          ORDER_LABEL[o.status] || o.status
        ) +
        '</td>' +
        '<td class="num">' +
        (canDecide && o.status !== 'livree'
          ? '<button class="btn btn-ghost btn-xs" data-action="order-status" data-id="' +
            esc(o.id) +
            '" data-status="livree">' +
            '<i class="fa-solid fa-truck-fast"></i> Marquer livrée</button>'
          : '<span class="muted">' +
            (o.deliveredAt ? 'Livrée le ' + dateShort(o.deliveredAt) : '—') +
            '</span>') +
        '</td>' +
        '</tr>'
      );
    })
    .join('');

  return (
    pageHead({
      title: 'Commandes boutique',
      sub: 'Commandes passées depuis l’espace client, en espèces ou avec PEINTURE FLEX.'
    }) +
    '<div class="page-body">' +
    '<div class="kpis k-equal">' +
    '<div class="kpi"><div class="kpi-icon teal"><i class="fa-solid fa-box"></i></div><div>' +
    '<div class="kpi-label">Commandes</div><div class="kpi-value">' +
    orders.length +
    '</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon orange"><i class="fa-solid fa-money-bill-wave"></i></div><div>' +
    '<div class="kpi-label">En espèces</div><div class="kpi-value sm">' +
    money(cash) +
    '</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon rust"><i class="fa-solid fa-star"></i></div><div>' +
    '<div class="kpi-label">PEINTURE FLEX</div><div class="kpi-value sm">' +
    money(flex) +
    '</div></div></div>' +
    '<div class="kpi green-tint"><div class="kpi-icon green"><i class="fa-solid fa-truck-fast"></i></div><div>' +
    '<div class="kpi-label">Livrées</div><div class="kpi-value">' +
    count('livree') +
    '</div></div></div>' +
    '</div>' +
    '<div class="card"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-basket-shopping"></i></span>' +
    '<span class="card-title">Toutes les commandes</span>' +
    '<span class="card-sub">' +
    count('a_preparer') +
    ' à préparer · ' +
    count('en_financement') +
    ' en financement</span></div>' +
    '<div class="card-body no-pad">' +
    (orders.length
      ? '<table class="data"><thead><tr><th>Réf.</th><th>Date</th><th>Client</th><th>Articles</th>' +
        '<th class="num">Total</th><th>Statut</th><th class="num">Action</th></tr></thead><tbody>' +
        rows +
        '</tbody></table>'
      : emptyState('fa-box', 'Aucune commande pour le moment')) +
    '</div></div>' +
    '</div>'
  );
}

/* Enregistrement de la page dans le routeur */
pages['commandes'] = renderCommandes;
