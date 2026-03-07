#!/usr/bin/env bash
set -e

DRY_RUN=false
OPENCLAW_HOME="${HOME}/.openclaw"

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true ;;
    --openclaw-home) OPENCLAW_HOME="$2"; shift ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
  shift
done

echo "==> ClawForge Migration (dry-run=$DRY_RUN)"
echo "==> OpenClaw home: $OPENCLAW_HOME"

run() {
  if [ "$DRY_RUN" = true ]; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

# 1. Backup existing config
if [ -d "$OPENCLAW_HOME" ]; then
  BACKUP_DIR="${OPENCLAW_HOME}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "==> Backing up to $BACKUP_DIR..."
  run "cp -r '$OPENCLAW_HOME' '$BACKUP_DIR'"
fi

# 2. Create ClawForge directories
DIRS=(
  "$OPENCLAW_HOME/stateless-channels/channels"
  "$OPENCLAW_HOME/stateless-channels/memory"
  "$OPENCLAW_HOME/agents"
  "$OPENCLAW_HOME/data"
  "$OPENCLAW_HOME/research"
)
for dir in "${DIRS[@]}"; do
  run "mkdir -p '$dir'"
done

# 3. Check openclaw.json
CONFIG_FILE="$OPENCLAW_HOME/openclaw.json"
if [ -f "$CONFIG_FILE" ]; then
  echo "==> Found existing $CONFIG_FILE"
  for key in orchestration tasks dashboard; do
    if ! python3 -c "import json,sys; d=json.load(open('$CONFIG_FILE')); sys.exit(0 if '$key' in d else 1)" 2>/dev/null; then
      echo "==> ⚠️  Missing '$key' section in openclaw.json. Add:"
      case $key in
        orchestration) cat << 'EOF'
  "orchestration": {
    "enabled": true,
    "agentsDir": "~/.openclaw/agents",
    "providers": { "anthropic": { "apiKey": "sk-ant-..." } }
  }
EOF
        ;;
        tasks) cat << 'EOF'
  "tasks": {
    "enabled": true,
    "autonomous": { "enabled": true, "heartbeatIntervalMs": 60000, "maxConcurrentTasks": 1 }
  }
EOF
        ;;
        dashboard) cat << 'EOF'
  "dashboard": { "enabled": true, "port": 3001, "host": "0.0.0.0", "authToken": "changeme" }
EOF
        ;;
      esac
    fi
  done
else
  echo "==> No openclaw.json found. Creating example config..."
  run "cat > '$CONFIG_FILE' << 'JSONEOF'
{
  \"orchestration\": {
    \"enabled\": true,
    \"agentsDir\": \"~/.openclaw/agents\",
    \"providers\": {
      \"anthropic\": { \"apiKey\": \"sk-ant-YOUR_KEY_HERE\", \"defaultModel\": \"claude-sonnet-4-6\" }
    }
  },
  \"tasks\": {
    \"enabled\": true,
    \"autonomous\": { \"enabled\": true, \"heartbeatIntervalMs\": 60000, \"maxConcurrentTasks\": 1 }
  },
  \"dashboard\": { \"enabled\": true, \"port\": 3001, \"host\": \"0.0.0.0\", \"authToken\": \"changeme-to-something-secure\" }
}
JSONEOF"
  echo "==> Created $CONFIG_FILE — edit it to add your API keys"
fi

echo "==> ✅ Migration complete!"
if [ "$DRY_RUN" = false ]; then
  echo "==> Next steps:"
  echo "    1. Edit $CONFIG_FILE with your API keys"
  echo "    2. Run: ./scripts/deploy-pi.sh"
fi
