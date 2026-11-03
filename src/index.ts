import {
  analyzeAuto,
  type ImageResizer,
  base64Image,
  fetchImage,
  MAX_REQUEST_BYTES,
  readLimited,
} from "./images";
import { requirements, targets, type Target } from "./scoring";
import { tools } from "./tools";
export interface Env {
  ANALYSIS_MODE?: string;
  IMAGES?: ImageResizer;
  ANALYTICS?: {
    writeDataPoint(point: { blobs: string[]; doubles: number[] }): void;
  };
}
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "mcp-protocol-version, mcp-session-id, content-type, accept",
  "Access-Control-Expose-Headers": "mcp-protocol-version",
  "Cache-Control": "no-store",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const rpcError = (id: unknown, code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});
const versions = ["2025-06-18", "2025-03-26", "2025-11-25"];
// Best-effort per-isolate rate limit; hashed network identifiers exist only for <=60s,
// never logged. No MCP session state. Production needs an edge-wide rate rule as well.
const buckets = new Map<string, { start: number; count: number }>();
async function limited(request: Request) {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return false;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip),
  );
  const key = Array.from(new Uint8Array(digest), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
  const now = Date.now();
  for (const [k, v] of buckets) if (now - v.start >= 60000) buckets.delete(k);
  let b = buckets.get(key);
  if (!b) {
    if (buckets.size >= 4096) return true;
    b = { start: now, count: 0 };
    buckets.set(key, b);
  }
  return ++b.count > 30;
}
function argsObject(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Tool arguments must be an object.");
  return value as Record<string, unknown>;
}
export async function callTool(name: unknown, args: unknown, env: Env) {
  const started = performance.now();
  let ok = false;
  const known = typeof name === "string" && tools.some((t) => t.name === name);
  try {
    if (!known)
      throw new Error(
        "Unknown tool. Use tools/list to see the two supported tools.",
      );
    const a = argsObject(args),
      allowed =
        name === "check_headshot_photo"
          ? ["target", "image_url", "image_base64"]
          : ["target"];
    if (Object.keys(a).some((k) => !allowed.includes(k)))
      throw new Error(
        "Unexpected parameter. See tools/list for supported arguments.",
      );
    const target = a.target ?? "all";
    if (!targets.includes(target as Target))
      throw new Error("target must be linkedin, xing, application or all.");
    let result;
    if (name === "get_headshot_photo_requirements")
      result = requirements(target as Target);
    else {
      if ("image_url" in a === "image_base64" in a)
        throw new Error("Provide exactly one of image_url or image_base64.");
      if (
        a.image_url !== undefined &&
        (typeof a.image_url !== "string" ||
          !a.image_url ||
          a.image_url.length > 2048)
      )
        throw new Error(
          "image_url must be a nonempty HTTPS URL of at most 2048 characters.",
        );
      if (
        a.image_base64 !== undefined &&
        (typeof a.image_base64 !== "string" ||
          !a.image_base64 ||
          a.image_base64.length > 10666720)
      )
        throw new Error(
          "image_base64 must be a nonempty base64 string within the 8 MB image limit.",
        );
      const bytes =
        typeof a.image_url === "string"
          ? await fetchImage(a.image_url)
          : base64Image(a.image_base64 as string);
      result = await analyzeAuto(
        bytes,
        target as Target,
        env.ANALYSIS_MODE ?? "auto",
        env.IMAGES,
      );
    }
    ok = true;
    return {
      structuredContent: result,
      content: [
        {
          type: "text",
          text:
            "verdict" in result
              ? `${result.verdict}. Score ${result.overall_score}/100 over checked criteria. See structuredContent for coverage and prioritized tips.`
              : "Technical photo recommendations and checklist are in structuredContent.",
        },
      ],
    };
  } catch (e) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text:
            e instanceof Error
              ? e.message
              : "Unable to complete this photo check. Try a valid JPEG or PNG.",
        },
      ],
    };
  } finally {
    const ms = Math.round(performance.now() - started);
    const tool = known ? (name as string) : "unknown";
    console.log(JSON.stringify({ evt: "tool_call", tool, ok, ms }));
    try {
      if (env.ANALYTICS)
        env.ANALYTICS.writeDataPoint({
          blobs: [tool, String(ok)],
          doubles: [ms],
        });
    } catch {
      /* Metrics must not affect tool results. */
    }
  }
}
export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/health" && request.method === "GET")
      return json({ status: "ok" });
    if (url.pathname === "/" && request.method === "GET")
      return new Response(
        "Headshot Photo Check — technical professional-photo checks. Documentation and website: https://profilfoto-ki.de\nRemote endpoint: /mcp\n",
        { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } },
      );
    if (url.pathname !== "/mcp")
      return json({ error: "Not found. Use POST /mcp or GET /health." }, 404);
    if (request.method !== "POST")
      return new Response(
        JSON.stringify({
          error:
            "Use POST /mcp with a JSON-RPC request. This stateless server returns application/json; GET streaming is not supported.",
        }),
        {
          status: 405,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            Allow: "POST, OPTIONS",
          },
        },
      );
    if (await limited(request))
      return json(
        { error: "Request limit reached. Wait one minute and try again." },
        429,
      );
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      return json(
        rpcError(null, -32600, "Use Content-Type: application/json."),
        415,
      );
    const protocol = request.headers.get("mcp-protocol-version");
    if (protocol && !versions.includes(protocol))
      return json(
        rpcError(
          null,
          -32600,
          "Unsupported mcp-protocol-version. Supported: " + versions.join(", "),
        ),
        400,
      );
    let body: unknown;
    try {
      const bytes = await readLimited(request.body, MAX_REQUEST_BYTES);
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      return json(
        rpcError(
          null,
          -32700,
          e instanceof SyntaxError
            ? "Invalid JSON."
            : e instanceof Error
              ? e.message
              : "Cannot read request.",
        ),
        400,
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json(
        rpcError(
          null,
          -32600,
          "Send one JSON-RPC object; batches are not supported.",
        ),
        400,
      );
    const b = body as Record<string, unknown>,
      id = b.id;
    if (
      b.jsonrpc !== "2.0" ||
      typeof b.method !== "string" ||
      (id !== undefined &&
        id !== null &&
        typeof id !== "string" &&
        typeof id !== "number") ||
      (b.params !== undefined &&
        (!b.params || typeof b.params !== "object" || Array.isArray(b.params)))
    )
      return json(
        rpcError(null, -32600, "Invalid JSON-RPC request envelope."),
        400,
      );
    if (id === undefined)
      return new Response(null, { status: 202, headers: cors });
    const params = (b.params ?? {}) as Record<string, unknown>;
    let result: unknown;
    switch (b.method) {
      case "initialize":
        result = {
          protocolVersion: versions.includes(params.protocolVersion as string)
            ? params.protocolVersion
            : "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: "bewerbungsfoto-check",
            title: "Headshot Photo Check",
            version: "0.1.0",
            websiteUrl: "https://profilfoto-ki.de",
          },
          instructions:
            "Technical checks only. Results describe checked coverage and limitations.",
        };
        break;
      case "ping":
        result = {};
        break;
      case "tools/list":
        result = { tools };
        break;
      case "tools/call":
        result = await callTool(params.name, params.arguments, env);
        break;
      default:
        return json(
          rpcError(
            id,
            -32601,
            "Method not found. Supported: initialize, notifications/initialized, ping, tools/list, tools/call.",
          ),
        );
    }
    return json({ jsonrpc: "2.0", id, result });
  },
};
