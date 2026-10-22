const CACHE_NAME = 'finance-flow-v7-lumtech';
const INDEX_URL = new URL('./index.html', self.location).href;
const HASHED_ASSET = /\/assets\/[^/]+$/;
// Únicos recursos externos que se guardan offline. El resto (Firebase/Google: datos,
// inicio de sesión) nunca pasa por la caché.
const CACHEABLE_CROSS_ORIGIN = ['https://cdn.tailwindcss.com', 'https://cdn-icons-png.flaticon.com'];
const isCacheable = (url) =>
  url.origin === self.location.origin
    ? !url.pathname.startsWith('/__/') // flujo de inicio de sesión de Firebase
    : CACHEABLE_CROSS_ORIGIN.includes(url.origin);

// Recursos referenciados por el HTML (bundle con hash, manifest, Tailwind CDN, íconos)
const extractShellUrls = (html) => {
  const urls = new Set();
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(ref, self.location);
    if (url.protocol.startsWith('http') && isCacheable(url)) urls.add(url.href);
  }
  return [...urls];
};

const toRequest = (url) =>
  new URL(url).origin === self.location.origin ? new Request(url) : new Request(url, { mode: 'no-cors' });

const putInCache = async (request, response) => {
  if (!response || !(response.ok || response.type === 'opaque')) return;
  // Una respuesta redirigida no se puede servir a una navegación: se guarda una copia limpia
  if (response.redirected) {
    response = new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
};

// Todos los archivos de la compilación actual, incluidos los que se cargan bajo demanda
// (p. ej. el módulo de Firebase), según la lista que genera vite.config.ts
const fetchAssetManifest = async () => {
  try {
    const res = await fetch(new URL('./asset-manifest.json', self.location), { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).map(f => new URL(f, self.location).href);
  } catch (err) {
    return null;
  }
};

// Guarda todo lo que necesita la versión actual y borra bundles de versiones anteriores
const syncShell = async (html) => {
  const manifest = await fetchAssetManifest();
  const urls = [...new Set([...extractShellUrls(html), ...(manifest || [])])];
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(urls.map(async (url) => {
    const request = toRequest(url);
    if (await cache.match(request)) return; // ya guardado (y se refresca al usarse)
    await putInCache(request, await fetch(request));
  }));

  if (!manifest) return; // sin la lista completa no se borra nada
  const keys = await cache.keys();
  await Promise.all(keys
    .filter(req => HASHED_ASSET.test(new URL(req.url).pathname) && !urls.includes(req.url))
    .map(req => cache.delete(req)));
};

self.addEventListener('install', (e) => {
  e.waitUntil(
    fetch(INDEX_URL, { cache: 'reload' })
      .then(async (res) => {
        await putInCache(INDEX_URL, res.clone());
        await syncShell(await res.text());
      })
      .catch(err => console.log('Precarga offline incompleta', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML: red primero (para recibir siempre la última versión), caché si no hay conexión
const handleNavigation = async (e) => {
  try {
    const res = await fetch(e.request);
    if (res.ok) {
      const copy = res.clone();
      e.waitUntil(putInCache(INDEX_URL, copy.clone()).then(() => copy.text()).then(syncShell));
    }
    return res;
  } catch (err) {
    return (await caches.match(INDEX_URL)) || Response.error();
  }
};

// Bundles con hash: inmutables, caché primero
const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    await putInCache(request, res.clone());
    return res;
  } catch (err) {
    return Response.error();
  }
};

// Resto (manifest, CDN, íconos): responde con caché y actualiza en segundo plano
const staleWhileRevalidate = async (e) => {
  const cached = await caches.match(e.request);
  const network = fetch(e.request)
    .then(async (res) => { await putInCache(e.request, res.clone()); return res; })
    .catch(() => null);
  if (cached) {
    e.waitUntil(network);
    return cached;
  }
  return (await network) || Response.error();
};

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http') || !isCacheable(url)) return;

  if (request.mode === 'navigate') {
    e.respondWith(handleNavigation(e));
  } else if (url.origin === self.location.origin && HASHED_ASSET.test(url.pathname)) {
    e.respondWith(cacheFirst(request));
  } else {
    e.respondWith(staleWhileRevalidate(e));
  }
});
