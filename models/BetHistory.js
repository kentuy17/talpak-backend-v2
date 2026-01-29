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
    get: v => (v / 100).toFixed(2),
    set: v => Math.round(v * 100),
    required: true,
    min: 0
  },
  payout: {
    type: Number,
    get: v => (v / 100).toFixed(2),
    set: v => Math.round(v * 100),
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
    default: 1,
    required: true
  },
  is_paid: {
    type: Boolean,
    default: false
  },
  betCode: {
    type: String,
    sparse: true
  }

}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } });

// Index for efficient queries
betHistorySchema.index({ fightId: 1, userId: 1 });
betHistorySchema.index({ betCode: 1 }, { sparse: true });

module.exports = mongoose.model('BetHistory', betHistorySchema);
