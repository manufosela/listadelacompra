// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://myhomec.art',

  vite: {
    build: {
      rollupOptions: {
        output: {
          // No procesar los componentes Lit en public/
          manualChunks: undefined
        }
      }
    },
    optimizeDeps: {
      exclude: ['lit']
    }
  },

  // Configuración para API routes
  server: {
    port: 4321,
    host: true
  }
});
