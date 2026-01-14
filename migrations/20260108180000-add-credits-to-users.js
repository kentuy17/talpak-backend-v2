module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Add credits field to all users with default value of 0
    await db.collection('users').updateMany(
      { credits: { $exists: false } },
      { $set: { credits: 0 } }
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Remove credits field from all users
    await db.collection('users').updateMany(
      {},
      { $unset: { credits: 0 } }
    );
  }
};
