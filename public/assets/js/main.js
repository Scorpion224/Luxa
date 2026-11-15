/**
 * Démarrage : écouteurs globaux et restauration de session.
 */

import { actions } from './core/registry.js';
import './core/actions.js';

import { modalRoot } from './ui/dom.js';
import { api } from './core/format.js';
import {
  APP_VERSION,
  canRoute,
  firstAllowedRoute,
  loadDemoRole,
  loadSession,
  persistSession,
  saveDemoRole,
  state
} from './core/state.js';
import { getRoute, go, render } from './core/router.js';
import { closeUserMenu, loadData, renderLoginScreen, syncSessionUI, toggleUserMenu } from './auth/login.js';
import { closeModal } from './ui/modals.js';
import './pages/devis.js';
import './pages/catalogue.js';
import './pages/nouveau-devis.js';
import './pages/paiement.js';
import './pages/clients.js';
import './pages/stocks.js';
import './pages/chantiers.js';
import './pages/finance.js';
import './pages/commandes.js';
import './pages/espace-client.js';

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

export const userChip = document.getElementById('userChip');
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

window.addEventListener('hashchange', () => {
  closeModal();
  render();
});

(async function boot() {
  // aligne le client sur la version du serveur : évite une interface périmée restée en cache
  try {
    const health = await api('/api/health');
    state.demoMode = health.demoMode !== false;
    if (String(health.version || '').indexOf(APP_VERSION) !== 0) {
      if (!sessionStorage.getItem('ppg.build')) {
        sessionStorage.setItem('ppg.build', '1');
        location.reload();
        return;
      }
    } else {
      sessionStorage.removeItem('ppg.build');
    }
  } catch (err) {
    /* serveur indisponible : l'écran de connexion affichera le détail */
  }

  // message renvoyé par la connexion « sans JavaScript » (redirection du serveur)
  try {
    const params = new URLSearchParams(location.search);
    const erreur = params.get('erreur');
    if (erreur) {
      state.authNotice = String(erreur);
      params.delete('erreur');
      const qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }
  } catch (err) {
    /* navigateur ancien : on ignore */
  }

  state.roles = await api('/api/roles').catch(() => null);
  state.company = await api('/api/company').catch(() => null);
  state.session = loadSession();
  const hadSession = !!state.session;
  let restored = null;
  let rejected = false;
  try {
    const res = await fetch('/api/auth/me', {
      headers: state.session ? { Authorization: 'Bearer ' + state.session.token } : {}
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        restored = { token: data.token || (state.session && state.session.token), user: data.user };
      }
    } else if (res.status === 401) {
      rejected = true;
    }
  } catch (err) {
    /* serveur injoignable : l'écran de connexion l'indiquera */
  }

  // Redémarrage du serveur, base réinitialisée, jeton trop vieux : si l'utilisateur
  // était dans un espace de démonstration, on le rebranche tout seul, sans écran de
  // connexion ni message d'erreur.
  if (!restored && rejected) {
    const demoRole = wanted || loadDemoRole();
    if (demoRole) {
      try {
        const data = await api('/api/auth/demo', { method: 'POST', body: { role: demoRole } });
        if (data && data.token) restored = { token: data.token, user: data.user };
      } catch (err) {
        /* on retombe sur l'écran de connexion */
      }
    }
  }

  // Espace demandé par l'URL (menu « Changer d'espace », lien /demo/...) :
  // on l'ouvre même si une autre session était encore active, et même sans session.
  let wanted = '';
  try {
    wanted = new URLSearchParams(location.search).get('espace') || '';
  } catch (err) {}

  if (restored && restored.token) {
    persistSession(restored);
    state.authNotice = null;
    if (wanted && (!restored.user || restored.user.role !== wanted)) {
      try {
        const data = await api('/api/auth/demo', { method: 'POST', body: { role: wanted } });
        if (data && data.token) {
          persistSession({ token: data.token, user: data.user });
          saveDemoRole(wanted);
        }
      } catch (err) {
        /* on garde la session courante */
      }
    }
  } else if (hadSession || rejected) {
    if (hadSession || loadDemoRole()) {
      state.authNotice = 'Votre session a expiré — reconnectez-vous en un clic sur un espace ci-dessous.';
    }
    persistSession(null);
  }
  syncSessionUI();
  // Écran de connexion demandé explicitement (?connexion=1) : on l'affiche même
  // si une session est déjà ouverte, pour pouvoir changer de compte.
  let forceLogin = false;
  try {
    forceLogin = new URLSearchParams(location.search).get('connexion') === '1';
  } catch (err) {}
  if (forceLogin) {
    // même présentation que lors d'un premier chargement : sans barre latérale
    document.body.classList.add('auth-mode');
    renderLoginScreen();
    return;
  }

  // Accès direct : si aucune session valide n'a pu être restaurée, on ouvre
  // automatiquement l'espace de démonstration (dernier utilisé, sinon administrateur).
  // L'écran de connexion ne s'affiche plus que si l'utilisateur s'est déconnecté
  // volontairement, ou en ajoutant ?connexion=1 à l'adresse.
  if (!state.session) {
    let voluntaryLogout = false;
    try {
      voluntaryLogout = sessionStorage.getItem('ppg.loggedOut') === '1';
    } catch (err) {}
    if (!voluntaryLogout && !forceLogin && state.demoMode !== false) {
      const role = wanted || loadDemoRole() || 'admin';
      try {
        const data = await api('/api/auth/demo', { method: 'POST', body: { role: role } });
        if (data && data.token) {
          saveDemoRole(role);
          persistSession({ token: data.token, user: data.user });
          state.authNotice = null;
        }
      } catch (err) {
        /* serveur injoignable : écran de connexion classique */
      }
    }
    if (!state.session) {
      renderLoginScreen();
      return;
    }
  }
  await loadData();

  // Arrivée sur l'URL racine ou sur une page interdite à ce rôle : on ouvre
  // directement la première page autorisée au lieu d'afficher « Accès restreint ».
  const landing = getRoute();
  if (!canRoute(landing)) {
    const target = firstAllowedRoute();
    const url = new URL(location.href);
    if (url.searchParams.has('espace')) {
      url.searchParams.delete('espace');
      history.replaceState(null, '', url.pathname + (url.search || '') + '#/' + target);
    } else {
      location.hash = '#/' + target;
      return;
    }
  }
  render();
})();
