#!/usr/bin/env bun
import { Command } from "commander";
import { createClient } from "@suwappu/sdk";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) { console.error(`Error: ${name} not set`); process.exit(1); }
  return val;
}

const program = new Command().name("suwappu-yield-farmer").description("Analyze DeFi lending yields on Morpho").version("1.0.0");

program.command("markets").description("List lending markets sorted by APY")
  .option("--chain <id>", "chain ID", parseInt, 8453)
  .option("--top <n>", "show top N", parseInt, 10)
  .option("--sort <field>", "sort by: apy, utilization, supply", "apy")
  .option("--json", "JSON output")
  .action(async (opts) => {
    const client = createClient({ apiKey: requireEnv("SUWAPPU_API_KEY") });
    try {
      const markets = await client.lend.markets(opts.chain);
      const sortFn: Record<string, (a: any, b: any) => number> = {
        apy: (a, b) => b.supplyApy - a.supplyApy,
        utilization: (a, b) => b.utilization - a.utilization,
        supply: (a, b) => b.totalSupply - a.totalSupply,
      };
      const sorted = [...markets].sort(sortFn[opts.sort] ?? sortFn.apy).slice(0, opts.top);
      if (opts.json) { console.log(JSON.stringify(sorted, null, 2)); return; }
      console.log(`Morpho Lending Markets (Chain ${opts.chain}) — sorted by ${opts.sort}\n`);
      console.log("  Market                          Supply APY   Borrow APY   Utilization   TVL");
      console.log("  " + "─".repeat(80));
      for (const m of sorted) {
        const pair = `${m.loanToken}/${m.collateralToken}`.padEnd(30);
        const tvl = m.totalSupply > 1e6 ? `$${(m.totalSupply/1e6).toFixed(1)}M` : `$${(m.totalSupply/1e3).toFixed(0)}K`;
        console.log(`  ${pair}   ${m.supplyApy.toFixed(2)}%`.padEnd(48) + `${m.borrowApy.toFixed(2)}%`.padEnd(13) + `${m.utilization.toFixed(1)}%`.padEnd(14) + tvl);
      }
    } catch (e: any) { console.error(`Error: ${e.message}`); process.exit(1); }
  });

program.command("detail").description("Analyze a specific market")
  .requiredOption("--id <id>", "market ID")
  .option("--json", "JSON output")
  .action(async (opts) => {
    const client = createClient({ apiKey: requireEnv("SUWAPPU_API_KEY") });
    try {
      const d = await client.lend.market(opts.id);
      if (opts.json) { console.log(JSON.stringify(d, null, 2)); return; }
      console.log(`\n${d.loanToken}/${d.collateralToken} Market\n`);
      console.log(`  Supply APY:    ${d.supplyApy.toFixed(2)}%`);
      console.log(`  Borrow APY:    ${d.borrowApy.toFixed(2)}%`);
      console.log(`  Utilization:   ${d.utilization.toFixed(1)}%`);
      console.log(`  LLTV:          ${(d.lltv * 100).toFixed(0)}%`);
      console.log(`  Total Supply:  $${(d.totalSupply/1e6).toFixed(1)}M`);
      console.log(`  Oracle:        ${d.oracle}`);
      console.log(`  IRM:           ${d.irm}`);
      console.log(`  Created:       ${d.createdAt}`);
    } catch (e: any) { console.error(`Error: ${e.message}`); process.exit(1); }
  });

program.parseAsync();
