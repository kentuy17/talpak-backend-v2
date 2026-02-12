module.exports = {
  async up(db) {
    const usersCollection = db.collection('users');
    const betsCollection = db.collection('bethistories');

    const cursor = betsCollection.find({}, { projection: { _id: 1, userId: 1 } });
    const tellerCache = new Map();
    const bulkOps = [];

    while (await cursor.hasNext()) {
      const bet = await cursor.next();
      const userId = bet.userId ? String(bet.userId) : null;
      let tellerNo = 0;

      if (userId) {
        if (!tellerCache.has(userId)) {
          const user = await usersCollection.findOne(
            { _id: bet.userId },
            { projection: { tellerNo: 1 } }
          );
          tellerCache.set(userId, typeof user?.tellerNo === 'number' ? user.tellerNo : 0);
        }
        tellerNo = tellerCache.get(userId);
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: bet._id },
          update: { $set: { tellerNo } }
        }
      });
      if (bulkOps.length === 500) {
        await betsCollection.bulkWrite(bulkOps, { ordered: false });
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0) {
      await betsCollection.bulkWrite(bulkOps, { ordered: false });
    }

    await betsCollection.createIndex(
      { tellerNo: 1, fightId: 1 },
      { name: 'tellerNo_1_fightId_1' }
    );
  },

  async down(db) {
    const betsCollection = db.collection('bethistories');

    await betsCollection.updateMany({}, { $unset: { tellerNo: '' } });

    try {
      await betsCollection.dropIndex('tellerNo_1_fightId_1');
    } catch (error) {
      if (error.codeName !== 'IndexNotFound') {
        throw error;
      }
    }
  }
};
