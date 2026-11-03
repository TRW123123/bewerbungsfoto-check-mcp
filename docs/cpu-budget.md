# CPU budget research — retrieved 2026-11-03

## Documented facts

[Workers limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time): Free HTTP requests have a 10 ms CPU limit. Waiting on I/O does not count as CPU time. Isolates have flexibility for infrequent overruns, but consistent excess terminates execution (error 1102). The size/duration of that flexibility is unspecified; it is not a usable sustained budget.

[Images pricing](https://developers.cloudflare.com/images/pricing/): all users default to Images Free; external-image transformations are available on Free. It includes 5,000 unique transformations per month; new transformations beyond this fail with 9422, without overage charges on Free. Paid Images has overage billing. A source/parameter combination counts once per calendar month; binding operations count as transformations. Keep the account on Images Free: this repository cannot inspect or enforce the operator's billing plan. No account or paid service was used here.

[Images binding](https://developers.cloudflare.com/images/optimization/binding/): accepts raw image streams, supports resizing and encoded output including PNG; binding syntax is `[images] binding = "IMAGES"`. Local Wrangler supports an offline subset (width, height, rotate, format), with no usage charges. The high-fidelity version uses remote development. Raw RGBA output is not documented on that page; support is unknown and is not assumed. Offline operation without login was also verified here using Wrangler 4.157.0, including actual JPEG transformations. No remote mode was used.

## Implementation decision

Option A is enabled, with `ANALYSIS_MODE = "auto"`. At most 64 px on the long side (less than the requested 256 ceiling) bounds PNG decoding and scoring. The transform explicitly requests `width: 64, height: 64, fit: "scale-down"`, a bounding box rather than an exact output shape. Any positive PNG dimensions at most 64 on both sides are accepted. Expected dimensions from the original ratio and actual dimensions are logged as numeric fields on failure (zero means unavailable). The low-fidelity offline binding does not document `fit` support; tests validate the requested option with a binding stub. Header scores retain original dimensions, bytes and format. WebP and progressive JPEG may be transformed by Images without introducing a Worker decoder for those formats.

Auto analysis always tries the Images binding when available, including tiny JPEG/PNG. URL and base64 inputs use the same buffered binding path. Explicit full mode remains available for diagnostics, bounded at 4 MP JPEG / 1 MP PNG. When the binding is missing or fails (including quota exhaustion or unexpected dimensions), tiny JPEG/PNG (<=16,384 pixels) retains the native `full` fallback; larger images use an explicitly labelled `header-only` result. No full-resolution fallback is attempted on large images.

Option B was not selected: no custom DC decoder, progressive scan parser or AC-energy implementation was introduced. Consequently DC-vs-full decoder tests are not applicable; tests instead compare synthetic brightness across the resized path and full JPEG decoding (within 2 percentage points). The binding stub validates integration semantics; real offline transformations are separately smoke-tested at 3 MP and 12 MP.

Sharpness is a coarse blur heuristic on the resized grid, not original-resolution focus measurement. Fine blur and compression artifacts can be hidden by downsampling. Existing thresholds remain experimental; inspect the original. DC-scale sharpness would similarly detect strong blur only, but this implementation does not use DC-scale pixels.

## Unknowns and measurement limits

The streaming and 64 px/lazy-decoder revisions were measured in production by the operator (see below). The buffered URL / binding-first revision has not been deployed or measured in production. Exact quota behavior and local/production orientation/color parity remain unverified. Local request wall time includes offline resizing, JSON/base64 and transport; process CPU in Vitest is aggregate process consumption. Neither is Cloudflare per-request CPU. Large base64 payload parsing alone can exceed 10 ms. The cheaper path does not guarantee every allowed 8 MB request meets Free CPU limits. No photos or results are cached by this application.

## 0.1.1 production measurements before this streaming revision

Operator-provided wrangler tail measurements for a Wikimedia portrait JPEG, 1280 × 1599, 351 KB (about 470 KB base64):

| Input / mode | CPU (ms) | Wall (ms) | Outcome |
|---|---:|---:|---|
| image_url / auto | 29–36 | 200–690 | Transform ran; exact dimension check failed; header fallback |
| image_base64 / auto | 29–39 | Not supplied | Same dimension failure |
| image_url / header-only, no binding | 10–12 | Not supplied | Header checks |
| image_base64 / header-only, no binding | 16–17 | Not supplied | Header checks |
| Failed fetch, HTTP 403, no body read | 3 | Not supplied | Fetch rejected |
| tools/list | 1 | Not supplied | Tool list |

These demonstrate that full source buffering/transport can exceed the 10 ms budget even without decoding. They do not measure this revision. No deployment, Cloudflare API call, login or account inspection was performed for this revision.

## Buffered URL / binding-first revision — 2026-11-03

Operator-provided production `wrangler tail` CPU measurements after the 64 px / lazy-decoder revision:

| Input / path | CPU (ms) |
|---|---:|
| image_url, Wikimedia JPEGs 351 KB / 1.2 MB / 2.7 MB, streaming info()+resize | 49–79 |
| image_base64, same 351 KB JPEG (~470 KB base64), Images binding | 15 |
| image_base64, tiny 102×128 PNG (<=16,384 pixels), native decode without binding | 49 |
| get_headshot_photo_requirements | 2 |

The binding-backed base64 result indicates the native service work is comparatively cheap. The URL tee/counting TransformStream/concurrent metadata and resize machinery plus 64 KB prefix handling, and tiny source decoding in JavaScript, are the suspected CPU costs. These measurements compare complete request paths; they do not isolate individual operations. They motivate removing that URL machinery and always trying the binding for auto analysis, even for tiny images. The new implementation still needs production measurement; no claim of meeting the 10 ms Free budget is made.

URL fetches retain SSRF validation, revalidation of every redirect, HTTP status and image Content-Type checks, declared Content-Length pre-check, the hard 8,000,000-byte actual-body cap and the eight-second deadline through body consumption and analysis. Read the body once: preallocate from a valid declared Content-Length, otherwise collect chunks and assemble one Uint8Array. Incorrect short lengths switch to chunk assembly without dropping bytes; incorrect long lengths return only received bytes. All inputs remain capped regardless of the declaration. This trades up to 8 MB of source buffering for less JS stream machinery.

Parse JPEG SOF, PNG IHDR or WebP dimensions from that complete buffer without decoding source pixels. Late JPEG headers are supported without the former 64 KB cutoff. No `info()` call is needed. Both URL and base64 enqueue their buffer directly into a single ReadableStream for the same 64×64 scale-down Images transform, without a Response-backed source copy, tee or TransformStream. Only the returned <=64 px PNG is decoded for metrics. Original buffer dimensions, format and actual byte count drive header scores.

Tiny JPEG/PNG source decoders run only when the binding is unavailable or fails in auto mode; successful fallback retains `full`, successful binding analysis retains `images-binding`, and larger-image fallback retains `header-only`. Explicit `header-only` and diagnostic `full` modes keep their meanings and safety caps. Base64 still incurs JSON parsing and base64 decoding; native `Uint8Array.fromBase64` is feature-detected with the validated `atob` fallback. Input/schema byte limits remain unchanged.

`output({ format })` is awaited; its result’s `response()` is synchronous. Failure diagnostics retain bounded/redacted name/message, stage and numeric expected/actual dimensions. No image bytes or request URLs are logged. Tests cover source byte equivalence, late JPEG headers, missing/dishonest Content-Length, hard size limits, deadlines, tiny binding selection and fallback labels. No deployment, login, Cloudflare API call, commit or push was performed for this revision.

## Cold CPU revision — 2026-11-03

New operator measurements for the deployed streaming revision: real JPEG URL portraits of 351 KB / 1.2 MB / 2.7 MB used **58–178 ms CPU**, 190–480 ms wall, with successful `images-binding` analysis. Tiny 102×128 base64 PNG (~34 KB encoded) and JPEG (~9 KB encoded) used **38–78 ms CPU** in native `full` mode. Header-only URL was previously 10–12 ms and tools/list 1 ms. These supersede the earlier hope that streaming plus a 128 px resize would meet Free's budget. Cold/barely warmed isolates make a JIT-warmed ~2 ms local average misleading.

Run `node scripts/bench-cold.mjs` from the repo root (optionally `SAMPLES=10`). Each sample spawns a fresh Node process, imports a browser-target ESM bundle, reads an already encoded fixture, then measures exactly **one** awaited auto analysis using `process.cpuUsage()` (user + system). Each fixture takes the full native decode + metrics + scoring path. No application or runtime warm-up is performed. Fixtures use deterministic opaque RGB noise, encoded as RGBA PNG and quality-85 JPEG, to exercise nontrivial compressed data. Import CPU is measured separately; lazy decoder initialization is included in analysis CPU. Process startup, file reading, fixture encoding and base64/JSON parsing are excluded. The script also measures a standalone bundle importing **jpeg-js + fast-png + pako** in independent processes. `--jitless`, `--max-lazy` and normal runs all use fresh processes; `--max-lazy` is a comparison, not a substitute for disabling JIT.

Five samples per configuration, Node v24.22.1, median process CPU in ms:

| Input | Before jitless analysis | After jitless analysis | Before import | After import |
|---|---:|---:|---:|---:|
| 102×128 PNG | 31.47 | 21.57 | 7.09 | 5.77 |
| 102×128 JPEG | 42.96 | 29.27 | 8.23 | 5.19 |
| 128×128 PNG | 36.83 | 22.22 | 6.81 | 5.29 |
| 128×128 JPEG | 44.32 | 35.77 | 7.10 | 5.39 |

Raw samples, including normal/`--max-lazy` comparisons: [before](bench-cold-before.json), [after](bench-cold-after.json). The original before run predates the additional 64 px fixtures and standalone codec import measurement; its timing boundaries and fixture generation are identical.

- 51×64 PNG after: 18.97 ms analysis, 5.48 ms import.
- 51×64 JPEG after: 12.49 ms analysis, 5.35 ms import.
- 64×64 PNG after: 19.20 ms analysis, 5.45 ms import.
- 64×64 JPEG after: 14.59 ms analysis, 5.66 ms import.

Standalone eager codec bundle import: **7.62 ms** jitless median. Lazy loading avoids initialization of these codecs for PNG/native and header-only paths; code is still present in the single bundle and must still be parsed.

**The <6 ms decode+analysis target is not achieved. These results do not establish compliance with the 10 ms Workers Free budget.** JPEG entropy decoding/IDCT in jpeg-js remains expensive without JIT. Node's first use of web streams/native compression also contributes to PNG timings (including at 64 px); it is intentionally included rather than hidden with warm-up. Native stream implementation costs differ in workerd, so production CPU remains necessary evidence. No deployment, login, Cloudflare API call, commit or push was performed.

Changes and scoring implications:

- Both Images resize requests now use a **64×64 scale-down bounding box**. Native decoded pixels are sampled to at most a 64 px long side before metrics. The native auto fallback cap remains 16,384 pixels; full diagnostic decode caps remain 1 MP PNG / 4 MP JPEG.
- Metrics use two flat typed-array passes: composite/luminance/histogram/color accumulation, then luminance-neighbor gradients/Laplacian/border statistics. Percentiles use 256 histogram bins, never pixel-array sorting. Border geometry is computed once, opaque pixels bypass alpha rounding, and downsampling copies scalar channels without allocating a subarray per sample. Decoders use scalar transparency comparisons, avoiding per-pixel closures.
- JPEG and fallback PNG codecs initialize independently on demand. `analyzeImage` is now asynchronous internally; callers await it. The MCP response/schema stays unchanged.
- The PNG fast path supports noninterlaced 8-bit RGB/RGBA. It checks chunk CRCs, rejects unknown critical chunks/nonconsecutive IDAT, requires IEND, checks filters and inflated size, and ignores ancillary metadata without decompressing it. Native `DecompressionStream('deflate')` replaces the two JS inflation passes on this path. Workers documents support in its [web standards / compression streams API](https://developers.cloudflare.com/workers/runtime-apis/web-standards/#compression-streams). Missing native API, indexed/grayscale/interlaced/16-bit layouts or tRNS use the bounded legacy decoder; unsupported 16-bit full analysis still fails safely.
- Numeric scoring thresholds are unchanged. Existing reference scoring tests pass, and new tests compare all five metric results exactly against direct RGBA analysis on 51×64 good/dark/low-contrast/blurry/busy fixtures. All PNG filters are checked against known original RGB/RGBA pixels, including partial alpha. Corruption, truncation, invalid filters, excess inflation and missing-native fallback are covered.
- Grid reduction **can change scores** on fine textures and features close to thresholds. Nearest-neighbor sampling can alias fine patterns; a 64 px grid cannot certify original-resolution focus. Background and sharpness now describe coarse structures only. There is no claim of calibrated portrait equivalence across resolutions; inspect the original. Thresholds were not relaxed to make performance/scoring tests pass.
