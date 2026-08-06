import { describe, expect, it } from "bun:test";
import {
  parseSortField,
  positiveInteger,
  sortMarkets,
  type LendingSummary,
} from "../src/market.js";

interface Market extends LendingSummary {
  loanToken: string;
}

const sampleMarkets: Market[] = [
  { loanToken: "USDC", supplyApy: 5.2, utilization: 80, totalSupply: 1_000_000 },
  { loanToken: "WBTC", supplyApy: 12.5, utilization: 95, totalSupply: 500_000 },
  { loanToken: "DAI", supplyApy: 3.1, utilization: 60, totalSupply: 2_000_000 },
];

describe("lending market sorting", () => {
  it("sorts by supply APY descending", () => {
    expect(sortMarkets(sampleMarkets, "apy", 3).map((market) => market.loanToken)).toEqual([
      "WBTC",
      "USDC",
      "DAI",
    ]);
  });

  it("sorts by utilization descending", () => {
    expect(sortMarkets(sampleMarkets, "utilization", 2).map((market) => market.loanToken)).toEqual([
      "WBTC",
      "USDC",
    ]);
  });

  it("sorts by total supply without pretending the unit is USD", () => {
    expect(sortMarkets(sampleMarkets, "supply", 3)[0].loanToken).toBe("DAI");
  });

  it("does not mutate API response order", () => {
    sortMarkets(sampleMarkets, "apy", 2);
    expect(sampleMarkets.map((market) => market.loanToken)).toEqual(["USDC", "WBTC", "DAI"]);
  });
});

describe("CLI validation", () => {
  it("accepts only documented sort fields", () => {
    expect(parseSortField("apy")).toBe("apy");
    expect(parseSortField("utilization")).toBe("utilization");
    expect(parseSortField("supply")).toBe("supply");
    expect(() => parseSortField("tvl")).toThrow("--sort");
  });

  it("requires positive integer chain/top values", () => {
    expect(positiveInteger(8453, "--chain")).toBe(8453);
    expect(() => positiveInteger(0, "--top")).toThrow("--top");
    expect(() => positiveInteger(1.5, "--top")).toThrow("--top");
  });
});
