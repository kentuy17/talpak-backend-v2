module.exports = {
  async up(db) {
    // Create users collection
    await db.createCollection('users');

    // Create indexes
    await db.collection('users').createIndex(
      { username: 1 },
      { unique: true }
    );
    await db.collection('users').createIndex(
      { tellerNo: 1 },
      { unique: false }
    );
  },

  async down(db) {
    await db.collection('users').drop();
  }
};