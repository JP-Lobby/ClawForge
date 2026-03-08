#!/usr/bin/env bash
set -e

BRANCH="clawforge"
SKIP_BUILD=false
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --branch) BRANCH="$2"; shift ;;
    --skip-build) SKIP_BUILD=true ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
  shift
done

# The user who invoked sudo (or current user if not using sudo)
SERVICE_USER="${SUDO_USER:-$(whoami)}"

echo "==> ClawForge Deploy: branch=$BRANCH skip-build=$SKIP_BUILD user=$SERVICE_USER"

# Run a command as SERVICE_USER with their full login environment (.profile + .bashrc)
run_as_user() {
  sudo -u "$SERVICE_USER" bash -l -c "cd '$REPO_DIR' && $*"
}

echo "==> Fetching latest..."
run_as_user "git fetch origin && git reset --hard 'origin/$BRANCH'"

echo "==> Installing dependencies..."
run_as_user "pnpm install --no-frozen-lockfile"

echo "==> Rebuilding native addons..."
run_as_user "pnpm rebuild better-sqlite3"

if [ "$SKIP_BUILD" = false ]; then
  echo "==> Building TypeScript..."
  run_as_user "pnpm build"

  echo "==> Building dashboard..."
  run_as_user "cd dashboard && pnpm install --no-frozen-lockfile && pnpm build"
fi

echo "==> Installing systemd service..."
NODE_BIN="$(sudo -u "$SERVICE_USER" bash -l -c 'which node')"
tee /etc/systemd/system/clawforge.service > /dev/null << EOF
[Unit]
Description=ClawForge Multi-Agent Orchestration
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$REPO_DIR
ExecStart=$NODE_BIN --max-old-space-size=512 --expose-gc $REPO_DIR/dist/gateway/server.impl.js
Restart=on-failure
RestartSec=5
MemoryMax=600M
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable clawforge
systemctl restart clawforge

echo "==> Waiting for service to start..."
sleep 3

if systemctl is-active --quiet clawforge; then
  PI_IP=$(hostname -I | awk '{print $1}')
  echo "==> ✅ ClawForge is running!"
  echo "==> Dashboard: http://${PI_IP}:3001"
  echo "==> Logs: journalctl -u clawforge -f"
else
  echo "==> ❌ Service failed to start"
  echo "==> Check: journalctl -u clawforge -n 50"
  exit 1
fi
