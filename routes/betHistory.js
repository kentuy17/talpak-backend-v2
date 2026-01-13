const express = require('express');
const BetHistory = require('../models/BetHistory');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all bet history
router.get('/', async (req, res) => {
  try {
    const bets = await BetHistory.find()
      .populate('fightId', 'fightNumber meron wala status')
      .populate('userId', 'username tellerNo role')
      .sort({ createdAt: -1 });

    res.json(bets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bet history', error });
  }
});

// Get bets by fight ID
router.get('/fight/:fightId', async (req, res) => {
  try {
    const { fightId } = req.params;
    const bets = await BetHistory.find({ fightId })
      .populate('userId', 'username tellerNo role')
      .sort({ createdAt: -1 });

    res.json(bets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bets for fight', error });
  }
});

// Get bets by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const bets = await BetHistory.find({ userId })
      .populate('fightId', 'fightNumber meron wala status')
      .sort({ createdAt: -1 });

    res.json(bets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user bets', error });
  }
});

// Create new bet
router.post('/', async (req, res) => {
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

    const bet = new BetHistory({
      fightId,
      userId: req.user.userId,
      betSide,
      amount,
      odds,
      status: 'pending'
    });

    await bet.save();

    res.status(201).json({
      message: 'Bet placed successfully',
      bet
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
