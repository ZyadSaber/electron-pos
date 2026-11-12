import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { timingSafeEqual } from 'node:crypto';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function masterKeyVerificationPlugin(masterKey?: string): Plugin {
  return {
    name: 'master-key-verification',
    configureServer(server) {
      server.middlewares.use('/__verify-master-key', (request, response) => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Content-Type', 'application/json; charset=utf-8');

        const sendJson = (statusCode: number, result: { configured: boolean; authorized: boolean }) => {
          response.statusCode = statusCode;
          response.end(JSON.stringify(result));
        };

        if (request.method !== 'POST') {
          sendJson(405, { configured: Boolean(masterKey), authorized: false });
          return;
        }

        if (!masterKey || masterKey.length > 256) {
          sendJson(200, { configured: false, authorized: false });
          request.resume();
          return;
        }

        const chunks: Buffer[] = [];
        let bodyLength = 0;
        let oversized = false;

        request.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          bodyLength += buffer.length;
          if (bodyLength > 4096) {
            oversized = true;
            chunks.length = 0;
            return;
          }
          if (!oversized) chunks.push(buffer);
        });

        request.on('end', () => {
          if (oversized) {
            sendJson(413, { configured: true, authorized: false });
            return;
          }

          let body: unknown;
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            sendJson(400, { configured: true, authorized: false });
            return;
          }

          if (typeof body !== 'object' || body === null || !('masterKey' in body)) {
            sendJson(400, { configured: true, authorized: false });
            return;
          }

          const enteredKey = body.masterKey;
          if (typeof enteredKey !== 'string' || enteredKey.length === 0 || enteredKey.length > 256) {
            sendJson(200, { configured: true, authorized: false });
            return;
          }

          const enteredKeyBuffer = Buffer.from(enteredKey, 'utf8');
          const masterKeyBuffer = Buffer.from(masterKey, 'utf8');
          const authorized = enteredKeyBuffer.length === masterKeyBuffer.length
            && timingSafeEqual(enteredKeyBuffer, masterKeyBuffer);

          sendJson(200, { configured: true, authorized });
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    base: './',
    plugins: [react(), tailwindcss(), masterKeyVerificationPlugin(env.MASTER_KEY)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
