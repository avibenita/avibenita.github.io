const fs = require('fs');
const vm = require('vm');
const path = require('path');

const sandbox = { window: {}, console: console };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'demo-fixtures.js'), 'utf8'), sandbox);
const tables = sandbox.window.StatisticoDemoFixtures.tables;

function col(table, name) {
  const index = table.headers.indexOf(name);
  if (index < 0) throw new Error('missing ' + name + ' in ' + table.id);
  return index;
}
function values(table, name) {
  const index = col(table, name);
  return table.rows.map(function (row) { return row[index]; });
}
function fail(message) {
  console.error('FAIL', message);
  process.exitCode = 1;
}

const cap = tables.process_capability;
const lineAt = col(cap, 'line');
const diamAt = col(cap, 'diameter_mm');
const lines = { 'Line A': { n: 0, below: 0, above: 0 }, 'Line B': { n: 0, below: 0, above: 0 } };
cap.rows.forEach(function (row) {
  const bucket = lines[row[lineAt]];
  if (!bucket) return;
  bucket.n += 1;
  if (row[diamAt] < 10) bucket.below += 1;
  if (row[diamAt] > 20) bucket.above += 1;
});
if (lines['Line A'].n !== 100 || lines['Line A'].below !== 0 || lines['Line A'].above !== 0) fail('Line A counts ' + JSON.stringify(lines['Line A']));
if (lines['Line B'].n !== 100 || lines['Line B'].below !== 1 || lines['Line B'].above !== 2) fail('Line B counts ' + JSON.stringify(lines['Line B']));

const ct = tables.contingency_2x2;
const protocol = col(ct, 'protocol');
const issue = col(ct, 'issue_within_30_days');
const freq = col(ct, 'frequency');
const cell = {};
ct.rows.forEach(function (row) {
  const key = row[protocol] + '|' + row[issue];
  cell[key] = (cell[key] || 0) + Number(row[freq]);
});
const a = cell['New protocol|Yes'];
const b = cell['New protocol|No'];
const c = cell['Standard|Yes'];
const d = cell['Standard|No'];
const rr = (a / (a + b)) / (c / (c + d));
if (Math.abs(rr - 0.617) > 0.02) fail('risk ratio ' + rr + ' cells ' + JSON.stringify(cell));

const gage = tables.gage_rr;
const bench = col(gage, 'bench');
const benches = {};
gage.rows.forEach(function (row) { benches[row[bench]] = (benches[row[bench]] || 0) + 1; });
if (benches['Bench A'] !== 60 || benches['Bench B'] !== 60) fail('gage benches ' + JSON.stringify(benches));

const prep = tables.prepare_data;
const units = values(prep, 'units');
const regions = values(prep, 'region_text');
const spaced = regions.filter(function (value) { return typeof value === 'string' && value !== value.trim(); });
const blank = units.filter(function (value) { return value === ''; }).length;
const mixed = units.filter(function (value) { return value === 'unknown'; }).length;
if (!spaced.length) fail('prepare data lost surrounding spaces');
if (blank < 1) fail('prepare data lost blanks');
if (!mixed) fail('prepare data lost nonnumeric units');

function alpha(table, names) {
  const cols = names.map(function (name) { return col(table, name); });
  const rows = table.rows.filter(function (row) {
    return cols.every(function (index) { return typeof row[index] === 'number'; });
  });
  const k = cols.length;
  const itemVar = cols.map(function (index) {
    const xs = rows.map(function (row) { return row[index]; });
    const mean = xs.reduce(function (sum, value) { return sum + value; }, 0) / xs.length;
    return xs.reduce(function (sum, value) { return sum + (value - mean) * (value - mean); }, 0) / (xs.length - 1);
  }).reduce(function (sum, value) { return sum + value; }, 0);
  const totals = rows.map(function (row) {
    return cols.reduce(function (sum, index) { return sum + row[index]; }, 0);
  });
  const mean = totals.reduce(function (sum, value) { return sum + value; }, 0) / totals.length;
  const totalVar = totals.reduce(function (sum, value) { return sum + (value - mean) * (value - mean); }, 0) / (totals.length - 1);
  return (k / (k - 1)) * (1 - itemVar / totalVar);
}
const rel = tables.scale_reliability;
const items = rel.roles.items.slice();
const withSix = alpha(rel, items);
const withoutSix = alpha(rel, items.filter(function (name) { return name !== 'confidence_6'; }));
if (Math.abs(withSix - 0.842) > 0.01) fail('alpha with item 6 ' + withSix);
if (Math.abs(withoutSix - 0.884) > 0.01) fail('alpha without item 6 ' + withoutSix);

const groups = tables.independent_groups;
const training = {};
values(groups, 'training').forEach(function (name) { training[name] = (training[name] || 0) + 1; });
['Standard', 'Coached', 'Self-paced'].forEach(function (name) {
  if (!training[name]) fail('missing training level ' + name);
});

if (!process.exitCode) console.log('demo pack checks passed', JSON.stringify({ rr: Number(rr.toFixed(3)), alpha: Number(withSix.toFixed(3)), alphaOmit: Number(withoutSix.toFixed(3)), lines: lines, benches: benches, spaced: spaced.length, blank: blank, mixed: mixed }));
