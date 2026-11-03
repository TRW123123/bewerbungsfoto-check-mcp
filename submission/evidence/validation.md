# Local validation — 2026-11-03

- `npm test`: 134 tests passed across 9 files, including 5 concrete submission calls, output schema checks, exact saved-result comparisons, catalog limits, image safety and the negative private-URL fetch guard.
- `npm run typecheck`: passed, no TypeScript errors.
- Official Registry schema downloaded via curl from https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json; local Ajv validation including URI format checks passed. Schema SHA-256: `3fba09590c99f61735d234822279f4223fab9e300c0a81e81c91ab62a4114de0`.
- Listing lengths checked: name 20; short description 29; Claude one-liner 116; long description 1216; all three starter prompts within 128. Five positive cases, three negative cases and five saved local results confirmed.
- Legal HTML: three pages checked against every source Markdown paragraph, canonical URLs, matching placeholders and absence of noindex. Files reside in the requested shared directory outside git; no website repo edited.
- Icon: PNG signature/IHDR inspected, 512×512 pixels; visually reviewed. Original SVG rendered with temporary @resvg/resvg-js outside the repository.
- `git diff --check`: passed. `bash scripts/secret-scan.sh`: passed with gitleaks over repository history and staged changes; no leaks found.

Saved result-*.json files are deterministic outputs of local callTool calls with no Images binding or network. They contain only synthetic pixels/static recommendations and are useful for reviewer reproduction; retained under evidence/ rather than mixed with listing sources. Hosted assistant routing, live v0.1.2 behavior, directory acceptance, public legal URLs and domain verification remain unverified. No deployment or publication performed.
