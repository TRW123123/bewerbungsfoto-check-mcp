import { it, expect } from "vitest";
import { analyzeImage } from "../src/images";
import { jpg } from "./fixtures";
it("benchmarks generated 1500 × 2000 JPEG; timing is local, not edge CPU", async () => {
  const b = jpg("good", 1500, 2000);
  const cpu = process.cpuUsage(),
    start = performance.now();
  const r = await analyzeImage(b, "all", "full");
  const elapsed = performance.now() - start,
    used = process.cpuUsage(cpu);
  const headerStart = performance.now();
  await analyzeImage(b, "all", "header-only");
  console.log(
    JSON.stringify({
      benchmark: "1500x2000 JPEG",
      bytes: b.length,
      full_wall_ms: elapsed,
      full_process_cpu_ms: (used.user + used.system) / 1000,
      header_wall_ms: performance.now() - headerStart,
    }),
  );
  expect(r.analysis_mode).toBe("full");
});
