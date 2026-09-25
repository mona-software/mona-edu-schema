# RUN LOG — 2026-09-25

Môi trường chạy: Node.js `v22.22.0`, npm `10.9.4`.

`npm install --package-lock-only` bị môi trường macOS chặn trước khi chạy với lỗi `SecItemCopyMatching failed -50`. Package không có dependency; `package-lock.json` lockfileVersion 3 tối thiểu được kiểm tra qua các lệnh npm còn lại.
`npm pack --dry-run` gặp cùng lỗi Keychain của môi trường nên chưa xác minh được tarball bằng npm.

## Quality gates

```text
$ npm run lint
Lint đạt: 4 file.

$ npm run build
Đã build ESM, CommonJS, browser IIFE và type declarations.

$ npm test
# tests 9
# pass 9
# fail 0
```

## Chạy CLI với examples

```text
$ node dist/cli.js build examples/trung-tam-ngoai-ngu.yaml --out examples/output/trung-tam-ngoai-ngu
Hợp lệ (0 cảnh báo).
Đã ghi .../examples/output/trung-tam-ngoai-ngu

$ node dist/cli.js build examples/giang-vien-ca-nhan.yaml --out examples/output/giang-vien-ca-nhan
Hợp lệ (0 cảnh báo).
Đã ghi .../examples/output/giang-vien-ca-nhan

$ node dist/cli.js build examples/truong-thcs.yaml --out examples/output/truong-thcs
Hợp lệ (0 cảnh báo).
Đã ghi .../examples/output/truong-thcs

$ node dist/cli.js llms examples/trung-tam-ngoai-ngu.yaml --out examples/output/trung-tam-ngoai-ngu/llms.txt
Đã ghi .../examples/output/trung-tam-ngoai-ngu/llms.txt
```

Các output mẫu nằm trong `examples/output/`.

## Git/Beads

```text
$ git init -b main
.../.git: Operation not permitted
```

Sandbox chỉ cấp quyền đọc cho đường dẫn `.git`, nên không thể khởi tạo repo/commit local. Beads cũng không mở được database dùng chung bên ngoài thư mục hiện tại. Không có thao tác remote.

## File đã tạo

- Cấu hình gói: `package.json`, `package-lock.json`, `.gitignore`, `LICENSE`, `CHANGELOG.md`.
- Mã nguồn: `src/index.ts`, `src/yaml.ts`, `src/cli.ts`.
- Build: `scripts/build.mjs`, `scripts/lint.mjs`, `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/browser.js`, `dist/cli.js`, `dist/yaml.js`.
- Test/CI: `test/core.test.js`, `test/cli.test.js`, `.github/workflows/ci.yml`.
- Dữ liệu mẫu: ba file `examples/*.yaml` và 16 file trong `examples/output/`.
- Tài liệu/trạng thái: `README.md`, `RUN-LOG.md`, `STATE.md`.
