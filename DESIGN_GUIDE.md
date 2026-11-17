# FlightSentry Design System & Brand Guide

*Version: 1.0 (Baseline for FlightSentry v0.9.5+ and Sister Applications)*

## 1. Purpose & Brand Philosophy

This guide defines the visual language, layout architecture, component standards, and responsive behavior for **FlightSentry** and any sister self-hosted applications (such as **OpenFareScraper**).

### Core Aesthetic: "Dark Cockpit / Precision Terminal"
- **Dark-First Graphite Surfaces:** Low-glare obsidian and charcoal surfaces (`#0f0f11` and `#1c1c1e`) paired with crisp `1px` borders (`#2d2d31`) instead of heavy drop shadows or bright gradients.
- **Monospace Precision:** Terminal-inspired `ui-monospace` typography across the entire interface so numeric readouts, timestamps, airport/carrier codes, and status labels align cleanly.
- **Monochrome Chrome, Semantic Data:** Interactive chrome (navigation, toolbars, primary buttons, cards, inputs) stays strictly monochrome (`gunmetal` and `slate`). Color is reserved for **data, status, and alerts** (`emerald`, `amber`, `rose`, `sky`) so critical states stand out immediately.
- **Responsive Density:** High-density, scannable layouts on desktop that adapt cleanly to full-screen sheets and `44px` touch targets on mobile viewports.

---

## 2. Design Tokens & Tailwind Configuration

Every application in this product family uses the exact same Tailwind color and font configuration in `tailwind.config.js`:

{BT}js
/** @type {{import('tailwindcss').Config}} */
const colors = require('tailwindcss/colors');

module.exports = {{
  darkMode: 'class',
  content: [
    "./src/**/*.{{js,ts,jsx,tsx,mdx}}",
  ],
  theme: {{
    extend: {{
      colors: {{
        // Remaps any indigo utility references to neutral Slate
        indigo: colors.slate,
        // Official graphite surface palette
        gunmetal: {{
          nav: '#0f0f11',
          canvas: '#1c1c1e',
          card: '#0f0f11',
          border: '#2d2d31',
          muted: '#9aa0a6',
        }},
      }},
      fontFamily: {{
        sans: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      }},
    }},
  }},
  plugins: [],
}};
{BT}

Base document styles in `src/app/globals.css`:

{BT}css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {{
  @apply bg-gunmetal-canvas text-gunmetal-muted;
}}
{BT}

### 2.1 Surface Elevation Hierarchy

Because `gunmetal-nav` and `gunmetal-card` share `#0f0f11` while `gunmetal-canvas` is `#1c1c1e`, surfaces alternate between `#1c1c1e` and `#0f0f11` to create contrast without shadows:

| Layer | Token | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Page Canvas** | `bg-gunmetal-canvas` | `#1c1c1e` | Main viewport background behind top-level cards and tables. |
| **Top Navbar & Footer** | `bg-gunmetal-nav` | `#0f0f11` | Persistent `h-16` header and bottom footer, separated by `border-gunmetal-border`. |
| **Primary Card / Modal Shell** | `bg-gunmetal-card` | `#0f0f11` | Dashboard entity cards, settings container, login box, and modal outer shells. |
| **Inset Section / Input / Well** | `bg-gunmetal-canvas` or `bg-gunmetal-canvas/60` | `#1c1c1e` | Sub-cards inside Settings or Modals, form `<input>`/`<select>` fields, table headers, and empty states. |
| **Elevated Interactive Chrome** | `bg-gunmetal-border` / `bg-slate-800/75` | `#2d2d31` / `#1e293b` | Active nav links, active filter pills, and primary CTA buttons. |
| **Hairline Divider / Border** | `border-gunmetal-border` | `#2d2d31` | All card outlines, section dividers, input borders, and modal headers/footers. |

### 2.2 Text Hierarchy

| Role | Class | Usage |
| :--- | :--- | :--- |
| **Primary Heading / Value** | `text-slate-100` | Page titles (`h1`), modal titles, card headlines, primary metrics, active tab text. |
| **Secondary Label / Body** | `text-slate-200` / `text-slate-300` | Form labels, table values, button labels, inactive tab hover text. |
| **Muted Metadata / Helper** | `text-gunmetal-muted` (`#9aa0a6`) | Subtitles, timestamps, field descriptions, inactive nav items. |
| **Placeholder Text** | `placeholder-zinc-500` or `placeholder-slate-500` | Input placeholder hints. |

### 2.3 Canonical Semantic Color System

Do **not** mix `green-*` with `emerald-*`, `red-*` with `rose-*`, `yellow-*` with `amber-*`, or `blue-*` with `sky-*`. Use one canonical Tailwind family per semantic meaning:

| Semantic Role | Canonical Family | Standard Classes | Usage |
| :--- | :--- | :--- | :--- |
| **Active / Watch / Info** | `sky` | Text: `text-sky-400` / `text-sky-300`<br>Badge: `bg-sky-950/60 text-sky-300 border-sky-800/60`<br>Card Accent: `border-l-4 border-l-sky-500/70` | Watched items, metered API tags, active step progress bar, informational banners. |
| **Success / Positive / Booked** | `emerald` | Text: `text-emerald-400` / `text-emerald-300`<br>Badge: `bg-emerald-950/60 text-emerald-300 border-emerald-800/60`<br>Card Accent: `border-l-4 border-l-emerald-500` | Price drops, savings deltas, booked status, connection verified, update available banners. |
| **Warning / Pause / Points** | `amber` | Text: `text-amber-400` / `text-amber-300`<br>Badge: `bg-amber-950/60 text-amber-300 border-amber-800/60`<br>Banner: `bg-amber-950/30 border-amber-800/60 text-amber-200` | Paused state, cooldown/rate-limit warnings, points/miles currencies, unconfigured notices. |
| **Destructive / Surge / Error** | `rose` | Text: `text-rose-400` / `text-rose-300`<br>Badge: `bg-rose-950/60 text-rose-300 border-rose-800/60`<br>Alert: `bg-rose-950/45 border-rose-700/70 text-rose-200` | Price surges, validation errors, failed tests, delete/revoke actions. |
| **Auxiliary Category Accent** | `purple` | Text: `text-purple-400` | Secondary icon accents (e.g., GitHub links, timing badges) where four states need distinction. |

---

## 3. Typography & Data Formatting Scale

All text renders in the configured `font-sans` (`ui-monospace`) stack. Maintain consistent scale and casing across pages:

| Element | Classes | Example |
| :--- | :--- | :--- |
| **Page Title (`h1`)** | `text-2xl font-bold text-slate-100` | `Dashboard`, `Settings` |
| **Modal Title (`h2`)** | `text-base sm:text-lg font-bold text-slate-100` (or `text-lg sm:text-xl` on Tier 3 workspaces) | `Track Booked Flight`, `Welcome to FlightSentry` |
| **Card / Section Title (`h3`)** | `text-sm font-bold text-slate-100` | `Public API Keys`, `Data Source Priority Order` |
| **Eyebrow / Form Section Header** | `text-xs font-bold uppercase tracking-wider text-slate-300` | `DISPLAY & SEARCH CURRENCY`, `ALERT THRESHOLDS` |
| **Table Column Header (`th`)** | `text-[11px] font-bold uppercase tracking-wider text-slate-400` | `FLIGHT / ROUTE`, `CURRENT PRICE`, `STATUS` |
| **Standard Input / Select Text** | `text-sm text-slate-200` | Form inputs and dropdowns (`14px` prevents mobile zoom issues when paired with `44px` height). |
| **Body / Helper Copy** | `text-xs text-gunmetal-muted leading-relaxed` | Card descriptions, field explanations, modal body copy. |
| **Micro Pill / Status Badge** | `text-[10px]` or `text-[11px] font-semibold` | `px-2 py-0.5 rounded border` status tags. |
| **Hero Numeric Metric** | `text-3xl font-black text-slate-100 whitespace-nowrap` | Primary card price (`$342`, `45,000 pts`). |

---

## 4. Application Shell & Page Blueprints

### 4.1 Global Shell (`src/app/layout.tsx`)
Every page inherits this exact outer frame (except standalone auth screens like `/login`, which hide `Navbar`):

{BT}tsx
<html lang="en" className="dark">
  <body className="antialiased min-h-screen flex flex-col">
    <Navbar />
    <SystemBanners />
    <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {{children}}
    </main>
    <Footer />
  </body>
</html>
{BT}

- **Max Container Width:** `max-w-7xl` (`1280px`) with responsive horizontal gutters (`px-4 sm:px-6 lg:px-8`).
- **Top Navbar (`Navbar.tsx`):**
  - Surface: `bg-gunmetal-nav border-b border-gunmetal-border h-16`.
  - Left: App icon (`h-[42px] w-auto object-contain rounded`) + `font-bold text-xl tracking-tight text-white`.
  - Right: Optional live queue/status pill + route links (`px-3 py-2 rounded-md text-sm font-medium`). Active route uses `bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm`; inactive routes use `text-gunmetal-muted hover:bg-gunmetal-card`. Labels collapse to icons on `< sm` (`hidden sm:inline`).
- **System Banners (`SystemBanners.tsx`):**
  - Rendered directly below `Navbar` inside `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-3` for update notifications and global announcements.
- **Footer (`Footer.tsx`):**
  - Surface: `mt-auto py-6 border-t border-gunmetal-border bg-gunmetal-nav`.
  - Left: Version link (`AppName vX.Y.Z`) pointing to `CHANGELOG.md`.
  - Right: Compact external links (`Developer's Website`, `Report An Issue`, `Support`).

### 4.2 Primary Workspace / Dashboard Blueprint
1. **Header Row (`mb-6`):** Left-aligned `h1` (`text-2xl font-bold text-slate-100`); right-aligned `flex flex-wrap items-center gap-3` toolbar containing segmented filter toggles (`h-[38px]`), sort dropdown (`h-[38px]`), view mode toggle (`Cards` vs. `Condensed Table`), and the primary `+ Add <Entity>` CTA button.
2. **Collapsible Telemetry Ribbon (`mb-6`):** `bg-gunmetal-card p-3.5 sm:p-5 rounded-lg border border-gunmetal-border` showing system health, active providers, and quota progress bars.
3. **Entity Grid / Condensed Table:**
   - **Card Grid:** `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`. Cards use `bg-gunmetal-card rounded-lg border border-gunmetal-border p-4 sm:p-5` with a `4px` left semantic border (`border-l-4 border-l-sky-500/70` for active/watching, `border-l-4 border-l-emerald-500` for booked/completed).
   - **Condensed Table:** Wrapped in `bg-gunmetal-card border border-gunmetal-border rounded-lg overflow-x-auto` with `bg-gunmetal-canvas/60` `thead` cells.
4. **Collapsible Archive Section (`mt-10 pt-6 border-t border-gunmetal-border/80`):** Expandable disclosure button revealing past/archived items.

### 4.3 Settings Page Blueprint (`/settings/[tab]`)
1. **URL-Routed Tabs:** Each tab has a clean URL (`/settings/general`, `/settings/data-sources`, etc.) so refreshes and deep links preserve tab context.
2. **Outer Container:** `w-full bg-gunmetal-card p-4 sm:p-6 rounded-lg shadow-sm border border-gunmetal-border`.
3. **Tab Bar (`role="tablist"`):**
   - Mobile: `flex flex-wrap items-center gap-1.5 bg-gunmetal-canvas/70 border border-gunmetal-border p-1.5 rounded-lg` with `min-h-[44px]` buttons.
   - Desktop (`sm+`): Horizontal underline tabs (`sm:border-b sm:border-gunmetal-border`) where the active tab uses `sm:border-b-2 sm:border-slate-300 text-slate-100 font-semibold`.
4. **Tab Content Stack (`space-y-6 pt-2`):**
   - Starts with `SettingsIntroBanner` (`bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300`).
   - Followed by modular `SettingsCard` blocks (`bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg`).
5. **Auto-Save & Floating Toast:** Settings persist immediately on toggle/change/blur and confirm via a fixed bottom-right toast (`fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-5 sm:right-5 z-50`).

### 4.4 Standalone Auth Screen Blueprint (`/login`)
- Hides `Navbar` and `SystemBanners`.
- Centered `w-full max-w-md bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl p-6 sm:p-8` card with app logo, title, subtitle, inline `rose` error alert, `44px`-tall inputs, full-width primary submit button, and optional WebAuthn passkey button.

---

## 5. Component Standards

### 5.1 Button System

Every button across the application must use one of **five standardized variants** and **two standardized size tiers**. Never invent ad-hoc button colors (`bg-sky-600`, `bg-slate-200`, etc.) for standard actions.

#### Button Variants

| Variant | Exact Tailwind Classes | When to Use |
| :--- | :--- | :--- |
| **Primary (`Translucent Slate Glass`)** | `bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold shadow-sm transition-colors` | Main CTA on a page or modal footer (`+ Add Flight`, `Create API Key`, `Continue`, `Track Flight`, `Save Credentials`). Maximum **1** per toolbar or modal footer. |
| **Secondary** | `bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white font-semibold transition-colors` | `Cancel`, `Previous`, `Edit`, `Test`, `Logs`, `API Reference`, and non-primary actions. |
| **Toolbar / Segmented Active** | `bg-gunmetal-border border border-slate-500 text-slate-100 font-semibold shadow-sm` | Active tab, active filter pill (`All` / `Watching` / `Booked`), or active view toggle (`Cards` / `List`). |
| **Destructive** | `bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/80 text-rose-200 hover:text-white font-semibold shadow-sm transition-colors` | Confirmed destructive actions (`Delete Flight`, `Disable Authentication`, `Revoke`, `Purge`). |
| **Semantic Action (Success / Warning)** | **Success:** `bg-emerald-950/60 hover:bg-emerald-900/75 border border-emerald-700/80 text-emerald-200 font-semibold`<br>**Warning:** `bg-amber-950/60 hover:bg-amber-900/75 border border-amber-700/80 text-amber-200 font-semibold` | Explicit positive approval (`Apply Selected`, `Convert to Booked`) or override (`Unpause All`, `Switch Currency`). |

#### Button Sizes & Disabled States
- **Standard Form / Modal Button:** `min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5`
- **Compact Toolbar / Card Action Button:** `min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs inline-flex items-center justify-center gap-1.5`
- **Icon-Only Button (e.g., Modal Close `X`):** `min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors`
- **Disabled Modifier:** `disabled:opacity-45 disabled:pointer-events-none cursor-pointer`

---

### 5.2 Modal System (3 Desktop Width Tiers + Mobile Standard)

All modals render via portal (`SettingsModalPortal` or root overlay) with `role="dialog"`, `aria-modal="true"`, `Escape` key dismissal, and backdrop `fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm`.

#### Desktop Width Tiers (Content-Driven)

| Tier | Desktop Max-Width | Mobile Behavior (`< sm`) | Structure | Use Cases |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Confirmation / Alert** | `max-w-md w-full` | Centered floating card (`p-4` outer gutter, `rounded-xl`) | Compact header + short message + right-aligned `Cancel` & action buttons | Delete confirmation, disable auth, currency switch warning, unsaved changes prompt. |
| **Tier 2: Focused Form / Logs** | `max-w-2xl w-full` | **Full-screen (`p-0 w-full h-full rounded-none`)** -> `sm:h-auto sm:max-h-[90vh] sm:rounded-2xl` | Sticky header (`border-b`) + scrollable body (`flex-1 overflow-y-auto`) + sticky footer (`border-t`) | Create API key, add/edit IMAP account, edit queue item, data source logs viewer. |
| **Tier 3: Complex Workspace** | `max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full` | **Full-screen (`p-0 w-full h-full rounded-none`)** -> `sm:h-auto sm:max-h-[90vh] sm:rounded-2xl` | Sticky header + independent scrollable body (`[overflow-anchor:none]`) + sticky footer | Add/Edit Flight, Price History & Charts, Convert to Booked, Email Review Queue, Onboarding Wizard. |

#### Modal Anatomy Rules
- **Header (`px-4 sm:px-6 py-4 border-b border-gunmetal-border bg-gunmetal-card`):** Title on the left (`text-base sm:text-lg font-bold text-slate-100`) with optional 1-line subtitle (`text-xs text-gunmetal-muted`); `44px` close `X` button on the right.
- **Scrollable Body (`flex-1 overflow-y-auto [overflow-anchor:none] p-4 sm:p-6 space-y-5 min-h-0`):** Never make the outer dialog container scroll when a sticky header/footer is present—always scroll only the inner body container.
- **Sticky Footer (`px-4 sm:px-6 py-3.5 border-t border-gunmetal-border bg-gunmetal-card flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-shrink-0`):** Secondary/cancel actions on the left or before primary; single Primary CTA on the bottom-right.

---

### 5.3 Form Controls, Inputs & Badges

- **Text, Number, URL & Password Inputs:**
  - `w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50`
- **Select Dropdowns (`SettingsSelect`):**
  - Custom `appearance-none` `<select>` with right-aligned `ChevronDown` (`pointer-events-none right-3`) and matching `min-h-[44px] sm:min-h-[38px]` height.
- **Checkboxes & Radio Controls:**
  - `w-4 h-4 accent-slate-500 rounded cursor-pointer` wrapped inside a `min-h-[44px] sm:min-h-0` clickable `<label>` row.
- **Field Labels:**
  - Section/card field labels: `block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5`
  - Modal inline labels: `block text-xs font-semibold text-slate-300 mb-1.5`
- **Status Pills & Tags:**
  - `inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] sm:text-[11px] font-semibold` using the canonical `sky`, `emerald`, `amber`, or `rose` badge classes in Section 2.3.
- **Empty States:**
  - `py-12 px-4 text-center border-2 border-dashed border-gunmetal-border rounded-xl bg-gunmetal-canvas/30 space-y-2` with a centered muted icon (`w-7 h-7 text-gunmetal-muted mx-auto`), `text-sm font-semibold text-slate-300` title, and `text-xs text-gunmetal-muted` guidance.

---

## 6. Mobile-First Responsive Rules

1. **44px Touch Target Floor:** Every interactive button, tab, link pill, icon button, and form control must maintain `min-h-[44px]` (and `min-w-[44px]` for icon buttons) below the `sm` (`640px`) breakpoint.
2. **Breakpoint Progression:**
   - Default (`< 640px`): Single-column stacked forms (`grid-cols-1`), full-width stacked modal footer buttons (`flex-col-reverse`), full-screen Tier 2 & Tier 3 modals.
   - `sm` (`640px+`): 2-column form grids (`sm:grid-cols-2`), horizontal inline modal footers, centered rounded modals (`sm:rounded-2xl`).
   - `md` (`768px+`): 2-column dashboard card grids (`md:grid-cols-2`), multi-column card telemetry grids.
   - `lg` / `xl` (`1024px+` / `1280px+`): 3-column dashboard card grids (`xl:grid-cols-3`), single-row desktop stepper grids, and `xl:max-w-6xl` Tier 3 modal workspaces.
3. **Overflow Prevention:** Always apply `min-w-0` and `truncate` (or `break-words`) inside flex rows containing dynamic text, URLs, or hostnames so mobile viewports never horizontally scroll.

---

## 7. Code & Import Conventions for Sister Apps

- **Single-Line Icon Imports:** Import all icons from `lucide-react` on a single line per file (`import {{ Plus, X, Check }} from 'lucide-react';`) rather than vertically stacked multi-line blocks.
- **Domain-Driven Component Folders:** Keep modal and settings sub-sections split into single-responsibility components (`Header`, `Card`, `Section`, `Modal`, `types.ts`) rather than monolithic files.
- **Theme Token Discipline:** Reference `bg-gunmetal-*`, `border-gunmetal-border`, `text-gunmetal-muted`, `slate-*`, and the four semantic palettes (`sky`, `emerald`, `amber`, `rose`)—never raw hex codes or deprecated `gray-*` / `indigo-*` / `blue-*` classes.