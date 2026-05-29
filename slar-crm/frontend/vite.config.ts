import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3005,
  },
  resolve: {
    alias: {
      '@slar-crm/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
