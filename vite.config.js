
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: '/html/index.html',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'html/index.html',
        login: 'html/login.html',
        register: 'html/register.html',
        dashboard: 'html/dashboard.html',
        admin: 'html/admin.html',
      },
    },
  },
});
