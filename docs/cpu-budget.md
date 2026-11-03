# CPU budget research — retrieved 2026-11-03

## Documented facts

[Workers limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time): Free HTTP requests have a 10 ms CPU limit. Waiting on I/O does not count as CPU time. Isolates have flexibility for infrequent overruns, but consistent excess terminates execution (error 1102). The size/duration of that flexibility is unspecified; it is not a usable sustained budget.

[Images pricing](https://developers.cloudflare.com/images/pricing/): all users default to Images Free; external-image transformations are available on Free. It includes 5,000 unique transformations per month; new transformations beyond this fail with 9422, without overage charges on Free. Paid Images has overage billing. A source/parameter combination counts once per calendar month; binding operations count as transformations. Keep the account on Images Free: this repository cannot inspect or enforce the operator's billing plan. No account or paid service was used here.

[Images binding](https://developers.cloudflare.com/images/optimization/binding/): accepts raw image streams, supports resizing and encoded output including PNG; binding syntax is `[images] binding = "IMAGES"`. Local Wrangler supports an offline subset (width, height, rotate, format), with no usage charges. The high-fidelity version uses remote development. Raw RGBA output is not documented on that page; support is unknown and is not assumed. Offline operation without login was also verified here using Wrangler 4.157.0, including actual JPEG transformations. No remote mode was used.

## Implementation decision

Option A is enabled, with `ANALYSIS_MODE = "auto"`. At most 128 px on the long side (less than the requested 256 ceiling) bounds PNG decoding and scoring. Exact target dimensions are calculated from the original ratio; only locally supported width/height/format options are used. Header scores retain original dimensions, bytes and format. WebP and progressive JPEG may be transformed by Images without introducing a Worker decoder for those formats.

Tiny native JPEG/PNG (<=16,384 pixels) skips the binding. Explicit full mode remains available for diagnostics, bounded at 4 MP JPEG / 1 MP PNG. Auto falls back to an explicitly labelled header-only result when the binding is missing, fails, exhausts its quota, or returns unexpected dimensions. No full-resolution fallback is attempted on large images.

Option B was not selected: no custom DC decoder, progressive scan parser or AC-energy implementation was introduced. Consequently DC-vs-full decoder tests are not applicable; tests instead compare synthetic brightness across the resized path and full JPEG decoding (within 2 percentage points). The binding stub validates integration semantics; real offline transformations are separately smoke-tested at 3 MP and 12 MP.

Sharpness is a coarse blur heuristic on the resized grid, not original-resolution focus measurement. Fine blur and compression artifacts can be hidden by downsampling. Existing thresholds remain experimental; inspect the original. DC-scale sharpness would similarly detect strong blur only, but this implementation does not use DC-scale pixels.

## Unknowns and measurement limits

Production Worker CPU, production binding latency, exact quota behavior for an actual account, and local/production orientation/color parity remain unverified. Local request wall time includes offline resizing, JSON/base64 and transport; process CPU in Vitest is aggregate process consumption. Neither is Cloudflare per-request CPU. Large base64 payload parsing alone can exceed 10 ms. The cheaper path does not guarantee every allowed 8 MB request meets Free CPU limits. No photos or results are cached by this application.
