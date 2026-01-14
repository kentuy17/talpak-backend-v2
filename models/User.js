const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  tellerNo: {
    type: Number,
    required: false,
    default: 0
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'cashinTeller', 'cashoutTeller', 'runner', 'controller'],
    default: 'cashinTeller'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  credits: {
    type: Number,
    default: 0,
    min: 0,
    get: function(v) {
      return Math.round(v * 100) / 100;
    },
    set: function(v) {
      return Math.round(v * 100) / 100;
    }
  },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);