import type { LendingMarketDetail } from "@suwappu/sdk";

const SUWAPPU_API_URL = "https://api.suwappu.bot";

export function lendingMarketDetailUrl(id: string, chainId: number): string {
  if (!id) throw new Error("market ID is required");
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("chain ID must be a positive integer");
  }
  return `${SUWAPPU_API_URL}/v1/agent/lend/market/${encodeURIComponent(id)}?chainId=${chainId}`;
}

/**
 * The public @suwappu/sdk 0.4.0 detail helper predates chain-scoped market reads.
 * Use the public REST contract so a market ID is never detached from its chain.
 */
export async function fetchLendingMarketDetail(
  id: string,
  chainId: number,
): Promise<LendingMarketDetail> {
  const response = await fetch(lendingMarketDetailUrl(id, chainId));
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Suwappu lending detail failed (${response.status})${body ? `: ${body}` : ""}`);
  }
  return (await response.json()) as LendingMarketDetail;
}
