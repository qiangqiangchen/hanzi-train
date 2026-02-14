#!/bin/bash
set -e

echo "🚂 Deploying Hanzi Train..."
echo "================================"

PROJECT_DIR="/var/www/hanzi-train"
BACKEND_DIR="$PROJECT_DIR/server"

# 1. 拉取最新代码
echo "📥 Pulling latest code..."
cd $PROJECT_DIR
git pull origin main

# 2. 前端构建
echo "📦 Building frontend..."
npm install
npm run build

# 3. 后端依赖
echo "🐍 Installing backend dependencies..."
cd $BACKEND_DIR
source venv/bin/activate
pip install -r requirements.txt

# 4. 复制数据文件
echo "📋 Copying data files..."
mkdir -p $BACKEND_DIR/data
cp $PROJECT_DIR/src/data/chars_index.json $BACKEND_DIR/data/
cp $PROJECT_DIR/src/data/levels.json $BACKEND_DIR/data/

# 5. 重启后端
echo "🔄 Restarting backend..."
sudo systemctl restart hanzi-api

# 6. 重载 Nginx
echo "🔄 Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "================================"
echo "✅ Deployment complete!"
echo "🌐 Frontend: https://your-domain.com"
echo "🔧 API: https://your-domain.com/api/health"