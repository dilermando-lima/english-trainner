(function () {
  var CONSENT_KEY = 'english-trainer-cookie-consent';

  function getBanner() {
    return document.getElementById('cookieConsentBanner');
  }

  function getAcceptButton() {
    return document.getElementById('cookieConsentAccept');
  }

  function getRejectButton() {
    return document.getElementById('cookieConsentReject');
  }

  function hideBanner() {
    var banner = getBanner();
    if (banner) banner.classList.add('hidden');
  }

  function showBanner() {
    var banner = getBanner();
    if (banner) banner.classList.remove('hidden');
  }

  function notifyConsentAccepted() {
    window.dispatchEvent(new CustomEvent('cookie-consent-accepted'));
  }

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch (e) {}
    hideBanner();
    notifyConsentAccepted();
  }

  function reject() {
    try {
      localStorage.setItem(CONSENT_KEY, 'rejected');
    } catch (e) {}
    hideBanner();
  }

  function init() {
    var consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'accepted' || consent === 'rejected') {
      hideBanner();
      return;
    }
    showBanner();
    var acceptBtn = getAcceptButton();
    var rejectBtn = getRejectButton();
    if (acceptBtn) acceptBtn.addEventListener('click', accept);
    if (rejectBtn) rejectBtn.addEventListener('click', reject);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
