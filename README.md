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

## Connexion

L'application démarre sur un écran de connexion. Un clic sur un compte de
démonstration remplit le formulaire et ouvre la session immédiatement.

- l'utilisateur est stocké côté navigateur (`localStorage`, clé `ppg.session`) ;
- chaque appel d'API envoie `Authorization: Bearer <token>` ;
- le serveur vérifie le jeton et la permission de l'action (`401` sans session,
  `403` si le rôle n'a pas le droit) ;
- les entrées de menu et les boutons d'action sont masqués selon les permissions,
  et une route interdite affiche une page « Accès restreint » ;
- le menu du compte (en haut à droite) affiche le nom, l'email et le rôle, et
  permet de se déconnecter.

Les sessions sont conservées **en mémoire** dans le serveur : un redémarrage
déconnecte tout le monde (le navigateur revient à l'écran de connexion).

## Comptes de démonstration

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Administrateur | `admin@peinturepro.gn` | `admin123` |
| Commercial | `commercial@peinturepro.gn` | `com123` |
| Comptable | `comptable@peinturepro.gn` | `compta123` |
| Stockiste | `stock@peinturepro.gn` | `stock123` |
| Client (particulier) | `client@peinturepro.gn` | `client123` |
| Client (entreprise) | `mariama@peinturepro.gn` | `client123` |

Un client peut aussi **créer son compte** depuis l'écran de connexion
(« Créer mon compte client ») : le compte est rattaché à une fiche client
(nom, téléphone, commune, quartier) créée automatiquement.

### Rôles et permissions

Les permissions suivent le format `module:action` et sont définies dans `data/roles.js`
(exposées par `GET /api/roles`, renvoyées avec le profil à la connexion).

| Rôle | Périmètre | Permissions |
| --- | --- | --- |
| **Administrateur** | Accès complet, y compris les comptes utilisateurs | `*` |
| **Commercial** | Prospection et vente | `devis:read`, `devis:write`, `catalogue:read`, `clients:read`, `clients:write`, `chantiers:read`, `paiement:read` |
| **Comptable** | Encaissements et suivi financier | `devis:read`, `clients:read`, `chantiers:read`, `paiement:read`, `paiement:write`, `finance:read`, `finance:write` |
| **Stockiste** | Magasin et catalogue | `catalogue:read`, `catalogue:write`, `stocks:read`, `stocks:write`, `chantiers:read` |
| **Client** | Espace client (boutique, panier, devis, financement, rendez-vous) | `portail:read`, `boutique:read`, `panier:write`, `commande:read`, `commande:write`, `demande:write`, `reservation:write` |

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
| Planning des équipes | `#/planning` | Demandes de rendez-vous à confirmer, occupation des 14 prochains jours, équipes peintres |
| Boutique (client) | `#/boutique` | Catalogue, recherche, familles, bouton « Ajouter au panier », total du panier |
| Mon panier (client) | `#/panier` | Quantités, suppression, récapitulatif, commande **Cash** ou **PEINTURE FLEX** |
| Ma peinture (client) | `#/ma-peinture` | Devis pour la maison, financement FLEX, calendrier des créneaux, équipes, rendez-vous, commandes |

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

## PEINTURE FLEX (financement)

Défini dans `data/flex.js`, appliqué par l'API et l'écran « Parcours de paiement » :

1. **Abonnement 250 000 GNF** — réglé à la banque, il sert d'acompte et de
   garantie de prestation (première ligne de l'échéancier).
2. **Validation bancaire obligatoire** — le dossier de financement passe par
   *Dossier → Pièces → Transmis → Décision de la banque*. Tant que la décision
   n'est pas « Validée », le crédit est bloqué : la boîte « Reste dû » affiche
   un cadenas et l'API refuse l'encaissement d'une échéance (`400`).
3. **Crédit de 1 à 12 mois** — le solde du devis (`total − abonnement`) est
   financé au taux de **1 % par mois** (intérêts simples). La mensualité est la
   même sur toute la durée, la dernière échéance absorbe l'arrondi.
4. **Prestation offerte** — une fois le dossier validé, la peinture est offerte
   (mention affichée dans le bloc de conditions).

Exemple (DV-2026-031, 12 500 000 GNF sur 5 mois) : abonnement 250 000,
financé 12 250 000, intérêts 612 500, mensualité **2 572 500**, total
13 112 500 GNF.

Endpoints : `POST /api/payments/:quoteId/schedule` avec `{ months }` crée ou
recalcule le plan (refusé si une échéance est déjà payée) ;
`POST /api/payments/:quoteId/financing/advance` fait avancer le dossier bancaire
et débloque le crédit à la validation.

## Espace client

Chaque client se connecte avec son propre compte (ou en crée un) et arrive sur
l'espace client : le menu de gestion est remplacé par **Boutique**, **Mon panier**
et **Ma peinture**. Un lien compte pour chaque étape :

1. **Devis pour sa maison** — formulaire de pièces (longueur, largeur, hauteur,
   portes, fenêtres), peinture choisie dans le catalogue ; le devis est calculé
   avec le même moteur que l'écran commercial (`POST /api/portal/quotes`) et
   apparaît dans « Mes devis ».
2. **Boutique et panier** — chaque produit a un bouton « Ajouter au panier »
   (`POST /api/cart/items`), les quantités se règlent dans « Mon panier », puis
   la commande est enregistrée en espèces (`mode: "cash"`) ou à crédit
   (`mode: "flex"`).
3. **PEINTURE FLEX après validation de la banque** — la demande de financement
   (`POST /api/portal/flex`) transmet le dossier *Dossier → Pièces → Transmis →
   Décision de la banque* ; tant que la décision n'est pas « Validée », le
   calendrier est verrouillé, l'achat à crédit et la réservation répondent `400`.
   Le bouton « Décision de la banque » est marqué **Démo** : il simule la réponse
   de l'agence pour dérouler le parcours de bout en bout.
4. **Date, créneau et équipe peintre** — une fois le financement validé,
   `GET /api/planning/slots` renvoie 14 jours × 4 créneaux (08h00, 10h00, 14h00,
   16h00 ; dimanche fermé) avec les équipes encore libres. Le client choisit un
   créneau et une équipe (`POST /api/bookings`) : la réservation est **en attente**
   jusqu'à la confirmation de l'équipe, faite par le commercial ou l'administrateur
   dans « Planning des équipes » (`PATCH /api/bookings/:id`, permission
   `planning:manage`). Une équipe mobilisée disparaît des créneaux libres ; une
   fois toutes les équipes prises, le créneau est complet.

Données de démonstration : 3 équipes (Équipe FOM 1 — Mamadou Saliou, 8 peintres ;
Équipe FLEX 2 — Abdoulaye Camara, 5 peintres ; Équipe Satin 3 — Fatou Bangoura,
6 peintres), un rendez-vous confirmé (RDV-2026-001, Hôtel Kaloum, Équipe FOM 1)
et une commande livrée (CMD-2026-004).

Endpoints : `GET /api/portal/me`, `GET|POST|PATCH|DELETE /api/cart*`,
`GET|POST /api/orders`, `POST /api/portal/quotes`, `POST /api/portal/flex`,
`POST /api/portal/financing/:quoteId/advance`, `GET /api/teams`,
`GET /api/planning/slots`, `GET|POST /api/bookings`, `PATCH /api/bookings/:id`.

## API

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET | `/api/health` | État du service |
| GET | `/api/users` · `/api/users/:id` | Comptes utilisateurs (filtre `?role=`) |
| GET | `/api/roles` | Rôles, résumés, permissions et modules |
| POST | `/api/auth/login` | Connexion `{ email, password }` → jeton de démo + profil |
| POST | `/api/auth/register` | Création d'un compte client `{ name, email, password, phone, zone, address }` |
| POST | `/api/auth/logout` | Ferme la session courante |
| GET | `/api/auth/me` | Profil du porteur du jeton (401 si expiré) |
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
| GET | `/api/portal/me` | Espace client : fiche, panier, devis, commandes, rendez-vous, équipes |
| GET/POST/PATCH/DELETE | `/api/cart` · `/api/cart/items[/:productId]` | Panier du client connecté |
| GET/POST | `/api/orders` | Commandes du client (`mode: "cash"` ou `"flex"`) |
| POST | `/api/portal/quotes` | Demande de devis « peindre ma maison » |
| POST | `/api/portal/flex` | Demande de financement PEINTURE FLEX `{ quoteId, months }` |
| POST | `/api/portal/financing/:id/advance` | Avancement du dossier du client |
| GET | `/api/teams` · `/api/planning/slots?days=14` | Équipes peintres et créneaux libres |
| GET/POST/PATCH | `/api/bookings[/:id]` | Rendez-vous : création, confirmation/refus (`planning:manage`) |

## Structure

```
server.js              API Express + fallback SPA
data/seed.js           Données de démonstration
data/roles.js          Rôles, permissions, modules de menu
data/flex.js           Règles PEINTURE FLEX (abonnement, taux, échéancier)
data/portal.js         Équipes peintres, créneaux et disponibilités
data/db.json           Base JSON (générée, ignorée par git)
public/index.html      Coquille SPA
public/assets/app.css  Design system (thème teal / sable / orange)
public/assets/app.js   Routeur et vues
public/assets/*.png    Visuels (logo, art d'en-tête, produits)
```
