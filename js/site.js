const state={data:null,miscGalleryLightbox:null,publicationPosterLightbox:null,blogLightbox:null,blogViewingPost:!1,blogPage:0,projectsPage:0,lazyMediaObserver:null,lazyMediaMutationObserver:null},tabs=["about","publications","projects","misc","blog"],tabRenderers={about:(t,e)=>renderAbout(t,e.profile),publications:t=>renderPublications(t),projects:t=>renderProjects(t),misc:t=>renderMisc(t),blog:t=>renderBlog(t)},markdownRenderer=window.createBlogMarkdownRenderer?.(),PAGE_REVEAL_TIMEOUT_MS=1500,CONTENT_LOAD_TIMEOUT_MS=5e3;document.addEventListener("DOMContentLoaded",()=>{initLazyMedia(),bindTabEvents(),document.addEventListener("site-theme-change",syncHeaderOffset),syncHeaderOffset();let t=window.innerWidth;window.addEventListener("resize",()=>{window.innerWidth!==t&&(t=window.innerWidth,syncHeaderOffset())});let e=window.scrollY;const o=document.documentElement,a=document.querySelector(".brand-controls"),i=window.matchMedia("(prefers-reduced-motion: reduce)");let s;window.addEventListener("scroll",()=>{const n=Math.max(0,document.documentElement.scrollHeight-window.innerHeight),r=Math.max(0,Math.min(window.scrollY,n)),c=r-e,l=70;if(r<=8||Math.abs(c)>=l){const d=r>l&&c>0;if(o.classList.contains("is-badge-compact")!==d){const g=a&&a.closest(".brand-wrap")?.querySelector(".brand-badge")&&!o.classList.contains("is-mobile-layout")&&!i.matches?a.getBoundingClientRect():null;if(s?.cancel(),o.classList.toggle("is-badge-compact",d),g){const p=a.getBoundingClientRect();s=a.animate([{translate:`${g.left-p.left}px ${g.top-p.top}px`},{translate:"0 0"}],{duration:240,easing:"cubic-bezier(0.22, 1, 0.36, 1)"})}}e=r}},{passive:!0}),document.fonts?.ready&&(document.fonts.addEventListener("loadingdone",syncHeaderOffset),document.fonts.ready.then(()=>{syncHeaderOffset()}).catch(()=>{})),initPage()});async function initPage(){const t=new AbortController,e=setTimeout(()=>t.abort(),CONTENT_LOAD_TIMEOUT_MS);try{const o=await fetch("data/site-content.json",{cache:"no-store",signal:t.signal});if(!o.ok)throw new Error(`Failed to load content: ${o.status}`);if(state.data=await o.json(),window.configureSiteThemes(state.data.site?.themes),applySiteIdentity(state.data.site),state.data?.maitnaiance===!0||state.data?.maintenance===!0){renderMaintenancePage(state.data.maintenance_image),await revealSiteWhenReady(document.querySelector(".maintenance-gif"));return}const a=renderAll(state.data);syncHeaderOffset();const i=location.hash.replace("#","");tabs.includes(i)?activateTab(i):activateTab("about"),await revealSiteWhenReady(document.querySelector(".profile-photo"),a)}catch(o){const a=o.name==="AbortError"?"The site content took too long to load. Please refresh and try again.":o.message;showLoadError(a),syncHeaderOffset(),revealSite()}finally{clearTimeout(e)}}async function revealSiteWhenReady(t,e){const o=getComputedStyle(document.body).fontFamily,a=document.fonts?Promise.all([document.fonts.load(`400 1rem ${o}`),document.fonts.load(`700 1rem ${o}`)]):Promise.resolve(),i=t?.decode?t.decode().catch(()=>{}):Promise.resolve();await Promise.race([Promise.allSettled([a,i,e]),new Promise(s=>setTimeout(s,PAGE_REVEAL_TIMEOUT_MS))]),syncHeaderOffset(),await new Promise(s=>requestAnimationFrame(()=>requestAnimationFrame(s))),revealSite()}function revealSite(){document.body.classList.remove("site-loading"),document.querySelector(".page-shell")?.setAttribute("aria-busy","false"),document.getElementById("site-loader")?.setAttribute("aria-hidden","true")}function renderMaintenancePage(t){const e=document.querySelector(".page-shell");e&&(document.body.classList.add("maintenance-mode"),e.innerHTML=`
        <section class="maintenance-shell">
            ${t?`<img class="maintenance-gif" data-src="${escapeHtml(t)}" alt="" width="110" height="110" loading="lazy" decoding="async">`:""}
            <h1 class="maintenance-title">Under Maintenance</h1>
            <p class="maintenance-text">The site will be available again soon.</p>
        </section>
    `)}function bindTabEvents(){document.querySelectorAll(".tab-button").forEach(t=>{t.addEventListener("click",()=>activateTab(t.dataset.tab))}),document.querySelectorAll(".site-home-link").forEach(t=>{t.addEventListener("click",e=>{e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||(e.preventDefault(),activateTab("about"),window.scrollTo(0,0))})})}function syncHeaderOffset(){const t=document.querySelector(".site-header");if(!t)return;const e=document.documentElement;e.classList.add("is-measuring-header","is-syncing-header");const o=window.matchMedia("(max-width: 864px)").matches;let a=o;if(!o){e.classList.remove("is-mobile-layout");const i=t.querySelector(".brand-wrap");a=t.querySelector(".tab-nav").getBoundingClientRect().top>=i.getBoundingClientRect().bottom}if(e.classList.toggle("is-mobile-layout",a),e.classList.toggle("is-compact-layout",a||window.matchMedia("(max-width: 980px)").matches),a){const i=t.querySelector(".tab-nav");e.style.setProperty("--mobile-nav-height",`${Math.ceil(i.getBoundingClientRect().height)}px`)}e.style.setProperty("--header-height",`${Math.ceil(t.getBoundingClientRect().height)}px`),e.classList.remove("is-measuring-header"),t.offsetHeight,e.classList.remove("is-syncing-header")}function activateTab(t){if(!tabs.includes(t))return;const e=document.getElementById(`tab-${t}`);document.querySelectorAll(".tab-button").forEach(o=>{const a=o.dataset.tab===t;o.classList.toggle("active",a),a?o.setAttribute("aria-current","page"):o.removeAttribute("aria-current")}),document.querySelectorAll(".tab-panel").forEach(o=>{o.classList.toggle("active",o.id===`tab-${t}`)}),history.replaceState(null,"",`#${t}`),t==="blog"&&state.blogViewingPost&&renderBlog(state.data?.blog||{}),requestAnimationFrame(()=>{e?.classList.contains("active")&&replayTabMediaReveal(e)})}function replayTabMediaReveal(t){t.querySelectorAll("img[src], iframe[src]").forEach(e=>{e.classList.contains("media-lazy")||e.closest(".profile-photo, .gallery-item")||e instanceof HTMLImageElement&&!e.complete||(e.classList.remove("tab-media-revealed"),e.offsetWidth,e.classList.add("tab-media-revealed"))})}function renderAll(t){const e=renderHeader(t.site,t.profile?.badge);return tabs.forEach(o=>{const a=t[o]||{},i=String(a.title||o),s=document.querySelector(`[data-tab="${o}"]`),n=document.getElementById(`tab-${o}`);s&&(s.textContent=i),n&&n.setAttribute("aria-label",i),tabRenderers[o]?.(a,t)}),e}function applySiteIdentity(t={}){document.title=t.seo?.title||t.name||"Personal Website",document.documentElement.lang=t.language||"en";const e=document.querySelector("[data-site-source]");if(e&&/^https?:\/\//i.test(t.source_url||"")&&(e.href=t.source_url,e.hidden=!1),t.favicon&&!document.querySelector('link[rel="icon"]'))try{const o=new URL(t.favicon,document.baseURI);if(o.protocol==="http:"||o.protocol==="https:"){const a=document.createElement("link");a.rel="icon",a.href=o.href,document.head.append(a)}}catch{}}function renderHeader(t,e){const o=document.getElementById("site-name");o.querySelector(".site-home-link").textContent=t?.name||"Personal Website",document.querySelector(".mobile-site-name").textContent=o.textContent;const a=o.closest(".brand-name"),i=Array.isArray(e?.list)?e.list:[typeof e=="string"?e:e?.module],s=[...new Set(i.filter(l=>typeof l=="string"&&l.trim()))];if(s.length===0)return;const n=e?.width,r=e?.mode==="random"?Math.floor(Math.random()*s.length):Math.max(0,s.indexOf(e?.default));async function c(){try{const{mount:l}=await import(new URL(s[r],document.baseURI).href),d=document.createElement("canvas");d.className="brand-badge",d.setAttribute("aria-hidden","true"),Number.isFinite(n)&&n>0&&d.style.setProperty("--badge-width",`${n}px`);const u=a.closest(".page-shell");let g;const p=l(d,{onHighlight(m,h){if(!d.isConnected)return;const b=Math.round(50-50*Math.cos(h));b!==g&&(u.style.setProperty("--badge-name-colors",m),u.style.setProperty("--badge-name-position",`${b}%`),g=b)}});return a.before(d),syncHeaderOffset(),p?.ready}catch(l){console.warn("Header badge could not load:",l)}}return c()}function renderSectionDescription(t,e=!1){const a=(Array.isArray(t)?t:[t]).filter(i=>String(i??"").trim()).map(i=>`<p>${renderConfigText(i)}</p>`).join("");return a?e?a:`<div class="section-description">${a}</div>`:""}function renderSectionShell(t={},e="",o="",a=!1){return`
        <section class="${["section-card","card",o].filter(Boolean).join(" ")}">
            <h2 class="section-title">${renderConfigText(t.title||"")}</h2>
            ${renderSectionDescription(t.description,a)}
            ${e}
        </section>
    `}function renderAbout(t={},e={}){const o=document.getElementById("tab-about"),a=t.content||{},i=a.experience||{},s=a.education||{},n=(e.links||[]).map(l=>{const d=String(l.icon||"").trim(),u=d?`<img class="profile-link-icon" src="assets/icons/${escapeHtml(d)}.svg" alt="" width="16" height="16" loading="lazy" decoding="async" onerror="this.remove()">`:"";return`<a href="${l.url}" target="_blank" rel="noopener">${u}${escapeHtml(l.label)}</a>`}).join(""),r=(i.items||[]).map(l=>`
            <article class="timeline-item">
                <div class="timeline-header">
                    <h3 class="timeline-role">${renderConfigText(l.role)}</h3>
                    <span class="timeline-date">${renderConfigText(l.date)}</span>
                </div>
                <p class="timeline-org">${renderConfigText(l.org)}</p>
                <p class="timeline-meta">${renderConfigText(l.meta||"")}</p>
                <p class="timeline-desc">${renderConfigText(l.description)}</p>
            </article>
        `).join(""),c=(s.items||[]).map(l=>`
            <article class="education-item">
                <div class="education-logo-wrap">
                    <img class="education-logo" data-src="${escapeHtml(l.logo||"")}" alt="${escapeHtml(l.school||"School")} logo" loading="lazy" decoding="async">
                </div>
                <div class="education-content">
                    <div class="timeline-header">
                        <h3 class="timeline-role">${renderConfigText(l.degree)}</h3>
                        <span class="timeline-date">${renderConfigText(l.date)}</span>
                    </div>
                    <p class="timeline-org">${renderConfigText(l.school)}</p>
                    <p class="timeline-desc">${renderConfigText(l.details)}</p>
                </div>
            </article>
        `).join("");o.innerHTML=`
        <div class="about-grid">
            <aside class="profile-card card">
                <img class="profile-photo" data-src="${escapeHtml(e.photo||"data/images/profile/me.jpg")}" alt="Profile photo" width="16" height="9" loading="lazy" decoding="async">
                <h2 class="profile-name">${renderConfigText(e.name||"")}</h2>
                <p class="profile-role">${renderConfigText(e.role||"")}</p>
                <p class="profile-school">${renderConfigText(e.school||"")}</p>
                <div class="profile-links">${n}</div>
            </aside>

            <div class="about-main">
                ${renderSectionShell(t,"","",!0)}
                ${renderSectionShell(i,`<div class="experience-list">${r}</div>`)}
                ${renderSectionShell(s,`<div class="education-list">${c}</div>`)}
            </div>
        </div>
    `}function renderPublications(t={}){const e=document.getElementById("tab-publications"),o=(t.content||[]).map((a,i)=>{const s=a.links&&typeof a.links=="object"?a.links:{},n=Object.entries(s).filter(([p,m])=>String(p).trim()&&String(m).trim()).map(([p,m])=>({name:String(p).trim(),url:String(m).trim()}));n.length===0&&(a.doi&&n.push({name:"DOI",url:String(a.doi)}),a.pdf&&n.push({name:"PDF",url:String(a.pdf)}));const r=String(a.poster||"").trim(),c=String(a.teaser||"").trim(),l=String(a.background_image||"").trim(),d=/\.(?:webm|mp4|m4v|ogv|ogg)(?:[?#]|$)/i.test(c),u=n.map(p=>`<a class="cta-button" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>`);r&&u.push(`
                    <a class="cta-button publication-poster-link glightbox"
                        href="${escapeHtml(r)}"
                        data-gallery="publication-poster-${i}"
                        data-title="${escapeHtml(a.title||"Publication")} — Poster"
                        target="_blank"
                        rel="noopener">Poster</a>
                `);const g=u.join("")||'<span class="cta-button disabled">Links TBD</span>';return`
                <article class="publication-row card">
                    ${l?`
                        <img class="publication-background" data-src="${escapeHtml(l)}" alt="" loading="lazy" decoding="async">`:""}
                    <div class="publication-teaser-wrap">
                        ${d?`<video class="publication-teaser" data-src="${escapeHtml(c)}" autoplay muted loop playsinline aria-label="Publication teaser"></video>`:`<img class="publication-teaser" data-src="${escapeHtml(c)}" alt="Publication teaser" width="16" height="9" loading="lazy" decoding="async">`}
                    </div>
                    <div class="publication-content">
                        <h3 class="publication-title">${renderConfigText(a.title)}</h3>
                        <p class="publication-authors">${renderConfigText(a.authors)}</p>
                        <p class="publication-conf">${renderConfigText(a.conference)}</p>
                        ${a.abstract?`<p class="publication-abstract">${renderConfigText(a.abstract)}</p>`:""}
                        <div class="link-row">
                            ${g}
                        </div>
                    </div>
                </article>
            `}).join("");e.innerHTML=renderSectionShell(t,`<div class="publication-list">${o}</div>`),initPublicationPosterLightbox()}function initPublicationPosterLightbox(){window.GLightbox&&(state.publicationPosterLightbox&&state.publicationPosterLightbox.destroy(),state.publicationPosterLightbox=window.GLightbox({selector:"#tab-publications .publication-poster-link",touchNavigation:!0,loop:!1}))}function getPagination(t,e,o){const a=Number.isSafeInteger(e)&&e>0?e:5,i=Math.max(1,Math.ceil(t/a)),s=Math.min(o,i-1);return{page:s,pageCount:i,pageSize:a,start:s*a}}function renderPagination(t,e,o){return`
        <nav class="list-pagination" aria-label="${t} pagination, page ${e+1} of ${o}" tabindex="-1">
            <button class="cta-button" type="button" data-page-step="-1" aria-label="Previous page"${e===0?" disabled":""}>
                <span class="list-prev-icon" aria-hidden="true"></span>
            </button>
            <form class="list-page-jump">
                <label>Page <input type="number" name="page" min="1" max="${o}" step="1" value="${e+1}" inputmode="numeric" enterkeyhint="go" required></label>
                <span>of ${o}</span>
            </form>
            <button class="cta-button" type="button" data-page-step="1" aria-label="Next page"${e===o-1?" disabled":""}>
                <span class="list-next-icon" aria-hidden="true"></span>
            </button>
        </nav>
    `}function bindPagination(t,e,o){function a(s,n){if(s===e)return;o(s),(t.querySelector(`[data-page-step="${n}"]:not(:disabled)`)||t.querySelector(".list-pagination")).focus({preventScroll:!0}),scrollToTop()}const i=t.querySelector(".list-page-jump");i.addEventListener("submit",s=>{s.preventDefault();const n=i.elements.namedItem("page");a(n.valueAsNumber-1)}),t.querySelectorAll("[data-page-step]").forEach(s=>{s.addEventListener("click",()=>{const n=Number(s.dataset.pageStep);a(e+n,n)})})}function renderProjects(t={}){const e=document.getElementById("tab-projects"),o=Array.isArray(t.content)?t.content:[],{page:a,pageCount:i,pageSize:s,start:n}=getPagination(o.length,t.items_per_page,state.projectsPage);state.projectsPage=a;const r=o.slice(n,n+s).map((c,l)=>`
            <article class="project-item card">
                <span class="project-number" aria-hidden="true">${n+l+1}</span>
                ${c.background_image?.trim()?`
                    <img class="project-background" data-src="${escapeHtml(c.background_image.trim())}" alt="" loading="lazy" decoding="async">`:""}
                <div class="project-main">
                    <h3 class="project-title">${renderConfigText(c.title)}</h3>
                    <p class="project-time">${renderConfigText(c.date)}</p>
                    <p class="project-desc">${renderConfigText(c.description)}</p>
                </div>
                <div class="project-actions">
                    <button class="run-button" type="button" data-project-index="${n+l}">
                        Play <span class="run-button-arrow" aria-hidden="true"></span>
                    </button>
                </div>
            </article>
        `).join("");e.innerHTML=renderSectionShell(t,`<div class="project-list">${r}</div>${renderPagination("Projects",a,i)}`),bindPagination(e,a,c=>{state.projectsPage=c,renderProjects(t)}),e.querySelectorAll(".run-button").forEach(c=>{c.addEventListener("click",()=>{const l=Number(c.dataset.projectIndex);openProjectModal(l)})})}function renderMisc(t={}){const e=document.getElementById("tab-misc");if(!e)return;disposeMiscModules();const o=Array.isArray(t.content)?t.content:[],a=o.map((i,s)=>`
            <section class="misc-block card">
                <h2>${renderConfigText(i.title||`Misc item ${s+1}`)}</h2>
                ${i.description?`<p class="misc-caption">${renderConfigText(i.description)}</p>`:""}
                ${renderMiscModule(i.module,s,i.title)}
            </section>
        `).join("");e.innerHTML=renderSectionShell(t,a||"<p>No miscellaneous items configured yet.</p>"),initMiscGalleryLightbox(),o.forEach((i,s)=>{i.module?.type==="map"&&initTravelMap(document.getElementById(`misc-map-${s}`),getMapPlaces(i.module))})}function renderMiscModule(t={},e,o=""){if(!t||typeof t!="object")return'<p class="misc-caption">No module configured.</p>';if(t.type==="gallery")return`
            <div class="gallery-grid">
                ${(Array.isArray(t.items)?t.items:[]).map((i,s)=>{const n=String(i?.src||""),r=String(i?.thumbnail||n),c=String(i?.alt||`Gallery image ${s+1}`);return`
                        <a class="gallery-item glightbox" href="${escapeHtml(n)}" data-gallery="misc-gallery-${e}" data-title="${escapeHtml(c)}">
                            <img data-src="${escapeHtml(r)}" alt="${escapeHtml(c)}" width="4" height="3" loading="lazy" decoding="async">
                        </a>
                    `}).join("")}
            </div>
        `;if(t.type==="youtube")return`
            <div class="embed-wrap">
                <iframe data-src="${escapeHtml(t.url||"")}" title="YouTube video: ${escapeHtml(o||`misc item ${e+1}`)}" width="16" height="9" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
            </div>
        `;if(t.type==="map"){const a=getMapPlaces(t);return`
            <div id="misc-map-${e}" class="misc-map">
                <p class="map-status">Loading map...</p>
            </div>
            <div class="map-places">
                <div class="map-place-viewport" id="map-places-${e}">
                    <div class="map-place-list">
                        ${a.map(i=>`<button class="chip map-place" type="button" aria-controls="misc-map-${e}" aria-pressed="false" disabled>${escapeHtml(i.name||"")}</button>`).join("")}
                    </div>
                </div>
                <button class="map-place-toggle" type="button" aria-controls="map-places-${e}" aria-expanded="false" aria-label="Show all places" hidden></button>
            </div>
        `}return`<p class="misc-caption">Unsupported module type: ${escapeHtml(t.type||"unknown")}.</p>`}function disposeMiscModules(){state.miscGalleryLightbox&&(state.miscGalleryLightbox.destroy(),state.miscGalleryLightbox=null)}function initMiscGalleryLightbox(){window.GLightbox&&(state.miscGalleryLightbox=window.GLightbox({selector:"#tab-misc .glightbox",touchNavigation:!0,loop:!0}))}function getMapPlaces(t){return(t.places||[]).filter(e=>Number.isFinite(Number(e.lat))&&Number.isFinite(Number(e.lon)))}function renderBlog(t={}){const e=document.getElementById("tab-blog");if(!e)return;state.blogViewingPost=!1;const o=Array.isArray(t.content)?t.content:[],{page:a,pageCount:i,pageSize:s,start:n}=getPagination(o.length,t.posts_per_page,state.blogPage);state.blogPage=a;const r=o.length>0?o.slice(n,n+s).map((c,l)=>`
            <article class="blog-list-item card">
                <div class="blog-item-content">
                    <h3 class="blog-item-title">
                        <button class="blog-title-button" type="button" data-post-index="${n+l}">${escapeHtml(c.title||`Post ${n+l+1}`)}</button>
                    </h3>
                    <p class="blog-item-intro">${renderConfigText(c.intro||"")}</p>
                </div>
                <div class="blog-cover-wrap">
                    <img class="blog-cover" data-src="${escapeHtml(c.cover||"")}" alt="${escapeHtml(c.title||"Blog cover")}" width="16" height="9" loading="lazy" decoding="async">
                </div>
            </article>
        `).join(""):"<p>No blog posts configured yet.</p>";e.innerHTML=renderSectionShell(t,`<div class="blog-list">${r}</div>${renderPagination("Blog",a,i)}`),e.querySelectorAll(".blog-title-button").forEach(c=>{c.addEventListener("click",()=>{const l=Number(c.dataset.postIndex);openBlogPost(l)})}),bindPagination(e,a,c=>{state.blogPage=c,renderBlog(t)}),state.blogLightbox&&(state.blogLightbox.destroy(),state.blogLightbox=null)}async function openBlogPost(t){const e=document.getElementById("tab-blog"),o=state.data?.blog||{},i=(Array.isArray(o.content)?o.content:[])[t];if(!e||!i)return;const s=String(i.title||"Untitled Post"),n=String(i.intro||""),r=String(i.html||"").trim(),c=r||String(i.markdown||"").trim();state.blogViewingPost=!0,e.innerHTML=`
        <div class="blog-post-view">
            <section class="section-card card blog-article-shell">
                <header class="blog-article-heading">
                    <h2 class="blog-article-title">${escapeHtml(s)}</h2>
                    ${n?`<p class="blog-article-intro">${renderConfigText(n)}</p>`:""}
                </header>
                <div class="blog-article-content">
                    <p class="blog-article-loading">Loading article...</p>
                </div>
            </section>
            <nav class="blog-article-menu" aria-label="Article actions">
                <button type="button" data-blog-action="back" aria-label="Back to blog list" title="Back to blog list"><span class="blog-back-icon" aria-hidden="true"></span></button>
                <button type="button" data-blog-action="top" aria-label="Back to top" title="Back to top"><span class="blog-top-icon" aria-hidden="true"></span></button>
            </nav>
        </div>
    `;const l=e.querySelector(".blog-article-content");if(e.querySelector('[data-blog-action="back"]').addEventListener("click",()=>renderBlog(o)),e.querySelector('[data-blog-action="top"]').addEventListener("click",scrollToTop),!c){l.querySelector("p").textContent="Missing HTML or Markdown path in blog post config.";return}try{const d=await fetch(c,{cache:"no-store"});if(!d.ok)throw new Error(`Failed to load post: ${d.status}`);if(!r&&!markdownRenderer)throw new Error("Markdown renderer is not available.");const u=await d.text();if(!l.isConnected)return;const g=r?u:markdownRenderer.render(u),p=hydrateBlogHtml(g,c,s),m=i.cover?`
                <figure class="blog-article-cover-wrap">
                    <a class="glightbox" href="${escapeHtml(i.cover)}" data-gallery="blog-article-images" data-type="image">
                        <img class="blog-article-cover" data-src="${escapeHtml(i.cover)}" alt="${escapeHtml(s)} cover" width="2" height="1" loading="lazy" decoding="async">
                    </a>
                    ${i.cover_credit?`<figcaption>${renderConfigText(i.cover_credit)}</figcaption>`:""}
                </figure>
            `:"";l.innerHTML=`
            <article class="blog-article">
                ${m}
                <div class="markdown-body">${p}</div>
            </article>
        `,initBlogLightbox("#tab-blog .glightbox"),bindBlogFigureReferences(l.querySelector(".markdown-body"))}catch(d){if(l.isConnected){const u=document.createElement("p");u.className="blog-article-loading",u.textContent=`Failed to load this post: ${d.message}`,l.replaceChildren(u)}}}function hydrateBlogHtml(t,e,o){const a=document.createElement("template");a.innerHTML=t;const i=new URL(e,window.location.href);window.katex&&a.content.querySelectorAll("span[data-katex-inline]").forEach(n=>{window.katex.render(n.textContent.trim(),n,{throwOnError:!1})});const s=document.getElementById("blog-math-styles");return s&&a.content.querySelector(".katex, .katex-display")&&s.replaceWith(s.content.cloneNode(!0)),a.content.querySelectorAll("iframe[src], audio[src], video[src], source[src], track[src], video[poster]").forEach(n=>{for(const r of["src","poster"]){const c=n.getAttribute(r);c&&n.setAttribute(r,new URL(c,i).href)}}),a.content.querySelectorAll("img").forEach(n=>{const r=n.getAttribute("src")||"";if(!r)return;const c=new URL(r,i).href;n.removeAttribute("src"),n.setAttribute("data-src",c),n.setAttribute("loading","lazy"),n.setAttribute("decoding","async");const l=n.closest("a");if(l){const g=l.getAttribute("href")||c;l.setAttribute("href",new URL(g,i).href),l.classList.add("glightbox"),l.setAttribute("data-gallery","blog-article-images"),l.setAttribute("data-type","image"),l.setAttribute("data-title",o);return}const d=document.createElement("a");d.href=c,d.className="glightbox",d.setAttribute("data-gallery","blog-article-images"),d.setAttribute("data-type","image"),d.setAttribute("data-title",o);const u=n.closest("picture")||n;u.replaceWith(d),d.appendChild(u)}),a.content.querySelectorAll("a[href]").forEach(n=>{if(n.classList.contains("glightbox"))return;const r=n.getAttribute("href")||"";if(!(!r||r.startsWith("#")))try{const c=new URL(r,i);n.setAttribute("href",c.href),(c.protocol==="http:"||c.protocol==="https:")&&(n.setAttribute("target","_blank"),n.setAttribute("rel","noopener"))}catch{}}),a.innerHTML}function bindBlogFigureReferences(t){const e=new Map;let o=0;t.querySelectorAll("figure").forEach(s=>{const n=s.querySelector("a.glightbox:has(img)");n&&(o+=1,s.id||=`fig-${o}`,e.set(s.id,{figure:s,trigger:n,number:o}))});let a;const i=()=>a?.remove();t.querySelectorAll('a[href^="#"]').forEach(s=>{const n=e.get(s.getAttribute("href").slice(1));if(!n)return;const{figure:r,trigger:c}=n,l=r.querySelector(":scope > figcaption");if(l&&!n.labelled){const u=document.createElement("strong");u.textContent=`Fig. ${n.number}. `,l.prepend(u),n.labelled=!0}s.classList.add("blog-figure-ref"),state.blogLightbox&&s.setAttribute("aria-haspopup","dialog");const d=()=>{i(),a=document.createElement("img"),a.className="blog-figure-preview",a.alt="",a.setAttribute("aria-hidden","true");const u=c.querySelector("img");a.src=u.dataset.src||u.currentSrc||c.href,s.append(a);const g=s.getBoundingClientRect(),p=a.offsetWidth,m=document.documentElement.clientWidth,h=g.left+(g.width-p)/2,b=Math.max(8,Math.min(h,m-p-8));a.style.left=`${b-g.left}px`;const f=window.innerHeight-g.bottom;a.classList.toggle("is-above",f<a.offsetHeight+8&&g.top>f)};s.addEventListener("pointerenter",u=>{u.pointerType!=="touch"&&d()}),s.addEventListener("pointerleave",i),s.addEventListener("focus",()=>{s.matches(":focus-visible")&&d()}),s.addEventListener("blur",i),s.addEventListener("keydown",u=>{u.key==="Escape"&&a?.isConnected&&(u.stopPropagation(),i())}),s.addEventListener("click",u=>{i(),!(!state.blogLightbox||u.metaKey||u.ctrlKey||u.shiftKey||u.altKey)&&(u.preventDefault(),c.click())})})}function initBlogLightbox(t){window.GLightbox&&(state.blogLightbox&&state.blogLightbox.destroy(),state.blogLightbox=window.GLightbox({selector:t,touchNavigation:!0,loop:!0}))}function scrollToTop(){window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})}function initLazyMedia(){const t="img[data-src], iframe[data-src], video.publication-teaser[data-src]",e=new Set;let o=0,a;const i=(r,c)=>{const l=r.dataset.src;if(!l){markMediaRevealed(r),c?.();return}const d=new AbortController,u=async()=>{d.signal.aborted||(d.abort(),c&&r.decode&&await r.decode().catch(()=>{}),markMediaRevealed(r),c?.())},g=r instanceof HTMLVideoElement?"loadeddata":"load";r.addEventListener(g,u,{signal:d.signal}),r.addEventListener("error",u,{signal:d.signal}),delete r.dataset.src,r.src=l,r instanceof HTMLImageElement&&r.complete&&u()};function s(){for(const r of e){if(o>=2)break;if(!r.isConnected){e.delete(r),a.unobserve(r);continue}r.getClientRects().length&&(e.delete(r),a.unobserve(r),o+=1,r.loading="eager",i(r,()=>{o-=1,requestAnimationFrame(s)}))}}const n=r=>{!r.dataset.src||r.classList.contains("media-lazy")||r.classList.contains("media-revealed")||(r.classList.add("media-lazy"),a&&r.matches(".gallery-item img")?a.observe(r):state.lazyMediaObserver?state.lazyMediaObserver.observe(r):i(r))};"IntersectionObserver"in window&&(a=new IntersectionObserver(r=>{r.forEach(({target:c,isIntersecting:l})=>{l?e.add(c):e.delete(c)}),s()},{rootMargin:"80px 0px"}),state.lazyMediaObserver=new IntersectionObserver(r=>{r.forEach(c=>{c.isIntersecting&&(i(c.target),state.lazyMediaObserver.unobserve(c.target))})},{rootMargin:"200px 0px",threshold:.1})),document.querySelectorAll(t).forEach(n),state.lazyMediaMutationObserver=new MutationObserver(r=>{r.forEach(c=>{c.addedNodes.forEach(l=>{if(l instanceof Element){if(l.matches(t)){n(l);return}l.querySelectorAll(t).forEach(n)}})})}),state.lazyMediaMutationObserver.observe(document.body,{childList:!0,subtree:!0})}function markMediaRevealed(t){if(t.classList.remove("media-lazy"),t.classList.contains("media-revealed"))return;t.classList.add("media-revealed");let e=!1;const o=()=>{e||(e=!0,t.classList.remove("media-revealed"))};t.addEventListener("animationend",o,{once:!0}),setTimeout(o,900)}function openProjectModal(t){const e=state.data?.projects?.content?.[t];if(!e)return;const o=Math.min(window.screen.width-100,1440),a=Math.min(window.screen.height-100,920),i=Math.max(0,Math.round((window.screen.width-o)/2)),s=Math.max(0,Math.round((window.screen.height-a)/2)),n=[`width=${o}`,`height=${a}`,`left=${i}`,`top=${s}`,"popup=yes","resizable=yes","menubar=no","toolbar=no","location=no","status=no","scrollbars=no"].join(",");window.open(e.run_url,"_blank",n)||window.open(e.run_url,"_blank")}function showLoadError(t){const e=`
        <section class="section-card card">
            <h2 class="section-title">Load Error</h2>
            <p>${escapeHtml(t)}</p>
            <p>Check <code>data/site-content.json</code> and refresh.</p>
        </section>
    `;tabs.forEach(o=>{const a=document.getElementById(`tab-${o}`);a&&(a.innerHTML=e)})}function renderConfigText(t){const e=document.createElement("template");e.innerHTML=String(t??"");const o=new Set(["B","I","EM","STRONG","U","BR","SUP","SUB","CODE","A"]),a=["http:","https:","mailto:"],i=s=>{if(s.nodeType===Node.ELEMENT_NODE){const n=s,r=n.tagName.toUpperCase();if(!o.has(r)){const c=document.createTextNode(n.textContent||"");n.replaceWith(c);return}if([...n.attributes].forEach(c=>{const l=c.name.toLowerCase();r==="A"&&["href","target","rel"].includes(l)||n.removeAttribute(c.name)}),r==="A"){const c=n.getAttribute("href")||"";let l=!1;try{const d=new URL(c,window.location.origin);l=a.includes(d.protocol)}catch{l=!1}if(!l){const d=document.createTextNode(n.textContent||"");n.replaceWith(d);return}n.getAttribute("target")==="_blank"&&n.setAttribute("rel","noopener")}}[...s.childNodes].forEach(i)};return i(e.content),e.innerHTML}function escapeHtml(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
