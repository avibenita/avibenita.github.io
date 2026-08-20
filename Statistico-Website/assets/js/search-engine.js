/**
 * Scoring for Statistico site search.
 *
 * Deliberately not a substring search over page text. Every record is a module,
 * calculator or page with named fields, and a match is scored by which field it
 * landed in, so "forest plot" ranks Meta-Analysis above a page that merely
 * mentions plots. Each result carries the fields that matched so the caller can
 * explain itself.
 *
 * Runs unchanged in Node (index report) and in the browser (search panel).
 */

/* Field weights. Aliases score close to titles: they are the curated bridge
   from what people type to what modules are called. */
const WEIGHTS = {
  title: 10,
  alias: 8,
  term: 5,
  category: 3,
  blurb: 2,
};

const PREFIX_FACTOR = 0.6;
const FUZZY_FACTOR = 0.35;
const MIN_PREFIX_LEN = 3;
const MIN_FUZZY_LEN = 5;

/* Returning a weak match is worse than returning nothing: it tells the user the
   site covers something it does not. One incidental word in a blurb lands well
   below this floor. */
const DEFAULT_MIN_SCORE = 2.5;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from', 'how',
  'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the', 'to', 'what',
  'when', 'which', 'with', 'test', 'tests', 'calculator', 'calculate',
  'analysis', 'statistico',
]);

/* "test" and "analysis" are stop words above because nearly every record
   contains them; they add noise rather than signal. They are still allowed
   through when the whole query is made of them. */

export function normalize(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokenize(text) {
  const all = normalize(text).split(' ').filter(Boolean);
  const kept = all.filter((t) => !STOP_WORDS.has(t));
  return kept.length ? kept : all;
}

function editDistanceWithin1(a, b) {
  if (a === b) return true;
  const diff = a.length - b.length;
  if (diff > 1 || diff < -1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (a.length < b.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return true;
}

/**
 * Rewrite a query through the curated synonyms.
 *
 * A synonym replaces the phrase it matched rather than being appended, so
 * "shapiro wilk" becomes "normality" instead of "shapiro wilk normality" -
 * words no record can ever match would otherwise dilute the score of the one
 * word that carries the meaning. Each synonym value is therefore the rewritten
 * query, and should keep any of the original words that are worth matching on.
 *
 * Single left-to-right pass, longest phrase first, never re-examining what a
 * substitution produced.
 */
export function expandQuery(query, querySynonyms = {}) {
  const words = normalize(query).split(' ').filter(Boolean);
  const lookup = new Map();
  let longest = 1;
  for (const [phrase, target] of Object.entries(querySynonyms)) {
    const key = normalize(phrase);
    if (!key) continue;
    lookup.set(key, normalize(target));
    longest = Math.max(longest, key.split(' ').length);
  }

  const out = [];
  const injected = [];
  let i = 0;
  while (i < words.length) {
    let hit = null;
    for (let span = Math.min(longest, words.length - i); span >= 1; span -= 1) {
      const candidate = words.slice(i, i + span).join(' ');
      if (lookup.has(candidate)) {
        hit = { span, target: lookup.get(candidate) };
        break;
      }
    }
    if (hit) {
      out.push(hit.target);
      injected.push(hit.target);
      i += hit.span;
    } else {
      out.push(words[i]);
      i += 1;
    }
  }

  const text = out.join(' ').trim();
  return { text, tokens: tokenize(text), injected };
}

/** Pre-split a record's fields into token sets once, so queries stay cheap. */
function prepare(record) {
  if (record.__prepared) return record.__prepared;
  const fields = {
    title: [record.title || ''],
    alias: record.aliases || [],
    term: record.terms || [],
    category: [record.category || ''],
    blurb: [record.blurb || ''],
  };
  const prepared = {};
  for (const [field, values] of Object.entries(fields)) {
    const tokens = new Set();
    const phrases = [];
    for (const value of values) {
      const norm = normalize(value);
      if (!norm) continue;
      phrases.push(norm);
      for (const token of norm.split(' ')) if (token) tokens.add(token);
    }
    prepared[field] = { tokens: [...tokens], phrases };
  }
  Object.defineProperty(record, '__prepared', { value: prepared, enumerable: false });
  return prepared;
}

function scoreToken(token, prepared) {
  let best = 0;
  let bestField = null;
  for (const [field, weight] of Object.entries(WEIGHTS)) {
    const { tokens } = prepared[field];
    let factor = 0;
    if (tokens.includes(token)) factor = 1;
    else if (
      token.length >= MIN_PREFIX_LEN &&
      /* Both directions are useful ("regress" for "regression", "normal" for
         "normality"), but only between tokens long enough to mean something:
         without the length guard, the "z" of "z score" prefix-matches any word
         starting with z. */
      tokens.some((t) => t.length >= MIN_PREFIX_LEN && (t.startsWith(token) || token.startsWith(t)))
    )
      factor = PREFIX_FACTOR;
    else if (token.length >= MIN_FUZZY_LEN && tokens.some((t) => editDistanceWithin1(token, t)))
      factor = FUZZY_FACTOR;
    if (!factor) continue;
    const score = weight * factor;
    if (score > best) {
      best = score;
      bestField = field;
    }
  }
  return { score: best, field: bestField };
}

/**
 * @param {Array} records  search index entries
 * @param {string} query   raw user input
 * @param {object} options { limit, querySynonyms }
 */
export function search(records, query, options = {}) {
  const { limit = 8, querySynonyms = {}, minScore = DEFAULT_MIN_SCORE } = options;
  const expanded = expandQuery(query, querySynonyms);
  if (!expanded.tokens.length) return [];

  const results = [];
  for (const record of records) {
    const prepared = prepare(record);
    let total = 0;
    let matched = 0;
    const fields = new Set();

    for (const token of expanded.tokens) {
      const hit = scoreToken(token, prepared);
      if (!hit.score) continue;
      matched += 1;
      total += hit.score;
      fields.add(hit.field);
    }
    if (!matched) continue;

    /* A full phrase appearing verbatim in a field is much stronger evidence
       than the same words scattered across it. */
    const phraseBonus = Object.entries(WEIGHTS).reduce((acc, [field, weight]) => {
      const hit = prepared[field].phrases.some((p) => p.includes(expanded.text));
      return hit ? Math.max(acc, weight) : acc;
    }, 0);

    const coverage = matched / expanded.tokens.length;
    const score = (total / expanded.tokens.length) * (0.55 + 0.45 * coverage) + phraseBonus;

    results.push({
      ...record,
      score: Math.round(score * 100) / 100,
      coverage: Math.round(coverage * 100) / 100,
      matchedFields: [...fields],
    });
  }

  results.sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)));
  return results.filter((r) => r.score >= minScore).slice(0, limit);
}

export const FIELD_WEIGHTS = WEIGHTS;
export const MIN_SCORE = DEFAULT_MIN_SCORE;
