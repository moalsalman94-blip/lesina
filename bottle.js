/* =========================================================
   Lesina — 3D body splash bottle for the hero (Three.js)
   Glass + tinted liquid + printed label + spray cap.
   Drag to spin; the liquid and label follow the chosen scent.
   If WebGL or the CDN is unavailable, the SVG lineup stays.
   ========================================================= */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("bottle");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const { SCENTS } = window.LESINA;

function profile(points) {
  return points.map(([x, y]) => new THREE.Vector2(x, y));
}

// Label artwork drawn on a canvas, re-drawn when the scent changes
function drawLabel(ctx, w, h, s) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#1a060c";
  ctx.fillRect(0, 0, w, h);

  // marbled scent wash rising from the bottom, like the real labels
  const wash = ctx.createLinearGradient(0, h * 0.45, 0, h);
  wash.addColorStop(0, "rgba(0,0,0,0)");
  wash.addColorStop(0.5, s.mid);
  wash.addColorStop(1, s.deep);
  ctx.fillStyle = wash;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.bezierCurveTo(w * 0.3, h * 0.48, w * 0.55, h * 0.8, w, h * 0.58);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const y = h * (0.66 + i * 0.06);
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y - 40 + i * 6, w * 0.6, y + 50 - i * 8, w, y - 10);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // hairline frame
  ctx.strokeStyle = "rgba(233,201,204,.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, w - 52, h - 52);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = `500 ${Math.round(w * 0.27)}px "Bodoni Moda", Didot, Georgia, serif`;
  ctx.fillText("Lesina", w / 2, h * 0.3);
  ctx.font = `400 ${Math.round(w * 0.045)}px "Bodoni Moda", Georgia, serif`;
  ctx.fillText("C O S M E T I C S", w / 2, h * 0.355);
  ctx.font = `500 ${Math.round(w * 0.06)}px Arial, sans-serif`;
  ctx.fillText("BODY  SPLASH", w / 2, h * 0.45);

  // scent pill
  const pw = w * 0.42, ph = h * 0.05, px = (w - pw) / 2, py = h * 0.48;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, ph / 2);
  ctx.stroke();
  ctx.font = `600 ${Math.round(w * 0.045)}px Arial, sans-serif`;
  ctx.fillText(s.name.toUpperCase().split("").join(" "), w / 2, py + ph * 0.68);

  ctx.font = `400 ${Math.round(w * 0.04)}px Arial, sans-serif`;
  ctx.globalAlpha = 0.8;
  ctx.fillText("250 ML", w / 2, h * 0.93);
  ctx.globalAlpha = 1;
}

async function init() {
  if (!canvas) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return done(); // no WebGL: keep the SVG lineup
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.1, 10.5);

  const key = new THREE.DirectionalLight(0xfff1e6, 1.6);
  key.position.set(3, 5, 4);
  const rim = new THREE.PointLight(0xff8fa3, 14, 20);
  rim.position.set(-3.5, 1.5, -2.5);
  const rim2 = new THREE.PointLight(0xffe2b8, 10, 20);
  rim2.position.set(3.5, -1, -2);
  scene.add(key, rim, rim2);

  let s = SCENTS[window.LESINA.scent];
  const bottle = new THREE.Group();

  // glass shell
  const glassGeo = new THREE.LatheGeometry(profile([
    [0, -1.95], [0.52, -1.95], [0.64, -1.88], [0.68, -1.7], [0.68, 1.05],
    [0.64, 1.28], [0.48, 1.45], [0.27, 1.55], [0.25, 1.78], [0, 1.78],
  ]), 96);
  // clear glass: reflections only, so the liquid keeps its true colour (and phones stay fast)
  const glass = new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6, side: THREE.DoubleSide,
  }));
  glass.renderOrder = 2;

  // liquid
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(s.mid), roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12,
    envMapIntensity: 0.9,
  });
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(profile([
    [0, -1.84], [0.5, -1.84], [0.58, -1.78], [0.6, -1.62], [0.6, 0.95], [0.55, 1.08], [0, 1.08],
  ]), 96), liquidMat);

  // label wrapped on the front of the glass
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 640;
  labelCanvas.height = 1100;
  const lctx = labelCanvas.getContext("2d");
  if (document.fonts?.ready) await document.fonts.ready;
  drawLabel(lctx, labelCanvas.width, labelCanvas.height, s);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const arc = 1.5;
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.687, 0.687, 2.05, 96, 1, true, -arc / 2, arc),
    new THREE.MeshPhysicalMaterial({ map: labelTex, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  );
  label.position.y = -0.55;

  // gold collar + black spray head
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a45c, metalness: 1, roughness: 0.22 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0b0306, roughness: 0.2, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 64), gold);
  collar.position.y = 1.86;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.62, 64), black);
  head.position.y = 2.24;
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.34, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2), black);
  top.scale.y = 0.18;
  top.position.y = 2.55;
  const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.22), black);
  nozzle.position.set(0, 2.36, 0.36);

  bottle.add(liquid, glass, label, collar, head, top, nozzle);
  bottle.position.y = -0.3;
  scene.add(bottle);

  // soft contact shadow
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext("2d");
  const sg = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  sg.addColorStop(0, "rgba(0,0,0,.55)");
  sg.addColorStop(1, "rgba(0,0,0,0)");
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.3;
  scene.add(shadow);

  /* ----- sizing ----- */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole bottle in frame on narrow canvases
    camera.position.z = camera.aspect < 0.55 ? 10.5 * (0.55 / camera.aspect) : 10.5;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ----- interaction: drag to spin with inertia, gentle tilt toward the pointer ----- */
  let spin = 0, spinVel = 0, dragging = false, lastX = 0;
  let tiltX = 0, tiltY = 0, aimX = 0, aimY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId);
    canvas.closest(".hero__bottle").classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    spinVel = dx * 0.012;
    spin += spinVel;
  });
  const endDrag = () => { dragging = false; canvas.closest(".hero__bottle").classList.remove("is-dragging"); };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  addEventListener("pointermove", (e) => {
    aimX = (e.clientX / innerWidth - 0.5) * 2;
    aimY = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ----- scent change: ease the liquid colour, repaint the label ----- */
  const fromCol = new THREE.Color(), toCol = new THREE.Color(s.mid);
  let colorT = 1;
  document.addEventListener("lesina:scent", (e) => {
    s = e.detail;
    fromCol.copy(liquidMat.color);
    toCol.set(s.mid);
    colorT = 0;
    drawLabel(lctx, labelCanvas.width, labelCanvas.height, s);
    labelTex.needsUpdate = true;
    spinVel += 0.35; // a little twirl to show it off
    if (reduced) { liquidMat.color.copy(toCol); render(); }
  });

  /* ----- loop ----- */
  const clock = new THREE.Clock();
  let intro = reduced ? 1 : 0;
  const hero = document.querySelector(".hero");
  const render = () => renderer.render(scene, camera);

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (document.documentElement.classList.contains("is-loaded")) intro = Math.min(1, intro + dt / 1.8);
    const e = 1 - Math.pow(1 - intro, 4);

    if (!dragging) { spin += spinVel; spinVel *= 0.95; spin += dt * 0.18; }
    tiltX += (aimY * 0.12 - tiltX) * 0.05;
    tiltY += (aimX * 0.25 - tiltY) * 0.05;

    // scroll: the bottle turns and drifts up as the hero leaves
    const r = hero.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / r.height));

    bottle.rotation.set(tiltX, spin + tiltY + (1 - e) * -Math.PI * 1.2 + p * Math.PI, Math.sin(t * 0.6) * 0.02);
    bottle.position.y = -0.3 + Math.sin(t * 1.1) * 0.06 + p * 1.2 - (1 - e) * 0.8;
    const sc = (0.75 + e * 0.25) * (1 - p * 0.15);
    bottle.scale.setScalar(sc);
    shadow.material.opacity = e * (1 - p);

    if (colorT < 1) {
      colorT = Math.min(1, colorT + dt / 0.9);
      liquidMat.color.lerpColors(fromCol, toCol, 1 - Math.pow(1 - colorT, 3));
    }
    render();
  }

  let running = false;
  const loop = () => { if (!running) return; frame(); requestAnimationFrame(loop); };
  if (reduced) {
    frame();
  } else {
    new IntersectionObserver(([en]) => {
      const was = running;
      running = en.isIntersecting && !document.hidden;
      if (running && !was) { clock.getDelta(); requestAnimationFrame(loop); }
    }).observe(canvas);
  }

  render();
  document.documentElement.classList.add("has-3d");
  done();
}

// tell the intro screen it can lift, with or without 3D
function done() { document.dispatchEvent(new Event("lesina:3d-ready")); }

init().catch((err) => {
  console.warn("3D bottle unavailable, showing images instead.", err);
  done();
});
