require('dotenv').config();

const axios = require('axios');

async function run() {
  const port = process.env.PORT || 3000;
  const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${port}`;

  const version = process.argv[2];
  const file = process.argv[3];
  const changeLogsArg = process.argv[4] || '';
  const isLatestArg = process.argv[5];

  if (!version || !file) {
    console.error('Usage: node scripts/insert-version-api.js <version> <file> [changeLogsCSV] [isLatest]');
    process.exit(1);
  }

  const changeLogs = changeLogsArg
    ? changeLogsArg.split(',').map(item => item.trim()).filter(Boolean)
    : [];

  const isLatest = typeof isLatestArg === 'undefined'
    ? true
    : isLatestArg.toLowerCase() === 'true';

  const payload = {
    version,
    file,
    changeLogs,
    isLatest
  };

  const response = await axios.post(`${apiBaseUrl}/api/version`, payload);
  console.log('Version inserted successfully');
  console.log(JSON.stringify(response.data, null, 2));
}

run().catch((error) => {
  const responseData = error.response?.data;
  if (responseData) {
    console.error('Failed to insert version:', JSON.stringify(responseData, null, 2));
  } else {
    console.error('Failed to insert version:', error.message);
  }
  process.exit(1);
});
