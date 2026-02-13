const TOPUP = 'topup';
const REMIT = 'remit';
const ROUND_FACTOR = 100;
const BULK_SIZE = 500;

const roundToTwo = (value) => Math.round((value + Number.EPSILON) * ROUND_FACTOR) / ROUND_FACTOR;
const toCurrency = (valueInCents) => roundToTwo((valueInCents || 0) / ROUND_FACTOR);
const toDate = (value) => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

module.exports = {
  async up(db) {
    const runnersCollection = db.collection('runners');
    const fightsCollection = db.collection('fights');
    const betsCollection = db.collection('bethistories');

    await runnersCollection.updateMany(
      { onHand: { $exists: false } },
      { $set: { onHand: 0 } }
    );

    const groupedPairs = await runnersCollection.aggregate([
      {
        $project: {
          eventId: '$eventId',
          tellerNo: { $ifNull: ['$tellerNo', 0] }
        }
      },
      {
        $group: {
          _id: {
            eventId: '$eventId',
            tellerNo: '$tellerNo'
          }
        }
      }
    ]).toArray();

    const uniqueEventIds = [];
    const eventIdSet = new Set();
    for (const pair of groupedPairs) {
      const eventId = pair?._id?.eventId || null;
      if (!eventId) continue;
      const key = String(eventId);
      if (!eventIdSet.has(key)) {
        eventIdSet.add(key);
        uniqueEventIds.push(eventId);
      }
    }

    const fightIdsByEvent = new Map();
    if (uniqueEventIds.length > 0) {
      const fights = await fightsCollection
        .find({ eventId: { $in: uniqueEventIds } }, { projection: { _id: 1, eventId: 1 } })
        .toArray();

      for (const fight of fights) {
        const eventKey = String(fight.eventId);
        if (!fightIdsByEvent.has(eventKey)) {
          fightIdsByEvent.set(eventKey, []);
        }
        fightIdsByEvent.get(eventKey).push(fight._id);
      }
    }

    let bulkOps = [];

    for (const pair of groupedPairs) {
      const eventId = pair?._id?.eventId || null;
      const tellerNo = pair?._id?.tellerNo ?? 0;
      const eventQueryValue = eventId || null;

      const runnerTimeline = await runnersCollection.find(
        { eventId: eventQueryValue, tellerNo },
        { projection: { _id: 1, createdAt: 1 } }
      ).sort({ createdAt: 1, _id: 1 }).toArray();

      if (runnerTimeline.length === 0) {
        continue;
      }

      const eventFightIds = eventId ? (fightIdsByEvent.get(String(eventId)) || []) : [];

      let betsTimeline = [];
      if (eventFightIds.length > 0) {
        betsTimeline = await betsCollection.find(
          { tellerNo, fightId: { $in: eventFightIds } },
          { projection: { amount: 1, payout: 1, createdAt: 1, _id: 1 } }
        ).sort({ createdAt: 1, _id: 1 }).toArray();
      }

      const topupRemitTimeline = await runnersCollection.find(
        {
          eventId: eventQueryValue,
          tellerNo,
          transactionType: { $in: [TOPUP, REMIT] }
        },
        { projection: { amount: 1, transactionType: 1, status: 1, createdAt: 1, _id: 1 } }
      ).sort({ createdAt: 1, _id: 1 }).toArray();

      let betIndex = 0;
      let txIndex = 0;

      let totalBets = 0;
      let totalPayout = 0;
      let totalTopups = 0;
      let totalRemittances = 0;

      for (const runnerDoc of runnerTimeline) {
        const cutoff = toDate(runnerDoc.createdAt) || new Date(8640000000000000);

        while (betIndex < betsTimeline.length) {
          const betCreatedAt = toDate(betsTimeline[betIndex].createdAt);
          if (!betCreatedAt || betCreatedAt > cutoff) {
            break;
          }

          totalBets += toCurrency(betsTimeline[betIndex].amount);
          totalPayout += toCurrency(betsTimeline[betIndex].payout);
          betIndex += 1;
        }

        while (txIndex < topupRemitTimeline.length) {
          const txCreatedAt = toDate(topupRemitTimeline[txIndex].createdAt);
          if (!txCreatedAt || txCreatedAt > cutoff) {
            break;
          }

          const transaction = topupRemitTimeline[txIndex];
          if (transaction.status === 'completed') {
            if (transaction.transactionType === TOPUP) {
              totalTopups += Number(transaction.amount || 0);
            } else if (transaction.transactionType === REMIT) {
              totalRemittances += Number(transaction.amount || 0);
            }
          }

          txIndex += 1;
        }

        const onHand = roundToTwo(
          (totalBets - totalPayout) - (totalTopups - totalRemittances)
        );

        bulkOps.push({
          updateOne: {
            filter: { _id: runnerDoc._id },
            update: { $set: { onHand } }
          }
        });

        if (bulkOps.length >= BULK_SIZE) {
          await runnersCollection.bulkWrite(bulkOps, { ordered: false });
          bulkOps = [];
        }
      }
    }

    if (bulkOps.length > 0) {
      await runnersCollection.bulkWrite(bulkOps, { ordered: false });
    }
  },

  async down(db) {
    const runnersCollection = db.collection('runners');
    await runnersCollection.updateMany({}, { $unset: { onHand: '' } });
  }
};
