const mongoose = require('mongoose');
const Runner = require('../models/Runner');
const User = require('../models/User');

// MongoDB connection string - update as needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/talpak';

// Sample test data for Runner transactions
const testRunners = [
  {
    runnerId: null, // Unassigned transaction
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
    amount: 1000.00,
    transactionType: 'remit',
    status: 'pending'
  },
  {
    runnerId: null, // Unassigned transaction
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
    amount: 500.50,
    transactionType: 'topup',
    status: 'pending'
  },
  {
    runnerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'), // Assigned runner
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
    amount: 2500.75,
    transactionType: 'remit',
    status: 'processing'
  },
  {
    runnerId: null, // Unassigned transaction
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
    amount: 750.25,
    transactionType: 'remit',
    status: 'pending'
  },
  {
    runnerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439016'), // Assigned runner
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439017'),
    amount: 3200.00,
    transactionType: 'topup',
    status: 'completed'
  },
  {
    runnerId: null, // Unassigned transaction
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
    amount: 1800.50,
    transactionType: 'remit',
    status: 'pending'
  },
  {
    runnerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439019'), // Assigned runner
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
    amount: 4500.99,
    transactionType: 'topup',
    status: 'completed'
  },
  {
    runnerId: null, // Unassigned transaction
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439017'),
    amount: 950.75,
    transactionType: 'topup',
    status: 'pending'
  },
  {
    runnerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439022'), // Assigned runner
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
    amount: 2100.25,
    transactionType: 'remit',
    status: 'completed'
  },
  {
    runnerId: null, // Unassigned transaction
    tellerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439017'),
    amount: 1500.00,
    transactionType: 'topup',
    status: 'pending'
  }
];

async function seedRunners() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing Runner data
    await Runner.deleteMany({});
    console.log('Cleared existing Runner data');

    // Insert test data
    const inserted = await Runner.insertMany(testRunners);
    console.log(inserted);

    console.log(`\nSuccessfully inserted ${inserted.length} Runner records`);

    // Display summary by status
    const summaryByStatus = await Runner.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    console.log('\nSummary by status:');
    summaryByStatus.forEach(item => {
      console.log(`${item._id}: ${item.count} transactions, Total: ${item.totalAmount.toFixed(2)}`);
    });

    // Display summary by transaction type
    const summaryByType = await Runner.aggregate([
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    console.log('\nSummary by transaction type:');
    summaryByType.forEach(item => {
      console.log(`${item._id}: ${item.count} transactions, Total: ${item.totalAmount.toFixed(2)}`);
    });

    // Display assignment summary
    const assignedCount = await Runner.countDocuments({ runnerId: { $ne: null } });
    const unassignedCount = await Runner.countDocuments({ runnerId: null });

    console.log('\nAssignment summary:');
    console.log(`Assigned transactions: ${assignedCount}`);
    console.log(`Unassigned transactions: ${unassignedCount}`);

  } catch (error) {
    console.error('Error seeding Runners:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedRunners();
