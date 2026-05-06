// ──────────────────────────────────────────────────────────────
// Service Worker — オフライン対応 + キャッシュ戦略
//
// 戦略:
//   - 静的アセット (CSS/JS/フォント/画像/アイコン): Cache First
//   - HTML / API レスポンス: Network First, fallback to cache
//   - Supabase API: キャッシュしない (常に最新が要る)
//   - chrome-extension:// など同一オリジン以外: 触らない
//
// バージョニング:
//   CACHE_VERSION を上げるたびに新しい cache 名になり、
//   activate 時に古い cache を全部削除する。
// ──────────────────────────────────────────────────────────────

// 2026-05-04 v2: 通知の title 空文字対応 + iOS PWA キャッシュ強制更新のためバージョン上げ
// 2026-05-06 v3: メンバーカード枠線デフォルト変更を iPhone PWA に伝播させるためバージョン上げ
// 2026-05-06 v4: 枠線さらに濃く (25%) を iPhone PWA に確実に届けるためバージョン上げ
// 2026-05-06 v5: 枠線を CSS border 化 (JS 不要で確実に出る) のためバージョン上げ
// 2026-05-06 v6: シャドウを B 標準 → A 弱 に控えめ化
const CACHE_VERSION = 'v6-2026-05-06';
const STATIC_CACHE = `houmon-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `houmon-runtime-${CACHE_VERSION}`;

// install 時に最低限プリキャッシュしておくもの (オフラインでも開ける土台)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
];

// ─── install: プリキャッシュ + 即時 activate ─────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // 個別に追加して 1 個コケても全体は止めない
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] precache failed:', url, err);
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

// ─── activate: 旧バージョン cache を一掃 ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── fetch ハンドラ ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET 以外は SW でいじらない
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 同一オリジン以外は基本触らない (例外は下で個別判定)
  const isSameOrigin = url.origin === self.location.origin;

  // Supabase API はキャッシュしない (常に最新)
  if (url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in')) {
    return; // ブラウザのデフォルト fetch に任せる
  }

  // chrome-extension:// 等のスキームを除外
  if (!url.protocol.startsWith('http')) return;

  // クロスオリジンかつ Supabase 以外 (例: タイル地図等) は ブラウザ任せ
  if (!isSameOrigin) return;

  // 静的アセット判定 (拡張子ベース)
  const isStaticAsset = /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(
    url.pathname,
  );

  // Next の _next/static/ は不変なので Cache First
  const isImmutable = url.pathname.startsWith('/_next/static/');

  if (isStaticAsset || isImmutable) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // それ以外 (HTML / API) は Network First, fallback to cache
  event.respondWith(networkFirst(req));
});

// ─── 戦略実装 ───────────────────────────────────────────────────

// Cache First: cache を先に見て、無ければ network。成功したら cache に入れる。
async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    // オフラインで cache も無い → そのまま 失敗
    throw err;
  }
}

// Network First: network を先に試す。失敗したら cache を返す。
async function networkFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // HTML リクエストなら、オフライン用 fallback として トップページ cache を返す
    if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
      const fallback = (await cache.match('/')) || (await caches.match('/'));
      if (fallback) return fallback;
    }
    throw err;
  }
}

// ─── 任意: クライアントから "skipWaiting" メッセージで 即時アップデート可 ─
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── プッシュ通知 ──────────────────────────────────────────────
// 受信した payload (JSON) を表示する。
// ヒデさん指示 (2026-05-04): タイトルを空にして iOS の「from xxx」行を回避。
//   iOS PWA は title="" のとき AppName + body だけシンプルに表示する。
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  // title が明示的に空文字 or 未指定なら空のまま (iOS が AppName を使う)。
  // Android Chrome 等では明示タイトル無いと寂しいので fallback で AppName。
  const title = typeof data.title === 'string' ? data.title : '家庭訪問アプリ';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'houmon-default',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知タップで該当 URL を開く
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
