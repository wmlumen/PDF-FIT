#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")"
echo "=== TESTS (npm test) ==="
npm test 2>&1 | tail -40
echo
echo "=== GATE ==="
bash scripts/promotion_gate.sh 2>&1 | tail -40
