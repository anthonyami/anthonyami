'use strict';

(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');
  const themeIcon = themeButton?.querySelector('.theme-icon');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
  const preferenceKey = 'anthonyami-theme';

  function savedTheme() {
    try { return localStorage.getItem(preferenceKey); }
    catch (_) { return null; }
  }

  function applyTheme(theme) {
    const isLight = theme === 'light';
    root.dataset.theme = isLight ? 'light' : 'dark';
    themeButton.setAttribute('aria-pressed', String(isLight));
    themeButton.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    themeLabel.textContent = isLight ? 'Dark mode' : 'Light mode';
    themeIcon.textContent = isLight ? '☾' : '☀';
    themeColor?.setAttribute('content', isLight ? '#f6f3f0' : '#0a0a0c');
  }

  if (themeButton) {
    applyTheme(root.dataset.theme);
    themeButton.addEventListener('click', () => {
      const nextTheme = root.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
      try { localStorage.setItem(preferenceKey, nextTheme); } catch (_) { /* Private browsing may block storage. */ }
    });
    systemTheme.addEventListener('change', event => {
      if (!savedTheme()) applyTheme(event.matches ? 'light' : 'dark');
    });
  }

  const clockTime = document.getElementById('localTime');
  const clockDate = document.getElementById('localDate');
  const timeFormatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const dateFormatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });

  function updateClock() {
    if (document.hidden || !clockTime || !clockDate) return;
    const now = new Date();
    clockTime.textContent = timeFormatter.format(now);
    clockTime.dateTime = now.toISOString();
    clockDate.textContent = dateFormatter.format(now);
  }

  updateClock();
  setInterval(updateClock, 1000);
  document.addEventListener('visibilitychange', updateClock);

  const card = document.querySelector('.profile-card');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.getElementById('motionToggle');
  let pendingFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  function tiltEnabled() {
    return finePointer.matches && !reducedMotion.matches &&
      motionButton?.getAttribute('aria-pressed') !== 'true';
  }

  function resetTilt() {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    card?.classList.remove('is-tilting');
    card?.style.setProperty('--tilt-x', '0deg');
    card?.style.setProperty('--tilt-y', '0deg');
  }

  function renderTilt() {
    pendingFrame = 0;
    if (!card || !tiltEnabled()) { resetTilt(); return; }
    const rect = card.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((pointerX - rect.left) / rect.width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((pointerY - rect.top) / rect.height - .5) * 2));
    card.classList.add('is-tilting');
    card.style.setProperty('--tilt-x', `${(-y * 3).toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${(x * 3).toFixed(2)}deg`);
  }

  card?.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !tiltEnabled()) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pendingFrame) pendingFrame = requestAnimationFrame(renderTilt);
  });
  card?.addEventListener('pointerleave', resetTilt);
  finePointer.addEventListener('change', resetTilt);
  reducedMotion.addEventListener('change', resetTilt);
  motionButton?.addEventListener('click', resetTilt);
})();
