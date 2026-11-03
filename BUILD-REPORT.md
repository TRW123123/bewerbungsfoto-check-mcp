# Build report — 2026-11-03

Status: **not deployed, not submitted**. Built only in this repository; reference files were read-only. No login, push, remote creation, paid API or registry submission.

- Tools: `check_headshot_photo` (one HTTPS/base64 image; technical criteria, 0–100 score, prioritized tips), `get_headshot_photo_requirements` (static destination recommendations/checklist).
- Worker: stateless Streamable HTTP JSON at `/mcp`; three negotiated protocol versions; CORS; health endpoint; bounded inputs/fetches; anonymous counters and guarded optional Analytics Engine.
- `npm install`: passed; final dependency audit reported **0 vulnerabilities**. An initially unavailable date-specific workers-types version was corrected; installed versions are locked.
- `npm run typecheck`: passed. `npm test`: **75 passed across 5 files** (synthetic scoring, protocol/error/fetch guards, output schemas, listing lengths and benchmark).
- Registry JSON validated against the requested official `2025-12-11` schema: passed. File is prepared only.
- `npm run secret-scan`: passed with gitleaks, including staged content; final commit history also scanned. No secrets found.
- Wrangler 4.157.0 started on `127.0.0.1:8787` **without login**. Final smoke: initialize, tools/list and requirements call returned HTTP 200 JSON; two tools listed. Additional generated-image runtime calls passed for header-only JPEG and full JPEG/PNG. Processes stopped. See `docs/local-dev-notes.md` and `docs/smoke-results.jsonl`.

## Measured local cost and fallback

Isolated Vitest run, generated **1500×2000 JPEG, 317,387 bytes**: full analysis **238.51 ms wall**, **343.02 ms process CPU**; header-only analysis **0.077 ms wall**. Encoding excluded. CPU is aggregate process usage, not edge per-request CPU, and local timings are not Cloudflare guarantees. Full decode likely exceeds Workers Free's **10 ms CPU** budget substantially. Checked-in Worker default is **header-only**; enable `ANALYSIS_MODE:full` explicitly for a suitable CPU budget. Large JSON/base64 parsing can also exceed 10 ms even with header-only checks. Full mode is capped at 4 MP and samples metrics at <=256 px long side.

## Open operator/launch issues

- Decide DNS/subdomain and deployment routing: existing site is on Netlify; proposed URL `https://mcp.profilfoto-ki.de/mcp` is inactive.
- Confirm legal contacts/address, log retention, processor/legal details and publish draft policy/support/terms routes. Verify developer/domain identity; record demo video and live ChatGPT/Claude golden-prompt results before submission. None are represented as completed.
- Public-hostname DNS rebinding/private DNS resolution is not pinned by the fetch-based SSRF guard; stronger egress policy or an image-host allowlist remains necessary if that threat is in scope. Per-isolate hashed-IP limiting is best-effort; global rate rules and external uptime monitoring remain operator setup.
- Face framing is honestly unchecked; sharpness and overall score are heuristics. WebP is header-only; EXIF orientation/color management are not applied. Review original images manually. No generation/editing or personal-attribute judgments.
