import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
const listing = JSON.parse(
  readFileSync(new URL("../docs/listing.md", import.meta.url), "utf8").match(
    /```json\n([\s\S]*?)\n```/,
  )![1],
);
it("listing meets every requested length limit", () => {
  for (const field of ["displayName", "shortDescription"])
    expect(listing[field].length).toBeLessThanOrEqual(30);
  expect(listing.longDescription.length).toBeLessThanOrEqual(2000);
  expect(listing.claudeOneLiner.length).toBeLessThanOrEqual(200);
  expect(listing.starterPrompts).toHaveLength(3);
  for (const p of listing.starterPrompts)
    expect(p.length).toBeLessThanOrEqual(128);
  expect(listing.displayName).not.toMatch(/MCP|Plugin/i);
});
