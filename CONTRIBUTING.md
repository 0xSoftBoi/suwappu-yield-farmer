# Contributing

Thanks for improving the Suwappu Lending Monitor. The product boundary is intentionally narrow: **market monitoring only**. Changes must not turn `markets`, `detail`, `snapshot`, or `changes` into deposit, borrow, withdraw, repay, signing, or execution commands.

## Development

Requires Bun 1.3.14+ and Python 3.12+ for the companion implementation.

```bash
npm ci
bun run verify
python -m py_compile farmer.py lending_monitor.py
python -m unittest discover -s tests -p 'test_*.py'
```

Tests must mock/fake remote behavior where possible and never move funds.

## Pull-request bar

A change is ready when it:

- preserves the read-only lending authority boundary;
- keeps chain + market identity coupled and metric units explicit;
- fails closed on malformed snapshots, thresholds, and market data;
- bounds direct network calls and never logs raw upstream error bodies;
- preserves deterministic cross-language snapshot semantics when shared fields change;
- updates `README.md`, `BUILDING_A_PRODUCT.md`, and `docs/OPERATIONS.md` when product/operations semantics change;
- passes TypeScript typecheck/tests/build/audit, Python tests, container build, and CodeQL.

## Security

Do not put vulnerability details in a public issue. Follow [SECURITY.md](SECURITY.md).
