/* sw.js — Service Worker for Endless Arena
   Works on both Replit (/sw.js, scope /) and
   GitHub Pages (/repo-name/sw.js, scope /repo-name/).  */

const CACHE_NAME = 'endless-arena-v8';

/* Detect base path: '' on Replit, '/repo-name' on GitHub Pages */
const BASE_PATH = self.location.pathname.replace('/sw.js', '');

const CORE_ASSETS = [
  BASE_PATH + '/game/index.html',
  BASE_PATH + '/game/game.js',
  BASE_PATH + '/game/heroes-dlc.js',
  BASE_PATH + '/game/colyseus.js',
  BASE_PATH + '/game/offline.js',
  BASE_PATH + '/game/config.js',
  BASE_PATH + '/game/images/heroes/james.png',
  BASE_PATH + '/game/images/heroes/jake.png',
  BASE_PATH + '/game/images/heroes/joross.png',
  BASE_PATH + '/game/images/heroes/jeb.png',
  BASE_PATH + '/game/images/heroes/jeff.png',
  BASE_PATH + '/game/images/heroes/justin.png',
  BASE_PATH + '/game/images/heroes/jian.png',
  BASE_PATH + '/game/images/heroes/joseph.png',
  BASE_PATH + '/game/images/heroes/jaballas.png',
  BASE_PATH + '/game/images/heroes/joshua.png',
  BASE_PATH + '/game/images/heroes/jazmine.png',
  BASE_PATH + '/game/images/heroes/kagoya.png',
  BASE_PATH + '/game/images/heroes/iruha.png',
  BASE_PATH + '/game/images/heroes/yachiyu.png',
  BASE_PATH + '/game/images/heroes/kaitu.png',
  BASE_PATH + '/game/images/heroes/well.png',
];

const SOUND_ASSETS = [
  BASE_PATH + '/game/sounds/bgm_menu.mp3',
  BASE_PATH + '/game/sounds/bgm_game.mp3',
  BASE_PATH + '/game/sounds/hit.mp3',
  BASE_PATH + '/game/sounds/hurt.mp3',
  BASE_PATH + '/game/sounds/dash.mp3',
  BASE_PATH + '/game/sounds/collect.mp3',
  BASE_PATH + '/game/sounds/god.mp3',
  BASE_PATH + '/game/sounds/leaderboard.mp3',
  BASE_PATH + '/game/sounds/fire_james.mp3', BASE_PATH + '/game/sounds/fire_jake.mp3', BASE_PATH + '/game/sounds/fire_joross.mp3',
  BASE_PATH + '/game/sounds/fire_jeb.mp3', BASE_PATH + '/game/sounds/fire_jeff.mp3', BASE_PATH + '/game/sounds/fire_justin.mp3',
  BASE_PATH + '/game/sounds/fire_jian.mp3', BASE_PATH + '/game/sounds/fire_joseph.mp3', BASE_PATH + '/game/sounds/fire_jaballas.mp3',
  BASE_PATH + '/game/sounds/fire_joshua.mp3', BASE_PATH + '/game/sounds/fire_jazmine.mp3', BASE_PATH + '/game/sounds/fire_kagoya.mp3',
  BASE_PATH + '/game/sounds/fire_iruha.mp3', BASE_PATH + '/game/sounds/fire_yachiyu.mp3', BASE_PATH + '/game/sounds/fire_kaitu.mp3',
  BASE_PATH + '/game/sounds/fire_well.mp3',
  BASE_PATH + '/game/sounds/q_james.mp3', BASE_PATH + '/game/sounds/q_jake.mp3', BASE_PATH + '/game/sounds/q_joross.mp3',
  BASE_PATH + '/game/sounds/q_jeb.mp3', BASE_PATH + '/game/sounds/q_jeff.mp3', BASE_PATH + '/game/sounds/q_justin.mp3',
  BASE_PATH + '/game/sounds/q_jian.mp3', BASE_PATH + '/game/sounds/q_joseph.mp3', BASE_PATH + '/game/sounds/q_jaballas.mp3',
  BASE_PATH + '/game/sounds/q_joshua.mp3', BASE_PATH + '/game/sounds/q_jazmine.mp3', BASE_PATH + '/game/sounds/q_kagoya.mp3',
  BASE_PATH + '/game/sounds/q_iruha.mp3', BASE_PATH + '/game/sounds/q_yachiyu.mp3', BASE_PATH + '/game/sounds/q_kaitu.mp3',
  BASE_PATH + '/game/sounds/q_well.mp3',
  BASE_PATH + '/game/sounds/boss1.mp3', BASE_PATH + '/game/sounds/boss2.mp3', BASE_PATH + '/game/sounds/boss3.mp3',
  BASE_PATH + '/game/sounds/boss4.mp3', BASE_PATH + '/game/sounds/boss5.mp3', BASE_PATH + '/game/sounds/boss6.mp3',
  BASE_PATH + '/game/sounds/boss7.mp3', BASE_PATH + '/game/sounds/boss8.mp3', BASE_PATH + '/game/sounds/boss9.mp3',
  BASE_PATH + '/game/sounds/boss10.mp3', BASE_PATH + '/game/sounds/boss11.mp3',
  BASE_PATH + '/game/sounds/boss_black_hole.mp3', BASE_PATH + '/game/sounds/boss_bullet_spiral.mp3',
  BASE_PATH + '/game/sounds/boss_chain_lightning.mp3', BASE_PATH + '/game/sounds/boss_clone_split.mp3',
  BASE_PATH + '/game/sounds/boss_dash_strike.mp3', BASE_PATH + '/game/sounds/boss_eclipse_finale.mp3',
  BASE_PATH + '/game/sounds/boss_gravity_well.mp3', BASE_PATH + '/game/sounds/boss_ground_spikes.mp3',
  BASE_PATH + '/game/sounds/boss_homing_orbs.mp3', BASE_PATH + '/game/sounds/boss_intro_roar.mp3',
  BASE_PATH + '/game/sounds/boss_laser_sweep.mp3', BASE_PATH + '/game/sounds/boss_meteor_rain.mp3',
  BASE_PATH + '/game/sounds/boss_mirror_legion.mp3', BASE_PATH + '/game/sounds/boss_nova_implosion.mp3',
  BASE_PATH + '/game/sounds/boss_phantom_step.mp3', BASE_PATH + '/game/sounds/boss_prismatic_burst.mp3',
  BASE_PATH + '/game/sounds/boss_radial_collapse.mp3', BASE_PATH + '/game/sounds/boss_reality_break.mp3',
  BASE_PATH + '/game/sounds/boss_shadow_clones_assault.mp3', BASE_PATH + '/game/sounds/boss_shockwave.mp3',
  BASE_PATH + '/game/sounds/boss_shuriken_storm.mp3', BASE_PATH + '/game/sounds/boss_summon_minions.mp3',
  BASE_PATH + '/game/sounds/boss_telegraph_beam.mp3', BASE_PATH + '/game/sounds/boss_teleport_strike.mp3',
  BASE_PATH + '/game/sounds/boss_time_freeze_pulse.mp3', BASE_PATH + '/game/sounds/boss_umbral_dash.mp3',
  BASE_PATH + '/game/sounds/boss_void_zone.mp3',
];

/* Cache each sound individually — skip any that fail so a single missing
   file never breaks the whole install. */
function cacheSoundsOpportunistically(cache) {
  return Promise.all(
    SOUND_ASSETS.map(function (url) {
      return fetch(url, { cache: 'no-cache' }).then(function (res) {
        if (res.ok) return cache.put(url, res);
      }).catch(function () {});
    })
  );
}

/* ── Install: cache core assets + all sounds immediately ─────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('[SW] Caching core assets');
      return cache.addAll(CORE_ASSETS).then(function () {
        console.log('[SW] Caching sounds at install time');
        return cacheSoundsOpportunistically(cache);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── Activate: remove old caches ─────────────────────────────────── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      console.log('[SW] Activated, old caches cleared');
      return self.clients.claim();
    })
  );
});

/* ── Fetch: cache-first for game assets, network-first for API ───── */
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  /* API calls — always go to network, never cache */
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return new Response(
          JSON.stringify({ error: 'Offline — server unavailable' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  var isHtml = event.request.headers.get('accept') &&
               event.request.headers.get('accept').includes('text/html');

  /* HTML — network-first so updates are always fetched immediately */
  if (isHtml) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match(BASE_PATH + '/game/index.html');
        });
      })
    );
    return;
  }

  /* All other game assets — cache-first, fall back to network,
     fall back to cache-on-the-fly for anything not pre-cached */
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response.ok && (
          url.pathname.startsWith(BASE_PATH + '/game/') ||
          url.pathname === BASE_PATH + '/sw.js'
        )) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        /* Network failed and nothing in cache — return a 503 so the
           audio element gets a defined error rather than hanging. */
        return new Response('', { status: 503 });
      });
    })
  );
});
