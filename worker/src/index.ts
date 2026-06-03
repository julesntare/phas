import 'dotenv/config';
import cron from 'node-cron';
import http from 'http';
import { probeAllPlatforms } from './prober';
import { runFusionForPlatform } from './fusion';

const probeCron = process.env.PROBE_CRON ?? '*/5 * * * *';

cron.schedule(probeCron, () => {
  probeAllPlatforms().catch(console.error);
});

console.log(`[worker] prober scheduled: ${probeCron}`);

// Lightweight internal HTTP server so the Next.js API layer can trigger
// fusion immediately after a new report (optional — fusion also runs on probe cycle).
const port = Number(process.env.INTERNAL_PORT ?? 3001);
const server = http.createServer((req, res) => {
  const match = req.url?.match(/^\/internal\/fusion\/([^/]+)$/);
  if (req.method === 'POST' && match) {
    const platformId = match[1];
    runFusionForPlatform(platformId)
      .then(() => { res.writeHead(200); res.end('ok'); })
      .catch((err) => { console.error(err); res.writeHead(500); res.end('error'); });
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200); res.end('ok'); return;
  }
  res.writeHead(404); res.end();
});

server.listen(port, () => {
  console.log(`[worker] internal server listening on :${port}`);
});
