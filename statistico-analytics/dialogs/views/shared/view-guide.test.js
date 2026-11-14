/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    id: '',
    className: '',
    hidden: false,
    children: [],
    parentNode: null,
    attributes: {},
    textContent: '',
    listeners: {},
    _html: '',
    _qs: {}
  };
  const classes = new Set();
  el.classList = {
    add: (...names) => { names.forEach((name) => classes.add(name)); },
    remove: (...names) => { names.forEach((name) => classes.delete(name)); },
    toggle: (name, force) => {
      const next = force === undefined ? !classes.has(name) : !!force;
      if (next) classes.add(name);
      else classes.delete(name);
      return next;
    },
    contains: (name) => classes.has(name)
  };
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return el._html; },
    set(value) {
      el._html = String(value);
      el.textContent = el._html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (el.id === 'viewGuideOverlay' || el.className === 'vg-overlay') {
        const title = createEl('h2');
        title.id = 'viewGuideTitle';
        const body = createEl('div');
        body.id = 'viewGuideBody';
        const close = createEl('button');
        el._qs = { '.vg-title': title, '.vg-body': body, '.vg-close': close, '#viewGuideTitle': title };
        if (global.document) {
          document._ids.viewGuideTitle = title;
          document._ids.viewGuideBody = body;
        }
      }
    }
  });
  el.querySelector = (sel) => el._qs[sel] || null;
  el.setAttribute = (key, value) => { el.attributes[key] = String(value); };
  el.getAttribute = (key) => (Object.prototype.hasOwnProperty.call(el.attributes, key) ? el.attributes[key] : null);
  el.addEventListener = (type, fn) => { el.listeners[type] = fn; };
  el.focus = () => { if (global.document) document.activeElement = el; };
  el.appendChild = (child) => {
    child.parentNode = el;
    el.children.push(child);
    if (child.id && global.document) document._ids[child.id] = child;
    return child;
  };
  el.remove = () => {
    if (el.id && global.document && document._ids[el.id] === el) delete document._ids[el.id];
    if (el.parentNode) el.parentNode.children = el.parentNode.children.filter((child) => child !== el);
    el.parentNode = null;
  };
  return el;
}

function installDocument(target) {
  const body = createEl('body');
  const document = {
    _ids: {},
    body,
    activeElement: null,
    listeners: {},
    createElement: (tag) => createEl(tag),
    getElementById: (id) => document._ids[id] || null,
    addEventListener: (type, fn) => { document.listeners[type] = fn; },
    contains: (node) => !!(node && (node === body || node.parentNode))
  };
  Object.defineProperty(body, 'innerHTML', {
    configurable: true,
    get() { return body._html; },
    set(value) {
      body._html = String(value);
      body.children = [];
      Object.keys(document._ids).forEach((id) => { delete document._ids[id]; });
      if (value.includes('sbViewGuideBtn')) {
        const button = createEl('button');
        button.id = 'sbViewGuideBtn';
        button.setAttribute('aria-expanded', 'false');
        body.appendChild(button);
      }
    }
  });
  target.document = document;
  return document;
}

const realm = {};
realm.globalThis = realm;
realm.window = realm;
realm.console = console;
realm.requestAnimationFrame = (fn) => fn();
installDocument(realm);
global.document = realm.document;
const source = fs.readFileSync(path.join(__dirname, 'view-guide.js'), 'utf8');
vm.createContext(realm);
vm.runInContext(source, realm);

const REQUIRED = ['purpose', 'interact', 'read', 'limits'];
const UNIVARIATE_KEYS = [
  'histogram', 'cdf', 'percentile', 'kernel', 'boxplot', 'boxplot-outliers', 'outliers',
  'by-group-stats', 'by-group-boxplot', 'by-group-normality', 'by-group-similarity',
  'normality', 'qqplot', 'confidence', 'hypothesis'
];

describe('Univariate view guide', () => {
  const guide = realm.StatisticoViewGuide;
  const document = realm.document;

  beforeEach(() => {
    guide.close({ silent: true });
    const overlay = document.getElementById('viewGuideOverlay');
    if (overlay) overlay.remove();
    document.body.innerHTML = '<button id="sbViewGuideBtn" aria-expanded="false"></button>';
    guide._contextOverride = () => ({ module: 'univariate', key: 'histogram', label: 'Histogram' });
    guide._keyBound = false;
  });

  test('every univariate view has purpose, interaction, reading, and limits', () => {
    UNIVARIATE_KEYS.forEach((key) => {
      const entry = guide.resolve({ module: 'univariate', key });
      expect(entry).toBeTruthy();
      expect(entry.sections.map((section) => section.id)).toEqual(REQUIRED);
      entry.sections.forEach((section) => {
        const text = [].concat(section.paragraphs || [], section.items || []).join(' ');
        expect(text.trim().length).toBeGreaterThan(20);
      });
    });
  });

  test('stays closed until the user opens it', () => {
    expect(document.getElementById('viewGuideOverlay')).toBeNull();
    expect(guide.isOpen()).toBe(false);
    guide.sync();
    expect(guide.isOpen()).toBe(false);
    expect(document.getElementById('viewGuideOverlay')).toBeNull();
  });

  test('opens the guide for the current view and swaps content when the view changes', () => {
    guide.open();
    const body = document.getElementById('viewGuideBody');
    expect(guide.isOpen()).toBe(true);
    expect(document.getElementById('viewGuideOverlay').hidden).toBe(false);
    expect(body.textContent).toMatch(/Binning Method/);
    expect(body.textContent).toMatch(/does not test normality/i);
    expect(document.getElementById('sbViewGuideBtn').getAttribute('aria-expanded')).toBe('true');

    guide._contextOverride = () => ({ module: 'univariate', key: 'hypothesis', label: 'One-sample test' });
    guide.sync();
    expect(guide.isOpen()).toBe(true);
    expect(document.getElementById('viewGuideBody').textContent).toMatch(/Run the Test/);
    expect(document.getElementById('viewGuideBody').textContent).not.toMatch(/Binning Method/);

    guide.close();
    expect(guide.isOpen()).toBe(false);
    expect(document.getElementById('viewGuideOverlay').hidden).toBe(true);
    expect(document.getElementById('sbViewGuideBtn').getAttribute('aria-expanded')).toBe('false');
  });

  test('maps the by-group page onto the statistics guide', () => {
    const entry = guide.resolve({ module: 'univariate', key: 'by-group' });
    expect(entry.title).toMatch(/Grouped statistics/);
  });

  test('every other analytic view has the same four sections', () => {
    const modules = Object.keys(guide._guides).filter((name) => name !== 'univariate');
    expect(modules.length).toBeGreaterThan(10);
    modules.forEach((moduleName) => {
      const table = guide._guides[moduleName];
      expect(Object.keys(table).length).toBeGreaterThan(0);
      Object.keys(table).forEach((key) => {
        const entry = guide.resolve({ module: moduleName, key });
        expect(entry).toBeTruthy();
        expect(entry.sections.map((section) => section.id)).toEqual(REQUIRED);
        entry.sections.forEach((section) => {
          const text = [].concat(section.paragraphs || [], section.items || []).join(' ');
          expect(text.trim().length).toBeGreaterThan(20);
        });
      });
    });
    expect(guide.resolve({ module: 'independent', key: 'independent-results' }).title).toMatch(/Test results/);
    expect(guide.resolve({ module: 'power', key: 'power-sbMeans' }).sections[0].paragraphs.join(' ')).toMatch(/not available yet/);
    expect(guide.resolve({ module: 'logistic', key: 'logistic-model-results-overview' }).title).toMatch(/overview/i);
    ['capability-setup', 'capability-results', 'capability-planner', 'capability-by-group'].forEach((key) => {
      expect(guide.resolve({ module: 'capability', key: key })).toBeTruthy();
    });
    expect(guide.resolve({ module: 'capability', key: 'capability-results' }).sections[3].items.join(' ')).toMatch(/not within-process Cp and Cpk/i);
  });
});
