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
let speechSynthesisSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let cachedVoices = [];

const elements = {
  contextSelect: document.getElementById('contextSelect'),
  contextLoadProgress: document.getElementById('contextLoadProgress'),
  blockQuestion: document.getElementById('blockQuestion'),
  englishQuestion: document.getElementById('englishQuestion'),
  portugueseQuestion: document.getElementById('portugueseQuestion'),
  englishAnswer: document.getElementById('englishAnswer'),
  portugueseAnswer: document.getElementById('portugueseAnswer'),
  playNormalBtn: document.getElementById('playNormalBtn'),
  listenAllBtn: document.getElementById('listenAllBtn'),
  prevBtn: document.getElementById('prevBtn'),
  controlsBar: document.querySelector('.controls-bar'),
  nextBtn: document.getElementById('nextBtn'),
  progressText: document.getElementById('progressText'),
  progressFill: document.getElementById('progressFill'),
  themeToggle: document.getElementById('themeToggle'),
  themeIconSun: document.querySelector('.theme-icon-sun'),
  themeIconMoon: document.querySelector('.theme-icon-moon'),
};

const THEME_KEY = 'english-trainer-theme';

function init() {
  applySavedTheme();
  populateContextSelect();
  wireEvents();

  // Automatically select 'Greetings' context for the first time (loads via fetch)
  const greetingsConfig = contextsConfig[0];
  if (elements.contextSelect) {
    elements.contextSelect.value = greetingsConfig.id;
  }
  loadContext(greetingsConfig).then(() => updateControlBarState());

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

  elements.contextSelect.addEventListener('change', async (e) => {
    const selectedId = e.target.value;
    const config = contextsConfig.find((c) => c.id === selectedId);
    if (!config) return;
    autoplay = false;
    isPlayingSingle = false;
    elements.listenAllBtn.textContent = 'Ouvir todos';
    updateControlBarState();

    await loadContext(config);
  });

  elements.playNormalBtn.addEventListener('click', () => {
    isPlayingSingle = true;
    updateControlBarState();
    speakCurrentSentence(1);
  });

  elements.listenAllBtn.addEventListener('click', () => {
    if (!currentContext) return;
    autoplay = !autoplay;
    isPlayingSingle = false;
    if (autoplay) {
      elements.listenAllBtn.textContent = 'Parar autoplay';
      speakCurrentSentence(1);
    } else {
      elements.listenAllBtn.textContent = 'Ouvir todos';
      window.speechSynthesis.cancel();
    }
    updateControlBarState();
  });

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
    const voice = pickVoiceMale('en');
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
        if (!autoplay) return;
        currentIndex += 1;
        updateSentenceView();
        speakCurrentSentence(rate);
      }, 500);
    } else {
      autoplay = false;
      elements.listenAllBtn.textContent = 'Ouvir todos';
      updateControlBarState();
    }
  }

  if (questionText) {
    const questionUtterance = new SpeechSynthesisUtterance(questionText);
    const voice = pickVoiceFemale('en');
    if (voice) questionUtterance.voice = voice;
    questionUtterance.lang = 'en-US';
    questionUtterance.rate = rate;
    questionUtterance.onend = () => speakAnswer();
    window.speechSynthesis.speak(questionUtterance);
  } else {
    speakAnswer();
  }
}

document.addEventListener('DOMContentLoaded', init);
