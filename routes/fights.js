require('dotenv');
const express = require('express');
const Fight = require('../models/Fight');
const authMiddleware = require('../middleware/auth');
const { getIO } = require('../socket/socketServer');

const router = express.Router();

// services
const { processBetsForFight } = require('../services/betService');
const { processFightClosure } = require('../services/fightService');

// In-memory cache for partial states
// Structure: { fightNo: { meron: boolean, wala: boolean } }
const partialStatesCache = new Map();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all fights by eventId
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const fights = await Fight.find({ eventId })
      .populate('createdBy', 'username role')
      .sort({ fightNumber: 1 });

    res.json(fights);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fights', error });
  }
});

// Get current fight by eventId (sorted by fightNumber desc)
router.get('/current/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const fights = await Fight.find({ eventId })
      .sort({ fightNumber: -1 });

    if (!fights || fights.length === 0) {
      return res.status(404).json({ message: 'No fights found for this event' });
    }

    // Return the most recent fight (highest fightNumber)
    res.json(fights[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current fight', error });
  }
});

// Get fight by id
router.get('/:id', async (req, res) => {
  try {
    const fight = await Fight.findById(req.params.id)
      .populate('eventId');

    if (!fight) {
      return res.status(404).json({ message: 'Fight not found' });
    }

    res.json(fight);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fight', error });
  }
});

// Insert fight
router.post('/', async (req, res) => {
  try {
    const { eventId, meron, wala } = req.body;

    // Check if fight number already exists for this event
    // const existingFight = await Fight.findOne({ fightNumber });
    // if (existingFight) {
    //   return res.status(400).json({ message: 'Fight number already exists for this event' });
    // }

    const lastFight = await Fight.findOne({ eventId }).sort({ fightNumber: -1 });
    if (lastFight && lastFight.status !== 'completed') {
      return res.status(400).json({ message: 'Previous fight is not finished' });
    }

    const fightNumber = lastFight ? lastFight.fightNumber + 1 : 1;

    const fight = new Fight({
      eventId,
      fightNumber,
      meron,
      wala,
      status: 'waiting',
      createdBy: req.user.userId,
    });

    // fight['previousFightWinner'] 
    await fight.save();

    // Emit new fight via Socket.IO
    const io = getIO();

    // Create a plain object with all fight data including virtual fields

    // fightData['previousFightWinner'] = lastFight ? lastFight.winner : null;
    io.emit('fight_update', fight);

    res.status(201).json({
      message: 'Fight created successfully',
      fight
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating fight', error });
  }
});

// Complete current fight
router.patch('/complete', async (req, res) => {
  try {
    const { eventId } = req.body;

    const lastFight = await Fight.findOne({ eventId }).sort({ fightNumber: -1 });
    console.log(lastFight);

    if (!lastFight || lastFight.status === 'completed') {
      return res.status(400).json({ message: 'No current fight to complete' });
    }

    lastFight.status = 'completed';
    await lastFight.save();

    res.json({
      message: 'Fight completed successfully',
      fight: lastFight
    });

  } catch (error) {
    res.status(500).json({ message: 'Error completing fight', error });
  }
})

// Update fight status by id
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const fight = await Fight.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('eventId');

    if (!fight) {
      return res.status(404).json({ message: 'Fight not found' });
    }

    // Emit fight update via Socket.IO
    const io = getIO();

    if (status == 'closed') {
      const processedFight = await processFightClosure(req.params.id);
      console.log(processedFight);
      io.emit('fight_update', processedFight);
    } else {
      io.emit('fight_update', fight);
    }

    res.json({
      message: 'Fight status updated successfully',
      fight
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating fight status', error });
  }
});

// Declare fight winner and create next fight
router.patch('/declare-winner', async (req, res) => {
  try {
    const { fightId, winner, status } = req.body;

    // Validate winner
    const validWinners = ['meron', 'wala', 'draw', 'cancelled'];
    if (!validWinners.includes(winner)) {
      return res.status(400).json({ message: 'Invalid winner value' });
    }

    // Validate status
    const validStatuses = ['completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Find the fight
    const fight = await Fight.findById(fightId);
    if (!fight) {
      return res.status(404).json({ message: 'Fight not found' });
    }

    // Update fight with winner and status
    fight.winner = winner;
    fight.status = status;
    fight.endTime = new Date()
    await fight.save();

    const result = await processBetsForFight(fightId);
    if (result.error) {
      return res.status(500).json({ message: 'Error processing bets', error: result.error });
    }

    // Create next fight
    const lastFight = await Fight.findOne({ eventId: fight.eventId }).sort({ fightNumber: -1 });
    const nextFightNumber = lastFight ? lastFight.fightNumber + 1 : 1;

    const nextFight = new Fight({
      eventId: fight.eventId,
      fightNumber: nextFightNumber,
      meron: 0,
      wala: 0,
      status: 'waiting',
      createdBy: req.user.userId,
    });

    await nextFight.save();

    // Emit fight updates via Socket.IO
    const nextData = { ...nextFight.toObject(), previousFightWinner: lastFight ? lastFight.winner : null };
    const io = getIO();
    io.emit('fight_update', fight);
    io.emit('fight_update', nextData);

    res.status(200).json({
      message: 'Fight winner declared successfully and next fight created',
      completedFight: fight,
      nextFight
    });
  } catch (error) {
    res.status(500).json({ message: 'Error declaring fight winner', error });
  }
});

// Update partial state for a specific side (MERON or WALA)
router.patch('/partial-state', async (req, res) => {
  try {
    const { side, isClosed, fightNo } = req.body;

    // Validate inputs
    if (!side || typeof isClosed !== 'boolean' || !fightNo) {
      return res.status(400).json({ 
        message: 'Missing required fields: side, isClosed, and fightNo are required' 
      });
    }

    if (!['MERON', 'WALA'].includes(side)) {
      return res.status(400).json({ 
        message: 'Invalid side value. Must be either MERON or WALA' 
      });
    }

    // Get or create cache entry for this fight
    if (!partialStatesCache.has(fightNo)) {
      partialStatesCache.set(fightNo, { meron: false, wala: false });
    }

    const state = partialStatesCache.get(fightNo);

    // Update the specific side
    if (side === 'MERON') {
      state.meron = isClosed;
    } else {
      state.wala = isClosed;
    }

    // Emit partial state update via Socket.IO
    const io = getIO();
    io.emit('partial_state_update', {
      fightNo,
      side,
      isClosed,
      timestamp: new Date()
    });

    res.json({
      message: `Partial state updated successfully for ${side}`,
      fightNo,
      state: partialStatesCache.get(fightNo)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating partial state', error });
  }
});

// Get partial states for a specific fight
router.get('/partial-state/:fightNo', async (req, res) => {
  try {
    const { fightNo } = req.params;

    // Check if fight number exists in cache
    if (!partialStatesCache.has(fightNo)) {
      return res.json({
        fightNo: parseInt(fightNo),
        meron: false,
        wala: false
      });
    }

    const state = partialStatesCache.get(fightNo);

    res.json({
      fightNo: parseInt(fightNo),
      meron: state.meron,
      wala: state.wala
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching partial state', error });
  }
});

// Clear partial states for a specific fight (utility endpoint)
router.delete('/partial-state/:fightNo', async (req, res) => {
  try {
    const { fightNo } = req.params;

    if (partialStatesCache.has(fightNo)) {
      partialStatesCache.delete(fightNo);
      
      // Emit cache clear event via Socket.IO
      const io = getIO();
      io.emit('partial_state_cleared', {
        fightNo: parseInt(fightNo),
        timestamp: new Date()
      });

      res.json({
        message: `Partial states cleared for fight ${fightNo}`,
        fightNo: parseInt(fightNo)
      });
    } else {
      res.status(404).json({
        message: `No partial states found for fight ${fightNo}`,
        fightNo: parseInt(fightNo)
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error clearing partial state', error });
  }
});

// Get all partial states (admin utility endpoint)
router.get('/partial-state', async (req, res) => {
  try {
    const allStates = {};
    partialStatesCache.forEach((value, key) => {
      allStates[key] = value;
    });

    res.json({
      total: partialStatesCache.size,
      states: allStates
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all partial states', error });
  }
});

module.exports = router;
