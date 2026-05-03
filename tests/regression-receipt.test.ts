import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runScan, verifyRegression } from '../src/index.js';

function repo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'regression-receipt-'));
  git(dir, ['init', '-b', 'main']);
  git(dir, ['config', 'user.name', 'Human']);
  git(dir, ['config', 'user.email', 'human@example.com']);
  write(dir, 'src/bug.ts', 'export const fixed = false;\n');
  commit(dir, 'initial');
  return dir;
}
function git(cwd: string, args: string[]): string { return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim(); }
function write(cwd: string, file: string, content: string): void { fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true }); fs.writeFileSync(path.join(cwd, file), content); }
function commit(cwd: string, msg: string): void { git(cwd, ['add', '.']); git(cwd, ['commit', '-m', msg]); }
function event(cwd: string, input: { labels?: string[]; title?: string; body?: string } = {}): string { const file = path.join(cwd, 'event.json'); fs.writeFileSync(file, JSON.stringify({ pull_request: { title: input.title ?? 'change', body: input.body ?? '', labels: (input.labels ?? []).map((name) => ({ name })), user: { login: 'human' } } })); return file; }

describe('regression-receipt', () => {
  it('reports bug-like PRs without a changed test', async () => {
    const cwd = repo();
    const base = git(cwd, ['rev-parse', 'HEAD']);
    write(cwd, 'src/bug.ts', 'export const fixed = true;\n');
    commit(cwd, 'fix bug');
    const result = await runScan({ base, head: 'HEAD', cwd, eventPath: event(cwd, { labels: ['bug'] }) });
    expect(result.findings).toHaveLength(1);
  });

  it('accepts a changed regression test', async () => {
    const cwd = repo();
    const base = git(cwd, ['rev-parse', 'HEAD']);
    write(cwd, 'src/bug.ts', 'export const fixed = true;\n');
    write(cwd, 'src/bug.test.ts', 'expect(true).toBe(true);\n');
    commit(cwd, 'fix bug with test');
    const result = await runScan({ base, head: 'HEAD', cwd, eventPath: event(cwd, { labels: ['bug'] }) });
    expect(result.findings).toHaveLength(0);
  });

  it('accepts a waiver label', async () => {
    const cwd = repo();
    const base = git(cwd, ['rev-parse', 'HEAD']);
    write(cwd, 'src/bug.ts', 'export const fixed = true;\n');
    commit(cwd, 'fix bug');
    const result = await runScan({ base, head: 'HEAD', cwd, eventPath: event(cwd, { labels: ['bug', 'no-regression-test-needed'] }) });
    expect(result.findings).toHaveLength(0);
  });

  it('ignores non-bug PRs', async () => {
    const cwd = repo();
    const base = git(cwd, ['rev-parse', 'HEAD']);
    write(cwd, 'src/bug.ts', 'export const fixed = true;\n');
    commit(cwd, 'refactor');
    const result = await runScan({ base, head: 'HEAD', cwd, eventPath: event(cwd, { title: 'refactor: tidy' }) });
    expect(result.findings).toHaveLength(0);
  });

  it('can verify fail-on-base and pass-on-head with trusted commands', () => {
    const cwd = repo();
    const base = git(cwd, ['rev-parse', 'HEAD']);
    write(cwd, 'check.js', 'const fs = require("fs"); const ok = fs.readFileSync("src/bug.ts", "utf8").includes("true"); process.exit(ok ? 0 : 1);\n');
    write(cwd, 'src/bug.ts', 'export const fixed = true;\n');
    commit(cwd, 'fix bug');
    const result = verifyRegression({ base, head: 'HEAD', cwd, command: 'node check.js', timeoutSeconds: 5 });
    expect(result.passed).toBe(true);
  });
});
