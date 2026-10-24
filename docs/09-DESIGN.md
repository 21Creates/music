# 09 — Design

## Color Palette (`tailwind.config.js:7-46`)

### Ink (dark/neutral)
| Shade | Hex | Role |
|---|---|---|
| ink-950 | `#0D0C0B` | App background |
| ink-900 | `#0E0E18` | Panel background |
| ink-850 | `#13131F` | Card background (glass-card) |
| ink-800 | `#181826` | Input/button-secondary bg |
| ink-700 | `#262636` | Active tab, scrollbar |
| ink-600 | `#34344A` | Hover state |
| ink-500 | `#4E4E68` | Muted text (secondary) |
| ink-400 | `#71718A` | Muted text (primary) |
| ink-200 | `#C7CBD1` | Light text |
| ink-100 | `#E8EAEE` | Body text (near-white) |

### Electric (primary blue)
| Shade | Hex | Role |
|---|---|---|
| electric-500 | `#4D7CFE` | Button gradient top, links |
| electric-600 | `#3A66E8` | Button gradient bottom |

### Magenta (accent/danger)
`#FF3D9A` — danger, delete, reject

### Additional semantic colors
amber-400 (premium), emerald-400 (success), sky-400 (info), orange-400 (warning), violet-400 (games)

## Fonts (`tailwind.config.js:48-52`)
- **Sans/Display:** Inter (400, 500, 600, 700, 800) — Google Fonts
- **Mono:** JetBrains Mono (500, 700)

## Logo and Icons
- **Logo:** Lucide `Disc3` icon in gradient container
- **Favicon:** `public/favicon.svg` + PNG variants
- **PWA icons:** 192px, 512px, maskable-512px
- **Icon library:** `lucide-react ^0.446.0`

## Spacing
Tailwind default 4px-based (8px system in practice: p-2, p-3, p-4, p-5, p-6, p-8)

## Component Styles (`src/index.css:46-200`)
| Class | Description |
|---|---|
| `.btn-primary` | Electric gradient, white text, active scale |
| `.btn-secondary` | Ink-800 bg, border, hover ink-700 |
| `.btn-ghost` | Transparent, hover bg tint |
| `.btn-danger` | Magenta tint, magenta text/border |
| `.glass-card` | `bg-ink-850/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl` |
| `.glass-panel` | `bg-ink-900/90 backdrop-blur-2xl border` |
| `.input-field` | Full width, ink-800 bg, electric focus ring |
| `.badge-gold/green/blue/red/muted` | Colored badge variants |
| `.text-muted` / `.text-muted-2` | ink-400 / ink-500 text colors |

## Theme
**Dark only.** No light mode, no toggle. `<body>` is `bg-ink-950`, `theme-color` is `#0D0C0B`.

## Animations (`tailwind.config.js:53-77`)
`fade-in` (0.3s), `slide-up` (0.35s), `slide-down` (0.3s), `scale-in` (0.2s), `shimmer` (2s infinite), `eq-bounce` (0.8s infinite), `pulse-glow` (2s infinite), `spin-slow` (3s infinite)

## Safe Area (`src/index.css:253-256`)
`.safe-bottom` and `.safe-top` using `env(safe-area-inset-*)`

## Reduced Motion (`src/index.css:244-249`)
All animations/transitions reduced to 0.01ms when `prefers-reduced-motion: reduce`

## Scrollbar
6px thin, ink-700 thumb (`src/index.css:31-39`)

## Range Input
Custom 4px track, 14px circular thumb with electric glow (`src/index.css:208-241`)
