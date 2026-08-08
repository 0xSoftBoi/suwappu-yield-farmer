# Operations Runbook

This runbook covers Suwappu Lending Monitor 2.x as a standalone **read-only** service. It does not deposit, borrow, withdraw, repay, sign, or broadcast.

## Production contract

`markets`, `detail`, and `snapshot` perform bounded read work; `changes` compares two local versioned snapshots. The supplied container performs one `markets --json` read and exits. Your scheduler owns cadence, persistence, alert state, and notification delivery.

Keep chain ID attached to every market ID. Treat snapshots/watchlists as customer-sensitive data even though public lending endpoints do not require an API key.

## Snapshot and alert semantics

- Persist complete snapshot files atomically in your service layer.
- Reject schema-version or chain mismatches rather than coercing them.
- APY/utilization deltas are percentage points, not percentages of the previous value.
- `added`/`removed` means absent from one observed result set; it is not proof of protocol listing/delisting when upstream coverage was degraded.
- `changes --fail-on-change` emits the normal evidence then exits `2` for a qualifying change. Exit `1` means the command itself failed.

A paid alert service should persist hysteresis/dedupe state by customer + chain + market + signal and treat notification timeout as delivery-outcome unknown.

## Network and cost control

Direct detail reads use `SUWAPPU_OPERATION_TIMEOUT_MS` (25s default, maximum 30s) and status-only HTTP errors. If `SUWAPPU_API_URL` is overridden, point it only at a trusted environment.

Do not poll each customer independently when watchlists overlap. Share market snapshots by chain/cadence, then evaluate customer policy locally. Track actual Suwappu/API, storage, notification, compute, and support cost separately from customer portfolio yield.

## Container operation

```bash
docker build -t suwappu-yield-farmer .
docker run --rm suwappu-yield-farmer
```

The image runs as the unprivileged `bun` user and does not start an endless poll loop. Production schedulers should write snapshots to their own durable store and retain source timestamps.

## SLOs and alerts

Track successful polls / scheduled polls, markets observed by chain, snapshot age, malformed/upstream-error rate, qualifying changes, notification success/dedupe, poll duration, and cost per retained customer. Do not use APY level as service availability or promise a yield outcome.

## Incident order

1. Stop the scheduler and preserve the last known-good and suspect snapshots.
2. Determine whether coverage/data semantics or local comparison failed.
3. Suppress false `removed`/re-entry alerts while coverage is uncertain.
4. Rotate credentials if an authenticated Suwappu key may be exposed.
5. Run one bounded manual snapshot and compare it with the preserved good state before restoring cadence.

## Release gate

Every release must pass TypeScript typecheck/tests/build, Python parity tests, high/critical dependency audit, non-root container build, and CodeQL. Review metric units, chain/market identity, snapshot schema compatibility, read-only authority, and operator documentation together.
