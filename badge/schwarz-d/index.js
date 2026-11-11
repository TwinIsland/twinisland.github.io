import { mountShader } from '../webgl.js';

const fragmentSource = `
    precision highp float;

    uniform vec2 resolution;
    uniform float time;
    uniform vec3 press;
    const float animationSpeed = 0.6;
    vec3 pressCenter;
    vec3 viewRay;

    mat2 rotation(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat2(c, s, -s, c);
    }

    float diamond(vec3 p) {
        vec3 s = sin(p);
        vec3 c = cos(p);
        return s.x * s.y * s.z + dot(s, c.yzx * c.zxy);
    }

    float signedDiamond(vec3 p) {
        vec3 phase = vec3(0.0, 2.1, 4.2);
        vec3 warp = 0.94 * sin(2.2 * p.yzx + phase + time * animationSpeed * 1.6);
        vec3 samplePoint = p;
        if (abs(press.z) > 0.001) {
            vec3 delta = p - pressCenter;
            delta -= viewRay * dot(delta, viewRay);
            float falloff = exp(-5.5 * dot(delta, delta));
            samplePoint -= press.z * falloff * (delta + 0.55 * cross(viewRay, delta));
        }
        return diamond(samplePoint * 4.65 + warp);
    }

    float crystal(vec3 p) {
        // Intersect the Diamond TPMS sheet with a truncated octahedral envelope.
        float thickness = 0.26 + 0.10 * sin(2.8 * (p.x - p.z) - time * animationSpeed * 1.9);
        float gradientBound = 24.0 + 18.5 * abs(press.z);
        float sheet = (abs(signedDiamond(p)) - thickness) / gradientBound;
        vec3 q = abs(p);
        float envelope = max((q.x + q.y + q.z - 1.40) / 1.73205,
            max(q.x, max(q.y, q.z)) - 0.83);
        return max(sheet, envelope);
    }

    vec3 normalAt(vec3 p) {
        vec2 e = vec2(0.002, 0.0);
        return normalize(vec3(
            crystal(p + e.xyy) - crystal(p - e.xyy),
            crystal(p + e.yxy) - crystal(p - e.yxy),
            crystal(p + e.yyx) - crystal(p - e.yyx)
        ));
    }

    vec3 objectSpace(vec3 p) {
        float t = time * animationSpeed;
        p.xy = rotation(0.11 * sin(t * 0.83)) * p.xy;
        p.yz = rotation(0.48 + 0.19 * sin(t * 0.69)) * p.yz;
        p.xz = rotation(0.60 + t * 0.24) * p.xz;
        return p;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
        // Match --cp-accent and --cp-ink in style.css.
        vec3 teal = vec3(136.0, 212.0, 204.0) / 255.0;
        vec3 burgundy = vec3(113.0, 47.0, 62.0) / 255.0;
        vec3 origin = objectSpace(vec3(uv * 2.02, -1.35));
        vec3 ray = objectSpace(vec3(0.0, 0.0, 1.0));
        pressCenter = objectSpace(vec3(press.xy * 2.02, 0.0));
        viewRay = ray;
        float depth = 0.0;
        const float hitTolerance = 0.0012;
        for (int step = 0; step < 224; ++step) {
            vec3 p = origin + ray * depth;
            float distanceToCrystal = crystal(p);
            if (distanceToCrystal < hitTolerance) {
                vec3 n = normalAt(p);
                vec3 key = objectSpace(normalize(vec3(-0.55, 0.65, -0.75)));
                vec3 fill = objectSpace(normalize(vec3(0.8, -0.18, -0.36)));
                float diffuse = max(dot(n, key), 0.0);
                float warm = max(dot(n, fill), 0.0);
                float fresnel = pow(1.0 - max(dot(n, -ray), 0.0), 3.0);
                float shine = pow(max(dot(n, normalize(key - ray)), 0.0), 40.0);
                float recess = clamp(crystal(p + n * 0.14) * 16.0, 0.0, 1.0);
                // The clipped rim blends across the midsurface between both faces.
                float face = smoothstep(-0.10, 0.10, signedDiamond(p));
                vec3 material = mix(teal, burgundy, face);
                vec3 color = material * (0.31 + 0.58 * diffuse + 0.19 * warm);
                color *= mix(0.67, 1.0, recess);
                vec3 highlight = mix(material, vec3(1.0, 0.92, 0.80), 0.22);
                color = mix(color, highlight, 0.17 * fresnel + 0.40 * shine);
                gl_FragColor = vec4(color, 1.0);
                return;
            }
            // Keep grazing rays moving through thin gaps without skipping a hit.
            depth += max(distanceToCrystal, 2.0 * hitTolerance);
            if (depth > 2.7) {
                break;
            }
        }

        gl_FragColor = vec4(0.0);
    }
`;

export function mount(canvas) {
    mountShader(canvas, fragmentSource, {
        alpha: true,
        pressLabel: 'Deform the Diamond TPMS sculpture'
    });
}
