import{mountShader as z}from"../webgl.js";const G=`
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform sampler2D membrane;
    uniform vec3 outlinePhase;

    float edgeRadius(float angle) {
        return 0.365 + 0.047 * cos(2.0 * angle + outlinePhase.x)
            + 0.029 * cos(3.0 * angle + outlinePhase.y)
            + 0.017 * cos(5.0 * angle + outlinePhase.z);
    }

    void main() {
        vec2 p = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
        float radius = length(p);
        vec2 uv = p + 0.5;
        vec2 stepUV = vec2(1.0 / 64.0, 0.0);
        float h = texture2D(membrane, uv).r - 0.502;
        vec2 slope = vec2(
            texture2D(membrane, uv + stepUV).r - texture2D(membrane, uv - stepUV).r,
            texture2D(membrane, uv + stepUV.yx).r - texture2D(membrane, uv - stepUV.yx).r
        );
        float thickness = 1.35 + 2.7 * p.y + 0.42 * sin(9.0 * p.x + 3.0 * p.y - time * 0.65);
        float phase = 6.28318 * thickness + 24.0 * h + 8.0 * dot(slope, vec2(0.6, 0.8));
        vec3 film = 0.61 + 0.30 * cos(phase + vec3(0.0, 2.1, 4.2));
        float sheen = exp(-18.0 * abs(p.y + 0.55 * p.x - 0.14 + 1.25 * slope.y));
        film = mix(film, vec3(1.0, 0.96, 0.91), 0.30 * sheen);

        float boundary = edgeRadius(atan(p.y, p.x));
        float edge = 1.0 / min(resolution.x, resolution.y);
        float alpha = 1.0 - smoothstep(boundary - edge, boundary + edge, radius);
        gl_FragColor = vec4(film * alpha, alpha);
    }
`,i=64,F=1/120;export function mount(r,{onHighlight:n}={}){return r.style.aspectRatio="1",z(r,G,{alpha:!0,setupInteraction:M=>j(r,M,n)})}function j(r,{gl:n,program:M,signal:d,refresh:V,reducedMotion:D},P){const R=n.createTexture();let s=new Float32Array(i*i),f=new Float32Array(s.length);const l=new Uint8Array(s.length).fill(128),m=[],h=Array.from({length:3},()=>Math.random()*2*Math.PI),T=[...h],Y=n.getUniformLocation(M,"outlinePhase");function L(t){return .365+.047*Math.cos(2*t+h[0])+.029*Math.cos(3*t+h[1])+.017*Math.cos(5*t+h[2])}const N=[];for(let t=1;t<i-1;t++)for(let e=1;e<i-1;e++){const o=(e+.5)/i-.5,a=(t+.5)/i-.5;N.push({index:t*i+e,distance:Math.hypot(o,a),angle:Math.atan2(a,o)})}function _(t){h[0]=T[0]+t*.4,h[1]=T[1]-t*.53,h[2]=T[2]+t*.67,n.uniform3fv(Y,h),m.length=0;for(const{index:e,distance:o,angle:a}of N)o<L(a)?m.push(e):(s[e]=0,f[e]=0,l[e]=128)}_(0),n.bindTexture(n.TEXTURE_2D,R),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texImage2D(n.TEXTURE_2D,0,n.LUMINANCE,i,i,0,n.LUMINANCE,n.UNSIGNED_BYTE,l);let E=0,y=0;function w(t,e){const o=Math.hypot(t,e),a=L(Math.atan2(e,t));if(o>a)return;const u=o>a-.05?(a-.05)/o:1;E=t*u,y=e*u;const I=(E+.5)*i,U=(y+.5)*i;for(const p of m){const b=p%i+.5-I,C=Math.floor(p/i)+.5-U,S=b*b+C*C;if(S>36)continue;const k=.37*Math.exp(-S/9);s[p]=Math.min(s[p],-k),f[p]=Math.min(f[p],-k)}D.matches&&V()}let c=null,x;function X(t){const e=r.getBoundingClientRect(),o=Math.min(e.width,e.height);if(!o)return;const a=(t.clientX-e.left-e.width/2)/o,u=(e.top+e.height/2-t.clientY)/o;(!x||Math.hypot(a-x.x,u-x.y)>=.035)&&(w(a,u),x={x:a,y:u})}const v={cursor:r.style.cursor,touchAction:r.style.touchAction},B=new Map(["aria-label","aria-hidden","tabindex"].map(t=>[t,r.getAttribute(t)]));r.style.cursor="crosshair",r.style.touchAction="pan-y pinch-zoom",r.removeAttribute("aria-hidden"),r.setAttribute("aria-label","Soap film. Drag or press Enter to make ripples."),r.tabIndex=0,r.addEventListener("pointerdown",t=>{c!==null||!t.isPrimary||t.button!==0||(c=t.pointerId,r.setPointerCapture(c),x=null,X(t))},{signal:d}),r.addEventListener("pointermove",t=>{t.pointerId===c&&X(t)},{signal:d});for(const t of["pointerup","pointercancel","lostpointercapture"])r.addEventListener(t,e=>{e.pointerId===c&&(c=null)},{signal:d});r.addEventListener("keydown",t=>{t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),t.repeat||w(-.12,.05))},{signal:d}),d.addEventListener("abort",()=>{c!==null&&r.hasPointerCapture(c)&&r.releasePointerCapture(c),Object.assign(r.style,v);for(const[t,e]of B)e===null?r.removeAttribute(t):r.setAttribute(t,e);n.deleteTexture(R)},{once:!0});let g=0,A=0;return(t,e)=>{if(!D.matches)for(_(e),A+=Math.min(e-g,.04);A>=F;){for(const o of m){const a=s[o-1]+s[o+1]+s[o-i]+s[o+i]-4*s[o];f[o]=s[o]+.989*(s[o]-f[o])+.24*a}[s,f]=[f,s],A-=F}g=e;for(const o of m)l[o]=Math.max(0,Math.min(255,Math.round(128+230*s[o])));if(n.texSubImage2D(n.TEXTURE_2D,0,0,0,i,i,n.LUMINANCE,n.UNSIGNED_BYTE,l),P){const o=Math.floor((E+.5)*i),u=Math.floor((y+.5)*i)*i+o,I=1.35+2.7*y+.42*Math.sin(9*E+3*y-e*.65),U=(l[u+1]-l[u-1])/255,p=(l[u+i]-l[u-i])/255,b=2*Math.PI*I+24*(l[u]/255-.502)+8*(.6*U+.8*p);P("#a24d78, #6653ab, #277f86, #927123, #a24d78",b)}}}
