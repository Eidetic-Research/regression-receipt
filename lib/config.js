import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
export const TOOL_NAME = 'regression-receipt';
export const VERSION = '0.1.3';
export const DEFAULT_CONFIG_PATH = '.github/regression-receipt.yml';
const VerifySchema = z.object({
    enabled: z.boolean().default(false),
    command: z.string().default(''),
    timeout_seconds: z.number().int().min(1).default(300)
});
export const ConfigSchema = z.object({
    mode: z.enum(['warn', 'fail']).default('warn'),
    bug_labels: z.array(z.string()).default(['bug', 'regression', 'incident']),
    bug_title_patterns: z.array(z.string()).default(['^fix:', '^bugfix:']),
    bug_body_patterns: z.array(z.string()).default(['fixes #', 'closes #', 'resolves #']),
    test_path_patterns: z.array(z.string()).default(['**/*.test.ts', '**/*.spec.ts', 'tests/**', 'test/**', 'spec/**']),
    waiver_labels: z.array(z.string()).default(['no-regression-test-needed']),
    waiver_body_patterns: z.array(z.string()).default(['Regression test waiver:']),
    verify: VerifySchema.default({ enabled: false, command: '', timeout_seconds: 300 })
});
export function loadConfig(configPath = DEFAULT_CONFIG_PATH, cwd = process.cwd(), overrides = {}) {
    const resolved = path.resolve(cwd, configPath);
    let section = {};
    if (fs.existsSync(resolved)) {
        const parsed = parse(fs.readFileSync(resolved, 'utf8')) ?? {};
        section = typeof parsed === 'object' && parsed !== null && 'regression_receipt' in parsed ? parsed.regression_receipt ?? {} : parsed;
    }
    return ConfigSchema.parse({ ...section, ...compact(overrides) });
}
function compact(value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
//# sourceMappingURL=config.js.map