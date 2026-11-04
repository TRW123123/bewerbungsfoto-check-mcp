# Registry verification — instructions only

Prepared for `de.profilfoto-ki/headshot-check`, version 0.1.2, remote `https://mcp.profilfoto-ki.de/mcp`, website `https://profilfoto-ki.de`. No Registry authentication or publishing commands were executed.

The shorter slug replaces `de.profilfoto-ki/headshot-photo-check` before first publication: it is easier to type and avoids repeating “photo”. Either slug is valid; agree on the final name before publishing because clients use it as an identifier. This change does not rename the tools or endpoint. The reverse-DNS namespace `de.profilfoto-ki` requires proof for **profilfoto-ki.de**, not the endpoint subdomain `mcp.profilfoto-ki.de`. A GitHub login for TRW123123 alone cannot authorize this namespace. The repository stays private; a remote-only Registry entry does not require publishing its source repository.

## Choose one proof method

Use one Ed25519 public/private key pair. Generate it outside the repository only after authorization. Keep the private PEM and its 32-byte private seed (hex) under `/home/box/.secrets/`, permission 0600. Never commit, paste into listings, log, or share the private key. This preparation run did not access that directory. The following paths stand for operator-created files; they are not existing key claims.

DNS choice:

- DNS zone: `profilfoto-ki.de`.
- Record type: TXT; host/name: `@` (fully qualified name `profilfoto-ki.de.`), not `_mcp` and not `mcp`.
- Value: `v=MCPv1; k=ed25519; p=<BASE64_RAW_32_BYTE_PUBLIC_KEY>`.
- The `p` value is the base64 of the raw public key, not a PEM block or the private seed. Publish this public proof alongside existing TXT records; do not replace unrelated records. Wait for DNS propagation.

HTTP alternative:

- Serve `https://profilfoto-ki.de/.well-known/mcp-registry-auth`.
- HTTP 200 body: `v=MCPv1; k=ed25519; p=<BASE64_RAW_32_BYTE_PUBLIC_KEY>`.
- Serve as plain text on the apex website host, publicly accessible without authentication or an HTML/SPA wrapper. This is separate from `/mcp/privacy` and from the OpenAI challenge on the MCP host.
- Adding this website file is a deployment requiring Safak's approval. A file only on `mcp.profilfoto-ki.de` does not prove the chosen apex namespace.

## Future operator commands — DO NOT execute during preparation

The official CLI documented on the review date accepts `--private-key` as a hexadecimal seed, not a PEM filename. The commands below read an operator-prepared hex seed file; the hex seed lives at /home/box/.secrets/mcp-registry-profilfoto-ki.de-ed25519.hex (PEM: /home/box/.secrets/mcp-registry-profilfoto-ki.de-ed25519.pem). A literal path must not be passed as the seed. The PEM and hex seed must never enter this repository. Disable shell tracing and avoid environments that log command arguments; the CLI receives the seed in its argument list.

```sh
# Choose DNS after its public proof is reachable:
mcp-publisher login dns --domain profilfoto-ki.de --private-key "$(cat /home/box/.secrets/mcp-registry-profilfoto-ki.de-ed25519.hex)"

# OR choose HTTP after its public proof is reachable:
mcp-publisher login http --domain profilfoto-ki.de --private-key "$(cat /home/box/.secrets/mcp-registry-profilfoto-ki.de-ed25519.hex)"

# Only after explicit publishing authorization, validation and v0.1.2 deployment:
mcp-publisher publish
```

The publish command reads `server.json` from this repository. Do not run both login alternatives unnecessarily. Check installed `mcp-publisher login dns --help` / `login http --help` against current official docs before any later action; no publisher was invoked here. Keep publisher-generated tokens/state outside version control as well. Nothing here authorizes deployment or publication.

## Validation and sources

On 2026-11-03 the following official pages were fetched with curl and reviewed: [quickstart](https://modelcontextprotocol.io/registry/quickstart), [remote servers](https://modelcontextprotocol.io/registry/remote-servers), [authentication](https://modelcontextprotocol.io/registry/authentication). `server.json` was validated locally using Ajv against the downloaded [official 2025-12-11 JSON schema](https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json); it passed. The entry uses `remotes[].type: streamable-http`, the HTTPS subdomain URL, and version 0.1.2 matching package.json and initialize.serverInfo. It contains no package or source-repository publication requirement. No live DNS/HTTP proof is claimed.
