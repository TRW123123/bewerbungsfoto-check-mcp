# Build report — 2026-11-03

Historical build report: the original work described below was local only. Current operator-reported status: main v0.1.1 is live through the Netlify proxy; submission-prep prepares v0.1.2 without deployment or submission. See [submission/README.md](submission/README.md) for current materials and checks. Historical measurements below remain as recorded.

- Tools: `check_headshot_photo` (one HTTPS/base64 image; technical criteria, 0–100 score, prioritized tips), `get_headshot_photo_requirements` (static destination recommendations/checklist).
- Worker: stateless Streamable HTTP JSON at `/mcp`; three negotiated protocol versions; CORS; health endpoint; bounded inputs/fetches; anonymous counters and guarded optional Analytics Engine.
- `npm install`: passed; final dependency audit reported **0 vulnerabilities**. An initially unavailable date-specific workers-types version was corrected; installed versions are locked.
- Initial-pass baseline (superseded by the second-pass results below): typecheck passed; tests **75 passed across 5 files** (synthetic scoring, protocol/error/fetch guards, output schemas, listing lengths and benchmark).
- Registry JSON validated against the requested official `2025-12-11` schema: passed. File is prepared only.
- `npm run secret-scan`: passed with gitleaks, including staged content; final commit history also scanned. No secrets found.
- Initial-pass Wrangler 4.157.0 started on `127.0.0.1:8787` **without login**. Final smoke: initialize, tools/list and requirements call returned HTTP 200 JSON; two tools listed. Additional generated-image runtime calls passed for header-only JPEG and full JPEG/PNG. Processes stopped. See `docs/local-dev-notes.md` and `docs/smoke-results.jsonl`.

## Second pass: bounded pixel analysis

Option A selected. Default `auto` uses the Images binding with a maximum 128 px long side, original-file header checks, and explicit missing-binding/quota/error fallback. Small native inputs avoid transformation. Full PNG diagnostic decode is capped at 1 MP. Base64 conversion now uses a simple allocation/loop instead of a callback per byte. No custom DC decoder or AC-energy estimator is included; synthetic brightness equivalence tests exercise the selected resized path instead.

| Local measurement (2026-11-03) | Wall ms | Process CPU ms |
|---|---:|---:|
| Previous full 1500×2000 JPEG, 317,387 bytes | 238.51 | 343.02 |
| New bounded 96×128 PNG decode + metrics, warm average of 100 | 1.77 | 2.94 |
| Auto offline HTTP 1500×2000 JPEG, 317,387 bytes, first / warm range | 141.43 / 29.52–34.55 | unknown |
| Auto offline HTTP 3000×4000 JPEG, 1,268,749 bytes, first / warm range | 64.56 / 49.63–53.91 | unknown |

Encoding excluded. HTTP rows include transport, JSON/base64, offline resizing and Worker execution. The bounded pixel row excludes resizing/transport and uses aggregate Node process CPU, not Cloudflare CPU. Different paths/measurement scopes are not directly comparable. Production CPU is unmeasured; no 10 ms compliance guarantee. Raw results: `docs/benchmark-local.json`; reproduce with `node scripts/benchmark-local.mjs` while Wrangler runs. Pixel benchmark: `npx vitest run tests/auto.test.ts --reporter=verbose --silent=false`. Sources/quota/unknowns: `docs/cpu-budget.md`.

Second-pass validation: npm install (0 audit vulnerabilities), typecheck, **83 tests across 6 files**, secret scan. Offline Wrangler on `127.0.0.1:8787` required no login; smoke initialize/tools/list/requirements and generated base64 JPEG checks at 3 MP and 12 MP returned HTTP 200 with pixel metrics. Original-resolution criterion passed for both large inputs; face framing remained unchecked. Binding smoke outputs also validate against the advertised schema. Wrangler stopped. Local commit only; no deploy, remote, login, push or paid service.

## Open operator/launch issues

- DNS/subdomain and proxy routing are now established per the operator: `https://mcp.profilfoto-ki.de/mcp` is live via Netlify to Cloudflare. Later deployments and publication still require separate approval.
- Confirm legal contacts/address, log retention, processor/legal details and publish draft policy/support/terms routes. Verify developer/domain identity; record demo video and live ChatGPT/Claude golden-prompt results before submission. None are represented as completed.
- Public-hostname DNS rebinding/private DNS resolution is not pinned by the fetch-based SSRF guard; stronger egress policy or an image-host allowlist remains necessary if that threat is in scope. Per-isolate hashed-IP limiting is best-effort; global rate rules and external uptime monitoring remain operator setup.
- Face framing is honestly unchecked; sharpness and overall score are heuristics. WebP pixel analysis requires the Images binding; orientation/color handling can differ between local and production transforms. Review original images manually. No generation/editing or personal-attribute judgments.
