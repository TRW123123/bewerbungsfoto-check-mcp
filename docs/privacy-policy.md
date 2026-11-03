# DRAFT — Privacy policy

Date: 2026-11-03. Operator: Safak Tepecik. Contact: [TO BE CONFIRMED BY OPERATOR: contact email]. Postal address: [TO BE CONFIRMED BY OPERATOR: postal address]. This draft needs operator/legal review before publication.

We process an image supplied as base64 or fetched from a user-supplied public HTTPS URL, the selected destination, and transient technical request data to provide technical image-quality checks. Photos may contain personal information. Do not submit credentials, identity documents, health information or images you lack permission to use. No identity, biometric template, demographic or attractiveness analysis takes place. The service does not generate or edit images.

Photo bytes and URLs are processed in server memory only and are not stored in a database, file store or application logs. Memory is released after processing; runtime garbage collection controls exact reclamation. Returned metrics remain subject to the user's assistant provider's retention policies. We do not use images for training.

Cloudflare is the proposed hosting processor and necessarily handles network metadata when serving requests. Its operational/network processing is governed by its own terms and the operator's eventual configuration. Hosting is not yet deployed. URL checks contact the image host, which sees a request from the hosting service and may retain its own access logs. Base64 avoids this outbound image-host request. No paid image APIs or other analysis processors are used.

Application logs contain only tool name, success and rounded duration, as anonymous call counters. No photo content, URL, IP or personal attributes are logged. A best-effort rate limit temporarily holds a SHA-256 hash of the client network address in isolate memory for up to 60 seconds; it is never logged. These transient pseudonymous keys are separate from anonymous call counters. Cloudflare log/counter retention: [TO BE CONFIRMED BY OPERATOR: retention period and final logging configuration]. Optional Analytics Engine receives tool name, success and duration only if enabled.

Users control what they submit and may choose not to use URL fetching or not to submit a photo. There is no stored-photo deletion interface because the application stores no photos. For privacy questions or applicable access/deletion rights concerning hosting records, use the contact above once confirmed. Your assistant provider separately handles your chat, uploads and tool results.

The service is intended for people aged 13 and older; users aged 13–17 should have permission where required. It does not knowingly solicit children's photos or sensitive data. Contact the operator about accidental submissions. Changes will be dated on this page before they apply. Legal basis, international-transfer safeguards and final processor arrangements must be confirmed by the operator before launch.
