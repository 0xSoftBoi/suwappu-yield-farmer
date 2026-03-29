import { createClient } from "@suwappu/sdk";
const client = createClient({ apiKey: process.env.SUWAPPU_API_KEY });

console.log("Morpho lending markets on Base:\n");
const markets = await client.lend.markets(8453);
const sorted = [...markets].sort((a, b) => b.supplyApy - a.supplyApy);

console.log("  Market                          Supply APY   Borrow APY   Utilization");
console.log("  " + "─".repeat(73));
for (const m of sorted.slice(0, 10)) {
  const pair = `${m.loanToken}/${m.collateralToken}`.padEnd(30);
  console.log(`  ${pair}   ${m.supplyApy.toFixed(2)}%`.padEnd(50) + `  ${m.borrowApy.toFixed(2)}%`.padEnd(13) + `  ${m.utilization.toFixed(1)}%`);
}
if (sorted.length) {
  const b = sorted[0];
  console.log(`\nBest: ${b.loanToken}/${b.collateralToken} — ${b.supplyApy.toFixed(2)}% APY | $${(b.totalSupply/1e6).toFixed(1)}M supply | LLTV: ${(b.lltv*100).toFixed(0)}%`);
  const d = await client.lend.market(b.id);
  console.log(`  Oracle: ${d.oracle} | IRM: ${d.irm}`);
}
