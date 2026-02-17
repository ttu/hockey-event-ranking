import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const base = process.env.BASE_PATH || '/';
const basePrefix = base.endsWith('/') ? base : `${base}/`;

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'html-base-paths',
      transformIndexHtml(html) {
        return html
          .replace(
            /href="\/hockey-icon\.png"/g,
            `href="${basePrefix}hockey-icon.png"`,
          )
          .replace(
            /content="\/og-image\.png"/g,
            `content="${basePrefix}og-image.png"`,
          );
      },
    },
  ],
  server: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
