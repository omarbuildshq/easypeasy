import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        quickstart: resolve(__dirname, 'src/quickstart/index.html'),
        addonButler: resolve(__dirname, 'src/addon-butler/index.html'),
        cinePatch: resolve(__dirname, 'src/cine-patch/index.html'),
      },
    },
  },
});
