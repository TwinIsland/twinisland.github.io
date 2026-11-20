import{mountShader as I}from"../../../badge/webgl.js";const P=`
    precision highp float;
    uniform vec2 resolution;
    uniform float viewAngle;
    uniform vec3 frontColor;
    uniform vec3 backColor;
    uniform vec3 backgroundColor;
    uniform vec3 wireframeColor;
    uniform vec3 cutEdgeColor;
    uniform vec3 highlightColor;
    uniform float showWireframe;
    uniform float showCutEdge;
    uniform float lightStrength;
    uniform float lightAngle;

    float diamond(vec3 p) {
        vec3 s = sin(p);
        vec3 c = cos(p);
        return s.x * s.y * s.z + dot(s, c.yzx * c.zxy);
    }

    float distanceToSheet(float field) {
        return (abs(field) - 0.20) / 3.47;
    }

    float distanceToBox(vec3 p) {
        vec3 d = abs(p) - vec3(3.14159);
        return max(max(d.x, d.y), d.z);
    }

    float surface(vec3 p) {
        return max(distanceToBox(p), distanceToSheet(diamond(p)));
    }

    vec3 normalAt(vec3 p) {
        const vec2 e = vec2(0.012, 0.0);
        return normalize(vec3(
            surface(p + e.xyy) - surface(p - e.xyy),
            surface(p + e.yxy) - surface(p - e.yxy),
            surface(p + e.yyx) - surface(p - e.yyx)
        ));
    }

    float surfaceGrid(vec3 p, vec3 normal, float pixelWidth) {
        vec3 distanceToLine = abs(fract(p * 1.25 + 0.5) - 0.5);
        vec3 lines = 1.0 - smoothstep(vec3(pixelWidth * 0.4), vec3(pixelWidth), distanceToLine);
        vec3 planes = max(lines.yzx, lines.zxy);
        vec3 weights = abs(normal);
        weights *= weights;
        return dot(planes, weights);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
        vec3 direction = normalize(vec3(sin(viewAngle), -0.56, cos(viewAngle)));
        vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), direction));
        vec3 up = cross(direction, right);
        vec3 origin = 12.5 * (uv.x * right + uv.y * up) - 8.0 * direction;
        vec3 color = mix(backgroundColor * 0.76, backgroundColor, 1.0 - min(length(uv), 1.0));
        float depth = 0.0;
        for (int iteration = 0; iteration < 80; ++iteration) {
            vec3 p = origin + depth * direction;
            float distanceToSurface = surface(p);
            if (distanceToSurface < 0.014) {
                vec3 normal = normalAt(p);
                vec3 light = normalize(0.94 * (cos(lightAngle) * right + sin(lightAngle) * up) - 0.7 * direction);
                float diffuse = max(dot(normal, light), 0.0);
                float rim = pow(1.0 - clamp(dot(normal, -direction), 0.0, 1.0), 3.0);
                float specular = pow(max(dot(normal, normalize(light - direction)), 0.0), 26.0);
                float field = diamond(p);
                vec3 base = field >= 0.0 ? frontColor : backColor;
                float cut = step(distanceToSheet(field), distanceToBox(p));
                base = mix(base, cutEdgeColor, cut * showCutEdge);
                vec3 lit = base * (0.40 + 0.57 * diffuse + 0.11 * rim);
                lit = mix(lit, highlightColor, specular * 0.38 + rim * 0.10);
                color = mix(base, lit, lightStrength);
                float pixelWidth = clamp(9.0 / min(resolution.x, resolution.y), 0.014, 0.055);
                float wire = surfaceGrid(p, normal, pixelWidth);
                color = mix(color, wireframeColor, wire * showWireframe * (1.0 - cut) * 0.55);
                break;
            }
            depth += distanceToSurface;
            if (depth > 14.0) break;
        }
        gl_FragColor = vec4(color, 1.0);
    }
`,N=[["Front","frontColor","#AADAFF"],["Back","backColor","#FF7C7C"],["Background","backgroundColor","#404040"],["Wireframe","wireframeColor","#000000","showWireframe"],["Cut Edge","cutEdgeColor","#000000","showCutEdge"],["Highlight","highlightColor","#FFFFFF"]];export function rendering(d,{signal:C}={}){const r=document.createElement("div");r.className="sample-rendering";const A=N.map(([t,a,i,s])=>{const c=`--sample-${t.toLowerCase().replaceAll(" ","-")}`;return d[t]&&r.style.setProperty(c,d[t]),{property:c,uniform:a,fallback:i,visibility:s}}),o=document.createElement("canvas");o.setAttribute("role","img"),o.setAttribute("aria-label","Diamond TPMS with different colors on either side of the surface"),o.setAttribute("aria-description","Drag horizontally or use the left and right arrow keys to rotate."),o.tabIndex=0,r.append(o);const n=document.createElement("fieldset");n.className="rendering-controls",n.innerHTML=`
        <legend>Render settings</legend>
        ${d.Wireframe?'<label class="rendering-wireframe"><input type="checkbox" name="wireframe" checked> Wireframe</label>':""}
        <label>Lighting strength <input type="range" name="strength" min="0" max="100" value="100"></label>
        <label>Light direction <input type="range" name="angle" min="0" max="360" value="126"></label>
    `;const h=I(o,P,{pixelScale:.65,setupInteraction({gl:t,program:a,signal:i,refresh:s,reducedMotion:c}){const L=A.map(e=>({...e,location:t.getUniformLocation(a,e.uniform),enabled:e.visibility?t.getUniformLocation(a,e.visibility):null})),k=n.querySelector('[name="strength"]'),E=n.querySelector('[name="angle"]'),S=n.querySelector('[name="wireframe"]'),F=t.getUniformLocation(a,"lightStrength"),W=t.getUniformLocation(a,"lightAngle");function g(){for(const{property:e,location:m,fallback:z,enabled:x,visibility:U}of L){const w=r.style.getPropertyValue(e).trim(),B=(w||z).slice(1).match(/../g).map(p=>parseInt(p,16)/255);if(t.uniform3fv(m,B),x){const p=!!w&&(U!=="showWireframe"||S?.checked);t.uniform1f(x,+!!p)}}t.uniform1f(F,k.valueAsNumber/100),t.uniform1f(W,E.valueAsNumber*Math.PI/180)}function v(){g(),s()}const b=new MutationObserver(v);b.observe(r,{attributes:!0,attributeFilter:["style"]}),i.addEventListener("abort",()=>b.disconnect(),{once:!0}),n.addEventListener("input",v,{signal:i}),g();const T=t.getUniformLocation(a,"viewAngle");let u=.58,y=0,l=null,f=0;return o.addEventListener("pointerdown",e=>{!e.isPrimary||e.button!==0||l!==null||(l=e.pointerId,f=e.clientX,o.setPointerCapture(l))},{signal:i}),o.addEventListener("pointermove",e=>{e.pointerId!==l||e.clientX===f||(u-=(e.clientX-f)*5/o.clientWidth,f=e.clientX,c.matches&&s())},{signal:i}),o.addEventListener("lostpointercapture",e=>{e.pointerId===l&&(l=null)},{signal:i}),o.addEventListener("keydown",e=>{e.key!=="ArrowLeft"&&e.key!=="ArrowRight"||(e.preventDefault(),u+=e.key==="ArrowLeft"?.15:-.15,c.matches&&s())},{signal:i}),(e,m)=>{l===null&&!c.matches&&(u+=(m-y)*.32),y=m,t.uniform1f(T,u)}}});if(h)r.append(n),C?.addEventListener("abort",h,{once:!0});else{const t=document.createElement("p");t.textContent="WebGL preview is unavailable.",r.replaceChildren(t)}return r}
