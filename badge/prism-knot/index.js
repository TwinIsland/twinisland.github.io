import { mountShader } from '../webgl.js';

const fragmentSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;

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
        p.xz = rotate(0.34 + 0.24 * sin(time * 0.38)) * p.xz;
        p.yz = rotate(-0.33 + 0.12 * cos(time * 0.31)) * p.yz;
        p.xy = rotate(time * 0.36) * p.xy;
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
                vec3 key = objectSpace(normalize(vec3(-0.5, 0.8, -0.5)));
                vec3 reflection = reflect(ray, n);
                float facing = max(dot(n, -ray), 0.0);
                float band = 5.0 * (1.0 - facing) + 2.2 * reflection.x - 1.35 * time;
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

export function mount(canvas) {
    canvas.style.aspectRatio = '1';
    return mountShader(canvas, fragmentSource, { alpha: true, pixelScale: 1.15 });
}
