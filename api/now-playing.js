'use strict';

module.exports = async function nowPlaying(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = 'anthonymiau';
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Last.fm is not configured' });

  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  url.search = new URLSearchParams({
    method: 'user.getrecenttracks',
    user,
    api_key: apiKey,
    format: 'json',
    limit: '1'
  }).toString();

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Last.fm HTTP ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(`Last.fm API ${data.error}`);

    const recent = data.recenttracks?.track;
    const track = Array.isArray(recent) ? recent[0] : recent;
    const playing = track?.['@attr']?.nowplaying === 'true';
    const images = Array.isArray(track?.image) ? track.image : [];
    const art = images.find(image => image.size === 'extralarge')?.['#text']
      || images.find(image => image.size === 'large')?.['#text']
      || images.find(image => image.size === 'medium')?.['#text']
      || '';

    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=10');
    return res.status(200).json({
      track: playing && track.name && track.artist?.['#text'] ? {
        title: track.name,
        artist: track.artist['#text'],
        cover: /^https:\/\//.test(art) ? art : ''
      } : null
    });
  } catch (error) {
    console.error('Last.fm request failed:', error.message);
    return res.status(502).json({ error: 'Music status unavailable' });
  }
};
