const express = require('express');
const Version = require('../models/Version');

const router = express.Router();

// GET /api/version/latest
router.get('/latest', async (req, res) => {
  try {
    const latestVersion = await Version.findOne()
      .sort({ createdAt: -1 })
      .lean();

    if (!latestVersion) {
      return res.status(404).json({ message: 'No version found' });
    }

    res.json(latestVersion);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching latest version', error });
  }
});

module.exports = router;
