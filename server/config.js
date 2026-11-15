/**
 * Configuration globale du serveur (port, chemins, version applicative).
 */

const path = require('path');

const PORT = process.env.PORT || 3000;

const APP_VERSION = '3.0 (espace client)';

// DB_FILE peut être redéfini (utile pour les tests automatisés)
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

module.exports = { PORT, APP_VERSION, DB_FILE, PUBLIC_DIR };
