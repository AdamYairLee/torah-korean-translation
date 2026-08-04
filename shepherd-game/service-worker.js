const CACHE_VERSION = "protect-the-flock-v2.3.4";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./game.css",
  "./i18n.js",
  "./install-pwa.js",
  "./gd-sdk.js",
  "./game.js",
  "./davidModel.js",
  "./three.module.js",
  "./SkeletonUtils.js",
  "./GLTFLoader.js",
  "./BufferGeometryUtils.js",
  "./jerusalemData.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-192.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon-180.png",
  "./assets/icons/favicon-64.png",
  "./assets/ui/weapon-sling.svg",
  "./assets/ui/weapon-staff.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("protect-the-flock-") && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackUrl = null) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl);
    return Response.error();
  }
}

async function cacheFirst(request, event) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    // Never hold the game's response until a large GLB/audio file has also
    // finished writing to Cache Storage. On older Android devices that doubled
    // startup pressure and left the loading overlay at its artificial 92% cap.
    const cacheWrite = caches
      .open(RUNTIME_CACHE)
      .then((cache) => cache.put(request, response.clone()))
      .catch((error) => console.warn("Runtime asset cache skipped:", error));
    event?.waitUntil?.(cacheWrite);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (/\.(?:js|css|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request, event));
});
