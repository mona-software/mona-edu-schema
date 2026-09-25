/** Bộ đọc YAML con, đủ cho cấu hình của dự án; không hỗ trợ anchor/tag/block scalar. */

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if ((char === '"' || char === "'") && line[i - 1] !== '\\') quote = quote === char ? null : (quote || char);
    if (char === '#' && !quote && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function scalar(value) {
  const text = value.trim();
  if (!text) return undefined;
  if (text === 'null' || text === '~') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) return Number(text);
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.startsWith('"') ? JSON.parse(text) : text.slice(1, -1).replace(/''/g, "'");
  }
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try { return JSON.parse(text.replace(/'/g, '"')); } catch { /* giữ chuỗi */ }
  }
  return text;
}

function splitPair(text, lineNumber) {
  const index = text.indexOf(':');
  if (index < 1) throw new Error(`YAML dòng ${lineNumber}: cần cặp khóa: giá trị`);
  return [text.slice(0, index).trim(), text.slice(index + 1).trim()];
}

export function parseYaml(source) {
  const lines = source.split(/\r?\n/).map((raw, index) => {
    if (/\t/.test(raw)) throw new Error(`YAML dòng ${index + 1}: không dùng tab để thụt dòng`);
    const clean = stripComment(raw).trimEnd();
    return { indent: clean.length - clean.trimStart().length, text: clean.trimStart(), number: index + 1 };
  }).filter((line) => line.text && line.text !== '---');

  function parseNode(start, indent) {
    if (start >= lines.length) return [null, start];
    return lines[start].text.startsWith('- ') || lines[start].text === '-'
      ? parseList(start, indent)
      : parseMap(start, indent, {});
  }

  function parseMap(start, indent, target) {
    let i = start;
    while (i < lines.length && lines[i].indent === indent && !lines[i].text.startsWith('-')) {
      const line = lines[i];
      const [key, rest] = splitPair(line.text, line.number);
      if (Object.prototype.hasOwnProperty.call(target, key)) throw new Error(`YAML dòng ${line.number}: khóa trùng "${key}"`);
      i += 1;
      if (rest) target[key] = scalar(rest);
      else if (i < lines.length && lines[i].indent > indent) [target[key], i] = parseNode(i, lines[i].indent);
      else target[key] = null;
    }
    return [target, i];
  }

  function parseList(start, indent) {
    const result = [];
    let i = start;
    while (i < lines.length && lines[i].indent === indent && lines[i].text.startsWith('-')) {
      const line = lines[i];
      const rest = line.text.slice(1).trim();
      i += 1;
      if (!rest) {
        if (i >= lines.length || lines[i].indent <= indent) result.push(null);
        else { let value; [value, i] = parseNode(i, lines[i].indent); result.push(value); }
      } else if (/^[^:]+:(?:\s|$)/.test(rest)) {
        const [key, valueText] = splitPair(rest, line.number);
        const item = {};
        if (valueText) item[key] = scalar(valueText);
        else if (i < lines.length && lines[i].indent > indent) [item[key], i] = parseNode(i, lines[i].indent);
        else item[key] = null;
        if (i < lines.length && lines[i].indent > indent && !lines[i].text.startsWith('-')) {
          [, i] = parseMap(i, lines[i].indent, item);
        }
        result.push(item);
      } else result.push(scalar(rest));
    }
    return [result, i];
  }

  if (!lines.length) return {};
  const [data, end] = parseNode(0, lines[0].indent);
  if (end !== lines.length) throw new Error(`YAML dòng ${lines[end].number}: thụt dòng không hợp lệ`);
  return data;
}

export function parseConfig(source, filename = '') {
  if (filename.endsWith('.json') || source.trimStart().startsWith('{')) return JSON.parse(source);
  return parseYaml(source);
}
