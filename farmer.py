#!/usr/bin/env python3
"""Suwappu Yield Farmer — find best Morpho lending opportunities."""
import asyncio, os
from suwappu import create_client

async def main():
    c = create_client(api_key=os.environ.get("SUWAPPU_API_KEY", ""))
    print("Morpho lending markets on Base:\n")
    markets = await c.lend.markets(chain_id=8453)
    s = sorted(markets, key=lambda m: m.supply_apy, reverse=True)
    print("  Market                          Supply APY   Borrow APY   Utilization")
    print("  " + "─" * 73)
    for m in s[:10]:
        pair = f"{m.loan_token}/{m.collateral_token}".ljust(30)
        print(f"  {pair}   {m.supply_apy:.2f}%".ljust(50) + f"  {m.borrow_apy:.2f}%".ljust(13) + f"  {m.utilization:.1f}%")
    if s:
        b = s[0]
        print(f"\nBest: {b.loan_token}/{b.collateral_token} — {b.supply_apy:.2f}% APY | ${b.total_supply/1e6:.1f}M supply")
        d = await c.lend.market(b.id)
        print(f"  Oracle: {d.oracle} | IRM: {d.irm}")
    await c.close()

asyncio.run(main())
