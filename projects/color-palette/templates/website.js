export function website(colors, { darkColors } = {}) {
    const page = document.createElement('article');
    page.className = 'sample-page';
    page.innerHTML = `
        <header>
            <strong>Field Notes</strong>
            <div class="sample-nav"><span>Journal</span></div>
        </header>
        <div class="sample-content">
            <h3>An afternoon by the water</h3>
            <p>A short walk to the river, with enough time to watch the clouds drift by.</p>
            <span class="sample-button">Read the note</span>
            <section class="sample-note">
                <h4>At the riverbank</h4>
                <p>The trail was quiet. A kingfisher stayed on the same branch for most of the afternoon.</p>
            </section>
        </div>
    `;

    function applyColors({ Surface, Ink, Accent }, scheme) {
        page.style.colorScheme = scheme;
        page.style.setProperty('--sample-surface', Surface);
        page.style.setProperty('--sample-ink', Ink);
        page.style.setProperty('--sample-accent', Accent);
    }

    applyColors(colors, 'light');
    if (darkColors) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'sample-theme-toggle';
        toggle.textContent = 'Dark mode';
        toggle.setAttribute('aria-pressed', 'false');
        let dark = false;
        toggle.addEventListener('click', () => {
            dark = !dark;
            const activeColors = dark ? { ...colors, ...darkColors } : colors;
            applyColors(activeColors, dark ? 'dark' : 'light');
            toggle.setAttribute('aria-pressed', String(dark));
        });
        page.querySelector('.sample-nav').append(toggle);
    }
    return page;
}
