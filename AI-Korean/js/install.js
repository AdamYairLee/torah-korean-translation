(() => {
  'use strict';

  let deferredInstallPrompt = null;

  const installButton = document.getElementById('installAppTopButton');
  const helpPopover = document.getElementById('installHelpPopover');

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = () => /android/i.test(navigator.userAgent);
  const isInAppBrowser = () => /instagram|fbav|fban|line|wv/i.test(navigator.userAgent);

  function hideInstallUI() {
    if (installButton) installButton.hidden = true;
    if (helpPopover) helpPopover.hidden = true;
  }

  function showManualGuide() {
    if (!helpPopover) return;

    let he;
    let en;

    if (isIOS()) {
      he = 'ב־Safari: לחצו על שיתוף ואז על „הוספה למסך הבית”.';
      en = 'In Safari: tap Share, then “Add to Home Screen”.';
    } else if (isInAppBrowser()) {
      he = 'פתחו את הדף ב־Chrome או ב־Safari, ואז בחרו התקנת אפליקציה או הוספה למסך הבית.';
      en = 'Open this page in Chrome or Safari, then choose Install app or Add to Home Screen.';
    } else if (isAndroid()) {
      he = 'ב־Chrome: פתחו את תפריט הדפדפן ובחרו „התקנת אפליקציה” או „הוספה למסך הבית”.';
      en = 'In Chrome: open the browser menu and choose “Install app” or “Add to Home screen”.';
    } else {
      he = 'פתחו את תפריט הדפדפן וחפשו אפשרות להתקנת האפליקציה או להוספה למסך הבית.';
      en = 'Open your browser menu and look for Install app or Add to Home Screen.';
    }

    helpPopover.innerHTML = `
      <button class="install-help-close" type="button" aria-label="Close">×</button>
      <div dir="rtl">${he}</div>
      <div dir="ltr">${en}</div>
    `;
    helpPopover.hidden = false;

    const closeButton = helpPopover.querySelector('.install-help-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        helpPopover.hidden = true;
      }, { once: true });
    }
  }

  async function installFromButton() {
    if (isStandalone()) {
      hideInstallUI();
      return;
    }

    if (deferredInstallPrompt) {
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          hideInstallUI();
          return;
        }
      } catch (_) {}
    }

    showManualGuide();
  }

  if (!installButton) return;

  if (isStandalone()) {
    hideInstallUI();
    return;
  }

  // Capture the browser's native install event, but never open anything
  // automatically. The install prompt can only appear after the user taps
  // the small top-center Install button.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });

  window.addEventListener('appinstalled', hideInstallUI);
  installButton.addEventListener('click', installFromButton);
})();
