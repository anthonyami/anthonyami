'use strict';

(() => {
  const totalElement = document.getElementById('viewsTotal');
  const chartElement = document.getElementById('viewsChart');
  const statusElement = document.getElementById('viewsStatus');
  if (!totalElement || !chartElement || !statusElement) return;

  const endpoint = 'https://countapi.mileshilliard.com/api/v1';
  const keyPrefix = 'anthonyami-vercel-app-profile';
  const firstDay = '2026-09-25';
  const formatter = new Intl.NumberFormat('en-US');
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const limaToday = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const todayUTC = Date.UTC(limaToday.getUTCFullYear(), limaToday.getUTCMonth(), limaToday.getUTCDate());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayUTC - (6 - index) * millisecondsPerDay);
    return {
      date: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date),
      fullLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date),
    };
  });

  async function count(action, key) {
    const response = await fetch(`${endpoint}/${action}/${encodeURIComponent(key)}`, {
      cache: 'no-store',
      credentials: 'omit',
    });
    if (response.status === 404 && action === 'get') return 0;
    if (!response.ok) throw new Error(`Counter request failed: ${response.status}`);
    const result = await response.json();
    if (!Number.isSafeInteger(result.value) || result.value < 0) throw new Error('Invalid counter response');
    return result.value;
  }

  function renderChart(counts) {
    const max = Math.max(1, ...counts);
    const bars = days.map((day, index) => {
      const item = document.createElement('li');
      const value = counts[index];
      item.setAttribute('aria-label', `${day.fullLabel}: ${formatter.format(value)} ${value === 1 ? 'view' : 'views'}`);

      const number = document.createElement('span');
      number.className = 'views-bar-value';
      number.textContent = formatter.format(value);
      number.setAttribute('aria-hidden', 'true');

      const track = document.createElement('span');
      track.className = 'views-bar-track';
      track.setAttribute('aria-hidden', 'true');
      const bar = document.createElement('span');
      bar.className = 'views-bar';
      bar.style.height = `${value ? Math.max(12, (value / max) * 100) : 0}%`;
      track.append(bar);

      const label = document.createElement('span');
      label.className = 'views-bar-label';
      label.textContent = day.label;
      label.setAttribute('aria-hidden', 'true');
      item.append(number, track, label);
      return item;
    });
    chartElement.replaceChildren(...bars);
  }

  async function loadViews() {
    const isProduction = location.hostname === 'anthonyami.vercel.app';
    const operation = isProduction ? 'hit' : 'get';
    const totalPromise = count(operation, `${keyPrefix}-total`);
    const dailyPromises = days.map(day => {
      if (day.date < firstDay) return Promise.resolve(0);
      return count(day.date === days[6].date ? operation : 'get', `${keyPrefix}-${day.date}`);
    });
    const [total, daily] = await Promise.all([totalPromise, Promise.all(dailyPromises)]);
    totalElement.textContent = formatter.format(total);
    renderChart(daily);
    statusElement.textContent = 'Updated on load';
  }

  loadViews().catch(() => {
    totalElement.textContent = '—';
    statusElement.textContent = 'Views temporarily unavailable';
    chartElement.replaceChildren();
  });
})();
