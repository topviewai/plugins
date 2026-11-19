(function (scope, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.TopviewHomeProjects = api;
})(globalThis, function () {
  'use strict';
  const t = (key, values) => globalThis.TopviewHomeLocale?.t(key, values) ?? key;

  function projectTime(value) {
    if (typeof value !== 'string' || !value.trim()) return 0;
    const iso = value.trim().replace(' ', 'T');
    return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`) || 0;
  }

  function coverUrl(value, resourceOrigin) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const source = value.trim();
    try {
      // Absolute URL or a durable object key resolved by the host's resource origin.
      // No browser-origin fallback: an object key is not a relative page URL.
      if (!/^https:\/\//i.test(source) && (!resourceOrigin || /^[a-z][a-z\d+.-]*:/i.test(source) || source.startsWith('//'))) return null;
      const url = new URL(source, resourceOrigin);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  }

  /** Input matches the main site's CanvasProject type, with no account fields forwarded. */
  function normalizeProjects(items, resourceOrigin) {
    if (!Array.isArray(items)) throw new Error('PROJECTS_INVALID_RESPONSE');
    const seen = new Set();
    return items.map((item) => {
      if (!item || typeof item.canvasId !== 'string' || !item.canvasId.trim() || seen.has(item.canvasId)) throw new Error('PROJECTS_INVALID_RESPONSE');
      seen.add(item.canvasId);
      const candidates = [
        ...(Array.isArray(item.coverUrls) ? item.coverUrls : []),
        ...(Array.isArray(item.coverS3Keys) ? item.coverS3Keys : []),
        item.coverUrl, item.coverS3Key,
      ];
      return {
        canvasId: item.canvasId,
        name: typeof item.name === 'string' && item.name.trim() ? item.name : t("projects.untitled"),
        covers: [...new Set(candidates.map((value) => coverUrl(value, resourceOrigin)).filter(Boolean))].slice(0, 3),
        createdAt: projectTime(item.gmtCreate ?? item.createdAt),
        updatedAt: projectTime(item.gmtModify ?? item.updatedAt),
      };
    });
  }

  function nextProjectSort(sort) { return sort === 'updatedAt' ? 'createdAt' : 'updatedAt'; }

  function sortProjects(items, sort) {
    const field = sort === 'createdAt' ? 'createdAt' : 'updatedAt';
    return [...items].sort((a, b) => b[field] - a[field] || a.canvasId.localeCompare(b.canvasId));
  }

  function relativeTime(timestamp, now = Date.now()) {
    if (!timestamp) return t("projects.updatedUnknown");
    const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
    if (minutes < 1) return t("projects.justUpdated");
    const locale = globalThis.TopviewHomeLocale?.language || 'zh-CN';
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
    if (minutes < 60) return relative.format(-minutes, 'minute');
    if (minutes < 1440) return relative.format(-Math.floor(minutes / 60), 'hour');
    return relative.format(-Math.floor(minutes / 1440), 'day');
  }

  /**
   * Host binds both callbacks to the same authorized principal as the credit service.
   * listProjects({signal}) returns the full main-site CanvasProject array.
   * openProject(canvasId) obtains the authorized handoff; no client-invented URL.
   */
  function mount(container, { listProjects, openProject, resourceOrigin, onCreate, onOpenError } = {}) {
    const doc = container.ownerDocument;
    let items = [], sort = 'updatedAt', controller, request = 0, disposed = false;
    const element = (tag, className, text) => {
      const node = doc.createElement(tag);
      node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const root = element('section', 'account-projects');
    root.setAttribute('aria-label', t("home.projectsTab"));
    const header = element('div', 'account-projects-header');
    header.append(element('h2', 'account-projects-title', t("home.projectsTab")));
    const sortButton = element('button', 'account-projects-sort');
    sortButton.type = 'button';
    function syncSortButton() {
      sortButton.textContent = sort === 'createdAt' ? t("projects.created") : t("projects.lastChanged");
      sortButton.setAttribute('aria-label', `${t("projects.sortProjects")}：${sortButton.textContent}`);
    }
    syncSortButton();
    const actions = element('div', 'account-projects-actions');
    actions.append(sortButton);
    header.append(actions);
    const grid = element('div', 'account-projects-grid');
    const status = element('div', 'account-projects-status');
    status.setAttribute('role', 'status');
    root.append(header, grid, status);
    container.replaceChildren(root);

    // Placeholder row shared by loading (pulsing skeleton) and empty (static ghost cards).
    function renderSkeleton(kind = 'account-project-skeleton') {
      grid.replaceChildren();
      for (let index = 0; index < 6; index++) {
        const card = element('div', `account-project-card ${kind}`);
        card.setAttribute('aria-hidden', 'true');
        const collage = element('div', 'account-project-collage');
        for (let cell = 0; cell < 3; cell++) collage.append(element('div', `account-project-cover account-project-cover-${cell}`));
        const info = element('div', 'account-project-info');
        info.append(element('span', 'account-project-skeleton-line'), element('span', 'account-project-skeleton-line is-short'));
        card.append(collage, info);
        grid.append(card);
      }
    }

    function showStatus(title, description, retry, action) {
      status.replaceChildren(element('p', 'account-projects-status-title', title));
      if (description) status.append(element('p', 'account-projects-status-description', description));
      status.hidden = false;
      status.classList.remove('is-loading');
      if (!action) root.classList.remove('is-empty');
      if (action) {
        const button = element('button', 'account-projects-create', action.label);
        button.type = 'button';
        let timer;
        button.onclick = async () => {
          if (button.dataset.done === 'true') return;
          // Same tonal-purple "done" state as the Motion Studio button after a fill.
          if (await action.onClick() === true && !disposed) {
            button.dataset.done = 'true';
            button.textContent = `✓ ${t("composer.added")}`;
            clearTimeout(timer);
            timer = setTimeout(() => { delete button.dataset.done; button.textContent = action.label; }, 1800);
          }
        };
        status.append(button);
      }
      if (retry) {
        const button = element('button', 'account-projects-retry', t("projects.reload"));
        button.type = 'button';
        button.onclick = load;
        status.append(button);
      }
    }

    function render() {
      grid.replaceChildren();
      status.hidden = items.length > 0;
      status.classList.remove('is-loading');
      root.classList.toggle('is-empty', !items.length);
      sortButton.hidden = !items.length; // nothing to sort
      if (!items.length) {
        renderSkeleton('account-project-ghost');
        // The CTA fills the Codex composer with a starter task (never sends, never opens the hidden tab).
        showStatus(t("projects.empty"), '', false, typeof onCreate === 'function' ? { label: t("workbench.createNow"), onClick: () => onCreate() } : null);
        return;
      }
      for (const project of sortProjects(items, sort)) {
        const card = element('button', 'account-project-card');
        card.type = 'button';
        card.setAttribute('aria-label', t("projects.open", { name: project.name }));
        const collage = element('div', 'account-project-collage');
        for (let index = 0; index < 3; index++) {
          const cell = element('div', `account-project-cover account-project-cover-${index}`);
          if (project.covers[index]) {
            const image = element('img', '');
            image.alt = '';
            image.loading = 'lazy';
            image.decoding = 'async';
            image.referrerPolicy = 'no-referrer';
            image.src = project.covers[index];
            image.onerror = () => image.remove();
            cell.append(image);
          }
          collage.append(cell);
        }
        const info = element('div', 'account-project-info');
        const name = element('h3', 'account-project-name', project.name);
        name.title = project.name;
        info.append(name, element('p', 'account-project-time', relativeTime(project[sort])));
        card.append(collage, info);
        card.onclick = async () => {
          if (typeof openProject !== 'function') {
            onOpenError?.({ code: "AUTHORIZATION_REQUIRED" }, card);
            return;
          }
          card.disabled = true;
          try { await openProject(project.canvasId); }
          catch (error) {
            card.disabled = false;
            if (!disposed) onOpenError?.(error, card);
          }
          finally { card.disabled = false; }
        };
        grid.append(card);
      }
    }

    async function load() {
      const current = ++request;
      controller?.abort();
      controller = new AbortController();
      grid.replaceChildren();
      items = []; // Never retain the previous account's projects across a reload.
      sortButton.hidden = false;
      root.classList.remove('is-empty');
      root.setAttribute('aria-busy', 'true');
      sortButton.disabled = true;
      showStatus(t("projects.loading"), t("projects.description"));
      status.classList.add('is-loading'); // announced to assistive tech; the skeleton row is what is seen
      renderSkeleton();
      try {
        if (typeof listProjects !== 'function') throw Object.assign(new Error(), { code: 'AUTHORIZATION_REQUIRED' });
        const result = await listProjects({ signal: controller.signal });
        if (disposed || current !== request) return;
        items = normalizeProjects(result, resourceOrigin);
        render();
      } catch (error) {
        if (disposed || current !== request) return;
        grid.replaceChildren();
        if (error?.code === 'AUTHORIZATION_REQUIRED') showStatus(t("projects.connectAccount"), '', true);
        else showStatus(t("projects.loadFailed"), t("projects.readFailed"), true);
      } finally {
        if (!disposed && current === request) {
          root.setAttribute('aria-busy', 'false');
          sortButton.disabled = !items.length;
        }
      }
    }
    sortButton.onclick = () => { sort = nextProjectSort(sort); syncSortButton(); render(); };
    void load();
    return {
      reload: load,
      dispose() { disposed = true; ++request; controller?.abort(); container.replaceChildren(); },
    };
  }

  return { projectTime, normalizeProjects, sortProjects, nextProjectSort, relativeTime, mount };
});
