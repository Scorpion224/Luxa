/**
 * Point d’entrée du serveur HTTP.
 */

const app = require('./app');
const { PORT } = require('./config');

app.listen(PORT, () => {
  console.log(`\n  Peinture Pro Guinée — serveur démarré sur http://localhost:${PORT}\n`);
});
