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

No Cloudflare login, account bindings or secrets are needed for local development. Wrangler is a project devDependency. Default mode is header-only for the Workers Free CPU budget. To exercise full analysis locally:

```sh
npx wrangler dev --port 8787 --ip 127.0.0.1 --var ANALYSIS_MODE:full
```

Tests generate all JPEG/PNG fixtures in memory; no real-person images are committed. `tests/benchmark.test.ts` generates a 1500×2000 JPEG and prints wall/process CPU timings. No deploy commands are needed.

## Protocol and limits

POST `/mcp` supports initialize, initialized notifications, tools/list, tools/call and ping. Versions: 2025-06-18, 2025-03-26, 2025-11-25; unknown initialize versions negotiate 2025-06-18. Unknown protocol headers return 400. Notifications return 202, GET `/mcp` returns helpful 405 JSON. GET `/health` returns `{"status":"ok"}`. CORS permits all origins and MCP headers. No session storage, SSE requirement or authentication.

Image limit: 8,000,000 bytes; request-body limit: 10,670,000 bytes to allow base64 JSON. URL requests require HTTPS, public multi-label hostnames, image/* content type, an 8-second total timeout including body reads, at most 3 redirects and streamed size enforcement. IP literals (including public IPs), credentials, custom ports, localhost and internal/reserved suffixes are rejected, including redirect destinations. DNS rebinding/private addresses behind public DNS names cannot be pinned by this fetch-based guard; production must add an egress/network policy or restricted image-host allowlist if stronger isolation is needed. Do not expose this as an internal-network proxy.

A best-effort per-isolate limiter permits 30 requests per minute per hashed network address, with a bounded transient map. It is not a global edge-wide quota; configure an appropriate Cloudflare rate rule before launch. No raw IP is stored or logged by application code.

## Known limits

Full JPEG/PNG decode occurs before downsampling. It is likely to exceed Workers Free's 10 ms CPU allowance for large photos; A local isolated Vitest run on 2026-11-03 with a generated 1500×2000 JPEG (317,387 bytes) measured **238.51 ms wall time**, **343.02 ms process CPU** and **0.077 ms header-only wall time**. Process CPU is aggregate process usage, not Cloudflare per-request CPU; encoding was excluded. These local measurements do not establish edge latency. The checked-in fallback `ANALYSIS_MODE = "header-only"` skips all pixel checks and labels results partial. Even header-only requests with large base64 bodies incur JSON/base64 CPU; 10 ms is not guaranteed. Use smaller inputs and benchmark the actual edge before launch. Full mode is an explicit operator choice for a suitable CPU budget.

Full decoding is capped at 4 MP, 8-bit PNG/JPEG and decoder memory bounds; PNG compressed metadata is stripped and inflated pixel bytes are bounded before decode; larger images receive header-only results. Header parsing allows at most 100 MP / 65,535 px per side. WebP VP8/VP8L/VP8X headers provide dimensions only and a convert-to-JPEG/PNG note. Header-only checks do not validate all compressed pixel data. EXIF orientation is not applied; re-export upright. Animated PNG/frame timing, ICC color management and semantic subject detection are not supported. Nearest-neighbor sampling, texture, clothing and image composition can affect pixel metrics. Sharpness is experimental, not proof of focus.

## Privacy and operations

Photos and URLs are analysed in server memory and not stored by the application. This differs from the browser-only reference: the remote service receives the photo. The image host receives URL fetches; Cloudflare processes hosting/network traffic. Only anonymous per-tool name/success/duration counters are logged. Transient hashed network addresses support rate limiting for up to 60 seconds and are not logged. Client/hosting retention policies still apply. See the [DRAFT privacy policy](docs/privacy-policy.md), [terms](docs/terms-of-service.md) and [support/security](docs/support.md). Contact details and log retention must be confirmed by the operator.

Optional Analytics Engine: after operator account/dataset setup, uncomment the `[[analytics_engine_datasets]]` block in wrangler.toml at the top level (outside `[vars]`), binding `ANALYTICS`, dataset `headshot_calls`. Calls are guarded by `if`/optional binding checks and send only `blobs=[tool, ok]`, `doubles=[ms]`; console counters remain the fallback. Review the current [Cloudflare Analytics Engine limits](https://developers.cloudflare.com/analytics/analytics-engine/limits/) and free-tier allowance before enabling; no account or billing setup was performed here.

Before publication: confirm legal contacts/retention, publish the proposed HTTPS policy/support pages, decide DNS and deployment CPU budget, prepare domain proofs, configure global rate/egress controls and an external `/health` uptime monitor, run the [golden prompts](docs/openai-test-cases.md) in ChatGPT and Claude, record a demo video, and obtain Safak's approval for each deployment/submission. These are launch tasks, not completed actions. Review anonymous call analytics weekly for misrouting. [Listing draft](docs/listing.md), [changelog](CHANGELOG.md), [build report](BUILD-REPORT.md).
