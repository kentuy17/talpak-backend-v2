module.exports = {
  async up(db) {
    // Add default password field to existing users
    await db.collection('users').updateMany(
      { password: { $exists: false } },
      { $set: { password: '' } }
    );
  },

  async down(db) {
    // Remove password field
    await db.collection('users').updateMany(
      {},
      { $unset: { password: '' } }
    );
  }
};