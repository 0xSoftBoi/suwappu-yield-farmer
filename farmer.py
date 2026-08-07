#!/usr/bin/env python3
"""Read-only Suwappu/Morpho lending market explorer."""
from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
import sys

from suwappu import create_client
from lending_monitor import compare_snapshots, create_snapshot


async def cmd_markets(args: argparse.Namespace) -> None:
    if args.chain <= 0:
        raise ValueError("--chain must be a positive integer")
    if args.top <= 0:
        raise ValueError("--top must be a positive integer")

    client = create_client()
    try:
        markets = await client.lend.markets(chain_id=args.chain)
        key = {
            "apy": "supply_apy",
            "utilization": "utilization",
            "supply": "total_supply",
        }[args.sort]
        sorted_markets = sorted(
            markets,
            key=lambda market: getattr(market, key),
            reverse=True,
        )[: args.top]

        if args.json:
            print(
                json.dumps(
                    [market.model_dump() for market in sorted_markets],
                    indent=2,
                )
            )
            return

        print(
            f"Morpho Lending Markets (Chain {args.chain}) "
            f"— sorted by {args.sort}\n"
        )
        print(
            "  Market                          Supply APY   "
            "Borrow APY   Utilization   Total supply"
        )
        print("  " + "─" * 90)
        for market in sorted_markets:
            pair = f"{market.loan_token}/{market.collateral_token}".ljust(30)
            print(
                f"  {pair}   {market.supply_apy:.2f}%".ljust(48)
                + f"{market.borrow_apy:.2f}%".ljust(13)
                + f"{market.utilization:.1f}%".ljust(14)
                + f"{market.total_supply:,.0f}"
            )
    finally:
        await client.close()


async def cmd_detail(args: argparse.Namespace) -> None:
    if args.chain <= 0:
        raise ValueError("--chain must be a positive integer")
    client = create_client()
    try:
        detail = await client.lend.market(args.id, chain_id=args.chain)
        if args.json:
            print(json.dumps(detail.model_dump(), indent=2))
            return

        print(f"\n{detail.loan_token}/{detail.collateral_token} Market\n")
        print("  Read-only market metadata — no funds are moved.")
        print(f"  Supply APY:    {detail.supply_apy:.2f}%")
        print(f"  Borrow APY:    {detail.borrow_apy:.2f}%")
        print(f"  Utilization:   {detail.utilization:.1f}%")
        print(f"  LLTV:          {detail.lltv * 100:.0f}%")
        print(f"  Total Supply:  {detail.total_supply:,.0f}")
        print(f"  Oracle:        {detail.oracle}")
        print(f"  IRM:           {detail.irm}")
        print(f"  Created:       {detail.created_at}")
    finally:
        await client.close()


def snapshot_market(market: object) -> dict[str, object]:
    return {
        "id": getattr(market, "id"),
        "chainId": getattr(market, "chain_id"),
        "loanToken": getattr(market, "loan_token"),
        "collateralToken": getattr(market, "collateral_token"),
        "supplyApy": getattr(market, "supply_apy"),
        "borrowApy": getattr(market, "borrow_apy"),
        "utilization": getattr(market, "utilization"),
    }


async def cmd_snapshot(args: argparse.Namespace) -> None:
    if args.chain <= 0:
        raise ValueError("--chain must be a positive integer")
    client = create_client()
    try:
        markets = await client.lend.markets(chain_id=args.chain)
        snapshot = create_snapshot(
            [snapshot_market(market) for market in markets],
            args.chain,
        )
        print(json.dumps(snapshot, indent=2))
    finally:
        await client.close()


async def cmd_changes(args: argparse.Namespace) -> None:
    before = json.loads(Path(args.before).read_text(encoding="utf-8"))
    after = json.loads(Path(args.after).read_text(encoding="utf-8"))
    result = compare_snapshots(
        before,
        after,
        min_apy_delta_pp=args.min_apy_delta,
        min_utilization_delta_pp=args.min_utilization_delta,
    )
    if args.json:
        print(json.dumps(result, indent=2))
        return

    print(
        f"Lending changes: {result['beforeCapturedAt']} "
        f"→ {result['afterCapturedAt']}\n"
    )
    if not result["changes"]:
        print("  No markets crossed the configured change thresholds.")
        return
    for change in result["changes"]:
        pair = f"{change['loanToken']}/{change['collateralToken']}"
        if change["status"] != "changed":
            print(f"  {pair} ({change['chainId']}) {change['status']}")
            continue
        apy_delta = float(change["supplyApyDeltaPp"])
        utilization_delta = float(change["utilizationDeltaPp"])
        print(
            f"  {pair} ({change['chainId']}) supply APY "
            f"{float(change['supplyApyBefore']):.2f}% → "
            f"{float(change['supplyApyAfter']):.2f}% "
            f"({apy_delta:+.2f} pp); utilization "
            f"{float(change['utilizationBefore']):.1f}% → "
            f"{float(change['utilizationAfter']):.1f}% "
            f"({utilization_delta:+.1f} pp)"
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Read-only Suwappu/Morpho lending market explorer"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    markets = sub.add_parser("markets", help="List lending markets")
    markets.add_argument("--chain", type=int, default=8453)
    markets.add_argument("--top", type=int, default=10)
    markets.add_argument(
        "--sort",
        choices=["apy", "utilization", "supply"],
        default="apy",
    )
    markets.add_argument("--json", action="store_true")

    detail = sub.add_parser("detail", help="Read one lending market")
    detail.add_argument("--id", required=True)
    detail.add_argument("--chain", type=int, default=8453)
    detail.add_argument("--json", action="store_true")

    snapshot = sub.add_parser(
        "snapshot", help="Emit a stable read-only lending monitoring snapshot"
    )
    snapshot.add_argument("--chain", type=int, default=8453)

    changes = sub.add_parser(
        "changes", help="Compare two snapshots for APY/utilization changes"
    )
    changes.add_argument("--before", required=True)
    changes.add_argument("--after", required=True)
    changes.add_argument("--min-apy-delta", type=float, default=0.5)
    changes.add_argument("--min-utilization-delta", type=float, default=5.0)
    changes.add_argument("--json", action="store_true")

    args = parser.parse_args()
    fn = {
        "markets": cmd_markets,
        "detail": cmd_detail,
        "snapshot": cmd_snapshot,
        "changes": cmd_changes,
    }[args.command]

    try:
        asyncio.run(fn(args))
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
