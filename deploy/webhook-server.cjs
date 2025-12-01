#!/usr/bin/env node

const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

// GitHub Webhook Secret - wird in GitHub konfiguriert
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'hometracker-deploy-secret-2025';
const PORT = 9000;

// Funktion zum Verifizieren der GitHub Signature
function verifySignature(payload, signature) {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// HTTP Server
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        // Verifiziere GitHub Signature
        const signature = req.headers['x-hub-signature-256'];
        if (!verifySignature(body, signature)) {
          console.error('Invalid signature');
          res.writeHead(401);
          res.end('Unauthorized');
          return;
        }

        const payload = JSON.parse(body);

        // Prüfe ob es ein Push auf main ist
        if (payload.ref === 'refs/heads/main') {
          console.log('Deployment triggered by push to main');
          console.log(`Commit: ${payload.head_commit?.message || 'unknown'}`);

          // Führe Deployment-Script aus
          try {
            const output = execSync('/var/www/hometracker/deploy/deploy.sh', {
              encoding: 'utf-8',
              timeout: 300000 // 5 Minuten Timeout
            });
            console.log('Deployment output:', output);

            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              message: 'Deployment started'
            }));
          } catch (error) {
            console.error('Deployment failed:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({
              success: false,
              error: error.message
            }));
          }
        } else {
          console.log('Push to non-main branch, skipping deployment');
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            message: 'Not main branch, skipping'
          }));
        }
      } catch (error) {
        console.error('Error processing webhook:', error);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Webhook server listening on http://127.0.0.1:${PORT}`);
  console.log(`Webhook URL: http://127.0.0.1:${PORT}/deploy`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
});
