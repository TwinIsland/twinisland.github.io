import { mountShader } from '../webgl.js';

const fragmentSource = `
    precision highp float;

    uniform vec2 resolution;
    uniform float time;
    uniform vec3 press;
    const float animationSpeed = 0.48;
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

    vec3 objectSpace(vec3 p) {
        float t = time * animationSpeed;
        p.xy = rotation(0.11 * sin(t * 0.83)) * p.xy;
        p.yz = rotation(0.48 + 0.19 * sin(t * 0.69)) * p.yz;
        p.xz = rotation(0.60 + t * 0.24) * p.xz;
        return p;
    }

    float projectedExtent(vec3 axis) {
        // The envelope's outermost vertex along an axis puts 0.83 on its
        // largest component and the remaining 0.57 on its second largest.
        vec3 a = abs(axis);
        float largest = max(a.x, max(a.y, a.z));
        float smallest = min(a.x, min(a.y, a.z));
        float middle = a.x + a.y + a.z - largest - smallest;
        return 0.83 * largest + 0.57 * middle;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
        vec3 seaGlass = vec3(173.0, 219.0, 211.0) / 255.0;
        vec3 dustyRose = vec3(219.0, 167.0, 176.0) / 255.0;
        float frameWidth = 1.88 * max(
            projectedExtent(objectSpace(vec3(1.0, 0.0, 0.0))),
            projectedExtent(objectSpace(vec3(0.0, 1.0, 0.0)))
        );
        vec3 origin = objectSpace(vec3(uv * frameWidth, -1.35));
        vec3 ray = objectSpace(vec3(0.0, 0.0, 1.0));
        pressCenter = objectSpace(vec3(press.xy * frameWidth, 0.0));
        viewRay = ray;
        float depth = 0.0;
        const float hitTolerance = 0.0012;
        for (int step = 0; step < 224; ++step) {
            vec3 p = origin + ray * depth;
            float distanceToCrystal = crystal(p);
            if (distanceToCrystal < hitTolerance) {
                vec3 color = signedDiamond(p) < 0.0 ? seaGlass : dustyRose;
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

export function mount(canvas, { onHighlight } = {}) {
    canvas.style.aspectRatio = '1';
    return mountShader(canvas, fragmentSource, {
        alpha: true,
        onFrame: onHighlight && ((time) => onHighlight('#854658, #407f76, #966074, #854658', time * 0.77)),
        pixelScale: 1.15,
        pressLabel: 'Deform the Diamond TPMS sculpture'
    });
}
