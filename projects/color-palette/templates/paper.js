const p=[{name:"Coated",values:[4,15,29,45,61],dash:""},{name:"Textured",values:[6,24,46,60,73],dash:"7 4"},{name:"Untreated",values:[8,35,63,79,91],dash:"2 4"}];function d({Surface:c,Ink:i,Grid:n,"Series 1":o,"Series 2":l,"Series 3":t}){const e=document.createElement("article");return e.className="sample-paper",e.style.setProperty("--sample-surface",c),e.style.setProperty("--sample-ink",i),e.style.setProperty("--sample-grid",n),[o,l,t].forEach((s,a)=>{e.style.setProperty(`--sample-series-${a+1}`,s)}),e}export function paper(c){const i=d(c),n=[0,25,50,75,100].map(t=>{const e=112-t;return`<path class="chart-grid" d="M35 ${e}H255"/><text x="28" y="${e+3}" text-anchor="end">${t}</text>`}).join(""),o=p.map(({values:t,dash:e},s)=>{const a=t.map((r,f)=>`${35+f*55},${112-r}`).join(" ");return`<polyline class="series-${s+1}" points="${a}" fill="none" stroke-width="2.4" stroke-dasharray="${e}"/>`}).join(""),l=p.map(({name:t,values:e},s)=>{const a=61+76*s,r=e.at(-1);return`<rect class="series-${s+1}" x="${a-17}" y="${112-r}" width="34" height="${r}"/>
            <text x="${a}" y="${107-r}" text-anchor="middle">${r}</text>
            <text x="${a}" y="127" text-anchor="middle">${t}</text>`}).join("");return i.innerHTML=`
        <header>
            <p>Sample paper · Simulated data and geometry</p>
            <h3>Water uptake in porous films</h3>
        </header>
        <p>We compare three surface treatments under simulated rainfall. The coated film absorbs less water across the observation period.</p>
        <figure>
            <svg viewBox="0 0 270 145" role="img" aria-label="Line chart of water uptake increasing over 60 minutes for all three films">
                ${n}
                <path class="chart-axis" d="M35 12V112H255"/>
                ${o}
                <text x="35" y="126">0</text><text x="255" y="126" text-anchor="end">60</text>
                <text x="145" y="140" text-anchor="middle">Time (min)</text>
            </svg>
            <ul class="chart-legend">
                ${p.map(({name:t},e)=>`<li><span class="series-${e+1}"></span>${t}</li>`).join("")}
            </ul>
            <figcaption><strong>Fig. 1.</strong> Water uptake (%) during exposure.</figcaption>
        </figure>
        <figure>
            <svg viewBox="0 0 270 135" role="img" aria-label="Bar chart of final water uptake: coated 61 percent, textured 73 percent, untreated 91 percent">
                ${n}
                <path class="chart-axis" d="M35 12V112H255"/>
                ${l}
            </svg>
            <figcaption><strong>Fig. 2.</strong> Water uptake (%) after 60 minutes.</figcaption>
        </figure>
        <figure>
            <svg class="surface-figure" viewBox="0 0 280 116" role="img" aria-label="Plan view of a specimen divided into three colored regions">
                <path class="surface-face series-1" d="M24 20H95L117 92H24Z"/>
                <path class="surface-face series-2" d="M95 20H169L199 92H117Z"/>
                <path class="surface-face series-3" d="M169 20H256V92H199Z"/>
                <text x="65" y="60">A</text>
                <text x="145" y="60">B</text>
                <text x="221" y="60">C</text>
            </svg>
            <figcaption><strong>Fig. 3.</strong> Plan view of regions A, B, and C.</figcaption>
        </figure>
        <figure>
            <svg class="surface-figure" viewBox="0 0 280 155" role="img" aria-label="Three-dimensional specimen with shaded top, front, and side surfaces">
                <path class="surface-face series-1" d="M24 84L70 26H124L95 84Z"/>
                <path class="surface-face series-2" d="M95 84L124 26H181L169 84Z"/>
                <path class="surface-face series-3" d="M169 84L181 26H256L239 84Z"/>
                <path class="surface-face surface-front series-1" d="M24 84H95V128H24Z"/>
                <path class="surface-face surface-front series-2" d="M95 84H169V128H95Z"/>
                <path class="surface-face surface-front series-3" d="M169 84H239V128H169Z"/>
                <path class="surface-face surface-side series-3" d="M239 84L256 26V70L239 128Z"/>
                <text x="76" y="61">A</text>
                <text x="137" y="61">B</text>
                <text x="213" y="61">C</text>
            </svg>
            <figcaption><strong>Fig. 4.</strong> Extruded specimen with shaded front and side faces.</figcaption>
        </figure>
    `,i}
