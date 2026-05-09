/* offline.js — Connection awareness for Endless Arena
   Loaded BEFORE game.js so the initial state is always correct.
   Uses a real server ping instead of navigator.onLine,
   which is unreliable in Capacitor WebView (always returns true). */
(function () {
  'use strict';

  var _online = false;
  var _pingInterval = null;
  var PING_INTERVAL_MS = 15000;
  var PING_TIMEOUT_MS  = 10000; /* 10s — gives sleeping servers time to wake */

  /* ── Get the backend base URL ─────────────────────────────────── */
  function getApiBase() {
    var b = (typeof window !== 'undefined') ? (window.BACKEND_URL || '') : '';
    return b.replace(/\/$/, '');
  }

  /* ── Real connectivity check — pings the actual server ───────── */
  function pingServer(callback) {
    var url = getApiBase() + '/api/healthz';
    var xhr = new XMLHttpRequest();
    var done = false;

    function finish(ok) {
      if (done) return;
      done = true;
      callback(ok);
    }

    xhr.timeout = PING_TIMEOUT_MS;
    xhr.onload    = function () { finish(xhr.status >= 200 && xhr.status < 400); };
    xhr.onerror   = function () { finish(false); };
    xhr.ontimeout = function () { finish(false); };

    try {
      xhr.open('GET', url, true);
      xhr.send();
    } catch (e) {
      finish(false);
    }
  }

  /* ── UI update ───────────────────────────────────────────────── */
  function updateUI(online, isInitial) {
    var changed = (_online !== online);
    _online = online;
    window.__nsOnline = online;

    /* Connection pill */
    var pill = document.getElementById('connPill');
    if (pill) {
      pill.innerHTML = online
        ? '<span class="conn-dot"></span>ONLINE'
        : '<span class="conn-dot"></span>OFFLINE';
      pill.className = 'conn-pill ' + (online ? 'conn-online' : 'conn-offline');
      pill.title = online
        ? 'Connected \u2014 all features available'
        : 'No internet \u2014 singleplayer only';
    }

    /* Multiplayer buttons */
    ['btnMultiplayer', 'btnMulti', 'btnGodMulti'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.disabled = !online;
      el.style.opacity = online ? '' : '0.35';
      el.style.cursor  = online ? '' : 'not-allowed';
      el.title = online ? '' : 'Offline \u2014 multiplayer unavailable';
    });

    /* Login / Account button */
    var btnAccount = document.getElementById('btnAccount');
    if (btnAccount) {
      btnAccount.disabled = !online;
      btnAccount.style.opacity = online ? '' : '0.35';
      btnAccount.title = online ? '' : 'Offline \u2014 login unavailable';
    }

    /* Leaderboard button */
    var btnLeader = document.getElementById('btnLeader');
    if (btnLeader) {
      btnLeader.disabled = !online;
      btnLeader.style.opacity = online ? '' : '0.35';
      btnLeader.title = online ? '' : 'Offline \u2014 leaderboard unavailable';
    }

    /* SP offline note */
    var spNote = document.getElementById('spOfflineNote');
    if (spNote) spNote.style.display = online ? 'none' : 'inline';

    /* Dispatch event so game.js can react */
    try {
      window.dispatchEvent(new CustomEvent('nsConnectionChange', { detail: { online: online } }));
    } catch (_) {}

    /* Toast — only show when state actually changes, not on silent boot */
    if (!isInitial && changed) showConnToast(online);
  }

  /* ── Toast notification ──────────────────────────────────────── */
  function showConnToast(online) {
    var existing = document.getElementById('connToast');
    if (existing) { existing.remove(); }

    var toast = document.createElement('div');
    toast.id = 'connToast';
    toast.className = 'conn-toast ' + (online ? 'conn-toast-online' : 'conn-toast-offline');
    toast.innerHTML = online
      ? '<span style="color:#3dffb0;margin-right:7px">&#9679;</span>Back online &mdash; all features restored'
      : '<span style="color:#ff3d6a;margin-right:7px">&#9679;</span>Offline mode &mdash; singleplayer only';
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('conn-toast-show');
      setTimeout(function () {
        toast.classList.remove('conn-toast-show');
        setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 500);
      }, 3500);
    });
  }

  /* ── Check connectivity and update UI ───────────────────────── */
  function checkConnectivity() {
    pingServer(function (ok) {
      updateUI(ok, false);
    });
  }

  /* ── Start polling interval ─────────────────────────────────── */
  function startPolling() {
    if (_pingInterval) clearInterval(_pingInterval);
    _pingInterval = setInterval(checkConnectivity, PING_INTERVAL_MS);
  }

  /* ── Boot — retry quickly in case server is cold-starting ───── */
  function init() {
    updateUI(false, true);
    var attempts = 0;
    var MAX_QUICK = 4;        /* up to 4 rapid attempts before settling */
    var QUICK_RETRY_MS = 4000; /* 4s between quick retries */

    function tryPing() {
      pingServer(function (ok) {
        attempts++;
        if (ok) {
          updateUI(true, true);
          startPolling();
        } else if (attempts < MAX_QUICK) {
          /* Server may still be waking up — try again shortly */
          setTimeout(tryPing, QUICK_RETRY_MS);
        } else {
          /* Give up on quick retries, fall back to normal polling */
          updateUI(false, true);
          startPolling();
        }
      });
    }
    tryPing();
  }

  /* Also react to native browser/OS events as fast-path signals */
  window.addEventListener('online',  function () { checkConnectivity(); });
  window.addEventListener('offline', function () { updateUI(false, false); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Service Worker registration ─────────────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('../sw.js', { scope: '../' })
        .then(function (reg) {
          console.log('[SW] Registered, scope:', reg.scope);
        })
        .catch(function (err) {
          console.warn('[SW] Registration failed:', err);
        });
    });
  }

  /* ── Expose globally ─────────────────────────────────────────── */
  window.__nsOnline = false;
  window.nsIsOnline = function () { return _online; };
})();
