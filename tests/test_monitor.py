import unittest

from lending_monitor import compare_snapshots, create_snapshot, parse_snapshot


BASE_MARKETS = [
    {
        "id": "0xusdc-weth",
        "chainId": 8453,
        "loanToken": "USDC",
        "collateralToken": "WETH",
        "supplyApy": 4.2,
        "borrowApy": 6.1,
        "utilization": 72.0,
    },
    {
        "id": "0xusdc-cbbtc",
        "chainId": 8453,
        "loanToken": "USDC",
        "collateralToken": "cbBTC",
        "supplyApy": 3.4,
        "borrowApy": 5.2,
        "utilization": 64.0,
    },
]


class LendingMonitorTests(unittest.TestCase):
    def test_snapshot_is_versioned_and_camel_case(self):
        snapshot = create_snapshot(
            BASE_MARKETS, 8453, captured_at="2026-08-07T10:00:00.000Z"
        )
        self.assertEqual(snapshot["schemaVersion"], 1)
        self.assertEqual(snapshot["markets"][0]["loanToken"], "USDC")
        self.assertEqual(parse_snapshot(snapshot), snapshot)

    def test_thresholded_changes(self):
        before = create_snapshot(
            BASE_MARKETS, 8453, captured_at="2026-08-07T10:00:00.000Z"
        )
        after = create_snapshot(
            [
                {**BASE_MARKETS[0], "supplyApy": 5.1, "utilization": 73.0},
                {**BASE_MARKETS[1], "supplyApy": 3.45, "utilization": 66.0},
            ],
            8453,
            captured_at="2026-08-07T10:05:00.000Z",
        )
        result = compare_snapshots(
            before,
            after,
            min_apy_delta_pp=0.5,
            min_utilization_delta_pp=5.0,
        )
        self.assertEqual(len(result["changes"]), 1)
        self.assertEqual(result["changes"][0]["marketKey"], "8453:0xusdc-weth")
        self.assertAlmostEqual(result["changes"][0]["supplyApyDeltaPp"], 0.9)

    def test_additions_and_removals_always_surface(self):
        before = create_snapshot(
            [BASE_MARKETS[0]], 8453, captured_at="2026-08-07T10:00:00.000Z"
        )
        after = create_snapshot(
            [BASE_MARKETS[1]], 8453, captured_at="2026-08-07T10:05:00.000Z"
        )
        result = compare_snapshots(
            before,
            after,
            min_apy_delta_pp=99.0,
            min_utilization_delta_pp=99.0,
        )
        self.assertEqual(
            sorted(change["status"] for change in result["changes"]),
            ["added", "removed"],
        )

    def test_invalid_snapshot_rejected(self):
        with self.assertRaisesRegex(ValueError, "schemaVersion"):
            parse_snapshot({"schemaVersion": 99, "markets": []})
        with self.assertRaisesRegex(ValueError, "chainId"):
            create_snapshot([{**BASE_MARKETS[0], "chainId": 1}], 8453)


if __name__ == "__main__":
    unittest.main()
