'use strict';

(() => {
  const card = document.getElementById('spotifyCard');
  if (!card) return;

  const status = document.getElementById('spotifyStatus');
  const current = document.getElementById('spotifyCurrent');
  const cover = document.getElementById('spotifyCover');
  const title = document.getElementById('spotifyTitle');
  const artist = document.getElementById('spotifyArtist');
  const link = document.getElementById('spotifyOpen');
  let refreshing = false;

  function showStatus(message) {
    card.classList.remove('is-live');
    status.textContent = message;
    status.hidden = false;
    current.hidden = true;
    cover.removeAttribute('src');
  }

  function showTrack(track) {
    title.textContent = track.title;
    artist.textContent = track.artist;
    cover.hidden = !track.cover;
    if (track.cover && cover.src !== track.cover) cover.src = track.cover;
    link.href = `https://open.spotify.com/search/${encodeURIComponent(`${track.artist} ${track.title}`)}`;
    status.hidden = true;
    current.hidden = false;
    card.classList.add('is-live');
  }

  async function refresh() {
    if (document.hidden || refreshing) return;
    refreshing = true;
    try {
      const response = await fetch('/api/now-playing', { cache: 'no-store' });
      if (!response.ok) throw new Error('Last.fm unavailable');
      const result = await response.json();
      if (result.track) showTrack(result.track);
      else showStatus('Not listening right now.');
    } catch (_) {
      showStatus('Music status unavailable.');
    } finally {
      refreshing = false;
    }
  }

  refresh();
  setInterval(refresh, 15000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
})();
