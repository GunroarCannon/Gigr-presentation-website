// engine.js — Slide Engine for GIGR
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.2/src/index.js';
import { TextPlugin } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.2/src/TextPlugin.js';
import { TOTAL_SLIDES } from './scene.js';
import { STEP_CONFIG, AUTO_FIRST_STEP, AUTO_ADVANCE_STEPS } from './steps.js';
import * as THREE from 'three';

gsap.registerPlugin(TextPlugin);

// Forward (dir = +1) transition per slide pair, keyed "from->to".
// Goal: each advance feels distinct — not just zoom or slide. Anything not
// listed (and all backward navigation) uses the default morph transition.
//   globeZoom   — full camera zoom into a shared globe, cuts to next scene
//   partialZoom — camera dollies partway in, then eases back (no full cut)
//   vortex      — spin + collapse old, elastic expand new
//   fade        — near-static cross-fade (minimal movement)
const FORWARD_TRANSITIONS = {
  '0->1': 'partialZoom',
  '1->2': 'vortex',
  '2->3': 'fade',
  '3->4': 'globeZoom',
  '4->5': 'vortex',
  '5->6': 'fade',
  '6->7': 'partialZoom',
  '7->8': 'globeZoom',
  '8->9': 'fade',
  '9->10': 'globeZoom',
  '10->0': 'fade',
};

// Animation runners for each step type
function runStepType(el, type) {
  if (!el) return;
  el.style.visibility = 'visible';
  switch (type) {
    case 'rise':
      gsap.fromTo(el,
        { opacity: 0, y: 28, skewY: 1.5 },
        { opacity: 1, y: 0, skewY: 0, duration: 0.55, ease: 'power3.out' }
      );
      break;
    case 'pop':
      gsap.fromTo(el,
        { opacity: 0, scale: 0.88 },
        { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }
      );
      break;
    case 'fade':
      gsap.fromTo(el,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' }
      );
      break;
    case 'glitch':
      glitchIn(el);
      break;
    case 'instant':
      gsap.set(el, { opacity: 1, scale: 1, y: 0, skewY: 0 });
      break;
    case 'typewriter':
      // handled separately
      break;
  }
}

function glitchIn(el) {
  const original = el.textContent;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let iterations = 0;
  const total = 12;
  gsap.set(el, { opacity: 1, visibility: 'visible' });
  const interval = setInterval(() => {
    el.textContent = original.split('').map((c, i) => {
      if (c === ' ' || c === '\n') return c;
      if (i < iterations) return original[i];
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    iterations += 1.2;
    if (iterations >= original.length) {
      el.textContent = original;
      clearInterval(interval);
    }
  }, 40);
}

// Hero logo: large brand mark anchored in the top-right corner, resting
// partially off-screen (never fully revealed). It drifts gently into place.
function runHeroLogo(el) {
  el.style.visibility = 'visible';
  gsap.fromTo(el,
    { opacity: 0, x: () => window.innerWidth * 0.16, y: () => -window.innerHeight * 0.1, scale: 1.08 },
    { opacity: 1, x: 0, y: 0, scale: 1, duration: 1.1, ease: 'power3.out' }
  );
}

function runTypewriter(tagEl, cursorEl, text, speed = 45) {  tagEl.textContent = '';
  gsap.set(tagEl.parentElement, { opacity: 1, visibility: 'visible' });
  cursorEl.style.display = 'inline-block';
  let i = 0;
  const interval = setInterval(() => {
    tagEl.textContent += text[i];
    i++;
    if (i >= text.length) clearInterval(interval);
  }, speed);
}

// ── SlideEngine ────────────────────────────────────────────────────────
export class SlideEngine {
  constructor(threeScene) {
    this.scene = threeScene;
    this.current = 0;
    this.total = TOTAL_SLIDES;
    this.transitioning = false;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.stepIndex = new Array(TOTAL_SLIDES).fill(0);
    this._initDots();
    this._initNav();
    this._prepareAll();
    setTimeout(() => this._entryAnimate(0), 400);
    this._loop();
  }

  // ── Dots & nav ───────────────────────────────────────────────────────
  _initDots() {
    const c = document.getElementById('progress-dots');
    c.innerHTML = '';
    for (let i = 0; i < this.total; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      d.tabIndex = 0;
      d.setAttribute('aria-label', `Slide ${i + 1}`);
      d.addEventListener('click', () => this.goTo(i));
      c.appendChild(d);
    }
  }

  _initNav() {
    document.getElementById('btn-next').addEventListener('click', () => this.next());
    document.getElementById('btn-prev').addEventListener('click', () => this.prev());

    // Keyboard + presentation-clicker keys. Most remotes emit PageDown/PageUp;
    // arrows and spacebar cover laptops and the rest.
    const NEXT_KEYS = ['PageDown', 'ArrowRight', 'ArrowDown', ' ', 'Spacebar'];
    const PREV_KEYS = ['PageUp', 'ArrowLeft', 'ArrowUp'];
    document.addEventListener('keydown', e => {
      if (NEXT_KEYS.includes(e.key)) { e.preventDefault(); this.next(); }
      else if (PREV_KEYS.includes(e.key)) { e.preventDefault(); this.prev(); }
    });

    let wheelLock = false;
    document.addEventListener('wheel', e => {
      if (wheelLock) return;
      wheelLock = true; setTimeout(() => wheelLock = false, 850);
      if (e.deltaY > 0) this.next(); else this.prev();
    }, { passive: true });

    let tx = 0, ty = 0;
    document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', e => {
      const dx = tx - e.changedTouches[0].clientX, dy = ty - e.changedTouches[0].clientY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) { if (dx > 0) this.next(); else this.prev(); }
    });

    // Tap/click on empty screen area: left half → previous, right half → next.
    // Ignores interactive elements so buttons, links and dots keep working.
    document.addEventListener('click', e => {
      if (e.target.closest('a, button, input, textarea, select, label, [role="button"], .nav-btn, .dot, #fullscreen-btn')) return;
      if (e.clientX < window.innerWidth / 2) this.prev(); else this.next();
    });

    document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        document.getElementById('fs-expand').style.display = 'none';
        document.getElementById('fs-compress').style.display = 'block';
      } else {
        document.exitFullscreen();
        document.getElementById('fs-expand').style.display = 'block';
        document.getElementById('fs-compress').style.display = 'none';
      }
    });
  }

  // ── Step management ──────────────────────────────────────────────────
  _prepareAll() {
    for (let i = 0; i < this.total; i++) {
      this.stepIndex[i] = 0;
      const cfg = STEP_CONFIG[i];
      if (!cfg) continue;
      cfg.steps.forEach(step => {
        step.ids.forEach(id => {
          const el = document.querySelector(id);
          if (el) { gsap.set(el, { opacity: 0 }); el.style.visibility = 'hidden'; }
        });
      });
    }
    // Slide 0 special resets
    this._resetSlide0();
  }

  _resetSlide0() {
    const brand = document.getElementById('s1-brand');
    const tagline = document.getElementById('s1-tagline');
    const tagText = document.getElementById('s1-tagline-text');
    const cursor = document.getElementById('s1-cursor');
    if (brand) { gsap.set(brand, { y: 30, opacity: 0 }); brand.style.visibility = 'hidden'; }
    if (tagline) { gsap.set(tagline, { opacity: 0 }); tagline.style.visibility = 'hidden'; }
    if (tagText) tagText.textContent = '';
    if (cursor) cursor.style.display = 'none';
  }

  _resetSlide(idx) {
    this.stepIndex[idx] = 0;
    const cfg = STEP_CONFIG[idx];
    if (!cfg) return;
    cfg.steps.forEach(step => {
      step.ids.forEach(id => {
        const el = document.querySelector(id);
        if (el) { gsap.set(el, { opacity: 0, y: 0, scale: 1, skewY: 0 }); el.style.visibility = 'hidden'; }
      });
    });
    if (idx === 0) this._resetSlide0();
  }

  _fireStep(slideIdx, stepIdx) {
    const cfg = STEP_CONFIG[slideIdx];
    if (!cfg || stepIdx >= cfg.steps.length) return false;
    const step = cfg.steps[stepIdx];
    step.ids.forEach((id, i) => {
      const el = document.querySelector(id);
      if (!el) return;
      const delay = step.stagger * i;
      if (id === '#s1-logo') {
        setTimeout(() => runHeroLogo(el), delay * 1000);
        return;
      }
      if (step.type === 'typewriter') {
        setTimeout(() => {
          const tagText = document.getElementById('s1-tagline-text');
          const cursor = document.getElementById('s1-cursor');
          if (tagText && cursor) runTypewriter(tagText, cursor, 'GIGS MADE FRICTIONLESS.', 48);
        }, delay * 1000);
        return;
      }
      setTimeout(() => runStepType(el, step.type), delay * 1000);
    });
    return true;
  }

  _entryAnimate(idx) {
    this.stepIndex[idx] = 0;
    if (AUTO_FIRST_STEP.has(idx)) {
      this._fireStep(idx, 0);
      this.stepIndex[idx] = 1;
    }
    
    if (AUTO_ADVANCE_STEPS) {
      const runNext = () => {
        if (this.current !== idx) return;
        const cfg = STEP_CONFIG[idx];
        if (!cfg) return;
        const stepsLeft = cfg.steps.length - this.stepIndex[idx];
        if (stepsLeft > 0) {
          this._fireStep(idx, this.stepIndex[idx]);
          this.stepIndex[idx]++;
          setTimeout(runNext, 400); // 400ms between automatic reveals
        }
      };
      setTimeout(runNext, 400);
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────
  next() {
    const si = this.current;
    const cfg = STEP_CONFIG[si];
    const stepsLeft = cfg ? cfg.steps.length - this.stepIndex[si] : 0;
    if (stepsLeft > 0) {
      this._fireStep(si, this.stepIndex[si]);
      this.stepIndex[si]++;
    } else {
      const next = (si + 1) % this.total;
      this._transitionTo(next, 1);
    }
  }

  prev() {
    const prev = (this.current - 1 + this.total) % this.total;
    this._transitionTo(prev, -1);
  }

  goTo(index) {
    if (this.transitioning || index === this.current) return;
    this._transitionTo(index, index > this.current ? 1 : -1);
  }

  // ── Transitions ───────────────────────────────────────────────────────
  _transitionTo(newIdx, dir) {
    if (this.transitioning) return;
    this.transitioning = true;

    const slides = document.querySelectorAll('.slide');
    const oldEl = slides[this.current];
    const newEl = slides[newIdx];
    const oldGroup = this.scene.slideGroups[this.current];
    const newGroup = this.scene.slideGroups[newIdx];

    this._resetSlide(newIdx);

    const args = [oldEl, newEl, oldGroup, newGroup, newIdx];

    // Reduced motion: minimal cross-fade everywhere.
    if (this.reducedMotion) { this._fadeTransition(...args); return; }

    // Backward navigation stays simple and reversible.
    if (dir !== 1) { this._defaultTransition(...args, dir); return; }

    // Forward: pick a distinct transition per slide pair.
    const kind = FORWARD_TRANSITIONS[`${this.current}->${newIdx}`] || 'default';
    switch (kind) {
      case 'globeZoom':   this._globeZoom(...args); break;
      case 'partialZoom': this._partialZoomTransition(...args); break;
      case 'vortex':      this._vortexTransition(...args); break;
      case 'fade':        this._fadeTransition(...args); break;
      default:            this._defaultTransition(...args, dir);
    }
  }

  _defaultTransition(oldEl, newEl, oldGroup, newGroup, newIdx, dir) {
    const exitX = dir * -40;
    const enterX = dir * 40;

    const tl = gsap.timeline({ onComplete: () => this._finishTransition(newIdx) });

    // Exit old 3D group
    gsap.to(oldGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.5, ease: 'power3.in', onComplete: () => oldGroup.visible = false });

    // Exit old slide HTML
    tl.to(oldEl, {
      opacity: 0, x: exitX, scale: 0.96, rotateY: dir * 4,
      duration: 0.48, ease: 'power3.in'
    }, 0);

    // Swap
    tl.call(() => {
      oldEl.classList.remove('active');
      gsap.set(oldEl, { display: 'none', x: 0, scale: 1, rotateY: 0, opacity: 0 });
      newEl.classList.add('active');
      gsap.set(newEl, { display: 'flex', opacity: 0, x: enterX, scale: 1.04, rotateY: dir * -4 });
      newGroup.scale.set(0.001, 0.001, 0.001);
      newGroup.visible = true;
      gsap.to(newGroup.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'elastic.out(1, 0.65)' });
    }, [], 0.45);

    // Enter new slide HTML
    tl.to(newEl, {
      opacity: 1, x: 0, scale: 1, rotateY: 0,
      duration: 0.52, ease: 'power3.out'
    }, 0.47);
  }

  _globeZoom(oldEl, newEl, oldGroup, newGroup, newIdx) {
    // Camera zooms toward the torusknot/globe on slide 3, then cuts to slide 4
    const cam = this.scene.camera;
    const originalPos = cam.position.clone();
    const targetZ = 1.5; // zoom in close

    const tl = gsap.timeline({
      onComplete: () => {
        oldEl.classList.remove('active');
        gsap.set(oldEl, { display: 'none', opacity: 0, scale: 1 });
        oldGroup.visible = false;
        newEl.classList.add('active');
        gsap.set(newEl, { display: 'flex', opacity: 0 });
        newGroup.scale.set(1, 1, 1);
        newGroup.visible = true;
        gsap.to(newEl, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        gsap.to(cam.position, { x: 0, y: 0, z: 5, duration: 0.7, ease: 'power2.out' });
        this._finishTransition(newIdx);
      }
    });

    tl.to(cam.position, { z: targetZ, duration: 0.9, ease: 'power3.inOut' }, 0);
    tl.to(oldEl, { opacity: 0, scale: 1.06, duration: 0.65, ease: 'power2.in' }, 0.25);
    tl.to(oldGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.3 }, 0.5);
  }

  _vortexTransition(oldEl, newEl, oldGroup, newGroup, newIdx) {
    // Spin + collapse old slide, then expand new
    const tl = gsap.timeline({
      onComplete: () => {
        oldEl.classList.remove('active');
        gsap.set(oldEl, { display: 'none', opacity: 0, scale: 1, rotation: 0 });
        oldGroup.visible = false;
        newEl.classList.add('active');
        gsap.set(newEl, { display: 'flex', opacity: 0, scale: 0.6 });
        newGroup.scale.set(0.001, 0.001, 0.001);
        newGroup.visible = true;
        gsap.to(newGroup.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'elastic.out(1, 0.6)' });
        gsap.to(newEl, { opacity: 1, scale: 1, duration: 0.65, ease: 'back.out(1.4)' });
        this._finishTransition(newIdx);
      }
    });

    gsap.to(oldGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.55, ease: 'power3.in', onComplete: () => oldGroup.visible = false });
    tl.to(oldEl, { opacity: 0, scale: 0.7, rotation: 8, duration: 0.55, ease: 'power3.in' }, 0);
  }

  _fadeTransition(oldEl, newEl, oldGroup, newGroup, newIdx) {
    // Near-static cross-fade — the "barely a transition" option. No X translate,
    // no rotation; 3D groups just cross-scale gently in place.
    const tl = gsap.timeline({ onComplete: () => this._finishTransition(newIdx) });

    gsap.to(oldGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.45, ease: 'power2.in', onComplete: () => oldGroup.visible = false });
    tl.to(oldEl, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 0);

    tl.call(() => {
      oldEl.classList.remove('active');
      gsap.set(oldEl, { display: 'none', opacity: 0, x: 0, scale: 1, rotateY: 0 });
      newEl.classList.add('active');
      gsap.set(newEl, { display: 'flex', opacity: 0, x: 0, scale: 1 });
      newGroup.scale.set(0.001, 0.001, 0.001);
      newGroup.visible = true;
      gsap.to(newGroup.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'power2.out' });
    }, [], 0.4);

    tl.to(newEl, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.42);
  }

  _partialZoomTransition(oldEl, newEl, oldGroup, newGroup, newIdx) {
    // Camera dollies partway toward the scene, swaps content, then eases back
    // out — a zoom that is NOT completely a cut to a new scene.
    const cam = this.scene.camera;
    const tl = gsap.timeline({ onComplete: () => this._finishTransition(newIdx) });

    tl.to(cam.position, { z: 3.4, duration: 0.42, ease: 'power2.in' }, 0);
    tl.to(oldEl, { opacity: 0, scale: 1.05, duration: 0.4, ease: 'power2.in' }, 0);
    gsap.to(oldGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.4, ease: 'power2.in', onComplete: () => oldGroup.visible = false });

    tl.call(() => {
      oldEl.classList.remove('active');
      gsap.set(oldEl, { display: 'none', opacity: 0, x: 0, scale: 1, rotateY: 0 });
      newEl.classList.add('active');
      gsap.set(newEl, { display: 'flex', opacity: 0, scale: 0.98 });
      newGroup.scale.set(0.001, 0.001, 0.001);
      newGroup.visible = true;
      gsap.to(newGroup.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.3)' });
    }, [], 0.4);

    tl.to(cam.position, { z: 5, duration: 0.6, ease: 'power2.out' }, 0.42);
    tl.to(newEl, { opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out' }, 0.44);
  }

  _finishTransition(newIdx) {
    this.transitioning = false;
    this.current = newIdx;
    this._updateNav();
    this._entryAnimate(newIdx);

    // Per-slide camera position hints
    const camHints = [
      { x: 0, y: 0, z: 5 }, { x: -0.2, y: 0, z: 5 }, { x: 0, y: 0, z: 5 },
      { x: 0.25, y: -0.1, z: 5 }, { x: -0.25, y: 0, z: 5 }, { x: 0.2, y: 0, z: 5 },
      { x: -0.2, y: 0, z: 5 }, { x: 0, y: 0, z: 5 }, { x: 0, y: 0.05, z: 5 },
      { x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 5 }
    ];
    const h = camHints[newIdx] || { x: 0, y: 0, z: 5 };
    gsap.to(this.scene.camera.position, { x: h.x, y: h.y, z: h.z, duration: 0.7, ease: 'power2.inOut' });
  }

  _updateNav() {
    const counter = document.getElementById('slide-counter');
    if (counter) counter.textContent = `${String(this.current + 1).padStart(2, '0')} / ${String(this.total).padStart(2, '0')}`;
    document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === this.current));
  }

  _loop() {
    const tick = (time) => {
      this.scene.animate(time);
      this.scene.updateSlide(this.current, time * 0.001);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}