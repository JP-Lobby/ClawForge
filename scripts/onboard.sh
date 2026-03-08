#!/usr/bin/env bash
# ClawForge onboarding script
# Run once after cloning on your Pi (or local machine)
# Usage: bash scripts/onboard.sh

set -e

OPENCLAW_DIR="$HOME/.openclaw"
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       ClawForge Setup Wizard          ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""

# ─── Step 0: Check requirements ───────────────────────────────────────────────

if ! command -v node &>/dev/null; then
  echo "❌  Node.js not found. Please install Node.js 20+ and re-run."
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "⚠️  jq not found — will use Node.js for JSON manipulation."
  USE_JQ=0
else
  USE_JQ=1
fi

# ─── Step 1: Check openclaw.json ──────────────────────────────────────────────

echo -e "${CYAN}Step 1: Checking ~/.openclaw/openclaw.json…${RESET}"
if [ -f "$CONFIG_FILE" ]; then
  echo -e "  ${GREEN}Found ✓${RESET}"
else
  echo "  Not found — creating minimal config…"
  mkdir -p "$OPENCLAW_DIR"
  echo '{}' > "$CONFIG_FILE"
  echo -e "  ${GREEN}Created ✓${RESET}"
fi
echo ""

# ─── Step 2: Auth token ───────────────────────────────────────────────────────

echo -e "${CYAN}Step 2: Dashboard auth token${RESET}"

# Read existing token if any
if [ $USE_JQ -eq 1 ]; then
  EXISTING_TOKEN=$(jq -r '.dashboard.authToken // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
else
  EXISTING_TOKEN=$(node -e "try{const c=require('fs').readFileSync('$CONFIG_FILE','utf8');const j=JSON.parse(c);console.log(j.dashboard?.authToken||'')}catch{console.log('')}" 2>/dev/null || echo "")
fi

if [ -n "$EXISTING_TOKEN" ]; then
  echo -e "  Current token: ${YELLOW}${EXISTING_TOKEN:0:8}…${RESET} (already set)"
  read -r -p "  Press Enter to keep it, or type a new token: " NEW_TOKEN
  if [ -z "$NEW_TOKEN" ]; then
    AUTH_TOKEN="$EXISTING_TOKEN"
    echo "  Keeping existing token."
  else
    AUTH_TOKEN="$NEW_TOKEN"
  fi
else
  echo "  No token currently set."
  read -r -p "  Enter a token (or press Enter to auto-generate): " NEW_TOKEN
  if [ -z "$NEW_TOKEN" ]; then
    AUTH_TOKEN=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
    echo -e "  ${GREEN}Generated: ${YELLOW}$AUTH_TOKEN${RESET}"
  else
    AUTH_TOKEN="$NEW_TOKEN"
  fi
fi
echo ""

# ─── Step 3: Create directories ───────────────────────────────────────────────

echo -e "${CYAN}Step 3: Creating required directories…${RESET}"

DIRS=(
  "$OPENCLAW_DIR/agents"
  "$OPENCLAW_DIR/stateless-channels/channels"
  "$OPENCLAW_DIR/stateless-channels/memory"
  "$OPENCLAW_DIR/data"
)

for DIR in "${DIRS[@]}"; do
  if [ -d "$DIR" ]; then
    echo -e "  $DIR … ${GREEN}exists ✓${RESET}"
  else
    mkdir -p "$DIR"
    echo -e "  $DIR … ${GREEN}created ✓${RESET}"
  fi
done
echo ""

# ─── Step 4: Update openclaw.json ─────────────────────────────────────────────

echo -e "${CYAN}Step 4: Updating openclaw.json with ClawForge sections…${RESET}"

node - << NODESCRIPT
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME, '.openclaw', 'openclaw.json');
let config = {};
try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch {}

// Merge ClawForge sections (preserve existing values)
config.dashboard = {
  enabled: true,
  port: 3001,
  host: '0.0.0.0',
  authToken: '$AUTH_TOKEN',
  cors: true,
  ...(config.dashboard || {}),
  authToken: '$AUTH_TOKEN', // always update token
};

config.orchestration = config.orchestration || {
  enabled: true,
  agentsDir: '~/.openclaw/agents',
  providers: {},
};

config.tasks = config.tasks || {
  enabled: true,
  dbPath: '~/.openclaw/data/tasks.db',
  autonomous: {
    enabled: false,
    heartbeatIntervalMs: 60000,
    maxConcurrentTasks: 3,
    maxRequestDepth: 5,
  },
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('  openclaw.json updated ✓');
NODESCRIPT

echo ""

# ─── Step 5: Get Tailscale IP ─────────────────────────────────────────────────

TAILSCALE_IP=""
if command -v tailscale &>/dev/null; then
  TAILSCALE_IP=$(tailscale ip -4 2>/dev/null | head -1 || echo "")
fi

# ─── Done ────────────────────────────────────────────────────────────────────

echo -e "${GREEN}${BOLD}╔══════════════════════════════════════╗"
echo -e "║           Setup Complete!             ║"
echo -e "╚══════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Auth token:${RESET} ${YELLOW}$AUTH_TOKEN${RESET}"
echo ""
if [ -n "$TAILSCALE_IP" ]; then
  echo -e "  ${BOLD}Dashboard URL (Tailscale):${RESET}"
  echo -e "  ${CYAN}http://$TAILSCALE_IP:3001${RESET}"
else
  echo -e "  ${BOLD}Dashboard URL:${RESET}"
  echo -e "  ${CYAN}http://YOUR_TAILSCALE_IP:3001${RESET}"
  echo -e "  (run 'tailscale ip -4' to get your Tailscale IP)"
fi
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo -e "  1. Add your API keys to ~/.openclaw/openclaw.json"
echo -e "     (anthropic, openai, discord token, etc.)"
echo -e "  2. Build the dashboard:  cd dashboard && pnpm install && pnpm build"
echo -e "  3. Start ClawForge:      pnpm start"
echo -e "  4. Open the dashboard in your browser"
echo ""
