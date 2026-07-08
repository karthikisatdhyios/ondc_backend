#!/usr/bin/env bash
# Provision the Dhiyos ONDC BAP on a fresh Ubuntu EC2 instance.
# Run this from INSIDE the cloned repo directory, AFTER you've created:
#   - .env                      (config; see docs/deploy-aws-ec2.md)
#   - server/beckn-keys.json    (your network identity keys)  OR  BECKN_KEYS_JSON in .env
#
# Usage:  bash scripts/ec2-setup.sh
set -euo pipefail

DOMAIN="bap.dhiyos.com"
APP_DIR="$(pwd)"

echo "==> Dhiyos BAP setup in $APP_DIR (domain $DOMAIN)"

# --- Preconditions -----------------------------------------------------------
if [ ! -f "$APP_DIR/.env" ]; then
  echo "ERROR: .env not found in $APP_DIR. Create it first (see docs/deploy-aws-ec2.md)."
  exit 1
fi
if [ ! -f "$APP_DIR/server/beckn-keys.json" ] && ! grep -q '^BECKN_KEYS_JSON=' "$APP_DIR/.env"; then
  echo "ERROR: provide identity keys via server/beckn-keys.json OR BECKN_KEYS_JSON in .env."
  exit 1
fi

# --- Swap (native module build is memory-hungry on 1GB micro instances) ------
if [ ! -f /swapfile ]; then
  echo "==> Creating 1G swap"
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# --- Base packages -----------------------------------------------------------
echo "==> Installing base packages"
sudo apt-get update -y
sudo apt-get install -y git nginx build-essential python3 curl

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 20 LTS"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# --- App dependencies --------------------------------------------------------
echo "==> Installing dependencies"
npm install
echo "==> Seeding cards/offers"
npm run seed || echo "seed skipped/failed (non-fatal for ONDC)"

PORT="$(grep -E '^PORT=' .env | head -n1 | cut -d= -f2 || true)"
PORT="${PORT:-8787}"

# --- systemd service (always-on, restarts on crash/reboot) -------------------
echo "==> Creating systemd service (dhiyos)"
sudo tee /etc/systemd/system/dhiyos.service >/dev/null <<EOF
[Unit]
Description=Dhiyos ONDC BAP
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$(command -v node) server/index.js
Restart=always
RestartSec=3
User=$(whoami)

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable dhiyos
sudo systemctl restart dhiyos

# --- nginx reverse proxy (:80 -> node) ---------------------------------------
echo "==> Configuring nginx reverse proxy (:80 -> :$PORT)"
sudo tee /etc/nginx/sites-available/dhiyos >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/dhiyos /etc/nginx/sites-enabled/dhiyos
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "==> Base setup complete. Service status:"
sudo systemctl --no-pager --full status dhiyos | head -n 8 || true
echo ""
echo "NEXT — issue free SSL (only after the GoDaddy A record for $DOMAIN points to this"
echo "server's Elastic IP, and port 80/443 are open in the security group):"
echo "  sudo apt-get install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m YOUR_EMAIL --redirect"
echo ""
echo "Verify:  curl -s https://$DOMAIN/beckn/health"
