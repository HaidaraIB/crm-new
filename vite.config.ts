import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** End users see nothing in DevTools console (app bundle + CDN scripts). Dev build unchanged. */
function silenceBrowserConsoleInProd(mode: string): Plugin {
  return {
    name: 'silence-browser-console-prod',
    transformIndexHtml(html) {
      if (mode !== 'production') return html;
      const snippet =
        '<script>(function(){var n=function(){};var c=window.console||{};' +
        'c.log=c.info=c.debug=c.trace=c.dir=c.dirxml=c.group=c.groupCollapsed=c.groupEnd=c.table=c.time=c.timeEnd=c.timeLog=c.clear=c.count=c.countReset=c.assert=c.warn=c.error=n;})();</script>';
      return html.replace(/<head(\s[^>]*)?>/i, (m) => m + snippet);
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      esbuild: {
        // Strip console/debugger from production bundles (dev keeps full logging).
        drop: mode === 'production' ? (['console', 'debugger'] as const) : [],
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [silenceBrowserConsoleInProd(mode), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
                if (id.includes('@tanstack/react-query')) return 'vendor-query';
                if (id.includes('recharts')) return 'vendor-ui';
              }
            },
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
        chunkSizeWarningLimit: 600,
      },
    };
});
