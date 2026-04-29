/**
 * EXTRA COLLECTIVE — Dither Background
 *
 * WebGL2 / GLSL ES 3.0. Two-pass render:
 *   Pass 1 → FBM wave noise into offscreen FBO
 *   Pass 2 → Bayer 8×8 ordered dither, each cell stamped with a custom shape
 *
 * ─── HOW TO USE YOUR SYMBOL ────────────────────────────────────────────────
 *   1. Export your SVG mark as a file — white shape, transparent background.
 *   2. Drop it in the same folder as this file (e.g. extra-mark.svg).
 *   3. Set  STAMP_URL = './extra-mark.svg'  below.
 *   4. Increase PIXEL_SIZE to ≥ 10 so the shape is legible at render size.
 *
 *   Leave STAMP_URL = ''  to use the built-in default shape (circle).
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Public API:
 *   DitherBG.init()          — create canvas, load stamp, start loop
 *   DitherBG.setColor(hex)   — smooth color transition on tab switch
 *   DitherBG.stop()          — pause animation
 */

const DitherBG = (() => {

  // ─── CONFIG ──────────────────────────────────────────────────────────────
  const WAVE_SPEED = 0.05;
  const WAVE_FREQUENCY = 2.0;
  const WAVE_AMPLITUDE = 0.4;
  const COLOR_NUM = 4.0;  // tonal steps in the dither (higher = more gradation)
  const PIXEL_SIZE = 12.0;  // cell size in screen pixels (min 8 for SVG to read)
  const MOUSE_RADIUS = 0.2;

  // Path to your SVG symbol. '' = built-in circle.
  const STAMP_URL = 'assets/EXTRA_SYMBOL.svg';

  // ─── VERTEX SHADER ───────────────────────────────────────────────────────
  const VERT_SRC = `#version 300 es
    in vec2 a_position;
    out vec2 vUv;
    void main() {
      vUv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // ─── WAVE FRAGMENT SHADER ────────────────────────────────────────────────
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
        // u_mousePos is raw clientX/clientY — convert to same space as uv.
        // clientY=0 is top; gl_FragCoord.y=0 is bottom — flip Y only here.
        vec2 m = vec2(u_mousePos.x, u_resolution.y - u_mousePos.y) / u_resolution;
        m -= 0.5;
        m.x *= u_resolution.x / u_resolution.y;
        float dist   = length(uv - m);
        float effect = 1.0 - smoothstep(0.0, u_mouseRadius, dist);
        f -= 0.5 * effect;
      }

      vec3 col = mix(vec3(0.0), u_waveColor, f);
      fragColor = vec4(col, 1.0);
    }
  `;

  // ─── DITHER + STAMP FRAGMENT SHADER ─────────────────────────────────────
  //
  // Per-CELL ordered dither (Bayer 8×8). Each cell is PIXEL_SIZE × PIXEL_SIZE
  // pixels. If the cell's brightness exceeds its Bayer threshold the cell is
  // "on" — meaning visible pixels are those where the stamp texture is white.
  // This makes your SVG symbol the shape of every dither dot.
  //
  // NOTE: float[64](...) requires GLSL ES 3.0 / WebGL2 — cannot use WebGL1.
  const DITHER_FRAG_SRC = `#version 300 es
    precision highp float;
    uniform sampler2D u_texture;   // wave pass output
    uniform sampler2D u_stamp;     // pixel shape mask (white = visible)
    uniform vec2      u_resolution;
    uniform float     u_colorNum;
    uniform float     u_pixelSize;
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

    void main() {
      // ── Which cell are we in? ──────────────────────────────────────────
      vec2 cellIdx = floor(gl_FragCoord.xy / u_pixelSize);

      // ── Sample wave at cell centre ─────────────────────────────────────
      vec2 cellCentreUV = (cellIdx * u_pixelSize + u_pixelSize * 0.5) / u_resolution;
      vec3 cellColor = texture(u_texture, cellCentreUV).rgb;
      float brightness = dot(cellColor, vec3(0.299, 0.587, 0.114));

      // ── Quantise brightness to COLOR_NUM steps ─────────────────────────
      float step = 1.0 / (u_colorNum - 1.0);
      float quantized = floor(brightness / step + 0.5) * step;

      // ── Bayer threshold at cell level ──────────────────────────────────
      int bx = int(mod(cellIdx.x, 8.0));
      int by = int(mod(cellIdx.y, 8.0));
      float threshold = bayer[by * 8 + bx];

      // ── Stamp mask — position within this cell (0..1) ─────────────────
      // Flip Y so the stamp reads top-to-bottom as drawn.
      vec2 posInCell = fract(gl_FragCoord.xy / u_pixelSize);
      posInCell.y = 1.0 - posInCell.y;
      float stampMask = texture(u_stamp, posInCell).a; // alpha: works with any SVG fill colour

      // ── Output: on = cell colour (opaque); off = transparent ───────────
      // Transparent off-cells let the CSS body background (#1A1A2E) show through.
      if (quantized > threshold && stampMask > 0.5) {
        fragColor = vec4(cellColor, 1.0);
      } else {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0); // transparent — body bg visible
      }
    }
  `;

  // ─── INTERNAL STATE ───────────────────────────────────────────────────────
  let canvas, gl, rafId;
  let waveProgram, ditherProgram;
  let waveUniforms = {};
  let ditherUniforms = {};
  let offscreenFBO, offscreenTex;
  let quadVAO_wave, quadVAO_dither;
  let stampTex = null;
  let startTime = 0;
  let mouseX = 0, mouseY = 0;

  let targetColor = [0.153, 0.906, 0.0]; // EXTRA CONTRAST #27E700
  let currentColor = [...targetColor];

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  function hexToVec3(hex) {
    return [
      parseInt(hex.slice(1, 3), 16) / 255,
      parseInt(hex.slice(3, 5), 16) / 255,
      parseInt(hex.slice(5, 7), 16) / 255,
    ];
  }

  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('DitherBG shader error:', gl.getShaderInfoLog(s));
    }
    return s;
  }

  function createProgram(vSrc, fSrc) {
    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(vSrc, gl.VERTEX_SHADER));
    gl.attachShader(prog, compileShader(fSrc, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('DitherBG program error:', gl.getProgramInfoLog(prog));
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

  function createFBO(w, h) {
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
    if (offscreenFBO) gl.deleteFramebuffer(offscreenFBO);
    if (offscreenTex) gl.deleteTexture(offscreenTex);
    const r = createFBO(w, h);
    offscreenFBO = r.fbo;
    offscreenTex = r.tex;
  }

  // ─── STAMP TEXTURE ────────────────────────────────────────────────────────
  // Builds a 64×64 WebGL texture from an SVG file or a built-in shape.
  // The stamp is sampled per-cell in the dither pass — white pixels are
  // "visible", black/transparent are "off".

  function uploadCanvasAsStamp(c) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return tex;
  }

  function buildDefaultStamp() {
    // Built-in: circle, drawn on transparent background.
    // Alpha channel is used as the mask — no black fill needed.
    const sz = 64;
    const c = document.createElement('canvas');
    c.width = c.height = sz;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sz / 2, sz / 2, sz * 0.42, 0, Math.PI * 2);
    ctx.fill();
    return uploadCanvasAsStamp(c);
  }

  function loadSVGStamp(url) {
    // Draws the SVG onto a transparent canvas — alpha channel is the stamp mask.
    // The SVG can be any colour; opaque pixels = "on", transparent = "off".
    //
    // Loading strategy:
    //   1. fetch() → Blob URL  — avoids canvas taint, works on HTTP (GitHub Pages)
    //   2. Direct Image.src    — fallback for file:// where fetch is blocked
    function drawToStamp(src, cleanup) {
      const sz = 128;
      const img = new Image();
      img.onload = () => {
        if (cleanup) cleanup();
        const c = document.createElement('canvas');
        c.width = c.height = sz;
        c.getContext('2d').drawImage(img, 0, 0, sz, sz);
        if (stampTex) gl.deleteTexture(stampTex);
        stampTex = uploadCanvasAsStamp(c);
        console.log('DitherBG: stamp loaded —', url);
      };
      img.onerror = () => console.warn('DitherBG: stamp failed to render:', src);
      img.src = src;
    }

    fetch(url)
      .then(r => { if (!r.ok) throw r.status; return r.blob(); })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        drawToStamp(blobUrl, () => URL.revokeObjectURL(blobUrl));
      })
      .catch(() => {
        // fetch blocked (file:// protocol) — try direct Image load as fallback
        console.log('DitherBG: fetch blocked, trying direct Image for', url);
        drawToStamp(url, null);
      });
  }

  // ─── RENDER LOOP ──────────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }

  function bindQuad(q) {
    gl.bindBuffer(gl.ARRAY_BUFFER, q.buf);
    if (q.loc >= 0) {
      gl.enableVertexAttribArray(q.loc);
      gl.vertexAttribPointer(q.loc, 2, gl.FLOAT, false, 0, 0);
    }
  }

  function render(ts) {
    const t = (ts - startTime) / 1000;
    const w = canvas.width, h = canvas.height;

    // Smooth colour lerp
    for (let i = 0; i < 3; i++) {
      currentColor[i] = lerp(currentColor[i], targetColor[i], 0.03);
    }

    // ── Pass 1: Wave → offscreen FBO ─────────────────────────────────────
    gl.useProgram(waveProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFBO);
    gl.clear(gl.COLOR_BUFFER_BIT);
    bindQuad(quadVAO_wave);
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

    // ── Pass 2: Dither → screen ───────────────────────────────────────────
    gl.useProgram(ditherProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    bindQuad(quadVAO_dither);

    // Unit 0 = wave texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, offscreenTex);
    gl.uniform1i(ditherUniforms.texture, 0);

    // Unit 1 = stamp texture
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, stampTex);
    gl.uniform1i(ditherUniforms.stamp, 1);

    gl.uniform2f(ditherUniforms.resolution, w, h);
    gl.uniform1f(ditherUniforms.colorNum, COLOR_NUM);
    gl.uniform1f(ditherUniforms.pixelSize, PIXEL_SIZE);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    rafId = requestAnimationFrame(render);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'dither-bg';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block;pointer-events:none';
    document.body.prepend(canvas);

    // alpha:true + premultipliedAlpha:false → off-cells are transparent,
    // letting the CSS body background (#1A1A2E) show through cleanly.
    gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: false });
    if (!gl) {
      console.warn('DitherBG: WebGL2 not supported. Background disabled.');
      canvas.style.display = 'none';
      return;
    }

    waveProgram = createProgram(VERT_SRC, WAVE_FRAG_SRC);
    ditherProgram = createProgram(VERT_SRC, DITHER_FRAG_SRC);

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
      stamp: gl.getUniformLocation(ditherProgram, 'u_stamp'),
      resolution: gl.getUniformLocation(ditherProgram, 'u_resolution'),
      colorNum: gl.getUniformLocation(ditherProgram, 'u_colorNum'),
      pixelSize: gl.getUniformLocation(ditherProgram, 'u_pixelSize'),
    };

    quadVAO_wave = createQuadBuffer(waveProgram);
    quadVAO_dither = createQuadBuffer(ditherProgram);

    // Build stamp texture — default first, then swap if STAMP_URL is set
    stampTex = buildDefaultStamp();
    if (STAMP_URL) loadSVGStamp(STAMP_URL);

    resize();
    window.addEventListener('resize', resize);

    // ── Mouse: use raw clientX/clientY — the shader handles the Y-flip ────
    window.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY; // NO JS flip — shader converts to GL space
    });

    startTime = performance.now();
    rafId = requestAnimationFrame(render);
  }

  function setColor(hex) {
    targetColor = hexToVec3(hex);
  }

  function stop() {
    cancelAnimationFrame(rafId);
  }

  return { init, setColor, stop, hexToVec3 };
})();
