#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
USER_NAME="$(whoami)"
WHISPER_PATH="$HOME/.local/bin/whisper"

# Install Node.js if missing
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Installing ffmpeg..."
  sudo apt-get update
  sudo apt-get install -y ffmpeg
fi

if ! command -v pipx >/dev/null 2>&1; then
  echo "Installing pipx..."
  sudo apt-get install -y pipx
  pipx ensurepath
fi

if ! command -v whisper >/dev/null 2>&1; then
  echo "Installing Whisper..."
  pipx install openai-whisper
fi

cd "$APP_DIR"
# Install or update dependencies
npm install --production

# Create or update systemd service
SERVICE_FILE="/etc/systemd/system/transcript.service"
sudo tee "$SERVICE_FILE" > /dev/null <<SERVICE
[Unit]
Description=YouTube Transcript Service
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$APP_DIR
Environment=WHISPER_BIN=$WHISPER_PATH
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE
sudo systemctl daemon-reload
sudo systemctl enable transcript.service
sudo systemctl restart transcript.service

echo "Service started. Listening on port 3001"

