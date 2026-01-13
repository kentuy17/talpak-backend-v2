const mongoose = require('mongoose');
const BetHistory = require('../models/BetHistory');
const User = require('../models/User');

// MongoDB connection string - update as needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/talpak';

const fightId = '69664ba635f7b01701dc7e02';

// Sample test data for BetHistory
const testBetHistories = [
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'meron',
    amount: 1000,
    payout: 0,
    status: 'pending',
    odds: 1.95
  },
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'wala',
    amount: 1500,
    payout: 0,
    status: 'pending',
    odds: 1.85
  },
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'meron',
    amount: 500,
    payout: 975,
    status: 'won',
    odds: 1.95
  },
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'wala',
    amount: 2000,
    payout: 0,
    status: 'lost',
    odds: 1.85
  },
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'meron',
    amount: 800,
    payout: 0,
    status: 'cancelled',
    odds: 1.95
  },
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'wala',
    amount: 1200,
    payout: 0,
    status: 'pending',
    odds: 1.85
  },
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'meron',
    amount: 3000,
    payout: 5850,
    status: 'won',
    odds: 1.95
  },
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'wala',
    amount: 2500,
    payout: 4625,
    status: 'won',
    odds: 1.85
  },
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'meron',
    amount: 750,
    payout: 0,
    status: 'lost',
    odds: 1.95
  },
  {
    fightId: fightId,
    userId: new mongoose.Types.ObjectId(), // Replace with actual user ID
    betSide: 'wala',
    amount: 1800,
    payout: 0,
    status: 'pending',
    odds: 1.85
  }
];

async function seedBetHistory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing BetHistory for this fight
    await BetHistory.deleteMany({ fightId });
    console.log('Cleared existing BetHistory for fight:', fightId);

    // Insert test data
    const inserted = await BetHistory.insertMany(testBetHistories);
    console.log(inserted);

    console.log(`\nSuccessfully inserted ${inserted.length} BetHistory records`);

    // Display summary
    const summary = await BetHistory.aggregate([
      { $match: { fightId: new mongoose.Types.ObjectId(fightId) } },
      {
        $group: {
          _id: '$betSide',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          totalPayout: { $sum: '$payout' }
        }
      }
    ]);

    console.log('\nSummary by bet side:');
    summary.forEach(item => {
      console.log(`${item._id}: ${item.count} bets, Total: ${item.totalAmount}, Payout: ${item.totalPayout}`);
    });

  } catch (error) {
    console.error('Error seeding BetHistory:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedBetHistory();
