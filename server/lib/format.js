/**
 * Utilitaires numériques et libellés de statuts partagés.
 */

/* ------------------------------------------------------------------ */
const STATUS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  en_retard: 'En retard'
};

const round1 = (n) => Math.round(n * 10) / 10;

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

module.exports = { STATUS, daysBetween, round1 };
