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

function formatMusicTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
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
musicSeek.addEventListener('input', () => {
  audio.currentTime = Number(musicSeek.value);
  updateMusicProgress();
});
lyricsSeek.addEventListener('input', () => {
  audio.currentTime = Number(lyricsSeek.value);
  updateMusicProgress();
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
    lyricsCopy.textContent = (await response.text()).trim();
    lyricsLoaded = true;
  } catch (_) {
    lyricsCopy.textContent = 'Lyrics unavailable right now.';
  }
}
openLyrics.addEventListener('click', () => {
  lyricsDialog.showModal();
  lyricsCopy.scrollTop = 0;
  void loadLyrics();
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
