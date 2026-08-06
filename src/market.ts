export type SortField = "apy" | "utilization" | "supply";

export interface LendingSummary {
  supplyApy: number;
  utilization: number;
  totalSupply: number;
}

export function parseSortField(value: string): SortField {
  if (value === "apy" || value === "utilization" || value === "supply") return value;
  throw new Error("--sort must be one of: apy, utilization, supply");
}

export function positiveInteger(value: number, flag: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return value;
}

export function sortMarkets<T extends LendingSummary>(
  markets: T[],
  field: SortField,
  limit: number,
): T[] {
  positiveInteger(limit, "--top");
  const selectors: Record<SortField, (market: T) => number> = {
    apy: (market) => market.supplyApy,
    utilization: (market) => market.utilization,
    supply: (market) => market.totalSupply,
  };

  return [...markets]
    .sort((a, b) => selectors[field](b) - selectors[field](a))
    .slice(0, limit);
}
