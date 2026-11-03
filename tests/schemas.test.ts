import Ajv from "ajv";
import { it, expect } from "vitest";
import { tools } from "../src/tools";
import { analyzeImage } from "../src/images";
import { requirements } from "../src/scoring";
import { png } from "./fixtures";
it("successful results match advertised output schemas", async () => {
  const ajv = new Ajv({ strict: false });
  for (const mode of ["full", "header-only"]) {
    const validate = ajv.compile(tools[0].outputSchema);
    expect(
      validate(await analyzeImage(png(), "all", mode)),
      JSON.stringify(validate.errors),
    ).toBe(true);
  }
  const validate = ajv.compile(tools[1].outputSchema);
  expect(validate(requirements("all")), JSON.stringify(validate.errors)).toBe(
    true,
  );
});

it("real offline binding smoke results match the output schema", async () => {
  const { readFileSync } = await import("node:fs");
  const validate = new Ajv({ strict: false }).compile(tools[0].outputSchema);
  for (const size of [1500, 3000]) {
    const result = JSON.parse(readFileSync(`docs/smoke-${size}.json`, "utf8")).result.structuredContent;
    expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
  }
});
