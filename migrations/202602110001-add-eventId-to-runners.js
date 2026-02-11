module.exports = {
  async up(db) {
    await db.collection('runners').updateMany(
      { eventId: { $exists: false } },
      { $set: { eventId: null } }
    );

    await db.collection('runners').createIndex(
      { eventId: 1, tellerId: 1, transactionType: 1, status: 1 },
      { name: 'eventId_1_tellerId_1_transactionType_1_status_1' }
    );
  },

  async down(db) {
    await db.collection('runners').updateMany(
      {},
      { $unset: { eventId: '' } }
    );

    await db.collection('runners').dropIndex('eventId_1_tellerId_1_transactionType_1_status_1');
  }
};
