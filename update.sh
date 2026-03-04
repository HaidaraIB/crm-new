npm install
npm audit fix --no-fund --no-audit 2>/dev/null || true
npm run build
sudo systemctl reload nginx