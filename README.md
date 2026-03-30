# suwappu-yield-farmer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)

Analyze DeFi lending yields on Morpho using [Suwappu](https://suwappu.bot) DEX — find the best APY opportunities.

> **Warning**: DeFi lending involves smart contract risk. Do your own research before depositing.

## Install

```bash
bun install
```

## Usage

```bash
export SUWAPPU_API_KEY=suwappu_sk_...

# List markets sorted by APY
bun run src/cli.ts markets
bun run src/cli.ts markets --top 5 --sort utilization --json

# Analyze specific market
bun run src/cli.ts detail --id <market-id>

# Python
python farmer.py markets --sort apy --top 5
```

## Commands

| Command | Description |
|---------|-------------|
| `markets` | List lending markets with APY, utilization, TVL |
| `detail` | Deep dive into oracle, IRM, and market parameters |

## Options (markets)

| Flag | Default | Description |
|------|---------|-------------|
| `--chain` | `8453` | Chain ID (Base) |
| `--top` | `10` | Number of markets |
| `--sort` | `apy` | Sort by: apy, utilization, supply |
| `--json` | off | JSON output |

## Example Output

```
$ bun run src/cli.ts markets --top 5

Morpho Lending Markets (Chain 8453) — sorted by apy

  Market                          Supply APY   Borrow APY   Utilization   TVL
  ────────────────────────────────────────────────────────────────────────────────
  USDC/cbBTC                      12.50%       15.00%       95.0%         $2.5M
  USDC/WETH                       8.20%        11.30%       88.5%         $5.1M
  USDC/wstETH                     5.20%        7.10%        80.0%         $1.0M
  DAI/WETH                        3.10%        5.00%        60.0%         $2.0M
  USDC/USDT                       2.80%        3.50%        45.0%         $8.3M
```

```
$ bun run src/cli.ts detail --id mk_abc123

USDC/cbBTC Market

  Supply APY:    12.50%
  Borrow APY:    15.00%
  Utilization:   95.0%
  LLTV:          86%
  Total Supply:  $2.5M
  Oracle:        Chainlink USDC/BTC
  IRM:           AdaptiveCurve
  Created:       2025-08-15
```

## Development

```bash
bun test && bun run check
```

## Links

- [Suwappu Docs](https://docs.suwappu.bot)

## License

MIT
