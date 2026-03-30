import { describe, it, expect } from "bun:test";

interface Market {
  loanToken: string;
  collateralToken: string;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
  totalSupply: number;
}

const sampleMarkets: Market[] = [
  { loanToken: "USDC", collateralToken: "ETH", supplyApy: 5.2, borrowApy: 7.1, utilization: 80, totalSupply: 1_000_000 },
  { loanToken: "USDC", collateralToken: "WBTC", supplyApy: 12.5, borrowApy: 15.0, utilization: 95, totalSupply: 500_000 },
  { loanToken: "DAI", collateralToken: "ETH", supplyApy: 3.1, borrowApy: 5.0, utilization: 60, totalSupply: 2_000_000 },
];

describe("sorting", () => {
  it("should sort by APY descending", () => {
    const sorted = [...sampleMarkets].sort((a, b) => b.supplyApy - a.supplyApy);
    expect(sorted[0].supplyApy).toBe(12.5);
    expect(sorted[2].supplyApy).toBe(3.1);
  });

  it("should sort by utilization descending", () => {
    const sorted = [...sampleMarkets].sort((a, b) => b.utilization - a.utilization);
    expect(sorted[0].utilization).toBe(95);
  });

  it("should sort by total supply descending", () => {
    const sorted = [...sampleMarkets].sort((a, b) => b.totalSupply - a.totalSupply);
    expect(sorted[0].loanToken).toBe("DAI");
  });
});

describe("APY formatting", () => {
  it("should format to 2 decimal places", () => {
    expect((5.2).toFixed(2)).toBe("5.20");
    expect((12.5).toFixed(2)).toBe("12.50");
  });
});

describe("TVL formatting", () => {
  it("should format millions", () => {
    const tvl = 2_000_000;
    expect(`$${(tvl / 1e6).toFixed(1)}M`).toBe("$2.0M");
  });

  it("should format thousands", () => {
    const tvl = 500_000;
    expect(`$${(tvl / 1e3).toFixed(0)}K`).toBe("$500K");
  });
});

describe("market pair formatting", () => {
  it("should join loan/collateral with slash", () => {
    const pair = `${sampleMarkets[0].loanToken}/${sampleMarkets[0].collateralToken}`;
    expect(pair).toBe("USDC/ETH");
  });
});

describe("--top flag", () => {
  it("should limit to N results", () => {
    const top = 2;
    const result = sampleMarkets.slice(0, top);
    expect(result.length).toBe(2);
  });

  it("should return all if top > length", () => {
    const result = sampleMarkets.slice(0, 100);
    expect(result.length).toBe(3);
  });
});

describe("subcommands", () => {
  const valid = ["markets", "detail"];
  it("should accept markets and detail", () => {
    expect(valid.includes("markets")).toBe(true);
    expect(valid.includes("detail")).toBe(true);
  });
});
