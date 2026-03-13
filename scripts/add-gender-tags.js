const fs = require('fs');
const path = require('path');

const CONTEXT_DIR = path.join(__dirname, '..', 'context');

function listContextFiles() {
  return fs
    .readdirSync(CONTEXT_DIR)
    .filter((name) => name.toLowerCase().endsWith('.json'));
}

function detectGenderFromEnglish(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  if (/\bshe\b/.test(t) || /\bher\b/.test(t) || /\bwoman\b/.test(t) || /\bgirl\b/.test(t)) {
    return 'F';
  }
  if (/\bhe\b/.test(t) || /\bhim\b/.test(t) || /\bhis\b/.test(t) || /\bman\b/.test(t) || /\bboy\b/.test(t)) {
    return 'M';
  }

  const femaleNames = ['maria', 'ana', 'anna', 'julia', 'julianna', 'samantha', 'victoria', 'karen', 'moira', 'fiona'];
  const maleNames = ['Daniel', 'joao', 'john', 'paul', 'george', 'mark', 'david', 'daniel', 'alex'];

  if (femaleNames.some((name) => t.includes(name))) return 'F';
  if (maleNames.some((name) => t.includes(name))) return 'M';

  return null;
}

function detectGenderFromPortuguese(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  if (/\bela\b/.test(t) || /\bdela\b/.test(t)) {
    return 'F';
  }
  if (/\bele\b/.test(t) || /\bdele\b/.test(t)) {
    return 'M';
  }

  const femaleNames = ['maria', 'ana', 'ana ', 'joana', 'julia', 'ana.', 'maria.', 'ana,', 'maria,'];
  const maleNames = ['Daniel', 'joao', 'pedro', 'carlos', 'Daniel.', 'joao.', 'Daniel,', 'joao,'];

  if (femaleNames.some((name) => t.includes(name))) return 'F';
  if (maleNames.some((name) => t.includes(name))) return 'M';

  return null;
}

function detectGenderFromSentenceObj(sentence) {
  const qe = sentence.QE || '';
  const qp = sentence.QP || '';
  const ae = sentence.AE || '';
  const ap = sentence.AP || '';

  const qFromEn = detectGenderFromEnglish(qe);
  const qFromPt = detectGenderFromPortuguese(qp);
  const aFromEn = detectGenderFromEnglish(ae);
  const aFromPt = detectGenderFromPortuguese(ap);

  const qDetected = qFromEn || qFromPt || null;
  const aDetected = aFromEn || aFromPt || null;

  return { qDetected, aDetected };
}

function oppositeGender(g) {
  if (g === 'M') return 'F';
  if (g === 'F') return 'M';
  return null;
}

function processSentence(sentence) {
  const hasQuestionText =
    !!String(sentence.QE || '').trim() || !!String(sentence.QP || '').trim();

  const { qDetected, aDetected } = detectGenderFromSentenceObj(sentence);

  if (!hasQuestionText) {
    sentence.QG = '';
    sentence.AG = aDetected || '';
    return sentence;
  }

  if (qDetected && aDetected) {
    if (qDetected === aDetected) {
      sentence.QG = '';
      sentence.AG = '';
    } else {
      sentence.QG = qDetected;
      sentence.AG = aDetected;
    }
    return sentence;
  }

  if (qDetected && !aDetected) {
    sentence.QG = qDetected;
    sentence.AG = oppositeGender(qDetected) || '';
    return sentence;
  }

  if (!qDetected && aDetected) {
    sentence.QG = oppositeGender(aDetected) || '';
    sentence.AG = aDetected;
    return sentence;
  }

  sentence.QG = '';
  sentence.AG = '';
  return sentence;
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse JSON for ${filePath}:`, e.message);
    return;
  }

  if (!data || !Array.isArray(data.sentences)) return;

  data.sentences = data.sentences.map((sentence) => {
    if (!sentence || typeof sentence !== 'object') return sentence;
    if (sentence.QG !== undefined || sentence.AG !== undefined) return sentence;
    return processSentence({ ...sentence });
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated genders in ${path.basename(filePath)}`);
}

function main() {
  const files = listContextFiles();
  files.forEach((file) => {
    const fullPath = path.join(CONTEXT_DIR, file);
    processFile(fullPath);
  });
}

main();

