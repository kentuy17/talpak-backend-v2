const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/talpakdb');

// Routes
app.use('/api/auth', authRoutes);

// Protected route example
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({
    message: 'Access granted to protected route',
    user: req.user
  });
});

// User routes (with auth)
app.get('/api/users', authMiddleware, async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
