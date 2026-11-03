import { it, expect, vi } from "vitest";
import { analyzeAuto, type ImageResizer } from "../src/images";
import { jpg, png } from "./fixtures";
const binding = (data: Uint8Array) => {
  const transform = vi.fn(() => ({ output: async () => ({ response: () => new Response(data) }) }));
  return { images: { input: () => ({ transform }) } as ImageResizer, transform };
};
it("resizes large JPEG and retains original header scores", async () => {
  const { images, transform } = binding(png("dark", 96, 128));
  const r = await analyzeAuto(jpg("dark", 1500, 2000), "all", "auto", images);
  expect(transform).toHaveBeenCalledWith({ width: 96, height: 128 });
  expect(r.analysis_mode).toBe("images-binding");
  expect(r.criteria[0].status).toBe("pass");
  expect(r.criteria.find(c => c.id === "brightness")?.status).toBe("fail");
});
it.each(["dark", "low-contrast", "blurry"])("resize preserves synthetic mean brightness: %s", async kind => {
  const { images } = binding(png(kind, 96, 128));
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
it("uses small native pixels without a transformation", async () => {
  const { images, transform } = binding(png());
  expect((await analyzeAuto(jpg("good", 96, 128), "all", "auto", images)).analysis_mode).toBe("full");
  expect(transform).not.toHaveBeenCalled();
});
it("benchmarks bounded PNG decode and metrics, excluding resize and encoding", async () => {
  const b = png("good", 96, 128);
  await analyzeAuto(b, "all");
  const cpu = process.cpuUsage(), start = performance.now();
  for (let i = 0; i < 100; i++) await analyzeAuto(b, "all");
  const used = process.cpuUsage(cpu);
  console.log(JSON.stringify({ benchmark: "96x128 PNG decode+metrics warm average", wall_ms: (performance.now()-start)/100, process_cpu_ms: (used.user+used.system)/100000 }));
});
