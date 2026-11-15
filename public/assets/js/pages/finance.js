/**
 * Page Finance.
 */

import { emptyState, pageHead } from '../ui/dom.js';
import { METHOD_LABEL, api, badge, dateShort, esc, money } from '../core/format.js';
import { pages } from '../core/registry.js';

export async function renderFinance() {
  const data = await api('/api/finance');
  const k = data.kpis;
  const max = Math.max.apply(null, data.series.map((s) => s.value).concat([1]));

  const chart = data.series
    .map(
      (s) =>
        '<div class="bar-wrap" title="' +
        money(s.value) +
        '">' +
        '<span class="bar-val">' +
        (s.value ? Math.round(s.value / 1000000) + ' M' : '') +
        '</span>' +
        '<div class="bar" style="height:' +
        Math.max(3, Math.round((s.value / max) * 100)) +
        '%"></div>' +
        '<span class="bar-label">' +
        esc(s.label) +
        '</span>' +
        '</div>'
    )
    .join('');

  const factures = data.factures
    .map(
      (f) =>
        '<tr>' +
        '<td class="quote-row-id">' +
        esc(f.id) +
        '</td>' +
        '<td><div class="quote-row-client">' +
        esc(f.clientName) +
        '</div><div class="line-detail">' +
        esc(f.clientCompany || '') +
        '</div></td>' +
        '<td>' +
        dateShort(f.issueDate) +
        '</td>' +
        '<td class="num">' +
        money(f.total) +
        '</td>' +
        '<td class="num" style="color:' +
        (f.due ? '#a83d27' : '#217a46') +
        '">' +
        money(f.due) +
        '</td>' +
        '<td>' +
        badge(f.status, f.status === 'payee' ? 'Payée' : f.status === 'en_retard' ? 'En retard' : 'Envoyée') +
        '</td>' +
        '</tr>'
    )
    .join('');

  const payments = data.payments
    .slice(0, 6)
    .map(
      (p) =>
        '<tr>' +
        '<td>' +
        dateShort(p.date) +
        '</td>' +
        '<td class="quote-row-client">' +
        esc(p.clientName) +
        '</td>' +
        '<td>' +
        esc(p.quoteId || '—') +
        '</td>' +
        '<td>' +
        esc(METHOD_LABEL[p.method] || p.method) +
        '</td>' +
        '<td class="num strong">' +
        money(p.amount) +
        '</td>' +
        '</tr>'
    )
    .join('');

  return (
    pageHead({
      title: 'Finance',
      sub: 'Suivez vos encaissements, vos factures et la santé financière de votre activité.'
    }) +
    '<div class="page-body">' +
    '<div class="kpis k-equal">' +
    '<div class="kpi"><div class="kpi-icon teal"><i class="fa-solid fa-sack-dollar"></i></div><div><div class="kpi-label">Encaissé</div><div class="kpi-value sm">' +
    money(k.encaisse) +
    '</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon orange"><i class="fa-solid fa-hourglass-half"></i></div><div><div class="kpi-label">En attente</div><div class="kpi-value sm">' +
    money(k.enAttente) +
    '</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon rust"><i class="fa-solid fa-circle-exclamation"></i></div><div><div class="kpi-label">En retard</div><div class="kpi-value sm">' +
    money(k.enRetard) +
    '</div></div></div>' +
    '<div class="kpi green-tint"><div class="kpi-icon green"><i class="fa-solid fa-file-circle-check"></i></div><div><div class="kpi-label">Devis acceptés</div><div class="kpi-value">' +
    k.acceptes +
    '</div></div></div>' +
    '</div>' +
    '<div class="grid-2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);margin-bottom:16px;align-items:start">' +
    '<div class="card">' +
    '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-chart-column"></i></span><span class="card-title">Encaissements des 6 derniers mois</span></div>' +
    '<div class="card-body"><div class="finance-chart">' +
    chart +
    '</div></div>' +
    '</div>' +
    '<div class="card">' +
    '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-scale-balanced"></i></span><span class="card-title">Synthèse</span></div>' +
    '<div class="card-body"><div class="detail-list">' +
    '<div class="detail-row"><span class="k">Panier moyen accepté</span><span class="v">' +
    money(k.panierMoyen) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Valeur des devis acceptés</span><span class="v">' +
    money(k.acceptesValeur) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Taux de recouvrement</span><span class="v">' +
    (k.acceptesValeur ? Math.min(100, Math.round((k.encaisse / Math.max(k.acceptesValeur, 1)) * 100)) : 0) +
    ' %</span></div>' +
    '<div class="detail-row"><span class="k">Factures émises</span><span class="v">' +
    data.factures.length +
    '</span></div>' +
    '</div>' +
    '<button class="btn btn-primary btn-sm" style="width:100%;margin-top:14px" data-action="finance-pay"><i class="fa-solid fa-plus"></i> Enregistrer un encaissement</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-file-invoice-dollar"></i></span><span class="card-title">Factures</span></div>' +
    '<table class="data">' +
    '<thead><tr><th>N° Facture</th><th>Client</th><th>Émission</th><th>Total</th><th>Reste dû</th><th>Statut</th></tr></thead>' +
    '<tbody>' +
    (factures || '<tr><td colspan="6">' + emptyState('fa-file-invoice', 'Aucune facture') + '</td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '<div class="card">' +
    '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-receipt"></i></span><span class="card-title">Derniers encaissements</span>' +
    '<span class="spacer"></span>' +
    '<button class="btn btn-ghost btn-sm" data-action="finance-pay"><i class="fa-solid fa-plus"></i> Encaissement</button>' +
    '</div>' +
    '<table class="data">' +
    '<thead><tr><th>Date</th><th>Client</th><th>Devis</th><th>Mode</th><th>Montant</th></tr></thead>' +
    '<tbody>' +
    (payments || '<tr><td colspan="5">' + emptyState('fa-receipt', 'Aucun encaissement') + '</td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>'
  );
}

/* Enregistrement de la page dans le routeur */
pages['finance'] = renderFinance;
