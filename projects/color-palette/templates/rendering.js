import { mountShader } from '../../../badge/webgl.js';

const fragmentSource = `
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
`;

const colorSlots = [
    ['Front', 'frontColor', '#AADAFF'],
    ['Back', 'backColor', '#FF7C7C'],
    ['Background', 'backgroundColor', '#404040'],
    ['Wireframe', 'wireframeColor', '#000000', 'showWireframe'],
    ['Cut Edge', 'cutEdgeColor', '#000000', 'showCutEdge'],
    ['Highlight', 'highlightColor', '#FFFFFF']
];

export function rendering(colors, { signal } = {}) {
    const preview = document.createElement('div');
    preview.className = 'sample-rendering';
    const slots = colorSlots.map(([label, uniform, fallback, visibility]) => {
        const property = `--sample-${label.toLowerCase().replaceAll(' ', '-')}`;
        if (colors[label]) preview.style.setProperty(property, colors[label]);
        return { property, uniform, fallback, visibility };
    });
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Diamond TPMS with different colors on either side of the surface');
    canvas.setAttribute('aria-description', 'Drag horizontally or use the left and right arrow keys to rotate.');
    canvas.tabIndex = 0;
    preview.append(canvas);

    const controls = document.createElement('fieldset');
    controls.className = 'rendering-controls';
    controls.innerHTML = `
        <legend>Render settings</legend>
        ${colors.Wireframe ? '<label class="rendering-wireframe"><input type="checkbox" name="wireframe" checked> Wireframe</label>' : ''}
        <label>Lighting strength <input type="range" name="strength" min="0" max="100" value="100"></label>
        <label>Light direction <input type="range" name="angle" min="0" max="360" value="126"></label>
    `;

    const dispose = mountShader(canvas, fragmentSource, {
        pixelScale: 0.65,
        setupInteraction({ gl, program, signal, refresh, reducedMotion }) {
            const uniforms = slots.map((slot) => ({
                ...slot,
                location: gl.getUniformLocation(program, slot.uniform),
                enabled: slot.visibility ? gl.getUniformLocation(program, slot.visibility) : null
            }));
            const strength = controls.querySelector('[name="strength"]');
            const angle = controls.querySelector('[name="angle"]');
            const wireframe = controls.querySelector('[name="wireframe"]');
            const strengthUniform = gl.getUniformLocation(program, 'lightStrength');
            const angleUniform = gl.getUniformLocation(program, 'lightAngle');

            function updateColors() {
                for (const { property, location, fallback, enabled, visibility } of uniforms) {
                    const value = preview.style.getPropertyValue(property).trim();
                    const hex = value || fallback;
                    const rgb = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
                    gl.uniform3fv(location, rgb);
                    if (enabled) {
                        const visible = Boolean(value) && (visibility !== 'showWireframe' || wireframe?.checked);
                        gl.uniform1f(enabled, Number(Boolean(visible)));
                    }
                }
                gl.uniform1f(strengthUniform, strength.valueAsNumber / 100);
                gl.uniform1f(angleUniform, angle.valueAsNumber * Math.PI / 180);
            }
            function update() {
                updateColors();
                refresh();
            }
            const observer = new MutationObserver(update);
            observer.observe(preview, { attributes: true, attributeFilter: ['style'] });
            signal.addEventListener('abort', () => observer.disconnect(), { once: true });
            controls.addEventListener('input', update, { signal });
            updateColors();

            const viewUniform = gl.getUniformLocation(program, 'viewAngle');
            let yaw = 0.58;
            let lastElapsed = 0;
            let pointer = null;
            let lastX = 0;
            canvas.addEventListener('pointerdown', (event) => {
                if (!event.isPrimary || event.button !== 0 || pointer !== null) return;
                pointer = event.pointerId;
                lastX = event.clientX;
                canvas.setPointerCapture(pointer);
            }, { signal });
            canvas.addEventListener('pointermove', (event) => {
                if (event.pointerId !== pointer || event.clientX === lastX) return;
                yaw -= (event.clientX - lastX) * 5 / canvas.clientWidth;
                lastX = event.clientX;
                if (reducedMotion.matches) refresh();
            }, { signal });
            canvas.addEventListener('lostpointercapture', (event) => {
                if (event.pointerId === pointer) pointer = null;
            }, { signal });
            canvas.addEventListener('keydown', (event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                yaw += event.key === 'ArrowLeft' ? 0.15 : -0.15;
                if (reducedMotion.matches) refresh();
            }, { signal });
            return (_now, elapsed) => {
                if (pointer === null && !reducedMotion.matches) {
                    yaw += (elapsed - lastElapsed) * 0.32;
                }
                lastElapsed = elapsed;
                gl.uniform1f(viewUniform, yaw);
            };
        }
    });

    if (dispose) {
        preview.append(controls);
        signal?.addEventListener('abort', dispose, { once: true });
    } else {
        const message = document.createElement('p');
        message.textContent = 'WebGL preview is unavailable.';
        preview.replaceChildren(message);
    }
    return preview;
}
