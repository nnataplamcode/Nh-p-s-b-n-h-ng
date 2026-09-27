// Service worker của "Sổ Bán Hàng" — chỉ cache giao diện (app shell) để mở được cả khi mất mạng.
// Việc đọc ảnh bằng AI vẫn cần Internet vì phải gọi tới máy chủ Gemini/OpenAI/Anthropic.
const CACHE_NAME = 'so-ban-hang-v1';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Chỉ can thiệp vào file cùng nguồn gốc (giao diện của app); mọi lời gọi AI ra ngoài
  // (Gemini/OpenAI/Anthropic) đi thẳng ra mạng như bình thường, không qua cache.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
