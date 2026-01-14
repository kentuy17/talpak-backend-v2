const express = require('express');
const Fight = require('../models/Fight');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// services
const { processBetsForFight } = require('../services/betService');

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
      createdBy: req.user.userId
    });

    await fight.save();

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
      createdBy: req.user.userId
    });

    await nextFight.save();

    res.status(200).json({
      message: 'Fight winner declared successfully and next fight created',
      completedFight: fight,
      nextFight
    });
  } catch (error) {
    res.status(500).json({ message: 'Error declaring fight winner', error });
  }
});

module.exports = router;
