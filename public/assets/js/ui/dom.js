/**
 * Références aux conteneurs principaux de l'interface.
 */

import { esc } from '../core/format.js';

/* Utilitaires                                                             */
export const view = document.getElementById('view');
export const modalRoot = document.getElementById('modalRoot');
export const toastRoot = document.getElementById('toasts');
export const printRoot = document.getElementById('printRoot');

export function pageHead(opts) {
  const crumbs = opts.breadcrumb ? '<div class="breadcrumb">' + opts.breadcrumb + '</div>' : '';
  return (
    '<div class="page-head' +
    (opts.breadcrumb ? ' with-crumb' : '') +
    '">' +
    crumbs +
    '<h1>' +
    opts.title +
    '</h1>' +
    (opts.sub ? '<p class="sub">' + opts.sub + '</p>' : '') +
    '</div>'
  );
}

export function emptyState(icon, text) {
  return '<div class="empty"><i class="fa-solid ' + icon + '"></i>' + esc(text) + '</div>';
}

export function wrapTables() {
  view.querySelectorAll('table.data').forEach((t) => {
    if (t.parentElement && t.parentElement.classList.contains('table-scroll')) return;
    const box = document.createElement('div');
    box.className = 'table-scroll';
    t.parentNode.insertBefore(box, t);
    box.appendChild(t);
  });
}
