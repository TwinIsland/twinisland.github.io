function initPlaceDisclosure(panel, buttons) {
    const viewport = panel.querySelector('.map-place-viewport');
    const list = panel.querySelector('.map-place-list');
    const toggle = panel.querySelector('.map-place-toggle');
    let expanded = false;

    function update() {
        if (!list.clientWidth) return;

        const rows = [...new Set(buttons.map((button) => button.offsetTop))];
        const cutoff = rows[5];
        const collapsed = cutoff !== undefined && !expanded;
        toggle.hidden = cutoff === undefined;
        toggle.setAttribute('aria-expanded', String(expanded && cutoff !== undefined));
        toggle.setAttribute('aria-label', expanded ? 'Show fewer places' : 'Show all places');
        viewport.classList.toggle('is-collapsed', collapsed);
        viewport.style.setProperty('--map-place-full-height', `${list.offsetHeight}px`);
        if (collapsed) {
            viewport.style.setProperty('--map-place-cutoff', `${cutoff}px`);
        }
        for (const button of buttons) {
            button.inert = collapsed && button.offsetTop >= cutoff;
        }
    }

    toggle.addEventListener('click', () => {
        expanded = !expanded;
        update();
    });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    update();
}

function initTravelMap(container, places) {
    if (!container || !places.length) {
        if (container) container.textContent = 'No map locations configured.';
        return;
    }

    const width = 720;
    const height = 288;
    const zoom = 1.65;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = (tag, attributes = {}) => {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
        return element;
    };
    const map = svg('svg', { viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' });
    const scene = svg('g');
    const tooltip = document.createElement('div');
    tooltip.className = 'travel-map-tooltip';
    tooltip.hidden = true;
    const basemap = svg('image', { width, height });
    const loadBasemap = () => basemap.setAttribute('href', 'assets/world-map.svg');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            loadBasemap();
            observer.disconnect();
        }, { rootMargin: '120px' });
        observer.observe(container);
    } else {
        loadBasemap();
    }

    const markers = places.map((place) => {
        // Match the equirectangular projection and crop in assets/world-map.svg.
        const x = (Number(place.lon) + 180) * 2;
        const y = (84 - Number(place.lat)) * 2;
        const dot = svg('circle', { cx: x, cy: y, r: 3.3, class: 'travel-map-dot' });
        dot.addEventListener('pointerenter', (event) => {
            if (event.pointerType === 'touch') return;
            tooltip.textContent = place.name;
            tooltip.hidden = false;
            const bounds = container.getBoundingClientRect();
            const point = dot.getBoundingClientRect();
            const left = point.left + point.width / 2 - bounds.left - tooltip.offsetWidth / 2;
            tooltip.style.left = `${Math.max(4, Math.min(bounds.width - tooltip.offsetWidth - 4, left))}px`;
            const above = point.top - bounds.top - tooltip.offsetHeight - 7;
            tooltip.style.top = `${above >= 4 ? above : point.bottom - bounds.top + 7}px`;
        });
        dot.addEventListener('pointerleave', () => { tooltip.hidden = true; });
        return { x, y, dot };
    });
    scene.append(basemap, ...markers.map(({ dot }) => dot));
    map.append(scene);
    container.replaceChildren(map, tooltip);

    const placesPanel = container.nextElementSibling;
    const buttons = [...placesPanel.querySelectorAll('.map-place')];
    initPlaceDisclosure(placesPanel, buttons);
    let active = -1;
    let frame;
    let burst;
    let burstTimer;
    let camera = { x: 0, y: 0, scale: 1 };

    function firework({ x, y }) {
        burst = svg('g', { transform: `translate(${x} ${y})`, class: 'travel-map-burst' });
        const colors = ['#397e76', '#88d4cc', '#b76a86', '#d6a755'];
        for (let i = 0; i < 12; i += 1) {
            const angle = i * Math.PI / 6;
            const distance = i % 2 ? 23 : 16;
            const spark = svg('circle', { r: i % 2 ? 1.5 : 1.9, fill: colors[i % colors.length] });
            spark.style.setProperty('--spark-x', `${Math.cos(angle) * distance}px`);
            spark.style.setProperty('--spark-y', `${Math.sin(angle) * distance}px`);
            burst.append(spark);
        }
        scene.append(burst);
        burstTimer = setTimeout(() => burst?.remove(), 650);
    }

    function select(index) {
        tooltip.hidden = true;
        cancelAnimationFrame(frame);
        clearTimeout(burstTimer);
        burst?.remove();
        buttons[active]?.setAttribute('aria-pressed', 'false');
        markers[active]?.dot.classList.remove('is-selected');
        active = index;
        const marker = markers[index];
        if (marker) {
            buttons[index].setAttribute('aria-pressed', 'true');
            marker.dot.classList.add('is-selected');
            scene.append(marker.dot);
        }

        const clamp = (value, min) => Math.max(min, Math.min(0, value));
        const target = marker ? {
            x: clamp(width / 2 - marker.x * zoom, width * (1 - zoom)),
            y: clamp(height / 2 - marker.y * zoom, height * (1 - zoom)),
            scale: zoom
        } : { x: 0, y: 0, scale: 1 };
        const start = camera;
        const duration = reducedMotion.matches ? 0 : 480;
        const startTime = performance.now();
        function draw(now) {
            if (!container.isConnected) return;
            const progress = duration ? Math.max(0, Math.min(1, (now - startTime) / duration)) : 1;
            const t = 1 - (1 - progress) ** 3;
            camera = {
                x: start.x + (target.x - start.x) * t,
                y: start.y + (target.y - start.y) * t,
                scale: start.scale + (target.scale - start.scale) * t
            };
            scene.setAttribute('transform', `translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
            if (progress < 1) {
                frame = requestAnimationFrame(draw);
            } else if (marker && !reducedMotion.matches) {
                firework(marker);
            }
        }
        frame = requestAnimationFrame(draw);
    }

    container.addEventListener('click', () => {
        if (active !== -1) select(-1);
    });

    buttons.forEach((button, index) => {
        button.disabled = false;
        button.addEventListener('click', () => {
            if (!basemap.hasAttribute('href')) loadBasemap();
            container.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
            select(active === index ? -1 : index);
        });
    });
}
