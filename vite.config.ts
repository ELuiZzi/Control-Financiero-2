import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Lista de archivos de la compilación para que el service worker los guarde todos offline
const assetManifest = (): Plugin => ({
  name: 'asset-manifest',
  apply: 'build',
  generateBundle(_, bundle) {
    const files = Object.keys(bundle).filter(f => f.startsWith('assets/'));
    this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify(files) });
  },
});

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), assetManifest()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
