# Do not run `npm audit fix --force` — it jumps to Vite 8. esbuild is pinned via overrides.
npm install --no-audit
npm run build
sudo systemctl reload nginx