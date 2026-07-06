import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createOtpDevMiddleware } from './api/_lib/otpDevMiddleware.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (value != null && value !== '') {
      process.env[key] ??= value;
    }
  }

  return {
    plugins: [
      react(),
      {
        name: 'campaignhub-otp-api-dev',
        configureServer(server) {
          server.middlewares.use(createOtpDevMiddleware());
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
