/**
 * Quality gate for the site search index.
 *
 * Each case is a query plus the record id it should return first, or null when
 * the honest answer is "nothing here matches". Run this after touching
 * search-aliases.json or the scoring in search-engine.js.
 *
 * Usage: node scripts/search-report.mjs [--write] [--verbose]
 *   --write   also writes scripts/search-report.md
 *   --verbose show the top three hits for passing cases too
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { search } from '../Statistico-Website/assets/js/search-engine.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'Statistico-Website/assets/data/search-index.json'), 'utf8')
);
const write = process.argv.includes('--write');
const verbose = process.argv.includes('--verbose');

/* Ad-hoc mode for tuning aliases: node scripts/search-report.mjs --ask "forest plot" */
const askAt = process.argv.indexOf('--ask');
if (askAt !== -1) {
  for (const query of process.argv.slice(askAt + 1)) {
    const hits = search(index.records, query, { querySynonyms: index.querySynonyms, limit: 4 });
    console.log(`\n"${query}"`);
    if (!hits.length) console.log('  (no results)');
    for (const h of hits) {
      console.log(`  ${h.score.toFixed(2)}  ${h.title} [${h.category}]  via ${h.matchedFields.join(', ')}`);
    }
  }
  process.exit(0);
}

/* [query, expected]. expected is a record id, an array when more than one page
   is a genuinely correct first answer, or null when nothing should match. */
const CASES = [
  ['concept vocabulary the site never uses', [
    ['cronbach alpha', 'reliability'],
    ['fisher exact', 'contingency-tables'],
    ['forest plot', 'meta-analysis'],
    ['sample size', 'power-sample-size'],
    ['cluster analysis', ['k-means', 'hierarchical']],
    ['dendrogram', 'hierarchical'],
    ['margin of error', 'precision-sample-size'],
    ['internal consistency', 'reliability'],
    ['mcdonalds omega', 'reliability'],
    ['multilevel model', 'mixed-models'],
    ['table 1', 'publication-tables'],
  ]],
  ['test and method names', [
    ['t test', 'independent-means'],
    ['paired t test', 'paired-repeated'],
    ['analysis of variance', 'anova'],
    ['one way anova', 'anova'],
    ['chi square', 'contingency-tables'],
    ['logistic regression', 'logistic-regression'],
    ['linear regression', 'linear-regression'],
    ['tukey', 'anova'],
    ['shapiro wilk', 'univariate'],
    ['repeated measures', 'paired-repeated'],
    ['wilcoxon', 'paired-repeated'],
    ['mann whitney', 'independent-means'],
  ]],
  ['outputs and artefacts', [
    ['scree plot', ['pca', 'factor-analysis']],
    ['factor loadings', 'factor-analysis'],
    ['odds ratio', 'logistic-regression'],
    ['heatmap', 'correlation'],
    ['box plot', 'univariate'],
    ['histogram', 'univariate'],
    ['qq plot', 'univariate'],
    ['residual plot', 'linear-regression'],
    ['bubble chart', 'multivariable-visualisation'],
    ['3d scatter', 'multivariable-visualisation'],
    ['dendrogram plot', 'hierarchical'],
    ['funnel plot', 'meta-analysis'],
  ]],
  ['plain language questions', [
    ['how many participants do i need', 'power-sample-size'],
    ['compare two groups', 'independent-means'],
    ['compare three groups', 'anova'],
    ['group similar customers', 'k-means'],
    ['reduce number of variables', 'pca'],
    ['is my data normal', 'univariate'],
    ['before and after treatment', 'paired-repeated'],
    ['yes no outcome', 'logistic-regression'],
    ['combine results from several studies', 'meta-analysis'],
    ['reverse score likert items', 'data-manipulation'],
    ['is my questionnaire reliable', 'reliability'],
    ['journal ready table', 'publication-tables'],
  ]],
  ['calculators', [
    ['power analysis', 'power-sample-size'],
    ['normal distribution', 'distributions'],
    ['weibull', 'distributions'],
    ['binomial', 'distributions'],
    ['critical value', 'distributions'],
    ['z score', 'distributions'],
    ['survey sample size', 'precision-sample-size'],
    ['confidence interval width', 'precision-sample-size'],
    ['allocation ratio', 'power-sample-size'],
  ]],
  ['spelling, plurals and variants', [
    ['corelation', 'correlation'],
    ['regresion', 'linear-regression'],
    ['visualization', 'multivariable-visualisation'],
    ['clustering', ['k-means', 'hierarchical']],
    ['anova', 'anova'],
    ['pca', 'pca'],
  ]],
  ['site navigation', [
    ['how do i install', 'how-it-works'],
    ['why not spss', 'why-another-package'],
    ['pricing', 'faq'],
    ['contact', 'contact'],
    ['all calculators', 'index-Calculators'],
  ]],
  ['should find nothing', [
    ['kaplan meier survival', null],
    ['time series forecasting', null],
    ['structural equation model', null],
    ['kruskal wallis', null],
    ['machine learning', null],
    ['zzzzqqq', null],
  ]],
];

const lines = [];
const say = (text = '') => {
  lines.push(text);
  console.log(text);
};

let pass = 0;
let fail = 0;
const failures = [];

say(`# Site search quality report`);
say('');
say(`Index generated ${index.generated} - ${index.records.length} records, ` +
    `${Object.keys(index.querySynonyms).length} query synonyms.`);
say('');

for (const [group, cases] of CASES) {
  say(`## ${group}`);
  say('');
  for (const [query, expected] of cases) {
    const hits = search(index.records, query, { querySynonyms: index.querySynonyms, limit: 3 });
    const top = hits[0];
    const accept = expected === null ? [] : [].concat(expected);
    const ok = expected === null ? hits.length === 0 : Boolean(top) && accept.includes(top.id);
    if (ok) pass += 1;
    else {
      fail += 1;
      failures.push({ query, expected, got: top ? top.id : '(nothing)' });
    }

    const mark = ok ? 'ok  ' : 'FAIL';
    const summary = hits.length
      ? hits.map((h) => `${h.title} [${h.category}] ${h.score}`).join('  |  ')
      : '(no results)';
    if (!ok || verbose || !top) {
      say(`- ${mark} \`${query}\``);
      say(`    expected: ${expected === null ? '(nothing)' : accept.join(' or ')}`);
      say(`    got: ${summary}`);
      if (top) say(`    matched on: ${top.matchedFields.join(', ')}`);
    } else {
      say(`- ${mark} \`${query}\` -> ${top.title} [${top.category}] (${top.matchedFields.join(', ')})`);
    }
  }
  say('');
}

const total = pass + fail;
say(`## Result`);
say('');
say(`${pass}/${total} cases return the expected page first (${Math.round((pass / total) * 100)}%).`);
if (failures.length) {
  say('');
  say('Cases to review:');
  for (const f of failures) {
    const want = f.expected === null ? '(nothing)' : [].concat(f.expected).join(' or ');
    say(`- \`${f.query}\` expected ${want}, got ${f.got}`);
  }
}

if (write) {
  const out = path.join(repoRoot, 'scripts', 'search-report.md');
  fs.writeFileSync(out, `${lines.join('\n')}\n`);
  console.log(`\nwrote ${path.relative(repoRoot, out)}`);
}

process.exitCode = fail === 0 ? 0 : 1;
