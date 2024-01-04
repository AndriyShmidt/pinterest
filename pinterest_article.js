import fetch from 'node-fetch';

const code = 'e1ab2bc36cedacb43d8bad7507e6705a38a5e7ec';
let tokenData;

// Get access token 

async function fetchOAuthToken(code) {
  const url = 'https://api.pinterest.com/v5/oauth/token';

  const headers = {
      'Authorization': 'Basic MTQ5NDI3NjpiNGRmNTc1N2ZmNzM2YTVjMmE4YjZkMWYzZGM0OGM3NzQwNWIzOGIy',
      'Content-Type': 'application/x-www-form-urlencoded'
  };

  const body = new URLSearchParams({
      'grant_type': 'authorization_code',
      'code': code,
      'redirect_uri': 'https://sportscore.io/'
  });

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: body
      });
      tokenData = await response.json();
  } catch (error) {
      console.error('Error:', error);
  }
}

async function ff() {
  try {
      await fetchOAuthToken(code);
      console.log('Token Data:', tokenData);
  } catch (error) {
      console.error('Error in fetching token:', error);
  }
};

ff();

//Refresh token every 28 day

async function refreshPinterestToken(tokenData) {
  const url = 'https://api.pinterest.com/v5/oauth/token';

  const headers = {
      'Authorization': 'Basic MTQ5NDI3NjpiNGRmNTc1N2ZmNzM2YTVjMmE4YjZkMWYzZGM0OGM3NzQwNWIzOGIy',
      'Content-Type': 'application/x-www-form-urlencoded'
  };

  const body = new URLSearchParams({
      'grant_type': 'refresh_token',
      'refresh_token': tokenData.refresh_token,
      'scope': 'boards:read',
      'refresh_on': 'true'
  });

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: body
      });
      tokenData = await response.json();
      console.log('Refreshed Token Data:', tokenData);
  } catch (error) {
      console.error('Error in refreshing token:', error);
  }
}

function scheduleTokenRefresh() {
  const days = 28;
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  setTimeout(async () => {
      try {
          await refreshPinterestToken(tokenData);
          scheduleTokenRefresh();
      } catch (error) {
          console.error('Failed to refresh token:', error);
      }
  }, days * millisecondsPerDay);
}

scheduleTokenRefresh();

//create boards
function createBoardsToPinterest() {
    const today = new Date();
    if (today.getDate() === 1) {
        const monthNames = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[today.getMonth()];

        const url = 'https://api.pinterest.com/v5/boards';
        const data = {
            name: `${monthName} Recipes`,
            description: `My favorite recipes for ${monthName}`,
            privacy: "PUBLIC"
        };

        const headers = {
            'Authorization': 'Bearer <Add your token here>',
            'Content-Type': 'application/json'
        };

        fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => console.log('Success:', data))
        .catch((error) => console.error('Error:', error));
    }
}

setInterval(createBoardsToPinterest, 24 * 60 * 60 * 1000);

// get boards

async function getBoards(accessToken) {
  const url = 'https://api.pinterest.com/v1/me/boards/';

  const headers = {
      'Authorization': `Bearer ${accessToken}`
  };

  try {
      const response = await fetch(url, { headers: headers });
      const data = await response.json();
      console.log('Boards:', data.items[0]);
      return data;
  } catch (error) {
      console.error('Error in getting boards:', error);
  }
}

// Post on printest

async function createPinterestPin(token, boardId, title, description, imageUrl) {
    const url = 'https://api.pinterest.com/v5/pins';

    const data = {
        title: title,
        description: description,
        board_id: boardId,
        media_source: {
            source_type: "image_url",
            url: imageUrl
        }
    };

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        const responseData = await response.json();
        console.log('Success:', responseData);
    } catch (error) {
        console.error('Error:', error);
    }
}


//Start post pinterest
async function processItem(item, match) {
  if (Number(item.state_display) && Number(item.state_display) < 2) {
      const homeTeamName = item.home_team?.name || '';
      const awayTeamName = item.away_team?.name || '';
      const competitionName = match.competition?.name || '';
      const venueName = item.venue?.name || '';
    
      const description = `🎌Match Started!🎌 \n\n💥⚽️💥 ${homeTeamName} vs ${awayTeamName} League: ${competitionName} 💥⚽️💥 \n\n #${homeTeamName.replace(/[^a-zA-Z]/g, "")} #${awayTeamName.replace(/[^a-zA-Z]/g, "")} #${competitionName.replace(/[^a-zA-Z]/g, "")} ${venueName ? '#' + venueName.replace(/[^a-zA-Z]/g, "") : ''}`
      const board_id = await getBoards(tokenData.access_token)
      await createPinterestPin(tokenData.access_token, board_id.items[0].id, `${homeTeamName} vs ${awayTeamName}`, description, item.social_picture);
  }
}

// ===== MAKE POST ON PAGE =====
async function getMatch(matches) {
  for (const match of matches) {
      for (const item of match.matches) {
          await processItem(item, match);
      }
  }
}

// get data from Sport Score
function fetchData() {
    fetch('https://sportscore.io/api/v1/football/matches/?match_status=live&sort_by_time=false&page=0', {
        method: 'GET',
        headers: {
            "accept": "application/json",
            'X-API-Key': 'uqzmebqojezbivd2dmpakmj93j7gjm',
        },
    })
    .then(response => response.json())
    .then(data => {
        getMatch(data.match_groups);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// start every 1 minute
setInterval(fetchData, 60000);

fetchData();