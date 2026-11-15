/**
 * Routage par hash et navigation.
 */

import { emptyState, pageHead, view, wrapTables } from '../ui/dom.js';
import { canRoute, firstAllowedRoute, state } from './state.js';
import { accessDenied, renderLoginScreen, syncSessionUI } from '../auth/login.js';
import { wire } from '../ui/wire.js';
import { pages } from './registry.js';

export function getRoute() {
  const hash = (location.hash || '').replace(/^#\/?/, '').trim();
  if (!hash) return 'devis';
  return hash;
}
export function go(route) {
  if (getRoute() === route) render();
  else location.hash = '#/' + route;
}
export function setActiveNav(route) {
  const base = route.startsWith('devis') ? 'devis' : route.split('/')[0];
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.nav === base);
  });
}

export async function render() {
  syncSessionUI();
  if (!state.session) {
    renderLoginScreen();
    return;
  }
  const route = getRoute();
  state.route = route;
  const token = ++state.token;
  if (!location.hash && !canRoute(route)) {
    location.hash = '#/' + firstAllowedRoute();
    return;
  }
  if (!canRoute(route)) {
    view.innerHTML = accessDenied();
    setActiveNav(route);
    return;
  }
  const renderer = pages[route] || pageNotFound;
  try {
    const html = await renderer();
    if (token !== state.token) return;
    view.innerHTML = html;
    wrapTables();
    setActiveNav(route);
    wire();
    view.scrollTop = 0;
  } catch (err) {
    if (token !== state.token) return;
    if (!state.session) {
      syncSessionUI();
      renderLoginScreen();
      return;
    }
    view.innerHTML =
      pageHead({ title: 'Une erreur est survenue', sub: err.message }) +
      '<div class="page-body"><div class="card">' +
      emptyState('fa-triangle-exclamation', err.message) +
      '</div></div>';
  }
}

export function pageNotFound() {
  return (
    pageHead({ title: 'Page introuvable', sub: 'Revenez au tableau de bord.' }) +
    '<div class="page-body"><div class="card">' +
    emptyState('fa-compass', 'Cette page n’existe pas') +
    '</div></div>'
  );
}
