/**
 * Écran de connexion, connexion de démonstration, déconnexion.
 */

import { pageHead, view } from '../ui/dom.js';
import { api, esc, renderNetlog, toast } from '../core/format.js';
import {
  APP_BUILD,
  APP_VERSION,
  CLIENT_MODULES,
  ROUTE_MODULE,
  canModule,
  canRoute,
  currentUser,
  firstAllowedRoute,
  initialsOf,
  isClientUser,
  persistSession,
  saveDemoRole,
  state
} from '../core/state.js';
import { getRoute, render } from '../core/router.js';
import { ensureDraft } from '../pages/nouveau-devis.js';
import { closeModal } from '../ui/modals.js';

export function syncSessionUI() {
  const user = currentUser();
  document.body.classList.toggle('auth-mode', !user);

  const chip = document.getElementById('userChip');
  if (chip) {
    if (!user) {
      chip.innerHTML = '';
    } else {
      chip.innerHTML =
        '<span class="avatar">' +
        esc(user.initials || initialsOf(user.name)) +
        '</span>' +
        '<span>' +
        esc(user.roleLabel || user.role) +
        '</span>' +
        '<i class="fa-solid fa-chevron-down"></i>';
      chip.title = user.name + ' — ' + user.email;
    }
  }

  document.querySelectorAll('.nav-item').forEach((el) => {
    const mod = ROUTE_MODULE[el.dataset.route];
    const clientOnly = CLIENT_MODULES.indexOf(mod) !== -1;
    el.hidden = !!mod && (!canModule(mod) || clientOnly !== isClientUser());
  });

  document.querySelectorAll('.nav-group').forEach((el) => {
    el.hidden = el.classList.contains('client-only') ? !isClientUser() : isClientUser();
  });

  const brand = document.querySelector('.brand');
  if (brand && user) brand.setAttribute('href', '#/' + firstAllowedRoute());
}

export function accessDenied() {
  const user = currentUser();
  const roleLabel = (user && (user.roleLabel || user.role)) || 'votre rôle';
  return (
    pageHead({
      title: 'Accès restreint',
      sub: 'Cette page n’est pas ouverte à votre rôle.'
    }) +
    '<div class="page-body"><div class="card"><div class="denied">' +
    '<span class="denied-icon"><i class="fa-solid fa-lock"></i></span>' +
    '<h2>Accès restreint</h2>' +
    '<p>Le rôle « ' +
    esc(roleLabel) +
    ' » n’a pas les droits nécessaires pour consulter cette page. ' +
    'Connectez-vous avec un autre compte pour y accéder.</p>' +
    '<div class="denied-actions">' +
    (user && user.role === 'admin' && CLIENT_MODULES.indexOf(ROUTE_MODULE[state.route] || '') !== -1
      ? '<button class="btn btn-primary" data-action="preview-client">' +
        '<i class="fa-solid fa-store"></i> Ouvrir l’espace client <span class="demo-tag">Démo</span></button>'
      : '') +
    '<button class="btn btn-primary" data-action="go-home">' +
    '<i class="fa-solid fa-arrow-left"></i> Retour à l’accueil</button></div>' +
    '</div></div></div>'
  );
}

export let loginBusy = false;

export function renderLoginScreen() {
  const demo = (state.roles && state.roles.roles) || [];
  const accounts = demo.length
    ? demo
    : [
        { label: 'Administrateur', key: 'admin' },
        { label: 'Commercial', key: 'commercial' },
        { label: 'Comptable', key: 'comptable' },
        { label: 'Stockiste', key: 'stockiste' },
        { label: 'Client', key: 'client' }
      ];
  const emails = {
    admin: 'admin@peinturepro.gn',
    commercial: 'commercial@peinturepro.gn',
    comptable: 'comptable@peinturepro.gn',
    stockiste: 'stock@peinturepro.gn',
    client: 'client@peinturepro.gn'
  };
  const passwords = {
    admin: 'admin123',
    commercial: 'com123',
    comptable: 'compta123',
    stockiste: 'stock123',
    client: 'client123'
  };
  const demoButtons = accounts
    .map(
      (role) =>
        '<form class="auth-demo-form" data-demo-form method="post" action="/api/auth/demo-form">' +
        '<input type="hidden" name="role" value="' +
        esc(role.key) +
        '">' +
        '<button type="submit" class="auth-demo-btn' +
        (role.key === 'client' ? ' wide' : '') +
        '" data-demo-role="' +
        esc(role.key) +
        '" data-demo-email="' +
        esc(emails[role.key] || '') +
        '" data-demo-password="' +
        esc(passwords[role.key] || '') +
        '">' +
        '<span class="auth-demo-role">' +
        esc(role.label) +
        '</span>' +
        '<span class="auth-demo-mail">' +
        esc(emails[role.key] || '') +
        '</span>' +
        '</button>' +
        '</form>'
    )
    .join('');

  view.innerHTML =
    '<div class="auth-screen">' +
    '<div class="auth-card">' +
    '<img class="auth-logo" src="assets/logo.png" alt="Peinture Pro Guinée">' +
    '<h1>Connexion</h1>' +
    '<p class="auth-sub">Espace de gestion commerciale ou espace client — un seul point d’entrée.</p>' +
    '<div class="auth-notice" id="authNotice"' +
    (state.authNotice ? '' : ' hidden') +
    '>' +
    '<i class="fa-solid fa-circle-info"></i><span>' +
    esc(state.authNotice || '') +
    '</span></div>' +
    '<form id="loginForm" class="auth-form" method="post" action="/api/auth/login-form" novalidate>' +
    '<div class="field"><label for="loginEmail">Adresse email</label>' +
    '<input class="input" id="loginEmail" name="email" type="email" autocomplete="username" placeholder="prenom@peinturepro.gn"></div>' +
    '<div class="field"><label for="loginPassword">Mot de passe</label>' +
    '<input class="input" id="loginPassword" name="password" type="password" autocomplete="current-password" placeholder="••••••••"></div>' +
    '<div class="auth-error" id="loginError" hidden></div>' +
    '<button class="btn btn-primary auth-submit" type="submit"><i class="fa-solid fa-arrow-right-to-bracket"></i> Se connecter</button>' +
    '</form>' +
    '<p class="auth-switch">Pas encore de compte ? ' +
    '<button type="button" class="link-btn" data-action="open-register">Créer mon compte client</button></p>' +
    '<p class="auth-status" id="authStatus">Version ' +
    APP_VERSION +
    ' · ' +
    APP_BUILD +
    ' · vérification du serveur…</p>' +
    '<p class="auth-reset"><button type="button" class="link-btn" data-action="hard-reset">' +
    '<i class="fa-solid fa-rotate-right"></i> Un souci pour vous connecter ? Recharger l’application</button></p>' +
    '<div class="auth-demo">' +
    '<div class="auth-demo-title">Comptes de démonstration</div>' +
    '<div class="auth-demo-list">' +
    demoButtons +
    '</div>' +
    '</div>' +
    '<details class="auth-debug"><summary>Journal de connexion</summary>' +
    '<pre id="authLog">aucun échange avec le serveur pour le moment</pre></details>' +
    '</div>' +
    '</div>';

  const status = document.getElementById('authStatus');
  if (status) {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http ' + r.status))))
      .then((health) => {
        const missing = (health.demoAccounts || []).filter((a) => !a.exists);
        const versionOk = String(health.version || '').indexOf(APP_VERSION) === 0;
        status.textContent =
          'Version ' +
          APP_VERSION +
          ' · ' +
          APP_BUILD +
          ' · serveur connecté' +
          (versionOk
            ? ''
            : ' — version serveur ' +
              (health.version || 'inconnue') +
              ' : rechargez la page (Ctrl+Shift+R)') +
          (missing.length ? ' · comptes manquants : ' + missing.map((a) => a.email).join(', ') : '');
        status.classList.toggle('warn', !versionOk || missing.length > 0);
      })
      .catch(() => {
        status.textContent =
          'Serveur injoignable — démarrez l’application (npm start) puis rechargez la page';
        status.classList.add('warn');
      });
  }

  renderNetlog();
}

export function startDemoLogin(btn) {
  if (!btn || loginBusy) return;
  loginBusy = true;
  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPassword');
  const box = document.getElementById('loginError');
  if (emailEl) emailEl.value = btn.dataset.demoEmail || '';
  if (passEl) passEl.value = btn.dataset.demoPassword || '';
  if (box) {
    box.hidden = true;
    box.textContent = '';
  }
  const label = btn.querySelector('.auth-demo-role');
  const original = label ? label.textContent : '';
  if (label) label.textContent = 'Connexion…';
  btn.classList.add('busy');
  const reset = () => {
    loginBusy = false;
    btn.classList.remove('busy');
    if (label) label.textContent = original;
  };
  // Filet de sécurité : si rien ne se passe au bout de 12 s, on l'affiche noir sur blanc.
  const watchdog = setTimeout(() => {
    if (!loginBusy) return;
    if (box) {
      box.textContent =
        'La connexion prend trop de temps. Vérifiez votre connexion puis cliquez sur « Recharger l’application ».';
      box.hidden = false;
    }
    reset();
  }, 12000);
  signInDemo(btn.dataset.demoRole, { email: btn.dataset.demoEmail, password: btn.dataset.demoPassword })
    .then(() => {
      clearTimeout(watchdog);
      loginBusy = false;
    })
    .catch((err) => {
      clearTimeout(watchdog);
      reset();
      if (box) {
        box.textContent = err && err.message ? err.message : 'Connexion impossible';
        box.hidden = false;
      }
    });
}

// Aucune erreur JavaScript ne doit rester invisible sur l'écran de connexion.
export function surfaceLoginError(message) {
  if (!document.getElementById('loginForm')) return;
  const box = document.getElementById('loginError');
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
}
window.addEventListener('error', (e) => {
  surfaceLoginError('Erreur inattendue : ' + ((e && e.message) || 'inconnue'));
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e && e.reason;
  surfaceLoginError('Erreur inattendue : ' + ((reason && reason.message) || reason || 'inconnue'));
});

export function showLoginError(message) {
  const box = document.getElementById('loginError');
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
}

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('loginForm')) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const index = ['1', '2', '3', '4', '5'].indexOf(e.key);
  if (index === -1) return;
  const buttons = Array.from(document.querySelectorAll('[data-demo-role]'));
  const btn = buttons[index];
  if (btn) {
    e.preventDefault();
    startDemoLogin(btn);
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form && form.hasAttribute && form.hasAttribute('data-demo-form')) {
    e.preventDefault();
    const btn = form.querySelector('[data-demo-role]');
    if (btn) startDemoLogin(btn);
    return;
  }
  if (form && form.id === 'loginForm') {
    e.preventDefault();
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    const email = ((emailEl && emailEl.value) || '').trim();
    const password = (passEl && passEl.value) || '';
    if (!email || !password) return showLoginError('Renseignez votre email et votre mot de passe.');
    const box = document.getElementById('loginError');
    if (box) {
      box.textContent = '';
      box.hidden = true;
    }
    signIn(email, password).catch((err) =>
      showLoginError(err && err.message ? err.message : 'Connexion impossible')
    );
  }
});

export async function afterSignIn(data) {
  state.authNotice = null;
  try {
    sessionStorage.removeItem('ppg.loggedOut');
  } catch (err) {}
  persistSession({ token: data.token, user: data.user });
  await loadData();
  const route = getRoute();
  const target = canRoute(route) ? route : firstAllowedRoute();
  toast('Bienvenue ' + String(data.user.name || '').split(' ')[0]);
  if (target !== route) location.hash = '#/' + target;
  else render();
}

export async function signIn(email, password) {
  const data = await api('/api/auth/login', { method: 'POST', body: { email: email, password: password } });
  await afterSignIn(data);
}

export async function signInDemo(role, credentials) {
  const creds = credentials || {};
  let data;
  try {
    data = await api('/api/auth/demo', { method: 'POST', body: { role: role } });
  } catch (err) {
    // Serveur plus ancien (route absente) ou compte refusé : on tente la connexion classique
    // avec les identifiants de démonstration affichés sur le bouton.
    if (!creds.email || !creds.password) throw err;
    data = await api('/api/auth/login', {
      method: 'POST',
      body: { email: creds.email, password: creds.password }
    });
  }
  saveDemoRole(role);
  await afterSignIn(data);
}

export function signOut(silent) {
  const hadSession = !!state.session;
  const token = state.session && state.session.token;
  if (token) {
    fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(
      () => {}
    );
  }
  state.draft = null;
  if (!silent) {
    state.authNotice = null;
    saveDemoRole('');
    try {
      sessionStorage.setItem('ppg.loggedOut', '1');
    } catch (err) {}
  }
  closeUserMenu();
  persistSession(null);
  closeModal();
  if (!silent) toast('Vous êtes déconnecté');
  if (hadSession) renderLoginScreen();
}

export async function loadData() {
  if (isClientUser()) {
    state.company = await api('/api/company').catch(() => null);
    return;
  }
  try {
    state.company = await api('/api/company');
    await ensureDraft();
    state.products = await api('/api/products');
    state.clients = await api('/api/clients');
  } catch (err) {
    console.error(err);
  }
}

export function closeUserMenu() {
  const menu = document.getElementById('userMenu');
  if (menu) menu.remove();
}

export function toggleUserMenu() {
  if (document.getElementById('userMenu')) return closeUserMenu();
  const user = currentUser();
  if (!user) return;
  const menu = document.createElement('div');
  menu.id = 'userMenu';
  menu.className = 'user-menu';
  menu.innerHTML =
    '<div class="user-menu-head">' +
    '<span class="avatar">' +
    esc(user.initials || initialsOf(user.name)) +
    '</span>' +
    '<div><div class="user-menu-name">' +
    esc(user.name) +
    '</div>' +
    '<div class="user-menu-mail">' +
    esc(user.email) +
    '</div>' +
    '<div class="user-menu-role">' +
    esc(user.roleLabel || user.role) +
    '</div></div>' +
    '</div>' +
    (user.role === 'admin'
      ? '<button class="user-menu-item client-preview" data-action="preview-client"><i class="fa-solid fa-store"></i> Espace client <span class="demo-tag">Démo</span></button>'
      : '') +
    '<div class="user-menu-sep"></div>' +
    '<div class="user-menu-label">Changer d’espace</div>' +
    '<a class="user-menu-item" href="/demo/admin"><i class="fa-solid fa-user-shield"></i> Administrateur</a>' +
    '<a class="user-menu-item" href="/demo/commercial"><i class="fa-solid fa-user-tie"></i> Commercial</a>' +
    '<a class="user-menu-item" href="/demo/comptable"><i class="fa-solid fa-calculator"></i> Comptable</a>' +
    '<a class="user-menu-item" href="/demo/stockiste"><i class="fa-solid fa-boxes-stacked"></i> Stockiste</a>' +
    '<a class="user-menu-item" href="/demo/client"><i class="fa-solid fa-store"></i> Espace client</a>' +
    '<div class="user-menu-sep"></div>' +
    '<button class="user-menu-item" data-action="sign-out"><i class="fa-solid fa-arrow-right-from-bracket"></i> Se déconnecter</button>';
  document.querySelector('.topbar').appendChild(menu);
  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="sign-out"]');
    if (btn) signOut();
  });
}
