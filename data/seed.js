/**
 * Données de démonstration - Peinture Pro Guinée
 * Toutes les valeurs sont exprimées en GNF.
 */

const COMPANY = {
  name: 'PEINTURE PRO GUINÉE',
  tagline: 'Peinture, finition & décoration',
  address: 'Quartier Almamya, Commune de Kaloum — Conakry',
  phone: '+224 622 00 00 00',
  email: 'contact@peinturepro-guinee.com',
  rccm: 'RCCM/GN/2019/B/1042',
  nif: 'NIF 908 442 117',
  tvaRate: 0.18,
  commercial: { initials: 'CM', name: 'Commercial' },
  bank: 'Banque partenaire — Agence Kaloum'
};

const PRODUCTS = [
  {
    id: 'p1',
    name: 'FOM intérieur mat 20 L',
    category: 'FOM intérieurs',
    price: 420000,
    stock: 128,
    stockByLocation: { Conakry: 104, Kamsar: 24 },
    minStock: 30,
    unit: 'L',
    format: 20,
    rendement: 10,
    location: 'Conakry',
    image: 'assets/product-fom-mat-20l.png',
    finish: 'Mat',
    swatch: '#3F8F94',
    description: 'Peinture acrylique intérieure mate, lessivable, faible odeur. Idéale pour les pièces de vie.'
  },
  {
    id: 'p2',
    name: 'FOM intérieur satin 20 L',
    category: 'FOM intérieurs',
    price: 465000,
    stock: 76,
    stockByLocation: { Conakry: 52, Kamsar: 24 },
    minStock: 25,
    unit: 'L',
    format: 20,
    rendement: 10,
    location: 'Conakry',
    image: 'assets/product-fom-satin-20l.png',
    finish: 'Satin',
    swatch: '#4F9A9E',
    description: 'Finition satinée lavable, très bonne tenue sur murs et plafonds intérieurs.'
  },
  {
    id: 'p3',
    name: 'FOM intérieur brillant 20 L',
    category: 'FOM intérieurs',
    price: 498000,
    stock: 64,
    stockByLocation: { Conakry: 40, Kamsar: 24 },
    minStock: 20,
    unit: 'L',
    format: 20,
    rendement: 9,
    location: 'Kamsar',
    image: 'assets/product-fom-brillant-20l.png',
    finish: 'Brillant',
    swatch: '#2F7C81',
    description: 'Finition brillante haut de gamme, résistante aux lavages répétés.'
  },
  {
    id: 'p4',
    name: 'FOM intérieur économique 20 L',
    category: 'FOM intérieurs',
    price: 315000,
    stock: 210,
    stockByLocation: { Conakry: 160, Kamsar: 50 },
    minStock: 40,
    unit: 'L',
    format: 20,
    rendement: 9,
    location: 'Conakry',
    image: 'assets/product-fom-eco-20l.png',
    finish: 'Mat',
    swatch: '#78AEA3',
    description: 'Le meilleur rapport qualité/prix pour les grands chantiers locatifs.'
  },
  {
    id: 'p5',
    name: 'Mastic intérieur en pâte 25 kg',
    category: 'FOM intérieurs',
    price: 185000,
    stock: 42,
    stockByLocation: { Conakry: 30, Kamsar: 12 },
    minStock: 50,
    unit: 'kg',
    format: 25,
    rendement: null,
    location: 'Conakry',
    image: 'assets/product-mastic-pate-25kg.png',
    finish: 'Pâte',
    swatch: '#C9C2B4',
    description: 'Mastic en pâte prêt à l’emploi pour le rebouchage et le lissage des murs intérieurs.'
  },
  {
    id: 'p6',
    name: 'Mastic pour murs 10 kg',
    category: 'Mastiques pour murs',
    extraCategories: ['FOM intérieurs'],
    price: 125000,
    stock: 97,
    stockByLocation: { Conakry: 70, Kamsar: 27 },
    minStock: 30,
    unit: 'kg',
    format: 10,
    rendement: null,
    location: 'Kamsar',
    image: 'assets/product-mastic-10kg.png',
    finish: 'Poudre',
    swatch: '#BDB7AB',
    description: 'Mastic en poudre à mélanger pour le dressage des murs avant peinture.'
  },
  {
    id: 'p7',
    name: 'Mastic pour murs 25 kg',
    category: 'Mastiques pour murs',
    extraCategories: ['FOM intérieurs'],
    price: 275000,
    stock: 58,
    stockByLocation: { Conakry: 42, Kamsar: 16 },
    minStock: 25,
    unit: 'kg',
    format: 25,
    rendement: null,
    location: 'Conakry',
    image: 'assets/product-mastic-25kg.png',
    finish: 'Poudre',
    swatch: '#B3ADA1',
    description: 'Rendement élevé, séchage rapide, ponçage facile.'
  },
  {
    id: 'p8',
    name: 'Sous-couche intérieure 20 L',
    category: 'FOM intérieurs',
    price: 295000,
    stock: 84,
    stockByLocation: { Conakry: 60, Kamsar: 24 },
    minStock: 30,
    unit: 'L',
    format: 20,
    rendement: 12,
    location: 'Conakry',
    image: 'assets/product-sous-couche-20l.png',
    finish: 'Primaire',
    swatch: '#D9CDB4',
    description: 'Primaire d’accrochage qui uniformise les fonds et améliore le rendement de la finition.'
  },
  {
    id: 'p9',
    name: 'FOM extérieur mat 20 L',
    category: 'FOM extérieurs',
    price: 445000,
    stock: 96,
    stockByLocation: { Conakry: 76, Kamsar: 20 },
    minStock: 25,
    unit: 'L',
    format: 20,
    rendement: 9,
    location: 'Conakry',
    image: 'assets/product-fom-mat-20l.png',
    finish: 'Mat',
    swatch: '#8A9A7B',
    description: 'Peinture façade microporeuse, résistante aux UV et à l’humidité.'
  },
  {
    id: 'p10',
    name: 'FOM extérieur satin 20 L',
    category: 'FOM extérieurs',
    price: 489000,
    stock: 74,
    stockByLocation: { Conakry: 54, Kamsar: 20 },
    minStock: 25,
    unit: 'L',
    format: 20,
    rendement: 9,
    location: 'Conakry',
    image: 'assets/product-fom-satin-20l.png',
    finish: 'Satin',
    swatch: '#7E8F72',
    description: 'Finition satinée pour façades, bonne résistance aux intempéries.'
  },
  {
    id: 'p11',
    name: 'FOM extérieur brillant 20 L',
    category: 'FOM extérieurs',
    price: 520000,
    stock: 58,
    stockByLocation: { Conakry: 38, Kamsar: 20 },
    minStock: 20,
    unit: 'L',
    format: 20,
    rendement: 8,
    location: 'Kamsar',
    image: 'assets/product-fom-brillant-20l.png',
    finish: 'Brillant',
    swatch: '#6F8270',
    description: 'Finition brillante lessivable pour façades exposées et locaux professionnels.'
  },
  {
    id: 'p12',
    name: 'FOM façade acrylique 20 L',
    category: 'FOM extérieurs',
    price: 465000,
    stock: 112,
    stockByLocation: { Conakry: 92, Kamsar: 20 },
    minStock: 30,
    unit: 'L',
    format: 20,
    rendement: 10,
    location: 'Conakry',
    image: 'assets/product-fom-eco-20l.png',
    finish: 'Mat',
    swatch: '#9AA88E',
    description: 'Acrylique façade haute couvrance pour les grands ensembles.'
  },
  {
    id: 'p13',
    name: 'Laque glycéro brillante 5 L',
    category: 'Peintures à huile',
    price: 215000,
    stock: 46,
    stockByLocation: { Conakry: 34, Kamsar: 12 },
    minStock: 15,
    unit: 'L',
    format: 5,
    rendement: 12,
    location: 'Conakry',
    image: 'assets/product-fom-brillant-20l.png',
    finish: 'Brillant',
    swatch: '#C7A15A',
    description: 'Laque solvantée très dure pour boiseries, portes et ferronnerie.'
  },
  {
    id: 'p14',
    name: 'Peinture à huile satinée 20 L',
    category: 'Peintures à huile',
    price: 435000,
    stock: 38,
    stockByLocation: { Conakry: 26, Kamsar: 12 },
    minStock: 12,
    unit: 'L',
    format: 20,
    rendement: 10,
    location: 'Conakry',
    image: 'assets/product-fom-satin-20l.png',
    finish: 'Satin',
    swatch: '#C08A46',
    description: 'Satin glycéro lessivable pour pièces humides et cuisines.'
  },
  {
    id: 'p15',
    name: 'Vernis polyuréthane 5 L',
    category: 'Peintures à huile',
    price: 285000,
    stock: 29,
    stockByLocation: { Conakry: 21, Kamsar: 8 },
    minStock: 10,
    unit: 'L',
    format: 5,
    rendement: 14,
    location: 'Conakry',
    image: 'assets/product-sous-couche-20l.png',
    finish: 'Vernis',
    swatch: '#B8894F',
    description: 'Vernis bi-composant pour parquets et mobilier, finition satinée.'
  },
  {
    id: 'p16',
    name: 'Nuancier FOM 120 teintes',
    category: 'Accessoires et consommables',
    price: 75000,
    stock: 24,
    stockByLocation: { Conakry: 18, Kamsar: 6 },
    minStock: 5,
    unit: 'unité',
    format: null,
    rendement: null,
    location: 'Conakry',
    image: 'assets/quick-fan.png',
    finish: 'Échantillon',
    swatch: '#D9C79B',
    description: 'Nuancier complet FOM pour la sélection des teintes sur chantier.'
  },
  {
    id: 'p17',
    name: 'Rouleau anti-goutte 25 cm',
    category: 'Accessoires et consommables',
    price: 45000,
    stock: 140,
    stockByLocation: { Conakry: 100, Kamsar: 40 },
    minStock: 20,
    unit: 'unité',
    format: null,
    rendement: null,
    location: 'Conakry',
    image: null,
    icon: 'fa-paint-roller',
    finish: 'Outillage',
    swatch: '#B9C3C4',
    description: 'Rouleau microfibre 25 cm, manche ergonomique, poils 12 mm.'
  },
  {
    id: 'p18',
    name: 'Bâche de protection 4 × 5 m',
    category: 'Accessoires et consommables',
    price: 60000,
    stock: 38,
    stockByLocation: { Conakry: 30, Kamsar: 8 },
    minStock: 10,
    unit: 'unité',
    format: null,
    rendement: null,
    location: 'Conakry',
    image: null,
    icon: 'fa-layer-group',
    finish: 'Protection',
    swatch: '#C9CFC4',
    description: 'Bâche tissée lavable pour la protection des sols et du mobilier.'
  },
  {
    id: 'p19',
    name: 'Ruban de masquage 50 m',
    category: 'Accessoires et consommables',
    price: 18000,
    stock: 96,
    stockByLocation: { Conakry: 70, Kamsar: 26 },
    minStock: 25,
    unit: 'unité',
    format: null,
    rendement: null,
    location: 'Conakry',
    image: null,
    icon: 'fa-tape',
    finish: 'Masquage',
    swatch: '#D8CBA8',
    description: 'Ruban crêpe 50 m pour la protection des plinthes et menuiseries.'
  }
];

const CLIENTS = [
  {
    id: 'c1', name: 'Hôtel Kaloum', contact: 'M. Ousmane Bah', company: 'Hôtel Kaloum',
    phone: '+224 622 00 11 22', email: 'achats@hotelkaloum.gn', city: 'Conakry',
    address: 'Avenue de la République, Kaloum', type: 'Professionnel', since: '2024-03-12'
  },
  {
    id: 'c2', name: 'Villa Ratoma', contact: 'Mme Aïssatou Diallo', company: null,
    phone: '+224 655 31 42 08', email: 'aissatou.diallo@gmail.com', city: 'Conakry',
    address: 'Quartier Ratoma, près de la mosquée', type: 'Particulier', since: '2025-11-04'
  },
  {
    id: 'c3', name: 'Mme Camara', contact: 'Fatoumata Camara', company: 'Camara Habitat',
    phone: '+224 655 44 55 66', email: 'fatou@camara.gn', city: 'Kamsar',
    address: 'Cité des Cadres, Kamsar', type: 'Professionnel', since: '2025-06-18'
  },
  {
    id: 'c4', name: 'Amadou Diallo', contact: 'Amadou Diallo', company: 'Diallo Construction',
    phone: '+224 622 11 22 33', email: 'amadou.diallo@email.com', city: 'Conakry',
    address: 'Matoto, Conakry', type: 'Professionnel', since: '2023-09-02'
  },
  {
    id: 'c5', name: 'Ibrahima Sow', contact: 'Ibrahima Sow', company: 'Sow BTP',
    phone: '+224 628 77 88 99', email: 'ibrahima.sow@gmail.com', city: 'Conakry',
    address: 'Kipé, Ratoma', type: 'Professionnel', since: '2024-01-22'
  },
  {
    id: 'c6', name: 'Mariama Bah', contact: 'Mariama Bah', company: 'Bah Peinture Pro',
    phone: '+224 611 22 33 44', email: 'mariama.bah@yahoo.fr', city: 'Kindia',
    address: 'Centre-ville, Kindia', type: 'Revendeur', since: '2024-07-30'
  },
  {
    id: 'c7', name: 'Résidence Koloma', contact: 'Syndic Koloma', company: 'Syndic Résidence Koloma',
    phone: '+224 664 05 18 40', email: 'syndic.koloma@email.com', city: 'Conakry',
    address: 'Koloma, Ratoma', type: 'Professionnel', since: '2025-02-14'
  },
  {
    id: 'c8', name: 'Pharmacie Madina', contact: 'Dr. Sékou Touré', company: 'Pharmacie Madina',
    phone: '+224 621 47 90 12', email: 'pharmacie.madina@email.com', city: 'Conakry',
    address: 'Madina, Matam', type: 'Professionnel', since: '2025-05-09'
  }
];

const TRANSPORT = 250000;

/** Construit des lignes cohérentes (HT + TVA = total) pour un devis de démonstration. */
function buildQuoteLines(total, finish = 'Finition mate', surface = 96) {
  const tvaRate = COMPANY.tvaRate;
  const ht = Math.round(total / (1 + tvaRate));
  const transport = Math.min(TRANSPORT, Math.round(ht * 0.05));
  const paint = Math.round((ht - transport) * 0.58);
  const labor = ht - transport - paint;
  const liters = Math.max(1, Math.round(paint / 21000));
  return {
    subtotal: ht,
    tvaAmount: total - ht,
    lines: [
      {
        icon: 'paint', designation: 'Peinture intérieure', detail: finish,
        qty: liters, unit: 'L', unitPrice: Math.round(paint / liters), amount: paint
      },
      {
        icon: 'labor', designation: 'Main-d’œuvre', detail: 'Application (2 couches)',
        qty: surface, unit: 'm²', unitPrice: Math.round(labor / surface), amount: labor
      },
      {
        icon: 'transport', designation: 'Transport', detail: 'Livraison sur site',
        qty: 1, unit: 'forfait', unitPrice: transport, amount: transport
      }
    ]
  };
}

/** Échéancier Peinture Flex par défaut. */
function defaultSchedule(total) {
  const acompte = Math.round(total * 0.4);
  const echeance1 = Math.round(total * 0.3);
  const echeance2 = Math.round(total * 0.2);
  const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  return [
    { id: 's1', step: 'Acompte reçu', amount: acompte, dueDate: addDays(15), status: 'a_venir' },
    { id: 's2', step: 'Échéance 1', amount: echeance1, dueDate: addDays(30), status: 'a_venir' },
    { id: 's3', step: 'Échéance 2', amount: echeance2, dueDate: addDays(45), status: 'a_venir' },
    { id: 's4', step: 'Conditions à valider localement', amount: null, dueDate: null, status: 'a_valider' }
  ];
}

const FLAGSHIP_SCHEDULE = [
  { id: 's1', step: 'Acompte reçu', amount: 3000000, dueDate: '2026-01-15', status: 'paye' },
  { id: 's2', step: 'Échéance 1 payée', amount: 2000000, dueDate: '2026-01-30', status: 'paye' },
  { id: 's3', step: 'Échéance 2 en retard', amount: 2100000, dueDate: '2026-02-15', status: 'en_retard' },
  { id: 's4', step: 'Conditions à valider localement', amount: null, dueDate: null, status: 'a_valider' }
];

const FLAGSHIP_FINANCING = {
  bank: 'Banque partenaire',
  amount: 7500000,
  steps: [
    { name: 'Dossier', date: '10 janv. 2026 à 09:24', status: 'valide', label: 'Validé' },
    { name: 'Pièces', date: '11 janv. 2026 à 14:07', status: 'completes', label: 'Complètes' },
    { name: 'Transmis', date: '12 janv. 2026 à 10:31', status: 'en_cours', label: 'En cours' },
    { name: 'Décision de la banque', date: null, status: 'en_attente', label: 'En attente' }
  ]
};

function makeQuote(o) {
  const built = buildQuoteLines(o.total, o.finish, o.surface);
  return {
    id: o.id,
    clientId: o.clientId,
    clientName: o.clientName,
    clientCompany: o.clientCompany || null,
    subject: o.subject,
    site: o.site,
    createdAt: o.createdAt,
    validUntil: o.validUntil || null,
    status: o.status,
    relance: !!o.relance,
    surface: o.surface || 96,
    total: o.total,
    subtotal: built.subtotal,
    tvaRate: COMPANY.tvaRate,
    tvaAmount: built.tvaAmount,
    lines: built.lines,
    rooms: [{
      name: o.roomName || 'Espace principal',
      length: 6, width: 4, height: 3, doors: 1, windows: 2
    }],
    schedule: o.schedule || [],
    financing: o.financing || null,
    notes: o.notes || ''
  };
}

const QUOTES = [
  makeQuote({
    id: 'DV-2026-031', clientId: 'c1', clientName: 'Hôtel Kaloum', clientCompany: 'Hôtel Kaloum',
    subject: 'Rénovation de 12 chambres', site: 'Kaloum, Conakry',
    createdAt: '2026-02-12', validUntil: '2026-03-14', status: 'brouillon', relance: true,
    total: 12500000, finish: 'Finition mate • Blanc Cassé', surface: 320, roomName: 'Chambres 201 à 212',
    schedule: FLAGSHIP_SCHEDULE, financing: FLAGSHIP_FINANCING,
    notes: 'Acompte de 30 % à la commande. Peinture FOM mate sur murs et plafonds.'
  }),
  makeQuote({
    id: 'DV-2026-030', clientId: 'c2', clientName: 'Villa Ratoma', clientCompany: null,
    subject: 'Peinture villa R+1', site: 'Ratoma, Conakry',
    createdAt: '2026-02-11', validUntil: '2026-03-13', status: 'envoye', relance: true,
    total: 8750000, finish: 'Finition satin • Beige sable', surface: 240, roomName: 'Séjour et chambres',
    notes: 'Devis envoyé par WhatsApp le 11 février.'
  }),
  makeQuote({
    id: 'DV-2026-029', clientId: 'c3', clientName: 'Mme Camara', clientCompany: 'Camara Habitat',
    subject: 'Finition intérieure villa Kamsar', site: 'Kamsar',
    createdAt: '2026-02-09', validUntil: '2026-03-11', status: 'accepte', relance: false,
    total: 6200000, finish: 'Finition mate • Blanc Cassé', surface: 180, roomName: 'Villa complète',
    notes: 'Bon pour accord signé le 10 février 2026.'
  }),
  makeQuote({
    id: 'DV-2026-028', clientId: 'c4', clientName: 'Amadou Diallo', clientCompany: 'Diallo Construction',
    subject: 'Peinture immeuble Koloma', site: 'Koloma, Conakry',
    createdAt: '2026-02-06', status: 'envoye', relance: true, total: 4100000,
    finish: 'Finition satin • Gris perle', surface: 150
  }),
  makeQuote({
    id: 'DV-2026-027', clientId: 'c5', clientName: 'Ibrahima Sow', clientCompany: 'Sow BTP',
    subject: 'Façade villa Kipé', site: 'Kipé, Conakry',
    createdAt: '2026-02-04', status: 'brouillon', relance: false, total: 3200000,
    finish: 'Finition extérieure • Ocre', surface: 140
  }),
  makeQuote({
    id: 'DV-2026-026', clientId: 'c6', clientName: 'Mariama Bah', clientCompany: 'Bah Peinture Pro',
    subject: 'Réassort revendeur Kindia', site: 'Kindia',
    createdAt: '2026-02-02', status: 'accepte', relance: false, total: 2750000,
    finish: 'Finition mate • Teinte à définir', surface: 90
  }),
  makeQuote({
    id: 'DV-2026-025', clientId: 'c7', clientName: 'Résidence Koloma', clientCompany: 'Syndic Résidence Koloma',
    subject: 'Rafraîchissement halls', site: 'Koloma, Conakry',
    createdAt: '2026-01-30', status: 'envoye', relance: true, total: 2400000,
    finish: 'Finition satin • Lin', surface: 80
  }),
  makeQuote({
    id: 'DV-2026-024', clientId: 'c8', clientName: 'Pharmacie Madina', clientCompany: 'Pharmacie Madina',
    subject: 'Local commercial Madina', site: 'Madina, Conakry',
    createdAt: '2026-01-28', status: 'accepte', relance: false, total: 1850000,
    finish: 'Finition brillant • Blanc', surface: 70
  }),
  makeQuote({
    id: 'DV-2026-023', clientId: 'c1', clientName: 'Hôtel Kaloum', clientCompany: 'Hôtel Kaloum',
    subject: 'Réfection réception', site: 'Kaloum, Conakry',
    createdAt: '2026-01-26', status: 'envoye', relance: false, total: 1600000,
    finish: 'Finition satin • Sable', surface: 60
  }),
  makeQuote({
    id: 'DV-2026-022', clientId: 'c2', clientName: 'Villa Ratoma', clientCompany: null,
    subject: 'Salle de bain et couloir', site: 'Ratoma, Conakry',
    createdAt: '2026-01-24', status: 'brouillon', relance: false, total: 1500000,
    finish: 'Finition satin • Blanc cassé', surface: 45
  }),
  makeQuote({
    id: 'DV-2026-021', clientId: 'c4', clientName: 'Amadou Diallo', clientCompany: 'Diallo Construction',
    subject: 'Sous-couche nouveau bâtiment', site: 'Matoto, Conakry',
    createdAt: '2026-01-22', status: 'envoye', relance: true, total: 1250000,
    finish: 'Primaire • Blanc', surface: 110
  }),
  makeQuote({
    id: 'DV-2026-020', clientId: 'c5', clientName: 'Ibrahima Sow', clientCompany: 'Sow BTP',
    subject: 'Bureaux Sow BTP', site: 'Kipé, Conakry',
    createdAt: '2026-01-20', status: 'brouillon', relance: false, total: 950000,
    finish: 'Finition mate • Gris clair', surface: 40
  }),
  makeQuote({
    id: 'DV-2026-019', clientId: 'c6', clientName: 'Mariama Bah', clientCompany: 'Bah Peinture Pro',
    subject: 'Commande accessoires chantier', site: 'Kindia',
    createdAt: '2026-01-18', status: 'accepte', relance: false, total: 850000,
    finish: 'Accessoires et consommables', surface: 0
  }),
  makeQuote({
    id: 'DV-2026-018', clientId: 'c7', clientName: 'Résidence Koloma', clientCompany: 'Syndic Résidence Koloma',
    subject: 'Escalier et garde-corps', site: 'Koloma, Conakry',
    createdAt: '2026-01-16', status: 'brouillon', relance: false, total: 700000,
    finish: 'Laque • Gris anthracite', surface: 25
  })
];

const PAYMENTS = [
  {
    id: 'AC-2026-007', clientId: 'c8', clientName: 'Pharmacie Madina', quoteId: 'DV-2026-024',
    amount: 1850000, date: '2026-02-01', method: 'especes', reference: 'ESP-2204',
    notes: 'Règlement local commercial', createdAt: '2026-02-01T12:20:00'
  },
  {
    id: 'AC-2026-006', clientId: 'c7', clientName: 'Résidence Koloma', quoteId: 'DV-2026-025',
    amount: 2400000, date: '2026-01-12', method: 'virement', reference: 'VIR-88032',
    notes: 'Solde halls A et B', createdAt: '2026-01-12T10:05:00'
  },
  {
    id: 'AC-2026-005', clientId: 'c5', clientName: 'Ibrahima Sow', quoteId: 'DV-2026-027',
    amount: 1800000, date: '2025-12-09', method: 'mobile_money', reference: 'OM-660218',
    notes: 'Acompte façade Kipé', createdAt: '2025-12-09T16:32:00'
  },
  {
    id: 'AC-2026-004', clientId: 'c4', clientName: 'Amadou Diallo', quoteId: 'DV-2026-028',
    amount: 3200000, date: '2025-11-18', method: 'cheque', reference: 'CHQ-4518',
    notes: 'Acompte immeuble Koloma', createdAt: '2025-11-18T09:45:00'
  },
  {
    id: 'AC-2026-002', clientId: 'c1', clientName: 'Hôtel Kaloum', quoteId: 'DV-2026-023',
    amount: 2500000, date: '2025-10-05', method: 'virement', reference: 'VIR-81007',
    notes: 'Réfection réception', createdAt: '2025-10-05T11:10:00'
  },
  {
    id: 'AC-2026-001', clientId: 'c6', clientName: 'Mariama Bah', quoteId: 'DV-2026-019',
    amount: 1200000, date: '2025-09-12', method: 'virement', reference: 'VIR-79233',
    notes: 'Commande accessoires', createdAt: '2025-09-12T14:00:00'
  },
  {
    id: 'AC-2026-014', clientId: 'c2', clientName: 'Villa Ratoma', quoteId: 'DV-2026-030',
    amount: 2000000, date: '2026-02-08', method: 'especes', reference: 'ESP-2281',
    notes: 'Acompte de démarrage', createdAt: '2026-02-08T10:12:00'
  },
  {
    id: 'AC-2026-013', clientId: 'c3', clientName: 'Mme Camara', quoteId: 'DV-2026-029',
    amount: 1500000, date: '2026-02-05', method: 'mobile_money', reference: 'OM-771204',
    notes: 'Premier versement', createdAt: '2026-02-05T15:40:00'
  },
  {
    id: 'AC-2026-012', clientId: 'c6', clientName: 'Mariama Bah', quoteId: 'DV-2026-026',
    amount: 2400000, date: '2026-02-02', method: 'virement', reference: 'VIR-90211',
    notes: 'Règlement réassort', createdAt: '2026-02-02T09:05:00'
  },
  {
    id: 'AC-2026-011', clientId: 'c1', clientName: 'Hôtel Kaloum', quoteId: 'DV-2026-031',
    amount: 2000000, date: '2026-01-30', method: 'mobile_money', reference: 'OM-992341',
    notes: 'Échéance 1', createdAt: '2026-01-30T14:10:00'
  },
  {
    id: 'AC-2026-008', clientId: 'c1', clientName: 'Hôtel Kaloum', quoteId: 'DV-2026-031',
    amount: 3000000, date: '2026-01-15', method: 'virement', reference: 'VIR-88421',
    notes: 'Acompte initial — Peinture Flex', createdAt: '2026-01-15T09:24:00'
  },
  {
    id: 'AC-2026-003', clientId: 'c4', clientName: 'Amadou Diallo', quoteId: 'DV-2026-024',
    amount: 1850000, date: '2026-01-18', method: 'cheque', reference: 'CHQ-4521',
    notes: 'Paiement total', createdAt: '2026-01-18T11:00:00'
  }
];

const CHANTIERS = [
  {
    id: 'CH-2026-006', name: 'Hôtel Kaloum — 12 chambres', clientId: 'c1', clientName: 'Hôtel Kaloum',
    city: 'Kaloum, Conakry', quoteId: 'DV-2026-031', budget: 12500000, spent: 6100000,
    progress: 68, status: 'en_cours', startDate: '2026-01-18', endDate: '2026-03-05',
    chef: 'Mamadou Saliou', team: 8, tasks: ['Préparation des supports', 'Mastic et ponçage', 'Sous-couche', '2 couches FOM mat', 'Finitions et nettoyage']
  },
  {
    id: 'CH-2026-005', name: 'Villa Ratoma — R+1', clientId: 'c2', clientName: 'Villa Ratoma',
    city: 'Ratoma, Conakry', quoteId: 'DV-2026-030', budget: 8750000, spent: 2600000,
    progress: 35, status: 'en_cours', startDate: '2026-02-02', endDate: '2026-03-20',
    chef: 'Abdoulaye Camara', team: 5, tasks: ['Mastic', 'Sous-couche', 'Peinture satin', 'Boiseries']
  },
  {
    id: 'CH-2026-004', name: 'Pharmacie Madina — local commercial', clientId: 'c8', clientName: 'Pharmacie Madina',
    city: 'Madina, Conakry', quoteId: 'DV-2026-024', budget: 1850000, spent: 1520000,
    progress: 82, status: 'en_cours', startDate: '2026-01-20', endDate: '2026-02-18',
    chef: 'Fatou Bintou Sylla', team: 3, tasks: ['Préparation', 'Peinture brillant', 'Enseigne et retouches']
  },
  {
    id: 'CH-2026-003', name: 'Résidence Koloma — halls A et B', clientId: 'c7', clientName: 'Résidence Koloma',
    city: 'Koloma, Conakry', quoteId: 'DV-2026-025', budget: 2400000, spent: 2400000,
    progress: 100, status: 'termine', startDate: '2025-12-01', endDate: '2026-01-12',
    chef: 'Mamadou Saliou', team: 4, tasks: ['Halls', 'Escaliers', 'Nettoyage final']
  },
  {
    id: 'CH-2026-007', name: 'Immeuble Kipé — 3 niveaux', clientId: 'c5', clientName: 'Ibrahima Sow',
    city: 'Kipé, Conakry', quoteId: 'DV-2026-027', budget: 3200000, spent: 0,
    progress: 0, status: 'planifie', startDate: '2026-03-02', endDate: '2026-04-15',
    chef: 'Abdoulaye Camara', team: 6, tasks: ['Installation chantier', 'Mastic', 'Peinture', 'Réception']
  },
  {
    id: 'CH-2026-002', name: 'Bah Peinture Pro — dépôt Kindia', clientId: 'c6', clientName: 'Mariama Bah',
    city: 'Kindia', quoteId: 'DV-2026-026', budget: 2750000, spent: 2750000,
    progress: 100, status: 'termine', startDate: '2025-11-10', endDate: '2025-12-20',
    chef: 'Fatou Bintou Sylla', team: 2, tasks: ['Aménagement dépôt', 'Peinture', 'Livraison']
  }
];

const DRAFT_QUOTE = {
  id: 'BROUILLON',
  clientId: 'c3',
  clientName: 'Mme Camara',
  productId: 'p1',
  finish: 'Finition mate • Blanc Cassé',
  rooms: [
    { id: 'r1', name: 'Salon', length: 5.2, width: 6.0, height: 3.0, doors: 2, windows: 3 }
  ],
  assumptions: { rendement: 10, coats: 2, waste: 0.10, laborPrice: 30000, transport: 250000, tvaRate: 0.18, tvaEnabled: true },
  lines: [
    {
      icon: 'paint', designation: 'Peinture intérieure', detail: 'Finition mate • Blanc Cassé',
      qty: 36, unit: 'L', unitPrice: 75000, amount: 2700000
    },
    {
      icon: 'labor', designation: 'Main-d’œuvre', detail: 'Application (2 couches)',
      qty: 104.4, unit: 'm²', unitPrice: 30000, amount: 3132000
    },
    {
      icon: 'transport', designation: 'Transport', detail: 'Livraison sur site',
      qty: 1, unit: 'forfait', unitPrice: 250000, amount: 250000
    }
  ],
  surface: 104.4,
  subtotal: 6082000,
  tvaRate: 0.18,
  tvaEnabled: true,
  tvaAmount: 338000,
  total: 6420000
};

module.exports = {
  COMPANY, PRODUCTS, CLIENTS, QUOTES, PAYMENTS, CHANTIERS, DRAFT_QUOTE,
  buildQuoteLines, defaultSchedule
};
