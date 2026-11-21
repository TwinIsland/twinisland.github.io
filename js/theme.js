(() => {
  const root = document.documentElement;
  const systemMode = matchMedia('(prefers-color-scheme: dark)');
  const themes = new Map([
    ['yuru', 'Yuru'],
    ['pixel', '8-Bit'],
  ]);
  const themeKey = 'site-theme-family';
  const modeKey = 'site-theme';
  let savedTheme = readPreference(themeKey);
  let theme = themes.has(savedTheme) ? savedTheme : 'yuru';
  let mode = readPreference(modeKey);
  if (mode === 'bright') mode = 'light';
  if (mode !== 'light' && mode !== 'dark') mode = null;
  let enabled = ['yuru'];
  let themeButton;
  let modeButton;

  function readPreference(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function savePreference(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Keep the choice for the current page.
    }
  }

  function nextTheme() {
    return enabled[(enabled.indexOf(theme) + 1) % enabled.length];
  }

  function applyAppearance() {
    const colorMode = mode ?? (systemMode.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    root.dataset.colorMode = colorMode;

    if (themeButton) {
      const name = themes.get(theme);
      const label = `Theme: ${name}. Switch to ${themes.get(nextTheme())}.`;
      themeButton.setAttribute('aria-label', label);
      themeButton.title = label;
      themeButton.hidden = enabled.length === 1;
    }

    if (modeButton) {
      modeButton.setAttribute('aria-pressed', String(colorMode === 'dark'));
      modeButton.title =
        colorMode === 'dark' ? 'Use light mode' : 'Use dark mode';
    }
  }

  window.configureSiteThemes = (configured) => {
    const choices = Array.isArray(configured)
      ? configured.filter((name) => themes.has(name))
      : [];
    enabled = choices.length ? [...new Set(choices)] : ['yuru'];
    theme = enabled.includes(savedTheme) ? savedTheme : enabled[0];
    applyAppearance();
  };

  applyAppearance();
  systemMode.addEventListener('change', applyAppearance);
  document.addEventListener('DOMContentLoaded', () => {
    themeButton = document.querySelector('.theme-switch');
    modeButton = document.querySelector('.theme-toggle');
    applyAppearance();
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let spin;
    themeButton?.addEventListener('click', () => {
      theme = nextTheme();
      savedTheme = theme;
      savePreference(themeKey, theme);
      applyAppearance();
      document.dispatchEvent(new Event('site-theme-change'));
      if (!reducedMotion.matches) {
        spin?.cancel();
        spin = themeButton
          .querySelector('span')
          .animate([{ rotate: '0turn' }, { rotate: '1turn' }], {
            duration: 420,
            easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
          });
      }
    });
    if (modeButton) {
      modeButton.hidden = false;
      modeButton.addEventListener('click', () => {
        mode = root.dataset.colorMode === 'dark' ? 'light' : 'dark';
        savePreference(modeKey, mode);
        applyAppearance();
      });
    }
  });
})();
