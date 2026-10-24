# 09 — Design

## Brand Colors

### Primary palette (from `tailwind.config.js:7-46`)

**Ink (dark/neutral):**
| Shade | Hex | Semantic role |
|---|---|---|
| ink-950 | `#0D0C0B` | App background (darkest) |
| ink-900 | `#0E0E18` | Panel background |
| ink-850 | `#13131F` | Card background (glass-card) |
| ink-800 | `#181826` | Input/button-secondary background |
| ink-750 | `#1E1E2E` | — |
| ink-700 | `#262636` | Active tab, scrollbar |
| ink-600 | `#34344A` | Hover state |
| ink-500 | `#4E4E68` | Muted text (secondary) |
| ink-400 | `#71718A` | Muted text (primary) |
| ink-300 | `#9A9AB0` | — |
| ink-200 | `#C7CBD1` | Light text |
| ink-100 | `#E8EAEE` | Body text (near-white) |

**Electric (primary blue):**
| Shade | Hex | Semantic role |
|---|---|---|
| electric DEFAULT | `#4D7CFE` | Primary action color |
| electric-50 | `#EEF2FF` | — |
| electric-500 | `#4D7CFE` | Button gradient top, links |
| electric-600 | `#3A66E8` | Button gradient bottom |
| electric-700 | `#2D51C9` | Deep accent |

**Magenta (accent/danger):**
| Shade | Hex | Semantic role |
|---|---|---|
| magenta DEFAULT | `#FF3D9A` | Danger, delete, reject |
| magenta-500 | `#FF3D9A` | btn-danger background tint |

**Additional semantic colors (from `src/index.css` utility classes):**
| Color | Hex | Semantic role |
|---|---|---|
| amber-400 | Tailwind default | Premium badges, gold accent |
| emerald-400 | Tailwind default | Success, approve |
| sky-400 | Tailwind default | Info accent |
| orange-400 | Tailwind default | Warning/ban |
| violet-400 | Tailwind default | Game session accent |

### CSS Variables (`src/index.css:8-22`)
```css
:root {
  --ink-950: #0D0C0B;
  --ink-900: #0E0E18;
  --ink-850: #13131F;
  --ink-800: #181826;
  --ink-700: #262636;
  --ink-600: #34344A;
  --ink-500: #4E4E68;
  --ink-400: #71718A;
  --ink-300: #9A9AB0;
  --ink-200: #C7CBD1;
  --ink-100: #E8EAEE;
  --electric: #4D7CFE;
  --magenta: #FF3D9A;
}
```

## Font Stack

**From `tailwind.config.js:48-52`:**
```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
},
```

**Loaded from Google Fonts** — `index.html:30` and `src/index.css:1`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
```

Weights used: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold).

## Logo & Icons

- **Logo:** Lucide `Disc3` icon (vinyl record) used in a gradient container. See `App.tsx:37`, `AuthScreen.tsx:44`, `AdminPage.tsx:241`.
- **Favicon:** `public/favicon.svg` (SVG), plus PNG variants in multiple sizes.
- **PWA icons:** `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`.
- **Icon library:** `lucide-react ^0.446.0` (`package.json:15`) — used throughout all components.

## Spacing Scale

Uses Tailwind's default 4px-based spacing system (1 unit = 0.25rem = 4px). No custom spacing override in `tailwind.config.js`.

The design follows an **8px spacing system**: components use `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-5` (20px), `p-6` (24px), `p-8` (32px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px).

## Border Radius Scale

Tailwind defaults used: `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full` (9999px). No custom radius override in config.

## Key Component Styles

All defined in `src/index.css:46-200` (`@layer components`):

### Buttons
- **`.btn-primary`** (line 69-75): Electric gradient, white text, rounded-xl, active scale, shadow
- **`.btn-secondary`** (line 77-82): Ink-800 background, ink-200 text, border, hover ink-700
- **`.btn-ghost`** (line 84-88): Transparent, ink-400 text, hover white text + bg tint
- **`.btn-danger`** (line 90-95): Magenta tint, magenta text, magenta border
- **`.btn-icon`** (line 97-100): Small padding, icon-only, hover bg tint

### Surfaces
- **`.glass-card`** (line 48-49): `bg-ink-850/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl`
- **`.glass-card-hover`** (line 52-53): glass-card + hover border/bg change
- **`.glass-panel`** (line 56-58): `bg-ink-900/90 backdrop-blur-2xl border`

### Inputs
- **`.input-field`** (line 108-113): Full width, ink-800 bg, white/[0.06] border, electric focus ring, rounded-xl
- **`.input-sm`** (line 115-120): Smaller variant

### Badges
- **`.badge-gold`** (line 136): amber-500/15 bg, amber-400 text
- **`.badge-green`** (line 137): emerald-500/15 bg, emerald-400 text
- **`.badge-blue`** (line 138): electric-500/15 bg, electric-400 text
- **`.badge-red`** (line 139): magenta-500/15 bg, magenta-400 text
- **`.badge-muted`** (line 140): white/[0.06] bg, ink-400 text

### Text
- **`.text-muted`** (line 123): `color: var(--ink-400)` — `#71718A`
- **`.text-muted-2`** (line 124): `color: var(--ink-500)` — `#4E4E68`
- **`.text-electric`** (line 125): `color: var(--electric)` — `#4D7CFE`
- **`.text-magenta`** (line 126): `color: var(--magenta)` — `#FF3D9A`

## Theme

**Dark only.** No light mode, no theme toggle. The entire app uses the dark ink palette. The `<body>` background is `bg-ink-950` (`index.css:25`), and `theme-color` is `#0D0C0B` (`index.html:11`).

## Animations

From `tailwind.config.js:53-77`:
- `fade-in`: 0.3s ease-out
- `slide-up`: 0.35s cubic-bezier(0.16, 1, 0.3, 1)
- `slide-down`: 0.3s ease-out
- `scale-in`: 0.2s cubic-bezier(0.16, 1, 0.3, 1)
- `slide-right`: 0.3s cubic-bezier(0.16, 1, 0.3, 1)
- `shimmer`: 2s linear infinite (skeleton loading)
- `eq-bounce`: 0.8s ease-in-out infinite (equalizer bars / now playing indicator)
- `pulse-glow`: 2s ease-in-out infinite (ambient glow effect)
- `spin-slow`: 3s linear infinite (vinyl logo rotation)

## Safe Area CSS

`src/index.css:253-256`:
```css
@supports (padding: max(0px)) {
  .safe-bottom { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
  .safe-top { padding-top: max(1rem, env(safe-area-inset-top)); }
}
```

## Reduced Motion

`src/index.css:244-249`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Range Input Styling

Custom range slider styles in `src/index.css:208-241` — 4px height track, 14px circular thumb with electric-500/20 hover glow.

## Scrollbar

Thin 6px scrollbar with ink-700 thumb (`src/index.css:31-39`).
