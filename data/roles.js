/**
 * Rôles et permissions — Peinture Pro Guinée
 * Un rôle = un ensemble de permissions "module:action".
 * Le rôle `admin` dispose du joker `*` (toutes les permissions).
 */

const ROLE_LABEL = {
  admin: 'Administrateur',
  commercial: 'Commercial',
  comptable: 'Comptable',
  stockiste: 'Stockiste'
};

const ROLE_SUMMARY = {
  admin: 'Accès complet : devis, catalogue, clients, stocks, chantiers, finance et comptes utilisateurs.',
  commercial: 'Prospection et vente : devis, clients, consultation du catalogue et des chantiers.',
  comptable: 'Encaissements et suivi financier : paiements, factures, synthèse financière.',
  stockiste: 'Gestion du magasin : niveaux de stock, ajustements et catalogue produits.'
};

const ROLE_PERMISSIONS = {
  admin: ['*'],
  commercial: [
    'devis:read', 'devis:write',
    'catalogue:read',
    'clients:read', 'clients:write',
    'chantiers:read',
    'paiement:read'
  ],
  comptable: [
    'devis:read',
    'clients:read',
    'chantiers:read',
    'paiement:read', 'paiement:write',
    'finance:read', 'finance:write'
  ],
  stockiste: [
    'catalogue:read', 'catalogue:write',
    'stocks:read', 'stocks:write',
    'chantiers:read'
  ]
};

/** Modules de l'application et permission de lecture associée (utilisée par la navigation). */
const MODULES = [
  { key: 'devis', label: 'Devis', read: 'devis:read' },
  { key: 'catalogue', label: 'Catalogue', read: 'catalogue:read' },
  { key: 'clients', label: 'Clients', read: 'clients:read' },
  { key: 'stocks', label: 'Stocks', read: 'stocks:read' },
  { key: 'chantiers', label: 'Chantiers', read: 'chantiers:read' },
  { key: 'finance', label: 'Finance', read: 'finance:read' },
  { key: 'paiement', label: 'Parcours de paiement', read: 'paiement:read' }
];

function permissionsFor(role) {
  return (ROLE_PERMISSIONS[role] || []).slice();
}

function can(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

function canAccessModule(role, moduleKey) {
  const mod = MODULES.find((m) => m.key === moduleKey);
  return mod ? can(role, mod.read) : false;
}

module.exports = {
  ROLE_LABEL, ROLE_SUMMARY, ROLE_PERMISSIONS, MODULES,
  permissionsFor, can, canAccessModule
};
