import { afterEach, describe, it, expect, vi } from "vitest";
import worker from "../src/index";
import { base64Image, fetchImage, readLimited, safeUrl } from "../src/images";
import { base64, png } from "./fixtures";
const rpc = async (method: string, params: unknown = {}, env = {}) => {
  const r = await worker.fetch(
    new Request("http://local/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    env,
  );
  return r.json() as Promise<any>;
};
afterEach(() => vi.restoreAllMocks());
describe("stateless JSON-RPC", () => {
  it.each(["2025-06-18", "2025-03-26", "2025-11-25"])(
    "negotiates %s",
    async (version) =>
      expect(
        (await rpc("initialize", { protocolVersion: version })).result
          .protocolVersion,
      ).toBe(version),
  );
  it("negotiates fallback", async () =>
    expect(
      (await rpc("initialize", { protocolVersion: "unknown" })).result
        .protocolVersion,
    ).toBe("2025-06-18"));
  it("lists two annotated tools and schemas", async () => {
    const ts = (await rpc("tools/list")).result.tools;
    expect(ts).toHaveLength(2);
    for (const t of ts) {
      expect(t.description.startsWith("Use this when the user")).toBe(true);
      expect(t.outputSchema.type).toBe("object");
      expect(t.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      });
    }
  });
  it("calls requirements", async () =>
    expect(
      (
        await rpc("tools/call", {
          name: "get_headshot_photo_requirements",
          arguments: { target: "linkedin" },
        })
      ).result.structuredContent.target,
    ).toBe("linkedin"));
  it("calls checker with full decode", async () =>
    expect(
      (
        await rpc(
          "tools/call",
          {
            name: "check_headshot_photo",
            arguments: { image_base64: base64(png()) },
          },
          { ANALYSIS_MODE: "full" },
        )
      ).result.structuredContent.criteria,
    ).toHaveLength(9));
  it.each([
    {},
    { image_url: "https://public.org/a", image_base64: "AAAA" },
    { image_url: "http://public.org/a" },
    { image_base64: "?" },
    { image_base64: 4 },
    { image_base64: "AAAA", target: "bad" },
    { image_base64: "AAAA", extra: true },
  ])("helpful invalid checker input %j", async (args) =>
    expect(
      (
        await rpc("tools/call", {
          name: "check_headshot_photo",
          arguments: args,
        })
      ).result.isError,
    ).toBe(true),
  );
  it("rejects unknown tools without logging arbitrary user content", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(
      (await rpc("tools/call", { name: "sensitive-input" })).result.isError,
    ).toBe(true);
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      tool: "unknown",
      ok: false,
    });
  });
  it("rejects invalid requirements target", async () =>
    expect(
      (
        await rpc("tools/call", {
          name: "get_headshot_photo_requirements",
          arguments: { target: "bad" },
        })
      ).result.isError,
    ).toBe(true));
  it("pings", async () => expect((await rpc("ping")).result).toEqual({}));
  it("unknown method", async () =>
    expect((await rpc("other")).error.code).toBe(-32601));
  it("accepts initialized notification", async () =>
    expect(
      (
        await worker.fetch(
          new Request("http://local/mcp", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: '{"jsonrpc":"2.0","method":"notifications/initialized"}',
          }),
        )
      ).status,
    ).toBe(202));
  it("health", async () =>
    expect(
      await (await worker.fetch(new Request("http://local/health"))).json(),
    ).toEqual({ status: "ok" }));
  it("GET mcp is 405", async () =>
    expect((await worker.fetch(new Request("http://local/mcp"))).status).toBe(
      405,
    ));
  it("OPTIONS allows protocol headers", async () =>
    expect(
      (
        await worker.fetch(
          new Request("http://local/mcp", { method: "OPTIONS" }),
        )
      ).headers.get("access-control-allow-headers"),
    ).toContain("mcp-protocol-version"));
  it("rejects malformed JSON", async () =>
    expect(
      (
        await worker.fetch(
          new Request("http://local/mcp", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400));
  it("anonymous analytics failure cannot fail call", async () => {
    const writeDataPoint = vi.fn(() => {
      throw Error("offline");
    });
    const r = await rpc(
      "tools/call",
      { name: "get_headshot_photo_requirements" },
      { ANALYTICS: { writeDataPoint } },
    );
    expect(r.result.isError).toBeUndefined();
    expect(writeDataPoint).toHaveBeenCalledOnce();
  });
});
describe("URL and byte guards", () => {
  it.each([
    "http://host.org/a",
    "https://localhost/a",
    "https://127.0.0.1",
    "https://2130706433",
    "https://0x7f000001",
    "https://[::1]",
    "https://[::ffff:127.0.0.1]",
    "https://169.254.169.254",
    "https://10.0.0.1",
    "https://office.internal",
    "https://office.corp",
    "https://router",
    "https://a.local",
    "https://a.local.",
    "https://user:pass@public.org",
    "https://public.org:8080",
  ])("blocks %s", (url) => expect(() => safeUrl(url)).toThrow());
  it("allows public HTTPS hostname", () =>
    expect(safeUrl("https://photos.public.org/a").protocol).toBe("https:"));
  it("blocks redirect to private address", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://127.0.0.1/a" },
        }),
      );
    await expect(fetchImage("https://public.org/a", f)).rejects.toThrow(
      "hosts",
    );
    expect(f).toHaveBeenCalledOnce();
  });
  it("limits redirects", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: "/next" } }),
      );
    await expect(fetchImage("https://public.org/a", f)).rejects.toThrow(
      "3 redirects",
    );
    expect(f).toHaveBeenCalledTimes(4);
  });
  it("enforces image content type", async () => {
    await expect(
      fetchImage(
        "https://public.org/a",
        vi.fn().mockResolvedValue(new Response("x")),
      ),
    ).rejects.toThrow("Content-Type");
  });
  it("reads public image bytes", async () => {
    const b = png();
    expect(
      await fetchImage(
        "https://public.org/a",
        vi
          .fn()
          .mockResolvedValue(
            new Response(b, { headers: { "content-type": "image/png" } }),
          ),
      ),
    ).toEqual(b);
  });
  it("sends a descriptive User-Agent on every redirect hop", async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response(null, {
      status: 302, headers: { location: "/next" },
    })).mockResolvedValueOnce(new Response(png(), {
      headers: { "content-type": "image/png" },
    }));
    await fetchImage("https://public.org/a", f);
    expect(f).toHaveBeenCalledTimes(2);
    for (const [, options] of f.mock.calls)
      expect(new Headers(options.headers).get("User-Agent")).toBe(
        "HeadshotPhotoCheck/0.1 (+https://profilfoto-ki.de; MCP photo checker)",
      );
  });
  it("reports HTTP status without disclosing the URL", async () => {
    await expect(fetchImage("https://public.org/secret", vi.fn()
      .mockResolvedValue(new Response(null, { status: 403 })))).rejects.toThrow(
        "Image host returned HTTP 403. Check that the URL is public and accessible.",
      );
  });
  it("decodes base64 with native and fallback paths", () => {
    const bytes = png();
    const original = Object.getOwnPropertyDescriptor(Uint8Array, "fromBase64");
    const native = vi.fn((s: string) => new Uint8Array(Buffer.from(s, "base64")));
    try {
      Object.defineProperty(Uint8Array, "fromBase64", { configurable: true, value: native });
      expect(base64Image(base64(bytes))).toEqual(bytes);
      expect(native).toHaveBeenCalledOnce();
    } finally {
      if (original) Object.defineProperty(Uint8Array, "fromBase64", original);
      else Reflect.deleteProperty(Uint8Array, "fromBase64");
    }
    try {
      Object.defineProperty(Uint8Array, "fromBase64", { configurable: true, value: undefined });
      expect(base64Image("data:image/png;base64," + base64(bytes))).toEqual(bytes);
    } finally {
      if (original) Object.defineProperty(Uint8Array, "fromBase64", original);
      else Reflect.deleteProperty(Uint8Array, "fromBase64");
    }
  });
  it.each(["AA A", "AA\nA", "AA-A", "AA_A", "A===", "AA=A", "AAAA=", "?"])(
    "rejects malformed base64 %j", value => expect(() => base64Image(value)).toThrow(),
  );
  it("caps streamed body", async () => {
    await expect(readLimited(new Response("12345").body, 4)).rejects.toThrow(
      "limit",
    );
  });
  it("rejects base64 size before decode", () =>
    expect(() => base64Image("A".repeat(10666669))).toThrow("maximum"));
  it("times out slow fetch", async () => {
    vi.useFakeTimers();
    const f = vi.fn(
      (_url, opts) =>
        new Promise<Response>((_, reject) =>
          opts?.signal?.addEventListener("abort", () =>
            reject(new DOMException("abort", "AbortError")),
          ),
        ),
    );
    const p = fetchImage("https://public.org/a", f as typeof fetch);
    const assertion = expect(p).rejects.toThrow("8 seconds");
    await vi.advanceTimersByTimeAsync(8001);
    await assertion;
    vi.useRealTimers();
  });
});
