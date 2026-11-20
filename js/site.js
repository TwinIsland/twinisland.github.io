const state={data:null,miscGalleryLightbox:null,publicationPosterLightbox:null,blogLightbox:null,blogViewingPost:!1,blogPage:0,projectsPage:0,lazyMediaObserver:null,lazyMediaMutationObserver:null},tabs=["about","publications","projects","misc","blog"],tabRenderers={about:(t,e)=>renderAbout(t,e.profile),publications:t=>renderPublications(t),projects:t=>renderProjects(t),misc:t=>renderMisc(t),blog:t=>renderBlog(t)},markdownRenderer=createMarkdownRenderer(),PAGE_REVEAL_TIMEOUT_MS=1500,CONTENT_LOAD_TIMEOUT_MS=5e3;document.addEventListener("DOMContentLoaded",()=>{initLazyMedia(),bindTabEvents(),syncHeaderOffset();let t=window.innerWidth;window.addEventListener("resize",()=>{window.innerWidth!==t&&(t=window.innerWidth,syncHeaderOffset())});let e=window.scrollY;const n=document.documentElement,a=document.querySelector(".badge-switch"),i=window.matchMedia("(prefers-reduced-motion: reduce)");let l;window.addEventListener("scroll",()=>{const r=Math.max(0,document.documentElement.scrollHeight-window.innerHeight),o=Math.max(0,Math.min(window.scrollY,r)),s=o-e,c=70;if(o<=8||Math.abs(s)>=c){const d=o>c&&s>0;if(n.classList.contains("is-badge-compact")!==d){const p=a&&!a.hidden&&!n.classList.contains("is-mobile-layout")&&!i.matches?a.getBoundingClientRect():null;if(l?.cancel(),n.classList.toggle("is-badge-compact",d),p){const g=a.getBoundingClientRect();l=a.animate([{translate:`${p.left-g.left}px ${p.top-g.top}px`},{translate:"0 0"}],{duration:240,easing:"cubic-bezier(0.22, 1, 0.36, 1)"})}}e=o}},{passive:!0}),document.fonts?.ready&&document.fonts.ready.then(()=>{syncHeaderOffset()}).catch(()=>{}),initPage()});async function initPage(){const t=new AbortController,e=setTimeout(()=>t.abort(),CONTENT_LOAD_TIMEOUT_MS);try{const n=await fetch("data/site-content.json",{cache:"no-store",signal:t.signal});if(!n.ok)throw new Error(`Failed to load content: ${n.status}`);if(state.data=await n.json(),applySiteIdentity(state.data.site),state.data?.maitnaiance===!0||state.data?.maintenance===!0){renderMaintenancePage(state.data.maintenance_image),await revealSiteWhenReady(document.querySelector(".maintenance-gif"));return}const a=renderAll(state.data);syncHeaderOffset();const i=location.hash.replace("#","");tabs.includes(i)?activateTab(i):activateTab("about"),await revealSiteWhenReady(document.querySelector(".profile-photo"),a)}catch(n){const a=n.name==="AbortError"?"The site content took too long to load. Please refresh and try again.":n.message;showLoadError(a),syncHeaderOffset(),revealSite()}finally{clearTimeout(e)}}async function revealSiteWhenReady(t,e){const n=document.fonts?Promise.all([document.fonts.load("400 1rem Poppins"),document.fonts.load("700 1rem Poppins")]):Promise.resolve(),a=t?.decode?t.decode().catch(()=>{}):Promise.resolve();await Promise.race([Promise.allSettled([n,a,e]),new Promise(i=>setTimeout(i,PAGE_REVEAL_TIMEOUT_MS))]),syncHeaderOffset(),await new Promise(i=>requestAnimationFrame(()=>requestAnimationFrame(i))),revealSite()}function revealSite(){document.body.classList.remove("site-loading"),document.querySelector(".page-shell")?.setAttribute("aria-busy","false"),document.getElementById("site-loader")?.setAttribute("aria-hidden","true")}function renderMaintenancePage(t){const e=document.querySelector(".page-shell");e&&(document.body.classList.add("maintenance-mode"),e.innerHTML=`
        <section class="maintenance-shell">
            ${t?`<img class="maintenance-gif" data-src="${escapeHtml(t)}" alt="" width="110" height="110" loading="lazy" decoding="async">`:""}
            <h1 class="maintenance-title">Under Maintenance</h1>
            <p class="maintenance-text">The site will be available again soon.</p>
        </section>
    `)}function bindTabEvents(){document.querySelectorAll(".tab-button").forEach(t=>{t.addEventListener("click",()=>activateTab(t.dataset.tab))}),document.querySelectorAll(".site-home-link").forEach(t=>{t.addEventListener("click",e=>{e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||(e.preventDefault(),activateTab("about"),window.scrollTo(0,0))})})}function syncHeaderOffset(){const t=document.querySelector(".site-header");if(!t)return;const e=document.documentElement;e.classList.add("is-measuring-header","is-syncing-header");const n=window.matchMedia("(max-width: 864px)").matches;let a=n;if(!n){e.classList.remove("is-mobile-layout");const i=t.querySelector(".brand-wrap");a=t.querySelector(".tab-nav").getBoundingClientRect().top>=i.getBoundingClientRect().bottom}if(e.classList.toggle("is-mobile-layout",a),e.classList.toggle("is-compact-layout",a||window.matchMedia("(max-width: 980px)").matches),a){const i=t.querySelector(".tab-nav");e.style.setProperty("--mobile-nav-height",`${Math.ceil(i.getBoundingClientRect().height)}px`)}e.style.setProperty("--header-height",`${Math.ceil(t.getBoundingClientRect().height)}px`),e.classList.remove("is-measuring-header"),t.offsetHeight,e.classList.remove("is-syncing-header")}function activateTab(t){if(!tabs.includes(t))return;const e=document.getElementById(`tab-${t}`);document.querySelectorAll(".tab-button").forEach(n=>{const a=n.dataset.tab===t;n.classList.toggle("active",a),a?n.setAttribute("aria-current","page"):n.removeAttribute("aria-current")}),document.querySelectorAll(".tab-panel").forEach(n=>{n.classList.toggle("active",n.id===`tab-${t}`)}),history.replaceState(null,"",`#${t}`),t==="blog"&&state.blogViewingPost&&renderBlog(state.data?.blog||{}),requestAnimationFrame(()=>{e?.classList.contains("active")&&replayTabMediaReveal(e)})}function replayTabMediaReveal(t){t.querySelectorAll("img[src], iframe[src]").forEach(e=>{e.classList.contains("media-lazy")||e.closest(".profile-photo, .gallery-item")||e instanceof HTMLImageElement&&!e.complete||(e.classList.remove("tab-media-revealed"),e.offsetWidth,e.classList.add("tab-media-revealed"))})}function renderAll(t){const e=renderHeader(t.site,t.profile?.badge);return tabs.forEach(n=>{const a=t[n]||{},i=String(a.title||n),l=document.querySelector(`[data-tab="${n}"]`),r=document.getElementById(`tab-${n}`);l&&(l.textContent=i),r&&r.setAttribute("aria-label",i),tabRenderers[n]?.(a,t)}),e}function applySiteIdentity(t={}){document.title=t.seo?.title||t.name||"Personal Website",document.documentElement.lang=t.language||"en";const e=document.querySelector("[data-site-source]");if(e&&/^https?:\/\//i.test(t.source_url||"")&&(e.href=t.source_url,e.hidden=!1),t.favicon&&!document.querySelector('link[rel="icon"]'))try{const n=new URL(t.favicon,document.baseURI);if(n.protocol==="http:"||n.protocol==="https:"){const a=document.createElement("link");a.rel="icon",a.href=n.href,document.head.append(a)}}catch{}}function renderHeader(t,e){const n=document.getElementById("site-name");n.querySelector(".site-home-link").textContent=t?.name||"Personal Website",document.querySelector(".mobile-site-name").textContent=n.textContent;const a=n.closest(".brand-name"),i=a.querySelector(".site-name-mark"),l=t?.name_mark;if(l?.src&&l.alt){const h=i.querySelector("img");h.src=l.src,h.alt=l.alt,i.querySelector(".name-mark-art").style.setProperty("--name-mark-image",`url(${JSON.stringify(h.src)})`),i.hidden=!1}const r=Array.isArray(e?.list)?e.list:[typeof e=="string"?e:e?.module],o=[...new Set(r.filter(h=>typeof h=="string"&&h.trim()))];if(o.length===0)return;const s=a.querySelector(".badge-switch"),c=s.querySelector("span"),d=e?.width;let u=e?.mode==="random"?Math.floor(Math.random()*o.length):Math.max(0,o.indexOf(e?.default)),p,g,m=!1,$;async function L(h){m=!0;try{const{mount:y}=await import(new URL(o[h],document.baseURI).href),b=document.createElement("canvas");b.className="brand-badge",b.setAttribute("aria-hidden","true"),Number.isFinite(d)&&d>0&&b.style.setProperty("--badge-width",`${d}px`);const f=a.closest(".page-shell");let S;const v=y(b,{onHighlight(M,E){if(p!==b)return;const w=Math.round(50-50*Math.cos(E));w!==S&&(f.style.setProperty("--badge-name-colors",M),f.style.setProperty("--badge-name-position",`${w}%`),S=w)}});return p?(p.replaceWith(b),g?.()):a.before(b),p=b,f.style.removeProperty("--badge-name-colors"),f.style.removeProperty("--badge-name-position"),g=typeof v=="function"?v:void 0,u=h,s.hidden=o.length<2,syncHeaderOffset(),v?.ready}catch(y){console.warn("Header badge could not load:",y)}finally{m=!1}}return s.addEventListener("click",()=>{m||(window.matchMedia("(prefers-reduced-motion: reduce)").matches||($?.cancel(),$=c.animate([{transform:"rotate(0turn)"},{transform:"rotate(1turn)"}],{duration:420,easing:"cubic-bezier(0.25, 0.8, 0.25, 1)"})),L((u+1)%o.length))}),L(u)}function renderSectionDescription(t,e=!1){const a=(Array.isArray(t)?t:[t]).filter(i=>String(i??"").trim()).map(i=>`<p>${renderConfigText(i)}</p>`).join("");return a?e?a:`<div class="section-description">${a}</div>`:""}function renderSectionShell(t={},e="",n="",a=!1){return`
        <section class="${["section-card","card",n].filter(Boolean).join(" ")}">
            <h2 class="section-title">${renderConfigText(t.title||"")}</h2>
            ${renderSectionDescription(t.description,a)}
            ${e}
        </section>
    `}function renderAbout(t={},e={}){const n=document.getElementById("tab-about"),a=t.content||{},i=a.experience||{},l=a.education||{},r=(e.links||[]).map(c=>{const d=String(c.icon||"").trim(),u=d?`<img class="profile-link-icon" src="assets/icons/${escapeHtml(d)}.svg" alt="" width="16" height="16" loading="lazy" decoding="async" onerror="this.remove()">`:"";return`<a href="${c.url}" target="_blank" rel="noopener">${u}${escapeHtml(c.label)}</a>`}).join(""),o=(i.items||[]).map(c=>`
            <article class="timeline-item">
                <div class="timeline-header">
                    <h3 class="timeline-role">${renderConfigText(c.role)}</h3>
                    <span class="timeline-date">${renderConfigText(c.date)}</span>
                </div>
                <p class="timeline-org">${renderConfigText(c.org)}</p>
                <p class="timeline-meta">${renderConfigText(c.meta||"")}</p>
                <p class="timeline-desc">${renderConfigText(c.description)}</p>
            </article>
        `).join(""),s=(l.items||[]).map(c=>`
            <article class="education-item">
                <div class="education-logo-wrap">
                    <img class="education-logo" data-src="${escapeHtml(c.logo||"")}" alt="${escapeHtml(c.school||"School")} logo" loading="lazy" decoding="async">
                </div>
                <div class="education-content">
                    <div class="timeline-header">
                        <h3 class="timeline-role">${renderConfigText(c.degree)}</h3>
                        <span class="timeline-date">${renderConfigText(c.date)}</span>
                    </div>
                    <p class="timeline-org">${renderConfigText(c.school)}</p>
                    <p class="timeline-desc">${renderConfigText(c.details)}</p>
                </div>
            </article>
        `).join("");n.innerHTML=`
        <div class="about-grid">
            <aside class="profile-card card">
                <img class="profile-photo" data-src="${escapeHtml(e.photo||"data/images/profile/me.jpg")}" alt="Profile photo" width="16" height="9" loading="lazy" decoding="async">
                <h2 class="profile-name">${renderConfigText(e.name||"")}</h2>
                <p class="profile-role">${renderConfigText(e.role||"")}</p>
                <p class="profile-school">${renderConfigText(e.school||"")}</p>
                <div class="profile-links">${r}</div>
            </aside>

            <div class="about-main">
                ${renderSectionShell(t,"","",!0)}
                ${renderSectionShell(i,`<div class="experience-list">${o}</div>`)}
                ${renderSectionShell(l,`<div class="education-list">${s}</div>`)}
            </div>
        </div>
    `}function renderPublications(t={}){const e=document.getElementById("tab-publications"),n=(t.content||[]).map((a,i)=>{const l=a.links&&typeof a.links=="object"?a.links:{},r=Object.entries(l).filter(([g,m])=>String(g).trim()&&String(m).trim()).map(([g,m])=>({name:String(g).trim(),url:String(m).trim()}));r.length===0&&(a.doi&&r.push({name:"DOI",url:String(a.doi)}),a.pdf&&r.push({name:"PDF",url:String(a.pdf)}));const o=String(a.poster||"").trim(),s=String(a.teaser||"").trim(),c=String(a.background_image||"").trim(),d=/\.(?:webm|mp4|m4v|ogv|ogg)(?:[?#]|$)/i.test(s),u=r.map(g=>`<a class="cta-button" href="${escapeHtml(g.url)}" target="_blank" rel="noopener">${escapeHtml(g.name)}</a>`);o&&u.push(`
                    <a class="cta-button publication-poster-link glightbox"
                        href="${escapeHtml(o)}"
                        data-gallery="publication-poster-${i}"
                        data-title="${escapeHtml(a.title||"Publication")} — Poster"
                        target="_blank"
                        rel="noopener">Poster</a>
                `);const p=u.join("")||'<span class="cta-button disabled">Links TBD</span>';return`
                <article class="publication-row card">
                    ${c?`
                        <img class="publication-background" data-src="${escapeHtml(c)}" alt="" loading="lazy" decoding="async">`:""}
                    <div class="publication-teaser-wrap">
                        ${d?`<video class="publication-teaser" data-src="${escapeHtml(s)}" autoplay muted loop playsinline aria-label="Publication teaser"></video>`:`<img class="publication-teaser" data-src="${escapeHtml(s)}" alt="Publication teaser" width="16" height="9" loading="lazy" decoding="async">`}
                    </div>
                    <div class="publication-content">
                        <h3 class="publication-title">${renderConfigText(a.title)}</h3>
                        <p class="publication-authors">${renderConfigText(a.authors)}</p>
                        <p class="publication-conf">${renderConfigText(a.conference)}</p>
                        ${a.abstract?`<p class="publication-abstract">${renderConfigText(a.abstract)}</p>`:""}
                        <div class="link-row">
                            ${p}
                        </div>
                    </div>
                </article>
            `}).join("");e.innerHTML=renderSectionShell(t,`<div class="publication-list">${n}</div>`),initPublicationPosterLightbox()}function initPublicationPosterLightbox(){window.GLightbox&&(state.publicationPosterLightbox&&state.publicationPosterLightbox.destroy(),state.publicationPosterLightbox=window.GLightbox({selector:"#tab-publications .publication-poster-link",touchNavigation:!0,loop:!1}))}function getPagination(t,e,n){const a=Number.isSafeInteger(e)&&e>0?e:5,i=Math.max(1,Math.ceil(t/a)),l=Math.min(n,i-1);return{page:l,pageCount:i,pageSize:a,start:l*a}}function renderPagination(t,e,n){return`
        <nav class="list-pagination" aria-label="${t} pagination, page ${e+1} of ${n}" tabindex="-1">
            <button class="cta-button" type="button" data-page-step="-1" aria-label="Previous page"${e===0?" disabled":""}>
                <span class="list-prev-icon" aria-hidden="true"></span>
            </button>
            <form class="list-page-jump">
                <label>Page <input type="number" name="page" min="1" max="${n}" step="1" value="${e+1}" inputmode="numeric" enterkeyhint="go" required></label>
                <span>of ${n}</span>
            </form>
            <button class="cta-button" type="button" data-page-step="1" aria-label="Next page"${e===n-1?" disabled":""}>
                <span class="list-next-icon" aria-hidden="true"></span>
            </button>
        </nav>
    `}function bindPagination(t,e,n){function a(l,r){if(l===e)return;n(l),(t.querySelector(`[data-page-step="${r}"]:not(:disabled)`)||t.querySelector(".list-pagination")).focus({preventScroll:!0}),scrollToTop()}const i=t.querySelector(".list-page-jump");i.addEventListener("submit",l=>{l.preventDefault();const r=i.elements.namedItem("page");a(r.valueAsNumber-1)}),t.querySelectorAll("[data-page-step]").forEach(l=>{l.addEventListener("click",()=>{const r=Number(l.dataset.pageStep);a(e+r,r)})})}function renderProjects(t={}){const e=document.getElementById("tab-projects"),n=Array.isArray(t.content)?t.content:[],{page:a,pageCount:i,pageSize:l,start:r}=getPagination(n.length,t.items_per_page,state.projectsPage);state.projectsPage=a;const o=n.slice(r,r+l).map((s,c)=>`
            <article class="project-item card">
                <span class="project-number" aria-hidden="true">${r+c+1}</span>
                ${s.background_image?.trim()?`
                    <img class="project-background" data-src="${escapeHtml(s.background_image.trim())}" alt="" loading="lazy" decoding="async">`:""}
                <div class="project-main">
                    <h3 class="project-title">${renderConfigText(s.title)}</h3>
                    <p class="project-time">${renderConfigText(s.date)}</p>
                    <p class="project-desc">${renderConfigText(s.description)}</p>
                </div>
                <div class="project-actions">
                    <button class="run-button" type="button" data-project-index="${r+c}">
                        Play <span class="run-button-arrow" aria-hidden="true"></span>
                    </button>
                </div>
            </article>
        `).join("");e.innerHTML=renderSectionShell(t,`<div class="project-list">${o}</div>${renderPagination("Projects",a,i)}`),bindPagination(e,a,s=>{state.projectsPage=s,renderProjects(t)}),e.querySelectorAll(".run-button").forEach(s=>{s.addEventListener("click",()=>{const c=Number(s.dataset.projectIndex);openProjectModal(c)})})}function renderMisc(t={}){const e=document.getElementById("tab-misc");if(!e)return;disposeMiscModules();const n=Array.isArray(t.content)?t.content:[],a=n.map((i,l)=>`
            <section class="misc-block card">
                <h2>${renderConfigText(i.title||`Misc item ${l+1}`)}</h2>
                ${i.description?`<p class="misc-caption">${renderConfigText(i.description)}</p>`:""}
                ${renderMiscModule(i.module,l,i.title)}
            </section>
        `).join("");e.innerHTML=renderSectionShell(t,a||"<p>No miscellaneous items configured yet.</p>"),initMiscGalleryLightbox(),n.forEach((i,l)=>{i.module?.type==="map"&&initTravelMap(document.getElementById(`misc-map-${l}`),getMapPlaces(i.module))})}function renderMiscModule(t={},e,n=""){if(!t||typeof t!="object")return'<p class="misc-caption">No module configured.</p>';if(t.type==="gallery")return`
            <div class="gallery-grid">
                ${(Array.isArray(t.items)?t.items:[]).map((i,l)=>{const r=String(i?.src||""),o=String(i?.thumbnail||r),s=String(i?.alt||`Gallery image ${l+1}`);return`
                        <a class="gallery-item glightbox" href="${escapeHtml(r)}" data-gallery="misc-gallery-${e}" data-title="${escapeHtml(s)}">
                            <img data-src="${escapeHtml(o)}" alt="${escapeHtml(s)}" width="4" height="3" loading="lazy" decoding="async">
                        </a>
                    `}).join("")}
            </div>
        `;if(t.type==="youtube")return`
            <div class="embed-wrap">
                <iframe data-src="${escapeHtml(t.url||"")}" title="YouTube video: ${escapeHtml(n||`misc item ${e+1}`)}" width="16" height="9" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
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
        `}return`<p class="misc-caption">Unsupported module type: ${escapeHtml(t.type||"unknown")}.</p>`}function disposeMiscModules(){state.miscGalleryLightbox&&(state.miscGalleryLightbox.destroy(),state.miscGalleryLightbox=null)}function initMiscGalleryLightbox(){window.GLightbox&&(state.miscGalleryLightbox=window.GLightbox({selector:"#tab-misc .glightbox",touchNavigation:!0,loop:!0}))}function getMapPlaces(t){return(t.places||[]).filter(e=>Number.isFinite(Number(e.lat))&&Number.isFinite(Number(e.lon)))}function renderBlog(t={}){const e=document.getElementById("tab-blog");if(!e)return;state.blogViewingPost=!1;const n=Array.isArray(t.content)?t.content:[],{page:a,pageCount:i,pageSize:l,start:r}=getPagination(n.length,t.posts_per_page,state.blogPage);state.blogPage=a;const o=n.length>0?n.slice(r,r+l).map((s,c)=>`
            <article class="blog-list-item card">
                <div class="blog-item-content">
                    <h3 class="blog-item-title">
                        <button class="blog-title-button" type="button" data-post-index="${r+c}">${escapeHtml(s.title||`Post ${r+c+1}`)}</button>
                    </h3>
                    <p class="blog-item-intro">${renderConfigText(s.intro||"")}</p>
                </div>
                <div class="blog-cover-wrap">
                    <img class="blog-cover" data-src="${escapeHtml(s.cover||"")}" alt="${escapeHtml(s.title||"Blog cover")}" width="16" height="9" loading="lazy" decoding="async">
                </div>
            </article>
        `).join(""):"<p>No blog posts configured yet.</p>";e.innerHTML=renderSectionShell(t,`<div class="blog-list">${o}</div>${renderPagination("Blog",a,i)}`),e.querySelectorAll(".blog-title-button").forEach(s=>{s.addEventListener("click",()=>{const c=Number(s.dataset.postIndex);openBlogPost(c)})}),bindPagination(e,a,s=>{state.blogPage=s,renderBlog(t)}),state.blogLightbox&&(state.blogLightbox.destroy(),state.blogLightbox=null)}async function openBlogPost(t){const e=document.getElementById("tab-blog"),n=state.data?.blog||{},i=(Array.isArray(n.content)?n.content:[])[t];if(!e||!i)return;const l=String(i.title||"Untitled Post"),r=String(i.intro||""),o=String(i.html||"").trim(),s=o||String(i.markdown||"").trim();state.blogViewingPost=!0,e.innerHTML=`
        <div class="blog-post-view">
            <section class="section-card card blog-article-shell">
                <header class="blog-article-heading">
                    <h2 class="blog-article-title">${escapeHtml(l)}</h2>
                    ${r?`<p class="blog-article-intro">${renderConfigText(r)}</p>`:""}
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
    `;const c=e.querySelector(".blog-article-content");if(e.querySelector('[data-blog-action="back"]').addEventListener("click",()=>renderBlog(n)),e.querySelector('[data-blog-action="top"]').addEventListener("click",scrollToTop),!s){c.querySelector("p").textContent="Missing HTML or Markdown path in blog post config.";return}try{const d=await fetch(s,{cache:"no-store"});if(!d.ok)throw new Error(`Failed to load post: ${d.status}`);if(!o&&!markdownRenderer)throw new Error("Markdown renderer is not available.");const u=await d.text();if(!c.isConnected)return;const p=o?u:markdownRenderer.render(u),g=hydrateBlogHtml(p,s,l),m=i.cover?`
                <figure class="blog-article-cover-wrap">
                    <img class="blog-article-cover" data-src="${escapeHtml(i.cover)}" alt="${escapeHtml(l)} cover" width="2" height="1" loading="lazy" decoding="async">
                </figure>
            `:"";c.innerHTML=`
            <article class="blog-article">
                ${m}
                <div class="markdown-body">${g}</div>
            </article>
        `,initBlogLightbox("#tab-blog .glightbox")}catch(d){if(c.isConnected){const u=document.createElement("p");u.className="blog-article-loading",u.textContent=`Failed to load this post: ${d.message}`,c.replaceChildren(u)}}}function hydrateBlogHtml(t,e,n){const a=document.createElement("template");a.innerHTML=t;const i=new URL(e,window.location.href),l=document.getElementById("blog-math-styles");return l&&a.content.querySelector(".katex, .katex-display")&&l.replaceWith(l.content.cloneNode(!0)),a.content.querySelectorAll("iframe[src], audio[src], video[src], source[src], track[src], video[poster]").forEach(r=>{for(const o of["src","poster"]){const s=r.getAttribute(o);s&&r.setAttribute(o,new URL(s,i).href)}}),a.content.querySelectorAll("img").forEach(r=>{const o=r.getAttribute("src")||"";if(!o)return;const s=new URL(o,i).href;r.removeAttribute("src"),r.setAttribute("data-src",s),r.setAttribute("loading","lazy"),r.setAttribute("decoding","async");const c=r.closest("a");if(c){const p=c.getAttribute("href")||s;c.setAttribute("href",new URL(p,i).href),c.classList.add("glightbox"),c.setAttribute("data-gallery","blog-article-images"),c.setAttribute("data-title",n);return}const d=document.createElement("a");d.href=s,d.className="glightbox",d.setAttribute("data-gallery","blog-article-images"),d.setAttribute("data-title",n);const u=r.closest("picture")||r;u.replaceWith(d),d.appendChild(u)}),a.content.querySelectorAll("a[href]").forEach(r=>{if(r.classList.contains("glightbox"))return;const o=r.getAttribute("href")||"";if(!(!o||o.startsWith("#")))try{const s=new URL(o,i);r.setAttribute("href",s.href),(s.protocol==="http:"||s.protocol==="https:")&&(r.setAttribute("target","_blank"),r.setAttribute("rel","noopener"))}catch{}}),a.innerHTML}function initBlogLightbox(t){window.GLightbox&&(state.blogLightbox&&state.blogLightbox.destroy(),state.blogLightbox=window.GLightbox({selector:t,touchNavigation:!0,loop:!0}))}function createMarkdownRenderer(){if(!window.markdownit)return;const t=window.markdownit({html:!1,linkify:!0,breaks:!1});return typeof window.markdownitKatexBridge=="function"&&t.use(window.markdownitKatexBridge),t}function scrollToTop(){window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})}function initLazyMedia(){const t="img[data-src], iframe[data-src], video.publication-teaser[data-src]",e=new Set;let n=0,a;const i=(o,s)=>{const c=o.dataset.src;if(!c){markMediaRevealed(o),s?.();return}const d=new AbortController,u=async()=>{d.signal.aborted||(d.abort(),s&&o.decode&&await o.decode().catch(()=>{}),markMediaRevealed(o),s?.())},p=o instanceof HTMLVideoElement?"loadeddata":"load";o.addEventListener(p,u,{signal:d.signal}),o.addEventListener("error",u,{signal:d.signal}),delete o.dataset.src,o.src=c,o instanceof HTMLImageElement&&o.complete&&u()};function l(){for(const o of e){if(n>=2)break;if(!o.isConnected){e.delete(o),a.unobserve(o);continue}o.getClientRects().length&&(e.delete(o),a.unobserve(o),n+=1,o.loading="eager",i(o,()=>{n-=1,requestAnimationFrame(l)}))}}const r=o=>{!o.dataset.src||o.classList.contains("media-lazy")||o.classList.contains("media-revealed")||(o.classList.add("media-lazy"),a&&o.matches(".gallery-item img")?a.observe(o):state.lazyMediaObserver?state.lazyMediaObserver.observe(o):i(o))};"IntersectionObserver"in window&&(a=new IntersectionObserver(o=>{o.forEach(({target:s,isIntersecting:c})=>{c?e.add(s):e.delete(s)}),l()},{rootMargin:"80px 0px"}),state.lazyMediaObserver=new IntersectionObserver(o=>{o.forEach(s=>{s.isIntersecting&&(i(s.target),state.lazyMediaObserver.unobserve(s.target))})},{rootMargin:"200px 0px",threshold:.1})),document.querySelectorAll(t).forEach(r),state.lazyMediaMutationObserver=new MutationObserver(o=>{o.forEach(s=>{s.addedNodes.forEach(c=>{if(c instanceof Element){if(c.matches(t)){r(c);return}c.querySelectorAll(t).forEach(r)}})})}),state.lazyMediaMutationObserver.observe(document.body,{childList:!0,subtree:!0})}function markMediaRevealed(t){if(t.classList.remove("media-lazy"),t.classList.contains("media-revealed"))return;t.classList.add("media-revealed");let e=!1;const n=()=>{e||(e=!0,t.classList.remove("media-revealed"))};t.addEventListener("animationend",n,{once:!0}),setTimeout(n,900)}function openProjectModal(t){const e=state.data?.projects?.content?.[t];if(!e)return;const n=Math.min(window.screen.width-100,1440),a=Math.min(window.screen.height-100,920),i=Math.max(0,Math.round((window.screen.width-n)/2)),l=Math.max(0,Math.round((window.screen.height-a)/2)),r=[`width=${n}`,`height=${a}`,`left=${i}`,`top=${l}`,"popup=yes","resizable=yes","menubar=no","toolbar=no","location=no","status=no","scrollbars=no"].join(",");window.open(e.run_url,"_blank",r)||window.open(e.run_url,"_blank")}function showLoadError(t){const e=`
        <section class="section-card card">
            <h2 class="section-title">Load Error</h2>
            <p>${escapeHtml(t)}</p>
            <p>Check <code>data/site-content.json</code> and refresh.</p>
        </section>
    `;tabs.forEach(n=>{const a=document.getElementById(`tab-${n}`);a&&(a.innerHTML=e)})}function renderConfigText(t){const e=document.createElement("template");e.innerHTML=String(t??"");const n=new Set(["B","I","EM","STRONG","U","BR","SUP","SUB","CODE","A"]),a=["http:","https:","mailto:"],i=l=>{if(l.nodeType===Node.ELEMENT_NODE){const r=l,o=r.tagName.toUpperCase();if(!n.has(o)){const s=document.createTextNode(r.textContent||"");r.replaceWith(s);return}if([...r.attributes].forEach(s=>{const c=s.name.toLowerCase();o==="A"&&["href","target","rel"].includes(c)||r.removeAttribute(s.name)}),o==="A"){const s=r.getAttribute("href")||"";let c=!1;try{const d=new URL(s,window.location.origin);c=a.includes(d.protocol)}catch{c=!1}if(!c){const d=document.createTextNode(r.textContent||"");r.replaceWith(d);return}r.getAttribute("target")==="_blank"&&r.setAttribute("rel","noopener")}}[...l.childNodes].forEach(i)};return i(e.content),e.innerHTML}function escapeHtml(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
