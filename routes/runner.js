const express = require('express');
const Runner = require('../models/Runner');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const { status, transactionType, runnerId, tellerId } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (transactionType) filter.transactionType = transactionType;
    if (runnerId) filter.runnerId = runnerId;
    if (tellerId) filter.tellerId = tellerId;

    const transactions = await Runner.find(filter)
      .populate('runnerId', 'username tellerNo role')
      .populate('tellerId', 'username tellerNo role')
      .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error });
  }
});

// Get transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Runner.findById(req.params.id)
      .populate('runnerId', 'username tellerNo role')
      .populate('tellerId', 'username tellerNo role');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transaction', error });
  }
});

// Get transactions by runner
router.get('/runner/:runnerId', async (req, res) => {
  try {
    const { runnerId } = req.params;
    const { status, transactionType } = req.query;
    
    const filter = { runnerId };
    if (status) filter.status = status;
    if (transactionType) filter.transactionType = transactionType;

    const transactions = await Runner.find(filter)
      .populate('runnerId', 'username tellerNo role')
      .populate('tellerId', 'username tellerNo role')
      .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching runner transactions', error });
  }
});

// Get transactions by teller
router.get('/teller/:tellerId', async (req, res) => {
  try {
    const { tellerId } = req.params;
    const { status, transactionType } = req.query;
    
    const filter = { tellerId };
    if (status) filter.status = status;
    if (transactionType) filter.transactionType = transactionType;

    const transactions = await Runner.find(filter)
      .populate('runnerId', 'username tellerNo role')
      .populate('tellerId', 'username tellerNo role')
      .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teller transactions', error });
  }
});

// Topup teller's credits
router.post('/topup', async (req, res) => {
  try {
    const { tellerId, amount } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Get the runner (current user)
    const runnerUser = await User.findById(req.user.userId);
    if (!runnerUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the teller user
    const teller = await User.findById(tellerId);
    if (!teller) {
      return res.status(404).json({ message: 'Teller not found' });
    }

    // Check if teller has valid role
    const validRoles = ['cashinTeller', 'cashoutTeller', 'admin'];
    if (!validRoles.includes(teller.role)) {
      return res.status(400).json({ message: 'Invalid teller role' });
    }

    // Create transaction record
    const transaction = new Runner({
      runnerId: req.user.userId,
      tellerId,
      amount,
      transactionType: 'topup',
      status: 'pending'
    });

    // Update teller's credits
    const updatedTeller = await User.findByIdAndUpdate(
      tellerId,
      { $inc: { credits: amount } },
      { new: true, runValidators: true }
    );

    // Update transaction status to completed
    transaction.status = 'completed';
    await transaction.save();

    res.status(200).json({
      message: 'Topup successful',
      transaction,
      teller: {
        id: updatedTeller._id,
        username: updatedTeller.username,
        credits: updatedTeller.credits
      },
      amount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing topup', error });
  }
});

// Remittance from teller
router.post('/remittance', async (req, res) => {
  try {
    const { tellerId, amount } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Get the runner (current user)
    const runnerUser = await User.findById(req.user.userId);
    if (!runnerUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the teller user
    const teller = await User.findById(tellerId);
    if (!teller) {
      return res.status(404).json({ message: 'Teller not found' });
    }

    // Check if teller has valid role
    const validRoles = ['cashinTeller', 'cashoutTeller', 'admin'];
    if (!validRoles.includes(teller.role)) {
      return res.status(400).json({ message: 'Invalid teller role' });
    }

    // Check if teller has sufficient credits
    if (teller.credits < amount) {
      return res.status(400).json({
        message: 'Insufficient credits',
        currentCredits: teller.credits,
        requiredCredits: amount
      });
    }

    // Create transaction record
    const transaction = new Runner({
      runnerId: req.user.userId,
      tellerId,
      amount,
      transactionType: 'remit',
      status: 'pending'
    });

    // Deduct credits from teller
    const updatedTeller = await User.findByIdAndUpdate(
      tellerId,
      { $inc: { credits: -amount } },
      { new: true, runValidators: true }
    );

    // Update transaction status to completed
    transaction.status = 'completed';
    await transaction.save();

    res.status(200).json({
      message: 'Remittance successful',
      transaction,
      teller: {
        id: updatedTeller._id,
        username: updatedTeller.username,
        credits: updatedTeller.credits
      },
      amount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing remittance', error });
  }
});

// Get transaction statistics
router.get('/stats/:runnerId', async (req, res) => {
  try {
    const { runnerId } = req.params;
    
    const transactions = await Runner.find({ runnerId });
    
    const totalTopup = transactions
      .filter(t => t.transactionType === 'topup' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalRemittance = transactions
      .filter(t => t.transactionType === 'remit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
    const completedTransactions = transactions.filter(t => t.status === 'completed').length;
    const cancelledTransactions = transactions.filter(t => t.status === 'cancelled').length;

    res.json({
      runnerId,
      totalTopup,
      totalRemittance,
      pendingTransactions,
      completedTransactions,
      cancelledTransactions,
      totalTransactions: transactions.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transaction statistics', error });
  }
});

module.exports = router;
