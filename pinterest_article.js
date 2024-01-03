import fetch from 'node-fetch';

const code = '500913ba263d9396a3ab2858c3f56e2dd04b6b17';
let tokenData;

// Get access token 

async function fetchOAuthToken(code) {
  const url = 'https://api.pinterest.com/v5/oauth/token';

  const headers = {
      'Authorization': 'Basic ' + btoa('1494276%3A%20b4df5757ff736a5c2a8b6d1f3dc48c77405b38b2'),
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

(async () => {
  try {
      await fetchOAuthToken(code);
      console.log('Token Data:', tokenData);
  } catch (error) {
      console.error('Error in fetching token:', error);
  }
})();

//Refresh token every 28 day

async function refreshPinterestToken(tokenData) {
  const url = 'https://api.pinterest.com/v5/oauth/token';

  const headers = {
      'Authorization': 'Basic ' + btoa('1494276%3A%20b4df5757ff736a5c2a8b6d1f3dc48c77405b38b2'),
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

//upload image to pinterest
async function uploadImage(accessToken, imageUrl) {
  const url = 'https://api.pinterest.com/v1/media/';

  const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
  };

  const body = JSON.stringify({
      'media_type': 'image',
      'media': imageUrl
  });

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: body
      });
      const data = await response.json();
      console.log('boards id', data)
      return data.media_id;
  } catch (error) {
      console.error('Error in uploading image:', error);
  }
}

// get boards

async function getBoards(accessToken) {
  const url = 'https://api.pinterest.com/v1/me/boards/';

  const headers = {
      'Authorization': `Bearer ${accessToken}`
  };

  try {
      const response = await fetch(url, { headers: headers });
      const data = await response.json();
      console.log('Boards:', data);
      return data;
  } catch (error) {
      console.error('Error in getting boards:', error);
  }
}

// Post on printest

async function createPin(accessToken, boardId, imageUrl, description, siteLink) {
  const url = 'https://api.pinterest.com/v1/pins/';

  const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
  };

  const body = JSON.stringify({
      'board_id': boardId,
      'media_id': imageUrl,
      'description': description,
      'link': siteLink
  });

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: body
      });
      const data = await response.json();
      console.log('Pin created:', data);
  } catch (error) {
      console.error('Error in creating pin:', error);
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
      const mediaId = await uploadImage(tokenData.access_token, item.social_picture);
      const board_id = await getBoards(tokenData.access_token)
      await createPin(tokenData.access_token, board_id.items[0].id, mediaId, description, item.url);
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