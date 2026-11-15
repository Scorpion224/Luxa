# Déploiement

L'application est un serveur Node unique qui sert **l'API et l'interface**.
Il n'y a **pas** d'étape de compilation : le dossier `public/` est envoyé tel quel.

> ⚠️ Un hébergement « site statique » (Netlify, Vercel statique, GitHub Pages)
> **ne peut pas** faire fonctionner cette application : sans le serveur Node,
> `/api/auth/login` renvoie la page HTML au lieu du JSON, et la connexion échoue.
> Utilisez une plateforme qui exécute Node (Render, Railway, Fly.io, VPS, Docker).

## Variables d'environnement

| Variable         | Obligatoire  | Rôle                                                                                                   |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `PORT`           | non (`3000`) | port d'écoute (fourni automatiquement par la plupart des plateformes)                                  |
| `DB_FILE`        | recommandé   | chemin de la base JSON, sur un **volume persistant**                                                   |
| `SESSION_SECRET` | recommandé   | secret de signature des jetons (≥ 16 caractères). S'il change, tous les utilisateurs sont déconnectés  |
| `NODE_ENV`       | non          | `production` en ligne                                                                                  |
| `DEMO_MODE`      | non (`true`) | `false` ferme `/demo/...` et `/api/auth/demo` : l'application exige alors un vrai email + mot de passe |

## Option 1 — Render (le plus simple)

1. Pousser le dépôt sur GitHub.
2. Sur Render : **New → Blueprint**, choisir le dépôt. Le fichier `render.yaml`
   fourni configure le service, le secret et le disque persistant.
3. Ouvrir l'URL fournie : l'application doit afficher l'espace Administrateur.

Le plan gratuit de Render n'autorise pas les disques persistants : les données
saisies sont donc perdues à chaque redéploiement (les **sessions**, elles,
survivent). Pour conserver les données, passez le service en plan payant, montez
un disque sur `/var/data` et définissez `DB_FILE=/var/data/db.json` — le
`render.yaml` contient les lignes à décommenter.

Sans Blueprint : **New → Web Service**, _Build_ `npm ci --omit=dev`,
_Start_ `node server.js`, _Health check_ `/api/health`.

## Option 2 — Docker

```bash
docker build -t peinture-pro-guinee .
docker run -d -p 3000:3000 \
  -e SESSION_SECRET="changez-moi-avec-32-caracteres-minimum" \
  -v ppg-data:/app/data \
  --name ppg peinture-pro-guinee
```

Le volume `ppg-data` conserve `data/db.json` entre les redémarrages.

## Option 3 — VPS (Nginx + systemd)

```bash
git clone <dépôt> /srv/peinture-pro && cd /srv/peinture-pro
npm ci --omit=dev
```

`/etc/systemd/system/peinture-pro.service` :

```ini
[Unit]
Description=Peinture Pro Guinée
After=network.target

[Service]
WorkingDirectory=/srv/peinture-pro
Environment=NODE_ENV=production PORT=3000 SESSION_SECRET=changer-ce-secret
ExecStart=/usr/bin/node server.js
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

Puis `systemctl enable --now peinture-pro`. En frontal, Nginx :

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

`X-Forwarded-Proto` est nécessaire pour que le cookie de session soit marqué
`Secure` en HTTPS.

## Vérifier un déploiement

```bash
curl https://votre-domaine/api/health
```

Réponse attendue :

```json
{
  "status": "ok",
  "version": "3.0 (espace client)",
  "stockage": "persistant",
  "secret": "SESSION_SECRET",
  "demoAccounts": [{ "email": "admin@peinturepro.gn", "exists": true }, …]
}
```

- `stockage` : `persistant` si `DB_FILE` pointe vers un volume inscriptible,
  sinon `mémoire (disque non inscriptible)` — l'application fonctionne quand même,
  mais les données sont perdues au redémarrage.
- `secret` : origine du secret de signature (`SESSION_SECRET`, `base locale` ou
  `généré`). S'il vaut `généré` en production, fixez `SESSION_SECRET` pour que les
  connexions survivent aux redéploiements.

## Connexion des comptes de démonstration

| Espace         | Adresse directe    |
| -------------- | ------------------ |
| Administrateur | `/demo/admin`      |
| Commercial     | `/demo/commercial` |
| Comptable      | `/demo/comptable`  |
| Stockiste      | `/demo/stockiste`  |
| Client         | `/demo/client`     |

Ces liens ouvrent la session côté serveur, sans JavaScript : si l'écran de
connexion pose problème, ils fonctionnent toujours.

## Problèmes fréquents

| Symptôme                               | Cause                                                       | Solution                                  |
| -------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| La page s'affiche, la connexion échoue | hébergement statique                                        | héberger le serveur Node (voir plus haut) |
| « Serveur injoignable »                | mauvais port ou service arrêté                              | vérifier `PORT` et les journaux           |
| Déconnexion à chaque redéploiement     | `SESSION_SECRET` absent                                     | définir `SESSION_SECRET`                  |
| Données perdues au redémarrage         | disque non persistant                                       | `DB_FILE` vers un volume                  |
| « Session expirée » en boucle          | cookie refusé (HTTPS sans `Secure`, ou proxy mal configuré) | transmettre `X-Forwarded-Proto`           |
