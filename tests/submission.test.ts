import { readFileSync, writeFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import Ajv from "ajv";
import { callTool } from "../src/index";
import { tools } from "../src/tools";
const cases = JSON.parse(readFileSync("submission/positive-cases.json", "utf8"));
for (const c of cases) it(`submission example: ${c.name}`, async () => {
  const result = await callTool(c.tool, c.arguments, {});
  expect(result).not.toHaveProperty("isError");
  const value = result.structuredContent!;
  const tool = tools.find(t => t.name === c.tool)!;
  const validate = new Ajv({ strict: false }).compile(tool.outputSchema);
  expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
  expect(value.target).toBe(c.arguments.target);
  if ("criteria" in value) {
    expect(value.analysis_mode).toBe("full");
    expect(value.overall_score).toBe(50);
    expect(value.criteria.find(c => c.id === "brightness")?.status).toBe("fail");
    expect(value.criteria.find(c => c.id === "face_framing")?.status).toBe("not_checked");
    expect(Object.fromEntries(value.criteria.map(c => [c.id, c.status]))).toEqual({
      resolution: "fail", aspect_ratio: "pass", file: "pass", brightness: "fail",
      contrast: "fail", color_balance: "pass", background: "pass", sharpness: "fail",
      face_framing: "not_checked",
    });
  } else {
    expect(value.recommendations.max_bytes).toBe(8_000_000);
    expect(Object.keys(value.recommendations.crops)).toEqual([c.arguments.target]);
  }
  // Explicit opt-in regeneration of review evidence from local code only.
  const path = `submission/evidence/result-${c.name.toLowerCase().replaceAll(" ", "-")}.json`;
  if (process.env.HEADSHOT_WRITE_EVIDENCE === "1")
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
  expect(value).toEqual(JSON.parse(readFileSync(path, "utf8")));
});
it("the negative private-URL example is rejected before any external fetch", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected fetch"));
  try {
    const result = await callTool("check_headshot_photo", { image_url: "http://127.0.0.1/private.png" }, {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Only HTTPS");
    expect(fetcher).not.toHaveBeenCalled();
  } finally { fetcher.mockRestore(); }
});
it("catalog criteria values have explicit supported types and tools declare boundaries", () => {
  expect(tools[0].outputSchema.properties).toMatchObject({
    criteria: { items: { properties: { value: { type: ["object", "number", "null"] } } } },
  });
  for (const tool of tools) {
    expect(tool.description.startsWith("Use this when the user ")).toBe(true);
    expect(tool.description).toContain("Do not use for ");
    expect(tool.annotations.readOnlyHint).toBe(true);
    expect(tool.annotations.destructiveHint).toBe(false);
  }
  expect(tools.map(t => t.annotations.openWorldHint)).toEqual([true, false]);
});
