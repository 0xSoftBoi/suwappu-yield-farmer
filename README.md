# Suwappu Lending Market Explorer

A read-only Morpho lending-market example for builders using [Suwappu](https://suwappu.bot).

The repository is named `suwappu-yield-farmer` for compatibility, but it does not deposit, withdraw, borrow, repay, or move funds. It discovers markets, ranks their reported metrics, and reads market details.

> APY is variable and DeFi lending carries smart-contract, oracle, liquidity, and collateral risk. Market data is not a guaranteed return.

## Builder surface

| CLI command | TypeScript SDK | Hosted MCP tool | Side effect |
|---|---|---|---|
| `markets` | `client.lend.markets(chainId)` | `lend_markets` | read-only |
| `detail` | `client.lend.market(id)` | `lend_market` | read-only |

Hosted MCP endpoint: `https://api.suwappu.bot/mcp`.

This makes the repository a useful starting point for research agents, dashboards, ranking jobs, or alerting systems without giving those components a transaction capability.

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
```

The TypeScript example uses the actually published `@suwappu/sdk@0.4.0` lending read methods.

## Python quick start

The Suwappu Python SDK is source-only today and is not published on PyPI. This repository pins the current SDK source in `requirements.txt`:

```bash
python -m pip install -r requirements.txt
export SUWAPPU_API_KEY=suwappu_sk_...

python farmer.py markets --chain 8453 --top 5 --sort utilization
python farmer.py detail --id <market-id>
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
```

The TypeScript tests call the same sort/validation helpers used by the CLI. CI also installs and imports the pinned Python SDK before compiling the Python example.

## Build further

- [Suwappu docs](https://docs.suwappu.bot)
- [TypeScript SDK source](https://github.com/0xSoftBoi/suwappubot/tree/main/packages/sdk)
- [Python SDK source](https://github.com/0xSoftBoi/suwappubot/tree/main/packages/sdk-python)
- [Agent/MCP guide](https://github.com/0xSoftBoi/suwappubot/blob/main/docs/agent-clients.md)

## License

MIT
