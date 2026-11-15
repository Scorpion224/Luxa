/**
 * État applicatif, session, rôles et permissions.
 */

import { syncSessionUI } from '../auth/login.js';

export const state = {
  company: null,
  session: null,
  roles: null,
  route: 'devis',
  token: 0,
  draft: null,
  products: [],
  clients: [],
  catalogue: { category: 'FOM intérieurs', view: 'grid', search: '', sort: 'name' },
  quotes: { page: 1, sort: 'recent' },
  payment: { tab: 'flex', quoteId: null },
  clientsSearch: '',
  stocksSearch: ''
};

export const SESSION_KEY = 'ppg.session';
export const APP_VERSION = '3.0';
export const APP_BUILD = 'b9';
export const NETLOG = [];
export const MODULE_PERMISSION = {
  devis: 'devis:read',
  catalogue: 'catalogue:read',
  clients: 'clients:read',
  stocks: 'stocks:read',
  chantiers: 'chantiers:read',
  finance: 'finance:read',
  paiement: 'paiement:read',
  boutique: 'boutique:read',
  panier: 'panier:write',
  'ma-peinture': 'portail:read',
  planning: 'planning:read',
  commandes: 'commande:read'
};
export const ROUTE_MODULE = {
  devis: 'devis',
  'devis/nouveau': 'devis',
  catalogue: 'catalogue',
  clients: 'clients',
  stocks: 'stocks',
  chantiers: 'chantiers',
  finance: 'finance',
  paiement: 'paiement',
  boutique: 'boutique',
  panier: 'panier',
  'ma-peinture': 'ma-peinture',
  planning: 'planning',
  commandes: 'commandes'
};

export const DEMO_KEY = 'ppg.demoRole';
export function loadDemoRole() {
  try {
    return localStorage.getItem(DEMO_KEY) || '';
  } catch (err) {
    return '';
  }
}
export function saveDemoRole(role) {
  try {
    if (role) localStorage.setItem(DEMO_KEY, role);
    else localStorage.removeItem(DEMO_KEY);
  } catch (err) {}
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch (err) {
    return null;
  }
}
export function persistSession(session) {
  state.session = session;
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    /* stockage indisponible : session en mémoire seulement */
  }
  syncSessionUI();
}
export const currentUser = () => (state.session && state.session.user) || null;

export function can(permission) {
  const user = currentUser();
  if (!user) return false;
  const perms = user.permissions || [];
  return perms.includes('*') || perms.includes(permission);
}
export const canModule = (moduleKey) => can(MODULE_PERMISSION[moduleKey] || '');
export const CLIENT_MODULES = ['boutique', 'panier', 'ma-peinture'];
export const isClientUser = () => !!currentUser() && currentUser().role === 'client';
export function canRoute(route) {
  const mod = ROUTE_MODULE[route];
  if (!mod) return true;
  const clientOnly = CLIENT_MODULES.indexOf(mod) !== -1;
  if (clientOnly !== isClientUser()) return false;
  if (!canModule(mod)) return false;
  if (route === 'devis/nouveau') return can('devis:write');
  return true;
}
export function firstAllowedRoute() {
  const order = [
    'boutique',
    'panier',
    'ma-peinture',
    'devis',
    'catalogue',
    'clients',
    'stocks',
    'chantiers',
    'finance',
    'paiement',
    'commandes',
    'planning'
  ];
  return order.find((r) => canRoute(r)) || 'devis';
}

export function initialsOf(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
