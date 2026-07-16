// scene.js — Three.js Scene Manager for GIGR
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const TOTAL_SLIDES = 9;

// ── Global visual config ───────────────────────────────────────────
// Robot rendering style: 'silhouette' = flat solid black, 'mono' = grayscale.
export const ROBOT_STYLE = 'silhouette';
export const ROBOT_SILHOUETTE_COLOR = 0x000000;

export class ThreeScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // transparent — white comes from CSS body
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.slideGroups = [];
    this.clock = new THREE.Clock();
    this.mouseX = 0;
    this.mouseY = 0;
    this.loader = new GLTFLoader();
    this.texLoader = new THREE.TextureLoader();

    this._initComposer();
    this._initLights();
    this._initBackground();
    this._createSlideObjects();

    this.mixers = [];
    this.ready = this._preloadModels();

    window.addEventListener('resize', () => this._onResize());
    document.addEventListener('mousemove', e => {
      this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  _initComposer() {
    // No post-processing composer — render directly so the canvas stays
    // fully transparent and the CSS white body shows through correctly.
    // UnrealBloomPass composites onto a black internal buffer which
    // overwrites the alpha channel and kills the transparent background.
    this.composer = null;
  }

  _initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(5, 10, 5);
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(-5, -3, 3);
    this.scene.add(fill);
    this.rimLight = new THREE.PointLight(0x8888cc, 0.35, 20);
    this.rimLight.position.set(-5, 3, 2);
    this.scene.add(this.rimLight);
  }

  _initBackground() {
    // Dark particles — visible on white bg
    const pCount = 280;
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.032, color: 0x444444, transparent: true, opacity: 0.18, sizeAttenuation: true
    }));
    this.scene.add(this.particles);

    // Connection network
    const nodes = [];
    for (let i = 0; i < 35; i++) nodes.push(new THREE.Vector3(
      (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10
    ));
    const lineVerts = [];
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        if (nodes[i].distanceTo(nodes[j]) < 4.5)
          lineVerts.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineVerts), 3));
    this.netLines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
      color: 0x666666, transparent: true, opacity: 0.09
    }));
    this.scene.add(this.netLines);
  }

  // ── Helper shape builders ──────────────────────────────────────────
  _makeGear(radius, opacity = 0.9) {
    // Single extruded gear shape — no overlapping transparent boxes to z-fight.
    const teeth = Math.max(9, Math.round(radius * 11));
    const outer = radius, root = radius * 0.8, hole = radius * 0.42;
    const shape = new THREE.Shape();
    const seg = (Math.PI * 2) / (teeth * 2);
    for (let i = 0; i < teeth * 2; i++) {
      const r = i % 2 === 0 ? outer : root;
      const a = i * seg;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    }
    shape.closePath();
    const cut = new THREE.Path();
    cut.absarc(0, 0, hole, 0, Math.PI * 2, true);
    shape.holes.push(cut);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: radius * 0.32, bevelEnabled: true,
      bevelThickness: radius * 0.05, bevelSize: radius * 0.05, bevelSegments: 2, steps: 1
    });
    geo.center();
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0c, metalness: 0.85, roughness: 0.35, transparent: opacity < 1, opacity });
    return new THREE.Mesh(geo, mat);
  }

  _makeGlobe(radius = 2, detail = 3) {
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const solid = new THREE.Mesh(geo,
      new THREE.MeshPhongMaterial({ color: 0x0d0d0d, shininess: 110, transparent: true, opacity: 0.9 })
    );
    const wire = new THREE.Mesh(geo.clone(),
      new THREE.MeshBasicMaterial({ color: 0x2a2a2a, wireframe: true, transparent: true, opacity: 0.15 })
    );
    // Latitude rings
    for (let i = 1; i < 6; i++) {
      const r = radius * Math.sin((i / 6) * Math.PI);
      const y = radius * Math.cos((i / 6) * Math.PI);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.012, 6, 48),
        new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.28 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      g.add(ring);
    }
    // Meridian rings
    for (let i = 0; i < 8; i++) {
      const meridian = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.01, 6, 64),
        new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.18 })
      );
      meridian.rotation.y = (i / 8) * Math.PI;
      g.add(meridian);
    }
    g.add(solid, wire);
    return g;
  }

  _makeTorusKnot() {
    const geo = new THREE.TorusKnotGeometry(1.6, 0.42, 120, 18, 2, 3);
    const mesh = new THREE.Mesh(geo,
      new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 110 })
    );
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.18 })
    );
    const g = new THREE.Group(); g.add(mesh, wire);
    return g;
  }

  _makeCrystalShard(scale = 1) {
    return new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4 * scale, 0),
      new THREE.MeshPhongMaterial({ color: 0x151515, shininess: 150, transparent: true, opacity: 0.78 })
    );
  }

  _makeFloatingOrb(radius = 0.08, color = 0x1a1a1a) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 16),
      new THREE.MeshBasicMaterial({ color })
    );
    const light = new THREE.PointLight(0x4455bb, 0.28, 4);
    const g = new THREE.Group(); g.add(orb, light);
    return g;
  }

  // Rounded-rectangle Shape (used for the phone body + screen)
  _roundedRectShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  // A fancy procedural smartphone (fallback for phone.glb) — the GIGR app on screen
  _makePhone() {
    const g = new THREE.Group();
    const W = 1.28, H = 2.6, R = 0.26, D = 0.18;

    // Glossy metal body with beveled edges
    const bodyShape = this._roundedRectShape(W, H, R);
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: D, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 5, steps: 1
    });
    bodyGeo.center();
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({
      color: 0x0a0a0a, metalness: 0.95, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12
    }));
    g.add(body);

    // Screen — dark inset panel
    const screenShape = this._roundedRectShape(W - 0.18, H - 0.26, R - 0.1);
    const screen = new THREE.Mesh(
      new THREE.ShapeGeometry(screenShape),
      new THREE.MeshBasicMaterial({ color: 0x0e1016 })
    );
    screen.position.z = D / 2 + 0.055;
    g.add(screen);

    // GIGR app logo, centered on the screen (logo.png if present)
    const logoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.66), logoMat);
    logo.position.set(0, 0.15, D / 2 + 0.06);
    g.add(logo);
    this.texLoader.load('logo.png', tex => {
      logoMat.map = tex; logoMat.opacity = 1; logoMat.needsUpdate = true;
    });

    // Faux app UI: a title bar + list rows glowing under the logo
    const uiMat = new THREE.MeshBasicMaterial({ color: 0x2b62ff, transparent: true, opacity: 0.55 });
    for (let i = 0; i < 4; i++) {
      const row = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.12), uiMat);
      row.position.set(0, -0.35 - i * 0.22, D / 2 + 0.056);
      g.add(row);
    }

    // Notch (front camera pill)
    const notch = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.045, 0.16, 4, 8),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    notch.rotation.z = Math.PI / 2;
    notch.position.set(0, H / 2 - 0.32, D / 2 + 0.07);
    g.add(notch);

    // Side buttons
    const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x141414, metalness: 0.9, roughness: 0.3 });
    const power = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.09), btnMat);
    power.position.set(W / 2 + 0.01, 0.3, 0);
    const vol = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.09), btnMat);
    vol.position.set(-W / 2 - 0.01, 0.5, 0);
    g.add(power, vol);

    // Screen glow
    const glow = new THREE.PointLight(0x4b7bff, 1.4, 4.5);
    glow.position.set(0, 0, 1.2);
    g.add(glow);
    g.userData.glow = glow;

    return g;
  }

  // Clean wireframe globe — clearly visible on white, no solid fill
  _makeWireGlobe(radius = 2, detail = 3, opacity = 0.55) {
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity })
    );
    // Vertex nodes
    const pts = new THREE.Points(
      geo.clone(),
      new THREE.PointsMaterial({ color: 0x000000, size: 0.05, transparent: true, opacity: opacity * 0.9 })
    );
    // Faint latitude rings for a "globe" read
    for (let i = 1; i < 5; i++) {
      const r = radius * Math.sin((i / 5) * Math.PI);
      const y = radius * Math.cos((i / 5) * Math.PI);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.008, 6, 48),
        new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: opacity * 0.5 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      g.add(ring);
    }
    g.add(wire, pts);
    return g;
  }

  // Neural-network "AI model" — layered node cloud + edges + traveling signals.
  // Returns a group; node/edge/signal state lives on group.userData for animation.
  _makeNeuralNet(radius = 1.9) {
    const g = new THREE.Group();

    // Layered node cloud — a few shells so it reads as a structured model, not a globe
    const nodePos = [];
    const layers = [0.55, 0.95, 1.35, 1.75].map(f => radius * f / 1.75);
    layers.forEach((lr, li) => {
      const count = 5 + li * 3;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + li * 0.6;
        const tilt = (Math.random() - 0.5) * 1.1;
        nodePos.push(new THREE.Vector3(
          Math.cos(a) * lr * Math.cos(tilt),
          Math.sin(tilt) * lr,
          Math.sin(a) * lr * Math.cos(tilt)
        ));
      }
    });

    // Node spheres (black)
    const nodeGeo = new THREE.SphereGeometry(0.045, 10, 10);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    nodePos.forEach(p => {
      const n = new THREE.Mesh(nodeGeo, nodeMat);
      n.position.copy(p);
      g.add(n);
    });

    // Edges between nearby nodes (thin, dark, semi-transparent) — like _initBackground
    const edges = [];
    const edgeVerts = [];
    for (let i = 0; i < nodePos.length; i++) {
      for (let j = i + 1; j < nodePos.length; j++) {
        if (nodePos[i].distanceTo(nodePos[j]) < radius * 0.62) {
          edges.push([i, j]);
          const a = nodePos[i], b = nodePos[j];
          edgeVerts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edgeVerts), 3));
    const eLines = new THREE.LineSegments(eGeo, new THREE.LineBasicMaterial({
      color: 0x111111, transparent: true, opacity: 0.22
    }));
    g.add(eLines);

    // Traveling "signal" pulses along edges
    const signals = [];
    for (let i = 0; i < 5; i++) {
      const orb = this._makeFloatingOrb(0.06, 0x0a0a0a);
      const edge = edges[Math.floor(Math.random() * edges.length)] || [0, 0];
      orb.userData = { from: edge[0], to: edge[1], t: Math.random(), speed: 0.012 + Math.random() * 0.01 };
      g.add(orb);
      signals.push(orb);
    }

    g.userData = { nodePos, edges, signals };
    return g;
  }

  // ── Slide Object Creation ──────────────────────────────────────────
  _createSlideObjects() {
    for (let i = 0; i < TOTAL_SLIDES; i++) {
      const g = new THREE.Group();
      g.visible = (i === 0);
      g.scale.set(i === 0 ? 1 : 0.001, i === 0 ? 1 : 0.001, i === 0 ? 1 : 0.001);
      this.scene.add(g);
      this.slideGroups.push(g);
    }

    // ── Slide 0: Phone — LEFT side (x ≈ -3) ──
    // Fancy procedural phone with GIGR app; upgraded to phone.glb if present.
    {
      const g = this.slideGroups[0];

      const phone = this._makePhone();
      phone.position.set(-3.0, 0, 0);
      phone.rotation.set(0.12, -0.35, 0);
      phone.scale.setScalar(1.25);

      // Background gears
      const gear1 = this._makeGear(1.4, 0.3);
      gear1.position.set(-5.6, -2.4, -2);
      const gear2 = this._makeGear(0.75, 0.24);
      gear2.position.set(-0.6, 2.5, -2);

      g.add(phone, gear1, gear2);
      g.userData = { phone, phoneBaseScale: phone.scale.x, screenGlow: phone.userData.glow, gear1, gear2 };
    }

    // ── Slide 1: Problem — fracturing core + shards breaking away LEFT (x ≈ -3) ──
    {
      const g = this.slideGroups[1];
      const CX = -3.0;
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.15, 0),
        new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, metalness: 0.6, roughness: 0.3, flatShading: true, transparent: true, opacity: 0.92 })
      );
      core.position.set(CX, 0, 0);
      const halo = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.5, 0),
        new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true, transparent: true, opacity: 0.14 })
      );
      halo.position.set(CX, 0, 0);
      const shards = [];
      for (let i = 0; i < 7; i++) {
        const s = this._makeCrystalShard(0.5 + Math.random() * 0.5);
        const angle = (i / 7) * Math.PI * 2;
        s.userData = {
          angle, rad: 1.9 + Math.random() * 0.9,
          speed: 0.003 + Math.random() * 0.003,
          spin: (Math.random() - 0.5) * 0.02
        };
        g.add(s);
        shards.push(s);
      }
      g.add(core, halo);
      g.userData = { core, halo, shards, cx: CX };
    }

    // ── Slide 2: Trust gap — cracked icosahedron RIGHT (x ≈ +3.7) ──
    {
      const g = this.slideGroups[2];
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(2.0, 1),
        new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true, transparent: true, opacity: 0.6 })
      );
      mesh.position.set(3.7, 0, 0);
      const inner = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.15, 0),
        new THREE.MeshPhongMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.9, shininess: 90, flatShading: true })
      );
      inner.position.set(3.7, 0, 0);
      const fragments = [];
      for (let i = 0; i < 6; i++) {
        const f = this._makeCrystalShard(0.55);
        f.position.set(3.7 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
        f.userData.floatSpeed = Math.random() * 0.8 + 0.4;
        f.userData.floatOffset = Math.random() * Math.PI * 2;
        g.add(f);
        fragments.push(f);
      }
      g.add(mesh, inner);
      g.userData = { mesh, inner, fragments };
    }

    // ── Slide 3: Definition — large globe + rings, centered ──
    // Camera zooms into it during the → slide 4 transition (_globeZoom).
    {
      const g = this.slideGroups[3];
      const globe = this._makeGlobe(2.4, 3);
      globe.position.set(0, 0, 0);
      g.add(globe);
      const rings = [];
      [
        { r: 3.1, tx:  Math.PI / 6,  speed:  0.0028 },
        { r: 3.6, tx: -Math.PI / 5,  speed: -0.002  },
        { r: 4.1, tx:  Math.PI / 3,  speed:  0.0015 },
      ].forEach(d => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(d.r, 0.018, 8, 80),
          new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.2 })
        );
        ring.rotation.x = d.tx;
        ring.userData.speed = d.speed;
        g.add(ring);
        rings.push(ring);
      });
      g.userData = { globe, rings };
    }

    // ── Slide 4: Solution — neural-network model RIGHT (x ≈ +3.2) ──
    {
      const g = this.slideGroups[4];
      const net = this._makeNeuralNet(2.0);
      net.position.set(3.2, 0, 0);
      g.add(net);
      g.userData = { net, signals: net.userData.signals, nodePos: net.userData.nodePos, edges: net.userData.edges };
    }

    // ── Slide 5: Web3 — wireframe globe + orbiting nodes LEFT (x ≈ -3.5) ──
    {
      const g = this.slideGroups[5];
      const globe = this._makeWireGlobe(2.0, 2, 0.5);
      globe.position.set(-3.5, 0, 0);
      g.add(globe);
      const rings = [];
      [0, 1, 2].forEach(i => {
        const r = new THREE.Mesh(
          new THREE.TorusGeometry(2.4 + i * 0.32, 0.014, 8, 80),
          new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.4 - i * 0.08 })
        );
        r.rotation.x = Math.PI / 2 + (i - 1) * 0.4;
        r.rotation.y = (i * Math.PI) / 7;
        r.position.set(-3.5, 0, 0);
        g.add(r);
        rings.push(r);
      });
      g.userData = { knot: globe, rings };
    }

    // ── Slide 6: Gigidy AI — robot.glb (animated); loaded in _loadRobot() ──
    {
      const g = this.slideGroups[6];
      g.userData = {};
    }

    // ── Slide 7: Platform Features — wireframe globe, centered ──
    // The 7 → 8 transition zooms the camera into this globe.
    {
      const g = this.slideGroups[7];
      const globe = this._makeWireGlobe(2.6, 3, 0.5);
      g.add(globe);
      const rings = [];
      [
        { r: 3.3, tilt: Math.PI / 2,        speed:  0.003 },
        { r: 3.8, tilt: Math.PI / 2 + 0.5,  speed: -0.0024 },
      ].forEach(d => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(d.r, 0.012, 8, 90),
          new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.3 })
        );
        ring.rotation.x = d.tilt;
        ring.userData.speed = d.speed;
        g.add(ring);
        rings.push(ring);
      });
      g.userData = { globe, rings };
    }

    // ── Slide 8: Final — wireframe globe + rings, centered ──
    {
      const g = this.slideGroups[8];
      const globe = this._makeWireGlobe(2.5, 3, 0.55);
      globe.position.set(0, 0, -0.3);
      g.add(globe);
      const rings = [];
      [
        { r: 3.2, tilt: 0,           speed:  0.004 },
        { r: 3.6, tilt: Math.PI / 4, speed: -0.003 },
        { r: 4.0, tilt: Math.PI / 3, speed:  0.002 },
      ].forEach(d => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(d.r, 0.016, 8, 90),
          new THREE.MeshBasicMaterial({ color: 0x151515, transparent: true, opacity: 0.28 })
        );
        ring.rotation.x = d.tilt;
        ring.userData.speed = d.speed;
        g.add(ring);
        rings.push(ring);
      });
      g.userData = { globe, rings };
    }
  }

  // ── Model preloading ───────────────────────────────────────────────
  // Resolves only once every available .glb has fully loaded. If any load
  // fails the returned promise rejects, and the bootstrap keeps the page black.
  _preloadModels() {
    return Promise.all([this._loadPhone(), this._loadRobot()]);
  }

  _loadPhone() {
    return new Promise((resolve, reject) => {
      this.loader.load('phone.glb', gltf => {
        const g = this.slideGroups[0];
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        model.scale.setScalar(4.2 / Math.max(size.x, size.y, size.z));
        model.position.set(-3.0, 0, 0);
        model.rotation.set(0.1, -0.4, 0);
        if (g.userData.phone) g.remove(g.userData.phone);
        g.add(model);
        g.userData.phone = model;
        g.userData.phoneBaseScale = model.scale.x;
        resolve();
      }, undefined, reject);
    });
  }

  _loadRobot() {
    return new Promise((resolve, reject) => {
      this.loader.load('robot.glb', gltf => {
        const g = this.slideGroups[6];
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        model.scale.setScalar(3.6 / Math.max(size.x, size.y, size.z));
        model.position.set(-3.5, -1.2, 0);
        // Restyle the robot per the global ROBOT_STYLE config.
        const silMat = new THREE.MeshBasicMaterial({ color: ROBOT_SILHOUETTE_COLOR });
        model.traverse(o => {
          if (!o.isMesh || !o.material) return;
          if (ROBOT_STYLE === 'silhouette') {
            o.material = silMat;
            return;
          }
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => {
            if (m.color) {
              const lum = 0.299 * m.color.r + 0.587 * m.color.g + 0.114 * m.color.b;
              m.color.setScalar(lum);
            }
            if (m.map) m.map = null;
            if (m.emissive) m.emissive.setScalar(0);
            if (m.metalness !== undefined) m.metalness = Math.min(m.metalness, 0.4);
            m.needsUpdate = true;
          });
        });
        g.add(model);
        g.userData.robot = model;
        // Play the model's built-in animation, if any.
        if (gltf.animations && gltf.animations.length) {
          const mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
          this.mixers.push(mixer);
          g.userData.mixer = mixer;
        }
        resolve();
      }, undefined, reject);
    });
  }

  // ── Per-slide animation updates ────────────────────────────────────
  updateSlide(idx, t) {
    const g = this.slideGroups[idx];
    if (!g || !g.visible) return;
    const d = g.userData;
    const sin = Math.sin, cos = Math.cos;

    switch (idx) {
      case 0:
        if (d.phone) {
          // Gentle presenting tilt + slow orbit sway + breathing float.
          d.phone.rotation.y = -0.35 + sin(t * 0.45) * 0.32;
          d.phone.rotation.x = 0.1 + sin(t * 0.6) * 0.06;
          d.phone.rotation.z = sin(t * 0.35) * 0.03;
          d.phone.position.y = sin(t * 0.8) * 0.14;
          const s = 1 + sin(t * 1.1) * 0.015;
          d.phone.scale.setScalar((d.phoneBaseScale || 1) * s);
        }
        if (d.screenGlow) d.screenGlow.intensity = 1.2 + sin(t * 2) * 0.4;
        if (d.gear1) d.gear1.rotation.z -= 0.003;
        if (d.gear2) d.gear2.rotation.z += 0.003;
        break;

      case 1:
        if (d.core) { d.core.rotation.x += 0.002; d.core.rotation.y += 0.003; }
        if (d.halo) { d.halo.rotation.y -= 0.0015; }
        if (d.shards) d.shards.forEach(s => {
          const u = s.userData;
          u.angle += u.speed;
          const pulse = u.rad + sin(t * 0.6 + u.angle) * 0.25;
          s.position.x = d.cx + cos(u.angle) * pulse;
          s.position.y = sin(u.angle) * pulse * 0.72;
          s.position.z = sin(u.angle * 0.8) * 0.7;
          s.rotation.x += u.spin;
          s.rotation.y += u.spin;
        });
        break;

      case 2:
        if (d.mesh)  { d.mesh.rotation.x  += 0.0006; d.mesh.rotation.y  += 0.001; }
        if (d.inner) { d.inner.rotation.x -= 0.001;  d.inner.rotation.y -= 0.0008; }
        if (d.fragments) d.fragments.forEach(f => {
          f.rotation.x += 0.006; f.rotation.y += 0.004;
          f.position.y += sin(t * f.userData.floatSpeed + f.userData.floatOffset) * 0.002;
        });
        break;

      case 3:
        if (d.globe) { d.globe.rotation.y += 0.005; d.globe.rotation.x += 0.0015; }
        if (d.rings) d.rings.forEach(r => {
          r.rotation.z += r.userData.speed;
          r.rotation.y += r.userData.speed * 0.45;
        });
        break;

      case 4:
        if (d.net) { d.net.rotation.y += 0.004; d.net.rotation.x += 0.0015; }
        if (d.signals && d.nodePos && d.edges) d.signals.forEach((s, i) => {
          const u = s.userData;
          u.t += u.speed;
          if (u.t >= 1) {
            u.t = 0;
            u.from = u.to;
            const options = d.edges.filter(e => e[0] === u.from || e[1] === u.from);
            if (options.length) {
              const e = options[Math.floor(Math.random() * options.length)];
              u.to = e[0] === u.from ? e[1] : e[0];
            } else {
              const e = d.edges[Math.floor(Math.random() * d.edges.length)];
              u.from = e[0]; u.to = e[1];
            }
          }
          const a = d.nodePos[u.from], b = d.nodePos[u.to];
          if (a && b) {
            s.position.lerpVectors(a, b, u.t);
            s.children[1].intensity = 0.3 + sin(t * 3 + i) * 0.15;
          }
        });
        break;

      case 5:
        if (d.knot) { d.knot.rotation.x += 0.004; d.knot.rotation.y += 0.005; }
        if (d.rings) d.rings.forEach((r, i) => {
          r.rotation.z += 0.002 * (i % 2 === 0 ? 1 : -1);
          r.rotation.y += 0.001 * (i + 1);
        });
        break;

      case 6:
        if (d.robot) {
          d.robot.rotation.y = sin(t * 0.4) * 0.3;
          d.robot.position.y = -1.2 + sin(t * 0.9) * 0.08;
        }
        break;

      case 7:
        if (d.globe) { d.globe.rotation.y += 0.004; d.globe.rotation.x += 0.0015; }
        if (d.rings) d.rings.forEach(r => { r.rotation.z += r.userData.speed; });
        break;

      case 8:
        if (d.globe) { d.globe.rotation.y += 0.006; d.globe.rotation.x += 0.002; }
        if (d.rings) d.rings.forEach(r => {
          r.rotation.z += r.userData.speed;
          r.rotation.y += r.userData.speed * 0.5;
        });
        break;
    }
  }

  animate(time) {
    const dt = this.clock.getDelta();
    if (this.mixers) for (const m of this.mixers) m.update(dt);

    this.camera.position.x += (this.mouseX * 0.3 - this.camera.position.x) * 0.04;
    this.camera.position.y += (this.mouseY * 0.2 - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 0, 0);

    if (this.netLines) this.netLines.rotation.y += 0.0004;
    if (this.particles) {
      this.particles.rotation.y += 0.00012;
      this.particles.rotation.x += 0.00006;
    }
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
