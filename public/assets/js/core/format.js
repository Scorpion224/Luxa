/**
 * Formatage des nombres, montants GNF, dates, échappement HTML.
 */

import { toastRoot } from '../ui/dom.js';
import { NETLOG, state } from './state.js';
import { signOut } from '../auth/login.js';

export const nf = new Intl.NumberFormat('fr-FR');

export const fmt = (n) => nf.format(Math.round(Number(n) || 0));
export const money = (n) => fmt(n) + ' GNF';
export const dec = (n) => {
  const value = Number(n) || 0;
  return (Math.round(value * 10) / 10).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });
};
export const n1 = (n) => (Number(n) || 0).toFixed(1).replace('.', ',');
export const parseNum = (v) => Number(String(v == null ? '' : v).replace(',', '.')) || 0;
export const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function parseDate(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const parts = raw.split('-').map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(value);
}
export function dateFr(value) {
  const d = parseDate(value);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function dateShort(value) {
  const d = parseDate(value);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function pushNetlog(entry) {
  NETLOG.push(entry);
  if (NETLOG.length > 8) NETLOG.shift();
  renderNetlog();
}

export function renderNetlog() {
  const box = document.getElementById('authLog');
  if (!box) return;
  box.textContent = NETLOG.length
    ? NETLOG.map((e) => e).join('\n')
    : 'aucun échange avec le serveur pour le moment';
}

export async function api(path, options) {
  const opts = Object.assign({ headers: {} }, options || {});
  const method = (opts.method || 'GET').toUpperCase();
  const started = Date.now();
  const token = state.session && state.session.token;
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  if (opts.body && typeof opts.body !== 'string') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  let res;
  try {
    res = await fetch(path, opts);
  } catch (err) {
    pushNetlog(method + ' ' + path + ' → réseau indisponible (' + ((err && err.message) || 'inconnu') + ')');
    throw new Error('Serveur injoignable — vérifiez que l’application est démarrée (npm start)');
  }
  pushNetlog(method + ' ' + path + ' → ' + res.status + ' en ' + (Date.now() - started) + ' ms');
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('Réponse illisible du serveur (HTTP ' + res.status + ')');
    }
  }
  if (res.status === 401 && !String(path).startsWith('/api/auth/')) {
    state.authNotice = 'Votre session a expiré — reconnectez-vous en un clic sur un espace ci-dessous.';
    signOut(true);
    const expired = new Error('Session expirée, veuillez vous reconnecter');
    expired.status = 401;
    throw expired;
  }
  if (!res.ok) {
    const error = new Error((data && data.error) || 'Erreur serveur (HTTP ' + res.status + ')');
    error.status = res.status;
    throw error;
  }
  return data;
}

export function toast(message, type) {
  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'success');
  el.innerHTML =
    '<i class="fa-solid ' +
    (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check') +
    '"></i><span>' +
    esc(message) +
    '</span>';
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s ease';
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

export const STATUS_LABEL = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  en_retard: 'En retard'
};
export const METHOD_LABEL = {
  especes: 'Espèces',
  virement: 'Virement',
  mobile_money: 'Mobile Money',
  cheque: 'Chèque'
};
export const CHANTIER_LABEL = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé'
};

export const badge = (status, label) => {
  const text = label || STATUS_LABEL[status] || status;
  const dot = ['brouillon', 'envoye', 'accepte', 'refuse', 'en_retard'].includes(status)
    ? '<i class="dot"></i>'
    : '';
  return '<span class="badge ' + status + '">' + dot + esc(text) + '</span>';
};
