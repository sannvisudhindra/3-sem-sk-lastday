import app from './app.js';
import { config } from './config.js';
import { startSweeper, stopSweeper } from './services/sweeper.js';

const server = app.listen(config.port, () => {
  console.log(`[Encore API] Server running on port ${config.port} (instance: ${config.instanceId})`);
  // Start the 10-second background sweeper
  startSweeper();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[Encore API] SIGTERM signal received: closing HTTP server');
  stopSweeper();
  server.close(() => {
    console.log('[Encore API] HTTP server closed');
  });
});
