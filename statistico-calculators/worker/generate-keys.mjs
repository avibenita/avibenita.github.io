/**
 * generate-keys.mjs
 * Run:  node generate-keys.mjs 5
 *
 * Prints N license keys and the wrangler commands to add them to KV.
 * Copy-paste the commands, or pipe them to a shell.
 */

import { randomBytes } from 'crypto';

const count = parseInt(process.argv[2] || '5', 10);
const plan  = process.argv[3] || 'pro';
const today = new Date().toISOString().slice(0, 10);

for (let i = 0; i < count; i++) {
  const key = 'STAT-' +
    randomBytes(2).toString('hex').toUpperCase() + '-' +
    randomBytes(2).toString('hex').toUpperCase() + '-' +
    randomBytes(2).toString('hex').toUpperCase();

  const meta = JSON.stringify({ plan, created: today });

  console.log(`\n# Key: ${key}`);
  console.log(`npx wrangler kv:key put --binding=LICENSE_KV "${key}" '${meta}'`);
}
