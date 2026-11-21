#version 300 es
precision highp float;

uniform vec2 resolution;
uniform float elevation;
uniform float azimuth;
uniform float zoom;
uniform float mass;
uniform bool showDisk;
uniform float diskTime;
out vec4 pixel;

const float PI = 3.14159265359;
const float CAMERA_RADIUS = 30.0;
const float STEP = 0.032;

// State (u, du/dφ), where u = 1/r and angles run along this ray's orbit plane.
vec2 derivative(vec2 state) {
    return vec2(state.y, 3.0 * mass * state.x * state.x - state.x);
}

vec2 rk4(vec2 state, float h) {
    vec2 a = derivative(state);
    vec2 b = derivative(state + 0.5 * h * a);
    vec2 c = derivative(state + 0.5 * h * b);
    vec2 d = derivative(state + h * c);
    return state + (h / 6.0) * (a + 2.0 * b + 2.0 * c + d);
}

float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

float noise(vec2 position) {
    vec2 cell = floor(position);
    vec2 f = fract(position);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1, 0)), f.x),
               mix(hash(cell + vec2(0, 1)), hash(cell + vec2(1, 1)), f.x), f.y);
}

vec3 sky(vec3 direction) {
    // Project onto a distant procedural sky, after the ray has escaped.
    vec2 uv = vec2(atan(direction.z, direction.x) / (2.0 * PI),
                   asin(clamp(direction.y, -1.0, 1.0)) / PI);
    vec2 cell = floor(uv * vec2(810, 420));
    vec2 f = fract(uv * vec2(810, 420));
    float seed = hash(cell + 40.0);
    vec2 center = vec2(hash(cell + 12.0), hash(cell + 29.0)) * 0.66 + 0.17;
    float star = step(0.987, seed) * exp(-dot(f - center, f - center) * 62.0);
    float galactic = dot(direction, normalize(vec3(0.32, 0.90, 0.30)));
    float band = exp(-pow(abs(galactic) * 7.5, 1.5));
    float dust = noise(uv * 23.0) * noise(uv * 79.0 + 8.0);
    return vec3(0.003, 0.005, 0.012) + band * dust * vec3(0.11, 0.18, 0.31)
        + star * mix(vec3(0.42, 0.62, 1.0), vec3(1.0, 0.76, 0.48), hash(cell)) * 1.5;
}

vec4 diskEmission(vec2 state, float phi, vec3 radial, vec3 azimuthal) {
    float r = 1.0 / state.x;
    float fade = smoothstep(6.0, 6.7, r) * (1.0 - smoothstep(14.0, 19.0, r));
    float angle = atan(radial.z, radial.x) + diskTime * 0.32 * pow(8.0 / r, 1.5);
    vec2 texturePoint = vec2(cos(angle), sin(angle)) * r;
    float turbulence = noise(texturePoint * 2.0) * 0.46 + 0.54;
    float bands = 0.74 + 0.26 * sin(31.0 * log(r) + sin(angle * 5.0 + phi));
    float emissivity = fade * turbulence * bands * pow(8.0 / r, 2.2);
    float shift = 1.0;
    if (mass > 0.0) {
        float f = 1.0 - 2.0 / r;
        vec3 towardCamera = normalize(state.y / (state.x * sqrt(f)) * radial - azimuthal);
        vec3 orbitalDirection = normalize(cross(vec3(0, 1, 0), radial));
        float speed = inversesqrt(r - 2.0);
        float doppler = sqrt(1.0 - speed * speed) /
                        (1.0 - speed * dot(towardCamera, orbitalDirection));
        shift = sqrt(f / (1.0 - 2.0 / CAMERA_RADIUS)) * doppler;
    }
    vec3 tint = mix(vec3(1.0, 0.17, 0.025), vec3(1.0, 0.89, 0.52),
                    clamp((15.0 - r) * 0.068 * shift, 0.0, 1.0));
    return vec4(tint * (3.4 * emissivity * pow(shift, 3.0)), 0.80 * fade);
}

void main() {
    vec3 radial0 = vec3(cos(elevation) * cos(azimuth), sin(elevation),
                        cos(elevation) * sin(azimuth));
    vec3 right = normalize(cross(vec3(0, 1, 0), radial0));
    vec3 up = cross(radial0, right);
    // Scale against the shorter dimension so narrow canvases keep the shadow in view.
    vec2 screen = (2.0 * gl_FragCoord.xy - resolution) / min(resolution.x, resolution.y);
    vec3 tangent = (screen.x * right + screen.y * up) * (0.38 / zoom);
    vec3 ray = normalize(-radial0 + tangent);
    float cosAlpha = -dot(ray, radial0);
    vec3 planeTangent = ray + cosAlpha * radial0;
    float sinAlpha = length(planeTangent);

    vec3 light = vec3(0);
    if (sinAlpha < 0.00001) {
        light = mass > 0.0 ? vec3(0) : sky(ray);
    } else {
        vec3 angular0 = planeTangent / sinAlpha;
        float u0 = 1.0 / CAMERA_RADIUS;
        float cameraF = 1.0 - 2.0 * mass * u0;
        vec2 state = vec2(u0, u0 * sqrt(cameraF) * cosAlpha / sinAlpha);
        float planeHit = mod(atan(-radial0.y, angular0.y), PI);
        float transmission = 1.0;
        for (int i = 0; i < 260; ++i) {
            float phi = float(i) * STEP;
            vec2 next = rk4(state, STEP);
            if (showDisk && planeHit <= phi + STEP) {
                vec2 hit = mix(state, next, clamp((planeHit - phi) / STEP, 0.0, 1.0));
                if (hit.x >= 1.0 / 19.0 && hit.x <= 1.0 / 6.0) {
                    vec3 radial = cos(planeHit) * radial0 + sin(planeHit) * angular0;
                    vec3 azimuthal = -sin(planeHit) * radial0 + cos(planeHit) * angular0;
                    vec4 emission = diskEmission(hit, planeHit, radial, azimuthal);
                    light += transmission * emission.rgb;
                    transmission *= 1.0 - emission.a;
                }
                planeHit += PI;
            }
            if (mass > 0.0 && next.x >= 0.5) break;
            if (next.x <= 0.0) {
                float escapePhi = phi + STEP * clamp(state.x / (state.x - next.x), 0.0, 1.0);
                light += transmission * sky(cos(escapePhi) * radial0 + sin(escapePhi) * angular0);
                break;
            }
            state = next;
        }
    }
    // Simple display transform for the illustrative emissivity values.
    pixel = vec4(pow(light / (1.0 + light), vec3(1.0 / 2.2)), 1.0);
}
