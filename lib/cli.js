#!/usr/bin/env node
import { Command } from 'commander';
import { DEFAULT_CONFIG_PATH, VERSION } from './config.js';
import { runScan, verifyRegression } from './index.js';
import { exitCodeFor, renderMarkdown } from './report.js';
const program = new Command();
program.name('regression-receipt').description('Require regression-test evidence for bugfix-like PRs.').version(VERSION);
program.command('scan')
    .requiredOption('--base <ref>', 'base git ref')
    .requiredOption('--head <ref>', 'head git ref')
    .option('--event <path>', 'pull_request event JSON path')
    .option('--config <path>', 'config path', DEFAULT_CONFIG_PATH)
    .option('--mode <mode>', 'warn or fail', 'warn')
    .option('--format <format>', 'markdown or json', 'markdown')
    .action(async (options) => {
    const result = await runScan({ base: options.base, head: options.head, eventPath: options.event, configPath: options.config, mode: options.mode });
    process.stdout.write(options.format === 'json' ? JSON.stringify(result, null, 2) + '\n' : renderMarkdown(result) + '\n');
    process.exitCode = exitCodeFor(result);
});
program.command('verify')
    .requiredOption('--base <ref>', 'base git ref')
    .requiredOption('--head <ref>', 'head git ref')
    .requiredOption('--command <command>', 'trusted regression command to run in base and head worktrees')
    .option('--timeout-seconds <seconds>', 'command timeout', '300')
    .action((options) => {
    const result = verifyRegression({ base: options.base, head: options.head, command: options.command, timeoutSeconds: Number.parseInt(options.timeoutSeconds, 10) });
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exitCode = result.passed ? 0 : 1;
});
program.parse();
//# sourceMappingURL=cli.js.map