# API REST

Toutes les routes renvoient du **JSON**. L'authentification se fait par en-tête
`Authorization: Bearer <jeton>` **ou** par le cookie `ppg_session` (HttpOnly,
7 jours). Une réponse `401` signifie « session expirée ».

## Référentiel

| Méthode | Route             | Permission | Description                                        |
| ------- | ----------------- | ---------- | -------------------------------------------------- |
| GET     | `/api/health`     | —          | état du serveur, version, comptes de démonstration |
| GET     | `/api/company`    | —          | informations de la société                         |
| GET     | `/api/roles`      | —          | rôles, libellés et permissions                     |
| GET     | `/api/categories` | —          | catégories de produits avec compteurs              |

## Authentification et comptes

| Méthode | Route                  | Permission          | Description                                        |
| ------- | ---------------------- | ------------------- | -------------------------------------------------- |
| POST    | `/api/auth/login`      | —                   | connexion email + mot de passe                     |
| POST    | `/api/auth/demo`       | —                   | connexion de démonstration en un clic (`{ role }`) |
| POST    | `/api/auth/register`   | —                   | création d'un compte client                        |
| POST    | `/api/auth/logout`     | —                   | ferme la session et efface le cookie               |
| GET     | `/api/auth/me`         | —                   | session courante (`{ token, user }`)               |
| GET     | `/demo/:role`          | —                   | connexion par URL puis redirection dans l'espace   |
| POST    | `/api/auth/demo-form`  | —                   | repli sans JavaScript (formulaire HTML)            |
| POST    | `/api/auth/login-form` | —                   | repli sans JavaScript (formulaire HTML)            |
| GET     | `/api/users`           | `utilisateurs:read` | liste des utilisateurs                             |

## Catalogue et stocks

| Méthode | Route                                 | Permission     |
| ------- | ------------------------------------- | -------------- |
| GET     | `/api/products` · `/api/products/:id` | —              |
| GET     | `/api/stocks`                         | `stocks:read`  |
| PATCH   | `/api/products/:id/stock`             | `stocks:write` |

## Clients et devis

| Méthode | Route                                                                                                                        | Permission      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------- |
| GET     | `/api/clients` · `/api/clients/:id`                                                                                          | `clients:read`  |
| POST    | `/api/clients`                                                                                                               | `clients:write` |
| GET     | `/api/quotes` · `/api/quotes/:id` · `/api/quotes-draft`                                                                      | `devis:read`    |
| POST    | `/api/quotes` · `/api/quotes/calculate` ; PATCH `/api/quotes/:id` ; POST `/api/quotes/:id/status` ; DELETE `/api/quotes/:id` | `devis:write`   |
| GET     | `/api/dashboard`                                                                                                             | `devis:read`    |

## Paiements et PEINTURE FLEX

| Méthode | Route                                                               | Permission       |
| ------- | ------------------------------------------------------------------- | ---------------- |
| GET     | `/api/payments/quotes` · `/api/payments/:quoteId` · `/api/acomptes` | `paiement:read`  |
| POST    | `/api/payments/:quoteId/pay`                                        | `paiement:write` |
| POST    | `/api/payments/:quoteId/schedule` · `/schedule/init`                | `paiement:write` |
| POST    | `/api/acomptes` ; DELETE `/api/acomptes/:id`                        | `paiement:write` |
| POST    | `/api/payments/:quoteId/financing/advance`                          | `paiement:write` |

> Le paiement par échéance n'est accepté que pour un devis dont le financement
> PEINTURE FLEX est validé par la banque.

## Chantiers, finances, planning

| Méthode | Route                                                  | Permission          |
| ------- | ------------------------------------------------------ | ------------------- |
| GET     | `/api/chantiers`                                       | `chantiers:read`    |
| POST    | `/api/chantiers` ; PATCH `/api/chantiers/:id`          | `chantiers:write`   |
| GET     | `/api/finance`                                         | `finance:read`      |
| GET     | `/api/teams` · `/api/planning/slots` · `/api/bookings` | —                   |
| POST    | `/api/bookings`                                        | `reservation:write` |
| PATCH   | `/api/bookings/:id`                                    | `planning:manage`   |

## Espace client

| Méthode    | Route                                                          | Permission       |
| ---------- | -------------------------------------------------------------- | ---------------- |
| GET/DELETE | `/api/cart` ; POST/PATCH/DELETE `/api/cart/items[/:productId]` | `panier:write`   |
| GET        | `/api/orders`                                                  | —                |
| POST       | `/api/orders` ; PATCH `/api/orders/:id`                        | `commande:write` |
| POST       | `/api/portal/quotes` · `/api/portal/flex`                      | `demande:write`  |
| POST       | `/api/portal/financing/:quoteId/advance`                       | `demande:write`  |
| GET        | `/api/portal/me`                                               | session client   |
