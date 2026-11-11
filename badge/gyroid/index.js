import { mountShader } from '../webgl.js';

const fragmentSource = `
        precision highp float;

        uniform vec2 resolution;
        uniform float time;

        // The gyroid midsurface is the zero set of this periodic field.
        float gyroid(vec3 p) {
            return dot(sin(p), cos(p.yzx));
        }

        vec3 gyroidGradient(vec3 p) {
            vec3 s = sin(p);
            vec3 c = cos(p);
            return c * c.yzx - s * s.zxy;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            vec2 p = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
            float yaw = 0.46 * sin(time * 0.44);
            float pitch = 0.35 + 0.25 * cos(time * 0.37);
            vec3 direction = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
            vec3 right = vec3(cos(yaw), 0.0, -sin(yaw));
            vec3 up = cross(direction, right);
            vec3 origin = 8.0 * (p.x * right + p.y * up) - 2.1 * direction;

            // Trace both sides of a thin sheet around the midsurface.
            // The field's gradient length is bounded by sqrt(12).
            float depth = 0.0;
            float field = 0.0;
            vec3 samplePoint = origin;
            bool hit = false;
            for (int step = 0; step < 48; ++step) {
                samplePoint = origin + depth * direction;
                field = gyroid(samplePoint);
                float distanceToSheet = abs(field) - 0.24;
                if (distanceToSheet < 0.008) {
                    hit = true;
                    break;
                }
                depth += distanceToSheet / 3.47;
                if (depth > 4.2) {
                    break;
                }
            }

            vec3 cavity = vec3(0.29, 0.41, 0.38);
            vec3 jade = vec3(0.42, 0.65, 0.58);
            vec3 celadon = vec3(0.74, 0.87, 0.79);
            vec3 ivory = vec3(0.98, 0.96, 0.89);
            vec3 color = mix(cavity, jade, 0.16 + 0.23 * uv.y);
            if (hit) {
                vec3 normal = normalize(gyroidGradient(samplePoint)) * (field < 0.0 ? -1.0 : 1.0);
                normal = faceforward(normal, direction, normal);
                vec3 light = normalize(vec3(-0.48, 0.75, -0.58));
                vec3 halfVector = normalize(light - direction);
                float diffuse = max(dot(normal, light), 0.0);
                float specular = pow(max(dot(normal, halfVector), 0.0), 42.0);
                float rim = pow(1.0 - max(dot(normal, -direction), 0.0), 2.2);
                float sweep = pow(0.5 + 0.5 * cos(p.x * 4.6 + p.y * 2.0 - time * 1.16), 8.0);
                color = mix(jade, celadon, 0.78 * diffuse);
                color = mix(cavity, color, exp(-0.20 * depth));
                color = mix(color, celadon, rim * (0.06 + 0.15 * sweep));
                color = mix(color, ivory, specular * (0.22 + 0.23 * sweep));
            }

            float edge = smoothstep(0.0, 0.28, min(uv.y, 1.0 - uv.y));
            color = mix(color, cavity, 0.07 * (1.0 - edge));
            gl_FragColor = vec4(color, 1.0);
        }
    `;

export function mount(canvas) {
    mountShader(canvas, fragmentSource);
}
