/**
 * Fenêtres modales (devis, fiches, formulaires).
 */

import { emptyState, modalRoot } from './dom.js';
import {
  CHANTIER_LABEL,
  METHOD_LABEL,
  STATUS_LABEL,
  api,
  badge,
  dateFr,
  dateShort,
  dec,
  esc,
  money,
  toast,
  todayIso
} from '../core/format.js';
import { can, state } from '../core/state.js';
import { render } from '../core/router.js';
import { lineIcon } from '../pages/nouveau-devis.js';

export function openModal(html, opts) {
  const options = opts || {};
  modalRoot.innerHTML =
    '<div class="overlay" data-overlay>' +
    '<div class="modal ' +
    (options.size || '') +
    '" role="dialog" aria-modal="true">' +
    html +
    '</div>' +
    '</div>';
  document.body.style.overflow = 'hidden';
}
export function closeModal() {
  modalRoot.innerHTML = '';
  document.body.style.overflow = '';
}
export function modalHead(title, subtitle, extra) {
  return (
    '<div class="modal-head">' +
    '<div style="min-width:0"><h3>' +
    title +
    '</h3>' +
    (subtitle ? '<p>' + subtitle + '</p>' : '') +
    '</div>' +
    (extra || '') +
    '<button class="close" data-action="modal-close" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>' +
    '</div>'
  );
}

export async function openQuote(id) {
  const q = await api('/api/quotes/' + encodeURIComponent(id));
  const lines =
    q.lines && q.lines.length
      ? q.lines
      : [
          {
            icon: 'paint',
            designation: 'Prestation',
            detail: q.subject,
            qty: 1,
            unit: 'forfait',
            unitPrice: q.subtotal,
            amount: q.subtotal
          }
        ];
  const product = state.products.find((p) => p.id === q.productId);

  const rows = lines
    .map(
      (line) =>
        '<tr><td><div class="line-item"><span class="line-ico">' +
        lineIcon(line, product) +
        '</span>' +
        '<div><div class="line-desig">' +
        esc(line.designation) +
        '</div><div class="line-detail">' +
        esc(line.detail || '') +
        '</div></div>' +
        '</div></td><td class="right qty">' +
        dec(line.qty) +
        ' ' +
        esc(line.unit) +
        '</td>' +
        '<td class="right pu">' +
        money(line.unitPrice) +
        '</td><td class="right amount">' +
        money(line.amount) +
        '</td></tr>'
    )
    .join('');

  const paid = q.paid || 0;
  const html =
    modalHead(esc(q.id), esc(q.clientName) + ' • ' + esc(q.subject), badge(q.status, q.statusLabel)) +
    '<div class="modal-body">' +
    '<div class="grid-2" style="gap:10px 24px;margin-bottom:16px">' +
    '<div class="detail-row"><span class="k">Client</span><span class="v">' +
    esc(q.clientName) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Chantier</span><span class="v">' +
    esc(q.site || '—') +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Date du devis</span><span class="v">' +
    dateFr(q.createdAt) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Validité</span><span class="v">' +
    (q.validUntil ? dateFr(q.validUntil) : '—') +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Surface estimée</span><span class="v">' +
    dec(q.surface) +
    ' m²</span></div>' +
    '<div class="detail-row"><span class="k">Déjà encaissé</span><span class="v" style="color:#217a46">' +
    money(paid) +
    '</span></div>' +
    '</div>' +
    '<table class="lines">' +
    '<thead><tr><th>Désignation</th><th class="right">Qté / Unité</th><th class="right">Prix unitaire</th><th class="right">Montant</th></tr></thead>' +
    '<tbody>' +
    rows +
    '</tbody>' +
    '</table>' +
    '<div class="total-row" style="margin-top:14px"><span class="total-label">Total</span><span class="total-value">' +
    money(q.total) +
    '</span></div>' +
    (q.notes ? '<p class="small muted" style="margin-top:12px">' + esc(q.notes) + '</p>' : '') +
    '</div>' +
    '<div class="modal-foot">' +
    (can('devis:write')
      ? '<select class="select" id="quoteStatus" aria-label="Statut du devis" style="margin-right:auto">' +
        Object.keys(STATUS_LABEL)
          .map(
            (s) =>
              '<option value="' +
              s +
              '"' +
              (q.status === s ? ' selected' : '') +
              '>' +
              STATUS_LABEL[s] +
              '</option>'
          )
          .join('') +
        '</select>'
      : '<span style="margin-right:auto">' +
        badge(q.status, STATUS_LABEL[q.status] || q.status) +
        '</span>') +
    '<button class="btn btn-outline" data-action="quote-pdf" data-id="' +
    esc(q.id) +
    '"><i class="fa-solid fa-file-pdf"></i> PDF</button>' +
    (can('paiement:write')
      ? '<button class="btn btn-primary" data-action="quote-pay" data-id="' +
        esc(q.id) +
        '"><i class="fa-solid fa-coins"></i> Enregistrer un paiement</button>'
      : '') +
    '</div>';
  openModal(html, { size: 'wide' });

  const statusSelect = document.getElementById('quoteStatus');
  if (statusSelect) {
    statusSelect.addEventListener('change', async () => {
      try {
        await api('/api/quotes/' + encodeURIComponent(q.id) + '/status', {
          method: 'POST',
          body: { status: statusSelect.value }
        });
        toast('Statut mis à jour');
        closeModal();
        render();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }
}

export function openProduct(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;
  const locations = Object.keys(p.stockByLocation || {})
    .map(
      (loc) =>
        '<div class="detail-row"><span class="k">' +
        esc(loc) +
        '</span><span class="v">' +
        p.stockByLocation[loc] +
        ' ' +
        esc(p.unit) +
        '</span></div>'
    )
    .join('');

  openModal(
    modalHead(
      esc(p.name),
      esc(p.category),
      badge(p.lowStock ? 'bas' : 'ok', p.lowStock ? 'Stock bas' : 'Disponible')
    ) +
      '<div class="modal-body">' +
      '<div style="display:flex;gap:22px;align-items:flex-start">' +
      '<div class="product-thumb" style="width:120px;flex:0 0 120px;height:150px;background:#fbf7f1;border-radius:12px">' +
      (p.image
        ? '<img src="' + p.image + '" alt="" style="max-width:100px;max-height:130px">'
        : '<div class="icon-tile" style="width:70px;height:70px"><i class="fa-solid ' +
          esc(p.icon || 'fa-box') +
          '"></i></div>') +
      '</div>' +
      '<div style="flex:1">' +
      '<div style="font-size:20px;font-weight:700;color:#0b4e51;margin-bottom:6px">' +
      money(p.price) +
      '</div>' +
      '<p class="small muted" style="margin-bottom:12px">' +
      esc(p.description || '') +
      '</p>' +
      '<div class="detail-list">' +
      '<div class="detail-row"><span class="k">Rendement</span><span class="v">' +
      (p.rendement ? p.rendement + ' m²/L' : '—') +
      '</span></div>' +
      '<div class="detail-row"><span class="k">Finition</span><span class="v">' +
      esc(p.finish || '—') +
      '</span></div>' +
      '<div class="detail-row"><span class="k">Conditionnement</span><span class="v">' +
      (p.format ? p.format + ' ' + p.unit : '—') +
      '</span></div>' +
      '<div class="detail-row"><span class="k">Stock total</span><span class="v">' +
      p.stock +
      ' ' +
      esc(p.unit) +
      '</span></div>' +
      locations +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="notice" style="margin-top:18px"><i class="fa-solid fa-triangle-exclamation"></i><span class="notice-text">Classification FOM à confirmer</span></div>' +
      '</div>' +
      '<div class="modal-foot">' +
      '<button class="btn btn-ghost" data-action="modal-close">Fermer</button>' +
      (can('devis:write')
        ? '<button class="btn btn-primary" data-action="product-use" data-id="' +
          esc(p.id) +
          '"><i class="fa-solid fa-plus"></i> Utiliser dans un devis</button>'
        : '') +
      '</div>'
  );
}

export function openProductPicker() {
  const list = state.products
    .map(
      (p) =>
        '<button class="quick-item" data-action="product-pick" data-id="' +
        esc(p.id) +
        '">' +
        '<span class="quick-thumb">' +
        (p.image
          ? '<img src="' + p.image + '" alt="">'
          : '<i class="fa-solid fa-box" style="color:#0c5e62"></i>') +
        '</span>' +
        '<span class="quick-name">' +
        esc(p.name) +
        '<br><span class="small muted">' +
        money(p.price) +
        ' • ' +
        esc(p.category) +
        '</span></span>' +
        '<i class="fa-solid fa-chevron-right"></i>' +
        '</button>'
    )
    .join('');
  openModal(
    modalHead('Choisir un produit', 'La ligne peinture du devis sera mise à jour') +
      '<div class="modal-body" style="max-height:60vh;overflow:auto"><div class="quick-list" style="padding:0">' +
      list +
      '</div></div>'
  );
}

export function openClient(id) {
  api('/api/clients/' + encodeURIComponent(id))
    .then((c) => {
      const quotes = c.quotes
        .map(
          (q) =>
            '<tr><td class="quote-row-id">' +
            esc(q.id) +
            '</td><td>' +
            dateShort(q.createdAt) +
            '</td>' +
            '<td class="num">' +
            money(q.total) +
            '</td><td>' +
            badge(q.status, q.statusLabel) +
            '</td></tr>'
        )
        .join('');
      const payments = c.payments
        .map(
          (p) =>
            '<tr><td>' +
            dateShort(p.date) +
            '</td><td>' +
            esc(METHOD_LABEL[p.method] || p.method) +
            '</td><td>' +
            esc(p.reference || '—') +
            '</td><td class="num strong">' +
            money(p.amount) +
            '</td></tr>'
        )
        .join('');
      openModal(
        modalHead(esc(c.name), esc(c.company || c.type)) +
          '<div class="modal-body">' +
          '<div class="grid-2" style="gap:10px 24px;margin-bottom:16px">' +
          '<div class="detail-row"><span class="k">Contact</span><span class="v">' +
          esc(c.contact || c.name) +
          '</span></div>' +
          '<div class="detail-row"><span class="k">Téléphone</span><span class="v">' +
          esc(c.phone || '—') +
          '</span></div>' +
          '<div class="detail-row"><span class="k">Email</span><span class="v">' +
          esc(c.email || '—') +
          '</span></div>' +
          '<div class="detail-row"><span class="k">Ville</span><span class="v">' +
          esc(c.city) +
          '</span></div>' +
          '</div>' +
          '<div class="section-title" style="margin-bottom:8px">Devis</div>' +
          '<table class="data" style="margin-bottom:18px"><thead><tr><th>N°</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead><tbody>' +
          (quotes || '<tr><td colspan="4">' + emptyState('fa-file-lines', 'Aucun devis') + '</td></tr>') +
          '</tbody></table>' +
          '<div class="section-title" style="margin-bottom:8px">Encaissements</div>' +
          '<table class="data"><thead><tr><th>Date</th><th>Mode</th><th>Référence</th><th>Montant</th></tr></thead><tbody>' +
          (payments ||
            '<tr><td colspan="4">' + emptyState('fa-receipt', 'Aucun encaissement') + '</td></tr>') +
          '</tbody></table>' +
          '</div>' +
          '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Fermer</button>' +
          (can('paiement:write')
            ? '<button class="btn btn-primary" data-action="finance-pay" data-client="' +
              esc(c.id) +
              '"><i class="fa-solid fa-plus"></i> Encaisser un acompte</button>'
            : '') +
          '</div>',
        { size: 'wide' }
      );
    })
    .catch((err) => toast(err.message, 'error'));
}

export function openClientForm() {
  openModal(
    modalHead('Nouveau client', 'Créez une fiche client') +
      '<div class="modal-body"><div class="form-grid">' +
      '<div class="field span-2"><label>Nom / raison sociale *</label><input class="input" id="fName" placeholder="Ex : Villa Lambanyi"></div>' +
      '<div class="field"><label>Contact</label><input class="input" id="fContact" placeholder="Nom du contact"></div>' +
      '<div class="field"><label>Téléphone</label><input class="input" id="fPhone" placeholder="+224 ..."></div>' +
      '<div class="field"><label>Email</label><input class="input" id="fEmail" type="email" placeholder="client@email.com"></div>' +
      '<div class="field"><label>Ville</label><input class="input" id="fCity" value="Conakry"></div>' +
      '<div class="field"><label>Entreprise</label><input class="input" id="fCompany" placeholder="Optionnel"></div>' +
      '<div class="field"><label>Type</label><select class="select" id="fType"><option>Particulier</option><option>Professionnel</option><option>Revendeur</option></select></div>' +
      '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
      '<button class="btn btn-primary" data-action="client-save"><i class="fa-solid fa-check"></i> Enregistrer</button></div>',
    { size: 'narrow' }
  );
}

export function openPaymentForm(prefill) {
  const p = prefill || {};
  const quoteId = p.quoteId || state.payment.quoteId || '';
  api('/api/payments/' + encodeURIComponent(quoteId))
    .then((data) => {
      const flexAccess = !!data.flexAccess;
      const bankOk = !!data.bankValidated;
      const openSteps = flexAccess
        ? (data.schedule || []).filter((s) => s.status !== 'paye' && (bankOk || s.kind !== 'installment'))
        : [];
      const stepOptions = openSteps
        .map(
          (s) =>
            '<option value="' +
            esc(s.id) +
            '" data-amount="' +
            (s.amount || 0) +
            '">' +
            esc(s.step) +
            (s.amount ? ' — ' + money(s.amount) : '') +
            '</option>'
        )
        .join('');
      const defaultAmount = p.amount || (openSteps[0] && openSteps[0].amount ? openSteps[0].amount : '');
      openModal(
        modalHead(
          'Enregistrer un paiement',
          'Devis ' + esc(data.quote.id) + ' • ' + esc(data.quote.clientName)
        ) +
          '<div class="modal-body"><div class="form-grid">' +
          '<div class="field"><label>Montant (GNF) *</label><input class="input" id="pAmount" type="number" value="' +
          defaultAmount +
          '" placeholder="0"></div>' +
          '<div class="field"><label>Date</label><input class="input" id="pDate" type="date" value="' +
          todayIso() +
          '"></div>' +
          '<div class="field"><label>Mode</label><select class="select" id="pMethod">' +
          Object.keys(METHOD_LABEL)
            .map((m) => '<option value="' + m + '">' + METHOD_LABEL[m] + '</option>')
            .join('') +
          '</select></div>' +
          '<div class="field"><label>Référence</label><input class="input" id="pRef" placeholder="N° transaction"></div>' +
          (stepOptions
            ? '<div class="field span-2"><label>Échéance concernée</label><select class="select" id="pStep">' +
              stepOptions +
              '</select></div>'
            : '') +
          (!flexAccess
            ? '<div class="field span-2"><div class="pay-lock"><i class="fa-solid fa-lock"></i>' +
              '<span>Le <strong>paiement par échéance</strong> est réservé aux devis ayant accès à la formule <strong>PEINTURE FLEX</strong>. ' +
              'Pour ce devis, le règlement est libre : acompte, paiement partiel ou solde.</span></div></div>'
            : bankOk || stepOptions
              ? ''
              : '<div class="field span-2"><div class="pay-lock"><i class="fa-solid fa-hourglass-half"></i>' +
                '<span>L’<strong>échéancier FLEX</strong> s’ouvre à la validation du dossier par la banque.</span></div></div>') +
          (flexAccess && !bankOk && stepOptions
            ? '<div class="field span-2"><div class="pay-lock"><i class="fa-solid fa-hourglass-half"></i>' +
              '<span>Seul l’<strong>abonnement FLEX</strong> est réglable pour l’instant : les échéances de crédit s’ouvrent ' +
              'après la validation du dossier par la banque.</span></div></div>'
            : '') +
          '<div class="field span-2"><label>Notes</label><textarea class="input" id="pNotes" rows="2"></textarea></div>' +
          '</div></div>' +
          '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
          '<button class="btn btn-primary" data-action="payment-save" data-quote="' +
          esc(data.quote.id) +
          '"><i class="fa-solid fa-check"></i> Enregistrer</button></div>',
        { size: 'narrow' }
      );
      const stepSel = document.getElementById('pStep');
      if (stepSel) {
        stepSel.addEventListener('change', () => {
          const opt = stepSel.selectedOptions[0];
          const val = opt && Number(opt.dataset.amount);
          if (val) document.getElementById('pAmount').value = val;
        });
      }
    })
    .catch((err) => toast(err.message, 'error'));
}

export function openChantierUpdate(id) {
  api('/api/chantiers').then((list) => {
    const c = list.find((x) => x.id === id);
    if (!c) return;
    openModal(
      modalHead(esc(c.name), esc(c.clientName) + ' • ' + esc(c.city)) +
        '<div class="modal-body"><div class="form-grid">' +
        '<div class="field"><label>Avancement (%)</label><input class="input" id="chProgress" type="number" min="0" max="100" value="' +
        c.progress +
        '"></div>' +
        '<div class="field"><label>Statut</label><select class="select" id="chStatus">' +
        Object.keys(CHANTIER_LABEL)
          .map(
            (s) =>
              '<option value="' +
              s +
              '"' +
              (c.status === s ? ' selected' : '') +
              '>' +
              CHANTIER_LABEL[s] +
              '</option>'
          )
          .join('') +
        '</select></div>' +
        '<div class="field"><label>Dépensé (GNF)</label><input class="input" id="chSpent" type="number" value="' +
        c.spent +
        '"></div>' +
        '<div class="field"><label>Chef de chantier</label><input class="input" id="chChef" value="' +
        esc(c.chef) +
        '"></div>' +
        '</div></div>' +
        '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
        '<button class="btn btn-primary" data-action="chantier-save" data-id="' +
        esc(c.id) +
        '"><i class="fa-solid fa-check"></i> Enregistrer</button></div>',
      { size: 'narrow' }
    );
  });
}
