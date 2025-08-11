#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install Node.js if missing
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "Node.js already installed. Skipping installation."
fi

# Install dependencies (clean install)
cd "$APP_DIR"
npm ci --omit=dev

# Stop existing service if running
if systemctl is-active --quiet transcript.service; then
  sudo systemctl stop transcript.service
fi

# Create/update systemd service
SERVICE_FILE="/etc/systemd/system/transcript.service"
sudo tee "$SERVICE_FILE" > /dev/null <<SERVICE
[Unit]
Description=YouTube Transcript Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=PORT=3001
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable transcript.service
sudo systemctl restart transcript.service

echo "Service started. Listening on port 3001"

