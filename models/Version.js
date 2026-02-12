const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    trim: true
  },
  file: {
    type: String,
    required: true,
    trim: true
  },
  changeLogs: {
    type: [String],
    default: []
  },
  isLatest: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Version', versionSchema);
