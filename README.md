# GIGR — Presentation Website

An animated, single-page pitch deck for **GIGR** ("gigs made frictionless"). Nine full-screen slides driven by a step-based reveal engine, layered over a live Three.js background with per-slide 3D shapes, bloom post-processing, and cinematic transitions.

Built with vanilla ES modules — no build step, no framework, no bundler.

---

## Quick start

ES modules + the import map require serving over `http://` (opening the file directly with `file://` will fail on the module imports):

```bash
# any static server works — pick one
npx serve
# or
python3 -m http.server
```

Then open the printed URL (e.g. `http://localhost:3000`).

---

## Controls

| Action | Input |
| --- | --- |
| Next step / next slide | `→` · `Space` · click **›** · scroll down · swipe left |
| Previous slide | `←` · click **‹** · scroll up · swipe right |
| Jump to slide | Click a progress dot |
| Fullscreen | Top-right button |

Navigation **loops** — pressing next on the final slide wraps to the first, and previous on the first wraps to the last.

Slides reveal their content in **steps**: pressing next first animates in the next element (cards, points, etc.) and only advances to the following slide once a slide's steps are exhausted.

---

## Project structure

| File | Responsibility |
| --- | --- |
| `index.html` | Markup for all 10 slides, nav shell, styling, and the module bootstrap. |
| `scene.js` | `ThreeScene` — WebGL renderer, lights, particle/network background, per-slide 3D objects, and animation loop. |
| `steps.js` | `STEP_CONFIG` / `AUTO_FIRST_STEP` — declarative per-slide reveal steps. |
| `engine.js` | `SlideEngine` — navigation, step firing, and slide transitions. |

```
index.html ──imports──> scene.js  (ThreeScene)
           ──imports──> engine.js (SlideEngine) ──imports──> steps.js, scene.js
```

---

## Dependencies

All loaded from CDN via the import map in `index.html` — nothing to install:

- [three](https://threejs.org/) `0.165.0` — 3D scene + `EffectComposer` / `UnrealBloomPass` post-processing
- [gsap](https://gsap.com/) `3.12.2` + `TextPlugin` — element and transition animation
- Google Fonts — *Space Grotesk*, *JetBrains Mono*

---

## Slides

| # | Slide | 3D object |
| --- | --- | --- |
| 0 | Hero | Phone + background gears |
| 1 | The Real Problem | Fracturing core + floating shards |
| 2 | The Insight | Cracked icosahedron |
| 3 | Definition | Globe *(zooms into slide 4)* |
| 4 | Solution | Neural-network model |
| 5 | Web3 | Wireframe globe + rings |
| 6 | Gigidy AI | Robot (animated glb) |
| 7 | Platform Features | Wireframe globe *(zooms into final)* |
| 8 | Final | Globe + orbiting rings |

---

## Customizing

**Slide copy** — edit the markup in `index.html`. Keep the element `id`s (e.g. `#s2-card0`, `#w3-p1`) intact, since `steps.js` targets them.

**Reveal animations** — edit `STEP_CONFIG` in `steps.js`. Each step is:

```js
{ ids: ['#selector'], type: 'rise', stagger: 0.12 }
```

`type` is one of `rise` · `pop` · `fade` · `glitch` · `typewriter`. `stagger` is the delay (seconds) between multiple `ids` in the same step.

> Note: `glitch` and `typewriter` rewrite an element's `textContent` — only apply them to plain-text elements, not containers with nested HTML.

`AUTO_FIRST_STEP` lists slides whose first step plays automatically on entry.

**3D objects & transitions** — edit `scene.js` (shape builders like `_makeGlobe`, `_makeGear`; per-slide `updateSlide` motion) and `engine.js` (`_globeZoom`, `_vortexTransition`, `_defaultTransition`).

---

## Notes

- Respects `prefers-reduced-motion`.
- Responsive down to mobile; card/feature grids collapse to a single column under 768px.
- No back-end — fully static, deployable to any static host (GitHub Pages, Netlify, Vercel, etc.).
