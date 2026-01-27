const { Server } = require('socket.io');

let io;

/**
 * Initialize Socket.IO server
 * @param {import('http').Server} httpServer - The HTTP server instance
 */
function initializeSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware for authentication (optional)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    // Add your authentication logic here
    // For now, we'll allow all connections
    next();
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a specific room (e.g., for a specific fight)
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // Leave a room
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room: ${roomId}`);
    });

    // Handle custom events
    socket.on('fight-update', (data) => {
      // Broadcast fight updates to all clients in the fight's room
      io.to(data.fightId).emit('fight-updated', data);
    });

    socket.on('bet-placed', (data) => {
      // Broadcast new bet to all clients in the fight's room
      io.to(data.fightId).emit('new-bet', data);
    });

    // Disconnection handling
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

/**
 * Get the Socket.IO instance
 * @returns {Server} The Socket.IO server instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocketServer first.');
  }
  return io;
}

module.exports = {
  initializeSocketServer,
  getIO
};
