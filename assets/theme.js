// The dashboard switch. Bound once, on both pages: binding it inside the render
// pass is what made every click add another copy of everything.
export function bindTheme(onChange) {
  const button = document.getElementById('theme');
  if (!button) return;

  const label = () =>
    (document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'Light dashboard' : 'Dark dashboard');

  button.textContent = label();
  button.addEventListener('click', () => {
    const root = document.documentElement;
    root.setAttribute('data-theme',
      root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    button.textContent = label();
    onChange();
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
