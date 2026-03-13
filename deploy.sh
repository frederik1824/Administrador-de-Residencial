#!/bin/bash
# ============================================================
# ResiNova Web — Deploy Script for VPS
# Run this on YOUR VPS (not locally)
# Usage: bash deploy.sh
# ============================================================

set -e  # Exit immediately on any error

# --- CONFIGURATION — Edit these values ---
APP_DIR="/var/www/resinova-web"
REPO_URL="https://github.com/TU_USUARIO/TU_REPO.git"   # ← Change this
BRANCH="main"
NGINX_CONF_SRC="$APP_DIR/nginx.conf"
NGINX_CONF_DST="/etc/nginx/sites-available/resinova"
# -----------------------------------------

echo "🚀 Starting ResiNova deployment..."

# 1. Install Node.js if not present (Ubuntu/Debian)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Create app directory (first deploy only)
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Creating app directory..."
    sudo mkdir -p "$APP_DIR"
    sudo chown "$USER":"$USER" "$APP_DIR"
fi

# 3. Clone or pull latest code
if [ ! -d "$APP_DIR/.git" ]; then
    echo "📥 Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR" --branch "$BRANCH"
else
    echo "🔄 Pulling latest changes..."
    cd "$APP_DIR"
    git pull origin "$BRANCH"
fi

cd "$APP_DIR"

# 4. Create .env.local from server secrets
# IMPORTANT: The .env.local file must already exist on the server.
# Create it manually on the VPS if this is the first deployment:
# nano /var/www/resinova-web/.env.local
if [ ! -f "$APP_DIR/.env.local" ]; then
    echo ""
    echo "⚠️  WARNING: .env.local not found!"
    echo "   Create it with your Firebase credentials:"
    echo "   nano $APP_DIR/.env.local"
    echo ""
    echo "   Required variables:"
    cat "$APP_DIR/.env.example"
    echo ""
    exit 1
fi

# 5. Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# 6. Build for production
echo "🔨 Building for production..."
npm run build

# 7. Setup Nginx (first deploy only)
if [ ! -f "$NGINX_CONF_DST" ]; then
    echo "⚙️  Configuring Nginx..."
    sudo cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"
    sudo ln -sf "$NGINX_CONF_DST" "/etc/nginx/sites-enabled/resinova"
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx configured"
else
    echo "🔄 Reloading Nginx..."
    sudo nginx -t && sudo systemctl reload nginx
fi

echo ""
echo "✅ Deployment complete!"
echo "   App is running at: http://$(hostname -I | awk '{print $1}')"
