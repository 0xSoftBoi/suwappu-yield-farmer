#!/usr/bin/env bun
import { Command } from "commander";
import { createClient } from "@suwappu/sdk";
import { readFile } from "node:fs/promises";
import {
  parseSortField,
  positiveInteger,
  sortMarkets,
} from "./market.js";
import {
  compareSnapshots,
  createSnapshot,
  nonNegativeNumber,
  parseSnapshot,
  type SnapshotChanges,
} from "./monitor.js";

function requireApiKey(): string {
  const value = process.env.SUWAPPU_API_KEY;
  if (!value) {
    throw new Error("SUWAPPU_API_KEY is not set");
  }
  return value;
}

async function readSnapshot(path: string) {
  const contents = await readFile(path, "utf8");
  return parseSnapshot(JSON.parse(contents) as unknown);
}

function printChanges(result: SnapshotChanges): void {
  console.log(`Lending changes: ${result.beforeCapturedAt} → ${result.afterCapturedAt}\n`);
  if (result.changes.length === 0) {
    console.log("  No markets crossed the configured change thresholds.");
    return;
  }

  for (const change of result.changes) {
    const pair = `${change.loanToken}/${change.collateralToken}`;
    if (change.status !== "changed") {
      console.log(`  ${pair} (${change.chainId}) ${change.status}`);
      continue;
    }
    const apyDelta = change.supplyApyDeltaPp ?? 0;
    const utilizationDelta = change.utilizationDeltaPp ?? 0;
    console.log(
      `  ${pair} (${change.chainId}) supply APY ${change.supplyApyBefore?.toFixed(2)}% → ${change.supplyApyAfter?.toFixed(2)}% (${apyDelta >= 0 ? "+" : ""}${apyDelta.toFixed(2)} pp); utilization ${change.utilizationBefore?.toFixed(1)}% → ${change.utilizationAfter?.toFixed(1)}% (${utilizationDelta >= 0 ? "+" : ""}${utilizationDelta.toFixed(1)} pp)`,
    );
  }
}

const program = new Command()
  .name("suwappu-yield-farmer")
  .description("Read-only Suwappu/Morpho lending market monitor")
  .version("1.1.0");

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

program
  .command("snapshot")
  .description("Emit a stable monitoring snapshot; read-only and suitable for later comparison")
  .option("--chain <id>", "chain ID", Number.parseInt, 8453)
  .action(async (opts) => {
    const chain = positiveInteger(opts.chain, "--chain");
    const client = createClient({ apiKey: requireApiKey() });
    const markets = await client.lend.markets(chain);
    console.log(JSON.stringify(createSnapshot(markets, chain), null, 2));
  });

program
  .command("changes")
  .description("Compare two snapshot files and emit material APY/utilization changes")
  .requiredOption("--before <file>", "earlier snapshot JSON")
  .requiredOption("--after <file>", "later snapshot JSON")
  .option(
    "--min-apy-delta <pp>",
    "minimum absolute supply-APY change in percentage points",
    Number.parseFloat,
    0.5,
  )
  .option(
    "--min-utilization-delta <pp>",
    "minimum absolute utilization change in percentage points",
    Number.parseFloat,
    5,
  )
  .option("--json", "JSON output")
  .action(async (opts) => {
    const minApyDeltaPp = nonNegativeNumber(opts.minApyDelta, "--min-apy-delta");
    const minUtilizationDeltaPp = nonNegativeNumber(
      opts.minUtilizationDelta,
      "--min-utilization-delta",
    );
    const [before, after] = await Promise.all([
      readSnapshot(opts.before),
      readSnapshot(opts.after),
    ]);
    const result = compareSnapshots(before, after, { minApyDeltaPp, minUtilizationDeltaPp });

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    printChanges(result);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
