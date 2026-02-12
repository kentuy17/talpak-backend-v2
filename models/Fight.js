const mongoose = require('mongoose');

const COMMISSION = 5

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
}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } });

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // The name of the collection/sequence
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

const percentage = (side, totalSum) => {
  if (side == 0) return parseFloat(0).toFixed(2);
  // console.log(side, 'side');
  const comm = (totalSum) => (totalSum * Number.parseFloat(COMMISSION)) / 100;
  const win = totalSum - comm(totalSum);
  return parseFloat((win / parseInt(side)) * 100).toFixed(2);
};

// Index for efficient queries
fightSchema.index({ eventId: 1, fightNumber: 1 }, { unique: true });

// fightSchema.index({ eventId: 1, startTime: 1 });

// Virtual field for calculating the total amount of money bet on the fight
fightSchema.virtual('totalAmount').get(function () {
  const vMeron = parseInt(this.meron)
  const vWala = parseInt(this.wala)
  return vMeron + vWala;
});

// Virtual field for calculating the percentage of money bet on meron
fightSchema.virtual('percentageMeron').get(function () {
  const vMeron = parseInt(this.meron)
  // const vWala = parseInt(this.wala)
  // const totalSum = vMeron + vWala
  // console.log({ totalSum: this.totalAmount, fightNum: this.fightNumber });
  const percent = percentage(vMeron, this.totalAmount)
  return percent;
});

// Virtual field for calculating the percentage of money bet on wala
fightSchema.virtual('percentageWala').get(function () {
  // const vMeron = parseInt(this.meron)
  const vWala = parseInt(this.wala)
  // const totalSum = vMeron + vWala
  const percent = percentage(vWala, this.totalAmount);
  return percent
})

// Virtual field to get the winner of the previous fight
fightSchema.virtual('previousFightWinner').get(function () {
  // This is a synchronous virtual field that returns a placeholder
  // The actual data should be populated in the query
  return null;
})




module.exports = mongoose.model('Fight', fightSchema);
