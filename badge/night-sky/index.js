import { mountShader } from '../webgl.js';

const fragmentSource = `
    precision highp float;

    uniform vec2 resolution;
    uniform float time;
    uniform float sceneSeed;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        vec3 color = mix(vec3(0.008, 0.011, 0.025), vec3(0.028, 0.037, 0.064), uv.y);
        float pixel = 1.0 / min(resolution.x, resolution.y);

        vec2 starGrid = uv * 7.0;
        vec2 cell = floor(starGrid);
        vec2 starCell = cell + vec2(sceneSeed, sceneSeed * 0.618);
        float seed = hash(starCell);
        vec2 starCenter = 0.18 + 0.64 * vec2(hash(starCell + 11.0), hash(starCell + 29.0));
        float starDistance = length(fract(starGrid) - starCenter) / 7.0;
        float radius = mix(0.009, 0.017, hash(starCell + 47.0));
        float star = (1.0 - smoothstep(radius * 0.55, radius + pixel, starDistance)) * step(0.68, seed);
        float speed = mix(1.9, 4.7, hash(starCell + 67.0));
        float pulse = 0.5 + 0.5 * sin(time * speed + seed * 31.0);
        float twinkle = 0.32 + 0.68 * pow(pulse, 2.5);
        color += vec3(0.65, 0.74, 0.91) * star * twinkle * 0.78;

        for (int i = 0; i < 5; ++i) {
            float lane = float(i);
            float period = 4.7 + lane * 0.73;
            float clock = time + lane * 1.63;
            float cycle = floor(clock / period);
            vec2 event = vec2(cycle + sceneSeed, lane);
            float delay = 0.22 + 2.1 * hash(event + vec2(4.0, 7.0));
            float duration = mix(0.62, 1.24, hash(event + vec2(3.0, 52.0)));
            float travel = (mod(clock, period) - delay) / duration;
            if (time <= 0.0 || travel <= 0.0 || travel >= 1.0) {
                continue;
            }
            float offset = (lane - 2.0) * 0.16
                + (hash(event + vec2(17.0, 0.0)) - 0.5) * 0.07;
            vec2 start = vec2(-0.10 + offset, 1.09 + offset);
            vec2 end = vec2(1.26 + offset, -0.27 + offset);
            vec2 direction = normalize(end - start);
            vec2 head = mix(start, end, travel);
            vec2 delta = head - uv;
            float along = dot(delta, direction);
            float across = length(delta - direction * along);
            float tail = 1.0 - smoothstep(0.0, 0.36, along);
            float width = mix(0.004, 0.012, tail);
            float streak = (1.0 - smoothstep(width, width + pixel, across))
                * smoothstep(-pixel, 0.006, along) * tail;
            float glow = exp(-across * 78.0) * tail * smoothstep(-0.018, 0.018, along);
            color += vec3(0.72, 0.86, 1.0) * streak + vec3(0.16, 0.28, 0.54) * glow * 0.35;
        }

        gl_FragColor = vec4(color, 1.0);
    }
`;

export function mount(canvas) {
    canvas.style.aspectRatio = '1';
    canvas.style.borderTopLeftRadius = '20%';
    return mountShader(canvas, fragmentSource, { pixelScale: 1.15 });
}
