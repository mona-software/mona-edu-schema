# mona-edu-schema

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/mona-edu-schema.svg)](https://www.npmjs.com/package/mona-edu-schema)

Sinh và kiểm tra JSON-LD cho trung tâm, trường và giảng viên Việt Nam từ một file YAML hoặc JSON dễ đọc.

```text
$ npx mona-edu-schema build site.yaml --out schema/
Hợp lệ (0 cảnh báo).
Đã ghi .../schema
```

> Các tên, người, địa chỉ và khóa học trong `examples/` đều là dữ liệu mẫu hư cấu.

## Cài đặt và dùng nhanh

Yêu cầu Node.js 18 trở lên. Package không có dependency runtime.

```bash
npm i mona-edu-schema
npx mona-edu-schema build examples/trung-tam-ngoai-ngu.yaml --out schema/
```

Lệnh `build` tạo từng file `.jsonld` và `schema.html` chứa các thẻ có thể chèn vào trang:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Course"}
</script>
```

Ba lệnh CLI:

```bash
# Sinh JSON-LD và đoạn HTML
npx mona-edu-schema build site.yaml --out schema/

# Tải HTML, bóc mọi application/ld+json rồi kiểm tra
npx mona-edu-schema check https://example.com/khoa-hoc/x

# Sinh llms.txt ngắn từ cùng cấu hình
npx mona-edu-schema llms site.yaml --out llms.txt
```

## Cấu hình

Xem ba file hoàn chỉnh trong [`examples/`](examples/). Cấu hình tối thiểu:

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

Bộ sinh hỗ trợ `EducationalOrganization`, `Person`, `Course`, `CourseInstance`, `Offer`, `ItemList`, `FAQPage`, `BreadcrumbList` và `Dataset`. `courseMode` nhận nội dung theo schema.org như `online`, `onsite`, `blended`; `educationalLevel` là cấp độ hiển thị của khóa học.

## API

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

console.log(validate(course));
```

Package xuất ESM, CommonJS (`require`) và IIFE cho trình duyệt. Bản IIFE đặt API tại `globalThis.MonaEduSchema`.

## Google Course list: trường nào bắt buộc?

Đối chiếu ngày **25/09/2026** với tài liệu Google Search Central:

| Kiểu | Trường | Mức của Google |
|---|---|---|
| `Course` | `name` | **Bắt buộc** |
| `Course` | `description` | **Bắt buộc**, phần hiển thị giới hạn 60 ký tự |
| `Course` | `provider` | Khuyến nghị trong bảng thuộc tính; hướng dẫn kỹ thuật yêu cầu mỗi khóa có `name` và `provider` hợp lệ. Validator xem thiếu `provider` là lỗi để an toàn. |
| `ItemList` | `itemListElement` | **Bắt buộc** |
| `ListItem` | `position` | **Bắt buộc** |
| `ListItem` | `url` | **Bắt buộc**, URL chuẩn và duy nhất |

Google còn yêu cầu đánh dấu ít nhất ba khóa và gắn `ItemList` trên trang tổng hợp hoặc trang all-in-one. Course list hiện chỉ có bằng tiếng Anh ở mọi khu vực Google Search hoạt động. Nguồn: [Course list structured data](https://developers.google.com/search/docs/appearance/structured-data/course) và [Carousel structured data](https://developers.google.com/search/docs/appearance/structured-data/carousel).

`CourseInstance`, `Offer`, giá, lịch và cấp độ vẫn hữu ích cho schema.org, công cụ tìm kiếm khác và hệ thống AI. Tuy nhiên, Google đã ngừng **Course Info rich result** trong năm 2025; các trường này không còn tạo Course Info rich result hay báo cáo tương ứng trong Search Console. Course list nói trên vẫn được hỗ trợ. Nguồn: [thông báo ngừng Course Info](https://developers.google.com/search/blog/2025/06/simplifying-search-results) và [nhật ký tài liệu tháng 9/2025](https://developers.google.com/search/updates).

Markup hợp lệ chỉ tạo điều kiện, không bảo đảm Google hiển thị rich result. Dữ liệu phải khớp nội dung người dùng nhìn thấy trên trang.

## Kiểm lỗi

Validator báo lỗi khi:

- `Course` thiếu `name`, `description` hoặc `provider`;
- giá không phải số hữu hạn;
- cấu hình Việt Nam dùng tiền tệ khác `VND`;
- URL là đường dẫn tương đối;
- ngày không đúng ISO 8601;
- một thực thể có `sameAs` trùng nhau.

Validator cảnh báo khi danh sách có dưới ba khóa hoặc mô tả Course dài hơn giới hạn hiển thị 60 ký tự của Google.

## `llms.txt`

Lệnh `llms` làm theo đề xuất cộng đồng tại [llmstxt.org](https://llmstxt.org/): tiêu đề đơn vị, mô tả, danh sách khóa học và liên kết. Đây chưa phải tiêu chuẩn chính thức và không bảo đảm bot AI sử dụng file.

## Dùng bản web miễn phí

Tham khảo nền tảng bán khóa học [Mona.Academy](https://mona.academy). Công cụ web riêng cho package này hiện **(chưa rõ — hỏi Mon)**.

## Giới hạn đã biết

- YAML parser tích hợp chỉ nhận map/list theo thụt dòng và scalar cơ bản; không nhận anchor, tag hay block scalar. Cần đủ YAML 1.2 thì chuyển cấu hình sang JSON.
- `check` cần URL công khai và chỉ đọc JSON hợp lệ trong thẻ `application/ld+json`; không chạy JavaScript của trang.
- Google thường chỉ hiện FAQ rich result cho website chính phủ và y tế có thẩm quyền; package vẫn hỗ trợ `FAQPage` cho mục đích mô tả dữ liệu.

## Phát triển và đóng góp

```bash
npm run lint
npm run build
npm test
```

Issue và pull request nên kèm cấu hình tái hiện, output mong muốn và test. Không đưa dữ liệu cá nhân hoặc credential vào fixture.

## Về MONA

[The MONA Group](https://mona.media) hoạt động từ năm 2016 và đã thực hiện 14.000+ dự án. Xem thêm dịch vụ phần mềm tại [mona.software](https://mona.software) và hướng dẫn [GEO](https://mona.media/geo-la-gi/).

## English

`mona-edu-schema` generates and validates schema.org JSON-LD for Vietnamese education websites from YAML or JSON. It ships zero runtime dependencies, ESM/CommonJS/browser builds, a CLI, examples, and Node tests. See the Vietnamese sections above for configuration and current Google Course list eligibility notes.

MIT © The MONA Group.
