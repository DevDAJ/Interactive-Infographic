# Color Theory — Interactive Infographic

A **single-page, scroll-based educational experience** about how color works in art and design. There is no backend: everything runs in the browser as static HTML, CSS, TypeScript, and WebGL. The page is structured as stacked sections you scroll through; **GSAP** animates reveals, parallax-style motion, and a “folder” transition between sections, while **native Web Components** power the interactive widgets (wheels, mixer, palettes).

---

## What you’ll find in the page

| Section | What it does |
|--------|----------------|
| **Hero** | Title and introduction with decorative layout and ambient glow. |
| **Color wheel** | `<color-wheel>` — HSV sliders, clickable hue ring, live readout. |
| **Color mixer** | `<color-mixer>` — drag chips into slots A/B, blend, save to a small palette (uses **GSAP Draggable**). |
| **Color harmony** | `<harmony-wheel>` — complementary / analogous / triadic relationships on a 12-step wheel with copy and chips. |
| **Warm & cool** | Static panels explaining temperature and mood. |
| **Color psychology** | Scroll-scrubbed panel: colors and copy cross-fade as you move through the section (**ScrollTrigger** + **TextPlugin**). |
| **Bounce light** | **Three.js** scene on `#bounceScene`: ball, platform, hemisphere + directional lights, colored environment map, draggable camera, pinch zoom on touch, presets. |
| **Additive vs subtractive** | `<palette-row>` strips illustrating RGB vs CMY-style ideas. |

Supporting elements include `<info-card>`, `<color-swatch>`, and `<palette-row>` for reusable UI snippets.

---

## How it’s built (architecture)

1. **`index.html`** — All section markup and copy. The only app script is **`/src/main.ts`** (Vite resolves it in dev/build).
2. **`src/main.ts`** — Imports Web Component modules (side effect: **`customElements.define`**), then **`bounce-light`** and **`gsap-animations`**. Order matters: animations wait for key custom elements via **`customElements.whenDefined`** before fully initializing.
3. **Web Components** — Each widget lives under **`src/components/`** with Shadow DOM for encapsulated styles. They are plain `HTMLElement` subclasses, no framework.
4. **GSAP** — **ScrollTrigger** drives scroll-linked tweens (progress bar, section folder intro, psychology scrub, etc.). **Draggable** is used by the mixer; **TextPlugin** for diff-style text swaps in psychology.
5. **Three.js** — Only the bounce-light demo; **PMREMGenerator** builds a simple environment from sky/platform colors for reflections. Mobile: pointer capture, **`touch-action`**, and viewport/orientation listeners keep the canvas usable.
6. **Styles** — Global look and layout in **`src/css/styles.css`** (linked from `index.html`). Bounce scene injects a small extra style block for touch-friendly rules on narrow screens.

---

## Tech stack

| Piece | Role |
|-------|------|
| **Vite** | Bundles all `.ts` and `.js` source files into optimized production output under **`dist/`**. Dev server provides hot module replacement during development. |
| **TypeScript** | Provides **type safety** during development (strict mode across `src/`) and **backwards compatibility** by compiling modern JS/TS down to widely-supported ES syntax. |
| **GSAP** | Powers scroll-linked animations (**ScrollTrigger**), draggable interactions (**Draggable**), diff-style text transitions (**TextPlugin**), and general-purpose timeline animations. |
| **Three.js** | Renders the 3D bounce-light demo — environment-mapped sphere with dynamic colored lighting, orbit controls, and touch support (`three` + **`@types/three`**). |

---

## Prerequisites

- **Node.js 18+** (LTS recommended)

## Commands

```bash
npm install          # dependencies
npm run dev          # dev server + HMR (http://localhost:5173 by default)
npm run build        # tsc --noEmit, then Vite production build → dist/
npm run preview      # serve dist/ locally
```

---

## Repository layout

| Path | Purpose |
|------|---------|
| `index.html` | Page structure and content |
| `src/css/styles.css` | Global CSS variables, layout, section styles |
| `src/main.ts` | Application entry (imports only) |
| `src/components/` | Custom elements: `color-wheel`, `harmony-wheel`, `color-mixer`, `palette-row`, `color-swatch`, `info-card` |
| `src/js/bounce-light.ts` | Three.js + pointer/touch controls for `#bounceScene` |
| `src/js/gsap-animations.ts` | ScrollTrigger and other timeline setup |
| `vite.config.ts` | Build configuration |

---

## Deploying

Run **`npm run build`** and upload **`dist/`** to any static host (Netlify, GitHub Pages, S3, etc.). **`base`** is set to **`./`** so asset URLs work from arbitrary paths; for a subdirectory deployment you may still want to align **`base`** with [Vite’s `base` option](https://vite.dev/config/shared-options.html#base).

---

## Accessibility note

Several animations respect **`prefers-reduced-motion`** (folder stack, some hover tweaks, harmony-wheel tweens). Users who rely on reduced motion get simplified or static behavior where that hook exists.
