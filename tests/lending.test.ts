import { describe, expect, it } from "bun:test";
import { lendingMarketDetailUrl, operationTimeoutMs } from "../src/lending.js";

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

describe("operation deadline", () => {
  it("keeps direct lending requests inside the configured bound", () => {
    expect(operationTimeoutMs(undefined)).toBe(25_000);
    expect(operationTimeoutMs("100")).toBe(100);
    expect(operationTimeoutMs("30000")).toBe(30_000);
    expect(() => operationTimeoutMs("0")).toThrow("100 to 30000");
    expect(() => operationTimeoutMs("30001")).toThrow("100 to 30000");
  });
});
