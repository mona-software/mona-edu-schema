import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
const yaml = await readFile('src/yaml.ts', 'utf8');
const core = await readFile('src/index.ts', 'utf8');
const cli = await readFile('src/cli.ts', 'utf8');

await writeFile('dist/yaml.js', yaml);
await writeFile('dist/index.js', core);
await writeFile('dist/cli.js', cli);
await chmod('dist/cli.js', 0o755);

const exportNames = ['buildOrganization', 'buildCourse', 'buildAll', 'validate', 'toScript', 'buildLlms', 'parseYaml', 'parseConfig'];
const combined = `${yaml}\n${core.replace("export { parseYaml, parseConfig } from './yaml.js';", '')}`.replaceAll('export function ', 'function ');
await writeFile('dist/index.cjs', `'use strict';\n${combined}\nmodule.exports = { ${exportNames.join(', ')} };\n`);
await writeFile('dist/browser.js', `(function (global) {\n'use strict';\n${combined}\nglobal.MonaEduSchema = { ${exportNames.join(', ')} };\n})(typeof globalThis !== 'undefined' ? globalThis : window);\n`);

await writeFile('dist/index.d.ts', `export type JsonLd = Record<string, unknown>;
export interface ValidationIssue { code: string; path: string; message: string }
export interface ValidationResult { valid: boolean; errors: ValidationIssue[]; warnings: ValidationIssue[] }
export function parseYaml(source: string): unknown;
export function parseConfig(source: string, filename?: string): unknown;
export function buildOrganization(input: Record<string, any>, options?: Record<string, any>): JsonLd;
export function buildCourse(input: Record<string, any>, options?: Record<string, any>): JsonLd;
export function buildAll(config: Record<string, any>): Record<string, any>;
export function validate(value: unknown, options?: { region?: string }): ValidationResult;
export function toScript(value: unknown): string;
export function buildLlms(config: Record<string, any>): string;
`);
console.log('Đã build ESM, CommonJS, browser IIFE và type declarations.');
