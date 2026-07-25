// steps.js — Step Animation Config for GIGR
// Each slide has an array of steps. Each step has:
//   ids: CSS selectors to reveal
//   type: 'fade' | 'rise' | 'pop' | 'typewriter' | 'glitch'
//   stagger: delay between elements (seconds)

export const STEP_CONFIG = [
  // Slide 0 — Hero
  {
    steps: [
      { ids: ['#s1-logo', '#s1-brand'], type: 'rise',       stagger: 0.08 },
      { ids: ['#s1-tagline'],      type: 'typewriter', stagger: 0 },
    ]
  },
  // Slide 1 — Problem stories
  {
    steps: [
      { ids: ['#s2-title', '#s2-body'], type: 'rise', stagger: 0.1 },
      { ids: ['#s2-card0'],             type: 'instant', stagger: 0 },
      { ids: ['#s2-card1'],             type: 'instant', stagger: 0 },
      { ids: ['#s2-card2'],             type: 'instant', stagger: 0 },
    ]
  },
  // Slide 2 — Trust Gap
  {
    steps: [
      { ids: ['#s6-title', '#s6-body'], type: 'rise', stagger: 0.1 },
      { ids: ['#s6-card0'],             type: 'instant',  stagger: 0 },
      { ids: ['#s6-card1'],             type: 'instant',  stagger: 0 },
      { ids: ['#s6-card2'],             type: 'instant',  stagger: 0 },
    ]
  },
  // Slide 3 (Was 4) — Solution
  {
    steps: [
      { ids: ['#s5-title', '#s5-sub'], type: 'rise', stagger: 0.1 },
      { ids: ['#s5-card0'],            type: 'instant', stagger: 0 },
      { ids: ['#s5-card1'],            type: 'instant', stagger: 0 },
      { ids: ['#s5-card2'],            type: 'instant', stagger: 0 },
    ]
  },
  // Slide 4 (Was 7) — Platform Features
  {
    steps: [
      { ids: ['#s8-title'],  type: 'rise', stagger: 0 },
      { ids: ['#s8-col0'],   type: 'instant',  stagger: 0 },
      { ids: ['#s8-col1'],   type: 'instant',  stagger: 0 },
      { ids: ['#s8-col2'],   type: 'instant',  stagger: 0 },
      { ids: ['#s8-badge'],  type: 'fade', stagger: 0 },
    ]
  },
  // Slide 5 (Was 5) — Web3 Power
  {
    steps: [
      { ids: ['#w3-title'],              type: 'rise', stagger: 0 },
      { ids: ['#w3-label1', '#w3-intro'], type: 'fade', stagger: 0.08 },
      { ids: ['#w3-label2'],             type: 'fade', stagger: 0 },
      { ids: ['#w3-p0'],                 type: 'rise', stagger: 0 },
      { ids: ['#w3-p1'],                 type: 'rise', stagger: 0 },
      { ids: ['#w3-p2'],                 type: 'rise', stagger: 0 },
    ]
  },
  // Slide 6 (Was 6) — Gigidy AI
  {
    steps: [
      { ids: ['#ai-title', '#ai-intro'], type: 'rise', stagger: 0.1 },
      { ids: ['#ai-p0'],                 type: 'rise', stagger: 0 },
      { ids: ['#ai-p1'],                 type: 'rise', stagger: 0 },
      { ids: ['#ai-p2'],                 type: 'rise', stagger: 0 },
    ]
  },
  // Slide 7 (Was 3) — Definition
  {
    steps: [
      { ids: ['#def-eyebrow'],  type: 'fade', stagger: 0 },
      { ids: ['#def-word'],     type: 'rise', stagger: 0 },
      { ids: ['#def-phonetic'], type: 'fade', stagger: 0 },
      { ids: ['#def-meaning'],  type: 'fade', stagger: 0 },
      { ids: ['#def-foot'],     type: 'fade', stagger: 0 },
    ]
  },
  // Slide 8 — Business Model
  {
    steps: [
      { ids: ['#bm-title', '#bm-sub'], type: 'rise', stagger: 0.1 },
      { ids: ['#bm-table'],            type: 'fade', stagger: 0 },
    ]
  },
  // Slide 9 — Competitive Landscape
  {
    steps: [
      { ids: ['#cl-title', '#cl-sub'], type: 'rise', stagger: 0.1 },
      { ids: ['#cl-table'],            type: 'fade', stagger: 0 },
    ]
  },
  // Slide 10 — Demo Video
  {
    steps: []
  },
  // Slide 11 — Final
  {
    steps: [
      { ids: ['#final-eyebrow'], type: 'fade', stagger: 0 },
      { ids: ['#final-word'],    type: 'rise', stagger: 0 },
      { ids: ['#final-sub'],     type: 'fade', stagger: 0 },
      { ids: ['#final-tags'],    type: 'pop',  stagger: 0 },
    ]
  },
];

export const AUTO_FIRST_STEP = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

// Toggle to automatically advance all steps on a slide without clicking
export const AUTO_ADVANCE_STEPS = true;