export const SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface LendingSnapshotInput {
  id: string;
  chainId: number;
  loanToken: string;
  collateralToken: string;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
}

export interface MarketSnapshot extends LendingSnapshotInput {}

export interface LendingSnapshot {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  capturedAt: string;
  chainId: number;
  markets: MarketSnapshot[];
}

export interface MarketChange {
  marketKey: string;
  id: string;
  chainId: number;
  loanToken: string;
  collateralToken: string;
  status: "added" | "removed" | "changed";
  supplyApyBefore: number | null;
  supplyApyAfter: number | null;
  supplyApyDeltaPp: number | null;
  utilizationBefore: number | null;
  utilizationAfter: number | null;
  utilizationDeltaPp: number | null;
}

export interface SnapshotChanges {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  beforeCapturedAt: string;
  afterCapturedAt: string;
  changes: MarketChange[];
}

export interface ChangeThresholds {
  minApyDeltaPp: number;
  minUtilizationDeltaPp: number;
}

function marketKey(market: Pick<LendingSnapshotInput, "chainId" | "id">): string {
  return `${market.chainId}:${market.id}`;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

export function nonNegativeNumber(value: number, flag: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${flag} must be a non-negative number`);
  }
  return value;
}

export function createSnapshot(
  markets: LendingSnapshotInput[],
  chainId: number,
  capturedAt = new Date().toISOString(),
): LendingSnapshot {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("snapshot chainId must be a positive integer");
  }
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    capturedAt,
    chainId,
    markets: markets.map((market) => {
      if (market.chainId !== chainId) throw new Error("market chainId must match snapshot chainId");
      return {
        id: market.id,
        chainId: market.chainId,
        loanToken: market.loanToken,
        collateralToken: market.collateralToken,
        supplyApy: finite(market.supplyApy, "supplyApy"),
        borrowApy: finite(market.borrowApy, "borrowApy"),
        utilization: finite(market.utilization, "utilization"),
      };
    }),
  };
}

export function parseSnapshot(value: unknown): LendingSnapshot {
  if (!value || typeof value !== "object") throw new Error("snapshot must be an object");
  const snapshot = value as Partial<LendingSnapshot>;
  if (snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`snapshot schemaVersion must be ${SNAPSHOT_SCHEMA_VERSION}`);
  }
  if (typeof snapshot.capturedAt !== "string" || !snapshot.capturedAt) {
    throw new Error("snapshot capturedAt is required");
  }
  if (!Number.isInteger(snapshot.chainId) || (snapshot.chainId ?? 0) <= 0) {
    throw new Error("snapshot chainId must be a positive integer");
  }
  if (!Array.isArray(snapshot.markets)) throw new Error("snapshot markets must be an array");

  const markets = snapshot.markets.map((market, index) => {
    if (!market || typeof market !== "object") throw new Error(`markets[${index}] must be an object`);
    const item = market as Partial<MarketSnapshot>;
    if (typeof item.id !== "string" || !item.id) throw new Error(`markets[${index}].id is required`);
    if (!Number.isInteger(item.chainId) || (item.chainId ?? 0) <= 0) {
      throw new Error(`markets[${index}].chainId must be a positive integer`);
    }
    if (typeof item.loanToken !== "string" || typeof item.collateralToken !== "string") {
      throw new Error(`markets[${index}] token symbols are required`);
    }
    const normalized = {
      id: item.id,
      chainId: item.chainId as number,
      loanToken: item.loanToken,
      collateralToken: item.collateralToken,
      supplyApy: finite(item.supplyApy as number, `markets[${index}].supplyApy`),
      borrowApy: finite(item.borrowApy as number, `markets[${index}].borrowApy`),
      utilization: finite(item.utilization as number, `markets[${index}].utilization`),
    };
    if (normalized.chainId !== snapshot.chainId) {
      throw new Error(`markets[${index}].chainId must match snapshot chainId`);
    }
    return normalized;
  });

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    capturedAt: snapshot.capturedAt,
    chainId: snapshot.chainId as number,
    markets,
  };
}

export function compareSnapshots(
  before: LendingSnapshot,
  after: LendingSnapshot,
  thresholds: ChangeThresholds,
): SnapshotChanges {
  nonNegativeNumber(thresholds.minApyDeltaPp, "--min-apy-delta");
  nonNegativeNumber(thresholds.minUtilizationDeltaPp, "--min-utilization-delta");

  const beforeByKey = new Map(before.markets.map((market) => [marketKey(market), market]));
  const afterByKey = new Map(after.markets.map((market) => [marketKey(market), market]));
  const keys = [...new Set([...beforeByKey.keys(), ...afterByKey.keys()])].sort();
  const changes: MarketChange[] = [];

  for (const key of keys) {
    const previous = beforeByKey.get(key);
    const current = afterByKey.get(key);
    const market = current ?? previous;
    if (!market) continue;

    if (!previous || !current) {
      changes.push({
        marketKey: key,
        id: market.id,
        chainId: market.chainId,
        loanToken: market.loanToken,
        collateralToken: market.collateralToken,
        status: previous ? "removed" : "added",
        supplyApyBefore: previous?.supplyApy ?? null,
        supplyApyAfter: current?.supplyApy ?? null,
        supplyApyDeltaPp: null,
        utilizationBefore: previous?.utilization ?? null,
        utilizationAfter: current?.utilization ?? null,
        utilizationDeltaPp: null,
      });
      continue;
    }

    const supplyApyDeltaPp = current.supplyApy - previous.supplyApy;
    const utilizationDeltaPp = current.utilization - previous.utilization;
    if (
      Math.abs(supplyApyDeltaPp) < thresholds.minApyDeltaPp &&
      Math.abs(utilizationDeltaPp) < thresholds.minUtilizationDeltaPp
    ) {
      continue;
    }

    changes.push({
      marketKey: key,
      id: current.id,
      chainId: current.chainId,
      loanToken: current.loanToken,
      collateralToken: current.collateralToken,
      status: "changed",
      supplyApyBefore: previous.supplyApy,
      supplyApyAfter: current.supplyApy,
      supplyApyDeltaPp,
      utilizationBefore: previous.utilization,
      utilizationAfter: current.utilization,
      utilizationDeltaPp,
    });
  }

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    beforeCapturedAt: before.capturedAt,
    afterCapturedAt: after.capturedAt,
    changes,
  };
}
