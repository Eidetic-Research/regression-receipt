import { z } from 'zod';
export declare const TOOL_NAME = "regression-receipt";
export declare const VERSION = "0.1.3";
export declare const DEFAULT_CONFIG_PATH = ".github/regression-receipt.yml";
export declare const ConfigSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<{
        warn: "warn";
        fail: "fail";
    }>>;
    bug_labels: z.ZodDefault<z.ZodArray<z.ZodString>>;
    bug_title_patterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
    bug_body_patterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
    test_path_patterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
    waiver_labels: z.ZodDefault<z.ZodArray<z.ZodString>>;
    waiver_body_patterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
    verify: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        command: z.ZodDefault<z.ZodString>;
        timeout_seconds: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RegressionReceiptConfig = z.infer<typeof ConfigSchema>;
export declare function loadConfig(configPath?: string, cwd?: string, overrides?: Partial<RegressionReceiptConfig>): RegressionReceiptConfig;
