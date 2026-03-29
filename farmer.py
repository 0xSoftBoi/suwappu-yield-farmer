#!/usr/bin/env python3
"""Suwappu Yield Farmer — find best Morpho lending opportunities."""
import argparse, asyncio, json, os, sys
from suwappu import create_client

def require_env(n):
    v = os.environ.get(n)
    if not v: print(f"Error: {n} not set", file=sys.stderr); sys.exit(1)
    return v

async def cmd_markets(args):
    c = create_client(api_key=require_env("SUWAPPU_API_KEY"))
    markets = await c.lend.markets(chain_id=args.chain)
    key = {"apy": "supply_apy", "utilization": "utilization", "supply": "total_supply"}.get(args.sort, "supply_apy")
    s = sorted(markets, key=lambda m: getattr(m, key), reverse=True)[:args.top]
    if args.json: print(json.dumps([m.model_dump() for m in s], indent=2)); await c.close(); return
    print(f"Morpho Lending Markets (Chain {args.chain}) — sorted by {args.sort}\n")
    print("  Market                          Supply APY   Borrow APY   Utilization")
    print("  " + "─" * 70)
    for m in s:
        pair = f"{m.loan_token}/{m.collateral_token}".ljust(30)
        print(f"  {pair}   {m.supply_apy:.2f}%".ljust(48) + f"{m.borrow_apy:.2f}%".ljust(13) + f"{m.utilization:.1f}%")
    await c.close()

def main():
    p = argparse.ArgumentParser(description="Suwappu Yield Farmer")
    sub = p.add_subparsers(dest="command", required=True)
    m = sub.add_parser("markets"); m.add_argument("--chain", type=int, default=8453); m.add_argument("--top", type=int, default=10); m.add_argument("--sort", choices=["apy","utilization","supply"], default="apy"); m.add_argument("--json", action="store_true")
    d = sub.add_parser("detail"); d.add_argument("--id", required=True); d.add_argument("--json", action="store_true")
    args = p.parse_args()
    if args.command == "markets": asyncio.run(cmd_markets(args))

if __name__ == "__main__": main()
