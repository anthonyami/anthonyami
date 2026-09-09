'use strict';

(() => {
  const communities = [
    { id: 'evgCounts', code: 'jtVdZfaXu' },
    { id: 'syneroxCounts', code: 'qDRcSUjdG' },
  ];
  const formatter = new Intl.NumberFormat('es-PE');
  const refreshMs = 5 * 60 * 1000;
  let lastAttempt = 0;
  let pending = false;

  function countLabel(value, label, className) {
    const item = document.createElement('span');
    const dot = document.createElement('i');
    dot.className = className;
    dot.setAttribute('aria-hidden', 'true');
    item.append(dot, `≈ ${formatter.format(value)} ${label}`);
    return item;
  }

  async function updateCommunity({ id, code }) {
    const container = document.getElementById(id);
    if (!container) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, {
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Discord unavailable');
      const invite = await response.json();
      const members = invite.approximate_member_count;
      const online = invite.approximate_presence_count;
      if (!invite.guild || !Number.isSafeInteger(members) || members < 0 || !Number.isSafeInteger(online) || online < 0) {
        throw new Error('Counts unavailable');
      }
      container.replaceChildren(
        countLabel(members, members === 1 ? 'miembro' : 'miembros', 'member-dot'),
        countLabel(online, 'en línea', 'online-dot'),
      );
      container.dataset.state = 'ready';
      container.title = `Cifras aproximadas de Discord. Consultadas a las ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}.`;
    } catch {
      container.textContent = 'Ver miembros en Discord';
      container.dataset.state = 'unavailable';
      container.title = 'No se pudieron actualizar las cifras. Puedes abrir la invitación.';
    } finally {
      clearTimeout(timeout);
    }
  }

  async function refreshCounts() {
    if (pending || document.hidden || Date.now() - lastAttempt < refreshMs) return;
    pending = true;
    lastAttempt = Date.now();
    try { await Promise.allSettled(communities.map(updateCommunity)); }
    finally { pending = false; }
  }

  void refreshCounts();
  setInterval(refreshCounts, refreshMs);
  document.addEventListener('visibilitychange', refreshCounts);
})();
