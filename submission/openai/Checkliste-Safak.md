# Checkliste Safak – Headshot Photo Check

1. [ ] https://platform.openai.com/settings/organization/general → Individual- oder Business-Verifizierung abschließen (Identität; nur du).
2. [ ] Demo-Video `out/headshot-photo-check-demo.mp4` irgendwo für Reviewer abrufbar hosten (öffentlicher/unlisted Link, kein Login nötig) und die URL notieren. Optional stattdessen eine echte ChatGPT-Aufnahme nach `../demo-video-script.md`.
3. [ ] https://platform.openai.com/plugins → **Upload new or existing plugin** → Developer identity wählen (muss zu „profilfoto-ki.de“ passen) → `out/headshot-photo-check-plugin.zip` hochladen. Bei Validierungsfehlern: **Copy issues**.
4. [ ] *Metadata & Skills* prüfen: Kategorie bestätigen, Findings lesen.
5. [ ] *MCPs* → Server wählen → **Connect**. Das Portal zeigt den Challenge-Token; Token **nur im Portal** sehen. Dann Challenge unter `https://mcp.profilfoto-ki.de/.well-known/openai-apps-challenge` als reinen Text (HTTP 200) ausliefern (Anleitung: `../listing-openai.md`, Abschnitt „Domain challenge“). Das ist ein Produktions-Deploy und bleibt deine Freigabe. Danach Verify/Connect, Tool-Scan abwarten.
6. [ ] *Review information → Review details*: Video-URL eintragen; Testfälle (5+3) sind aus dem ZIP importiert. Reviewer-Zugang: keine Anmeldung nötig (Auth none), trotzdem kurz vermerken.
7. [ ] Die 5 Positivfälle einmal im Assistenten selbst mit dem Connector gegen die Live-Antworten prüfen (Routing, nicht nur JSON-RPC).
8. [ ] **Submit for review**, Attestierungen ankreuzen. Rückmeldung kommt per E-Mail.

Hinweis: Rechtstexte unter https://www.profilfoto-ki.de/mcp/privacy und https://www.profilfoto-ki.de/mcp/terms vor Einreichung noch einmal inhaltlich lesen (Aufbewahrungsfristen von Cloudflare/Netlify waren laut `../README.md` als „Operator prüfen“ markiert).
