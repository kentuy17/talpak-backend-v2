const mongoose = require('mongoose');

const betHistorySchema = new mongoose.Schema({
  fightId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fight',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  betSide: {
    type: String,
    enum: ['meron', 'wala'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  payout: {
    type: Number,
    required: false,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'won', 'lost', 'cancelled'],
    default: 'pending'
  },
  odds: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// Index for efficient queries
betHistorySchema.index({ fightId: 1, userId: 1 });

module.exports = mongoose.model('BetHistory', betHistorySchema);
