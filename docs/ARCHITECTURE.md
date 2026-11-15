# Architecture

Peinture Pro Guinée est une application **monopage (SPA) + API REST**, sans étape de
compilation : le navigateur charge directement des modules JavaScript natifs
(ES modules) et le serveur est un Express classique en CommonJS.

```
.
├── server.js              point d'entrée historique → server/index.js
├── server/                API REST (Express)
│   ├── index.js           démarrage HTTP
│   ├── app.js             middlewares, montage des routeurs, repli SPA
│   ├── config.js          port, chemins, version applicative
│   ├── store/             base de données locale (data/db.json)
│   ├── lib/               logique métier réutilisable (devis, auth, domaine)
│   └── routes/            un fichier par domaine fonctionnel
├── data/                  jeu de données de démonstration (seed, rôles, FLEX, planning)
├── public/                interface (servie telle quelle)
│   ├── index.html         coquille HTML
│   └── assets/
│       ├── css/           feuilles de style par domaine
│       ├── js/            modules ES de l'interface
│       └── vendor/        Font Awesome
├── tests/                 tests automatisés (node:test + tests navigateur)
└── docs/                  documentation
```

## Serveur

| Dossier | Rôle |
|---|---|
| `server/store/database.js` | charge `data/db.json`, l'amorce depuis `data/seed.js`, applique les migrations douces et sauvegarde. Exporte `db` et `save()`. |
| `server/lib/quotes.js` | calcul pur des devis (pièces, surfaces, postes, TVA) — aucune dépendance HTTP. |
| `server/lib/auth.js` | utilisateurs publics, sessions persistées, cookies `HttpOnly`, `requirePermission()`. |
| `server/lib/domain.js` | helpers métier partagés : panier, financement PEINTURE FLEX, finances. |
| `server/routes/*.js` | un routeur Express par domaine ; chacun est monté dans `server/app.js`. |

**Ajouter une route** : créer le fichier dans `server/routes/`, y déclarer un
`express.Router()`, puis l'ajouter à la liste des `app.use(...)` de `server/app.js`.

**Règles de permission** : chaque route sensible passe par
`requirePermission('domaine:action')`. La matrice est définie dans `data/roles.js`.

## Interface

| Dossier | Rôle |
|---|---|
| `public/assets/js/core/` | configuration, formatage, état, appels HTTP, routage, registre. |
| `public/assets/js/ui/` | composants d'interface : gabarits, modales, impression, câblage. |
| `public/assets/js/auth/` | écran de connexion et cycle de session. |
| `public/assets/js/pages/` | une page = un module qui exporte son rendu et s'enregistre. |
| `public/assets/js/main.js` | point d'entrée : écouteurs globaux + démarrage. |

### Principe du registre

Le routeur ne connaît pas les pages : chaque module de page s'enregistre lui-même.

```js
// public/assets/js/pages/clients.js
import { pages } from '../core/registry.js';

export async function renderClients() { /* … */ }

pages['clients'] = renderClients;
```

Cela évite les imports circulaires entre le routeur et les pages. Les actions
(boutons `data-action="…"`) suivent le même principe dans `core/actions.js`.

**Ajouter une page** :

1. créer `public/assets/js/pages/ma-page.js` avec `export async function renderMaPage()`
   et `pages['ma-page'] = renderMaPage;` ;
2. l'importer dans `public/assets/js/main.js` ;
3. ajouter l'entrée dans la navigation (`public/index.html`) et la permission
   correspondante dans `data/roles.js`.

## Flux de données

1. `main.js` restaure la session (`/api/auth/me`, jeton `localStorage` ou cookie).
2. Le routeur (`core/router.js`) lit `location.hash` et appelle la page enregistrée.
3. La page interroge l'API via `api()` (`core/format.js`), qui ajoute le jeton et
   journalise les échanges.
4. Les actions (`core/actions.js`) modifient l'état puis rappellent `render()`.

## Conventions

- Interface en français, montants en GNF (`48 600 000 GNF`), décimales à la virgule.
- Un module = une responsabilité ; pas de dépendance circulaire hors registre.
- `npm run lint` doit rester vert avant toute proposition de modification.
- Aucun mot de passe ne sort de l'API (`publicUser()` retire le champ).
