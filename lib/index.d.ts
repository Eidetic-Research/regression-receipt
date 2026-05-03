import { type RegressionReceiptConfig } from './config.js';
import { type Mode, type ScanResult } from './report.js';
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
export declare function runScan(options: ScanOptions): Promise<ScanResult>;
export declare function verifyRegression(input: {
    base: string;
    head: string;
    command: string;
    timeoutSeconds?: number;
    cwd?: string;
}): VerifyResult;
