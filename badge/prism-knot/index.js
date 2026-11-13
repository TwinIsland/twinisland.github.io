import { mountShader } from '../webgl.js';

const fragmentSource = `
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
`;

export function mount(canvas, { onHighlight } = {}) {
    canvas.style.aspectRatio = '1';
    return mountShader(canvas, fragmentSource, {
        alpha: true, pixelScale: 1.15,
        setupInteraction: (context) => setupDrag(canvas, context, onHighlight)
    });
}

function setupDrag(canvas, { gl, program, signal, refresh, reducedMotion }, onHighlight) {
    const rotation = gl.getUniformLocation(program, 'dragRotation');
    const light = gl.getUniformLocation(program, 'dragLight');
    const spin = gl.getUniformLocation(program, 'spinTime');
    const { cursor, touchAction } = canvas.style;
    const ariaHidden = canvas.getAttribute('aria-hidden');
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'pan-y pinch-zoom';
    canvas.removeAttribute('aria-hidden');
    canvas.setAttribute('aria-label', 'Prism knot. Drag or use the arrow keys to rotate.');
    canvas.tabIndex = 0;

    let pointer = null;
    let previousX = 0;
    let previousY = 0;
    let yaw = 0;
    let pitch = 0;
    let lightX = 0;
    let lightY = 0;
    let lightStrength = 0;
    let lastFrame = null;
    let spinTime = 0;
    let lastMove = -Infinity;
    let velocityX = 0;
    let velocityY = 0;

    canvas.addEventListener('pointerdown', (event) => {
        if (pointer !== null || !event.isPrimary || event.button !== 0) return;
        pointer = event.pointerId;
        previousX = event.clientX;
        previousY = event.clientY;
        velocityX = velocityY = 0;
        lastMove = -Infinity;
        canvas.setPointerCapture(pointer);
        canvas.style.cursor = 'grabbing';
    }, { signal });

    canvas.addEventListener('pointermove', (event) => {
        if (event.pointerId !== pointer) return;
        const box = canvas.getBoundingClientRect();
        const scale = 5 / Math.max(box.width, 1);
        const dx = (event.clientX - previousX) * scale;
        const dy = (event.clientY - previousY) * scale;
        const now = performance.now();
        const interval = Math.max(8, now - lastMove);
        yaw += dx;
        pitch += dy;
        velocityX = Math.max(-0.008, Math.min(0.008, dx / interval));
        velocityY = Math.max(-0.008, Math.min(0.008, dy / interval));
        lastMove = now;
        previousX = event.clientX;
        previousY = event.clientY;
        lightX = Math.max(-1, Math.min(1, 2 * (event.clientX - box.left) / Math.max(box.width, 1) - 1));
        lightY = Math.max(-1, Math.min(1, 1 - 2 * (event.clientY - box.top) / Math.max(box.height, 1)));
        lightStrength = 1;
        if (reducedMotion.matches) refresh();
    }, { signal });

    function endDrag(event) {
        if (event.pointerId !== pointer) return;
        pointer = null;
        canvas.style.cursor = 'grab';
        if (event.type !== 'pointerup' || performance.now() - lastMove > 80 || reducedMotion.matches) {
            velocityX = velocityY = 0;
        }
        if (reducedMotion.matches) {
            lightStrength = 0;
            refresh();
        }
    }

    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        canvas.addEventListener(type, endDrag, { signal });
    }
    canvas.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'ArrowLeft': yaw -= 0.2; break;
            case 'ArrowRight': yaw += 0.2; break;
            case 'ArrowUp': pitch -= 0.2; break;
            case 'ArrowDown': pitch += 0.2; break;
            default: return;
        }
        event.preventDefault();
        if (reducedMotion.matches) refresh();
    }, { signal });

    signal.addEventListener('abort', () => {
        if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
        canvas.style.cursor = cursor;
        canvas.style.touchAction = touchAction;
        if (ariaHidden !== null) canvas.setAttribute('aria-hidden', ariaHidden);
        canvas.removeAttribute('aria-label');
        canvas.removeAttribute('tabindex');
    }, { once: true });

    return (now, elapsed) => {
        const dt = lastFrame === null ? 0 : Math.min(now - lastFrame, 32);
        lastFrame = now;
        if (pointer === null) {
            if (reducedMotion.matches) {
                velocityX = velocityY = lightStrength = 0;
            } else {
                spinTime += dt / 1000;
                yaw += velocityX * dt;
                pitch += velocityY * dt;
                const decay = Math.exp(-dt / 95);
                velocityX *= decay;
                velocityY *= decay;
                lightStrength *= Math.exp(-dt / 160);
            }
        }
        gl.uniform2f(rotation, yaw, pitch);
        gl.uniform3f(light, lightX, lightY, lightStrength);
        gl.uniform1f(spin, spinTime);
        onHighlight?.('#58449d, #257b86, #a24d68, #89601b, #58449d', elapsed * 1.35 + yaw + 0.5 * pitch);
    };
}
