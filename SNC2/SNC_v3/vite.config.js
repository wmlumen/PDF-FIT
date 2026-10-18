import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { resolve } from 'path';
import { readFileSync } from 'fs';

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