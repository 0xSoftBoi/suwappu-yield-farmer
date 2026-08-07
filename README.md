# Suwappu Lending Monitor

A read-only Morpho lending-market monitor for builders using [Suwappu](https://suwappu.bot).

The repository is named `suwappu-yield-farmer` for compatibility, but it does not deposit, withdraw, borrow, repay, or move funds. It discovers markets, reads details, emits a stable cross-language snapshot, and turns two snapshots into thresholded APY/utilization changes for alerts.

> APY is variable and DeFi lending carries smart-contract, oracle, liquidity, and collateral risk. Market data is not a guaranteed return.

## Builder surface

| CLI command | TypeScript SDK | Hosted MCP tool | Side effect |
|---|---|---|---|
| `markets` | `client.lend.markets(chainId)` | `lend_markets` | read-only |
| `detail` | `client.lend.market(id)` | `lend_market` | read-only |
| `snapshot` | `client.lend.markets(chainId)` + local normalization | `lend_markets` + local normalization | read-only |
| `changes` | local snapshot comparison | local snapshot comparison | local read only |

Hosted MCP endpoint: `https://api.suwappu.bot/mcp`.

This makes the repository a useful starting point for research agents, dashboards, and paid alerting systems without giving those components a transaction capability. See [BUILDING_A_PRODUCT.md](BUILDING_A_PRODUCT.md) for the polling, alert-state, unit-economics, and execution-handoff design.

## TypeScript quick start

```bash
git clone https://github.com/0xSoftBoi/suwappu-yield-farmer.git
cd suwappu-yield-farmer
bun install

export SUWAPPU_API_KEY=suwappu_sk_...

# Base markets sorted by supply APY
bun src/cli.ts markets --chain 8453 --top 10 --sort apy

# Read one market
bun src/cli.ts detail --id <market-id>

# Capture a versioned monitoring snapshot
bun src/cli.ts snapshot --chain 8453 > before.json
```

The TypeScript example uses the actually published `@suwappu/sdk@0.4.0` lending read methods.

## Python quick start

The Suwappu Python SDK is source-only today and is not published on PyPI. This repository pins the current SDK source in `requirements.txt`:

```bash
python -m pip install -r requirements.txt
export SUWAPPU_API_KEY=suwappu_sk_...

python farmer.py markets --chain 8453 --top 5 --sort utilization
python farmer.py detail --id <market-id>
python farmer.py snapshot --chain 8453 > before.json
```

The old Python CLI advertised `detail` but never dispatched it; both commands are now implemented.

## Markets

```bash
bun src/cli.ts markets --chain 8453 --sort apy
bun src/cli.ts markets --chain 8453 --sort utilization
bun src/cli.ts markets --chain 8453 --sort supply --json
```

Supported sort keys:

- `apy` → `supplyApy`
- `utilization` → `utilization`
- `supply` → `totalSupply`

`--chain` and `--top` must be positive integers. Unknown sort keys are rejected instead of silently falling back to a different metric.

The SDK calls `totalSupply` a numeric market metric but does not define that field as USD-denominated. This example therefore does not label it “TVL” or prefix it with `$`. If your application needs dollar TVL, use a field whose currency units are explicit or perform an explicit, documented valuation step.

## Detail

```bash
bun src/cli.ts detail --id <market-id>
bun src/cli.ts detail --id <market-id> --json
```

Detail adds fields such as LLTV, oracle, interest-rate model, and creation time. Reading it still does not create a lending position.

## Snapshot → changes → alerts

`snapshot` deliberately emits only fields with stable semantics across the published TypeScript SDK and source-pinned Python SDK: market/chain identity, token symbols, supply/borrow APY, and utilization.

```bash
bun src/cli.ts snapshot --chain 8453 > before.json
# poll again later
bun src/cli.ts snapshot --chain 8453 > after.json

bun src/cli.ts changes \
  --before before.json \
  --after after.json \
  --min-apy-delta 0.5 \
  --min-utilization-delta 5
```

The Python CLI accepts the same files and thresholds. APY and utilization deltas are expressed in **percentage points**. New/removed markets are always surfaced; unchanged markets below both thresholds are omitted.

This is change detection, not a risk score or yield recommendation. A production alert product should add stored watchlists, shared polling, hysteresis, deduplication, notification retries, and an outage policy. The complete pattern is in [Build a Lending Monitor People Can Pay For](BUILDING_A_PRODUCT.md).

## Why not call Morpho directly?

For a Morpho-only application that needs the full data model or transaction construction, you probably should. The official [Morpho API](https://docs.morpho.org/developers/api/get-started/) exposes richer current/historical data, rewards, positions, and analytics, while [`@morpho-org/morpho-sdk`](https://github.com/morpho-org/sdks) is Morpho's recommended TypeScript surface for reads and ready-to-send transactions.

Use this example when the useful boundary is Suwappu's smaller REST/SDK/MCP contract plus an application-owned monitoring layer that can compose with other Suwappu agent tools.

## Current SDK status

The npm SDK is currently 0.4.0; the Suwappu repository contains newer 0.6 TypeScript source and a source-only Python SDK. This README distinguishes published packages from repository source so builders can reproduce the example today.

The current Suwappu lending client surface represented here is intentionally read-only. If supply/borrow execution is added later, expose it as a separate destructive capability with its own authorization and policy checks rather than changing the semantics of `markets` or `detail`.

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `SUWAPPU_API_KEY` | Yes | Suwappu agent authentication |

## Develop

```bash
bun run check
bun test
python -m py_compile farmer.py
python -m unittest discover -s tests -p 'test_*.py'
```

The TypeScript tests call the same sort/validation and monitoring helpers used by the CLI. CI also installs/imports the pinned Python SDK, compiles both Python modules, and exercises the Python snapshot/change contract.

## Build further

- [Product/alert architecture and unit economics](BUILDING_A_PRODUCT.md)
- [Suwappu docs](https://docs.suwappu.bot)
- [TypeScript SDK source](https://github.com/0xSoftBoi/suwappubot/tree/main/packages/sdk)
- [Python SDK source](https://github.com/0xSoftBoi/suwappubot/tree/main/packages/sdk-python)
- [Agent/MCP guide](https://github.com/0xSoftBoi/suwappubot/blob/main/docs/agent-clients.md)

## License

MIT
