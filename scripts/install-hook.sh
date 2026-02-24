#!/usr/bin/env bash
set -e
ROOT="$(git rev-parse --show-toplevel)"
HOOK="$ROOT/.git/hooks/pre-push"
printf '#!/usr/bin/env bash\nexec "%s/scripts/pre-push.sh"\n' "$ROOT" > "$HOOK"
chmod +x "$HOOK"
chmod +x "$ROOT/scripts/pre-push.sh"
echo "✅ pre-push hook installed"

PRECOMMIT="$ROOT/.git/hooks/pre-commit"
printf '#!/usr/bin/env bash\nexec "%s/scripts/pre-commit.sh"\n' "$ROOT" > "$PRECOMMIT"
chmod +x "$PRECOMMIT"
chmod +x "$ROOT/scripts/pre-commit.sh"
echo "✅ pre-commit hook installed"
