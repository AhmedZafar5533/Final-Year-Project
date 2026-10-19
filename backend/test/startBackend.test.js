import assert from 'node:assert/strict';
import { test } from 'node:test';
import { serviceDefinitions, terminalArguments } from '../scripts/startBackend.js';

test('all backend components have distinct service commands and transcript port does not inherit API port', () => {
  const services = serviceDefinitions({ searxngUrl: 'http://127.0.0.1:8083', serviceUrl: 'http://127.0.0.1:8004' }, { PORT: '5002' });
  assert.deepEqual(services.map(service => service.id), ['api', 'worker', 'searxng', 'collector', 'transcripts']);
  assert.equal(services.find(service => service.id === 'api').port, 5002);
  assert.equal(services.find(service => service.id === 'transcripts').env.PORT, '8000');
  assert.equal(services.find(service => service.id === 'searxng').port, 8083);
  assert.equal(services.find(service => service.id === 'collector').port, 8004);
  assert.deepEqual(services.find(service => service.id === 'searxng').args, ['scripts/researchServices.js', 'searxng']);
  assert.deepEqual(services.find(service => service.id === 'collector').args, ['scripts/researchServices.js', 'collector']);
});

test('terminal launches preserve spaces and shell metacharacters as literal arguments', () => {
  const executable = '/a project/node';
  const script = '/a project/$(literal)/startBackend.js';
  for (const terminal of ['konsole', 'gnome-terminal', 'xterm']) {
    const args = terminalArguments(terminal, "Creator's service", executable, [script, '--service', 'worker']);
    assert.equal(args.at(-4), executable);
    assert.deepEqual(args.slice(-3), [script, '--service', 'worker']);
    assert.ok(!args.includes('bash'));
    assert.ok(!args.includes('-c'));
  }
});

test('unsupported terminal types fail with an actionable message', () => {
  assert.throws(() => terminalArguments('unknown', 'Title', 'node', []), /Konsole, GNOME Terminal, or xterm/);
});
