var lastApiCall = 0;
var MIN_API_INTERVAL = 1000;

function throttledCall(fn) {
  var now = Date.now();
  var delay = Math.max(0, MIN_API_INTERVAL - (now - lastApiCall));
  setTimeout(function () {
    lastApiCall = Date.now();
    fn();
  }, delay);
}

var TOKEN_KEY = 'mal_access_token';
var REFRESH_KEY = 'mal_refresh_token';
var EXPIRY_KEY = 'mal_token_expiry';
var CLIENT_ID_KEY = 'mal_client_id';
var CLIENT_SECRET_KEY = 'mal_client_secret';
var ANIME_CACHE_KEY = 'mal_anime_cache';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function isTokenExpired() {
  var expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
  return Date.now() > expiry - 60000;
}

function saveTokens(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000));
}

function refreshToken(callback) {
  var refreshTok = localStorage.getItem(REFRESH_KEY);
  var clientId = localStorage.getItem(CLIENT_ID_KEY);
  var clientSecret = localStorage.getItem(CLIENT_SECRET_KEY);

  if (!refreshTok || !clientId) {
    callback(null);
    return;
  }

  var body = 'client_id=' + clientId +
    '&client_secret=' + encodeURIComponent(clientSecret || '') +
    '&grant_type=refresh_token' +
    '&refresh_token=' + refreshTok;

  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://myanimelist.net/v1/oauth2/token');
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.onload = function () {
    if (xhr.status === 200) {
      var data = JSON.parse(xhr.responseText);
      saveTokens(data);
      callback(data.access_token);
    } else {
      callback(null);
    }
  };
  xhr.onerror = function () { callback(null); };
  xhr.send(body);
}

function ensureToken(callback) {
  var token = getToken();
  if (!token) {
    callback(null);
    return;
  }
  if (isTokenExpired()) {
    refreshToken(callback);
    return;
  }
  callback(token);
}

function malGet(path, token, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://api.myanimelist.net/v2' + path);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.onload = function () {
    if (xhr.status === 200) {
      callback(null, JSON.parse(xhr.responseText));
    } else {
      callback('HTTP ' + xhr.status, null);
    }
  };
  xhr.onerror = function () { callback('Network error', null); };
  xhr.send();
}

function malPatch(animeId, params, token, callback) {
  var body = Object.keys(params).map(function (k) {
    return k + '=' + encodeURIComponent(params[k]);
  }).join('&');

  var xhr = new XMLHttpRequest();
  xhr.open('PATCH', 'https://api.myanimelist.net/v2/anime/' + animeId + '/my_list_status');
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.onload = function () {
    if (xhr.status === 200) {
      callback(null, JSON.parse(xhr.responseText));
    } else {
      callback('HTTP ' + xhr.status, null);
    }
  };
  xhr.onerror = function () { callback('Network error', null); };
  xhr.send(body);
}

function sendToWatch(obj) {
  Pebble.sendAppMessage(obj, function () {}, function (e) {
    console.log('sendAppMessage failed: ' + JSON.stringify(e));
  });
}

function sendError(msg) {
  sendToWatch({ STATUS: 1, ERROR_MSG: msg || 'Unknown error' });
}

function sendAuthRequired() {
  sendToWatch({ STATUS: 2, ERROR_MSG: 'Login required' });
}

var cachedList = [];

function formatEntry(item) {
  return {
    id: item.node.id,
    t: item.node.title,
    ep: item.list_status.num_episodes_watched,
    total: item.node.num_episodes || 0,
    score: item.list_status.score || 0,
  };
}

function fetchList() {
  throttledCall(function () {
    ensureToken(function (token) {
      if (!token) { sendAuthRequired(); return; }

      var path = '/users/@me/animelist?status=watching&sort=list_updated_at&limit=50' +
        '&fields=list_status{num_episodes_watched,score},num_episodes';

      malGet(path, token, function (err, data) {
        if (err) { sendError(err); return; }

        cachedList = data.data.map(formatEntry);
        localStorage.setItem(ANIME_CACHE_KEY, JSON.stringify(cachedList));
        sendToWatch({ STATUS: 0, LIST_DATA: JSON.stringify(cachedList) });
      });
    });
  });
}

function findCached(animeId) {
  for (var i = 0; i < cachedList.length; i++) {
    if (cachedList[i].id === animeId) return cachedList[i];
  }
  return null;
}

function updateCachedEntry(animeId, updates) {
  var entry = findCached(animeId);
  if (entry) {
    for (var k in updates) entry[k] = updates[k];
    localStorage.setItem(ANIME_CACHE_KEY, JSON.stringify(cachedList));
  }
  return entry;
}

function removeCachedEntry(animeId) {
  cachedList = cachedList.filter(function (a) { return a.id !== animeId; });
  localStorage.setItem(ANIME_CACHE_KEY, JSON.stringify(cachedList));
}

function handleIncrement(animeId) {
  var entry = findCached(animeId);
  if (!entry) { sendError('Anime not in cache'); return; }

  var newEp = entry.ep + 1;
  throttledCall(function () {
    ensureToken(function (token) {
      if (!token) { sendAuthRequired(); return; }

      malPatch(animeId, { num_watched_episodes: newEp }, token, function (err) {
        if (err) { sendError(err); return; }
        var updated = updateCachedEntry(animeId, { ep: newEp });
        sendToWatch({ STATUS: 0, LIST_DATA: JSON.stringify(updated) });
      });
    });
  });
}

function handleSetScore(animeId, score) {
  throttledCall(function () {
    ensureToken(function (token) {
      if (!token) { sendAuthRequired(); return; }

      malPatch(animeId, { score: score }, token, function (err) {
        if (err) { sendError(err); return; }
        var updated = updateCachedEntry(animeId, { score: score });
        sendToWatch({ STATUS: 0, LIST_DATA: JSON.stringify(updated) });
      });
    });
  });
}

function handleSetEpisodes(animeId, ep) {
  throttledCall(function () {
    ensureToken(function (token) {
      if (!token) { sendAuthRequired(); return; }

      malPatch(animeId, { num_watched_episodes: ep }, token, function (err) {
        if (err) { sendError(err); return; }
        var updated = updateCachedEntry(animeId, { ep: ep });
        sendToWatch({ STATUS: 0, LIST_DATA: JSON.stringify(updated) });
      });
    });
  });
}

function handleComplete(animeId) {
  var entry = findCached(animeId);
  if (!entry) { sendError('Anime not in cache'); return; }

  var now = new Date();
  var dateStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');

  var params = {
    status: 'completed',
    finish_date: dateStr,
  };
  if (entry.total > 0) params.num_watched_episodes = entry.total;

  throttledCall(function () {
    ensureToken(function (token) {
      if (!token) { sendAuthRequired(); return; }

      malPatch(animeId, params, token, function (err) {
        if (err) { sendError(err); return; }
        removeCachedEntry(animeId);
        sendToWatch({ STATUS: 0, LIST_DATA: JSON.stringify(cachedList) });
      });
    });
  });
}

Pebble.addEventListener('ready', function () {
  var cached = localStorage.getItem(ANIME_CACHE_KEY);
  if (cached) {
    try {
      cachedList = JSON.parse(cached);
      sendToWatch({ STATUS: 0, LIST_DATA: cached });
    } catch (e) {}
  }
  fetchList();
});

Pebble.addEventListener('appmessage', function (e) {
  var command = e.payload.COMMAND;
  var animeId = e.payload.ANIME_ID;
  var value = e.payload.VALUE;

  switch (command) {
    case 0: fetchList(); break;
    case 1: handleIncrement(animeId); break;
    case 2: handleSetScore(animeId, value); break;
    case 3: handleSetEpisodes(animeId, value); break;
    case 4: handleComplete(animeId); break;
  }
});

Pebble.addEventListener('showConfiguration', function () {
  var clientId = localStorage.getItem(CLIENT_ID_KEY) || '';
  var token = getToken();
  var loggedIn = token && !isTokenExpired();
  var configUrl = 'https://YOUR_GITHUB_PAGES_URL/config/index.html' +
    '?client_id=' + encodeURIComponent(clientId) +
    '&logged_in=' + (loggedIn ? '1' : '0');
  Pebble.openURL(configUrl);
});

Pebble.addEventListener('webviewclosed', function (e) {
  if (!e.response) return;
  try {
    var data = JSON.parse(decodeURIComponent(e.response));
    if (data.client_id) localStorage.setItem(CLIENT_ID_KEY, data.client_id);
    if (data.client_secret) localStorage.setItem(CLIENT_SECRET_KEY, data.client_secret);
    if (data.access_token) saveTokens(data);
    fetchList();
  } catch (err) {
    console.log('Config parse error: ' + err);
  }
});
