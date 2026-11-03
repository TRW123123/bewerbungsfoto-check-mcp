# Demo video script — 80 seconds

Recording instructions only; no recording or account testing was performed. Use a clean Claude conversation with a custom connector (or the equivalent ChatGPT Developer mode connection). UI labels depend on account access. Show only synthetic input; hide account identifiers and unrelated chat. Record after the v0.1.2 deployment is approved and verified. Keep the tool activity panel visible to demonstrate actual calls. Do not fabricate successful routing if a client calls an inappropriate tool; correct the issue and record again.

| Time | Shot and action | Exact prompt / on-screen text |
|---|---|---|
| 00–08 | Title card, then open Claude connector settings. | “Headshot Photo Check — technical analysis of existing photos” |
| 08–20 | Add custom connector, name Headshot Photo Check, enter URL, no authentication. Show the two available tools. | `https://mcp.profilfoto-ki.de/mcp` / “No authentication. Two read-only tools.” |
| 20–35 | Start a clean chat. Send positive prompt 1; expand the requirements call and its target argument. Show square crop and recommended dimensions. | “Give me the technical photo requirements for LinkedIn.” / “get_headshot_photo_requirements · target: linkedin” |
| 35–55 | Send positive prompt 2 below, with the full data URL. Expand the photo-check call. Show dimensions 1×1, failed exposure and unchecked face framing. | “check_headshot_photo · synthetic input · not a suitable headshot” / “Score covers checked criteria only; pixel mode may be images-binding or full.” |
| 55–70 | Send the negative prompt below. Show the response and tool activity: no tool invoked. | “Generate a new headshot and replace my background.” / “Outside scope: image generation and editing. No tool call.” |
| 70–80 | Closing card with limits and privacy links. | “Analysis only. No image, video or audio generation. No recognition or attribute judgments. Images processed in memory; application stores no photos. URL checks contact selected image hosts.” / `https://profilfoto-ki.de/mcp/privacy` |

Exact positive prompt 2 (P4 in listing-openai.md):

```text
Check this synthetic PNG for LinkedIn: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4XmNgYGD4DwABBAEA43qFxAAAAABJRU5ErkJggg==
```

These are the same two positive inputs and negative media-generation prompt used in the submission test set. Local code confirms the positive expected results; client routing must be observed during recording. With the production binding, the analysis mode label can differ from local fallback evidence. Do not claim the synthetic pixel is a real portrait, a quality pass, or proof of original-resolution focus. Publish the privacy, terms and support pages before recording their public availability.
