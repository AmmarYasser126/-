// Production entry point (Hostinger "Entry file": server.js).
// Serves the Vite build in dist/ and the /api/send-parent-pin endpoint.
// If dist/ is missing (no build command configured on the host), it builds once at startup.
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleSendParentPin } from './sms-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const indexHtml = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.log('dist/ not found, running vite build...');
  const { build } = await import('vite');
  await build({ root: __dirname, logLevel: 'warn' });
  console.log('Build complete.');
}

const app = express();
app.disable('x-powered-by');

app.post('/api/send-parent-pin', express.json({ limit: '10kb' }), async (req, res) => {
  try {
    const { status, body } = await handleSendParentPin(req.body);
    res.status(status).json(body);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Server error' });
  }
});

app.all('/api/*', (_req, res) => res.status(404).json({ error: 'Not found' }));

app.use(
  express.static(distDir, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// SPA fallback: every other GET returns the app shell.
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexHtml);
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
