# IntelRadar redesign: how to apply

## 1. Copy the components
Copy every `.tsx` file in this folder over the matching file in your
`components/dashboard/` folder. `motion.tsx`, `hooks.ts` and
`capture-dialog.tsx` are unchanged, so leave yours as they are.

Changed: `activity-panel`, `changes-panel`, `comparison-panel`, `dashboard`,
`features-panel`, `news-panel`, `overview`, `positioning-map`, `pricing-panel`,
`primitives`, `rivals-bar`, `scan-dialog`, `sentiment-panel`, `stat-card`,
`swot-panel`, `threat-breakdown`, `topbar`.

## 2. Merge the palette into `globals.css`
Open `theme.css`. Replace the values inside your existing `:root { }` and
`.dark { }` blocks with the ones in the file, then paste the two utilities at
the bottom (`.bg-atmosphere`, `.dot-grid`). Keep your `.reveal` and
`.status-dot` rules.

Palette (light mode): page `#F1F6F6`, ink `#14303A`, primary persian green
`#1F7A70`, saffron `#E0A02F`, coral `#E76F51`, steel blue `#3B78A8`, violet `#8160C9`.
It is the Coolors set 264653 / 2A9D8F / E9C46A / F4A261 / E76F51 with the green
and coral deepened for text contrast.

## 3. Optional: fonts
The components still use your existing `font-display` class. For a sharper
heading face, load Bricolage Grotesque with `next/font/google` in `layout.tsx`
and point `--font-display` at it.

## What changed
- Light palette above, with a matching dark mode
- Logo mark, pill section tabs, status chip in the header
- Panels have tinted icon chips, two-layer shadows and softer hover states
- Hero: category and threat chips, button-style links, "Biggest opening" callout card
- KPI tiles with icons, a 270 degree dial for the threat score
- Positioning map shades the strong-on-both quadrant
- Competitive position deltas are coloured: red when the rival is ahead, green when behind
- Empty state with a radar sweep and step cards
