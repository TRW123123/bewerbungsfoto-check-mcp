# OpenAI-Einreichung (Plugin/MCP-Directory) – Headshot Photo Check

Stand: 2026-11-10. **Nicht eingereicht.** Vorbereitet nach https://developers.openai.com/plugins/deploy/submission (Abruf 2026-11-10; das Doku-Format hat sich seit dem Entwurf `../listing-openai.md` vom 2026-11-03 auf *Plugin-ZIP + Dashboard* geändert).

## Inhalt
| Datei | Zweck |
| --- | --- |
| `plugin.json` | Manifest (Agent-Plugins-Format, `extensions.com.openai`: Listing, 5 positive + 3 negative Testfälle, Release Notes) |
| `mcp.json` | Genau ein Remote-MCP-Server: `https://mcp.profilfoto-ki.de/mcp` (streamable-http, ohne Auth) |
| `out/headshot-photo-check-plugin.zip` | Upload-Datei (plugin.json, mcp.json, assets/icon.png, assets/logo.png; keine Secrets) |
| `out/headshot-photo-check-demo.mp4` | Demo-Video (1920×1080, ca. 95 s, Folien mit echten Live-Antworten) |
| `out/live-transcript.json` | Rohprotokoll der Live-Aufrufe (initialize, tools/list, 5 × tools/call) |
| `config.json` | Quelle der Texte (aus `../listing-openai.md`, `../metadata.json`) |
| `build.py` | `python3 build.py all` baut ZIP, Live-Aufrufe und Video neu (benötigt Python 3, Pillow, ffmpeg) |
| `Checkliste-Safak.md` | Handgriffe für die Einreichung |

## Was das Video ist – und nicht ist
Echte JSON-RPC-Aufrufe gegen den Live-Endpoint, als Text-Folien gesetzt. Es ist **keine** Bildschirmaufnahme eines ChatGPT-Clients, und die drei Negativfälle (Routing-Erwartung) sind nicht live gezeigt. Die OpenAI-Doku nennt keine Vorgaben zu Länge oder Auflösung, sondern verlangt eine für Reviewer zugängliche Aufnahme-URL. Falls Reviewer eine Client-Aufnahme erwarten: `../demo-video-script.md` beschreibt die Aufnahme im ChatGPT-Entwicklermodus.

## Bekannte Punkte
- `category` ist `Productivity` (Vorschlag); im Dashboard bestätigen.
- Keine `brandColor`, keine Dark-Icons, kein `countries` (optional, nichts erfunden).
- `demo_recording_url` fehlt bewusst im ZIP (noch keine URL); im Dashboard unter *Review information* eintragen.
- Domain-Challenge `https://mcp.profilfoto-ki.de/.well-known/openai-apps-challenge` ist **nicht** umgesetzt (Token liefert erst das Portal; Deploy braucht Freigabe), siehe `../listing-openai.md`.
