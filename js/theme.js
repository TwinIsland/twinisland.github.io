(() => {
    const root = document.documentElement;
    const systemTheme = matchMedia('(prefers-color-scheme: dark)');
    const storageKey = 'site-theme';
    let preference;
    let button;

    try {
        const saved = localStorage.getItem(storageKey);
        if (saved === 'light' || saved === 'dark') preference = saved;
    } catch {
        // The switch still works when storage is unavailable.
    }

    function applyTheme() {
        const theme = preference ?? (systemTheme.matches ? 'dark' : 'light');
        root.dataset.theme = theme;
        button?.setAttribute('aria-pressed', String(theme === 'dark'));
    }

    applyTheme();
    systemTheme.addEventListener('change', applyTheme);
    document.addEventListener('DOMContentLoaded', () => {
        button = document.querySelector('.theme-toggle');
        if (!button) return;
        applyTheme();
        button.hidden = false;
        button.addEventListener('click', () => {
            preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
            applyTheme();
            try {
                localStorage.setItem(storageKey, preference);
            } catch {
                // Keep the choice for the current page.
            }
        });
    });
})();
