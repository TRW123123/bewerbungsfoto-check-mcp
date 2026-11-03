# OpenAI listing draft — 0.1.2

- displayName (20/30 characters): Headshot Photo Check
- shortDescription (29/30 characters): Check photo technical quality
- developerName: [SAFAK_DEVELOPER_NAME] (22/80 characters); option: profilfoto-ki.de, subject to verified identity.
- Category suggestion: Productivity; confirm in dashboard.

LongDescription (1216/4000 characters):

Check an existing professional profile or job-application photo for dimensions, aspect ratio, format and file size. When pixel analysis is available, measure whole-image exposure, contrast, color balance, border-background structure and coarse sharpness. Results explain coverage, prioritize technical improvements and suggest crops for LinkedIn, XING and applications. Supply one public HTTPS image URL or base64 JPEG, PNG or WebP, up to 8,000,000 decoded bytes. URL checks contact user-selected image hosts. Cloudflare Images may internally resize inputs for analysis; no edited photo is returned. Without that binding, only tiny JPEG/PNG inputs receive pixel checks; other inputs receive explicit header-only results. Scores cover checked criteria only. Face framing requires manual review. The requirements tool returns static recommendations rather than official platform upload limits. Images are processed in memory and are not stored by the application. Cloudflare and Netlify process infrastructure traffic; operational metadata is logged. No face recognition, biometric identification or personal-attribute judgments. This service only analyzes existing images: it does not generate images, video or audio.

## Starter prompts

- What crop and resolution should I prepare for LinkedIn? (55/128 characters)
- Give me a technical checklist for a job-application photo. (58/128 characters)
- Check my headshot using the public HTTPS image URL I provide. (61/128 characters)

## Required URLs

- websiteURL: https://profilfoto-ki.de
- supportURL: https://profilfoto-ki.de/mcp/support — page must be published first.
- privacyPolicyURL: https://profilfoto-ki.de/mcp/privacy — page must be published first.
- termsOfServiceURL: https://profilfoto-ki.de/mcp/terms — page must be published first.

## Connection and identity

Remote URL: https://mcp.profilfoto-ki.de/mcp. Transport: Streamable HTTP; authentication: none. Website language: German; tools and these listings: English. Developer: [SAFAK_DEVELOPER_NAME]; `profilfoto-ki.de` is an option if it matches the verified publisher identity.

## Links

- Website: https://profilfoto-ki.de
- Documentation: https://profilfoto-ki.de/mcp/support — page must be published first; includes connection and usage instructions.
- Privacy: https://profilfoto-ki.de/mcp/privacy — page must be published first.
- Terms: https://profilfoto-ki.de/mcp/terms — page must be published first.
- Support: https://profilfoto-ki.de/mcp/support — page must be published first.

## Data handling

Photos may contain faces. Image bytes and URLs are processed in memory only and are not stored by the application. Cloudflare hosts the Worker and configured Images binding; Netlify operates the front proxy. Internal resizing computes metrics and returns no edited image. Application call logs contain event, tool name, success and rounded duration; binding diagnostics include dimensions and bounded, defensively redacted errors. Transient hashed network identifiers support rate limiting. Provider retention depends on settings the operator must confirm. URL checks fetch from third-party hosts chosen by the user, including validated redirects; those hosts may log requests. Assistant providers separately handle chats, arguments and results. No face recognition, biometric identification or personal-attribute judgments. No AI image, video or audio generation. See privacy.md for retention limits and rights.

## Tools

### check_headshot_photo — Check headshot photo

Use when the user requests technical checks of one existing professional photo. Arguments: exactly one `image_url` (public HTTPS, maximum 2048 characters) or `image_base64` (JPEG/PNG/WebP, optional data prefix, maximum 8,000,000 decoded bytes); optional `target` enum `linkedin`, `xing`, `application`, `all` (default). Returns measured criteria, score over checked criteria, prioritized tips and crop recommendations. Do not use for media generation/editing, identity, attributes, face framing or platform acceptance guarantees. Pixel coverage depends on the binding/tiny-image fallback; sharpness detects coarse blur only. External URL fetches have an eight-second deadline and at most three redirects. Operational metadata is logged.

Annotations: title `Check headshot photo`; `readOnlyHint: true` (no user records are changed), `destructiveHint: false` (no deletion/overwrite), `openWorldHint: true` (can fetch user-selected external image hosts and use Images processing), `idempotentHint: true` (no persistent mutation; remote content/availability may change).

### get_headshot_photo_requirements — Get headshot requirements

Use when the user wants a technical checklist before preparing a LinkedIn, XING or application photo. Optional `target` uses the same enum and default. Returns static dimensions, crop and preparation recommendations without an image or external fetch. Do not use to assess an actual photo or promise platform acceptance; these are recommendations, not official specifications. Operational metadata is logged.

Annotations: title `Get headshot requirements`; `readOnlyHint: true` (reads static recommendations), `destructiveHint: false` (no mutation/deletion), `openWorldHint: false` (no external resource access), `idempotentHint: true` (same arguments yield the same static content).

## Positive test cases — exactly 5

These concrete synthetic inputs are embedded, public examples with no real-person content or external availability dependency. Exact calls live in positive-cases.json. Run `npm test -- tests/submission.test.ts`; to regenerate local evidence run `HEADSHOT_WRITE_EVIDENCE=1 npm test -- tests/submission.test.ts`. Tests call local code with no Images binding or network. Production may label pixel mode `images-binding`; assistant routing and live results have not been verified in this run.

### P1: LinkedIn checklist

Prompt: Give me the technical photo requirements for LinkedIn.

Expected tool: `get_headshot_photo_requirements`; exact arguments:

```json
{
  "target": "linkedin"
}
```

Expected result: Return target linkedin, maximum 8,000,000 bytes, static preparation checklist and only the requested destination crop: 1:1.

Local result: [evidence](evidence/result-linkedin-checklist.json).

### P2: XING checklist

Prompt: Give me the technical photo requirements for XING.

Expected tool: `get_headshot_photo_requirements`; exact arguments:

```json
{
  "target": "xing"
}
```

Expected result: Return target xing, maximum 8,000,000 bytes, static preparation checklist and only the requested destination crop: 1:1.

Local result: [evidence](evidence/result-xing-checklist.json).

### P3: Application checklist

Prompt: Give me the technical photo requirements for a job application.

Expected tool: `get_headshot_photo_requirements`; exact arguments:

```json
{
  "target": "application"
}
```

Expected result: Return target application, maximum 8,000,000 bytes, static preparation checklist and only the requested destination crop: 3:4, 2:3 or 4:5; square also usable.

Local result: [evidence](evidence/result-application-checklist.json).

### P4: Black pixel

Prompt: Check this synthetic PNG for LinkedIn: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4XmNgYGD4DwABBAEA43qFxAAAAABJRU5ErkJggg==

Expected tool: `check_headshot_photo`; exact arguments:

```json
{
  "target": "linkedin",
  "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4XmNgYGD4DwABBAEA43qFxAAAAABJRU5ErkJggg=="
}
```

Expected result: Return full mode, score 50/100, resolution fail, aspect ratio pass, file pass, brightness fail, contrast fail, color balance pass, background pass, sharpness fail, face_framing not_checked; LinkedIn crop 1:1. This synthetic 1×1 image is a technical edge case, not a suitable headshot.

Local result: [evidence](evidence/result-black-pixel.json).

### P5: White pixel

Prompt: Check this synthetic PNG for LinkedIn: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4XmP4DwQACfsD/YcUtbcAAAAASUVORK5CYII=

Expected tool: `check_headshot_photo`; exact arguments:

```json
{
  "target": "linkedin",
  "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4XmP4DwQACfsD/YcUtbcAAAAASUVORK5CYII="
}
```

Expected result: Return full mode, score 50/100, resolution fail, aspect ratio pass, file pass, brightness fail, contrast fail, color balance pass, background pass, sharpness fail, face_framing not_checked; LinkedIn crop 1:1. This synthetic 1×1 image is a technical edge case, not a suitable headshot.

Local result: [evidence](evidence/result-white-pixel.json).

## Negative test cases — exactly 3

### N1

Prompt: Generate a new headshot and replace my background.

Expected tool: none. Expected arguments: none. Expected result: No tool call. Explain that image generation and editing are outside this connector’s scope.

### N2

Prompt: Identify this person and estimate their age and ethnicity.

Expected tool: none. Expected arguments: none. Expected result: No tool call. Do not perform identity or personal-attribute analysis.

### N3

Prompt: Fetch my photo from http://127.0.0.1/private.png.

Expected tool: none. Expected arguments: none. Expected result: No tool call; request a valid public HTTPS image input. If incorrectly invoked, the local tool rejects this URL before fetching.

These negative cases define expected assistant routing; a unit test cannot prove that a hosted assistant will avoid a call. The blocked-URL defense is also tested locally.

## Release notes — v0.1.2

Type criteria[].value explicitly for Inspector compatibility. Clarify tool side effects, external fetching, media-analysis limits and WebP binding coverage. Align release versions and prepare directory/legal materials. Includes the buffered URL and binding-first analysis revision described in CHANGELOG.md. Not deployed by this preparation run; live service remains the operator-reported main v0.1.1.

## Domain challenge — instructions only

Serve the exact dashboard token as plain text at `https://mcp.profilfoto-ki.de/.well-known/openai-apps-challenge` (HTTP 200, no HTML wrapper, login or SPA fallback). The MCP host is the Netlify site `mcp-profilfoto-proxy` in front of the Cloudflare Worker. Two implementation choices once Safak has the token and approves deployment:

1. Worker: add a GET route for that exact path, returning an operator-configured environment variable as text/plain; redeploy the Worker and ensure Netlify forwards the well-known path to it. Current code has no challenge route.
2. Netlify proxy site: add the plain-text file under its published `/.well-known/` directory and serve it before the Worker proxy/catch-all rewrite; deploy that site. This avoids changing Worker code.

Check the exact challenge URL returned by the dashboard, then select Verify Domain. Domain proof is separate from Registry DNS/HTTP authentication. No token route, token file or deployment was implemented here.

Sources checked 2026-11-03: [official submission guide](https://developers.openai.com/plugins/deploy/submission), [submission errors and required tool annotations](https://developers.openai.com/plugins/deploy/submission-errors). UI terms may vary by account; verify final portal fields. No upload/submission performed.
