/**
 * Builds Statistico-Website/assets/data/search-index.json for the site search.
 *
 * Records are extracted from the published pages rather than from a separate
 * hand-kept list, using the same "has a canonical" rule as the sitemap, so a new
 * module or calculator page joins the search index by existing. The structured
 * parts of those pages are what make the index module-aware: capability chips,
 * workflow view names, the coverage lists on calculator pages and the FAQ
 * questions all become searchable terms attached to a titled, categorised record.
 *
 * Curated aliases live in Statistico-Website/assets/data/search-aliases.json and
 * cover the vocabulary a page never uses about itself ("Cronbach alpha").
 *
 * Usage: node scripts/generate-search-index.mjs [--check]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.join(repoRoot, 'Statistico-Website');
const dataDir = path.join(siteRoot, 'assets', 'data');
const outFile = path.join(dataDir, 'search-index.json');
const aliasFile = path.join(dataDir, 'search-aliases.json');
const checkOnly = process.argv.includes('--check');

const SKIP_DIRS = new Set(['assets', 'demos', 'legacy-help', 'node_modules', '.git']);

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&times;': '\u00d7',
  '&nbsp;': ' ',
  '&#8209;': '-',
  '&mdash;': '\u2014',
  '&ndash;': '\u2013',
};

function clean(html) {
  let text = String(html).replace(/<[^>]+>/g, ' ');
  for (const [entity, char] of Object.entries(ENTITIES)) text = text.split(entity).join(char);
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  return text.replace(/\s+/g, ' ').trim();
}

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), found);
    } else if (entry.name.endsWith('.html')) {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

function matchAll(html, re) {
  return [...html.matchAll(re)].map((m) => clean(m[1])).filter(Boolean);
}

/* Page titles are written for search engines ("... Software for Excel |
   Statistico Analytics"); search results want the bare subject. */
function shortTitle(rawTitle) {
  let title = clean(rawTitle).split('|')[0].trim();
  title = title
    .replace(/\bSoftware for Excel\b/i, '')
    .replace(/^Statistico\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return title;
}

function categoryOf(html, urlPath) {
  /* BreadcrumbList already states where a page sits; the crumb before the page
     itself is its category. */
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(block[1]);
      const nodes = data['@graph'] || [data];
      const crumbs = nodes.find((n) => n['@type'] === 'BreadcrumbList');
      if (crumbs && Array.isArray(crumbs.itemListElement) && crumbs.itemListElement.length >= 2) {
        const names = crumbs.itemListElement.map((c) => c.name).filter(Boolean);
        const parent = names[names.length - 2];
        if (parent && parent !== 'Statistico') return parent;
      }
    } catch {
      /* a page with malformed JSON-LD still deserves a category */
    }
  }
  if (urlPath.includes('/analytics/')) return 'Analytics';
  if (urlPath.includes('/calculators/')) return 'Calculators';
  if (urlPath.includes('/ezpaste/')) return 'EzPaste';
  return 'Site';
}

function typeOf(urlPath) {
  if (urlPath.includes('/analytics/')) return 'module';
  if (urlPath.includes('/calculators/')) return 'calculator';
  if (/index-(Analytics|Calculators|Addins|EzPaste)\.html$/.test(urlPath)) return 'hub';
  return 'page';
}

const aliasData = JSON.parse(fs.readFileSync(aliasFile, 'utf8'));
const records = [];

for (const file of walk(siteRoot)) {
  const html = fs.readFileSync(file, 'utf8');
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (!canonical) continue;

  const url = canonical[1].trim();
  const urlPath = new URL(url).pathname;
  const titleTag = html.match(/<title>([\s\S]*?)<\/title>/i);
  const description = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

  const terms = new Set();
  const collect = (re) => matchAll(html, re).forEach((t) => terms.add(t));
  collect(/<div class="cap-item"><i[^>]*><\/i><span>([\s\S]*?)<\/span>/g); // capability chips
  collect(/<span class="chip">([\s\S]*?)<\/span>/g); // feature chips
  collect(/class="lr-flow-step[^"]*"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/g); // workflow views
  collect(/<div class="gallery-copy">\s*<h3>([\s\S]*?)<\/h3>/g); // view headings
  collect(/<div class="calc-item"><dt>([\s\S]*?)<\/dt>/g); // calculator coverage
  collect(/<div class="calc-group">\s*<h3>([\s\S]*?)<\/h3>/g); // coverage groups
  collect(/<summary>([\s\S]*?)<\/summary>/g); // FAQ questions

  const title = shortTitle(titleTag ? titleTag[1] : path.basename(file, '.html'));
  records.push({
    id: urlPath.replace(/^.*\/([^/]+)\.html$/, '$1'),
    type: typeOf(urlPath),
    title: h1 && clean(h1[1]).length <= 60 ? clean(h1[1]) : title,
    category: categoryOf(html, urlPath),
    url: urlPath,
    blurb: description ? clean(description[1]) : '',
    terms: [...terms].filter((t) => t.length < 90),
    aliases: aliasData.aliases[urlPath] || [],
  });
}

records.sort((a, b) => a.url.localeCompare(b.url));

const missingAliasTargets = Object.keys(aliasData.aliases).filter(
  (key) => !records.some((r) => r.url === key)
);
if (missingAliasTargets.length) {
  console.error('search-aliases.json points at pages that do not exist:');
  for (const key of missingAliasTargets) console.error(`  ${key}`);
  process.exit(1);
}

const payload = {
  generated: new Date().toISOString().slice(0, 10),
  querySynonyms: aliasData.querySynonyms,
  records,
};
const json = `${JSON.stringify(payload, null, 2)}\n`;

fs.mkdirSync(dataDir, { recursive: true });
const current = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
if (checkOnly) {
  if (current !== json) {
    console.error('search-index.json is out of date - run: node scripts/generate-search-index.mjs');
    process.exit(1);
  }
  console.log(`search-index.json is up to date (${records.length} records).`);
} else {
  fs.writeFileSync(outFile, json);
  const byType = records.reduce((acc, r) => ({ ...acc, [r.type]: (acc[r.type] || 0) + 1 }), {});
  const termCount = records.reduce((acc, r) => acc + r.terms.length, 0);
  const aliasCount = records.reduce((acc, r) => acc + r.aliases.length, 0);
  console.log(
    `Wrote search-index.json: ${records.length} records ` +
      `(${Object.entries(byType).map(([k, v]) => `${v} ${k}`).join(', ')}), ` +
      `${termCount} terms, ${aliasCount} aliases.`
  );
  const thin = records.filter((r) => r.terms.length + r.aliases.length < 3);
  if (thin.length) {
    console.log('Records with little to match on:');
    for (const r of thin) console.log(`  ${r.title} (${r.url})`);
  }
}
