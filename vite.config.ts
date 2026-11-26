import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
// @ts-ignore - plain JS module shared with server.js
import { handleSendParentPin } from './sms-handler.js';

function smsApiPlugin(): Plugin {
  return {
    name: 'sms-api-handler',
    configureServer(server) {
      server.middlewares.use('/api/send-parent-pin', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const result = await handleSendParentPin(JSON.parse(body || '{}'));
            res.statusCode = result.status;
            res.end(JSON.stringify(result.body));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e?.message || 'Server error' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), smsApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 3500,
    },
  };
});
