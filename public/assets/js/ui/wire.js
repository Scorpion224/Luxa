/**
 * Câblage des événements de chaque page.
 */

import { actions } from '../core/registry.js';

import { api, money, toast } from '../core/format.js';
import { state } from '../core/state.js';
import { go, render } from '../core/router.js';
import { recalcDraft, wireRoomInputs } from '../pages/nouveau-devis.js';

import { portalState, submitPortalQuote } from '../pages/espace-client.js';

export function wire() {
  const route = state.route;

  if (route === 'devis') {
    const sort = document.getElementById('quoteSort');
    if (sort)
      sort.addEventListener('change', () => {
        state.quotes.sort = sort.value;
        state.quotes.page = 1;
        render();
      });
    const quick = document.getElementById('quickSearch');
    if (quick) {
      quick.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && quick.value.trim()) {
          state.catalogue.search = quick.value.trim();
          go('catalogue');
        }
      });
    }
  }

  if (route === 'catalogue') {
    const search = document.getElementById('catalogueSearch');
    if (search) {
      let t = null;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.catalogue.search = search.value;
          render();
        }, 260);
      });
    }
    const sort = document.getElementById('catalogueSort');
    if (sort)
      sort.addEventListener('change', () => {
        state.catalogue.sort = sort.value;
        render();
      });
  }

  if (route === 'boutique') {
    const search = document.getElementById('shopSearch');
    if (search) {
      let t = null;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          portalState().search = search.value;
          render();
          const next = document.getElementById('shopSearch');
          if (next) {
            next.focus();
            next.setSelectionRange(next.value.length, next.value.length);
          }
        }, 260);
      });
    }
  }

  if (route === 'ma-peinture') {
    const form = document.getElementById('portalQuoteForm');
    if (form)
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitPortalQuote(form);
      });
  }

  if (route === 'clients') {
    const search = document.getElementById('clientsSearch');
    if (search) {
      let t = null;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.clientsSearch = search.value;
          render();
          document.getElementById('clientsSearch').focus();
        }, 260);
      });
    }
  }

  if (route === 'stocks') {
    const search = document.getElementById('stocksSearch');
    if (search) {
      let t = null;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.stocksSearch = search.value;
          render();
        }, 260);
      });
    }
  }

  if (route === 'devis/nouveau') {
    const d = state.draft;
    if (!d) return;
    const clientSelect = document.getElementById('draftClient');
    if (clientSelect) {
      clientSelect.addEventListener('change', () => {
        d.clientId = clientSelect.value;
      });
    }
    const tvaToggle = document.getElementById('tvaToggle');
    if (tvaToggle) {
      tvaToggle.addEventListener('change', () => {
        d.tvaEnabled = tvaToggle.checked;
        recalcDraft();
      });
    }
    const tvaRate = document.getElementById('tvaRate');
    if (tvaRate) {
      tvaRate.addEventListener('change', () => {
        d.assumptions.tvaRate = Number(tvaRate.value) / 100;
        d.tvaRate = d.assumptions.tvaRate;
        recalcDraft();
      });
    }
    wireRoomInputs();
  }

  if (route === 'paiement') {
    const sel = document.getElementById('paymentQuote');
    if (sel) {
      sel.addEventListener('change', () => {
        state.payment.quoteId = sel.value;
        render();
      });
    }
    const setupMonths = document.getElementById('flexMonthsSetup');
    if (setupMonths) {
      setupMonths.addEventListener('change', () => {
        const preview = document.querySelector('.flex-setup-amount');
        if (!preview) return;
        const total = Number(state.payment.total || 0);
        const financed = Math.max(0, total - Math.min(250000, total));
        const n = Number(setupMonths.value) || 1;
        const monthly = Math.round((financed * (1 + 0.01 * n)) / n);
        preview.textContent = '≈ ' + money(monthly) + ' / mois sur ' + n + ' mois';
      });
    }
    const planMonths = document.getElementById('flexMonths');
    if (planMonths) {
      planMonths.addEventListener('change', async () => {
        const months = Number(planMonths.value);
        try {
          await api('/api/payments/' + encodeURIComponent(state.payment.quoteId) + '/schedule', {
            method: 'POST',
            body: { months: months }
          });
          toast('Durée du crédit mise à jour : ' + months + ' mois');
          render();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }
  }
}

actions['hard-reset'] = () => {
  try {
    localStorage.clear();
  } catch (err) {}
  try {
    sessionStorage.clear();
  } catch (err) {}
  try {
    if (window.caches && caches.keys) {
      caches
        .keys()
        .then((keys) => keys.forEach((k) => caches.delete(k)))
        .catch(() => {});
    }
  } catch (err) {}
  location.replace(location.pathname + '?v=' + Date.now());
};
