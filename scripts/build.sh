#!/bin/bash
echo "🚂 Building Hanzi Train..."

# 前端构建
echo "📦 Building frontend..."
npm run build

# 检查构建结果
if [ -d "dist" ]; then
    echo "✅ Frontend build complete!"
    echo "📊 Build size:"
    du -sh dist/
    echo ""
    echo "📁 Files:"
    find dist -name "*.js" -o -name "*.css" | head -20
else
    echo "❌ Frontend build failed!"
    exit 1
fi

echo ""
echo "🎉 Build complete! Deploy dist/ to your web server."
echo "   Example: nginx, Vercel, Netlify, etc."