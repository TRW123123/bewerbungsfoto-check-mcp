# Claude listing draft — 0.1.2

Name (20/100 characters): Headshot Photo Check

One-liner (116/200 characters): Check professional-photo dimensions, crops and technical quality with clear limits and prioritized improvement tips.

Long description (1216/2000 characters):

Check an existing professional profile or job-application photo for dimensions, aspect ratio, format and file size. When pixel analysis is available, measure whole-image exposure, contrast, color balance, border-background structure and coarse sharpness. Results explain coverage, prioritize technical improvements and suggest crops for LinkedIn, XING and applications. Supply one public HTTPS image URL or base64 JPEG, PNG or WebP, up to 8,000,000 decoded bytes. URL checks contact user-selected image hosts. Cloudflare Images may internally resize inputs for analysis; no edited photo is returned. Without that binding, only tiny JPEG/PNG inputs receive pixel checks; other inputs receive explicit header-only results. Scores cover checked criteria only. Face framing requires manual review. The requirements tool returns static recommendations rather than official platform upload limits. Images are processed in memory and are not stored by the application. Cloudflare and Netlify process infrastructure traffic; operational metadata is logged. No face recognition, biometric identification or personal-attribute judgments. This service only analyzes existing images: it does not generate images, video or audio.

Categories: Productivity, Creative (2 suggestions from the directory taxonomy; confirm available choices in the portal).

## Example prompts

1. What crop and resolution should I prepare for LinkedIn?
2. Give me a technical checklist for a job-application photo.
3. Check the technical quality of the headshot at the public HTTPS URL I provide.
4. Explain which technical checks were skipped for my photo.

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

## Review notes

Claude excludes connectors that generate images, video or audio via AI. This connector only analyzes existing images and returns text/structured measurements. Its internal resize is deterministic analysis preprocessing. Neither tool creates media. Client routing must still be verified in Claude before submission; local tests do not prove assistant routing.

Sources checked 2026-11-03: [Claude submission requirements](https://claude.com/docs/connectors/building/submission), [directory categories](https://claude.com/marketplace/connectors-plugins). No submission performed.
