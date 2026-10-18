# Changelog - Performance

## 2026-10-18 - imp_20261018_bundler_setup
**Agent:** audit-agent  
**Type:** pattern_detected  
**Description:** Configurar Vite para bundling, tree-shaking y producción

```diff
# vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        municipal: resolve(__dirname, 'index-municipal.html')
      }
    },
    minify: 'terser',
    terserOptions: { compress: { drop_console: true, drop_debugger: true } }
  },
  optimizeDeps: {
    include: ['@turf/turf', 'proj4', 'xlsx', 'jspdf', 'docx', 'leaflet']
  },
  server: { port: 5556, proxy: { '/api': 'http://localhost:5556' } }
});

# index.html - reemplazar scripts CDN por:
# <script type="module" src="/js/app.js"></script>
# <link rel="stylesheet" href="/css/styles.css">
```

**Lesson:** CDN en producción = SPOF, lentitud, CSP issues. Bundler = tree-shaking, code-splitting, cache busting, CSP compliant.

**Status:** pending