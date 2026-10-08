import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { copyFileSync, cpSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'copy-extension-public',
      closeBundle() {
        cpSync(resolve(__dirname, 'public'), resolve(__dirname, 'dist'), {
          recursive: true
        });
        copyFileSync(
          resolve(__dirname, 'src/content/content.css'),
          resolve(__dirname, 'dist/content.css')
        );
        copyFileSync(
          resolve(__dirname, 'src/copy-unlock/copy-unlock.css'),
          resolve(__dirname, 'dist/copy-unlock.css')
        );
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        offscreen: resolve(__dirname, 'offscreen.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
        'copy-unlock': resolve(__dirname, 'src/copy-unlock/copy-unlock.ts'),
        'copy-unlock-main': resolve(__dirname, 'src/copy-unlock/copy-unlock-main.ts')
      },
      output: {
        entryFileNames: '[name].js'
      }
    }
  }
});
