const CACHE_NAME = "topview-motion-previews-v1";
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;
const CONCURRENCY = 2;

export function motionPreviewSource(item) {
  if (!item.video) return undefined;
  let key;
  try {
    key = new URL(item.video, document.baseURI);
  } catch {
    return undefined;
  }
  if (!["http:", "https:"].includes(key.protocol)) return undefined;
  if (item.version) key.searchParams.set("topview-preview-version", item.version);
  return { url: item.video, key: key.href, version: item.version };
}

async function readBoundedVideo(response) {
  if (Number(response.headers.get("content-length")) > MAX_VIDEO_BYTES) {
    await response.body?.cancel();
    return undefined;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_VIDEO_BYTES) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  return new Blob(chunks, { type: response.headers.get("content-type") || "video/mp4" });
}

export function createMotionPreviewCache(warmLargeVideo) {
  const cache = globalThis.caches?.open(CACHE_NAME).catch(() => undefined);
  const prepared = new Set();
  const memory = new Map();
  const active = new Map();
  let startup = [];
  let selected = [];
  let enabled = false;

  async function prepare(source, signal) {
    const store = await cache;
    signal.throwIfAborted();
    if (await store?.match(source.key).catch(() => undefined)) return;
    signal.throwIfAborted();
    const response = await fetch(source.url, {
      signal, priority: "low", credentials: "omit",
      cache: source.version ? "reload" : "force-cache",
    });
    if (!response.ok || response.status !== 200) {
      await response.body?.cancel();
      throw new Error("Preview unavailable");
    }
    const blob = await readBoundedVideo(response);
    signal.throwIfAborted();
    if (!blob) {
      await warmLargeVideo(source, signal);
      return;
    }
    if (store) {
      try {
        await store.put(source.key, new Response(blob, { headers: { "Content-Type": blob.type } }));
        return;
      } catch {
        // A WebView may block writes or run out of storage.
      }
    }
    memory.set(source.key, blob);
    if (memory.size > CONCURRENCY * 3) {
      const oldest = memory.keys().next().value;
      memory.delete(oldest);
    }
  }

  function pump() {
    if (!enabled) return;
    const candidates = [...selected, ...startup];
    for (const source of candidates) {
      if (active.size >= CONCURRENCY) break;
      if (prepared.has(source.key) || active.has(source.key)) continue;
      const controller = new AbortController();
      active.set(source.key, controller);
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
      void prepare(source, signal).catch(() => {
        // Let hover try the original media URL when preloading fails.
      }).finally(() => {
        if (!controller.signal.aborted) prepared.add(source.key);
        active.delete(source.key);
        pump();
      });
    }
  }

  function setQueues(nextStartup, nextSelected, nextEnabled) {
    startup = nextStartup;
    selected = nextSelected;
    enabled = nextEnabled;
    const wanted = new Set(enabled ? [...selected, ...startup].map(({ key }) => key) : []);
    for (const [key, controller] of active) {
      if (!wanted.has(key)) controller.abort();
    }
    pump();
  }

  async function getBlob(source) {
    const store = await cache;
    const response = await store?.match(source.key).catch(() => undefined);
    return response ? response.blob().catch(() => undefined) : memory.get(source.key);
  }

  return { setQueues, getBlob };
}
