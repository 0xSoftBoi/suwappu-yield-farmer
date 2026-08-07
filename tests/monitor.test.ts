import { describe, expect, it } from "bun:test";
import {
  compareSnapshots,
  createSnapshot,
  nonNegativeNumber,
  parseSnapshot,
  type LendingSnapshotInput,
} from "../src/monitor.js";

const baseMarkets: LendingSnapshotInput[] = [
  {
    id: "0xusdc-weth",
    chainId: 8453,
    loanToken: "USDC",
    collateralToken: "WETH",
    supplyApy: 4.2,
    borrowApy: 6.1,
    utilization: 72,
  },
  {
    id: "0xusdc-cbbtc",
    chainId: 8453,
    loanToken: "USDC",
    collateralToken: "cbBTC",
    supplyApy: 3.4,
    borrowApy: 5.2,
    utilization: 64,
  },
];

describe("monitor snapshots", () => {
  it("creates a versioned, unit-stable snapshot", () => {
    const snapshot = createSnapshot(baseMarkets, 8453, "2026-08-07T10:00:00.000Z");
    expect(snapshot).toEqual({
      schemaVersion: 1,
      capturedAt: "2026-08-07T10:00:00.000Z",
      chainId: 8453,
      markets: baseMarkets,
    });
    expect(parseSnapshot(snapshot)).toEqual(snapshot);
  });

  it("emits only changes that cross an APY or utilization threshold", () => {
    const before = createSnapshot(baseMarkets, 8453, "2026-08-07T10:00:00.000Z");
    const after = createSnapshot(
      [
        { ...baseMarkets[0], supplyApy: 5.1, utilization: 73 },
        { ...baseMarkets[1], supplyApy: 3.45, utilization: 66 },
      ],
      8453,
      "2026-08-07T10:05:00.000Z",
    );

    const result = compareSnapshots(before, after, {
      minApyDeltaPp: 0.5,
      minUtilizationDeltaPp: 5,
    });

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      marketKey: "8453:0xusdc-weth",
      status: "changed",
      utilizationDeltaPp: 1,
    });
    expect(result.changes[0].supplyApyDeltaPp).toBeCloseTo(0.9);
  });

  it("always surfaces market additions and removals", () => {
    const before = createSnapshot([baseMarkets[0]], 8453, "2026-08-07T10:00:00.000Z");
    const after = createSnapshot([baseMarkets[1]], 8453, "2026-08-07T10:05:00.000Z");
    const result = compareSnapshots(before, after, {
      minApyDeltaPp: 99,
      minUtilizationDeltaPp: 99,
    });

    expect(result.changes.map((change) => change.status).sort()).toEqual(["added", "removed"]);
  });

  it("rejects malformed snapshots and thresholds", () => {
    expect(() => parseSnapshot({ schemaVersion: 99, markets: [] })).toThrow("schemaVersion");
    expect(() => createSnapshot([{ ...baseMarkets[0], chainId: 1 }], 8453)).toThrow("chainId");
    expect(() => nonNegativeNumber(-1, "--min-apy-delta")).toThrow("--min-apy-delta");
  });
});
