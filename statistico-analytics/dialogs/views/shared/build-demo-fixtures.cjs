/* Rebuild dialogs/views/shared/demo-fixtures.js from demo-pack. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'demo-pack');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'));

function parseCsv(text) {
  text = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
          continue;
        }
        quoted = false;
        continue;
      }
      cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    if (c === '\r') continue;
    cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(function (line) { return !(line.length === 1 && line[0] === ''); });
}

function coerce(value, type) {
  const kind = String(type || '');
  if (kind === 'number' || kind === 'integer' || kind.indexOf('mixed') === 0) {
    if (value === '') return '';
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  }
  return value;
}

const tables = {};
catalog.modules.forEach(function (mod) {
  const parsed = parseCsv(fs.readFileSync(path.join(root, mod.asset), 'utf8'));
  const headers = parsed[0].slice();
  const rows = parsed.slice(1).map(function (line) {
    return headers.map(function (header, index) {
      return coerce(line[index] == null ? '' : line[index], mod.field_types[header]);
    });
  });
  if (rows.length !== mod.row_count) {
    throw new Error(mod.id + ' row count ' + rows.length + ' != ' + mod.row_count);
  }
  tables[mod.id] = {
    id: mod.id,
    title: mod.title,
    module: mod.module,
    groupField: mod.group_field || '',
    mode: mod.mode || '',
    roles: mod.roles || {},
    settings: mod.suggested_settings || {},
    headers: headers,
    rows: rows
  };
});

const scenarios = (catalog.calculator_scenarios || []).map(function (item) {
  return {
    id: item.id,
    module: item.module,
    title: item.title,
    mode: item.mode || '',
    groupField: item.group_field || '',
    scenarios: item.scenarios || []
  };
});

const body = '/* Generated from demo-pack catalog and CSVs. Rebuild with build-demo-fixtures.js. */\n' +
  '(function (root) {\n  "use strict";\n  root.StatisticoDemoFixtures = ' +
  JSON.stringify({ version: 1, tables: tables, scenarios: scenarios }) +
  ';\n})(typeof window !== "undefined" ? window : globalThis);\n';

fs.writeFileSync(path.join(__dirname, 'demo-fixtures.js'), body);
console.log('wrote demo-fixtures.js', Object.keys(tables).length, 'tables', scenarios.length, 'scenarios', body.length, 'bytes');
