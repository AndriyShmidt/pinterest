import fetch from 'node-fetch';

const apiKey = 'uqzmebqojezbivd2dmpakmj93j7gjm';
const clientId = 'MTQ5NDI3NjpiNGRmNTc1N2ZmNzM2YTVjMmE4YjZkMWYzZGM0OGM3NzQwNWIzOGIy';
const redirectUri = 'https://sportscore.io/';

let tokenData;
let autopostData;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAutopost() {
    try {
        const response = await fetch(`https://sportscore.io/api/v1/autopost/settings/pinterest/`, {
            method: 'GET',
            headers: {
                "accept": "application/json",
                'X-API-Key': apiKey,
            },
        });

        autopostData = await response.json();
    } catch (error) {
        console.error('Error fetching autopost data:', error);
    }
}

async function fetchOAuthToken(code) {
    const url = 'https://api.pinterest.com/v5/oauth/token';

    const headers = {
        'Authorization': `Basic ${clientId}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    const body = new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirectUri
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        tokenData = await response.json();
    } catch (error) {
        console.error('Error fetching OAuth token:', error);
    }
}

async function refreshPinterestToken() {
    const url = 'https://api.pinterest.com/v5/oauth/token';

    const headers = {
        'Authorization': `Basic ${clientId}`,
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
        console.error('Error refreshing token:', error);
    }
}

function scheduleTokenRefresh() {
    const days = 28;
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    setTimeout(async () => {
        try {
            await refreshPinterestToken();
            scheduleTokenRefresh();
        } catch (error) {
            console.error('Failed to refresh token:', error);
        }
    }, days * millisecondsPerDay);
}

scheduleTokenRefresh();

function createBoardsToPinterest() {
    const today = new Date();

    if (today.getDate() === 1) {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[today.getMonth()];
        const year = today.getFullYear();

        const url = 'https://api.pinterest.com/v5/boards';
        const data = {
            name: `${monthName} ${year} Recipes`,
            description: `My favorite recipes for ${monthName} ${year}`,
            privacy: "PUBLIC"
        };

        const headers = {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
        };

        fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => console.log('Success:', data))
            .catch((error) => console.error('Error creating board:', error));
    }
}

setInterval(createBoardsToPinterest, 24 * 60 * 60 * 1000);

async function getBoards() {
    const url = 'https://api.pinterest.com/v5/boards';

    const headers = {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, { headers: headers });
        const data = await response.json();
        console.log('Boards:', data.items[0].id);
        return data;
    } catch (error) {
        console.error('Error getting boards:', error);
    }
}

async function createPinterestPin(token, boardId, title, description, imageUrl, link) {
    const url = 'https://api.pinterest.com/v5/pins';

    const data = {
        title: title,
        link: link,
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
        console.error('Error creating Pinterest pin:', error);
    }
}

async function processItem(item, match) {
    if (Number(item.state_display) && Number(item.state_display) < 2) {
        const homeTeamName = item.home_team?.name || '';
        const awayTeamName = item.away_team?.name || '';
        const competitionName = match.competition?.name || '';
        const venueName = item.venue?.name || '';

        const description = `🎌Match Started!🎌 \n\n💥⚽️💥 ${homeTeamName} vs ${awayTeamName} League: ${competitionName} 💥⚽️💥 \n\n #${homeTeamName.replace(/[^a-zA-Z]/g, "")} #${awayTeamName.replace(/[^a-zA-Z]/g, "")} #${competitionName.replace(/[^a-zA-Z]/g, "")} ${venueName ? '#' + venueName.replace(/[^a-zA-Z]/g, "") : ''}`;
        const boardId = await getBoards();

        await createPinterestPin(tokenData.access_token, boardId.items[0].id, `${homeTeamName} vs ${awayTeamName}`, description, item.social_picture, item.url);
    }
}

async function getMatch(matches) {
    for (const match of matches) {
        for (const item of match.matches) {
            await fetchAutopost();
            console.log(autopostData);
            if (autopostData.some(item => item.enabled === true)) {
                await processItem(item, match);
            }
        }
    }
}

async function fetchData() {
    try {
        const response = await fetch(`https://sportscore.io/api/v1/football/matches/?match_status=live&sort_by_time=false&page=0`, {
            method: 'GET',
            headers: {
                "accept": "application/json",
                'X-API-Key': apiKey,
            },
        });

        const data = await response.json();
        await getMatch(data.match_groups);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

setInterval(fetchData, 60000);

fetchData();
