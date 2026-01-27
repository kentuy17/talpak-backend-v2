const Fight = require('../models/Fight');
const BetHistory = require('../models/BetHistory');

/**
 * Service to handle fight status changes
 */

/**
 * Process fight when status is changed to 'closed'
 * Aggregates bets by side and updates fight meron and wala columns
 * @param {string} fightId - The ID of the fight
 */
async function processFightClosure(fightId) {
  try {
    // Find the fight
    const fight = await Fight.findById(fightId);
    if (!fight) {
      throw new Error('Fight not found');
    }

    // Check if status is being changed to 'closed'
    if (fight.status !== 'closed') {
      return fight;
    }

    // Aggregate bets by betSide for this fight
    const betAggregations = await BetHistory.aggregate([
      { $match: { fightId: fight._id } },
      {
        $group: {
          _id: '$betSide',
          totalAmount: { $sum: '$amount' },
          totalBets: { $sum: 1 }
        }
      }
    ]);

    // Initialize totals
    let meronTotal = 0;
    let walaTotal = 0;

    // Process aggregation results
    betAggregations.forEach(aggregation => {
      console.log(aggregation.totalAmount);

      if (aggregation._id === 'meron') {
        meronTotal = aggregation.totalAmount / 100;
      } else if (aggregation._id === 'wala') {
        walaTotal = aggregation.totalAmount / 100;
      }
    });

    // Update fight with aggregated totals
    const updatedFight = await Fight.findByIdAndUpdate(
      fightId,
      {
        $set: {
          meron: meronTotal,
          wala: walaTotal
        }
      },
      { new: true }
    );

    // Check if this is the current/last fight for the event
    const lastFight = await Fight.findOne({ eventId: updatedFight.eventId })
      .sort({ fightNumber: -1 });

    // Only update odds if this is the current/last fight
    if (lastFight && lastFight._id.toString() === updatedFight._id.toString()) {
      // Update odds for all bets based on their betSide
      await BetHistory.updateMany(
        { fightId: fightId, betSide: 'meron' },
        { $set: { odds: updatedFight.percentageMeron } }
      );

      await BetHistory.updateMany(
        { fightId: fightId, betSide: 'wala' },
        { $set: { odds: updatedFight.percentageWala } }
      );
    }

    return updatedFight;
  } catch (error) {
    console.error('Error processing fight closure:', error);
    throw error;
  }
}

/**
 * Update fight status and trigger processing if closed
 * @param {string} fightId - The ID of the fight
 * @param {string} newStatus - The new status to set
 */
async function updateFightStatus(fightId, newStatus) {
  try {
    // Update the fight status
    const fight = await Fight.findByIdAndUpdate(
      fightId,
      { $set: { status: newStatus } },
      { new: true }
    );

    if (!fight) {
      throw new Error('Fight not found');
    }

    // If status is 'closed', process the fight
    if (newStatus === 'closed') {
      return await processFightClosure(fightId);
    }

    return fight;
  } catch (error) {
    console.error('Error updating fight status:', error);
    throw error;
  }
}

module.exports = {
  processFightClosure,
  updateFightStatus
};
