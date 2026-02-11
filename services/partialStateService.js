// In-memory cache for partial states
// Structure: { fightNo: { meron: boolean, wala: boolean } }
const partialStatesCache = new Map();

function getPartialState(fightNo) {
    if (!partialStatesCache.has(fightNo)) {
        return { meron: false, wala: false };
    }
    return partialStatesCache.get(fightNo);
}

function updatePartialState(fightNo, side, isClosed) {
    if (!partialStatesCache.has(fightNo)) {
        partialStatesCache.set(fightNo, { meron: false, wala: false });
    }

    const state = partialStatesCache.get(fightNo);

    if (side.toLowerCase() === 'meron') {
        state.meron = isClosed;
    } else if (side.toLowerCase() === 'wala') {
        state.wala = isClosed;
    }
}

function clearPartialState(fightNo) {
    if (partialStatesCache.has(fightNo)) {
        partialStatesCache.delete(fightNo);
    }
}

function getAllPartialStates() {
    const allStates = {};
    partialStatesCache.forEach((value, key) => {
      allStates[key] = value;
    });
    return {
        total: partialStatesCache.size,
        states: allStates
    };
}

module.exports = {
    getPartialState,
    updatePartialState,
    clearPartialState,
    getAllPartialStates,
    // also export the map for direct access if needed, e.g. for iteration
    partialStatesCache 
};
