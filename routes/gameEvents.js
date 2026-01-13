const express = require('express');
const GameEvent = require('../models/GameEvent');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/game-events
 * Get all events
 * */
router.get('/', async (req, res) => {
  try {
    const events = await GameEvent.find()
      .populate('createdBy', 'username role')
      .sort({ eventDate: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events', error });
  }
});


/**
 * GET /api/game-events/active 
 * Get the currently active (ongoing) event 
 **/
router.get('/active', async (req, res) => {
  try {
    const activeEvent = await GameEvent.findOne({ status: 'ongoing' })
      .populate('createdBy', 'username role');

    if (!activeEvent) {
      return res.status(404).json({ message: 'No active event found' });
    }

    res.json(activeEvent);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active event', error });
  }
});

// POST /api/game-events 
// Create new event
router.post('/', async (req, res) => {
  try {
    const { eventName, eventDate, location } = req.body;

    const event = new GameEvent({
      eventName,
      eventDate: eventDate || new Date(),
      location,
      createdBy: req.user.userId
    });

    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating event', error });
  }
});

/**
 * PATCH /api/game-events/:id/activate
 * Activate event by setting status to 'ongoing'
 * */
router.patch('/:id/activate', async (req, res) => {
  try {
    // First, set all ongoing events to completed
    await GameEvent.updateMany(
      { status: 'ongoing' },
      { status: 'completed' }
    );

    // Then activate the requested event
    const event = await GameEvent.findByIdAndUpdate(
      req.params.id,
      { status: 'ongoing' },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username role');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      message: 'Event activated successfully',
      event
    });
  } catch (error) {
    res.status(500).json({ message: 'Error activating event', error });
  }
});

/**
 * PUT /api/game-events/:id
 * Update event by ID
 * */
router.put('/:id', async (req, res) => {
  try {
    const { eventName, eventDate, location, status } = req.body;

    const event = await GameEvent.findByIdAndUpdate(
      req.params.id,
      { eventName, eventDate, location, status },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username role');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating event', error });
  }
});

module.exports = router;
