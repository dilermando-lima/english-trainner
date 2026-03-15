(function () {
  var CONSENT_KEY = 'english-trainer-cookie-consent';

  function getBanner() {
    return document.getElementById('cookieConsentBanner');
  }

  function getAcceptButton() {
    return document.getElementById('cookieConsentAccept');
  }

  function hideBanner() {
    var banner = getBanner();
    if (banner) banner.classList.add('hidden');
  }

  function showBanner() {
    var banner = getBanner();
    if (banner) banner.classList.remove('hidden');
  }

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch (e) {}
    hideBanner();
  }

  function init() {
    if (localStorage.getItem(CONSENT_KEY) === 'accepted') {
      hideBanner();
      return;
    }
    showBanner();
    var btn = getAcceptButton();
    if (btn) btn.addEventListener('click', accept);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
