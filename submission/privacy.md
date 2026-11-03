# Privacy policy — Headshot Photo Check

Effective date: [EFFECTIVE_DATE]

## Controller and contact

[SAFAK_LEGAL_NAME], [SAFAK_POSTAL_ADDRESS], operates Headshot Photo Check at https://mcp.profilfoto-ki.de/mcp. Contact: [SAFAK_CONTACT_EMAIL]. Security reports: [SAFAK_SECURITY_CONTACT_EMAIL].

## Data and purposes

When you request a check, we process the image bytes you supply as base64 or retrieve from your public HTTPS image URL, that URL, your selected destination, and technical image measurements. Photos may contain faces and other personal information. We check dimensions, format, aspect ratio and, when available, whole-image exposure, contrast, color balance, background and coarse sharpness. We return measurements, recommendations and limitations to your assistant. We do not perform face recognition, create biometric templates, identify people, or judge attractiveness, identity, age, gender, ethnicity or other personal attributes. We do not generate images, video or audio. Internal resizing supports analysis and does not return an edited image.

Requests also involve network metadata, headers and operational event information. These support delivery, abuse prevention and troubleshooting. Where applicable, processing necessary to supply your requested service relies on GDPR Article 6(1)(b); proportionate security and operational processing relies on Article 6(1)(f), our legitimate interest in a reliable and secure service. Do not send sensitive documents, credentials or images you lack permission to use. This service does not need special-category information; do not submit it.

## Recipients and processing services

Cloudflare runs the Worker and its configured Images binding. The binding receives image bytes for an internal scale-down transformation used for metrics. Netlify operates the proxy site mcp-profilfoto-proxy in front of the Worker. Both infrastructure providers necessarily handle requests and network metadata and may process operational records under their applicable agreements and configurations. The application does not write images to Cloudflare Images storage, a database, disk or an object store.

An image URL check contacts third-party image hosts chosen by you, including validated redirect destinations. These hosts see the requested URL, request time and service-origin network information and may keep their own logs. We do not send your chat or base64 input to an image host. Base64 input avoids this image-host fetch. Your assistant provider separately handles your conversation, tool arguments and returned results under its own policies. No image content is used by this application's code for training, advertising or profiling.

## Retention and logs

Image bytes and URLs are processed in memory only and are not stored by the application. Runtime garbage collection controls exact memory reclamation after processing. Responses have Cache-Control: no-store. This does not control copies held by your assistant, image hosts or infrastructure providers.

Application call logs contain event type, tool name, success flag and rounded duration, without input content, URLs or IP addresses. Binding-failure diagnostics contain stage, dimensions, error name and a bounded error message with URL/data and long encoded sequences redacted. Redaction is defensive, not a guarantee against all provider error text. Optional Analytics Engine, if enabled by the operator, receives tool name, success and duration; its dataset binding is not enabled in the checked-in configuration.

For rate limiting, a SHA-256 hash of a supplied Cloudflare client-IP header is held in isolate memory with a 60-second validity window. Expired entries are removed on a later request or isolate disposal; physical retention can exceed 60 seconds in an idle isolate. These pseudonymous hashes are never logged by application code. Proxy behavior may affect which network address is supplied.

Infrastructure log and analytics retention depends on provider settings and agreements; this repository does not establish a fixed duration or independently verify the live configuration. The operator must verify those settings and communicate applicable details on request. The application offers no photo archive or account history.

## International processing and safeguards

Cloudflare, Netlify, your assistant provider and selected image hosts may process information outside your country, including outside the EEA. Where required, the operator must maintain an applicable transfer mechanism, such as adequacy arrangements or standard contractual clauses, and appropriate processor agreements. Contact us for the arrangements applicable to your request. No particular processing region is promised.

## Your choices and rights

You choose whether to call a tool, which photo to send and whether to use a URL or base64. The requirements tool needs no photo or image URL. Stop using the connector or disconnect it in your assistant to prevent future calls. Removing a chat is governed by your assistant provider. Because the application stores no photos, there is no stored-photo deletion interface and we cannot retrieve an earlier photo.

Depending on applicable law, you may request access, correction, deletion, restriction, portability or object to processing based on legitimate interests. Contact [SAFAK_CONTACT_EMAIL]; provide the approximate time and tool used, without resending the photo. We may need proportionate verification to handle a request. You may complain to your competent data protection supervisory authority. Rights involving another provider's records may need to be exercised with that provider.

## Children

This service is intended for adults aged 18 or over. Do not submit children's photos. If you believe a child has submitted personal information, contact us so we can address any records under our control and help identify the relevant provider.

## Changes

We update this page and its effective date when practices change. Material changes will be described here before they take effect where required by law. Contact [SAFAK_CONTACT_EMAIL] for questions or accessible copies.
