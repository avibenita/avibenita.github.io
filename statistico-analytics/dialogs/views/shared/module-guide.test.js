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
    parentNode: null,
    attributes: {},
    textContent: '',
    _html: '',
    style: {},
    listeners: {}
  };
  const classes = new Set();
  el.classList = {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    toggle: (name, force) => {
      const next = force === undefined ? !classes.has(name) : !!force;
      if (next) classes.add(name);
      else classes.delete(name);
      return next;
    },
    contains: (name) => classes.has(name)
  };
  el.setAttribute = (name, value) => { el.attributes[name] = String(value); };
  el.getAttribute = (name) => (name in el.attributes ? el.attributes[name] : null);
  el.addEventListener = (type, fn) => { el.listeners[type] = fn; };
  el.focus = () => {};
  el.remove = () => {
    if (el.parentNode && el.parentNode.children) {
      el.parentNode.children = el.parentNode.children.filter((child) => child !== el);
    }
    if (el.id && el.ownerDocument) delete el.ownerDocument._ids[el.id];
  };
  el.querySelector = (sel) => {
    if (sel === '.mg-title') return el._title || null;
    if (sel === '.mg-body') return el._body || null;
    if (sel === '.mg-close') return el._close || null;
    return null;
  };
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return el._html; },
    set(value) {
      el._html = String(value);
      el.textContent = el._html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (el.id === 'moduleGuideOverlay' || String(el.className).indexOf('mg-overlay') !== -1) {
        const title = createEl('h2');
        title.id = 'moduleGuideTitle';
        const body = createEl('div');
        body.id = 'moduleGuideBody';
        const close = createEl('button');
        title.ownerDocument = el.ownerDocument;
        body.ownerDocument = el.ownerDocument;
        el._title = title;
        el._body = body;
        el._close = close;
        if (el.ownerDocument) {
          el.ownerDocument._ids.moduleGuideTitle = title;
          el.ownerDocument._ids.moduleGuideBody = body;
        }
      }
    }
  });
  return el;
}

function installDocument(target) {
  const document = {
    _ids: {},
    body: createEl('body'),
    head: createEl('head'),
    documentElement: createEl('html'),
    getElementById(id) { return this._ids[id] || null; },
    createElement: (tag) => {
      const el = createEl(tag);
      el.ownerDocument = document;
      const assign = (id) => { if (id) document._ids[id] = el; };
      let current = '';
      Object.defineProperty(el, 'id', {
        configurable: true,
        get() { return current; },
        set(value) { current = value; assign(value); }
      });
      return el;
    },
    addEventListener() {},
    contains: () => true
  };
  document.body.ownerDocument = document;
  document.body.appendChild = (el) => {
    document.body.children = document.body.children || [];
    document.body.children.push(el);
    el.parentNode = document.body;
    if (el.id) document._ids[el.id] = el;
  };
  document.head.appendChild = document.body.appendChild;
  target.document = document;
  return document;
}

const realm = {};
realm.globalThis = realm;
realm.window = realm;
realm.console = console;
installDocument(realm);
global.document = realm.document;
vm.createContext(realm);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'module-guide.js'), 'utf8'), realm);

const REQUIRED = ['does', 'when', 'data', 'works', 'obtain', 'cautions', 'other', 'refs'];
const MODULES = [
  'univariate', 'correlations', 'contingency', 'independent', 'dependent', 'anova',
  'regression', 'logistic', 'mixed-model', 'factor', 'pca', 'reliability', 'cluster',
  'meta-analysis', 'power', 'capability'
];

describe('Univariate module guide', () => {
  const guide = realm.StatisticoModuleGuide;
  const document = realm.document;

  beforeEach(() => {
    guide.close({ silent: true });
    const overlay = document.getElementById('moduleGuideOverlay');
    if (overlay && overlay.remove) overlay.remove();
    guide._moduleOverride = 'univariate';
    guide._keyBound = false;
  });

  test('covers the eight method sections and keeps the opening short', () => {
    MODULES.forEach((name) => {
      const entry = guide.resolve(name);
      expect(entry).toBeTruthy();
      expect(entry.sections.map((part) => part.id)).toEqual(REQUIRED);
      expect(entry.lead.length).toBeGreaterThan(40);
      expect(entry.lead.length).toBeLessThan(520);
      const works = entry.sections.find((part) => part.id === 'works');
      expect(works.detail.title).toMatch(/Mathematical background/);
      entry.sections.forEach((part) => {
        const text = [].concat(part.paragraphs, part.items).join(' ');
        expect(text.trim().length).toBeGreaterThan(20);
      });
    });
    expect(guide.resolve('univariate').lead).toMatch(/do not establish a cause/i);
    expect(guide.resolve('logistic').lead).toMatch(/do not establish causation/i);
    expect(guide.resolve('power').lead).toMatch(/not the probability that a hypothesis is true/i);
    expect(guide.resolve('capability').lead).toMatch(/do not prove the process is stable/i);
    expect(guide.buttonLabel('capability')).toBe('About process capability');
  });

  test('stays closed until opened, then shows the lead with collapsed sections', () => {
    expect(document.getElementById('moduleGuideOverlay')).toBeNull();
    expect(guide.isOpen()).toBe(false);
    guide.open('univariate');
    const body = document.getElementById('moduleGuideBody');
    expect(guide.isOpen()).toBe(true);
    expect(body.textContent).toMatch(/monthly spend/);
    expect(body._html).toMatch(/<details class="mg-section"/);
    expect(body._html).not.toMatch(/<details class="mg-section" open/);
    expect(body._html).toMatch(/Mathematical background/);
    guide.close();
    expect(guide.isOpen()).toBe(false);
    expect(document.getElementById('moduleGuideOverlay').hidden).toBe(true);
  });

  test('other modules can register the same drawer later', () => {
    expect(guide.has('not-yet')).toBe(false);
    guide.register('not-yet', {
      title: 'Later module',
      lead: 'A placeholder.',
      sections: []
    });
    expect(guide.resolve('not-yet').title).toMatch(/Later module/);
    delete guide._guides['not-yet'];
  });
});
