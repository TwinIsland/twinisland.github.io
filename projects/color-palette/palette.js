import { website } from './templates/website.js';
import { paper } from './templates/paper.js';
import { rendering } from './templates/rendering.js';

const palettes = [
    {
        name: 'Yuru Theme',
        description: 'Inspired by Yuru Camp.',
        template: website,
        application: 'Website',
        colors: { Surface: '#FFFFFF', Ink: '#712F3E', Accent: '#88D4CC' },
        darkColors: { Surface: '#18171D', Ink: '#EEDCE2', Accent: '#83C8C1' }
    },
    {
        name: 'Rain Theme',
        description: 'Cool, muted tones for scientific figures.',
        template: paper,
        application: 'Paper',
        colors: {
            Surface: '#FFFFFF', Ink: '#24334A', Grid: '#D9E3EF',
            'Series 1': '#306296', 'Series 2': '#19796B', 'Series 3': '#89517B'
        }
    },
    {
        name: 'PPT Style',
        description: 'Inspired by PowerPoint.',
        template: paper,
        application: 'Paper',
        colors: {
            Surface: '#FFFFFF', Ink: '#000000', 'Light Gray': '#E7E6E6', Slate: '#44546A',
            'Light Blue': '#5B9BD5', 'Series 2': '#ED7D31', Grid: '#A5A5A5',
            Gold: '#FFC000', 'Series 1': '#4472C4', 'Series 3': '#70AD47'
        }
    },
    {
        name: 'TPMS Style',
        description: "I don't know why I called it the TPMS color palette, but I use it a lot.",
        template: rendering,
        application: '3D Rendering',
        colors: {
            Front: '#AADAFF', Back: '#FF7C7C', Background: '#404040',
            Wireframe: '#34465C', 'Cut Edge': '#C4AC99', Highlight: '#FFF1DC'
        }
    }
];

const picker = document.querySelector('.palette-select');
const application = document.querySelector('.application-select');
const defaultColors = palettes.map(({ colors, darkColors }) => ({
    colors: { ...colors },
    darkColors: darkColors && { ...darkColors }
}));
const description = document.querySelector('.palette-description');
const grid = document.querySelector('.palette-grid');
const colorName = document.querySelector('.palette-color-name');
const editor = document.querySelector('.palette-editor');
const values = [...document.querySelectorAll('.palette-value')];
const preview = document.querySelector('.preview-content');
const status = document.querySelector('.palette-status');
let noticeTimer;
let selectedPalette;
let selectedSwatch;
let previewController;

const accentSteps = [0.8, 0.6, 0.4, -0.25, -0.5];

function shades(hex) {
    const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16));
    const lightness = (Math.max(...channels) + Math.min(...channels)) / 510;
    const steps = lightness > 0.92 ? [-0.05, -0.15, -0.25, -0.35, -0.5]
        : lightness < 0.08 ? [0.5, 0.35, 0.25, 0.15, 0.05] : accentSteps;
    return [hex, ...steps.map((amount) => {
        const target = amount > 0 ? 255 : 0;
        return '#' + channels.map((channel) => Math.round(channel + (target - channel) * Math.abs(amount))
            .toString(16).padStart(2, '0')).join('').toUpperCase();
    })];
}

function notify(message, temporary = true) {
    clearTimeout(noticeTimer);
    status.textContent = message;
    if (temporary) {
        noticeTimer = setTimeout(() => { status.textContent = ''; }, 2400);
    }
}

function representations(hex) {
    const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16));
    const [r, g, b] = channels.map((value) => value / 255);
    const high = Math.max(r, g, b);
    const low = Math.min(r, g, b);
    const delta = high - low;
    const lightness = (high + low) / 2;
    let hue = 0;
    if (delta) {
        if (high === r) hue = (g - b) / delta;
        else if (high === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
    }
    const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
    return [
        ['HEX', hex],
        ['RGB', `rgb(${channels.join(', ')})`],
        ['HSL', `hsl(${Math.round(hue * 60 + 360) % 360}, ${(saturation * 100).toFixed(1)}%, ${(lightness * 100).toFixed(1)}%)`]
    ];
}

function render() {
    previewController?.abort();
    previewController = new AbortController();
    selectedPalette = palettes[Number(picker.value)];
    description.textContent = selectedPalette.description;
    preview.replaceChildren(selectedPalette.template(selectedPalette.colors, {
        darkColors: selectedPalette.darkColors,
        signal: previewController.signal
    }));
    renderColors();
}

function renderColors() {
    clearTimeout(noticeTimer);
    status.textContent = '';
    const entries = Object.entries(selectedPalette.colors).map(([name, hex]) => ({ name, hex, scheme: 'light' }));
    if (selectedPalette.darkColors) {
        for (const [name, hex] of Object.entries({ ...selectedPalette.colors, ...selectedPalette.darkColors })) {
            entries.push({ name, hex, scheme: 'dark' });
        }
    }
    grid.replaceChildren(...entries.map(({ name, hex, scheme }) => {
        const column = document.createElement('div');
        column.className = 'palette-column';
        column.dataset.color = name;
        column.dataset.scheme = scheme;
        shades(hex).forEach((value, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'palette-swatch';
            button.dataset.shade = index;
            button.tabIndex = -1;
            button.setAttribute('aria-pressed', 'false');
            column.append(button);
            updateSwatch(button, value);
        });
        return column;
    }));
    selectedSwatch = null;
    selectSwatch(grid.querySelector('button'));
}

function updateSwatch(button, hex) {
    const { color, scheme } = button.parentElement.dataset;
    const name = selectedPalette.darkColors ? `${scheme === 'dark' ? 'Dark' : 'Light'} ${color}` : color;
    button.dataset.hex = hex;
    button.style.backgroundColor = hex;
    button.title = `${name}${button.dataset.shade === '0' ? ' · Base' : ''} · ${hex}`;
    button.setAttribute('aria-label', button.title);
}

function selectSwatch(button) {
    if (selectedSwatch) {
        selectedSwatch.tabIndex = -1;
        selectedSwatch.setAttribute('aria-pressed', 'false');
    }
    selectedSwatch = button;
    button.tabIndex = 0;
    button.setAttribute('aria-pressed', 'true');
    colorName.textContent = button.title;
    const { color, scheme } = button.parentElement.dataset;
    editor.value = (scheme === 'dark' ? selectedPalette.darkColors[color] : undefined) ?? selectedPalette.colors[color];
    representations(button.dataset.hex).forEach(([format, value], index) => {
        values[index].querySelector('code').textContent = value;
        values[index].setAttribute('aria-label', `Copy ${format}: ${value}`);
    });
}

grid.addEventListener('click', (event) => {
    const button = event.target.closest('.palette-swatch');
    if (button) selectSwatch(button);
});

grid.addEventListener('keydown', (event) => {
    const button = event.target.closest('.palette-swatch');
    if (!button) return;
    const column = button.parentElement;
    const shade = Number(button.dataset.shade);
    let next;
    switch (event.key) {
        case 'ArrowLeft': next = column.previousElementSibling?.children[shade]; break;
        case 'ArrowRight': next = column.nextElementSibling?.children[shade]; break;
        case 'ArrowUp': next = button.previousElementSibling; break;
        case 'ArrowDown': next = button.nextElementSibling; break;
        default: return;
    }
    event.preventDefault();
    if (next) {
        selectSwatch(next);
        next.focus();
    }
});

editor.addEventListener('input', () => {
    const column = selectedSwatch.parentElement;
    const { color, scheme } = column.dataset;
    const hex = editor.value.toUpperCase();
    const palette = scheme === 'dark' ? selectedPalette.darkColors : selectedPalette.colors;
    palette[color] = hex;
    const example = preview.firstElementChild;
    const previewScheme = example.style.colorScheme || 'light';
    const inheritsLight = scheme === 'light' && selectedPalette.darkColors && !Object.hasOwn(selectedPalette.darkColors, color);
    if (previewScheme === scheme || (previewScheme === 'dark' && inheritsLight)) {
        const property = color.toLowerCase().replaceAll(' ', '-');
        example.style.setProperty(`--sample-${property}`, hex);
    }
    const variants = shades(hex);
    variants.forEach((value, index) => updateSwatch(column.children[index], value));
    if (inheritsLight) {
        const darkColumn = [...grid.children].find((entry) => entry.dataset.scheme === 'dark' && entry.dataset.color === color);
        variants.forEach((value, index) => updateSwatch(darkColumn.children[index], value));
    }
    selectSwatch(selectedSwatch);
});

document.querySelector('.palette-reset').addEventListener('click', () => {
    const defaults = defaultColors[Number(picker.value)];
    Object.assign(selectedPalette.colors, defaults.colors);
    if (selectedPalette.darkColors) {
        for (const name of Object.keys(selectedPalette.darkColors)) {
            delete selectedPalette.darkColors[name];
        }
        Object.assign(selectedPalette.darkColors, defaults.darkColors);
    }

    const example = preview.firstElementChild;
    const palette = example.style.colorScheme === 'dark'
        ? { ...selectedPalette.colors, ...selectedPalette.darkColors }
        : selectedPalette.colors;
    for (const [name, hex] of Object.entries(palette)) {
        example.style.setProperty(`--sample-${name.toLowerCase().replaceAll(' ', '-')}`, hex);
    }
    for (const column of grid.children) {
        const { color, scheme } = column.dataset;
        const hex = (scheme === 'dark' ? selectedPalette.darkColors[color] : undefined) ?? selectedPalette.colors[color];
        shades(hex).forEach((value, index) => updateSwatch(column.children[index], value));
    }
    selectSwatch(selectedSwatch);
    notify('Default colors restored.');
});

for (const button of values) {
    button.addEventListener('click', async () => {
        const code = button.querySelector('code');
        const value = code.textContent;
        try {
            await navigator.clipboard.writeText(value);
            notify(`Copied ${value}`);
        } catch {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(code);
            selection.removeAllRanges();
            selection.addRange(range);
            notify('Value selected. Use your device’s Copy command.', false);
        }
    });
}

function filterPalettes() {
    const previous = picker.value;
    const options = palettes.flatMap((palette, index) =>
        !application.value || palette.application === application.value ? [new Option(palette.name, index)] : []
    );
    picker.replaceChildren(...options);
    if (options.some((option) => option.value === previous)) picker.value = previous;
    if (picker.value !== previous) render();
}

for (const label of new Set(palettes.map((palette) => palette.application))) {
    application.add(new Option(label));
}
application.addEventListener('change', filterPalettes);
picker.addEventListener('change', render);
filterPalettes();
