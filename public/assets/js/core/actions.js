/**
 * Actions déclenchées par les boutons de l'interface.
 */

import { api, toast, todayIso } from './format.js';
import { firstAllowedRoute, state } from './state.js';
import { go, render } from './router.js';
import { closeUserMenu, signIn } from '../auth/login.js';
import { ensureDraft, paintRooms, recalcDraft } from '../pages/nouveau-devis.js';
import { openChantierForm } from '../pages/chantiers.js';
import {
  closeModal,
  openChantierUpdate,
  openClient,
  openClientForm,
  openPaymentForm,
  openProduct,
  openProductPicker,
  openQuote
} from '../ui/modals.js';
import { printQuote } from '../ui/print.js';
import {
  addToCart,
  advanceFinancing,
  checkoutCart,
  clearCart,
  decideBooking,
  openBookingModal,
  openFlexModal,
  openRegisterModal,
  portalRoomRow,
  portalState,
  setCartQty,
  setOrderStatus
} from '../pages/espace-client.js';
import { actions } from './registry.js';

Object.assign(actions, {
  go(el) {
    go(el.dataset.route);
  },
  'modal-close'() {
    closeModal();
  },
  'new-quote'() {
    go('devis/nouveau');
  },
  'open-register'() {
    openRegisterModal();
  },
  'preview-client'() {
    closeUserMenu();
    closeModal();
    signIn('client@peinturepro.gn', 'client123')
      .then(() => {
        location.hash = '#/ma-peinture';
      })
      .catch((err) => toast(err.message, 'error'));
  },
  'shop-category'(el) {
    portalState().category = el.dataset.category;
    render();
  },
  'add-cart'(el) {
    addToCart(el.dataset.id, 1).catch((err) => toast(err.message, 'error'));
  },
  'cart-inc'(el) {
    const cart = portalState().me && portalState().me.cart;
    const item = cart && cart.items.find((i) => i.productId === el.dataset.id);
    setCartQty(el.dataset.id, (item ? item.qty : 1) + 1).catch((err) => toast(err.message, 'error'));
  },
  'cart-dec'(el) {
    const cart = portalState().me && portalState().me.cart;
    const item = cart && cart.items.find((i) => i.productId === el.dataset.id);
    setCartQty(el.dataset.id, (item ? item.qty : 1) - 1).catch((err) => toast(err.message, 'error'));
  },
  'cart-remove'(el) {
    setCartQty(el.dataset.id, 0).catch((err) => toast(err.message, 'error'));
  },
  'cart-clear'() {
    clearCart().catch((err) => toast(err.message, 'error'));
  },
  'cart-checkout'(el) {
    checkoutCart(el.dataset.mode);
  },
  'portal-select-quote'(el) {
    portalState().quoteId = el.dataset.quote;
    render();
  },
  'portal-flex-request'(el) {
    const me = portalState().me;
    const quote = ((me && me.quotes) || []).find((q) => q.id === el.dataset.quote);
    if (quote) openFlexModal(quote);
  },
  'portal-room-add'() {
    const host = document.getElementById('portalRooms');
    if (!host) return;
    const div = document.createElement('div');
    div.innerHTML = portalRoomRow({ doors: 1, windows: 1 });
    host.appendChild(div.firstChild);
    const last = host.lastElementChild;
    last.querySelector('[data-room-name]').value = 'Pièce ' + host.children.length;
    last.querySelector('[data-room-l]').focus();
  },
  'portal-room-remove'(el) {
    const host = document.getElementById('portalRooms');
    const row = el.closest('[data-room]');
    if (host && row && host.children.length > 1) row.remove();
    else if (row) toast('Gardez au moins une pièce dans votre demande', 'error');
  },
  'portal-goto-calendar'() {
    const card = document.querySelector('.cal-anchor');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
  'portal-pick-day'(el) {
    portalState().day = el.dataset.date;
    render();
  },
  'portal-book'(el) {
    openBookingModal(el.dataset.date, el.dataset.slot);
  },
  'portal-financing-send'(el) {
    advanceFinancing(el.dataset.quote, 'Dossier transmis à la banque');
  },
  'portal-financing-decide'(el) {
    advanceFinancing(el.dataset.quote, 'Décision de la banque enregistrée');
  },
  'planning-decide'(el) {
    decideBooking(el.dataset.id, el.dataset.status);
  },
  'order-status'(el) {
    setOrderStatus(el.dataset.id, el.dataset.status);
  },
  'catalogue-category'(el) {
    state.catalogue.category = el.dataset.category;
    state.catalogue.search = '';
    go('catalogue');
  },
  'catalogue-view'(el) {
    state.catalogue.view = el.dataset.view;
    render();
  },
  'product-open'(el) {
    openProduct(el.dataset.id);
  },
  'product-use'(el) {
    closeModal();
    const product = state.products.find((p) => p.id === el.dataset.id);
    if (product) {
      state.draft = state.draft || {};
      ensureDraft().then((d) => {
        d.productId = product.id;
        d.finish = 'Finition ' + (product.finish || 'mate').toLowerCase() + ' • Blanc Cassé';
        d.assumptions.rendement = product.rendement || d.assumptions.rendement;
        go('devis/nouveau');
        setTimeout(recalcDraft, 120);
      });
    } else {
      go('devis/nouveau');
    }
  },
  'pick-product'() {
    openProductPicker();
  },
  'product-pick'(el) {
    const product = state.products.find((p) => p.id === el.dataset.id);
    if (!product) return;
    const d = state.draft;
    d.productId = product.id;
    d.finish = 'Finition ' + (product.finish || 'mate').toLowerCase() + ' • Blanc Cassé';
    d.assumptions.rendement = product.rendement || d.assumptions.rendement;
    closeModal();
    recalcDraft();
    toast('Produit mis à jour');
  },
  'room-add'() {
    const d = state.draft;
    d.stored = false;
    d.rooms.push({
      id: 'r' + (Date.now() % 100000),
      name: 'Pièce ' + (d.rooms.length + 1),
      length: 4,
      width: 3.5,
      height: 3,
      doors: 1,
      windows: 1
    });
    paintRooms();
    recalcDraft();
  },
  'room-remove'(el) {
    const d = state.draft;
    if (d.rooms.length === 1) return toast('Conservez au moins une pièce', 'error');
    d.rooms = d.rooms.filter((r) => r.id !== el.dataset.room);
    paintRooms();
    recalcDraft();
  },
  'room-toggle'(el) {
    const box = el.closest('.room-box');
    box.classList.toggle('collapsed');
    const icon = el.querySelector('i');
    const collapsed = box.classList.contains('collapsed');
    if (icon) icon.className = 'fa-solid ' + (collapsed ? 'fa-chevron-down' : 'fa-chevron-up');
    const content = box.querySelector('.room-content');
    if (content) content.style.display = collapsed ? 'none' : '';
  },
  'room-step'(el) {
    const d = state.draft;
    const room = d.rooms.find((r) => r.id === el.dataset.room);
    if (!room) return;
    const field = el.dataset.field;
    room[field] = Math.max(0, (Number(room[field]) || 0) + Number(el.dataset.delta));
    const val = document.querySelector('[data-room-val="' + field + '-' + room.id + '"]');
    if (val) val.textContent = room[field];
    recalcDraft();
  },
  async 'quote-save'() {
    const d = state.draft;
    if (!d) return;
    try {
      await ensureDraft();
      const quote = await api('/api/quotes', {
        method: 'POST',
        body: {
          clientId: d.clientId,
          subject: 'Devis ' + d.rooms.map((r) => r.name).join(', '),
          site: (state.clients.find((c) => c.id === d.clientId) || {}).city || 'Conakry',
          rooms: d.rooms,
          productId: d.productId,
          finish: d.finish,
          lines: d.lines,
          surface: d.surface,
          tvaRate: d.assumptions.tvaRate,
          tvaEnabled: d.tvaEnabled,
          tvaAmount: d.tvaAmount,
          total: d.total
        }
      });
      state.draft = null;
      toast('Devis ' + quote.id + ' enregistré');
      go('devis');
    } catch (err) {
      toast(err.message, 'error');
    }
  },
  async 'quote-pdf'(el) {
    let quote;
    if (el && el.dataset.id) {
      quote = await api('/api/quotes/' + encodeURIComponent(el.dataset.id));
    } else {
      const d = await ensureDraft();
      quote = Object.assign(
        {
          id: 'BROUILLON',
          clientName: (state.clients.find((c) => c.id === d.clientId) || {}).name || '—',
          subject: 'Devis ' + d.rooms.map((r) => r.name).join(', '),
          createdAt: todayIso(),
          notes: ''
        },
        d
      );
    }
    printQuote(quote);
  },
  'quotes-page'(el) {
    state.quotes.page = Number(el.dataset.page) || 1;
    render();
  },
  'quote-open'(el) {
    openQuote(el.dataset.id);
  },
  'quote-pay'(el) {
    closeModal();
    openPaymentForm({ quoteId: el.dataset.id });
  },
  'client-open'(el) {
    openClient(el.dataset.id);
  },
  'client-new'() {
    openClientForm();
  },
  async 'client-save'() {
    const body = {
      name: (document.getElementById('fName') || {}).value,
      contact: (document.getElementById('fContact') || {}).value,
      phone: (document.getElementById('fPhone') || {}).value,
      email: (document.getElementById('fEmail') || {}).value,
      city: (document.getElementById('fCity') || {}).value,
      company: (document.getElementById('fCompany') || {}).value || null,
      type: (document.getElementById('fType') || {}).value
    };
    if (!body.name) return toast('Le nom est obligatoire', 'error');
    try {
      await api('/api/clients', { method: 'POST', body });
      closeModal();
      toast('Client créé');
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  },
  async 'stock-adjust'(el) {
    try {
      await api('/api/products/' + encodeURIComponent(el.dataset.id) + '/stock', {
        method: 'PATCH',
        body: { delta: Number(el.dataset.delta) }
      });
      const p = state.products.find((x) => x.id === el.dataset.id);
      if (p) p.stock += Number(el.dataset.delta);
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  },
  'chantier-update'(el) {
    openChantierUpdate(el.dataset.id);
  },
  'chantier-new-open'() {
    openChantierForm();
  },
  'go-home'() {
    go(firstAllowedRoute());
  },
  async 'flex-setup'(el) {
    const select = document.getElementById('flexMonthsSetup') || document.getElementById('flexMonths');
    const months = select ? Number(select.value) : 6;
    try {
      el.setAttribute('disabled', 'disabled');
      await api('/api/payments/' + encodeURIComponent(state.payment.quoteId) + '/schedule', {
        method: 'POST',
        body: { months: months }
      });
      toast('Échéancier PEINTURE FLEX créé sur ' + months + ' mois');
      render();
    } catch (err) {
      el.removeAttribute('disabled');
      toast(err.message, 'error');
    }
  },
  async 'chantier-save'(el) {
    try {
      await api('/api/chantiers/' + encodeURIComponent(el.dataset.id), {
        method: 'PATCH',
        body: {
          progress: Number(document.getElementById('chProgress').value),
          status: document.getElementById('chStatus').value,
          spent: Number(document.getElementById('chSpent').value),
          chef: document.getElementById('chChef').value
        }
      });
      closeModal();
      toast('Chantier mis à jour');
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  },
  async 'chantier-new'() {
    const body = {
      name: document.getElementById('newChantierName').value,
      clientId: document.getElementById('newChantierClient').value,
      budget: Number(document.getElementById('newChantierBudget').value) || 0,
      startDate: document.getElementById('newChantierStart').value,
      endDate: document.getElementById('newChantierEnd').value || null,
      chef: document.getElementById('newChantierChef').value || '—'
    };
    if (!body.name) return toast('Le nom du chantier est obligatoire', 'error');
    try {
      await api('/api/chantiers', { method: 'POST', body });
      closeModal();
      toast('Chantier créé');
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  },
  'payment-tab'(el) {
    state.payment.tab = el.dataset.tab;
    render();
  },
  'payment-new'() {
    openPaymentForm({ quoteId: state.payment.quoteId });
  },
  'payment-step'(el) {
    const quoteId = state.payment.quoteId;
    if (!quoteId) return;
    api('/api/payments/' + encodeURIComponent(quoteId)).then((data) => {
      const step = (data.schedule || []).find((s) => s.id === el.dataset.step);
      if (!step || step.status === 'paye') return;
      openPaymentForm({ quoteId, amount: step.amount || '' });
      setTimeout(() => {
        const sel = document.getElementById('pStep');
        if (sel) sel.value = step.id;
      }, 250);
    });
  },
  async 'payment-save'(el) {
    const quoteId = el.dataset.quote;
    const body = {
      amount: Number(document.getElementById('pAmount').value),
      date: document.getElementById('pDate').value,
      method: document.getElementById('pMethod').value,
      reference: document.getElementById('pRef').value,
      notes: (document.getElementById('pNotes') || {}).value || '',
      stepId: (document.getElementById('pStep') || {}).value || null
    };
    if (!body.amount) return toast('Saisissez un montant', 'error');
    try {
      await api('/api/payments/' + encodeURIComponent(quoteId) + '/pay', { method: 'POST', body });
      closeModal();
      toast('Paiement enregistré');
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  },
  'finance-pay'() {
    api('/api/payments/quotes').then((list) => {
      if (!list.length) return toast('Aucun devis à encaisser', 'error');
      state.payment.quoteId = state.payment.quoteId || list[0].id;
      openPaymentForm({ quoteId: state.payment.quoteId });
    });
  },
  'financing-advance'() {
    const q = state.payment.quoteId;
    api('/api/payments/' + encodeURIComponent(q) + '/financing/advance', { method: 'POST' })
      .then(() => {
        toast('Dossier transmis à la banque');
        render();
      })
      .catch((err) => toast(err.message, 'error'));
  }
});
