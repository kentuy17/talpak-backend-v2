module.exports = {
  async up(db) {
    const usersCollection = db.collection('users');
    const runnersCollection = db.collection('runners');

    await runnersCollection.updateMany(
      { tellerNo: { $exists: false } },
      { $set: { tellerNo: 0 } }
    );

    const cursor = runnersCollection.find(
      {},
      { projection: { _id: 1, tellerId: 1, tellerNo: 1 } }
    );

    const tellerCache = new Map();
    const bulkOps = [];

    while (await cursor.hasNext()) {
      const runner = await cursor.next();
      const tellerId = runner.tellerId ? String(runner.tellerId) : null;
      let tellerNo = 0;

      if (tellerId) {
        if (!tellerCache.has(tellerId)) {
          const user = await usersCollection.findOne(
            { _id: runner.tellerId },
            { projection: { tellerNo: 1 } }
          );
          tellerCache.set(tellerId, typeof user?.tellerNo === 'number' ? user.tellerNo : 0);
        }
        tellerNo = tellerCache.get(tellerId);
      }

      if (runner.tellerNo !== tellerNo) {
        bulkOps.push({
          updateOne: {
            filter: { _id: runner._id },
            update: { $set: { tellerNo } }
          }
        });
      }

      if (bulkOps.length === 500) {
        await runnersCollection.bulkWrite(bulkOps, { ordered: false });
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0) {
      await runnersCollection.bulkWrite(bulkOps, { ordered: false });
    }

    await runnersCollection.createIndex(
      { eventId: 1, tellerNo: 1, createdAt: -1 },
      { name: 'eventId_1_tellerNo_1_createdAt_-1' }
    );
  },

  async down(db) {
    const runnersCollection = db.collection('runners');

    await runnersCollection.updateMany({}, { $unset: { tellerNo: '' } });

    try {
      await runnersCollection.dropIndex('eventId_1_tellerNo_1_createdAt_-1');
    } catch (error) {
      if (error.codeName !== 'IndexNotFound') {
        throw error;
      }
    }
  }
};
