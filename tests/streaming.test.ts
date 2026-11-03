import { it, expect, vi } from "vitest";
import { analyzeUrl, imageHeader, MAX_BYTES, readLimited, type ImageResizer } from "../src/images";
import { jpg, png } from "./fixtures";

function setup(bytes: Uint8Array = jpg("good", 1280, 1599), fail?: "transform") {
  const info = vi.fn(async (stream: ReadableStream<Uint8Array>) => {
    const data = await readLimited(stream, MAX_BYTES);
    return { ...imageHeader(data), format: "image/jpeg", fileSize: data.length };
  });
  const input = vi.fn((stream: ReadableStream<Uint8Array>) => ({
    transform: (options: unknown) => ({ output: async () => {
      expect(options).toEqual({ width: 64, height: 64, fit: "scale-down" });
      if (fail === "transform") throw Error("9422 quota");
      await readLimited(stream, MAX_BYTES);
      return { response: () => new Response(png("good", 51, 64)) };
    } }),
  }));
  const fetcher = vi.fn(async () => new Response(bytes, { headers: { "content-type": "image/jpeg" } }));
  return { images: { info, input } satisfies ImageResizer, fetcher, bytes };
}

it("buffers URL inputs once for transform without info, preserving original metadata", async () => {
  const { images, fetcher, bytes } = setup();
  const result = await analyzeUrl("https://public.org/a", "all", "auto", images, fetcher);
  expect(result.analysis_mode).toBe("images-binding");
  expect(result.criteria[0].value).toMatchObject({ width: 1280, height: 1599 });
  expect(result.criteria[2].value).toMatchObject({ bytes: bytes.length, format: "jpeg" });
  expect(images.info).not.toHaveBeenCalled();
  expect(images.input).toHaveBeenCalledOnce();
});

it.each(["transform"] as const)("falls back on %s quota failures", async fail => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    const { images, fetcher, bytes } = setup(undefined, fail);
    const result = await analyzeUrl("https://public.org/a", "all", "auto", images, fetcher);
    expect(result.analysis_mode).toBe("header-only");
    expect(result.notes[0]).toContain("quota");
    expect(result.criteria[2].value).toMatchObject({ bytes: bytes.length });
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ stage: fail });
  } finally { log.mockRestore(); }
});

it("uses the actual buffered header-only body size", async () => {
  const bytes = new Uint8Array(351_000);
  bytes.set(jpg("good", 1280, 1599));
  const { fetcher } = setup(bytes);
  const result = await analyzeUrl("https://public.org/a", "all", "header-only", undefined, fetcher);
  expect(result.criteria[2].value).toMatchObject({ bytes: 351_000 });
});

it.each([undefined, "1", "8000001"])("enforces size with Content-Length %s", async length => {
  const fetcher = vi.fn(async () => new Response(new ReadableStream({
    start(c) { c.enqueue(new Uint8Array(MAX_BYTES)); c.enqueue(new Uint8Array(1)); c.close(); },
  }), { headers: { "content-type": "image/jpeg", ...(length ? { "content-length": length } : {}) } }));
  await expect(analyzeUrl("https://public.org/a", "all", "header-only", undefined, fetcher)).rejects.toThrow("limit");
});

it("does not turn body size errors into binding fallback success", async () => {
  const { images } = setup();
  const fetcher = vi.fn(async () => new Response(new Uint8Array(MAX_BYTES + 1), { headers: { "content-type": "image/jpeg" } }));
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try { await expect(analyzeUrl("https://public.org/a", "all", "auto", images, fetcher)).rejects.toThrow("limit"); }
  finally { log.mockRestore(); }
});

it("keeps the eight-second deadline through slow body consumption", async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  const fetcher = vi.fn(async () => new Response(new ReadableStream({ cancel }), {
    headers: { "content-type": "image/jpeg" },
  }));
  try {
    const assertion = expect(analyzeUrl("https://public.org/a", "all", "header-only", undefined, fetcher))
      .rejects.toThrow("8 seconds");
    await vi.advanceTimersByTimeAsync(8001);
    await assertion;
    expect(cancel).toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});

it("keeps the deadline even when a binding operation stalls", async () => {
  vi.useFakeTimers();
  const { images, fetcher } = setup();
  images.input.mockImplementation(() => ({ transform: () => ({ output: () => new Promise(() => {}) }) }));
  try {
    const assertion = expect(analyzeUrl("https://public.org/a", "all", "auto", images, fetcher))
      .rejects.toThrow("8 seconds");
    await vi.advanceTimersByTimeAsync(8001);
    await assertion;
  } finally { vi.useRealTimers(); }
});

it.each([undefined, "1", "20", "500000"])("passes every source byte to the binding with Content-Length %s", async length => {
  const bytes = jpg("good", 1280, 1599);
  const { images } = setup(bytes);
  images.input.mockImplementation(stream => ({ transform: () => ({ output: async () => {
    expect(await readLimited(stream, MAX_BYTES)).toEqual(new Uint8Array(bytes));
    return { response: () => new Response(png("good", 51, 64)) };
  } }) }));
  const fetcher = vi.fn(async () => new Response(new ReadableStream({ start(c) {
    c.enqueue(bytes.subarray(0, 17)); c.enqueue(bytes.subarray(17)); c.close();
  } }), { headers: { "content-type": "image/jpeg", ...(length ? { "content-length": length } : {}) } }));
  expect((await analyzeUrl("https://public.org/a", "all", "auto", images, fetcher)).analysis_mode).toBe("images-binding");
  expect(images.info).not.toHaveBeenCalled();
});

it("parses JPEG dimensions beyond the old 64 KB prefix without info", async () => {
  const original = jpg("good", 1280, 1599);
  const bytes = new Uint8Array(original.length + 65539);
  bytes.set(original.subarray(0, 2));
  bytes.set([255, 225, 255, 255], 2); // APP1 segment length 65535
  bytes[65539] = 255; bytes[65540] = 1; // standalone TEM marker
  bytes.set(original.subarray(2), 65541);
  const { images, fetcher } = setup(bytes);
  expect((await analyzeUrl("https://public.org/a", "all", "auto", images, fetcher)).analysis_mode).toBe("images-binding");
  expect(images.info).not.toHaveBeenCalled();
});
