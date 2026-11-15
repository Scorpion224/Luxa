# Contribuer

## Installation

```bash
npm install
npm run dev      # démarre le serveur avec rechargement automatique
```

L'application est disponible sur <http://localhost:3000>. La base locale
`data/db.json` est créée au premier démarrage ; supprimez-la pour repartir du jeu
de démonstration.

## Scripts

| Commande | Rôle |
|---|---|
| `npm start` | démarre le serveur |
| `npm run dev` | démarre avec rechargement automatique |
| `npm run lint` | analyse ESLint (serveur, données, interface) |
| `npm run format` | reformate le code avec Prettier |
| `npm test` | tests automatisés (API + parcours) |

## Organisation du code

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) et [docs/API.md](docs/API.md).

## Règles de travail

1. **Une branche par évolution**, nommée `feat/…`, `fix/…` ou `docs/…`.
2. `npm run lint` et `npm test` doivent passer avant toute demande de fusion.
3. Un module = une responsabilité ; ne pas réintroduire de dépendance circulaire
   (utiliser le registre `core/registry.js`).
4. Interface en français, montants en GNF avec séparateur de milliers.
5. Ne jamais exposer un mot de passe : l'API passe toujours par `publicUser()`.

## Avec Visual Studio Code

Le dossier `.vscode/` fournit :

- les extensions recommandées (ESLint, Prettier, EditorConfig) ;
- le formatage automatique à l'enregistrement ;
- deux configurations de débogage : serveur Node et interface dans Chrome.

Pour déboguer le serveur : `F5` → « Serveur API ».
Pour déboguer l'interface : lancer « Serveur API », puis « Interface (Chrome) ».
