/**
 * Espace client : boutique, panier, ma peinture, planning.
 */

import { emptyState, pageHead } from '../ui/dom.js';
import { api, badge, dateFr, dateShort, dec, esc, money, parseNum, toast } from '../core/format.js';
import { firstAllowedRoute, persistSession, state } from '../core/state.js';
import { go, render } from '../core/router.js';
import { loadData } from '../auth/login.js';
import { closeModal, modalHead, openModal } from '../ui/modals.js';
import { pages } from '../core/registry.js';

export const BOOKING_LABEL = { demande: 'En attente de l’équipe', confirme: 'Confirmé', refuse: 'Refusé' };
export const ORDER_LABEL = {
  a_preparer: 'En préparation',
  livree: 'Livrée',
  en_financement: 'Financement FLEX',
  annulee: 'Annulée'
};
export const FLEX_RATE = 0.01;
export const FLEX_SUBSCRIPTION = 250000;

export function portalState() {
  if (!state.portal) {
    state.portal = {
      me: null,
      calendar: [],
      day: null,
      category: 'Tous',
      search: '',
      quoteId: null,
      pending: null
    };
  }
  return state.portal;
}

export async function loadPortal(fresh) {
  const p = portalState();
  if (!p.me || fresh) p.me = await api('/api/portal/me');
  return p.me;
}

export function selectedQuote(me) {
  const p = portalState();
  const quotes = (me && me.quotes) || [];
  if (!quotes.length) return null;
  const found = quotes.find((q) => q.id === p.quoteId);
  return found || quotes[0];
}

export function updateCartBadge(count) {
  const nav = document.querySelector('.nav-item[data-nav="panier"]');
  if (!nav) return;
  let tag = nav.querySelector('.nav-count');
  if (!count) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('span');
    tag.className = 'nav-count';
    nav.appendChild(tag);
  }
  tag.textContent = count;
}

export function shopCartBar(cart) {
  const empty = !cart || !cart.count;
  return (
    '<div class="shop-cart-bar' +
    (empty ? ' is-empty' : '') +
    '">' +
    '<span class="shop-cart-icon"><i class="fa-solid fa-basket-shopping"></i></span>' +
    '<div class="shop-cart-txt">' +
    '<strong>' +
    (empty
      ? 'Votre panier est vide'
      : cart.count + ' article' + (cart.count > 1 ? 's' : '') + ' · ' + money(cart.total)) +
    '</strong>' +
    '<span>' +
    (empty
      ? 'Ajoutez des produits depuis le catalogue ci-dessous.'
      : 'Prêt à commander en espèces ou avec PEINTURE FLEX.') +
    '</span>' +
    '</div>' +
    '<button class="btn btn-primary btn-sm" data-action="go" data-route="panier">' +
    '<i class="fa-solid fa-arrow-right"></i> Voir mon panier</button>' +
    '</div>'
  );
}

export function shopProductCard(p) {
  const thumb = p.image
    ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">'
    : '<div class="icon-tile"><i class="fa-solid ' + esc(p.icon || 'fa-box') + '"></i></div>';
  return (
    '<article class="product-card shop-card">' +
    '<div class="product-thumb">' +
    thumb +
    '</div>' +
    '<div class="product-info">' +
    '<div class="product-cat">' +
    esc(p.category) +
    '</div>' +
    '<div class="product-name">' +
    esc(p.name) +
    '</div>' +
    '<div class="shop-price"><span class="price-tag">' +
    money(p.price) +
    '</span>' +
    '<span class="shop-unit">/ ' +
    esc(p.unit || 'unité') +
    '</span></div>' +
    '<div class="stock-line"><i class="fa-solid fa-box"></i> Disponible ' +
    p.stock +
    '</div>' +
    (p.lowStock
      ? '<span class="badge stock-bas"><i class="fa-solid fa-triangle-exclamation"></i> Stock bas</span>'
      : '') +
    '<button class="btn btn-primary btn-sm shop-add" data-action="add-cart" data-id="' +
    esc(p.id) +
    '">' +
    '<i class="fa-solid fa-plus"></i> Ajouter au panier</button>' +
    '</div>' +
    '</article>'
  );
}

export async function renderBoutique() {
  const p = portalState();
  const [products, cart] = await Promise.all([api('/api/products'), api('/api/cart')]);
  state.products = products;
  if (p.me) p.me.cart = cart;
  updateCartBadge(cart.count);
  const cats = ['Tous'];
  products.forEach((x) => {
    if (cats.indexOf(x.category) === -1) cats.push(x.category);
  });
  let list = products.filter(
    (x) =>
      p.category === 'Tous' ||
      x.category === p.category ||
      (x.extraCategories || []).indexOf(p.category) !== -1
  );
  if (p.search) {
    const needle = p.search.toLowerCase();
    list = list.filter(
      (x) => (x.name + ' ' + x.category + ' ' + (x.finish || '')).toLowerCase().indexOf(needle) !== -1
    );
  }
  return (
    pageHead({
      title: 'Boutique',
      sub: 'Peintures, mastiques et accessoires : sélectionnez vos produits et lancez votre commande.'
    }) +
    '<div class="page-body">' +
    shopCartBar(cart) +
    '<div class="catalogue-toolbar">' +
    '<div class="search-field"><i class="fa-solid fa-magnifying-glass"></i>' +
    '<input class="input" id="shopSearch" type="search" placeholder="Rechercher un produit..." value="' +
    esc(p.search) +
    '"></div>' +
    '<div class="sort-group"><span class="toolbar-label">' +
    list.length +
    ' produit' +
    (list.length > 1 ? 's' : '') +
    '</span></div>' +
    '</div>' +
    '<div class="cat-row">' +
    cats
      .map(
        (c) =>
          '<button class="cat-chip ' +
          (c === p.category ? 'active' : '') +
          '" data-action="shop-category" data-category="' +
          esc(c) +
          '">' +
          esc(c) +
          '</button>'
      )
      .join('') +
    '</div>' +
    '<div class="product-grid shop-grid">' +
    (list.map(shopProductCard).join('') ||
      emptyState('fa-box-open', 'Aucun produit ne correspond à votre recherche')) +
    '</div>' +
    '</div>'
  );
}

export function cartRow(item) {
  return (
    '<tr>' +
    '<td><div class="quote-row-client">' +
    esc(item.name) +
    '</div>' +
    '<div class="line-detail">' +
    money(item.price) +
    ' / ' +
    esc(item.unit || 'unité') +
    '</div></td>' +
    '<td class="num">' +
    money(item.price) +
    '</td>' +
    '<td><div class="qty-stepper">' +
    '<button data-action="cart-dec" data-id="' +
    esc(item.productId) +
    '" aria-label="Diminuer"><i class="fa-solid fa-minus"></i></button>' +
    '<span>' +
    item.qty +
    '</span>' +
    '<button data-action="cart-inc" data-id="' +
    esc(item.productId) +
    '" aria-label="Augmenter"><i class="fa-solid fa-plus"></i></button>' +
    '</div></td>' +
    '<td class="num strong">' +
    money(item.total) +
    '</td>' +
    '<td class="num"><button class="btn-icon" data-action="cart-remove" data-id="' +
    esc(item.productId) +
    '" aria-label="Retirer"><i class="fa-solid fa-trash-can"></i></button></td>' +
    '</tr>'
  );
}

export async function renderPanier() {
  const me = await loadPortal(true);
  const cart = me.cart;
  updateCartBadge(cart.count);
  const validated = (me.quotes || []).filter((q) => q.bankValidated);
  const flexReady = validated.length > 0;

  const rows = cart.items.map(cartRow).join('');
  const table = cart.count
    ? '<div class="card"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-basket-shopping"></i></span>' +
      '<span class="card-title">Mon panier</span>' +
      '<button class="btn btn-ghost btn-sm" data-action="cart-clear"><i class="fa-solid fa-eraser"></i> Vider</button></div>' +
      '<table class="data cart-table"><thead><tr><th>Produit</th><th class="num">Prix unitaire</th><th>Quantité</th><th class="num">Total</th><th></th></tr></thead>' +
      '<tbody>' +
      rows +
      '</tbody></table></div>'
    : '<div class="card">' +
      emptyState('fa-basket-shopping', 'Votre panier est vide') +
      '<div style="text-align:center;padding-bottom:18px"><button class="btn btn-primary" data-action="go" data-route="boutique">' +
      '<i class="fa-solid fa-store"></i> Parcourir la boutique</button></div></div>';

  const summary =
    '<div class="card cart-summary">' +
    '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-receipt"></i></span><span class="card-title">Récapitulatif</span></div>' +
    '<div class="card-body">' +
    '<div class="detail-list">' +
    '<div class="detail-row"><span class="k">Articles</span><span class="v">' +
    cart.count +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Sous-total</span><span class="v">' +
    money(cart.total) +
    '</span></div>' +
    '<div class="detail-row"><span class="k">Livraison</span><span class="v">Offerte à Conakry</span></div>' +
    '<div class="detail-row grand"><span class="k">Total à payer</span><span class="v">' +
    money(cart.total) +
    '</span></div>' +
    '</div>' +
    '<button class="btn btn-primary" style="width:100%;margin-top:16px" data-action="cart-checkout" data-mode="cash"' +
    (cart.count ? '' : ' disabled') +
    '>' +
    '<i class="fa-solid fa-money-bill-wave"></i> Commander et payer Cash</button>' +
    '<button class="btn btn-outline" style="width:100%;margin-top:8px" data-action="cart-checkout" data-mode="flex"' +
    (cart.count && flexReady ? '' : ' disabled') +
    '>' +
    '<i class="fa-solid fa-star"></i> Payer avec PEINTURE FLEX</button>' +
    (flexReady
      ? '<div class="flex-alert ok" style="margin-top:12px"><i class="fa-solid fa-circle-check"></i><div>Financement validé par la banque — achat à crédit possible.</div></div>'
      : '<div class="flex-alert" style="margin-top:12px"><i class="fa-solid fa-lock"></i><div>PEINTURE FLEX s’active après la validation de votre financement par la banque. <button class="link-btn" data-action="go" data-route="ma-peinture">Demander le financement</button></div></div>') +
    '</div>' +
    '</div>';

  return (
    pageHead({
      title: 'Mon panier',
      sub: 'Vérifiez vos articles, puis réglez en espèces ou avec PEINTURE FLEX.'
    }) +
    '<div class="page-body"><div class="cart-layout">' +
    '<div class="cart-main">' +
    table +
    '</div>' +
    summary +
    '</div></div>'
  );
}

export function portalRoomRow(room) {
  const r = room || {};
  return (
    '<div class="room-row" data-room>' +
    '<input class="input" data-room-name placeholder="Salon" value="' +
    esc(r.name || '') +
    '">' +
    '<input class="input num" data-room-l type="number" min="0" step="0.1" placeholder="6" value="' +
    (r.length != null ? r.length : '') +
    '">' +
    '<input class="input num" data-room-w type="number" min="0" step="0.1" placeholder="4" value="' +
    (r.width != null ? r.width : '') +
    '">' +
    '<input class="input num" data-room-h type="number" min="0" step="0.1" placeholder="3" value="' +
    (r.height != null ? r.height : '') +
    '">' +
    '<input class="input num" data-room-d type="number" min="0" step="1" placeholder="1" value="' +
    (r.doors != null ? r.doors : '0') +
    '">' +
    '<input class="input num" data-room-f type="number" min="0" step="1" placeholder="2" value="' +
    (r.windows != null ? r.windows : '0') +
    '">' +
    '<button class="btn-icon" data-action="portal-room-remove" aria-label="Supprimer la pièce"><i class="fa-solid fa-xmark"></i></button>' +
    '</div>'
  );
}

export function portalSteps(steps) {
  return (
    '<ol class="portal-steps">' +
    steps
      .map((s) => {
        const state2 =
          s.status === 'valide' || s.status === 'completes'
            ? 'done'
            : s.status === 'en_cours'
              ? 'current'
              : 'todo';
        return (
          '<li class="' +
          state2 +
          '">' +
          '<span class="ps-dot"><i class="fa-solid ' +
          (state2 === 'done' ? 'fa-check' : state2 === 'current' ? 'fa-ellipsis' : 'fa-circle') +
          '"></i></span>' +
          '<div class="ps-txt"><strong>' +
          esc(s.name) +
          '</strong><span>' +
          esc(s.date || 'En attente de traitement') +
          '</span></div>' +
          '<span class="ps-tag">' +
          esc(s.label) +
          '</span>' +
          '</li>'
        );
      })
      .join('') +
    '</ol>'
  );
}

export function flexTermsGrid(quote) {
  const f = quote.flex;
  return (
    '<div class="flex-terms">' +
    '<div class="flex-term"><span>Total des travaux</span><strong>' +
    money(quote.total) +
    '</strong></div>' +
    '<div class="flex-term"><span>Abonnement FLEX (banque)</span><strong>' +
    money(f.subscription) +
    '</strong></div>' +
    '<div class="flex-term"><span>Montant financé</span><strong>' +
    money(f.financed) +
    '</strong></div>' +
    '<div class="flex-term"><span>Durée</span><strong>' +
    f.months +
    ' mois</strong></div>' +
    '<div class="flex-term"><span>Intérêts (' +
    Math.round(f.rate * 100) +
    ' % / mois)</span><strong>' +
    money(f.interest) +
    '</strong></div>' +
    '<div class="flex-term accent"><span>Mensualité</span><strong>' +
    money(f.monthly) +
    '</strong></div>' +
    '</div>'
  );
}

export function flexPanel(me) {
  const quote = selectedQuote(me);
  if (!quote) {
    return (
      '<div class="card"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-star"></i></span>' +
      '<span class="card-title">PEINTURE FLEX</span></div><div class="card-body">' +
      '<div class="flex-alert"><i class="fa-solid fa-circle-info"></i><div>' +
      '<strong>Payez vos travaux en plusieurs fois.</strong>' +
      '<span>Abonnement de ' +
      money(FLEX_SUBSCRIPTION) +
      ' à la banque, puis un crédit de 1 à 12 mois à ' +
      Math.round(FLEX_RATE * 100) +
      ' % par mois.</span></div></div>' +
      '<ol class="mini-steps">' +
      '<li><span>1</span><div>Décrivez votre maison et recevez votre devis</div></li>' +
      '<li><span>2</span><div>Déposez votre demande de financement à la banque</div></li>' +
      '<li><span>3</span><div>Après validation : date, créneau et équipe peintre</div></li>' +
      '</ol></div></div>'
    );
  }
  let body = '';
  if (!quote.flex) {
    body =
      '<div class="flex-alert"><i class="fa-solid fa-circle-info"></i><div>' +
      'Payez vos travaux en plusieurs mensualités : abonnement de <strong>' +
      money(FLEX_SUBSCRIPTION) +
      '</strong> à la banque, ' +
      'puis un crédit de 1 à 12 mois à ' +
      Math.round(FLEX_RATE * 100) +
      ' % par mois.</div></div>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:14px" data-action="portal-flex-request" data-quote="' +
      esc(quote.id) +
      '">' +
      '<i class="fa-solid fa-star"></i> Demander le financement PEINTURE FLEX</button>';
  } else {
    const financing = quote.financing;
    const steps = (financing && financing.steps) || [];
    const sent = steps.length && steps.every((s) => s.date);
    body =
      flexTermsGrid(quote) +
      (quote.bankValidated
        ? '<div class="flex-alert ok" style="margin-top:14px"><i class="fa-solid fa-circle-check"></i><div>' +
          '<strong>Financement validé par la banque.</strong> Vous pouvez maintenant choisir une date d’intervention et une équipe peintre.</div></div>' +
          '<button class="btn btn-primary" style="width:100%;margin-top:12px" data-action="portal-goto-calendar">' +
          '<i class="fa-regular fa-calendar-days"></i> Choisir ma date et mon équipe</button>'
        : '<div class="flex-alert" style="margin-top:14px"><i class="fa-solid fa-hourglass-half"></i><div>' +
          '<strong>Dossier en cours d’examen.</strong> Le calendrier des interventions s’ouvre dès la validation de la banque.</div></div>') +
      portalSteps(steps) +
      (quote.bankValidated
        ? ''
        : sent
          ? '<button class="btn btn-outline" style="width:100%;margin-top:12px" data-action="portal-financing-decide" data-quote="' +
            esc(quote.id) +
            '">' +
            '<i class="fa-solid fa-building-columns"></i> Décision de la banque <span class="demo-tag">Démo</span></button>'
          : '<button class="btn btn-primary" style="width:100%;margin-top:12px" data-action="portal-financing-send" data-quote="' +
            esc(quote.id) +
            '">' +
            '<i class="fa-solid fa-paper-plane"></i> Envoyer mon dossier à la banque</button>');
  }
  return (
    '<div class="card"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-star"></i></span>' +
    '<span class="card-title">PEINTURE FLEX</span>' +
    '<span class="card-sub">' +
    esc(quote.id) +
    ' · ' +
    money(quote.total) +
    '</span></div>' +
    '<div class="card-body">' +
    body +
    '</div></div>'
  );
}

export function quotesTable(me) {
  const quotes = me.quotes || [];
  if (!quotes.length) return emptyState('fa-file-lines', 'Aucun devis pour le moment');
  return (
    '<table class="data"><thead><tr><th>Devis</th><th>Objet</th><th class="num">Surface</th>' +
    '<th class="num">Total TTC</th><th>Financement</th><th>Statut</th><th></th></tr></thead><tbody>' +
    quotes
      .map(
        (q) =>
          '<tr class="' +
          (q.id === (selectedQuote(me) || {}).id ? 'row-selected' : '') +
          '">' +
          '<td class="quote-row-id">' +
          esc(q.id) +
          '</td>' +
          '<td><div class="quote-row-client">' +
          esc(q.subject) +
          '</div><div class="line-detail">' +
          dateShort(q.createdAt) +
          '</div></td>' +
          '<td class="num">' +
          dec(q.surface) +
          ' m²</td>' +
          '<td class="num strong">' +
          money(q.total) +
          '</td>' +
          '<td>' +
          (q.flex
            ? q.bankValidated
              ? '<span class="badge accepte"><i class="dot"></i>Validé</span>'
              : '<span class="badge envoye"><i class="dot"></i>En examen</span>'
            : '<span class="muted">—</span>') +
          '</td>' +
          '<td>' +
          badge(q.status, q.statusLabel) +
          '</td>' +
          '<td class="num"><button class="btn btn-ghost btn-xs" data-action="portal-select-quote" data-quote="' +
          esc(q.id) +
          '">' +
          '<i class="fa-solid fa-arrow-right"></i> Ouvrir</button></td>' +
          '</tr>'
      )
      .join('') +
    '</tbody></table>'
  );
}

export function dayRail(calendar, selected) {
  return (
    '<div class="day-rail">' +
    calendar
      .map((d) => {
        const free = d.closed ? 0 : d.slots.filter((s) => s.available).length;
        return (
          '<button class="day-card' +
          (d.date === selected ? ' active' : '') +
          (d.closed ? ' closed' : '') +
          '"' +
          ' data-action="portal-pick-day" data-date="' +
          esc(d.date) +
          '"' +
          (d.closed ? ' disabled' : '') +
          '>' +
          '<span class="dc-dow">' +
          esc(d.dayShort) +
          '</span>' +
          '<span class="dc-num">' +
          d.dayNumber +
          '</span>' +
          '<span class="dc-month">' +
          esc(d.month) +
          '</span>' +
          '<span class="dc-free">' +
          (d.closed ? 'Fermé' : free + ' créneau' + (free > 1 ? 'x' : '')) +
          '</span>' +
          '</button>'
        );
      })
      .join('') +
    '</div>'
  );
}

export function slotList(day, teamMap) {
  return (
    '<div class="slot-list">' +
    day.slots
      .map(
        (s) =>
          '<div class="slot-row' +
          (s.available ? '' : ' full') +
          '">' +
          '<div class="slot-time"><i class="fa-regular fa-clock"></i><strong>' +
          esc(s.label) +
          '</strong></div>' +
          '<div class="slot-teams">' +
          s.teamIds
            .map((id) => {
              const t = teamMap[id] || { name: id, pole: '', lead: '' };
              return (
                '<span class="team-chip" title="' +
                esc(t.lead || '') +
                '">' +
                '<i class="fa-solid fa-helmet-safety"></i>' +
                esc(t.name) +
                '</span>'
              );
            })
            .join('') +
          '</div>' +
          (s.available
            ? '<button class="btn btn-outline btn-sm" data-action="portal-book" data-date="' +
              esc(s.date) +
              '" data-slot="' +
              esc(s.slot) +
              '">' +
              'Choisir <i class="fa-solid fa-arrow-right"></i></button>'
            : '<span class="badge refuse">Complet</span>') +
          '</div>'
      )
      .join('') +
    '</div>'
  );
}

export function reservationCard(me, calendar) {
  const p = portalState();
  const validated = (me.quotes || []).filter((q) => q.bankValidated);
  if (!validated.length) {
    return (
      '<div class="card"><div class="card-head"><span class="card-icon"><i class="fa-regular fa-calendar-days"></i></span>' +
      '<span class="card-title">Calendrier des interventions</span></div><div class="card-body">' +
      '<div class="locked-box"><span class="lock-badge"><i class="fa-solid fa-lock"></i></span>' +
      '<div><strong>Calendrier verrouillé</strong><p>Les créneaux de l’entreprise s’ouvrent dès que votre financement PEINTURE FLEX est validé par la banque.</p></div></div>' +
      '</div></div>'
    );
  }
  const teams = {};
  (me.teams || []).forEach((t) => {
    teams[t.id] = t;
  });
  const open = calendar.filter((d) => !d.closed);
  const current =
    p.day && open.some((d) => d.date === p.day)
      ? p.day
      : (open.filter((d) => d.slots.some((s) => s.available))[0] || open[0] || { date: null }).date;
  const day = open.find((d) => d.date === current);
  return (
    '<div class="card cal-anchor"><div class="card-head"><span class="card-icon"><i class="fa-regular fa-calendar-days"></i></span>' +
    '<span class="card-title">Calendrier des interventions</span>' +
    '<span class="card-sub">' +
    esc(day ? day.day + ' ' + day.dayNumber + ' ' + day.month + ' ' + day.year : '') +
    '</span></div>' +
    '<div class="card-body">' +
    '<div class="reserve-for">Devis financé : <strong>' +
    esc(validated[0].id) +
    '</strong> · ' +
    money(validated[0].total) +
    (validated.length > 1
      ? ' <span class="muted">(+' +
        (validated.length - 1) +
        ' autre' +
        (validated.length > 2 ? 's' : '') +
        ')</span>'
      : '') +
    '</div>' +
    dayRail(calendar, current) +
    (day ? slotList(day, teams) : emptyState('fa-calendar-xmark', 'Aucune date disponible')) +
    '<div class="notice" style="margin-top:14px"><i class="fa-solid fa-circle-info"></i>' +
    '<span class="notice-text">La réservation devient ferme quand l’équipe peintre confirme sa disponibilité.</span></div>' +
    '</div></div>'
  );
}

export function bookingsCard(me) {
  const list = me.bookings || [];
  const body = list.length
    ? '<table class="data"><thead><tr><th>Réf.</th><th>Date</th><th>Créneau</th><th>Équipe</th><th>Devis</th><th>Statut</th></tr></thead><tbody>' +
      list
        .map(
          (b) =>
            '<tr>' +
            '<td class="quote-row-id">' +
            esc(b.id) +
            '</td>' +
            '<td>' +
            dateFr(b.date) +
            '</td>' +
            '<td>' +
            esc(b.slotLabel || b.slot) +
            '</td>' +
            '<td>' +
            esc(b.teamName || b.teamId) +
            '</td>' +
            '<td>' +
            esc(b.quoteId || '—') +
            '</td>' +
            '<td>' +
            '<span class="badge ' +
            (b.status === 'confirme' ? 'accepte' : b.status === 'refuse' ? 'refuse' : 'envoye') +
            '">' +
            '<i class="dot"></i>' +
            esc(BOOKING_LABEL[b.status] || b.status) +
            '</span></td>' +
            '</tr>'
        )
        .join('') +
      '</tbody></table>'
    : emptyState('fa-calendar-check', 'Aucun rendez-vous planifié');
  return (
    '<div class="card"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-calendar-check"></i></span>' +
    '<span class="card-title">Mes rendez-vous</span></div><div class="card-body">' +
    body +
    '</div></div>'
  );
}

export function ordersCard(me) {
  const list = me.orders || [];
  const body = list.length
    ? list
        .map(
          (o) =>
            '<div class="order-row">' +
            '<div class="order-head"><strong>' +
            esc(o.id) +
            '</strong>' +
            '<span class="badge ' +
            (o.status === 'livree' ? 'accepte' : 'envoye') +
            '">' +
            esc(ORDER_LABEL[o.status] || o.status) +
            '</span></div>' +
            '<div class="order-items">' +
            (o.items || []).map((i) => esc(i.name) + ' × ' + i.qty).join(' · ') +
            '</div>' +
            '<div class="order-foot"><span>' +
            dateShort(o.createdAt) +
            ' · ' +
            (o.mode === 'flex' ? 'PEINTURE FLEX' : 'Espèces') +
            '</span>' +
            '<strong>' +
            money(o.total) +
            '</strong></div>' +
            '</div>'
        )
        .join('')
    : emptyState('fa-box', 'Aucune commande pour le moment');
  return (
    '<div class="card"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-box"></i></span>' +
    '<span class="card-title">Mes commandes</span></div><div class="card-body">' +
    body +
    '</div></div>'
  );
}

export async function renderMaPeinture() {
  const p = portalState();
  const me = await loadPortal(true);
  updateCartBadge(me.cart.count);
  if (!p.calendar.length) p.calendar = await api('/api/planning/slots?days=14');
  const quote = selectedQuote(me);
  const products = state.products && state.products.length ? state.products : await api('/api/products');
  state.products = products;
  const paints = products.filter(
    (x) => (x.category || '').indexOf('FOM') !== -1 || (x.category || '').indexOf('huile') !== -1
  );

  const step = quote && quote.bankValidated ? 3 : quote && quote.flex ? 2 : quote ? 1 : 0;
  const steps = [
    { n: 1, label: 'Décrivez votre maison' },
    { n: 2, label: 'Financement PEINTURE FLEX' },
    { n: 3, label: 'Date et équipe' },
    { n: 4, label: 'L’équipe peint' }
  ];

  const form =
    '<form id="portalQuoteForm" class="card-body" novalidate>' +
    '<div class="field-row">' +
    '<div class="field"><label for="portalSubject">Objet des travaux</label>' +
    '<input class="input" id="portalSubject" placeholder="Peinture de ma maison" value="Peinture de ma maison"></div>' +
    '<div class="field"><label for="portalPaint">Peinture souhaitée</label><select class="select" id="portalPaint">' +
    paints.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>').join('') +
    '</select></div>' +
    '</div>' +
    '<div class="field"><label for="portalAddress">Adresse des travaux</label>' +
    '<input class="input" id="portalAddress" placeholder="Quartier, commune, ville" value="' +
    esc(
      (me.client && me.client.address ? me.client.address + ', ' : '') + ((me.client && me.client.city) || '')
    ) +
    '"></div>' +
    '<div class="rooms-table">' +
    '<div class="rooms-head"><span>Pièce</span><span>Long. (m)</span><span>Larg. (m)</span><span>Haut. (m)</span><span>Portes</span><span>Fenêtres</span><span></span></div>' +
    '<div id="portalRooms">' +
    portalRoomRow({ name: 'Salon', length: 6, width: 4, height: 3, doors: 1, windows: 2 }) +
    portalRoomRow({ name: 'Chambre 1', length: 5, width: 3.5, height: 3, doors: 1, windows: 1 }) +
    '</div>' +
    '</div>' +
    '<div class="quote-note"><i class="fa-solid fa-circle-info"></i>' +
    '<div>Surface des murs = (longueur + largeur) × 2 × hauteur − portes et fenêtres. ' +
    'Le devis comprend la peinture, la main-d’œuvre, le transport et la TVA (18 %).</div></div>' +
    '<div class="form-foot">' +
    '<button type="button" class="btn btn-ghost btn-sm" data-action="portal-room-add"><i class="fa-solid fa-plus"></i> Ajouter une pièce</button>' +
    '<button type="submit" class="btn btn-primary"><i class="fa-solid fa-calculator"></i> Obtenir mon devis</button>' +
    '</div>' +
    '</form>';

  return (
    pageHead({
      title: 'Ma peinture',
      sub: 'Devis pour votre maison, financement PEINTURE FLEX, date et équipe peintre.'
    }) +
    '<div class="page-body">' +
    '<div class="portal-steps-bar">' +
    steps
      .map(
        (s) =>
          '<div class="psb' +
          (step >= s.n ? ' on' : '') +
          '">' +
          '<span class="psb-num">' +
          (step > s.n ? '<i class="fa-solid fa-check"></i>' : s.n) +
          '</span>' +
          '<span class="psb-label">' +
          esc(s.label) +
          '</span></div>'
      )
      .join('') +
    '</div>' +
    '<div class="portal-grid">' +
    '<div class="card"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-house-chimney"></i></span>' +
    '<span class="card-title">Obtenir un devis</span></div>' +
    form +
    '</div>' +
    flexPanel(me) +
    '</div>' +
    '<div class="card" style="margin-bottom:16px"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-file-lines"></i></span>' +
    '<span class="card-title">Mes devis</span>' +
    '<span class="card-sub">' +
    (me.quotes || []).length +
    ' devis</span></div>' +
    '<div class="card-body no-pad">' +
    quotesTable(me) +
    '</div></div>' +
    reservationCard(me, p.calendar) +
    '<div class="portal-grid ml-grid" style="margin-top:16px">' +
    bookingsCard(me) +
    ordersCard(me) +
    '</div>' +
    '<div class="card" style="margin-top:16px"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-users"></i></span>' +
    '<span class="card-title">Nos équipes peintres</span>' +
    '<span class="card-sub">' +
    (me.teams || []).length +
    ' équipes</span></div>' +
    '<div class="card-body">' +
    teamCards(me) +
    '</div></div>' +
    '</div>'
  );
}

export function teamCards(me) {
  return (
    '<div class="team-cards">' +
    (me.teams || [])
      .map(
        (t) =>
          '<div class="team-card">' +
          '<div class="team-avatar"><i class="fa-solid fa-helmet-safety"></i></div>' +
          '<div class="team-body"><strong>' +
          esc(t.name) +
          '</strong>' +
          '<span class="team-lead">' +
          esc(t.lead) +
          ' · ' +
          t.members +
          ' peintres</span>' +
          '<span class="team-pole">' +
          esc(t.specialty) +
          ' · ' +
          esc(t.zone) +
          '</span>' +
          '<span class="team-rating"><i class="fa-solid fa-star"></i> ' +
          String(t.rating).replace('.', ',') +
          ' / 5</span>' +
          '</div></div>'
      )
      .join('') +
    '</div>'
  );
}

export async function renderPlanning() {
  const me = await loadPortal(true);
  const calendar = await api('/api/planning/slots?days=14');
  const bookings = me.bookings && me.bookings.length ? me.bookings : await api('/api/bookings');
  const all = bookings;
  const pending = all.filter((b) => b.status === 'demande');
  const teams = {};
  (me.teams || []).forEach((t) => {
    teams[t.id] = t;
  });

  const pendingRows = pending.length
    ? pending
        .map(
          (b) =>
            '<tr>' +
            '<td class="quote-row-id">' +
            esc(b.id) +
            '</td>' +
            '<td><div class="quote-row-client">' +
            esc(b.clientName) +
            '</div><div class="line-detail">' +
            esc(b.quoteId || '') +
            '</div></td>' +
            '<td>' +
            dateFr(b.date) +
            '</td>' +
            '<td>' +
            esc(b.slotLabel || b.slot) +
            '</td>' +
            '<td>' +
            esc(b.teamName || b.teamId) +
            '</td>' +
            '<td class="num">' +
            '<button class="btn btn-primary btn-xs" data-action="planning-decide" data-id="' +
            esc(b.id) +
            '" data-status="confirme">' +
            '<i class="fa-solid fa-check"></i> Confirmer</button> ' +
            '<button class="btn btn-ghost btn-xs" data-action="planning-decide" data-id="' +
            esc(b.id) +
            '" data-status="refuse">' +
            '<i class="fa-solid fa-xmark"></i> Refuser</button>' +
            '</td>' +
            '</tr>'
        )
        .join('')
    : '<tr><td colspan="6">' + emptyState('fa-circle-check', 'Aucune demande en attente') + '</td></tr>';

  const grid =
    '<table class="data plan-grid"><thead><tr><th>Créneau</th>' +
    calendar
      .map(
        (d) =>
          '<th class="plan-day"><span>' + esc(d.dayShort) + '</span><strong>' + d.dayNumber + '</strong></th>'
      )
      .join('') +
    '</tr></thead><tbody>' +
    ['08:00', '10:00', '14:00', '16:00']
      .map(
        (slot) =>
          '<tr><td class="plan-slot">' +
          esc(slot.replace(':', 'h')) +
          '</td>' +
          calendar
            .map((d) => {
              if (d.closed) return '<td class="plan-cell closed"><i class="fa-solid fa-lock"></i></td>';
              const s = d.slots.find((x) => x.slot === slot);
              if (!s || !s.available) return '<td class="plan-cell full">Complet</td>';
              if (s.teamIds.length === 3)
                return '<td class="plan-cell"><span class="plan-free">3 libres</span></td>';
              const names = s.teamIds.map((id) => (teams[id] && teams[id].name) || id);
              return (
                '<td class="plan-cell">' +
                s.teamIds
                  .map(
                    (id, i) =>
                      '<span class="plan-chip" title="' +
                      esc(names[i]) +
                      '">' +
                      esc(id.replace('TE-', 'É')) +
                      '</span>'
                  )
                  .join('') +
                '</td>'
              );
            })
            .join('') +
          '</tr>'
      )
      .join('') +
    '</tbody></table>';

  return (
    pageHead({
      title: 'Planning des équipes',
      sub: 'Confirmez la disponibilité des équipes et suivez les interventions à venir.'
    }) +
    '<div class="page-body">' +
    '<div class="card" style="margin-bottom:16px"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-bell"></i></span>' +
    '<span class="card-title">Demandes à valider</span><span class="card-sub">' +
    pending.length +
    ' en attente</span></div>' +
    '<div class="card-body no-pad"><table class="data"><thead><tr><th>Réf.</th><th>Client</th><th>Date</th><th>Créneau</th>' +
    '<th>Équipe</th><th class="num">Décision</th></tr></thead><tbody>' +
    pendingRows +
    '</tbody></table></div></div>' +
    '<div class="card" style="margin-bottom:16px"><div class="card-head"><span class="card-icon"><i class="fa-regular fa-calendar-days"></i></span>' +
    '<span class="card-title">Occupation des 14 prochains jours</span></div>' +
    '<div class="card-body no-pad">' +
    grid +
    '</div></div>' +
    '<div class="card"><div class="card-head"><span class="card-icon"><i class="fa-solid fa-users"></i></span>' +
    '<span class="card-title">Équipes peintres</span></div><div class="card-body">' +
    teamCards(me) +
    '</div></div>' +
    '</div>'
  );
}

export async function addToCart(productId, qty) {
  const cart = await api('/api/cart/items', {
    method: 'POST',
    body: { productId: productId, qty: qty || 1 }
  });
  updateCartBadge(cart.count);
  const p = portalState();
  if (p.me) p.me.cart = cart;
  toast('Produit ajouté au panier');
  if (state.route === 'boutique' || state.route === 'panier') render();
  return cart;
}

export async function checkoutCart(mode) {
  try {
    const order = await api('/api/orders', { method: 'POST', body: { mode: mode } });
    portalState().me = null;
    toast('Commande ' + order.id + ' enregistrée (' + (mode === 'flex' ? 'PEINTURE FLEX' : 'espèces') + ')');
    go('ma-peinture');
  } catch (err) {
    toast(err.message, 'error');
  }
}

export function openFlexModal(quote) {
  const financed = Math.max(0, quote.total - FLEX_SUBSCRIPTION);
  const preview = (months) => {
    const interest = Math.round(financed * FLEX_RATE * months);
    const monthly = Math.round((financed + interest) / months);
    return { interest: interest, monthly: monthly, total: financed + interest + FLEX_SUBSCRIPTION };
  };
  const first = preview(6);
  openModal(
    modalHead('Financement PEINTURE FLEX', esc(quote.id) + ' · ' + money(quote.total)) +
      '<form id="flexRequestForm" class="modal-body">' +
      '<div class="flex-offer">' +
      '<div><span>Abonnement à la banque</span><strong>' +
      money(FLEX_SUBSCRIPTION) +
      '</strong></div>' +
      '<div><span>Montant financé</span><strong>' +
      money(financed) +
      '</strong></div>' +
      '<div><span>Taux mensuel</span><strong>' +
      Math.round(FLEX_RATE * 100) +
      ' %</strong></div>' +
      '</div>' +
      '<div class="field" style="margin-top:16px"><label for="flexMonths">Nombre de mensualités</label>' +
      '<select class="select" id="flexMonths">' +
      Array.from({ length: 12 }, (_, i) => i + 1)
        .map((m) => '<option value="' + m + '"' + (m === 6 ? ' selected' : '') + '>' + m + ' mois</option>')
        .join('') +
      '</select></div>' +
      '<div class="flex-live" id="flexLive">' +
      '<div><span>Intérêts</span><strong>' +
      money(first.interest) +
      '</strong></div>' +
      '<div><span>Mensualité</span><strong>' +
      money(first.monthly) +
      '</strong></div>' +
      '<div><span>Coût total du projet</span><strong>' +
      money(first.total) +
      '</strong></div>' +
      '</div>' +
      '<div class="flex-alert" style="margin-top:14px"><i class="fa-solid fa-building-columns"></i>' +
      '<div>Le dossier est transmis à ' +
      'la banque partenaire' +
      '. Le calendrier des interventions s’ouvre après sa validation.</div></div>' +
      '<div class="modal-foot">' +
      '<button type="button" class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
      '<button type="submit" class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i> Envoyer la demande</button>' +
      '</div>' +
      '</form>',
    { size: 'md' }
  );
  const select = document.getElementById('flexMonths');
  select.addEventListener('change', () => {
    const prev = preview(Number(select.value));
    document.getElementById('flexLive').innerHTML =
      '<div><span>Intérêts</span><strong>' +
      money(prev.interest) +
      '</strong></div>' +
      '<div><span>Mensualité</span><strong>' +
      money(prev.monthly) +
      '</strong></div>' +
      '<div><span>Coût total du projet</span><strong>' +
      money(prev.total) +
      '</strong></div>';
  });
  document.getElementById('flexRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/portal/flex', {
        method: 'POST',
        body: { quoteId: quote.id, months: Number(select.value) }
      });
      closeModal();
      portalState().me = null;
      toast('Demande de financement envoyée à la banque');
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

export function openBookingModal(date, slot) {
  const p = portalState();
  const me = p.me;
  const day = p.calendar.find((d) => d.date === date);
  const slotInfo = day && day.slots.find((s) => s.slot === slot);
  if (!slotInfo) return;
  p.pending = { date: date, slot: slot };
  const validated = (me.quotes || []).filter((q) => q.bankValidated);
  const teams = (me.teams || []).filter((t) => slotInfo.teamIds.indexOf(t.id) !== -1);
  openModal(
    modalHead(
      'Réserver une intervention',
      esc(day.day + ' ' + day.dayNumber + ' ' + day.month + ' ' + day.year + ' · ' + slotInfo.label)
    ) +
      '<form id="bookingForm" class="modal-body">' +
      '<div class="field"><label for="bookQuote">Devis financé</label><select class="select" id="bookQuote">' +
      validated
        .map(
          (q) =>
            '<option value="' +
            esc(q.id) +
            '">' +
            esc(q.id) +
            ' · ' +
            esc(q.subject) +
            ' · ' +
            money(q.total) +
            '</option>'
        )
        .join('') +
      '</select></div>' +
      '<div class="field"><label>Équipe peintre disponible</label>' +
      '<div class="team-pick">' +
      teams
        .map(
          (t, i) =>
            '<label class="team-option">' +
            '<input type="radio" name="team" value="' +
            esc(t.id) +
            '"' +
            (i === 0 ? ' checked' : '') +
            '>' +
            '<span class="team-opt-body"><strong>' +
            esc(t.name) +
            '</strong>' +
            '<span>' +
            esc(t.lead) +
            ' · ' +
            t.members +
            ' peintres · ' +
            esc(t.specialty) +
            ' · ' +
            esc(t.zone) +
            '</span></span>' +
            '<span class="team-opt-rating"><i class="fa-solid fa-star"></i> ' +
            String(t.rating).replace('.', ',') +
            '</span>' +
            '</label>'
        )
        .join('') +
      '</div></div>' +
      '<div class="flex-alert" style="margin-top:14px"><i class="fa-solid fa-circle-info"></i>' +
      '<div>Votre demande est transmise à l’équipe. Le rendez-vous est confirmé dès qu’elle valide sa disponibilité.</div></div>' +
      '<div class="modal-foot">' +
      '<button type="button" class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
      '<button type="submit" class="btn btn-primary"><i class="fa-solid fa-calendar-check"></i> Envoyer la demande</button>' +
      '</div>' +
      '</form>',
    { size: 'md' }
  );
  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const quoteId = document.getElementById('bookQuote').value;
    const team = form.querySelector('input[name="team"]:checked');
    try {
      const booking = await api('/api/bookings', {
        method: 'POST',
        body: { quoteId: quoteId, date: date, slot: slot, teamId: team ? team.value : undefined }
      });
      closeModal();
      portalState().me = null;
      portalState().calendar = [];
      toast('Demande ' + booking.id + ' envoyée à ' + booking.teamName);
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

export async function setCartQty(productId, qty) {
  const cart =
    qty < 1
      ? await api('/api/cart/items/' + encodeURIComponent(productId), { method: 'DELETE' })
      : await api('/api/cart/items/' + encodeURIComponent(productId), {
          method: 'PATCH',
          body: { qty: qty }
        });
  const p = portalState();
  if (p.me) p.me.cart = cart;
  updateCartBadge(cart.count);
  render();
}

export async function clearCart() {
  const cart = await api('/api/cart', { method: 'DELETE' });
  const p = portalState();
  if (p.me) p.me.cart = cart;
  updateCartBadge(0);
  toast('Panier vidé');
  render();
}

export async function submitPortalQuote(form) {
  const rows = Array.prototype.slice.call(form.querySelectorAll('[data-room]'));
  const rooms = rows
    .map((row, i) => ({
      name: (row.querySelector('[data-room-name]').value || 'Pièce ' + (i + 1)).trim(),
      length: parseNum(row.querySelector('[data-room-l]').value),
      width: parseNum(row.querySelector('[data-room-w]').value),
      height: parseNum(row.querySelector('[data-room-h]').value),
      doors: parseNum(row.querySelector('[data-room-d]').value),
      windows: parseNum(row.querySelector('[data-room-f]').value)
    }))
    .filter((r) => r.length > 0 && r.width > 0 && r.height > 0);
  if (!rooms.length) {
    toast('Renseignez au moins une pièce (longueur, largeur et hauteur)', 'error');
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try {
    const quote = await api('/api/portal/quotes', {
      method: 'POST',
      body: {
        subject: document.getElementById('portalSubject').value,
        site: document.getElementById('portalAddress').value,
        productId: document.getElementById('portalPaint').value,
        rooms: rooms
      }
    });
    portalState().quoteId = quote.id;
    portalState().me = null;
    toast('Devis ' + quote.id + ' créé · ' + money(quote.total));
    render();
  } catch (err) {
    toast(err.message, 'error');
    if (btn) btn.disabled = false;
  }
}

export async function advanceFinancing(quoteId, message) {
  try {
    await api('/api/portal/financing/' + encodeURIComponent(quoteId) + '/advance', { method: 'POST' });
    portalState().me = null;
    toast(message);
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

export async function decideBooking(id, status) {
  try {
    const booking = await api('/api/bookings/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: { status: status }
    });
    portalState().me = null;
    render();
    toast(
      status === 'confirme'
        ? 'Réservation ' + booking.id + ' confirmée'
        : 'Réservation ' + booking.id + ' refusée'
    );
  } catch (err) {
    toast(err.message, 'error');
  }
}

export async function setOrderStatus(id, status) {
  try {
    await api('/api/orders/' + encodeURIComponent(id), { method: 'PATCH', body: { status: status } });
    portalState().me = null;
    toast('Commande ' + id + ' marquée livrée');
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

export function openRegisterModal() {
  const zones = ['Kaloum', 'Dixinn', 'Matam', 'Ratoma', 'Matoto'];
  openModal(
    modalHead('Créer mon compte client', 'Boutique, devis pour votre maison et financement PEINTURE FLEX.') +
      '<form id="registerForm" class="modal-body">' +
      '<div class="field mb"><label for="regName">Nom complet</label>' +
      '<input class="input" id="regName" placeholder="Aïssatou Diallo" autocomplete="name"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label for="regEmail">Adresse email</label>' +
      '<input class="input" id="regEmail" type="email" placeholder="vous@exemple.gn" autocomplete="email"></div>' +
      '<div class="field"><label for="regPhone">Téléphone</label>' +
      '<input class="input" id="regPhone" placeholder="+224 6.. .. .. .." autocomplete="tel"></div>' +
      '</div>' +
      '<div class="field-row">' +
      '<div class="field"><label for="regZone">Commune</label><select class="select" id="regZone">' +
      zones.map((z) => '<option value="' + esc(z) + '">' + esc(z) + '</option>').join('') +
      '</select></div>' +
      '<div class="field"><label for="regAddress">Quartier</label>' +
      '<input class="input" id="regAddress" placeholder="Nongo, Lambanyi..."></div>' +
      '</div>' +
      '<div class="field mb"><label for="regPassword">Mot de passe</label>' +
      '<input class="input" id="regPassword" type="password" placeholder="6 caractères minimum" autocomplete="new-password"></div>' +
      '<div class="modal-foot">' +
      '<button type="button" class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
      '<button type="submit" class="btn btn-primary"><i class="fa-solid fa-user-plus"></i> Créer mon compte</button>' +
      '</div>' +
      '</form>',
    { size: 'md' }
  );
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById('regName').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      password: document.getElementById('regPassword').value,
      phone: document.getElementById('regPhone').value.trim(),
      zone: document.getElementById('regZone').value,
      address: document.getElementById('regAddress').value.trim()
    };
    try {
      const data = await api('/api/auth/register', { method: 'POST', body: body });
      closeModal();
      persistSession({ token: data.token, user: data.user });
      await loadData();
      location.hash = '#/' + firstAllowedRoute();
      toast('Bienvenue ' + String(data.user.name || '').split(' ')[0]);
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

/* Enregistrement de la page dans le routeur */
pages['boutique'] = renderBoutique;
pages['panier'] = renderPanier;
pages['ma-peinture'] = renderMaPeinture;
pages['planning'] = renderPlanning;
