import { describe, it, expect } from "vitest";
import { deflate } from "pako";
import {
  headersCriteria,
  pixelCriteria,
  summarize,
  requirements,
} from "../src/scoring";
import { analyzeImage, imageHeader } from "../src/images";
import { pixels, png, jpg } from "./fixtures";
const metrics = (kind: string) => {
  const p = pixels(192, 256, kind);
  return pixelCriteria(p.data, p.width, p.height);
};
const status = (kind: string, id: string) =>
  metrics(kind).find((c) => c.id === id)!.status;
describe("reference scoring and generated images", () => {
  it.each([
    [1200, 1500, "pass"],
    [600, 750, "warn"],
    [599, 750, "fail"],
  ])("resolution %s x %s", (w, h, s) =>
    expect(headersCriteria(Number(w), Number(h), 100, "png")[0].status).toBe(s),
  );
  it.each([
    [750, 1000, "pass"],
    [1000, 1000, "pass"],
    [550, 1000, "warn"],
    [1600, 900, "fail"],
  ])("ratio %s x %s", (w, h, s) =>
    expect(headersCriteria(Number(w), Number(h), 100, "png")[1].status).toBe(s),
  );
  it("detects dark exposure", () =>
    expect(status("dark", "brightness")).toBe("fail"));
  it("detects low contrast", () =>
    expect(status("low-contrast", "contrast")).toBe("fail"));
  it("flags smooth blurry fixture", () =>
    expect(status("blurry", "sharpness")).toBe("fail"));
  it("detects busy background", () =>
    expect(status("busy", "background")).toBe("fail"));
  it("good synthetic fixture passes reference pixel checks", () =>
    expect(
      metrics("good")
        .filter((c) => c.id !== "sharpness")
        .every((c) => c.status === "pass"),
    ).toBe(true));
  it.each(["png", "jpeg"])("decodes generated %s", async (format) => {
    const r = await analyzeImage(format === "png" ? png() : jpg(), "all");
    expect(r.analysis_mode).toBe("full");
    expect(r.criteria).toHaveLength(9);
    expect(r.criteria.at(-1)?.status).toBe("not_checked");
  });
  it("tiny image fails resolution", async () =>
    expect((await analyzeImage(png("good", 8, 8), "all")).criteria[0].status).toBe(
      "fail",
    ));
  it("header-only skips pixels and labels partial score", async () => {
    const r = await analyzeImage(jpg(), "all", "header-only");
    expect(r.verdict).toContain("Partial");
    expect(r.criteria.filter((c) => c.status === "not_checked")).toHaveLength(
      6,
    );
  });
  it("excludes unchecked criteria from score", () => {
    const c = headersCriteria(1200, 1600, 100, "png");
    expect(summarize(c).overall_score).toBe(100);
  });
  it("provides target crops", () =>
    expect(requirements("xing").recommendations.crops).toEqual({
      xing: "1:1",
    }));
  it("rejects corrupt input", () =>
    expect(() => imageHeader(new Uint8Array(40))).toThrow("header"));
  it("reads WebP VP8X without decoding", async () => {
    const b = new Uint8Array(30);
    b.set(Buffer.from("RIFF"));
    b.set(Buffer.from("WEBPVP8X"), 8);
    b[24] = 99;
    b[27] = 149;
    expect(imageHeader(b)).toEqual({ width: 100, height: 150, format: "webp" });
    expect((await analyzeImage(b, "all")).analysis_mode).toBe("header-only");
  });
});

it("composites transparent pixels onto white", () => {
  const p = pixels(8, 8, "dark");
  for (let i = 3; i < p.data.length; i += 4) p.data[i] = 0;
  const c = pixelCriteria(p.data, 8, 8).find((c) => c.id === "brightness")!;
  expect((c.value as { percent: number }).percent).toBeCloseTo(100);
});
it("rejects dimensions beyond decoder safety limit before allocating pixels", () => {
  const b = png();
  new DataView(b.buffer, b.byteOffset, b.byteLength).setUint32(16, 65536);
  expect(() => imageHeader(b)).toThrow("safety");
});
it("uses header-only fallback above 4 MP", async () => {
  const b = png();
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  v.setUint32(16, 2001);
  v.setUint32(20, 2000);
  expect((await analyzeImage(b, "all")).analysis_mode).toBe("header-only");
});

it("bounds PNG inflated output before full decoder allocation", async () => {
  const original = png("good", 1, 1),
    compressed = deflate(new Uint8Array(100000));
  const b = new Uint8Array(33 + 12 + compressed.length + 12);
  b.set(original.subarray(0, 33));
  const view = new DataView(b.buffer);
  view.setUint32(33, compressed.length);
  b.set(Buffer.from("IDAT"), 37);
  b.set(compressed, 41);
  const end = 45 + compressed.length;
  b.set(Buffer.from("IEND"), end + 4);
  await expect(analyzeImage(b, "all", "full")).rejects.toThrow(
    "could not be decoded safely",
  );
});
