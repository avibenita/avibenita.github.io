import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const offline = process.argv.includes('--offline');
const contractPath = path.join(root, 'statistico-analytics', 'taskpane', 'independent', 'independent-contract.js');
await import(pathToFileURL(contractPath).href);
const contract = globalThis.StatisticoIndependentContract;
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'Statistico', 'independent', '01_source', 'fixtures.json'), 'utf8'));
const reference = JSON.parse(fs.readFileSync(path.join(root, 'Statistico', 'independent', '01_source', 'reference.json'), 'utf8'));
const failures = [];

function near(label, actual, expected, tolerance) {
  const delta = Math.abs(actual - expected);
  if (!Number.isFinite(actual) || delta > tolerance) failures.push(`${label}: expected ${expected}, got ${actual}`);
}

const groups = contract.groupsFromFixture(fixture);
near('n A', groups.a.length, 30, 0);
near('n B', groups.b.length, 30, 0);
near('mean A', contract.mean(groups.a), 65, 0.02);
near('mean B', contract.mean(groups.b), 71, 0.02);
near('sd A', Math.sqrt(contract.variance(groups.a)), 10, 0.02);
near('sd B', Math.sqrt(contract.variance(groups.b)), 10, 0.02);

const welch = contract.computeWelch(groups.a, groups.b, 'two-sided', 0.05);
const welch01 = contract.computeWelch(groups.a, groups.b, 'two-sided', 0.01);
near('A minus B', welch.diff, -6, 1e-4);
near('Welch t', welch.t, reference.welch_t, 1e-6);
near('Welch df', welch.df, 58, 1e-4);
near('Welch p', welch.p, reference.scipy_welch_p, 1e-8);
near('CI low', welch.ciLow, reference.scipy_welch_ci95[0], 1e-4);
near('CI high', welch.ciHigh, reference.scipy_welch_ci95[1], 1e-4);
if (!(Math.abs(welch01.ciHigh - welch01.ciLow) > Math.abs(welch.ciHigh - welch.ciLow) + 0.5)) {
  failures.push('alpha .01 did not widen the Welch interval');
}
if (welch01.p !== welch.p || welch01.diff !== welch.diff) failures.push('alpha changed the Welch p-value or estimate');
if (!(welch.p < 0.05) || welch.p < 0.01) failures.push('alpha .05/.01 decision did not change for this fixture');

const student = contract.computeStudent([1, 2, 3, 4, 5], [0, 10, 20, 40], 'two-sided', 0.05);
const welchUnequal = contract.computeWelch([1, 2, 3, 4, 5], [0, 10, 20, 40], 'two-sided', 0.05);
if (Math.abs(student.t - welchUnequal.t) < 0.05 || student.df === welchUnequal.df) {
  failures.push('unequal-n pooled Student matched Welch; a pooled result must not pass as Welch');
}

near('eta-squared', contract.etaSquared(groups.a, groups.b), 0.0851735016, 1e-6);
if (contract.balanceGroupTotal(89, 2) !== 90 || contract.balanceGroupTotal(201, 2) !== 202) {
  failures.push('balanced allocation did not map 89 to 90 and 201 to 202');
}
const mann = contract.computeMannWhitney(groups.a, groups.b, 'two-sided');
near('Mann-Whitney U', mann.u, 309, 0);
near('Mann-Whitney p', mann.p, 0.03710526255, 2e-5);
if (mann.continuity !== 'none') failures.push('Mann-Whitney continuity policy changed');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Offline numerical contract passed for seed 110401.');

if (offline) process.exit(0);

const browser = spawnSync(process.execPath, [path.join(root, 'Statistico', 'independent', 'produce', 'capture.mjs'), 'numbers'], {
  cwd: root,
  encoding: 'utf8',
  timeout: 180000
});
if (browser.status !== 0) {
  console.error((browser.stderr || browser.stdout || '').slice(-3000));
  process.exit(browser.status || 1);
}
console.log('Browser numerical check passed.');
process.exit(0);
