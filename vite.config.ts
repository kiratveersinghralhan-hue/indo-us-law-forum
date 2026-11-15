import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Provisional local root; choose deployment base only after hosting is agreed.
  base: '/',
  ssr: { noExternal: ['gsap'] },
  // Freeze the isolated browser-test server; QA artifacts/docs must not reload it.
  server: mode === 'browser-test' ? { hmr: false, watch: null } : undefined,
}));
