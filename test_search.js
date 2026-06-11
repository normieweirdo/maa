const fs = require('fs');
const Fuse = require('fuse.js');

const qnaBase = JSON.parse(fs.readFileSync('data/qna.json', 'utf-8'));
const knowledgeBase = JSON.parse(fs.readFileSync('data/conditions.json', 'utf-8'));

const SYNONYMS = {
  "pmos": ["pmos", "ovarian cyst"],
  "pain": ["cramps", "ache", "hurts", "sore", "dysmenorrhea"],
  "period": ["menstruation", "cycle", "flow", "bleeding"],
  "late": ["delayed", "missed", "no period", "skip"],
  "heavy": ["excessive", "clots", "too much"],
  "mood": ["angry", "sad", "crying", "emotional", "depressed", "anxious", "mood swings"],
  "tired": ["fatigue", "exhausted", "low energy", "sleepy", "weak"],
  "spotting": ["brown discharge", "light bleeding", "pink discharge"],
  "acne": ["pimples", "breakouts", "zits"]
};

const normalizeText = (text) => {
  let normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  Object.keys(SYNONYMS).forEach(key => {
    SYNONYMS[key].forEach(syn => {
      if (normalized.includes(syn)) {
        normalized += ` ${key}`; // Append core keyword to boost score
      }
    });
  });
  return normalized;
};

const question = "i'm having pain";
const qLower = normalizeText(question);
const stopWords = ['what', 'when', 'where', 'why', 'how', 'who', 'is', 'are', 'am', 'was', 'were', 'do', 'does', 'did', 'have', 'has', 'had', 'having', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'i', 'im', 'ive'];
const words = qLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));

const cleanQuery = words.join(' ');
const queryForFuse = cleanQuery.length > 0 ? cleanQuery : qLower;

let scoredQnA = qnaBase.map(item => {
  if (!item.questions || item.questions.length === 0) return { type: 'qna', item, score: 0 };
  let score = 0;
  const itemQs = item.questions.map(q => q.toLowerCase());
  const keywords = Array.isArray(item.keywords) ? item.keywords.map(k => k.toLowerCase()) : [];
  const isDirect = !!item.is_direct;

  keywords.forEach(kw => {
    const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(qLower)) {
      const kwWords = kw.split(/\s+/).length;
      score += kwWords >= 2 ? (isDirect ? 100 : 50) : (isDirect ? 70 : 30);
    }
  });
  itemQs.forEach(q => {
    words.forEach(w => {
      if (q.includes(w)) score += isDirect ? 10 : 4;
    });
  });
  return { type: 'qna', item, score };
});

const fuseQnA = new Fuse(qnaBase, { keys: ['questions', 'keywords', 'answer'], includeScore: true, threshold: 0.5, ignoreLocation: true });
const qnaResults = fuseQnA.search(queryForFuse);
qnaResults.forEach(res => {
  const idx = scoredQnA.findIndex(s => s.item.answer === res.item.answer);
  if (idx !== -1) {
    let fScore = Math.round((1 - res.score) * 100);
    scoredQnA[idx].score = Math.max(scoredQnA[idx].score, fScore);
  }
});

scoredQnA.sort((a, b) => b.score - a.score);

console.log("Top 3 matches:");
for(let i = 0; i < 3; i++) {
  console.log(`\nMatch ${i+1}: Score: ${scoredQnA[i].score}`);
  console.log(`Keywords: ${JSON.stringify(scoredQnA[i].item.keywords)}`);
  console.log(`Questions: ${JSON.stringify(scoredQnA[i].item.questions)}`);
  console.log(`Answer: ${scoredQnA[i].item.answer.substring(0, 100)}...`);
}
