const BetHistory = require('../models/BetHistory');
const Fight = require('../models/Fight');
const User = require('../models/User');

/**
 * Process all bets for a fight and calculate payouts based on odds
 * @param {string} fightId - The ID of the fight to process
 * @returns {Promise<Object>} - Returns summary of processed bets
 */
async function processBetsForFight(fightId) {
  try {
    // Get the fight details
    const fight = await Fight.findById(fightId);
    if (!fight) {
      throw new Error('Fight not found');
    }

    // Get all pending bets for this fight
    const bets = await BetHistory.find({
      fightId: fightId,
      status: 'pending'
    });

    if (bets.length === 0) {
      return {
        message: 'No pending bets found for this fight',
        fightId,
        processedBets: 0,
        totalPayout: 0
      };
    }

    const { winner } = fight;
    let processedBets = 0;
    let totalPayout = 0;

    // Process each bet
    for (const bet of bets) {
      let payout = 0;
      let status = 'lost';

      if (winner === 'draw' || winner === 'cancelled') {
        // For draw or cancelled, return the bet amount
        payout = bet.amount;
        status = winner;
      } else if (winner === bet.betSide) {
        // Winning bet: calculate payout based on odds
        // Payout = bet amount * odds
        payout = bet.amount * (bet.odds / 100);
        status = 'won';
      } else {
        // Losing bet: no payout
        payout = 0;
        status = 'lost';
      }

      // Update bet status and payout
      bet.status = status;
      bet.payout = payout;
      await bet.save();

      // Update user balance if they won or bet was cancelled/draw
      if (status === 'won' || status === 'cancelled') {
        const user = await User.findById(bet.userId);
        if (user) {
          user.balance += payout;
          await user.save();
        }
      }

      processedBets++;
      totalPayout += payout;
    }

    return {
      message: 'Bets processed successfully',
      fightId,
      winner,
      processedBets,
      totalPayout
    };

  } catch (error) {
    console.error('Error processing bets:', error);
    throw error;
  }
}

module.exports = {
  processBetsForFight
};
