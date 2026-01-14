const express = require('express');
const BetHistory = require('../models/BetHistory');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all bet history with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [bets, total] = await Promise.all([
      BetHistory.find()
        .populate('fightId', 'fightNumber meron wala status')
        .populate('userId', 'username tellerNo role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BetHistory.countDocuments()
    ]);

    res.json({
      bets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bet history', error });
  }
});

// Get bets by fight ID with pagination
router.get('/fight/:fightId', async (req, res) => {
  try {
    const { fightId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [bets, total] = await Promise.all([
      BetHistory.find({ fightId })
        .populate('userId', 'username tellerNo role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BetHistory.countDocuments({ fightId })
    ]);

    res.json({
      bets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bets for fight', error });
  }
});

// Get bets by user ID with pagination
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [bets, total] = await Promise.all([
      BetHistory.find({ userId })
        .populate('fightId', 'fightNumber meron wala status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BetHistory.countDocuments({ userId })
    ]);

    res.json({
      bets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user bets', error });
  }
});

// Get bets by user ID and event ID with pagination
router.get('/user/:userId/event/:eventId', async (req, res) => {
  try {
    const { userId, eventId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // First, find all fights that belong to this event
    const Fight = require('../models/Fight');
    const fights = await Fight.find({ eventId }).select('_id');
    const fightIds = fights.map(fight => fight._id);

    // Then, find bets for this user in those fights
    const [bets, total] = await Promise.all([
      BetHistory.find({
        userId,
        fightId: { $in: fightIds }
      })
        .populate('fightId', 'fightNumber meron wala status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BetHistory.countDocuments({
        userId,
        fightId: { $in: fightIds }
      })
    ]);

    res.json({
      bets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user bets for event', error });
  }
});

// Create new bet
router.post('/add', async (req, res) => {
  try {
    const { fightId, betSide, amount, odds } = req.body;

    // Verify fight exists and is in valid status
    const Fight = require('../models/Fight');
    const fight = await Fight.findById(fightId);

    if (!fight) {
      return res.status(404).json({ message: 'Fight not found' });
    }

    if (fight.status !== 'open') {
      return res.status(400).json({ message: 'Betting is only allowed for open fights' });
    }

    // Get user and check credits
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has sufficient credits
    if (user.credits < amount) {
      return res.status(400).json({
        message: 'Insufficient credits',
        currentCredits: user.credits,
        requiredCredits: amount
      });
    }

    // Create the bet
    const bet = new BetHistory({
      fightId,
      userId: req.user.userId,
      betSide,
      amount,
      odds: odds ?? 1,
      status: 'pending'
    });

    // Deduct credits using findByIdAndUpdate
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $inc: { credits: amount } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify credits were sufficient (check if credits went negative)
    if (updatedUser.credits < 0) {
      // Rollback the credit deduction
      await User.findByIdAndUpdate(
        req.user.userId,
        { $inc: { credits: -amount } },
        { new: true }
      );
      return res.status(400).json({
        message: 'Insufficient credits',
        currentCredits: updatedUser.credits + amount,
        requiredCredits: amount
      });
    }

    // Save the bet
    await bet.save();

    res.status(201).json({
      message: 'Bet placed successfully',
      bet,
      remainingCredits: updatedUser.credits
    });
  } catch (error) {
    res.status(500).json({ message: 'Error placing bet', error });
  }
});

// Update bet status (for admin/settlement)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, payout } = req.body;

    const bet = await BetHistory.findByIdAndUpdate(
      req.params.id,
      { status, payout },
      { new: true, runValidators: true }
    ).populate('fightId', 'fightNumber meron wala status')
      .populate('userId', 'username tellerNo role');

    if (!bet) {
      return res.status(404).json({ message: 'Bet not found' });
    }

    res.json({
      message: 'Bet status updated successfully',
      bet
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating bet status', error });
  }
});

module.exports = router;
