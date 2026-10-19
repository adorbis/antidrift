#!/bin/sh
set -e
echo "Installing Anti-Drift Shield into this project..."

# 1. Build the tool if not already built
if [ ! -d "dist" ]; then
  echo "Building..."
  npm install
  npm run build
fi

# 2. Link globally so 'shield' command works
npm link

# 3. Install the pre-commit hook
HOOK=".git/hooks/pre-commit"
if [ ! -d ".git" ]; then
  echo "ERROR: Not a git repository. Run this from your project root."
  exit 1
fi

if [ -f "$HOOK" ]; then
  echo "Existing pre-commit hook found — backing up to pre-commit.bak"
  mv "$HOOK" "$HOOK.bak"
fi

cat > "$HOOK" << 'HOOKEOF'
#!/bin/sh
# Anti-Drift Shield — blocks commits with drift
shield verify
HOOKEOF

chmod +x "$HOOK"

# 4. Inject rules into all AI clients
shield inject-rules

echo ""
echo "[SHIELD INSTALLED]"
echo "  ✓ CLI: shield (global)"
echo "  ✓ Pre-commit hook active — 'git commit' will now verify"
echo "  ✓ Rules injected into .claude, .cursorrules, .clinerules, .windsurfrules, .antigravity"
echo ""
echo "Next: run 'shield goal \"<your objective>\"' to start tracking"
