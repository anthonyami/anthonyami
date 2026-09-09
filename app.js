'use strict';

const audio = document.getElementById('audio');
const playButton = document.getElementById('playButton');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const playStatus = document.getElementById('playStatus');
const musicWave = document.getElementById('musicWave');
const volume = document.getElementById('volume');
let playPending = false;
let waitingForGesture = false;

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
  playButton.setAttribute('aria-pressed', String(playing));
  playButton.setAttribute('aria-label', playing ? 'Pausar Under Your Spell' : 'Reproducir Under Your Spell');
  musicWave.classList.toggle('playing', playing);
  if (message) playStatus.textContent = message;
}

playButton.disabled = false;
audio.volume = Number(volume.value) / 100;
async function startMusic() {
  if (playPending) return;
  playPending = true;
  playButton.setAttribute('aria-busy', 'true');
  playStatus.textContent = 'Cargando canción…';
  try {
    if (audio.error) audio.load();
    await audio.play();
    if (!audio.paused) {
      clearGestureFallback();
      setPlaybackState(true, 'Reproduciendo');
    }
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      waitingForGesture = true;
      setPlaybackState(false, 'Toca la página o pulsa ▶ para escuchar');
      document.addEventListener('click', playAfterGesture);
      document.addEventListener('keydown', playAfterGesture);
    } else {
      clearGestureFallback();
      setPlaybackState(false, 'No se pudo reproducir. Pulsa para reintentar.');
    }
  } finally {
    playPending = false;
    playButton.removeAttribute('aria-busy');
  }
}
playButton.addEventListener('click', () => {
  if (!audio.paused) { clearGestureFallback(); audio.pause(); return; }
  void startMusic();
});
audio.addEventListener('playing', () => {
  clearGestureFallback();
  setPlaybackState(true, 'Reproduciendo');
});
audio.addEventListener('pause', () => setPlaybackState(false, 'En pausa'));
audio.addEventListener('waiting', () => {
  musicWave.classList.remove('playing');
  playStatus.textContent = 'Cargando canción…';
});
audio.addEventListener('error', () => setPlaybackState(false, 'No se pudo cargar. Pulsa para reintentar.'));
volume.addEventListener('input', () => {
  audio.volume = Number(volume.value) / 100;
  volume.setAttribute('aria-valuetext', `${volume.value} %`);
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
  motionToggle.setAttribute('aria-label', motionPaused ? 'Activar animaciones' : 'Pausar animaciones');
  motionLabel.textContent = motionPaused ? 'Activar animación' : 'Pausar animación';
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
