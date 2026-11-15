/**
 * Assemblage de l'application Express : middlewares, montage des routeurs, repli SPA et gestion d'erreurs.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { PUBLIC_DIR } = require('./config');

const app = express();

/* Derrière un proxy (Render, Railway, Nginx, aperçu Arena) : permet à Express de
   connaître le protocole réel et donc d'émettre un cookie « Secure » en HTTPS. */
app.set('trust proxy', true);

app.use(cors());

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders(res, filePath) {
      // évite qu'un ancien app.js / app.css reste en cache après une mise à jour
      if (/\.(?:js|css|html)$/.test(filePath)) res.setHeader('Cache-Control', 'no-store');
      else res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  })
);

/* ------------------------------------------------------------------ */
/* Routeurs métier */
app.use(require('./routes/meta'));
app.use(require('./routes/auth'));
app.use(require('./routes/catalogue'));
app.use(require('./routes/clients'));
app.use(require('./routes/quotes'));
app.use(require('./routes/dashboard'));
app.use(require('./routes/payments'));
app.use(require('./routes/orders'));
app.use(require('./routes/portal'));
app.use(require('./routes/chantiers'));
app.use(require('./routes/finance'));

/* Route API inconnue : réponse JSON claire (sinon le client recevrait du HTML). */
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route inconnue : ' + req.method + ' ' + req.originalUrl });
});

/* Repli SPA : toute autre URL rend l'application. */
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Erreur serveur :', err && err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Erreur serveur : ' + ((err && err.message) || 'inconnue') });
});

module.exports = app;
