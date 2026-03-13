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
  { id: 'god-jesus-bible', displayName: 'Deus, Jesus e Bíblia' },
  { id: 'bad-news', displayName: 'Más notícias' },
  { id: 'about-diseases', displayName: 'Sobre doenças' },
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
let audioContext = null;
let speechFeedbackTimeoutId = null;
let speechScoreHideTimeoutQuestion = null;
let speechScoreHideTimeoutAnswer = null;

const elements = {
  contextSelect: document.getElementById('contextSelect'),
  contextLoadProgress: document.getElementById('contextLoadProgress'),
  blockQuestion: document.getElementById('blockQuestion'),
  englishQuestion: document.getElementById('englishQuestion'),
  portugueseQuestion: document.getElementById('portugueseQuestion'),
  englishAnswer: document.getElementById('englishAnswer'),
  portugueseAnswer: document.getElementById('portugueseAnswer'),
  micQuestionBtn: document.getElementById('micQuestionBtn'),
  micAnswerBtn: document.getElementById('micAnswerBtn'),
  playNormalBtn: document.getElementById('playNormalBtn'),
  listenAllBtn: document.getElementById('listenAllBtn'),
  prevBtn: document.getElementById('prevBtn'),
  controlsBar: document.querySelector('.controls-bar'),
  nextBtn: document.getElementById('nextBtn'),
  speedSelect: document.getElementById('speedSelect'),
  progressText: document.getElementById('progressText'),
  progressFill: document.getElementById('progressFill'),
  themeToggle: document.getElementById('themeToggle'),
  themeIconSun: document.querySelector('.theme-icon-sun'),
  themeIconMoon: document.querySelector('.theme-icon-moon'),
  trainerView: document.getElementById('trainer-view'),
  speechFeedbackModal: document.getElementById('speechFeedbackModal'),
  speechFeedbackText: document.getElementById('speechFeedbackText'),
  speechScoreQuestion: document.getElementById('micQuestionScore'),
  speechScoreAnswer: document.getElementById('micAnswerScore'),
  policyMenuToggle: document.getElementById('policyMenuToggle'),
  policyMenuModal: document.getElementById('policyMenuModal'),
  policyMenuBackdrop: document.getElementById('policyMenuBackdrop'),
  policyMenuClose: document.getElementById('policyMenuClose'),
};

const THEME_KEY = 'english-trainer-theme';
const CONTEXT_KEY = 'english-trainer-last-context';
const SPEED_KEY = 'english-trainer-last-speed';

function smoothScrollToBottom(durationMs = 2000) {
  try {
    const startY = window.scrollY || window.pageYOffset || 0;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const targetY = Math.max(documentHeight - viewportHeight, 0);
    const distance = targetY - startY;
    if (distance === 0 || durationMs <= 0) {
      window.scrollTo(0, targetY);
      return;
    }

    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
      const currentY = startY + distance * eased + 100;
      window.scrollTo(0, currentY);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  } catch {
    window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight || 0);
  }
}

function getRoute() {
  const hash = (window.location.hash || '#/').slice(1);
  const path = (hash.startsWith('/') ? hash.slice(1) : hash).split('?')[0].toLowerCase() || '';
  return path === '' ? 'home' : path;
}

function renderRoute() {
  // With static pages removed, always show the main trainer view.
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
    updateControlBarState();
    smoothScrollToBottom(1000);
  });

  if (!speechSynthesisSupported) {
    elements.playNormalBtn.disabled = true;
    elements.listenAllBtn.disabled = true;
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
    elements.listenAllBtn.textContent = 'Ouvir todos';
    updateControlBarState();

    await loadContext(config);
    smoothScrollToBottom(1000);
  });

  elements.playNormalBtn.addEventListener('click', () => {
    isPlayingSingle = true;
    updateControlBarState();
    speakCurrentSentence(currentRate);
  });

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
    updateControlBarState();
  });

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

  elements.prevBtn.addEventListener('click', () => {
    if (!currentContext) return;
    if (currentIndex > 0) {
      currentIndex -= 1;
      updateSentenceView();
    }
  });

  elements.nextBtn.addEventListener('click', () => {
    if (!currentContext) return;
    if (currentIndex < currentContext.sentences.length - 1) {
      currentIndex += 1;
      updateSentenceView();
    }
  });

  if (elements.micQuestionBtn) {
    elements.micQuestionBtn.addEventListener('click', () => {
      handlePronunciationCheck('question');
    });
  }

  if (elements.micAnswerBtn) {
    elements.micAnswerBtn.addEventListener('click', () => {
      handlePronunciationCheck('answer');
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

function showSpeechFeedback(message, isGood) {
  // Modal feedback has been disabled in favor of inline percentage near the mic buttons.
  // Keep this function as a no-op for compatibility with existing calls.
  void message;
  void isGood;
}

function handlePronunciationCheck(target) {
  if (!speechRecognitionSupported) {
    showSpeechFeedback('Seu navegador não suporta captura de voz.', false);
    return;
  }

  const activeBtn =
    target === 'question' ? elements.micQuestionBtn : elements.micAnswerBtn;
  const stopRecordingVisual = () => {
    if (!activeBtn) return;
    activeBtn.classList.remove('btn-mic--recording');
    const hasSentences = currentContext && currentContext.sentences.length > 0;
    activeBtn.disabled = !hasSentences;
  };

  const expectedText =
    target === 'question'
      ? elements.englishQuestion && elements.englishQuestion.textContent
      : elements.englishAnswer && elements.englishAnswer.textContent;

  const normalizedExpected = normalizeForComparison(expectedText || '');
  if (!normalizedExpected) {
    showSpeechFeedback('Não há texto em inglês para comparar.', false);
    return;
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    showSpeechFeedback('Seu navegador não suporta captura de voz.', false);
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

      const percent = Math.round(score * 100);
      const isGood = score >= 0.9;

      const scoreElement =
        target === 'question' ? elements.speechScoreQuestion : elements.speechScoreAnswer;
      if (scoreElement) {
        scoreElement.textContent = `${percent}%`;
        scoreElement.classList.remove('speech-score--good', 'speech-score--bad', 'hidden');
        scoreElement.classList.add(isGood ? 'speech-score--good' : 'speech-score--bad');

        if (target === 'question' && speechScoreHideTimeoutQuestion) {
          clearTimeout(speechScoreHideTimeoutQuestion);
        }
        if (target === 'answer' && speechScoreHideTimeoutAnswer) {
          clearTimeout(speechScoreHideTimeoutAnswer);
        }

        const timeoutId = setTimeout(() => {
          scoreElement.textContent = '';
          scoreElement.classList.add('hidden');
        }, 4000);

        if (target === 'question') {
          speechScoreHideTimeoutQuestion = timeoutId;
        } else {
          speechScoreHideTimeoutAnswer = timeoutId;
        }
      }
    } catch {
      // Keep a minimal error path without using the removed modal feedback.
    }
    stopRecordingVisual();
  };

  recognition.onerror = () => {
    showSpeechFeedback('Não foi possível capturar o áudio. Tente novamente.', false);
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
  elements.englishQuestion.textContent = 'Carregando…';
  elements.portugueseQuestion.textContent = '';
  elements.englishAnswer.textContent = '';
  elements.portugueseAnswer.textContent = '';
  let data;
  try {
    data = await fetchContextData(config.id);
  } catch (err) {
    console.error(err);
    showContextLoadProgress(false);
    elements.englishQuestion.textContent = 'Erro ao carregar contexto.';
    elements.portugueseQuestion.textContent = 'Erro ao carregar contexto.';
    elements.englishAnswer.textContent = '';
    elements.portugueseAnswer.textContent = '';
    if (elements.micQuestionBtn) {
      elements.micQuestionBtn.disabled = true;
      elements.micQuestionBtn.classList.add('hidden');
    }
    if (elements.micAnswerBtn) {
      elements.micAnswerBtn.disabled = true;
      elements.micAnswerBtn.classList.add('hidden');
    }
    return;
  }
  showContextLoadProgress(false);
  if (!data || !Array.isArray(data.sentences)) {
    elements.englishQuestion.textContent = 'Dados inválidos.';
    elements.portugueseQuestion.textContent = 'Dados inválidos.';
    elements.englishAnswer.textContent = 'Dados inválidos.';
    elements.portugueseAnswer.textContent = 'Dados inválidos.';
    return;
  }

  const shuffledSentences = shuffleArray(data.sentences);
  currentContext = { ...data, sentences: shuffledSentences };
  currentIndex = 0;
  updateSentenceView();

  const total = currentContext.sentences.length;
  const hasSentences = total > 0;
  elements.playNormalBtn.disabled = !hasSentences || !speechSynthesisSupported;
  elements.prevBtn.disabled = !hasSentences;
  elements.nextBtn.disabled = !hasSentences;
  elements.listenAllBtn.disabled = !hasSentences || !speechSynthesisSupported;

  if (elements.micQuestionBtn) {
    elements.micQuestionBtn.disabled = !hasSentences;
    elements.micQuestionBtn.classList.remove('hidden');
  }
  if (elements.micAnswerBtn) {
    elements.micAnswerBtn.disabled = !hasSentences;
    elements.micAnswerBtn.classList.remove('hidden');
  }
}

function updateSentenceView() {
  if (!currentContext || !currentContext.sentences.length) return;
  const sentence = currentContext.sentences[currentIndex];

  elements.englishQuestion.textContent = sentence.QE || '—';
  elements.portugueseQuestion.textContent = sentence.QP || '—';
  elements.englishAnswer.textContent = sentence.AE || '—';
  elements.portugueseAnswer.textContent = sentence.AP || '—';

  const hasQuestion = !!(String(sentence.QE || '').trim() && String(sentence.QP || '').trim());
  if (elements.blockQuestion) {
    elements.blockQuestion.classList.toggle('hidden', !hasQuestion);
  }

  const total = currentContext.sentences.length;
  const position = currentIndex + 1;
  elements.progressText.textContent = `${position} / ${total}`;
  const ratio = total ? (position / total) * 100 : 0;
  elements.progressFill.style.width = `${ratio}%`;

  elements.prevBtn.disabled = currentIndex === 0;
  elements.nextBtn.disabled = currentIndex >= total - 1;

  smoothScrollToBottom(1000);
  updateControlBarState();
}

function updateControlBarState() {
  if (!elements.controlsBar) return;
  elements.controlsBar.dataset.playNormalActive = isPlayingSingle ? 'true' : 'false';
  elements.controlsBar.dataset.listenAllActive = autoplay ? 'true' : 'false';

  const hasSentences = currentContext && currentContext.sentences.length > 0;
  const total = currentContext ? currentContext.sentences.length : 0;

  if (autoplay) {
    elements.playNormalBtn.disabled = true;
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = true;
  } else {
    elements.playNormalBtn.disabled = !hasSentences || !speechSynthesisSupported;
    elements.listenAllBtn.disabled = !hasSentences || !speechSynthesisSupported;
    elements.prevBtn.disabled = !hasSentences || currentIndex === 0;
    elements.nextBtn.disabled = !hasSentences || currentIndex >= total - 1;
  }
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
    updateControlBarState();
    if (!autoplay) return;
    if (!currentContext) return;
    if (currentIndex < currentContext.sentences.length - 1) {
      setTimeout(() => {
        if (!autoplay || !currentContext) return;
        currentIndex += 1;
        updateSentenceView();
        speakCurrentSentence(rate);
      }, 2000);
    } else {
      autoplay = false;
      elements.listenAllBtn.textContent = 'Ouvir todos';
      updateControlBarState();
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
