const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, 'hub-range.js'), 'utf8');
const sandbox = {
  console: console,
  Math: Math,
  Number: Number,
  String: String,
  Array: Array,
  Object: Object,
  JSON: JSON,
  parseFloat: parseFloat,
  isFinite: isFinite,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  document: {
    addEventListener: function () {},
    getElementById: function () { return null; }
  },
  Office: { onReady: function () {} }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const patch = sandbox.StatisticoHubRange.patchStoredAnalysis;
const headers = ['ID', 'Score', 'Waiting_Time_min'];
const sheet = [headers, ['N014', 1, 22.6], ['N015', 1, 56], ['N026', 1, 66], ['N049', 1, 37.4]];
const stored = {
  column: 'Waiting_Time_min',
  columnIndex: 2,
  n: 4,
  values: [22.6, 12, 8, 37.4],
  descriptive: { min: 8, max: 37.4, mean: 20, stdDev: 1, variance: 1 },
  sourceHeaders: headers.slice(),
  sourceRows: [['N014', 1, 22.6], ['N015', 1, 12], ['N026', 1, 8], ['N049', 1, 37.4]]
};

assert.strictEqual(patch(stored, sheet, 'Approximately Normal!A1:C5'), true);
assert.strictEqual(stored.descriptive.max, 66);
assert.strictEqual(stored.descriptive.min, 22.6);
assert.strictEqual(stored.n, 4);
assert.strictEqual(stored.values[1], 56);
assert.strictEqual(stored.sourceRows[2][2], 66);
assert.strictEqual(stored.columnIndex, 2);

const sample = {
  column: 'Waiting_Time_min',
  columnIndex: 2,
  sample: { mode: 'sample', n: 10 },
  values: [1, 2],
  n: 2
};
assert.strictEqual(patch(sample, sheet, 'Approximately Normal!A1:C5'), false);
assert.deepStrictEqual(sample.values, [1, 2]);

const other = { column: 'Horsepower', columnIndex: 0, values: [1], n: 1 };
assert.strictEqual(patch(other, sheet, ''), false);
assert.deepStrictEqual(other.values, [1]);

console.log('hub-range refresh tests passed');
