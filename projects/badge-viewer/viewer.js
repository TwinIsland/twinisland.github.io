const siteRoot = new URL('../../', import.meta.url);
const selector = document.getElementById('badge-select');
const preview = document.getElementById('badge-preview');
const status = document.getElementById('viewer-status');
const code = document.getElementById('badge-code');
const sourceButtons = [...document.querySelectorAll('[data-source]')];
let source = 'badge';
let dispose;
let badgeRequest = 0;
let sourceRequest = 0;

async function fetchFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response;
}

function badgeName(path) {
    const parts = path.split('/');
    const file = parts.pop();
    const name = file === 'index.js' && parts.length ? parts.at(-1) : file.replace(/\.js$/, '');
    return name.split('-').map((word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

async function showSource() {
    const request = ++sourceRequest;
    const path = source === 'renderer' ? 'badge/webgl.js' : selector.value;
    code.textContent = 'Loading source…';
    try {
        const response = await fetchFile(new URL(path, siteRoot));
        const text = await response.text();
        if (request === sourceRequest) {
            code.textContent = text;
            code.parentElement.scrollTo(0, 0);
        }
    } catch (error) {
        if (request === sourceRequest) {
            code.textContent = `Could not load source: ${error.message}`;
        }
    }
}

async function showBadge() {
    const request = ++badgeRequest;
    const path = selector.value;
    status.textContent = '';
    if (source === 'badge') {
        showSource();
    }
    try {
        const { mount } = await import(new URL(path, siteRoot).href);
        if (request !== badgeRequest) {
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.className = 'brand-badge';
        canvas.setAttribute('aria-label', `${badgeName(path)} preview`);
        const release = mount(canvas);
        dispose?.();
        preview.replaceChildren(canvas);
        dispose = typeof release === 'function' ? release : undefined;
        if (!dispose) {
            status.textContent = 'WebGL preview is unavailable.';
        }
    } catch (error) {
        if (request === badgeRequest) {
            dispose?.();
            dispose = undefined;
            preview.replaceChildren();
            status.textContent = `Could not load badge: ${error.message}`;
        }
    }
}

async function init() {
    try {
        const response = await fetchFile(new URL('data/site-content.json', siteRoot));
        const config = (await response.json()).profile?.badge;
        const paths = Array.isArray(config?.list)
            ? config.list
            : [typeof config === 'string' ? config : config?.module];
        for (const path of paths.filter((entry) => typeof entry === 'string' && entry)) {
            selector.add(new Option(badgeName(path), path));
        }
        if (!selector.options.length) {
            status.textContent = 'No badges configured.';
            return;
        }
        if (paths.includes(config?.default)) {
            selector.value = config.default;
        }
        selector.disabled = false;
        selector.addEventListener('change', showBadge);
        sourceButtons.forEach((button) => button.addEventListener('click', () => {
            source = button.dataset.source;
            sourceButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
            showSource();
        }));
        showBadge();
    } catch (error) {
        status.textContent = `Could not load badge list: ${error.message}`;
    }
}

init();
