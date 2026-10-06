'use strict';

(() => {
  const userId = '1491298399159586930';
  const card = document.getElementById('spotifyCard');
  if (!card) return;

  const status = document.getElementById('spotifyStatus');
  const current = document.getElementById('spotifyCurrent');
  const cover = document.getElementById('spotifyCover');
  const title = document.getElementById('spotifyTitle');
  const artist = document.getElementById('spotifyArtist');
  const embed = document.getElementById('spotifyEmbed');
  const link = document.getElementById('spotifyOpen');
  let displayedTrack = '';
  let socket;
  let heartbeatTimer;
  let reconnectTimer;
  let reconnectDelay = 1000;

  function showStatus(message) {
    card.classList.remove('is-live');
    status.textContent = message;
    status.hidden = false;
    current.hidden = true;
    if (displayedTrack) {
      embed.removeAttribute('src');
      displayedTrack = '';
    }
  }

  function showPresence(presence) {
    const track = presence?.listening_to_spotify ? presence.spotify : null;
    const trackId = String(track?.track_id || '');
    if (!/^[A-Za-z0-9]{22}$/.test(trackId)) {
      showStatus('Not listening right now.');
      return;
    }

    title.textContent = track.song || 'Untitled song';
    artist.textContent = track.artist || 'Unknown artist';
    const art = track.album_art_url || '';
    cover.hidden = !/^https:\/\/i\.scdn\.co\/image\//.test(art);
    if (!cover.hidden && cover.src !== art) cover.src = art;
    link.href = `https://open.spotify.com/track/${trackId}`;
    if (displayedTrack !== trackId) {
      embed.src = `https://open.spotify.com/embed/track/${trackId}?theme=0`;
      displayedTrack = trackId;
    }
    status.hidden = true;
    current.hidden = false;
    card.classList.add('is-live');
  }

  async function refresh() {
    if (document.hidden) return;
    try {
      const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Lanyard unavailable');
      const result = await response.json();
      if (!result.success) throw new Error('Discord presence unavailable');
      showPresence(result.data);
    } catch (_) {
      if (!card.classList.contains('is-live')) showStatus('Spotify status unavailable.');
    }
  }

  function connect() {
    if (document.hidden || socket && socket.readyState < WebSocket.CLOSING) return;
    clearTimeout(reconnectTimer);
    const connection = new WebSocket('wss://api.lanyard.rest/socket');
    socket = connection;
    connection.addEventListener('message', event => {
      if (socket !== connection) return;
      let message;
      try { message = JSON.parse(event.data); } catch (_) { return; }
      if (message.op === 1) {
        connection.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
        clearInterval(heartbeatTimer);
        const interval = Number(message.d?.heartbeat_interval) || 30000;
        heartbeatTimer = setInterval(() => {
          if (connection.readyState === WebSocket.OPEN) connection.send(JSON.stringify({ op: 3 }));
        }, interval);
      } else if (message.op === 0 && (message.t === 'INIT_STATE' || message.t === 'PRESENCE_UPDATE')) {
        reconnectDelay = 1000;
        showPresence(message.d);
      }
    });
    connection.addEventListener('close', () => {
      if (socket !== connection) return;
      clearInterval(heartbeatTimer);
      if (!document.hidden) {
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      }
    });
    connection.addEventListener('error', () => connection.close());
  }

  refresh();
  connect();
  setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(reconnectTimer);
      socket?.close();
    } else {
      refresh();
      connect();
    }
  });
})();
