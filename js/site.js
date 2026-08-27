const state = {
    data: null,
    miscMapRoots: [],
    amChartsLoadPromise: null,
    miscGalleryLightbox: null,
    publicationPosterLightbox: null,
    blogLightbox: null,
    blogViewingPost: false,
    lazyMediaObserver: null,
    lazyMediaMutationObserver: null
};

const tabs = ['about', 'publications', 'projects', 'misc', 'blog', 'cv'];
const tabRenderers = {
    about: (section, data) => renderAbout(section, data.profile),
    publications: (section) => renderPublications(section),
    projects: (section) => renderProjects(section),
    misc: (section) => renderMisc(section),
    blog: (section) => renderBlog(section),
    cv: (section) => renderCvTab(section)
};
const markdownRenderer = createMarkdownRenderer();

const AMCHARTS_SCRIPTS = [
    'https://cdn.amcharts.com/lib/5/index.js',
    'https://cdn.amcharts.com/lib/5/map.js',
    'https://cdn.amcharts.com/lib/5/geodata/worldLow.js',
    'https://cdn.amcharts.com/lib/5/themes/Animated.js'
];

const PAGE_REVEAL_TIMEOUT_MS = 1500;
const CONTENT_LOAD_TIMEOUT_MS = 5000;

document.addEventListener('DOMContentLoaded', () => {
    initLazyMedia();
    bindTabEvents();
    syncHeaderOffset();
    syncTabIndicator();
    window.addEventListener('resize', syncHeaderOffset);
    window.addEventListener('resize', syncTabIndicator);
    window.addEventListener('scroll', updateBlogScrollTopButtonVisibility, { passive: true });
    if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
            syncHeaderOffset();
            syncTabIndicator();
        }).catch(() => { });
    }
    initPage();
});

async function initPage() {
    const contentController = new AbortController();
    const contentTimeoutId = setTimeout(() => contentController.abort(), CONTENT_LOAD_TIMEOUT_MS);

    try {
        const response = await fetch('data/site-content.json', {
            cache: 'no-store',
            signal: contentController.signal
        });
        if (!response.ok) {
            throw new Error(`Failed to load content: ${response.status}`);
        }
        state.data = await response.json();

        if (state.data?.maitnaiance === true || state.data?.maintenance === true) {
            renderMaintenancePage();
            await revealSiteWhenReady(document.querySelector('.maintenance-gif'));
            return;
        }

        renderAll(state.data);
        syncHeaderOffset();

        const initialTab = location.hash.replace('#', '');
        if (tabs.includes(initialTab)) {
            activateTab(initialTab);
        } else {
            activateTab('about');
        }

        await revealSiteWhenReady(document.querySelector('.profile-photo'));
    } catch (error) {
        const message = error.name === 'AbortError'
            ? 'The site content took too long to load. Please refresh and try again.'
            : error.message;
        showLoadError(message);
        syncHeaderOffset();
        revealSite();
    } finally {
        clearTimeout(contentTimeoutId);
    }
}

async function revealSiteWhenReady(criticalImage) {
    const fontPromise = document.fonts
        ? Promise.all([
            document.fonts.load('400 1rem Poppins'),
            document.fonts.load('700 1rem Poppins')
        ])
        : Promise.resolve();

    const imagePromise = criticalImage?.decode
        ? criticalImage.decode().catch(() => { })
        : Promise.resolve();

    await Promise.race([
        Promise.allSettled([fontPromise, imagePromise]),
        new Promise((resolve) => setTimeout(resolve, PAGE_REVEAL_TIMEOUT_MS))
    ]);

    syncHeaderOffset();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    revealSite();
}

function revealSite() {
    document.body.classList.remove('site-loading');
    document.querySelector('.page-shell')?.setAttribute('aria-busy', 'false');
    document.getElementById('site-loader')?.setAttribute('aria-hidden', 'true');
}

function renderMaintenancePage() {
    const pageShell = document.querySelector('.page-shell');
    if (!pageShell) {
        return;
    }

    document.body.classList.add('maintenance-mode');
    pageShell.innerHTML = `
        <section class="maintenance-shell">
            <img class="maintenance-gif" data-src="assets/suica_chara.gif" alt="Maintenance character" width="110" height="110" loading="lazy" decoding="async">
            <h1 class="maintenance-title">Under Maintenance</h1>
            <p class="maintenance-text">The site will be available on April 1st.</p>
        </section>
    `;
}

function bindTabEvents() {
    document.querySelectorAll('.tab-button').forEach((button) => {
        button.addEventListener('click', () => activateTab(button.dataset.tab));
    });
}

function syncHeaderOffset() {
    const header = document.querySelector('.site-header');
    if (!header) {
        return;
    }

    const headerHeight = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
}

function syncTabIndicator() {
    const nav = document.querySelector('.tab-nav');
    const indicator = nav?.querySelector('.tab-indicator');
    if (!nav || !indicator) {
        return;
    }

    const buttons = [...nav.querySelectorAll('.tab-button')];
    if (buttons.length === 0) {
        return;
    }

    // The shared pill only makes sense on a single row; fall back to a plain
    // active background when the tabs wrap (class handled in CSS).
    const singleRow = buttons.every((button) => button.offsetTop === buttons[0].offsetTop);
    nav.classList.toggle('is-wrapped', !singleRow);
    if (!singleRow) {
        return;
    }

    const activeButton = nav.querySelector('.tab-button.active') || buttons[0];
    indicator.style.transform = `translateX(${activeButton.offsetLeft}px)`;
    indicator.style.width = `${activeButton.offsetWidth}px`;
}

function activateTab(tabId) {
    if (!tabs.includes(tabId)) {
        return;
    }
    const activePanel = document.getElementById(`tab-${tabId}`);

    document.querySelectorAll('.tab-button').forEach((button) => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    history.replaceState(null, '', `#${tabId}`);
    syncTabIndicator();

    if (tabId === 'blog' && state.blogViewingPost) {
        renderBlog(state.data?.blog || {});
    }
    requestAnimationFrame(() => {
        if (activePanel?.classList.contains('active')) {
            replayTabMediaReveal(activePanel);
        }
    });
    updateBlogScrollTopButtonVisibility();
}

function replayTabMediaReveal(panel) {
    panel.querySelectorAll('img[src], iframe[src]').forEach((element) => {
        if (element.classList.contains('media-lazy')) {
            return;
        }
        if (element.closest('.profile-photo-game')) {
            return;
        }
        if (element instanceof HTMLImageElement && !element.complete) {
            return;
        }

        element.classList.remove('tab-media-revealed');
        void element.offsetWidth;
        element.classList.add('tab-media-revealed');
    });
}

function renderAll(data) {
    renderHeader(data.site);
    tabs.forEach((tabId) => {
        const section = data[tabId] || {};
        const label = String(section.title || tabId);
        const button = document.querySelector(`[data-tab="${tabId}"]`);
        const panel = document.getElementById(`tab-${tabId}`);

        if (button) {
            button.textContent = label;
        }
        if (panel) {
            panel.setAttribute('aria-label', label);
        }
        tabRenderers[tabId]?.(section, data);
    });
}

function renderHeader(site) {
    document.getElementById('site-name').textContent = site?.name || 'Personal Website';
    document.getElementById('site-subtitle').textContent = site?.subtitle || '';
}

function renderSectionDescription(description, plain = false) {
    const paragraphs = Array.isArray(description) ? description : [description];
    const content = paragraphs
        .filter((paragraph) => String(paragraph ?? '').trim())
        .map((paragraph) => `<p>${renderConfigText(paragraph)}</p>`)
        .join('');
    if (!content) {
        return '';
    }
    return plain ? content : `<div class="section-description">${content}</div>`;
}

function renderSectionShell(section = {}, contentHtml = '', extraClass = '', plainDescription = false) {
    const className = ['section-card', 'card', extraClass].filter(Boolean).join(' ');
    return `
        <section class="${className}">
            <h2 class="section-title">${renderConfigText(section.title || '')}</h2>
            ${renderSectionDescription(section.description, plainDescription)}
            ${contentHtml}
        </section>
    `;
}

function renderAbout(about = {}, profile = {}) {
    const aboutPanel = document.getElementById('tab-about');
    const aboutContent = about.content || {};
    const experience = aboutContent.experience || {};
    const education = aboutContent.education || {};

    const profileLinks = (profile.links || [])
        .map((link) => {
            const icon = String(link.icon || '').trim();
            const iconMarkup = icon
                ? `<img class="profile-link-icon" src="assets/icons/${escapeHtml(icon)}.svg" alt="" width="16" height="16" loading="lazy" decoding="async" onerror="this.remove()">`
                : '';
            return `<a href="${link.url}" target="_blank" rel="noopener">${iconMarkup}${escapeHtml(link.label)}</a>`;
        })
        .join('');

    const experienceHtml = (experience.items || [])
        .map((item) => `
            <article class="timeline-item">
                <div class="timeline-header">
                    <h3 class="timeline-role">${renderConfigText(item.role)}</h3>
                    <span class="timeline-date">${renderConfigText(item.date)}</span>
                </div>
                <p class="timeline-org">${renderConfigText(item.org)}</p>
                <p class="timeline-meta">${renderConfigText(item.meta || '')}</p>
                <p class="timeline-desc">${renderConfigText(item.description)}</p>
            </article>
        `)
        .join('');

    const educationHtml = (education.items || [])
        .map((item) => `
            <article class="education-item">
                <div class="education-logo-wrap">
                    <img class="education-logo" data-src="${escapeHtml(item.logo || '')}" alt="${escapeHtml(item.school || 'School')} logo" loading="lazy" decoding="async">
                </div>
                <div class="education-content">
                    <div class="timeline-header">
                        <h3 class="timeline-role">${renderConfigText(item.degree)}</h3>
                        <span class="timeline-date">${renderConfigText(item.date)}</span>
                    </div>
                    <p class="timeline-org">${renderConfigText(item.school)}</p>
                    <p class="timeline-desc">${renderConfigText(item.details)}</p>
                </div>
            </article>
        `)
        .join('');

    aboutPanel.innerHTML = `
        <div class="about-grid">
            <aside class="profile-card card">
                <div class="profile-photo-game">
                    <button class="profile-photo-hitbox" type="button" aria-label="Attack profile mini game">
                        <img class="profile-photo" data-src="${escapeHtml(profile.photo || 'data/images/profile/me.jpg')}" alt="Profile photo" width="16" height="9" loading="lazy" decoding="async">
                    </button>
                    <div class="profile-hud">
                        <div class="profile-hp-track" aria-hidden="true">
                            <div class="profile-hp-fill"></div>
                        </div>
                        <p class="profile-hp-text"></p>
                    </div>
                </div>
                <h2 class="profile-name">${renderConfigText(profile.name || '')}</h2>
                <p class="profile-role">${renderConfigText(profile.role || '')}</p>
                <p class="profile-school">${renderConfigText(profile.school || '')}</p>
                <div class="profile-links">${profileLinks}</div>
            </aside>

            <div class="about-main">
                ${renderSectionShell(about, '', '', true)}
                ${renderSectionShell(experience, `<div class="experience-list">${experienceHtml}</div>`)}
                ${renderSectionShell(education, `<div class="education-list">${educationHtml}</div>`)}
            </div>
        </div>
    `;

    initProfileMiniGame(profile);
}

function renderPublications(publications = {}) {
    const panel = document.getElementById('tab-publications');
    const rows = (publications.content || [])
        .map((pub, index) => {
            const linkMap = (pub.links && typeof pub.links === 'object') ? pub.links : {};
            const normalizedLinks = Object.entries(linkMap)
                .filter(([name, url]) => String(name).trim() && String(url).trim())
                .map(([name, url]) => ({ name: String(name).trim(), url: String(url).trim() }));

            if (normalizedLinks.length === 0) {
                if (pub.doi) {
                    normalizedLinks.push({ name: 'DOI', url: String(pub.doi) });
                }
                if (pub.pdf) {
                    normalizedLinks.push({ name: 'PDF', url: String(pub.pdf) });
                }
            }

            const posterUrl = String(pub.poster || '').trim();
            const linkButtons = normalizedLinks
                .map((item) => `<a class="cta-button secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a>`);
            if (posterUrl) {
                linkButtons.push(`
                    <a class="cta-button secondary publication-poster-link glightbox"
                        href="${escapeHtml(posterUrl)}"
                        data-gallery="publication-poster-${index}"
                        data-title="${escapeHtml(pub.title || 'Publication')} — Poster"
                        target="_blank"
                        rel="noopener">Poster</a>
                `);
            }
            const actionButtons = linkButtons.join('') || '<span class="cta-button secondary disabled">Links TBD</span>';

            return `
                <article class="publication-row card">
                    <div class="publication-teaser-wrap">
                        <img class="publication-teaser" data-src="${escapeHtml(pub.teaser || '')}" alt="Publication teaser" width="16" height="9" loading="lazy" decoding="async">
                    </div>
                    <div class="publication-content">
                        <h3 class="publication-title">${renderConfigText(pub.title)}</h3>
                        <p class="publication-authors">${renderConfigText(pub.authors)}</p>
                        <p class="publication-conf">${renderConfigText(pub.conference)}</p>
                        ${pub.abstract ? `<p class="publication-abstract">${renderConfigText(pub.abstract)}</p>` : ''}
                        <div class="link-row">
                            ${actionButtons}
                        </div>
                    </div>
                </article>
            `;
        })
        .join('');

    panel.innerHTML = renderSectionShell(
        publications,
        `<div class="publication-list">${rows}</div>`
    );

    initPublicationPosterLightbox();
}

function initPublicationPosterLightbox() {
    if (!window.GLightbox) {
        return;
    }
    if (state.publicationPosterLightbox) {
        state.publicationPosterLightbox.destroy();
    }
    state.publicationPosterLightbox = window.GLightbox({
        selector: '#tab-publications .publication-poster-link',
        touchNavigation: true,
        loop: false
    });
}

function renderProjects(projects = {}) {
    const panel = document.getElementById('tab-projects');

    const projectCards = (projects.content || [])
        .map((project, index) => `
            <article class="project-item card">
                <div class="project-main">
                    <h3 class="project-title">${renderConfigText(project.title)}</h3>
                    <p class="project-time">${renderConfigText(project.date)}</p>
                    <p class="project-desc">${renderConfigText(project.description)}</p>
                    <div class="project-tags">
                        ${(project.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
                <div class="project-actions">
                    <button class="run-button" data-project-index="${index}">Run Project</button>
                </div>
            </article>
        `)
        .join('');

    panel.innerHTML = renderSectionShell(
        projects,
        `<div class="project-list">${projectCards}</div>`
    );

    panel.querySelectorAll('.run-button').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.projectIndex);
            openProjectModal(index);
        });
    });
}

function renderMisc(misc = {}) {
    const panel = document.getElementById('tab-misc');
    if (!panel) {
        return;
    }

    disposeMiscModules();

    const items = Array.isArray(misc.content) ? misc.content : [];
    const itemHtml = items
        .map((item, index) => `
            <section class="misc-block card">
                <h2>${renderConfigText(item.title || `Misc item ${index + 1}`)}</h2>
                ${item.description ? `<p class="misc-caption">${renderConfigText(item.description)}</p>` : ''}
                ${renderMiscModule(item.module, index, item.title)}
            </section>
        `)
        .join('');

    panel.innerHTML = renderSectionShell(
        misc,
        itemHtml || '<p>No miscellaneous items configured yet.</p>'
    );

    initMiscGalleryLightbox();
    items.forEach((item, index) => {
        if (item.module?.type === 'map') {
            renderMiscMap(item.module, `misc-map-${index}`);
        }
    });
}

function renderMiscModule(module = {}, index, itemTitle = '') {
    if (!module || typeof module !== 'object') {
        return '<p class="misc-caption">No module configured.</p>';
    }

    if (module.type === 'gallery') {
        const images = Array.isArray(module.items) ? module.items : [];
        return `
            <div class="gallery-grid">
                ${images.map((image, imageIndex) => {
                    const src = String(image?.src || '');
                    const alt = String(image?.alt || `Gallery image ${imageIndex + 1}`);
                    return `
                        <a class="gallery-item glightbox" href="${escapeHtml(src)}" data-gallery="misc-gallery-${index}" data-title="${escapeHtml(alt)}">
                            <img data-src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="4" height="3" loading="lazy" decoding="async">
                        </a>
                    `;
                }).join('')}
            </div>
        `;
    }

    if (module.type === 'youtube') {
        return `
            <div class="embed-wrap">
                <iframe data-src="${escapeHtml(module.url || '')}" title="YouTube video: ${escapeHtml(itemTitle || `misc item ${index + 1}`)}" width="16" height="9" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
            </div>
        `;
    }

    if (module.type === 'map') {
        const places = Array.isArray(module.places) ? module.places : [];
        return `
            <div id="misc-map-${index}" class="misc-map">
                <p class="map-status">Loading map...</p>
            </div>
            <div class="map-place-list">
                ${places.map((place) => `<span class="chip">${escapeHtml(place.name || '')}</span>`).join('')}
            </div>
        `;
    }

    return `<p class="misc-caption">Unsupported module type: ${escapeHtml(module.type || 'unknown')}.</p>`;
}

function disposeMiscModules() {
    state.miscMapRoots.forEach((root) => root.dispose());
    state.miscMapRoots = [];

    if (state.miscGalleryLightbox) {
        state.miscGalleryLightbox.destroy();
        state.miscGalleryLightbox = null;
    }
}

function initMiscGalleryLightbox() {
    if (!window.GLightbox) {
        return;
    }
    state.miscGalleryLightbox = window.GLightbox({
        selector: '#tab-misc .glightbox',
        touchNavigation: true,
        loop: true
    });
}

async function renderMiscMap(module, containerId) {
    const mapContainer = document.getElementById(containerId);
    if (!mapContainer) {
        return;
    }

    const places = (module.places || [])
        .filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)));

    if (places.length === 0) {
        mapContainer.innerHTML = '<p class="map-status">No map locations configured yet.</p>';
        return;
    }

    mapContainer.innerHTML = '<p class="map-status">Loading map...</p>';

    try {
        await ensureAmChartsReady();

        mapContainer.innerHTML = '';

        const root = window.am5.Root.new(containerId);
        state.miscMapRoots.push(root);

        root.setThemes([window.am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            window.am5map.MapChart.new(root, {
                panX: 'translateX',
                panY: 'translateY',
                projection: window.am5map.geoMercator()
            })
        );

        const polygonSeries = chart.series.push(
            window.am5map.MapPolygonSeries.new(root, {
                geoJSON: window.am5geodata_worldLow,
                exclude: ['AQ']
            })
        );

        polygonSeries.mapPolygons.template.setAll({
            fill: window.am5.color(0xeaecf0),
            stroke: window.am5.color(0x712f3e),
            strokeOpacity: 0.35,
            strokeWidth: 0.8
        });

        const pointSeries = chart.series.push(window.am5map.MapPointSeries.new(root, {}));

        pointSeries.bullets.push(() => {
            const marker = window.am5.Circle.new(root, {
                radius: 5,
                fill: window.am5.color(0x712f3e),
                stroke: window.am5.color(0xffffff),
                strokeWidth: 1.2,
                tooltipText: '{title}'
            });

            return window.am5.Bullet.new(root, { sprite: marker });
        });

        pointSeries.data.setAll(
            places.map((place) => ({
                title: place.name,
                geometry: {
                    type: 'Point',
                    coordinates: [Number(place.lon), Number(place.lat)]
                }
            }))
        );

        chart.appear(850, 120);
    } catch (error) {
        mapContainer.innerHTML = '<p class="map-status">Map failed to load. Check network/CDN availability.</p>';
    }
}

async function ensureAmChartsReady() {
    if (window.am5 && window.am5map && window.am5geodata_worldLow && window.am5themes_Animated) {
        return;
    }

    if (!state.amChartsLoadPromise) {
        state.amChartsLoadPromise = (async () => {
            for (const scriptUrl of AMCHARTS_SCRIPTS) {
                await ensureScript(scriptUrl);
            }
        })();
    }

    try {
        await state.amChartsLoadPromise;
    } catch (error) {
        state.amChartsLoadPromise = null;
        throw error;
    }
}

function ensureScript(url) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${url}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolve();
                return;
            }

            existing.addEventListener('load', () => {
                existing.dataset.loaded = 'true';
                resolve();
            }, { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load: ${url}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.async = true;

        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load: ${url}`));

        document.head.appendChild(script);
    });
}

function renderCvTab(payload) {
    const panel = document.getElementById('tab-cv');
    if (!panel) {
        return;
    }
    const url = String(payload?.content?.url || '').trim();

    panel.innerHTML = renderSectionShell(
        payload,
        `
            <div class="cv-embed-wrap">
                <iframe
                    class="cv-embed-frame"
                    src="${escapeHtml(url)}#view=FitH"
                    title="Embedded CV PDF"
                    loading="lazy">
                </iframe>
            </div>
            <div class="link-row">
                <a class="cta-button primary" href="${escapeHtml(url)}" target="_blank" rel="noopener">Open Full PDF</a>
            </div>
        `
    );
}

function renderBlog(blog = {}) {
    const panel = document.getElementById('tab-blog');
    if (!panel) {
        return;
    }
    state.blogViewingPost = false;

    const posts = Array.isArray(blog.content) ? blog.content : [];
    const listHtml = posts.length > 0
        ? posts.map((post, index) => `
            <article class="blog-list-item card">
                <div class="blog-cover-link">
                    <img class="blog-cover" data-src="${escapeHtml(post.cover || '')}" alt="${escapeHtml(post.title || 'Blog cover')}" width="16" height="9" loading="lazy" decoding="async">
                </div>
                <div class="blog-item-content">
                    <h3 class="blog-item-title">${renderConfigText(post.title || `Post ${index + 1}`)}</h3>
                    <p class="blog-item-intro">${renderConfigText(post.intro || '')}</p>
                    <button class="cta-button secondary blog-open-button" type="button" data-post-index="${index}">Read Article</button>
                </div>
            </article>
        `).join('')
        : '<p>No blog posts configured yet.</p>';

    panel.innerHTML = renderSectionShell(
        blog,
        `<div class="blog-list">${listHtml}</div>`
    );

    panel.querySelectorAll('.blog-open-button').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.postIndex);
            openBlogPost(index);
        });
    });
    if (state.blogLightbox) {
        state.blogLightbox.destroy();
        state.blogLightbox = null;
    }
    updateBlogScrollTopButtonVisibility();
}

async function openBlogPost(postIndex) {
    const panel = document.getElementById('tab-blog');
    const blogData = state.data?.blog || {};
    const posts = Array.isArray(blogData.content) ? blogData.content : [];
    const post = posts[postIndex];

    if (!panel || !post) {
        return;
    }

    const title = String(post.title || 'Untitled Post');
    const intro = String(post.intro || '');
    const markdownPath = String(post.markdown || '').trim();
    state.blogViewingPost = true;
    if (!markdownPath) {
        panel.innerHTML = `
            <section class="section-card card">
                <h2 class="section-title">${escapeHtml(title)}</h2>
                <p>Missing markdown path in blog post config.</p>
                <button class="cta-button secondary blog-back-button" type="button">Back to Blog List</button>
            </section>
        `;
        panel.querySelector('.blog-back-button')?.addEventListener('click', () => renderBlog(blogData));
        return;
    }

    panel.innerHTML = `
        <section class="section-card card blog-article-shell">
            <button class="cta-button secondary blog-back-button" type="button">Back to Blog List</button>
            <h2 class="section-title">${escapeHtml(title)}</h2>
            <p class="blog-item-intro">${renderConfigText(intro)}</p>
            <div class="blog-article-loading">Loading article...</div>        
            <button class="blog-scroll-top" type="button" aria-label="Back to top">Top</button>
        </section>
    `;

    panel.querySelector('.blog-back-button')?.addEventListener('click', () => renderBlog(blogData));
    panel.querySelector('.blog-scroll-top')?.addEventListener('click', scrollToTop);
    updateBlogScrollTopButtonVisibility();

    try {
        const response = await fetch(markdownPath, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load markdown: ${response.status}`);
        }

        if (!markdownRenderer) {
            throw new Error('Markdown renderer is not available.');
        }

        const markdown = await response.text();
        const rawHtml = markdownRenderer.render(markdown);
        const hydratedHtml = hydrateBlogHtml(rawHtml, markdownPath, title);
        const coverMarkup = post.cover
            ? `
                <figure class="blog-article-cover-wrap">
                    <a class="blog-article-cover-link glightbox" href="${escapeHtml(post.cover)}" data-gallery="blog-article-cover" data-title="${escapeHtml(title)}">
                        <img class="blog-article-cover" data-src="${escapeHtml(post.cover)}" alt="${escapeHtml(title)} cover" width="2" height="1" loading="lazy" decoding="async">
                    </a>
                </figure>
            `
            : '';

        panel.innerHTML = `
            <section class="section-card card blog-article-shell">
                <button class="cta-button secondary blog-back-button" type="button">Back to Blog List</button>
                <h2 class="section-title">${escapeHtml(title)}</h2>
                <p class="blog-item-intro">${renderConfigText(intro)}</p>
                <article class="blog-article markdown-body">
                    ${coverMarkup}
                    ${hydratedHtml}
                </article>
                <button class="blog-scroll-top" type="button" aria-label="Back to top">Top</button>
            </section>
        `;

        panel.querySelector('.blog-back-button')?.addEventListener('click', () => renderBlog(blogData));
        panel.querySelector('.blog-scroll-top')?.addEventListener('click', scrollToTop);
        initBlogLightbox('#tab-blog .glightbox');
        updateBlogScrollTopButtonVisibility();
    } catch (error) {
        panel.innerHTML = `
            <section class="section-card card blog-article-shell">
                <button class="cta-button secondary blog-back-button" type="button">Back to Blog List</button>
                <h2 class="section-title">${escapeHtml(title)}</h2>
                <p>Failed to load this post: ${escapeHtml(error.message)}</p>
                <button class="blog-scroll-top" type="button" aria-label="Back to top">Top</button>
            </section>
        `;
        panel.querySelector('.blog-back-button')?.addEventListener('click', () => renderBlog(blogData));
        panel.querySelector('.blog-scroll-top')?.addEventListener('click', scrollToTop);
        updateBlogScrollTopButtonVisibility();
    }
}

function hydrateBlogHtml(html, markdownPath, title) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const base = new URL(markdownPath, window.location.href);

    template.content.querySelectorAll('img').forEach((image) => {
        const src = image.getAttribute('src') || '';
        if (!src) {
            return;
        }

        const resolvedSrc = new URL(src, base).href;
        image.removeAttribute('src');
        image.setAttribute('data-src', resolvedSrc);
        image.setAttribute('loading', 'lazy');
        image.setAttribute('decoding', 'async');

        const parentAnchor = image.closest('a');
        if (parentAnchor) {
            const href = parentAnchor.getAttribute('href') || resolvedSrc;
            parentAnchor.setAttribute('href', new URL(href, base).href);
            parentAnchor.classList.add('glightbox');
            parentAnchor.setAttribute('data-gallery', 'blog-article-images');
            parentAnchor.setAttribute('data-title', title);
            return;
        }

        const link = document.createElement('a');
        link.href = resolvedSrc;
        link.className = 'glightbox';
        link.setAttribute('data-gallery', 'blog-article-images');
        link.setAttribute('data-title', title);
        image.replaceWith(link);
        link.appendChild(image);
    });

    template.content.querySelectorAll('a[href]').forEach((anchor) => {
        if (anchor.classList.contains('glightbox')) {
            return;
        }

        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#')) {
            return;
        }

        try {
            const parsed = new URL(href, base);
            anchor.setAttribute('href', parsed.href);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                anchor.setAttribute('target', '_blank');
                anchor.setAttribute('rel', 'noopener');
            }
        } catch {
            // Keep original href when URL parsing fails.
        }
    });

    return template.innerHTML;
}

function initBlogLightbox(selector) {
    if (!window.GLightbox) {
        return;
    }
    if (state.blogLightbox) {
        state.blogLightbox.destroy();
    }
    state.blogLightbox = window.GLightbox({
        selector,
        touchNavigation: true,
        loop: true
    });
}

function createMarkdownRenderer() {
    if (!window.markdownit) {
        return;
    }

    const md = window.markdownit({
        html: false,
        linkify: true,
        breaks: false
    });

    if (typeof window.markdownitKatexBridge === 'function') {
        md.use(window.markdownitKatexBridge);
    }

    return md;
}

function updateBlogScrollTopButtonVisibility() {
    const button = document.querySelector('#tab-blog .blog-scroll-top');
    if (!button) {
        return;
    }
    const blogPanel = document.getElementById('tab-blog');
    const isBlogActive = Boolean(blogPanel?.classList.contains('active'));
    const shouldShow = isBlogActive && state.blogViewingPost && window.scrollY > 260;
    button.classList.toggle('is-visible', shouldShow);
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function initProfileMiniGame(profile = {}) {
    const gameRoot = document.querySelector('.profile-photo-game');
    if (!gameRoot) {
        return;
    }

    const attackButton = gameRoot.querySelector('.profile-photo-hitbox');
    const photo = gameRoot.querySelector('.profile-photo');
    const hpFill = gameRoot.querySelector('.profile-hp-fill');
    const hpText = gameRoot.querySelector('.profile-hp-text');

    if (!attackButton || !photo || !hpFill || !hpText) {
        return;
    }

    const maxHp = Math.max(1, Number(profile.hp_max) || 100);
    const damagePerClick = Math.max(1, Number(profile.hp_damage) || 8);
    const wastedPhoto = String(profile.wasted_photo || 'data/images/profile/me_wasted.jpg');

    const wastedPreload = new Image();
    wastedPreload.decoding = 'async';
    wastedPreload.src = wastedPhoto;
    wastedPreload.decode?.().catch(() => { });

    const clearPhotoFadeState = () => {
        photo.classList.remove('media-lazy', 'media-revealed', 'tab-media-revealed');
    };

    const swapToWastedPhoto = async () => {
        try {
            await wastedPreload.decode();
        } catch {
            // Preload failed; swap anyway and let the browser paint when ready.
        }
        clearPhotoFadeState();
        photo.src = wastedPhoto;
    };
    const requiredClicksToStart = 1;

    let hp = maxHp;
    let defeated = false;
    let lastAttackAt = 0;
    let comboCount = 0;
    let totalClicks = 0;
    let hitTimerId = null;
    let rageTimerId = null;

    const updateHud = () => {
        const hpClamped = Math.max(0, hp);
        const hpRatio = hpClamped / maxHp;

        hpFill.style.width = `${Math.round(hpRatio * 100)}%`;

        if (defeated) {
            hpText.textContent = 'WASTED';
            gameRoot.classList.add('is-defeated');
            gameRoot.classList.remove('is-low-hp');
            return;
        }

        hpText.textContent = `HP ${hpClamped}/${maxHp}`;
        gameRoot.classList.toggle('is-low-hp', hpRatio <= 0.3);
    };

    const triggerHitEffect = () => {
        clearPhotoFadeState();
        gameRoot.classList.remove('is-hit');
        void gameRoot.offsetWidth;
        gameRoot.classList.add('is-hit');

        if (hitTimerId) {
            clearTimeout(hitTimerId);
        }
        hitTimerId = setTimeout(() => {
            gameRoot.classList.remove('is-hit');
        }, 220);
    };

    const triggerRageEffect = () => {
        gameRoot.classList.add('is-rage');
        if (rageTimerId) {
            clearTimeout(rageTimerId);
        }
        rageTimerId = setTimeout(() => {
            gameRoot.classList.remove('is-rage');
        }, 350);
    };

    gameRoot.classList.add('pre-combat');
    updateHud();

    attackButton.addEventListener('click', () => {
        if (defeated) {
            return;
        }

        totalClicks += 1;
        if (totalClicks < requiredClicksToStart) {
            return;
        }
        if (totalClicks === requiredClicksToStart) {
            gameRoot.classList.remove('pre-combat');
        }

        const now = performance.now();
        comboCount = (now - lastAttackAt <= 450) ? comboCount + 1 : 1;
        lastAttackAt = now;

        hp -= damagePerClick;
        triggerHitEffect();

        if (comboCount >= 4) {
            triggerRageEffect();
        }

        if (hp <= 0) {
            defeated = true;
            hp = 0;
            swapToWastedPhoto();
            photo.alt = 'Wasted profile photo';
        }

        updateHud();
    });
}

function initLazyMedia() {
    const mediaSelector = 'img[data-src], iframe[data-src]';

    const loadMedia = (element) => {
        const source = element.dataset.src;
        if (!source) {
            markMediaRevealed(element);
            return;
        }

        element.addEventListener('load', () => markMediaRevealed(element), { once: true });
        element.addEventListener('error', () => markMediaRevealed(element), { once: true });
        delete element.dataset.src;
        element.src = source;

        if (element instanceof HTMLImageElement && element.complete) {
            markMediaRevealed(element);
        }
    };

    const observeMedia = (element) => {
        if (!element.dataset.src || element.classList.contains('media-lazy') || element.classList.contains('media-revealed')) {
            return;
        }

        element.classList.add('media-lazy');
        if (state.lazyMediaObserver) {
            state.lazyMediaObserver.observe(element);
        } else {
            loadMedia(element);
        }
    };

    if ('IntersectionObserver' in window) {
        state.lazyMediaObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                loadMedia(entry.target);
                state.lazyMediaObserver.unobserve(entry.target);
            });
        }, {
            rootMargin: '200px 0px',
            threshold: 0.1
        });
    }

    document.querySelectorAll(mediaSelector).forEach(observeMedia);
    state.lazyMediaMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof Element)) {
                    return;
                }

                if (node.matches(mediaSelector)) {
                    observeMedia(node);
                    return;
                }

                node.querySelectorAll(mediaSelector).forEach(observeMedia);
            });
        });
    });
    state.lazyMediaMutationObserver.observe(document.body, { childList: true, subtree: true });
}

function markMediaRevealed(element) {
    element.classList.remove('media-lazy');
    if (element.classList.contains('media-revealed')) {
        return;
    }
    element.classList.add('media-revealed');

    let cleanedUp = false;
    const finishReveal = () => {
        if (cleanedUp) {
            return;
        }
        cleanedUp = true;
        element.classList.remove('media-revealed');
    };

    element.addEventListener('animationend', finishReveal, { once: true });
    setTimeout(finishReveal, 900);
}

function openProjectModal(projectIndex) {
    const project = state.data?.projects?.content?.[projectIndex];
    if (!project) {
        return;
    }
    const width = Math.min(window.screen.width - 100, 1440);
    const height = Math.min(window.screen.height - 100, 920);
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));

    const popupFeatures = [
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
        'popup=yes',
        'resizable=yes',
        'menubar=no',
        'toolbar=no',
        'location=no',
        'status=no',
        'scrollbars=no'
    ].join(',');

    const popup = window.open(project.run_url, '_blank', popupFeatures);
    if (!popup) {
        window.open(project.run_url, '_blank');
    }
}

function showLoadError(message) {
    const errorHtml = `
        <section class="section-card card">
            <h2 class="section-title">Load Error</h2>
            <p>${escapeHtml(message)}</p>
            <p>Check <code>data/site-content.json</code> and refresh.</p>
        </section>
    `;

    tabs.forEach((tab) => {
        const panel = document.getElementById(`tab-${tab}`);
        if (panel) {
            panel.innerHTML = errorHtml;
        }
    });
}

function renderConfigText(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value ?? '');

    const allowedTags = new Set(['B', 'I', 'EM', 'STRONG', 'U', 'BR', 'SUP', 'SUB', 'CODE', 'A']);
    const allowedProtocols = ['http:', 'https:', 'mailto:'];

    const sanitizeNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            const tag = element.tagName.toUpperCase();

            if (!allowedTags.has(tag)) {
                const text = document.createTextNode(element.textContent || '');
                element.replaceWith(text);
                return;
            }

            [...element.attributes].forEach((attr) => {
                const name = attr.name.toLowerCase();
                if (tag === 'A') {
                    if (!['href', 'target', 'rel'].includes(name)) {
                        element.removeAttribute(attr.name);
                    }
                } else {
                    element.removeAttribute(attr.name);
                }
            });

            if (tag === 'A') {
                const href = element.getAttribute('href') || '';
                let safe = false;
                try {
                    const parsed = new URL(href, window.location.origin);
                    safe = allowedProtocols.includes(parsed.protocol);
                } catch {
                    safe = false;
                }

                if (!safe) {
                    const text = document.createTextNode(element.textContent || '');
                    element.replaceWith(text);
                    return;
                }

                if (element.getAttribute('target') === '_blank') {
                    element.setAttribute('rel', 'noopener');
                }
            }
        }

        [...node.childNodes].forEach(sanitizeNode);
    };

    sanitizeNode(template.content);
    return template.innerHTML;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
