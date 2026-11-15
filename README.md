# Peinture Pro Guinée — application de gestion commerciale

Application web complète (SPA + API Node/Express) pour la gestion commerciale d'une
entreprise de peinture en Guinée : devis, catalogue produits, clients, stocks,
chantiers, encaissements et financement.

- **Interface** : HTML/CSS/JavaScript natif (aucun build), police Inter, Font Awesome.
- **API** : Express 4, persistance JSON dans `data/db.json` (créé et réensemencé au premier démarrage).
- **Langue** : français — montants en GNF avec séparateurs fr-FR (`48 600 000 GNF`), décimales à virgule (`104,4 m²`).

## Démarrage

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # idem avec rechargement du serveur
```

Pour repartir des données de démonstration : supprimer `data/db.json` puis relancer.
Le jeu de démonstration est régénéré automatiquement par `data/seed.js`.

## Comptes de démonstration

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Administrateur | `admin@peinturepro.gn` | `admin123` |
| Commercial | `commercial@peinturepro.gn` | `com123` |
| Comptable | `comptable@peinturepro.gn` | `compta123` |
| Stockiste | `stock@peinturepro.gn` | `stock123` |

Les mots de passe sont stockés **en clair** et le jeton renvoyé par `/api/auth/login`
est un jeton de démonstration : ce dispositif n'est pas prévu pour la production.

## Écrans

| Écran | Route | Contenu |
| --- | --- | --- |
| Devis (accueil) | `#/devis` | KPI (14 devis en cours, 48 600 000 GNF, 5 à relancer), 3 devis récents, catalogue rapide |
| Catalogue produits | `#/catalogue` | Recherche, tri A→Z, grille/liste, 5 familles, stock, alerte « Stock bas », note classification FOM |
| Nouveau devis | `#/devis/nouveau` | Calcul de surfaces (Salon 5,2 × 6,0 m → 104,4 m²), hypothèses 10 m²/L / 2 couches / 10 %, lignes, TVA 18 %, total 6 420 000 GNF, enregistrement + PDF |
| Parcours de paiement | `#/paiement` | Onglets PEINTURE CASH / PEINTURE FLEX / Banque partenaire, échéancier, dossier de financement, reste dû |
| Clients | `#/clients` | Portefeuille, fiche client (devis + encaissements), création |
| Stocks | `#/stocks` | Valorisation, alertes, niveaux de stock, ajustement rapide |
| Chantiers | `#/chantiers` | Avancement, budgets, chefs de chantier, création |
| Finance | `#/finance` | Encaissements, factures, synthèse, graphique 6 mois |

Actions disponibles : créer un devis, changer de produit du devis, enregistrer un
paiement (total ou partiel), ajuster le stock, créer un client, créer/mettre à jour
un chantier, transmettre un dossier bancaire, imprimer le devis en PDF.

## Calcul du devis

```
surface = (L + l) × 2 × H − (portes × 2,0) − (fenêtres × 1,5)
peinture = surface / rendement × couches × (1 + marge de perte)  → litres
main-d'œuvre = surface × prix au m²
transport = forfait
TVA = 18 % du sous-total (optionnelle)
```

Exemple de référence : 5,2 / 6,0 / 3,0 m, 2 portes, 3 fenêtres → 104,4 m² ;
36 L à 75 000 = 2 700 000 ; 104,4 m² à 30 000 = 3 132 000 ; transport 250 000 ;
TVA 338 000 ; **total 6 420 000 GNF**.

## API

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET | `/api/health` | État du service |
| GET | `/api/users` · `/api/users/:id` | Comptes utilisateurs (filtre `?role=`) |
| POST | `/api/auth/login` | Connexion `{ email, password }` → jeton de démo + profil |
| GET | `/api/company` | Société (nom, TVA, adresse) |
| GET | `/api/categories` · `/api/products` | Catalogue (filtres `?category=`, `?q=`) |
| GET/PATCH | `/api/products/:id/stock` | Ajustement de stock |
| GET | `/api/stocks` | Stock valorisé |
| GET/POST | `/api/clients` · `/api/clients/:id` | Clients et fiche détaillée |
| GET/POST | `/api/quotes` | Devis paginés (`?page=`, `?sort=`), création |
| POST | `/api/quotes/calculate` | Calcul surface / lignes / totaux |
| GET/PATCH/DELETE | `/api/quotes/:id` | Détail, mise à jour, suppression |
| POST | `/api/quotes/:id/status` | Changement de statut |
| GET | `/api/quotes-draft` | Devis en cours de saisie |
| GET | `/api/dashboard` | KPI + devis récents |
| GET | `/api/payments/quotes` · `/api/payments/:id` | Devis et échéancier |
| POST | `/api/payments/:id/pay` | Encaissement (partiel accepté) |
| POST | `/api/payments/:id/schedule[/init]` | Échéancier |
| POST | `/api/payments/:id/financing/advance` | Avancement du dossier bancaire |
| GET | `/api/acomptes` · `/api/chantiers` · `/api/finance` | Acomptes, chantiers, factures et série mensuelle |

## Structure

```
server.js              API Express + fallback SPA
data/seed.js           Données de démonstration
data/db.json           Base JSON (générée, ignorée par git)
public/index.html      Coquille SPA
public/assets/app.css  Design system (thème teal / sable / orange)
public/assets/app.js   Routeur et vues
public/assets/*.png    Visuels (logo, art d'en-tête, produits)
```
