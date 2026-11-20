import{mountShader as D}from"../webgl.js";const E=`
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform vec2 dragRotation;
    uniform vec3 dragLight;
    uniform float spinTime;

    mat2 rotate(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat2(c, s, -s, c);
    }

    float knot(vec3 p) {
        vec2 crossSection = vec2(length(p.xy) - 0.67, p.z);
        float phase = atan(p.y, p.x) * (2.0 / 3.0);
        float distanceToStrand = 2.0;
        for (int i = 0; i < 3; ++i) {
            float a = phase + float(i) * 2.094395;
            vec2 strand = 0.23 * vec2(cos(a), sin(a));
            distanceToStrand = min(distanceToStrand, length(crossSection - strand));
        }
        return distanceToStrand - 0.105;
    }

    vec3 normalAt(vec3 p) {
        vec2 e = vec2(0.002, 0.0);
        return normalize(vec3(
            knot(p + e.xyy) - knot(p - e.xyy),
            knot(p + e.yxy) - knot(p - e.yxy),
            knot(p + e.yyx) - knot(p - e.yyx)
        ));
    }

    vec3 objectSpace(vec3 p) {
        p.xz = rotate(0.34 + 0.24 * sin(spinTime * 0.38) + dragRotation.x) * p.xz;
        p.yz = rotate(-0.33 + 0.12 * cos(spinTime * 0.31) + dragRotation.y) * p.yz;
        p.xy = rotate(spinTime * 0.36) * p.xy;
        return p;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
        vec3 ray = objectSpace(vec3(0.0, 0.0, 1.0));
        vec3 origin = objectSpace(vec3(uv * 2.09, -1.35));
        float depth = 0.0;
        for (int step = 0; step < 82; ++step) {
            vec3 p = origin + depth * ray;
            float distanceToKnot = knot(p);
            if (distanceToKnot < 0.0015) {
                vec3 n = normalAt(p);
                vec3 key = objectSpace(normalize(mix(vec3(-0.5, 0.8, -0.5), vec3(dragLight.xy, -0.65), dragLight.z)));
                vec3 reflection = reflect(ray, n);
                float facing = max(dot(n, -ray), 0.0);
                float band = 5.0 * (1.0 - facing) + 2.2 * reflection.x - 1.35 * time - dragRotation.x - 0.5 * dragRotation.y;
                vec3 film = 0.54 + 0.38 * cos(band + vec3(0.0, 2.15, 3.65));
                float diffuse = max(dot(n, key), 0.0);
                float shine = pow(max(dot(reflection, key), 0.0), 21.0);
                float rim = pow(1.0 - facing, 3.0);
                vec3 color = film * (0.48 + 0.5 * diffuse);
                color = mix(color, vec3(0.91, 0.96, 1.0), 0.62 * shine + 0.24 * rim);
                gl_FragColor = vec4(color, 1.0);
                return;
            }
            depth += max(0.0015, 0.60 * distanceToKnot);
            if (depth > 2.7) {
                break;
            }
        }
        gl_FragColor = vec4(0.0);
    }
`;export function mount(t,{onHighlight:i}={}){return t.style.aspectRatio="1",D(t,E,{alpha:!0,pixelScale:1.15,setupInteraction:s=>P(t,s,i)})}function P(t,{gl:i,program:s,signal:f,refresh:y,reducedMotion:m},M){const z=i.getUniformLocation(s,"dragRotation"),R=i.getUniformLocation(s,"dragLight"),C=i.getUniformLocation(s,"spinTime"),{cursor:I,touchAction:X}=t.style,k=t.getAttribute("aria-hidden");t.style.cursor="grab",t.style.touchAction="pan-y pinch-zoom",t.removeAttribute("aria-hidden"),t.setAttribute("aria-label","Prism knot. Drag or use the arrow keys to rotate."),t.tabIndex=0;let o=null,g=0,x=0,a=0,c=0,v=0,w=0,u=0,b=null,A=0,h=-1/0,l=0,p=0;t.addEventListener("pointerdown",e=>{o!==null||!e.isPrimary||e.button!==0||(o=e.pointerId,g=e.clientX,x=e.clientY,l=p=0,h=-1/0,t.setPointerCapture(o),t.style.cursor="grabbing")},{signal:f}),t.addEventListener("pointermove",e=>{if(e.pointerId!==o)return;const n=t.getBoundingClientRect(),r=5/Math.max(n.width,1),d=(e.clientX-g)*r,S=(e.clientY-x)*r,L=performance.now(),T=Math.max(8,L-h);a+=d,c+=S,l=Math.max(-.008,Math.min(.008,d/T)),p=Math.max(-.008,Math.min(.008,S/T)),h=L,g=e.clientX,x=e.clientY,v=Math.max(-1,Math.min(1,2*(e.clientX-n.left)/Math.max(n.width,1)-1)),w=Math.max(-1,Math.min(1,1-2*(e.clientY-n.top)/Math.max(n.height,1))),u=1,m.matches&&y()},{signal:f});function Y(e){e.pointerId===o&&(o=null,t.style.cursor="grab",(e.type!=="pointerup"||performance.now()-h>80||m.matches)&&(l=p=0),m.matches&&(u=0,y()))}for(const e of["pointerup","pointercancel","lostpointercapture"])t.addEventListener(e,Y,{signal:f});return t.addEventListener("keydown",e=>{switch(e.key){case"ArrowLeft":a-=.2;break;case"ArrowRight":a+=.2;break;case"ArrowUp":c-=.2;break;case"ArrowDown":c+=.2;break;default:return}e.preventDefault(),m.matches&&y()},{signal:f}),f.addEventListener("abort",()=>{o!==null&&t.hasPointerCapture(o)&&t.releasePointerCapture(o),t.style.cursor=I,t.style.touchAction=X,k!==null&&t.setAttribute("aria-hidden",k),t.removeAttribute("aria-label"),t.removeAttribute("tabindex")},{once:!0}),(e,n)=>{const r=b===null?0:Math.min(e-b,32);if(b=e,o===null)if(m.matches)l=p=u=0;else{A+=r/1e3,a+=l*r,c+=p*r;const d=Math.exp(-r/95);l*=d,p*=d,u*=Math.exp(-r/160)}i.uniform2f(z,a,c),i.uniform3f(R,v,w,u),i.uniform1f(C,A),M?.("#58449d, #257b86, #a24d68, #89601b, #58449d",n*1.35+a+.5*c)}}
