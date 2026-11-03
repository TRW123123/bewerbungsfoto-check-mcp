import Ajv from "ajv";
import { it, expect } from "vitest";
import { tools } from "../src/tools";
import { analyzeImage } from "../src/images";
import { requirements } from "../src/scoring";
import { png } from "./fixtures";
it("successful results match advertised output schemas", () => {
  const ajv = new Ajv({ strict: false });
  for (const mode of ["full", "header-only"]) {
    const validate = ajv.compile(tools[0].outputSchema);
    expect(
      validate(analyzeImage(png(), "all", mode)),
      JSON.stringify(validate.errors),
    ).toBe(true);
  }
  const validate = ajv.compile(tools[1].outputSchema);
  expect(validate(requirements("all")), JSON.stringify(validate.errors)).toBe(
    true,
  );
});
