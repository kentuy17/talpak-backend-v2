const express = require('express');
const Version = require('../models/Version');

const router = express.Router();

// POST /api/version
router.post('/', async (req, res) => {
  try {
    const { version, file, changeLogs = [], isLatest = true } = req.body;

    if (!version || !file) {
      return res.status(400).json({ message: 'version and file are required' });
    }

    if (!Array.isArray(changeLogs)) {
      return res.status(400).json({ message: 'changeLogs must be an array of strings' });
    }

    if (isLatest) {
      await Version.updateMany({ isLatest: true }, { $set: { isLatest: false } });
    }

    const newVersion = await Version.create({
      version,
      file,
      changeLogs,
      isLatest
    });

    res.status(201).json({
      message: 'Version created successfully',
      version: newVersion
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating version', error });
  }
});

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
