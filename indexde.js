const axios = require('axios');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const chalk = require('chalk');
const moment = require('moment');

async function getToken() {
  try {
    const token = await fs.readFile('data.txt', 'utf8');
    return token.trim();
  } catch (error) {
    console.error('--> Error creating data.txt file:', error);
    return null;
  }
}

async function getUserBalance(userId) {
  const token = await getToken();
  try {
    const response = await axios.get(`https://hexacore-tg-api.onrender.com/api/balance/${userId}`, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('--> Error fetching user balance:', error);
    return null;
  }
}

async function getAvailableTaps(token) {
  try {
    const response = await axios.get('https://hexacore-tg-api.onrender.com/api/available-taps', {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        Origin: 'https://ago-wallet.hexacore.io',
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    return response.data && response.data.available_taps > 0 ? response.data : null;
  } catch (error) {
    console.error('--> Error in GET /api/available-taps:', error);
    return null;
  }
}

function getUserIdFromToken(token) {
  try {
    const decoded = jwt.decode(token);
    return decoded.user_id;
  } catch (error) {
    console.error('--> Token error:', error);
    return null;
  }
}

async function sleep(seconds = 10) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function getMissions(token) {
  try {
    const response = await axios.get('https://hexacore-tg-api.onrender.com/api/missions', {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        Origin: 'https://ago-wallet.hexacore.io',
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    return response.data ? response.data.filter(mission => !mission.isCompleted) : null;
  } catch (error) {
    console.error('--> Error fetching missions:', error);
    return null;
  }
}

async function completeMissions(token, missions) {
  try {
    for (const mission of missions) {
      const response = await axios.post(
        'https://hexacore-tg-api.onrender.com/api/mission-complete',
        { missionId: mission.id },
        {
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
            Origin: 'https://ago-wallet.hexacore.io',
            Accept: '*/*',
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );
      response.data && response.data.success
        ? logSuccess(`--> Mission ID: ${mission.id} completed.`)
        : console.error('Error completing mission:', response.data);
    }
  } catch (error) {
    logError('--> Error completing missions:', error);
  }
}

async function postMiningComplete(token) {
  try {
    const response = await axios.post(
      'https://hexacore-tg-api.onrender.com/api/mining-complete',
      { taps: 25 },
      {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          Origin: 'https://ago-wallet.hexacore.io',
          Accept: '*/*',
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );
    response.data && response.data.success
      ? logSuccess('--> Mining complete successful.')
      : logError('--> Mining complete failed.');
  } catch (error) {
    logError('--> Error in mining complete:', error);
  }
}

function logError(message, error) {
  console.error(chalk.red(message), error);
}

function logSuccess(message) {
  console.log(chalk.green(message));
}

async function main() {
  const token = await getToken();
  if (!token) {
    console.log('--> No token found, cannot login.');
    return;
  }

  const userId = getUserIdFromToken(token);
  const userBalance = await getUserBalance(userId);

  console.log('=============================');
  console.log('Bot Auto Tap2 Hexacore');
  console.log('Join AirDrop Family IDN');
  console.log('https://t.me/AirdropFamilyIDN');
  console.log('=============================');
  console.log('--> User ID:', userId);
  console.log('--> Balance:', userBalance.balance);

  let allMissionsCompleted = false;
  while (!allMissionsCompleted) {
    const missions = await getMissions(token);
    if (missions && missions.length > 0) {
      console.log(`--> Checking missions, ${missions.length} incomplete.`);
      await completeMissions(token, missions);
    } else {
      console.log('--> All missions completed.');
      allMissionsCompleted = true;
    }
    await sleep(10);
  }

  while (true) {
    const availableTaps = await getAvailableTaps(token);
    if (availableTaps && availableTaps.available_taps > 0) {
      console.log('--> Available taps:', availableTaps.available_taps);
      await postMiningComplete(token);
    } else {
      console.log('--> No taps available for mining.');
    }
    await sleep(10);
  }
}

main();
