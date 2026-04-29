/**
 * EXTRA COLLECTIVE — Fluid Splash
 *
 * Navier-Stokes fluid simulation (adapted from ReactBits SplashCursor).
 * Runs invisibly on the dither's shared WebGL2 context — no extra canvas.
 * The velocity texture is sampled by the dither shader to subtly scale
 * dither symbols where the fluid is active.
 *
 * ─── CONTROLS ────────────────────────────────────────────────────────────
 *   FluidSim.CONFIG.ENABLED              true/false — master switch
 *   FluidSim.CONFIG.SIM_RESOLUTION       velocity grid size (px) — lower = faster
 *   FluidSim.CONFIG.VELOCITY_DISSIPATION how fast fluid calms (higher = snappier)
 *   FluidSim.CONFIG.PRESSURE_ITERATIONS  solver quality (min ~8, default 20)
 *   FluidSim.CONFIG.CURL                 vorticity — higher = more swirling
 *   FluidSim.CONFIG.SPLAT_RADIUS         splash radius 0–1
 *   FluidSim.CONFIG.SPLAT_FORCE          impulse strength
 *   FluidSim.CONFIG.WAVE_AMPLITUDE       max symbol size deviation (0=off, 1=±100%)
 *   FluidSim.CONFIG.WAVE_STRENGTH        velocity sensitivity (tune if too subtle/strong)
 * ─────────────────────────────────────────────────────────────────────────
 */

const FluidSim = (() => {

  // ─── EXPOSED CONFIG ──────────────────────────────────────────────────────
  const CONFIG = {
    ENABLED: true,
    SIM_RESOLUTION: 128,
    VELOCITY_DISSIPATION: 2.0,
    PRESSURE: 0.1,
    PRESSURE_ITERATIONS: 20,
    CURL: 3,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    WAVE_AMPLITUDE: 0.35,  // passed to dither shader as u_fluidAmp
    WAVE_STRENGTH: 0.05, // passed to dither shader as u_fluidStrength
  };

  // ─── SHADERS (GLSL ES 1.00 — valid in WebGL2) ────────────────────────────
  const VERT = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL; varying vec2 vR;
    varying vec2 vT; varying vec2 vB;
    uniform vec2 texelSize;
    void main(){
      vUv=aPosition*0.5+0.5;
      vL=vUv-vec2(texelSize.x,0.);
      vR=vUv+vec2(texelSize.x,0.);
      vT=vUv+vec2(0.,texelSize.y);
      vB=vUv-vec2(0.,texelSize.y);
      gl_Position=vec4(aPosition,0.,1.);
    }`;

  const CLEAR_FRAG = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture; uniform float value;
    void main(){ gl_FragColor=value*texture2D(uTexture,vUv); }`;

  const SPLAT_FRAG = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main(){
      vec2 p=vUv-point;
      p.x*=aspectRatio;
      gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+exp(-dot(p,p)/radius)*color,1.);
    }`;

  const ADVECTION_FRAG = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity; uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform float dt; uniform float dissipation;
    void main(){
      vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;
      gl_FragColor=texture2D(uSource,coord)/(1.+dissipation*dt);
    }`;

  const DIVERGENCE_FRAG = `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL; varying highp vec2 vR;
    varying highp vec2 vT; varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main(){
      float L=texture2D(uVelocity,vL).x, R=texture2D(uVelocity,vR).x;
      float T=texture2D(uVelocity,vT).y, B=texture2D(uVelocity,vB).y;
      vec2 C=texture2D(uVelocity,vUv).xy;
      if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x;
      if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y;
      gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);
    }`;

  const CURL_FRAG = `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL; varying highp vec2 vR;
    varying highp vec2 vT; varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main(){
      gl_FragColor=vec4(.5*(
        texture2D(uVelocity,vR).y-texture2D(uVelocity,vL).y
       -texture2D(uVelocity,vT).x+texture2D(uVelocity,vB).x
      ),0.,0.,1.);
    }`;

  const VORTICITY_FRAG = `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform sampler2D uVelocity; uniform sampler2D uCurl;
    uniform float curl; uniform float dt;
    void main(){
      float L=texture2D(uCurl,vL).x, R=texture2D(uCurl,vR).x;
      float T=texture2D(uCurl,vT).x, B=texture2D(uCurl,vB).x;
      float C=texture2D(uCurl,vUv).x;
      vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));
      f/=length(f)+.0001; f*=curl*C; f.y*=-1.;
      vec2 v=texture2D(uVelocity,vUv).xy+f*dt;
      gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.);
    }`;

  const PRESSURE_FRAG = `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL; varying highp vec2 vR;
    varying highp vec2 vT; varying highp vec2 vB;
    uniform sampler2D uPressure; uniform sampler2D uDivergence;
    void main(){
      float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x;
      float T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x;
      gl_FragColor=vec4((L+R+B+T-texture2D(uDivergence,vUv).x)*.25,0.,0.,1.);
    }`;

  const GRAD_SUBTRACT_FRAG = `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL; varying highp vec2 vR;
    varying highp vec2 vT; varying highp vec2 vB;
    uniform sampler2D uPressure; uniform sampler2D uVelocity;
    void main(){
      float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x;
      float T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x;
      vec2 v=texture2D(uVelocity,vUv).xy-vec2(R-L,T-B);
      gl_FragColor=vec4(v,0.,1.);
    }`;

  // ─── STATE ───────────────────────────────────────────────────────────────
  let gl, canvas;
  let programs = {};
  let vel, divergence, curlFBO, pressure;
  let quadBuf;
  let useHalfFloat = false;
  let halfFloatType;
  let lastTime = performance.now();

  // Pointer state
  const ptr = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, dx: 0, dy: 0, moved: false };

  // ─── GL HELPERS ──────────────────────────────────────────────────────────
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('FluidSim shader:', gl.getShaderInfoLog(s));
    return s;
  }

  function mkProgram(fSrc) {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, fSrc);
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aPosition');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      console.error('FluidSim program:', gl.getProgramInfoLog(p));
    // Collect uniforms
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { program: p, u };
  }

  function createFBO(w, h) {
    gl.activeTexture(gl.TEXTURE0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const fmt = useHalfFloat ? gl.RGBA16F : gl.RGBA;
    const type = useHalfFloat ? halfFloatType : gl.UNSIGNED_BYTE;
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const tsX = 1 / w, tsY = 1 / h;
    return {
      fbo, tex, width: w, height: h, tsX, tsY,
      attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; }
    };
  }

  function createDoubleFBO(w, h) {
    let a = createFBO(w, h), b = createFBO(w, h);
    return {
      width: w, height: h,
      get read() { return a; }, get write() { return b; },
      swap() { [a, b] = [b, a]; },
      get tsX() { return a.tsX; }, get tsY() { return a.tsY; }
    };
  }

  function blit(target) {
    if (target) {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function setTexelSize(prog, tsX, tsY) {
    gl.uniform2f(prog.u['texelSize'], tsX, tsY);
  }

  function bind(prog) { gl.useProgram(prog.program); }

  // ─── RESOLUTION ──────────────────────────────────────────────────────────
  function getSimRes() {
    const r = CONFIG.SIM_RESOLUTION;
    const ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    return ar >= 1 ? { w: Math.round(r * ar), h: r } : { w: r, h: Math.round(r / ar) };
  }

  function initFBOs() {
    const { w, h } = getSimRes();
    vel = createDoubleFBO(w, h);
    divergence = createFBO(w, h);
    curlFBO = createFBO(w, h);
    pressure = createDoubleFBO(w, h);
  }

  // ─── PHYSICS STEP ────────────────────────────────────────────────────────
  function stepPhysics(dt) {
    gl.disable(gl.BLEND);

    // Curl
    bind(programs.curl);
    setTexelSize(programs.curl, vel.tsX, vel.tsY);
    gl.uniform1i(programs.curl.u['uVelocity'], vel.read.attach(0));
    blit(curlFBO);

    // Vorticity
    bind(programs.vorticity);
    setTexelSize(programs.vorticity, vel.tsX, vel.tsY);
    gl.uniform1i(programs.vorticity.u['uVelocity'], vel.read.attach(0));
    gl.uniform1i(programs.vorticity.u['uCurl'], curlFBO.attach(1));
    gl.uniform1f(programs.vorticity.u['curl'], CONFIG.CURL);
    gl.uniform1f(programs.vorticity.u['dt'], dt);
    blit(vel.write); vel.swap();

    // Divergence
    bind(programs.divergence);
    setTexelSize(programs.divergence, vel.tsX, vel.tsY);
    gl.uniform1i(programs.divergence.u['uVelocity'], vel.read.attach(0));
    blit(divergence);

    // Clear pressure
    bind(programs.clear);
    gl.uniform1i(programs.clear.u['uTexture'], pressure.read.attach(0));
    gl.uniform1f(programs.clear.u['value'], CONFIG.PRESSURE);
    blit(pressure.write); pressure.swap();

    // Pressure solve
    bind(programs.pressure);
    setTexelSize(programs.pressure, vel.tsX, vel.tsY);
    gl.uniform1i(programs.pressure.u['uDivergence'], divergence.attach(0));
    for (let i = 0; i < CONFIG.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(programs.pressure.u['uPressure'], pressure.read.attach(1));
      blit(pressure.write); pressure.swap();
    }

    // Gradient subtract
    bind(programs.gradSubtract);
    setTexelSize(programs.gradSubtract, vel.tsX, vel.tsY);
    gl.uniform1i(programs.gradSubtract.u['uPressure'], pressure.read.attach(0));
    gl.uniform1i(programs.gradSubtract.u['uVelocity'], vel.read.attach(1));
    blit(vel.write); vel.swap();

    // Advect velocity
    bind(programs.advection);
    setTexelSize(programs.advection, vel.tsX, vel.tsY);
    let vi = vel.read.attach(0);
    gl.uniform1i(programs.advection.u['uVelocity'], vi);
    gl.uniform1i(programs.advection.u['uSource'], vi);
    gl.uniform1f(programs.advection.u['dt'], dt);
    gl.uniform1f(programs.advection.u['dissipation'], CONFIG.VELOCITY_DISSIPATION);
    blit(vel.write); vel.swap();
  }

  function doSplat(x, y, dx, dy) {
    const ar = canvas.width / canvas.height;
    const r = CONFIG.SPLAT_RADIUS / 100;

    bind(programs.splat);
    gl.uniform1i(programs.splat.u['uTarget'], vel.read.attach(0));
    gl.uniform1f(programs.splat.u['aspectRatio'], ar);
    gl.uniform2f(programs.splat.u['point'], x, y);
    gl.uniform3f(programs.splat.u['color'], dx, dy, 0);
    gl.uniform1f(programs.splat.u['radius'], ar > 1 ? r * ar : r);
    blit(vel.write); vel.swap();
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  function init(glCtx, canvasEl) {
    if (!CONFIG.ENABLED) return;
    gl = glCtx;
    canvas = canvasEl;

    // Check half-float support
    const ext = gl.getExtension('EXT_color_buffer_float');
    const linExt = gl.getExtension('OES_texture_float_linear');
    halfFloatType = gl.HALF_FLOAT;
    useHalfFloat = !!ext;

    // Compile programs
    programs.clear = mkProgram(CLEAR_FRAG);
    programs.splat = mkProgram(SPLAT_FRAG);
    programs.advection = mkProgram(ADVECTION_FRAG);
    programs.divergence = mkProgram(DIVERGENCE_FRAG);
    programs.curl = mkProgram(CURL_FRAG);
    programs.vorticity = mkProgram(VORTICITY_FRAG);
    programs.pressure = mkProgram(PRESSURE_FRAG);
    programs.gradSubtract = mkProgram(GRAD_SUBTRACT_FRAG);

    // Quad buffer (shared blit geometry)
    quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    initFBOs();

    // Mouse tracking — produce splats on movement
    let prevX = -1, prevY = -1;
    window.addEventListener('mousemove', e => {
      const x = e.clientX / canvas.clientWidth;
      const y = 1 - e.clientY / canvas.clientHeight; // GL convention
      if (prevX < 0) { prevX = x; prevY = y; return; }
      ptr.dx = (x - prevX) * CONFIG.SPLAT_FORCE;
      ptr.dy = (y - prevY) * CONFIG.SPLAT_FORCE;
      ptr.x = x; ptr.y = y;
      ptr.moved = Math.abs(ptr.dx) + Math.abs(ptr.dy) > 0;
      prevX = x; prevY = y;
    });

    // Resize — rebuild FBOs
    window.addEventListener('resize', () => {
      if (gl) initFBOs();
    });
  }

  function step() {
    if (!CONFIG.ENABLED || !gl) return;

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.016667);
    lastTime = now;

    if (ptr.moved) {
      ptr.moved = false;
      doSplat(ptr.x, ptr.y, ptr.dx, ptr.dy);
    }

    stepPhysics(dt);
  }

  // Returns the velocity read texture — bind this in the dither pass
  function getVelTexture() {
    return vel ? vel.read.tex : null;
  }

  return { CONFIG, init, step, getVelTexture };
})();
