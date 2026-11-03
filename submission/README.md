# Submission preparation — v0.1.2

Branch: `submission-prep`. Live service is operator-reported main v0.1.1 at https://mcp.profilfoto-ki.de/mcp, via Netlify `mcp-profilfoto-proxy` to the Cloudflare Worker. This branch is preparation only. No deployments, registry publication, directory submission, merge, repository visibility change or paid service use occurred in this run.

## Files

| File | Purpose |
|---|---|
| listing-claude.md | English Claude fields, character counts, prompts, tools, annotations, links and data summary |
| listing-openai.md | English OpenAI fields/counts, five positive and three negative cases, release notes and domain challenge instructions |
| privacy.md, terms.md, support.md | Full English publication texts with operator details filled from the profilfoto-ki.de Impressum |
| registry-verification.md | Exact apex DNS/HTTP proof choices, future login/publish commands and key-handling instructions |
| demo-video-script.md | 80-second recording shot list with two positive prompts and one negative prompt |
| icon.svg, icon-512.png | Original portrait-frame/check artwork and its 512×512 raster export; no third-party logos |
| positive-cases.json | Five exact reproducible local calls and prompts using static requirements and embedded synthetic PNGs |
| negative-cases.json | Three expected no-call routing prompts; hosted assistant behavior still needs observation |
| evidence/result-*.json | Five local results generated from the positive cases; synthetic content only, no live account/reviewer evidence |
| evidence/validation.md | Validation methods, counts and scope |

The icon was rendered from SVG using @resvg/resvg-js installed under `/tmp/headshot-icon-render`, outside the repository. No rendering dependency was added to package.json. PNG IHDR dimensions were verified as 512×512.

Proposed website HTML files are outside this repository at `/home/box/shared/seo/mcp-legal-pages/profilfoto-ki.de/{privacy,terms,support}/index.html`, with placement instructions in that directory's README.md. They are intentionally not website-repository edits and are not included by this branch push. Source Markdown is versioned here.

## Safak's remaining actions

1. Contact details were filled on 2026-11-03 from the live Impressum and Datenschutz pages (https://www.profilfoto-ki.de/impressum, https://www.profilfoto-ki.de/datenschutz): operator Safak Tepecik, operating as Profilfoto KI, Heidestraße 2, 58239 Schwerte, Germany; contact and security email info@profilfoto-ki.de (no separate security address is published); effective date 2026-11-03; developer name `profilfoto-ki.de`. Review before publishing.
2. Confirm actual infrastructure log retention, processor agreements, transfers and applicable legal text. The repository cannot establish live provider retention settings. Update Markdown and HTML together.
3. Review and approve a later Worker deployment of v0.1.2. The code changes in this branch are the Inspector output-schema fix, version metadata, catalog wording and WebP advice. The existing buffered URL/binding-first implementation is retained. The changes remain on this branch until review; do not merge automatically.
4. Publish the three completed legal/support pages on the website only after deployment approval. Each proposed /mcp URL must work publicly before submission. Support page includes the public usage documentation; do not link reviewers to a private GitHub repository.
5. Confirm the shorter Registry name before first publish; either headshot-check or headshot-photo-check is valid. Establish apex-domain proof using one method in registry-verification.md. Never commit the private key. Registry publication needs separate explicit approval.
6. Obtain the OpenAI challenge token and approve serving it on the MCP host through the Worker or Netlify proxy as described in listing-openai.md. No token-dependent implementation exists yet.
7. Test both tools in Claude and ChatGPT using authorized accounts, record actual routing for all submission cases and the broader docs/openai-test-cases.md prompts, and record the demo. Local tests do not demonstrate hosted client routing. Verify actual live mode/coverage after any approved deployment.
8. Confirm categories and identity in the current submission portals, then separately authorize any directory submission. Authentication is none; no demo credentials are needed. Keep this repository private. Directory acceptance is not promised; Claude excludes AI media-generation connectors and this service only analyzes existing images.

Official references and review date are recorded in each listing and registry-verification.md. No publishing commands in those documents were executed.
