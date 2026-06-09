import { defineConfig } from 'vite';
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  plugins: [
    obfuscator({
      // Only obfuscate in production-like builds (electron:build)
      apply: 'build',
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.5,
        // Preserve identifiers used as message types (postMessage etc.)
        reservedStrings: [
          'ARCADE_INIT', 'GAME_OVER', 'EXIT_GAME', 'CHAR_DATA',
          'REQUEST_CHAR_DATA', 'ARCADE_SAVE_SESSION', 'ARCADE_RESTORE_SESSION',
          'arcade:blur', 'arcade:focus'
        ],
      }
    })
  ]
});
