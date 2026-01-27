/**
 * Example Socket.IO client
 * This demonstrates how to connect to the server and listen for events
 */

const { io } = require('socket.io-client');

// Connect to the server
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-auth-token' // Optional: if you're using authentication
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);

  // Join a specific room (e.g., for a fight)
  socket.emit('join-room', 'fight-123');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Listen for fight updates
socket.on('fight-updated', (data) => {
  console.log('Fight updated:', data);
  // Handle fight update
});

// Listen for new bets
socket.on('new-bet', (data) => {
  console.log('New bet placed:', data);
  // Handle new bet
});

// Listen for custom events
socket.on('custom-event', (data) => {
  console.log('Custom event received:', data);
  // Handle custom event
});

// Example: Emit an event to the server
function emitFightUpdate(fightId, updateData) {
  socket.emit('fight-update', {
    fightId,
    ...updateData
  });
}

// Example: Leave a room
function leaveRoom(roomId) {
  socket.emit('leave-room', roomId);
}

// Export functions for use in other modules
module.exports = {
  socket,
  emitFightUpdate,
  leaveRoom
};
