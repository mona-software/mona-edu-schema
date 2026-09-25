import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildAll, buildCourse, buildLlms, parseYaml, toScript, validate } from '../dist/index.js';

test('parse YAML lồng nhau và danh sách', () => {
  const result = parseYaml(`site:\n  baseUrl: https://example.vn\ncourses:\n  - name: Khóa A\n    topics:\n      - SEO\n      - GEO\n    links:\n      - https://example.vn/khoa-a\n    free: false\n    price: 0\n`);
  assert.deepEqual(result, {
    site: { baseUrl: 'https://example.vn' },
    courses: [{ name: 'Khóa A', topics: ['SEO', 'GEO'], links: ['https://example.vn/khoa-a'], free: false, price: 0 }]
  });
});

test('snapshot Course gồm CourseInstance và Offer', () => {
  const course = buildCourse({
    name: 'Khóa mẫu', url: '/khoa-mau', description: 'Mô tả ngắn.', educationalLevel: 'Cơ bản',
    instance: { courseMode: 'online', startDate: '2026-10-01', offer: { price: 500000, url: '/dang-ky' } }
  }, { baseUrl: 'https://example.vn', provider: { '@id': 'https://example.vn/#organization' } });
  assert.deepEqual(course, {
    '@context': 'https://schema.org', '@type': 'Course', '@id': 'https://example.vn/khoa-mau#course',
    url: 'https://example.vn/khoa-mau', name: 'Khóa mẫu', description: 'Mô tả ngắn.',
    educationalLevel: 'Cơ bản', inLanguage: 'vi', provider: { '@id': 'https://example.vn/#organization' },
    hasCourseInstance: [{ '@type': 'CourseInstance', courseMode: 'online', startDate: '2026-10-01', offers: { '@type': 'Offer', price: 500000, priceCurrency: 'VND', url: 'https://example.vn/dang-ky' } }]
  });
  assert.match(toScript(course), /^<script type="application\/ld\+json">/);
});

test('buildAll tạo ItemList ba khóa', () => {
  const built = buildAll({ site: { baseUrl: 'https://example.vn' }, organization: { name: 'Trường mẫu', url: 'https://example.vn' }, courses: [1, 2, 3].map((n) => ({ name: `Khóa ${n}`, slug: `khoa-${n}`, description: `Mô tả ${n}` })) });
  assert.equal(built.itemList.itemListElement.length, 3);
  assert.equal(validate(built).valid, true);
});

test('validator bắt riêng từng loại lỗi', () => {
  const bad = {
    '@type': 'Course', name: '', description: '', url: '/tuong-doi', provider: { '@type': 'Organization', sameAs: ['/mau', '/mau'] },
    hasCourseInstance: [{ '@type': 'CourseInstance', startDate: '2026-02-30', offers: { '@type': 'Offer', price: '100', priceCurrency: 'USD' } }]
  };
  const result = validate(bad);
  assert.equal(result.valid, false);
  for (const code of ['REQUIRED_FIELD', 'INVALID_PRICE', 'INVALID_CURRENCY', 'RELATIVE_URL', 'INVALID_DATE', 'DUPLICATE_SAME_AS']) {
    assert.ok(result.errors.some((issue) => issue.code === code), `thiếu lỗi ${code}`);
  }
});

test('CJS export dùng được', () => {
  const require = createRequire(import.meta.url);
  const cjs = require('../dist/index.cjs');
  assert.equal(typeof cjs.buildCourse, 'function');
  assert.equal(typeof cjs.parseYaml, 'function');
});

test('browser IIFE công khai API toàn cục', async () => {
  const context = { URL };
  vm.runInNewContext(await readFile('dist/browser.js', 'utf8'), context);
  assert.equal(typeof context.MonaEduSchema.buildCourse, 'function');
  assert.equal(typeof context.MonaEduSchema.validate, 'function');
});

test('llms.txt chứa khóa học và URL tuyệt đối', () => {
  const output = buildLlms({ site: { baseUrl: 'https://example.vn' }, organization: { name: 'Trường mẫu' }, courses: [{ name: 'Khóa A', description: 'Mô tả', slug: 'khoa-a' }] });
  assert.match(output, /# Trường mẫu/);
  assert.match(output, /https:\/\/example\.vn\/khoa-a/);
});
