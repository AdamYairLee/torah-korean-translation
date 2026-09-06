(() => {
  'use strict';

  let deferredInstallPrompt = null;
  let promoEl = null;
  let fallbackTimer = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = () => /android/i.test(navigator.userAgent);
  const isMobile = () => isIOS() || isAndroid() || window.matchMedia('(max-width: 760px)').matches;

  const lang = () => localStorage.getItem('ui_lang') === 'en' ? 'en' : 'he';

  const copy = {
    he: {
      title: 'התקינו את AI Korean Master',
      text: 'אפשר להוסיף את האתר למסך הבית ולהשתמש בו כמו באפליקציה.',
      install: 'התקנה',
      how: 'איך מתקינים?',
      ios: 'ב־Safari לחצו על כפתור השיתוף ואז על „הוספה למסך הבית”.',
      android: 'פתחו את האתר ב־Chrome, פתחו את תפריט הדפדפן ובחרו „התקנת אפליקציה” או „הוספה למסך הבית”.',
      close: 'סגירה'
    },
    en: {
      title: 'Install AI Korean Master',
      text: 'Add this site to your Home Screen and use it like an app.',
      install: 'Install',
      how: 'How to install',
      ios: 'In Safari, tap Share, then choose “Add to Home Screen”.',
      android: 'Open this site in Chrome, open the browser menu, then choose “Install app” or “Add to Home screen”.',
      close: 'Close'
    }
  };

  function dismissForSession() {
    sessionStorage.setItem('aik_install_promo_dismissed', '1');
    hidePromo();
  }

  function hidePromo() {
    if (promoEl) {
      promoEl.remove();
      promoEl = null;
    }
  }

  function shouldShow() {
    return !isStandalone() && !sessionStorage.getItem('aik_install_promo_dismissed');
  }

  function instructionsText() {
    const c = copy[lang()];
    return isIOS() ? c.ios : c.android;
  }

  async function handlePrimaryAction() {
    const c = copy[lang()];
    if (deferredInstallPrompt) {
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      try {
        await promptEvent.prompt();
        await promptEvent.userChoice;
      } catch (_) {}
      hidePromo();
      return;
    }

    const guide = promoEl && promoEl.querySelector('.pwa-install-guide');
    const button = promoEl && promoEl.querySelector('.pwa-install-primary');
    if (guide) {
      guide.textContent = instructionsText();
      guide.hidden = false;
    }
    if (button) button.textContent = c.close;
    if (button) button.onclick = dismissForSession;
  }

  function renderPromo() {
    if (!shouldShow() || promoEl) return;
    const c = copy[lang()];
    promoEl = document.createElement('aside');
    promoEl.className = 'pwa-install-promo';
    promoEl.setAttribute('role', 'dialog');
    promoEl.setAttribute('aria-label', c.title);
    promoEl.innerHTML = `
      <button class="pwa-install-x" type="button" aria-label="${c.close}">×</button>
      <img class="pwa-install-icon" src="icons/icon-192.png" alt="" width="58" height="58" />
      <div class="pwa-install-copy" dir="${lang() === 'he' ? 'rtl' : 'ltr'}">
        <strong>${c.title}</strong>
        <span>${c.text}</span>
        <small class="pwa-install-guide" hidden></small>
      </div>
      <button class="pwa-install-primary" type="button">${deferredInstallPrompt ? c.install : c.how}</button>
    `;

    promoEl.querySelector('.pwa-install-x').addEventListener('click', dismissForSession);
    promoEl.querySelector('.pwa-install-primary').addEventListener('click', handlePrimaryAction, { once: true });
    document.body.appendChild(promoEl);
  }

  function refreshPromo() {
    if (!promoEl) return;
    hidePromo();
    renderPromo();
  }

  window.refreshInstallPromo = refreshPromo;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (promoEl) refreshPromo();
    else renderPromo();
  });

  window.addEventListener('appinstalled', () => {
    sessionStorage.setItem('aik_install_promo_dismissed', '1');
    hidePromo();
  });

  // iOS has no beforeinstallprompt. On mobile browsers that do not expose the
  // event (including many in-app browsers), show a clear manual-install guide.
  window.addEventListener('load', () => {
    if (!isMobile() || isStandalone()) return;
    fallbackTimer = setTimeout(() => {
      if (!deferredInstallPrompt) renderPromo();
    }, 1800);
  });
})();
