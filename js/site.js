const state={data:null,miscGalleryLightbox:null,publicationPosterLightbox:null,blogLightbox:null,blogPostIndex:-1,blogPage:0,projectsPage:0,lazyMediaObserver:null,lazyMediaMutationObserver:null},tabs=["about","publications","projects","misc","blog"],tabRenderers={about:(t,e)=>renderAbout(t,e.profile),publications:t=>renderPublications(t),projects:t=>renderProjects(t),misc:t=>renderMisc(t),blog:t=>renderBlog(t)},markdownRenderer=window.createBlogMarkdownRenderer?.(),PAGE_REVEAL_TIMEOUT_MS=1500,CONTENT_LOAD_TIMEOUT_MS=5e3;document.addEventListener("DOMContentLoaded",()=>{initLazyMedia(),bindTabEvents(),document.addEventListener("site-theme-change",syncHeaderOffset),syncHeaderOffset();let t=window.innerWidth;window.addEventListener("resize",()=>{window.innerWidth!==t&&(t=window.innerWidth,syncHeaderOffset())});let e=window.scrollY;const o=document.documentElement,a=document.querySelector(".brand-controls"),n=window.matchMedia("(prefers-reduced-motion: reduce)");let i;window.addEventListener("scroll",()=>{const s=Math.max(0,document.documentElement.scrollHeight-window.innerHeight),c=Math.max(0,Math.min(window.scrollY,s)),l=c-e,r=70;if(c<=8||Math.abs(l)>=r){const d=c>r&&l>0;if(o.classList.contains("is-badge-compact")!==d){const g=a&&a.closest(".brand-wrap")?.querySelector(".brand-badge")&&!o.classList.contains("is-mobile-layout")&&!n.matches?a.getBoundingClientRect():null;if(i?.cancel(),o.classList.toggle("is-badge-compact",d),g){const p=a.getBoundingClientRect();i=a.animate([{translate:`${g.left-p.left}px ${g.top-p.top}px`},{translate:"0 0"}],{duration:240,easing:"cubic-bezier(0.22, 1, 0.36, 1)"})}}e=c}},{passive:!0}),document.fonts?.ready&&(document.fonts.addEventListener("loadingdone",syncHeaderOffset),document.fonts.ready.then(()=>{syncHeaderOffset()}).catch(()=>{})),initPage()});async function initPage(){const t=new AbortController,e=setTimeout(()=>t.abort(),CONTENT_LOAD_TIMEOUT_MS);try{const o=await fetch("data/site-content.json",{cache:"no-store",signal:t.signal});if(!o.ok)throw new Error(`Failed to load content: ${o.status}`);if(state.data=await o.json(),window.configureSiteThemes(state.data.site?.themes),applySiteIdentity(state.data.site),state.data?.maitnaiance===!0||state.data?.maintenance===!0){renderMaintenancePage(state.data.maintenance_image),await revealSiteWhenReady(document.querySelector(".maintenance-gif"));return}const a=renderAll(state.data);syncHeaderOffset(),restoreSiteLocation(),window.addEventListener("popstate",restoreSiteLocation),await revealSiteWhenReady(document.querySelector(".profile-photo"),a)}catch(o){const a=o.name==="AbortError"?"The site content took too long to load. Please refresh and try again.":o.message;showLoadError(a),syncHeaderOffset(),revealSite()}finally{clearTimeout(e)}}async function revealSiteWhenReady(t,e){const o=new Set(["Poppins","Silkscreen"]),a=document.fonts?Promise.allSettled([...document.fonts].filter(i=>o.has(i.family.replace(/^["']|["']$/g,""))).map(i=>i.load())):Promise.resolve(),n=t?.decode?t.decode().catch(()=>{}):Promise.resolve();await Promise.race([Promise.allSettled([a,n,e]),new Promise(i=>setTimeout(i,PAGE_REVEAL_TIMEOUT_MS))]),syncHeaderOffset(),await new Promise(i=>requestAnimationFrame(()=>requestAnimationFrame(i))),revealSite()}function revealSite(){document.body.classList.remove("site-loading"),document.querySelector(".page-shell")?.setAttribute("aria-busy","false"),document.getElementById("site-loader")?.setAttribute("aria-hidden","true")}function renderMaintenancePage(t){const e=document.querySelector(".page-shell");e&&(document.body.classList.add("maintenance-mode"),e.innerHTML=`
        <section class="maintenance-shell">
            ${t?`<img class="maintenance-gif" data-src="${escapeHtml(t)}" alt="" width="110" height="110" loading="lazy" decoding="async">`:""}
            <h1 class="maintenance-title">Under Maintenance</h1>
            <p class="maintenance-text">The site will be available again soon.</p>
        </section>
    `)}function bindTabEvents(){document.querySelectorAll(".tab-button").forEach(t=>{t.addEventListener("click",()=>{activateTab(t.dataset.tab),window.scrollTo(0,0)})}),document.querySelectorAll(".site-home-link").forEach(t=>{t.addEventListener("click",e=>{e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||(e.preventDefault(),activateTab("about"),window.scrollTo(0,0))})})}function syncHeaderOffset(){const t=document.querySelector(".site-header");if(!t)return;const e=document.documentElement;e.classList.add("is-measuring-header","is-syncing-header");const o=window.matchMedia("(max-width: 864px)").matches;let a=o;if(!o){e.classList.remove("is-mobile-layout");const n=t.querySelector(".brand-wrap");a=t.querySelector(".tab-nav").getBoundingClientRect().top>=n.getBoundingClientRect().bottom}if(e.classList.toggle("is-mobile-layout",a),e.classList.toggle("is-compact-layout",a||window.matchMedia("(max-width: 980px)").matches),a){const n=t.querySelector(".tab-nav");e.style.setProperty("--mobile-nav-height",`${Math.ceil(n.getBoundingClientRect().height)}px`)}e.style.setProperty("--header-height",`${Math.ceil(t.getBoundingClientRect().height)}px`),e.classList.remove("is-measuring-header"),t.offsetHeight,e.classList.remove("is-syncing-header")}function blogPostSlug(t){if(t.slug)return t.slug;let e=String(t.html||t.markdown||"").trim().split(/[?#]/,1)[0];try{e=decodeURIComponent(e)}catch{}return e.replace(/^\.?\/?posts\//,"").replace(/(\.md|\.markdown)\.html$/i,"$1")}function siteLocation(t,e){const o=new URL(location.href);return o.hash=t,e?o.searchParams.set("post",blogPostSlug(e)):o.searchParams.delete("post"),o}function restoreSiteLocation(){const t=new URL(location.href),e=t.searchParams.get("post");if(e!==null){const a=state.data.blog?.content,n=Array.isArray(a)?a.findIndex(i=>blogPostSlug(i)===e):-1;activateTab("blog",n,n>=0?null:"replaceState");return}const o=t.hash.slice(1);tabs.includes(o)?activateTab(o,-1,null):activateTab("about",-1,"replaceState")}function activateTab(t,e=-1,o="pushState"){if(!tabs.includes(t))return;const a=document.getElementById(`tab-${t}`);if(document.querySelectorAll(".tab-button").forEach(n=>{const i=n.dataset.tab===t;n.classList.toggle("active",i),i?n.setAttribute("aria-current","page"):n.removeAttribute("aria-current")}),document.querySelectorAll(".tab-panel").forEach(n=>{n.classList.toggle("active",n.id===`tab-${t}`)}),o){const n=e>=0?state.data?.blog?.content?.[e]:null,i=siteLocation(t,n);i.href!==location.href&&history[o](null,"",i)}t==="blog"&&e!==state.blogPostIndex&&(e>=0?openBlogPost(e):renderBlog(state.data?.blog||{})),requestAnimationFrame(()=>{a?.classList.contains("active")&&replayTabMediaReveal(a)})}function replayTabMediaReveal(t){t.querySelectorAll("img[src], iframe[src]").forEach(e=>{e.classList.contains("media-lazy")||e.closest(".profile-photo, .gallery-item")||e instanceof HTMLImageElement&&!e.complete||(e.classList.remove("tab-media-revealed"),e.offsetWidth,e.classList.add("tab-media-revealed"))})}function renderAll(t){const e=renderHeader(t.site,t.profile?.badge);return tabs.forEach(o=>{const a=t[o]||{},n=String(a.title||o),i=document.querySelector(`[data-tab="${o}"]`),s=document.getElementById(`tab-${o}`);i&&(i.textContent=n),s&&s.setAttribute("aria-label",n),tabRenderers[o]?.(a,t)}),e}function applySiteIdentity(t={}){document.title=t.seo?.title||t.name||"Personal Website",document.documentElement.lang=t.language||"en";const e=document.querySelector("[data-site-source]");if(e&&/^https?:\/\//i.test(t.source_url||"")&&(e.href=t.source_url,e.hidden=!1),t.favicon&&!document.querySelector('link[rel="icon"]'))try{const o=new URL(t.favicon,document.baseURI);if(o.protocol==="http:"||o.protocol==="https:"){const a=document.createElement("link");a.rel="icon",a.href=o.href,document.head.append(a)}}catch{}}function renderHeader(t,e){const o=document.getElementById("site-name");o.querySelector(".site-home-link").textContent=t?.name||"Personal Website",document.querySelector(".mobile-site-name").textContent=o.textContent;const a=o.closest(".brand-name"),n=Array.isArray(e?.list)?e.list:[typeof e=="string"?e:e?.module],i=[...new Set(n.filter(r=>typeof r=="string"&&r.trim()))];if(i.length===0)return;const s=e?.width,c=e?.mode==="random"?Math.floor(Math.random()*i.length):Math.max(0,i.indexOf(e?.default));async function l(){try{const{mount:r}=await import(new URL(i[c],document.baseURI).href),d=document.createElement("canvas");d.className="brand-badge",d.setAttribute("aria-hidden","true"),Number.isFinite(s)&&s>0&&d.style.setProperty("--badge-width",`${s}px`);const u=a.closest(".page-shell");let g;const p=r(d,{onHighlight(m,b){if(!d.isConnected)return;const h=Math.round(50-50*Math.cos(b));h!==g&&(u.style.setProperty("--badge-name-colors",m),u.style.setProperty("--badge-name-position",`${h}%`),g=h)}});return a.before(d),syncHeaderOffset(),p?.ready}catch(r){console.warn("Header badge could not load:",r)}}return l()}function renderSectionDescription(t,e=!1){const a=(Array.isArray(t)?t:[t]).filter(n=>String(n??"").trim()).map(n=>`<p>${renderConfigText(n)}</p>`).join("");return a?e?a:`<div class="section-description">${a}</div>`:""}function renderSectionShell(t={},e="",o="",a=!1){return`
        <section class="${["section-card","card",o].filter(Boolean).join(" ")}">
            <h2 class="section-title">${renderConfigText(t.title||"")}</h2>
            ${renderSectionDescription(t.description,a)}
            ${e}
        </section>
    `}function renderAbout(t={},e={}){const o=document.getElementById("tab-about"),a=t.content||{},n=a.experience||{},i=a.education||{},s=(e.links||[]).map(r=>{const d=String(r.icon||"").trim(),u=d?`<img class="profile-link-icon" src="assets/icons/${escapeHtml(d)}.svg" alt="" width="16" height="16" loading="lazy" decoding="async" onerror="this.remove()">`:"";return`<a href="${r.url}" target="_blank" rel="noopener">${u}${escapeHtml(r.label)}</a>`}).join(""),c=(n.items||[]).map(r=>`
            <article class="timeline-item">
                <div class="timeline-header">
                    <h3 class="timeline-role">${renderConfigText(r.role)}</h3>
                    <span class="timeline-date">${renderConfigText(r.date)}</span>
                </div>
                <p class="timeline-org">${renderConfigText(r.org)}</p>
                <p class="timeline-meta">${renderConfigText(r.meta||"")}</p>
                <p class="timeline-desc">${renderConfigText(r.description)}</p>
            </article>
        `).join(""),l=(i.items||[]).map(r=>`
            <article class="education-item">
                <div class="education-logo-wrap">
                    <img class="education-logo" data-src="${escapeHtml(r.logo||"")}" alt="${escapeHtml(r.school||"School")} logo" loading="lazy" decoding="async">
                </div>
                <div class="education-content">
                    <div class="timeline-header">
                        <h3 class="timeline-role">${renderConfigText(r.degree)}</h3>
                        <span class="timeline-date">${renderConfigText(r.date)}</span>
                    </div>
                    <p class="timeline-org">${renderConfigText(r.school)}</p>
                    <p class="timeline-desc">${renderConfigText(r.details)}</p>
                </div>
            </article>
        `).join("");o.innerHTML=`
        <div class="about-grid">
            <aside class="profile-card card">
                <img class="profile-photo" data-src="${escapeHtml(e.photo||"data/images/profile/me.jpg")}" alt="Profile photo" width="16" height="9" loading="lazy" decoding="async">
                <h2 class="profile-name">${renderConfigText(e.name||"")}</h2>
                <p class="profile-role">${renderConfigText(e.role||"")}</p>
                <p class="profile-school">${renderConfigText(e.school||"")}</p>
                <div class="profile-links">${s}</div>
            </aside>

            <div class="about-main">
                ${renderSectionShell(t,"","",!0)}
                ${renderSectionShell(n,`<div class="experience-list">${c}</div>`)}
                ${renderSectionShell(i,`<div class="education-list">${l}</div>`)}
            </div>
        </div>
    `}function renderPublications(t={}){const e=document.getElementById("tab-publications"),o=(t.content||[]).map((a,n)=>{const i=a.links&&typeof a.links=="object"?a.links:{},s=Object.entries(i).filter(([p,m])=>String(p).trim()&&String(m).trim()).map(([p,m])=>({name:String(p).trim(),url:String(m).trim()}));s.length===0&&(a.doi&&s.push({name:"DOI",url:String(a.doi)}),a.pdf&&s.push({name:"PDF",url:String(a.pdf)}));const c=String(a.poster||"").trim(),l=String(a.teaser||"").trim(),r=String(a.background_image||"").trim(),d=/\.(?:webm|mp4|m4v|ogv|ogg)(?:[?#]|$)/i.test(l),u=s.map(p=>`<a class="cta-button" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>`);c&&u.push(`
                    <a class="cta-button publication-poster-link glightbox"
                        href="${escapeHtml(c)}"
                        data-gallery="publication-poster-${n}"
                        data-title="${escapeHtml(a.title||"Publication")} — Poster"
                        target="_blank"
                        rel="noopener">Poster</a>
                `);const g=u.join("")||'<span class="cta-button disabled">Links TBD</span>';return`
                <article class="publication-row card">
                    ${r?`
                        <img class="publication-background" data-src="${escapeHtml(r)}" alt="" loading="lazy" decoding="async">`:""}
                    <div class="publication-teaser-wrap">
                        ${d?`<video class="publication-teaser" data-src="${escapeHtml(l)}" autoplay muted loop playsinline aria-label="Publication teaser"></video>`:`<img class="publication-teaser" data-src="${escapeHtml(l)}" alt="Publication teaser" width="16" height="9" loading="lazy" decoding="async">`}
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
            `}).join("");e.innerHTML=renderSectionShell(t,`<div class="publication-list">${o}</div>`),initPublicationPosterLightbox()}function initPublicationPosterLightbox(){window.GLightbox&&(state.publicationPosterLightbox&&state.publicationPosterLightbox.destroy(),state.publicationPosterLightbox=window.GLightbox({selector:"#tab-publications .publication-poster-link",touchNavigation:!0,loop:!1}))}function getPagination(t,e,o){const a=Number.isSafeInteger(e)&&e>0?e:5,n=Math.max(1,Math.ceil(t/a)),i=Math.min(o,n-1);return{page:i,pageCount:n,pageSize:a,start:i*a}}function renderPagination(t,e,o){return`
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
    `}function bindPagination(t,e,o){function a(i,s){if(i===e)return;o(i),(t.querySelector(`[data-page-step="${s}"]:not(:disabled)`)||t.querySelector(".list-pagination")).focus({preventScroll:!0}),scrollToTop()}const n=t.querySelector(".list-page-jump");n.addEventListener("submit",i=>{i.preventDefault();const s=n.elements.namedItem("page");a(s.valueAsNumber-1)}),t.querySelectorAll("[data-page-step]").forEach(i=>{i.addEventListener("click",()=>{const s=Number(i.dataset.pageStep);a(e+s,s)})})}function renderProjects(t={}){const e=document.getElementById("tab-projects"),o=Array.isArray(t.content)?t.content:[],{page:a,pageCount:n,pageSize:i,start:s}=getPagination(o.length,t.items_per_page,state.projectsPage);state.projectsPage=a;const c=o.slice(s,s+i).map((l,r)=>`
            <article class="project-item card">
                <span class="project-number" aria-hidden="true">${s+r+1}</span>
                ${l.background_image?.trim()?`
                    <img class="project-background" data-src="${escapeHtml(l.background_image.trim())}" alt="" loading="lazy" decoding="async">`:""}
                <div class="project-main">
                    <h3 class="project-title">${renderConfigText(l.title)}</h3>
                    <p class="project-time">${renderConfigText(l.date)}</p>
                    <p class="project-desc">${renderConfigText(l.description)}</p>
                </div>
                <div class="project-actions">
                    <button class="run-button" type="button" data-project-index="${s+r}">
                        Play <span class="run-button-arrow" aria-hidden="true"></span>
                    </button>
                </div>
            </article>
        `).join("");e.innerHTML=renderSectionShell(t,`<div class="project-list">${c}</div>${renderPagination("Projects",a,n)}`),bindPagination(e,a,l=>{state.projectsPage=l,renderProjects(t)}),e.querySelectorAll(".run-button").forEach(l=>{l.addEventListener("click",()=>{const r=Number(l.dataset.projectIndex);openProjectModal(r)})})}function renderMisc(t={}){const e=document.getElementById("tab-misc");if(!e)return;disposeMiscModules();const o=Array.isArray(t.content)?t.content:[],a=o.map((n,i)=>`
            <section class="misc-block card">
                <h2>${renderConfigText(n.title||`Misc item ${i+1}`)}</h2>
                ${n.description?`<p class="misc-caption">${renderConfigText(n.description)}</p>`:""}
                ${renderMiscModule(n.module,i,n.title)}
            </section>
        `).join("");e.innerHTML=renderSectionShell(t,a||"<p>No miscellaneous items configured yet.</p>"),initMiscGalleryLightbox(),o.forEach((n,i)=>{n.module?.type==="map"&&initTravelMap(document.getElementById(`misc-map-${i}`),getMapPlaces(n.module))})}function renderMiscModule(t={},e,o=""){if(!t||typeof t!="object")return'<p class="misc-caption">No module configured.</p>';if(t.type==="gallery")return`
            <div class="gallery-grid">
                ${(Array.isArray(t.items)?t.items:[]).map((n,i)=>{const s=String(n?.src||""),c=String(n?.thumbnail||s),l=String(n?.alt||`Gallery image ${i+1}`);return`
                        <a class="gallery-item glightbox" href="${escapeHtml(s)}" data-gallery="misc-gallery-${e}" data-title="${escapeHtml(l)}">
                            <img data-src="${escapeHtml(c)}" alt="${escapeHtml(l)}" width="4" height="3" loading="lazy" decoding="async">
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
                        ${a.map(n=>`<button class="chip map-place" type="button" aria-controls="misc-map-${e}" aria-pressed="false" disabled>${escapeHtml(n.name||"")}</button>`).join("")}
                    </div>
                </div>
                <button class="map-place-toggle" type="button" aria-controls="map-places-${e}" aria-expanded="false" aria-label="Show all places" hidden></button>
            </div>
        `}return`<p class="misc-caption">Unsupported module type: ${escapeHtml(t.type||"unknown")}.</p>`}function disposeMiscModules(){state.miscGalleryLightbox&&(state.miscGalleryLightbox.destroy(),state.miscGalleryLightbox=null)}function initMiscGalleryLightbox(){window.GLightbox&&(state.miscGalleryLightbox=window.GLightbox({selector:"#tab-misc .glightbox",touchNavigation:!0,loop:!0}))}function getMapPlaces(t){return(t.places||[]).filter(e=>Number.isFinite(Number(e.lat))&&Number.isFinite(Number(e.lon)))}function renderBlog(t={}){const e=document.getElementById("tab-blog");if(!e)return;state.blogPostIndex=-1;const o=Array.isArray(t.content)?t.content:[],{page:a,pageCount:n,pageSize:i,start:s}=getPagination(o.length,t.posts_per_page,state.blogPage);state.blogPage=a;const c=o.length>0?o.slice(s,s+i).map((l,r)=>`
            <article class="blog-list-item card">
                <div class="blog-item-content">
                    <h3 class="blog-item-title">
                        <a class="blog-title-button" href="${escapeHtml(siteLocation("blog",l).href)}" data-post-index="${s+r}">${escapeHtml(l.title||`Post ${s+r+1}`)}</a>
                    </h3>
                    <p class="blog-item-intro">${renderConfigText(l.intro||"")}</p>
                </div>
                <div class="blog-cover-wrap">
                    <img class="blog-cover" data-src="${escapeHtml(l.cover||"")}" alt="${escapeHtml(l.title||"Blog cover")}" width="16" height="9" loading="lazy" decoding="async">
                </div>
            </article>
        `).join(""):"<p>No blog posts configured yet.</p>";e.innerHTML=renderSectionShell(t,`<div class="blog-list">${c}</div>${renderPagination("Blog",a,n)}`),e.querySelectorAll(".blog-title-button").forEach(l=>{l.addEventListener("click",r=>{r.metaKey||r.ctrlKey||r.shiftKey||r.altKey||(r.preventDefault(),activateTab("blog",Number(l.dataset.postIndex)),window.scrollTo(0,0))})}),bindPagination(e,a,l=>{state.blogPage=l,renderBlog(t)}),state.blogLightbox&&(state.blogLightbox.destroy(),state.blogLightbox=null)}async function openBlogPost(t){const e=document.getElementById("tab-blog"),o=state.data?.blog||{},n=(Array.isArray(o.content)?o.content:[])[t];if(!e||!n)return;const i=String(n.title||"Untitled Post"),s=String(n.intro||""),c=String(n.html||"").trim(),l=c||String(n.markdown||"").trim();state.blogPostIndex=t,e.innerHTML=`
        <div class="blog-post-view">
            <section class="section-card card blog-article-shell">
                <header class="blog-article-heading">
                    <h2 class="blog-article-title">${escapeHtml(i)}</h2>
                    ${s?`<p class="blog-article-intro">${renderConfigText(s)}</p>`:""}
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
    `;const r=e.querySelector(".blog-article-content");if(e.querySelector('[data-blog-action="back"]').addEventListener("click",()=>activateTab("blog")),e.querySelector('[data-blog-action="top"]').addEventListener("click",scrollToTop),!l){r.querySelector("p").textContent="Missing HTML or Markdown path in blog post config.";return}try{const d=await fetch(l,{cache:"no-store"});if(!d.ok)throw new Error(`Failed to load post: ${d.status}`);if(!c&&!markdownRenderer)throw new Error("Markdown renderer is not available.");const u=await d.text();if(!r.isConnected)return;const g=c?u:markdownRenderer.render(u),p=hydrateBlogHtml(g,l,i),m=n.cover?`
                <figure class="blog-article-cover-wrap">
                    <a class="glightbox" href="${escapeHtml(n.cover)}" data-gallery="blog-article-images" data-type="image">
                        <img class="blog-article-cover" data-src="${escapeHtml(n.cover)}" alt="${escapeHtml(i)} cover" width="2" height="1" loading="lazy" decoding="async">
                    </a>
                    ${n.cover_credit?`<figcaption>${renderConfigText(n.cover_credit)}</figcaption>`:""}
                </figure>
            `:"";r.innerHTML=`
            <article class="blog-article">
                ${m}
                <div class="markdown-body">${p}</div>
            </article>
        `,initBlogLightbox("#tab-blog .glightbox"),bindBlogFigureReferences(r.querySelector(".markdown-body"))}catch(d){if(r.isConnected){const u=document.createElement("p");u.className="blog-article-loading",u.textContent=`Failed to load this post: ${d.message}`,r.replaceChildren(u)}}}function hydrateBlogHtml(t,e,o){const a=document.createElement("template");a.innerHTML=t;const n=new URL(e,window.location.href);window.katex&&a.content.querySelectorAll("span[data-katex-inline]").forEach(s=>{window.katex.render(s.textContent.trim(),s,{throwOnError:!1})});const i=document.getElementById("blog-math-styles");return i&&a.content.querySelector(".katex, .katex-display")&&i.replaceWith(i.content.cloneNode(!0)),a.content.querySelectorAll("iframe[src], audio[src], video[src], source[src], track[src], video[poster]").forEach(s=>{for(const c of["src","poster"]){const l=s.getAttribute(c);l&&s.setAttribute(c,new URL(l,n).href)}}),a.content.querySelectorAll("img").forEach(s=>{const c=s.getAttribute("src")||"";if(!c)return;const l=new URL(c,n).href;s.removeAttribute("src"),s.setAttribute("data-src",l),s.setAttribute("loading","lazy"),s.setAttribute("decoding","async");const r=s.closest("a");if(r){const g=r.getAttribute("href")||l;r.setAttribute("href",new URL(g,n).href),r.classList.add("glightbox"),r.setAttribute("data-gallery","blog-article-images"),r.setAttribute("data-type","image"),r.setAttribute("data-title",o);return}const d=document.createElement("a");d.href=l,d.className="glightbox",d.setAttribute("data-gallery","blog-article-images"),d.setAttribute("data-type","image"),d.setAttribute("data-title",o);const u=s.closest("picture")||s;u.replaceWith(d),d.appendChild(u)}),a.content.querySelectorAll("a[href]").forEach(s=>{if(s.classList.contains("glightbox"))return;const c=s.getAttribute("href")||"";if(!(!c||c.startsWith("#")))try{const l=new URL(c,n);s.setAttribute("href",l.href),(l.protocol==="http:"||l.protocol==="https:")&&(s.setAttribute("target","_blank"),s.setAttribute("rel","noopener"))}catch{}}),a.innerHTML}function bindBlogFigureReferences(t){const e=new Map;let o=0;t.querySelectorAll("figure").forEach(i=>{const s=i.querySelector("a.glightbox:has(img)");s&&(o+=1,i.id||=`fig-${o}`,e.set(i.id,{figure:i,trigger:s,number:o}))});let a;const n=()=>a?.remove();t.querySelectorAll('a[href^="#"]').forEach(i=>{const s=e.get(i.getAttribute("href").slice(1));if(!s)return;const{figure:c,trigger:l}=s,r=c.querySelector(":scope > figcaption");if(r&&!s.labelled){const u=document.createElement("strong");u.textContent=`Fig. ${s.number}. `,r.prepend(u),s.labelled=!0}i.classList.add("blog-figure-ref"),state.blogLightbox&&i.setAttribute("aria-haspopup","dialog");const d=()=>{n(),a=document.createElement("img"),a.className="blog-figure-preview",a.alt="",a.setAttribute("aria-hidden","true");const u=l.querySelector("img");a.src=u.dataset.src||u.currentSrc||l.href,i.append(a);const g=i.getBoundingClientRect(),p=a.offsetWidth,m=document.documentElement.clientWidth,b=g.left+(g.width-p)/2,h=Math.max(8,Math.min(b,m-p-8));a.style.left=`${h-g.left}px`;const f=window.innerHeight-g.bottom;a.classList.toggle("is-above",f<a.offsetHeight+8&&g.top>f)};i.addEventListener("pointerenter",u=>{u.pointerType!=="touch"&&d()}),i.addEventListener("pointerleave",n),i.addEventListener("focus",()=>{i.matches(":focus-visible")&&d()}),i.addEventListener("blur",n),i.addEventListener("keydown",u=>{u.key==="Escape"&&a?.isConnected&&(u.stopPropagation(),n())}),i.addEventListener("click",u=>{n(),!(!state.blogLightbox||u.metaKey||u.ctrlKey||u.shiftKey||u.altKey)&&(u.preventDefault(),l.click())})})}function initBlogLightbox(t){window.GLightbox&&(state.blogLightbox&&state.blogLightbox.destroy(),state.blogLightbox=window.GLightbox({selector:t,touchNavigation:!0,loop:!0}))}function scrollToTop(){window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})}function initLazyMedia(){const t="img[data-src], iframe[data-src], video.publication-teaser[data-src]",e=new Set;let o=0,a;const n=(c,l)=>{const r=c.dataset.src;if(!r){markMediaRevealed(c),l?.();return}const d=new AbortController,u=async()=>{d.signal.aborted||(d.abort(),l&&c.decode&&await c.decode().catch(()=>{}),markMediaRevealed(c),l?.())},g=c instanceof HTMLVideoElement?"loadeddata":"load";c.addEventListener(g,u,{signal:d.signal}),c.addEventListener("error",u,{signal:d.signal}),delete c.dataset.src,c.src=r,c instanceof HTMLImageElement&&c.complete&&u()};function i(){for(const c of e){if(o>=2)break;if(!c.isConnected){e.delete(c),a.unobserve(c);continue}c.getClientRects().length&&(e.delete(c),a.unobserve(c),o+=1,c.loading="eager",n(c,()=>{o-=1,requestAnimationFrame(i)}))}}const s=c=>{!c.dataset.src||c.classList.contains("media-lazy")||c.classList.contains("media-revealed")||(c.classList.add("media-lazy"),a&&c.matches(".gallery-item img")?a.observe(c):state.lazyMediaObserver?state.lazyMediaObserver.observe(c):n(c))};"IntersectionObserver"in window&&(a=new IntersectionObserver(c=>{c.forEach(({target:l,isIntersecting:r})=>{r?e.add(l):e.delete(l)}),i()},{rootMargin:"80px 0px"}),state.lazyMediaObserver=new IntersectionObserver(c=>{c.forEach(l=>{l.isIntersecting&&(n(l.target),state.lazyMediaObserver.unobserve(l.target))})},{rootMargin:"200px 0px",threshold:.1})),document.querySelectorAll(t).forEach(s),state.lazyMediaMutationObserver=new MutationObserver(c=>{c.forEach(l=>{l.addedNodes.forEach(r=>{if(r instanceof Element){if(r.matches(t)){s(r);return}r.querySelectorAll(t).forEach(s)}})})}),state.lazyMediaMutationObserver.observe(document.body,{childList:!0,subtree:!0})}function markMediaRevealed(t){if(t.classList.remove("media-lazy"),t.classList.contains("media-revealed"))return;t.classList.add("media-revealed");let e=!1;const o=()=>{e||(e=!0,t.classList.remove("media-revealed"))};t.addEventListener("animationend",o,{once:!0}),setTimeout(o,900)}function openProjectModal(t){const e=state.data?.projects?.content?.[t];if(!e)return;const o=Math.min(window.screen.width-100,1440),a=Math.min(window.screen.height-100,920),n=Math.max(0,Math.round((window.screen.width-o)/2)),i=Math.max(0,Math.round((window.screen.height-a)/2)),s=[`width=${o}`,`height=${a}`,`left=${n}`,`top=${i}`,"popup=yes","resizable=yes","menubar=no","toolbar=no","location=no","status=no","scrollbars=no"].join(",");window.open(e.run_url,"_blank",s)||window.open(e.run_url,"_blank")}function showLoadError(t){const e=`
        <section class="section-card card">
            <h2 class="section-title">Load Error</h2>
            <p>${escapeHtml(t)}</p>
            <p>Check <code>data/site-content.json</code> and refresh.</p>
        </section>
    `;tabs.forEach(o=>{const a=document.getElementById(`tab-${o}`);a&&(a.innerHTML=e)})}function renderConfigText(t){const e=document.createElement("template");e.innerHTML=String(t??"");const o=new Set(["B","I","EM","STRONG","U","BR","SUP","SUB","CODE","A"]),a=["http:","https:","mailto:"],n=i=>{if(i.nodeType===Node.ELEMENT_NODE){const s=i,c=s.tagName.toUpperCase();if(!o.has(c)){const l=document.createTextNode(s.textContent||"");s.replaceWith(l);return}if([...s.attributes].forEach(l=>{const r=l.name.toLowerCase();c==="A"&&["href","target","rel"].includes(r)||s.removeAttribute(l.name)}),c==="A"){const l=s.getAttribute("href")||"";let r=!1;try{const d=new URL(l,window.location.origin);r=a.includes(d.protocol)}catch{r=!1}if(!r){const d=document.createTextNode(s.textContent||"");s.replaceWith(d);return}s.getAttribute("target")==="_blank"&&s.setAttribute("rel","noopener")}}[...i.childNodes].forEach(n)};return n(e.content),e.innerHTML}function escapeHtml(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
