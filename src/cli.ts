#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildAll, buildLlms, parseConfig, toScript, validate } from './index.js';

function usage() {
  console.log('Dùng: mona-edu-schema <build|check|llms> <file-hoặc-url> [--out thư-mục|tệp]');
}

function report(result) {
  for (const issue of result.errors) console.error(`LỖI [${issue.code}] ${issue.path}: ${issue.message}`);
  for (const issue of result.warnings) console.warn(`CẢNH BÁO [${issue.code}] ${issue.path}: ${issue.message}`);
  console.log(result.valid ? `Hợp lệ (${result.warnings.length} cảnh báo).` : `Không hợp lệ (${result.errors.length} lỗi, ${result.warnings.length} cảnh báo).`);
}

function extractJsonLd(html) {
  const values = [];
  const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try { values.push(JSON.parse(match[1])); }
    catch (error) { throw new Error(`JSON-LD không hợp lệ: ${error.message}`); }
  }
  return values;
}

async function loadConfig(filename) {
  return parseConfig(await readFile(filename, 'utf8'), filename);
}

async function main() {
  const [, , command, target, ...args] = process.argv;
  if (!command || !target || ['-h', '--help'].includes(command)) { usage(); process.exitCode = command ? 0 : 1; return; }
  const outIndex = args.indexOf('--out');
  const output = outIndex >= 0 ? args[outIndex + 1] : undefined;
  if (outIndex >= 0 && !output) throw new Error('--out cần đường dẫn.');

  if (command === 'build') {
    const config = await loadConfig(target);
    const built = buildAll(config);
    const result = validate(Object.values(built));
    report(result);
    if (!result.valid) { process.exitCode = 1; return; }
    const directory = resolve(output || 'schema');
    await mkdir(directory, { recursive: true });
    const documents = { organization: built.organization, instructors: built.instructors, courses: built.courses, 'course-list': built.itemList, faq: built.faq, breadcrumbs: built.breadcrumb, datasets: built.datasets };
    const all = Object.values(documents).flat().filter(Boolean);
    for (const [name, value] of Object.entries(documents)) if (value && (!Array.isArray(value) || value.length)) await writeFile(join(directory, `${name}.jsonld`), `${JSON.stringify(value, null, 2)}\n`);
    await writeFile(join(directory, 'schema.html'), `${all.map(toScript).join('\n')}\n`);
    console.log(`Đã ghi ${directory}`);
    return;
  }
  if (command === 'llms') {
    const config = await loadConfig(target);
    const filename = resolve(output || 'llms.txt');
    await writeFile(filename, buildLlms(config));
    console.log(`Đã ghi ${filename}`);
    return;
  }
  if (command === 'check') {
    const response = await fetch(target, { headers: { 'user-agent': 'mona-edu-schema/0.1.0' }, redirect: 'follow' });
    if (!response.ok) throw new Error(`Không tải được ${target}: HTTP ${response.status}`);
    const values = extractJsonLd(await response.text());
    if (!values.length) throw new Error('Không tìm thấy JSON-LD trong HTML.');
    console.log(`Tìm thấy ${values.length} khối JSON-LD.`);
    const result = validate(values);
    report(result);
    if (!result.valid) process.exitCode = 1;
    return;
  }
  throw new Error(`Lệnh không hỗ trợ: ${command}`);
}

main().catch((error) => { console.error(`Lỗi: ${error.message}`); process.exitCode = 1; });
