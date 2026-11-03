# Listing metadata

```json
{
  "displayName": "Headshot Photo Check",
  "shortDescription": "Check photo technical quality",
  "longDescription": "Check an existing professional profile or job-application photo for dimensions, aspect ratio, format and file size. When pixel analysis is available, measure whole-image exposure, contrast, color balance, border-background structure and coarse sharpness. Results explain coverage, prioritize technical improvements and suggest crops for LinkedIn, XING and applications. Supply one public HTTPS image URL or base64 JPEG, PNG or WebP, up to 8,000,000 decoded bytes. URL checks contact user-selected image hosts. Cloudflare Images may internally resize inputs for analysis; no edited photo is returned. Without that binding, only tiny JPEG/PNG inputs receive pixel checks; other inputs receive explicit header-only results. Scores cover checked criteria only. Face framing requires manual review. The requirements tool returns static recommendations rather than official platform upload limits. Images are processed in memory and are not stored by the application. Cloudflare and Netlify process infrastructure traffic; operational metadata is logged. No face recognition, biometric identification or personal-attribute judgments. This service only analyzes existing images: it does not generate images, video or audio.",
  "claudeOneLiner": "Check professional-photo dimensions, crops and technical quality with clear limits and prioritized improvement tips.",
  "starterPrompts": [
    "What crop and resolution should I prepare for LinkedIn?",
    "Give me a technical checklist for a job-application photo.",
    "Check my headshot using the public HTTPS image URL I provide."
  ],
  "categories": [
    "Productivity"
  ],
  "developerName": "[SAFAK_DEVELOPER_NAME]",
  "websiteURL": "https://profilfoto-ki.de",
  "supportURL": "https://profilfoto-ki.de/mcp/support",
  "privacyPolicyURL": "https://profilfoto-ki.de/mcp/privacy",
  "termsOfServiceURL": "https://profilfoto-ki.de/mcp/terms"
}
```

Canonical submission drafts: [Claude](../submission/listing-claude.md) and [OpenAI](../submission/listing-openai.md). Legal/support pages must be published first. Developer identity is unconfirmed; `profilfoto-ki.de` is an option subject to verified identity. Website language: German; tool responses: English. No directory submission has been made. Original icon: [SVG](../submission/icon.svg), [512 px PNG](../submission/icon-512.png).
