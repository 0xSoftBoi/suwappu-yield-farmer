"""Pure snapshot and change helpers for the read-only lending monitor."""

from __future__ import annotations

from datetime import datetime, timezone
import math
from typing import Any, Iterable

SNAPSHOT_SCHEMA_VERSION = 1


def non_negative_number(value: float, flag: str) -> float:
    if not math.isfinite(value) or value < 0:
        raise ValueError(f"{flag} must be a non-negative number")
    return value


def _finite(value: Any, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label} must be finite")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{label} must be finite")
    return number


def _positive_integer(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{label} must be a positive integer")
    return value


def _normalize_market(value: Any, index: int) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"markets[{index}] must be an object")
    market_id = value.get("id")
    if not isinstance(market_id, str) or not market_id:
        raise ValueError(f"markets[{index}].id is required")
    chain_id = _positive_integer(value.get("chainId"), f"markets[{index}].chainId")
    loan_token = value.get("loanToken")
    collateral_token = value.get("collateralToken")
    if not isinstance(loan_token, str) or not isinstance(collateral_token, str):
        raise ValueError(f"markets[{index}] token symbols are required")
    return {
        "id": market_id,
        "chainId": chain_id,
        "loanToken": loan_token,
        "collateralToken": collateral_token,
        "supplyApy": _finite(value.get("supplyApy"), f"markets[{index}].supplyApy"),
        "borrowApy": _finite(value.get("borrowApy"), f"markets[{index}].borrowApy"),
        "utilization": _finite(
            value.get("utilization"), f"markets[{index}].utilization"
        ),
    }


def create_snapshot(
    markets: Iterable[dict[str, Any]],
    chain_id: int,
    captured_at: str | None = None,
) -> dict[str, Any]:
    chain_id = _positive_integer(chain_id, "snapshot chainId")
    if captured_at is None:
        captured_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    normalized = [_normalize_market(market, index) for index, market in enumerate(markets)]
    if any(market["chainId"] != chain_id for market in normalized):
        raise ValueError("market chainId must match snapshot chainId")
    return {
        "schemaVersion": SNAPSHOT_SCHEMA_VERSION,
        "capturedAt": captured_at,
        "chainId": chain_id,
        "markets": normalized,
    }


def parse_snapshot(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("snapshot must be an object")
    if value.get("schemaVersion") != SNAPSHOT_SCHEMA_VERSION:
        raise ValueError(f"snapshot schemaVersion must be {SNAPSHOT_SCHEMA_VERSION}")
    captured_at = value.get("capturedAt")
    if not isinstance(captured_at, str) or not captured_at:
        raise ValueError("snapshot capturedAt is required")
    chain_id = _positive_integer(value.get("chainId"), "snapshot chainId")
    markets = value.get("markets")
    if not isinstance(markets, list):
        raise ValueError("snapshot markets must be an array")
    normalized = [_normalize_market(market, index) for index, market in enumerate(markets)]
    if any(market["chainId"] != chain_id for market in normalized):
        raise ValueError("market chainId must match snapshot chainId")
    return {
        "schemaVersion": SNAPSHOT_SCHEMA_VERSION,
        "capturedAt": captured_at,
        "chainId": chain_id,
        "markets": normalized,
    }


def _market_key(market: dict[str, Any]) -> str:
    return f"{market['chainId']}:{market['id']}"


def compare_snapshots(
    before: dict[str, Any],
    after: dict[str, Any],
    *,
    min_apy_delta_pp: float,
    min_utilization_delta_pp: float,
) -> dict[str, Any]:
    min_apy_delta_pp = non_negative_number(min_apy_delta_pp, "--min-apy-delta")
    min_utilization_delta_pp = non_negative_number(
        min_utilization_delta_pp, "--min-utilization-delta"
    )
    before = parse_snapshot(before)
    after = parse_snapshot(after)
    before_by_key = {_market_key(market): market for market in before["markets"]}
    after_by_key = {_market_key(market): market for market in after["markets"]}
    changes: list[dict[str, Any]] = []

    for key in sorted(before_by_key.keys() | after_by_key.keys()):
        previous = before_by_key.get(key)
        current = after_by_key.get(key)
        market = current or previous
        if market is None:
            continue

        common = {
            "marketKey": key,
            "id": market["id"],
            "chainId": market["chainId"],
            "loanToken": market["loanToken"],
            "collateralToken": market["collateralToken"],
        }
        if previous is None or current is None:
            changes.append(
                {
                    **common,
                    "status": "removed" if previous else "added",
                    "supplyApyBefore": previous["supplyApy"] if previous else None,
                    "supplyApyAfter": current["supplyApy"] if current else None,
                    "supplyApyDeltaPp": None,
                    "utilizationBefore": previous["utilization"] if previous else None,
                    "utilizationAfter": current["utilization"] if current else None,
                    "utilizationDeltaPp": None,
                }
            )
            continue

        apy_delta = current["supplyApy"] - previous["supplyApy"]
        utilization_delta = current["utilization"] - previous["utilization"]
        if (
            abs(apy_delta) < min_apy_delta_pp
            and abs(utilization_delta) < min_utilization_delta_pp
        ):
            continue
        changes.append(
            {
                **common,
                "status": "changed",
                "supplyApyBefore": previous["supplyApy"],
                "supplyApyAfter": current["supplyApy"],
                "supplyApyDeltaPp": apy_delta,
                "utilizationBefore": previous["utilization"],
                "utilizationAfter": current["utilization"],
                "utilizationDeltaPp": utilization_delta,
            }
        )

    return {
        "schemaVersion": SNAPSHOT_SCHEMA_VERSION,
        "beforeCapturedAt": before["capturedAt"],
        "afterCapturedAt": after["capturedAt"],
        "changes": changes,
    }
