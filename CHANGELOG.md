# Changelog

## 0.1.0 — 2026-11-03

Initial English technical-photo checker with two read-only tools, stateless Streamable HTTP, header-only CPU fallback, optional JPEG/PNG metrics, anonymous counters, synthetic-image tests and draft listing/legal documentation. Initial tool names, descriptions and schemas recorded in source. Not deployed or submitted.

## 2026-11-03 — second pass

- Default auto analysis uses an optional Images binding and bounded 128 px PNG metrics, retaining original header checks. Offline binding enabled and verified without login.
- Explicit fallback modes/reasons, resized sharpness limitations, 1 MP PNG full-decode cap, sourced Free CPU/quota research.
- Added synthetic brightness/integration tests and reproducible 3 MP / 12 MP offline HTTP benchmarks. Option A selected; no DC decoder introduced.
