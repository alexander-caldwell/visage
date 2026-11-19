const themeKey = 'visage-theme';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

function savedTheme() {
  try {
    const value = localStorage.getItem(themeKey);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // The site can still follow the system when storage is unavailable.
  }
  return 'system';
}

export function bindTheme(onChange) {
  const select = document.getElementById('theme');
  const root = document.documentElement;
  let preference = savedTheme();

  function apply(notify = true) {
    const theme = preference === 'system'
      ? (systemTheme.matches ? 'dark' : 'light')
      : preference;
    const changed = root.dataset.theme !== theme;
    root.dataset.theme = theme;
    select.value = preference;
    if (notify && changed) onChange?.();
  }

  // Apply before the caller starts drawing the charts.
  apply(false);

  select.addEventListener('change', () => {
    preference = select.value;
    try {
      if (preference === 'system') localStorage.removeItem(themeKey);
      else localStorage.setItem(themeKey, preference);
    } catch {
      // The selection still applies in this page when storage is unavailable.
    }
    apply();
  });
  systemTheme.addEventListener('change', () => apply());
  window.addEventListener('storage', (event) => {
    if (event.key !== themeKey && event.key !== null) return;
    preference = savedTheme();
    apply();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    preference = savedTheme();
    apply();
  });
}

// Charts re-measure their tile on render, so a resize needs a redraw. Debounced,
// and bound once.
export function bindResize(onChange) {
  let timer = null;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 250);
  });
}
