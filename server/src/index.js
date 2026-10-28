import app from './app.js';
import { config } from './config.js';

const server = app.listen(config.port, () => {
  console.log(`[Encore API] Server running on port ${config.port} (instance: ${config.instanceId})`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[Encore API] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[Encore API] HTTP server closed');
  });
});

