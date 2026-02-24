#!/usr/bin/env bash
set -e

cd "$(git rev-parse --show-toplevel)"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "❌ Direct push to $BRANCH is blocked — use a feature branch + PR"
  exit 1
fi

echo "🔍 Pre-push checks..."

echo "  typecheck..."
pnpm exec tsc --noEmit

echo "  build..."
pnpm build

echo "✅ All checks passed"
