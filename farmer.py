#!/usr/bin/env python3
"""Read-only Suwappu/Morpho lending market explorer."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

from suwappu import create_client


def require_api_key() -> str:
    value = os.environ.get("SUWAPPU_API_KEY")
    if not value:
        raise RuntimeError("SUWAPPU_API_KEY is not set")
    return value


async def cmd_markets(args: argparse.Namespace) -> None:
    if args.chain <= 0:
        raise ValueError("--chain must be a positive integer")
    if args.top <= 0:
        raise ValueError("--top must be a positive integer")

    client = create_client(api_key=require_api_key())
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
    client = create_client(api_key=require_api_key())
    try:
        detail = await client.lend.market(args.id)
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
    detail.add_argument("--json", action="store_true")

    args = parser.parse_args()
    fn = {"markets": cmd_markets, "detail": cmd_detail}[args.command]

    try:
        asyncio.run(fn(args))
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
