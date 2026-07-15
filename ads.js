(function () {
  var CONSENT_KEY = 'english-trainer-cookie-consent';
  var ADS_CLIENT = 'ca-pub-5587713354919719';
  // Cole aqui o ID da unidade Display criada no painel AdSense (Anúncios > Por unidade de anúncio).
  // Enquanto vazio, nenhum script de anúncio é carregado (evita Auto Ads na sidebar).
  var ADS_SLOT = '';
  // Opcional: 2ª unidade para o slot entre a 20ª e 21ª frase. Se vazio, reutiliza ADS_SLOT.
  var ADS_SLOT_MID = '';
  var scriptLoaded = false;
  var adsInitialized = false;

  function hasConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY) === 'accepted';
    } catch (e) {
      return false;
    }
  }

  function isContextPage() {
    return !!document.getElementById('sentencesList');
  }

  function loadAdsScript(onReady) {
    if (scriptLoaded || window.adsbygoogle) {
      scriptLoaded = true;
      if (onReady) onReady();
      return;
    }

    var existing = document.querySelector('script[src*="adsbygoogle.js"]');
    if (existing) {
      existing.addEventListener('load', function () {
        scriptLoaded = true;
        if (onReady) onReady();
      });
      if (window.adsbygoogle) {
        scriptLoaded = true;
        if (onReady) onReady();
      }
      return;
    }

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADS_CLIENT;
    script.crossOrigin = 'anonymous';
    script.onload = function () {
      scriptLoaded = true;
      if (onReady) onReady();
    };
    document.head.appendChild(script);
  }

  function mountAdUnit(containerId, slotId) {
    if (!slotId) return;

    var container = document.getElementById(containerId);
    if (!container || container.querySelector('.adsbygoogle')) return;

    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', ADS_CLIENT);
    ins.setAttribute('data-ad-slot', slotId);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    container.appendChild(ins);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {}
  }

  function renderAdUnits() {
    if (adsInitialized) return;

    mountAdUnit('contextAdSlot', ADS_SLOT);
    mountAdUnit('contextAdSlotMid', ADS_SLOT_MID || ADS_SLOT);

    adsInitialized = true;
  }

  function initAds() {
    if (!hasConsent() || !isContextPage() || !ADS_SLOT) return;
    loadAdsScript(renderAdUnits);
  }

  window.addEventListener('cookie-consent-accepted', initAds);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAds);
  } else {
    initAds();
  }
})();
