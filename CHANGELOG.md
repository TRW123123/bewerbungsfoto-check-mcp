# Changelog

## 0.1.2 — 2026-11-03

- Prepare English directory listings, legal pages, verification instructions and original icon; no deployment or publication.
- Type criterion values explicitly for Inspector compatibility, clarify tool side effects and WebP coverage, and align release metadata at 0.1.2.
- Replace URL tee/counting TransformStream/concurrent info()+resize with one bounded buffer read (Content-Length preallocation or chunk assembly), header-only parsing and the same binding transform as base64. Preserve SSRF/redirect checks, timeout, Content-Type validation and declared/actual 8 MB limits; remove the 64 KB JPEG header cutoff.
- Always try Images in auto mode, including tiny inputs. Native tiny JPEG/PNG decoding remains a fallback when the binding is missing or fails; retain `images-binding`, `full` and `header-only` labels and diagnostic modes.
- Record operator production CPU after the 64 px/lazy-decoder round: streaming Wikimedia JPEG URLs (351 KB / 1.2 MB / 2.7 MB) **49–79 ms**; binding-backed base64 of the same 351 KB JPEG (~470 KB encoded) **15 ms**; native tiny 102×128 base64 PNG **49 ms**; `get_headshot_photo_requirements` **2 ms**. These motivate reducing URL stream machinery and avoiding tiny source decoding in JS. This new revision is unmeasured in production; no Free CPU compliance claim.

## 0.1.1 — 2026-11-03

- Add a one-analysis-per-process CPU benchmark under `--jitless`, `--max-lazy` and normal Node, with separate bundle/codec import measurements and raw before/after samples. Jitless median decode+scoring: 102×128 PNG **31.47→21.57 ms**, JPEG **43.00→29.27 ms**; 128×128 PNG **36.83→22.22 ms**, JPEG **44.32→35.77 ms**. The **<6 ms target remains unmet**; no Free CPU compliance claim.
- Reduce Images and native metric grids to a 64 px long side; hoist border bounds, avoid per-sample subarrays and per-pixel transparency closures, and skip opaque alpha arithmetic. Keep numeric scoring thresholds; document coarse background/sharpness and aliasing limitations.
- Lazy-load JPEG/fallback PNG decoders independently; use bounded native deflate for noninterlaced 8-bit RGB/RGBA PNG with CRC/filter/size validation and legacy layout/API fallback. Make the internal `analyzeImage` API asynchronous and add decoder safety/pixel-equivalence tests.
- Record successful deployed streaming measurements: URL auto **58–178 ms CPU / 190–480 ms wall**, tiny native base64 PNG/JPEG **38–78 ms CPU**. This cold-CPU revision remains local and unmeasured in production.

- Fix production dimension rejection with an explicit 128 × 128 scale-down bounding box; accept actual positive PNG dimensions within it and log numeric expected/actual dimensions.
- Stream URL sources through size enforcement into concurrent Images info/resize operations; retain only 64 KB for header fallback, preserving redirect checks, timeout and the 8 MB limit. Header-only URL checks no longer assemble the full image. Late JPEG headers require working binding metadata or a re-export.
- Stream decoded base64 directly to Images; recommend URL inputs and document the roughly 150 KB base64 CPU-risk threshold without changing the schema limits.
- Record operator production measurements for a 351 KB JPEG: auto URL 29–36 ms CPU / 200–690 ms wall, auto base64 29–39 ms CPU (both dimension fallback); header-only URL 10–12 ms, base64 16–17 ms; HTTP 403 without body 3 ms; tools/list 1 ms. Streaming revision production CPU remains unmeasured.

- Send a descriptive image-fetch User-Agent and include numeric HTTP failures without URLs.
- Use a Response-backed Images input stream; add bounded, stage-specific binding failure diagnostics and review current API semantics.
- Prefer native base64 decoding when available, retain the fallback and validation, and document large-base64 Free CPU limitations and recommended URL input.

## 0.1.0 — 2026-11-03

Initial English technical-photo checker with two read-only tools, stateless Streamable HTTP, header-only CPU fallback, optional JPEG/PNG metrics, anonymous counters, synthetic-image tests and draft listing/legal documentation. Initial tool names, descriptions and schemas recorded in source. Not deployed or submitted.

## 2026-11-03 — second pass

- Default auto analysis uses an optional Images binding and bounded 128 px PNG metrics, retaining original header checks. Offline binding enabled and verified without login.
- Explicit fallback modes/reasons, resized sharpness limitations, 1 MP PNG full-decode cap, sourced Free CPU/quota research.
- Added synthetic brightness/integration tests and reproducible 3 MP / 12 MP offline HTTP benchmarks. Option A selected; no DC decoder introduced.
