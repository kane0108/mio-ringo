// ===============================
// Blazor WebAssembly SW (最終安定・非競合版)
// ===============================

// ★ プロジェクト固有名を必ず含める
const PROJECT_ID = "mio-ringo";
const CACHE_VERSION = "v1.0.2";
const CACHE_NAME = `${PROJECT_ID}-cache-${CACHE_VERSION}`;

// ★ scope 基準（GitHub Pages 安全）
const BASE = self.registration.scope;

// ★ 必ず scope 配下だけ
const OFFLINE_ASSETS = [
    BASE,
    `${BASE}index.html`,
    `${BASE}manifest.json`,
    `${BASE}favicon.png`
];

// === Install ===
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_ASSETS))
    );
    self.skipWaiting();
});

// === Activate ===
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys.map(key => {
                    // ★ 自分のプロジェクトの cache だけ整理
                    if (key.startsWith(PROJECT_ID) && key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
            await self.clients.claim();
        })()
    );
});

// === Fetch ===
self.addEventListener("fetch", (event) => {
    const req = event.request;

    // ★ navigate（index.html）はネット優先
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req).catch(() => caches.match(`${BASE}index.html`))
        );
        return;
    }

    // ★ DLL / wasm は network-first + cache 更新
    if (req.url.includes("_framework")) {
        event.respondWith(
            (async () => {
                try {
                    const net = await fetch(req);
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(req, net.clone());
                    return net;
                } catch {
                    return caches.match(req);
                }
            })()
        );
        return;
    }

    // ★ その他は network → cache
    event.respondWith(
        fetch(req).catch(() =>
            caches.match(req).then(res => res || caches.match(`${BASE}index.html`))
        )
    );
});
