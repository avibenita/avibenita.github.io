import path from 'path';
import { fileURLToPath } from 'url';
import { runAuto, runDemo } from './controller.mjs';
import { doctorLines } from './producer.mjs';
import { REPO_ROOT, SETUP_TEXT, loadModule } from './util.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) out.flags[key] = true;
      else {
        out.flags[key] = next;
        i += 1;
      }
    } else out._.push(token);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] || 'auto';

if (command === 'doctor') {
  const { config, limits } = loadModule('independent-means');
  const report = doctorLines(REPO_ROOT, config, limits);
  for (const line of report.lines) console.log(line);
  if (report.failed) {
    console.log('Stopped: setup is incomplete. Fix the missing tool or input above, then run doctor again.');
    process.exit(1);
  }
  console.log('Setup check finished. Credential presence is not authentication.');
  process.exit(0);
}

if (command === 'demo') {
  const result = await runDemo({ log: (line) => console.log(line) });
  console.log(result.report || result.status);
  console.log('SIMULATED result. It is not the Independent Means pilot.');
  process.exit(result.code || 0);
}

if (command === 'auto') {
  const moduleId = args.flags.module || 'independent-means';
  const loaded = loadModule(moduleId);
  const result = await runAuto({
    root: REPO_ROOT,
    config: loaded.config,
    limits: loaded.limits,
    configPath: loaded.configPath,
    dryRun: Boolean(args.flags['dry-run']),
    resume: args.flags.resume && args.flags.resume !== true ? args.flags.resume : null,
    importFile: args.flags.import && args.flags.import !== true ? path.resolve(args.flags.import) : null,
    reveal: true,
    log: (line) => console.log(line)
  });
  if (result.report) console.log(result.report);
  if (result.code) {
    if (!String(result.stoppedReason || '').includes('OPENAI_API_KEY')) console.log(SETUP_TEXT);
    process.exit(result.code);
  }
  process.exit(0);
}

console.log(`Unknown command. Use doctor, auto, or demo.\nWorkflow directory: ${here}`);
process.exit(1);
