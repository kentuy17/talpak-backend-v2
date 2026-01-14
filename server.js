require('dotenv').config()

const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const gameEventRoutes = require('./routes/gameEvents');
const fightRoutes = require('./routes/fights');
const betHistoryRoutes = require('./routes/betHistory')
const runnerRoutes = require('./routes/runner')

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI

// MongoDB Connection
mongoose.connect(MONGODB_URI);

// Routes
app.use('/api/auth', authRoutes);

// user routes
app.use('/api/users', userRoutes);

// game events routes
app.use('/api/game-events', gameEventRoutes);

// fight routes
app.use('/api/fights', fightRoutes);

// bet history routes
app.use('/api/bet-history', betHistoryRoutes);

// runner routes
app.use('/api/runners', runnerRoutes);

// Protected route exampleconst userRoutes = require('./routes/users');
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({
    message: 'Access granted to protected route',
    user: req.user
  });
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
