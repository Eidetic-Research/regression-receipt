import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import picomatch from 'picomatch';
import { changedFiles, readEvent, runGit } from './git.js';
import { TOOL_NAME, VERSION, loadConfig, type RegressionReceiptConfig } from './config.js';
import { createResult, type Finding, type Mode, type ScanResult } from './report.js';

export interface ScanOptions {
  base: string;
  head: string;
  cwd?: string;
  configPath?: string;
  configOverrides?: Partial<RegressionReceiptConfig>;
  mode?: Mode;
  eventPath?: string;
  modelPath?: string;
  since?: string;
  coverage?: string;
}

export interface VerifyResult {
  tool: string;
  base: string;
  head: string;
  command: string;
  passed: boolean;
  baseExitCode: number;
  headExitCode: number;
}

export async function runScan(options: ScanOptions): Promise<ScanResult> {
  const cwd = options.cwd ?? process.cwd();
  const config = loadConfig(options.configPath, cwd, options.configOverrides);
  const mode = options.mode ?? config.mode;
  const files = changedFiles(options.base, options.head, cwd);
  const event = readEvent(options.eventPath);
  const labels = new Set((event?.labels ?? []).map((label) => label.toLowerCase()));
  const body = event?.body ?? '';
  const title = event?.title ?? '';
  const bugLike = isBugLike({ labels, title, body, config });
  const hasTestChange = files.some((file) => matchesAny(file, config.test_path_patterns));
  const hasWaiver = config.waiver_labels.some((label) => labels.has(label.toLowerCase())) || config.waiver_body_patterns.some((pattern) => containsPattern(body, pattern));
  const findings: Finding[] = [];

  if (bugLike && !hasTestChange && !hasWaiver) {
    findings.push({
      id: 'regression-receipt:' + stableHash('missing-test:' + options.base + ':' + options.head),
      severity: 'error',
      title: 'Bugfix without regression test',
      message: 'This PR appears to fix a bug, but no regression test changed.',
      evidence: { labels: [...labels], title, changed_files: files, summary: 'bugfix-like PR without a changed test file or waiver' },
      recommendation: 'Add a regression test or apply no-regression-test-needed with justification.'
    });
  }

  if (config.verify.enabled && config.verify.command) {
    const verification = verifyRegression({ base: options.base, head: options.head, command: config.verify.command, timeoutSeconds: config.verify.timeout_seconds, cwd });
    if (!verification.passed) {
      findings.push({
        id: 'regression-receipt:' + stableHash('verify:' + config.verify.command),
        severity: 'error',
        title: 'Regression verification did not prove fail-then-pass',
        message: 'The configured regression command did not fail on base and pass on head.',
        evidence: { base_exit_code: verification.baseExitCode, head_exit_code: verification.headExitCode, summary: 'expected base to fail and head to pass' },
        recommendation: 'Update the regression test command or add the regression test evidence manually.'
      });
    }
  }

  return createResult({ tool: TOOL_NAME, version: VERSION, base: options.base, head: options.head, mode, findings });
}

export function verifyRegression(input: { base: string; head: string; command: string; timeoutSeconds?: number; cwd?: string }): VerifyResult {
  const cwd = input.cwd ?? process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'regression-receipt-'));
  const baseDir = path.join(tmp, 'base');
  const headDir = path.join(tmp, 'head');
  try {
    runGit(['worktree', 'add', '--detach', baseDir, input.base], cwd);
    runGit(['worktree', 'add', '--detach', headDir, input.head], cwd);
    const baseExitCode = runCommand(input.command, baseDir, input.timeoutSeconds ?? 300);
    const headExitCode = runCommand(input.command, headDir, input.timeoutSeconds ?? 300);
    return { tool: TOOL_NAME, base: input.base, head: input.head, command: input.command, passed: baseExitCode !== 0 && headExitCode === 0, baseExitCode, headExitCode };
  } finally {
    try { runGit(['worktree', 'remove', '--force', baseDir], cwd); } catch { /* best effort cleanup */ }
    try { runGit(['worktree', 'remove', '--force', headDir], cwd); } catch { /* best effort cleanup */ }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function isBugLike(input: { labels: Set<string>; title: string; body: string; config: RegressionReceiptConfig }): boolean {
  if (input.config.bug_labels.some((label) => input.labels.has(label.toLowerCase()))) return true;
  if (input.config.bug_title_patterns.some((pattern) => matchesRegex(input.title, pattern))) return true;
  return input.config.bug_body_patterns.some((pattern) => containsPattern(input.body, pattern));
}

function containsPattern(text: string, pattern: string): boolean {
  return text.toLowerCase().includes(pattern.toLowerCase()) || matchesRegex(text, pattern);
}

function matchesRegex(text: string, pattern: string): boolean {
  try { return new RegExp(pattern, 'i').test(text); } catch { return text.toLowerCase().includes(pattern.toLowerCase()); }
}

function matchesAny(file: string, patterns: string[]): boolean {
  return patterns.length > 0 && picomatch(patterns, { dot: true })(file);
}

function runCommand(command: string, cwd: string, timeoutSeconds: number): number {
  try {
    execSync(command, { cwd, stdio: 'ignore', shell: '/bin/bash', timeout: timeoutSeconds * 1000 });
    return 0;
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === 'number' ? (error as { status: number }).status : 1;
    return status;
  }
}

function stableHash(value: string): string { return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12); }
