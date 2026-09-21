/**
 * Writes Statistico-Website/explore.html from assets/data/capabilities.json.
 * The catalogue stays in the HTML so the page is crawlable; JS only hides/shows.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataFile = path.join(repoRoot, 'Statistico-Website/assets/data/capabilities.json');
const outFile = path.join(repoRoot, 'Statistico-Website/explore.html');

const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

function esc(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRODUCT_LABEL = {
  analytics: 'Analytics',
  calculators: 'Calculators',
  'specialized-tools': 'Specialized Tools',
};

function actionLabel(cap) {
  const dest = cap.kind === 'feature' ? cap.parentName : String(cap.name || '').replace(/™/g, '');
  return cap.kind === 'feature' ? `Open in ${dest}` : `Open ${dest}`;
}

function topicTagsHtml(tags) {
  const list = tags || [];
  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;
  const items = shown.map((t) => `<li><button type="button" class="topic-tag" data-q="${esc(t)}">${esc(t)}</button></li>`);
  if (extra > 0) {
    items.push(`<li class="topic-more" title="${esc(list.slice(3).join(', '))}">+${extra}</li>`);
  }
  return `<ul class="cap-tags">${items.join('')}</ul>`;
}

function cardHtml(cap) {
  const inLine = cap.kind === 'feature'
    ? `        <p class="cap-in">In ${esc(cap.parentName)}</p>\n`
    : '';
  const original = cap.original
    ? ` <span class="original-badge" title="Developed by Statistico rather than an established statistical method.">Statistico Original</span>`
    : '';
  return `<article
        class="cap-card${cap.kind === 'feature' ? ' cap-card--feature' : ''}"
        id="cap-${esc(cap.id)}"
        data-id="${esc(cap.id)}"
        data-kind="${esc(cap.kind)}"
        data-original="${cap.original ? '1' : ''}"
        data-parent="${esc(cap.parent || '')}"
        data-product="${esc(cap.product)}"
        data-family="${esc(cap.family)}"
        data-goals="${esc((cap.goals || []).join(' '))}"
        data-outcome="${esc((cap.outcome || []).join(' '))}"
        data-groups="${esc((cap.groups || []).join(' '))}"
        data-design="${esc((cap.design || []).join(' '))}"
        data-tags="${esc((cap.tags || []).join(' '))}"
        data-keywords="${esc((cap.keywords || []).join(' '))}">
${inLine}        <h3><a href="${esc(cap.overviewUrl)}">${esc(cap.name)}</a>${original}</h3>
        <p class="cap-blurb">${esc(cap.blurb)}</p>
        ${topicTagsHtml(cap.tags || [])}
        <div class="cap-meta">
          <span>${esc(PRODUCT_LABEL[cap.product] || cap.product)}</span>
          <span>${esc((data.families.find((f) => f.id === cap.family) || {}).label || '')}</span>
        </div>
        <a class="cap-cta" href="${esc(cap.overviewUrl)}">${esc(actionLabel(cap))} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      </article>`;
}

const goalButtons = data.goals.map((g) => `          <button type="button" class="goal-chip" data-goal="${esc(g.id)}">
            <strong>${esc(g.label)}</strong>
            <span>${esc(g.prompt)}</span>
          </button>`).join('\n');

const productTabs = [`          <button type="button" class="product-tab is-active" data-product="">All products</button>`]
  .concat(data.products.map((p) => `          <button type="button" class="product-tab" data-product="${esc(p.id)}">${esc(p.label)}</button>`))
  .join('\n');

function tableRowHtml(cap, familyOrder) {
  const familyLabel = (data.families.find((f) => f.id === cap.family) || {}).label || '';
  const topics = topicTagsHtml(cap.tags || []);
  const inLine = cap.kind === 'feature'
    ? `<span class="row-in">In ${esc(cap.parentName)}</span>`
    : '';
  const original = cap.original
    ? `<span class="original-badge" title="Developed by Statistico rather than an established statistical method.">Statistico Original</span>`
    : '';
  return `<tr
          class="method-row${cap.kind === 'feature' ? ' method-row--feature' : ''}"
          data-id="${esc(cap.id)}"
          data-kind="${esc(cap.kind)}"
          data-original="${cap.original ? '1' : ''}"
          data-parent="${esc(cap.parent || '')}"
          data-product="${esc(cap.product)}"
          data-family="${esc(cap.family)}"
          data-family-order="${familyOrder}"
          data-name="${esc(cap.name)}"
          data-goals="${esc((cap.goals || []).join(' '))}"
          data-outcome="${esc((cap.outcome || []).join(' '))}"
          data-groups="${esc((cap.groups || []).join(' '))}"
          data-design="${esc((cap.design || []).join(' '))}"
          data-tags="${esc((cap.tags || []).join(' '))}"
          data-keywords="${esc((cap.keywords || []).join(' '))}"
          data-href="${esc(cap.overviewUrl)}">
          <td class="col-method">
            ${inLine}
            <div class="row-title">
              <a class="row-name" href="${esc(cap.overviewUrl)}">${esc(cap.name)}</a>
              ${original}
            </div>
            <p class="row-blurb">${esc(cap.blurb)}</p>
            <div class="row-topics">${topics}</div>
          </td>
          <td class="col-family" data-value="${esc(familyLabel)}">${esc(familyLabel)}</td>
          <td class="col-product"><span class="badge badge-product badge-${esc(cap.product)}">${esc(PRODUCT_LABEL[cap.product] || cap.product)}</span></td>
          <td class="col-tags">${topics}</td>
          <td class="col-open"><a class="row-open" href="${esc(cap.overviewUrl)}">${esc(actionLabel(cap))} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></td>
        </tr>`;
}

const listed = data.capabilities.filter((cap) => cap.kind !== 'feature');

const familyOptions = data.families.map((f) => `              <option value="${esc(f.id)}">${esc(f.label)}</option>`).join('\n');
const productOptions = data.products.map((p) => `              <option value="${esc(p.id)}">${esc(p.label)}</option>`).join('\n');

const tableRows = listed.map((cap) => {
  const familyOrder = data.families.findIndex((f) => f.id === cap.family);
  return tableRowHtml(cap, familyOrder < 0 ? 99 : familyOrder);
}).join('\n        ');

const familyBlocks = data.families.map((family) => {
  const caps = listed.filter((c) => c.family === family.id);
  if (!caps.length) return '';
  return `      <section class="family-block" data-family-block="${esc(family.id)}" aria-labelledby="family-${esc(family.id)}">
        <h2 id="family-${esc(family.id)}">${esc(family.label)}</h2>
        <div class="cap-grid">
      ${caps.map(cardHtml).join('\n      ')}
        </div>
      </section>`;
}).filter(Boolean).join('\n\n');

const itemList = listed.map((cap, i) => `          {
            "@type": "ListItem",
            "position": ${i + 1},
            "name": ${JSON.stringify(cap.name)},
            "url": "https://statistico.live${cap.overviewUrl}",
            "description": ${JSON.stringify(cap.blurb)}
          }`).join(',\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Statistical Methods, Tools &amp; Calculators | Explore Statistico</title>
  <link rel="icon" type="image/svg+xml" href="/favicon-max.svg?v=2026-08-08-si-max" />
  <link rel="canonical" href="https://statistico.live/Statistico-Website/explore.html" />
  <meta name="description" content="Find the right Statistico analysis, calculator, or specialized tool. Browse by goal, method, or product — from regression, ANOVA and mixed models to power analysis, reliability, clustering and more." />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Statistico" />
  <meta property="og:title" content="Statistical Methods, Tools &amp; Calculators | Explore Statistico" />
  <meta property="og:description" content="A capability explorer for Statistico: search or browse by goal, method, or product to find the right analysis, calculator, or specialized tool." />
  <meta property="og:url" content="https://statistico.live/Statistico-Website/explore.html" />
  <meta property="og:image" content="https://statistico.live/Statistico-Website/assets/img/statistico-og-image.png?v=2" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Statistical Methods, Tools &amp; Calculators | Explore Statistico" />
  <meta name="twitter:description" content="Find the right Statistico analysis, calculator, or specialized tool by goal, method, or product." />
  <meta name="twitter:image" content="https://statistico.live/Statistico-Website/assets/img/statistico-og-image.png?v=2" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,400;1,500;1,600;1,700&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet"/>
  <link rel="stylesheet" href="/Statistico-Website/assets/css/explore.css?v=2026-09-21-tax" />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": "https://statistico.live/Statistico-Website/explore.html",
        "url": "https://statistico.live/Statistico-Website/explore.html",
        "name": "Statistical Methods, Tools & Calculators | Explore Statistico",
        "description": "Find the right Statistico analysis, calculator, or specialized tool. Browse interactive statistics for Excel by goal, method, or product.",
        "isPartOf": { "@type": "WebSite", "name": "Statistico", "url": "https://statistico.live/" },
        "about": [
          "interactive statistics",
          "statistical software for Excel",
          "regression",
          "ANOVA",
          "mixed models",
          "factor analysis",
          "PCA",
          "power analysis",
          "reliability",
          "meta-analysis",
          "clustering"
        ]
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Statistico", "item": "https://statistico.live/" },
          { "@type": "ListItem", "position": 2, "name": "Explore Statistico", "item": "https://statistico.live/Statistico-Website/explore.html" }
        ]
      },
      {
        "@type": "ItemList",
        "name": "Statistico capabilities",
        "numberOfItems": ${listed.length},
        "itemListElement": [
${itemList}
        ]
      }
    ]
  }
  </script>
</head>
<body>
  <div id="nav-placeholder"></div>

  <header class="explore-bar">
    <div class="container explore-bar-inner">
      <h1 class="visually-hidden">Explore Statistico</h1>
      <div class="mode-tabs" role="tablist" aria-label="Browse Explore Statistico">
        <button type="button" class="mode-tab is-active" role="tab" aria-selected="true" data-mode="method">Methods &amp; tools</button>
        <button type="button" class="mode-tab" role="tab" aria-selected="false" data-mode="goal">By goal</button>
        <button type="button" class="mode-tab" role="tab" aria-selected="false" data-mode="product">By product</button>
      </div>
      <form class="explore-search" role="search" action="/Statistico-Website/explore.html" method="get" onsubmit="return false;">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input id="explore-q" name="q" type="search" placeholder="Search methods and tools" autocomplete="off" />
        <button type="button" class="explore-search-clear" id="explore-clear" aria-label="Clear search"><i class="fa-solid fa-xmark"></i></button>
      </form>
    </div>
  </header>

  <main>
    <section class="explore-modes">
      <div class="container">

        <div class="browse-panel" data-panel="goal">
          <div class="goal-grid" role="list">
${goalButtons}
          </div>
          <div class="navigator" id="compare-navigator" hidden>
            <h3>Narrow the comparison</h3>
            <div class="nav-q">
              <p>What kind of outcome?</p>
              <div class="nav-opts">
                <button type="button" class="nav-opt" data-nav="outcome" data-value="continuous">Continuous</button>
                <button type="button" class="nav-opt" data-nav="outcome" data-value="ordinal">Ordinal / non-normal</button>
                <button type="button" class="nav-opt" data-nav="outcome" data-value="categorical">Categorical</button>
              </div>
            </div>
            <div class="nav-q">
              <p>How many groups?</p>
              <div class="nav-opts">
                <button type="button" class="nav-opt" data-nav="groups" data-value="2">2</button>
                <button type="button" class="nav-opt" data-nav="groups" data-value="3plus">3+</button>
              </div>
            </div>
            <div class="nav-q">
              <p>Independent or repeated?</p>
              <div class="nav-opts">
                <button type="button" class="nav-opt" data-nav="design" data-value="independent">Independent</button>
                <button type="button" class="nav-opt" data-nav="design" data-value="repeated">Repeated</button>
              </div>
            </div>
          </div>
        </div>

        <div class="browse-panel" data-panel="method" hidden></div>

        <div class="browse-panel" data-panel="product">
          <div class="product-tabs">
${productTabs}
          </div>
        </div>
        <p class="results-count results-count--cards" id="explore-count-cards" hidden>${listed.length} results</p>
      </div>
    </section>

    <section class="container explore-catalogue is-table" id="explore-catalogue" aria-label="Statistico capability catalogue">
      <div class="method-table-wrap" id="method-table-wrap">
        <div class="method-table-toolbar">
          <div class="method-filters">
            <label class="method-filter">
              <span>Category</span>
              <select id="filter-family" aria-label="Filter by category">
              <option value="">All categories</option>
${familyOptions}
              </select>
            </label>
            <label class="method-filter">
              <span>Product</span>
              <select id="filter-product" aria-label="Filter by product">
              <option value="">All products</option>
${productOptions}
              </select>
            </label>
            <label class="method-filter">
              <span>Item type</span>
              <select id="filter-kind" aria-label="Filter by item type">
              <option value="">All item types</option>
              <option value="module">Module</option>
              <option value="calculator">Calculator</option>
              <option value="tool">Tool</option>
              </select>
            </label>
            <label class="method-filter">
              <span>Origin</span>
              <select id="filter-origin" aria-label="Filter by origin">
              <option value="">All</option>
              <option value="original">Statistico Originals</option>
              <option value="established">Established Methods</option>
              </select>
            </label>
          </div>
          <p class="results-count" id="explore-count">${listed.length} results</p>
        </div>
        <div class="method-table-scroll">
          <table class="method-table" id="method-table">
            <thead>
              <tr>
                <th scope="col"><button type="button" class="sort-btn" data-sort="name">Method or tool <i class="fa-solid fa-sort" aria-hidden="true"></i></button></th>
                <th scope="col"><button type="button" class="sort-btn is-active" data-sort="family" data-dir="asc">Category <i class="fa-solid fa-sort-up" aria-hidden="true"></i></button></th>
                <th scope="col"><button type="button" class="sort-btn" data-sort="product">Product <i class="fa-solid fa-sort" aria-hidden="true"></i></button></th>
                <th class="col-topics-head" scope="col">Key topics</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
        ${tableRows}
            </tbody>
          </table>
        </div>
      </div>

${familyBlocks}

      <div class="empty-state" id="explore-empty">
        <p>Nothing matched that combination. Try a broader goal or a different keyword.</p>
        <button type="button" id="explore-reset">Clear filters</button>
      </div>

      <p class="explore-seo-note">
        Explore Statistico is a map of the platform — interactive statistics in Excel across
        Analytics, Calculators, and Specialized Tools — not a flat module directory.
      </p>
    </section>
  </main>

  <div id="footer-placeholder"></div>
  <script src="/Statistico-Website/assets/js/nav-template.js?v=2026-09-21-explore"></script>
  <script src="/Statistico-Website/assets/js/explore.js?v=2026-09-21-tax"></script>
</body>
</html>
`;

fs.writeFileSync(outFile, html);
console.log(`Wrote ${path.relative(repoRoot, outFile)} with ${listed.length} listed capabilities.`);
