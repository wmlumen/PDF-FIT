import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { resolve, sep, extname } from 'path';
import { readFileSync, existsSync, createReadStream } from 'fs';

const DEV_VENDOR_FILES = {
  '/vendor/leaflet.js': 'node_modules/leaflet/dist/leaflet.js',
  '/vendor/leaflet.css': 'node_modules/leaflet/dist/leaflet.css',
  '/vendor/turf.min.js': 'node_modules/@turf/turf/turf.min.js',
  '/vendor/proj4.js': 'node_modules/proj4/dist/proj4.js',
  '/vendor/xlsx.full.min.js': 'node_modules/xlsx/dist/xlsx.full.min.js',
  '/vendor/xlsx.mjs': 'node_modules/xlsx/xlsx.mjs',
  '/vendor/jszip.min.js': 'node_modules/jszip/dist/jszip.min.js',
  '/vendor/jspdf.umd.min.js': 'node_modules/jspdf/dist/jspdf.umd.min.js',
  '/vendor/jspdf.plugin.autotable.min.js': 'node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js',
  '/vendor/shpwrite.js': 'node_modules/shp-write/shpwrite.js',
  '/vendor/dxf-parser.js': 'node_modules/dxf-parser/dist/dxf-parser.js',
  '/vendor/dom-to-image.min.js': 'node_modules/dom-to-image/dist/dom-to-image.min.js',
  '/vendor/docx.mjs': 'node_modules/docx/dist/index.mjs',
};
const DEV_VENDOR_PREFIXES = {
  '/vendor/fontawesome/': 'node_modules/@fortawesome/fontawesome-free/',
};
const MIME = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

function devVendorPlugin() {
  return {
    name: 'snc-dev-vendor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        let rel = DEV_VENDOR_FILES[url];
        if (!rel) {
          const prefix = Object.keys(DEV_VENDOR_PREFIXES).find(p => url.startsWith(p));
          if (prefix) rel = DEV_VENDOR_PREFIXES[prefix] + url.slice(prefix.length);
        }
        if (!rel) return next();
        const nodeModules = resolve(__dirname, 'node_modules') + sep;
        const abs = resolve(__dirname, rel);
        if (!abs.startsWith(nodeModules) || !existsSync(abs)) return next();
        res.setHeader('Content-Type', MIME[extname(abs)] || 'application/octet-stream');
        createReadStream(abs).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  
  // Entry points separados para cada app
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        municipal: resolve(__dirname, 'index-municipal.html')
      },
      output: {
// Code splitting automático por feature
      manualChunks: (id) => {
        if (id.includes('@turf/turf') || id.includes('proj4')) return 'vendor-core';
        if (id.includes('shpjs') || id.includes('shp-write') || id.includes('dxf-parser') || id.includes('jszip')) return 'vendor-gis';
        if (id.includes('jspdf') || id.includes('jspdf-autotable') || id.includes('docx')) return 'vendor-pdf';
        if (id.includes('xlsx')) return 'vendor-excel';
        if (id.includes('leaflet')) return 'vendor-map';
        if (id.includes('qrcode') || id.includes('dom-to-image')) return 'vendor-utils';
        return undefined;
      },
        // Hash en nombres para cache busting real
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // CSS code splitting
      cssCodeSplit: true,
      // Sourcemaps solo en dev
      sourcemap: false,
      // Reportar tamaños
      reportCompressedSize: true,
      chunkSizeWarningLimit: 500
    },
    // Minificación CSS
    cssMinify: true,
    // Module preload polyfill
    modulePreload: { polyfill: true }
  },
  
  // Optimización de dependencias
  optimizeDeps: {
    include: [
      '@turf/turf',
      'proj4',
      'xlsx',
      'jspdf',
      'jspdf-autotable',
      'docx',
      'leaflet',
      'leaflet-draw',
      'shpjs',
      'shp-write',
      'dxf-parser',
      'jszip',
      'qrcode',
      'dom-to-image'
    ],
    exclude: ['@vitejs/plugin-legacy']
  },
  
  // Plugins
  plugins: [
    devVendorPlugin(),
    legacy({
      targets: ['defaults', 'not IE 11'],
      modernPolyfills: ['es/global-this', 'es.array.find', 'es.array.includes'],
      renderLegacyChunks: true,
      polyfills: [
        'es.symbol',
        'es.array.filter',
        'es.array.for-each',
        'es.array.map',
        'es.object.assign',
        'es.object.keys',
        'es.promise',
        'es.string.includes',
        'web.dom-collections.iterator'
      ]
    })
  ],
  
  // Dev server
  server: {
    port: 5556,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5556',
        changeOrigin: true
      }
    }
  },
  
  // Preview server (para probar build)
  preview: {
    port: 4173,
    host: '0.0.0.0'
  },
  
  // CSS
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      css: {}
    }
  },
  
  // Resolve aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js'),
      '@server': resolve(__dirname, 'server')
    }
  },
  
  // Experimental: CSS layers support
  css: {
    postcss: {}
  }
});