require('dotenv').config();
const axios = require('axios');

// Configuration
const PORT = process.env.PORT || 3000;
const API_ENDPOINT = `${process.env.API_BASE_URL}:${PORT}/api`
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;
const FIGHT_ID = '69664ba635f7b01701dc7e02';

// Helper function to generate random integer between min and max
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate random float with 2 decimal places
function getRandomFloat(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

// Helper function to generate random bet side
function getRandomBetSide() {
  return Math.random() < 0.5 ? 'meron' : 'wala';
}

// Helper function to generate random status
function getRandomStatus() {
  const statuses = ['pending', 'won', 'lost', 'cancelled'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// Generate a single bet
function generateBet() {
  const betSide = getRandomBetSide();
  const amount = getRandomFloat(500, 5000);
  const odds = getRandomFloat(1.5, 2.5);
  const payout = getRandomStatus() === 'won' ? (parseFloat(amount) * parseFloat(odds)).toFixed(2) : 0;

  return {
    fightId: FIGHT_ID,
    betSide: betSide,
    amount: parseFloat(amount),
    payout: parseFloat(payout),
    status: getRandomStatus(),
    odds: parseFloat(odds)
  };
}

// Function to insert bets with delay
async function insertBetsWithDelay(numBets, delayMs = 1000) {
  const axiosInstance = axios.create({
    baseURL: API_ENDPOINT,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  let successCount = 0;
  let failureCount = 0;

  console.log(`\nStarting to insert ${numBets} bets with ${delayMs}ms delay between each bet...\n`);

  for (let i = 0; i < numBets; i++) {
    try {
      const bet = generateBet();
      console.log(`[${i + 1}/${numBets}] Inserting bet:`, JSON.stringify(bet, null, 2));
      const response = await axiosInstance.post('/bet-history', bet);

      if (response.status === 201) {
        successCount++;
        console.log(`✓ Bet inserted successfully\n`);
      }
    } catch (error) {
      failureCount++;
      console.error(
        `✗ Failed to insert bet ${i + 1}:`,
        // error.response ? error.response.data : error.message,
        JSON.stringify(error, null, 2),
        '\n'
      );
    }

    // Add delay between requests (except for the last one)
    if (i < numBets - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total bets attempted: ${numBets}`);
  console.log(`Successful insertions: ${successCount}`);
  console.log(`Failed insertions: ${failureCount}`);
  console.log(`Success rate: ${((successCount / numBets) * 100).toFixed(2)}%\n`);
}

// Main function to run the simulation
async function runSimulation() {
  if (!AUTH_TOKEN) {
    console.error('Error: TEST_AUTH_TOKEN is not set in .env file');
    process.exit(1);
  }

  // Get number of bets from command line argument or use default
  const numBets = parseInt(process.argv[2]) || getRandomInt(5, 20);
  const delayMs = parseInt(process.argv[3]) || 1000;

  console.log('=== Bet Simulation Script ===');
  console.log(`API Base URL: ${API_ENDPOINT}`);
  console.log(`Fight ID: ${FIGHT_ID}`);
  console.log(`Number of bets: ${numBets}`);
  console.log(`Delay between bets: ${delayMs}ms`);

  await insertBetsWithDelay(numBets, delayMs);
}

// Run the simulation
runSimulation().catch(error => {
  console.error('Simulation failed:', error);
  process.exit(1);
});
