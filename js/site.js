const state = {
    data: null,
    travelMapRoot: null,
    amChartsLoadPromise: null,
    birdLightbox: null,
    blogLightbox: null,
    blogViewingPost: false
};

const tabs = ['about', 'publications', 'projects', 'misc', 'blog', 'cv'];
const markdownRenderer = createMarkdownRenderer();

const AMCHARTS_SCRIPTS = [
    'https://cdn.amcharts.com/lib/5/index.js',
    'https://cdn.amcharts.com/lib/5/map.js',
    'https://cdn.amcharts.com/lib/5/geodata/worldLow.js',
    'https://cdn.amcharts.com/lib/5/themes/Animated.js'
];

document.addEventListener('DOMContentLoaded', () => {
    bindTabEvents();
    syncHeaderOffset();
    window.addEventListener('resize', syncHeaderOffset);
    window.addEventListener('scroll', updateBlogScrollTopButtonVisibility, { passive: true });
    if (document.fonts?.ready) {
        document.fonts.ready.then(syncHeaderOffset).catch(() => { });
    }
    initPage();
});

async function initPage() {
    try {
        const response = await fetch('data/site-content.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load content: ${response.status}`);
        }
        state.data = await response.json();

        if (state.data?.maitnaiance === true || state.data?.maintenance === true) {
            renderMaintenancePage();
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
    } catch (error) {
        showLoadError(error.message);
        syncHeaderOffset();
    }
}

function renderMaintenancePage() {
    const pageShell = document.querySelector('.page-shell');
    if (!pageShell) {
        return;
    }

    document.body.classList.add('maintenance-mode');
    pageShell.innerHTML = `
        <section class="maintenance-shell">
            <img class="maintenance-gif" src="assets/suica_chara.gif" alt="Maintenance character">
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

function activateTab(tabId) {
    if (!tabs.includes(tabId)) {
        return;
    }

    document.querySelectorAll('.tab-button').forEach((button) => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    history.replaceState(null, '', `#${tabId}`);

    if (tabId === 'blog' && state.blogViewingPost) {
        renderBlog(state.data?.blog || {});
    }
    updateBlogScrollTopButtonVisibility();
}

function renderAll(data) {
    renderHeader(data.site);
    renderAbout(data);
    renderPublications(data.publications);
    renderProjects(data.projects);
    renderMisc(data.misc);
    renderBlog(data.blog);
    renderCvTab(data.links.cv);
}

function renderHeader(site) {
    document.getElementById('site-name').textContent = site?.name || 'Personal Website';
    document.getElementById('site-subtitle').textContent = site?.subtitle || '';
}

function renderAbout(data) {
    const profile = data.profile || {};
    const about = data.about || {};
    const aboutPanel = document.getElementById('tab-about');

    const profileLinks = (profile.links || [])
        .map((link) => `<a href="${link.url}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`)
        .join('');

    const introHtml = (about.intro || [])
        .map((line) => `<p>${line}</p>`)
        .join('');

    const experienceHtml = (data.experience || [])
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

    const educationHtml = (data.education || [])
        .map((item) => `
            <article class="education-item">
                <div class="education-logo-wrap">
                    <img class="education-logo" src="${escapeHtml(item.logo || '')}" alt="${escapeHtml(item.school || 'School')} logo" loading="lazy">
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
                        <img class="profile-photo" src="${profile.photo || 'me.jpg'}" alt="Profile photo">
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
                <section class="section-card card">
                    <h2 class="section-title">About</h2>
                    ${introHtml}
                </section>

                <section class="section-card card">
                    <h2 class="section-title">Experience</h2>
                    <div class="experience-list">${experienceHtml}</div>
                </section>

                <section class="section-card card">
                    <h2 class="section-title">Education</h2>
                    <div class="education-list">${educationHtml}</div>
                </section>
            </div>
        </div>
    `;

    initProfileMiniGame(profile);
}

function renderPublications(publications) {
    const panel = document.getElementById('tab-publications');
    const rows = (publications || [])
        .map((pub) => {
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

            const actionButtons = normalizedLinks.length > 0
                ? normalizedLinks
                    .map((item) => `<a class="cta-button secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a>`)
                    .join('')
                : '<span class="cta-button secondary disabled">Links TBD</span>';

            return `
                <article class="publication-row card">
                    <div class="publication-teaser-wrap">
                        <img class="publication-teaser" src="${pub.teaser}" alt="Publication teaser">
                    </div>
                    <div class="publication-content">
                        <h3 class="publication-title">${renderConfigText(pub.title)}</h3>
                        <p class="publication-authors">${renderConfigText(pub.authors)}</p>
                        <p class="publication-conf">${renderConfigText(pub.conference)}</p>
                        <div class="link-row">
                            ${actionButtons}
                        </div>
                    </div>
                </article>
            `;
        })
        .join('');

    panel.innerHTML = `
        <section class="section-card card">
            <h2 class="section-title">Publications</h2>
            <p>Feel free to reach out if you are interested in or have questions about any of my publications.</p>
            <div class="publication-list">${rows}</div>
        </section>
    `;
}

function renderProjects(projects) {
    const panel = document.getElementById('tab-projects');

    const projectCards = (projects || [])
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

    panel.innerHTML = `
        <section class="section-card card">
            <h2 class="section-title">Projects</h2>
            <p>Click RUN to open each project in a dedicated popup window.</p>
            <div class="project-list">${projectCards}</div>
        </section>
    `;

    panel.querySelectorAll('.run-button').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.projectIndex);
            openProjectModal(index);
        });
    });
}

function renderMisc(misc = {}) {
    const panel = document.getElementById('tab-misc');
    const birds = misc.birds || [];
    const travelPlaces = misc.travel?.places || [];

    panel.innerHTML = `
        <section class="section-card card">
            <h2 class="section-title">Misc</h2>
            <p>${renderConfigText(misc.summary || '')}</p>
            <section class="misc-block card">
                <h2>Bird Photography</h2>
                <p class="misc-caption">${renderConfigText(misc.bird_caption || 'Click any photo to open larger view.')}</p>
                <div class="bird-strip">
                    ${birds.map((path, index) => `
                        <a class="bird-shot glightbox" href="${path}" data-gallery="bird-gallery" data-title="🦢🦆🦜🐦">
                            <img src="${path}" alt="Bird photo ${index + 1}" loading="lazy">
                        </a>
                    `).join('')}
                </div>
            </section>

            <section class="misc-block card">
                <h2>Bass</h2>
                <p class="misc-caption">${renderConfigText(misc.bass_text || 'I play bass when free and keep exploring new grooves.')}</p>
                <div class="embed-wrap">
                    <iframe src="${misc.youtube || ''}" title="Bass performance" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>
            </section>

            <section class="misc-block card">
                <h2>${renderConfigText(misc.travel?.title || 'I LIKE TRAVELING')}</h2>
                <p class="misc-caption">${renderConfigText(misc.travel?.text || 'Travel places shown below are configurable in JSON.')}</p>
                <div id="travel-map" class="travel-map">
                    <p class="map-status">Loading travel map...</p>
                </div>
                <div class="travel-chip-list">
                    ${travelPlaces.map((place) => `<span class="chip">${escapeHtml(place.name)}</span>`).join('')}
                </div>
            </section>
        </section>
    `;

    initBirdLightbox();
    renderTravelMap(misc.travel || {});
}

function initBirdLightbox() {
    if (!window.GLightbox) {
        return;
    }
    if (state.birdLightbox) {
        state.birdLightbox.destroy();
    }
    state.birdLightbox = window.GLightbox({
        selector: '#tab-misc .glightbox',
        touchNavigation: true,
        loop: true
    });
}

async function renderTravelMap(travel) {
    const mapContainer = document.getElementById('travel-map');
    if (!mapContainer) {
        return;
    }

    const places = (travel.places || [])
        .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon));

    if (places.length === 0) {
        mapContainer.innerHTML = '<p class="map-status">No travel locations configured yet.</p>';
        return;
    }

    mapContainer.innerHTML = '<p class="map-status">Loading travel map...</p>';

    try {
        await ensureAmChartsReady();

        if (state.travelMapRoot) {
            state.travelMapRoot.dispose();
            state.travelMapRoot = null;
        }

        mapContainer.innerHTML = '';

        const root = window.am5.Root.new('travel-map');
        state.travelMapRoot = root;

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
                    coordinates: [place.lon, place.lat]
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

    panel.innerHTML = `
        <section class="section-card card">
            <h2 class="section-title">${renderConfigText(payload.title)}</h2>
            <p>${renderConfigText(payload.description)}</p>
            <div class="cv-embed-wrap">
                <iframe
                    class="cv-embed-frame"
                    src="${payload.url}#view=FitH"
                    title="Embedded CV PDF"
                    loading="lazy">
                </iframe>
            </div>
            <div class="link-row">
                <a class="cta-button primary" href="${payload.url}" target="_blank" rel="noopener">Open Full PDF</a>
            </div>
        </section>
    `;
}

function renderBlog(blog = {}) {
    const panel = document.getElementById('tab-blog');
    if (!panel) {
        return;
    }
    state.blogViewingPost = false;

    const posts = Array.isArray(blog.posts) ? blog.posts : [];
    const listHtml = posts.length > 0
        ? posts.map((post, index) => `
            <article class="blog-list-item card">
                <div class="blog-cover-link">
                    <img class="blog-cover" src="${escapeHtml(post.cover || '')}" alt="${escapeHtml(post.title || 'Blog cover')}" loading="lazy">
                </div>
                <div class="blog-item-content">
                    <h3 class="blog-item-title">${renderConfigText(post.title || `Post ${index + 1}`)}</h3>
                    <p class="blog-item-intro">${renderConfigText(post.intro || '')}</p>
                    <button class="cta-button secondary blog-open-button" type="button" data-post-index="${index}">Read Article</button>
                </div>
            </article>
        `).join('')
        : '<p>No blog posts configured yet.</p>';

    panel.innerHTML = `
        <section class="section-card card">
            <h2 class="section-title">${renderConfigText(blog.title || 'Blog')}</h2>
            <p>${renderConfigText(blog.description || 'Configure posts in data/site-content.json.')}</p>
            <div class="blog-list">${listHtml}</div>
        </section>
    `;

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
    const posts = Array.isArray(blogData.posts) ? blogData.posts : [];
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
                        <img class="blog-article-cover" src="${escapeHtml(post.cover)}" alt="${escapeHtml(title)} cover" loading="lazy">
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
        image.setAttribute('src', resolvedSrc);
        image.setAttribute('loading', 'lazy');

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
    const wastedPhoto = String(profile.wasted_photo || 'me_wasted.jpg');
    const requiredClicksToStart = 5;

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
            photo.src = wastedPhoto;
            photo.alt = 'Wasted profile photo';
        }

        updateHud();
    });
}

function openProjectModal(projectIndex) {
    const project = state.data?.projects?.[projectIndex];
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
