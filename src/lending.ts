const DEFAULT_SUWAPPU_API_URL = "https://api.suwappu.bot";
const DEFAULT_OPERATION_TIMEOUT_MS = 25_000;

export interface LendingMarket {
  id: string;
  loanToken: string;
  collateralToken: string;
  lltv: number;
  supplyApy: number;
  borrowApy: number;
  totalSupply: number;
  totalBorrow: number;
  utilization: number;
  chainId: number;
}

export interface LendingMarketDetail extends LendingMarket {
  oracle: string;
  irm: string;
  createdAt: string;
}

export function operationTimeoutMs(
  raw = process.env.SUWAPPU_OPERATION_TIMEOUT_MS,
): number {
  if (raw === undefined || raw === "") return DEFAULT_OPERATION_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 30_000) {
    throw new Error("SUWAPPU_OPERATION_TIMEOUT_MS must be an integer from 100 to 30000");
  }
  return parsed;
}

function suwappuApiUrl(): string {
  return (process.env.SUWAPPU_API_URL ?? DEFAULT_SUWAPPU_API_URL).replace(/\/+$/, "");
}

function validateChainId(chainId: number): void {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("chain ID must be a positive integer");
  }
}

export function lendingMarketsUrl(chainId: number): string {
  validateChainId(chainId);
  return `${suwappuApiUrl()}/v1/agent/lend/markets?chainId=${chainId}`;
}

export function lendingMarketDetailUrl(id: string, chainId: number): string {
  if (!id) throw new Error("market ID is required");
  validateChainId(chainId);
  return `${suwappuApiUrl()}/v1/agent/lend/market/${encodeURIComponent(id)}?chainId=${chainId}`;
}

async function readJson<T>(url: string, operation: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(operationTimeoutMs()),
  });
  if (!response.ok) {
    throw new Error(`${operation} failed (${response.status})`);
  }
  return (await response.json()) as T;
}

/**
 * The published SDK's list transport currently has no request deadline and
 * includes raw response bodies in HTTP errors. Keep the monitor's production
 * boundary bounded and status-only until that transport contract changes.
 */
export async function fetchLendingMarkets(chainId: number): Promise<LendingMarket[]> {
  const payload = await readJson<{ markets?: unknown }>(
    lendingMarketsUrl(chainId),
    "Suwappu lending markets",
  );
  if (!Array.isArray(payload.markets)) {
    throw new Error("Suwappu lending markets returned an invalid payload");
  }
  return payload.markets as LendingMarket[];
}

/** Keep the public REST detail read chain-scoped and bounded. */
export async function fetchLendingMarketDetail(
  id: string,
  chainId: number,
): Promise<LendingMarketDetail> {
  return readJson<LendingMarketDetail>(
    lendingMarketDetailUrl(id, chainId),
    "Suwappu lending detail",
  );
}
