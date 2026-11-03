# Headshot Photo Check

A small English-language remote MCP server for checking the technical quality of professional profile and job-application photos. It turns measurable image issues into prioritized advice, without judging the person pictured. MIT licensed; no account, API key or paid analysis API.

## Status: not deployed, not submitted

Proposed production endpoint: **https://mcp.profilfoto-ki.de/mcp**. This URL is NOT set up. The existing site is on Netlify; DNS, subdomain and routing are to be decided by Safak. `server.json` prepares `de.profilfoto-ki/headshot-photo-check` for domain authentication in the official MCP Registry; it has NOT been published. No remote or repository has been created.

## What it checks

Two read-only tools:

| Tool | Inputs | Outputs |
|---|---|---|
| `check_headshot_photo` | Exactly one `image_url` (public HTTPS) or `image_base64` (with/without data prefix); optional `target`: `linkedin`, `xing`, `application`, `all` (default) | Score 0–100, verdict, criteria with status/value/threshold/tip, per-target crop recommendations, prioritized tips, mode and coverage notes |
| `get_headshot_photo_requirements` | Optional `target` with the same enum/default | Static recommendations, dimensions, formats and checklist |

Full mode checks resolution, aspect ratio, size/format, mean luminance and clipping, luminance contrast/dynamic range, overall color balance, experimental sharpness and border-background structure. It compares border and center edge metrics. Face size/framing returns `not_checked`; no unreliable face or skin-tone guessing is used. It performs no biometric identification or attractiveness, identity, age, gender, ethnicity or other personal-attribute judgments. It does not generate or edit images.

Reference logic and translated tips come from the existing read-only application checker. [Port details](docs/reference-port.md) document exact thresholds and discrepancies between its prose and code. LinkedIn/XING square crops and application portrait crops are **recommendations**, not official platform specifications. No official platform upload-size numbers are claimed. Added sharpness thresholds and service size limits are also **recommendations/service limits**, not platform rules.

A score averages checked criteria only (pass=100, warn=60, fail=0). Unchecked criteria do not affect it. Verdict severity follows the reference: any failure means technical issues, any warning means room for improvement. A high partial score does not mean an unchecked photo is suitable.

## Examples

ChatGPT prompt: “Check my LinkedIn headshot at https://images.example.org/headshot.jpg and prioritize improvements.” Replace the illustrative URL with a public image you are authorized to use. The hostname is illustrative, not a supplied photo.

Claude prompt: “Check this base64 PNG for my application and explain which checks were skipped.” Supply the actual base64 as `image_base64`, with `target: "application"`.

Illustrative output excerpt (not a measured person/photo):

```json
{
  "overall_score": 87,
  "verdict": "Partial check: Usable with room for improvement",
  "analysis_mode": "header-only",
  "criteria": [
    {"id":"resolution","label":"Resolution and print suitability","status":"warn","value":{"width":600,"height":800},"threshold":"pass: short >=1200, long >=1500; warn: short >=600, long >=750","tip":"Suitable for online applications and standard PDFs. For larger cover-page prints, use at least 1200 × 1600 pixels."}
  ]
}
```

The actual result includes all nine criteria, coverage notes, crop recommendations and prioritized tips. To ask without uploading: “What crop and resolution should I prepare for XING?” calls the requirements tool.

## Connect after an operator deployment

All snippets below use the proposed, currently inactive endpoint. This is a stateless Streamable HTTP service with JSON responses and no authentication. Hosted assistants cannot reach your loopback development URL.

Claude: Settings → Connectors → Add custom connector → enter `https://mcp.profilfoto-ki.de/mcp`. Availability and menu names depend on account/workspace configuration. Claude Code:

```sh
claude mcp add --transport http headshot-photo-check https://mcp.profilfoto-ki.de/mcp
```

ChatGPT: enable Developer mode where available, then add a custom connector/custom MCP server with that URL and no authentication. Workspace permissions may apply; current UI may label this Plugins → Add custom MCP server. See [official OpenAI instructions](https://developers.openai.com/api/docs/guides/custom-mcp-server). These are setup instructions, not a claim of directory availability.

Codex: the locally installed `codex mcp add --help` confirms `--url` for Streamable HTTP:

```sh
codex mcp add headshot-photo-check --url https://mcp.profilfoto-ki.de/mcp
```

Equivalent `~/.codex/config.toml`:

```toml
[mcp_servers.headshot_photo_check]
url = "https://mcp.profilfoto-ki.de/mcp"
```

Cursor `.cursor/mcp.json`:

```json
{"mcpServers":{"headshot-photo-check":{"url":"https://mcp.profilfoto-ki.de/mcp"}}}
```

## Local development

```sh
npm install
npm run dev
# In another terminal:
npm run typecheck
npm test
bash scripts/smoke.sh http://127.0.0.1:8787
npm run secret-scan
```

No Cloudflare login, account bindings or secrets are needed for local development. Wrangler is a project devDependency. Default mode is auto with an offline Images binding. It resizes to at most 128 px before pixel analysis. No login is required. To exercise the diagnostic full decoder locally:

```sh
npx wrangler dev --port 8787 --ip 127.0.0.1 --var ANALYSIS_MODE:full
```

Tests generate all JPEG/PNG fixtures in memory; no real-person images are committed. `tests/benchmark.test.ts` generates a 1500×2000 JPEG and prints wall/process CPU timings. No deploy commands are needed.

## Protocol and limits

POST `/mcp` supports initialize, initialized notifications, tools/list, tools/call and ping. Versions: 2025-06-18, 2025-03-26, 2025-11-25; unknown initialize versions negotiate 2025-06-18. Unknown protocol headers return 400. Notifications return 202, GET `/mcp` returns helpful 405 JSON. GET `/health` returns `{"status":"ok"}`. CORS permits all origins and MCP headers. No session storage, SSE requirement or authentication.

Image limit: 8,000,000 bytes; request-body limit: 10,670,000 bytes to allow base64 JSON. URL requests require HTTPS, public multi-label hostnames, image/* content type, an 8-second total timeout including body reads, at most 3 redirects and streamed size enforcement. IP literals (including public IPs), credentials, custom ports, localhost and internal/reserved suffixes are rejected, including redirect destinations. DNS rebinding/private addresses behind public DNS names cannot be pinned by this fetch-based guard; production must add an egress/network policy or restricted image-host allowlist if stronger isolation is needed. Do not expose this as an internal-network proxy.

A best-effort per-isolate limiter permits 30 requests per minute per hashed network address, with a bounded transient map. It is not a global edge-wide quota; configure an appropriate Cloudflare rate rule before launch. No raw IP is stored or logged by application code.

## Known limits

Auto mode uses the optional Images binding for JPEG/PNG/WebP pixel checks, with a maximum 128 px long side. Tiny JPEG/PNG inputs (<=16,384 pixels) decode directly. Header scores always describe the original file. Missing bindings, quota exhaustion and transform errors produce explicit `analysis_mode: "header-only"` and a reason. The checked-in binding works offline without login. Images Free includes 5,000 unique monthly transformations; new transformations beyond that fail without overage charges on Free. Operators must keep their account on Images Free. See [sourced CPU/quota research](docs/cpu-budget.md).

Sharpness measures coarse blur only; reduced images conceal fine focus problems. No DC-only JPEG or AC-energy decoder is used (Option A selected). Full diagnostic mode is limited to 4 MP JPEG / 1 MP 8-bit PNG. PNG metadata/inflate guards remain. Original headers are bounded at 100 MP / 65,535 px per side. EXIF orientation/color handling may differ across resize implementations; re-export upright. Face framing, semantic subject detection and original-resolution focus are unchecked.

Local benchmark numbers and methodology are in [BUILD-REPORT.md](BUILD-REPORT.md) and [machine-readable results](docs/benchmark-local.json). The previous full 1500×2000 JPEG decoder measured 238.51 ms wall / 343.02 ms process CPU. The new path avoids that full decode inside the Worker. Local HTTP wall times include the offline image service; local process CPU is not Cloudflare request CPU. Production CPU remains unknown. Large JSON/base64 requests can still exceed the 10 ms Free budget; these measurements are no guarantee.

## Privacy and operations

Photos and URLs are analysed in server memory and not stored by the application. This differs from the browser-only reference: the remote service receives the photo. The image host receives URL fetches; Cloudflare processes hosting/network traffic. Only anonymous per-tool name/success/duration counters are logged. Transient hashed network addresses support rate limiting for up to 60 seconds and are not logged. Client/hosting retention policies still apply. See the [DRAFT privacy policy](docs/privacy-policy.md), [terms](docs/terms-of-service.md) and [support/security](docs/support.md). Contact details and log retention must be confirmed by the operator.

Optional Analytics Engine: after operator account/dataset setup, uncomment the `[[analytics_engine_datasets]]` block in wrangler.toml at the top level (outside `[vars]`), binding `ANALYTICS`, dataset `headshot_calls`. Calls are guarded by `if`/optional binding checks and send only `blobs=[tool, ok]`, `doubles=[ms]`; console counters remain the fallback. Review the current [Cloudflare Analytics Engine limits](https://developers.cloudflare.com/analytics/analytics-engine/limits/) and free-tier allowance before enabling; no account or billing setup was performed here.

Before publication: confirm legal contacts/retention, publish the proposed HTTPS policy/support pages, decide DNS and deployment CPU budget, prepare domain proofs, configure global rate/egress controls and an external `/health` uptime monitor, run the [golden prompts](docs/openai-test-cases.md) in ChatGPT and Claude, record a demo video, and obtain Safak's approval for each deployment/submission. These are launch tasks, not completed actions. Review anonymous call analytics weekly for misrouting. [Listing draft](docs/listing.md), [changelog](CHANGELOG.md), [build report](BUILD-REPORT.md).
