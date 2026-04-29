/**
 * EXTRA COLLECTIVE — Dither Background
 *
 * Vanilla WebGL2 port of the ReactBits Dither component.
 * Original shaders by DavidHDev (reactbits.dev), ported to plain JS.
 *
 * Requires WebGL2 (supported by all modern browsers).
 * Uses GLSL ES 3.0 — necessary for float[64](...) Bayer matrix syntax.
 *
 * Usage:
 *   DitherBG.init();        — create canvas and start animation loop
 *   DitherBG.setColor(hex)  — update wave color on tab change
 *   DitherBG.stop();        — pause animation
 */

const DitherBG = (() => {
  // ─── CONFIG ────────────────────────────────────────────────────
  const WAVE_SPEED      = 0.04;
  const WAVE_FREQUENCY  = 3.0;
  const WAVE_AMPLITUDE  = 0.3;
  const COLOR_NUM       = 6.0;   // dither palette steps (higher = more shades)
  const PIXEL_SIZE      = 4.0;   // dither pixel block size (larger = more pixelated)
  const MOUSE_RADIUS    = 0.4;

  // ─── VERTEX SHADER — GLSL ES 3.0 ──────────────────────────────
  // Both programs share this vertex shader.
  const VERT_SRC = `#version 300 es
    in vec2 a_position;
    out vec2 vUv;
    void main() {
      vUv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // ─── WAVE FRAGMENT SHADER — GLSL ES 3.0 ───────────────────────
  // FBM (fractal Brownian motion) noise → animated colour field.
  const WAVE_FRAG_SRC = `#version 300 es
    precision highp float;
    uniform vec2  u_resolution;
    uniform float u_time;
    uniform float u_waveSpeed;
    uniform float u_waveFrequency;
    uniform float u_waveAmplitude;
    uniform vec3  u_waveColor;
    uniform vec2  u_mousePos;
    uniform int   u_enableMouse;
    uniform float u_mouseRadius;
    out vec4 fragColor;

    vec4 mod289v4(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x)  { return mod289v4(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

    float cnoise(vec2 P) {
      vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
      Pi = mod289v4(Pi);
      vec4 ix = Pi.xzxz, iy = Pi.yyww;
      vec4 fx = Pf.xzxz, fy = Pf.yyww;
      vec4 i  = permute(permute(ix) + iy);
      vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
      vec4 gy = abs(gx) - 0.5;
      vec4 tx = floor(gx + 0.5);
      gx = gx - tx;
      vec2 g00 = vec2(gx.x,gy.x), g10 = vec2(gx.y,gy.y);
      vec2 g01 = vec2(gx.z,gy.z), g11 = vec2(gx.w,gy.w);
      vec4 norm = taylorInvSqrt(vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11)));
      g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
      float n00 = dot(g00, vec2(fx.x,fy.x));
      float n10 = dot(g10, vec2(fx.y,fy.y));
      float n01 = dot(g01, vec2(fx.z,fy.z));
      float n11 = dot(g11, vec2(fx.w,fy.w));
      vec2 fade_xy = fade(Pf.xy);
      vec2 n_x = mix(vec2(n00,n01), vec2(n10,n11), fade_xy.x);
      return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
    }

    float fbm(vec2 p) {
      float value = 0.0, amp = 1.0, freq = u_waveFrequency;
      for (int i = 0; i < 4; i++) {
        value += amp * abs(cnoise(p));
        p    *= freq;
        amp  *= u_waveAmplitude;
      }
      return value;
    }

    float pattern(vec2 p) {
      vec2 p2 = p - u_time * u_waveSpeed;
      return fbm(p + fbm(p2));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      uv -= 0.5;
      uv.x *= u_resolution.x / u_resolution.y;
      float f = pattern(uv);
      if (u_enableMouse == 1) {
        vec2 mNDC = (u_mousePos / u_resolution - 0.5) * vec2(1.0, -1.0);
        mNDC.x *= u_resolution.x / u_resolution.y;
        float dist = length(uv - mNDC);
        float effect = 1.0 - smoothstep(0.0, u_mouseRadius, dist);
        f -= 0.5 * effect;
      }
      vec3 col = mix(vec3(0.0), u_waveColor, f);
      fragColor = vec4(col, 1.0);
    }
  `;

  // ─── DITHER FRAGMENT SHADER — GLSL ES 3.0 ──────────────────────
  // Bayer 8×8 ordered dither post-process.
  // NOTE: float[64](...) array initializer requires GLSL ES 3.0 / WebGL2.
  //       This is why we cannot use WebGL1 here.
  const DITHER_FRAG_SRC = `#version 300 es
    precision highp float;
    uniform sampler2D u_texture;
    uniform vec2  u_resolution;
    uniform float u_colorNum;
    uniform float u_pixelSize;
    out vec4 fragColor;

    const float bayer[64] = float[64](
       0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
      32.0/64.0, 16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0, 19.0/64.0, 47.0/64.0, 31.0/64.0,
       8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0, 59.0/64.0,  7.0/64.0, 55.0/64.0,
      40.0/64.0, 24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0, 27.0/64.0, 39.0/64.0, 23.0/64.0,
       2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0, 49.0/64.0, 13.0/64.0, 61.0/64.0,
      34.0/64.0, 18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0, 17.0/64.0, 45.0/64.0, 29.0/64.0,
      10.0/64.0, 58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0, 57.0/64.0,  5.0/64.0, 53.0/64.0,
      42.0/64.0, 26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0, 25.0/64.0, 37.0/64.0, 21.0/64.0
    );

    vec3 dither(vec2 uv, vec3 color) {
      vec2 scaledCoord = floor(uv * u_resolution / u_pixelSize);
      int x = int(mod(scaledCoord.x, 8.0));
      int y = int(mod(scaledCoord.y, 8.0));
      float threshold = bayer[y * 8 + x] - 0.25;
      float step = 1.0 / (u_colorNum - 1.0);
      color += threshold * step;
      color = clamp(color - 0.2, 0.0, 1.0);
      return floor(color * (u_colorNum - 1.0) + 0.5) / (u_colorNum - 1.0);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      vec2 npx = u_pixelSize / u_resolution;
      vec2 uvPixel = npx * floor(uv / npx);
      vec3 color = texture(u_texture, uvPixel).rgb;
      color = dither(uv, color);
      fragColor = vec4(color, 1.0);
    }
  `;

  // ─── INTERNAL STATE ─────────────────────────────────────────────
  let canvas, gl, rafId;
  let waveProgram, ditherProgram;
  let waveUniforms = {};
  let ditherUniforms = {};
  let offscreenFBO, offscreenTex;
  let quadVAO_wave, quadVAO_dither;
  let startTime = 0;
  let mouseX = 0, mouseY = 0;

  // Current wave colour (mutable) — starts as EXTRA CONTRAST green
  let waveColor = hexToVec3('#27E700');

  // ─── TARGET colour for smooth interpolation ─────────────────────
  let targetColor = [...waveColor];
  let currentColor = [...waveColor];

  // ─── HELPERS ────────────────────────────────────────────────────
  function hexToVec3(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  }

  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
    }
    return s;
  }

  function createProgram(vertSrc, fragSrc) {
    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(vertSrc, gl.VERTEX_SHADER));
    gl.attachShader(prog, compileShader(fragSrc, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  function createQuadBuffer(prog) {
    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_position');
    return { buf, loc };
  }

  function createOffscreenBuffer(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex };
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);

    // Recreate FBO at new size
    if (offscreenFBO) gl.deleteFramebuffer(offscreenFBO);
    if (offscreenTex) gl.deleteTexture(offscreenTex);
    const { fbo, tex } = createOffscreenBuffer(w, h);
    offscreenFBO = fbo;
    offscreenTex = tex;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  // ─── RENDER LOOP ─────────────────────────────────────────────────
  function render(ts) {
    const t = (ts - startTime) / 1000;
    const w = canvas.width, h = canvas.height;

    // Smooth colour transition
    for (let i = 0; i < 3; i++) {
      currentColor[i] = lerp(currentColor[i], targetColor[i], 0.03);
    }

    // ── PASS 1: Wave → offscreen FBO ───────────────────────────────
    gl.useProgram(waveProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFBO);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bind geometry — guard against invalid attribute location
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVAO_wave.buf);
    if (quadVAO_wave.loc >= 0) {
      gl.enableVertexAttribArray(quadVAO_wave.loc);
      gl.vertexAttribPointer(quadVAO_wave.loc, 2, gl.FLOAT, false, 0, 0);
    }

    // Update uniforms
    gl.uniform2f(waveUniforms.resolution, w, h);
    gl.uniform1f(waveUniforms.time, t);
    gl.uniform1f(waveUniforms.waveSpeed, WAVE_SPEED);
    gl.uniform1f(waveUniforms.waveFrequency, WAVE_FREQUENCY);
    gl.uniform1f(waveUniforms.waveAmplitude, WAVE_AMPLITUDE);
    gl.uniform3fv(waveUniforms.waveColor, currentColor);
    gl.uniform2f(waveUniforms.mousePos, mouseX, mouseY);
    gl.uniform1i(waveUniforms.enableMouse, 1);
    gl.uniform1f(waveUniforms.mouseRadius, MOUSE_RADIUS);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // ── PASS 2: Dither → screen ────────────────────────────────────
    gl.useProgram(ditherProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVAO_dither.buf);
    if (quadVAO_dither.loc >= 0) {
      gl.enableVertexAttribArray(quadVAO_dither.loc);
      gl.vertexAttribPointer(quadVAO_dither.loc, 2, gl.FLOAT, false, 0, 0);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, offscreenTex);
    gl.uniform1i(ditherUniforms.texture, 0);
    gl.uniform2f(ditherUniforms.resolution, w, h);
    gl.uniform1f(ditherUniforms.colorNum, COLOR_NUM);
    gl.uniform1f(ditherUniforms.pixelSize, PIXEL_SIZE);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    rafId = requestAnimationFrame(render);
  }

  // ─── PUBLIC API ──────────────────────────────────────────────────
  function init() {
    // Create canvas and append behind everything
    canvas = document.createElement('canvas');
    canvas.id = 'dither-bg';
    canvas.style.cssText = [
      'position:fixed', 'inset:0', 'width:100%', 'height:100%',
      'z-index:-1', 'display:block', 'pointer-events:none'
    ].join(';');
    document.body.prepend(canvas);

    // WebGL2 required — GLSL ES 3.0 float[64](...) array initializer
    // is not supported in WebGL1/GLSL ES 1.0.
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) {
      // Graceful fallback: hide canvas, let the dark body background show.
      console.warn('DitherBG: WebGL2 not supported in this browser. Background disabled.');
      canvas.style.display = 'none';
      return;
    }

    // Compile programs
    waveProgram = createProgram(VERT_SRC, WAVE_FRAG_SRC);
    ditherProgram = createProgram(VERT_SRC, DITHER_FRAG_SRC);

    // Cache uniform locations
    waveUniforms = {
      resolution: gl.getUniformLocation(waveProgram, 'u_resolution'),
      time: gl.getUniformLocation(waveProgram, 'u_time'),
      waveSpeed: gl.getUniformLocation(waveProgram, 'u_waveSpeed'),
      waveFrequency: gl.getUniformLocation(waveProgram, 'u_waveFrequency'),
      waveAmplitude: gl.getUniformLocation(waveProgram, 'u_waveAmplitude'),
      waveColor: gl.getUniformLocation(waveProgram, 'u_waveColor'),
      mousePos: gl.getUniformLocation(waveProgram, 'u_mousePos'),
      enableMouse: gl.getUniformLocation(waveProgram, 'u_enableMouse'),
      mouseRadius: gl.getUniformLocation(waveProgram, 'u_mouseRadius'),
    };
    ditherUniforms = {
      texture: gl.getUniformLocation(ditherProgram, 'u_texture'),
      resolution: gl.getUniformLocation(ditherProgram, 'u_resolution'),
      colorNum: gl.getUniformLocation(ditherProgram, 'u_colorNum'),
      pixelSize: gl.getUniformLocation(ditherProgram, 'u_pixelSize'),
    };

    // Quad buffers for each program
    quadVAO_wave = createQuadBuffer(waveProgram);
    quadVAO_dither = createQuadBuffer(ditherProgram);

    // Size up and start
    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking
    window.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = canvas.height - e.clientY; // flip Y for WebGL
    });

    startTime = performance.now();
    rafId = requestAnimationFrame(render);
  }

  /**
   * Update the wave colour — called when the active tab changes.
   * Accepts a hex string: '#27E700'
   */
  function setColor(hex) {
    targetColor = hexToVec3(hex);
  }

  function stop() {
    cancelAnimationFrame(rafId);
  }

  return { init, setColor, stop, hexToVec3 };
})();
