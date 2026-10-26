'use strict';

/**
 * 2026-10-25 — the component's script runs against the REAL CLI tarball, so a subcommand the CLI does not
 * have goes red. MEASURED before: the job ran `coderifts check --base … --fail …`; coderifts 8.8.0 answers
 * "error: unknown command 'check'" (exit 1), and nothing ran the template.
 *
 * The script items are read out of templates/coderifts.yml (a plain item or a `- |` block), the
 * `$[[ inputs.* ]]` are substituted, and they run with `sh -e` in a git checkout whose origin has the base.
 * `apk add` is skipped (the job's image provides apk; this runner may not). The CLI under test:
 * CODERIFTS_CLI_TARBALL, else `npm pack coderifts@latest`.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TEMPLATE = path.join(__dirname, '..', 'templates', 'coderifts.yml');
const SPEC = (paths) => `openapi: 3.0.3\ninfo: {title: t, version: '1'}\npaths:\n${paths.map((p) => `  ${p}:\n    get:\n      responses:\n        '200': {description: ok}\n`).join('')}`;
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts });
let work; let binDir;
const git = (cwd, ...a) => { const r = sh('git', a, { cwd }); assert.equal(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`); };

/** The job's script items, in order: `    - cmd` lines and `    - |` blocks (body indented 6). */
function scriptItems(yml) {
  const lines = yml.split('\n');
  const start = lines.findIndex((l) => /^  script:\s*$/.test(l));
  assert.ok(start >= 0, 'the template has no script:');
  const items = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const l = lines[i];
    if (/^ {4}- \|\s*$/.test(l)) {
      const body = [];
      while (i + 1 < lines.length && (/^ {6}/.test(lines[i + 1]) || lines[i + 1].trim() === '')) body.push(lines[++i].slice(6));
      items.push(body.join('\n'));
    } else if (/^ {4}- /.test(l)) items.push(l.slice(6));
    else if (/^ {2}\S/.test(l) || /^\S/.test(l)) break;
  }
  return items;
}

function render(inputs) {
  return scriptItems(fs.readFileSync(TEMPLATE, 'utf8'))
    .filter((s) => !/^apk /.test(s))
    .map((s) => s.replace(/\$\[\[ inputs\.(\w+) \]\]/g, (_, k) => inputs[k]));
}

function installCli() {
  let tgz = process.env.CODERIFTS_CLI_TARBALL;
  if (!tgz) {
    const r = sh('npm', ['pack', 'coderifts@latest', '--silent'], { cwd: work });
    assert.equal(r.status, 0, r.stderr);
    tgz = path.join(work, r.stdout.trim().split('\n').pop());
  }
  const prefix = path.join(work, 'cli');
  assert.equal(sh('npm', ['install', '-g', '--prefix', prefix, '--no-audit', '--no-fund', tgz]).status, 0);
  return path.join(prefix, 'bin');
}

function repo(headPaths) {
  const dir = fs.mkdtempSync(path.join(work, 'repo-'));
  const origin = `${dir}-origin.git`;
  git(work, 'init', '-q', '--bare', origin);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.invalid'); git(dir, 'config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'api'));
  fs.writeFileSync(path.join(dir, 'api', 'openapi.yaml'), SPEC(['/a', '/b']));
  git(dir, 'add', '.'); git(dir, 'commit', '-q', '-m', 'base');
  git(dir, 'remote', 'add', 'origin', origin); git(dir, 'push', '-q', 'origin', 'main');
  git(dir, 'checkout', '-q', '-b', 'feature');
  fs.writeFileSync(path.join(dir, 'api', 'openapi.yaml'), SPEC(headPaths));
  git(dir, 'commit', '-q', '-am', 'head', '--allow-empty');
  return dir;
}

function runJob(dir, inputs) {
  const all = { api_key: 'test-not-used', base_branch: 'main', fail_on_breaking: 'true', spec_path: 'api/openapi.yaml', ...inputs };
  for (const item of render(all)) {
    const r = sh('sh', ['-ec', item], { cwd: dir, env: { PATH: `${binDir}:${process.env.PATH}`, HOME: process.env.HOME, CODERIFTS_API_KEY: all.api_key } });
    if (r.status !== 0) return r;
  }
  return { status: 0, stdout: '', stderr: '' };
}

describe('gitlab component × the real CLI', { timeout: 300000 }, () => {
  before(() => { work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cr-gl-'))); binDir = installCli(); });
  after(() => fs.rmSync(work, { recursive: true, force: true }));

  it('no script item runs `coderifts check` (a comment recording that it did is history, not a call)', () => {
    for (const item of scriptItems(fs.readFileSync(TEMPLATE, 'utf8'))) assert.doesNotMatch(item, /coderifts check\b/);
  });
  it('negative control: this CLI refuses `coderifts check`', () => {
    const r = sh(path.join(binDir, 'coderifts'), ['check', '--base', 'main']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /unknown command 'check'/);
  });
  it('a removed path, fail_on_breaking "true" → the job fails (exit 1), the CLI knew the command', () => {
    const r = runJob(repo(['/a']), {});
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.doesNotMatch(r.stderr, /unknown command/);
  });
  it('the same break, fail_on_breaking "false" → the job passes', () => {
    assert.equal(runJob(repo(['/a']), { fail_on_breaking: 'false' }).status, 0);
  });
  it('an unchanged contract → the job passes', () => {
    assert.equal(runJob(repo(['/a', '/b']), {}).status, 0);
  });
});
