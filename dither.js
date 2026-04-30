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
  const WAVE_FREQUENCY = 3.0;
  const WAVE_AMPLITUDE = 0.9;
  const COLOR_NUM = 3.0;   // tonal steps in the dither
  const CELL_SIZE = 15.0;  // grid pitch in px — controls symbol density
  const STAMP_SIZE = 20.0;  // symbol size within each cell (≤ CELL_SIZE)
  const CURSOR_VOID_PX = 70.0;      // inner void radius — fully clear (px)
  const CURSOR_VOID_FALLOFF = 140.0; // falloff width beyond void — symbols fade in over this (px)
  const HERO_VOID_PX = -50.0;        // inset from text rect (negative = tighter, positive = expand)
  const HERO_VOID_FALLOFF = 100.0;   // feather width outside ellipse — symbols fade in over this (px)
  const HERO_VOID_X_SCALE = 0.85;    // 0–1: scales ellipse x-radius from text block half-width (lower = narrower oval)
  const WAVE_MOUSE_RADIUS = 0.5; // wave distortion radius (UV 0–1)
  const BIAS = 0.4;   // darkness bias — higher = fewer lit cells
  const PARALLAX_SPEED = 0.0002; // wave UV shift per scroll pixel — 0 = off, ~0.0003 = noticeable

  // ─── STAMP CONFIG ─────────────────────────────────────────────────────────
  // ENABLED  false → plain square pixel blocks (pure ordered-dither, no symbol)
  // SHAPE    'svg'      — uses the embedded Extra × logo below
  //          'circle'   — circular dot
  //          'diamond'  — rotated square
  //          'cross'    — plus sign
  //          'ring'     — hollow circle
  //          'triangle' — upward triangle
  //          'square'   — plain square (same as ENABLED:false but centred)
  const STAMP_CONFIG = {
    ENABLED: true,
    SHAPE: 'svg',
  };

  // ─── STAMP SVG ────────────────────────────────────────────────────────────
  const STAMP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 201.92 177.09"><path fill="white" d="M18.56,165.97c12.01-14.32,22.09-26.48,30.59-37.31l30.94-39.42L1.5,96.12l-1.5-17.19,85.01-7.44.79-19.08c.55-13.22-1.28-28.02-4.84-49.43l17.01-2.99c2.98,17.89,5.04,33.06,5.2,46.45l.27,23.43,96.98-8.49,1.5,17.19-81.4,7.12,67.21,80.25-13.23,11.08-75.63-90.3-15.97,24.8c-11.2,17.38-27.59,37.49-51.13,65.55l-13.2-11.12Z"/></svg>`;
  const STAMP_URL = ''; // only used when STAMP_CONFIG.SHAPE === 'svg' and STAMP_SVG is ''

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
    uniform float u_scrollOffset; // parallax: wave UV shift driven by scroll position
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
      // 2 octaves (was 4) — halves shader cost, imperceptible quality difference
      for (int i = 0; i < 2; i++) {
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
      uv.y += u_scrollOffset;  // parallax: shifts wave pattern with scroll
      float f = pattern(uv);

      if (u_enableMouse == 1) {
        vec2 m = vec2(u_mousePos.x, u_resolution.y - u_mousePos.y) / u_resolution;
        m -= 0.5;
        m.x *= u_resolution.x / u_resolution.y;
        float dist   = length(uv - m);
        float effect = 1.0 - smoothstep(0.0, u_mouseRadius, dist);
        f -= 0.4 * effect; // subtle wave distortion near cursor
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
  // ─── DITHER + STAMP FRAGMENT SHADER ─────────────────────────────────────
  //
  // True ordered dithering (ReactBits algorithm):
  //   threshold is ADDED to the colour before quantising, not used as a gate.
  //   This produces the authentic halftone/print-dither look.
  //   The stamp texture shapes each "dot" — disable via u_stampEnabled = 0.
  //
  const DITHER_FRAG_SRC = `#version 300 es
    precision highp float;
    uniform sampler2D u_texture;      // wave pass output
    uniform sampler2D u_stamp;        // dot shape mask (alpha = visible)
    uniform sampler2D u_fluidVel;     // fluid velocity (FluidSim)
    uniform vec2      u_resolution;
    uniform float     u_colorNum;     // quantisation steps
    uniform float     u_cellSize;     // grid pitch in px
    uniform float     u_stampSize;    // dot size in px (≤ u_cellSize)
    uniform float     u_bias;         // darkness bias (0.2 = ReactBits default)
    uniform float     u_stampEnabled; // 1.0 = use stamp mask, 0.0 = full square
    uniform float     u_fluidAmp;
    uniform float     u_fluidStr;
    uniform int       u_enableMouse;
    uniform vec2      u_mousePos;
    uniform float     u_cursorVoid;    // inner void radius (px)
    uniform float     u_cursorFalloff; // soft falloff width (px)
    uniform vec2      u_heroCenter;    // hero text ellipse centre (GL px coords)
    uniform vec2      u_heroR;         // ellipse radii x,y (px)
    uniform float     u_heroFalloff;   // feather width outside ellipse (px)
    uniform vec3      u_bgColor;
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
      // ── Cell index & centre ───────────────────────────────────────
      vec2 cellIdx      = floor(gl_FragCoord.xy / u_cellSize);
      vec2 cellCentreGL = cellIdx * u_cellSize + u_cellSize * 0.5;

      // ── Cursor void with soft falloff ───────────────────────────────
      // voidFactor 0=clear, 1=full. Dimming cellColor before dithering causes
      // fewer cells to survive the threshold near the edge — organic fade.
      float voidFactor = 1.0;
      if (u_enableMouse == 1) {
        vec2 mouseGL = vec2(u_mousePos.x, u_resolution.y - u_mousePos.y);
        float dist   = length(cellCentreGL - mouseGL);
        voidFactor   = smoothstep(u_cursorVoid, u_cursorVoid + u_cursorFalloff, dist);
        if (voidFactor <= 0.001) { fragColor = vec4(u_bgColor, 1.0); return; }
      }

      // ── Hero text void ────────────────────────────────────────────
      // Soft ellipse centred on the hero text block. Only the oval clears;
      // the full-width container rect is ignored.
      if (u_heroR.x > 0.0) {
        vec2 p = cellCentreGL - u_heroCenter;
        // Normalised ellipse distance: <1 inside, >1 outside
        float e = length(p / u_heroR);
        // Approximate pixel distance from ellipse boundary
        float pxDist = (e - 1.0) * min(u_heroR.x, u_heroR.y);
        float heroFactor = smoothstep(0.0, u_heroFalloff, pxDist);
        if (heroFactor <= 0.001) { fragColor = vec4(u_bgColor, 1.0); return; }
        voidFactor *= heroFactor;
      }

      // ── Sample wave at cell centre ────────────────────────────────
      vec2 cellCentreUV = cellCentreGL / u_resolution;
      // Dim by voidFactor so dither naturally thins symbols near cursor edge
      vec3 cellColor    = texture(u_texture, cellCentreUV).rgb * voidFactor;

      // ── True ordered dithering (ReactBits algorithm) ──────────────
      // Add the centred Bayer threshold to the colour, apply bias,
      // then quantise. The result decides on/off — not a raw gate.
      int   bx        = int(mod(cellIdx.x, 8.0));
      int   by        = int(mod(cellIdx.y, 8.0));
      float thr       = bayer[by * 8 + bx] - 0.25;
      float stp       = 1.0 / (u_colorNum - 1.0);
      vec3  dithered  = cellColor + thr * stp;
      dithered        = clamp(dithered - u_bias, 0.0, 1.0);
      dithered        = floor(dithered * (u_colorNum - 1.0) + 0.5)
                        / (u_colorNum - 1.0);
      bool cellOn     = dot(dithered, vec3(0.299, 0.587, 0.114)) > 0.001;

      if (!cellOn) { fragColor = vec4(u_bgColor, 1.0); return; }

      // Restore full wave colour — visible symbols are never dimmed
      cellColor = texture(u_texture, cellCentreUV).rgb;

      // ── Pixel offset from cell centre ─────────────────────────────
      vec2 offset = gl_FragCoord.xy - cellCentreGL;

      // ── Fluid velocity size modulation ────────────────────────────
      float sizeScale = 1.0;
      if (u_fluidStr > 0.0) {
        vec2 fvel = texture(u_fluidVel, cellCentreUV).rg;
        sizeScale = 1.0 + u_fluidAmp * clamp(length(fvel) * u_fluidStr, 0.0, 1.0);
      }
      float halfSt = u_stampSize * sizeScale * 0.5;
      if (abs(offset.x) > halfSt || abs(offset.y) > halfSt) {
        fragColor = vec4(u_bgColor, 1.0);
        return;
      }

      // ── Stamp mask — skipped when u_stampEnabled == 0 ─────────────
      float stampMask = 1.0;
      if (u_stampEnabled > 0.5) {
        vec2 posInStamp = offset / (u_stampSize * sizeScale) + 0.5;
        posInStamp.y    = 1.0 - posInStamp.y;
        stampMask       = texture(u_stamp, posInStamp).a;
      }

      fragColor = stampMask > 0.5
        ? vec4(cellColor, 1.0)
        : vec4(u_bgColor, 1.0);
    }
  `;


  // ─── INTERNAL STATE ───────────────────────────────────────────────────────
  let canvas, gl, rafId;
  let waveProgram, ditherProgram;
  let waveUniforms = {};
  let ditherUniforms = {};
  let offscreenFBO, offscreenTex;
  let waveW = 1, waveH = 1;
  let quadVAO_wave, quadVAO_dither;
  let stampTex = null;
  let startTime = 0;
  let mouseX = 0, mouseY = 0;
  let scrollY = 0; // raw window.scrollY — scaled by PARALLAX_SPEED in render
  // Placeholder 1×1 black texture used when fluid sim is disabled / not yet ready
  let fallbackVelTex = null;

  let targetColor = [1.0, 0.173, 0.0]; // EXTRA BRIGHT #FF2C00
  let currentColor = [...targetColor];

  let targetBgColor = [0.102, 0.102, 0.180]; // EXTRA DARK #1A1A2E
  let currentBgColor = [...targetBgColor];

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

  // Wave FBO scale factor. 0.25 = 1/4 res.
  // The dither only samples the wave once per cell centre (~20px), so even
  // 1/8 resolution is more than sufficient. 1/4 gives a comfortable margin.
  const WAVE_SCALE = 0.25;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    // Don't call gl.viewport here — it's set per-pass in render()
    waveW = Math.max(1, Math.ceil(w * WAVE_SCALE));
    waveH = Math.max(1, Math.ceil(h * WAVE_SCALE));
    if (offscreenFBO) gl.deleteFramebuffer(offscreenFBO);
    if (offscreenTex) gl.deleteTexture(offscreenTex);
    const r = createFBO(waveW, waveH);
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

  // ─── BUILT-IN SHAPES ─────────────────────────────────────────────────────
  // All shapes are drawn white-on-transparent at 128×128 and used as alpha masks.
  function buildShapeStamp(shape) {
    const sz = 128, c = document.createElement('canvas');
    c.width = c.height = sz;
    const ctx = c.getContext('2d');
    const cx = sz / 2, cy = sz / 2, r = sz * 0.42;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        break;
      case 'diamond': {
        const h = r;
        ctx.beginPath();
        ctx.moveTo(cx, cy - h); ctx.lineTo(cx + h, cy);
        ctx.lineTo(cx, cy + h); ctx.lineTo(cx - h, cy);
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'cross': {
        const arm = r * 0.35;
        ctx.fillRect(cx - r, cy - arm, r * 2, arm * 2); // horizontal
        ctx.fillRect(cx - arm, cy - r, arm * 2, r * 2); // vertical
        break;
      }
      case 'ring':
        ctx.lineWidth = sz * 0.12;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy + r * 0.7);
        ctx.lineTo(cx - r, cy + r * 0.7);
        ctx.closePath(); ctx.fill();
        break;
      default:
        // fallback: circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
    }
    return uploadCanvasAsStamp(c);
  }

  // Core: draws any image src onto a 128px transparent canvas → WebGL texture
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
      console.log('DitherBG: stamp ready');
    };
    img.onerror = () => console.warn('DitherBG: stamp render failed:', src);
    img.src = src;
  }

  // For embedded SVG: caller creates the Blob URL and passes cleanup fn.
  function loadSVGStamp(blobUrl, cleanup) {
    drawToStamp(blobUrl, cleanup);
  }

  // For external SVG files: fetch → blob (GitHub Pages) with Image fallback (file://).
  function loadExternalStamp(url) {
    fetch(url)
      .then(r => { if (!r.ok) throw r.status; return r.blob(); })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        drawToStamp(blobUrl, () => URL.revokeObjectURL(blobUrl));
      })
      .catch(() => {
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

    // Smooth wave colour + bg colour lerp
    for (let i = 0; i < 3; i++) {
      currentColor[i] = lerp(currentColor[i], targetColor[i], 0.03);
      currentBgColor[i] = lerp(currentBgColor[i], targetBgColor[i], 0.04);
    }
    gl.clearColor(currentBgColor[0], currentBgColor[1], currentBgColor[2], 1.0);

    // ── Pass 0: Fluid sim step (invisible — updates velocity FBOs) ────────
    FluidSim.step();

    // ── Pass 1: Wave → quarter-res offscreen FBO ─────────────────────────
    // Running at 1/4 resolution cuts shader cost ~16×. The wave is smooth
    // noise so quality is identical; the dither samples it once per cell.
    gl.useProgram(waveProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFBO);
    gl.viewport(0, 0, waveW, waveH);
    gl.clear(gl.COLOR_BUFFER_BIT);
    bindQuad(quadVAO_wave);
    // Pass wave-FBO dimensions as u_resolution so UV math stays correct.
    // Scale mouse to wave-FBO space so the distortion stays centred on cursor.
    gl.uniform2f(waveUniforms.resolution, waveW, waveH);
    gl.uniform1f(waveUniforms.time, t);
    gl.uniform1f(waveUniforms.waveSpeed, WAVE_SPEED);
    gl.uniform1f(waveUniforms.waveFrequency, WAVE_FREQUENCY);
    gl.uniform1f(waveUniforms.waveAmplitude, WAVE_AMPLITUDE);
    gl.uniform3fv(waveUniforms.waveColor, currentColor);
    gl.uniform2f(waveUniforms.mousePos, mouseX * WAVE_SCALE, mouseY * WAVE_SCALE);
    gl.uniform1i(waveUniforms.enableMouse, 1);
    gl.uniform1f(waveUniforms.mouseRadius, WAVE_MOUSE_RADIUS);
    gl.uniform1f(waveUniforms.scrollOffset, scrollY * PARALLAX_SPEED);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // ── Pass 2: Dither → screen (full resolution) ─────────────────────────
    gl.useProgram(ditherProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
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

    // Unit 2 = fluid velocity
    const velTex = FluidSim.getVelTexture() || fallbackVelTex;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, velTex);
    gl.uniform1i(ditherUniforms.fluidVel, 2);
    gl.uniform1f(ditherUniforms.fluidAmp, FluidSim.CONFIG.ENABLED ? FluidSim.CONFIG.WAVE_AMPLITUDE : 0.0);
    gl.uniform1f(ditherUniforms.fluidStr, FluidSim.CONFIG.ENABLED ? FluidSim.CONFIG.WAVE_STRENGTH : 0.0);

    gl.uniform2f(ditherUniforms.resolution, w, h);
    gl.uniform1f(ditherUniforms.colorNum, COLOR_NUM);
    gl.uniform1f(ditherUniforms.cellSize, CELL_SIZE);
    gl.uniform1f(ditherUniforms.stampSize, STAMP_SIZE);
    gl.uniform1f(ditherUniforms.bias, BIAS);
    gl.uniform1f(ditherUniforms.stampEnabled, STAMP_CONFIG.ENABLED ? 1.0 : 0.0);
    gl.uniform1i(ditherUniforms.enableMouse, 1);
    gl.uniform2f(ditherUniforms.mousePos, mouseX, mouseY);
    gl.uniform1f(ditherUniforms.cursorVoid, CURSOR_VOID_PX);
    gl.uniform1f(ditherUniforms.cursorFalloff, CURSOR_VOID_FALLOFF);

    // Hero text void — soft ellipse centred on the visible text, not the full container
    {
      const panel = document.querySelector('.tab-panel.active');
      const els = panel
        ? [panel.querySelector('.display-heading'), panel.querySelector('.hero-sub')].filter(Boolean)
        : [];
      if (els.length) {
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        els.forEach(el => {
          const r = el.getBoundingClientRect();
          x1 = Math.min(x1, r.left);
          y1 = Math.min(y1, r.top);
          x2 = Math.max(x2, r.right);
          y2 = Math.max(y2, r.bottom);
        });
        // Ellipse centre in GL coords (Y-flipped)
        const cx = (x1 + x2) / 2;
        const cy = h - (y1 + y2) / 2;
        // x-radius: scaled fraction of half-width (text is centred, not full-width)
        const rx = (x2 - x1) / 2 * HERO_VOID_X_SCALE;
        const ry = (y2 - y1) / 2;  // y-radius: actual half-height of text block
        gl.uniform2f(ditherUniforms.heroCenter, cx, cy);
        gl.uniform2f(ditherUniforms.heroR, rx, ry);
        gl.uniform1f(ditherUniforms.heroFalloff, HERO_VOID_FALLOFF);
      } else {
        gl.uniform2f(ditherUniforms.heroCenter, 0, 0);
        gl.uniform2f(ditherUniforms.heroR, 0, 0); // disabled
        gl.uniform1f(ditherUniforms.heroFalloff, 0.0);
      }
    }

    gl.uniform3fv(ditherUniforms.bgColor, currentBgColor);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    rafId = requestAnimationFrame(render);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'dither-bg';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block;pointer-events:none';
    document.body.prepend(canvas);

    // alpha:false = compositor copies pixels without blending — faster.
    // Off-cells render #1A1A2E directly via u_bgColor uniform.
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) {
      console.warn('DitherBG: WebGL2 not supported. Background disabled.');
      canvas.style.display = 'none';
      return;
    }
    // Set clear color to Extra Dark so any unrendered area matches the design
    gl.clearColor(0.102, 0.102, 0.180, 1.0); // #1A1A2E

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
      scrollOffset: gl.getUniformLocation(waveProgram, 'u_scrollOffset'),
    };
    ditherUniforms = {
      texture: gl.getUniformLocation(ditherProgram, 'u_texture'),
      stamp: gl.getUniformLocation(ditherProgram, 'u_stamp'),
      fluidVel: gl.getUniformLocation(ditherProgram, 'u_fluidVel'),
      resolution: gl.getUniformLocation(ditherProgram, 'u_resolution'),
      colorNum: gl.getUniformLocation(ditherProgram, 'u_colorNum'),
      cellSize: gl.getUniformLocation(ditherProgram, 'u_cellSize'),
      stampSize: gl.getUniformLocation(ditherProgram, 'u_stampSize'),
      bias: gl.getUniformLocation(ditherProgram, 'u_bias'),
      stampEnabled: gl.getUniformLocation(ditherProgram, 'u_stampEnabled'),
      fluidAmp: gl.getUniformLocation(ditherProgram, 'u_fluidAmp'),
      fluidStr: gl.getUniformLocation(ditherProgram, 'u_fluidStr'),
      enableMouse: gl.getUniformLocation(ditherProgram, 'u_enableMouse'),
      mousePos: gl.getUniformLocation(ditherProgram, 'u_mousePos'),
      cursorVoid: gl.getUniformLocation(ditherProgram, 'u_cursorVoid'),
      cursorFalloff: gl.getUniformLocation(ditherProgram, 'u_cursorFalloff'),
      heroCenter: gl.getUniformLocation(ditherProgram, 'u_heroCenter'),
      heroR: gl.getUniformLocation(ditherProgram, 'u_heroR'),
      heroFalloff: gl.getUniformLocation(ditherProgram, 'u_heroFalloff'),
      bgColor: gl.getUniformLocation(ditherProgram, 'u_bgColor'),
    };

    quadVAO_wave = createQuadBuffer(waveProgram);
    quadVAO_dither = createQuadBuffer(ditherProgram);

    // Stamp — load based on STAMP_CONFIG
    if (!STAMP_CONFIG.ENABLED || STAMP_CONFIG.SHAPE === 'svg') {
      // SVG path: embedded string takes priority, then STAMP_URL file
      if (STAMP_SVG) {
        const blob = new Blob([STAMP_SVG], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);
        loadSVGStamp(blobUrl, () => URL.revokeObjectURL(blobUrl));
      } else if (STAMP_URL) {
        loadExternalStamp(STAMP_URL);
      } else {
        stampTex = buildShapeStamp('circle'); // final fallback
      }
    } else {
      // Built-in geometric shape
      stampTex = buildShapeStamp(STAMP_CONFIG.SHAPE);
    }

    // Fallback 1×1 black texture for when FluidSim has no data yet
    fallbackVelTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fallbackVelTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Init fluid sim on the same WebGL2 context
    FluidSim.init(gl, canvas);

    resize();
    window.addEventListener('resize', resize);

    // ── Mouse: use raw clientX/clientY — the shader handles the Y-flip ────
    window.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY; // NO JS flip — shader converts to GL space
    });

    // ── Scroll: drive wave parallax offset ————————————————————————
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    startTime = performance.now();
    rafId = requestAnimationFrame(render);
  }

  function setColor(hex) { targetColor = hexToVec3(hex); }
  function setBgColor(hex) { targetBgColor = hexToVec3(hex); }

  function stop() {
    cancelAnimationFrame(rafId);
  }

  return { init, setColor, setBgColor, stop, hexToVec3 };
})();

