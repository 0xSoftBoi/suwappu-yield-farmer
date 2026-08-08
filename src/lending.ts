import type { LendingMarketDetail } from "@suwappu/sdk";

const DEFAULT_SUWAPPU_API_URL = "https://api.suwappu.bot";
const DEFAULT_OPERATION_TIMEOUT_MS = 25_000;

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

export function lendingMarketDetailUrl(id: string, chainId: number): string {
  if (!id) throw new Error("market ID is required");
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("chain ID must be a positive integer");
  }
  return `${suwappuApiUrl()}/v1/agent/lend/market/${encodeURIComponent(id)}?chainId=${chainId}`;
}

/**
 * The public @suwappu/sdk 0.4.0 detail helper predates chain-scoped market reads.
 * Use the public REST contract so a market ID is never detached from its chain.
 */
export async function fetchLendingMarketDetail(
  id: string,
  chainId: number,
): Promise<LendingMarketDetail> {
  const response = await fetch(lendingMarketDetailUrl(id, chainId), {
    signal: AbortSignal.timeout(operationTimeoutMs()),
  });
  if (!response.ok) {
    throw new Error(`Suwappu lending detail failed (${response.status})`);
  }
  return (await response.json()) as LendingMarketDetail;
}
