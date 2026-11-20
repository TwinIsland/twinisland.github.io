export function website(s,{darkColors:r}={}){const t=document.createElement("article");t.className="sample-page",t.innerHTML=`
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
    `;function o({Surface:e,Ink:a,Accent:n},l){t.style.colorScheme=l,t.style.setProperty("--sample-surface",e),t.style.setProperty("--sample-ink",a),t.style.setProperty("--sample-accent",n)}if(o(s,"light"),r){const e=document.createElement("button");e.type="button",e.className="sample-theme-toggle",e.textContent="Dark mode",e.setAttribute("aria-pressed","false");let a=!1;e.addEventListener("click",()=>{a=!a;const n=a?{...s,...r}:s;o(n,a?"dark":"light"),e.setAttribute("aria-pressed",String(a))}),t.querySelector(".sample-nav").append(e)}return t}
