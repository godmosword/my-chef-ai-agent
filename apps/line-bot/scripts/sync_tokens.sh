#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
pnpm tokens:build
cp packages/design-tokens/dist/tokens.py apps/line-bot/app/_generated_tokens.py
echo "Synced tokens.py -> apps/line-bot/app/_generated_tokens.py"
