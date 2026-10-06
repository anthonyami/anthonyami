'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/now-playing');

async function request(method = 'GET') {
  const result = { code: 200, headers: {}, body: null };
  const response = {
    setHeader(name, value) { result.headers[name] = value; },
    status(code) { result.code = code; return this; },
    json(body) { result.body = body; return this; }
  };
  await handler({ method }, response);
  return result;
}

test('requires Last.fm configuration', async () => {
  const priorKey = process.env.LASTFM_API_KEY;
  delete process.env.LASTFM_API_KEY;
  try {
    const result = await request();
    assert.equal(result.code, 503);
  } finally {
    if (priorKey !== undefined) process.env.LASTFM_API_KEY = priorKey;
  }
});

test('returns only the currently playing track', async () => {
  const priorKey = process.env.LASTFM_API_KEY;
  const priorFetch = global.fetch;
  process.env.LASTFM_API_KEY = 'test-key';
  try {
    global.fetch = async url => {
      assert.equal(url.searchParams.get('user'), 'anthonymiau');
      assert.equal(url.searchParams.get('limit'), '1');
      return {
        ok: true,
        json: async () => ({ recenttracks: { track: [{
          name: 'Song',
          artist: { '#text': 'Artist' },
          '@attr': { nowplaying: 'true' },
          image: [{ size: 'large', '#text': 'https://lastfm.freetls.fastly.net/cover.jpg' }]
        }] } })
      };
    };
    assert.deepEqual((await request()).body, {
      track: { title: 'Song', artist: 'Artist', cover: 'https://lastfm.freetls.fastly.net/cover.jpg' }
    });
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ recenttracks: { track: [{ name: 'Old song', artist: { '#text': 'Artist' } }] } })
    });
    assert.deepEqual((await request()).body, { track: null });
  } finally {
    global.fetch = priorFetch;
    if (priorKey === undefined) delete process.env.LASTFM_API_KEY;
    else process.env.LASTFM_API_KEY = priorKey;
  }
});
