const BetHistory = require('../models/BetHistory');
const Fight = require('../models/Fight');
const User = require('../models/User');
const Runner = require('../models/Runner');
const GameEvent = require('../models/GameEvent');

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

const roundToTwo = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Get teller on-hand amount for active event.
 * onHand = (total_bets - total_payout) - (total_topups - total_remittances)
 * @param {number|string} tellerNo
 * @returns {Promise<Object>}
 */
async function getTellerOnHandByActiveEvent(tellerNo) {
  const tellerNoAsNumber = Number(tellerNo);

  if (Number.isNaN(tellerNoAsNumber)) {
    throw new Error('Invalid tellerNo');
  }

  const activeEvent = await GameEvent.findOne({ status: 'ongoing' }).select('_id').lean();

  if (!activeEvent) {
    return {
      eventId: null,
      tellerNo: tellerNoAsNumber,
      totalBets: 0,
      totalPayout: 0,
      totalTopups: 0,
      totalRemittances: 0,
      onHand: 0
    };
  }

  const fights = await Fight.find({ eventId: activeEvent._id }).select('_id').lean();
  const fightIds = fights.map((fight) => fight._id);

  let totalBets = 0;
  let totalPayout = 0;

  if (fightIds.length > 0) {
    const [betTotals] = await BetHistory.aggregate([
      {
        $match: {
          tellerNo: tellerNoAsNumber,
          fightId: { $in: fightIds }
        }
      },
      {
        $group: {
          _id: null,
          totalBets: { $sum: '$amount' },
          totalPayout: { $sum: '$payout' }
        }
      }
    ]);

    // BetHistory monetary fields are stored in cents in MongoDB.
    totalBets = roundToTwo((betTotals?.totalBets || 0) / 100);
    totalPayout = roundToTwo((betTotals?.totalPayout || 0) / 100);
  }

  const runnerTotals = await Runner.aggregate([
    {
      $match: {
        eventId: activeEvent._id,
        tellerNo: tellerNoAsNumber,
        status: 'completed',
        transactionType: { $in: ['topup', 'remit'] }
      }
    },
    {
      $group: {
        _id: '$transactionType',
        total: { $sum: '$amount' }
      }
    }
  ]);

  const totalsMap = runnerTotals.reduce((acc, item) => {
    acc[item._id] = item.total;
    return acc;
  }, {});

  const totalTopups = roundToTwo(totalsMap.topup || 0);
  const totalRemittances = roundToTwo(totalsMap.remit || 0);

  // (cashin - cashout) + (topup - remit)
  const onHand = roundToTwo(
    (totalBets - totalPayout) + (totalTopups - totalRemittances)
  );

  return {
    eventId: activeEvent._id,
    tellerNo: tellerNoAsNumber,
    totalBets,
    totalPayout,
    totalTopups,
    totalRemittances,
    onHand
  };
}

module.exports = {
  processBetsForFight,
  getTellerOnHandByActiveEvent
};
