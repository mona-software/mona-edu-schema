import { readFile } from 'node:fs/promises';

const files = ['README.md', 'src/index.ts', 'src/yaml.ts', 'src/cli.ts'];
const forbidden = ['trong thời đại số', 'giải pháp tối ưu'];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const phrase of forbidden) if (text.toLowerCase().includes(phrase)) throw new Error(`${file}: cụm từ bị cấm "${phrase}"`);
}
console.log(`Lint đạt: ${files.length} file.`);
