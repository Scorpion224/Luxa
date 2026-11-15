/* ==========================================================================
   Peinture Pro Guinée — Application de gestion commerciale
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------- */
  /* Utilitaires                                                             */
  /* ---------------------------------------------------------------------- */
  const view = document.getElementById('view');
  const modalRoot = document.getElementById('modalRoot');
  const toastRoot = document.getElementById('toasts');
  const printRoot = document.getElementById('printRoot');
  const nf = new Intl.NumberFormat('fr-FR');

  const fmt = (n) => nf.format(Math.round(Number(n) || 0));
  const money = (n) => fmt(n) + ' GNF';
  const dec = (n) => {
    const value = Number(n) || 0;
    return (Math.round(value * 10) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };
  const n1 = (n) => (Number(n) || 0).toFixed(1).replace('.', ',');
  const parseNum = (v) => Number(String(v == null ? '' : v).replace(',', '.')) || 0;
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function parseDate(value) {
    if (!value) return null;
    const raw = String(value).slice(0, 10);
    const parts = raw.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date(value);
  }
  function dateFr(value) {
    const d = parseDate(value);
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function dateShort(value) {
    const d = parseDate(value);
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  const todayIso = () => new Date().toISOString().slice(0, 10);

  async function api(path, options) {
    const opts = Object.assign({ headers: {} }, options || {});
    const token = state.session && state.session.token;
    if (token) opts.headers.Authorization = 'Bearer ' + token;
    if (opts.body && typeof opts.body !== 'string') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, opts);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (res.status === 401 && !String(path).startsWith('/api/auth/login')) {
      signOut(true);
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    if (!res.ok) throw new Error((data && data.error) || 'Erreur serveur');
    return data;
  }

  function toast(message, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'success');
    el.innerHTML = '<i class="fa-solid ' + (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check') + '"></i><span>' + esc(message) + '</span>';
    toastRoot.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s ease';
      setTimeout(() => el.remove(), 320);
    }, 2800);
  }

  const STATUS_LABEL = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    refuse: 'Refusé',
    en_retard: 'En retard'
  };
  const METHOD_LABEL = {
    especes: 'Espèces',
    virement: 'Virement',
    mobile_money: 'Mobile Money',
    cheque: 'Chèque'
  };
  const CHANTIER_LABEL = {
    planifie: 'Planifié',
    en_cours: 'En cours',
    termine: 'Terminé'
  };

  const badge = (status, label) => {
    const text = label || STATUS_LABEL[status] || status;
    const dot = ['brouillon', 'envoye', 'accepte', 'refuse', 'en_retard'].includes(status) ? '<i class="dot"></i>' : '';
    return '<span class="badge ' + status + '">' + dot + esc(text) + '</span>';
  };

  /* ---------------------------------------------------------------------- */
  /* État                                                                */
  /* ---------------------------------------------------------------------- */
  const state = {
    company: null,
    session: null,
    roles: null,
    route: 'devis',
    token: 0,
    draft: null,
    products: [],
    clients: [],
    catalogue: { category: 'FOM intérieurs', view: 'grid', search: '', sort: 'name' },
    quotes: { page: 1, sort: 'recent' },
    payment: { tab: 'flex', quoteId: null },
    clientsSearch: '',
    stocksSearch: ''
  };

  /* ---------------------------------------------------------------------- */
  /* Session, rôles & permissions                                        */
  /* ---------------------------------------------------------------------- */
  const SESSION_KEY = 'ppg.session';
  const MODULE_PERMISSION = {
    devis: 'devis:read',
    catalogue: 'catalogue:read',
    clients: 'clients:read',
    stocks: 'stocks:read',
    chantiers: 'chantiers:read',
    finance: 'finance:read',
    paiement: 'paiement:read'
  };
  const ROUTE_MODULE = {
    devis: 'devis',
    'devis/nouveau': 'devis',
    catalogue: 'catalogue',
    clients: 'clients',
    stocks: 'stocks',
    chantiers: 'chantiers',
    finance: 'finance',
    paiement: 'paiement'
  };

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (err) {
      return null;
    }
  }
  function persistSession(session) {
    state.session = session;
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch (err) { /* stockage indisponible : session en mémoire seulement */ }
    syncSessionUI();
  }
  const currentUser = () => (state.session && state.session.user) || null;

  function can(permission) {
    const user = currentUser();
    if (!user) return false;
    const perms = user.permissions || [];
    return perms.includes('*') || perms.includes(permission);
  }
  const canModule = (moduleKey) => can(MODULE_PERMISSION[moduleKey] || '');
  function canRoute(route) {
    const mod = ROUTE_MODULE[route];
    if (!mod) return true;
    if (!canModule(mod)) return false;
    if (route === 'devis/nouveau') return can('devis:write');
    return true;
  }
  function firstAllowedRoute() {
    const order = ['devis', 'catalogue', 'clients', 'stocks', 'chantiers', 'finance', 'paiement'];
    return order.find((r) => canRoute(r)) || 'devis';
  }

  function initialsOf(name) {
    return String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  /* ---------------------------------------------------------------------- */
  /* Gabarits communs                                                    */
  /* ---------------------------------------------------------------------- */
  function pageHead(opts) {
    const crumbs = opts.breadcrumb ? '<div class="breadcrumb">' + opts.breadcrumb + '</div>' : '';
    return '<div class="page-head' + (opts.breadcrumb ? ' with-crumb' : '') + '">' + crumbs +
      '<h1>' + opts.title + '</h1>' +
      (opts.sub ? '<p class="sub">' + opts.sub + '</p>' : '') +
      '</div>';
  }

  function emptyState(icon, text) {
    return '<div class="empty"><i class="fa-solid ' + icon + '"></i>' + esc(text) + '</div>';
  }

  /* ---------------------------------------------------------------------- */
  /* Routeur                                                             */
  /* ---------------------------------------------------------------------- */
  function getRoute() {
    const hash = (location.hash || '').replace(/^#\/?/, '').trim();
    if (!hash) return 'devis';
    return hash;
  }
  function go(route) {
    if (getRoute() === route) render();
    else location.hash = '#/' + route;
  }
  function setActiveNav(route) {
    const base = route.startsWith('devis') ? 'devis' : route.split('/')[0];
    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.nav === base);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Authentification                                                    */
  /* ---------------------------------------------------------------------- */
  function syncSessionUI() {
    const user = currentUser();
    document.body.classList.toggle('auth-mode', !user);

    const chip = document.getElementById('userChip');
    if (chip) {
      if (!user) {
        chip.innerHTML = '';
      } else {
        chip.innerHTML = '<span class="avatar">' + esc(user.initials || initialsOf(user.name)) + '</span>' +
          '<span>' + esc(user.roleLabel || user.role) + '</span>' +
          '<i class="fa-solid fa-chevron-down"></i>';
        chip.title = user.name + ' — ' + user.email;
      }
    }

    document.querySelectorAll('.nav-item').forEach((el) => {
      const mod = ROUTE_MODULE[el.dataset.route];
      el.hidden = !!mod && !canModule(mod);
    });
  }

  function accessDenied() {
    const user = currentUser();
    const roleLabel = (user && (user.roleLabel || user.role)) || 'votre rôle';
    return pageHead({
      title: 'Accès restreint',
      sub: 'Cette page n’est pas ouverte à votre rôle.'
    }) +
      '<div class="page-body"><div class="card"><div class="denied">' +
        '<span class="denied-icon"><i class="fa-solid fa-lock"></i></span>' +
        '<h2>Accès restreint</h2>' +
        '<p>Le rôle « ' + esc(roleLabel) + ' » n’a pas les droits nécessaires pour consulter cette page. ' +
          'Connectez-vous avec un autre compte pour y accéder.</p>' +
        '<button class="btn btn-primary" data-action="go-home">' +
          '<i class="fa-solid fa-arrow-left"></i> Retour à l’accueil</button>' +
      '</div></div></div>';
  }

  function renderLoginScreen() {
    const demo = (state.roles && state.roles.roles) || [];
    const accounts = demo.length ? demo : [
      { label: 'Administrateur', key: 'admin' },
      { label: 'Commercial', key: 'commercial' },
      { label: 'Comptable', key: 'comptable' },
      { label: 'Stockiste', key: 'stockiste' }
    ];
    const emails = {
      admin: 'admin@peinturepro.gn',
      commercial: 'commercial@peinturepro.gn',
      comptable: 'comptable@peinturepro.gn',
      stockiste: 'stock@peinturepro.gn'
    };
    const passwords = {
      admin: 'admin123',
      commercial: 'com123',
      comptable: 'compta123',
      stockiste: 'stock123'
    };
    const demoButtons = accounts.map((role) =>
      '<button type="button" class="auth-demo-btn" data-demo-email="' + esc(emails[role.key] || '') + '" data-demo-password="' + esc(passwords[role.key] || '') + '">' +
        '<span class="auth-demo-role">' + esc(role.label) + '</span>' +
        '<span class="auth-demo-mail">' + esc(emails[role.key] || '') + '</span>' +
      '</button>'
    ).join('');

    view.innerHTML =
      '<div class="auth-screen">' +
        '<div class="auth-card">' +
          '<img class="auth-logo" src="assets/logo.png" alt="Peinture Pro Guinée">' +
          '<h1>Connexion</h1>' +
          '<p class="auth-sub">Accédez à votre espace de gestion commerciale.</p>' +
          '<form id="loginForm" class="auth-form" novalidate>' +
            '<div class="field"><label for="loginEmail">Adresse email</label>' +
              '<input class="input" id="loginEmail" type="email" autocomplete="username" placeholder="prenom@peinturepro.gn"></div>' +
            '<div class="field"><label for="loginPassword">Mot de passe</label>' +
              '<input class="input" id="loginPassword" type="password" autocomplete="current-password" placeholder="••••••••"></div>' +
            '<div class="auth-error" id="loginError" hidden></div>' +
            '<button class="btn btn-primary auth-submit" type="submit"><i class="fa-solid fa-arrow-right-to-bracket"></i> Se connecter</button>' +
          '</form>' +
          '<div class="auth-demo">' +
            '<div class="auth-demo-title">Comptes de démonstration</div>' +
            '<div class="auth-demo-list">' + demoButtons + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    const form = document.getElementById('loginForm');
    const errorBox = document.getElementById('loginError');
    const showError = (message) => {
      errorBox.textContent = message;
      errorBox.hidden = false;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!email || !password) return showError('Renseignez votre email et votre mot de passe.');
      errorBox.hidden = true;
      signIn(email, password).catch((err) => showError(err.message));
    });

    view.querySelectorAll('[data-demo-email]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('loginEmail').value = btn.dataset.demoEmail;
        document.getElementById('loginPassword').value = btn.dataset.demoPassword;
        errorBox.hidden = true;
        signIn(btn.dataset.demoEmail, btn.dataset.demoPassword).catch((err) => showError(err.message));
      });
    });
  }

  async function signIn(email, password) {
    const data = await api('/api/auth/login', { method: 'POST', body: { email: email, password: password } });
    persistSession({ token: data.token, user: data.user });
    await loadData();
    const route = getRoute();
    const target = canRoute(route) ? route : firstAllowedRoute();
    if (target !== route) location.hash = '#/' + target;
    toast('Bienvenue ' + String(data.user.name || '').split(' ')[0]);
    if (target === route) render();
  }

  function signOut(silent) {
    const hadSession = !!state.session;
    const token = state.session && state.session.token;
    if (token) {
      fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(() => {});
    }
    state.draft = null;
    closeUserMenu();
    persistSession(null);
    closeModal();
    if (!silent) toast('Vous êtes déconnecté');
    if (hadSession) renderLoginScreen();
  }

  async function loadData() {
    try {
      state.company = await api('/api/company');
      await ensureDraft();
      state.products = await api('/api/products');
      state.clients = await api('/api/clients');
    } catch (err) {
      console.error(err);
    }
  }

  /* Menu du compte */
  function closeUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.remove();
  }

  function toggleUserMenu() {
    if (document.getElementById('userMenu')) return closeUserMenu();
    const user = currentUser();
    if (!user) return;
    const menu = document.createElement('div');
    menu.id = 'userMenu';
    menu.className = 'user-menu';
    menu.innerHTML =
      '<div class="user-menu-head">' +
        '<span class="avatar">' + esc(user.initials || initialsOf(user.name)) + '</span>' +
        '<div><div class="user-menu-name">' + esc(user.name) + '</div>' +
        '<div class="user-menu-mail">' + esc(user.email) + '</div>' +
        '<div class="user-menu-role">' + esc(user.roleLabel || user.role) + '</div></div>' +
      '</div>' +
      '<button class="user-menu-item" data-action="sign-out"><i class="fa-solid fa-arrow-right-from-bracket"></i> Se déconnecter</button>';
    document.querySelector('.topbar').appendChild(menu);
    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="sign-out"]');
      if (btn) signOut();
    });
  }


  /* ---------------------------------------------------------------------- */
  /* Page — Tableau de bord / Devis                                       */
  /* ---------------------------------------------------------------------- */
  async function renderDevis() {
    const data = await api('/api/dashboard?sort=' + encodeURIComponent(state.quotes.sort) + '&page=' + state.quotes.page);
    const k = data.kpis;
    const q = data.quotes;
    const shown = q.items.slice(0, 3);
    const total = Math.min(3, q.total);
    const first = total === 0 ? 0 : 1;
    const last = shown.length;

    const rows = shown.map((item) => (
      '<tr>' +
        '<td class="quote-row-id">' + esc(item.id) + '</td>' +
        '<td class="quote-row-client">' + esc(item.clientName) + '</td>' +
        '<td class="num">' + money(item.total) + '</td>' +
        '<td>' + badge(item.status, item.statusLabel) + '</td>' +
        '<td class="right"><button class="pill-link" data-action="quote-open" data-id="' + esc(item.id) + '">Voir</button></td>' +
      '</tr>'
    )).join('');

    const pager = (() => {
      let html = '<button disabled><i class="fa-solid fa-chevron-left"></i></button>';
      html += '<button class="active" data-action="quotes-page" data-page="1">1</button>';
      html += '<button disabled><i class="fa-solid fa-chevron-right"></i></button>';
      return html;
    })();

    const greetingRole = (currentUser() && (currentUser().roleLabel || currentUser().role)) || 'Commercial';
    return pageHead({
      title: 'Bonjour ' + esc(greetingRole) + ' !',
      sub: 'Gérez vos devis, explorez notre catalogue et développez votre activité.'
    }) +
    '<div class="page-body">' +
      '<div class="kpis">' +
        '<div class="kpi">' +
          '<div class="kpi-icon teal"><i class="fa-solid fa-file-lines"></i></div>' +
          '<div><div class="kpi-label">Devis en cours</div><div class="kpi-value">' + k.enCours + '</div></div>' +
        '</div>' +
        '<div class="kpi">' +
          '<div class="kpi-icon orange"><i class="fa-solid fa-coins"></i></div>' +
          '<div><div class="kpi-label">Valeur</div><div class="kpi-value sm">' + money(k.valeur) + '</div></div>' +
        '</div>' +
        '<div class="kpi">' +
          '<div class="kpi-icon rust"><i class="fa-solid fa-bell"></i></div>' +
          '<div><div class="kpi-label">À relancer</div><div class="kpi-value">' + k.relancer + '</div></div>' +
        '</div>' +
        '<div class="kpi green-tint">' +
          '<div class="kpi-icon green"><i class="fa-solid fa-check"></i></div>' +
          '<div><div class="kpi-label">Données de<br>démonstration</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="dashboard-grid">' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<span class="card-icon"><i class="fa-solid fa-file-lines"></i></span>' +
            '<span class="card-title">Mes devis en cours</span>' +
            '<span class="spacer"></span>' +
            '<span class="toolbar-label">Trier par :</span>' +
            '<select class="select" id="quoteSort" aria-label="Trier les devis" style="width:150px">' +
              '<option value="recent"' + (state.quotes.sort === 'recent' ? ' selected' : '') + '>Date récente</option>' +
              '<option value="amount_desc"' + (state.quotes.sort === 'amount_desc' ? ' selected' : '') + '>Montant décroissant</option>' +
              '<option value="client"' + (state.quotes.sort === 'client' ? ' selected' : '') + '>Client (A → Z)</option>' +
            '</select>' +
            (can('devis:write') ? '<button class="btn btn-soft btn-sm" data-action="new-quote" title="Nouveau devis"><i class="fa-solid fa-plus"></i><span class="btn-label">Nouveau devis</span></button>' : '') +
          '</div>' +
          '<table class="data">' +
            '<thead><tr><th>N° Devis</th><th>Client</th><th>Montant</th><th>Statut</th><th class="right">Action</th></tr></thead>' +
            '<tbody>' + (rows || '<tr><td colspan="5">' + emptyState('fa-file-lines', 'Aucun devis en cours') + '</td></tr>') + '</tbody>' +
          '</table>' +
          '<div class="table-foot">' +
            '<span>Affichage de ' + first + ' à ' + last + ' sur ' + total + ' devis</span>' +
            '<div class="pager">' + pager + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<span class="card-icon"><i class="fa-solid fa-table-cells-large"></i></span>' +
            '<span class="card-title">Catalogue rapide</span>' +
          '</div>' +
          '<div class="quick-search">' +
            '<div class="search-field"><i class="fa-solid fa-magnifying-glass"></i>' +
            '<input class="input" id="quickSearch" type="search" placeholder="Rechercher un produit"></div>' +
          '</div>' +
          '<div class="quick-list">' +
            '<button class="quick-item" data-action="catalogue-category" data-category="FOM intérieurs">' +
              '<span class="quick-thumb"><img src="assets/quick-fan.png" alt=""></span>' +
              '<span class="quick-name">FOM intérieurs</span>' +
              '<i class="fa-solid fa-chevron-right"></i>' +
            '</button>' +
            '<button class="quick-item" data-action="catalogue-category" data-category="Mastiques pour murs">' +
              '<span class="quick-thumb"><img src="assets/quick-pot.png" alt=""></span>' +
              '<span class="quick-name">Mastic en pâte</span>' +
              '<i class="fa-solid fa-chevron-right"></i>' +
            '</button>' +
          '</div>' +
          '<div class="quick-foot">' +
            '<button class="btn btn-primary" data-action="go" data-route="catalogue">Voir tout le catalogue <i class="fa-solid fa-chevron-right"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------------------- */
  /* Page — Catalogue                                                    */
  /* ---------------------------------------------------------------------- */
  async function renderCatalogue() {
    const cat = state.catalogue;
    const products = await api('/api/products?category=' + (cat.search ? '' : encodeURIComponent(cat.category)) +
      '&search=' + encodeURIComponent(cat.search) + '&sort=' + encodeURIComponent(cat.sort));
    state.products = await api('/api/products');
    const categories = ['FOM intérieurs', 'FOM extérieurs', 'Mastiques pour murs', 'Peintures à huile', 'Accessoires et consommables'];

    const cards = products.map((p) => productCard(p)).join('');

    return pageHead({
      title: 'Catalogue produits',
      sub: 'Parcourez notre gamme de peintures, mastiques et accessoires.'
    }) +
    '<div class="page-body">' +
      '<div class="catalogue-toolbar">' +
        '<div class="search-field"><i class="fa-solid fa-magnifying-glass"></i>' +
          '<input class="input" id="catalogueSearch" type="search" placeholder="Rechercher un produit..." value="' + esc(cat.search) + '"></div>' +
        '<div class="sort-group"><span class="toolbar-label">Trier par :</span>' +
          '<select class="select" id="catalogueSort">' +
            '<option value="name"' + (cat.sort === 'name' ? ' selected' : '') + '>Nom (A → Z)</option>' +
            '<option value="price_asc"' + (cat.sort === 'price_asc' ? ' selected' : '') + '>Prix croissant</option>' +
            '<option value="price_desc"' + (cat.sort === 'price_desc' ? ' selected' : '') + '>Prix décroissant</option>' +
            '<option value="stock_desc"' + (cat.sort === 'stock_desc' ? ' selected' : '') + '>Stock disponible</option>' +
          '</select>' +
        '</div>' +
        '<div class="view-toggle">' +
          '<button class="' + (cat.view === 'grid' ? 'active' : '') + '" data-action="catalogue-view" data-view="grid" aria-label="Vue grille"><i class="fa-solid fa-table-cells-large"></i></button>' +
          '<button class="' + (cat.view === 'list' ? 'active' : '') + '" data-action="catalogue-view" data-view="list" aria-label="Vue liste"><i class="fa-solid fa-bars-staggered"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="cat-row">' +
        categories.map((c) => '<button class="cat-chip ' + (!cat.search && c === cat.category ? 'active' : '') + '" data-action="catalogue-category" data-category="' + esc(c) + '">' + esc(c) + '</button>').join('') +
      '</div>' +
      '<div class="product-grid ' + (cat.view === 'list' ? 'list' : '') + '">' +
        (cards || emptyState('fa-box-open', 'Aucun produit ne correspond à votre recherche')) +
      '</div>' +
      '<div class="notice"><i class="fa-solid fa-triangle-exclamation"></i><span class="notice-text">Classification FOM à confirmer</span></div>' +
    '</div>';
  }

  function productCard(p) {
    const thumb = p.image
      ? '<img src="' + p.image + '" alt="' + esc(p.name) + '" loading="lazy">'
      : '<div class="icon-tile"><i class="fa-solid ' + esc(p.icon || 'fa-box') + '"></i></div>';
    return '<article class="product-card" data-action="product-open" data-id="' + esc(p.id) + '">' +
      '<div class="product-thumb">' + thumb + '</div>' +
      '<div class="product-info">' +
        '<div class="product-name">' + esc(p.name) + '</div>' +
        '<div><span class="price-tag">' + money(p.price) + '</span></div>' +
        '<div class="stock-line"><i class="fa-solid fa-box"></i> Disponible ' + p.stock + '</div>' +
        (p.lowStock ? '<span class="badge stock-bas"><i class="fa-solid fa-triangle-exclamation"></i> Stock bas</span>' : '') +
      '</div>' +
    '</article>';
  }

  /* ---------------------------------------------------------------------- */
  /* Page — Nouveau devis                                                */
  /* ---------------------------------------------------------------------- */
  async function ensureDraft() {
    if (!state.draft) {
      state.draft = await api('/api/quotes-draft');
      if (!state.draft.assumptions) {
        state.draft.assumptions = { rendement: 10, coats: 2, waste: 0.1, laborPrice: 30000, transport: 250000, tvaRate: 0.18 };
      }
      state.draft.rooms = (state.draft.rooms || []).map((r, i) => Object.assign({ id: 'r' + (i + 1) }, r));
      state.draft.stored = true;
    }
    return state.draft;
  }

  function roomFormula(room) {
    return '(' + n1(room.length) + ' + ' + n1(room.width) + ') × 2 × ' + n1(room.height) +
      ' − (' + (Number(room.doors) || 0) + ' × 2,00) − (' + (Number(room.windows) || 0) + ' × 1,5)';
  }

  function roomSurface(room) {
    const wall = 2 * ((Number(room.length) || 0) + (Number(room.width) || 0)) * (Number(room.height) || 0);
    const openings = (Number(room.doors) || 0) * 2 + (Number(room.windows) || 0) * 1.5;
    return Math.max(0, Math.round((wall - openings) * 10) / 10);
  }

  function lineIcon(line, product) {
    if (line.icon === 'paint') {
      return product && product.image
        ? '<img src="' + product.image + '" alt="">'
        : '<i class="fa-solid fa-paint-roller"></i>';
    }
    if (line.icon === 'labor') return '<i class="fa-solid fa-helmet-safety"></i>';
    return '<i class="fa-solid fa-truck"></i>';
  }

  function linesMarkup(draft, product) {
    return draft.lines.map((line) => {
      const pickable = line.icon === 'paint';
      const qty = (line.unit === 'm²' || line.unit === 'L') ? dec(line.qty) : line.qty;
      return '<tr' + (pickable ? ' class="pick-line" data-action="pick-product" title="Changer de produit"' : '') + '>' +
        '<td><div class="line-item">' +
          '<span class="line-ico">' + lineIcon(line, product) + '</span>' +
          '<div><div class="line-desig">' + esc(line.designation) + '</div>' +
          '<div class="line-detail">' + esc(line.detail) + '</div></div>' +
        '</div></td>' +
        '<td class="right qty">' + qty + ' ' + esc(line.unit) + '</td>' +
        '<td class="right pu">' + money(line.unitPrice) + '</td>' +
        '<td class="right amount">' + money(line.amount) + '</td>' +
      '</tr>';
    }).join('');
  }

  function roomMarkup(room) {
    const d = state.draft;
    const surface = (d && d.stored && d.surface && d.rooms.length === 1) ? d.surface : roomSurface(room);
    return '<div class="room-box" data-room-box="' + room.id + '">' +
      '<div class="room-head">' +
        '<div class="room-name">' +
          '<input value="' + esc(room.name) + '" data-room="' + room.id + '" data-field="name" aria-label="Nom de la pièce">' +
          '<span class="room-dims">' + n1(room.length) + ' × ' + n1(room.width) + ' m</span>' +
        '</div>' +
        '<div class="room-actions">' +
          '<button class="icon-btn" data-action="room-toggle" data-room="' + room.id + '" aria-label="Replier"><i class="fa-solid fa-chevron-up"></i></button>' +
          '<button class="icon-btn room-x" data-action="room-remove" data-room="' + room.id + '" aria-label="Supprimer"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="room-content">' +
        '<div class="room-fields">' +
          '<div class="field"><label>Longueur (m)</label><input class="input" type="text" inputmode="decimal" value="' + n1(room.length) + '" data-room="' + room.id + '" data-field="length"></div>' +
          '<div class="field"><label>Largeur (m)</label><input class="input" type="text" inputmode="decimal" value="' + n1(room.width) + '" data-room="' + room.id + '" data-field="width"></div>' +
          '<div class="field"><label>Hauteur (m)</label><input class="input" type="text" inputmode="decimal" value="' + n1(room.height) + '" data-room="' + room.id + '" data-field="height"></div>' +
        '</div>' +
        '<div class="room-fields two">' +
          '<div class="field"><label>Portes</label><div class="stepper">' +
            '<button type="button" data-action="room-step" data-room="' + room.id + '" data-field="doors" data-delta="-1">−</button>' +
            '<span class="val" data-room-val="doors-' + room.id + '">' + (Number(room.doors) || 0) + '</span>' +
            '<button type="button" data-action="room-step" data-room="' + room.id + '" data-field="doors" data-delta="1">+</button>' +
          '</div></div>' +
          '<div class="field"><label>Fenêtres</label><div class="stepper">' +
            '<button type="button" data-action="room-step" data-room="' + room.id + '" data-field="windows" data-delta="-1">−</button>' +
            '<span class="val" data-room-val="windows-' + room.id + '">' + (Number(room.windows) || 0) + '</span>' +
            '<button type="button" data-action="room-step" data-room="' + room.id + '" data-field="windows" data-delta="1">+</button>' +
          '</div></div>' +
        '</div>' +
        '<div class="surface-box">' +
          '<div class="surface-icon"><i class="fa-solid fa-vector-square"></i></div>' +
          '<div><div class="surface-label">Surface à peindre</div>' +
          '<div class="surface-value" data-room-surface="' + room.id + '">' + dec(surface) + ' m²</div></div>' +
          '<div class="surface-formula"><i class="fa-solid fa-circle-info"></i><span data-room-formula="' + room.id + '">' + roomFormula(room) + '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  async function renderNouveauDevis() {
    const draft = await ensureDraft();
    state.clients = await api('/api/clients');
    state.products = await api('/api/products');
    const product = state.products.find((p) => p.id === draft.productId) || state.products[0];
    const a = draft.assumptions;

    const clientOptions = state.clients.map((c) =>
      '<option value="' + esc(c.id) + '"' + (c.id === draft.clientId ? ' selected' : '') + '>' + esc(c.name) + '</option>'
    ).join('');

    const breadcrumb =
      '<button data-action="go" data-route="devis"><i class="fa-solid fa-arrow-left"></i> Devis en cours</button>' +
      '<span class="sep"><i class="fa-solid fa-chevron-right"></i></span>' +
      '<span class="current">Nouveau devis</span>';

    return pageHead({
      title: 'Nouveau devis',
      sub: 'Calculez les surfaces, estimez les quantités et générez votre devis.',
      breadcrumb: breadcrumb
    }) +
    '<div class="page-body">' +
      '<div class="quote-grid">' +
        '<div class="quote-col">' +
          '<div class="card">' +
            '<div class="card-head nowrap">' +
              '<span class="card-icon"><i class="fa-solid fa-house"></i></span>' +
              '<span class="card-title">Pièces et surfaces</span>' +
              '<span class="spacer"></span>' +
              '<button class="btn btn-soft btn-sm" data-action="room-add" style="padding:0 9px;font-size:12px"><i class="fa-solid fa-plus"></i> Ajouter une pièce</button>' +
            '</div>' +
            '<div class="card-body" id="roomsWrap">' + draft.rooms.map(roomMarkup).join('') + '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-head">' +
              '<span class="hyp-icon"><i class="fa-solid fa-paint-roller"></i></span>' +
              '<span class="card-title">Hypothèses</span>' +
            '</div>' +
            '<div class="card-body">' +
              '<div class="hyp-grid">' +
                '<div class="hyp-tile mint"><i class="fa-solid fa-bucket hyp-ico"></i><div><div class="hyp-label">Rendement<br>fabricant</div><div class="hyp-value">' + a.rendement + ' m²/L</div></div></div>' +
                '<div class="hyp-tile cream"><i class="fa-solid fa-layer-group hyp-ico"></i><div><div class="hyp-label">&nbsp;</div><div class="hyp-value">' + a.coats + ' couches</div></div></div>' +
                '<div class="hyp-tile rose"><i class="fa-solid fa-percent hyp-ico"></i><div><div class="hyp-label">Marge de perte</div><div class="hyp-value">' + Math.round(a.waste * 100) + ' %</div></div></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="quote-col">' +
          '<div class="card">' +
            '<div class="card-head nowrap">' +
              '<span class="card-icon"><i class="fa-solid fa-file-lines"></i></span>' +
              '<span class="card-title">Détail du devis</span>' +
              '<span class="spacer"></span>' +
              '<select class="select" id="draftClient" aria-label="Client du devis" style="width:150px;height:32px;font-size:12.5px">' + clientOptions + '</select>' +
            '</div>' +
            '<div class="card-body">' +
              '<table class="lines">' +
                '<thead><tr><th>Désignation</th><th class="right">Qté / Unité</th><th class="right">Prix unitaire</th><th class="right">Montant</th></tr></thead>' +
                '<tbody id="linesBody">' + linesMarkup(draft, product) + '</tbody>' +
              '</table>' +
              '<div class="tva-row">' +
                '<span class="tva-label">TVA configurable</span>' +
                '<div class="tva-controls">' +
                  '<label class="switch"><input type="checkbox" id="tvaToggle"' + (draft.tvaEnabled !== false ? ' checked' : '') + '><span class="track"></span></label>' +
                  '<select class="select" id="tvaRate">' +
                    [18, 10, 5, 0].map((r) => '<option value="' + r + '"' + (Math.round((draft.tvaRate || 0.18) * 100) === r ? ' selected' : '') + '>' + r + ' %</option>').join('') +
                  '</select>' +
                  '<span class="tva-amount" id="tvaAmount">' + money(draft.tvaAmount) + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="total-row"><span class="total-label">Total</span><span class="total-value" id="totalValue">' + money(draft.total) + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="quote-actions">' +
            '<button class="btn btn-outline" data-action="quote-save"><i class="fa-solid fa-floppy-disk"></i> Enregistrer v2</button>' +
            '<button class="btn btn-primary" data-action="quote-pdf"><i class="fa-solid fa-file-pdf"></i> Générer le PDF</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  let recalcTimer = null;
  function scheduleRecalc() {
    clearTimeout(recalcTimer);
    recalcTimer = setTimeout(recalcDraft, 180);
  }

  async function recalcDraft() {
    const d = state.draft;
    if (!d) return;
    try {
      const calc = await api('/api/quotes/calculate', {
        method: 'POST',
        body: {
          rooms: d.rooms,
          productId: d.productId,
          rendement: d.assumptions.rendement,
          coats: d.assumptions.coats,
          waste: d.assumptions.waste,
          laborPrice: d.assumptions.laborPrice,
          transport: d.assumptions.transport,
          tvaRate: d.assumptions.tvaRate,
          tvaEnabled: d.tvaEnabled
        }
      });
      d.stored = false;
      d.surface = calc.surface;
      d.subtotal = calc.subtotal;
      d.tvaAmount = calc.tvaAmount;
      d.total = calc.total;
      d.lines = [
        { icon: 'paint', designation: 'Peinture intérieure', detail: d.finish, qty: calc.details.peinture.qty, unit: 'L', unitPrice: calc.details.peinture.unitPrice, amount: calc.details.peinture.amount },
        { icon: 'labor', designation: 'Main-d’œuvre', detail: 'Application (' + d.assumptions.coats + ' couches)', qty: calc.details.mainOeuvre.qty, unit: 'm²', unitPrice: calc.details.mainOeuvre.unitPrice, amount: calc.details.mainOeuvre.amount },
        { icon: 'transport', designation: 'Transport', detail: 'Livraison sur site', qty: 1, unit: 'forfait', unitPrice: calc.details.transport.unitPrice, amount: calc.details.transport.amount }
      ];
      paintDraftComputation();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function paintDraftComputation() {
    const d = state.draft;
    if (!d) return;
    d.rooms.forEach((room) => {
      const s = document.querySelector('[data-room-surface="' + room.id + '"]');
      const f = document.querySelector('[data-room-formula="' + room.id + '"]');
      const box = document.querySelector('[data-room-box="' + room.id + '"] .room-dims');
      if (s) s.textContent = dec(roomSurface(room)) + ' m²';
      if (f) f.textContent = roomFormula(room);
      if (box) box.textContent = n1(room.length) + ' × ' + n1(room.width) + ' m';
      const doors = document.querySelector('[data-room-val="doors-' + room.id + '"]');
      const windows = document.querySelector('[data-room-val="windows-' + room.id + '"]');
      if (doors) doors.textContent = Number(room.doors) || 0;
      if (windows) windows.textContent = Number(room.windows) || 0;
    });
    const product = state.products.find((p) => p.id === d.productId);
    const body = document.getElementById('linesBody');
    if (body) body.innerHTML = linesMarkup(d, product);
    const tva = document.getElementById('tvaAmount');
    if (tva) tva.textContent = money(d.tvaAmount);
    const total = document.getElementById('totalValue');
    if (total) total.textContent = money(d.total);
    const pname = document.getElementById('quoteProductName');
    if (pname && product) pname.textContent = product.name;
  }

  /* ---------------------------------------------------------------------- */
  /* Page — Paiement (Peinture Flex)                                     */
  /* ---------------------------------------------------------------------- */
  async function renderPaiement() {
    const list = await api('/api/payments/quotes');
    if (!list.length) {
      return pageHead({
        title: 'Parcours de paiement',
        sub: 'Suivez l’avancement de vos règlements, vos échéances et votre dossier de financement.'
      }) + '<div class="page-body"><div class="card">' + emptyState('fa-calendar-days', 'Aucun devis avec un échéancier pour le moment') + '</div></div>';
    }
    if (!state.payment.quoteId || !list.some((q) => q.id === state.payment.quoteId)) {
      state.payment.quoteId = list[0].id;
    }
    const data = await api('/api/payments/' + encodeURIComponent(state.payment.quoteId));
    state.payment.total = data.quote.total;
    const tab = state.payment.tab;

    const options = list.map((q) =>
      '<option value="' + esc(q.id) + '"' + (q.id === state.payment.quoteId ? ' selected' : '') + '>Devis : ' + esc(q.id) + '</option>'
    ).join('');

    const tabs =
      '<div class="tabs">' +
        '<button class="tab ' + (tab === 'cash' ? 'active' : '') + '" data-action="payment-tab" data-tab="cash"><i class="fa-solid fa-coins"></i> PEINTURE CASH</button>' +
        '<button class="tab ' + (tab === 'flex' ? 'active' : '') + '" data-action="payment-tab" data-tab="flex"><i class="fa-solid fa-calendar-days"></i> PEINTURE FLEX</button>' +
        '<button class="tab ' + (tab === 'banque' ? 'active' : '') + '" data-action="payment-tab" data-tab="banque"><i class="fa-solid fa-building-columns"></i> Banque partenaire</button>' +
      '</div>';

    return pageHead({
      title: 'Parcours de paiement',
      sub: 'Suivez l’avancement de vos règlements, vos échéances et votre dossier de financement.'
    }) +
    '<div class="page-body">' + tabs + paymentContent(data, tab, options) + '</div>';
  }

  function paymentContent(data, tab, options) {
    if (tab === 'cash') return paymentCash(data, options);
    if (tab === 'banque') return paymentBanque(data, options);
    return paymentFlex(data, options);
  }

  function scheduleRows(schedule) {
    if (!schedule || !schedule.length) return emptyState('fa-calendar-xmark', 'Aucune échéance planifiée');
    return schedule.map((s) => (
      '<tr class="pay-row" data-action="payment-step" data-step="' + esc(s.id) + '" title="Enregistrer le paiement">' +
        '<td><span class="step-name"><span class="step-icon ' + s.status + '">' +
          '<i class="fa-solid ' + (s.status === 'paye' ? 'fa-check' : s.status === 'en_retard' ? 'fa-exclamation' : s.status === 'a_valider' ? 'fa-clock' : 'fa-ellipsis') + '"></i>' +
        '</span>' + esc(s.step) + '</span></td>' +
        '<td class="num">' + (s.amount ? money(s.amount) : '—') + '</td>' +
        '<td class="num">' + (s.dueDate ? dateFr(s.dueDate) : '—') + '</td>' +
        '<td>' + badge(s.status, s.status === 'paye' ? 'Payé' : s.status === 'en_retard' ? 'En retard' : s.status === 'a_valider' ? 'À valider' : s.status === 'a_venir' ? 'À venir' : 'En attente') + '</td>' +
      '</tr>'
    )).join('');
  }

  function timelineMarkup(financing) {
    const steps = financing && financing.steps && financing.steps.length
      ? financing.steps
      : [
          { name: 'Dossier', date: null, status: 'en_attente', label: 'En attente' },
          { name: 'Pièces', date: null, status: 'en_attente', label: 'En attente' },
          { name: 'Transmis', date: null, status: 'en_attente', label: 'En attente' },
          { name: 'Décision de la banque', date: null, status: 'en_attente', label: 'En attente' }
        ];
    return steps.map((s) => {
      const color = s.status === 'valide' || s.status === 'completes' ? 'accepte' : s.status === 'en_cours' ? 'envoye' : 'neutral';
      return '<div class="tl-item ' + (s.status === 'valide' || s.status === 'completes' ? 'done' : '') + '">' +
        '<div class="tl-dot ' + s.status + '"><i class="fa-solid ' + (s.status === 'en_attente' ? 'fa-circle' : s.status === 'en_cours' ? 'fa-circle-dot' : 'fa-check') + '"></i></div>' +
        '<div class="tl-body"><div class="tl-name">' + esc(s.name) + '</div><div class="tl-date">' + esc(s.date || '—') + '</div></div>' +
        badge(color, s.label) +
      '</div>';
    }).join('');
  }

  function flexMonthsSelect(current, id) {
    let html = '<select class="select select-xs" id="' + id + '" aria-label="Durée du crédit">';
    for (let m = 1; m <= 12; m++) {
      html += '<option value="' + m + '"' + (m === current ? ' selected' : '') + '>' + m + ' mois</option>';
    }
    return html + '</select>';
  }

  function flexTerms(plan, canEdit) {
    if (!plan) return '';
    return '<div class="flex-terms">' +
      '<div class="flex-term"><span>Abonnement</span><strong>' + money(plan.subscription) + '</strong></div>' +
      (canEdit
        ? '<div class="flex-term"><span>Durée</span>' + flexMonthsSelect(plan.months, 'flexMonths') + '</div>'
        : '<div class="flex-term"><span>Durée</span><strong>' + plan.months + ' mois · ' + Math.round(plan.rate * 100) + ' %</strong></div>') +
      '<div class="flex-term"><span>Mensualité</span><strong>' + money(plan.monthly) + '</strong></div>' +
      '<div class="flex-term"><span>Intérêts</span><strong>' + money(plan.interest) + '</strong></div>' +
    '</div>' +
    '<div class="flex-offer"><i class="fa-solid fa-paint-roller"></i> ' + esc(flexOffer) + '</div>';
  }

  const flexOffer = "Prestation de peinture offerte dès que le dossier est validé par la banque";

  function flexSetup(data) {
    const total = data.quote.total;
    const subscription = Math.min(250000, total);
    const financed = Math.max(0, total - subscription);
    const preview = Math.round((financed * 1.06) / 6);
    return '<div class="card-body flex-setup">' +
      '<p class="flex-setup-intro"><i class="fa-solid fa-circle-info"></i> Ce devis n’a pas encore d’échéancier PEINTURE FLEX. ' +
        'Le client règle un abonnement de ' + money(subscription) + ' à la banque (acompte et garantie de prestation), ' +
        'puis le solde est financé sur 1 à 12 mois à 1 % par mois, après validation du dossier bancaire.</p>' +
      '<div class="flex-setup-row">' +
        '<label for="flexMonths">Durée du crédit</label>' +
        flexMonthsSelect(6, 'flexMonthsSetup') +
        '<span class="flex-setup-amount">≈ ' + money(preview) + ' / mois sur 6 mois</span>' +
        (can('paiement:write')
          ? '<button class="btn btn-primary btn-sm" data-action="flex-setup"><i class="fa-solid fa-calculator"></i> Mettre en place l’échéancier</button>'
          : '') +
      '</div>' +
    '</div>';
  }

  function paymentFlex(data, options) {
    const plan = data.flex;
    const locked = plan && !data.bankValidated;
    const canEditPlan = can('paiement:write') && plan && !(data.schedule || []).some((s) => s.status === 'paye');
    return '<div class="pay-grid">' +
      '<div class="pay-col">' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<span class="card-icon"><i class="fa-solid fa-calendar-days"></i></span>' +
            '<span class="card-title">PEINTURE FLEX – Échéancier</span>' +
            '<span class="spacer"></span>' +
            '<select class="select" id="paymentQuote" aria-label="Choisir un devis" style="width:185px">' + options + '</select>' +
          '</div>' +
          ((data.schedule && data.schedule.length)
            ? '<table class="data">' +
                '<thead><tr><th>Étape</th><th>Montant</th><th>Échéance</th><th>Statut</th></tr></thead>' +
                '<tbody>' + scheduleRows(data.schedule) + '</tbody>' +
              '</table>'
            : flexSetup(data)) +
        '</div>' +
        '<div class="remaining-box' + (can('paiement:write') && !locked ? ' clickable' : '') + '"' +
          (can('paiement:write') && !locked ? ' role="button" tabindex="0" data-action="payment-new" title="Encaisser un paiement"' : '') + '>' +
          '<span class="remaining-icon"><i class="fa-solid fa-coins"></i></span>' +
          '<span class="remaining-divider"></span>' +
          '<span class="label">Reste dû</span>' +
          '<span class="value">' + money(data.remaining) + '</span>' +
          '<span class="spacer" style="flex:1"></span>' +
          (locked ? '<span class="remaining-lock"><i class="fa-solid fa-lock"></i> Crédit à débloquer</span>' : '') +
          '<span class="remaining-cta"><i class="fa-solid fa-arrow-right"></i></span>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-head">' +
          '<span class="card-icon"><i class="fa-solid fa-building-columns"></i></span>' +
          '<span class="card-title">Dossier de financement<small>(Banque partenaire)</small></span>' +
        '</div>' +
        '<div class="card-body"><div class="timeline">' + timelineMarkup(data.financing) + '</div>' +
          (plan ? flexTerms(plan, canEditPlan) : '') +
          (locked
            ? '<div class="flex-alert"><i class="fa-solid fa-triangle-exclamation"></i><div>' +
                '<strong>Crédit bloqué</strong>' +
                '<span>La banque doit valider la crédibilité du client avant le déblocage du crédit et le démarrage des travaux.</span>' +
              '</div></div>'
            : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function paymentCash(data, options) {
    const payments = data.payments || [];
    return '<div class="pay-grid">' +
      '<div class="pay-col">' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<span class="card-icon"><i class="fa-solid fa-coins"></i></span>' +
            '<span class="card-title">PEINTURE CASH – Encaissements</span>' +
            '<span class="spacer"></span>' +
            '<select class="select" id="paymentQuote" style="width:185px">' + options + '</select>' +
            (can('paiement:write') ? '<button class="btn btn-soft btn-sm" data-action="payment-new"><i class="fa-solid fa-plus"></i> Encaisser</button>' : '') +
          '</div>' +
          '<table class="data">' +
            '<thead><tr><th>Date</th><th>Mode</th><th>Référence</th><th>Montant</th></tr></thead>' +
            '<tbody>' + (payments.length ? payments.map((p) =>
              '<tr><td>' + dateFr(p.date) + '</td><td>' + esc(METHOD_LABEL[p.method] || p.method) + '</td>' +
              '<td>' + esc(p.reference || '—') + '</td><td class="num strong">' + money(p.amount) + '</td></tr>'
            ).join('') : '<tr><td colspan="4">' + emptyState('fa-receipt', 'Aucun encaissement enregistré') + '</td></tr>') + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
      '<div class="pay-col">' +
        '<div class="card">' +
          '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-wallet"></i></span><span class="card-title">Situation du devis</span></div>' +
          '<div class="card-body"><div class="detail-list">' +
            '<div class="detail-row"><span class="k">Client</span><span class="v">' + esc(data.quote.clientName) + '</span></div>' +
            '<div class="detail-row"><span class="k">Montant du devis</span><span class="v">' + money(data.quote.total) + '</span></div>' +
            '<div class="detail-row"><span class="k">Déjà encaissé</span><span class="v" style="color:#217a46">' + money(data.paidTotal) + '</span></div>' +
            '<div class="detail-row"><span class="k">Reste à payer</span><span class="v" style="color:#a83d27">' + money(Math.max(0, data.quote.total - data.paidTotal)) + '</span></div>' +
          '</div></div>' +
        '</div>' +
        '<div class="remaining-box compact">' +
          '<span class="remaining-icon"><i class="fa-solid fa-coins"></i></span>' +
          '<span class="remaining-divider"></span>' +
          '<span class="label">Reste dû</span>' +
          '<span class="value">' + money(Math.max(0, data.quote.total - data.paidTotal)) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function paymentBanque(data, options) {
    const fin = data.financing;
    return '<div class="pay-grid">' +
      '<div class="pay-col">' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<span class="card-icon"><i class="fa-solid fa-building-columns"></i></span>' +
            '<span class="card-title">Dossier de financement<small>Banque partenaire — Agence Kaloum</small></span>' +
            '<span class="spacer"></span>' +
            '<select class="select" id="paymentQuote" style="width:185px">' + options + '</select>' +
          '</div>' +
          '<div class="card-body"><div class="timeline">' + timelineMarkup(fin) + '</div>' +
            (can('paiement:write') ? '<div style="display:flex;gap:10px;margin-top:18px">' +
              '<button class="btn btn-primary btn-sm" data-action="financing-advance"><i class="fa-solid fa-paper-plane"></i> Transmettre le dossier</button>' +
              '<button class="btn btn-ghost btn-sm" data-action="payment-new"><i class="fa-solid fa-plus"></i> Encaisser un acompte</button>' +
            '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="pay-col">' +
        '<div class="card">' +
          '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-file-shield"></i></span><span class="card-title">Informations</span></div>' +
          '<div class="card-body"><div class="detail-list">' +
            '<div class="detail-row"><span class="k">Devis</span><span class="v">' + esc(data.quote.id) + '</span></div>' +
            '<div class="detail-row"><span class="k">Client</span><span class="v">' + esc(data.quote.clientName) + '</span></div>' +
            '<div class="detail-row"><span class="k">Montant financé</span><span class="v">' + money(fin && fin.amount ? fin.amount : Math.round(data.quote.total * 0.6)) + '</span></div>' +
            '<div class="detail-row"><span class="k">Statut du dossier</span><span class="v">' + ((fin && fin.steps[2] && fin.steps[2].label) || 'Non transmis') + '</span></div>' +
          '</div></div>' +
        '</div>' +
        '<div class="remaining-box compact">' +
          '<span class="remaining-icon"><i class="fa-solid fa-coins"></i></span>' +
          '<span class="remaining-divider"></span>' +
          '<span class="label">Reste dû</span>' +
          '<span class="value">' + money(data.remaining) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------------------- */
  /* Page — Clients                                                      */
  /* ---------------------------------------------------------------------- */
  async function renderClients() {
    const clients = await api('/api/clients');
    state.clients = clients;
    const term = state.clientsSearch.toLowerCase();
    const filtered = clients.filter((c) => !term ||
      c.name.toLowerCase().includes(term) ||
      (c.company || '').toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term));

    const cards = filtered.map((c) => (
      '<article class="card client-card" data-action="client-open" data-id="' + esc(c.id) + '">' +
        '<div class="client-top">' +
          '<div class="client-avatar">' + esc(initials(c.name)) + '</div>' +
          '<div style="flex:1;min-width:0"><div class="client-name">' + esc(c.name) + '</div>' +
          '<div class="client-company">' + esc(c.contact || c.company || c.type) + '</div></div>' +
        '</div>' +
        '<div class="client-meta">' +
          '<div><i class="fa-solid fa-phone"></i> ' + esc(c.phone || '—') + '</div>' +
          '<div><i class="fa-solid fa-envelope"></i> ' + esc(c.email || '—') + '</div>' +
          '<div class="city-row"><span><i class="fa-solid fa-location-dot"></i> ' + esc(c.city) + '</span>' +
            badge(c.type === 'Revendeur' ? 'envoye' : c.type === 'Particulier' ? 'neutral' : 'accepte', c.type) + '</div>' +
        '</div>' +
        '<div class="client-stats">' +
          '<div class="client-stat"><div class="lbl">Devis</div><div class="val">' + c.totalQuotes + '</div></div>' +
          '<div class="client-stat"><div class="lbl">Encaissé</div><div class="val money">' + money(c.paidAmount) + '</div></div>' +
          '<div class="client-stat"><div class="lbl">Devis acceptés</div><div class="val">' + c.acceptedQuotes + '</div></div>' +
          '<div class="client-stat"><div class="lbl">Dernier devis</div><div class="val">' + (c.lastQuoteAt ? dateShort(c.lastQuoteAt) : '—') + '</div></div>' +
        '</div>' +
      '</article>'
    )).join('');

    return pageHead({ title: 'Clients', sub: 'Votre portefeuille clients, leurs devis et leurs règlements.' }) +
      '<div class="page-body">' +
        '<div class="catalogue-toolbar">' +
          '<div class="search-field"><i class="fa-solid fa-magnifying-glass"></i>' +
            '<input class="input" id="clientsSearch" type="search" placeholder="Rechercher un client..." value="' + esc(state.clientsSearch) + '"></div>' +
          '<span class="toolbar-label">' + filtered.length + ' client' + (filtered.length > 1 ? 's' : '') + '</span>' +
          (can('clients:write') ? '<button class="btn btn-primary" data-action="client-new"><i class="fa-solid fa-plus"></i> Nouveau client</button>' : '') +
        '</div>' +
        '<div class="client-grid">' + (cards || emptyState('fa-user-group', 'Aucun client trouvé')) + '</div>' +
      '</div>';
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  /* ---------------------------------------------------------------------- */
  /* Page — Stocks                                                       */
  /* ---------------------------------------------------------------------- */
  async function renderStocks() {
    const stocks = await api('/api/stocks');
    const term = state.stocksSearch.toLowerCase();
    const filtered = stocks.filter((p) => !term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
    const totalValue = stocks.reduce((s, p) => s + p.value, 0);
    const low = stocks.filter((p) => p.status === 'bas').length;
    const units = stocks.reduce((s, p) => s + p.stock, 0);

    const rows = filtered.map((p) => (
      '<tr>' +
        '<td><div class="line-item stock-product">' +
          '<span class="line-ico">' + (p.image ? '<img src="' + p.image + '" alt="">' : '<i class="fa-solid fa-box"></i>') + '</span>' +
          '<div><div class="line-desig">' + esc(p.name) + '</div><div class="line-detail">' + esc(p.category) + '</div></div>' +
        '</div></td>' +
        '<td>' + esc(p.location) + '</td>' +
        '<td class="right num">' + p.stock + ' ' + esc(p.unit) + '</td>' +
        '<td class="right num">' + p.minStock + '</td>' +
        '<td><div class="stock-bar"><span class="' + p.status + '" style="width:' + Math.min(100, Math.max(6, Math.round((p.stock / Math.max(p.minStock * 3, 1)) * 100))) + '%"></span></div></td>' +
        '<td>' + badge(p.status, p.status === 'bas' ? 'Stock bas' : p.status === 'moyen' ? 'Moyen' : 'OK') + '</td>' +
        '<td class="right num">' + money(p.value) + '</td>' +
        '<td class="right" style="white-space:nowrap">' +
          (can('stocks:write')
            ? '<button class="btn btn-ghost btn-xs" data-action="stock-adjust" data-id="' + esc(p.id) + '" data-delta="-1" aria-label="Retirer"><i class="fa-solid fa-minus"></i></button> ' +
              '<button class="btn btn-ghost btn-xs" data-action="stock-adjust" data-id="' + esc(p.id) + '" data-delta="1" aria-label="Ajouter"><i class="fa-solid fa-plus"></i></button>'
            : '<span class="muted-dash">—</span>') +
        '</td>' +
      '</tr>'
    )).join('');

    return pageHead({ title: 'Stocks', sub: 'Suivez les quantités disponibles, les alertes et la valorisation du stock.' }) +
      '<div class="page-body">' +
        '<div class="kpis k-equal">' +
          '<div class="kpi"><div class="kpi-icon teal"><i class="fa-solid fa-warehouse"></i></div><div><div class="kpi-label">Valeur du stock</div><div class="kpi-value sm">' + money(totalValue) + '</div></div></div>' +
          '<div class="kpi"><div class="kpi-icon rust"><i class="fa-solid fa-triangle-exclamation"></i></div><div><div class="kpi-label">Références en alerte</div><div class="kpi-value">' + low + '</div></div></div>' +
          '<div class="kpi"><div class="kpi-icon orange"><i class="fa-solid fa-cube"></i></div><div><div class="kpi-label">Références</div><div class="kpi-value">' + stocks.length + '</div></div></div>' +
          '<div class="kpi"><div class="kpi-icon green"><i class="fa-solid fa-boxes-stacked"></i></div><div><div class="kpi-label">Unités disponibles</div><div class="kpi-value">' + fmt(units) + '</div></div></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<span class="card-icon"><i class="fa-solid fa-cube"></i></span>' +
            '<span class="card-title">État des stocks</span>' +
            '<span class="spacer"></span>' +
            '<div class="search-field" style="max-width:280px"><i class="fa-solid fa-magnifying-glass"></i>' +
              '<input class="input" id="stocksSearch" type="search" placeholder="Rechercher un produit..." value="' + esc(state.stocksSearch) + '"></div>' +
          '</div>' +
          '<table class="data stock-table">' +
            '<thead><tr><th>Produit</th><th>Emplacement</th><th class="right">Stock</th><th class="right">Seuil</th><th>Niveau</th><th>Statut</th><th class="right">Valeur</th><th class="right">Ajuster</th></tr></thead>' +
            '<tbody>' + (rows || '<tr><td colspan="8">' + emptyState('fa-box-open', 'Aucun produit trouvé') + '</td></tr>') + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  /* ---------------------------------------------------------------------- */
  /* Page — Chantiers                                                    */
  /* ---------------------------------------------------------------------- */
  async function renderChantiers() {
    const chantiers = await api('/api/chantiers');
    state.clients = await api('/api/clients');
    const enCours = chantiers.filter((c) => c.status === 'en_cours');
    const avg = chantiers.length ? Math.round(chantiers.reduce((s, c) => s + c.progress, 0) / chantiers.length) : 0;
    const budget = chantiers.reduce((s, c) => s + c.budget, 0);

    const cards = chantiers.map((c) => (
      '<article class="card chantier-card">' +
        '<div class="chantier-head">' +
          '<div style="min-width:0"><div class="chantier-name">' + esc(c.name) + '</div>' +
          '<div class="chantier-sub">' + esc(c.clientName) + ' • ' + esc(c.city) + '</div></div>' +
          badge(c.status === 'en_cours' ? 'accepte' : c.status === 'termine' ? 'neutral' : 'planifie', CHANTIER_LABEL[c.status]) +
        '</div>' +
        '<div class="progress ' + (c.progress >= 100 ? '' : 'amber') + '"><span style="width:' + Math.min(100, c.progress) + '%"></span></div>' +
        '<div class="chantier-foot"><span>' + c.progress + ' % avancement</span><span>' + (c.endDate ? 'fin ' + dateFr(c.endDate) : '—') + '</span></div>' +
        '<div class="detail-list" style="border-top:1px solid #f2ece3;padding-top:10px">' +
          '<div class="detail-row"><span class="k">Budget</span><span class="v">' + money(c.budget) + '</span></div>' +
          '<div class="detail-row"><span class="k">Dépensé</span><span class="v">' + money(c.spent) + '</span></div>' +
          '<div class="detail-row"><span class="k">Chef de chantier</span><span class="v">' + esc(c.chef) + '</span></div>' +
          '<div class="detail-row"><span class="k">Équipe</span><span class="v">' + c.team + ' personnes</span></div>' +
        '</div>' +
        (can('chantiers:write') ? '<button class="btn btn-ghost btn-sm" data-action="chantier-update" data-id="' + esc(c.id) + '"><i class="fa-solid fa-pen-to-square"></i> Mettre à jour</button>' : '') +
      '</article>'
    )).join('');

    return pageHead({ title: 'Chantiers', sub: 'Pilotez vos chantiers, l’avancement des travaux et les équipes sur site.' }) +
      '<div class="page-body">' +
        '<div class="kpis k-equal">' +
          '<div class="kpi"><div class="kpi-icon teal"><i class="fa-solid fa-helmet-safety"></i></div><div><div class="kpi-label">Chantiers en cours</div><div class="kpi-value">' + enCours.length + '</div></div></div>' +
          '<div class="kpi"><div class="kpi-icon orange"><i class="fa-solid fa-chart-simple"></i></div><div><div class="kpi-label">Avancement moyen</div><div class="kpi-value">' + avg + ' %</div></div></div>' +
          '<div class="kpi"><div class="kpi-icon green"><i class="fa-solid fa-sack-dollar"></i></div><div><div class="kpi-label">Budget total</div><div class="kpi-value sm">' + money(budget) + '</div></div></div>' +
          '<div class="kpi"><div class="kpi-icon rust"><i class="fa-solid fa-users"></i></div><div><div class="kpi-label">Équipes mobilisées</div><div class="kpi-value">' + chantiers.reduce((s, c) => s + c.team, 0) + '</div></div></div>' +
        '</div>' +
        '<div class="catalogue-toolbar">' +
          '<span class="toolbar-label">' + chantiers.length + ' chantiers suivis</span>' +
          '<span class="spacer" style="flex:1"></span>' +
          (can('chantiers:write') ? '<button class="btn btn-primary" data-action="chantier-new-open"><i class="fa-solid fa-plus"></i> Nouveau chantier</button>' : '') +
        '</div>' +
        '<div class="client-grid">' + (cards || emptyState('fa-helmet-safety', 'Aucun chantier')) + '</div>' +
      '</div>';
  }

  function openChantierForm() {
    const options = state.clients.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('');
    openModal(
      modalHead('Nouveau chantier', 'Planifiez une nouvelle intervention') +
      '<div class="modal-body"><div class="form-grid">' +
        '<div class="field span-2"><label>Nom du chantier *</label><input class="input" id="newChantierName" placeholder="Ex : Villa Lambanyi — R+1"></div>' +
        '<div class="field"><label>Client</label><select class="select" id="newChantierClient">' + options + '</select></div>' +
        '<div class="field"><label>Budget (GNF)</label><input class="input" id="newChantierBudget" type="number" placeholder="0"></div>' +
        '<div class="field"><label>Début</label><input class="input" id="newChantierStart" type="date" value="' + todayIso() + '"></div>' +
        '<div class="field"><label>Fin prévue</label><input class="input" id="newChantierEnd" type="date"></div>' +
        '<div class="field span-2"><label>Chef de chantier</label><input class="input" id="newChantierChef" placeholder="Ex : Mamadou Saliou"></div>' +
      '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
      '<button class="btn btn-primary" data-action="chantier-new"><i class="fa-solid fa-check"></i> Créer le chantier</button></div>',
      { size: 'narrow' }
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Page — Finance                                                      */
  /* ---------------------------------------------------------------------- */
  async function renderFinance() {
    const data = await api('/api/finance');
    const k = data.kpis;
    const max = Math.max.apply(null, data.series.map((s) => s.value).concat([1]));

    const chart = data.series.map((s) => (
      '<div class="bar-wrap" title="' + money(s.value) + '">' +
        '<span class="bar-val">' + (s.value ? Math.round(s.value / 1000000) + ' M' : '') + '</span>' +
        '<div class="bar" style="height:' + Math.max(3, Math.round((s.value / max) * 100)) + '%"></div>' +
        '<span class="bar-label">' + esc(s.label) + '</span>' +
      '</div>'
    )).join('');

    const factures = data.factures.map((f) => (
      '<tr>' +
        '<td class="quote-row-id">' + esc(f.id) + '</td>' +
        '<td><div class="quote-row-client">' + esc(f.clientName) + '</div><div class="line-detail">' + esc(f.clientCompany || '') + '</div></td>' +
        '<td>' + dateShort(f.issueDate) + '</td>' +
        '<td class="num">' + money(f.total) + '</td>' +
        '<td class="num" style="color:' + (f.due ? '#a83d27' : '#217a46') + '">' + money(f.due) + '</td>' +
        '<td>' + badge(f.status, f.status === 'payee' ? 'Payée' : f.status === 'en_retard' ? 'En retard' : 'Envoyée') + '</td>' +
      '</tr>'
    )).join('');

    const payments = data.payments.slice(0, 6).map((p) => (
      '<tr>' +
        '<td>' + dateShort(p.date) + '</td>' +
        '<td class="quote-row-client">' + esc(p.clientName) + '</td>' +
        '<td>' + esc(p.quoteId || '—') + '</td>' +
        '<td>' + esc(METHOD_LABEL[p.method] || p.method) + '</td>' +
        '<td class="num strong">' + money(p.amount) + '</td>' +
      '</tr>'
    )).join('');

    return pageHead({ title: 'Finance', sub: 'Suivez vos encaissements, vos factures et la santé financière de votre activité.' }) +
      '<div class="page-body">' +
        '<div class="kpis k-equal">' +
          '<div class="kpi"><div class="kpi-icon teal"><i class="fa-solid fa-sack-dollar"></i></div><div><div class="kpi-label">Encaissé</div><div class="kpi-value sm">' + money(k.encaisse) + '</div></div></div>' +
          '<div class="kpi"><div class="kpi-icon orange"><i class="fa-solid fa-hourglass-half"></i></div><div><div class="kpi-label">En attente</div><div class="kpi-value sm">' + money(k.enAttente) + '</div></div></div>' +
          '<div class="kpi"><div class="kpi-icon rust"><i class="fa-solid fa-circle-exclamation"></i></div><div><div class="kpi-label">En retard</div><div class="kpi-value sm">' + money(k.enRetard) + '</div></div></div>' +
          '<div class="kpi green-tint"><div class="kpi-icon green"><i class="fa-solid fa-file-circle-check"></i></div><div><div class="kpi-label">Devis acceptés</div><div class="kpi-value">' + k.acceptes + '</div></div></div>' +
        '</div>' +
        '<div class="grid-2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);margin-bottom:16px;align-items:start">' +
          '<div class="card">' +
            '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-chart-column"></i></span><span class="card-title">Encaissements des 6 derniers mois</span></div>' +
            '<div class="card-body"><div class="finance-chart">' + chart + '</div></div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-scale-balanced"></i></span><span class="card-title">Synthèse</span></div>' +
            '<div class="card-body"><div class="detail-list">' +
              '<div class="detail-row"><span class="k">Panier moyen accepté</span><span class="v">' + money(k.panierMoyen) + '</span></div>' +
              '<div class="detail-row"><span class="k">Valeur des devis acceptés</span><span class="v">' + money(k.acceptesValeur) + '</span></div>' +
              '<div class="detail-row"><span class="k">Taux de recouvrement</span><span class="v">' + (k.acceptesValeur ? Math.min(100, Math.round((k.encaisse / Math.max(k.acceptesValeur, 1)) * 100)) : 0) + ' %</span></div>' +
              '<div class="detail-row"><span class="k">Factures émises</span><span class="v">' + data.factures.length + '</span></div>' +
            '</div>' +
            '<button class="btn btn-primary btn-sm" style="width:100%;margin-top:14px" data-action="finance-pay"><i class="fa-solid fa-plus"></i> Enregistrer un encaissement</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card" style="margin-bottom:16px">' +
          '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-file-invoice-dollar"></i></span><span class="card-title">Factures</span></div>' +
          '<table class="data">' +
            '<thead><tr><th>N° Facture</th><th>Client</th><th>Émission</th><th>Total</th><th>Reste dû</th><th>Statut</th></tr></thead>' +
            '<tbody>' + (factures || '<tr><td colspan="6">' + emptyState('fa-file-invoice', 'Aucune facture') + '</td></tr>') + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><span class="card-icon"><i class="fa-solid fa-receipt"></i></span><span class="card-title">Derniers encaissements</span>' +
            '<span class="spacer"></span>' +
            '<button class="btn btn-ghost btn-sm" data-action="finance-pay"><i class="fa-solid fa-plus"></i> Encaissement</button>' +
          '</div>' +
          '<table class="data">' +
            '<thead><tr><th>Date</th><th>Client</th><th>Devis</th><th>Mode</th><th>Montant</th></tr></thead>' +
            '<tbody>' + (payments || '<tr><td colspan="5">' + emptyState('fa-receipt', 'Aucun encaissement') + '</td></tr>') + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  /* ---------------------------------------------------------------------- */
  /* Modales                                                             */
  /* ---------------------------------------------------------------------- */
  function openModal(html, opts) {
    const options = opts || {};
    modalRoot.innerHTML =
      '<div class="overlay" data-overlay>' +
        '<div class="modal ' + (options.size || '') + '" role="dialog" aria-modal="true">' + html + '</div>' +
      '</div>';
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modalRoot.innerHTML = '';
    document.body.style.overflow = '';
  }
  function modalHead(title, subtitle, extra) {
    return '<div class="modal-head">' +
      '<div style="min-width:0"><h3>' + title + '</h3>' + (subtitle ? '<p>' + subtitle + '</p>' : '') + '</div>' +
      (extra || '') +
      '<button class="close" data-action="modal-close" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>' +
    '</div>';
  }

  async function openQuote(id) {
    const q = await api('/api/quotes/' + encodeURIComponent(id));
    const lines = q.lines && q.lines.length
      ? q.lines
      : [{ icon: 'paint', designation: 'Prestation', detail: q.subject, qty: 1, unit: 'forfait', unitPrice: q.subtotal, amount: q.subtotal }];
    const product = state.products.find((p) => p.id === q.productId);

    const rows = lines.map((line) => (
      '<tr><td><div class="line-item"><span class="line-ico">' + lineIcon(line, product) + '</span>' +
        '<div><div class="line-desig">' + esc(line.designation) + '</div><div class="line-detail">' + esc(line.detail || '') + '</div></div>' +
      '</div></td><td class="right qty">' + dec(line.qty) + ' ' + esc(line.unit) + '</td>' +
      '<td class="right pu">' + money(line.unitPrice) + '</td><td class="right amount">' + money(line.amount) + '</td></tr>'
    )).join('');

    const paid = q.paid || 0;
    const html = modalHead(
      esc(q.id),
      esc(q.clientName) + ' • ' + esc(q.subject),
      badge(q.status, q.statusLabel)
    ) +
    '<div class="modal-body">' +
      '<div class="grid-2" style="gap:10px 24px;margin-bottom:16px">' +
        '<div class="detail-row"><span class="k">Client</span><span class="v">' + esc(q.clientName) + '</span></div>' +
        '<div class="detail-row"><span class="k">Chantier</span><span class="v">' + esc(q.site || '—') + '</span></div>' +
        '<div class="detail-row"><span class="k">Date du devis</span><span class="v">' + dateFr(q.createdAt) + '</span></div>' +
        '<div class="detail-row"><span class="k">Validité</span><span class="v">' + (q.validUntil ? dateFr(q.validUntil) : '—') + '</span></div>' +
        '<div class="detail-row"><span class="k">Surface estimée</span><span class="v">' + dec(q.surface) + ' m²</span></div>' +
        '<div class="detail-row"><span class="k">Déjà encaissé</span><span class="v" style="color:#217a46">' + money(paid) + '</span></div>' +
      '</div>' +
      '<table class="lines">' +
        '<thead><tr><th>Désignation</th><th class="right">Qté / Unité</th><th class="right">Prix unitaire</th><th class="right">Montant</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '<div class="total-row" style="margin-top:14px"><span class="total-label">Total</span><span class="total-value">' + money(q.total) + '</span></div>' +
      (q.notes ? '<p class="small muted" style="margin-top:12px">' + esc(q.notes) + '</p>' : '') +
    '</div>' +
    '<div class="modal-foot">' +
      (can('devis:write')
        ? '<select class="select" id="quoteStatus" aria-label="Statut du devis" style="margin-right:auto">' +
            Object.keys(STATUS_LABEL).map((s) => '<option value="' + s + '"' + (q.status === s ? ' selected' : '') + '>' + STATUS_LABEL[s] + '</option>').join('') +
          '</select>'
        : '<span style="margin-right:auto">' + badge(q.status, STATUS_LABEL[q.status] || q.status) + '</span>') +
      '<button class="btn btn-outline" data-action="quote-pdf" data-id="' + esc(q.id) + '"><i class="fa-solid fa-file-pdf"></i> PDF</button>' +
      (can('paiement:write') ? '<button class="btn btn-primary" data-action="quote-pay" data-id="' + esc(q.id) + '"><i class="fa-solid fa-coins"></i> Enregistrer un paiement</button>' : '') +
    '</div>';
    openModal(html, { size: 'wide' });

    const statusSelect = document.getElementById('quoteStatus');
    if (statusSelect) {
      statusSelect.addEventListener('change', async () => {
        try {
          await api('/api/quotes/' + encodeURIComponent(q.id) + '/status', { method: 'POST', body: { status: statusSelect.value } });
          toast('Statut mis à jour');
          closeModal();
          render();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  }

  function openProduct(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    const locations = Object.keys(p.stockByLocation || {}).map((loc) =>
      '<div class="detail-row"><span class="k">' + esc(loc) + '</span><span class="v">' + p.stockByLocation[loc] + ' ' + esc(p.unit) + '</span></div>'
    ).join('');

    openModal(
      modalHead(esc(p.name), esc(p.category), badge(p.lowStock ? 'bas' : 'ok', p.lowStock ? 'Stock bas' : 'Disponible')) +
      '<div class="modal-body">' +
        '<div style="display:flex;gap:22px;align-items:flex-start">' +
          '<div class="product-thumb" style="width:120px;flex:0 0 120px;height:150px;background:#fbf7f1;border-radius:12px">' +
            (p.image ? '<img src="' + p.image + '" alt="" style="max-width:100px;max-height:130px">' : '<div class="icon-tile" style="width:70px;height:70px"><i class="fa-solid ' + esc(p.icon || 'fa-box') + '"></i></div>') +
          '</div>' +
          '<div style="flex:1">' +
            '<div style="font-size:20px;font-weight:700;color:#0b4e51;margin-bottom:6px">' + money(p.price) + '</div>' +
            '<p class="small muted" style="margin-bottom:12px">' + esc(p.description || '') + '</p>' +
            '<div class="detail-list">' +
              '<div class="detail-row"><span class="k">Rendement</span><span class="v">' + (p.rendement ? p.rendement + ' m²/L' : '—') + '</span></div>' +
              '<div class="detail-row"><span class="k">Finition</span><span class="v">' + esc(p.finish || '—') + '</span></div>' +
              '<div class="detail-row"><span class="k">Conditionnement</span><span class="v">' + (p.format ? p.format + ' ' + p.unit : '—') + '</span></div>' +
              '<div class="detail-row"><span class="k">Stock total</span><span class="v">' + p.stock + ' ' + esc(p.unit) + '</span></div>' +
              locations +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="notice" style="margin-top:18px"><i class="fa-solid fa-triangle-exclamation"></i><span class="notice-text">Classification FOM à confirmer</span></div>' +
      '</div>' +
      '<div class="modal-foot">' +
        '<button class="btn btn-ghost" data-action="modal-close">Fermer</button>' +
        (can('devis:write') ? '<button class="btn btn-primary" data-action="product-use" data-id="' + esc(p.id) + '"><i class="fa-solid fa-plus"></i> Utiliser dans un devis</button>' : '') +
      '</div>'
    );
  }

  function openProductPicker() {
    const list = state.products.map((p) => (
      '<button class="quick-item" data-action="product-pick" data-id="' + esc(p.id) + '">' +
        '<span class="quick-thumb">' + (p.image ? '<img src="' + p.image + '" alt="">' : '<i class="fa-solid fa-box" style="color:#0c5e62"></i>') + '</span>' +
        '<span class="quick-name">' + esc(p.name) + '<br><span class="small muted">' + money(p.price) + ' • ' + esc(p.category) + '</span></span>' +
        '<i class="fa-solid fa-chevron-right"></i>' +
      '</button>'
    )).join('');
    openModal(
      modalHead('Choisir un produit', 'La ligne peinture du devis sera mise à jour') +
      '<div class="modal-body" style="max-height:60vh;overflow:auto"><div class="quick-list" style="padding:0">' + list + '</div></div>'
    );
  }

  function openClient(id) {
    api('/api/clients/' + encodeURIComponent(id)).then((c) => {
      const quotes = c.quotes.map((q) => (
        '<tr><td class="quote-row-id">' + esc(q.id) + '</td><td>' + dateShort(q.createdAt) + '</td>' +
        '<td class="num">' + money(q.total) + '</td><td>' + badge(q.status, q.statusLabel) + '</td></tr>'
      )).join('');
      const payments = c.payments.map((p) => (
        '<tr><td>' + dateShort(p.date) + '</td><td>' + esc(METHOD_LABEL[p.method] || p.method) + '</td><td>' + esc(p.reference || '—') + '</td><td class="num strong">' + money(p.amount) + '</td></tr>'
      )).join('');
      openModal(
        modalHead(esc(c.name), esc(c.company || c.type)) +
        '<div class="modal-body">' +
          '<div class="grid-2" style="gap:10px 24px;margin-bottom:16px">' +
            '<div class="detail-row"><span class="k">Contact</span><span class="v">' + esc(c.contact || c.name) + '</span></div>' +
            '<div class="detail-row"><span class="k">Téléphone</span><span class="v">' + esc(c.phone || '—') + '</span></div>' +
            '<div class="detail-row"><span class="k">Email</span><span class="v">' + esc(c.email || '—') + '</span></div>' +
            '<div class="detail-row"><span class="k">Ville</span><span class="v">' + esc(c.city) + '</span></div>' +
          '</div>' +
          '<div class="section-title" style="margin-bottom:8px">Devis</div>' +
          '<table class="data" style="margin-bottom:18px"><thead><tr><th>N°</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead><tbody>' + (quotes || '<tr><td colspan="4">' + emptyState('fa-file-lines', 'Aucun devis') + '</td></tr>') + '</tbody></table>' +
          '<div class="section-title" style="margin-bottom:8px">Encaissements</div>' +
          '<table class="data"><thead><tr><th>Date</th><th>Mode</th><th>Référence</th><th>Montant</th></tr></thead><tbody>' + (payments || '<tr><td colspan="4">' + emptyState('fa-receipt', 'Aucun encaissement') + '</td></tr>') + '</tbody></table>' +
        '</div>' +
        '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Fermer</button>' +
        (can('paiement:write') ? '<button class="btn btn-primary" data-action="finance-pay" data-client="' + esc(c.id) + '"><i class="fa-solid fa-plus"></i> Encaisser un acompte</button>' : '') + '</div>',
        { size: 'wide' }
      );
    }).catch((err) => toast(err.message, 'error'));
  }

  function openClientForm() {
    openModal(
      modalHead('Nouveau client', 'Créez une fiche client') +
      '<div class="modal-body"><div class="form-grid">' +
        '<div class="field span-2"><label>Nom / raison sociale *</label><input class="input" id="fName" placeholder="Ex : Villa Lambanyi"></div>' +
        '<div class="field"><label>Contact</label><input class="input" id="fContact" placeholder="Nom du contact"></div>' +
        '<div class="field"><label>Téléphone</label><input class="input" id="fPhone" placeholder="+224 ..."></div>' +
        '<div class="field"><label>Email</label><input class="input" id="fEmail" type="email" placeholder="client@email.com"></div>' +
        '<div class="field"><label>Ville</label><input class="input" id="fCity" value="Conakry"></div>' +
        '<div class="field"><label>Entreprise</label><input class="input" id="fCompany" placeholder="Optionnel"></div>' +
        '<div class="field"><label>Type</label><select class="select" id="fType"><option>Particulier</option><option>Professionnel</option><option>Revendeur</option></select></div>' +
      '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
      '<button class="btn btn-primary" data-action="client-save"><i class="fa-solid fa-check"></i> Enregistrer</button></div>',
      { size: 'narrow' }
    );
  }

  function openPaymentForm(prefill) {
    const p = prefill || {};
    const quoteId = p.quoteId || state.payment.quoteId || '';
    api('/api/payments/' + encodeURIComponent(quoteId)).then((data) => {
      const openSteps = (data.schedule || []).filter((s) => s.status !== 'paye');
      const stepOptions = openSteps.map((s) =>
        '<option value="' + esc(s.id) + '" data-amount="' + (s.amount || 0) + '">' + esc(s.step) + (s.amount ? ' — ' + money(s.amount) : '') + '</option>'
      ).join('');
      const defaultAmount = p.amount || (openSteps[0] && openSteps[0].amount ? openSteps[0].amount : '');
      openModal(
        modalHead('Enregistrer un paiement', 'Devis ' + esc(data.quote.id) + ' • ' + esc(data.quote.clientName)) +
        '<div class="modal-body"><div class="form-grid">' +
          '<div class="field"><label>Montant (GNF) *</label><input class="input" id="pAmount" type="number" value="' + defaultAmount + '" placeholder="0"></div>' +
          '<div class="field"><label>Date</label><input class="input" id="pDate" type="date" value="' + todayIso() + '"></div>' +
          '<div class="field"><label>Mode</label><select class="select" id="pMethod">' +
            Object.keys(METHOD_LABEL).map((m) => '<option value="' + m + '">' + METHOD_LABEL[m] + '</option>').join('') +
          '</select></div>' +
          '<div class="field"><label>Référence</label><input class="input" id="pRef" placeholder="N° transaction"></div>' +
          (stepOptions ? '<div class="field span-2"><label>Échéance concernée</label><select class="select" id="pStep">' + stepOptions + '</select></div>' : '') +
          '<div class="field span-2"><label>Notes</label><textarea class="input" id="pNotes" rows="2"></textarea></div>' +
        '</div></div>' +
        '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
        '<button class="btn btn-primary" data-action="payment-save" data-quote="' + esc(data.quote.id) + '"><i class="fa-solid fa-check"></i> Enregistrer</button></div>',
        { size: 'narrow' }
      );
      const stepSel = document.getElementById('pStep');
      if (stepSel) {
        stepSel.addEventListener('change', () => {
          const opt = stepSel.selectedOptions[0];
          const val = opt && Number(opt.dataset.amount);
          if (val) document.getElementById('pAmount').value = val;
        });
      }
    }).catch((err) => toast(err.message, 'error'));
  }

  function openChantierUpdate(id) {
    api('/api/chantiers').then((list) => {
      const c = list.find((x) => x.id === id);
      if (!c) return;
      openModal(
        modalHead(esc(c.name), esc(c.clientName) + ' • ' + esc(c.city)) +
        '<div class="modal-body"><div class="form-grid">' +
          '<div class="field"><label>Avancement (%)</label><input class="input" id="chProgress" type="number" min="0" max="100" value="' + c.progress + '"></div>' +
          '<div class="field"><label>Statut</label><select class="select" id="chStatus">' +
            Object.keys(CHANTIER_LABEL).map((s) => '<option value="' + s + '"' + (c.status === s ? ' selected' : '') + '>' + CHANTIER_LABEL[s] + '</option>').join('') +
          '</select></div>' +
          '<div class="field"><label>Dépensé (GNF)</label><input class="input" id="chSpent" type="number" value="' + c.spent + '"></div>' +
          '<div class="field"><label>Chef de chantier</label><input class="input" id="chChef" value="' + esc(c.chef) + '"></div>' +
        '</div></div>' +
        '<div class="modal-foot"><button class="btn btn-ghost" data-action="modal-close">Annuler</button>' +
        '<button class="btn btn-primary" data-action="chantier-save" data-id="' + esc(c.id) + '"><i class="fa-solid fa-check"></i> Enregistrer</button></div>',
        { size: 'narrow' }
      );
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Actions                                                             */
  /* ---------------------------------------------------------------------- */
  const actions = {
    go(el) { go(el.dataset.route); },
    'modal-close'() { closeModal(); },
    'new-quote'() { go('devis/nouveau'); },
    'catalogue-category'(el) {
      state.catalogue.category = el.dataset.category;
      state.catalogue.search = '';
      go('catalogue');
    },
    'catalogue-view'(el) {
      state.catalogue.view = el.dataset.view;
      render();
    },
    'product-open'(el) { openProduct(el.dataset.id); },
    'product-use'(el) {
      closeModal();
      const product = state.products.find((p) => p.id === el.dataset.id);
      if (product) {
        state.draft = state.draft || {};
        ensureDraft().then((d) => {
          d.productId = product.id;
          d.finish = 'Finition ' + (product.finish || 'mate').toLowerCase() + ' • Blanc Cassé';
          d.assumptions.rendement = product.rendement || d.assumptions.rendement;
          go('devis/nouveau');
          setTimeout(recalcDraft, 120);
        });
      } else {
        go('devis/nouveau');
      }
    },
    'pick-product'() { openProductPicker(); },
    'product-pick'(el) {
      const product = state.products.find((p) => p.id === el.dataset.id);
      if (!product) return;
      const d = state.draft;
      d.productId = product.id;
      d.finish = 'Finition ' + (product.finish || 'mate').toLowerCase() + ' • Blanc Cassé';
      d.assumptions.rendement = product.rendement || d.assumptions.rendement;
      closeModal();
      recalcDraft();
      toast('Produit mis à jour');
    },
    'room-add'() {
      const d = state.draft;
      d.stored = false;
      d.rooms.push({ id: 'r' + (Date.now() % 100000), name: 'Pièce ' + (d.rooms.length + 1), length: 4, width: 3.5, height: 3, doors: 1, windows: 1 });
      paintRooms();
      recalcDraft();
    },
    'room-remove'(el) {
      const d = state.draft;
      if (d.rooms.length === 1) return toast('Conservez au moins une pièce', 'error');
      d.rooms = d.rooms.filter((r) => r.id !== el.dataset.room);
      paintRooms();
      recalcDraft();
    },
    'room-toggle'(el) {
      const box = el.closest('.room-box');
      box.classList.toggle('collapsed');
      const icon = el.querySelector('i');
      const collapsed = box.classList.contains('collapsed');
      if (icon) icon.className = 'fa-solid ' + (collapsed ? 'fa-chevron-down' : 'fa-chevron-up');
      const content = box.querySelector('.room-content');
      if (content) content.style.display = collapsed ? 'none' : '';
    },
    'room-step'(el) {
      const d = state.draft;
      const room = d.rooms.find((r) => r.id === el.dataset.room);
      if (!room) return;
      const field = el.dataset.field;
      room[field] = Math.max(0, (Number(room[field]) || 0) + Number(el.dataset.delta));
      const val = document.querySelector('[data-room-val="' + field + '-' + room.id + '"]');
      if (val) val.textContent = room[field];
      recalcDraft();
    },
    async 'quote-save'() {
      const d = state.draft;
      if (!d) return;
      try {
        await ensureDraft();
        const quote = await api('/api/quotes', {
          method: 'POST',
          body: {
            clientId: d.clientId,
            subject: 'Devis ' + d.rooms.map((r) => r.name).join(', '),
            site: (state.clients.find((c) => c.id === d.clientId) || {}).city || 'Conakry',
            rooms: d.rooms,
            productId: d.productId,
            finish: d.finish,
            lines: d.lines,
            surface: d.surface,
            tvaRate: d.assumptions.tvaRate,
            tvaEnabled: d.tvaEnabled,
            tvaAmount: d.tvaAmount,
            total: d.total
          }
        });
        state.draft = null;
        toast('Devis ' + quote.id + ' enregistré');
        go('devis');
      } catch (err) { toast(err.message, 'error'); }
    },
    async 'quote-pdf'(el) {
      let quote;
      if (el && el.dataset.id) {
        quote = await api('/api/quotes/' + encodeURIComponent(el.dataset.id));
      } else {
        const d = await ensureDraft();
        quote = Object.assign({ id: 'BROUILLON', clientName: (state.clients.find((c) => c.id === d.clientId) || {}).name || '—', subject: 'Devis ' + d.rooms.map((r) => r.name).join(', '), createdAt: todayIso(), notes: '' }, d);
      }
      printQuote(quote);
    },
    'quotes-page'(el) {
      state.quotes.page = Number(el.dataset.page) || 1;
      render();
    },
    'quote-open'(el) { openQuote(el.dataset.id); },
    'quote-pay'(el) {
      closeModal();
      openPaymentForm({ quoteId: el.dataset.id });
    },
    'client-open'(el) { openClient(el.dataset.id); },
    'client-new'() { openClientForm(); },
    async 'client-save'() {
      const body = {
        name: (document.getElementById('fName') || {}).value,
        contact: (document.getElementById('fContact') || {}).value,
        phone: (document.getElementById('fPhone') || {}).value,
        email: (document.getElementById('fEmail') || {}).value,
        city: (document.getElementById('fCity') || {}).value,
        company: (document.getElementById('fCompany') || {}).value || null,
        type: (document.getElementById('fType') || {}).value
      };
      if (!body.name) return toast('Le nom est obligatoire', 'error');
      try {
        await api('/api/clients', { method: 'POST', body });
        closeModal();
        toast('Client créé');
        render();
      } catch (err) { toast(err.message, 'error'); }
    },
    async 'stock-adjust'(el) {
      try {
        await api('/api/products/' + encodeURIComponent(el.dataset.id) + '/stock', { method: 'PATCH', body: { delta: Number(el.dataset.delta) } });
        const p = state.products.find((x) => x.id === el.dataset.id);
        if (p) p.stock += Number(el.dataset.delta);
        render();
      } catch (err) { toast(err.message, 'error'); }
    },
    'chantier-update'(el) { openChantierUpdate(el.dataset.id); },
    'chantier-new-open'() { openChantierForm(); },
    'go-home'() { go(firstAllowedRoute()); },
    async 'flex-setup'(el) {
      const select = document.getElementById('flexMonthsSetup') || document.getElementById('flexMonths');
      const months = select ? Number(select.value) : 6;
      try {
        el.setAttribute('disabled', 'disabled');
        await api('/api/payments/' + encodeURIComponent(state.payment.quoteId) + '/schedule', {
          method: 'POST', body: { months: months }
        });
        toast('Échéancier PEINTURE FLEX créé sur ' + months + ' mois');
        render();
      } catch (err) {
        el.removeAttribute('disabled');
        toast(err.message, 'error');
      }
    },
    async 'chantier-save'(el) {
      try {
        await api('/api/chantiers/' + encodeURIComponent(el.dataset.id), {
          method: 'PATCH',
          body: {
            progress: Number(document.getElementById('chProgress').value),
            status: document.getElementById('chStatus').value,
            spent: Number(document.getElementById('chSpent').value),
            chef: document.getElementById('chChef').value
          }
        });
        closeModal();
        toast('Chantier mis à jour');
        render();
      } catch (err) { toast(err.message, 'error'); }
    },
    async 'chantier-new'() {
      const body = {
        name: document.getElementById('newChantierName').value,
        clientId: document.getElementById('newChantierClient').value,
        budget: Number(document.getElementById('newChantierBudget').value) || 0,
        startDate: document.getElementById('newChantierStart').value,
        endDate: document.getElementById('newChantierEnd').value || null,
        chef: document.getElementById('newChantierChef').value || '—'
      };
      if (!body.name) return toast('Le nom du chantier est obligatoire', 'error');
      try {
        await api('/api/chantiers', { method: 'POST', body });
        closeModal();
        toast('Chantier créé');
        render();
      } catch (err) { toast(err.message, 'error'); }
    },
    'payment-tab'(el) {
      state.payment.tab = el.dataset.tab;
      render();
    },
    'payment-new'(el) {
      openPaymentForm({ quoteId: state.payment.quoteId });
    },
    'payment-step'(el) {
      const quoteId = state.payment.quoteId;
      if (!quoteId) return;
      api('/api/payments/' + encodeURIComponent(quoteId)).then((data) => {
        const step = (data.schedule || []).find((s) => s.id === el.dataset.step);
        if (!step || step.status === 'paye') return;
        openPaymentForm({ quoteId, amount: step.amount || '' });
        setTimeout(() => {
          const sel = document.getElementById('pStep');
          if (sel) sel.value = step.id;
        }, 250);
      });
    },
    async 'payment-save'(el) {
      const quoteId = el.dataset.quote;
      const body = {
        amount: Number(document.getElementById('pAmount').value),
        date: document.getElementById('pDate').value,
        method: document.getElementById('pMethod').value,
        reference: document.getElementById('pRef').value,
        notes: (document.getElementById('pNotes') || {}).value || '',
        stepId: (document.getElementById('pStep') || {}).value || null
      };
      if (!body.amount) return toast('Saisissez un montant', 'error');
      try {
        await api('/api/payments/' + encodeURIComponent(quoteId) + '/pay', { method: 'POST', body });
        closeModal();
        toast('Paiement enregistré');
        render();
      } catch (err) { toast(err.message, 'error'); }
    },
    'finance-pay'(el) {
      api('/api/payments/quotes').then((list) => {
        if (!list.length) return toast('Aucun devis à encaisser', 'error');
        state.payment.quoteId = state.payment.quoteId || list[0].id;
        openPaymentForm({ quoteId: state.payment.quoteId });
      });
    },
    'financing-advance'() {
      const q = state.payment.quoteId;
      api('/api/payments/' + encodeURIComponent(q) + '/financing/advance', { method: 'POST' })
        .then(() => { toast('Dossier transmis à la banque'); render(); })
        .catch((err) => toast(err.message, 'error'));
    }
  };

  function paintRooms() {
    const wrap = document.getElementById('roomsWrap');
    if (wrap && state.draft) {
      wrap.innerHTML = state.draft.rooms.map(roomMarkup).join('');
      wireRoomInputs();
    }
  }

  function wireRoomInputs() {
    const d = state.draft;
    if (!d) return;
    document.querySelectorAll('#roomsWrap [data-field]').forEach((input) => {
      if (input.tagName !== 'INPUT') return;
      input.addEventListener('input', () => {
        const room = d.rooms.find((r) => r.id === input.dataset.room);
        if (!room) return;
        const field = input.dataset.field;
        room[field] = field === 'name' ? input.value : parseNum(input.value);
        if (field !== 'name') scheduleRecalc();
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Impression du devis                                                 */
  /* ---------------------------------------------------------------------- */
  function printQuote(quote) {
    const company = state.company || {};
    const client = state.clients.find((c) => c.id === quote.clientId) || {};
    const lines = quote.lines || [];
    const subtotal = quote.subtotal || lines.reduce((s, l) => s + l.amount, 0);
    const tva = quote.tvaAmount || 0;
    const total = quote.total || subtotal + tva;

    printRoot.innerHTML =
      '<div class="print-sheet">' +
        '<div class="print-head">' +
          '<div><h1>' + esc(company.name || 'PEINTURE PRO GUINÉE') + '</h1>' +
            '<div>' + esc(company.address || '') + '</div>' +
            '<div>Tél : ' + esc(company.phone || '') + ' • ' + esc(company.email || '') + '</div>' +
            '<div>' + esc(company.rccm || '') + ' • ' + esc(company.nif || '') + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:18px;font-weight:700;color:#0c5e62">DEVIS</div>' +
            '<div style="font-weight:600">' + esc(quote.id) + '</div>' +
            '<div>Date : ' + dateFr(quote.createdAt || todayIso()) + '</div>' +
            (quote.validUntil ? '<div>Validité : ' + dateFr(quote.validUntil) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom:16px">' +
          '<div style="font-size:10px;text-transform:uppercase;color:#7a8a8d;margin-bottom:4px">Client</div>' +
          '<div style="font-size:14px;font-weight:600">' + esc(quote.clientName || client.name || '—') + '</div>' +
          (client.company ? '<div>' + esc(client.company) + '</div>' : '') +
          (client.address ? '<div>' + esc(client.address) + ', ' + esc(client.city || '') + '</div>' : '') +
          (client.phone ? '<div>Tél : ' + esc(client.phone) + '</div>' : '') +
        '</div>' +
        '<div style="font-size:13px;font-weight:600;margin-bottom:4px">' + esc(quote.subject || 'Prestation de peinture') + '</div>' +
        '<table><thead><tr><th>Désignation</th><th class="right">Qté</th><th class="right">P.U.</th><th class="right">Montant</th></tr></thead><tbody>' +
          lines.map((l) => '<tr><td>' + esc(l.designation) + (l.detail ? ' — ' + esc(l.detail) : '') + '</td>' +
            '<td class="right">' + dec(l.qty) + ' ' + esc(l.unit) + '</td>' +
            '<td class="right">' + money(l.unitPrice) + '</td>' +
            '<td class="right">' + money(l.amount) + '</td></tr>').join('') +
        '</tbody></table>' +
        '<div class="print-totals">' +
          '<div><span>Sous-total HT</span><span>' + money(subtotal) + '</span></div>' +
          '<div><span>TVA (' + Math.round((quote.tvaRate || 0.18) * 100) + ' %)</span><span>' + money(tva) + '</span></div>' +
          '<div class="grand"><span>Total TTC</span><span>' + money(total) + '</span></div>' +
        '</div>' +
        (quote.notes ? '<div style="margin-top:18px"><strong>Notes :</strong> ' + esc(quote.notes) + '</div>' : '') +
        '<div class="print-foot">' +
          'Devis valable 30 jours. Acompte de 40 % à la commande, solde selon l’échéancier PEINTURE FLEX. ' +
          'Paiement par virement, Mobile Money ou espèces. Merci de votre confiance.<br>' +
          esc(company.name || '') + ' — ' + esc(company.phone || '') +
        '</div>' +
      '</div>';
    window.print();
  }

  /* ---------------------------------------------------------------------- */
  /* Rendu & événements                                                  */
  /* ---------------------------------------------------------------------- */
  const pages = {
    devis: renderDevis,
    'devis/nouveau': renderNouveauDevis,
    catalogue: renderCatalogue,
    clients: renderClients,
    stocks: renderStocks,
    chantiers: renderChantiers,
    finance: renderFinance,
    paiement: renderPaiement
  };

  async function render() {
    syncSessionUI();
    if (!state.session) {
      renderLoginScreen();
      return;
    }
    const route = getRoute();
    state.route = route;
    const token = ++state.token;
    if (!canRoute(route)) {
      view.innerHTML = accessDenied();
      setActiveNav(route);
      return;
    }
    const renderer = pages[route] || pageNotFound;
    try {
      const html = await renderer();
      if (token !== state.token) return;
      view.innerHTML = html;
      wrapTables();
      setActiveNav(route);
      wire();
      view.scrollTop = 0;
    } catch (err) {
      if (token !== state.token) return;
      view.innerHTML = pageHead({ title: 'Une erreur est survenue', sub: err.message }) +
        '<div class="page-body"><div class="card">' + emptyState('fa-triangle-exclamation', err.message) + '</div></div>';
    }
  }

  function wrapTables() {
    view.querySelectorAll('table.data').forEach((t) => {
      if (t.parentElement && t.parentElement.classList.contains('table-scroll')) return;
      const box = document.createElement('div');
      box.className = 'table-scroll';
      t.parentNode.insertBefore(box, t);
      box.appendChild(t);
    });
  }

  function pageNotFound() {
    return pageHead({ title: 'Page introuvable', sub: 'Revenez au tableau de bord.' }) +
      '<div class="page-body"><div class="card">' + emptyState('fa-compass', 'Cette page n’existe pas') + '</div></div>';
  }

  function wire() {
    const route = state.route;

    if (route === 'devis') {
      const sort = document.getElementById('quoteSort');
      if (sort) sort.addEventListener('change', () => { state.quotes.sort = sort.value; state.quotes.page = 1; render(); });
      const quick = document.getElementById('quickSearch');
      if (quick) {
        quick.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && quick.value.trim()) {
            state.catalogue.search = quick.value.trim();
            go('catalogue');
          }
        });
      }
    }

    if (route === 'catalogue') {
      const search = document.getElementById('catalogueSearch');
      if (search) {
        let t = null;
        search.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => { state.catalogue.search = search.value; render(); }, 260);
        });
      }
      const sort = document.getElementById('catalogueSort');
      if (sort) sort.addEventListener('change', () => { state.catalogue.sort = sort.value; render(); });
    }

    if (route === 'clients') {
      const search = document.getElementById('clientsSearch');
      if (search) {
        let t = null;
        search.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => { state.clientsSearch = search.value; render(); document.getElementById('clientsSearch').focus(); }, 260);
        });
      }
    }

    if (route === 'stocks') {
      const search = document.getElementById('stocksSearch');
      if (search) {
        let t = null;
        search.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => { state.stocksSearch = search.value; render(); }, 260);
        });
      }
    }

    if (route === 'devis/nouveau') {
      const d = state.draft;
      if (!d) return;
      const clientSelect = document.getElementById('draftClient');
      if (clientSelect) {
        clientSelect.addEventListener('change', () => { d.clientId = clientSelect.value; });
      }
      const tvaToggle = document.getElementById('tvaToggle');
      if (tvaToggle) {
        tvaToggle.addEventListener('change', () => { d.tvaEnabled = tvaToggle.checked; recalcDraft(); });
      }
      const tvaRate = document.getElementById('tvaRate');
      if (tvaRate) {
        tvaRate.addEventListener('change', () => { d.assumptions.tvaRate = Number(tvaRate.value) / 100; d.tvaRate = d.assumptions.tvaRate; recalcDraft(); });
      }
      wireRoomInputs();
    }

    if (route === 'paiement') {
      const sel = document.getElementById('paymentQuote');
      if (sel) {
        sel.addEventListener('change', () => { state.payment.quoteId = sel.value; render(); });
      }
      const setupMonths = document.getElementById('flexMonthsSetup');
      if (setupMonths) {
        setupMonths.addEventListener('change', () => {
          const preview = document.querySelector('.flex-setup-amount');
          if (!preview) return;
          const total = Number(state.payment.total || 0);
          const financed = Math.max(0, total - Math.min(250000, total));
          const n = Number(setupMonths.value) || 1;
          const monthly = Math.round((financed * (1 + 0.01 * n)) / n);
          preview.textContent = '≈ ' + money(monthly) + ' / mois sur ' + n + ' mois';
        });
      }
      const planMonths = document.getElementById('flexMonths');
      if (planMonths) {
        planMonths.addEventListener('change', async () => {
          const months = Number(planMonths.value);
          try {
            await api('/api/payments/' + encodeURIComponent(state.payment.quoteId) + '/schedule', {
              method: 'POST', body: { months: months }
            });
            toast('Durée du crédit mise à jour : ' + months + ' mois');
            render();
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      }
    }
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el) {
      const action = actions[el.dataset.action];
      if (action) {
        e.preventDefault();
        action(el, e);
      }
      return;
    }
    if (e.target.matches('[data-overlay]')) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalRoot.innerHTML) closeModal();
  });

  document.querySelectorAll('.nav-item').forEach((el) => {
    el.addEventListener('click', () => go(el.dataset.route));
  });

  const userChip = document.getElementById('userChip');
  if (userChip) {
    userChip.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleUserMenu();
    });
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('userMenu');
      if (menu && !menu.contains(e.target) && !userChip.contains(e.target)) closeUserMenu();
    });
  }

  window.addEventListener('hashchange', () => { closeModal(); render(); });

  /* Démarrage */
  (async function boot() {
    state.roles = await api('/api/roles').catch(() => null);
    state.company = await api('/api/company').catch(() => null);
    state.session = loadSession();
    if (state.session) {
      try {
        const me = await api('/api/auth/me');
        persistSession({ token: state.session.token, user: me.user });
      } catch (err) {
        persistSession(null);
      }
    }
    syncSessionUI();
    if (!state.session) {
      renderLoginScreen();
      return;
    }
    await loadData();
    render();
  })();
})();
