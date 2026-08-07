import { describe, expect, it } from "bun:test";
import { lendingMarketDetailUrl } from "../src/lending.js";

describe("chain-scoped lending detail", () => {
  it("keeps the market ID paired with its chain and URL-encodes the ID", () => {
    expect(lendingMarketDetailUrl("market/one", 1)).toBe(
      "https://api.suwappu.bot/v1/agent/lend/market/market%2Fone?chainId=1",
    );
  });

  it("rejects invalid market identity", () => {
    expect(() => lendingMarketDetailUrl("", 8453)).toThrow("market ID");
    expect(() => lendingMarketDetailUrl("market", 0)).toThrow("positive integer");
  });
});
