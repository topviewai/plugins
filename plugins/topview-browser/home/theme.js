(function (scope, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.TopviewHomeTheme = api;
})(globalThis, function () {
  'use strict';

  const TOKENS = Object.freeze({
    background: '--tv-host-background', surface: '--tv-host-surface',
    elevated: '--tv-host-elevated', text: '--tv-host-text', muted: '--tv-host-muted',
    border: '--tv-host-border', accent: '--tv-host-accent', accentText: '--tv-host-accent-text',
  });

  // Accept only literal colors. Host metadata cannot inject CSS declarations,
  // external resources, or references to arbitrary page variables.
  function isColor(value) {
    return typeof value === 'string' && (
      /^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value) ||
      /^(?:rgb|hsl)a?\([\d.,%\s/+\-]+\)$/i.test(value) ||
      /^(?:transparent|black|white)$/i.test(value)
    );
  }

  function createController(root) {
    let revision = 0, unsubscribe = null;
    function apply(theme) {
      const mode = theme?.mode;
      if (mode === 'light' || mode === 'dark') root.setAttribute('data-tv-theme', mode);
      else root.removeAttribute('data-tv-theme');
      // Clear all old overrides, including on account/host switches.
      for (const [name, property] of Object.entries(TOKENS)) {
        const value = theme?.colors?.[name];
        if (isColor(value)) root.style.setProperty(property, value);
        else root.style.removeProperty(property);
      }
    }

    async function connect(host) {
      const current = ++revision;
      unsubscribe?.();
      unsubscribe = null;
      apply(null); // No host bridge: CSS prefers-color-scheme remains active.
      if (!host) return;
      let hostUpdated = false;
      if (typeof host.subscribeTheme === 'function') {
        try {
          const dispose = host.subscribeTheme((theme) => {
            if (current !== revision) return;
            hostUpdated = true;
            apply(theme);
          });
          if (typeof dispose === 'function') unsubscribe = dispose;
        } catch { /* Keep the system fallback if the host cannot subscribe. */ }
      }
      if (typeof host.getTheme === 'function') {
        try {
          const theme = await host.getTheme();
          if (current === revision && !hostUpdated) apply(theme);
        } catch { /* Never blank the page when theme discovery fails. */ }
      }
    }

    return {
      apply,
      connect,
      dispose() { ++revision; unsubscribe?.(); unsubscribe = null; apply(null); },
    };
  }

  let page;
  return {
    isColor, createController,
    connect(host) {
      page ??= createController(document.documentElement);
      return page.connect(host);
    },
    apply(theme) {
      page ??= createController(document.documentElement);
      page.apply(theme);
    },
  };
});
