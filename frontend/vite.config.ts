import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // three.js + react-three-fiber put the single bundle at ~1.1 MB (~320 kB gzip); expected for the 3D view.
  build: { chunkSizeWarningLimit: 1500 },
  test: { environment: 'node' },
});
