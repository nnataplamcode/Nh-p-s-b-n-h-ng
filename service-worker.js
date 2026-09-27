// Service worker của "Nhập sổ bán hàng" — cache giao diện (app shell) để mở được cả khi mất mạng.
// Việc đọc ảnh bằng AI vẫn cần Internet vì phải gọi tới máy chủ Gemini/OpenAI/Anthropic.
// Ưu tiên mạng: khi có Internet luôn tải bản mới nhất (tránh chạy mã cũ sau khi cập nhật),
// chỉ dùng bản đã lưu khi mất mạng.
const CACHE_NAME = 'so-ban-hang-v5';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(SHELL_FILES.map((f) =>
        // cache: 'reload' để bỏ qua bộ nhớ đệm HTTP của trình duyệt, lấy đúng bản mới trên máy chủ.
        fetch(new Request(f, { cache: 'reload' }))
          .then((resp) => { if (resp.ok) return cache.put(f, resp); })
          .catch(() => {})
      )))
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
    fetch(event.request, { cache: 'no-cache' })
      .then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return resp;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
