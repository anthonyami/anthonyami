'use strict';

const audio = document.getElementById('audio');
const playButton = document.getElementById('playButton');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const playStatus = document.getElementById('playStatus');
const musicWave = document.getElementById('musicWave');
const volume = document.getElementById('volume');
const musicSeek = document.getElementById('musicSeek');
const musicElapsed = document.getElementById('musicElapsed');
const musicDuration = document.getElementById('musicDuration');
const openLyrics = document.getElementById('openLyrics');
const lyricsDialog = document.getElementById('lyricsDialog');
const closeLyrics = document.getElementById('closeLyrics');
const lyricsCopy = document.getElementById('lyricsCopy');
const lyricsStatus = document.getElementById('lyricsStatus');
const lyricsPlayButton = document.getElementById('lyricsPlayButton');
const lyricsPlayIcon = document.getElementById('lyricsPlayIcon');
const lyricsPauseIcon = document.getElementById('lyricsPauseIcon');
const lyricsSeek = document.getElementById('lyricsSeek');
const lyricsElapsed = document.getElementById('lyricsElapsed');
const lyricsDuration = document.getElementById('lyricsDuration');
let playPending = false;
let waitingForGesture = false;
let lyricsLoaded = false;
let lyricLines = [];
let activeLyricIndex = -2;

// Timings adapted to the 4:03 recording from https://lrclib.net/api/get/19499703.
const lyricCueTimes = [
  0, 6.67, 10.0, 13.31, 19.52, 26.61, 29.88, 33.08, 36.55,
  39.35, 45.79, 52.54, 59.11, 65.50, 72.15, 78.82, 85.42,
  105.94, 112.48, 118.84, 125.64, 132.29, 136.15, 139.01, 142.56,
  150.75, 151.85, 157.21, 158.86, 162.69, 165.58, 168.92,
  183.82, 198.47, 201.94, 204.50, 205.31, 208.68
];

function formatMusicTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function syncLyrics(forceScroll = false) {
  if (!lyricsLoaded || !lyricLines.length) return;
  const time = audio.currentTime;
  let nextIndex = -1;
  for (let index = 0; index < lyricCueTimes.length; index++) {
    if (time < lyricCueTimes[index]) break;
    nextIndex = index;
  }
  if ((time >= 89.55 && time < 105.94) || time >= 211.53) nextIndex = -1;
  if (nextIndex !== activeLyricIndex) {
    lyricLines.forEach((line, index) => {
      line.classList.toggle('is-active', index === nextIndex);
      line.classList.toggle('is-past', index < nextIndex);
      if (index === nextIndex) line.setAttribute('aria-current', 'true');
      else line.removeAttribute('aria-current');
    });
    activeLyricIndex = nextIndex;
  } else if (!forceScroll) return;
  if (!lyricsDialog.open || nextIndex < 0) return;
  const activeLine = lyricLines[nextIndex];
  const target = activeLine.getBoundingClientRect().top - lyricsCopy.getBoundingClientRect().top
    + lyricsCopy.scrollTop - lyricsCopy.clientHeight * .35;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.body.classList.contains('motion-paused');
  lyricsCopy.scrollTo({ top: Math.max(0, target), behavior: reduceMotion ? 'instant' : 'smooth' });
}

function updateMusicProgress() {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  const elapsed = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const progress = duration ? Math.min(elapsed / duration * 100, 100) : 0;
  for (const seek of [musicSeek, lyricsSeek]) {
    seek.disabled = !duration;
    seek.max = String(duration || 100);
    seek.value = String(Math.min(elapsed, duration));
    seek.style.setProperty('--seek-progress', `${progress}%`);
    seek.setAttribute('aria-valuetext', `${formatMusicTime(elapsed)} of ${formatMusicTime(duration)}`);
  }
  musicElapsed.textContent = formatMusicTime(elapsed);
  musicDuration.textContent = formatMusicTime(duration);
  lyricsElapsed.textContent = musicElapsed.textContent;
  lyricsDuration.textContent = musicDuration.textContent;
  syncLyrics();
}

function clearGestureFallback() {
  waitingForGesture = false;
  document.removeEventListener('click', playAfterGesture);
  document.removeEventListener('keydown', playAfterGesture);
}

function playAfterGesture(event) {
  if (!waitingForGesture || event.target.closest?.('a, button, input, select, textarea')) return;
  if (event.type === 'keydown' && (event.repeat || !['Enter', ' '].includes(event.key))) return;
  void startMusic();
}

function setPlaybackState(playing, message) {
  playIcon.toggleAttribute('hidden', playing);
  pauseIcon.toggleAttribute('hidden', !playing);
  lyricsPlayIcon.toggleAttribute('hidden', playing);
  lyricsPauseIcon.toggleAttribute('hidden', !playing);
  playButton.setAttribute('aria-pressed', String(playing));
  playButton.setAttribute('aria-label', playing ? 'Pause Under Your Spell' : 'Play Under Your Spell');
  lyricsPlayButton.setAttribute('aria-pressed', String(playing));
  lyricsPlayButton.setAttribute('aria-label', playing ? 'Pause Under Your Spell' : 'Play Under Your Spell');
  musicWave.classList.toggle('playing', playing);
  if (message) {
    playStatus.textContent = message;
    lyricsStatus.textContent = message;
  }
}

playButton.disabled = false;
audio.volume = Number(volume.value) / 100;
async function startMusic() {
  if (playPending) return;
  playPending = true;
  playButton.setAttribute('aria-busy', 'true');
  lyricsPlayButton.setAttribute('aria-busy', 'true');
  playStatus.textContent = 'Loading track…';
  lyricsStatus.textContent = 'Loading track…';
  try {
    if (audio.error) audio.load();
    await audio.play();
    if (!audio.paused) {
      clearGestureFallback();
      setPlaybackState(true, 'Playing');
    }
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      waitingForGesture = true;
      setPlaybackState(false, 'Tap the page or press ▶ to listen');
      document.addEventListener('click', playAfterGesture);
      document.addEventListener('keydown', playAfterGesture);
    } else {
      clearGestureFallback();
      setPlaybackState(false, 'Could not play. Press ▶ to retry.');
    }
  } finally {
    playPending = false;
    playButton.removeAttribute('aria-busy');
    lyricsPlayButton.removeAttribute('aria-busy');
  }
}
function toggleMusic() {
  if (!audio.paused) { clearGestureFallback(); audio.pause(); return; }
  void startMusic();
}
playButton.addEventListener('click', toggleMusic);
lyricsPlayButton.addEventListener('click', toggleMusic);
audio.addEventListener('playing', () => {
  clearGestureFallback();
  setPlaybackState(true, 'Playing');
});
audio.addEventListener('pause', () => setPlaybackState(false, 'Paused'));
audio.addEventListener('waiting', () => {
  musicWave.classList.remove('playing');
  playStatus.textContent = 'Loading track…';
  lyricsStatus.textContent = 'Loading track…';
});
audio.addEventListener('error', () => setPlaybackState(false, 'Could not load. Press ▶ to retry.'));
audio.addEventListener('loadedmetadata', updateMusicProgress);
audio.addEventListener('durationchange', updateMusicProgress);
audio.addEventListener('timeupdate', updateMusicProgress);
audio.addEventListener('seeked', () => syncLyrics(true));
musicSeek.addEventListener('input', () => {
  audio.currentTime = Number(musicSeek.value);
  updateMusicProgress();
  syncLyrics(true);
});
lyricsSeek.addEventListener('input', () => {
  audio.currentTime = Number(lyricsSeek.value);
  updateMusicProgress();
  syncLyrics(true);
});
volume.addEventListener('input', () => {
  audio.volume = Number(volume.value) / 100;
  volume.setAttribute('aria-valuetext', `${volume.value}%`);
});
updateMusicProgress();

async function loadLyrics() {
  if (lyricsLoaded) return;
  try {
    const response = await fetch('assets/under-your-spell-lyrics.txt');
    if (!response.ok) throw new Error('Lyrics unavailable');
    const text = (await response.text()).trim();
    const fragment = document.createDocumentFragment();
    const lines = [];
    for (const content of text.split(/\r?\n/)) {
      const line = document.createElement('div');
      if (content.trim()) {
        line.className = 'lyric-line';
        line.textContent = content;
        lines.push(line);
      } else {
        line.className = 'lyric-gap';
        line.setAttribute('aria-hidden', 'true');
      }
      fragment.append(line);
    }
    if (lines.length !== lyricCueTimes.length) throw new Error('Lyric cue mismatch');
    lyricsCopy.replaceChildren(fragment);
    lyricLines = lines;
    lyricsLoaded = true;
    syncLyrics(true);
  } catch (_) {
    lyricsCopy.textContent = 'Lyrics unavailable right now.';
  }
}
function showLyrics() {
  if (lyricsDialog.open) return;
  lyricsDialog.showModal();
  void loadLyrics().then(() => syncLyrics(true));
}
openLyrics.addEventListener('click', showLyrics);
document.querySelector('.music-player').addEventListener('click', event => {
  if (event.target.closest('.player-art, button, input, .volume')) return;
  showLyrics();
});
closeLyrics.addEventListener('click', () => lyricsDialog.close());
lyricsDialog.addEventListener('click', event => {
  if (event.target === lyricsDialog) lyricsDialog.close();
});

// Audible autoplay depends on the visitor's browser policy. Keep a one-touch fallback.
void startMusic();

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const video = document.getElementById('backgroundVideo');
const avatar = document.getElementById('avatar');
const stillAvatarSource = document.getElementById('stillAvatarSource');
const motionToggle = document.getElementById('motionToggle');
const motionLabel = document.getElementById('motionLabel');
let motionPaused = motionQuery.matches || Boolean(navigator.connection?.saveData);

function updateMotion() {
  document.body.classList.toggle('motion-paused', motionPaused);
  motionToggle.setAttribute('aria-pressed', String(motionPaused));
  motionToggle.setAttribute('aria-label', motionPaused ? 'Enable animations' : 'Pause animations');
  motionLabel.textContent = motionPaused ? 'Enable animation' : 'Pause animation';
  stillAvatarSource.media = motionPaused ? 'all' : 'not all';
  avatar.src = motionPaused ? 'assets/avatar-still.webp' : 'assets/avatar.webp';
  if (motionPaused || document.hidden) { video.pause(); return; }
  if (!video.getAttribute('src')) video.src = 'assets/background.mp4';
  video.play().catch(() => { /* The poster remains visible when autoplay is unavailable. */ });
}
motionToggle.hidden = false;
motionToggle.addEventListener('click', () => { motionPaused = !motionPaused; updateMotion(); });
motionQuery.addEventListener('change', event => { motionPaused = event.matches; updateMotion(); });
document.addEventListener('visibilitychange', updateMotion);
// The profile renders immediately. Decorative video starts after the critical page assets.
if (document.readyState === 'complete') updateMotion();
else window.addEventListener('load', updateMotion, { once: true });
