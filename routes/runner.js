const express = require('express');
const mongoose = require('mongoose');
const Runner = require('../models/Runner');
const User = require('../models/User');
const BetHistory = require('../models/BetHistory');
const Fight = require('../models/Fight');
const authMiddleware = require('../middleware/auth');
const GameEvent = require('../models/GameEvent');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all bet items by event ID and teller number
router.get('/items', async (req, res) => {
  try {
    const { eventId, tellerNo } = req.query;

    if (!eventId || !tellerNo) {
      return res.status(400).json({ message: 'eventId and tellerNo are required' });
    }

    const teller = await User.findOne({ tellerNo }).select('_id username tellerNo role');
    if (!teller) {
      return res.status(404).json({ message: 'Teller not found' });
    }

    const fights = await Fight.find({ eventId }).select('_id');
    if (!fights.length) {
      return res.json({ items: [] });
    }

    const fightIds = fights.map(fight => fight._id);

    const items = await BetHistory.find({
      userId: teller._id,
      fightId: { $in: fightIds }
    })
      .populate('fightId', 'fightNumber eventId status meron wala')
      .populate('userId', 'username tellerNo role')
      .sort({ createdAt: -1 });

    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items by event and teller number', error });
  }
});

const getCurrentEventId = async () => {
  const activeEvent = await GameEvent.findOne({ status: 'ongoing' }).select('_id');

  if (activeEvent) {
    return activeEvent._id;
  }

  const latestEvent = await GameEvent.findOne().sort({ eventDate: -1, createdAt: -1 }).select('_id');
  return latestEvent ? latestEvent._id : null;
};

const mapTransactionForResponse = (transaction) => {
  const tx = transaction.toObject ? transaction.toObject() : transaction;
  const tellerNo = tx?.tellerNo ?? tx?.tellerId?.tellerNo ?? null;

  return {
    ...tx,
    tellerNo,
    tellerId: undefined
  };
};

const getActiveEventId = async () => {
  const activeEvent = await GameEvent.findOne({ status: 'ongoing' }).select('_id');
  return activeEvent ? activeEvent._id : null;
};

const getTellerIdByTellerNo = async (tellerNo) => {
  const tellerNoAsNumber = Number(tellerNo);
  if (Number.isNaN(tellerNoAsNumber)) {
    return null;
  }

  const teller = await User.findOne({ tellerNo: tellerNoAsNumber }).select('_id');
  return teller ? teller._id : null;
};

const getRequesterTellerNo = async (req) => {
  const tokenTellerNo = Number(req?.user?.tellerNo);
  if (!Number.isNaN(tokenTellerNo)) {
    return tokenTellerNo;
  }

  const requester = await User.findById(req?.user?.userId).select('tellerNo').lean();
  const dbTellerNo = Number(requester?.tellerNo);
  return Number.isNaN(dbTellerNo) ? null : dbTellerNo;
};

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const { status, transactionType, runnerId, tellerId, tellerNo } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (transactionType) filter.transactionType = transactionType;
    if (runnerId) filter.runnerId = runnerId;
    if (tellerId) filter.tellerId = tellerId;
    if (tellerNo) {
      const resolvedTellerId = await getTellerIdByTellerNo(tellerNo);
      if (!resolvedTellerId) {
        return res.status(404).json({ message: 'Teller not found' });
      }

      filter.tellerId = resolvedTellerId;
    }

    const transactions = await Runner.find(filter)
      .populate('runnerId', 'username tellerNo role')
      .populate('tellerId', 'username tellerNo role')
      .sort({ createdAt: -1 });

    res.json({ transactions: transactions.map(mapTransactionForResponse) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error });
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
router.get('/teller/:tellerNo', async (req, res) => {
  try {
    const { tellerNo } = req.params;
    const { status, transactionType } = req.query;

    const tellerId = await getTellerIdByTellerNo(tellerNo);
    if (!tellerId) {
      return res.status(404).json({ message: 'Teller not found' });
    }

    const filter = { tellerId };
    if (status) filter.status = status;
    if (transactionType) filter.transactionType = transactionType;

    const transactions = await Runner.find(filter)
      .populate('runnerId', 'username tellerNo role')
      .populate('tellerId', 'username tellerNo role')
      .sort({ createdAt: -1 });

    res.json({ transactions: transactions.map(mapTransactionForResponse) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teller transactions', error });
  }
});

// Get current active-event transactions for logged-in teller
router.get('/me/current-event', async (req, res) => {
  try {
    const tellerNo = await getRequesterTellerNo(req);
    if (tellerNo === null) {
      return res.status(400).json({ message: 'Invalid teller number in token' });
    }

    const activeEventId = await getActiveEventId();
    if (!activeEventId) {
      return res.status(404).json({ message: 'No active event found' });
    }

    const transactions = await Runner.find({ eventId: activeEventId, tellerNo })
      .populate('runnerId', 'username tellerNo role')
      .populate('tellerId', 'username tellerNo role')
      .sort({ createdAt: -1 });

    res.json({
      eventId: activeEventId,
      tellerNo,
      transactions: transactions.map(mapTransactionForResponse)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current event transactions', error });
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

    const eventId = await getCurrentEventId();

    const requesterTellerNo = await getRequesterTellerNo(req);

    // Create transaction record
    const transaction = new Runner({
      eventId,
      runnerId: null, // Can be null for unassigned transactions
      tellerId: req.user.userId,
      tellerNo: requesterTellerNo === null ? 0 : requesterTellerNo,
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

    const eventId = await getCurrentEventId();

    // Create transaction record
    const transaction = new Runner({
      eventId,
      runnerId: req.user.userId,
      tellerId,
      tellerNo: typeof teller.tellerNo === 'number' ? teller.tellerNo : 0,
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

    const eventId = await getCurrentEventId();

    // Create transaction record
    const transaction = new Runner({
      eventId,
      runnerId: null, // Runner will be assigned later
      tellerId: teller._id,
      tellerNo: typeof teller.tellerNo === 'number' ? teller.tellerNo : 0,
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

// Get topup/remittance summary by tellerNo and eventId
router.get('/summary', async (req, res) => {
  try {
    const { tellerNo, eventId } = req.query;

    if (!tellerNo || !eventId) {
      return res.status(400).json({ message: 'tellerNo and eventId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid eventId' });
    }

    const teller = await User.findOne({ tellerNo: Number(tellerNo) }).select('tellerNo');
    if (!teller) {
      return res.status(404).json({ message: 'Teller not found' });
    }

    const totals = await Runner.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'tellerId',
          foreignField: '_id',
          as: 'teller'
        }
      },
      {
        $unwind: '$teller'
      },
      {
        $match: {
          'teller.tellerNo': Number(tellerNo),
          eventId: new mongoose.Types.ObjectId(eventId),
          status: 'completed',
          transactionType: { $in: ['topup', 'remit'] }
        }
      },
      {
        $group: {
          _id: '$transactionType',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalTopup = totals.find((t) => t._id === 'topup')?.total || 0;
    const totalRemittance = totals.find((t) => t._id === 'remit')?.total || 0;

    res.json({
      tellerNo: teller.tellerNo,
      eventId,
      totalTopup,
      totalRemittance
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teller summary', error });
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


module.exports = router;
