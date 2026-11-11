export function mountShader(canvas, fragmentSource, { alpha = false, pressLabel, pixelScale = 1 } = {}) {
    if (alpha) {
        canvas.style.background = 'none';
    }
    const gl = canvas.getContext('webgl', { alpha, antialias: false });
    if (!gl) {
        return;
    }

    const vertexSource = `
        attribute vec2 position;

        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(error);
        }
        return shader;
    }

    const program = gl.createProgram();
    try {
        const vertex = compileShader(gl.VERTEX_SHADER, vertexSource);
        gl.attachShader(program, vertex);
        gl.deleteShader(vertex);
        const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        gl.attachShader(program, fragment);
        gl.deleteShader(fragment);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program));
        }
    } catch (error) {
        gl.deleteProgram(program);
        console.warn('Badge shader unavailable:', error);
        return;
    }

    gl.useProgram(program);
    const sceneSeed = gl.getUniformLocation(program, 'sceneSeed');
    if (sceneSeed) {
        gl.uniform1f(sceneSeed, Math.random() * 1024);
    }
    const triangle = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'resolution');
    const time = gl.getUniformLocation(program, 'time');
    const press = gl.getUniformLocation(program, 'press');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    let frame = 0;
    let lastFrame = null;
    let elapsed = 0;
    let pressedAt = -Infinity;
    let pressX = 0;
    let pressY = 0;
    let resetTimer;

    function draw(now) {
        if (lastFrame !== null) {
            elapsed += (now - lastFrame) / 1000;
        }
        lastFrame = now;

        const ratio = Math.min(window.devicePixelRatio || 1, 2) * pixelScale;
        const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
        const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.uniform2f(resolution, width, height);
        gl.uniform1f(time, elapsed);
        if (press) {
            const age = Math.max(0, (now - pressedAt) / 1000);
            const motionReduced = reducedMotion.matches;
            const strength = motionReduced
                ? (age < 0.25 ? 0.46 : 0)
                : 1.22 * (1 - Math.exp(-22 * age)) * Math.exp(-2.4 * age);
            const travel = motionReduced ? 0 : 0.85 * Math.min(age, 1.5);
            gl.uniform3f(press, pressX, pressY - travel, strength);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        frame = reducedMotion.matches ? 0 : requestAnimationFrame(draw);
    }

    function refresh() {
        cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = null;
        if (!document.hidden) {
            frame = requestAnimationFrame(draw);
        }
    }

    if (press && pressLabel) {
        canvas.removeAttribute('aria-hidden');
        canvas.setAttribute('role', 'button');
        canvas.setAttribute('aria-label', pressLabel);
        canvas.tabIndex = 0;
        canvas.addEventListener('click', (event) => {
            const box = canvas.getBoundingClientRect();
            pressX = event.detail ? (event.clientX - box.left) / box.width - 0.5 : 0;
            pressY = event.detail ? 0.5 - (event.clientY - box.top) / box.height : 0;
            pressedAt = performance.now();
            if (reducedMotion.matches) {
                refresh();
                clearTimeout(resetTimer);
                resetTimer = setTimeout(refresh, 260);
            }
        }, { signal: events.signal });
        canvas.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!event.repeat) canvas.click();
            }
        }, { signal: events.signal });
    }

    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(canvas);
    reducedMotion.addEventListener('change', refresh, { signal: events.signal });
    document.addEventListener('visibilitychange', refresh, { signal: events.signal });
    function dispose() {
        if (events.signal.aborted) {
            return;
        }
        cancelAnimationFrame(frame);
        clearTimeout(resetTimer);
        resizeObserver.disconnect();
        events.abort();
        if (press && pressLabel) {
            canvas.setAttribute('aria-hidden', 'true');
            canvas.removeAttribute('aria-label');
            canvas.removeAttribute('role');
            canvas.removeAttribute('tabindex');
        }
        if (!gl.isContextLost()) {
            gl.deleteBuffer(triangle);
            gl.deleteProgram(program);
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
    }
    canvas.addEventListener('webglcontextlost', dispose, { once: true, signal: events.signal });
    refresh();
    return dispose;
}
