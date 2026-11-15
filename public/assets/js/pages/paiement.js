/**
 * Page Paiement (PEINTURE FLEX, échéanciers).
 */

import { emptyState, pageHead } from '../ui/dom.js';
import { METHOD_LABEL, api, badge, dateFr, esc, money } from '../core/format.js';
import { can, state } from '../core/state.js';
import { pages } from '../core/registry.js';

export async function renderPaiement() {
  const list = await api('/api/payments/quotes');
  if (!list.length) {
    return (
      pageHead({
        title: 'Parcours de paiement',
        sub: 'Suivez l’avancement de vos règlements, vos échéances et votre dossier de financement.'
      }) +
      '<div class="page-body"><div class="card">' +
      emptyState('fa-calendar-days', 'Aucun devis avec un échéancier pour le moment') +
      '</div></div>'
    );
  }
  if (!state.payment.quoteId || !list.some((q) => q.id === state.payment.quoteId)) {
    state.payment.quoteId = list[0].id;
  }
  const data = await api('/api/payments/' + encodeURIComponent(state.payment.quoteId));
  state.payment.total = data.quote.total;
  const tab = state.payment.tab;

  const options = list
    .map(
      (q) =>
        '<option value="' +
        esc(q.id) +
        '"' +
        (q.id === state.payment.quoteId ? ' selected' : '') +
        '>Devis : ' +
        esc(q.id) +
        '</option>'
    )
    .join('');

  const tabs =
    '<div class="tabs">' +
    '<button class="tab ' +
    (tab === 'cash' ? 'active' : '') +
    '" data-action="payment-tab" data-tab="cash"><i class="fa-solid fa-coins"></i> PEINTURE CASH</button>' +
    '<button class="tab ' +
    (tab === 'flex' ? 'active' : '') +
    '" data-action="payment-tab" data-tab="flex"><i class="fa-solid fa-calendar-days"></i> PEINTURE FLEX</button>' +
    '<button class="tab ' +
    (tab === 'banque' ? 'active' : '') +
    '" data-action="payment-tab" data-tab="banque"><i class="fa-solid fa-building-columns"></i> Banque partenaire</button>' +
    '</div>';

  return (
    pageHead({
      title: 'Parcours de paiement',
      sub: 'Suivez l’avancement de vos règlements, vos échéances et votre dossier de financement.'
    }) +
    '<div class="page-body">' +
    tabs +
    paymentContent(data, tab, options) +
    '</div>'
  );
}

export function paymentContent(data, tab, options) {
  if (tab === 'cash') return paymentCash(data, options);
  if (tab === 'banque') return paymentBanque(data, options);
  return paymentFlex(data, options);
}

export function scheduleRows(schedule, data) {
  if (!schedule || !schedule.length) return emptyState('fa-calendar-xmark', 'Aucune échéance planifiée');
  const flexAccess = !data || data.flexAccess !== false;
  const bankOk = !data || data.bankValidated !== false;
  return schedule
    .map((s) => {
      const payable = flexAccess && (s.kind !== 'installment' || bankOk) && s.status !== 'paye';
      const attrs = payable
        ? ' data-action="payment-step" data-step="' + esc(s.id) + '" title="Enregistrer le paiement"'
        : '';
      const lockedRow = !payable && s.status !== 'paye' && (s.kind === 'installment' ? !bankOk : !flexAccess);
      return (
        '<tr class="pay-row' +
        (payable ? '' : ' pay-row-locked') +
        '"' +
        attrs +
        '>' +
        '<td><span class="step-name"><span class="step-icon ' +
        s.status +
        '">' +
        '<i class="fa-solid ' +
        (s.status === 'paye'
          ? 'fa-check'
          : s.status === 'en_retard'
            ? 'fa-exclamation'
            : s.status === 'a_valider'
              ? 'fa-clock'
              : 'fa-ellipsis') +
        '"></i>' +
        '</span>' +
        esc(s.step) +
        '</span></td>' +
        '<td class="num">' +
        (s.amount ? money(s.amount) : '—') +
        '</td>' +
        '<td class="num">' +
        (s.dueDate ? dateFr(s.dueDate) : '—') +
        '</td>' +
        '<td>' +
        badge(
          s.status,
          s.status === 'paye'
            ? 'Payé'
            : s.status === 'en_retard'
              ? 'En retard'
              : s.status === 'a_valider'
                ? 'À valider'
                : s.status === 'a_venir'
                  ? 'À venir'
                  : 'En attente'
        ) +
        (lockedRow
          ? ' <i class="fa-solid fa-lock row-lock" title="Paiement par échéance indisponible"></i>'
          : '') +
        '</td>' +
        '</tr>'
      );
    })
    .join('');
}

export function timelineMarkup(financing) {
  const steps =
    financing && financing.steps && financing.steps.length
      ? financing.steps
      : [
          { name: 'Dossier', date: null, status: 'en_attente', label: 'En attente' },
          { name: 'Pièces', date: null, status: 'en_attente', label: 'En attente' },
          { name: 'Transmis', date: null, status: 'en_attente', label: 'En attente' },
          { name: 'Décision de la banque', date: null, status: 'en_attente', label: 'En attente' }
        ];
  return steps
    .map((s) => {
      const color =
        s.status === 'valide' || s.status === 'completes'
          ? 'accepte'
          : s.status === 'en_cours'
            ? 'envoye'
            : 'neutral';
      return (
        '<div class="tl-item ' +
        (s.status === 'valide' || s.status === 'completes' ? 'done' : '') +
        '">' +
        '<div class="tl-dot ' +
        s.status +
        '"><i class="fa-solid ' +
        (s.status === 'en_attente' ? 'fa-circle' : s.status === 'en_cours' ? 'fa-circle-dot' : 'fa-check') +
        '"></i></div>' +
        '<div class="tl-body"><div class="tl-name">' +
        esc(s.name) +
        '</div><div class="tl-date">' +
        esc(s.date || '—') +
        '</div></div>' +
        badge(color, s.label) +
        '</div>'
      );
    })
    .join('');
}

export function flexMonthsSelect(current, id) {
  let html = '<select class="select select-xs" id="' + id + '" aria-label="Durée du crédit">';
  for (let m = 1; m <= 12; m++) {
    html += '<option value="' + m + '"' + (m === current ? ' selected' : '') + '>' + m + ' mois</option>';
  }
  return html + '</select>';
}

export function flexTerms(plan, canEdit) {
  if (!plan) return '';
  return (
    '<div class="flex-terms">' +
    '<div class="flex-term"><span>Abonnement</span><strong>' +
    money(plan.subscription) +
    '</strong></div>' +
    (canEdit
      ? '<div class="flex-term"><span>Durée</span>' + flexMonthsSelect(plan.months, 'flexMonths') + '</div>'
      : '<div class="flex-term"><span>Durée</span><strong>' +
        plan.months +
        ' mois · ' +
        Math.round(plan.rate * 100) +
        ' %</strong></div>') +
    '<div class="flex-term"><span>Mensualité</span><strong>' +
    money(plan.monthly) +
    '</strong></div>' +
    '<div class="flex-term"><span>Intérêts</span><strong>' +
    money(plan.interest) +
    '</strong></div>' +
    '</div>' +
    '<div class="flex-offer"><i class="fa-solid fa-paint-roller"></i> ' +
    esc(flexOffer) +
    '</div>'
  );
}

export const flexOffer = 'Prestation de peinture offerte dès que le dossier est validé par la banque';

export function flexSetup(data) {
  const total = data.quote.total;
  const subscription = Math.min(250000, total);
  const financed = Math.max(0, total - subscription);
  const preview = Math.round((financed * 1.06) / 6);
  return (
    '<div class="card-body flex-setup">' +
    '<p class="flex-setup-intro"><i class="fa-solid fa-circle-info"></i> Ce devis n’a pas encore d’échéancier PEINTURE FLEX. ' +
    'Le client règle un abonnement de ' +
    money(subscription) +
    ' à la banque (acompte et garantie de prestation), ' +
    'puis le solde est financé sur 1 à 12 mois à 1 % par mois, après validation du dossier bancaire.</p>' +
    '<div class="flex-setup-row">' +
    '<label for="flexMonths">Durée du crédit</label>' +
    flexMonthsSelect(6, 'flexMonthsSetup') +
    '<span class="flex-setup-amount">≈ ' +
    money(preview) +
    ' / mois sur 6 mois</span>' +
    (can('paiement:write')
      ? '<button class="btn btn-primary btn-sm" data-action="flex-setup"><i class="fa-solid fa-calculator"></i> Mettre en place l’échéancier</button>'
      : '') +
    '</div>' +
    '</div>'
  );
}

export function paymentFlex(data, options) {
  const plan = data.flex;
  const locked = plan && !data.bankValidated;
  const canEditPlan =
    can('paiement:write') && plan && !(data.schedule || []).some((s) => s.status === 'paye');
  return (
    '<div class="pay-grid">' +
    '<div class="pay-col">' +
    '<div class="card">' +
    '<div class="card-head">' +
    '<span class="card-icon"><i class="fa-solid fa-calendar-days"></i></span>' +
    '<span class="card-title">PEINTURE FLEX – Échéancier</span>' +
    '<span class="spacer"></span>' +
    '<select class="select" id="paymentQuote" aria-label="Choisir un devis" style="width:185px">' +
    options +
    '</select>' +
    '</div>' +
    (data.schedule && data.schedule.length
      ? '<table class="data">' +
        '<thead><tr><th>Étape</th><th>Montant</th><th>Échéance</th><th>Statut</th></tr></thead>' +
        '<tbody>' +
        scheduleRows(data.schedule, data) +
        '</tbody>' +
        '</table>' +
        (plan
          ? ''
          : '<div class="pay-lock" style="margin:12px 16px 16px"><i class="fa-solid fa-lock"></i>' +
            '<span>Ce devis n’a pas accès à la formule <strong>PEINTURE FLEX</strong> : les échéances ne sont pas réglables une à une. ' +
            'Utilisez « Encaisser » pour un acompte, un paiement partiel ou le solde.</span></div>')
      : flexSetup(data)) +
    '</div>' +
    '<div class="remaining-box' +
    (can('paiement:write') && !locked ? ' clickable' : '') +
    '"' +
    (can('paiement:write') && !locked
      ? ' role="button" tabindex="0" data-action="payment-new" title="Encaisser un paiement"'
      : '') +
    '>' +
    '<span class="remaining-icon"><i class="fa-solid fa-coins"></i></span>' +
    '<span class="remaining-divider"></span>' +
    '<span class="label">Reste dû</span>' +
    '<span class="value">' +
    money(data.remaining) +
    '</span>' +
    '<span class="spacer" style="flex:1"></span>' +
    (locked
      ? '<span class="remaining-lock"><i class="fa-solid fa-lock"></i> Crédit à débloquer</span>'
      : '') +
    '<span class="remaining-cta"><i class="fa-solid fa-arrow-right"></i></span>' +
    '</div>' +
    '</div>' +
    '<div class="card">' +
    '<div class="card-head">' +
    '<span class="card-icon"><i class="fa-solid fa-building-columns"></i></span>' +
    '<span class="card-title">Dossier de financement<small>(Banque partenaire)</small></span>' +
    '</div>' +
    '<div class="card-body"><div class="timeline">' +
    timelineMarkup(data.financing) +
    '</div>' +
    (plan ? flexTerms(plan, canEditPlan) : '') +
    (locked
      ? '<div class="flex-alert"><i class="fa-solid fa-triangle-exclamation"></i><div>' +
        '<strong>Crédit bloqué</strong>' +
        '<span>La banque doit valider la crédibilité du client avant le déblocage du crédit et le démarrage des travaux.</span>' +
        '</div></div>'
      : '') +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

export function paymentCash(data, options) {
  const payments = data.payments || [];
  return (
    '<div class="pay-grid">' +
    '<div class="pay-col">' +
    '<div class="card">' +
    '<div class="card-head">' +
    '<span class="card-icon"><i class="fa-solid fa-coins"></i></span>' +
    '<span class="card-title">PEINTURE CASH – Encaissements</span>' +
    '<span class="spacer"></span>' +
    '<select class="select" id="paymentQuote" style="width:185px">' +
    options +
    '</select>' +
    (can('paiement:write')
      ? '<button class="btn btn-soft btn-sm" data-action="payment-new"><i class="fa-solid fa-plus"></i> Encaisser</button>'
      : '') +
    '</div>' +
    '<table class="data">' +
    '<thead><tr><th>Date</th><th>Mode</th><th>Référence</th><th>Montant</th></tr></thead>' +
    '<tbody>' +
    (payments.length
      ? payments
          .map(
            (p) =>
              '<tr><td>' +
              dateFr(p.date) +
              '</td><td>' +
              esc(METHOD_LABEL[p.method] || p.method) +
              '</td>' +
              '<td>' +
              esc(p.reference || '—') +
              '</td><td class="num strong">' +
              money(p.amount) +
              '</td></tr>'
          )
          .join('')
      : '<tr><td colspan="4">' + emptyState('fa-receipt', 'Aucun encaissement enregistré') + '</td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '<div class="pay-col">' +
    '<div class="card">' +
    '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-wallet"></i></span><span class="card-title">Situation du devis</span></div>' +
    '<div class="card-body"><div class="detail-list">' +
    '<div class="detail-row"><span class="k">Client</span><span class="v">' +
    esc(data.quote.clientName) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Montant du devis</span><span class="v">' +
    money(data.quote.total) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Déjà encaissé</span><span class="v" style="color:#217a46">' +
    money(data.paidTotal) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Reste à payer</span><span class="v" style="color:#a83d27">' +
    money(Math.max(0, data.quote.total - data.paidTotal)) +
    '</span></div>' +
    '</div></div>' +
    '</div>' +
    '<div class="remaining-box compact">' +
    '<span class="remaining-icon"><i class="fa-solid fa-coins"></i></span>' +
    '<span class="remaining-divider"></span>' +
    '<span class="label">Reste dû</span>' +
    '<span class="value">' +
    money(Math.max(0, data.quote.total - data.paidTotal)) +
    '</span>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

export function paymentBanque(data, options) {
  const fin = data.financing;
  return (
    '<div class="pay-grid">' +
    '<div class="pay-col">' +
    '<div class="card">' +
    '<div class="card-head">' +
    '<span class="card-icon"><i class="fa-solid fa-building-columns"></i></span>' +
    '<span class="card-title">Dossier de financement<small>Banque partenaire — Agence Kaloum</small></span>' +
    '<span class="spacer"></span>' +
    '<select class="select" id="paymentQuote" style="width:185px">' +
    options +
    '</select>' +
    '</div>' +
    '<div class="card-body"><div class="timeline">' +
    timelineMarkup(fin) +
    '</div>' +
    (can('paiement:write')
      ? '<div style="display:flex;gap:10px;margin-top:18px">' +
        '<button class="btn btn-primary btn-sm" data-action="financing-advance"><i class="fa-solid fa-paper-plane"></i> Transmettre le dossier</button>' +
        '<button class="btn btn-ghost btn-sm" data-action="payment-new"><i class="fa-solid fa-plus"></i> Encaisser un acompte</button>' +
        '</div>'
      : '') +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="pay-col">' +
    '<div class="card">' +
    '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-file-shield"></i></span><span class="card-title">Informations</span></div>' +
    '<div class="card-body"><div class="detail-list">' +
    '<div class="detail-row"><span class="k">Devis</span><span class="v">' +
    esc(data.quote.id) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Client</span><span class="v">' +
    esc(data.quote.clientName) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Montant financé</span><span class="v">' +
    money(fin && fin.amount ? fin.amount : Math.round(data.quote.total * 0.6)) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Statut du dossier</span><span class="v">' +
    ((fin && fin.steps[2] && fin.steps[2].label) || 'Non transmis') +
    '</span></div>' +
    '</div></div>' +
    '</div>' +
    '<div class="remaining-box compact">' +
    '<span class="remaining-icon"><i class="fa-solid fa-coins"></i></span>' +
    '<span class="remaining-divider"></span>' +
    '<span class="label">Reste dû</span>' +
    '<span class="value">' +
    money(data.remaining) +
    '</span>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/* Enregistrement de la page dans le routeur */
pages['paiement'] = renderPaiement;
