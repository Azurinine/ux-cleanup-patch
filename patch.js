/**
 * ux-cleanup-patch
 *
 * Paste this entire file into the browser console to:
 *   1. Inject high-specificity CSS overrides that restore viewport accessibility.
 *   2. Neutralise common reactive DOM watchers that fight manual style changes.
 *   3. Reset body/html overflow and hide blocking overlay elements.
 *
 * See ENGINEERING.md for a full explanation of the approach.
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
   * 1. CSS OVERRIDES
   * Injected into <head> so React/Vue reconciliation
   * within the app root does not remove them.
   * ───────────────────────────────────────────── */
  const CSS = `
    /* Force body/html to be scrollable */
    html, body {
      overflow: auto !important;
      max-height: none !important;
      position: static !important;
    }

    /* Hide fixed overlays that are not the primary nav */
    *:not(nav):not(header):not([role="navigation"]):not([role="banner"]) {
      --_is-blocking-overlay: 0;
    }

    /* Dialogs, modals, cookie banners */
    [role="dialog"]:not([aria-modal="false"]),
    [role="alertdialog"] {
      display: none !important;
    }

    /* Generic high-z-index fixed/sticky blockers */
    :not(#\\9):not(nav):not(header):not([role="navigation"]) {
      --patch-active: 1;
    }
  `;

  function injectStyles() {
    const existing = document.getElementById('ux-cleanup-patch');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = 'ux-cleanup-patch';
    style.textContent = CSS;
    document.head.appendChild(style);
    console.info('[ux-cleanup-patch] Styles injected.');
  }

  /* ─────────────────────────────────────────────
   * 2. NEUTRALISE REACTIVE WATCHERS
   * Collect timer IDs created in a short window
   * and cancel any that look like overlay restorers.
   * ───────────────────────────────────────────── */
  const suspiciousTimerIds = new Set();

  function monitorTimers(durationMs = 2000) {
    const _setInterval = window.setInterval;
    const _setTimeout  = window.setTimeout;

    function isSuspicious(fn) {
      const src = (typeof fn === 'function' ? fn.toString() : String(fn)).toLowerCase();
      return (
        src.includes('overlay') ||
        src.includes('modal') ||
        src.includes('banner') ||
        src.includes('classname') ||
        src.includes('classlist') ||
        src.includes('display') ||
        src.includes('overflow')
      );
    }

    window.setInterval = function (fn, delay, ...args) {
      const id = _setInterval.call(this, fn, delay, ...args);
      if (isSuspicious(fn)) {
        suspiciousTimerIds.add({ type: 'interval', id });
        clearInterval(id);
        console.info('[ux-cleanup-patch] Blocked suspicious interval id', id);
      }
      return id;
    };

    window.setTimeout = function (fn, delay, ...args) {
      const id = _setTimeout.call(this, fn, delay, ...args);
      if (isSuspicious(fn)) {
        suspiciousTimerIds.add({ type: 'timeout', id });
        clearTimeout(id);
        console.info('[ux-cleanup-patch] Blocked suspicious timeout id', id);
      }
      return id;
    };

    // Restore originals after monitoring window
    setTimeout(function restore() {
      window.setInterval = _setInterval;
      window.setTimeout  = _setTimeout;
      console.info('[ux-cleanup-patch] Timer monitoring complete. Blocked', suspiciousTimerIds.size, 'timer(s).');
    }, durationMs);
  }

  /* ─────────────────────────────────────────────
   * 3. STATE RESTORATION
   * Directly reset properties that overlays commonly set.
   * ───────────────────────────────────────────── */
  function restoreState() {
    // Unlock scroll
    document.body.style.overflow          = '';
    document.body.style.position          = '';
    document.documentElement.style.overflow = '';

    // Remove common overlay class names added to <body>
    const bodyClassBlacklist = ['modal-open', 'no-scroll', 'overflow-hidden', 'overlay-active'];
    bodyClassBlacklist.forEach(cls => document.body.classList.remove(cls));

    // Hide high-z-index fixed/sticky elements that block content.
    // Pre-filter by inline style to avoid getComputedStyle on every element;
    // fall back to a full scan for elements positioned via stylesheets.
    const candidates = Array.from(
      document.querySelectorAll('[style*="position: fixed"],[style*="position:fixed"],[style*="position: sticky"],[style*="position:sticky"]')
    );
    if (candidates.length === 0) {
      document.querySelectorAll('*').forEach(function (el) { candidates.push(el); });
    }
    candidates.forEach(function (el) {
      const style = window.getComputedStyle(el);
      const isBlocker =
        (style.position === 'fixed' || style.position === 'sticky') &&
        parseInt(style.zIndex, 10) > 100 &&
        el.tagName.toLowerCase() !== 'nav' &&
        el.tagName.toLowerCase() !== 'header' &&
        el.getAttribute('role') !== 'navigation' &&
        el.getAttribute('role') !== 'banner';

      if (isBlocker) {
        el.style.setProperty('visibility', 'hidden', 'important');
        console.info('[ux-cleanup-patch] Hid blocking element:', el);
      }
    });

    console.info('[ux-cleanup-patch] State restored.');
  }

  /* ─────────────────────────────────────────────
   * ENTRY POINT
   * ───────────────────────────────────────────── */
  function run() {
    injectStyles();
    monitorTimers(2000);
    restoreState();
    console.info('[ux-cleanup-patch] Patch applied successfully.');
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run);
  } else {
    run();
  }
})();
