/**
 * Création d'un devis avec calcul en direct.
 */

import { pageHead } from '../ui/dom.js';
import { api, dec, esc, money, n1, parseNum, toast } from '../core/format.js';
import { state } from '../core/state.js';
import { pages } from '../core/registry.js';

export async function ensureDraft() {
  if (!state.draft) {
    state.draft = await api('/api/quotes-draft');
    if (!state.draft.assumptions) {
      state.draft.assumptions = {
        rendement: 10,
        coats: 2,
        waste: 0.1,
        laborPrice: 30000,
        transport: 250000,
        tvaRate: 0.18
      };
    }
    state.draft.rooms = (state.draft.rooms || []).map((r, i) => Object.assign({ id: 'r' + (i + 1) }, r));
    state.draft.stored = true;
  }
  return state.draft;
}

export function roomFormula(room) {
  return (
    '(' +
    n1(room.length) +
    ' + ' +
    n1(room.width) +
    ') × 2 × ' +
    n1(room.height) +
    ' − (' +
    (Number(room.doors) || 0) +
    ' × 2,00) − (' +
    (Number(room.windows) || 0) +
    ' × 1,5)'
  );
}

export function roomSurface(room) {
  const wall = 2 * ((Number(room.length) || 0) + (Number(room.width) || 0)) * (Number(room.height) || 0);
  const openings = (Number(room.doors) || 0) * 2 + (Number(room.windows) || 0) * 1.5;
  return Math.max(0, Math.round((wall - openings) * 10) / 10);
}

export function lineIcon(line, product) {
  if (line.icon === 'paint') {
    return product && product.image
      ? '<img src="' + product.image + '" alt="">'
      : '<i class="fa-solid fa-paint-roller"></i>';
  }
  if (line.icon === 'labor') return '<i class="fa-solid fa-helmet-safety"></i>';
  return '<i class="fa-solid fa-truck"></i>';
}

export function linesMarkup(draft, product) {
  return draft.lines
    .map((line) => {
      const pickable = line.icon === 'paint';
      const qty = line.unit === 'm²' || line.unit === 'L' ? dec(line.qty) : line.qty;
      return (
        '<tr' +
        (pickable ? ' class="pick-line" data-action="pick-product" title="Changer de produit"' : '') +
        '>' +
        '<td><div class="line-item">' +
        '<span class="line-ico">' +
        lineIcon(line, product) +
        '</span>' +
        '<div><div class="line-desig">' +
        esc(line.designation) +
        '</div>' +
        '<div class="line-detail">' +
        esc(line.detail) +
        '</div></div>' +
        '</div></td>' +
        '<td class="right qty">' +
        qty +
        ' ' +
        esc(line.unit) +
        '</td>' +
        '<td class="right pu">' +
        money(line.unitPrice) +
        '</td>' +
        '<td class="right amount">' +
        money(line.amount) +
        '</td>' +
        '</tr>'
      );
    })
    .join('');
}

export function roomMarkup(room) {
  const d = state.draft;
  const surface = d && d.stored && d.surface && d.rooms.length === 1 ? d.surface : roomSurface(room);
  return (
    '<div class="room-box" data-room-box="' +
    room.id +
    '">' +
    '<div class="room-head">' +
    '<div class="room-name">' +
    '<input value="' +
    esc(room.name) +
    '" data-room="' +
    room.id +
    '" data-field="name" aria-label="Nom de la pièce">' +
    '<span class="room-dims">' +
    n1(room.length) +
    ' × ' +
    n1(room.width) +
    ' m</span>' +
    '</div>' +
    '<div class="room-actions">' +
    '<button class="icon-btn" data-action="room-toggle" data-room="' +
    room.id +
    '" aria-label="Replier"><i class="fa-solid fa-chevron-up"></i></button>' +
    '<button class="icon-btn room-x" data-action="room-remove" data-room="' +
    room.id +
    '" aria-label="Supprimer"><i class="fa-solid fa-xmark"></i></button>' +
    '</div>' +
    '</div>' +
    '<div class="room-content">' +
    '<div class="room-fields">' +
    '<div class="field"><label>Longueur (m)</label><input class="input" type="text" inputmode="decimal" value="' +
    n1(room.length) +
    '" data-room="' +
    room.id +
    '" data-field="length"></div>' +
    '<div class="field"><label>Largeur (m)</label><input class="input" type="text" inputmode="decimal" value="' +
    n1(room.width) +
    '" data-room="' +
    room.id +
    '" data-field="width"></div>' +
    '<div class="field"><label>Hauteur (m)</label><input class="input" type="text" inputmode="decimal" value="' +
    n1(room.height) +
    '" data-room="' +
    room.id +
    '" data-field="height"></div>' +
    '</div>' +
    '<div class="room-fields two">' +
    '<div class="field"><label>Portes</label><div class="stepper">' +
    '<button type="button" data-action="room-step" data-room="' +
    room.id +
    '" data-field="doors" data-delta="-1">−</button>' +
    '<span class="val" data-room-val="doors-' +
    room.id +
    '">' +
    (Number(room.doors) || 0) +
    '</span>' +
    '<button type="button" data-action="room-step" data-room="' +
    room.id +
    '" data-field="doors" data-delta="1">+</button>' +
    '</div></div>' +
    '<div class="field"><label>Fenêtres</label><div class="stepper">' +
    '<button type="button" data-action="room-step" data-room="' +
    room.id +
    '" data-field="windows" data-delta="-1">−</button>' +
    '<span class="val" data-room-val="windows-' +
    room.id +
    '">' +
    (Number(room.windows) || 0) +
    '</span>' +
    '<button type="button" data-action="room-step" data-room="' +
    room.id +
    '" data-field="windows" data-delta="1">+</button>' +
    '</div></div>' +
    '</div>' +
    '<div class="surface-box">' +
    '<div class="surface-icon"><i class="fa-solid fa-vector-square"></i></div>' +
    '<div><div class="surface-label">Surface à peindre</div>' +
    '<div class="surface-value" data-room-surface="' +
    room.id +
    '">' +
    dec(surface) +
    ' m²</div></div>' +
    '<div class="surface-formula"><i class="fa-solid fa-circle-info"></i><span data-room-formula="' +
    room.id +
    '">' +
    roomFormula(room) +
    '</span></div>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

export async function renderNouveauDevis() {
  const draft = await ensureDraft();
  state.clients = await api('/api/clients');
  state.products = await api('/api/products');
  const product = state.products.find((p) => p.id === draft.productId) || state.products[0];
  const a = draft.assumptions;

  const clientOptions = state.clients
    .map(
      (c) =>
        '<option value="' +
        esc(c.id) +
        '"' +
        (c.id === draft.clientId ? ' selected' : '') +
        '>' +
        esc(c.name) +
        '</option>'
    )
    .join('');

  const breadcrumb =
    '<button data-action="go" data-route="devis"><i class="fa-solid fa-arrow-left"></i> Devis en cours</button>' +
    '<span class="sep"><i class="fa-solid fa-chevron-right"></i></span>' +
    '<span class="current">Nouveau devis</span>';

  return (
    pageHead({
      title: 'Nouveau devis',
      sub: 'Calculez les surfaces, estimez les quantités et générez votre devis.',
      breadcrumb: breadcrumb
    }) +
    '<div class="page-body">' +
    '<div class="quote-grid">' +
    '<div class="quote-col">' +
    '<div class="card">' +
    '<div class="card-head nowrap">' +
    '<span class="card-icon"><i class="fa-solid fa-house"></i></span>' +
    '<span class="card-title">Pièces et surfaces</span>' +
    '<span class="spacer"></span>' +
    '<button class="btn btn-soft btn-sm" data-action="room-add" style="padding:0 9px;font-size:12px"><i class="fa-solid fa-plus"></i> Ajouter une pièce</button>' +
    '</div>' +
    '<div class="card-body" id="roomsWrap">' +
    draft.rooms.map(roomMarkup).join('') +
    '</div>' +
    '</div>' +
    '<div class="card">' +
    '<div class="card-head">' +
    '<span class="hyp-icon"><i class="fa-solid fa-paint-roller"></i></span>' +
    '<span class="card-title">Hypothèses</span>' +
    '</div>' +
    '<div class="card-body">' +
    '<div class="hyp-grid">' +
    '<div class="hyp-tile mint"><i class="fa-solid fa-bucket hyp-ico"></i><div><div class="hyp-label">Rendement<br>fabricant</div><div class="hyp-value">' +
    a.rendement +
    ' m²/L</div></div></div>' +
    '<div class="hyp-tile cream"><i class="fa-solid fa-layer-group hyp-ico"></i><div><div class="hyp-label">&nbsp;</div><div class="hyp-value">' +
    a.coats +
    ' couches</div></div></div>' +
    '<div class="hyp-tile rose"><i class="fa-solid fa-percent hyp-ico"></i><div><div class="hyp-label">Marge de perte</div><div class="hyp-value">' +
    Math.round(a.waste * 100) +
    ' %</div></div></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="quote-col">' +
    '<div class="card">' +
    '<div class="card-head nowrap">' +
    '<span class="card-icon"><i class="fa-solid fa-file-lines"></i></span>' +
    '<span class="card-title">Détail du devis</span>' +
    '<span class="spacer"></span>' +
    '<select class="select" id="draftClient" aria-label="Client du devis" style="width:150px;height:32px;font-size:12.5px">' +
    clientOptions +
    '</select>' +
    '</div>' +
    '<div class="card-body">' +
    '<table class="lines">' +
    '<thead><tr><th>Désignation</th><th class="right">Qté / Unité</th><th class="right">Prix unitaire</th><th class="right">Montant</th></tr></thead>' +
    '<tbody id="linesBody">' +
    linesMarkup(draft, product) +
    '</tbody>' +
    '</table>' +
    '<div class="tva-row">' +
    '<span class="tva-label">TVA configurable</span>' +
    '<div class="tva-controls">' +
    '<label class="switch"><input type="checkbox" id="tvaToggle"' +
    (draft.tvaEnabled !== false ? ' checked' : '') +
    '><span class="track"></span></label>' +
    '<select class="select" id="tvaRate">' +
    [18, 10, 5, 0]
      .map(
        (r) =>
          '<option value="' +
          r +
          '"' +
          (Math.round((draft.tvaRate || 0.18) * 100) === r ? ' selected' : '') +
          '>' +
          r +
          ' %</option>'
      )
      .join('') +
    '</select>' +
    '<span class="tva-amount" id="tvaAmount">' +
    money(draft.tvaAmount) +
    '</span>' +
    '</div>' +
    '</div>' +
    '<div class="total-row"><span class="total-label">Total</span><span class="total-value" id="totalValue">' +
    money(draft.total) +
    '</span></div>' +
    '</div>' +
    '</div>' +
    '<div class="quote-actions">' +
    '<button class="btn btn-outline" data-action="quote-save"><i class="fa-solid fa-floppy-disk"></i> Enregistrer v2</button>' +
    '<button class="btn btn-primary" data-action="quote-pdf"><i class="fa-solid fa-file-pdf"></i> Générer le PDF</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

export let recalcTimer = null;
export function scheduleRecalc() {
  clearTimeout(recalcTimer);
  recalcTimer = setTimeout(recalcDraft, 180);
}

export async function recalcDraft() {
  const d = state.draft;
  if (!d) return;
  try {
    const calc = await api('/api/quotes/calculate', {
      method: 'POST',
      body: {
        rooms: d.rooms,
        productId: d.productId,
        rendement: d.assumptions.rendement,
        coats: d.assumptions.coats,
        waste: d.assumptions.waste,
        laborPrice: d.assumptions.laborPrice,
        transport: d.assumptions.transport,
        tvaRate: d.assumptions.tvaRate,
        tvaEnabled: d.tvaEnabled
      }
    });
    d.stored = false;
    d.surface = calc.surface;
    d.subtotal = calc.subtotal;
    d.tvaAmount = calc.tvaAmount;
    d.total = calc.total;
    d.lines = [
      {
        icon: 'paint',
        designation: 'Peinture intérieure',
        detail: d.finish,
        qty: calc.details.peinture.qty,
        unit: 'L',
        unitPrice: calc.details.peinture.unitPrice,
        amount: calc.details.peinture.amount
      },
      {
        icon: 'labor',
        designation: 'Main-d’œuvre',
        detail: 'Application (' + d.assumptions.coats + ' couches)',
        qty: calc.details.mainOeuvre.qty,
        unit: 'm²',
        unitPrice: calc.details.mainOeuvre.unitPrice,
        amount: calc.details.mainOeuvre.amount
      },
      {
        icon: 'transport',
        designation: 'Transport',
        detail: 'Livraison sur site',
        qty: 1,
        unit: 'forfait',
        unitPrice: calc.details.transport.unitPrice,
        amount: calc.details.transport.amount
      }
    ];
    paintDraftComputation();
  } catch (err) {
    toast(err.message, 'error');
  }
}

export function paintDraftComputation() {
  const d = state.draft;
  if (!d) return;
  d.rooms.forEach((room) => {
    const s = document.querySelector('[data-room-surface="' + room.id + '"]');
    const f = document.querySelector('[data-room-formula="' + room.id + '"]');
    const box = document.querySelector('[data-room-box="' + room.id + '"] .room-dims');
    if (s) s.textContent = dec(roomSurface(room)) + ' m²';
    if (f) f.textContent = roomFormula(room);
    if (box) box.textContent = n1(room.length) + ' × ' + n1(room.width) + ' m';
    const doors = document.querySelector('[data-room-val="doors-' + room.id + '"]');
    const windows = document.querySelector('[data-room-val="windows-' + room.id + '"]');
    if (doors) doors.textContent = Number(room.doors) || 0;
    if (windows) windows.textContent = Number(room.windows) || 0;
  });
  const product = state.products.find((p) => p.id === d.productId);
  const body = document.getElementById('linesBody');
  if (body) body.innerHTML = linesMarkup(d, product);
  const tva = document.getElementById('tvaAmount');
  if (tva) tva.textContent = money(d.tvaAmount);
  const total = document.getElementById('totalValue');
  if (total) total.textContent = money(d.total);
  const pname = document.getElementById('quoteProductName');
  if (pname && product) pname.textContent = product.name;
}

export function paintRooms() {
  const wrap = document.getElementById('roomsWrap');
  if (wrap && state.draft) {
    wrap.innerHTML = state.draft.rooms.map(roomMarkup).join('');
    wireRoomInputs();
  }
}

export function wireRoomInputs() {
  const d = state.draft;
  if (!d) return;
  document.querySelectorAll('#roomsWrap [data-field]').forEach((input) => {
    if (input.tagName !== 'INPUT') return;
    input.addEventListener('input', () => {
      const room = d.rooms.find((r) => r.id === input.dataset.room);
      if (!room) return;
      const field = input.dataset.field;
      room[field] = field === 'name' ? input.value : parseNum(input.value);
      if (field !== 'name') scheduleRecalc();
    });
  });
}

/* Enregistrement de la page dans le routeur */
pages['devis/nouveau'] = renderNouveauDevis;
