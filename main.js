let currentContext = null;
let currentIndex = 0;
let autoplay = false;
let currentRate = 0.8;
let currentAccent = 'en-US';
let speechSynthesisSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let speechRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
let cachedVoices = [];
let speechWarnHideTimeout = null;

const elements = {
  sentencesList: document.getElementById('sentencesList'),
  listenAllBtn: document.getElementById('listenAllBtn'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  accentToggle: document.getElementById('accentToggle'),
  speedSelect: document.getElementById('speedSelect'),
  themeToggle: document.getElementById('themeToggle'),
  themeIconSun: document.querySelector('.theme-icon-sun'),
  themeIconMoon: document.querySelector('.theme-icon-moon'),
  speechWarnToast: document.getElementById('speechWarnToast'),
  sidebarToggle: document.getElementById('sidebarToggle'),
  sidebarClose: document.getElementById('sidebarClose'),
  contextSidebar: document.getElementById('contextSidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
};

const THEME_KEY = 'english-trainer-theme';
const SPEED_KEY = 'english-trainer-last-speed';
const ACCENT_KEY = 'english-trainer-last-accent';

function init() {
  if (!elements.sentencesList) return;

  applySavedTheme();
  wireEvents();
  initSentencesFromDom();

  const savedSpeed = localStorage.getItem(SPEED_KEY);
  if (savedSpeed) {
    const parsedSpeed = parseFloat(savedSpeed);
    if (!Number.isNaN(parsedSpeed) && parsedSpeed > 0) {
      currentRate = parsedSpeed;
      if (elements.speedSelect) {
        elements.speedSelect.value = savedSpeed;
      }
    }
  }

  const savedAccent = localStorage.getItem(ACCENT_KEY);
  if (savedAccent === 'en-US' || savedAccent === 'en-GB') {
    currentAccent = savedAccent;
  }
  updateAccentButton();

  updateListenAllState();

  if (!speechSynthesisSupported) {
    if (elements.listenAllBtn) elements.listenAllBtn.disabled = true;
  } else {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
}

function getFieldText(container, field) {
  if (!container) return '';
  const el = container.querySelector(`[data-field="${field}"]`);
  if (!el) return '';
  const text = el.textContent.trim();
  return text === '—' ? '' : text;
}

function getGenderFromBlock(block, attrName, fallback) {
  // data-qg="F" → female voice, data-qg="M" → male voice (same for data-ag)
  return normalizeGender(block?.getAttribute(attrName), fallback);
}

function parseSentenceItem(item) {
  const qBlock = item.querySelector('.sentence-question');
  const aBlock = item.querySelector('.sentence-answer');
  return {
    QE: getFieldText(qBlock, 'QE'),
    QP: getFieldText(qBlock, 'QP'),
    AE: getFieldText(aBlock, 'AE'),
    AP: getFieldText(aBlock, 'AP'),
  };
}

function getSentenceGender(index, part) {
  const item = document.getElementById('sentence-item-' + index);
  const isQuestion = part === 'question';
  const block = item?.querySelector(isQuestion ? '.sentence-question' : '.sentence-answer');
  return getGenderFromBlock(block, isQuestion ? 'data-qg' : 'data-ag', isQuestion ? 'F' : 'M');
}

function initSentencesFromDom() {
  if (!elements.sentencesList) return;

  const items = elements.sentencesList.querySelectorAll('.sentence-item');
  const sentences = Array.from(items).map(parseSentenceItem);

  items.forEach((item, index) => {
    item.id = 'sentence-item-' + index;
    item.dataset.sentenceIndex = String(index);
    item.querySelectorAll('[data-index]').forEach((el) => {
      el.dataset.index = String(index);
    });
  });

  const contextName =
    document.querySelector('[data-context-name]')?.textContent?.trim() || document.title;

  currentContext = { name: contextName, sentences };
  currentIndex = 0;
}

const MID_AD_AFTER_SENTENCE_COUNT = 20;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function placeMidAdSlot() {
  const midAd = document.getElementById('contextAdSlotMid');
  if (!midAd || !elements.sentencesList) return;

  if (midAd.parentNode) {
    midAd.parentNode.removeChild(midAd);
  }

  const items = elements.sentencesList.querySelectorAll('.sentence-item');
  const insertAfterIndex = MID_AD_AFTER_SENTENCE_COUNT - 1;

  if (items.length > insertAfterIndex) {
    items[insertAfterIndex].insertAdjacentElement('afterend', midAd);
    return;
  }

  elements.sentencesList.appendChild(midAd);
}

function shuffleSentences() {
  if (!elements.sentencesList) return;

  const items = Array.from(elements.sentencesList.querySelectorAll('.sentence-item'));
  if (items.length <= 1) return;

  if (autoplay) {
    autoplay = false;
    window.speechSynthesis.cancel();
    if (elements.listenAllBtn) elements.listenAllBtn.textContent = 'Ouvir todos';
    clearPlayingSentenceIndex();
    updateListenAllState();
  }

  shuffleArray(items).forEach((item) => {
    elements.sentencesList.appendChild(item);
  });

  placeMidAdSlot();
  initSentencesFromDom();
  currentIndex = 0;
}

function wireEvents() {
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', toggleTheme);
  }

  wireSidebarEvents();

  if (elements.shuffleBtn) {
    elements.shuffleBtn.addEventListener('click', shuffleSentences);
  }

  if (elements.accentToggle) {
    elements.accentToggle.addEventListener('click', toggleAccent);
  }

  if (elements.listenAllBtn) {
    elements.listenAllBtn.addEventListener('click', () => {
      if (!currentContext) return;
      autoplay = !autoplay;
      if (autoplay) {
        elements.listenAllBtn.textContent = 'Parar autoplay';
        setPlayingSentenceIndex(currentIndex);
        speakCurrentSentence(currentRate);
      } else {
        elements.listenAllBtn.textContent = 'Ouvir todos';
        window.speechSynthesis.cancel();
        clearPlayingSentenceIndex();
      }
      updateListenAllState();
    });
  }

  if (elements.speedSelect) {
    elements.speedSelect.addEventListener('change', (e) => {
      const value = parseFloat(e.target.value);
      if (!Number.isNaN(value) && value > 0) {
        currentRate = value;
        localStorage.setItem(SPEED_KEY, String(value));

        if (autoplay && speechSynthesisSupported && currentContext && currentContext.sentences.length) {
          window.speechSynthesis.cancel();
          speakCurrentSentence(currentRate);
        }
      }
    });
  }

  if (elements.sentencesList) {
    elements.sentencesList.addEventListener('click', (e) => {
      const playBtn = e.target.closest('.btn-play-sentence');
      if (playBtn && playBtn.dataset.index !== undefined) {
        const idx = parseInt(playBtn.dataset.index, 10);
        if (!Number.isNaN(idx) && currentContext && currentContext.sentences[idx]) {
          if (autoplay) {
            autoplay = false;
            window.speechSynthesis.cancel();
            if (elements.listenAllBtn) elements.listenAllBtn.textContent = 'Ouvir todos';
            updateListenAllState();
          }
          const part = playBtn.dataset.part;
          setPlayingSentenceIndex(idx);
          speakSentencePartAtIndex(idx, part, currentRate);
        }
        return;
      }
      const micBtn = e.target.closest('.btn-mic');
      if (micBtn && micBtn.dataset.index !== undefined && micBtn.dataset.part) {
        const idx = parseInt(micBtn.dataset.index, 10);
        const part = micBtn.dataset.part;
        if (!Number.isNaN(idx) && (part === 'question' || part === 'answer')) {
          handlePronunciationCheck(idx, part);
        }
      }
    });
  }
}

function isSidebarOpen() {
  return !!(elements.contextSidebar && elements.contextSidebar.classList.contains('context-sidebar--open'));
}

function openSidebar() {
  if (!elements.contextSidebar) return;
  elements.contextSidebar.classList.add('context-sidebar--open');
  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.classList.remove('hidden');
    elements.sidebarBackdrop.setAttribute('aria-hidden', 'false');
  }
  if (elements.sidebarToggle) {
    elements.sidebarToggle.setAttribute('aria-expanded', 'true');
  }
  if (elements.sidebarClose) {
    elements.sidebarClose.focus();
  }
  document.body.classList.add('sidebar-open');
}

function closeSidebar() {
  if (!elements.contextSidebar) return;
  elements.contextSidebar.classList.remove('context-sidebar--open');
  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.classList.add('hidden');
    elements.sidebarBackdrop.setAttribute('aria-hidden', 'true');
  }
  if (elements.sidebarToggle) {
    elements.sidebarToggle.setAttribute('aria-expanded', 'false');
    elements.sidebarToggle.focus();
  }
  document.body.classList.remove('sidebar-open');
}

function wireSidebarEvents() {
  if (!elements.sidebarToggle || !elements.contextSidebar) return;

  elements.sidebarToggle.addEventListener('click', () => {
    if (isSidebarOpen()) closeSidebar();
    else openSidebar();
  });

  if (elements.sidebarClose) {
    elements.sidebarClose.addEventListener('click', closeSidebar);
  }

  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.addEventListener('click', closeSidebar);
  }

  elements.contextSidebar.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('a.context-nav-link')) {
      closeSidebar();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!isSidebarOpen()) return;
    closeSidebar();
  });
}

function normalizeForComparison(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pronunciationSimilarity(s1, s2) {
  const a = normalizeForComparison(s1);
  const b = normalizeForComparison(s2);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aTokens = a.split(' ');
  const bTokens = b.split(' ');
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);

  let commonWords = 0;
  aSet.forEach((w) => {
    if (bSet.has(w)) commonWords++;
  });
  const wordSim = (2 * commonWords) / (aSet.size + bSet.size || 1);

  function bigrams(str) {
    const res = [];
    for (let i = 0; i < str.length - 1; i++) {
      res.push(str.slice(i, i + 2));
    }
    return res;
  }

  const aBi = bigrams(a);
  const bBi = bigrams(b);
  const aBiCounts = new Map();
  aBi.forEach((bg) => aBiCounts.set(bg, (aBiCounts.get(bg) || 0) + 1));
  let commonBi = 0;
  bBi.forEach((bg) => {
    const count = aBiCounts.get(bg);
    if (count && count > 0) {
      commonBi++;
      aBiCounts.set(bg, count - 1);
    }
  });
  const charSim = (2 * commonBi) / (aBi.length + bBi.length || 1);

  return 0.6 * wordSim + 0.4 * charSim;
}

function showSpeechFeedWarn(message) {
  const toast = elements.speechWarnToast;
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add('speech-warn-toast--visible');

  if (speechWarnHideTimeout) {
    clearTimeout(speechWarnHideTimeout);
  }

  speechWarnHideTimeout = setTimeout(() => {
    toast.classList.remove('speech-warn-toast--visible');
    speechWarnHideTimeout = null;
  }, 3000);
}

function handlePronunciationCheck(sentenceIndex, part) {
  if (!speechRecognitionSupported) {
    showSpeechFeedWarn('Seu navegador não suporta captura de voz.');
    return;
  }
  if (!currentContext || !currentContext.sentences[sentenceIndex]) return;

  const sentence = currentContext.sentences[sentenceIndex];
  const expectedText = part === 'question' ? (sentence.QE || '') : (sentence.AE || '');
  const normalizedExpected = normalizeForComparison(expectedText);
  if (!normalizedExpected) {
    showSpeechFeedWarn('Não há texto em inglês para comparar.');
    return;
  }

  const lineEl =
    elements.sentencesList &&
    elements.sentencesList.querySelector(
      `.sentence-item[data-sentence-index="${sentenceIndex}"] .sentence-line[data-part="${part}"]`
    );
  const row = lineEl && lineEl.closest('.sentence-item');
  const activeBtn = row && row.querySelector(`.btn-mic[data-part="${part}"]`);
  const scoreElement = row && row.querySelector(`.sentence-line[data-part="${part}"] .speech-score`);

  const stopRecordingVisual = () => {
    if (activeBtn) {
      activeBtn.classList.remove('btn-mic--recording');
      activeBtn.disabled = false;
    }
  };

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    showSpeechFeedWarn('Seu navegador não suporta captura de voz.');
    return;
  }

  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  if (activeBtn) {
    activeBtn.classList.add('btn-mic--recording');
    activeBtn.disabled = true;
  }

  recognition.onresult = (event) => {
    try {
      const transcript = event.results[0][0].transcript || '';
      const score = pronunciationSimilarity(normalizedExpected, transcript);
      const reduction = Math.random() * 4 + 2;
      const reducedScore = Math.max(0, score * 100 - reduction);
      const percent = Math.round(reducedScore);
      const isGood = score >= 0.9;

      if (scoreElement) {
        scoreElement.textContent = `${percent}%`;
        scoreElement.classList.remove('speech-score--good', 'speech-score--bad', 'hidden');
        scoreElement.classList.add(isGood ? 'speech-score--good' : 'speech-score--bad');
        setTimeout(() => {
          scoreElement.textContent = '';
          scoreElement.classList.add('hidden');
        }, 4000);
      }
    } catch {}
    stopRecordingVisual();
  };

  recognition.onerror = () => {
    showSpeechFeedWarn('Não foi possível capturar o áudio. Tente novamente.');
    stopRecordingVisual();
  };

  recognition.onend = () => {
    stopRecordingVisual();
  };

  recognition.start();
}

function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const isDark = saved === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  updateThemeIcons(isDark);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const isDark = current !== 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
  if (elements.themeIconSun) elements.themeIconSun.classList.toggle('hidden', isDark);
  if (elements.themeIconMoon) elements.themeIconMoon.classList.toggle('hidden', !isDark);
}

function updateListenAllState() {
  if (!elements.listenAllBtn) return;
  const hasSentences = currentContext && currentContext.sentences.length > 0;
  elements.listenAllBtn.disabled = !hasSentences || !speechSynthesisSupported;
}

function setPlayingSentenceIndex(index) {
  if (!elements.sentencesList) return;
  elements.sentencesList
    .querySelectorAll('.sentence-item--playing')
    .forEach((el) => el.classList.remove('sentence-item--playing'));
  const item = document.getElementById('sentence-item-' + index);
  if (item) item.classList.add('sentence-item--playing');
}

function clearPlayingSentenceIndex() {
  if (!elements.sentencesList) return;
  elements.sentencesList
    .querySelectorAll('.sentence-item--playing')
    .forEach((el) => el.classList.remove('sentence-item--playing'));
}

function refreshVoices() {
  cachedVoices = window.speechSynthesis.getVoices();
  genderVoicePools = {};
}

function updateAccentButton() {
  if (!elements.accentToggle) return;
  const isUS = currentAccent === 'en-US';
  elements.accentToggle.textContent = isUS ? '🇺🇸 EUA' : '🇬🇧 UK';
  elements.accentToggle.setAttribute(
    'aria-label',
    isUS
      ? 'Sotaque: inglês americano. Clique para inglês britânico.'
      : 'Sotaque: inglês britânico. Clique para inglês americano.'
  );
  elements.accentToggle.title = isUS ? 'Inglês americano (clique para britânico)' : 'Inglês britânico (clique para americano)';
}

function toggleAccent() {
  currentAccent = currentAccent === 'en-US' ? 'en-GB' : 'en-US';
  localStorage.setItem(ACCENT_KEY, currentAccent);
  updateAccentButton();
  genderVoicePools = {};

  if (autoplay && speechSynthesisSupported && currentContext && currentContext.sentences.length) {
    window.speechSynthesis.cancel();
    speakCurrentSentence(currentRate);
  }
}

const FEMALE_VOICE_HINTS = [
  'female', 'woman', 'girl', 'zira', 'samantha', 'karen', 'victoria', 'moira',
  'tessa', 'fiona', 'kate', 'alice', 'linda', 'susan', 'hazel', 'serena', 'jenny',
  'aria', 'sara', 'emma', 'michelle', 'joanna', 'ivy', 'kimberly', 'nicole', 'olivia',
];

const MALE_VOICE_HINTS = [
  'male', 'man', 'boy', 'david', 'daniel', 'alex', 'mark', 'ralph', 'bruce', 'fred',
  'paul', 'george', 'nick', 'james', 'tom', 'aaron', 'guy', 'ryan', 'christopher',
  'matthew', 'joey', 'justin', 'kevin', 'michael', 'stephen', 'thomas', 'brian',
];

let genderVoicePools = {};

function normalizeGender(value, fallback) {
  const g = String(value || fallback).trim().toUpperCase();
  return g === 'M' || g === 'F' ? g : fallback;
}

function getVoiceList() {
  return cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
}

function getVoicesForAccent(accent = currentAccent) {
  const voices = getVoiceList();
  if (!voices.length) return [];

  const isUS = accent === 'en-US';
  const includeLang = isUS ? 'en-us' : 'en-gb';
  const includeNameHints = isUS
    ? ['us english', 'american', 'united states']
    : ['uk english', 'british', 'england', 'united kingdom'];
  const excludeLang = isUS ? 'en-gb' : 'en-us';
  const excludeNameHints = isUS
    ? ['uk english', 'british', 'england']
    : ['us english', 'american'];

  function isExcluded(voice) {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();
    if (lang.startsWith(excludeLang)) return true;
    return excludeNameHints.some((hint) => name.includes(hint));
  }

  const matched = voices.filter((voice) => {
    if (isExcluded(voice)) return false;
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();
    if (lang.startsWith(includeLang)) return true;
    return includeNameHints.some((hint) => name.includes(hint));
  });

  if (matched.length) return matched;

  const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  return englishVoices.length ? englishVoices : voices;
}

function voiceMatchesHints(voice, hints) {
  const name = voice.name.toLowerCase();
  return hints.some((hint) => name.includes(hint));
}

function isFemaleVoice(voice) {
  return voiceMatchesHints(voice, FEMALE_VOICE_HINTS);
}

function isMaleVoice(voice) {
  return voiceMatchesHints(voice, MALE_VOICE_HINTS);
}

function buildGenderVoicePool(accent = currentAccent) {
  const pool = getVoicesForAccent(accent);
  if (!pool.length) {
    genderVoicePools[accent] = { female: null, male: null };
    return genderVoicePools[accent];
  }

  let female = pool.find((v) => isFemaleVoice(v) && !isMaleVoice(v)) || pool.find(isFemaleVoice) || null;
  let male = pool.find((v) => isMaleVoice(v) && !isFemaleVoice(v)) || pool.find(isMaleVoice) || null;

  if (!male) {
    male =
      pool.find((v) => !isFemaleVoice(v) && (!female || v.name !== female.name)) ||
      pool.find((v) => !female || v.name !== female.name) ||
      pool[0];
  }
  if (!female) {
    female =
      pool.find((v) => !isMaleVoice(v) && (!male || v.name !== male.name)) ||
      pool.find((v) => !male || v.name !== male.name) ||
      pool[0];
  }

  if (male && female && male.name === female.name && pool.length > 1) {
    male = pool.find((v) => v.name !== female.name) || male;
  }

  genderVoicePools[accent] = { female, male };
  return genderVoicePools[accent];
}

function ensureGenderVoicePool() {
  if (!genderVoicePools[currentAccent] || !getVoiceList().length) {
    return buildGenderVoicePool(currentAccent);
  }
  return genderVoicePools[currentAccent];
}

function getVoiceForGender(genderCode) {
  const gender = normalizeGender(genderCode, 'F');
  const pool = ensureGenderVoicePool();
  // F → female voice, M → male voice
  return gender === 'M' ? pool.male : pool.female;
}

function configureUtteranceGender(utterance, genderCode) {
  const gender = normalizeGender(genderCode, 'F');
  const voice = getVoiceForGender(gender);

  if (voice) {
    utterance.voice = voice;
  }

  utterance.lang = currentAccent;

  const pool = ensureGenderVoicePool();
  if (pool.female && pool.male && pool.female.name === pool.male.name) {
    utterance.pitch = gender === 'M' ? 0.75 : 1.15;
  } else if (gender === 'M') {
    utterance.pitch = 0.9;
  } else {
    utterance.pitch = 1.05;
  }
}

function speakCurrentSentence(rate) {
  if (!speechSynthesisSupported || !currentContext || !currentContext.sentences.length) return;

  if (!cachedVoices.length) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
      refreshVoices();
      doSpeakCurrentSentence(rate);
    };
    refreshVoices();
    if (cachedVoices.length) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
      doSpeakCurrentSentence(rate);
    }
    return;
  }

  doSpeakCurrentSentence(rate);
}

function speakSentencePartAtIndex(index, part, rate) {
  if (!speechSynthesisSupported || !currentContext || !currentContext.sentences[index]) return;
  const sentence = currentContext.sentences[index];
  const text = part === 'question' ? sentence.QE || '' : sentence.AE || '';
  if (!text) return;
  if (!cachedVoices.length) {
    refreshVoices();
    if (!cachedVoices.length) {
      window.speechSynthesis.onvoiceschanged = () => {
        refreshVoices();
        doSpeakSentencePartAtIndex(index, part, rate);
      };
      return;
    }
  }
  doSpeakSentencePartAtIndex(index, part, rate);
}

function doSpeakSentencePartAtIndex(index, part, rate) {
  if (!currentContext || !currentContext.sentences[index]) return;
  window.speechSynthesis.cancel();
  const sentence = currentContext.sentences[index];
  const isQuestion = part === 'question';
  const text = isQuestion ? sentence.QE || '' : sentence.AE || '';
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  configureUtteranceGender(utterance, getSentenceGender(index, part));
  utterance.rate = rate;
  utterance.onend = () => {
    if (!autoplay) {
      clearPlayingSentenceIndex();
    }
  };
  window.speechSynthesis.speak(utterance);
}

function doSpeakCurrentSentence(rate) {
  if (!currentContext || !currentContext.sentences.length) return;

  window.speechSynthesis.cancel();

  const sentence = currentContext.sentences[currentIndex];
  const questionText = sentence.QE || '';
  const answerText = sentence.AE || '';
  if (!questionText && !answerText) return;

  function speakAnswer() {
    if (!answerText) {
      onBothEnded();
      return;
    }
    const answerUtterance = new SpeechSynthesisUtterance(answerText);
    configureUtteranceGender(answerUtterance, getSentenceGender(currentIndex, 'answer'));
    answerUtterance.rate = rate;
    answerUtterance.onend = onBothEnded;
    window.speechSynthesis.speak(answerUtterance);
  }

  function onBothEnded() {
    updateListenAllState();
    if (!autoplay) {
      clearPlayingSentenceIndex();
      return;
    }
    if (!currentContext) return;
    if (currentIndex < currentContext.sentences.length - 1) {
      setTimeout(() => {
        if (!autoplay || !currentContext) return;
        currentIndex += 1;
        setPlayingSentenceIndex(currentIndex);
        speakCurrentSentence(rate);
      }, 2000);
    } else {
      autoplay = false;
      if (elements.listenAllBtn) elements.listenAllBtn.textContent = 'Ouvir todos';
      updateListenAllState();
      clearPlayingSentenceIndex();
    }
  }

  if (questionText) {
    const questionUtterance = new SpeechSynthesisUtterance(questionText);
    configureUtteranceGender(questionUtterance, getSentenceGender(currentIndex, 'question'));
    questionUtterance.rate = rate;
    questionUtterance.onend = () => {
      setTimeout(() => {
        speakAnswer();
      }, 1000);
    };
    window.speechSynthesis.speak(questionUtterance);
  } else {
    speakAnswer();
  }
}

document.addEventListener('DOMContentLoaded', init);
