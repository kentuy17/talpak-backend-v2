const io = require('socket.io-client');

// Connect to the Socket.IO server (same as API server)
const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: true
});

console.log('Connecting to Socket.IO server...');

// Connection event
socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  console.log('Socket ID:', socket.id);
});

// Listen for bet_added events
socket.on('bet_added', (bet) => {
  console.log('\n🎉 New bet received:');
  console.log('Fight ID:', bet.fightId);
  console.log('User ID:', bet.userId);
  console.log('Bet Side:', bet.betSide);
  console.log('Amount:', bet.amount);
  console.log('Odds:', bet.odds);
  console.log('Status:', bet.status);
  console.log('Created At:', bet.createdAt);
  console.log('------------------------\n');
});

// Listen for fight updates
socket.on('fight-updated', (data) => {
  console.log('\n⚔️ Fight updated:', data);
});

// Listen for new bets
socket.on('new-bet', (data) => {
  console.log('\n💰 New bet:', data);
});

// Error handling
socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Join a room (optional - for specific fight updates)
// socket.emit('join-room', 'fight-room-id');

console.log('Listening for bet_added events...');
console.log('Press Ctrl+C to exit\n');
