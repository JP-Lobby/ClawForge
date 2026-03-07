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

echo "==> ClawForge Deploy: branch=$BRANCH skip-build=$SKIP_BUILD"
cd "$REPO_DIR"

echo "==> Fetching latest..."
git fetch origin
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies..."
pnpm install --no-frozen-lockfile

if [ "$SKIP_BUILD" = false ]; then
  echo "==> Building TypeScript..."
  pnpm build

  echo "==> Building dashboard..."
  cd dashboard
  pnpm install --no-frozen-lockfile
  pnpm build
  cd "$REPO_DIR"
fi

echo "==> Installing systemd service..."
NODE_BIN="$(which node)"
sudo tee /etc/systemd/system/clawforge.service > /dev/null << EOF
[Unit]
Description=ClawForge Multi-Agent Orchestration
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$REPO_DIR
ExecStart=$NODE_BIN --max-old-space-size=512 --expose-gc $REPO_DIR/dist/gateway/server.impl.js
Restart=on-failure
RestartSec=5
MemoryMax=600M
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable clawforge
sudo systemctl restart clawforge

echo "==> Waiting for service to start..."
sleep 3

if sudo systemctl is-active --quiet clawforge; then
  PI_IP=$(hostname -I | awk '{print $1}')
  echo "==> ✅ ClawForge is running!"
  echo "==> Dashboard: http://${PI_IP}:3001"
  echo "==> Logs: journalctl -u clawforge -f"
else
  echo "==> ❌ Service failed to start"
  echo "==> Check: journalctl -u clawforge -n 50"
  exit 1
fi
