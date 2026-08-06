#!/usr/bin/env bun
import { Command } from "commander";
import { createClient } from "@suwappu/sdk";
import {
  parseSortField,
  positiveInteger,
  sortMarkets,
} from "./market.js";

function requireApiKey(): string {
  const value = process.env.SUWAPPU_API_KEY;
  if (!value) {
    throw new Error("SUWAPPU_API_KEY is not set");
  }
  return value;
}

const program = new Command()
  .name("suwappu-yield-farmer")
  .description("Read-only Suwappu/Morpho lending market explorer")
  .version("1.0.0");

program
  .command("markets")
  .description("List lending markets; no deposit or borrow is performed")
  .option("--chain <id>", "chain ID", Number.parseInt, 8453)
  .option("--top <n>", "show top N", Number.parseInt, 10)
  .option("--sort <field>", "sort by: apy, utilization, supply", "apy")
  .option("--json", "JSON output")
  .action(async (opts) => {
    const chain = positiveInteger(opts.chain, "--chain");
    const top = positiveInteger(opts.top, "--top");
    const sort = parseSortField(opts.sort);
    const client = createClient({ apiKey: requireApiKey() });
    const markets = await client.lend.markets(chain);
    const sorted = sortMarkets(markets, sort, top);

    if (opts.json) {
      console.log(JSON.stringify(sorted, null, 2));
      return;
    }

    console.log(`Morpho Lending Markets (Chain ${chain}) — sorted by ${sort}\n`);
    console.log(
      "  Market                          Supply APY   Borrow APY   Utilization   Total supply",
    );
    console.log("  " + "─".repeat(90));
    for (const market of sorted) {
      const pair = `${market.loanToken}/${market.collateralToken}`.padEnd(30);
      console.log(
        `  ${pair}   ${market.supplyApy.toFixed(2)}%`.padEnd(48) +
          `${market.borrowApy.toFixed(2)}%`.padEnd(13) +
          `${market.utilization.toFixed(1)}%`.padEnd(14) +
          market.totalSupply.toLocaleString(),
      );
    }
  });

program
  .command("detail")
  .description("Read details for one lending market")
  .requiredOption("--id <id>", "market ID")
  .option("--json", "JSON output")
  .action(async (opts) => {
    const client = createClient({ apiKey: requireApiKey() });
    const detail = await client.lend.market(opts.id);

    if (opts.json) {
      console.log(JSON.stringify(detail, null, 2));
      return;
    }

    console.log(`\n${detail.loanToken}/${detail.collateralToken} Market\n`);
    console.log("  Read-only market metadata — no funds are moved.");
    console.log(`  Supply APY:    ${detail.supplyApy.toFixed(2)}%`);
    console.log(`  Borrow APY:    ${detail.borrowApy.toFixed(2)}%`);
    console.log(`  Utilization:   ${detail.utilization.toFixed(1)}%`);
    console.log(`  LLTV:          ${(detail.lltv * 100).toFixed(0)}%`);
    console.log(`  Total Supply:  ${detail.totalSupply.toLocaleString()}`);
    console.log(`  Oracle:        ${detail.oracle}`);
    console.log(`  IRM:           ${detail.irm}`);
    console.log(`  Created:       ${detail.createdAt}`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
