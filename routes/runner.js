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
      .sort({ createdAt: -1 });

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teller transactions', error });
  }
});

// Create a new runner transaction
router.post('/', async (req, res) => {
  try {
    const { amount, transactionType } = req.body;
    // const tellerId = await User.findById(req.user.userId);

    // return res.status(404).json({ teller: req.user.userId });

    // Validate required fields
    if (!amount || !transactionType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate transaction type
    if (!['remit', 'topup'].includes(transactionType)) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Verify the teller exists

    // if (!teller) {
    //   return res.status(404).json({ message: 'Teller not found', tellerId: req.user.userId });
    // }

    // If runnerId is provided, verify it exists
    // if (runnerId) {
    //   const runner = await User.findById(runnerId);
    //   if (!runner) {
    //     return res.status(404).json({ message: 'Runner not found' });
    //   }
    // }

    // Create transaction record
    const transaction = new Runner({
      runnerId: null, // Can be null for unassigned transactions
      tellerId: req.user.userId,
      amount,
      transactionType,
      status: 'processing' // If assigned, set to processing
    });

    await transaction.save();

    // Return created transaction with populated fields
    const populatedTransaction = await Runner.findById(transaction._id)
      // .populate('runnerId', 'username tellerNo role')
      .populate('tellerId', 'username tellerNo role');

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: populatedTransaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating transaction', error });
  }
});

// Topup teller's credits
router.post('/topup', async (req, res) => {
  try {
    const { amount } = req.body;
    const tellerId = req.user.userId;

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
    const { amount } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Get the runner (current user)
    const runnerUser = await User.findById(req.user.userId);
    if (!runnerUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // // Get the teller user
    const teller = await User.findById(req.user.userId);
    // if (!teller) {
    //   return res.status(404).json({ message: 'Teller not found' });
    // }

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
      runnerId: null, // Runner will be assigned later
      tellerId: teller._id,
      amount,
      transactionType: 'remit',
      status: 'pending'
    });

    // Deduct credits from teller
    const updatedTeller = await User.findByIdAndUpdate(
      teller._id,
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

// Assign transaction to a runner
router.put('/assign/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { runnerId } = req.body;

    // Validate runnerId
    if (!runnerId) {
      return res.status(400).json({ message: 'Runner ID is required' });
    }

    // Find the transaction
    const transaction = await Runner.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if transaction is already assigned
    if (transaction.runnerId) {
      return res.status(400).json({ message: 'Transaction is already assigned to a runner' });
    }

    // Check if transaction status allows assignment
    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending transactions can be assigned' });
    }

    // Verify the runner exists and has valid role
    const runner = await User.findById(runnerId);
    if (!runner) {
      return res.status(404).json({ message: 'Runner not found' });
    }

    // Update the transaction
    transaction.runnerId = runnerId;
    transaction.status = 'processing';
    await transaction.save();

    // Return updated transaction with populated fields
    const updatedTransaction = await Runner.findById(transactionId)
      .populate('runnerId', 'username tellerNo role')
      .populate('tellerId', 'username tellerNo role');

    res.status(200).json({
      message: 'Transaction assigned successfully',
      transaction: updatedTransaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning transaction', error });
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
