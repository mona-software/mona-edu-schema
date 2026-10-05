# mona-edu-schema

A JavaScript library and CLI that generates and validates schema.org JSON-LD for training centers, schools and instructors from a YAML or JSON file.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The tool targets Vietnamese education websites: validation defaults to the Vietnam region (prices must be in `VND`), default labels and CLI messages are in Vietnamese, and the examples use Vietnamese content. All names, people, addresses and courses in `examples/` are fictional.

## Install

Requires Node.js 18+. No runtime dependencies.

```bash
git clone https://github.com/mona-software/mona-edu-schema
cd mona-edu-schema
npm install
npm run build
```

## Quick start

```bash
node dist/cli.js build examples/trung-tam-ngoai-ngu.yaml --out schema/
```

```text
Hợp lệ (0 cảnh báo).
Đã ghi .../schema
```

`Hợp lệ (0 cảnh báo)` means "valid (0 warnings)". The output directory then contains one `.jsonld` file per entity group (`organization`, `instructors`, `courses`, `course-list`, `faq`, `breadcrumbs`, `datasets`, when present) and `schema.html` with ready-to-paste tags:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Course"}
</script>
```

Generated output for all three examples is committed under [`examples/output/`](examples/output/).

## CLI

```bash
# Generate JSON-LD files and schema.html (default output directory: schema)
node dist/cli.js build site.yaml --out schema/

# Download a page, extract every application/ld+json block and validate it
node dist/cli.js check https://example.com/khoa-hoc/x

# Generate a short llms.txt from the same config (default output: llms.txt)
node dist/cli.js llms site.yaml --out llms.txt
```

`build` validates before writing and writes nothing if there are errors. `build` and `check` exit with code 1 when validation fails; any other error also exits with 1.

## Configuration

See the three complete files in [`examples/`](examples/). Minimal config:

```yaml
site:
  baseUrl: https://example.edu.vn
  language: vi
organization:
  name: Trung tâm Mẫu ABC
  url: https://example.edu.vn
courses:
  - name: Tiếng Anh giao tiếp nền tảng
    slug: khoa-hoc/tieng-anh-giao-tiep
    description: Luyện phản xạ nghe nói qua tình huống thường ngày.
  - name: IELTS nhập môn
    slug: khoa-hoc/ielts-nhap-mon
    description: Làm quen cấu trúc bài thi IELTS.
  - name: Phát âm thực hành
    slug: khoa-hoc/phat-am
    description: Thực hành âm, trọng âm và ngữ điệu.
```

Top-level keys: `site`, `organization`, `instructors`, `courses` (with optional `instances` and offers), `faq`, `breadcrumbs`, `datasets` and `courseListName`. Relative URLs and slugs are resolved against `site.baseUrl`.

Supported types: `EducationalOrganization`, `Person`, `Course`, `CourseInstance`, `Offer`, `ItemList`, `FAQPage`, `BreadcrumbList` and `Dataset`. `courseMode` takes schema.org values such as `online`, `onsite` or `blended`; `educationalLevel` is the course level shown to users.

## Validation

Errors:

- `Course` missing `name`, `description` or `provider`;
- `ItemList` without `itemListElement`, or with duplicate item URLs;
- `ListItem` missing `position`, or a course list item missing `url`;
- an `Offer` price that is not a finite number, or a currency other than `VND` (region `VN`);
- relative URLs;
- dates not in ISO 8601;
- duplicate `sameAs` entries.

Warnings: a course list with fewer than three courses, or a `Course` description longer than 60 characters.

### Google course list requirements

Checked against Google Search Central documentation on 25 September 2026:

| Type | Field | Google requirement |
| --- | --- | --- |
| `Course` | `name` | Required |
| `Course` | `description` | Required; display is limited to 60 characters |
| `Course` | `provider` | Recommended in the property table; the technical guidelines require a valid `name` and `provider` for each course, so the validator treats a missing `provider` as an error |
| `ItemList` | `itemListElement` | Required |
| `ListItem` | `position` | Required |
| `ListItem` | `url` | Required; canonical and unique |

Google also requires at least three marked-up courses and an `ItemList` on a summary or all-in-one page. Course list results are currently shown only in English in all regions where Google Search is available. Sources: [Course list structured data](https://developers.google.com/search/docs/appearance/structured-data/course), [Carousel structured data](https://developers.google.com/search/docs/appearance/structured-data/carousel).

Google retired the Course Info rich result in 2025, so `CourseInstance`, `Offer`, price, schedule and level no longer produce that result or its Search Console report; they remain valid schema.org data. The course list result is still supported. Sources: [Course Info retirement](https://developers.google.com/search/blog/2025/06/simplifying-search-results), [documentation updates](https://developers.google.com/search/updates).

Valid markup makes a page eligible but does not guarantee a rich result. The data must match the content visible on the page.

## `llms.txt`

The `llms` command follows the community proposal at [llmstxt.org](https://llmstxt.org/): organization name, description, then one section per course with its description and link. It is not an official standard, and AI crawlers are not guaranteed to use it.

## Library API

```js
import { buildCourse, buildOrganization, validate } from 'mona-edu-schema';

const provider = buildOrganization({
  name: 'Trung tâm Mẫu ABC',
  url: 'https://example.edu.vn'
});

const course = buildCourse({
  name: 'Tiếng Anh giao tiếp',
  description: 'Luyện nghe nói theo tình huống.',
  url: 'https://example.edu.vn/khoa-hoc/giao-tiep'
}, { provider });

console.log(validate(course)); // { valid, errors, warnings }
```

Other exports: `buildAll(config)`, `toScript(value)`, `buildLlms(config)`, `parseYaml(text)` and `parseConfig(text, filename)`. `validate(value, { region })` defaults to region `VN`.

The build produces ESM, CommonJS (`require`) and a browser IIFE that sets `globalThis.MonaEduSchema`.

## Known limitations

- The built-in YAML parser handles indentation-based maps and lists and basic scalars only; no anchors, tags or block scalars. Use JSON if you need full YAML 1.2.
- `check` needs a public URL and reads only valid JSON in `application/ld+json` tags; it does not execute the page's JavaScript.
- Google generally shows FAQ rich results only for authoritative government and health websites; `FAQPage` is still supported for describing the data.

## Development

```bash
npm run lint
npm run build
npm test
```

Issues and pull requests should include a reproducing config, the expected output and a test. Do not put personal data or credentials in fixtures.

## License

MIT, see [LICENSE](LICENSE).

**`mona-edu-schema` is a product of MONA Software, a member of The MONA Group.**
