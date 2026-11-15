# Peinture Pro Guinée

Application de gestion commerciale d'une entreprise de peinture en Guinée :
devis, catalogue, clients, stocks, chantiers, finance, **PEINTURE FLEX** et
**espace client**.

- **Interface** : HTML/CSS/JavaScript natif (aucune compilation), modules ES,
  police Inter, Font Awesome.
- **API** : Express 4, persistance JSON dans `data/db.json`.
- **Langue** : français — montants en GNF (`48 600 000 GNF`), décimales à la virgule (`104,4 m²`).

## Démarrage

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # identique, avec rechargement automatique
```

Pour repartir du jeu de démonstration : `npm run reset` (ou supprimer `data/db.json`).

## Connexion

L'application ouvre directement l'espace de démonstration ; l'écran de connexion
reste accessible par le bouton « Se déconnecter » ou l'adresse `/?connexion=1`.

| Espace | Adresse de connexion directe | Email | Mot de passe |
|---|---|---|---|
| Administrateur | `/demo/admin` | admin@peinturepro.gn | `admin123` |
| Commercial | `/demo/commercial` | commercial@peinturepro.gn | `com123` |
| Comptable | `/demo/comptable` | comptable@peinturepro.gn | `compta123` |
| Stockiste | `/demo/stockiste` | stock@peinturepro.gn | `stock123` |
| Client | `/demo/client` | client@peinturepro.gn | `client123` |

Les sessions sont conservées 7 jours (jeton en `localStorage` **et** cookie
`HttpOnly` `ppg_session`), y compris après un redémarrage du serveur.
Les mots de passe sont stockés en clair **uniquement pour cette démonstration** ;
l'API ne les renvoie jamais (`publicUser()` retire le champ).

## Fonctionnalités

**Gestion commerciale** — tableau de bord, devis avec calcul de surfaces en direct,
catalogue produits, clients, stocks, chantiers, finances (encaissements, factures),
planning des équipes et commandes boutique.

**PEINTURE FLEX** — abonnement de 250 000 GNF, crédit de 1 à 12 mois à 1 %/mois,
validation bancaire obligatoire. Le **paiement par échéance est réservé** aux devis
dont le financement FLEX est validé ; les autres devis n'acceptent que
acompte / règlement partiel / solde.

**Espace client** — boutique → panier → commande (espèces ou FLEX), demandes de
devis, suivi de « ma peinture », calendrier des créneaux et équipe de peintres
après validation bancaire.

## Organisation du code

```
server/        API REST (config, store, lib métier, routes par domaine)
public/        interface (index.html, css/ par domaine, js/ en modules ES)
data/          jeu de données de démonstration
tests/         tests automatisés (node:test)
docs/          architecture et référence de l'API
```

Détails : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/API.md](docs/API.md) ·
[CONTRIBUTING.md](CONTRIBUTING.md).

## Scripts

| Commande | Rôle |
|---|---|
| `npm start` | démarre le serveur |
| `npm run dev` | démarre avec rechargement automatique |
| `npm run lint` | ESLint sur le serveur, les données, l'interface et les tests |
| `npm run format` | Prettier sur le code et la documentation |
| `npm test` | tests automatisés de l'API (base temporaire, port dédié) |
| `npm run reset` | réinitialise `data/db.json` |

## Visual Studio Code

Le dépôt contient un dossier `.vscode/` prêt à l'emploi : extensions recommandées,
formatage et corrections ESLint à l'enregistrement, tâches `Serveur API`, `Lint`,
`Tests`, et deux configurations de débogage (serveur Node, interface Chrome).

## Configuration

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | port d'écoute |
| `DB_FILE` | `data/db.json` | chemin de la base locale (utilisé par les tests) |
