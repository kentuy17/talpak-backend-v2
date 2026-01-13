module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Add createdBy field to existing fights
    await db.collection('fights').updateMany(
      { createdBy: { $exists: false } },
      { $set: { createdBy: null } }
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Remove createdBy field
    await db.collection('fights').updateMany(
      {},
      { $unset: { createdBy: null } }
    );
  }
};
