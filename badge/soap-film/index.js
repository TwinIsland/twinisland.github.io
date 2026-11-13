import { mountShader } from '../webgl.js';

const fragmentSource = `
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
`;

const size = 64;
const stepSeconds = 1 / 120;

export function mount(canvas, { onHighlight } = {}) {
    canvas.style.aspectRatio = '1';
    return mountShader(canvas, fragmentSource, {
        alpha: true,
        setupInteraction: (context) => mountMembrane(canvas, context, onHighlight)
    });
}

function mountMembrane(canvas, { gl, program, signal, refresh, reducedMotion }, onHighlight) {
    const texture = gl.createTexture();
    let height = new Float32Array(size * size);
    let previous = new Float32Array(height.length);
    const pixels = new Uint8Array(height.length).fill(128);
    const cells = [];
    const phase = Array.from({ length: 3 }, () => Math.random() * 2 * Math.PI);
    const initialPhase = [...phase];
    const outline = gl.getUniformLocation(program, 'outlinePhase');

    // Match the shader silhouette so waves reflect at the visible edge.
    function edgeRadius(angle) {
        return 0.365 + 0.047 * Math.cos(2 * angle + phase[0])
            + 0.029 * Math.cos(3 * angle + phase[1])
            + 0.017 * Math.cos(5 * angle + phase[2]);
    }

    const grid = [];
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            const px = (x + 0.5) / size - 0.5;
            const py = (y + 0.5) / size - 0.5;
            grid.push({ index: y * size + x, distance: Math.hypot(px, py), angle: Math.atan2(py, px) });
        }
    }

    function updateBoundary(time) {
        phase[0] = initialPhase[0] + time * 0.40;
        phase[1] = initialPhase[1] - time * 0.53;
        phase[2] = initialPhase[2] + time * 0.67;
        gl.uniform3fv(outline, phase);
        cells.length = 0;
        for (const { index, distance, angle } of grid) {
            if (distance < edgeRadius(angle)) {
                cells.push(index);
            } else {
                height[index] = 0;
                previous[index] = 0;
                pixels[index] = 128;
            }
        }
    }
    updateBoundary(0);

    // The membrane sampler uses texture unit zero, the default sampler unit.
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, size, size, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, pixels);

    let highlightX = 0;
    let highlightY = 0;

    function disturb(x, y) {
        const distance = Math.hypot(x, y);
        const boundary = edgeRadius(Math.atan2(y, x));
        if (distance > boundary) return;
        const scale = distance > boundary - 0.05 ? (boundary - 0.05) / distance : 1;
        highlightX = x * scale;
        highlightY = y * scale;
        const cx = (highlightX + 0.5) * size;
        const cy = (highlightY + 0.5) * size;
        for (const i of cells) {
            const dx = i % size + 0.5 - cx;
            const dy = Math.floor(i / size) + 0.5 - cy;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared > 36) continue;
            const dent = 0.37 * Math.exp(-distanceSquared / 9);
            height[i] = Math.min(height[i], -dent);
            previous[i] = Math.min(previous[i], -dent);
        }
        if (reducedMotion.matches) refresh();
    }

    let pointer = null;
    let lastPoint;
    function disturbAtPointer(event) {
        const box = canvas.getBoundingClientRect();
        const width = Math.min(box.width, box.height);
        if (!width) return;
        const x = (event.clientX - box.left - box.width / 2) / width;
        const y = (box.top + box.height / 2 - event.clientY) / width;
        if (!lastPoint || Math.hypot(x - lastPoint.x, y - lastPoint.y) >= 0.035) {
            disturb(x, y);
            lastPoint = { x, y };
        }
    }

    const oldStyle = { cursor: canvas.style.cursor, touchAction: canvas.style.touchAction };
    const oldAttributes = new Map(['aria-label', 'aria-hidden', 'tabindex'].map((name) => [name, canvas.getAttribute(name)]));
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'pan-y pinch-zoom';
    canvas.removeAttribute('aria-hidden');
    canvas.setAttribute('aria-label', 'Soap film. Drag or press Enter to make ripples.');
    canvas.tabIndex = 0;
    canvas.addEventListener('pointerdown', (event) => {
        if (pointer !== null || !event.isPrimary || event.button !== 0) return;
        pointer = event.pointerId;
        canvas.setPointerCapture(pointer);
        lastPoint = null;
        disturbAtPointer(event);
    }, { signal });
    canvas.addEventListener('pointermove', (event) => {
        if (event.pointerId === pointer) disturbAtPointer(event);
    }, { signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        canvas.addEventListener(type, (event) => {
            if (event.pointerId === pointer) pointer = null;
        }, { signal });
    }
    canvas.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) disturb(-0.12, 0.05);
    }, { signal });
    signal.addEventListener('abort', () => {
        if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
        Object.assign(canvas.style, oldStyle);
        for (const [name, value] of oldAttributes) {
            if (value === null) canvas.removeAttribute(name);
            else canvas.setAttribute(name, value);
        }
        gl.deleteTexture(texture);
    }, { once: true });

    let lastElapsed = 0;
    let accumulator = 0;
    return (now, elapsed) => {
        if (!reducedMotion.matches) {
            updateBoundary(elapsed);
            accumulator += Math.min(elapsed - lastElapsed, 0.04);
            while (accumulator >= stepSeconds) {
                // The cells outside the membrane stay at zero, pinning its edge.
                for (const i of cells) {
                    const laplacian = height[i - 1] + height[i + 1] + height[i - size] + height[i + size] - 4 * height[i];
                    previous[i] = height[i] + 0.989 * (height[i] - previous[i]) + 0.24 * laplacian;
                }
                [height, previous] = [previous, height];
                accumulator -= stepSeconds;
            }
        }
        lastElapsed = elapsed;
        for (const i of cells) {
            pixels[i] = Math.max(0, Math.min(255, Math.round(128 + 230 * height[i])));
        }
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size, size, gl.LUMINANCE, gl.UNSIGNED_BYTE, pixels);
        if (onHighlight) {
            const x = Math.floor((highlightX + 0.5) * size);
            const y = Math.floor((highlightY + 0.5) * size);
            const i = y * size + x;
            const thickness = 1.35 + 2.7 * highlightY
                + 0.42 * Math.sin(9 * highlightX + 3 * highlightY - elapsed * 0.65);
            const slopeX = (pixels[i + 1] - pixels[i - 1]) / 255;
            const slopeY = (pixels[i + size] - pixels[i - size]) / 255;
            const colorPhase = 2 * Math.PI * thickness + 24 * (pixels[i] / 255 - 0.502)
                + 8 * (0.6 * slopeX + 0.8 * slopeY);
            onHighlight('#a24d78, #6653ab, #277f86, #927123, #a24d78', colorPhase);
        }
    };
}
