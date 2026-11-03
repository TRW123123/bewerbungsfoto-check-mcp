# Support — Headshot Photo Check

Effective date: 2026-11-03

## Contact

Operator: Safak Tepecik, operating as Profilfoto KI, Heidestraße 2, 58239 Schwerte, Germany. For help, privacy requests, complaints or accessibility needs, email info@profilfoto-ki.de. For confidential vulnerability reports, email info@profilfoto-ki.de. No response-time guarantee is offered.

## Connect and use

Connect your assistant to https://mcp.profilfoto-ki.de/mcp using Streamable HTTP. Authentication: none. Available tools: check_headshot_photo and get_headshot_photo_requirements. Request a checklist for linkedin, xing, application or all. To check a photo, supply exactly one public HTTPS image URL or base64 JPEG, PNG or WebP, up to 8,000,000 decoded bytes. The website is https://profilfoto-ki.de; the connector's responses are in English.

## Troubleshooting

If a URL fails, check that it directly returns an image with an image/* Content-Type, needs no login, uses HTTPS without credentials or a custom port, and has no more than three redirects. Internal hostnames and IP literals are blocked. Fetching has an eight-second limit. Try a smaller upright JPEG or PNG if decoding fails. Large base64 requests can exceed Worker CPU limits even within the input size limit; prefer a public image URL without secrets.

A header-only result means pixel checks were not available. The optional Cloudflare Images binding supports bounded pixel analysis; without it only tiny JPEG/PNG inputs have a local pixel fallback. A score covers checked criteria only. Sharpness detects coarse blur and cannot prove accurate focus. Review the original; face framing is not automatically checked. Crop suggestions do not create an edited image. Requirements are recommendations rather than official platform limits. If requests are rate limited, wait one minute before retrying.

## Report a problem safely

Include your assistant/client name, approximate time and timezone, tool name, analysis_mode if available, and a short description of expected and actual behavior. Do not send the photo, base64, credentials, private URLs or personal chat history. Remove personal information from any error excerpt. The application cannot retrieve previous photos because it does not store them. For security reports, describe reproduction using synthetic inputs and send details privately to the security contact.

## Privacy and terms

Privacy: https://profilfoto-ki.de/mcp/privacy. Terms: https://profilfoto-ki.de/mcp/terms. You can stop future calls by disconnecting the connector in your assistant. Your assistant's chat and upload retention follow that provider's policies.
