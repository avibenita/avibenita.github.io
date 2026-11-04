import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

export const WORKFLOW_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(WORKFLOW_DIR, '..', '..');

export const SETUP_TEXT = `OpenAI API key
1. Create a key at https://platform.openai.com/api-keys
2. Do not paste the key into this chat, a source file, or a commit.
3. In a Windows terminal, store it for your user account (replace the placeholder locally):
   setx OPENAI_API_KEY "your-key"
4. Close this window and open a new one. setx does not update the current process.
5. From the Statistico folder run: npm run video:doctor
   The doctor line should read: OpenAI API key: present, not authenticated by this check.
6. Spending stays inside Statistico/video-workflow/limits.json (maxEstimatedUsd). That figure is a local estimate, not a bill.

Cursor agent CLI, only for unattended revisions
1. In PowerShell: irm 'https://cursor.com/install?win32=true' | iex
2. Open a new terminal and run: agent login
   Or set CURSOR_API_KEY the same way as the OpenAI key. It is a Cursor user key, not the OpenAI key.
3. Until agent is on PATH, reviews and reports still run. Fully unattended edits stay blocked. The controller applies a revision only from a validated patch, and it does not give the agent write access to the production tree.

Voice
The narrator is edge-tts through the installed Python launcher (py -3), voice en-US-AriaNeural. No separate voice key. A stem is regenerated only when its spoken line changes.`;

export function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

export function exists(file) {
  return fs.existsSync(file);
}

export function repoPath(rel) {
  return path.join(REPO_ROOT, rel);
}

export function loadModule(moduleId) {
  const file = path.join(WORKFLOW_DIR, 'modules', `${moduleId}.json`);
  if (!exists(file)) throw new Error(`Unknown module "${moduleId}". Expected ${file}`);
  const config = readJson(file);
  const limits = readJson(repoPath(config.limits));
  return { config, limits, configPath: file };
}

export function findFfmpeg() {
  if (process.env.FFMPEG && exists(process.env.FFMPEG)) return process.env.FFMPEG;
  const bundled = 'C:/Users/Avi Benita/AppData/Local/Programs/Python/Python314/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe';
  if (exists(bundled)) return bundled;
  const found = spawnSync('where', ['ffmpeg'], { encoding: 'utf8' });
  const line = (found.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return line || null;
}

export function findAgent() {
  const candidates = [
    process.env.CURSOR_AGENT,
    path.join(process.env.LOCALAPPDATA || '', 'cursor-agent', 'agent.cmd'),
    path.join(process.env.USERPROFILE || '', '.local', 'bin', 'agent.exe')
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }
  const found = spawnSync('where', ['agent'], { encoding: 'utf8' });
  const line = (found.stdout || '').split(/\r?\n/).map((s) => s.trim()).find((item) => item && !/system32\\agent/i.test(item));
  return line || null;
}

export function keyState(name) {
  const value = process.env[name];
  if (!value) return 'absent';
  return 'present, not authenticated by this check';
}

export function runProcess(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    encoding: 'utf8',
    env: options.env || process.env,
    timeout: options.timeoutMs || 0,
    maxBuffer: options.maxBuffer || 32 * 1024 * 1024,
    shell: options.shell || false
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error || null
  };
}

export function spawnTracked(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || REPO_ROOT,
    env: options.env || process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const done = new Promise((resolve, reject) => {
    const timer = options.timeoutMs
      ? setTimeout(() => {
        child.kill();
        reject(new Error(`Timed out after ${options.timeoutMs} ms: ${command}`));
      }, options.timeoutMs)
      : null;
    child.on('error', (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
  });
  return { child, done };
}

export function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

export function acquireLock(lockPath) {
  if (exists(lockPath)) {
    try {
      const current = readJson(lockPath);
      if (current.pid && current.pid !== process.pid && pidAlive(current.pid)) {
        const error = new Error(`another video run is already active (pid ${current.pid})`);
        error.code = 'LOCKED';
        throw error;
      }
    } catch (error) {
      if (error.code === 'LOCKED') throw error;
    }
  }
  writeJson(lockPath, { pid: process.pid, at: new Date().toISOString() });
  return () => {
    if (exists(lockPath)) {
      try {
        const current = readJson(lockPath);
        if (current.pid === process.pid) fs.rmSync(lockPath);
      } catch (_error) {
        fs.rmSync(lockPath, { force: true });
      }
    }
  };
}

export function hashFiles(files) {
  const out = {};
  for (const file of files) {
    if (exists(file)) out[file] = sha256File(file);
  }
  return out;
}

export function relativeTo(root, file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

export function isUnder(file, prefixes) {
  const rel = file.replace(/\\/g, '/');
  return prefixes.some((prefix) => rel === prefix.replace(/\/$/, '') || rel.startsWith(prefix));
}

export function captureBytes(root, prefixes) {
  const bytes = {};
  for (const prefix of prefixes) {
    const full = path.join(root, prefix);
    if (!exists(full)) continue;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const child = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(child);
        else if (entry.isFile()) bytes[relativeTo(root, child)] = fs.readFileSync(child);
      }
    };
    if (fs.statSync(full).isDirectory()) walk(full);
    else bytes[relativeTo(root, full)] = fs.readFileSync(full);
  }
  return bytes;
}

export function restoreBytes(root, before, prefixes) {
  const current = captureBytes(root, prefixes);
  for (const rel of Object.keys(current)) {
    if (!Object.prototype.hasOwnProperty.call(before, rel)) fs.rmSync(path.join(root, rel), { force: true });
  }
  for (const [rel, data] of Object.entries(before)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
  }
}

export function diffBytes(root, before, prefixes) {
  const after = captureBytes(root, prefixes);
  const changes = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const rel of keys) {
    const left = before[rel];
    const right = after[rel];
    if (!left && right) changes.push({ path: rel, change: 'added' });
    else if (left && !right) changes.push({ path: rel, change: 'deleted' });
    else if (Buffer.compare(left, right) !== 0) changes.push({ path: rel, change: 'modified' });
  }
  return changes;
}

export function ffmpegText(ffmpeg, args) {
  const result = runProcess(ffmpeg, args, { maxBuffer: 64 * 1024 * 1024 });
  return `${result.stdout}\n${result.stderr}`;
}

export function openFolder(dir) {
  if (process.env.VIDEO_AUTO_NO_OPEN === '1') return;
  const child = spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore', shell: false });
  child.unref();
}
