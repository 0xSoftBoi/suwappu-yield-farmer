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

## Links

- [Suwappu Docs](https://docs.suwappu.bot)

## License

MIT
