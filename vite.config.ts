import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  return {
    // `.env` carries NODE_ENV for the API server, and Vite otherwise lets that decide
    // import.meta.env.DEV — which made DEV true inside `vite build` and neutralised
    // every dev-only guard in the shipped bundle. Pin both flags to the actual command.
    define: {
      'import.meta.env.DEV': JSON.stringify(command === 'serve'),
      'import.meta.env.PROD': JSON.stringify(command === 'build'),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
