# Local development verification — 2026-11-03

`npx wrangler dev --port 8787 --ip 127.0.0.1` started successfully using Wrangler 4.157.0 and local workerd. No Cloudflare login or remote storage binding was needed. `scripts/smoke.sh http://127.0.0.1:8787` completed initialize, tools/list and get_headshot_photo_requirements, each with HTTP 200 and JSON results. A generated JPEG checker call also returned HTTP 200, nine criteria and header-only mode. A second local run with `--var ANALYSIS_MODE:full` successfully analysed generated JPEG and PNG images (HTTP 200, full mode, nine criteria each). Both development processes were stopped after verification.

The first dependency install requested a nonexistent date-specific workers-types release and returned: `npm error notarget No matching version found for @cloudflare/workers-types@^4.20261103.0.` The project was corrected to an available version and the lockfile records the installed dependency set. This was not a Wrangler login failure. No login was attempted.

No deployment or remote connector validation has been performed. Local success does not prove Workers Free CPU compliance. See README Known limits and BUILD-REPORT.md.

Second pass: `[images] binding = "IMAGES"` started in local mode without login. Auto-mode generated base64 JPEG calls at 1500×2000 and 3000×4000 returned `images-binding`, nine criteria and pixel checks. `scripts/benchmark-local.mjs` records outputs/timings without input photo bytes. Default smoke was repeated. No remote mode, account configuration or paid service was used. Processes were stopped.
