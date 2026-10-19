import { spawn } from 'node:child_process';
import { accessSync, constants, existsSync, mkdirSync, openSync, closeSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { researchConfig } from '../config/research.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const script = fileURLToPath(import.meta.url);
const backend = path.join(root, 'backend');
const lockDirectory = path.join(backend, '.runtime');

export function serviceDefinitions(config, env = process.env) {
  return [
    { id: 'api', title: 'OnlyCreators · API', cwd: backend, command: process.execPath, args: ['index.js'], host: '127.0.0.1', port: Number(env.PORT || 5000) },
    { id: 'worker', title: 'OnlyCreators · Research worker', cwd: backend, command: process.execPath, args: ['workers/ideaResearchWorker.js'] },
    ...[['searxng', 'SearXNG', config.searxngUrl], ['collector', 'Page collector', config.serviceUrl]].map(([id, label, address]) => {
      const url = new URL(address);
      return { id, title: 'OnlyCreators · ' + label, cwd: backend, command: process.execPath,
        args: ['scripts/researchServices.js', id], host: url.hostname, port: Number(url.port || 80) };
    }),
    { id: 'transcripts', title: 'OnlyCreators · Transcripts', cwd: path.join(root, 'sentiment_service'),
      command: 'bash', args: ['start.sh'], host: '127.0.0.1', port: Number(env.TRANSCRIPT_PORT || 8000),
      env: { PORT: env.TRANSCRIPT_PORT || '8000' } }
  ];
}

export function terminalArguments(name, title, executable, args) {
  if (name === 'konsole') return ['--separate', '-p', 'tabtitle=' + title, '-e', executable, ...args];
  if (name === 'gnome-terminal') return ['--window', '--title=' + title, '--', executable, ...args];
  if (name === 'xterm') return ['-T', title, '-e', executable, ...args];
  throw new Error('Supported terminals: Konsole, GNOME Terminal, or xterm.');
}

function findTerminal() {
  for (const name of ['konsole', 'gnome-terminal', 'xterm']) {
    for (const directory of (process.env.PATH || '').split(path.delimiter)) {
      const executable = path.join(directory, name);
      try { accessSync(executable, constants.X_OK); return { name, executable }; } catch { /* Continue searching. */ }
    }
  }
  throw new Error('No supported terminal found. Install Konsole, GNOME Terminal, or xterm.');
}

async function listening(service) {
  if (!service.port) return false;
  return new Promise(resolve => {
    const socket = net.createConnection({ host: service.host, port: service.port });
    const done = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(700, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

function acquireLock(id) {
  mkdirSync(lockDirectory, { recursive: true });
  const filename = path.join(lockDirectory, id + '.pid');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const descriptor = openSync(filename, 'wx', 0o600);
      writeFileSync(descriptor, String(process.pid)); closeSync(descriptor);
      return () => { try { if (readFileSync(filename, 'utf8') === String(process.pid)) unlinkSync(filename); } catch { /* Already removed. */ } };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const pid = Number(readFileSync(filename, 'utf8'));
      try { process.kill(pid, 0); return null; }
      catch (failure) {
        if (failure.code !== 'ESRCH') return null;
        try { unlinkSync(filename); } catch { /* Another launcher handled it. */ }
      }
    }
  }
  return null;
}

async function runService(service) {
  const release = acquireLock(service.id);
  if (!release) { console.log(`${service.title} is already managed by the launcher.`); return; }
  process.once('exit', release);
  if (await listening(service)) {
    console.log(`${service.title}: port ${service.port} is already in use; leaving the existing process alone.`);
    release(); return;
  }
  console.log(service.title + '\nCtrl+C stops this service.');
  const child = spawn(service.command, service.args, { cwd: service.cwd,
    env: { ...process.env, ...service.env }, stdio: 'inherit', detached: true });
  const stop = () => { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Child already stopped. */ } };
  process.once('SIGINT', stop); process.once('SIGTERM', stop); process.once('SIGHUP', stop);
  await new Promise(resolve => {
    child.once('error', error => { console.error(error.message); process.exitCode = 1; resolve(); });
    child.once('exit', code => { process.exitCode = code || 0; resolve(); });
  });
  release();
  if (process.stdin.isTTY) {
    console.log('\nService stopped. Press Enter to close this terminal.');
    process.stdin.resume(); process.stdin.once('data', () => process.stdin.pause());
  }
}

export async function main(args = process.argv.slice(2)) {
  if (!existsSync(path.join(backend, '.env'))) throw new Error('Populate backend/.env before starting the backend services.');
  dotenv.config({ path: path.join(backend, '.env'), quiet: true });
  const services = serviceDefinitions(researchConfig());
  if (args[0] === '--service') {
    const service = services.find(item => item.id === args[1]);
    if (!service) throw new Error('Unknown backend service.');
    await runService(service); return;
  }
  if (args.some(arg => arg !== '--dry-run')) throw new Error('Usage: ./start-backend.sh [--dry-run]');
  const terminal = findTerminal();
  if (!args.includes('--dry-run') && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    throw new Error('Run this command from your Linux desktop terminal so service windows can open.');
  }
  for (const service of services) {
    const argv = terminalArguments(terminal.name, service.title, process.execPath, [script, '--service', service.id]);
    if (args.includes('--dry-run')) console.log(JSON.stringify({ service: service.id, terminal: terminal.name, args: argv }));
    else await new Promise((resolve, reject) => {
      const child = spawn(terminal.executable, argv, { cwd: root, detached: true, stdio: 'ignore' });
      child.once('error', reject); child.once('spawn', () => { child.unref(); console.log('Opened ' + service.title); resolve(); });
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
