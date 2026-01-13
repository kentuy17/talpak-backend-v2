const mongoose = require('mongoose');

const fightSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameEvent',
    required: true
  },
  fightNumber: {
    type: Number,
    required: false,
  },
  meron: {
    type: Number,
    get: v => (v / 100).toFixed(2),
    set: v => Math.round(v * 100),
    default: 0
  },
  wala: {
    type: Number,
    get: v => (v / 100).toFixed(2),
    set: v => Math.round(v * 100),
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'completed', 'cancelled', 'waiting'],
    default: 'waiting'
  },
  winner: {
    type: String,
    enum: ['meron', 'wala', 'draw', 'cancelled'],
    required: false
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: false
  }
}, { timestamps: true });

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // The name of the collection/sequence
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);


// Index for efficient queries
fightSchema.index({ eventId: 1, fightNumber: 1 }, { unique: true });

// fightSchema.index({ eventId: 1, startTime: 1 });

// Virtual field for calculating the total amount of money bet on the fight
fightSchema.virtual('totalAmount').get(function () {
  return this.meron + this.wala;
});

// Virtual field for calculating the percentage of money bet on meron
fightSchema.virtual('percentageMeron').get(function () {
  return (this.meron / this.totalAmount) * 100;
});

// Virtual field for calculating the percentage of money bet on wala
fightSchema.virtual('percentageWala').get(function () {
  return (this.wala / this.totalAmount) * 100;
})




module.exports = mongoose.model('Fight', fightSchema);
