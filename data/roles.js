/**
 * Rôles et permissions — Peinture Pro Guinée
 * Un rôle = un ensemble de permissions "module:action".
 * Le rôle `admin` dispose du joker `*` (toutes les permissions).
 */

const ROLE_LABEL = {
  admin: 'Administrateur',
  commercial: 'Commercial',
  comptable: 'Comptable',
  stockiste: 'Stockiste',
  client: 'Client'
};

const ROLE_SUMMARY = {
  admin: 'Accès complet : devis, catalogue, clients, stocks, chantiers, finance et comptes utilisateurs.',
  commercial: 'Prospection et vente : devis, clients, consultation du catalogue, planning des équipes.',
  comptable: 'Encaissements et suivi financier : paiements, factures, synthèse financière.',
  stockiste: 'Gestion du magasin : niveaux de stock, ajustements et catalogue produits.',
  client:
    'Espace client : demande de devis, boutique et panier, financement PEINTURE FLEX et réservation d’une équipe.'
};

const ROLE_PERMISSIONS = {
  admin: ['*'],
  commercial: [
    'devis:read',
    'devis:write',
    'catalogue:read',
    'clients:read',
    'clients:write',
    'chantiers:read',
    'paiement:read',
    'planning:read',
    'planning:manage',
    'commande:read',
    'commande:write'
  ],
  comptable: [
    'devis:read',
    'clients:read',
    'chantiers:read',
    'paiement:read',
    'paiement:write',
    'finance:read',
    'finance:write',
    'planning:read',
    'commande:read'
  ],
  stockiste: [
    'catalogue:read',
    'catalogue:write',
    'stocks:read',
    'stocks:write',
    'chantiers:read',
    'commande:read',
    'commande:write'
  ],
  client: [
    'portail:read',
    'boutique:read',
    'panier:write',
    'commande:write',
    'commande:read',
    'demande:write',
    'reservation:write'
  ]
};

/** Modules de l'application et permission de lecture associée (utilisée par la navigation). */
const MODULES = [
  { key: 'boutique', label: 'Boutique', read: 'boutique:read' },
  { key: 'panier', label: 'Mon panier', read: 'panier:write' },
  { key: 'ma-peinture', label: 'Ma peinture', read: 'portail:read' },
  { key: 'devis', label: 'Devis', read: 'devis:read' },
  { key: 'catalogue', label: 'Catalogue', read: 'catalogue:read' },
  { key: 'clients', label: 'Clients', read: 'clients:read' },
  { key: 'stocks', label: 'Stocks', read: 'stocks:read' },
  { key: 'chantiers', label: 'Chantiers', read: 'chantiers:read' },
  { key: 'finance', label: 'Finance', read: 'finance:read' },
  { key: 'paiement', label: 'Parcours de paiement', read: 'paiement:read' },
  { key: 'commandes', label: 'Commandes', read: 'commande:read' },
  { key: 'planning', label: 'Planning', read: 'planning:read' }
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
  ROLE_LABEL,
  ROLE_SUMMARY,
  ROLE_PERMISSIONS,
  MODULES,
  permissionsFor,
  can,
  canAccessModule
};
