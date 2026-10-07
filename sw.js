/* ==========================================================
   Live DZ Analyze — service worker
   يجعل التطبيق يعمل كاملاً بلا إنترنت (offline-first).
   التطبيق ملف مستقل، لذا التخزين بسيط جداً.
   ========================================================== */
'use strict';

const VERSION = 'live-dz-v1';
const CORE = ['./', './index.html'];

/* عند التثبيت: خزّن الصفحة الرئيسية */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(CORE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* عند التفعيل: احذف النسخ القديمة */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* الاستراتيجية:
   - التنقل (فتح الصفحة): الشبكة أولاً، وعند الفشل (بلا إنترنت) الخزين.
   - بقية الملفات: الخزين أولاً مع تحديث في الخلفية (stale-while-revalidate). */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html') || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* رسائل من الصفحة (لتحديث فوري) */
self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});
