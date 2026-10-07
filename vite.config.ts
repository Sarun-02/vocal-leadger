/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy for the packaged app only (dev needs Vite's inline HMR preamble).
 * connect-src allows https so the optional VITE_AI_PARSER_URL endpoint can be reached.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml: (html) => html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  // Relative asset paths so the bundle loads inside the Capacitor WebView.
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    // The Material Symbols font (~4 MB) is bundled on purpose for offline use.
    assetsInlineLimit: 8192,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
