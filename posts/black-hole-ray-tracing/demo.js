const canvas = document.getElementById('viewport');
const status = document.getElementById('status');
const view = new URLSearchParams(location.search).get('view');
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });

function makeProgram(vertex, fragment) {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

function onDemand(draw, pixelBudget) {
  let frame = 0;
  const invalidate = () => {
    if (frame) return;
    frame = requestAnimationFrame((time) => {
      frame = 0;
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || !height) return;
      const scale = Math.min(
        devicePixelRatio,
        pixelBudget / Math.max(width, height)
      );
      const pixelWidth = Math.max(1, Math.round(width * scale));
      const pixelHeight = Math.max(1, Math.round(height * scale));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      draw(time);
      canvas.dataset.rendered = 'true';
    });
  };
  new ResizeObserver(invalidate).observe(canvas);
  invalidate();
  return invalidate;
}

function traceOrbit(impact, mass) {
  // The null energy equation fixes the initial slope for a given L/E.
  const startRadius = 19;
  const step = 0.012;
  let u = 1 / startRadius;
  let slope = Math.sqrt(1 / impact ** 2 - u ** 2 + 2 * mass * u ** 3);
  const acceleration = (inverseRadius) =>
    3 * mass * inverseRadius ** 2 - inverseRadius;
  const points = [];
  for (let i = 0; i <= 840; i += 1) {
    const angle = i * step;
    const radius = 1 / u;
    points.push(radius * Math.cos(angle), radius * Math.sin(angle));
    if (mass && radius <= 2) return { points, outcome: 'crosses the horizon' };
    if (radius >= 21 && slope < 0) return { points, outcome: 'escapes' };
    if (u <= 0) return { points, outcome: 'escapes' };

    const a = acceleration(u);
    const b = acceleration(u + (step * slope) / 2);
    const c = acceleration(u + (step * (slope + (step * a) / 2)) / 2);
    const d = acceleration(u + step * (slope + (step * b) / 2));
    u += step * (slope + (step * (a + b + c)) / 6);
    slope += (step * (a + 2 * b + 2 * c + d)) / 6;
  }
  return { points, outcome: 'remains near the critical orbit' };
}

function drawOrbitLab() {
  canvas.setAttribute('aria-label', 'Ray paths in flat and curved spacetime');
  document.getElementById('orbit-controls').hidden = false;
  const program = makeProgram(
    `#version 300 es
    layout(location = 0) in vec2 point;
    uniform vec2 extent;
    void main() { gl_Position = vec4(point / extent, 0, 1); }`,
    `#version 300 es
    precision mediump float;
    uniform vec3 ink;
    out vec4 pixel;
    void main() { pixel = vec4(ink, 1); }`
  );
  const extent = gl.getUniformLocation(program, 'extent');
  const ink = gl.getUniformLocation(program, 'ink');
  const buffer = gl.createBuffer();
  const impact = document.getElementById('impact');
  const impactValue = document.getElementById('impact-value');
  const orbitOutcome = document.getElementById('orbit-outcome');
  function line(points, color, mode = gl.LINE_STRIP) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    gl.uniform3fv(ink, color);
    gl.drawArrays(mode, 0, points.length / 2);
  }
  function circle(radius, intervals, fraction) {
    return Array.from({ length: intervals }, (_, index) => {
      const a = (index * 2 * Math.PI) / intervals;
      const b = ((index + fraction) * 2 * Math.PI) / intervals;
      return [
        radius * Math.cos(a),
        radius * Math.sin(a),
        radius * Math.cos(b),
        radius * Math.sin(b),
      ];
    }).flat();
  }
  const horizon = circle(2, 72, 1);
  const photonSphere = circle(3, 30, 0.55);
  const grid = [];
  for (let x = -35; x <= 35; x += 5) grid.push(x, -35, x, 35, -35, x, 35, x);
  const invalidate = onDemand(() => {
    const aspect = canvas.width / canvas.height;
    const horizontal = Math.max(22, 13 * aspect);
    const b = Number(impact.value);
    const curved = traceOrbit(b, 1);
    gl.clearColor(0.035, 0.05, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(extent, horizontal, horizontal / aspect);
    line(grid, [0.13, 0.17, 0.23], gl.LINES);
    line(horizon, [0.75, 0.46, 0.29], gl.LINES);
    line(photonSphere, [0.55, 0.64, 0.77], gl.LINES);
    line(traceOrbit(b, 0).points, [0.68, 0.74, 1]);
    line(curved.points, [1, 0.71, 0.43]);
    impactValue.value = b.toFixed(2);
    orbitOutcome.value = `Ray ${curved.outcome}`;
  }, 1300);
  impact.addEventListener('input', invalidate);
  document.getElementById('critical').addEventListener('click', () => {
    impact.value = '5.21';
    invalidate();
  });
}

async function drawImageLab() {
  const shadow = view === 'shadow';
  const response = await fetch('ray.frag');
  if (!response.ok) throw new Error('Could not load the ray shader.');
  const program = makeProgram(
    `#version 300 es
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`,
    await response.text()
  );
  const inputs = Object.fromEntries(
    ['elevation', 'zoom', 'gravity', 'disk', 'motion'].map((id) => [
      id,
      document.getElementById(id),
    ])
  );
  const uniforms = Object.fromEntries(
    [
      'resolution',
      'elevation',
      'azimuth',
      'zoom',
      'mass',
      'showDisk',
      'diskTime',
    ].map((name) => [name, gl.getUniformLocation(program, name)])
  );
  let azimuth = 0.65;
  let drag;
  let visible = false;
  let diskTime = 0;
  let lastFrame;
  let animationTimer;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  inputs.disk.checked = !shadow;
  inputs.motion.checked = !shadow && !reducedMotion.matches;
  document.getElementById('motion-control').hidden = shadow;
  canvas.setAttribute(
    'aria-label',
    shadow ? 'Black hole shadow' : 'Schwarzschild black hole and accretion disk'
  );
  document.getElementById('camera-controls').hidden = false;
  const elevationValue = document.getElementById('elevation-value');
  canvas.dataset.orbitCamera = '';
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-description',
    'Drag horizontally or use the left and right arrow keys to orbit.'
  );
  const invalidate = onDemand((time) => {
    const moving =
      visible &&
      !document.hidden &&
      inputs.disk.checked &&
      inputs.motion.checked;
    if (moving && lastFrame !== undefined) {
      diskTime += Math.min((time - lastFrame) / 1000, 0.1);
    }
    lastFrame = moving ? time : undefined;
    const degrees = Number(inputs.elevation.value);
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.elevation, (degrees * Math.PI) / 180);
    gl.uniform1f(uniforms.azimuth, azimuth);
    gl.uniform1f(uniforms.zoom, Number(inputs.zoom.value) / 100);
    gl.uniform1f(uniforms.mass, Number(inputs.gravity.checked));
    gl.uniform1i(uniforms.showDisk, Number(inputs.disk.checked));
    gl.uniform1f(uniforms.diskTime, diskTime);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    elevationValue.value = `${degrees}°`;
    clearTimeout(animationTimer);
    if (moving) animationTimer = setTimeout(invalidate, 50);
  }, 900);
  if (!shadow) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      lastFrame = undefined;
      invalidate();
    }).observe(canvas);
    document.addEventListener('visibilitychange', () => {
      lastFrame = undefined;
      invalidate();
    });
  }
  for (const input of Object.values(inputs))
    input.addEventListener('input', invalidate);
  document.getElementById('reset').addEventListener('click', () => {
    inputs.elevation.value = 17;
    inputs.zoom.value = 100;
    inputs.gravity.checked = true;
    inputs.disk.checked = !shadow;
    inputs.motion.checked = !shadow && !reducedMotion.matches;
    diskTime = 0;
    lastFrame = undefined;
    azimuth = 0.65;
    invalidate();
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!event.isPrimary || drag === undefined) return;
    azimuth -= (event.clientX - drag) * 0.008;
    drag = event.clientX;
    invalidate();
  });
  canvas.addEventListener('lostpointercapture', () => {
    drag = undefined;
  });
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') azimuth += 0.12;
    else if (event.key === 'ArrowRight') azimuth -= 0.12;
    else return;
    event.preventDefault();
    invalidate();
  });
}

async function start() {
  const frame = window.frameElement;
  if (frame) {
    new ResizeObserver(([entry]) => {
      frame.style.height = `${Math.ceil(entry.contentRect.height)}px`;
    }).observe(document.body);
  }
  if (!gl) {
    status.textContent =
      'WebGL 2 is unavailable in this browser. The article and shader source are still available.';
    return;
  }
  canvas.addEventListener('webglcontextlost', () => {
    status.hidden = false;
    status.textContent =
      'WebGL lost its context. Reload the experiment to continue.';
  });
  try {
    if (view === 'orbit') drawOrbitLab();
    else await drawImageLab();
    status.hidden = true;
  } catch (error) {
    status.textContent =
      'The experiment could not start. Try reloading or check the browser console.';
    console.error(error);
  }
}

start();
