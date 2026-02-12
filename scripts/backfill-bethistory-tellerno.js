require('dotenv').config();

const mongoose = require('mongoose');
const BetHistory = require('../models/BetHistory');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI;
const BATCH_SIZE = 500;

async function backfillBetHistoryTellerNo() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const userCache = new Map();
  const bulkOps = [];
  let scanned = 0;
  let updated = 0;

  const zeroTellerFilter = { tellerNo: { $in: [0, '0'] } };

  const cursor = BetHistory.find(zeroTellerFilter, { _id: 1, userId: 1, tellerNo: 1 })
    .lean()
    .cursor();

  for await (const bet of cursor) {
    scanned += 1;

    const userId = bet.userId ? String(bet.userId) : null;
    if (!userId) {
      continue;
    }

    if (!userCache.has(userId)) {
      const user = await User.findById(bet.userId).select('tellerNo').lean();
      userCache.set(userId, typeof user?.tellerNo === 'number' ? user.tellerNo : 0);
    }
    const tellerNo = userCache.get(userId);

    bulkOps.push({
      updateOne: {
        filter: { _id: bet._id, ...zeroTellerFilter },
        update: { $set: { tellerNo } }
      }
    });
    updated += 1;

    if (bulkOps.length === BATCH_SIZE) {
      await BetHistory.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
      console.log(`Processed ${scanned} bets so far...`);
    }
  }

  if (bulkOps.length > 0) {
    await BetHistory.bulkWrite(bulkOps, { ordered: false });
  }

  console.log(`Completed. Scanned: ${scanned}, Updated: ${updated}`);
}

backfillBetHistoryTellerNo()
  .catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  });
