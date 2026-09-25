import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const output = '.test-output';

test('CLI build và llms tạo tệp', async () => {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const built = await exec(process.execPath, ['dist/cli.js', 'build', 'examples/trung-tam-ngoai-ngu.yaml', '--out', `${output}/schema`]);
  assert.match(built.stdout, /Đã ghi/);
  const list = JSON.parse(await readFile(`${output}/schema/course-list.jsonld`, 'utf8'));
  assert.equal(list.itemListElement.length, 3);
  await exec(process.execPath, ['dist/cli.js', 'llms', 'examples/trung-tam-ngoai-ngu.yaml', '--out', `${output}/llms.txt`]);
  assert.match(await readFile(`${output}/llms.txt`, 'utf8'), /Tiếng Anh giao tiếp nền tảng/);
  await rm(output, { recursive: true, force: true });
});

test('CLI trả mã lỗi khi lệnh không tồn tại', async () => {
  await assert.rejects(exec(process.execPath, ['dist/cli.js', 'khong-co', 'x']), /Lệnh không hỗ trợ/);
});
