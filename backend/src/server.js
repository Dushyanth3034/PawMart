import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { config } from './config/index.js';
import { testDbConnection } from './services/prisma.service.js';

const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Basic Socket connection handler
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

import { startEscrowScheduler } from './services/escrowScheduler.service.js';

// Start server after testing database connection
async function startServer() {
  await testDbConnection();
  
  // Start the background escrow auto-release scheduler
  startEscrowScheduler();
  
  httpServer.listen(config.port, () => {
    console.log(`[Server] running in ${config.nodeEnv} mode on http://localhost:${config.port}`);
  });
}

startServer();
