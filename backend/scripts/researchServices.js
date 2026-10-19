import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { researchConfig } from '../config/research.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: path.join(root, 'backend/.env'), quiet: true });
const config = researchConfig();
const runtime = path.join(root, 'searxng/.runtime');
const python = folder => path.join(root, folder, '.venv/bin/python');

function command(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: root, stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Command failed (${code}): ${path.basename(executable)}`)));
  });
}

async function setup() {
  if (!existsSync(runtime)) await command('git', ['clone', '--depth', '1', 'https://github.com/searxng/searxng.git', runtime]);
  // Existing project pip can bootstrap isolated environments on Ubuntu without ensurepip.
  const existing = path.join(root, 'sentiment_service/venv/bin/python');
  const bootstrap = existsSync(existing) ? existing : 'python3';
  for (const folder of ['searxng', 'research_service']) {
    await command('python3', ['-m', 'venv', '--without-pip', path.join(root, folder, '.venv')]);
    const requirements = folder === 'searxng' ? path.join(runtime, 'requirements.txt') : path.join(root, folder, 'requirements.txt');
    await command(bootstrap, ['-m', 'pip', '--python', python(folder), 'install', '-r', requirements]);
  }
  console.log('Research dependencies installed. Run npm run research:services.');
}

async function check() {
  let failed = false;
  for (const [name, url, options] of [
    ['Web search', config.searxngUrl + '/search?q=NASA&format=json&categories=general', {}],
    ['Image search', config.searxngUrl + '/search?q=moon&format=json&categories=images', {}],
    ['Page collection', config.serviceUrl + '/collect', { method: 'POST', headers: {
      'Content-Type': 'application/json', Authorization: 'Bearer ' + config.serviceToken
    }, body: JSON.stringify({ url: 'https://www.nasa.gov/' }) }]
  ]) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(25000) });
      const data = await response.json();
      const count = name === 'Page collection' ? data.text?.length || 0 : data.results?.length || 0;
      const good = response.ok && count > 0;
      failed ||= !good;
      console.log(`${good ? 'OK' : 'FAIL'} ${name}: HTTP ${response.status}, ${count} ${name === 'Page collection' ? 'characters' : 'results'}`);
      if (data.unresponsive_engines?.length) console.log('  Unavailable engines:', data.unresponsive_engines.map(item => item[0]).join(', '));
    } catch (error) {
      failed = true;
      console.error(`FAIL ${name}: ${error.cause?.code || error.name}. Start the services and check backend/.env URLs.`);
    }
  }
  process.exitCode = failed ? 1 : 0;
}

function localEndpoint(value, label) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/' || url.search || url.username || url.password) {
    throw new Error(`${label} must be a local HTTP instance root for this launcher. Use research:check for externally managed services.`);
  }
  return url;
}

async function start(only = 'all') {
  if ((only !== 'collector' && (!existsSync(python('searxng')) || !existsSync(runtime))) ||
    (only !== 'searxng' && !existsSync(python('research_service')))) {
    throw new Error('Research dependencies are missing. Run npm run research:setup first.');
  }
  if (only !== 'searxng' && (!config.serviceToken || /^replace_|^your_/i.test(config.serviceToken))) {
    throw new Error('Populate RESEARCH_SERVICE_TOKEN in backend/.env before starting.');
  }
  const search = only === 'collector' ? null : localEndpoint(config.searxngUrl, 'SEARXNG_URL');
  const collector = only === 'searxng' ? null : localEndpoint(config.serviceUrl, 'RESEARCH_SERVICE_URL');
  // Derive local settings from the checked-in configuration, leaving Docker settings intact.
  const settingsPath = path.join(root, 'searxng/.runtime-settings.yml');
  const env = { ...process.env, RESEARCH_SERVICE_TOKEN: config.serviceToken,
    SEARXNG_SETTINGS_PATH: settingsPath, SEARXNG_SECRET: randomBytes(32).toString('hex'),
    SEARXNG_BIND_ADDRESS: '127.0.0.1', SEARXNG_PORT: search?.port || '80',
    SEARXNG_DEBUG: '0', PYTHONUNBUFFERED: '1' };
  if (only !== 'collector') await command(python('searxng'), ['-c',
    "import yaml,json,sys; data=yaml.safe_load(open(sys.argv[1])); data.setdefault('server',{}).update(bind_address='127.0.0.1',port=int(sys.argv[3])); open(sys.argv[2],'w').write(json.dumps(data))",
    path.join(root, 'searxng/settings.yml'), settingsPath, search?.port || '80']);
  const children = [];
  let stopping = false;
  const stop = () => { stopping = true; children.forEach(child => child.kill('SIGTERM')); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  for (const [name, executable, args, cwd] of [
    ['SearXNG', python('searxng'), ['-m', 'searx.webapp'], runtime],
    ['Collector', python('research_service'), ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', collector?.port || '80'], path.join(root, 'research_service')]
  ].filter(([name]) => only === 'all' || name.toLowerCase() === only)) {
    const child = spawn(executable, args, { cwd, env, stdio: 'inherit' });
    children.push(child);
    console.log(`Starting ${name}. Keep this terminal open. Ctrl+C stops the service(s) in this terminal.`);
    child.once('error', error => { console.error(`${name}: ${error.code}`); process.exitCode = 1; stop(); });
    child.once('exit', code => {
      if (!stopping) { console.error(`${name} exited (${code}).`); process.exitCode = 1; stop(); }
    });
  }
}

try {
  const action = process.argv[2] || 'start';
  if (action === 'setup') await setup();
  else if (action === 'check') await check();
  else if (['start', 'searxng', 'collector'].includes(action)) await start(action === 'start' ? 'all' : action);
  else throw new Error('Use start, searxng, collector, setup or check.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
