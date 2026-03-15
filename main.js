const contextsConfig = [
  { id: 'greetings', displayName: 'Saudações' },
  { id: 'ask-things', displayName: 'Perguntar coisas' },
  { id: 'training-sentences', displayName: 'Frases de treino' },
  { id: 'present-perfect', displayName: 'Present perfect' },
  { id: 'daily-routines', displayName: 'Rotinas diárias' },
  { id: 'cooking', displayName: 'Culinária' },
  { id: 'at-job-sentences', displayName: 'No trabalho' },
  { id: 'daily-standup-meeting', displayName: 'Reunião diária' },
  { id: 'giving-advice', displayName: 'Dando conselhos' },
  { id: 'wishes-and-desires', displayName: 'Desejos e vontades' },
  { id: 'conditions', displayName: 'Condicionais' },
  { id: 'talking-about-he-and-she', displayName: 'Falando sobre ele e ela' },
  { id: 'talking-about-feelings', displayName: 'Falando sobre sentimentos' },
  { id: 'talking-about-places', displayName: 'Falando sobre lugares' },
  { id: 'toddler-routines', displayName: 'Rotina de crianças' },
  { id: 'shopping-at-supermarket', displayName: 'Compras no supermercado' },
  { id: 'past-experiences', displayName: 'Experiências passadas' },
  { id: 'bad-news', displayName: 'Más notícias' },
  { id: 'perform-presentation', displayName: 'Apresentação' },
  { id: 'ordering-food-restaurant', displayName: 'Pedido em restaurante' },
  { id: 'talking-about-weather', displayName: 'Falando sobre o tempo' },
  { id: 'morning-routines', displayName: 'Rotinas da manhã' },
  { id: 'night-routines', displayName: 'Rotinas da noite' },
  { id: 'travel-and-vacations', displayName: 'Viagens e férias' },
  { id: 'asking-help-at-work', displayName: 'Pedindo ajuda no trabalho' },
  { id: 'giving-status-updates', displayName: 'Atualizações de status' },
  { id: 'project-discussions', displayName: 'Discussão de projetos' },
  { id: 'problem-solving-at-work', displayName: 'Resolvendo problemas no trabalho' },
  { id: 'talking-about-deadlines', displayName: 'Falando sobre prazos' },
  { id: 'email-communication', displayName: 'Comunicação por e-mail' },
  { id: 'introducing-yourself', displayName: 'Apresentando-se' },
  { id: 'talking-about-hobbies', displayName: 'Falando sobre hobbies' },
  { id: 'talking-about-family', displayName: 'Falando sobre família' },
  { id: 'talking-about-friends', displayName: 'Falando sobre amigos' },
  { id: 'making-invitations', displayName: 'Fazendo convites' },
  { id: 'accepting-refusing-invitations', displayName: 'Aceitar ou recusar convites' },
  { id: 'asking-for-directions', displayName: 'Pedindo direções' },
  { id: 'at-the-doctor', displayName: 'No médico' },
  { id: 'at-the-pharmacy', displayName: 'Na farmácia' },
  { id: 'agreeing-and-disagreeing', displayName: 'Concordando e discordando' },
  { id: 'apologizing', displayName: 'Pedindo desculpas' },
  { id: 'house-chores', displayName: 'Tarefas domésticas' },
  { id: 'software-development-conversations', displayName: 'Conversas de desenvolvimento' },
  { id: 'training-verbs', displayName: 'Treinando verbos' },
];

/** Cache: context id -> loaded context data (so we don't re-fetch) */
const contextDataCache = {};

/** Load context data: from cache or fetch JSON when the context is selected. */
async function fetchContextData(id) {
  if (contextDataCache[id]) return contextDataCache[id];
  const url = `./context/${id}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load context: ${res.status}`);
  const data = await res.json();
  contextDataCache[id] = data;
  return data;
}

let currentContext = null;
let currentIndex = 0;
let autoplay = false;
let isPlayingSingle = false;
let currentRate = 0.8;
let speechSynthesisSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let speechRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
let cachedVoices = [];
let speechWarnHideTimeout = null;

const elements = {
  contextSelect: document.getElementById('contextSelect'),
  contextLoadProgress: document.getElementById('contextLoadProgress'),
  sentencesList: document.getElementById('sentencesList'),
  listenAllBtn: document.getElementById('listenAllBtn'),
  speedSelect: document.getElementById('speedSelect'),
  themeToggle: document.getElementById('themeToggle'),
  themeIconSun: document.querySelector('.theme-icon-sun'),
  themeIconMoon: document.querySelector('.theme-icon-moon'),
  trainerView: document.getElementById('trainer-view'),
  policyMenuToggle: document.getElementById('policyMenuToggle'),
  policyMenuModal: document.getElementById('policyMenuModal'),
  policyMenuBackdrop: document.getElementById('policyMenuBackdrop'),
  policyMenuClose: document.getElementById('policyMenuClose'),
  speechWarnToast: document.getElementById('speechWarnToast'),
};

const THEME_KEY = 'english-trainer-theme';
const CONTEXT_KEY = 'english-trainer-last-context';
const SPEED_KEY = 'english-trainer-last-speed';

function renderRoute() {
  if (elements.trainerView) elements.trainerView.classList.remove('hidden');
  document.title = 'English Trainer — English Trainer';
}

function init() {
  applySavedTheme();
  renderRoute();

  populateContextSelect();
  wireEvents();

  // Select last used context (if available) or default to 'Greetings'
  const savedContextId = localStorage.getItem(CONTEXT_KEY);
  let initialContextConfig =
    contextsConfig.find((c) => c.id === savedContextId) || contextsConfig[0];

  if (elements.contextSelect && initialContextConfig) {
    elements.contextSelect.value = initialContextConfig.id;
  }

  // Apply last used speed (if available)
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

  loadContext(initialContextConfig).then(() => {
    updateListenAllState();
  });

  if (!speechSynthesisSupported) {
    if (elements.listenAllBtn) elements.listenAllBtn.disabled = true;
  } else {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
}

function populateContextSelect() {
  contextsConfig.forEach((ctx) => {
    const option = document.createElement('option');
    option.value = ctx.id;
    option.textContent = ctx.displayName;
    elements.contextSelect.appendChild(option);
  });
}

function wireEvents() {
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', toggleTheme);
  }

  wirePolicyMenuEvents();

  elements.contextSelect.addEventListener('change', async (e) => {
    const selectedId = e.target.value;
    const config = contextsConfig.find((c) => c.id === selectedId);
    if (!config) return;
    localStorage.setItem(CONTEXT_KEY, selectedId);
    autoplay = false;
    isPlayingSingle = false;
    if (elements.listenAllBtn) elements.listenAllBtn.textContent = 'Ouvir todos';
    updateListenAllState();

    await loadContext(config);
  });

  if (elements.listenAllBtn) {
    elements.listenAllBtn.addEventListener('click', () => {
    if (!currentContext) return;
    autoplay = !autoplay;
    isPlayingSingle = false;
    if (autoplay) {
      elements.listenAllBtn.textContent = 'Parar autoplay';
      speakCurrentSentence(currentRate);
    } else {
      elements.listenAllBtn.textContent = 'Ouvir todos';
      window.speechSynthesis.cancel();
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

        // If autoplay is currently running, restart the current sentence
        // so playback continues immediately at the newly selected speed.
        if (autoplay && speechSynthesisSupported && currentContext && currentContext.sentences.length) {
          window.speechSynthesis.cancel();
          speakCurrentSentence(currentRate);
        }
      }
    });
  }

  // Delegated: play one sentence
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
          if (part === 'question' || part === 'answer') {
            speakSentencePartAtIndex(idx, part, currentRate);
          } else {
            speakSentenceAtIndex(idx, currentRate);
          }
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

function isPolicyMenuOpen() {
  return !!(elements.policyMenuModal && !elements.policyMenuModal.classList.contains('hidden'));
}

function openPolicyMenu() {
  if (!elements.policyMenuModal) return;
  elements.policyMenuModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (elements.policyMenuClose) {
    elements.policyMenuClose.focus();
  }
}

function closePolicyMenu() {
  if (!elements.policyMenuModal) return;
  elements.policyMenuModal.classList.add('hidden');
  document.body.style.overflow = '';
  if (elements.policyMenuToggle) {
    elements.policyMenuToggle.focus();
  }
}

function wirePolicyMenuEvents() {
  if (!elements.policyMenuToggle || !elements.policyMenuModal) return;

  elements.policyMenuToggle.addEventListener('click', () => {
    if (isPolicyMenuOpen()) closePolicyMenu();
    else openPolicyMenu();
  });

  if (elements.policyMenuBackdrop) {
    elements.policyMenuBackdrop.addEventListener('click', closePolicyMenu);
  }

  if (elements.policyMenuClose) {
    elements.policyMenuClose.addEventListener('click', closePolicyMenu);
  }

  elements.policyMenuModal.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('a.policy-menu-link')) {
      closePolicyMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!isPolicyMenuOpen()) return;
    closePolicyMenu();
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

function jaroSimilarity(s1, s2) {
  const a = normalizeForComparison(s1);
  const b = normalizeForComparison(s2);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const maxDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) {
      k++;
    }
    if (a[i] !== b[k]) {
      t++;
    }
    k++;
  }

  const transpositions = t / 2;
  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions) / matches) /
    3;
  return jaro;
}

function showSpeechFeedWarn(message) {
  const toast = elements.speechWarnToast;
  if (!toast) {
    // Fallback if element is missing
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

  const lineEl = elements.sentencesList && elements.sentencesList.querySelector(`.sentence-item[data-sentence-index="${sentenceIndex}"] .sentence-line[data-part="${part}"]`);
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
      const score = jaroSimilarity(normalizedExpected, transcript);
      const reduction = (Math.random() * 4 + 2);
      const reducedScore = Math.max(0, (score * 100) - reduction);
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

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Show or hide the context loading progress indicator. */
function showContextLoadProgress(show) {
  if (!elements.contextLoadProgress) return;
  elements.contextLoadProgress.classList.toggle('hidden', !show);
  elements.contextLoadProgress.setAttribute('aria-hidden', show ? 'false' : 'true');
  if (elements.contextSelect) {
    elements.contextSelect.disabled = !!show;
  }
}

async function loadContext(config) {
  showContextLoadProgress(true);
  removeSentencesListError();
  let data;
  try {
    data = await fetchContextData(config.id);
  } catch (err) {
    console.error(err);
    showContextLoadProgress(false);
    showSentencesListError('Erro ao carregar contexto.');
    if (elements.listenAllBtn) elements.listenAllBtn.disabled = true;
    return;
  }
  showContextLoadProgress(false);
  if (!data || !Array.isArray(data.sentences)) {
    showSentencesListError('Dados inválidos.');
    if (elements.listenAllBtn) elements.listenAllBtn.disabled = true;
    return;
  }

  const shuffledSentences = shuffleArray(data.sentences);
  currentContext = { ...data, sentences: shuffledSentences };
  currentIndex = 0;

  fillSentenceItems();

  const hasSentences = currentContext.sentences.length > 0;
  if (elements.listenAllBtn) {
    elements.listenAllBtn.disabled = !hasSentences || !speechSynthesisSupported;
  }
  updateListenAllState();
}

function showSentencesListError(message) {
  if (!elements.sentencesList) return;
  removeSentencesListError();
  const p = document.createElement('p');
  p.className = 'sentences-error';
  p.textContent = message;
  elements.sentencesList.insertBefore(p, elements.sentencesList.firstChild);
}

function removeSentencesListError() {
  if (!elements.sentencesList) return;
  const err = elements.sentencesList.querySelector('.sentences-error');
  if (err) err.remove();
}

const MIC_ICON_URL = './img/mic-icon.png';

const SENTENCE_SLOTS_COUNT = 50;

/** Ensure sentencesList has 50 sentence-item slots (created on first load). */
function ensureSentenceListSlots() {
  if (!elements.sentencesList) return;
  for (let i = 0; i < SENTENCE_SLOTS_COUNT; i++) {
    if (document.getElementById('sentence-item-' + i)) continue;
    const article = document.createElement('article');
    article.id = 'sentence-item-' + i;
    article.className = 'sentence-item';
    article.dataset.sentenceIndex = String(i);
    const actions = document.createElement('div');
    actions.className = 'sentence-item-actions';
    const content = document.createElement('div');
    content.className = 'sentence-item-content';
    article.appendChild(actions);
    article.appendChild(content);
    elements.sentencesList.appendChild(article);
  }
}

/** Ensure sentence-item-actions has two play buttons: question (English) first, then answer (English). */
const PLAY_ICON = '▶';
function ensureActionsHasPlayButtons(item, sentenceIndex) {
  const actions = item.querySelector('.sentence-item-actions');
  if (!actions) return;
  actions.querySelectorAll('.btn-play-sentence').forEach((b) => b.remove());
  const labels = { question: 'Play question', answer: 'Play' };
  ['question', 'answer'].forEach((part) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-play-sentence';
    btn.dataset.index = String(sentenceIndex);
    btn.dataset.part = part;
    btn.title = labels[part];
    btn.setAttribute('aria-label', labels[part]);
    btn.textContent = PLAY_ICON;
    actions.appendChild(btn);
  });
}

/** Ensure one sentence-item has both question and answer blocks; create missing block. */
function ensureSentenceItemHasBothBlocks(item, sentenceIndex) {
  const content = item.querySelector('.sentence-item-content');
  if (!content) return;
  const hasQuestion = content.querySelector('.sentence-question');
  const hasAnswer = content.querySelector('.sentence-answer');
  if (hasQuestion && hasAnswer) return;

  function makeBlock(part) {
    const block = document.createElement('div');
    block.className = part === 'question' ? 'sentence-question' : 'sentence-answer';
    const line = document.createElement('div');
    line.className = 'sentence-line sentence-line--english';
    line.dataset.part = part;
    const en = document.createElement('p');
    en.className = 'sentence-text';
    const mic = document.createElement('button');
    mic.type = 'button';
    mic.className = 'btn-mic';
    mic.dataset.index = String(sentenceIndex);
    mic.dataset.part = part;
    mic.title = part === 'question' ? 'Fale esta pergunta em inglês' : 'Fale esta resposta em inglês';
    mic.innerHTML = '<img src="' + MIC_ICON_URL + '" alt="Microfone" />';
    const score = document.createElement('span');
    score.className = 'speech-score hidden';
    line.appendChild(en);
    line.appendChild(mic);
    line.appendChild(score);
    const pt = document.createElement('p');
    pt.className = 'sentence-text sentence-text--pt';
    block.appendChild(line);
    block.appendChild(pt);
    return block;
  }

  if (!hasQuestion) {
    const qBlock = makeBlock('question');
    content.insertBefore(qBlock, content.firstChild);
  }
  if (!hasAnswer) {
    const aBlock = makeBlock('answer');
    content.appendChild(aBlock);
  }
}

/** Update the sentence-item slots from currentContext (shuffled). One phrase per item, both question and answer shown. */
function fillSentenceItems() {
  if (!elements.sentencesList || !currentContext || !currentContext.sentences.length) return;
  ensureSentenceListSlots();
  removeSentencesListError();
  const sentences = currentContext.sentences;
  const phraseCount = Math.min(SENTENCE_SLOTS_COUNT, sentences.length);
  const micTitleQuestion = 'Fale esta pergunta em inglês';
  const micTitleAnswer = 'Fale esta resposta em inglês';

  for (let slotIndex = 0; slotIndex < SENTENCE_SLOTS_COUNT; slotIndex++) {
    const item = document.getElementById('sentence-item-' + slotIndex);
    if (!item) continue;

    if (slotIndex >= phraseCount) {
      item.classList.add('sentence-item--hidden');
      continue;
    }
    item.classList.remove('sentence-item--hidden');

    const sentence = sentences[slotIndex];
    const sentenceIndex = slotIndex;
    item.dataset.sentenceIndex = String(sentenceIndex);

    ensureSentenceItemHasBothBlocks(item, sentenceIndex);

    const hasQuestion = !!(String(sentence.QE || '').trim() && String(sentence.QP || '').trim());
    ensureActionsHasPlayButtons(item, sentenceIndex);

    const actions = item.querySelector('.sentence-item-actions');
    if (actions) {
      const playBtns = actions.querySelectorAll('.btn-play-sentence');
      if (playBtns[0]) {
        playBtns[0].dataset.part = 'question';
        playBtns[0].classList.toggle('sentence-item__play--hidden', !hasQuestion);
      }
      if (playBtns[1]) {
        playBtns[1].dataset.part = 'answer';
      }
    }

    const content = item.querySelector('.sentence-item-content');
    if (!content) continue;

    const qBlock = content.querySelector('.sentence-question');
    if (qBlock) {
      qBlock.classList.toggle('sentence-item__question--hidden', !hasQuestion);
      const qLine = qBlock.querySelector('.sentence-line[data-part="question"]');
      if (qLine) {
        const enEl = qLine.querySelector('.sentence-text:not(.sentence-text--pt)');
        if (enEl) enEl.textContent = sentence.QE || '—';
        const mic = qLine.querySelector('.btn-mic');
        if (mic) {
          mic.dataset.index = String(sentenceIndex);
          mic.dataset.part = 'question';
          mic.title = micTitleQuestion;
        }
        const scoreEl = qLine.querySelector('.speech-score');
        if (scoreEl) {
          scoreEl.textContent = '';
          scoreEl.classList.add('hidden');
        }
      }
      const qPt = qBlock.querySelector('.sentence-text--pt');
      if (qPt) qPt.textContent = sentence.QP || '—';
    }

    const aBlock = content.querySelector('.sentence-answer');
    if (aBlock) {
      const aLine = aBlock.querySelector('.sentence-line[data-part="answer"]');
      if (aLine) {
        const enEl = aLine.querySelector('.sentence-text:not(.sentence-text--pt)');
        if (enEl) enEl.textContent = sentence.AE || '—';
        const mic = aLine.querySelector('.btn-mic');
        if (mic) {
          mic.dataset.index = String(sentenceIndex);
          mic.dataset.part = 'answer';
          mic.title = micTitleAnswer;
        }
        const scoreEl = aLine.querySelector('.speech-score');
        if (scoreEl) {
          scoreEl.textContent = '';
          scoreEl.classList.add('hidden');
        }
      }
      const aPt = aBlock.querySelector('.sentence-text--pt');
      if (aPt) aPt.textContent = sentence.AP || '—';
    }
  }
}

function updateListenAllState() {
  if (!elements.listenAllBtn) return;
  const hasSentences = currentContext && currentContext.sentences.length > 0;
  // Keep button enabled when autoplay is on so user can click "Parar autoplay" to stop
  elements.listenAllBtn.disabled = !hasSentences || !speechSynthesisSupported;
}

function refreshVoices() {
  cachedVoices = window.speechSynthesis.getVoices();
}

function pickVoice(langCode) {
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const primary = voices.find((v) => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
  if (primary) return primary;
  return voices[0];
}

function pickVoiceFemale(langCode) {
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const langLower = langCode.toLowerCase();
  const femaleHints = ['female', 'woman', 'zira', 'samantha', 'karen', 'victoria', 'moira', 'tessa', 'fiona', 'kate', 'alice', 'linda', 'susan'];
  const byLang = voices.filter((v) => v.lang.toLowerCase().startsWith(langLower));
  const female = (byLang.length ? byLang : voices).find((v) =>
    femaleHints.some((h) => v.name.toLowerCase().includes(h))
  );
  if (female) return female;
  return pickVoice(langCode);
}

function pickVoiceMale(langCode) {
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const langLower = langCode.toLowerCase();
  const maleHints = ['male', 'man', 'david', 'daniel', 'alex', 'mark', 'ralph', 'bruce', 'fred', 'paul', 'george', 'nick'];
  const byLang = voices.filter((v) => v.lang.toLowerCase().startsWith(langLower));
  const male = (byLang.length ? byLang : voices).find((v) =>
    maleHints.some((h) => v.name.toLowerCase().includes(h))
  );
  if (male) return male;
  return pickVoice(langCode);
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

/** Speak a single sentence by index (for per-row play button). Does not advance autoplay. */
function speakSentenceAtIndex(index, rate) {
  if (!speechSynthesisSupported || !currentContext || !currentContext.sentences[index]) return;

  if (!cachedVoices.length) {
    refreshVoices();
    if (cachedVoices.length) {
      doSpeakSentenceAtIndex(index, rate);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        refreshVoices();
        doSpeakSentenceAtIndex(index, rate);
      };
    }
    return;
  }
  doSpeakSentenceAtIndex(index, rate);
}

/** Speak only the question or only the answer for one sentence (one sentence per row). */
function speakSentencePartAtIndex(index, part, rate) {
  if (!speechSynthesisSupported || !currentContext || !currentContext.sentences[index]) return;
  const sentence = currentContext.sentences[index];
  const text = part === 'question' ? (sentence.QE || '') : (sentence.AE || '');
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
  const text = isQuestion ? (sentence.QE || '') : (sentence.AE || '');
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = isQuestion
    ? (sentence.QG === 'M' ? pickVoiceMale('en-US') : sentence.QG === 'F' ? pickVoiceFemale('en-US') : pickVoiceFemale('en-US'))
    : (sentence.AG === 'M' ? pickVoiceMale('en-US') : sentence.AG === 'F' ? pickVoiceFemale('en-US') : pickVoiceMale('en-US'));
  if (voice) utterance.voice = voice;
  utterance.lang = 'en-US';
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

function doSpeakSentenceAtIndex(index, rate) {
  if (!currentContext || !currentContext.sentences[index]) return;
  window.speechSynthesis.cancel();

  const sentence = currentContext.sentences[index];
  const questionText = sentence.QE || '';
  const answerText = sentence.AE || '';

  function speakAnswer() {
    if (!answerText) return;
    const answerUtterance = new SpeechSynthesisUtterance(answerText);
    let voice = sentence.AG === 'M' ? pickVoiceMale('en-US') : sentence.AG === 'F' ? pickVoiceFemale('en-US') : pickVoiceMale('en-US');
    if (voice) answerUtterance.voice = voice;
    answerUtterance.lang = 'en-US';
    answerUtterance.rate = rate;
    window.speechSynthesis.speak(answerUtterance);
  }

  if (questionText) {
    const questionUtterance = new SpeechSynthesisUtterance(questionText);
    let voice = sentence.QG === 'M' ? pickVoiceMale('en-US') : sentence.QG === 'F' ? pickVoiceFemale('en-US') : pickVoiceFemale('en-US');
    if (voice) questionUtterance.voice = voice;
    questionUtterance.lang = 'en-US';
    questionUtterance.rate = rate;
    questionUtterance.onend = () => {
      setTimeout(speakAnswer, 1000);
    };
    window.speechSynthesis.speak(questionUtterance);
  } else {
    speakAnswer();
  }
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
    let voice = null;
    if (sentence.AG === 'M') {
      voice = pickVoiceMale('en-US');
    } else if (sentence.AG === 'F') {
      voice = pickVoiceFemale('en-US');
    } else {
      voice = pickVoiceMale('en-US');
    }
    if (voice) answerUtterance.voice = voice;
    answerUtterance.lang = 'en-US';
    answerUtterance.rate = rate;
    answerUtterance.onend = onBothEnded;
    window.speechSynthesis.speak(answerUtterance);
  }

  function onBothEnded() {
    isPlayingSingle = false;
    updateListenAllState();
    if (!autoplay) return;
    if (!currentContext) return;
    if (currentIndex < currentContext.sentences.length - 1) {
      setTimeout(() => {
        if (!autoplay || !currentContext) return;
        currentIndex += 1;
        speakCurrentSentence(rate);
      }, 2000);
    } else {
      autoplay = false;
      if (elements.listenAllBtn) elements.listenAllBtn.textContent = 'Ouvir todos';
      updateListenAllState();
    }
  }

  if (questionText) {
    const questionUtterance = new SpeechSynthesisUtterance(questionText);
    let voice = null;
    if (sentence.QG === 'M') {
      voice = pickVoiceMale('en-US');
    } else if (sentence.QG === 'F') {
      voice = pickVoiceFemale('en-US');
    } else {
      voice = pickVoiceFemale('en-US');
    }
    if (voice) questionUtterance.voice = voice;
    questionUtterance.lang = 'en-US';
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
