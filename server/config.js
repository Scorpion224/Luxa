/**
 * Configuration globale du serveur (port, chemins, version applicative).
 */

const path = require('path');

const PORT = process.env.PORT || 3000;

const APP_VERSION = '3.0 (espace client)';

// DB_FILE peut être redéfini (utile pour les tests automatisés)
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/* DEMO_MODE=false désactive les connexions de démonstration (déploiement réel) :
   les routes /demo/... et /api/auth/demo sont alors fermées et l'interface
   n'ouvre plus de session automatiquement. */
const DEMO_MODE = String(process.env.DEMO_MODE || 'true').toLowerCase() !== 'false';

module.exports = { PORT, APP_VERSION, DB_FILE, PUBLIC_DIR, DEMO_MODE };
