'use strict';

(() => {
  const name = 'anthonyami';
  const container = document.getElementById('nameTypewriter');
  const text = document.getElementById('typedName');
  const dot = document.getElementById('typedDot');
  const motionButton = document.getElementById('motionToggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!container || !text || !dot) return;

  let timer;
  let length = name.length;
  let deleting = true;

  function render() {
    text.textContent = name.slice(0, length);
    dot.hidden = length !== name.length;
  }

  function isPaused() {
    return document.hidden || reducedMotion.matches || motionButton?.getAttribute('aria-pressed') === 'true';
  }

  function tick() {
    if (isPaused()) { syncMotion(); return; }
    length += deleting ? -1 : 1;
    render();
    let delay = deleting ? 65 : 115;
    if (length === 0) { deleting = false; delay = 450; }
    else if (length === name.length) { deleting = true; delay = 1900; }
    timer = setTimeout(tick, delay);
  }

  function syncMotion() {
    clearTimeout(timer);
    length = name.length;
    deleting = true;
    render();
    const active = !isPaused();
    container.classList.toggle('typewriter-active', active);
    if (active) timer = setTimeout(tick, 1900);
  }

  motionButton?.addEventListener('click', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
})();
