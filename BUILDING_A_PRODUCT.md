# Build a Lending Monitor People Can Pay For

This repository is most useful as a **monitoring primitive**, not as a yield strategy. It gives you a small Suwappu-facing read contract, a versioned snapshot format, and deterministic change detection that can sit behind alerts, dashboards, or an API.

It does **not** prove that a high-APY market is safe or profitable, and it does not deposit, borrow, withdraw, repay, sign, or broadcast transactions.

## The product loop

1. Poll `lend_markets` / `client.lend.markets(chainId)` once per chain.
2. Persist the versioned snapshot.
3. Compare the new snapshot with the previous one.
4. Evaluate each customer's thresholds locally.
5. Deduplicate alerts and notify only on meaningful state changes.
6. If a customer wants to transact, hand off to a separately authorized execution surface.

The CLI makes steps 1–3 reproducible:

```bash
bun src/cli.ts snapshot --chain 8453 > before.json
# poll again later
bun src/cli.ts snapshot --chain 8453 > after.json

bun src/cli.ts changes \
  --before before.json \
  --after after.json \
  --min-apy-delta 0.5 \
  --min-utilization-delta 5 \
  --json
```

The Python CLI emits and consumes the same snapshot/change JSON shape.

## What the signals mean

- `supplyApyDeltaPp` is the change in reported supply APY in **percentage points**.
- `utilizationDeltaPp` is the change in reported utilization in **percentage points**.
- `added` / `removed` means a market appeared in or disappeared from the two compared Suwappu result sets.
- A threshold crossing is an observation to investigate, not a buy/supply recommendation or a risk score.

The monitor intentionally avoids deriving a dollar value from `totalSupply` in its portable snapshot schema. The published `@suwappu/sdk@0.4.0` type names the field but does not encode its currency unit in the type contract.

## Alert state beats noisy polling

Store alert state by a key such as:

```text
customer_id + chain_id + market_id + signal_type
```

For each key, persist the last observed value, whether the alert is armed, the last notification time, and the snapshot timestamp. A practical state machine is:

- arm when the metric is below the customer's trigger;
- fire once when it crosses the trigger;
- stay silent while it remains beyond the trigger;
- re-arm only after it returns through a lower reset threshold.

That hysteresis prevents a value hovering near a threshold from paging the customer every polling interval. Add a dedupe key and a cooldown for delivery retries.

## Request economics

Share the upstream market poll across customers. At a five-minute interval, one chain needs:

```text
12 polls/hour × 24 hours = 288 market reads/day
288 × 30 days = 8,640 market reads/30 days
```

One hundred customers watching the same chain still need 288 upstream reads/day when you poll once and evaluate 100 customer policies locally. Polling separately per customer would multiply the upstream work by 100 without creating better market data.

The hosted MCP pricing table currently counts `lend_markets` as one credit per tool call. Treat that as a request-unit input, not a permanent dollar price; verify current Suwappu pricing before promising margins.

Track builder economics separately from a customer's trading or lending outcome:

```text
monthly contribution margin
= subscription revenue + metered API revenue
- Suwappu/API request cost
- storage and queue cost
- notification delivery cost
- hosting/support cost
```

Never use customer APY or portfolio P&L as your SaaS revenue number.

## A product ladder

| Product | Customer value | Sensible boundary |
|---|---|---|
| Explorer | Current markets and detail | Read-only |
| Alerts | APY/utilization changes with dedupe | Read-only + notifications |
| Workspace | Saved watchlists, history, team routing | Read-only + stored state |
| API/webhooks | Normalized change events for other apps | Read-only + metered delivery |
| Execution handoff | User chooses to act elsewhere | Separate auth/signing boundary |

Start by charging for saved monitoring state, delivery, team workflow, and reliability—the parts this example can actually help you build. Do not market an APY ranking as guaranteed yield.

## Where this fits next to Morpho's open source stack

Morpho's own tools are intentionally broader:

- The [Morpho API](https://docs.morpho.org/developers/api/get-started/) exposes current and historical market/vault data, rewards, positions, public-allocator liquidity, and richer analytics. It is the better direct dependency when you need the complete Morpho data model.
- [`@morpho-org/morpho-sdk`](https://github.com/morpho-org/sdks) is Morpho's recommended TypeScript integration surface and supports reads plus ready-to-send transactions. It is the better choice for direct onchain integration and execution.
- Morpho publishes application recipes such as [Privy x Morpho](https://github.com/morpho-org/privy-morpho-recipe) and the [Earn basic app](https://github.com/morpho-org/earn-basic-app) for fuller wallet/application flows.

This repository should win on a different axis: a tiny agent-facing Suwappu contract, hosted MCP compatibility, cross-language examples, and a reusable monitoring/event layer that can compose with the rest of Suwappu.

## Current limitations

- Suwappu exposes market list/detail reads here, not Morpho lending execution.
- This example does not expose Morpho's full warnings, rewards, historical series, user positions, or transaction-building surface.
- The snapshot history belongs to your application; Suwappu does not persist these local snapshot files for you.
- Market APYs are variable. A rate change can reflect utilization and market conditions; it is not evidence of a safe return.
- Morpho's public API is itself an upstream dependency with documented rate limits and no SLA. Production products need caching, backoff, observability, and an outage policy.

## Ship checklist

- Persist snapshot timestamps and schema versions.
- Poll once per chain, then fan out evaluation locally.
- Store customer thresholds separately from market data.
- Implement hysteresis, dedupe, cooldowns, and delivery retry state.
- Measure time-to-first-snapshot, time-to-first-alert, retained watchlists, and alert delivery success.
- Show the market ID and chain on every alert so a user can independently verify the observation.
- Keep execution behind a separate capability and authorization decision.
