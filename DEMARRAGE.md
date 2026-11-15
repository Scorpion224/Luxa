# Démarrage rapide dans Visual Studio Code

## 1. Ouvrir le projet

1. Téléchargez **`peinture-pro-guinee.zip`** et décompressez-le.
2. Dans VS Code : **Fichier → Ouvrir le dossier…**, puis choisissez le dossier
   `peinture-pro-guinee`.
3. VS Code propose les extensions recommandées (ESLint, Prettier, EditorConfig) :
   acceptez « Installer ».

## 2. Installer et lancer

Ouvrez un terminal dans VS Code (**Terminal → Nouveau terminal**) :

```bash
npm install
npm start
```

Puis ouvrez <http://localhost:3000>.

Pour développer avec rechargement automatique du serveur :

```bash
npm run dev
```

## 3. Vérifier que tout est sain

```bash
npm run lint     # analyse du code
npm test         # 9 tests d'API (base temporaire)
```

## 4. Se connecter

L'application s'ouvre directement dans l'espace Administrateur. Pour changer
d'espace : cliquez sur votre nom en haut à droite → **Changer d'espace**.

Accès directs : `/demo/admin`, `/demo/commercial`, `/demo/comptable`,
`/demo/stockiste`, `/demo/client`. L'écran de connexion classique :
`http://localhost:3000/?connexion=1`.

## 5. Repartir des données de démonstration

```bash
npm run reset    # supprime data/db.json, régénéré au prochain démarrage
```

## 6. Déboguer

- **F5** → « Serveur API » : points d'arrêt dans `server/`.
- **F5** → « Interface (Chrome) » : points d'arrêt dans `public/assets/js/`.

## Où trouver quoi

| Je veux modifier… | Fichier |
|---|---|
| une route de l'API | `server/routes/` |
| le calcul d'un devis | `server/lib/quotes.js` |
| les permissions par rôle | `data/roles.js` |
| une page de l'interface | `public/assets/js/pages/` |
| un bouton de l'interface | `public/assets/js/core/actions.js` |
| le style d'un écran | `public/assets/css/` |
| le jeu de données de démo | `data/seed.js` |

Documentation complète : `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`.
