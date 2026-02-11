const mongoose = require('mongoose');

const runnerSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameEvent',
    required: false
  },
  runnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  tellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    get: function (v) {
      return Math.round(v * 100) / 100;
    },
    set: function (v) {
      return Math.round(v * 100) / 100;
    }
  },
  transactionType: {
    type: String,
    enum: ['remit', 'topup'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

// Index for efficient queries
runnerSchema.index({ runnerId: 1, createdAt: -1 }, { sparse: true }); // Sparse index allows null values
runnerSchema.index({ tellerId: 1, createdAt: -1 });
runnerSchema.index({ eventId: 1, tellerId: 1, transactionType: 1, status: 1 });
runnerSchema.index({ transactionType: 1 });
runnerSchema.index({ status: 1 });

module.exports = mongoose.model('Runner', runnerSchema);
