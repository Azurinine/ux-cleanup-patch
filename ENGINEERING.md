# Engineering Process

## Problem

Modern web apps commonly apply obfuscated CSS class names generated at build time (e.g. via CSS Modules or Tailwind's JIT engine). These classes are unpredictable across deploys, making stable style overrides difficult. Compounding this, reactive frameworks (React, Vue, Svelte, etc.) use virtual-DOM diffing and effect watchers that can re-apply vendor styles after any state change, undoing manual patches.

The goal of this patch is to restore a clean, accessible viewport on pages that:

- Clip or hide content with `overflow: hidden`, `max-height`, or `pointer-events: none`.
- Inject fixed/sticky overlays (cookie banners, modals, paywalls) that block interaction.
- Attach mutation-observer or interval-based "watchers" that fight user-applied overrides.

---

## Approach

### 1. High-specificity declarative overrides

Rather than targeting obfuscated class names directly, the patch targets **structural and attribute-based selectors** that are stable across deploys:

- `[class]` attribute presence
- ARIA roles (`[role="dialog"]`, `[role="banner"]`)
- Positional pseudo-classes (`:not(#\9)` specificity trick to beat inline styles)
- `!important` declarations to win cascade wars without needing exact class names

A `<style>` tag is injected into `<head>` so the overrides persist across React re-renders (React only reconciles within its root, not `<head>`).

### 2. Neutralizing reactive DOM watchers

Reactive watchers fall into two categories:

| Category | Detection | Neutralisation |
|---|---|---|
| `setInterval` / `setTimeout` loops | Patch `window.setInterval` and `window.setTimeout` before page hydration | Wrap originals; block calls whose stringified callback matches known overlay-restoration patterns |
| `MutationObserver` instances | Patch `window.MutationObserver` constructor | Wrap observe(); ignore mutations on nodes already patched by this script |

Because the patch runs as a console snippet (after hydration), the focus is on **disconnecting existing observers** via `MutationObserver.takeRecords()` interception and clearing suspicious timer IDs collected during a brief monitoring window at startup.

### 3. State restoration

After applying style overrides and neutralising watchers:

1. `document.body.style.overflow` is reset to `''`.
2. Fixed-position elements with `z-index > 100` that are not the page's primary nav are hidden via `visibility: hidden` (not `display: none`, to avoid layout reflow side-effects).
3. `document.documentElement.style.setProperty('--patch-active', '1')` sets a CSS custom property so overrides can reference it.

---

## Limitations

- **Server-side rendering hydration warnings**: injecting styles before React hydrates can cause checksum mismatches. The patch defers injection to `requestIdleCallback` where available.
- **Shadow DOM**: styles do not pierce shadow roots. Components using closed shadow DOM are out of scope.
- **CSP**: pages with a `Content-Security-Policy: style-src 'self'` header will block injected `<style>` tags. In those cases the patch falls back to inline `style` attribute writes.
- **Persistent storage**: some apps restore overlay state from `localStorage` or cookies on the next page navigation. This patch does not clear storage; apply it after each navigation if needed.

---

## File layout

```
/
├── ENGINEERING.md   ← this file (process documentation)
└── patch.js         ← single JavaScript file; paste contents into the browser console
```
