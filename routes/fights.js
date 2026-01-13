const express = require('express');
const Fight = require('../models/Fight');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
