/**
 * Migration to add is_paid field to BetHistory collection
 */

const BetHistory = require('../models/BetHistory');

module.exports = {
  async up(db, client) {
    // Add credits field to all users with default value of 0
    await db.collection('bethistories').updateMany(
      { is_paid: { $exists: false } },
      { $set: { is_paid: false } }
    );
  },

  down: async function () {
    console.log('Rolling back migration: Remove is_paid field from BetHistory...');

    const result = await BetHistory.updateMany(
      {},
      { $unset: { is_paid: '' } }
    );

    console.log(`Rollback completed: Updated ${result.modifiedCount} documents`);
  }
};
