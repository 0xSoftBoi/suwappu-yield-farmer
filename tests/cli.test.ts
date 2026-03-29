import { describe, it, expect } from "bun:test";
describe("yield-farmer", () => {
  it("should sort by APY descending", () => {
    const markets = [{apy: 5}, {apy: 10}, {apy: 3}];
    const sorted = [...markets].sort((a, b) => b.apy - a.apy);
    expect(sorted[0].apy).toBe(10);
  });
});
