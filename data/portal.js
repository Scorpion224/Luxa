/**
 * Espace client — équipes de peinture, créneaux et disponibilités
 */

const TEAMS = [
  {
    id: 'TE-1',
    name: 'Équipe FOM 1',
    lead: 'Mamadou Saliou',
    members: 8,
    specialty: 'Peinture intérieure',
    zone: 'Conakry',
    rating: 4.9,
    jobs: 164,
    color: '#0C5E62'
  },
  {
    id: 'TE-2',
    name: 'Équipe FLEX 2',
    lead: 'Abdoulaye Camara',
    members: 5,
    specialty: 'Façades & finitions',
    zone: 'Conakry',
    rating: 4.8,
    jobs: 121,
    color: '#E0801F'
  },
  {
    id: 'TE-3',
    name: 'Équipe Satin 3',
    lead: 'Fatou Bangoura',
    members: 6,
    specialty: 'Décoration & staff',
    zone: 'Conakry / Kamsar',
    rating: 4.7,
    jobs: 96,
    color: '#217A46'
  }
];

/** Créneaux proposés par l'entreprise, du lundi au samedi. */
const SLOTS = [
  { key: '08:00', label: '08h00 – 10h00' },
  { key: '10:00', label: '10h00 – 12h00' },
  { key: '14:00', label: '14h00 – 16h00' },
  { key: '16:00', label: '16h00 – 18h00' }
];

const DAY_LABEL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_LABEL = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function isoDate(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/**
 * Construit le calendrier des créneaux : pour chaque jour ouvré, chaque créneau
 * liste les équipes encore libres. Un créneau est complet quand toutes les
 * équipes sont déjà mobilisées (réservations confirmées ou en attente).
 */
function buildCalendar(bookings, options) {
  const opts = options || {};
  const days = Math.min(31, Math.max(1, Number(opts.days) || 14));
  const teams = TEAMS;
  const taken = {};
  (bookings || []).forEach((b) => {
    if (b.status === 'refuse') return;
    const key = b.date + '|' + b.slot;
    taken[key] = taken[key] || [];
    if (b.teamId) taken[key].push(b.teamId);
  });

  const out = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1);

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const weekday = d.getDay();
    const date = isoDate(d);
    const closed = weekday === 0;
    const slots = SLOTS.map((slot) => {
      const busy = taken[date + '|' + slot.key] || [];
      const free = teams.filter((t) => !busy.includes(t.id));
      return {
        date,
        slot: slot.key,
        label: slot.label,
        teamIds: free.map((t) => t.id),
        available: !closed && free.length > 0
      };
    });
    out.push({
      date,
      day: DAY_LABEL[weekday],
      dayShort: DAY_LABEL[weekday].slice(0, 3),
      dayNumber: d.getDate(),
      month: MONTH_LABEL[d.getMonth()],
      year: d.getFullYear(),
      closed,
      slots
    });
  }
  return out;
}

module.exports = { TEAMS, SLOTS, DAY_LABEL, MONTH_LABEL, buildCalendar };
