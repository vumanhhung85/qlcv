/* Service worker tối giản: cho phép "Thêm vào màn hình chính".
   Luôn lấy bản mới từ mạng; chỉ dùng bản lưu tạm khi mất mạng. Không lưu dữ liệu công việc. */
const CACHE = 'qlcv-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // API và tệp đính kèm đi thẳng lên mạng
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});
