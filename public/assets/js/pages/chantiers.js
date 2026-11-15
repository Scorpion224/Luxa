/**
 * Page Chantiers.
 */

import { emptyState, pageHead } from '../ui/dom.js';
import { CHANTIER_LABEL, api, badge, dateFr, esc, money, todayIso } from '../core/format.js';
import { can, state } from '../core/state.js';
import { modalHead, openModal } from '../ui/modals.js';
import { pages } from '../core/registry.js';

export async function renderChantiers() {
  const chantiers = await api('/api/chantiers');
  state.clients = await api('/api/clients');
  const enCours = chantiers.filter((c) => c.status === 'en_cours');
  const avg = chantiers.length
    ? Math.round(chantiers.reduce((s, c) => s + c.progress, 0) / chantiers.length)
    : 0;
  const budget = chantiers.reduce((s, c) => s + c.budget, 0);

  const cards = chantiers
    .map(
      (c) =>
        '<article class="card chantier-card">' +
        '<div class="chantier-head">' +
        '<div style="min-width:0"><div class="chantier-name">' +
        esc(c.name) +
        '</div>' +
        '<div class="chantier-sub">' +
        esc(c.clientName) +
        ' • ' +
        esc(c.city) +
        '</div></div>' +
        badge(
          c.status === 'en_cours' ? 'accepte' : c.status === 'termine' ? 'neutral' : 'planifie',
          CHANTIER_LABEL[c.status]
        ) +
        '</div>' +
        '<div class="progress ' +
        (c.progress >= 100 ? '' : 'amber') +
        '"><span style="width:' +
        Math.min(100, c.progress) +
        '%"></span></div>' +
        '<div class="chantier-foot"><span>' +
        c.progress +
        ' % avancement</span><span>' +
        (c.endDate ? 'fin ' + dateFr(c.endDate) : '—') +
        '</span></div>' +
        '<div class="detail-list" style="border-top:1px solid #f2ece3;padding-top:10px">' +
        '<div class="detail-row"><span class="k">Budget</span><span class="v">' +
        money(c.budget) +
        '</span></div>' +
        '<div class="detail-row"><span class="k">Dépensé</span><span class="v">' +
        money(c.spent) +
        '</span></div>' +
        '<div class="detail-row"><span class="k">Chef de chantier</span><span class="v">' +
        esc(c.chef) +
        '</span></div>' +
        '<div class="detail-row"><span class="k">Équipe</span><span class="v">' +
        c.team +
        ' personnes</span></div>' +
        '</div>' +
        (can('chantiers:write')
          ? '<button class="btn btn-ghost btn-sm" data-action="chantier-update" data-id="' +
            esc(c.id) +
            '"><i class="fa-solid fa-pen-to-square"></i> Mettre à jour</button>'
          : '') +
        '</article>'
    )
    .join('');

  return (
    pageHead({
      title: 'Chantiers',
      sub: 'Pilotez vos chantiers, l’avancement des travaux et les équipes sur site.'
    }) +
    '<div class="page-body">' +
    '<div class="kpis k-equal">' +
    '<div class="kpi"><div class="kpi-icon teal"><i class="fa-solid fa-helmet-safety"></i></div><div><div class="kpi-label">Chantiers en cours</div><div class="kpi-value">' +
    enCours.length +
    '</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon orange"><i class="fa-solid fa-chart-simple"></i></div><div><div class="kpi-label">Avancement moyen</div><div class="kpi-value">' +
    avg +
    ' %</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon green"><i class="fa-solid fa-sack-dollar"></i></div><div><div class="kpi-label">Budget total</div><div class="kpi-value sm">' +
    money(budget) +
    '</div></div></div>' +
    '<div class="kpi"><div class="kpi-icon rust"><i class="fa-solid fa-users"></i></div><div><div class="kpi-label">Équipes mobilisées</div><div class="kpi-value">' +
    chantiers.reduce((s, c) => s + c.team, 0) +
    '</div></div></div>' +
    '</div>' +
    '<div class="catalogue-toolbar">' +
    '<span class="toolbar-label">' +
    chantiers.length +
    ' chantiers suivis</span>' +
    '<span class="spacer" style="flex:1"></span>' +
    (can('chantiers:write')
      ? '<button class="btn btn-primary" data-action="chantier-new-open"><i class="fa-solid fa-plus"></i> Nouveau chantier</button>'
      : '') +
    '</div>' +
    '<div class="client-grid">' +
    (cards || emptyState('fa-helmet-safety', 'Aucun chantier')) +
    '</div>' +
    '</div>'
  );
}

export function openChantierForm() {
  const options = state.clients
    .map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>')
    .join('');
  openModal(
    modalHead('Nouveau chantier', 'Planifiez une nouvelle intervention') +
      '<div class="modal-body"><div class="form-grid">' +
      '<div class="field span-2"><label>Nom du chantier *</label><input class="input" id="newChantierName" placeholder="Ex : Villa Lambanyi — R+1"></div>' +
      '<div class="field"><label>Client</label><select class="select" id="newChantierClient">' +
      options +
      '</select></div>' +
      '<div class="field"><label>Budget (GNF)</label><input class="input" id="newChantierBudget" type="number" placeholder="0"></div>' +
      '<div class="field"><label>Début</label><input class="input" id="newChantierStart" type="date" value="' +
      todayIso() +
      '"></div>' +
      '<div class="field"><label>Fin prévue</label><input class="input" id="newChantierEnd" type="date"></div>' +
      '<div class="field span-2"><label>Chef de chantier</label><input class="input" id="newChantierChef" placeholder="Ex : Mamadou Saliou"></div>' +
      '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
      '<button class="btn btn-primary" data-action="chantier-new"><i class="fa-solid fa-check"></i> Créer le chantier</button></div>',
    { size: 'narrow' }
  );
}

/* Enregistrement de la page dans le routeur */
pages['chantiers'] = renderChantiers;
