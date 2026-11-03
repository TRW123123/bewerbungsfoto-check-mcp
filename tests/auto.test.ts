import { it, expect, vi } from "vitest";
import { analyzeAuto, imageHeader, type ImageResizer } from "../src/images";
import { jpg, png } from "./fixtures";
const binding = (data: Uint8Array) => {
  const output = vi.fn(async () => ({ response: () => new Response(data) }));
  const transform = vi.fn(() => ({ output }));
  const input = vi.fn((stream: ReadableStream<Uint8Array>) => {
    expect(stream).toBeInstanceOf(ReadableStream);
    return { transform };
  });
  return { images: { input, info: async (stream: ReadableStream<Uint8Array>) => {
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return { ...imageHeader(bytes), fileSize: bytes.length };
  } } satisfies ImageResizer, transform, output, input };
};
it("resizes large JPEG and retains original header scores", async () => {
  const { images, transform } = binding(png("dark", 48, 64));
  const r = await analyzeAuto(jpg("dark", 1500, 2000), "all", "auto", images);
  expect(transform).toHaveBeenCalledWith({ width: 64, height: 64, fit: "scale-down" });
  expect(r.analysis_mode).toBe("images-binding");
  expect(r.criteria[0].status).toBe("pass");
  expect(r.criteria.find(c => c.id === "brightness")?.status).toBe("fail");
});
it.each(["dark", "low-contrast", "blurry"])("resize preserves synthetic mean brightness: %s", async kind => {
  const { images } = binding(png(kind, 48, 64));
  const large = jpg(kind, 384, 512);
  const a = await analyzeAuto(large, "all", "auto", images);
  const b = await analyzeAuto(large, "all", "full");
  const mean = (r: typeof a) => (r.criteria.find(c => c.id === "brightness")!.value as { percent: number }).percent;
  expect(Math.abs(mean(a) - mean(b))).toBeLessThan(2);
});
it("reports missing binding and quota/decode errors without losing header checks", async () => {
  const b = jpg();
  for (const images of [undefined, binding(new Uint8Array(10)).images, binding(png("good", 256, 256)).images]) {
    const r = await analyzeAuto(b, "all", "auto", images);
    expect(r.analysis_mode).toBe("header-only");
    expect(r.notes[0]).toContain("header-only");
  }
});
it.each(["jpeg", "png"])("uses the binding for tiny %s inputs", async format => {
  const { images, transform } = binding(png("good", 48, 64));
  const bytes = format === "jpeg" ? jpg("good", 96, 128) : png("good", 102, 128);
  expect((await analyzeAuto(bytes, "all", "auto", images)).analysis_mode).toBe("images-binding");
  expect(transform).toHaveBeenCalledOnce();
});
it("retains tiny native fallback when the binding is missing or fails", async () => {
  const bytes = png("good", 102, 128);
  expect((await analyzeAuto(bytes, "all")).analysis_mode).toBe("full");
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    expect((await analyzeAuto(bytes, "all", "auto", binding(new Uint8Array(10)).images)).analysis_mode).toBe("full");
  } finally { log.mockRestore(); }
});
it("benchmarks bounded PNG decode and metrics, excluding resize and encoding", async () => {
  const b = png("good", 96, 128);
  await analyzeAuto(b, "all");
  const cpu = process.cpuUsage(), start = performance.now();
  for (let i = 0; i < 100; i++) await analyzeAuto(b, "all");
  const used = process.cpuUsage(cpu);
  console.log(JSON.stringify({ benchmark: "96x128 PNG decode+metrics warm average", wall_ms: (performance.now()-start)/100, process_cpu_ms: (used.user+used.system)/100000 }));
});

it.each(["transform", "response", "dimensions", "decode"])("logs one bounded diagnostic for %s failure", async stage => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const error = new TypeError("binding failed " + "x".repeat(250));
  const images: ImageResizer = { info: async () => { throw Error("unused"); }, input: () => ({ transform: () => ({ output: async () => {
    if (stage === "transform") throw error;
    return { response: () => {
      if (stage === "response") throw error;
      if (stage === "dimensions") return new Response(png("good", 256, 256));
      return new Response(png("good", 48, 64).subarray(0, 33));
    } };
  } }) }) };
  try {
    const result = await analyzeAuto(jpg(), "all", "auto", images);
    expect(result.analysis_mode).toBe("header-only");
    expect(log).toHaveBeenCalledOnce();
    const entry = JSON.parse(log.mock.calls[0][0]);
    expect(entry).toMatchObject({ evt: "images_binding_error", stage,
      name: expect.any(String), message: expect.any(String) });
    expect(entry.message.length).toBeLessThanOrEqual(200);
    for (const key of ["expected_width", "expected_height", "actual_width", "actual_height"])
      expect(typeof entry[key]).toBe("number");
    if (stage === "dimensions") expect(entry).toMatchObject({
      expected_width: 48, expected_height: 64, actual_width: 256, actual_height: 256,
    });
  } finally { log.mockRestore(); }
});

it("accepts actual bounded dimensions despite aspect-ratio rounding differences", async () => {
  const { images } = binding(png("good", 51, 64));
  const result = await analyzeAuto(jpg("good", 1280, 1599), "all", "auto", images);
  expect(result.analysis_mode).toBe("images-binding");
});
