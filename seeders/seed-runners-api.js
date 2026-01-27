require('dotenv').config();
const axios = require('axios');

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Test credentials
const TEST_USER = {
  username: 'teller1',
  password: 'teller1'
};

// Sample transaction data
const transactions = [
  {
    tellerId: '507f1f77bcf86cd799439012',
    amount: 1000.00,
    transactionType: 'remit',
    runnerId: null // Unassigned transaction
  },
  {
    tellerId: '507f1f77bcf86cd799439012',
    amount: 500.50,
    transactionType: 'topup',
    runnerId: null // Unassigned transaction
  },
  {
    tellerId: '507f1f77bcf86cd799439014',
    amount: 2500.75,
    transactionType: 'remit',
    runnerId: '507f1f77bcf86cd799439013' // Assigned runner
  },
  {
    tellerId: '507f1f77bcf86cd799439012',
    amount: 750.25,
    transactionType: 'remit',
    runnerId: null // Unassigned transaction
  },
  {
    tellerId: '507f1f77bcf86cd799439017',
    amount: 3200.00,
    transactionType: 'topup',
    runnerId: '507f1f77bcf86cd799439016' // Assigned runner
  },
  {
    tellerId: '507f1f77bcf86cd799439014',
    amount: 1800.50,
    transactionType: 'remit',
    runnerId: null // Unassigned transaction
  },
  {
    tellerId: '507f1f77bcf86cd799439014',
    amount: 4500.99,
    transactionType: 'topup',
    runnerId: '507f1f77bcf86cd799439019' // Assigned runner
  },
  {
    tellerId: '507f1f77bcf86cd799439017',
    amount: 950.75,
    transactionType: 'topup',
    runnerId: null // Unassigned transaction
  },
  {
    tellerId: '507f1f77bcf86cd799439014',
    amount: 2100.25,
    transactionType: 'remit',
    runnerId: '507f1f77bcf86cd799439022' // Assigned runner
  },
  {
    tellerId: '507f1f77bcf86cd799439017',
    amount: 1500.00,
    transactionType: 'topup',
    runnerId: null // Unassigned transaction
  }
];

async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createTransaction(token, transactionData) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/runners`,
      transactionData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000 // 10 second timeout
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Error ${error.response.status}:`, error.response.data.message);
      if (error.response.data.error) {
        console.error('Details:', error.response.data.error);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
    throw error;
  }
}

async function seedRunners() {
  let token;
  try {
    // Login to get authentication token
    console.log('Logging in...');
    token = await login();
    console.log('Login successful!');

    // Create transactions
    console.log('\nCreating transactions...');
    const results = [];

    for (let i = 0; i < transactions.length; i++) {
      try {
        console.log(`Creating transaction ${i + 1}/${transactions.length}...`);
        const result = await createTransaction(token, transactions[i]);
        results.push(result);
        console.log(`✓ Transaction ${i + 1} created successfully`);
      } catch (error) {
        console.error(`✗ Failed to create transaction ${i + 1}`);
      }
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total transactions attempted: ${transactions.length}`);
    console.log(`Successfully created: ${results.length}`);
    console.log(`Failed: ${transactions.length - results.length}`);

    // Count by status
    const pending = results.filter(r => r.transaction.status === 'pending').length;
    const processing = results.filter(r => r.transaction.status === 'processing').length;

    console.log('\n=== Status Breakdown ===');
    console.log(`Pending (unassigned): ${pending}`);
    console.log(`Processing (assigned): ${processing}`);

  } catch (error) {
    console.error('Error seeding runners:', error);
  }
}

// Run the seeder
seedRunners();
