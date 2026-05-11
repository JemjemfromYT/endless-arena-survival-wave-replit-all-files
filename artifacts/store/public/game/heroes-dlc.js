// ==============================================================
// NEURAL SURVIVAL — HEROES DLC PATCH
// Adds 6 paid heroes (justin, jian, joseph, jaballas, joshua,
// jazmine), a Profile (Name+PIN) system that authenticates with
// the backend, server-side unlock state per-profile, and PayMongo
// checkout (₱29 per hero). Locked heroes pop the profile/buy
// modal when clicked. Heroes work in Classic, God, and Multiplayer
// modes (combat hooks added below).
// ==============================================================
(function () {
  "use strict";

  // Locate the API origin. When BACKEND_URL is set (external hosting),
  // prefix all calls with the remote backend URL.
  const API_BASE = (typeof window !== 'undefined' && window.BACKEND_URL && window.BACKEND_URL.length > 0)
    ? window.BACKEND_URL.replace(/\/$/, '') + '/api'
    : '/api';

  // ---------- SVG portrait generator (no external image needed) ----------
  function svgPortrait(label, color) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="g" cx="50%" cy="35%" r="80%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.95"/>
      <stop offset="60%" stop-color="${color}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#05030d" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${color}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#g)"/>
  <circle cx="128" cy="118" r="64" fill="none" stroke="${color}" stroke-width="3" opacity="0.6"/>
  <circle cx="128" cy="118" r="78" fill="none" stroke="${color}" stroke-width="1" opacity="0.35"/>
  <text x="128" y="140" text-anchor="middle" font-family="Orbitron, monospace" font-size="48" font-weight="900" fill="url(#t)">${label}</text>
  <text x="128" y="220" text-anchor="middle" font-family="monospace" font-size="14" fill="${color}" opacity="0.85">NEURAL.OPERATIVE</text>
</svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  // ---------- New hero definitions ----------
  const NEW_HEROES = {
    justin: {
      name: "Justin",
      role: "Spirit Blade",
      img: "images/heroes/justin.png",
      hp: 140,
      speed: 230,
      dmg: 64,
      atkCd: 0.4,
      range: 88,
      abi: "Spirit Guardian",
      abiCd: 14,
      color: "#aaff00",
      desc: "Melee swordsman — sweeping spirit-blade arc cleaves every enemy in front of you. Q summons a floating Spirit Guardian that hovers nearby and fires lime energy bolts at enemies — your melee + its ranged is a unique combo.",
    },
    jian: {
      name: "Jian",
      role: "Laser Lance",
      img: "images/heroes/jian.png",
      hp: 95,
      speed: 225,
      dmg: 1,
      atkCd: 0,
      range: 540,
      abi: "Overcharge",
      abiCd: 9,
      color: "#22e8ff",
      desc: "Hitscan laser lance — instant beam to your aim. Q overcharges into a wide, piercing megabeam.",
    },
    joseph: {
      name: "Joseph",
      role: "Spirit Reaper",
      img: "images/heroes/joseph.png",
      hp: 500,
      speed: 270,
      dmg: 110,
      atkCd: 0.55,
      range: 130,
      abi: "Soul Tether",
      abiCd: 12,
      color: "#a020f0",
      desc: "Real scythe swordsman — sweeping blade reap with motion-blurred curved blade. Enemies below 25% HP are EXECUTED instantly. Every kill drops a Soul that orbits you and auto-fires at the next enemy (stacks up to 8). Q chains the 5 nearest enemies with ghostly tethers.",
    },
    jaballas: {
      name: "Jaballas",
      role: "Shotgunner",
      img: "images/heroes/jaballas.png",
      hp: 140,
      speed: 210,
      dmg: 50,
      atkCd: 1.5,
      range: 300,
      abi: "Slug Round",
      abiCd: 7,
      color: "#ff5577",
      desc: "9-pellet shotgun spread shreds at close range. Q fires a heavy slug round that pierces every enemy in a line.",
    },
    joshua: {
      name: "Joshua",
      role: "Marksman Archer",
      img: "images/heroes/joshua.png",
      hp: 100,
      speed: 230,
      dmg: 78,
      atkCd: 0.9,
      range: 760,
      abi: "Arrow Volley",
      abiCd: 9,
      color: "#3dffb0",
      desc: "Long-range high-damage arrows. Q rains a 12-arrow volley around your aim point.",
    },
    jazmine: {
      name: "Jazmine",
      role: "Nuclear Witch",
      img: "images/heroes/jazmine.png",
      hp: 100,
      speed: 120,
      dmg: 130,
      atkCd: 3,
      range: 760,
      abi: "NUKE",
      abiCd: 30,
      color: "#ff80df",
      desc: "Plasma orbs that EXPLODE in a huge AOE wherever they land. Q charges a 2-second NUCLEAR detonation that wipes the field. 30s cooldown.",
    },
    // ---------- CPK heroes (paid — ₱29 each) ----------
    kagoya: {
      name: "Kagoya",
      role: "Pixel Glitch",
      img: "images/heroes/kagoya.png",
      hp: 110,
      speed: 240,
      dmg: 22,
      atkCd: 0.18,
      range: 580,
      abi: "Glitch Field",
      abiCd: 10,
      color: "#ff3df0",
      desc: "Rapid-fire iridescent pixel shards — three shards per burst with random hue. Q tears a glitch rift that slows every enemy inside it for 4 seconds.",
    },
    iruha: {
      name: "Iruha",
      role: "Combo Striker",
      img: "images/heroes/iruha.png",
      hp: 220,
      speed: 260,
      dmg: 70,
      atkCd: 0.32,
      range: 96,
      abi: "Bulwark Smash",
      abiCd: 9,
      color: "#ffb347",
      desc: "Three-hit melee combo — every third strike unleashes a wide shockwave that knocks enemies back. Q raises a shield (+absorbs damage) and slams the ground, pushing every nearby enemy away.",
    },
    yachiyu: {
      name: "Yachiyu",
      role: "Sound Witch",
      img: "images/heroes/yachiyu.png",
      hp: 95,
      speed: 230,
      dmg: 58,
      atkCd: 0.55,
      range: 720,
      abi: "Silence Pulse",
      abiCd: 11,
      color: "#7df0ff",
      desc: "Long-range homing musical notes that curve toward enemies. Q releases a digital ring that silences and damages every enemy in the room.",
    },
    kaitu: {
      name: "Kaitu",
      role: "Frost Mage",
      img: "images/heroes/kaitu.png",
      hp: 105,
      speed: 220,
      dmg: 72,
      atkCd: 0.6,
      range: 620,
      abi: "Blizzard",
      abiCd: 12,
      color: "#9ad8ff",
      desc: "Ice-crystal shards that pierce and slow on hit. Q calls down a freezing blizzard around you that damages and chills every enemy in the AOE.",
    },
    well: {
      name: "Well",
      role: "Wis Elementalist",
      img: "images/heroes/well.png",
      hp: 130,
      speed: 270,
      dmg: 38,
      atkCd: 0.22,
      range: 110,
      abi: "Wis Strike",
      abiCd: 10,
      color: "#c084ff",
      desc: 'Flurry of rapid sword slashes. Q calls down a massive elemental "Wis" strike — a violet pillar that obliterates everything in a wide AOE around the target.',
    },
  };

  // Only the 5 CPK heroes are paid; the JSquad heroes are free.
  const LOCKED_IDS = ["kagoya", "iruha", "yachiyu", "kaitu", "well"];
  const HERO_PRICE_PHP = 29;

  // Inject heroes into game's HEROES dict + HERO_IDS list.
  Object.assign(HEROES, NEW_HEROES);
  for (const id of LOCKED_IDS) if (!HERO_IDS.includes(id)) HERO_IDS.push(id);

  // ---------- Profile state ----------
  // localStorage keys
  const LS_PROFILE_NAME = "ns_profile_name";
  const LS_PROFILE_PIN = "ns_profile_pin"; // user explicitly OK with insecure local storage
  const LS_UNLOCKED = "ns_unlocked_heroes";

  const profile = {
    name: localStorage.getItem(LS_PROFILE_NAME) || "",
    pin: localStorage.getItem(LS_PROFILE_PIN) || "",
    unlocked: new Set(JSON.parse(localStorage.getItem(LS_UNLOCKED) || "[]")),
  };
  // Expose login state so game.js can gate singleplayer and SP earning on account login.
  window.__nsProfileLoggedIn = !!(profile.name && profile.pin);
  // game.js's refreshSPDisplay() runs before this DLC script loads, so re-run it now
  // that __nsProfileLoggedIn is correctly set from localStorage.
  // Also fetch the real SP from the DB so the badge shows the correct value.
  setTimeout(() => {
    try { if (typeof refreshSPDisplay === "function") refreshSPDisplay(); } catch (_) {}
    try { if (typeof fetchSPFromServer === "function") fetchSPFromServer(); } catch (_) {}
  }, 0);

  function saveProfile() {
    if (profile.name) localStorage.setItem(LS_PROFILE_NAME, profile.name);
    if (profile.pin) localStorage.setItem(LS_PROFILE_PIN, profile.pin);
    localStorage.setItem(LS_UNLOCKED, JSON.stringify([...profile.unlocked]));
  }

  function isLocked(heroId) {
    if (!LOCKED_IDS.includes(heroId)) return false;
    return !profile.unlocked.has(heroId);
  }

  async function apiLogin(name, pin) {
    const r = await fetch(API_BASE + "/profile/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Login failed");
    return j; // { name, unlockedHeroes }
  }

  async function apiCheckout(name, pin, heroId) {
    const r = await fetch(API_BASE + "/heroes/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin, heroId }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Checkout failed");
    return j; // { checkoutUrl }
  }

  async function apiUnlock(name, pin, heroId) {
    const r = await fetch(API_BASE + "/heroes/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin, heroId }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Unlock failed");
    return j;
  }

  function applyUnlocksFromServer(list) {
    profile.unlocked = new Set(list || []);
    saveProfile();
    if (typeof renderHeroGrid === "function" && state.scene === "heroSelect") {
      try {
        renderHeroGrid();
      } catch (_) {}
    }
  }

  // ---------- Profile / Buy modal (injected) ----------
  const modalCss = `
  .ns-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.72); backdrop-filter:blur(6px); z-index:99999; display:flex; align-items:flex-start; justify-content:center; padding:16px; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .ns-modal { background:linear-gradient(180deg, rgba(20,14,48,.95), rgba(10,8,28,.95)); border:1px solid rgba(157,92,255,.55); border-radius:16px; padding:20px; max-width:420px; width:100%; max-height:none; color:#e7e3ff; font-family:ui-monospace,Menlo,Consolas,monospace; box-shadow:0 0 60px rgba(157,92,255,.35); margin:auto; }
  @media (min-height:640px) { .ns-modal-bg { align-items:center; } }
  .ns-modal h2 { font-family:'Orbitron',monospace; letter-spacing:.18em; text-transform:uppercase; margin:0 0 6px; background:linear-gradient(90deg,#22e8ff,#9d5cff 50%,#ff2bd6); -webkit-background-clip:text; background-clip:text; color:transparent; font-size:20px; }
  .ns-modal p { color:#8a85b8; margin:0 0 14px; font-size:13px; line-height:1.5; }
  .ns-modal label { display:block; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:#22e8ff; margin:10px 0 4px; }
  .ns-modal input { width:100%; background:rgba(0,0,0,.45); border:1px solid rgba(157,92,255,.35); color:#e7e3ff; padding:10px 12px; border-radius:8px; font-family:inherit; letter-spacing:.08em; font-size:14px; }
  .ns-modal .ns-actions { display:flex; gap:8px; margin-top:18px; }
  .ns-modal button { flex:1; appearance:none; border:1px solid rgba(34,232,255,.5); background:linear-gradient(180deg,rgba(34,232,255,.12),rgba(157,92,255,.12)); color:#e7e3ff; padding:11px 14px; border-radius:10px; cursor:pointer; font-family:inherit; font-weight:700; letter-spacing:.12em; text-transform:uppercase; font-size:12px; }
  .ns-modal button.primary { border-color:rgba(255,43,214,.6); background:linear-gradient(180deg,rgba(255,43,214,.22),rgba(157,92,255,.22)); }
  .ns-modal button.ghost { background:transparent; border-color:rgba(231,227,255,.25); }
  .ns-modal button:disabled { opacity:.5; cursor:not-allowed; }
  .ns-modal .ns-err { color:#ff3d6a; font-size:12px; margin-top:8px; min-height:16px; }
  .ns-modal .ns-hero-card { display:flex; gap:12px; align-items:center; padding:10px; border:1px solid rgba(157,92,255,.3); border-radius:10px; background:rgba(0,0,0,.3); margin-bottom:12px; }
  .ns-modal .ns-hero-card img { width:64px; height:64px; border-radius:8px; object-fit:cover; }
  .ns-modal .ns-hero-card .meta h3 { margin:0; font-family:'Orbitron',monospace; letter-spacing:.1em; font-size:14px; }
  .ns-modal .ns-hero-card .meta div { color:#22e8ff; font-size:11px; letter-spacing:.18em; text-transform:uppercase; margin-top:2px; }
  .ns-modal .ns-price { color:#ffd166; font-weight:900; font-size:24px; font-family:'Orbitron',monospace; text-align:center; padding:12px; border:1px dashed rgba(255,209,102,.5); border-radius:10px; margin:8px 0; }
  .hero-card.locked-card { position:relative; overflow:hidden; }
  .hero-card.locked-card img { filter:grayscale(.9) brightness(.4); }
  .hero-card.locked-card .hero-fx-layer { opacity:.3; }
  .ns-lock-overlay {
    position:absolute; inset:0; z-index:10;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;
    background:rgba(4,2,18,0.62);
    backdrop-filter:blur(2px);
    pointer-events:none;
    border-radius:inherit;
  }
  .ns-lock-overlay svg { width:38px; height:38px; filter:drop-shadow(0 0 10px rgba(255,209,102,0.7)); }
  .ns-lock-overlay .ns-lock-label {
    font-family:'Orbitron',monospace; font-size:8px; font-weight:900;
    letter-spacing:.25em; color:#ffd166;
    text-shadow:0 0 8px rgba(255,209,102,0.8);
    text-transform:uppercase;
  }
  .ns-lock-overlay .ns-lock-price {
    font-family:'Orbitron',monospace; font-size:7px; font-weight:700;
    letter-spacing:.12em; color:rgba(255,209,102,0.6);
    text-transform:uppercase;
  }
  .hero-card.locked-card:hover .ns-lock-overlay { background:rgba(4,2,18,0.45); }
  .hero-card.locked-card:hover svg { filter:drop-shadow(0 0 16px rgba(255,209,102,1)); }
  `;
  const styleTag = document.createElement("style");
  styleTag.textContent = modalCss;
  document.head.appendChild(styleTag);

  let modalEl = null;
  function closeModal() {
    if (modalEl) {
      modalEl.remove();
      modalEl = null;
    }
  }
  function openModal(html) {
    closeModal();
    modalEl = document.createElement("div");
    modalEl.className = "ns-modal-bg";
    modalEl.innerHTML = `<div class="ns-modal">${html}</div>`;
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });
    document.body.appendChild(modalEl);
    return modalEl.querySelector(".ns-modal");
  }

  function showProfileModal(heroId) {
    const h = HEROES[heroId];
    const heroCard = `
      <div class="ns-hero-card">
        <img src="${h.img}" alt="${h.name}"/>
        <div class="meta">
          <h3 style="color:${h.color}">${h.name}</h3>
          <div>${h.role}</div>
        </div>
      </div>`;

    if (!profile.name || !profile.pin) {
      // first-time: ask for Name + PIN
      const inner = openModal(`
        <h2>Create Profile</h2>
        <p>To unlock <b style="color:${h.color}">${h.name}</b>, create a profile with a name and PIN. Your PIN is saved securely on the server — your unlocked heroes follow your name + PIN across devices.</p>
        ${heroCard}
        <label for="ns-name">Name</label>
        <input id="ns-name" type="text" maxlength="24" placeholder="Pick any name"/>
        <label for="ns-pin">PIN (4–8 digits)</label>
        <input id="ns-pin" type="password" inputmode="numeric" maxlength="8" placeholder="••••"/>
        <div class="ns-err" id="ns-err"></div>
        <div class="ns-actions">
          <button class="ghost" id="ns-cancel">Cancel</button>
          <button class="primary" id="ns-submit">Continue</button>
        </div>
      `);
      const nameInput = inner.querySelector("#ns-name");
      const pinInput = inner.querySelector("#ns-pin");
      const errEl = inner.querySelector("#ns-err");
      nameInput.value = state.username || "";
      nameInput.focus();
      inner.querySelector("#ns-cancel").onclick = closeModal;
      inner.querySelector("#ns-submit").onclick = async () => {
        errEl.textContent = "";
        const n = nameInput.value.trim();
        const p = pinInput.value.trim();
        if (!n) {
          errEl.textContent = "Enter a name.";
          return;
        }
        if (!/^\d{4,8}$/.test(p)) {
          errEl.textContent = "PIN must be 4-8 digits.";
          return;
        }
        inner.querySelector("#ns-submit").disabled = true;
        try {
          const data = await apiLogin(n, p);
          profile.name = data.name;
          profile.pin = p;
          applyUnlocksFromServer(data.unlockedHeroes);
          window.__nsProfileLoggedIn = true;
          try { if(typeof refreshSPDisplay === 'function') refreshSPDisplay(); } catch(_){}
          try { if(typeof fetchSPFromServer === 'function') fetchSPFromServer(); } catch(_){}
          showBuyModal(heroId);
        } catch (e) {
          errEl.textContent = e.message || "Failed.";
          inner.querySelector("#ns-submit").disabled = false;
        }
      };
    } else {
      showBuyModal(heroId);
    }
  }

  // ---------- Account modal — standalone login / create account / logout ----------
  // Shown by clicking the top-right Account icon on the menu screen, and
  // when the user tries to enter Multiplayer / buy a hero without being
  // logged in. After login, state.username is updated and the icon label
  // shows the signed-in name.
  function setUsernameFromProfile() {
    if (profile.name) {
      state.username = profile.name;
      try {
        localStorage.setItem("ns_user", profile.name);
      } catch (_) {}
      const u = document.getElementById("username");
      if (u) u.value = profile.name;
    }
    refreshAccountLabel();
  }
  function refreshAccountLabel() {
    const lbl = document.getElementById("btnAccountLabel");
    if (!lbl) return;
    lbl.textContent = profile.name ? profile.name.toUpperCase() : "LOGIN";
  }
  function showAccountModal() {
    if (profile.name && profile.pin) {
      // Already signed in — show profile + logout.
      const inner = openModal(`
        <h2>Account</h2>
        <p>Signed in as <b style="color:#22e8ff">${profile.name}</b>. Your unlocked heroes follow your account across devices.</p>
        <div style="background:rgba(34,232,255,0.06); border:1px solid rgba(34,232,255,0.35); border-radius:10px; padding:12px; margin:6px 0 12px;">
          <div style="font-size:11px; letter-spacing:.18em; color:#22e8ff; text-transform:uppercase; margin-bottom:4px;">Unlocked heroes</div>
          <div style="font-size:13px; color:#cfeaff;">${profile.unlocked.size > 0 ? [...profile.unlocked].join(", ") : '<span style="color:#8a85b8">— none yet —</span>'}</div>
        </div>
        <div class="ns-actions">
          <button class="ghost" id="ns-cancel">Close</button>
          <button class="primary" id="ns-logout">Log Out</button>
        </div>
      `);
      inner.querySelector("#ns-cancel").onclick = closeModal;
      inner.querySelector("#ns-logout").onclick = () => {
        profile.name = "";
        profile.pin = "";
        profile.unlocked = new Set();
        window.__nsProfileLoggedIn = false;
        try {
          localStorage.removeItem(LS_PROFILE_NAME);
          localStorage.removeItem(LS_PROFILE_PIN);
          localStorage.removeItem(LS_UNLOCKED);
          localStorage.removeItem("ns_user");
        } catch (_) {}
        state.username = "";
        const u = document.getElementById("username");
        if (u) u.value = "";
        try { if (typeof refreshSPDisplay === "function") refreshSPDisplay(); } catch (_) {}
        // Reset hero to free default if currently on a locked one.
        if (LOCKED_IDS.includes(state.hero)) {
          state.hero = "james";
          try {
            localStorage.setItem("ns_hero", "james");
          } catch (_) {}
        }
        refreshAccountLabel();
        try {
          renderHeroGrid();
        } catch (_) {}
        try {
          toast("Logged out", 1500);
        } catch (_) {}
        closeModal();
      };
      return;
    }
    // Not signed in — show LOGIN / CREATE tabs.
    const inner = openModal(`
      <h2>Account</h2>
      <p>Log in to keep your unlocked heroes and play multiplayer.</p>
      <div style="display:flex; gap:6px; margin-bottom:14px;">
        <button class="ghost" id="ns-tab-login" style="flex:1;">Log In</button>
        <button class="ghost" id="ns-tab-create" style="flex:1;">Create</button>
      </div>
      <div id="ns-tab-body"></div>
    `);
    const body = inner.querySelector("#ns-tab-body");
    const tabLogin = inner.querySelector("#ns-tab-login");
    const tabCreate = inner.querySelector("#ns-tab-create");
    function selectTab(which) {
      tabLogin.classList.toggle("primary", which === "login");
      tabCreate.classList.toggle("primary", which === "create");
      const isCreate = which === "create";
      body.innerHTML = `
        <label for="ns-name">Name</label>
        <input id="ns-name" type="text" maxlength="24" placeholder="${isCreate ? "Pick any name" : "Your name"}"/>
        <label for="ns-pin">PIN (4–8 digits)</label>
        <input id="ns-pin" type="password" inputmode="numeric" maxlength="8" placeholder="••••"/>
        <div class="ns-err" id="ns-err"></div>
        <div class="ns-actions">
          <button class="ghost" id="ns-cancel">Cancel</button>
          <button class="primary" id="ns-submit">${isCreate ? "Create Account" : "Log In"}</button>
        </div>
      `;
      const nameInput = body.querySelector("#ns-name");
      const pinInput = body.querySelector("#ns-pin");
      const errEl = body.querySelector("#ns-err");
      nameInput.value = state.username || "";
      nameInput.focus();
      body.querySelector("#ns-cancel").onclick = closeModal;
      body.querySelector("#ns-submit").onclick = async () => {
        errEl.textContent = "";
        const n = nameInput.value.trim();
        const p = pinInput.value.trim();
        if (!n) {
          errEl.textContent = "Enter a name.";
          return;
        }
        if (!/^\d{4,8}$/.test(p)) {
          errEl.textContent = "PIN must be 4-8 digits.";
          return;
        }
        body.querySelector("#ns-submit").disabled = true;
        try {
          const data = await apiLogin(n, p);
          profile.name = data.name;
          profile.pin = p;
          applyUnlocksFromServer(data.unlockedHeroes);
          setUsernameFromProfile();
          window.__nsProfileLoggedIn = true;
          try { if(typeof refreshSPDisplay === 'function') refreshSPDisplay(); } catch(_){}
          try { if(typeof fetchSPFromServer === 'function') fetchSPFromServer(); } catch(_){}
          try {
            toast(`Welcome, ${profile.name}!`, 1500);
          } catch (_) {}
          closeModal();
        } catch (e) {
          errEl.textContent = e.message || "Failed.";
          body.querySelector("#ns-submit").disabled = false;
        }
      };
    }
    tabLogin.onclick = () => selectTab("login");
    tabCreate.onclick = () => selectTab("create");
    selectTab("login");
  }
  // Expose account modal so game.js can open it (e.g. from login-gated buttons).
  window.__nsShowAccountModal = showAccountModal;

  // ---------- Settings modal — graphics quality ----------
  const GFX_KEY = "ns_gfx";
  const GFX = (window.NS_GFX = window.NS_GFX || {
    level: localStorage.getItem(GFX_KEY) || "high",
  });
  function applyGfx() {
    const lvl = GFX.level;
    GFX.particleMul = lvl === "low" ? 0.25 : lvl === "medium" ? 0.6 : 1;
    GFX.shadowMul = lvl === "low" ? 0 : lvl === "medium" ? 0.5 : 1;
    GFX.fxRingMul = lvl === "low" ? 0.5 : lvl === "medium" ? 0.8 : 1;
    document.body.dataset.gfx = lvl;
    try {
      localStorage.setItem(GFX_KEY, lvl);
    } catch (_) {}
  }
  applyGfx();

  // Wrap the global particles() function so its count scales with the
  // graphics setting. Original signature: particles(x, y, color, count, spd, life, radius)
  if (typeof window.particles === "function" && !window.particles.__nsWrapped) {
    const orig = window.particles;
    window.particles = function (x, y, color, count, spd, life, radius) {
      const c = Math.max(1, Math.round((count | 0) * GFX.particleMul));
      return orig(x, y, color, c, spd, life, radius);
    };
    window.particles.__nsWrapped = true;
  }
  // Wrap canvas shadowBlur to scale by GFX (much faster on weak GPUs).
  try {
    const proto = CanvasRenderingContext2D.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "shadowBlur");
    if (desc && desc.set && !proto.__nsShadowWrapped) {
      Object.defineProperty(proto, "shadowBlur", {
        configurable: true,
        get() {
          return desc.get.call(this);
        },
        set(v) {
          desc.set.call(this, (v || 0) * GFX.shadowMul);
        },
      });
      proto.__nsShadowWrapped = true;
    }
  } catch (_) {}

  function showSettingsModal() {
    const inner = openModal(`
      <h2>Settings</h2>
      <p>Adjust graphics quality. Lower settings reduce particles and glow effects for smoother gameplay on slower devices.</p>
      <label>Graphics Quality</label>
      <div id="ns-gfx-row" style="display:flex; gap:6px;">
        <button class="ghost" data-gfx="low"    style="flex:1;">Low</button>
        <button class="ghost" data-gfx="medium" style="flex:1;">Medium</button>
        <button class="ghost" data-gfx="high"   style="flex:1;">High</button>
      </div>
      <p id="ns-gfx-desc" style="margin-top:10px; font-size:12px;"></p>
      <div class="ns-actions">
        <button class="primary" id="ns-close">Done</button>
      </div>
    `);
    const desc = inner.querySelector("#ns-gfx-desc");
    function refresh() {
      inner.querySelectorAll("#ns-gfx-row button").forEach((b) => {
        b.classList.toggle("primary", b.dataset.gfx === GFX.level);
      });
      const txt = {
        low: "Minimal particles, no glow. Best for old phones / weak GPUs.",
        medium: "Reduced particles and softer glow. Balanced for most devices.",
        high: "Full particles and full glow effects. Default on desktops.",
      };
      desc.textContent = txt[GFX.level] || "";
    }
    inner.querySelectorAll("#ns-gfx-row button").forEach((b) => {
      b.onclick = () => {
        GFX.level = b.dataset.gfx;
        applyGfx();
        refresh();
      };
    });
    inner.querySelector("#ns-close").onclick = closeModal;
    refresh();
  }

  // Wire up the new icon buttons + multiplayer login gate.
  function wireMenuIcons() {
    const acct = document.getElementById("btnAccount");
    const sett = document.getElementById("btnSettings");
    if (acct && !acct.__nsWired) {
      acct.__nsWired = true;
      acct.onclick = showAccountModal;
    }
    if (sett && !sett.__nsWired) {
      sett.__nsWired = true;
      sett.onclick = showSettingsModal;
    }
    // Gate multiplayer behind login. Wrap original handlers so they only
    // run after a successful login.
    const gateMulti = (id) => {
      const btn = document.getElementById(id);
      if (!btn || btn.__nsGated) return;
      btn.__nsGated = true;
      const orig = btn.onclick;
      btn.onclick = function (ev) {
        if (!profile.name || !profile.pin) {
          try {
            toast("Log in first to play multiplayer.", 1800);
          } catch (_) {}
          showAccountModal();
          return;
        }
        // Sync username for downstream code.
        setUsernameFromProfile();
        if (typeof orig === "function") return orig.call(this, ev);
      };
    };
    gateMulti("btnMulti");
    gateMulti("btnGodMulti");
    // Single-player & God-solo: log a friendly callsign default if needed.
    const ensureName = (id) => {
      const btn = document.getElementById(id);
      if (!btn || btn.__nsNamed) return;
      btn.__nsNamed = true;
      const orig = btn.onclick;
      btn.onclick = function (ev) {
        if (!state.username) {
          // Use profile name if logged in, else "Operator".
          state.username = profile.name || "Operator";
          try {
            localStorage.setItem("ns_user", state.username);
          } catch (_) {}
          const u = document.getElementById("username");
          if (u) u.value = state.username;
        }
        if (typeof orig === "function") return orig.call(this, ev);
      };
    };
    ensureName("btnSingle");
    ensureName("btnGodSolo");
    refreshAccountLabel();
  }
  // Wire on next tick so game.js handlers attach first.
  setTimeout(wireMenuIcons, 0);
  setTimeout(wireMenuIcons, 200);
  setTimeout(wireMenuIcons, 1000);
  // Also re-wire whenever menu screen becomes visible (defensive).
  document.addEventListener("visibilitychange", () =>
    setTimeout(wireMenuIcons, 200),
  );

  function showBuyModal(heroId) {
    const h = HEROES[heroId];
    if (profile.unlocked.has(heroId)) {
      // Already unlocked — just select.
      state.hero = heroId;
      localStorage.setItem("ns_hero", heroId);
      closeModal();
      try {
        renderHeroGrid();
      } catch (_) {}
      return;
    }
    const heroCard = `
      <div class="ns-hero-card">
        <img src="${h.img}" alt="${h.name}"/>
        <div class="meta">
          <h3 style="color:${h.color}">${h.name}</h3>
          <div>${h.role}</div>
        </div>
      </div>`;
    const SP_COST = 1500;
    let currentSP = 0;
    try { currentSP = typeof getSP === 'function' ? getSP() : 0; } catch(_){}
    const hasEnoughSP = currentSP >= SP_COST;
    const spRow = `
      <div style="margin:10px 0 4px; padding:10px 12px; background:rgba(255,209,102,0.09); border:1px solid rgba(255,209,102,0.3); border-radius:8px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <span style="color:#ffd166; font-size:12px; font-family:'Orbitron',monospace;">⭐ ${currentSP.toLocaleString()} SP available</span>
        <button class="primary" id="ns-pay-sp" ${hasEnoughSP?'':'disabled'} style="font-size:11px; padding:6px 12px; background:${hasEnoughSP?'rgba(255,209,102,0.18)':'rgba(80,60,0,0.3)'}; border-color:${hasEnoughSP?'rgba(255,209,102,0.6)':'rgba(80,60,0,0.4)'}; color:${hasEnoughSP?'#ffd166':'#aa8800'};">${hasEnoughSP ? `Unlock for ${SP_COST} SP` : `Need ${SP_COST} SP`}</button>
      </div>`;
    const inner = openModal(`
      <h2>Unlock ${h.name}</h2>
      <p>Signed in as <b style="color:${h.color}">${profile.name}</b>. Pay once to unlock — the hero stays unlocked on your profile forever.</p>
      ${heroCard}
      <p style="margin:0 0 6px;">${h.desc}</p>
      <div class="ns-price">₱${HERO_PRICE_PHP}.00 PHP</div>
      ${spRow}
      <div class="ns-err" id="ns-err"></div>
      <div class="ns-actions">
        <button class="ghost" id="ns-cancel">Maybe later</button>
        <button class="primary" id="ns-pay">Pay with GCash / Card</button>
      </div>
      <div style="margin-top:12px; text-align:center;"><button class="ghost" id="ns-switch" style="font-size:10px; padding:6px 10px;">Switch profile</button></div>
    `);
    inner.querySelector("#ns-cancel").onclick = closeModal;
    inner.querySelector("#ns-switch").onclick = () => {
      profile.name = "";
      profile.pin = "";
      localStorage.removeItem(LS_PROFILE_NAME);
      localStorage.removeItem(LS_PROFILE_PIN);
      profile.unlocked = new Set();
      saveProfile();
      showProfileModal(heroId);
    };
    const spBtn = inner.querySelector("#ns-pay-sp");
    if(spBtn){
      spBtn.onclick = () => {
        const errEl = inner.querySelector("#ns-err");
        if(!hasEnoughSP){ errEl.textContent = `You need ${SP_COST} SP. Earn SP by playing Classic mode!`; return; }
        try{
          addSP(-SP_COST);
          profile.unlocked.add(heroId);
          saveProfile();
          closeModal();
          try{ renderHeroGrid(); }catch(_){}
          try{ toast(`${h.name} unlocked with SP!`, 2400); }catch(_){}
        }catch(e){
          errEl.textContent = 'SP unlock failed: ' + (e.message||e);
        }
      };
    }
    inner.querySelector("#ns-pay").onclick = async () => {
      const errEl = inner.querySelector("#ns-err");
      errEl.textContent = "";
      inner.querySelector("#ns-pay").disabled = true;
      try {
        const { checkoutUrl } = await apiCheckout(
          profile.name,
          profile.pin,
          heroId,
        );
        window.location.href = checkoutUrl;
      } catch (e) {
        errEl.textContent = e.message || "Checkout failed.";
        inner.querySelector("#ns-pay").disabled = false;
      }
    };
  }

  // ---------- Inject CSS overrides for hero portraits + animated bg ----------
  // Portraits are now transparent PNG full-body shots — make them smaller
  // (object-fit:contain, taller aspect) so the entire body shows on a dark
  // gradient backdrop, and host an animated <canvas> behind each portrait.
  (function injectHeroCardCss() {
    if (document.getElementById("ns-hero-card-css")) return;
    const s = document.createElement("style");
    s.id = "ns-hero-card-css";
    s.textContent = `
      .hero-card { position: relative; }
      .hero-card .ns-hero-bg {
        position: absolute;
        left: 0; right: 0; top: 0; bottom: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        display: block;
        border-radius: 14px;
        background:
          radial-gradient(ellipse at 50% 90%, rgba(0,0,0,0.55), transparent 65%),
          radial-gradient(circle at 50% 35%, rgba(157,92,255,0.10), transparent 70%),
          linear-gradient(180deg, #07041a 0%, #0a0418 100%);
      }
      .hero-card img {
        position: relative;
        z-index: 1;
        width: 86% !important;
        margin: 4% 7% 0 7% !important;
        aspect-ratio: 3/4 !important;
        object-fit: contain !important;
        background: transparent !important;
        filter: drop-shadow(0 8px 14px rgba(0,0,0,0.55));
      }
      .hero-card .meta { position: relative; z-index: 2; background: var(--panel-2); }
    `;
    document.head.appendChild(s);
  })();

  // Per-hero STATIC themed scene backgrounds. Each hero gets a unique
  // scene drawn ONCE to a canvas per card (and redrawn on resize). No
  // animation loop — the scene is visible at all times regardless of
  // hover/selection state.
  //
  // Each entry: { sky:[topColor, bottomColor], draw:(c,W,H)=>{ ... } }
  // The draw function paints silhouettes/atmosphere on top of the sky.
  const HERO_SCENES = {
    // James — Sword Tank — DARK ARMORY with crossed swords on the wall
    james: {
      sky: ["#0a1820", "#04080d"],
      draw(c, W, H) {
        // Stone wall behind
        c.fillStyle = "rgba(20,40,55,0.55)";
        for (let y = 0; y < H; y += 18)
          for (let x = 0; x < W; x += 24) {
            c.fillRect(x, y, 22, 16);
          }
        c.fillStyle = "rgba(0,0,0,0.35)";
        c.fillRect(0, H * 0.78, W, H * 0.22);
        // Two crossed swords behind hero (giant silhouettes)
        c.save();
        c.translate(W / 2, H * 0.45);
        c.shadowColor = "#22e8ff";
        c.shadowBlur = 22;
        const drawBigSword = (rot) => {
          c.save();
          c.rotate(rot);
          c.fillStyle = "rgba(180,210,225,0.85)";
          c.beginPath();
          c.moveTo(0, -H * 0.42);
          c.lineTo(8, -H * 0.4);
          c.lineTo(8, H * 0.05);
          c.lineTo(-8, H * 0.05);
          c.lineTo(-8, -H * 0.4);
          c.closePath();
          c.fill();
          c.fillStyle = "rgba(40,80,120,0.9)";
          c.fillRect(-22, H * 0.04, 44, 8); // crossguard
          c.fillStyle = "rgba(20,30,40,0.95)";
          c.fillRect(-5, H * 0.12, 10, 28); // handle
          c.fillStyle = "rgba(34,232,255,0.9)";
          c.beginPath();
          c.arc(0, H * 0.4 + 8, 6, 0, Math.PI * 2);
          c.fill();
          c.restore();
        };
        drawBigSword(-0.45);
        drawBigSword(0.45);
        c.restore();
        // Cyan rim glow
        const g = c.createRadialGradient(
          W / 2,
          H * 0.45,
          10,
          W / 2,
          H * 0.45,
          W * 0.55,
        );
        g.addColorStop(0, "rgba(34,232,255,0.20)");
        g.addColorStop(1, "rgba(34,232,255,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
      },
    },
    // Jake — pink magical CRYSTAL CAVE
    jake: {
      sky: ["#220420", "#08020a"],
      draw(c, W, H) {
        // Pink mist
        const g = c.createRadialGradient(
          W / 2,
          H * 0.55,
          0,
          W / 2,
          H * 0.55,
          W * 0.7,
        );
        g.addColorStop(0, "rgba(255,43,214,0.22)");
        g.addColorStop(1, "rgba(40,5,40,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        // Foreground crystal stalagmites
        const drawCrystal = (x, baseY, h, w, alpha) => {
          c.save();
          c.shadowColor = "#ff2bd6";
          c.shadowBlur = 14;
          const grd = c.createLinearGradient(x, baseY - h, x, baseY);
          grd.addColorStop(0, `rgba(255,128,223,${alpha})`);
          grd.addColorStop(1, `rgba(160,32,240,${alpha * 0.5})`);
          c.fillStyle = grd;
          c.beginPath();
          c.moveTo(x - w / 2, baseY);
          c.lineTo(x, baseY - h);
          c.lineTo(x + w / 2, baseY);
          c.closePath();
          c.fill();
          c.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`;
          c.lineWidth = 1.2;
          c.beginPath();
          c.moveTo(x, baseY - h);
          c.lineTo(x, baseY);
          c.stroke();
          c.restore();
        };
        // Background crystals (smaller, dimmer)
        for (let i = 0; i < 7; i++) {
          const x = (i + 0.5) * (W / 7);
          drawCrystal(
            x,
            H * 0.95,
            H * (0.18 + Math.sin(i * 1.3) * 0.06),
            W * 0.1,
            0.45,
          );
        }
        // Foreground crystals (bigger)
        drawCrystal(W * 0.18, H * 1.0, H * 0.55, W * 0.16, 0.85);
        drawCrystal(W * 0.82, H * 1.0, H * 0.5, W * 0.15, 0.85);
        drawCrystal(W * 0.5, H * 1.0, H * 0.3, W * 0.1, 0.7);
        // A few floating diamond bits (static)
        c.fillStyle = "rgba(255,43,214,0.8)";
        c.shadowColor = "#ff2bd6";
        c.shadowBlur = 10;
        const dia = (x, y, s) => {
          c.save();
          c.translate(x, y);
          c.beginPath();
          c.moveTo(0, -s);
          c.lineTo(s * 0.7, 0);
          c.lineTo(0, s);
          c.lineTo(-s * 0.7, 0);
          c.closePath();
          c.fill();
          c.restore();
        };
        dia(W * 0.25, H * 0.3, 6);
        dia(W * 0.7, H * 0.18, 5);
        dia(W * 0.55, H * 0.4, 4);
      },
    },
    // Joross — Gunner — DESERT WASTELAND with sun
    joross: {
      sky: ["#3a1f08", "#1a0a04"],
      draw(c, W, H) {
        // Sky gradient
        const sky = c.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "rgba(255,170,85,0.28)");
        sky.addColorStop(0.6, "rgba(120,40,30,0.10)");
        sky.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = sky;
        c.fillRect(0, 0, W, H);
        // Sun
        c.save();
        c.shadowColor = "#ffd166";
        c.shadowBlur = 40;
        c.fillStyle = "#ffd166";
        c.beginPath();
        c.arc(W * 0.7, H * 0.3, W * 0.1, 0, Math.PI * 2);
        c.fill();
        c.restore();
        // Distant dunes (silhouettes)
        c.fillStyle = "rgba(40,15,5,0.8)";
        c.beginPath();
        c.moveTo(0, H * 0.78);
        c.bezierCurveTo(
          W * 0.2,
          H * 0.62,
          W * 0.4,
          H * 0.72,
          W * 0.55,
          H * 0.65,
        );
        c.bezierCurveTo(W * 0.7, H * 0.58, W * 0.85, H * 0.7, W, H * 0.66);
        c.lineTo(W, H);
        c.lineTo(0, H);
        c.closePath();
        c.fill();
        // Closer dunes
        c.fillStyle = "rgba(20,8,2,0.9)";
        c.beginPath();
        c.moveTo(0, H * 0.92);
        c.bezierCurveTo(W * 0.3, H * 0.78, W * 0.6, H * 0.88, W, H * 0.82);
        c.lineTo(W, H);
        c.lineTo(0, H);
        c.closePath();
        c.fill();
        // Cactus silhouette
        c.fillStyle = "rgba(10,5,2,1)";
        c.fillRect(W * 0.12, H * 0.7, 6, H * 0.25);
        c.fillRect(W * 0.1, H * 0.78, 4, H * 0.1);
        c.fillRect(W * 0.16, H * 0.74, 4, H * 0.08);
      },
    },
    // Jeb — Healer — VERDANT FOREST GROVE
    jeb: {
      sky: ["#0a2818", "#021008"],
      draw(c, W, H) {
        // Light shafts from above
        const g = c.createLinearGradient(W / 2, 0, W / 2, H);
        g.addColorStop(0, "rgba(124,255,178,0.18)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        // Tree trunks (silhouettes)
        const drawTree = (x, w, h) => {
          c.fillStyle = "rgba(8,30,18,0.95)";
          c.fillRect(x - w / 2, H - h, w, h);
          c.beginPath();
          c.fillStyle = "rgba(15,55,30,0.9)";
          c.ellipse(x, H - h - w * 1.2, w * 1.8, w * 1.6, 0, 0, Math.PI * 2);
          c.fill();
        };
        drawTree(W * 0.1, 16, H * 0.6);
        drawTree(W * 0.3, 22, H * 0.75);
        drawTree(W * 0.78, 18, H * 0.65);
        drawTree(W * 0.92, 14, H * 0.55);
        // Floating green motes
        c.fillStyle = "rgba(124,255,178,0.85)";
        c.shadowColor = "#7cffb2";
        c.shadowBlur = 8;
        for (let i = 0; i < 8; i++) {
          const x = (i * 73 + 50) % W;
          const y = (i * 47 + 30) % (H * 0.8);
          c.beginPath();
          c.arc(x, y, 2.2, 0, Math.PI * 2);
          c.fill();
        }
        // Mossy ground
        c.fillStyle = "rgba(8,40,22,0.9)";
        c.fillRect(0, H * 0.92, W, H * 0.08);
      },
    },
    // Jeff — Daggers — DARK BLOOD ALLEY
    jeff: {
      sky: ["#1a0408", "#080202"],
      draw(c, W, H) {
        // Brick wall
        c.fillStyle = "rgba(40,8,12,0.85)";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "rgba(70,15,20,0.5)";
        for (let y = 0; y < H; y += 14) {
          const off = (Math.floor(y / 14) % 2) * 14;
          for (let x = -off; x < W; x += 28) {
            c.fillRect(x, y, 26, 12);
          }
        }
        // Blood streaks dripping
        c.fillStyle = "rgba(180,20,40,0.7)";
        c.shadowColor = "#ff3d6a";
        c.shadowBlur = 12;
        const drip = (x, len, w) => {
          c.fillRect(x - w / 2, 0, w, len);
          c.beginPath();
          c.arc(x, len, w * 1.5, 0, Math.PI * 2);
          c.fill();
        };
        drip(W * 0.22, H * 0.45, 4);
        drip(W * 0.58, H * 0.3, 3);
        drip(W * 0.82, H * 0.55, 5);
        // Single hanging lamp
        c.fillStyle = "rgba(255,200,100,0.8)";
        c.shadowColor = "#ffaa55";
        c.shadowBlur = 30;
        c.beginPath();
        c.arc(W * 0.5, H * 0.18, 7, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
        // Lamp glow halo
        const glow = c.createRadialGradient(
          W * 0.5,
          H * 0.18,
          5,
          W * 0.5,
          H * 0.18,
          W * 0.4,
        );
        glow.addColorStop(0, "rgba(255,200,100,0.25)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = glow;
        c.fillRect(0, 0, W, H);
      },
    },
    // Justin — Spirit Blade — MISTY SPIRIT FOREST
    justin: {
      sky: ["#08200a", "#020a04"],
      draw(c, W, H) {
        // Misty green light from above
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(170,255,0,0.22)");
        g.addColorStop(0.7, "rgba(20,80,30,0.10)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        // Distant tree trunks (multiple layers for depth)
        const trees = (alpha, scale) => {
          c.fillStyle = `rgba(5,20,10,${alpha})`;
          for (let i = 0; i < 8; i++) {
            const x = (i * W) / 8 + (i % 2) * 20;
            const w = 6 + (i % 3) * 3;
            c.fillRect(x, H * (0.4 - scale * 0.05), w * scale, H * 0.6);
          }
        };
        trees(0.5, 0.7);
        trees(0.85, 1.0);
        // Floating spirit wisps (static glowing dots)
        c.fillStyle = "rgba(200,255,100,0.9)";
        c.shadowColor = "#aaff00";
        c.shadowBlur = 14;
        for (let i = 0; i < 10; i++) {
          const x = (i * 89 + 30) % W;
          const y = H * 0.2 + ((i * 53) % (H * 0.5));
          c.beginPath();
          c.arc(x, y, 2.5 + (i % 3), 0, Math.PI * 2);
          c.fill();
        }
        // Ground mist
        c.shadowBlur = 0;
        const mist = c.createLinearGradient(0, H * 0.7, 0, H);
        mist.addColorStop(0, "rgba(170,255,0,0)");
        mist.addColorStop(1, "rgba(170,255,0,0.18)");
        c.fillStyle = mist;
        c.fillRect(0, H * 0.7, W, H * 0.3);
      },
    },
    // Jian — Photon Lance — HIGH-TECH LAB
    jian: {
      sky: ["#021018", "#000408"],
      draw(c, W, H) {
        // Cyan grid floor (perspective)
        c.strokeStyle = "rgba(34,232,255,0.40)";
        c.lineWidth = 1;
        // Horizontal grid lines (perspective)
        for (let i = 0; i < 10; i++) {
          const u = i / 9;
          const y = H * 0.55 + u * H * 0.45;
          const op = 0.5 + u * 0.5;
          c.globalAlpha = op * 0.5;
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(W, y);
          c.stroke();
        }
        // Vertical grid lines (perspective)
        for (let i = 0; i < 11; i++) {
          const u = (i - 5) / 5;
          c.globalAlpha = 0.35;
          c.beginPath();
          c.moveTo(W / 2 + u * W * 0.5, H * 0.55);
          c.lineTo(W / 2 + u * W * 1.5, H);
          c.stroke();
        }
        c.globalAlpha = 1;
        // Distant data towers
        c.fillStyle = "rgba(15,30,45,0.95)";
        c.fillRect(W * 0.05, H * 0.3, W * 0.1, H * 0.3);
        c.fillRect(W * 0.85, H * 0.32, W * 0.1, H * 0.28);
        // Cyan light strips on towers
        c.fillStyle = "rgba(34,232,255,0.85)";
        c.shadowColor = "#22e8ff";
        c.shadowBlur = 10;
        for (let i = 0; i < 5; i++) {
          c.fillRect(W * 0.07, H * (0.34 + i * 0.05), W * 0.06, 2);
          c.fillRect(W * 0.87, H * (0.36 + i * 0.05), W * 0.06, 2);
        }
        c.shadowBlur = 0;
        // Holographic horizon
        const h = c.createLinearGradient(0, H * 0.5, 0, H * 0.6);
        h.addColorStop(0, "rgba(34,232,255,0)");
        h.addColorStop(1, "rgba(34,232,255,0.45)");
        c.fillStyle = h;
        c.fillRect(0, H * 0.5, W, H * 0.1);
      },
    },
    // Joseph — Spirit Reaper — GRAVEYARD with tombstones + fog
    joseph: {
      sky: ["#100618", "#020108"],
      draw(c, W, H) {
        // Pale moon
        c.save();
        c.shadowColor = "#a020f0";
        c.shadowBlur = 30;
        c.fillStyle = "rgba(220,200,255,0.85)";
        c.beginPath();
        c.arc(W * 0.78, H * 0.2, W * 0.07, 0, Math.PI * 2);
        c.fill();
        c.restore();
        // Bare tree silhouettes (left)
        c.strokeStyle = "rgba(10,5,15,1)";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(W * 0.1, H);
        c.lineTo(W * 0.1, H * 0.35);
        c.moveTo(W * 0.1, H * 0.55);
        c.lineTo(W * 0.04, H * 0.4);
        c.moveTo(W * 0.1, H * 0.5);
        c.lineTo(W * 0.18, H * 0.32);
        c.moveTo(W * 0.1, H * 0.4);
        c.lineTo(W * 0.16, H * 0.2);
        c.stroke();
        // Tombstones (3 in front)
        const tomb = (x, w, h) => {
          c.fillStyle = "rgba(60,55,75,0.95)";
          c.fillRect(x - w / 2, H - h, w, h);
          c.beginPath();
          c.arc(x, H - h, w / 2, Math.PI, 0);
          c.fill();
          // Cross etching
          c.strokeStyle = "rgba(40,30,55,1)";
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(x, H - h * 0.85);
          c.lineTo(x, H - h * 0.55);
          c.moveTo(x - w * 0.18, H - h * 0.75);
          c.lineTo(x + w * 0.18, H - h * 0.75);
          c.stroke();
        };
        tomb(W * 0.2, W * 0.12, H * 0.3);
        tomb(W * 0.5, W * 0.16, H * 0.4);
        tomb(W * 0.8, W * 0.1, H * 0.25);
        // Purple fog at the bottom
        const fog = c.createLinearGradient(0, H * 0.7, 0, H);
        fog.addColorStop(0, "rgba(160,32,240,0)");
        fog.addColorStop(1, "rgba(160,32,240,0.28)");
        c.fillStyle = fog;
        c.fillRect(0, H * 0.7, W, H * 0.3);
      },
    },
    // Jaballas — Shotgunner — WILD WEST SALOON / SUNSET SKY
    jaballas: {
      sky: ["#3a0820", "#10040c"],
      draw(c, W, H) {
        // Sunset sky gradient
        const sky = c.createLinearGradient(0, 0, 0, H * 0.7);
        sky.addColorStop(0, "rgba(255,128,180,0.45)");
        sky.addColorStop(0.5, "rgba(255,170,85,0.30)");
        sky.addColorStop(1, "rgba(40,10,30,0)");
        c.fillStyle = sky;
        c.fillRect(0, 0, W, H * 0.7);
        // Sun
        c.save();
        c.shadowColor = "#ff80df";
        c.shadowBlur = 40;
        c.fillStyle = "rgba(255,170,140,0.95)";
        c.beginPath();
        c.arc(W * 0.5, H * 0.55, W * 0.1, 0, Math.PI * 2);
        c.fill();
        c.restore();
        // Distant town silhouette
        c.fillStyle = "rgba(15,5,12,1)";
        c.fillRect(W * 0.1, H * 0.55, W * 0.18, H * 0.18); // saloon
        c.beginPath();
        c.moveTo(W * 0.1, H * 0.55);
        c.lineTo(W * 0.19, H * 0.48);
        c.lineTo(W * 0.28, H * 0.55);
        c.closePath();
        c.fill();
        c.fillRect(W * 0.72, H * 0.58, W * 0.14, H * 0.15); // shop
        c.fillRect(W * 0.92, H * 0.6, W * 0.06, H * 0.13);
        // Wood plank ground
        c.fillStyle = "rgba(35,15,8,1)";
        c.fillRect(0, H * 0.73, W, H * 0.27);
        c.strokeStyle = "rgba(15,5,2,0.9)";
        c.lineWidth = 1;
        for (let y = H * 0.78; y < H; y += 14) {
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(W, y);
          c.stroke();
        }
        // A small barrel
        c.fillStyle = "rgba(60,25,12,1)";
        c.fillRect(W * 0.05, H * 0.78, 18, 26);
        c.strokeStyle = "rgba(20,8,4,1)";
        c.lineWidth = 1.5;
        c.strokeRect(W * 0.05, H * 0.78, 18, 26);
      },
    },
    // Joshua — Archer — LUSH ARCHERY RANGE / TARGETS IN FOREST
    joshua: {
      sky: ["#08200c", "#020a04"],
      draw(c, W, H) {
        // Soft green sky tint
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(170,255,0,0.18)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        // Distant forest line
        c.fillStyle = "rgba(8,30,15,1)";
        c.beginPath();
        c.moveTo(0, H * 0.45);
        for (let i = 0; i <= 12; i++) {
          const x = (i * W) / 12;
          const y = H * 0.45 - Math.sin(i * 1.7) * H * 0.04 - (i % 3) * 6;
          c.lineTo(x, y);
        }
        c.lineTo(W, H);
        c.lineTo(0, H);
        c.closePath();
        c.fill();
        // Archery target — concentric rings
        const tx = W * 0.78,
          ty = H * 0.55,
          tr = W * 0.1;
        const rings = ["#ffffff", "#ff3d6a", "#ffd166", "#7cffb2", "#22e8ff"];
        for (let i = 0; i < rings.length; i++) {
          c.fillStyle = rings[i];
          c.beginPath();
          c.arc(tx, ty, tr * (1 - i * 0.18), 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = "#ff3d6a";
        c.beginPath();
        c.arc(tx, ty, tr * 0.1, 0, Math.PI * 2);
        c.fill();
        // Arrow stuck in target
        c.strokeStyle = "rgba(80,50,30,1)";
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(tx - tr * 0.2, ty);
        c.lineTo(tx - tr * 0.7, ty - tr * 0.35);
        c.stroke();
        c.fillStyle = "#aaff00";
        c.beginPath();
        c.moveTo(tx - tr * 0.7, ty - tr * 0.35);
        c.lineTo(tx - tr * 0.85, ty - tr * 0.4);
        c.lineTo(tx - tr * 0.78, ty - tr * 0.25);
        c.closePath();
        c.fill();
        // Ground grass
        c.fillStyle = "rgba(10,40,18,1)";
        c.fillRect(0, H * 0.85, W, H * 0.15);
      },
    },
    // Jazmine — Nuclear Witch — RADIOACTIVE WASTELAND with mushroom cloud
    jazmine: {
      sky: ["#3a1830", "#180614"],
      draw(c, W, H) {
        // Toxic sky gradient
        const sky = c.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "rgba(255,128,223,0.28)");
        sky.addColorStop(0.5, "rgba(255,209,102,0.18)");
        sky.addColorStop(1, "rgba(40,10,30,0)");
        c.fillStyle = sky;
        c.fillRect(0, 0, W, H);
        // Distant mushroom cloud (silhouette + glow)
        const mx = W * 0.5,
          my = H * 0.45;
        c.save();
        c.shadowColor = "#ffd166";
        c.shadowBlur = 50;
        // Stem
        c.fillStyle = "rgba(40,15,30,0.95)";
        c.fillRect(mx - W * 0.05, my, W * 0.1, H * 0.4);
        // Cap (bulbous)
        c.beginPath();
        c.ellipse(mx, my, W * 0.3, H * 0.2, 0, 0, Math.PI * 2);
        c.fill();
        // Cap inner glow
        c.shadowBlur = 0;
        const glow = c.createRadialGradient(mx, my, 0, mx, my, W * 0.3);
        glow.addColorStop(0, "rgba(255,209,102,0.55)");
        glow.addColorStop(0.6, "rgba(255,128,223,0.35)");
        glow.addColorStop(1, "rgba(40,10,30,0)");
        c.fillStyle = glow;
        c.beginPath();
        c.ellipse(mx, my, W * 0.3, H * 0.2, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
        // Cracked wasteland ground
        c.fillStyle = "rgba(20,5,15,1)";
        c.fillRect(0, H * 0.85, W, H * 0.15);
        c.strokeStyle = "rgba(255,128,223,0.4)";
        c.lineWidth = 1;
        // Random crack lines
        c.beginPath();
        c.moveTo(0, H * 0.92);
        c.lineTo(W * 0.3, H * 0.88);
        c.lineTo(W * 0.55, H * 0.95);
        c.lineTo(W, H * 0.9);
        c.stroke();
        // Radiation symbol (small, top-left)
        c.fillStyle = "rgba(255,209,102,0.85)";
        c.shadowColor = "#ffd166";
        c.shadowBlur = 8;
        const rx = W * 0.1,
          ry = H * 0.14,
          rs = W * 0.05;
        c.beginPath();
        c.arc(rx, ry, rs * 0.3, 0, Math.PI * 2);
        c.fill();
        for (let k = 0; k < 3; k++) {
          const a = -Math.PI / 2 + k * ((Math.PI * 2) / 3);
          c.beginPath();
          c.moveTo(
            rx + Math.cos(a - 0.4) * rs * 0.4,
            ry + Math.sin(a - 0.4) * rs * 0.4,
          );
          c.arc(rx, ry, rs, a - 0.4, a + 0.4);
          c.closePath();
          c.fill();
        }
      },
    },
    // Kagoya — Burst Caster — RAINBOW PIXEL GRID with floating shards
    kagoya: {
      sky: ["#1a0a2e", "#06020f"],
      draw(c, W, H) {
        // Soft pink halo behind the hero
        const halo = c.createRadialGradient(
          W / 2,
          H * 0.5,
          0,
          W / 2,
          H * 0.5,
          W * 0.6,
        );
        halo.addColorStop(0, "rgba(255,122,217,0.28)");
        halo.addColorStop(1, "rgba(40,10,60,0)");
        c.fillStyle = halo;
        c.fillRect(0, 0, W, H);
        // Pixel-grid floor (perspective)
        c.strokeStyle = "rgba(255,122,217,0.35)";
        c.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          const y = H * 0.65 + t * H * 0.32;
          c.globalAlpha = 0.25 + t * 0.55;
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(W, y);
          c.stroke();
        }
        c.globalAlpha = 1;
        for (let i = 0; i <= 8; i++) {
          const x = (i / 8) * W;
          const xN = (W / 2) + (x - W / 2) * 1.6;
          c.beginPath();
          c.moveTo(W / 2, H * 0.65);
          c.lineTo(xN, H);
          c.strokeStyle = "rgba(255,122,217,0.25)";
          c.stroke();
        }
        // Floating rainbow shards (iridescent diamonds)
        const hues = ["#ff3df0", "#3dffb0", "#ffd166", "#22e8ff", "#ff80df"];
        const dia = (x, y, s, col) => {
          c.save();
          c.translate(x, y);
          c.shadowColor = col;
          c.shadowBlur = 14;
          c.fillStyle = col;
          c.beginPath();
          c.moveTo(0, -s);
          c.lineTo(s * 0.7, 0);
          c.lineTo(0, s);
          c.lineTo(-s * 0.7, 0);
          c.closePath();
          c.fill();
          c.restore();
        };
        dia(W * 0.18, H * 0.22, 6, hues[0]);
        dia(W * 0.78, H * 0.18, 7, hues[3]);
        dia(W * 0.32, H * 0.42, 5, hues[2]);
        dia(W * 0.7, H * 0.4, 5, hues[1]);
        dia(W * 0.5, H * 0.28, 4, hues[4]);
      },
    },
    // Iruha — Storm Mage — THUNDER CLOUDS WITH CRACKLING LIGHTNING
    iruha: {
      sky: ["#0a1428", "#02060f"],
      draw(c, W, H) {
        // Stormy cloud bank (horizontal bands)
        const sky = c.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "rgba(80,120,180,0.25)");
        sky.addColorStop(0.5, "rgba(105,230,255,0.10)");
        sky.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = sky;
        c.fillRect(0, 0, W, H);
        // Cloud silhouettes
        const drawCloud = (x, y, s, alpha) => {
          c.save();
          c.fillStyle = `rgba(20,32,52,${alpha})`;
          c.beginPath();
          c.arc(x - s * 0.6, y, s * 0.7, 0, Math.PI * 2);
          c.arc(x, y - s * 0.2, s * 0.95, 0, Math.PI * 2);
          c.arc(x + s * 0.7, y, s * 0.75, 0, Math.PI * 2);
          c.fill();
          c.restore();
        };
        drawCloud(W * 0.2, H * 0.18, W * 0.18, 0.85);
        drawCloud(W * 0.65, H * 0.12, W * 0.22, 0.9);
        drawCloud(W * 0.9, H * 0.28, W * 0.12, 0.8);
        // Static lightning bolt (zigzag) from cloud to ground
        c.save();
        c.shadowColor = "#69e6ff";
        c.shadowBlur = 20;
        c.strokeStyle = "rgba(220,250,255,0.95)";
        c.lineWidth = 3;
        c.lineCap = "round";
        c.lineJoin = "round";
        const startX = W * 0.65;
        c.beginPath();
        c.moveTo(startX, H * 0.2);
        c.lineTo(startX - 8, H * 0.32);
        c.lineTo(startX + 6, H * 0.42);
        c.lineTo(startX - 4, H * 0.55);
        c.lineTo(startX + 10, H * 0.7);
        c.lineTo(startX - 2, H * 0.85);
        c.stroke();
        c.shadowBlur = 0;
        c.strokeStyle = "rgba(105,230,255,0.7)";
        c.lineWidth = 1.2;
        c.stroke();
        c.restore();
        // Electric arc orbs in the sky
        c.save();
        c.fillStyle = "rgba(105,230,255,0.85)";
        c.shadowColor = "#69e6ff";
        c.shadowBlur = 14;
        c.beginPath();
        c.arc(W * 0.25, H * 0.35, 4, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(W * 0.85, H * 0.5, 3, 0, Math.PI * 2);
        c.fill();
        c.restore();
      },
    },
    // Yachiyu — Battle Medic — MOONLIT HEALING SHRINE WITH GLOWING LEAVES
    yachiyu: {
      sky: ["#0a1f1a", "#020a08"],
      draw(c, W, H) {
        // Soft minty radial glow
        const halo = c.createRadialGradient(
          W / 2,
          H * 0.45,
          0,
          W / 2,
          H * 0.45,
          W * 0.7,
        );
        halo.addColorStop(0, "rgba(170,255,214,0.22)");
        halo.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = halo;
        c.fillRect(0, 0, W, H);
        // Crescent moon
        c.save();
        c.shadowColor = "#aaffd6";
        c.shadowBlur = 24;
        c.fillStyle = "rgba(220,255,235,0.85)";
        c.beginPath();
        c.arc(W * 0.78, H * 0.22, W * 0.07, 0, Math.PI * 2);
        c.fill();
        // Carve out the crescent with the dark sky color
        c.globalCompositeOperation = "destination-out";
        c.beginPath();
        c.arc(W * 0.81, H * 0.20, W * 0.06, 0, Math.PI * 2);
        c.fill();
        c.restore();
        // Shrine pillars (tall slender silhouettes)
        c.fillStyle = "rgba(8,30,22,0.95)";
        const pillar = (x, w) => {
          c.fillRect(x - w / 2, H * 0.4, w, H * 0.6);
          // Capital
          c.fillRect(x - w * 0.8, H * 0.4 - 6, w * 1.6, 6);
          // Base
          c.fillRect(x - w * 0.7, H, w * 1.4, 4);
        };
        pillar(W * 0.12, 14);
        pillar(W * 0.88, 14);
        // Floating healing leaves (static)
        const leaf = (x, y, s, rot) => {
          c.save();
          c.translate(x, y);
          c.rotate(rot);
          c.fillStyle = "rgba(124,255,178,0.9)";
          c.shadowColor = "#7cffb2";
          c.shadowBlur = 12;
          c.beginPath();
          c.ellipse(0, 0, s * 1.4, s * 0.6, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "rgba(255,255,255,0.6)";
          c.fillRect(-s * 1.2, -0.5, s * 2.4, 1);
          c.restore();
        };
        leaf(W * 0.25, H * 0.3, 6, 0.4);
        leaf(W * 0.7, H * 0.45, 5, -0.5);
        leaf(W * 0.4, H * 0.55, 5, 0.2);
        leaf(W * 0.6, H * 0.25, 4, 1.2);
        // Healing cross at center
        c.save();
        c.shadowColor = "#aaffd6";
        c.shadowBlur = 18;
        c.fillStyle = "rgba(170,255,214,0.6)";
        c.fillRect(W / 2 - 3, H * 0.5, 6, 22);
        c.fillRect(W / 2 - 9, H * 0.5 + 8, 18, 6);
        c.restore();
      },
    },
    // Kaitu — Reaper — FROZEN GRAVEYARD WITH ICY TOMBSTONES
    kaitu: {
      sky: ["#0c0820", "#03020a"],
      draw(c, W, H) {
        // Cold violet aurora wash
        const sky = c.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "rgba(181,108,255,0.20)");
        sky.addColorStop(0.6, "rgba(80,40,140,0.10)");
        sky.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = sky;
        c.fillRect(0, 0, W, H);
        // Snowy ground line
        c.fillStyle = "rgba(220,210,255,0.3)";
        c.beginPath();
        c.moveTo(0, H * 0.78);
        c.bezierCurveTo(
          W * 0.3,
          H * 0.74,
          W * 0.6,
          H * 0.8,
          W,
          H * 0.76,
        );
        c.lineTo(W, H);
        c.lineTo(0, H);
        c.closePath();
        c.fill();
        // Tombstones (silhouettes, frosted tops)
        const tomb = (x, w, h, alpha) => {
          c.save();
          c.fillStyle = `rgba(30,20,50,${alpha})`;
          // Body (rounded top)
          c.beginPath();
          c.moveTo(x - w / 2, H * 0.78);
          c.lineTo(x - w / 2, H * 0.78 - h * 0.7);
          c.quadraticCurveTo(
            x,
            H * 0.78 - h * 1.0,
            x + w / 2,
            H * 0.78 - h * 0.7,
          );
          c.lineTo(x + w / 2, H * 0.78);
          c.closePath();
          c.fill();
          // Frosted snow cap
          c.fillStyle = `rgba(220,235,255,${(alpha * 0.7).toFixed(3)})`;
          c.beginPath();
          c.moveTo(x - w / 2 + 2, H * 0.78 - h * 0.68);
          c.quadraticCurveTo(
            x,
            H * 0.78 - h * 0.96,
            x + w / 2 - 2,
            H * 0.78 - h * 0.68,
          );
          c.quadraticCurveTo(x, H * 0.78 - h * 0.78, x - w / 2 + 2, H * 0.78 - h * 0.68);
          c.closePath();
          c.fill();
          // Tiny cross etched
          c.fillStyle = `rgba(181,108,255,${(alpha * 0.8).toFixed(3)})`;
          c.fillRect(x - 1, H * 0.78 - h * 0.55, 2, 10);
          c.fillRect(x - 4, H * 0.78 - h * 0.5, 8, 2);
          c.restore();
        };
        tomb(W * 0.18, W * 0.09, H * 0.32, 0.92);
        tomb(W * 0.82, W * 0.09, H * 0.32, 0.92);
        tomb(W * 0.4, W * 0.07, H * 0.24, 0.7);
        tomb(W * 0.62, W * 0.07, H * 0.24, 0.7);
        // Drifting snowflakes (static)
        c.fillStyle = "rgba(220,235,255,0.85)";
        c.shadowColor = "#ffffff";
        c.shadowBlur = 6;
        const flake = (x, y, r) => {
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.fill();
        };
        flake(W * 0.22, H * 0.15, 2);
        flake(W * 0.55, H * 0.1, 2.5);
        flake(W * 0.8, H * 0.32, 1.8);
        flake(W * 0.35, H * 0.45, 2);
        flake(W * 0.7, H * 0.5, 1.6);
        c.shadowBlur = 0;
        // Reaper scythe silhouette behind hero center
        c.save();
        c.translate(W / 2, H * 0.52);
        c.rotate(-0.45);
        c.fillStyle = "rgba(120,80,180,0.55)";
        c.fillRect(-2, -H * 0.4, 4, H * 0.7); // shaft
        c.beginPath();
        c.moveTo(2, -H * 0.4);
        c.quadraticCurveTo(W * 0.2, -H * 0.42, W * 0.18, -H * 0.3);
        c.quadraticCurveTo(W * 0.05, -H * 0.34, 2, -H * 0.32);
        c.closePath();
        c.fillStyle = "rgba(181,108,255,0.7)";
        c.fill();
        c.restore();
      },
    },
    // Well — Channeler — GOLDEN AETHER SHRINE WITH FLOATING RUNES
    well: {
      sky: ["#1f1606", "#0a0703"],
      draw(c, W, H) {
        // Warm golden radial glow
        const halo = c.createRadialGradient(
          W / 2,
          H * 0.5,
          0,
          W / 2,
          H * 0.5,
          W * 0.7,
        );
        halo.addColorStop(0, "rgba(240,199,90,0.32)");
        halo.addColorStop(1, "rgba(20,12,0,0)");
        c.fillStyle = halo;
        c.fillRect(0, 0, W, H);
        // Distant temple arch
        c.save();
        c.fillStyle = "rgba(60,40,15,0.9)";
        c.beginPath();
        c.moveTo(W * 0.18, H);
        c.lineTo(W * 0.18, H * 0.3);
        c.quadraticCurveTo(W * 0.5, H * 0.1, W * 0.82, H * 0.3);
        c.lineTo(W * 0.82, H);
        c.closePath();
        c.fill();
        // Inner sacred light through the arch
        const arch = c.createLinearGradient(0, H * 0.15, 0, H);
        arch.addColorStop(0, "rgba(255,236,153,0.55)");
        arch.addColorStop(1, "rgba(240,199,90,0)");
        c.fillStyle = arch;
        c.beginPath();
        c.moveTo(W * 0.24, H);
        c.lineTo(W * 0.24, H * 0.36);
        c.quadraticCurveTo(W * 0.5, H * 0.18, W * 0.76, H * 0.36);
        c.lineTo(W * 0.76, H);
        c.closePath();
        c.fill();
        c.restore();
        // Golden floating runes (rotating squares + circles)
        const rune = (x, y, s, rot) => {
          c.save();
          c.translate(x, y);
          c.rotate(rot);
          c.shadowColor = "#f0c75a";
          c.shadowBlur = 16;
          c.strokeStyle = "rgba(255,236,153,0.95)";
          c.lineWidth = 1.6;
          c.strokeRect(-s, -s, s * 2, s * 2);
          c.beginPath();
          c.arc(0, 0, s * 0.55, 0, Math.PI * 2);
          c.stroke();
          // Small inscription dots
          c.fillStyle = "rgba(255,236,153,0.95)";
          c.beginPath();
          c.arc(0, -s * 0.85, 1.5, 0, Math.PI * 2);
          c.arc(s * 0.85, 0, 1.5, 0, Math.PI * 2);
          c.arc(0, s * 0.85, 1.5, 0, Math.PI * 2);
          c.arc(-s * 0.85, 0, 1.5, 0, Math.PI * 2);
          c.fill();
          c.restore();
        };
        rune(W * 0.2, H * 0.35, 9, 0.4);
        rune(W * 0.8, H * 0.32, 9, -0.3);
        rune(W * 0.3, H * 0.62, 7, 0.7);
        rune(W * 0.72, H * 0.6, 7, -0.6);
        // Sparkle motes
        c.fillStyle = "rgba(255,236,153,0.9)";
        c.shadowColor = "#ffec99";
        c.shadowBlur = 8;
        for (const [x, y, r] of [
          [W * 0.4, H * 0.28, 2],
          [W * 0.55, H * 0.45, 1.6],
          [W * 0.65, H * 0.55, 2],
          [W * 0.45, H * 0.7, 1.5],
        ]) {
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.fill();
        }
        c.shadowBlur = 0;
      },
    },
  };

  // Per-canvas particle state
  function initHeroBgState(kind) {
    const N = 14;
    const arr = [];
    for (let i = 0; i < N; i++) {
      arr.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        ang: Math.random() * Math.PI * 2,
        rad: 0.18 + Math.random() * 0.22,
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.8),
        size: 0.04 + Math.random() * 0.05,
        seed: Math.random() * 1000,
        life: Math.random(),
      });
    }
    return arr;
  }

  function drawHeroBg(canvas, fx, t, parts) {
    const W = canvas.width,
      H = canvas.height;
    const c = canvas._ctx;
    if (!c) return;
    c.clearRect(0, 0, W, H);
    const [c1, c2] = fx.colors;
    const speed = fx.speed || 1;
    const cx = W / 2,
      cy = H / 2;

    if (fx.kind === "orbit") {
      for (const p of parts) {
        p.ang += 0.012 * speed * p.spin;
        const r = (0.3 + Math.sin(t / 900 + p.seed) * 0.05) * Math.min(W, H);
        const px = cx + Math.cos(p.ang) * r * (0.6 + p.rad);
        const py = cy + Math.sin(p.ang) * r * (0.6 + p.rad) * 0.85;
        const sz = p.size * Math.min(W, H);
        c.save();
        c.translate(px, py);
        c.rotate(p.ang);
        c.shadowColor = c1;
        c.shadowBlur = 12;
        c.fillStyle = c1;
        c.globalAlpha = 0.7;
        if (fx.shape === "diamond") {
          c.beginPath();
          c.moveTo(0, -sz);
          c.lineTo(sz * 0.7, 0);
          c.lineTo(0, sz);
          c.lineTo(-sz * 0.7, 0);
          c.closePath();
          c.fill();
        } else if (fx.shape === "wisp") {
          c.fillStyle = c2;
          c.beginPath();
          c.arc(0, 0, sz * 0.6, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = c1;
          c.globalAlpha = 0.4;
          c.beginPath();
          c.arc(-sz * 0.5, 0, sz * 0.4, 0, Math.PI * 2);
          c.fill();
        } else if (fx.shape === "spark") {
          c.strokeStyle = c1;
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(-sz, 0);
          c.lineTo(sz, 0);
          c.moveTo(0, -sz);
          c.lineTo(0, sz);
          c.stroke();
          c.fillStyle = c2;
          c.beginPath();
          c.arc(0, 0, sz * 0.3, 0, Math.PI * 2);
          c.fill();
        } else {
          c.beginPath();
          c.arc(0, 0, sz * 0.5, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
    } else if (fx.kind === "streaks") {
      for (const p of parts) {
        p.x += p.vx * 0.012 * speed;
        if (p.x > 1.1) p.x = -0.2;
        const px = p.x * W;
        const py = (0.15 + p.y * 0.7) * H;
        const sz = p.size * W * 1.2;
        c.save();
        c.shadowColor = c1;
        c.shadowBlur = 14;
        const grad = c.createLinearGradient(px - sz, py, px + sz, py);
        grad.addColorStop(0, "rgba(255,170,85,0)");
        grad.addColorStop(0.5, c1);
        grad.addColorStop(1, "rgba(255,170,85,0)");
        c.fillStyle = grad;
        c.fillRect(px - sz, py - 2, sz * 2, 4);
        c.restore();
      }
    } else if (fx.kind === "rise") {
      for (const p of parts) {
        p.y -= 0.005 * speed;
        if (p.y < -0.1) {
          p.y = 1.1;
          p.x = Math.random();
        }
        const px = p.x * W;
        const py = p.y * H;
        const sz = p.size * Math.min(W, H);
        c.save();
        c.translate(px, py);
        c.shadowColor = c1;
        c.shadowBlur = 10;
        c.fillStyle = c1;
        c.globalAlpha = 0.55 + 0.4 * Math.sin(t / 300 + p.seed);
        if (fx.shape === "cross") {
          c.fillRect(-sz * 0.3, -sz, sz * 0.6, sz * 2);
          c.fillRect(-sz, -sz * 0.3, sz * 2, sz * 0.6);
        } else if (fx.shape === "arrow") {
          c.beginPath();
          c.moveTo(0, -sz);
          c.lineTo(sz * 0.6, sz * 0.4);
          c.lineTo(0, sz * 0.1);
          c.lineTo(-sz * 0.6, sz * 0.4);
          c.closePath();
          c.fill();
        }
        c.restore();
      }
    } else if (fx.kind === "slashes") {
      for (const p of parts) {
        p.life -= 0.012 * speed;
        if (p.life <= 0) {
          p.life = 1;
          p.x = Math.random();
          p.y = Math.random();
          p.ang = Math.random() * 0.8 - 0.4 + Math.PI * 0.25;
          p.size = 0.18 + Math.random() * 0.14;
        }
        const px = p.x * W,
          py = p.y * H;
        const len = p.size * W;
        const a = 0.7 * p.life;
        c.save();
        c.translate(px, py);
        c.rotate(p.ang);
        c.shadowColor = c1;
        c.shadowBlur = 12;
        c.strokeStyle = `rgba(255,61,106,${a.toFixed(3)})`;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(-len / 2, 0);
        c.lineTo(len / 2, 0);
        c.stroke();
        c.strokeStyle = `rgba(255,255,255,${(a * 0.7).toFixed(3)})`;
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(-len / 2, 1);
        c.lineTo(len / 2, 1);
        c.stroke();
        c.restore();
      }
    } else if (fx.kind === "spiral") {
      for (const p of parts) {
        p.life -= 0.008 * speed;
        if (p.life <= 0) {
          p.life = 1;
          p.seed = Math.random() * 1000;
        }
        const u = p.life;
        const ang = p.seed + (1 - u) * Math.PI * 4;
        const r = (0.05 + (1 - u) * 0.45) * Math.min(W, H);
        const px = cx + Math.cos(ang) * r;
        const py = H * 0.95 - (1 - u) * H * 0.85;
        c.save();
        c.shadowColor = c1;
        c.shadowBlur = 14;
        c.fillStyle = c1;
        c.globalAlpha = u * 0.8;
        c.beginPath();
        c.arc(px, py, p.size * Math.min(W, H) * 0.5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    } else if (fx.kind === "scan") {
      // Horizontal laser scan lines moving down then resetting
      for (let i = 0; i < 3; i++) {
        const u = ((t / 1500) * speed + i / 3) % 1;
        const py = u * H;
        c.save();
        c.shadowColor = c1;
        c.shadowBlur = 16;
        const grad = c.createLinearGradient(0, py - 3, 0, py + 3);
        grad.addColorStop(0, "rgba(34,232,255,0)");
        grad.addColorStop(0.5, c1);
        grad.addColorStop(1, "rgba(34,232,255,0)");
        c.fillStyle = grad;
        c.fillRect(0, py - 3, W, 6);
        c.restore();
      }
      // Faint grid dots
      c.fillStyle = "rgba(34,232,255,0.10)";
      for (let y = 0; y < H; y += 14)
        for (let x = 0; x < W; x += 14) {
          c.fillRect(x, y, 1, 1);
        }
    } else if (fx.kind === "glints") {
      // Diagonal sword-glint streaks across the card
      for (const p of parts) {
        p.x += p.vx * 0.018 * speed;
        p.y += p.vy * 0.018 * speed;
        if (p.x < -0.2 || p.x > 1.2) {
          p.x = -0.2;
          p.y = Math.random();
          p.vx = 0.8 + Math.random() * 0.6;
          p.vy = -(0.4 + Math.random() * 0.4);
        }
        const px = p.x * W,
          py = p.y * H;
        const sz = 28 + p.size * 80;
        c.save();
        c.translate(px, py);
        c.rotate(Math.atan2(p.vy, p.vx));
        c.shadowColor = c1;
        c.shadowBlur = 16;
        const grad = c.createLinearGradient(-sz, 0, sz, 0);
        grad.addColorStop(0, "rgba(34,232,255,0)");
        grad.addColorStop(0.5, "#ffffff");
        grad.addColorStop(1, "rgba(34,232,255,0)");
        c.strokeStyle = grad;
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(-sz, 0);
        c.lineTo(sz, 0);
        c.stroke();
        c.restore();
      }
    } else if (fx.kind === "burst") {
      for (const p of parts) {
        p.life -= 0.014 * speed;
        if (p.life <= 0) {
          p.life = 1;
          p.x = Math.random();
          p.y = Math.random();
          p.ang = Math.random() * Math.PI * 2;
        }
        const px = p.x * W,
          py = p.y * H;
        const r = (1 - p.life) * p.size * Math.min(W, H) * 4;
        c.save();
        c.translate(px, py);
        c.shadowColor = c1;
        c.shadowBlur = 10;
        c.strokeStyle = `rgba(255,43,214,${(p.life * 0.7).toFixed(3)})`;
        c.lineWidth = 1.5;
        // Pellet spread — 5 short lines
        for (let i = 0; i < 5; i++) {
          const a = p.ang + (i - 2) * 0.18;
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          c.stroke();
        }
        c.restore();
      }
    }
  }

  // Single rAF loop that draws all live hero card backgrounds.
  const liveCards = []; // { canvas, fx, parts }
  let _bgRafStarted = false;
  function startHeroBgLoop() {
    if (_bgRafStarted) return;
    _bgRafStarted = true;
    function tick() {
      const now = performance.now();
      // Prune detached
      for (let i = liveCards.length - 1; i >= 0; i--) {
        if (!document.body.contains(liveCards[i].canvas))
          liveCards.splice(i, 1);
      }
      for (const lc of liveCards) {
        // Resize backing store to match displayed size (only if needed)
        const r = lc.canvas.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const tw = Math.max(1, Math.floor(r.width * dpr));
        const th = Math.max(1, Math.floor(r.height * dpr));
        if (lc.canvas.width !== tw || lc.canvas.height !== th) {
          lc.canvas.width = tw;
          lc.canvas.height = th;
          lc._ctx = lc.canvas.getContext("2d");
        }
        if (!lc._ctx) lc._ctx = lc.canvas.getContext("2d");
        lc.canvas._ctx = lc._ctx;
        try {
          drawHeroBg(lc.canvas, lc.fx, now, lc.parts);
        } catch (_) {}
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- Static themed scene drawer ----------
  // Draws a single hero's themed scene to its card canvas. Re-runs only on
  // resize (no animation loop) — the scene is a permanent part of the card.
  function drawHeroScene(canvas, scene) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.max(1, Math.floor(r.width * dpr));
    const th = Math.max(1, Math.floor(r.height * dpr));
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = r.width,
      H = r.height;
    ctx.clearRect(0, 0, W, H);
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, scene.sky[0]);
    sky.addColorStop(1, scene.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // Themed silhouettes/atmosphere
    try {
      scene.draw(ctx, W, H);
    } catch (_) {}
  }

  // Tracks live card canvases so a single resize listener can redraw them all
  const _staticCards = []; // { canvas, scene }
  let _staticResizeBound = false;
  function bindStaticResize() {
    if (_staticResizeBound) return;
    _staticResizeBound = true;
    let raf = 0;
    window.addEventListener("resize", () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Prune detached
        for (let i = _staticCards.length - 1; i >= 0; i--) {
          if (!document.body.contains(_staticCards[i].canvas)) {
            _staticCards.splice(i, 1);
          }
        }
        for (const c of _staticCards) drawHeroScene(c.canvas, c.scene);
      });
    });
  }

  // ---------- Hijack renderHeroGrid: lock badges + STATIC themed scenes ----------
  const _origRender = renderHeroGrid;
  renderHeroGrid = function () {
    _origRender();
    const grid = document.getElementById("heroGrid");
    if (!grid) return;
    _staticCards.length = 0;
    const cards = grid.querySelectorAll(".hero-card");
    cards.forEach((card, idx) => {
      const id = HERO_IDS[idx];
      if (!id) return;
      const scene = HERO_SCENES[id];
      if (scene) {
        const cv = document.createElement("canvas");
        cv.className = "ns-hero-bg";
        card.insertBefore(cv, card.firstChild);
        _staticCards.push({ canvas: cv, scene });
        // Defer one frame so the canvas has its layout size before drawing
        requestAnimationFrame(() => drawHeroScene(cv, scene));
        // Also draw again shortly after — covers fonts/images settling
        setTimeout(() => drawHeroScene(cv, scene), 80);
      }
      if (LOCKED_IDS.includes(id) && !profile.unlocked.has(id)) {
        card.classList.add("locked-card");
        // Inject lock overlay with SVG padlock icon
        const lockOverlay = document.createElement("div");
        lockOverlay.className = "ns-lock-overlay";
        lockOverlay.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="11" width="16" height="11" rx="2.5" fill="rgba(255,209,102,0.15)" stroke="#ffd166" stroke-width="1.5"/>
            <path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke="#ffd166" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="12" cy="16.5" r="1.5" fill="#ffd166"/>
            <line x1="12" y1="16.5" x2="12" y2="18.5" stroke="#ffd166" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="ns-lock-label">Locked</span>
          <span class="ns-lock-price">1500 PTS to unlock</span>`;
        card.appendChild(lockOverlay);
        card.onclick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          showProfileModal(id);
        };
      }
    });
    bindStaticResize();
  };

  // ---------- Combat hooks ----------
  // Wrap doAttack and doAbility to add new heroes' implementations.
  // Existing global helpers used: spawnBullet, damageEnemy, particles, shake,
  // SFX, canAuthorEnemies, queueAction, state.fx, state.enemies, state.arena.
  const _origDoAttack = doAttack;
  doAttack = function (p) {
    // ---------- James: DUAL SWORDS (overrides original single-sword) ----------
    // Two blades swing in alternating X-strikes. Each strike covers a wide
    // 130° arc; the two blades together cover ~180° of the screen in front
    // of him. Renders both swords as polygon shapes with motion-blur ghosts.
    if (p.heroId === "james") {
      const h = HEROES.james;
      p.atkCd = h.atkCd / p.mods.atkSpd;
      try {
        SFX.fire("james");
      } catch (_) {}
      const dmg = h.dmg * p.mods.dmg;
      const range = h.range * p.mods.range;
      const ang = p.angle;
      const authoritative = canAuthorEnemies();
      queueAction({ t: "atk", a: +ang.toFixed(2) });
      const arc = (Math.PI * 130) / 180;
      const halfArc = arc / 2;
      // Alternate which blade leads (visual variety)
      p._jamesLead = (p._jamesLead || 0) ^ 1;
      const lead = p._jamesLead; // 0 = right blade leads, 1 = left
      let hit = 0;
      if (authoritative) {
        for (const e of state.enemies) {
          if (!e || e.dead) continue;
          const dx = e.x - p.x,
            dy = e.y - p.y,
            d = Math.hypot(dx, dy);
          if (d > range + (e.r || 0)) continue;
          const a = Math.atan2(dy, dx);
          const da = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
          // Hit anything in the wide front arc
          if (Math.abs(da) <= halfArc + 0.25) {
            damageEnemy(e, dmg, p);
            hit++;
            // Two glowing slash gashes (X mark)
            state.fx.push({
              _josephGash: true,
              x: e.x,
              y: e.y,
              ang: ang + Math.PI * 0.18,
              life: 0.3,
              life0: 0.3,
              len: (e.r || 14) * 1.4,
              color: "#22e8ff",
            });
            state.fx.push({
              _josephGash: true,
              x: e.x,
              y: e.y,
              ang: ang - Math.PI * 0.18,
              life: 0.3,
              life0: 0.3,
              len: (e.r || 14) * 1.4,
              color: "#ffffff",
            });
          }
        }
      }
      // Dual blade swing fx — one entry, renderer animates BOTH blades
      state.fx.push({
        _jamesXSwing: true,
        ownerP: p,
        baseAng: ang,
        range,
        lead,
        life: 0.22,
        life0: 0.22,
      });
      if (hit > 0)
        try {
          shake(3);
        } catch (_) {}
      return;
    }
    if (!NEW_HEROES[p.heroId]) return _origDoAttack(p);
    const h = HEROES[p.heroId];
    p.atkCd = h.atkCd / p.mods.atkSpd;
    try {
      SFX.fire(p.heroId);
    } catch (_) {}
    const dmg = h.dmg * p.mods.dmg;
    const range = h.range * p.mods.range;
    const ang = p.angle;
    const authoritative = canAuthorEnemies();
    queueAction({ t: "atk", a: +ang.toFixed(2) });

    switch (p.heroId) {
      case "justin": {
        // SPIRIT BLADE — sweeping melee arc in front of Justin. Cleaves
        // every enemy within `range` in a 110° cone.
        const arc = (Math.PI * 110) / 180; // 110 degrees
        const halfArc = arc / 2;
        let hit = 0;
        if (authoritative) {
          for (const e of state.enemies) {
            if (!e || e.dead) continue;
            const dx = e.x - p.x,
              dy = e.y - p.y,
              d = Math.hypot(dx, dy);
            if (d > range + (e.r || 0)) continue;
            const a = Math.atan2(dy, dx);
            const da = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
            if (Math.abs(da) <= halfArc) {
              damageEnemy(e, dmg, p);
              hit++;
            }
          }
        }
        // Sword-swing crescent FX — bright lime arc that animates outward.
        // Stored in state.fx with _justinSlash flag so our overlay draws it.
        state.fx.push({
          _justinSlash: true,
          x: p.x,
          y: p.y,
          ang,
          range,
          arc,
          color: h.color,
          life: 0.22,
          life0: 0.22,
        });
        // Particle sparks along the arc
        for (let i = 0; i < 12; i++) {
          const t = i / 11,
            a = ang - halfArc + t * arc,
            r = range * (0.65 + Math.random() * 0.35);
          state.fx.push({
            x: p.x + Math.cos(a) * r,
            y: p.y + Math.sin(a) * r,
            vx: Math.cos(a) * 120,
            vy: Math.sin(a) * 120,
            life: 0.28,
            life0: 0.28,
            color: h.color,
            r: 2 + Math.random() * 2,
          });
        }
        if (hit > 0) {
          try {
            shake(3);
          } catch (_) {}
        }
        break;
      }
      case "jian": {
        // Hitscan laser beam — instant damage to nearest enemy in a narrow cone
        let hit = 0;
        if (authoritative) {
          for (const e of state.enemies) {
            const dx = e.x - p.x,
              dy = e.y - p.y,
              d = Math.hypot(dx, dy);
            if (d < range + (e.r || 0)) {
              const a = Math.atan2(dy, dx);
              const da = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
              if (Math.abs(da) < 0.06) {
                damageEnemy(e, dmg, p);
                hit++;
                if (hit >= 3) break;
              }
            }
          }
        }
        // Beam fx — line of dots from player to range
        for (let i = 0; i < 24; i++) {
          const t = i / 24,
            r = range * t;
          state.fx.push({
            x: p.x + Math.cos(ang) * r,
            y: p.y + Math.sin(ang) * r,
            vx: 0,
            vy: 0,
            life: 0.12,
            life0: 0.12,
            color: h.color,
            r: 3,
          });
        }
        if (hit > 0) shake(2);
        break;
      }
      case "joseph": {
        // SPIRIT REAPER — REAL SCYTHE swing. The blade itself is rendered
        // as a curved polygon that sweeps through a 200° arc with a
        // motion-blur trail. UNIQUE MECHANIC: enemies below 25% HP are
        // EXECUTED instantly. Every kill drops a SOUL that orbits Joseph
        // and auto-fires at the next enemy (stacks up to 8).
        const arc = (Math.PI * 200) / 180; // 200° sweep
        const halfArc = arc / 2;
        const swingDir = (p._josephSwingDir = (p._josephSwingDir || 1) * -1); // alternate L/R
        const startAng = ang - halfArc * swingDir;
        const endAng = ang + halfArc * swingDir;
        let totalDmg = 0;
        const killedThisSwing = [];
        if (authoritative) {
          for (const e of state.enemies) {
            if (!e || e.dead) continue;
            const dx = e.x - p.x,
              dy = e.y - p.y,
              d = Math.hypot(dx, dy);
            if (d > range + (e.r || 0)) continue;
            const a = Math.atan2(dy, dx);
            const da = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
            if (Math.abs(da) > halfArc) continue;
            // EXECUTE if enemy is below 25% HP
            const hpMax = e.hpMax || e.hp || 1;
            const exec = e.hp / hpMax < 0.25;
            const dealt = exec ? e.hp + 9999 : dmg;
            damageEnemy(e, dealt, p);
            totalDmg += dmg;
            // Slash gash mark on the enemy
            state.fx.push({
              _josephGash: true,
              x: e.x,
              y: e.y,
              ang: ang + Math.PI / 2,
              life: 0.45,
              life0: 0.45,
              len: (e.r || 14) * 1.6,
              color: "#ff2bd6",
            });
            if (e.dead || e.hp <= 0) killedThisSwing.push({ x: e.x, y: e.y });
            if (exec) {
              try {
                particles(e.x, e.y, "#ff2bd6", 24, 220, 0.5, 3);
              } catch (_) {}
            }
          }
        }
        // Lifesteal
        if (totalDmg > 0) p.hp = Math.min(p.hpMax, p.hp + totalDmg * 0.1);
        // Drop souls for kills (capped at 8 total)
        if (killedThisSwing.length && window.__nsAddSouls) {
          window.__nsAddSouls(p, killedThisSwing.length);
        }
        // CUSTOM SCYTHE BLADE SWING — the overlay renders the actual scythe
        // (curved blade + handle) animating from startAng to endAng with
        // motion-blur ghosts. _josephReap stores the sweep parameters.
        state.fx.push({
          _josephReap: true,
          ownerP: p,
          startAng,
          endAng,
          range,
          life: 0.28,
          life0: 0.28,
        });
        if (totalDmg > 0) {
          try {
            shake(5);
          } catch (_) {}
        }
        break;
      }
      case "jaballas": {
        // Shotgun — 9 pellets in a 60-degree cone
        const pellets = 9,
          spread = 0.6;
        for (let i = 0; i < pellets; i++) {
          const a = ang + (i / (pellets - 1) - 0.5) * spread;
          spawnBullet({
            x: p.x + Math.cos(a) * 18,
            y: p.y + Math.sin(a) * 18,
            vx: Math.cos(a) * 720,
            vy: Math.sin(a) * 720,
            dmg: authoritative ? dmg : 0,
            owner: p.id,
            color: h.color,
            radius: 5,
            life: (range / 720) * 1.1,
            piercing: 0,
            ghost: !authoritative,
          });
        }
        shake(2);
        break;
      }
      case "joshua": {
        // Main arrow — long range, high damage
        spawnBullet({
          x: p.x + Math.cos(ang) * 20,
          y: p.y + Math.sin(ang) * 20,
          vx: Math.cos(ang) * 900,
          vy: Math.sin(ang) * 900,
          dmg: authoritative ? dmg : 0,
          owner: p.id,
          color: h.color,
          radius: 4,
          life: (range / 900) * 1.05,
          piercing: 1,
          ghost: !authoritative,
        });
        // Alternating side-arrow: every 2nd shot fires a bonus arrow.
        // Pattern: shot#2 = LEFT, shot#4 = RIGHT, shot#6 = LEFT, …
        p._joshuaShots = (p._joshuaShots || 0) + 1;
        if (p._joshuaShots % 2 === 0) {
          // Track which side the next side-arrow belongs to (L,R,L,R,…)
          const sideIdx = p._joshuaSideIdx || 0;
          p._joshuaSideIdx = sideIdx + 1;
          // Side offset perpendicular to aim. Left = -90deg, Right = +90deg
          const sideSign = sideIdx % 2 === 0 ? -1 : 1;
          const px = -Math.sin(ang) * sideSign * 26; // perpendicular vector
          const py = Math.cos(ang) * sideSign * 26;
          // Bigger, glowing emerald arrow with extra damage and pierce
          spawnBullet({
            x: p.x + px + Math.cos(ang) * 12,
            y: p.y + py + Math.sin(ang) * 12,
            vx: Math.cos(ang) * 820,
            vy: Math.sin(ang) * 820,
            dmg: authoritative ? dmg * 1.4 : 0,
            owner: p.id,
            color: "#ffffff",
            radius: 7,
            life: (range / 820) * 1.05,
            piercing: 3,
            ghost: !authoritative,
          });
          // Spark trail from launch point
          for (let i = 0; i < 6; i++) {
            state.fx.push({
              x: p.x + px,
              y: p.y + py,
              vx: Math.cos(ang) * 200 + (Math.random() - 0.5) * 120,
              vy: Math.sin(ang) * 200 + (Math.random() - 0.5) * 120,
              life: 0.32,
              life0: 0.32,
              color: h.color,
              r: 3,
            });
          }
        }
        break;
      }
      case "jazmine": {
        // EXPLOSIVE plasma — every shot becomes a bomb on impact (enemy
        // hit OR end of life). Tracked via __jazExplode so our update
        // ticker can detect when the bullet vanishes and trigger an AOE
        // at its last known position.
        // NOTE: We push directly to state.bullets (not via spawnBullet)
        // so that __nsJazTrack holds the SAME object reference as the
        // live bullet list. spawnBullet does Object.assign which creates
        // a new copy, breaking the indexOf check in tickJazTracked and
        // preventing the local player from seeing/dealing explosion damage.
        const speed = 740;
        const b = {
          x: p.x + Math.cos(ang) * 14,
          y: p.y + Math.sin(ang) * 14,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          dmg: authoritative ? dmg : 0,
          owner: p.id,
          color: h.color,
          radius: 8,
          life: (range / speed) * 1.05,
          piercing: 0,
          trail: [],
          ghost: !authoritative,
          __jazExplode: true,
          __jazOwner: p.id,
          __jazAng: ang,
        };
        state.bullets.push(b);
        // Register for explosion tracking (set up below in init).
        if (window.__nsJazTrack) window.__nsJazTrack(b, p);
        break;
      }
      // ================== CPK heroes ==================
      case "kagoya": {
        // PIXEL SHARDS — three iridescent shards per burst, each with a
        // small spread + random hue. Very fast atkCd so the screen fills
        // with rainbow pixels.
        const shards = 3, spread = 0.18;
        const hues = ["#ff3df0","#3dffb0","#ffd166","#22e8ff","#ff80df","#aaff00"];
        for (let i = 0; i < shards; i++) {
          const a = ang + (i / (shards - 1) - 0.5) * spread;
          const col = hues[Math.floor(Math.random() * hues.length)];
          spawnBullet({
            x: p.x + Math.cos(a) * 16,
            y: p.y + Math.sin(a) * 16,
            vx: Math.cos(a) * 820,
            vy: Math.sin(a) * 820,
            dmg: authoritative ? dmg : 0,
            owner: p.id,
            color: col,
            radius: 4,
            life: (range / 820) * 1.05,
            piercing: 0,
            ghost: !authoritative,
          });
        }
        break;
      }
      case "_kagoya_disabled_": {
        // PARASOL DUEL (disabled) — two-stage fire mechanic.
        //  Stage A: piercing umbrella thrust + drop a glitching iridescent
        //  parasol "clone" stuck in the floor that pulses DoT around it.
        //  Stage B: while the clone is alive, each fire launches a homing
        //  parasol that chases the nearest enemy and bursts on contact.
        //  After 3 bursts the clone shatters and fire goes on a 3s CD.
        const now_kag = performance.now();
        if (!p._kagoyaState)
          p._kagoyaState = { mode: 0, bursts: 0, clone: null };
        const ks = p._kagoyaState;
        // If clone died/expired by itself, reset back to thrust mode
        if (
          ks.clone &&
          (!Array.isArray(state.fx) ||
            !state.fx.includes(ks.clone) ||
            ks.clone.life <= 0)
        ) {
          ks.clone = null;
          ks.mode = 0;
          ks.bursts = 0;
        }
        if (ks.mode === 0) {
          // ----- Stage A: piercing thrust + drop clone -----
          const reach = Math.min(range * 0.55, 240);
          if (authoritative) {
            for (const e of state.enemies) {
              if (!e || e.dead) continue;
              const dx = e.x - p.x,
                dy = e.y - p.y,
                d = Math.hypot(dx, dy);
              if (d > reach + (e.r || 0)) continue;
              const a = Math.atan2(dy, dx);
              const da = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
              if (Math.abs(da) <= 0.22) {
                damageEnemy(e, dmg * 1.3, p);
              }
            }
          }
          // Visual: thrust spike
          state.fx.push({
            _kagoyaThrust: true,
            x: p.x,
            y: p.y,
            ang,
            reach,
            color: "#ff7ad9",
            life: 0.2,
            life0: 0.2,
          });
          // Drop clone at the tip of the thrust
          const cx = p.x + Math.cos(ang) * reach;
          const cy = p.y + Math.sin(ang) * reach;
          const clone = {
            _kagoyaClone: true,
            x: cx,
            y: cy,
            ang,
            ownerP: p,
            color: "#ff7ad9",
            life: 6.0,
            life0: 6.0,
            _nextDot: now + 380,
            _dmg: Math.max(6, dmg * 0.45),
            _radius: 75,
          };
          state.fx.push(clone);
          ks.clone = clone;
          ks.mode = 1;
          ks.bursts = 0;
          try {
            particles(cx, cy, "#ff7ad9", 14, 220, 0.4, 2.5);
          } catch (_) {}
        } else {
          // ----- Stage B: homing umbrella burst -----
          let target = null,
            best = Infinity;
          for (const e of state.enemies) {
            if (!e || e.dead) continue;
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < best) {
              best = d;
              target = e;
            }
          }
          if (!target) {
            // No target — play an empty thrust flourish, don't waste a burst
            state.fx.push({
              _kagoyaThrust: true,
              x: p.x,
              y: p.y,
              ang,
              reach: 70,
              color: "#ff7ad9",
              life: 0.16,
              life0: 0.16,
            });
            break;
          }
          const speed = 760;
          const bdx = target.x - p.x,
            bdy = target.y - p.y,
            bd = Math.hypot(bdx, bdy) || 1;
          const b = {
            x: p.x + Math.cos(ang) * 14,
            y: p.y + Math.sin(ang) * 14,
            vx: (bdx / bd) * speed,
            vy: (bdy / bd) * speed,
            dmg: authoritative ? dmg * 2.2 : 0,
            owner: p.id,
            color: "#ff7ad9",
            radius: 9,
            life: 1.6,
            piercing: 0,
            ghost: !authoritative,
            _kagoyaUmb: true,
            _target: target,
            trail: [],
          };
          spawnBullet(b);
          if (window.__nsTrackKagoyaUmb) window.__nsTrackKagoyaUmb(b);
          try {
            particles(p.x, p.y, "#ff7ad9", 8, 240, 0.3, 2);
          } catch (_) {}
          ks.bursts++;
          if (ks.bursts >= 3) {
            // Burst chain done: shatter clone, force a 3s fire cooldown
            if (ks.clone) {
              state.fx.push({
                _wellShatter: true,
                x: ks.clone.x,
                y: ks.clone.y,
                ang: 0,
                color: "#ff7ad9",
                life: 0.6,
                life0: 0.6,
              });
              ks.clone.life = 0;
            }
            ks.clone = null;
            ks.mode = 0;
            ks.bursts = 0;
            p.atkCd = Math.max(p.atkCd || 0, 3.0);
          }
        }
        break;
      }
      case "iruha": {
        // 3-HIT COMBO — every third strike is a wide knockback shockwave.
        // Hits 1 & 2 are tight 90° melee arcs.
        p._iruhaCombo = (p._iruhaCombo || 0) + 1;
        const isFinisher = p._iruhaCombo % 3 === 0;
        const arc = isFinisher ? Math.PI : (Math.PI * 100) / 180;
        const halfArc = arc / 2;
        const reach = isFinisher ? range * 1.6 : range;
        const hitDmg = isFinisher ? dmg * 1.6 : dmg;
        let hit = 0;
        if (authoritative) {
          for (const e of state.enemies) {
            if (!e || e.dead) continue;
            const dx = e.x - p.x,
              dy = e.y - p.y,
              d = Math.hypot(dx, dy);
            if (d > reach + (e.r || 0)) continue;
            const a = Math.atan2(dy, dx);
            const da = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
            if (Math.abs(da) <= halfArc) {
              damageEnemy(e, hitDmg, p);
              hit++;
              if (isFinisher) {
                // Knockback along the swing direction
                const kx = Math.cos(a) * 90,
                  ky = Math.sin(a) * 90;
                e.x += kx;
                e.y += ky;
              }
            }
          }
        }
        // Arc visual — finisher uses the classic crescent slash,
        // hits 1 & 2 use the Iruha machete-cleaver swing.
        if (isFinisher) {
          state.fx.push({
            _justinSlash: true,
            x: p.x,
            y: p.y,
            ang,
            range: reach,
            arc,
            color: "#ffffff",
            life: 0.32,
            life0: 0.32,
          });
        } else {
          state.fx.push({
            _iruhaMachete: true,
            ownerP: p,
            ang0: ang,
            arc,
            range: reach,
            color: h.color,
            life: 0.22,
            life0: 0.22,
          });
        }
        if (isFinisher) {
          // Big shockwave ring + sparks
          state.fx.push({
            ring: true,
            x: p.x,
            y: p.y,
            color: h.color,
            life: 0.5,
            life0: 0.5,
            r: 0,
            _maxR: reach,
          });
          for (let i = 0; i < 24; i++) {
            const a = ang - halfArc + (i / 23) * arc;
            state.fx.push({
              x: p.x + Math.cos(a) * reach * 0.7,
              y: p.y + Math.sin(a) * reach * 0.7,
              vx: Math.cos(a) * 220,
              vy: Math.sin(a) * 220,
              life: 0.35,
              life0: 0.35,
              color: "#ffffff",
              r: 3,
            });
          }
          shake(6);
        } else if (hit > 0) {
          shake(2);
        }
        break;
      }
      case "yachiyu": {
        // UMBRELLA LAUNCHER — two-state mechanic.
        //  State A (no umbrella / charged): first fire launches a CHARGED
        //  umbrella (2x damage, glowing ring launch visual). The umbrella
        //  flies to max range and plants itself, dealing contact DoT to
        //  enemies that touch it.
        //  State B (umbrella planted): subsequent fires cause the planted
        //  umbrella to RELAUNCH from its current position toward the new
        //  aim direction. The charge effect disappears — only Skill recharges it.
        //  Skill (Q): recall the umbrella → returns to State A (charged).
        if (!p._yachiyuCharged && !window._yachiyuUmbs.has(p.id)) {
          p._yachiyuCharged = true; // default: always start charged
        }
        const umb = window._yachiyuUmbs.get(p.id);
        const charged = !umb && !!p._yachiyuCharged;
        const speed = 480;
        const launchX = umb ? umb.x : (p.x + Math.cos(ang) * 14);
        const launchY = umb ? umb.y : (p.y + Math.sin(ang) * 14);
        // Remove existing umbrella if planted (it will relaunch)
        if (umb) {
          window._yachiyuUmbs.delete(p.id);
          try { particles(launchX, launchY, h.color, 12, 220, 0.35, 2); } catch (_) {}
        }
        // Spawn new flying umbrella
        window._yachiyuUmbs.set(p.id, {
          phase: "flying",
          x: launchX,
          y: launchY,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: (range / speed) * 1.0,
          life0: (range / speed) * 1.0,
          dmg: Math.max(6, dmg * (charged ? 2 : 1)),
          charged,
          ownerP: p,
          _nextDot: performance.now() + 400,
        });
        p._yachiyuCharged = false; // consume charge
        // Charged launch ring + toast
        if (charged) {
          state.fx.push({
            ring: true,
            x: launchX, y: launchY,
            color: h.color,
            life: 0.45, life0: 0.45,
            r: 0, _maxR: 55,
          });
          try { particles(launchX, launchY, h.color, 18, 300, 0.45, 3); } catch (_) {}
          try { toast("CHARGED UMBRELLA", 900); } catch (_) {}
        }
        break;
      }
      case "kaitu": {
        // ICE CRYSTAL — single piercing shard that slows enemies on hit.
        // The slow is applied via the kaitu bullet hit hook (window.__nsKaituSlow).
        const speed = 700;
        const b = {
          x: p.x + Math.cos(ang) * 16,
          y: p.y + Math.sin(ang) * 16,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          dmg: authoritative ? dmg : 0,
          owner: p.id,
          color: h.color,
          radius: 6,
          life: (range / speed) * 1.1,
          piercing: 2,
          ghost: !authoritative,
          __kaituSlow: true,
          __kaituOwner: p.id,
        };
        spawnBullet(b);
        if (window.__nsTrackIceShard) window.__nsTrackIceShard(b);
        // Sword swing alongside the ice shot
        state.fx.push({
          _kaituSlash: true,
          ownerP: p,
          ang0: ang,
          arc: (Math.PI * 80) / 180,
          range: Math.min(range * 0.55, 120),
          color: h.color,
          life: 0.18,
          life0: 0.18,
        });
        break;
      }
      case "well": {
        // GREATSWORD REFLECT — heavy frontal Zweihänder swing that both
        // damages enemies in a wide arc AND reflects any hostile bullets
        // caught in the swing back at their attacker. Visual: massive
        // jagged Zweihänder with a cold blue aura; reflections create a
        // glass-shatter burst.
        const reach = 200;
        const half = (Math.PI * 110) / 180 / 2; // 110° arc
        const aura = "#9be8ff";
        // 1) Damage enemies caught in the arc (hosts only)
        if (authoritative) {
          for (const e of state.enemies) {
            if (!e || e.dead) continue;
            const dx = e.x - p.x,
              dy = e.y - p.y,
              d = Math.hypot(dx, dy);
            if (d > reach + (e.r || 0)) continue;
            const a = Math.atan2(dy, dx);
            const da = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
            if (Math.abs(da) <= half) {
              damageEnemy(e, dmg * 1.6, p);
            }
          }
        }
        // 2) Reflect hostile bullets in the same arc — every client runs
        //    the deflect locally so each player sees their own visual
        //    response when they parry incoming projectiles.
        let reflected = 0;
        if (Array.isArray(state.bullets)) {
          for (const b of state.bullets) {
            if (!b || !b.hostile || b.dead) continue;
            const dx = b.x - p.x,
              dy = b.y - p.y,
              d = Math.hypot(dx, dy);
            if (d > reach + (b.radius || 0)) continue;
            const a = Math.atan2(dy, dx);
            const da = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
            if (Math.abs(da) > half) continue;
            // Send the projectile back along its incoming vector with a
            // small speed boost so it doesn't immediately re-hit Well.
            b.vx *= -1;
            b.vy *= -1;
            const sp = Math.hypot(b.vx, b.vy) || 320;
            b.vx = (b.vx / sp) * Math.max(sp, 540);
            b.vy = (b.vy / sp) * Math.max(sp, 540);
            b.hostile = false;
            b.owner = p.id;
            b.ghost = !authoritative;
            b.color = aura;
            b.radius = Math.max(b.radius || 5, 6);
            b.life = Math.max(b.life || 0.6, 1.0);
            b.piercing = (b.piercing || 0) + 1;
            b.trail = b.trail || [];
            // Glass-shatter burst at the parry point
            state.fx.push({
              _wellShatter: true,
              x: b.x,
              y: b.y,
              ang: Math.atan2(-b.vy, -b.vx),
              color: aura,
              life: 0.5,
              life0: 0.5,
            });
            reflected++;
          }
        }
        if (reflected > 0) {
          try {
            particles(p.x, p.y, aura, 18, 320, 0.4, 3);
          } catch (_) {}
          shake(5);
        }
        // 3) Greatsword visual — animated jagged Zweihänder swinging
        state.fx.push({
          _wellGreatsword: true,
          ownerP: p,
          ang0: ang,
          reach,
          arc: half * 2,
          color: aura,
          life: 0.32,
          life0: 0.32,
        });
        // 4) Cold blue arc trail (reuse generic slash overlay)
        state.fx.push({
          _justinSlash: true,
          x: p.x,
          y: p.y,
          ang,
          range: reach * 0.95,
          arc: half * 2,
          color: aura,
          life: 0.22,
          life0: 0.22,
        });
        shake(3);
        break;
      }
    }
  };

  const _origDoAbility = doAbility;
  doAbility = function (p) {
    // ---------- James: DUAL-BLADE WHIRLWIND (overrides original) ----------
    // Both blades spin around him 360° for 0.7s, hitting everything within
    // 160 radius continuously. Renders both blades whirling visibly.
    if (p.heroId === "james") {
      const h = HEROES.james;
      p.abiCd = h.abiCd * p.mods.cdr;
      try {
        SFX.ability("james");
      } catch (_) {}
      const authoritative = canAuthorEnemies();
      const reach = 160;
      const dur = 0.7;
      queueAction({ t: "abi", a: +p.angle.toFixed(2) });
      // Spawn the whirlwind fx — renderer animates the spin and the
      // server-side ticker damages enemies every 0.1s.
      const spin = {
        _jamesWhirl: true,
        ownerP: p,
        reach,
        life: dur,
        life0: dur,
        _accDmg: 0,
      };
      state.fx.push(spin);
      // Initial particle burst at start
      try {
        particles(p.x, p.y, "#22e8ff", 36, 240, 0.55, 3);
      } catch (_) {}
      try {
        shake(6);
      } catch (_) {}
      // Damage tick at 12Hz over the duration
      const ticks = 8;
      const dmgPerTick = (h.dmg * 1.4 * p.mods.dmg) / ticks;
      let n = 0;
      const tickInt = setInterval(
        () => {
          n++;
          if (!authoritative || !state || !Array.isArray(state.enemies)) {
            if (n >= ticks) clearInterval(tickInt);
            return;
          }
          for (const e of state.enemies) {
            if (!e || e.dead) continue;
            if (Math.hypot(e.x - p.x, e.y - p.y) < reach + (e.r || 0)) {
              try {
                damageEnemy(e, dmgPerTick, p);
              } catch (_) {}
            }
          }
          if (n >= ticks) clearInterval(tickInt);
        },
        (dur * 1000) / ticks,
      );
      return;
    }
    if (!NEW_HEROES[p.heroId]) return _origDoAbility(p);
    const h = HEROES[p.heroId];
    p.abiCd = h.abiCd * p.mods.cdr;
    try {
      SFX.ability(p.heroId);
    } catch (_) {}
    const authoritative = canAuthorEnemies();
    const ang = p.angle;
    queueAction({ t: "abi", a: +ang.toFixed(2) });

    switch (p.heroId) {
      case "justin": {
        // SPIRIT GUARDIAN — summon a tanky lime mob that hunts enemies.
        // Lasts 14s or until killed. Combat logic (dealing damage) is
        // gated inside the guardian tick on canAuthorEnemies(), but the
        // guardian itself spawns on EVERY client so the owner can see it.
        if (window.__nsSpawnGuardian) {
          window.__nsSpawnGuardian(p);
        }
        try {
          particles(p.x, p.y, h.color, 36, 280, 0.7, 3);
        } catch (_) {}
        state.fx.push({
          ring: true,
          x: p.x,
          y: p.y,
          color: h.color,
          life: 0.55,
          life0: 0.55,
          r: 0,
          _maxR: 120,
        });
        try {
          shake(5);
        } catch (_) {}
        try {
          toast("SPIRIT GUARDIAN SUMMONED", 1500);
        } catch (_) {}
        break;
      }
      case "jian": {
        // Overcharge — wide piercing megabeam, dmg = 4x along a line
        const beamLen = h.range * 1.6 * p.mods.range;
        const beamHalfWidth = 36;
        if (authoritative) {
          for (const e of state.enemies) {
            const dx = e.x - p.x,
              dy = e.y - p.y;
            const along = dx * Math.cos(ang) + dy * Math.sin(ang);
            const perp = -dx * Math.sin(ang) + dy * Math.cos(ang);
            if (
              along > 0 &&
              along < beamLen &&
              Math.abs(perp) < beamHalfWidth + (e.r || 0)
            ) {
              damageEnemy(e, h.dmg * 4 * p.mods.dmg, p);
            }
          }
        }
        for (let i = 0; i < 60; i++) {
          const t = i / 60,
            r = beamLen * t;
          state.fx.push({
            x: p.x + Math.cos(ang) * r,
            y: p.y + Math.sin(ang) * r,
            vx: 0,
            vy: 0,
            life: 0.5,
            life0: 0.5,
            color: h.color,
            r: 8,
          });
        }
        try {
          shake(8);
        } catch (_) {}
        break;
      }
      case "joseph": {
        // SOUL TETHER — bind the 5 nearest enemies with ghostly chains
        // for 3 seconds. Tethered enemies are locked in place, take
        // damage every tick, and Joseph siphons HP from each one.
        const reach = 360,
          maxTargets = 5,
          tetherDur = 3.0;
        const dps = h.dmg * 0.55 * p.mods.dmg; // damage per second per target
        const heal = h.dmg * 0.1 * p.mods.dmg; // heal per second per target
        // Pick the nearest enemies in reach
        const candidates = [];
        for (const e of state.enemies || []) {
          if (!e || e.dead || e.hp <= 0) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d <= reach + (e.r || 0)) candidates.push({ e, d });
        }
        candidates.sort((a, b) => a.d - b.d);
        const targets = candidates.slice(0, maxTargets).map((c) => c.e);
        if (targets.length && window.__nsAddTethers) {
          window.__nsAddTethers(p, targets, tetherDur, dps, heal);
        }
        // Cast FX
        state.fx.push({
          ring: true,
          x: p.x,
          y: p.y,
          color: "#a020f0",
          life: 0.5,
          life0: 0.5,
          r: 0,
          _maxR: reach * 0.4,
        });
        try {
          particles(p.x, p.y, "#ff2bd6", 36, 240, 0.6, 3);
          shake(4);
        } catch (_) {}
        try {
          toast("SOUL TETHER · " + targets.length + " bound", 1400);
        } catch (_) {}
        break;
      }
      case "jaballas": {
        // Slug Round — single super-piercing high-dmg projectile in aim direction
        spawnBullet({
          x: p.x + Math.cos(ang) * 20,
          y: p.y + Math.sin(ang) * 20,
          vx: Math.cos(ang) * 820,
          vy: Math.sin(ang) * 820,
          dmg: authoritative ? h.dmg * 1 * p.mods.dmg : 0,
          owner: p.id,
          color: "#ffd166",
          radius: 14,
          life: 1.4,
          piercing: 99,
          ghost: !authoritative,
        });
        try {
          shake(8);
        } catch (_) {}
        break;
      }
      case "joshua": {
        // Arrow Volley — 12 arrows fall around the player's aim point with delays
        const targetX = p.x + Math.cos(ang) * 420,
          targetY = p.y + Math.sin(ang) * 420;
        for (let i = 0; i < 12; i++) {
          setTimeout(() => {
            const ox = (Math.random() - 0.5) * 240,
              oy = (Math.random() - 0.5) * 240;
            const tx = targetX + ox,
              ty = targetY + oy;
            // Spawn from above (shoot from offscreen point straight down for fx)
            spawnBullet({
              x: tx - Math.cos(ang) * 120,
              y: ty - Math.sin(ang) * 120,
              vx: Math.cos(ang) * 800,
              vy: Math.sin(ang) * 800,
              dmg: authoritative ? h.dmg * 1.0 * p.mods.dmg : 0,
              owner: p.id,
              color: h.color,
              radius: 4,
              life: 0.25,
              piercing: 1,
              ghost: !authoritative,
            });
            state.fx.push({
              x: tx,
              y: ty,
              vx: 0,
              vy: 0,
              life: 0.3,
              life0: 0.3,
              color: h.color,
              r: 6,
            });
          }, i * 70);
        }
        try {
          shake(4);
        } catch (_) {}
        break;
      }
      case "jazmine": {
        // NUCLEAR DETONATION — 2-second charge centered on Jazmine, then
        // a massive AOE explosion. 30s cooldown (set on hero data).
        const chargeMs = 2000;
        const blastR = 420;
        const blastDmg = h.dmg * 8 * p.mods.dmg;
        const startX = p.x,
          startY = p.y;
        try {
          toast("NUKE CHARGING…", 1800);
        } catch (_) {}
        // Lock player visually with a charging warning ring + pulsing glow
        // ring:true is required so game.js's updateFx decrements life each
        // frame — without it the countdown timer and ring expansion freeze.
        const warn = {
          _nukeCharge: true,
          ring: true,
          x: startX,
          y: startY,
          life: chargeMs / 1000,
          life0: chargeMs / 1000,
          color: "#ff80df",
          r: 80,
        };
        state.fx.push(warn);
        // Update warn position to follow Jazmine while charging
        const followInt = setInterval(() => {
          warn.x = p.x;
          warn.y = p.y;
        }, 50);
        setTimeout(() => {
          clearInterval(followInt);
          warn.life = 0;
          const ex = p.x,
            ey = p.y;
          // White flash, multiple expanding shock rings, particles
          state.fx.push({
            _flash: true,
            color: "#ffffff",
            life: 0.35,
            life0: 0.35,
            x: ex,
            y: ey,
            r: 0,
          });
          state.fx.push({
            ring: true,
            x: ex,
            y: ey,
            color: "#ffffff",
            life: 0.7,
            life0: 0.7,
            r: 0,
            _maxR: blastR,
          });
          state.fx.push({
            ring: true,
            x: ex,
            y: ey,
            color: "#ff80df",
            life: 0.9,
            life0: 0.9,
            r: 0,
            _maxR: blastR * 1.1,
          });
          state.fx.push({
            ring: true,
            x: ex,
            y: ey,
            color: "#ffd166",
            life: 1.1,
            life0: 1.1,
            r: 0,
            _maxR: blastR * 1.25,
          });
          state.fx.push({
            ring: true,
            x: ex,
            y: ey,
            color: "#ff3d6a",
            life: 1.4,
            life0: 1.4,
            r: 0,
            _maxR: blastR * 1.4,
          });
          // Mushroom-cloud burst
          for (let k = 0; k < 4; k++) {
            setTimeout(() => {
              try {
                particles(
                  ex,
                  ey,
                  k % 2 ? "#ffd166" : "#ff80df",
                  80,
                  320,
                  1.0,
                  4,
                );
              } catch (_) {}
            }, k * 120);
          }
          if (authoritative) {
            for (const e of state.enemies) {
              const d = Math.hypot(e.x - ex, e.y - ey);
              if (d < blastR + (e.r || 0)) {
                damageEnemy(e, blastDmg, p);
              } else if (d < blastR * 1.5) {
                damageEnemy(e, blastDmg * 0.4, p);
              }
            }
          }
          try {
            shake(20);
          } catch (_) {}
          try {
            toast("☢ NUCLEAR DETONATION ☢", 2000);
          } catch (_) {}
        }, chargeMs);
        break;
      }
      // ================== CPK heroes ==================
      case "kagoya": {
        // GLITCH FIELD — tear a glitch rift in front of the player that
        // slows every enemy inside for 4s and ticks damage. Reuses the
        // existing zone fx flag so the engine renders a fill+ring.
        const zx = p.x + Math.cos(ang) * 180,
          zy = p.y + Math.sin(ang) * 180;
        const dur = 4.0,
          radius = 130;
        const dps = (h.dmg * 0.6 * p.mods.dmg) / 0.18; // big over time
        state.fx.push({
          ring: true,
          x: zx,
          y: zy,
          color: h.color,
          life: 0.6,
          life0: 0.6,
          r: 0,
          _maxR: radius,
        });
        state.fx.push({
          zone: true,
          x: zx,
          y: zy,
          r: radius,
          color: h.color,
          life: dur,
          life0: dur,
        });
        if (window.__nsAddSlowZone) {
          window.__nsAddSlowZone({
            x: zx,
            y: zy,
            r: radius,
            life: dur,
            dps,
            slow: 0.45,
            owner: p.id,
          });
        }
        try {
          particles(zx, zy, h.color, 36, 240, 0.5, 3);
          shake(4);
        } catch (_) {}
        try {
          toast("GLITCH FIELD", 1200);
        } catch (_) {}
        break;
      }
      case "iruha": {
        // BULWARK SMASH — gain a 220-shield for 6s and slam the ground,
        // damaging + pushing every enemy within 220 radius.
        const slamR = 220;
        const slamDmg = h.dmg * 1.8 * p.mods.dmg;
        p.shield = Math.min(
          (p.mods.shieldMax || 0) + 220,
          (p.shield || 0) + 220,
        );
        if (authoritative) {
          for (const e of state.enemies) {
            const dx = e.x - p.x,
              dy = e.y - p.y,
              d = Math.hypot(dx, dy);
            if (d < slamR + (e.r || 0)) {
              damageEnemy(e, slamDmg, p);
              const a = Math.atan2(dy, dx);
              e.x += Math.cos(a) * 120;
              e.y += Math.sin(a) * 120;
            }
          }
        }
        state.fx.push({
          ring: true,
          x: p.x,
          y: p.y,
          color: h.color,
          life: 0.6,
          life0: 0.6,
          r: 0,
          _maxR: slamR,
        });
        state.fx.push({
          ring: true,
          x: p.x,
          y: p.y,
          color: "#ffffff",
          life: 0.4,
          life0: 0.4,
          r: 0,
          _maxR: slamR * 0.7,
        });
        try {
          particles(p.x, p.y, h.color, 60, 320, 0.7, 4);
          shake(10);
        } catch (_) {}
        try {
          toast("BULWARK SMASH", 1200);
        } catch (_) {}
        break;
      }
      case "yachiyu": {
        // RECALL — pull the flying/planted umbrella back to Yachiyu.
        // This destroys the umbrella and re-enables the charged first shot.
        const umb_recall = window._yachiyuUmbs.get(p.id);
        if (umb_recall) {
          try { particles(umb_recall.x, umb_recall.y, h.color, 22, 280, 0.55, 3); } catch (_) {}
          state.fx.push({
            ring: true,
            x: umb_recall.x,
            y: umb_recall.y,
            color: h.color,
            life: 0.4, life0: 0.4,
            r: 0, _maxR: 80,
          });
          window._yachiyuUmbs.delete(p.id);
        }
        // Recharge
        p._yachiyuCharged = true;
        // Visual flash on Yachiyu herself
        state.fx.push({
          ring: true,
          x: p.x, y: p.y,
          color: "#ffffff",
          life: 0.3, life0: 0.3,
          r: 0, _maxR: 42,
        });
        try { particles(p.x, p.y, h.color, 26, 250, 0.5, 3); } catch (_) {}
        try { toast("RECALL — CHARGED", 800); } catch (_) {}
        break;
      }
      case "kaitu": {
        // BLIZZARD — freezing AOE around the player. Multiple damage ticks
        // over 3s, applies slow to enemies inside.
        const blizR = 280,
          ticks = 6,
          totalDmg = h.dmg * 3 * p.mods.dmg,
          dur = 3.0;
        state.fx.push({
          zone: true,
          x: p.x,
          y: p.y,
          r: blizR,
          color: h.color,
          life: dur,
          life0: dur,
          _kaituBlizzard: true,
          ownerP: p,
        });
        if (window.__nsAddSlowZone) {
          window.__nsAddSlowZone({
            x: p.x,
            y: p.y,
            r: blizR,
            life: dur,
            dps: 0,
            slow: 0.55,
            owner: p.id,
            follow: p,
          });
        }
        let n = 0;
        const tick = setInterval(
          () => {
            n++;
            if (!authoritative || !state || !Array.isArray(state.enemies)) {
              if (n >= ticks) clearInterval(tick);
              return;
            }
            for (const e of state.enemies) {
              const cx =
                (
                  state.fx.find((f) => f._kaituBlizzard && f.ownerP === p) || {
                    x: p.x,
                  }
                ).x || p.x;
              const cy =
                (
                  state.fx.find((f) => f._kaituBlizzard && f.ownerP === p) || {
                    y: p.y,
                  }
                ).y || p.y;
              const d = Math.hypot(e.x - cx, e.y - cy);
              if (d < blizR + (e.r || 0)) {
                damageEnemy(e, totalDmg / ticks, p);
                if (Math.random() < 0.35) {
                  state.fx.push({
                    x: e.x + (Math.random() - 0.5) * 30,
                    y: e.y + (Math.random() - 0.5) * 30,
                    vx: 0,
                    vy: 0,
                    life: 0.4,
                    life0: 0.4,
                    color: "#9ad8ff",
                    r: 3,
                  });
                }
              }
            }
            if (n >= ticks) clearInterval(tick);
          },
          (dur * 1000) / ticks,
        );
        // Make blizzard zone follow the player
        const blizFollow = setInterval(() => {
          for (const f of state.fx) {
            if (f._kaituBlizzard && f.ownerP === p) {
              f.x = p.x;
              f.y = p.y;
            }
          }
        }, 50);
        setTimeout(() => clearInterval(blizFollow), dur * 1000);
        try {
          particles(p.x, p.y, h.color, 80, 320, 0.8, 3);
          shake(6);
        } catch (_) {}
        try {
          toast("BLIZZARD", 1200);
        } catch (_) {}
        break;
      }
      case "well": {
        // WIS STRIKE — call down a violet pillar around the aim point that
        // obliterates everything in a wide AOE. Brief warning, then a
        // beam of light + damage ring.
        const tx = p.x + Math.cos(ang) * 220,
          ty = p.y + Math.sin(ang) * 220;
        const strikeR = 200,
          dmgAmt = h.dmg * 7 * p.mods.dmg;
        // Warning ring
        state.fx.push({
          ring: true,
          x: tx,
          y: ty,
          color: h.color,
          life: 0.45,
          life0: 0.45,
          r: strikeR,
          _maxR: strikeR,
        });
        setTimeout(() => {
          state.fx.push({
            _flash: true,
            color: "#c084ff",
            life: 0.2,
            life0: 0.2,
            x: tx,
            y: ty,
            r: 0,
          });
          state.fx.push({
            ring: true,
            x: tx,
            y: ty,
            color: "#ffffff",
            life: 0.6,
            life0: 0.6,
            r: 0,
            _maxR: strikeR,
          });
          state.fx.push({
            ring: true,
            x: tx,
            y: ty,
            color: h.color,
            life: 0.8,
            life0: 0.8,
            r: 0,
            _maxR: strikeR * 1.2,
          });
          // Pillar of particles
          for (let i = 0; i < 60; i++) {
            const a = Math.random() * Math.PI * 2,
              r = Math.random() * strikeR;
            state.fx.push({
              x: tx + Math.cos(a) * r,
              y: ty + Math.sin(a) * r,
              vx: 0,
              vy: -280 - Math.random() * 120,
              life: 0.7 + Math.random() * 0.4,
              life0: 1.1,
              color: h.color,
              r: 3,
            });
          }
          if (authoritative) {
            for (const e of state.enemies) {
              const d = Math.hypot(e.x - tx, e.y - ty);
              if (d < strikeR + (e.r || 0)) damageEnemy(e, dmgAmt, p);
            }
          }
          try {
            shake(14);
          } catch (_) {}
        }, 450);
        try {
          toast("WIS STRIKE", 1200);
        } catch (_) {}
        break;
      }
    }
  };

  // Touch cooldown UI uses HEROES[p.heroId].abiCd / atkCd, which we already
  // populated, so no change needed there.

  // ---------- Clamp state.hero if it was a locked one previously ----------
  if (LOCKED_IDS.includes(state.hero) && !profile.unlocked.has(state.hero)) {
    state.hero = "james";
    localStorage.setItem("ns_hero", "james");
  }

  // ---------- Boot: refresh unlocks from server, handle ?paid=true ----------
  (async function boot() {
    try {
      // Refresh unlocks from server if we have stored credentials
      if (profile.name && profile.pin) {
        try {
          const data = await apiLogin(profile.name, profile.pin);
          applyUnlocksFromServer(data.unlockedHeroes);
        } catch (e) {
          console.warn("Profile refresh failed:", e.message);
        }
      }

      // After PayMongo redirect, finalize unlock
      const params = new URLSearchParams(window.location.search);
      const paid = params.get("paid");
      const heroParam = params.get("hero");
      if (
        paid === "true" &&
        heroParam &&
        NEW_HEROES[heroParam] &&
        profile.name &&
        profile.pin
      ) {
        try {
          const data = await apiUnlock(profile.name, profile.pin, heroParam);
          applyUnlocksFromServer(data.unlockedHeroes);
          // Auto-select the new hero
          state.hero = heroParam;
          localStorage.setItem("ns_hero", heroParam);
          try {
            renderHeroGrid();
          } catch (_) {}
          try {
            toast(`${HEROES[heroParam].name.toUpperCase()} UNLOCKED!`, 3000);
          } catch (_) {}
        } catch (e) {
          console.error("Unlock failed:", e);
          try {
            toast("Unlock failed: " + e.message, 3000);
          } catch (_) {}
        }
        // Strip params from URL
        const clean = window.location.pathname;
        history.replaceState({}, "", clean);
      } else if (paid === "cancel") {
        try {
          toast("Payment cancelled", 2000);
        } catch (_) {}
        history.replaceState({}, "", window.location.pathname);
      }
    } catch (e) {
      console.error("DLC boot error:", e);
    }
  })();

  // Expose for debugging
  window.NS_DLC = {
    profile,
    NEW_HEROES,
    LOCKED_IDS,
    showProfileModal,
    showBuyModal,
  };

  // ================================================================
  // ENHANCEMENTS — summons, explosive bullets, signal indicators,
  // lobby host-bandwidth hint, mobile-friendly modals.
  // Everything below monkey-patches the global game.js functions so
  // we do not modify game.js itself.
  // ================================================================

  // ---------- Spirit Guardian (Justin's Q) — RANGED CASTER ----------
  // The guardian floats next to Justin, keeping a hover distance, and
  // shoots lime energy bolts at the nearest enemy. Justin himself is
  // melee — together they cover both ranges, which is unique among
  // every hero in the roster.
  const guardians = [];
  const GUARD_LIFE = 14; // seconds
  const GUARD_HP = 280;
  const GUARD_DMG = 32; // per bolt
  const GUARD_SPD = 280;
  const GUARD_HOVER_DIST = 70; // preferred orbit distance from owner
  const GUARD_ATK_RANGE = 380; // ranged attack reach
  const GUARD_ATK_CD = 0.55;
  const GUARD_BOLT_SPD = 540;

  window.__nsSpawnGuardian = function (owner) {
    // Remove any existing guardian for this owner so we never get doubles
    const ownId = owner.id || owner.ownerId;
    for (let i = guardians.length - 1; i >= 0; i--) {
      if (guardians[i].ownerId === ownId) guardians.splice(i, 1);
    }
    guardians.push({
      x: owner.x + (Math.random() - 0.5) * 40,
      y: owner.y + (Math.random() - 0.5) * 40,
      hp: GUARD_HP,
      hpMax: GUARD_HP,
      life: GUARD_LIFE,
      atkCd: 0,
      ownerId: ownId,
      ownerRef: owner,
      flashUntil: 0,
    });
  };

  function nearestEnemy(x, y) {
    let best = null,
      bd = Infinity;
    if (!state || !Array.isArray(state.enemies)) return null;
    for (const e of state.enemies) {
      if (!e || e.dead || e.hp <= 0) continue;
      const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // Tick guardians at 60 Hz for smooth movement that matches the render rate.
  // Combat = fire ranged lime bolts at the nearest enemy in range.
  setInterval(() => {
    if (!guardians.length) return;
    const dt = 1 / 60;
    const auth =
      typeof canAuthorEnemies === "function" ? canAuthorEnemies() : true;
    for (const g of guardians) {
      g.life -= dt;
      if (g.life <= 0 || g.hp <= 0) continue;

      // Hover near the owning player (orbit slowly around them)
      const owner = g.ownerRef;
      if (owner && owner.alive !== false) {
        g._orbit = (g._orbit || Math.random() * Math.PI * 2) + dt * 1.4; // angular speed
        const tx = owner.x + Math.cos(g._orbit) * GUARD_HOVER_DIST;
        const ty = owner.y + Math.sin(g._orbit) * GUARD_HOVER_DIST;
        const dx = tx - g.x,
          dy = ty - g.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = Math.min(d, GUARD_SPD * dt);
        g.x += (dx / d) * step;
        g.y += (dy / d) * step;
      }

      // Ranged attack — fire bolt at nearest enemy within range
      const tgt = nearestEnemy(g.x, g.y);
      if (tgt) {
        const dx = tgt.x - g.x,
          dy = tgt.y - g.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d <= GUARD_ATK_RANGE) {
          g.atkCd -= dt;
          if (g.atkCd <= 0) {
            g.atkCd = GUARD_ATK_CD;
            const ang = Math.atan2(dy, dx);
            try {
              spawnBullet({
                x: g.x + Math.cos(ang) * 10,
                y: g.y + Math.sin(ang) * 10,
                vx: Math.cos(ang) * GUARD_BOLT_SPD,
                vy: Math.sin(ang) * GUARD_BOLT_SPD,
                dmg: auth ? GUARD_DMG : 0,
                owner:
                  (g.ownerRef && g.ownerRef.id) ||
                  (state.player && state.player.id),
                color: "#aaff00",
                radius: 5,
                life: (GUARD_ATK_RANGE / GUARD_BOLT_SPD) * 1.05,
                piercing: 0,
                ghost: !auth,
              });
            } catch (_) {}
            g.flashUntil = performance.now() + 100;
          }
        }
      }

      // Guardian takes a small amount of contact damage from any enemy
      // it physically overlaps (it's floating, but the player can still
      // lose it if it gets surrounded).
      if (auth) {
        for (const e of state.enemies) {
          if (!e || e.dead) continue;
          const ed = Math.hypot(e.x - g.x, e.y - g.y);
          if (ed < (e.r || 14) + 12) {
            g.hp -= (e.dmg || 10) * dt * 0.4;
          }
        }
      }

      // Soft trail particle for visibility
      try {
        if (state && state.fx && Math.random() < 0.25) {
          state.fx.push({
            x: g.x + (Math.random() - 0.5) * 8,
            y: g.y + (Math.random() - 0.5) * 8,
            vx: 0,
            vy: 0,
            life: 0.3,
            life0: 0.3,
            color: "#aaff00",
            r: 2,
          });
        }
      } catch (_) {}
    }
    // Cull
    for (let i = guardians.length - 1; i >= 0; i--) {
      const g = guardians[i];
      if (g.life <= 0 || g.hp <= 0) {
        try {
          particles(g.x, g.y, "#aaff00", 30, 240, 0.6, 3);
        } catch (_) {}
        guardians.splice(i, 1);
      }
    }
  }, 1000 / 60);

  // ---------- Joseph: Soul Tether ----------
  // tethers = active bindings: { ownerP, e, life, life0, dps, heal, accDmg, accHeal, _origSpeed }
  const tethers = [];

  window.__nsAddTethers = function (ownerP, enemies, dur, dps, heal) {
    for (const e of enemies) {
      // Save original movement, then freeze
      const _origSpeed = e.speed;
      e.speed = 0;
      // If enemy uses vx/vy fields directly, blank them too
      const _origVx = e.vx,
        _origVy = e.vy;
      if (e.vx !== undefined) e.vx = 0;
      if (e.vy !== undefined) e.vy = 0;
      tethers.push({
        ownerP,
        e,
        life: dur,
        life0: dur,
        dps,
        heal,
        accDmg: 0,
        accHeal: 0,
        _origSpeed,
        _origVx,
        _origVy,
      });
    }
  };

  // Tick tethers at 30Hz: damage enemy, heal Joseph, lock movement.
  setInterval(() => {
    if (!tethers.length) return;
    const dt = 1 / 30;
    const auth =
      typeof canAuthorEnemies === "function" ? canAuthorEnemies() : true;
    for (let i = tethers.length - 1; i >= 0; i--) {
      const t = tethers[i];
      t.life -= dt;
      // Re-freeze enemy (in case game.js rewrote vx/vy)
      if (t.e) {
        if (t.e.vx !== undefined) t.e.vx = 0;
        if (t.e.vy !== undefined) t.e.vy = 0;
        t.e.speed = 0;
      }
      // Damage tick
      if (auth && t.e && !t.e.dead && t.e.hp > 0) {
        const tickDmg = t.dps * dt;
        try {
          damageEnemy(t.e, tickDmg, t.ownerP);
        } catch (_) {}
        t.accHeal += t.heal * dt;
        if (t.accHeal >= 1) {
          const h = Math.floor(t.accHeal);
          if (t.ownerP) t.ownerP.hp = Math.min(t.ownerP.hpMax, t.ownerP.hp + h);
          t.accHeal -= h;
        }
      }
      // Cleanup if dead, life ended, or enemy gone from list
      const stillIn = t.e && (state.enemies || []).indexOf(t.e) !== -1;
      if (t.life <= 0 || !stillIn || (t.e && (t.e.dead || t.e.hp <= 0))) {
        // Restore movement
        if (t.e && stillIn) {
          if (t._origSpeed !== undefined) t.e.speed = t._origSpeed;
        }
        tethers.splice(i, 1);
      }
    }
  }, 1000 / 30);

  // ---------- Joseph: Soul collector (orbits + auto-fires) ----------
  // Per-player soul state stored on the player. souls[] entries:
  //   { angle, dist, life, life0, fireCd }
  const SOUL_MAX = 8;
  const SOUL_LIFE = 8.0; // souls expire after 8s
  const SOUL_FIRE_CD = 0.55; // each soul auto-shoots every 0.55s
  const SOUL_DMG = 28;
  const SOUL_RANGE = 360;
  const SOUL_BULLET_SPD = 620;

  window.__nsAddSouls = function (ownerP, n) {
    if (!ownerP) return;
    if (!ownerP._souls) ownerP._souls = [];
    for (let i = 0; i < n; i++) {
      if (ownerP._souls.length >= SOUL_MAX) {
        // Refresh oldest
        ownerP._souls.shift();
      }
      ownerP._souls.push({
        angle: Math.random() * Math.PI * 2,
        dist: 42 + Math.random() * 8,
        life: SOUL_LIFE,
        life0: SOUL_LIFE,
        fireCd: SOUL_FIRE_CD * (0.5 + Math.random() * 0.5),
      });
    }
  };

  // Spin + auto-fire souls at 30Hz
  setInterval(() => {
    if (!state || !Array.isArray(state.players)) return;
    const dt = 1 / 30;
    const auth =
      typeof canAuthorEnemies === "function" ? canAuthorEnemies() : true;
    for (const p of state.players) {
      if (!p || p.heroId !== "joseph" || !p._souls || !p._souls.length)
        continue;
      // Find closest enemy in range
      let target = null,
        best = SOUL_RANGE * SOUL_RANGE;
      if (auth && Array.isArray(state.enemies)) {
        for (const e of state.enemies) {
          if (!e || e.dead) continue;
          const dx = e.x - p.x,
            dy = e.y - p.y,
            d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            target = e;
          }
        }
      }
      for (let i = p._souls.length - 1; i >= 0; i--) {
        const s = p._souls[i];
        s.life -= dt;
        s.angle += dt * 2.4; // orbit speed
        s.fireCd -= dt;
        if (s.life <= 0) {
          p._souls.splice(i, 1);
          continue;
        }
        if (target && s.fireCd <= 0) {
          s.fireCd = SOUL_FIRE_CD;
          const sx = p.x + Math.cos(s.angle) * s.dist;
          const sy = p.y + Math.sin(s.angle) * s.dist;
          const a = Math.atan2(target.y - sy, target.x - sx);
          try {
            spawnBullet(
              p,
              sx,
              sy,
              a,
              SOUL_BULLET_SPD,
              SOUL_DMG,
              "#a020f0",
              "soul",
            );
          } catch (_) {}
        }
      }
    }
  }, 1000 / 30);

  // ---------- Jazmine explosive bullet tracker (RESET — simple + safe) ----------
  // Tracks each fired plasma orb. On every game frame we check:
  //   1. If the bullet overlaps an enemy → explode at bullet position
  //   2. If the bullet vanished from state.bullets → explode at last position
  // Synced with rAF (called from drawDlcOverlays) instead of setInterval to
  // avoid race conditions with the game loop.
  const jazTracked = []; // { b, ownerP, lastX, lastY, exploded }
  let _jazActiveBlasts = 0;
  const JAZ_MAX_BLASTS = 4; // cap concurrent fireballs to prevent fx pileups

  // ---- Yachiyu Umbrella Tracker ----
  // Map: playerId → { phase:'flying'|'planted', x, y, vx, vy,
  //                   life, life0, dmg, charged, ownerP, _nextDot }
  window._yachiyuUmbs = new Map();
  let _yachTick = performance.now();
  setInterval(() => {
    const now2 = performance.now();
    const dt2 = Math.min(0.06, (now2 - _yachTick) / 1000);
    _yachTick = now2;
    if (!state || !Array.isArray(state.enemies)) return;
    for (const [id, u] of window._yachiyuUmbs) {
      if (u.phase === "flying") {
        u.x += u.vx * dt2;
        u.y += u.vy * dt2;
        u.life -= dt2;
        // Contact damage
        if (typeof canAuthorEnemies === "function" && canAuthorEnemies()) {
          for (const e of state.enemies) {
            if (!e || e.dead) continue;
            if (Math.hypot(e.x - u.x, e.y - u.y) < (e.r || 14) + 16) {
              damageEnemy(e, u.dmg, u.ownerP);
            }
          }
        }
        if (u.life <= 0) {
          // Plant the umbrella
          u.phase = "planted";
          u.life0 = 6.0;
          u.life = 6.0;
          u._nextDot = now2 + 400;
          try { particles(u.x, u.y, "#aaffd6", 14, 220, 0.5, 2.5); } catch (_) {}
        }
      } else if (u.phase === "planted") {
        u.life -= dt2;
        if (u.life <= 0) {
          window._yachiyuUmbs.delete(id);
          // Restore charge on expiry
          if (u.ownerP) u.ownerP._yachiyuCharged = true;
          try { particles(u.x, u.y, "#aaffd6", 10, 180, 0.4, 2); } catch (_) {}
          continue;
        }
        // DoT pulse around planted zone
        if (now2 >= u._nextDot) {
          u._nextDot = now2 + 400;
          if (typeof canAuthorEnemies === "function" && canAuthorEnemies()) {
            for (const e of state.enemies) {
              if (!e || e.dead) continue;
              if (Math.hypot(e.x - u.x, e.y - u.y) < 62 + (e.r || 14)) {
                damageEnemy(e, u.dmg * 0.35, u.ownerP);
              }
            }
          }
        }
      }
    }
  }, 16);

  window.__nsJazTrack = function (bullet, ownerP) {
    jazTracked.push({
      b: bullet,
      ownerP,
      lastX: bullet.x,
      lastY: bullet.y,
      exploded: false,
      isGhost: !!(bullet.ghost),
    });
  };

  function jazExplode(x, y, ownerP) {
    if (!state || !state.fx) return;
    // BOMB-style explosion — multi-stage cinematic burst:
    //   1. Bright white pre-flash (very short)
    //   2. Hot fireball that expands and cools (white→yellow→orange→red)
    //   3. Fast outer shockwave ring + slower trailing inner ring
    //   4. Smoke puff that lingers and fades
    //   5. Multi-color particle debris (sparks, embers, ash)
    // Still no fullscreen overlays so the game stays responsive.
    const radius = 90;
    const dmg =
      HEROES.jazmine.dmg * 0.85 * (ownerP && ownerP.mods ? ownerP.mods.dmg : 1);

    // Single overlay record drawn by drawDlcOverlays. Longer life so the
    // smoke trail and shockwave rings are clearly visible.
    // NOTE: ring:true tells game.js's updateFx to skip the
    // f.x += f.vx*dt block — without it, vx/vy default to undefined
    // and f.x/f.y become NaN, making the explosion render invisible.
    state.fx.push({
      _jazBlast: true,
      ring: true, // anchor the fx in place (engine skips position update)
      vx: 0,
      vy: 0, // belt-and-braces: never produce NaN positions
      x,
      y,
      maxR: radius,
      life: 0.75,
      life0: 0.75,
    });

    // Multi-color particle debris — fire, embers, sparks, dark smoke flecks.
    try {
      if (typeof particles === "function") {
        particles(x, y, "#ffffff", 10, 360, 0.2, 3); // hot white sparks
        particles(x, y, "#ffec99", 16, 280, 0.55, 3); // yellow embers
        particles(x, y, "#ff7a3d", 18, 340, 0.55, 3); // orange flames
        particles(x, y, "#ff3b3b", 12, 220, 0.65, 2); // red embers (slow)
        particles(x, y, "#5a3a2a", 8, 120, 0.85, 2); // dark smoke flecks
      }
    } catch (_) {}

    // Small AOE damage — same logic as before but scoped to the smaller radius.
    const auth =
      typeof canAuthorEnemies === "function" ? canAuthorEnemies() : true;
    if (auth) {
      for (const e of state.enemies) {
        if (!e || e.dead) continue;
        if (Math.hypot(e.x - x, e.y - y) < radius + (e.r || 0)) {
          try {
            damageEnemy(e, dmg, ownerP || state.player);
          } catch (_) {}
        }
      }
    }
    // No screen shake — that contributed to the "screen freeze" feel.
  }

  // Per-frame poll (called from drawDlcOverlays prelude). Two paths:
  //
  //   1. Pre-empt the engine: while the bullet is still alive in
  //      state.bullets, we run our own enemy-contact check so we can
  //      explode at the exact contact point (alive enemies + bosses).
  //
  //   2. Engine post-mortem: the engine's authoritative collision loop
  //      (game.js ~line 1467) marks the bullet `b.dead = true` and
  //      filters it out of state.bullets BEFORE our poll runs. We
  //      detect that by inspecting `b.dead` after the bullet has been
  //      removed from the list:
  //        - b.dead === true  → killed by collision → EXPLODE at lastX/lastY
  //        - b.dead falsy + b.life <= 0 → just expired → no explosion
  //
  //   This guarantees that every enemy/boss hit produces a Jazmine
  //   bomb burst, and missed shots stay silent.
  function tickJazTracked() {
    if (!jazTracked.length) return;
    if (!state || !Array.isArray(state.bullets)) {
      jazTracked.length = 0;
      return;
    }
    const enemies = state.enemies || [];
    for (let i = jazTracked.length - 1; i >= 0; i--) {
      const t = jazTracked[i];
      if (t.exploded) {
        jazTracked.splice(i, 1);
        continue;
      }
      const b = t.b;
      const stillInList = state.bullets.indexOf(b) !== -1;
      // Keep the last live position so we can use it after the bullet
      // gets removed by the engine on the same frame as the hit.
      if (stillInList) {
        t.lastX = b.x;
        t.lastY = b.y;
      }
      if (stillInList && (b.life === undefined || b.life > 0) && !b.dead) {
        // Pre-empt: check enemy/boss contact at current bullet pos.
        // Ghost bullets use a wider radius to compensate for interpolation lag
        // so remote players see explosions even when enemy positions are slightly off.
        const extraR = t.isGhost ? 20 : 0;
        for (const e of enemies) {
          if (!e || e.dead) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < (e.r || 14) + (b.radius || 8) + extraR) {
            t.exploded = true;
            jazExplode(b.x, b.y, t.ownerP);
            b.dead = true;
            b.life = 0;
            const idx = state.bullets.indexOf(b);
            if (idx !== -1) state.bullets.splice(idx, 1);
            break;
          }
        }
        continue;
      }
      // Bullet has been removed by the engine.
      // Only explode if the engine killed it via enemy collision (b.dead===true).
      // If the bullet simply ran out of range (life expired), don't explode —
      // that was the source of the "bullet explodes without hitting anything" bug.
      // Exception: ghost bullets check if they expired near an enemy (interpolation lag
      // may have caused the live pre-empt check to miss by a few pixels).
      if (b && b.dead) {
        jazExplode(t.lastX, t.lastY, t.ownerP);
      } else if (t.isGhost && !t.exploded) {
        for (const e of enemies) {
          if (!e || e.dead) continue;
          if (Math.hypot(e.x - t.lastX, e.y - t.lastY) < (e.r || 14) + 44) {
            jazExplode(t.lastX, t.lastY, t.ownerP);
            break;
          }
        }
      }
      jazTracked.splice(i, 1);
    }
  }

  // ---------- Custom render hook: guardians + nuke charge + signals ----------
  // Wrap the global loop() to draw our overlays AFTER the main render.
  if (typeof window.loop === "function") {
    const _origLoop = window.loop;
    window.loop = function (now) {
      _origLoop(now);
      try {
        drawDlcOverlays();
      } catch (_) {}
    };
  }

  function drawDlcOverlays() {
    if (typeof ctx === "undefined" || !ctx || !state) return;
    if (state.scene !== "game") return;
    // Per-frame jazmine bullet poll (synced with rAF)
    try {
      tickJazTracked();
    } catch (_) {}
    // Cleanup expired blast counters (when game.js removes _jazBlast fx)
    if (Array.isArray(state.fx) && _jazActiveBlasts > 0) {
      // Count current _jazBlast entries; reconcile counter
      let alive = 0;
      for (const f of state.fx) if (f && f._jazBlast) alive++;
      if (alive < _jazActiveBlasts) _jazActiveBlasts = alive;
    }
    // Re-apply the camera transform that the main render used (cam shake
    // is reset to 0 by the time the main render finished, so this is only
    // a translation + zoom now). MUST include ZOOM scale — on mobile
    // (ZOOM<1) omitting it makes world-space FX (dual swords, scythe,
    // jaz blast, tethers, guardians) draw toward the bottom-right of the
    // canvas instead of on the hero.
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-state.cam.x, -state.cam.y);

    // Guardians
    for (const g of guardians) {
      if (g.life <= 0 || g.hp <= 0) continue;
      const flashing = performance.now() < g.flashUntil;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.shadowColor = "#aaff00";
      ctx.shadowBlur = flashing ? 30 : 18;
      ctx.fillStyle = flashing ? "#ffffff" : "#aaff00";
      ctx.beginPath();
      // Diamond shape to distinguish from regular enemies/players
      ctx.moveTo(0, -16);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // outline
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#05030d";
      ctx.stroke();
      ctx.restore();
      // HP bar
      const w = 34;
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillRect(g.x - w / 2, g.y - 26, w, 4);
      ctx.fillStyle = "#aaff00";
      ctx.fillRect(g.x - w / 2, g.y - 26, w * Math.max(0, g.hp / g.hpMax), 4);
      // Life timer bar
      ctx.fillStyle = "rgba(255,255,255,.45)";
      ctx.fillRect(
        g.x - w / 2,
        g.y - 30,
        w * Math.max(0, g.life / GUARD_LIFE),
        2,
      );
    }

    // Joseph's soul-tether chains — drawn from Joseph to each tethered enemy
    for (const t of tethers) {
      if (!t.ownerP || !t.e || t.e.dead || t.life <= 0) continue;
      const lifeT = t.life / t.life0;
      const alpha = 0.45 + 0.45 * Math.abs(Math.sin(performance.now() / 120));
      ctx.save();
      ctx.shadowColor = "#ff2bd6";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = `rgba(160,32,240,${alpha.toFixed(3)})`;
      ctx.lineWidth = 3;
      // Wavy chain — sample points along the line and offset perpendicularly
      const x0 = t.ownerP.x,
        y0 = t.ownerP.y;
      const x1 = t.e.x,
        y1 = t.e.y;
      const dx = x1 - x0,
        dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len,
        ny = dx / len; // perpendicular
      const segs = 14;
      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const px = x0 + dx * u;
        const py = y0 + dy * u;
        const wave =
          Math.sin(u * Math.PI * 4 + performance.now() / 120) *
          6 *
          (1 - Math.abs(u - 0.5) * 1.5);
        const x = px + nx * wave;
        const y = py + ny * wave;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Magenta secondary stroke
      ctx.strokeStyle = `rgba(255,43,214,${(alpha * 0.8).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Bind glyph at enemy
      ctx.fillStyle = `rgba(160,32,240,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(
        t.e.x,
        t.e.y,
        16 + 4 * Math.sin(performance.now() / 100),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      // Life timer arc above enemy
      ctx.strokeStyle = "#ff2bd6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        t.e.x,
        t.e.y - 24,
        10,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * lifeT,
      );
      ctx.stroke();
      ctx.restore();
    }

    // Jazmine BOMB explosion — multi-stage cinematic burst rendered each
    // frame. Stages by progress (tt = 0..1):
    //   tt < 0.12 : bright white pre-flash + small hot core
    //   tt < 0.55 : hot fireball expanding (white → yellow → orange)
    //   tt < 0.85 : outer + inner shockwave rings + cooling fireball (red)
    //   tt > 0.55 : dark smoke puff swelling and fading
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._jazBlast) continue;
        const tt = 1 - Math.max(0, f.life / f.life0); // 0..1
        const easeOut = 1 - Math.pow(1 - tt, 2);
        const easeIn = tt * tt;
        ctx.save();

        // -------- Stage 1: bright white pre-flash (fades in first 12%)
        const flashFade = Math.max(0, 1 - tt / 0.12);
        if (flashFade > 0) {
          ctx.globalAlpha = 0.95 * flashFade;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.maxR * (0.3 + tt * 0.45), 0, Math.PI * 2);
          ctx.fill();
          // Star-burst rays for camera-flash feel
          ctx.globalAlpha = 0.7 * flashFade;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 4;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            const len = f.maxR * (0.55 + tt * 0.6);
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(f.x + Math.cos(ang) * len, f.y + Math.sin(ang) * len);
          }
          ctx.stroke();
        }

        // -------- Stage 2: hot fireball — color shifts as it cools
        // Color shifts: white(0) → yellow(0.25) → orange(0.55) → red(0.9)
        let r, g, b;
        if (tt < 0.25) {
          // white → yellow
          const u = tt / 0.25;
          r = 255;
          g = Math.round(255 - 90 * u);
          b = Math.round(255 - 153 * u); // 255,255,255 → 255,165,102
        } else if (tt < 0.55) {
          // yellow → orange
          const u = (tt - 0.25) / 0.3;
          r = 255;
          g = Math.round(165 - 43 * u);
          b = Math.round(102 - 41 * u); // 255,165,102 → 255,122,61
        } else {
          // orange → red
          const u = Math.min(1, (tt - 0.55) / 0.35);
          r = 255;
          g = Math.round(122 - 63 * u);
          b = Math.round(61 - 2 * u); // 255,122,61 → 255,59,59
        }
        const fireR = f.maxR * (0.4 + easeOut * 0.75);
        const fireAlpha = 0.85 * Math.max(0, 1 - tt * 1.05);
        if (fireAlpha > 0.02) {
          ctx.globalAlpha = fireAlpha;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, fireR, 0, Math.PI * 2);
          ctx.fill();
          // Inner brighter core (hotter)
          ctx.globalAlpha = fireAlpha * 0.7;
          ctx.fillStyle = `rgb(255, ${Math.min(255, g + 60)}, ${Math.min(255, b + 80)})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, fireR * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }

        // -------- Stage 3: outer shockwave ring (fast, thick, fades)
        if (tt < 0.85) {
          ctx.globalAlpha = 0.95 * (1 - tt / 0.85);
          ctx.strokeStyle = "#ff7a3d";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.maxR * (0.45 + easeOut * 1.3), 0, Math.PI * 2);
          ctx.stroke();
          // Inner trailing shockwave (slower, hotter)
          ctx.globalAlpha = 0.75 * (1 - tt / 0.85);
          ctx.strokeStyle = "#ffec99";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.maxR * (0.3 + easeOut * 0.85), 0, Math.PI * 2);
          ctx.stroke();
        }

        // -------- Stage 4: dark smoke puff that swells and fades
        if (tt > 0.3) {
          const sP = (tt - 0.3) / 0.7;
          const smokeR = f.maxR * (0.55 + sP * 0.65);
          ctx.globalAlpha = 0.45 * (1 - sP);
          ctx.fillStyle = "#3a2a1f";
          // Slightly irregular puff: 3 overlapping circles for a "cloud" look
          ctx.beginPath();
          ctx.arc(f.x, f.y - 4, smokeR * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(f.x - 14, f.y + 8, smokeR * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(f.x + 16, f.y + 6, smokeR * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // Joseph's REAL SCYTHE swing — draws the actual blade (curved polygon
    // + handle) animated through the swing arc with motion-blur ghosts.
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._josephReap || !f.ownerP) continue;
        const t = 1 - Math.max(0, f.life / f.life0); // 0..1 progress
        const op = f.ownerP;
        // Wide motion-blur trail behind the swing (subtle crescent)
        const half =
          Math.abs(
            ((f.endAng - f.startAng + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
          ) / 2 || 1.4;
        const midAng = f.startAng + (f.endAng - f.startAng) * t;
        // Crescent trail — fades quickly
        const innerR = f.range * 0.55;
        const outerR = f.range * 1.05;
        const trailHalf = (f.endAng - f.startAng) * Math.max(0, t - 0.05);
        const a0 = f.startAng;
        const a1 = f.startAng + trailHalf;
        ctx.save();
        ctx.shadowColor = "#ff2bd6";
        ctx.shadowBlur = 18 * (1 - t);
        ctx.fillStyle = `rgba(160,32,240,${(0.35 * (1 - t)).toFixed(3)})`;
        ctx.beginPath();
        if (Math.abs(a1 - a0) > 0.01) {
          if (a1 > a0) {
            ctx.arc(op.x, op.y, outerR, a0, a1, false);
            ctx.arc(op.x, op.y, innerR, a1, a0, true);
          } else {
            ctx.arc(op.x, op.y, outerR, a0, a1, true);
            ctx.arc(op.x, op.y, innerR, a1, a0, false);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // Draw the SCYTHE itself at the current swing position + 3 ghost
        // copies trailing behind for motion blur.
        const drawScythe = (angAtTip, alpha) => {
          // The scythe's tip is at the outer edge of the arc.
          const tipX = op.x + Math.cos(angAtTip) * f.range;
          const tipY = op.y + Math.sin(angAtTip) * f.range;
          ctx.save();
          ctx.translate(tipX, tipY);
          // Orient the blade so its handle points back toward Joseph.
          ctx.rotate(angAtTip + Math.PI);
          ctx.shadowColor = "#ff2bd6";
          ctx.shadowBlur = 14 * alpha;
          // ---- Wooden handle (long shaft from tip back toward player)
          ctx.strokeStyle = `rgba(60,30,80,${alpha.toFixed(3)})`;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(f.range * 0.85, 0);
          ctx.stroke();
          // Handle highlight
          ctx.strokeStyle = `rgba(180,140,220,${(alpha * 0.7).toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -1);
          ctx.lineTo(f.range * 0.85, -1);
          ctx.stroke();
          // Pommel cap at end
          ctx.fillStyle = `rgba(160,32,240,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(f.range * 0.85, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          // ---- Curved blade — quadratic curve sweeping outward from tip
          // Blade is perpendicular to the handle, curving away from the
          // owner (so it looks like a proper scythe).
          ctx.fillStyle = `rgba(220,200,255,${alpha.toFixed(3)})`;
          ctx.strokeStyle = `rgba(255,43,214,${alpha.toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-12, -38, -50, -54); // outer edge curve
          ctx.quadraticCurveTo(-38, -30, -8, -8); // inner edge curve back
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Razor edge highlight along the outer curve
          ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.95).toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-12, -38, -50, -54);
          ctx.stroke();
          // Blade-handle bracket (the small spike where blade meets shaft)
          ctx.fillStyle = `rgba(160,32,240,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(-2, -2);
          ctx.lineTo(8, -10);
          ctx.lineTo(2, 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        };
        // Ghost copies trailing behind the current position
        for (let i = 3; i >= 1; i--) {
          const tt = Math.max(0, t - i * 0.1);
          const a = f.startAng + (f.endAng - f.startAng) * tt;
          drawScythe(a, 0.18 * (1 - t));
        }
        // Main blade at current position
        drawScythe(midAng, Math.max(0.25, 1 - t));
      }
    }

    // James's DUAL SWORDS X-strike — both blades sweep simultaneously
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._jamesXSwing || !f.ownerP) continue;
        const t = 1 - Math.max(0, f.life / f.life0); // 0..1
        const op = f.ownerP;
        // Each blade arcs across ~130° from one side to the other.
        // Blade A (right) sweeps from baseAng-65° → baseAng+65°.
        // Blade B (left)  sweeps from baseAng+65° → baseAng-65°.
        const half = (Math.PI * 65) / 180;
        const swing = -half + t * (2 * half);
        const aR = f.baseAng + swing;
        const aL = f.baseAng - swing;

        const drawSword = (tipAng, alpha, isLead) => {
          const tipX = op.x + Math.cos(tipAng) * f.range;
          const tipY = op.y + Math.sin(tipAng) * f.range;
          ctx.save();
          ctx.translate(tipX, tipY);
          ctx.rotate(tipAng + Math.PI);
          ctx.shadowColor = "#22e8ff";
          ctx.shadowBlur = 16 * alpha;
          // Blade — long tapered diamond from tip back toward player
          const bladeLen = f.range * 0.78;
          const bladeWide = 7;
          const grad = ctx.createLinearGradient(0, 0, bladeLen, 0);
          grad.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`);
          grad.addColorStop(0.4, `rgba(180,240,255,${alpha.toFixed(3)})`);
          grad.addColorStop(1, `rgba(34,232,255,${(alpha * 0.85).toFixed(3)})`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(bladeLen * 0.15, -bladeWide);
          ctx.lineTo(bladeLen, -bladeWide * 0.4);
          ctx.lineTo(bladeLen, bladeWide * 0.4);
          ctx.lineTo(bladeLen * 0.15, bladeWide);
          ctx.closePath();
          ctx.fill();
          // Edge highlight
          ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.95).toFixed(3)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(bladeLen, -bladeWide * 0.4);
          ctx.stroke();
          // Crossguard
          ctx.fillStyle = `rgba(40,80,120,${alpha.toFixed(3)})`;
          ctx.fillRect(bladeLen, -bladeWide * 1.6, 5, bladeWide * 3.2);
          // Handle (short, dark)
          ctx.fillStyle = `rgba(30,40,55,${alpha.toFixed(3)})`;
          ctx.fillRect(bladeLen + 5, -2.5, 16, 5);
          // Pommel
          ctx.fillStyle = `rgba(34,232,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(bladeLen + 22, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
          // Lead-blade gets a brighter highlight
          if (isLead) {
            ctx.shadowBlur = 24 * alpha;
            ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.9).toFixed(3)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(bladeLen, bladeWide * 0.4);
            ctx.stroke();
          }
          ctx.restore();
        };

        // Motion blur ghosts — 2 trailing copies behind each blade
        for (let i = 2; i >= 1; i--) {
          const tt = Math.max(0, t - i * 0.1);
          const swG = -half + tt * (2 * half);
          drawSword(f.baseAng + swG, 0.16 * (1 - t), false);
          drawSword(f.baseAng - swG, 0.16 * (1 - t), false);
        }
        // Main blades
        const aLead = f.lead === 0 ? aR : aL;
        const aOff = f.lead === 0 ? aL : aR;
        drawSword(aOff, Math.max(0.3, 0.85 - t * 0.4), false);
        drawSword(aLead, Math.max(0.4, 1.0 - t * 0.4), true);

        // Subtle crescent trail in front
        ctx.save();
        ctx.shadowColor = "#22e8ff";
        ctx.shadowBlur = 14 * (1 - t);
        ctx.fillStyle = `rgba(34,232,255,${(0.18 * (1 - t)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(
          op.x,
          op.y,
          f.range * 1.0,
          f.baseAng - half,
          f.baseAng + half,
          false,
        );
        ctx.arc(
          op.x,
          op.y,
          f.range * 0.5,
          f.baseAng + half,
          f.baseAng - half,
          true,
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // James's WHIRLWIND — both blades spin around him 360°
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._jamesWhirl || !f.ownerP) continue;
        const op = f.ownerP;
        const t = 1 - Math.max(0, f.life / f.life0); // 0..1
        const baseSpin = t * Math.PI * 6; // 3 full rotations over the duration
        const drawSword = (tipAng, alpha, len) => {
          const tipX = op.x + Math.cos(tipAng) * len;
          const tipY = op.y + Math.sin(tipAng) * len;
          ctx.save();
          ctx.translate(tipX, tipY);
          ctx.rotate(tipAng + Math.PI);
          ctx.shadowColor = "#22e8ff";
          ctx.shadowBlur = 18 * alpha;
          const bladeLen = len * 0.85;
          const bladeWide = 7;
          const grad = ctx.createLinearGradient(0, 0, bladeLen, 0);
          grad.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`);
          grad.addColorStop(0.4, `rgba(180,240,255,${alpha.toFixed(3)})`);
          grad.addColorStop(1, `rgba(34,232,255,${(alpha * 0.85).toFixed(3)})`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(bladeLen * 0.15, -bladeWide);
          ctx.lineTo(bladeLen, -bladeWide * 0.4);
          ctx.lineTo(bladeLen, bladeWide * 0.4);
          ctx.lineTo(bladeLen * 0.15, bladeWide);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = `rgba(40,80,120,${alpha.toFixed(3)})`;
          ctx.fillRect(bladeLen, -bladeWide * 1.4, 4, bladeWide * 2.8);
          ctx.restore();
        };
        // Outer ring trail (cyan whirl)
        ctx.save();
        ctx.shadowColor = "#22e8ff";
        ctx.shadowBlur = 24;
        ctx.strokeStyle = `rgba(34,232,255,0.35)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(op.x, op.y, f.reach * 0.9, baseSpin - 1.6, baseSpin + 0.4);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,0.6)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(op.x, op.y, f.reach * 0.9, baseSpin - 0.8, baseSpin + 0.2);
        ctx.stroke();
        ctx.restore();
        // Two opposite blades + ghost copies behind
        for (let i = 4; i >= 1; i--) {
          const a = 0.12 * (1 - i * 0.18);
          drawSword(baseSpin - i * 0.12, a, f.reach);
          drawSword(baseSpin - i * 0.12 + Math.PI, a, f.reach);
        }
        drawSword(baseSpin, 0.95, f.reach);
        drawSword(baseSpin + Math.PI, 0.95, f.reach);
      }
    }

    // Joseph's slash gash — a glowing magenta cut mark left on hit enemies
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._josephGash) continue;
        const t = 1 - Math.max(0, f.life / f.life0);
        const alpha = 0.9 * (1 - t);
        const len = f.len * (1 + t * 0.4);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.ang);
        ctx.shadowColor = f.color || "#ff2bd6";
        ctx.shadowBlur = 10 * (1 - t);
        ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.lineWidth = 4 * (1 - t * 0.5);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,43,214,${alpha.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-len * 0.9, 1);
        ctx.lineTo(len * 0.9, 1);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Joseph's orbiting souls — purple wisps with trailing tails
    if (Array.isArray(state.players)) {
      for (const p of state.players) {
        if (!p || p.heroId !== "joseph" || !p._souls || !p._souls.length)
          continue;
        for (const s of p._souls) {
          const sx = p.x + Math.cos(s.angle) * s.dist;
          const sy = p.y + Math.sin(s.angle) * s.dist;
          const lifeT = s.life / s.life0;
          // Trailing tail (behind orbit direction)
          const tailX = p.x + Math.cos(s.angle - 0.35) * s.dist;
          const tailY = p.y + Math.sin(s.angle - 0.35) * s.dist;
          ctx.save();
          ctx.shadowColor = "#a020f0";
          ctx.shadowBlur = 14;
          ctx.strokeStyle = `rgba(160,32,240,${(0.55 * lifeT).toFixed(3)})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(sx, sy);
          ctx.stroke();
          // Soul orb
          ctx.fillStyle = `rgba(200,130,255,${(0.95 * lifeT).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(
            sx,
            sy,
            4 + Math.sin(performance.now() / 120 + s.angle * 3) * 1.2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          // Inner highlight
          ctx.fillStyle = `rgba(255,255,255,${(0.85 * lifeT).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx - 1, sy - 1, 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Justin's spirit-blade slash arc
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._justinSlash) continue;
        const t = 1 - Math.max(0, f.life / f.life0); // 0..1
        // Arc grows out from a 0.55*range crescent to full range
        const innerR = f.range * (0.45 + 0.1 * t);
        const outerR = f.range * (0.85 + 0.2 * t);
        const half = f.arc / 2;
        const a0 = f.ang - half,
          a1 = f.ang + half;
        const alpha = 0.85 * (1 - t);
        ctx.save();
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 22 * (1 - t);
        ctx.fillStyle =
          typeof withAlpha === "function"
            ? withAlpha(f.color || "#aaff00", alpha)
            : `rgba(170,255,0,${alpha.toFixed(3)})`;
        ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.9).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, outerR, a0, a1, false);
        ctx.arc(f.x, f.y, innerR, a1, a0, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Inner crescent highlight
        ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, outerR * 0.97, a0 + 0.06, a1 - 0.06, false);
        ctx.arc(f.x, f.y, outerR * 0.86, a1 - 0.06, a0 + 0.06, true);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Iruha machete-cleaver swing (hits 1 & 2 of the 3-hit combo)
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._iruhaMachete || !f.ownerP) continue;
        const t = 1 - Math.max(0, f.life / f.life0);
        const swingT = Math.pow(t, 0.65);
        const half = f.arc / 2;
        const op = f.ownerP;
        const r = f.range || 90;
        for (let g = 3; g >= 0; g--) {
          const ga = f.ang0 - half + f.arc * swingT - (g / 4) * 0.38;
          const galpha = (0.25 + (1 - g / 4) * 0.6) * (1 - t * 0.5);
          ctx.save();
          ctx.translate(op.x, op.y);
          ctx.rotate(ga);
          ctx.shadowColor = f.color || "#69e6ff";
          ctx.shadowBlur = Math.max(0, 20 - g * 4);
          // Handle (thin rectangular shaft)
          ctx.fillStyle = `rgba(40,70,90,${galpha.toFixed(3)})`;
          ctx.fillRect(4, -4, r * 0.52, 8);
          // Cleaver head (thick rectangle at far end)
          const hx = 4 + r * 0.52;
          const hW = Math.min(52, r * 0.42);
          const hH = 28;
          const grd = ctx.createLinearGradient(hx, -hH, hx + hW, hH);
          grd.addColorStop(0, `rgba(210,240,255,${galpha.toFixed(3)})`);
          grd.addColorStop(0.45, `rgba(105,230,255,${galpha.toFixed(3)})`);
          grd.addColorStop(1, `rgba(50,110,150,${galpha.toFixed(3)})`);
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.moveTo(hx, -hH * 0.68);
          ctx.lineTo(hx + hW, -hH * 0.68);
          ctx.lineTo(hx + hW, hH * 0.32);
          ctx.lineTo(hx, hH * 0.32);
          ctx.closePath();
          ctx.fill();
          // Spine highlight
          ctx.strokeStyle = `rgba(255,255,255,${(galpha * 0.88).toFixed(3)})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(hx, -hH * 0.68);
          ctx.lineTo(hx + hW, -hH * 0.68);
          ctx.stroke();
          // Rivets
          ctx.fillStyle = `rgba(105,230,255,${galpha.toFixed(3)})`;
          ctx.beginPath(); ctx.arc(hx + hW * 0.28, -hH * 0.1, 2.8, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(hx + hW * 0.68, -hH * 0.1, 2.8, 0, Math.PI * 2); ctx.fill();
          if (g === 0 && t < 0.7) {
            // Leading edge flash
            ctx.fillStyle = `rgba(255,255,255,${((0.7 - t) * 1.2).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(hx + hW, -hH * 0.2, 5.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }

    // Kaitu sword swing (thin katana arc alongside the ice crystal shot)
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._kaituSlash || !f.ownerP) continue;
        const t = 1 - Math.max(0, f.life / f.life0);
        const half = f.arc / 2;
        const op = f.ownerP;
        const r = f.range || 80;
        for (let g = 2; g >= 0; g--) {
          const swingT = Math.pow(t, 0.6);
          const ga = f.ang0 - half + f.arc * swingT - (g / 3) * 0.32;
          const galpha = (0.3 + (1 - g / 3) * 0.55) * (1 - t * 0.4);
          ctx.save();
          ctx.translate(op.x, op.y);
          ctx.rotate(ga);
          ctx.shadowColor = f.color || "#22e8ff";
          ctx.shadowBlur = Math.max(0, 18 - g * 5);
          // Blade body — thin katana shape
          const grd = ctx.createLinearGradient(6, -3, r, 3);
          grd.addColorStop(0, `rgba(180,230,255,${galpha.toFixed(3)})`);
          grd.addColorStop(0.6, `rgba(34,232,255,${galpha.toFixed(3)})`);
          grd.addColorStop(1, `rgba(20,100,160,${(galpha * 0.6).toFixed(3)})`);
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.moveTo(6, -2.5);
          ctx.lineTo(r - 4, -1.5);
          ctx.lineTo(r, 0);
          ctx.lineTo(r - 4, 1.5);
          ctx.lineTo(6, 2.5);
          ctx.closePath();
          ctx.fill();
          // Edge highlight
          ctx.strokeStyle = `rgba(220,245,255,${(galpha * 0.7).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(6, -2.5);
          ctx.lineTo(r, 0);
          ctx.stroke();
          // Guard (crosspiece)
          ctx.fillStyle = `rgba(80,160,200,${galpha.toFixed(3)})`;
          ctx.fillRect(2, -6, 4, 12);
          ctx.restore();
        }
      }
    }

    // Yachiyu flying umbrella and planted zone
    if (window._yachiyuUmbs && window._yachiyuUmbs.size > 0) {
      for (const [, u] of window._yachiyuUmbs) {
        if (u.phase === "flying") {
          // Spinning umbrella projectile
          const spin = performance.now() / 120;
          const sz = u.charged ? 20 : 14;
          ctx.save();
          ctx.translate(u.x, u.y);
          ctx.rotate(spin);
          ctx.shadowColor = "#aaffd6";
          ctx.shadowBlur = u.charged ? 28 : 16;
          // Canopy petals
          const nPetals = 8;
          for (let i = 0; i < nPetals; i++) {
            const a = (i / nPetals) * Math.PI * 2;
            const alpha = u.charged ? 0.85 : 0.65;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(160,255,210,${alpha})`
              : `rgba(80,200,160,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, sz, a, a + Math.PI / nPetals);
            ctx.closePath();
            ctx.fill();
          }
          // Central knob
          ctx.fillStyle = u.charged ? "#ffffff" : "#aaffd6";
          ctx.beginPath();
          ctx.arc(0, 0, sz * 0.18, 0, Math.PI * 2);
          ctx.fill();
          // Handle
          ctx.strokeStyle = `rgba(80,160,120,0.8)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, sz * 0.25);
          ctx.lineTo(0, sz * 1.2);
          ctx.stroke();
          ctx.restore();
          // Charged glow trail dots
          if (u.charged) {
            ctx.save();
            ctx.fillStyle = "rgba(160,255,210,0.35)";
            ctx.shadowColor = "#aaffd6";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(u.x - u.vx * 0.018, u.y - u.vy * 0.018, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else if (u.phase === "planted") {
          // Planted zone indicator: soft pulsing teal circle
          const lifeFrac = Math.max(0, u.life / (u.life0 || 6));
          const pulse = 0.55 + 0.35 * Math.sin(performance.now() / 200);
          const zR = 60;
          ctx.save();
          ctx.globalAlpha = lifeFrac * pulse * 0.55;
          ctx.fillStyle = "#aaffd6";
          ctx.shadowColor = "#aaffd6";
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(u.x, u.y, zR, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
          // Umbrella icon (static)
          const sz = 14;
          ctx.save();
          ctx.translate(u.x, u.y);
          ctx.shadowColor = "#aaffd6";
          ctx.shadowBlur = 14 * pulse;
          const nP = 8;
          for (let i = 0; i < nP; i++) {
            const a = (i / nP) * Math.PI * 2;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(160,255,210,${(0.85 * lifeFrac).toFixed(3)})`
              : `rgba(80,200,160,${(0.65 * lifeFrac).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, sz, a, a + Math.PI / nP);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = `rgba(255,255,255,${(0.9 * lifeFrac).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(0, 0, sz * 0.18, 0, Math.PI * 2);
          ctx.fill();
          // Life timer arc around the planted umbrella
          ctx.strokeStyle = `rgba(160,255,210,${(0.5 * lifeFrac).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, sz + 6, -Math.PI / 2, -Math.PI / 2 + lifeFrac * Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Nuke charging ring (drawn from special _nukeCharge fx entries)
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._nukeCharge) continue;
        const t = 1 - Math.max(0, f.life / f.life0);
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 80);
        const r1 = 60 + 80 * t;
        const r2 = 30 + 60 * t * pulse;
        // Outer warning ring
        ctx.save();
        ctx.strokeStyle = `rgba(255,128,223,${0.35 + 0.4 * pulse})`;
        ctx.lineWidth = 6;
        ctx.shadowColor = "#ff80df";
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r1, 0, Math.PI * 2);
        ctx.stroke();
        // Inner pulsing core
        ctx.fillStyle = `rgba(255,128,223,${0.18 + 0.25 * pulse})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r2, 0, Math.PI * 2);
        ctx.fill();
        // "NUKE" label
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,255,255,${0.85})`;
        ctx.font = "bold 14px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          "☢ NUKE " + Math.ceil(f.life * 10) / 10 + "s",
          f.x,
          f.y - r1 - 6,
        );
        ctx.restore();
      }
    }

    // Iruha shield aura — pulsing protective ring visible to all players
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._iruhaShieldAura || !f.ownerP) continue;
        if (f.life <= 0) continue;
        // Keep position anchored to the player
        f.x = f.ownerP.x;
        f.y = f.ownerP.y;
        const lifeT  = Math.max(0, f.life / f.life0);
        const pulse  = 0.55 + 0.35 * Math.sin(performance.now() / 220);
        const shColor = (HEROES.iruha && HEROES.iruha.color) || "#ff8800";
        ctx.save();
        ctx.globalAlpha = lifeT * pulse * 0.7;
        ctx.strokeStyle = shColor;
        ctx.lineWidth   = 3;
        ctx.shadowColor = shColor;
        ctx.shadowBlur  = 18;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        // Secondary inner ring
        ctx.globalAlpha = lifeT * pulse * 0.35;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Well's GREATSWORD swing — animated jagged Zweihänder sweeping
    // through the swing arc with a cold-blue aura, layered ghost trails.
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._wellGreatsword || !f.ownerP) continue;
        const op = f.ownerP;
        const t = 1 - Math.max(0, f.life / f.life0); // 0..1 swing progress
        const half = f.arc / 2;
        // Sweep from -half to +half across the swing
        const swing = -half + f.arc * t;
        const baseA = f.ang0 + swing;
        // Draw 4 ghosted blades behind the leading edge for motion blur
        for (let g = 3; g >= 0; g--) {
          const ga = baseA - (g / 4) * 0.55; // trailing offset
          const galpha = 0.35 + (1 - g / 4) * 0.55;
          ctx.save();
          ctx.translate(op.x, op.y);
          ctx.rotate(ga);
          // Aura glow
          ctx.shadowColor = f.color;
          ctx.shadowBlur = 24 - g * 4;
          // Hilt
          ctx.fillStyle = `rgba(60,80,110,${galpha.toFixed(3)})`;
          ctx.fillRect(0, -4, 26, 8);
          // Crossguard
          ctx.fillStyle = `rgba(120,160,200,${galpha.toFixed(3)})`;
          ctx.fillRect(22, -14, 6, 28);
          // Blade — long jagged Zweihänder
          const bladeLen = f.reach * 1.05;
          const bw = 14;
          ctx.beginPath();
          ctx.moveTo(28, -bw);
          // Top jagged edge
          ctx.lineTo(60, -bw + 1);
          ctx.lineTo(70, -bw - 3);
          ctx.lineTo(95, -bw + 1);
          ctx.lineTo(110, -bw - 4);
          ctx.lineTo(140, -bw + 2);
          ctx.lineTo(165, -bw - 3);
          ctx.lineTo(bladeLen - 18, -bw + 4);
          // Tip
          ctx.lineTo(bladeLen, 0);
          // Bottom jagged edge
          ctx.lineTo(bladeLen - 18, bw - 4);
          ctx.lineTo(165, bw - 3);
          ctx.lineTo(140, bw + 2);
          ctx.lineTo(110, bw - 4);
          ctx.lineTo(95, bw + 1);
          ctx.lineTo(70, bw - 3);
          ctx.lineTo(60, bw + 1);
          ctx.lineTo(28, bw);
          ctx.closePath();
          // Blade fill — gradient from steel to cyan glow
          const grad = ctx.createLinearGradient(28, 0, bladeLen, 0);
          grad.addColorStop(0, `rgba(180,200,220,${(galpha * 0.95).toFixed(3)})`);
          grad.addColorStop(0.5, `rgba(220,235,250,${galpha.toFixed(3)})`);
          grad.addColorStop(1, `rgba(155,232,255,${galpha.toFixed(3)})`);
          ctx.fillStyle = grad;
          ctx.fill();
          // Cold-blue runic groove down the center
          ctx.shadowBlur = 0;
          ctx.strokeStyle = `rgba(155,232,255,${(galpha * 0.85).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(34, 0);
          ctx.lineTo(bladeLen - 10, 0);
          ctx.stroke();
          // Highlight tip flash on the leading blade
          if (g === 0) {
            ctx.fillStyle = `rgba(255,255,255,${(0.85 * (1 - t)).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(bladeLen, 0, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }

    // Well's GLASS-SHATTER burst — radial fan of glass shards that scatter
    // outward from a parry point, fading in opacity as they fly.
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._wellShatter) continue;
        const t = 1 - Math.max(0, f.life / f.life0);
        const alpha = (1 - t) * 0.95;
        const N = 9;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.ang || 0);
        ctx.shadowColor = f.color || "#9be8ff";
        ctx.shadowBlur = 18;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2 + (i * 0.07);
          const dist = 8 + t * 60 + (i % 3) * 6;
          const sx = Math.cos(a) * dist;
          const sy = Math.sin(a) * dist;
          const sw = 8 + (i % 3) * 4;
          const sh = 3 + (i % 2) * 2;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(a + 0.4);
          ctx.fillStyle =
            typeof withAlpha === "function"
              ? withAlpha("#dff5ff", alpha)
              : `rgba(223,245,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(0, -sh);
          ctx.lineTo(sw, 0);
          ctx.lineTo(0, sh);
          ctx.lineTo(-sw * 0.3, 0);
          ctx.closePath();
          ctx.fill();
          // Cyan rim
          ctx.strokeStyle =
            typeof withAlpha === "function"
              ? withAlpha(f.color || "#9be8ff", alpha * 0.9)
              : `rgba(155,232,255,${(alpha * 0.9).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
        // Center flash
        ctx.fillStyle =
          typeof withAlpha === "function"
            ? withAlpha("#ffffff", alpha * 0.5)
            : `rgba(255,255,255,${(alpha * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(0, 0, 10 + t * 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Kagoya's PARASOL THRUST — neon spike line forward
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._kagoyaThrust) continue;
        const t = 1 - Math.max(0, f.life / f.life0);
        const a = (1 - t) * 0.95;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.ang);
        ctx.shadowColor = f.color || "#ff7ad9";
        ctx.shadowBlur = 18;
        // Closed parasol body (long taper) extending out to reach
        const len = f.reach;
        const w = 9;
        ctx.beginPath();
        ctx.moveTo(0, -w * 0.4);
        ctx.lineTo(len * 0.85, -w * 0.18);
        ctx.lineTo(len, 0);
        ctx.lineTo(len * 0.85, w * 0.18);
        ctx.lineTo(0, w * 0.4);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, `rgba(255,122,217,${(a * 0.85).toFixed(3)})`);
        grad.addColorStop(0.6, `rgba(180,255,240,${a.toFixed(3)})`);
        grad.addColorStop(1, `rgba(255,255,255,${a.toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fill();
        // Bright leading point
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(len, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        // Crossbar handle at base
        ctx.fillStyle = `rgba(255,122,217,${a.toFixed(3)})`;
        ctx.fillRect(-6, -3, 6, 6);
        ctx.restore();
      }
    }

    // Kagoya's CLONE PARASOL — glitching iridescent umbrella stuck in floor
    if (Array.isArray(state.fx)) {
      for (const f of state.fx) {
        if (!f || !f._kagoyaClone) continue;
        const t = 1 - Math.max(0, f.life / f.life0);
        const tt = performance.now() / 1000;
        // Glitch: random tiny offset + alpha flicker cycling between
        // "physical" (high alpha, no offset) and "digital" (low alpha,
        // chromatic offset)
        const phase = (Math.sin(tt * 11) + 1) / 2; // 0..1
        const isDigital = phase > 0.55;
        const jx = isDigital ? (Math.random() - 0.5) * 4 : 0;
        const jy = isDigital ? (Math.random() - 0.5) * 2 : 0;
        const baseA = isDigital ? 0.55 : 0.85;
        const fade = 1 - t * 0.4;
        const alpha = baseA * fade;
        ctx.save();
        ctx.translate(f.x + jx, f.y + jy);
        // Rotation with slow wobble
        const rot = Math.sin(tt * 1.4) * 0.12;
        ctx.rotate(rot - Math.PI / 2);
        ctx.shadowColor = f.color || "#ff7ad9";
        ctx.shadowBlur = isDigital ? 20 : 28;
        // ----- Umbrella canopy (open, dome-like) -----
        const R = 26;
        // Dome
        ctx.beginPath();
        ctx.arc(0, 0, R, Math.PI, 0);
        ctx.closePath();
        const can = ctx.createLinearGradient(-R, 0, R, 0);
        can.addColorStop(0, `rgba(255,122,217,${alpha.toFixed(3)})`);
        can.addColorStop(0.5, `rgba(170,255,234,${alpha.toFixed(3)})`);
        can.addColorStop(1, `rgba(166,140,255,${alpha.toFixed(3)})`);
        ctx.fillStyle = can;
        ctx.fill();
        // Dome ribs (8 segments)
        ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.85).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        for (let i = 0; i <= 8; i++) {
          const a = Math.PI + (i / 8) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
          ctx.stroke();
        }
        // Bottom rim arc
        ctx.beginPath();
        ctx.moveTo(-R, 0);
        ctx.quadraticCurveTo(0, 8, R, 0);
        ctx.strokeStyle = `rgba(255,122,217,${alpha.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        // ----- Handle/shaft into the floor -----
        ctx.strokeStyle = `rgba(220,200,255,${alpha.toFixed(3)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 30);
        ctx.stroke();
        // Hooked end (J-shape)
        ctx.beginPath();
        ctx.arc(-4, 30, 4, 0, Math.PI);
        ctx.stroke();
        // Top spike
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(-2, -R + 1);
        ctx.lineTo(0, -R - 6);
        ctx.lineTo(2, -R + 1);
        ctx.closePath();
        ctx.fill();
        // Chromatic fringe in digital state
        if (isDigital) {
          ctx.globalCompositeOperation = "lighter";
          ctx.shadowBlur = 0;
          ctx.strokeStyle = `rgba(105,230,255,${(alpha * 0.7).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(2, 0, R + 1, Math.PI, 0);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,80,180,${(alpha * 0.7).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(-2, 0, R + 1, Math.PI, 0);
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.restore();
        // ----- Neon DoT ring (pulses bigger as it ticks) -----
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.shadowColor = f.color || "#ff7ad9";
        ctx.shadowBlur = 14;
        const pulse = (Math.sin(tt * 4) + 1) / 2;
        ctx.strokeStyle = `rgba(255,122,217,${(0.45 * fade).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, (f._radius || 70) * (0.8 + pulse * 0.2), 0, Math.PI * 2);
        ctx.stroke();
        // Inner thinner ring
        ctx.strokeStyle = `rgba(170,255,234,${(0.35 * fade).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(0, 0, (f._radius || 70) * (0.55 + pulse * 0.1), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Kagoya's HOMING UMBRELLA bullet — overlay an iridescent open-parasol
    // shape on top of any bullet flagged _kagoyaUmb so it visually reads as
    // a chasing umbrella instead of a generic glow ball.
    if (Array.isArray(state.bullets)) {
      for (const b of state.bullets) {
        if (!b || !b._kagoyaUmb || b.dead) continue;
        const tt = performance.now() / 1000;
        const spinA = tt * 6 + (b._spin || 0);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(spinA);
        ctx.shadowColor = "#ff7ad9";
        ctx.shadowBlur = 18;
        const R = 14;
        // Canopy dome
        ctx.beginPath();
        ctx.arc(0, 0, R, Math.PI, 0);
        ctx.closePath();
        const can = ctx.createLinearGradient(-R, 0, R, 0);
        can.addColorStop(0, "rgba(255,122,217,0.95)");
        can.addColorStop(0.5, "rgba(170,255,234,0.9)");
        can.addColorStop(1, "rgba(166,140,255,0.95)");
        ctx.fillStyle = can;
        ctx.fill();
        // Ribs
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 6; i++) {
          const a = Math.PI + (i / 6) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
          ctx.stroke();
        }
        // Tip spike
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.beginPath();
        ctx.moveTo(-2, -R + 1);
        ctx.lineTo(0, -R - 5);
        ctx.lineTo(2, -R + 1);
        ctx.closePath();
        ctx.fill();
        // Short handle
        ctx.strokeStyle = "rgba(220,200,255,0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 12);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Signal bars over each player's head (multiplayer only)
    if (typeof isMultiMode === "function" && isMultiMode()) {
      drawSignalBars(state.player, true);
      if (state.others && state.others.forEach) {
        state.others.forEach((o) => drawSignalBars(o, false));
      }
    }

    ctx.restore();
  }

  function drawSignalBars(p, local) {
    if (!p || p.alive === false) return;
    const lvl = local ? localSignalLevel() : remoteSignalLevel(p);
    const colors = ["#ff3d6a", "#ffd166", "#3dffb0"];
    const fills = [1, 2, 3]; // bars to fill at level 1,2,3
    const x = p.x + 18,
      y = p.y - 28;
    for (let i = 0; i < 3; i++) {
      const filled = i + 1 <= lvl;
      const h = 3 + i * 3;
      ctx.fillStyle = filled
        ? colors[Math.max(0, Math.min(2, lvl - 1))]
        : "rgba(255,255,255,0.18)";
      ctx.fillRect(x + i * 4, y - h, 3, h);
    }
  }

  // ---------- Signal tracking ----------
  // remoteLastSeen[id] = performance.now() of last incoming playerState
  const remoteLastSeen = new Map();

  if (typeof window.applyRemoteState === "function") {
    const _origApplyRemoteState = window.applyRemoteState;
    window.applyRemoteState = function (msg) {
      _origApplyRemoteState(msg);
      if (msg && msg.id) remoteLastSeen.set(msg.id, performance.now());
    };
  }

  // Seed remoteLastSeen whenever a lobbyUpdate arrives — everyone in the
  // lobby is connected by definition, so give them a fresh timestamp so
  // the signal indicator shows GOOD immediately without waiting for
  // playerState messages (which only flow once the game starts).
  if (typeof window.bindRoomHandlers === "function") {
    const _origBindRoomHandlers = window.bindRoomHandlers;
    window.bindRoomHandlers = function () {
      _origBindRoomHandlers();
      try {
        if (typeof activeRoom !== "undefined" && activeRoom) {
          activeRoom.onMessage("lobbyUpdate", (msg) => {
            const now = performance.now();
            for (const p of (msg && msg.players) || []) {
              if (p && p.id) remoteLastSeen.set(p.id, now);
            }
          });
        }
      } catch (_) {}
    };
  }

  function remoteSignalLevel(p) {
    const id = p && p.id;
    if (!id) return 0;
    // In the lobby, if the player is present in lobby.players they are
    // connected via WebSocket — the absence of a playerState message just
    // means the game hasn't started yet, so default to GOOD (3).
    const inLobby =
      typeof state !== "undefined" &&
      state.lobby &&
      state.lobby.players &&
      state.lobby.players.has(id);
    const last = remoteLastSeen.get(id);
    if (!last) return inLobby ? 3 : 0;
    const gap = performance.now() - last;
    if (gap < 250) return 3;
    if (gap < 600) return 2;
    if (gap < 1500) return 1;
    return 0;
  }

  // Local: we can't measure RTT without a server-side echo, so we use
  // a heuristic: if our heartbeat broadcast is keeping up (we update
  // ~every 50ms), and the websocket is open, we're "good".
  let lastLocalSendOK = 0;
  function pollLocalConn() {
    if (typeof activeRoom !== "undefined" && activeRoom) {
      try {
        const open =
          activeRoom.connection && activeRoom.connection.isOpen !== false;
        if (open) lastLocalSendOK = performance.now();
      } catch (_) {}
    }
  }
  setInterval(pollLocalConn, 250);

  function localSignalLevel() {
    if (typeof activeRoom === "undefined" || !activeRoom) return 0;
    const gap = performance.now() - lastLocalSendOK;
    if (gap < 600) return 3;
    if (gap < 1500) return 2;
    if (gap < 3000) return 1;
    return 0;
  }

  // ---------- Lobby: signal column + host hint ----------
  if (typeof window.renderLobby === "function") {
    const _origRenderLobby = window.renderLobby;
    window.renderLobby = function () {
      _origRenderLobby();
      decorateLobby();
    };
  }

  function decorateLobby() {
    // Inject the host-bandwidth hint into the lobby header (once)
    const lobby = document.getElementById("lobby");
    if (lobby && !lobby.querySelector(".ns-host-hint")) {
      const inner = lobby.querySelector(".inner");
      if (inner) {
        const hint = document.createElement("div");
        hint.className = "ns-host-hint";
        hint.innerHTML = `
          <span class="ns-hint-icon" title="Hosting tip">i</span>
          <span class="ns-hint-text"><b style="color:#22e8ff">Host needs stable internet.</b> The host runs the world for everyone — if their connection lags, joiners will lag too.</span>
        `;
        inner.insertBefore(hint, inner.children[1] || null);
      }
    }
    // Add signal column to each row
    const list = document.getElementById("lobbyList");
    if (!list) return;
    const rows = list.querySelectorAll(".player-row");
    if (typeof state === "undefined" || !state.lobby) return;
    const players = [...state.lobby.players.values()].sort(
      (a, b) =>
        Number(!!b.isHost) - Number(!!a.isHost) ||
        String(a.name || "").localeCompare(String(b.name || "")),
    );
    rows.forEach((row, idx) => {
      const p = players[idx];
      if (!p) return;
      if (row.querySelector(".ns-signal")) return;
      const span = document.createElement("span");
      span.className = "ns-signal";
      const isMe =
        typeof state !== "undefined" &&
        state.mySessionId &&
        p.id === state.mySessionId;
      const lvl = isMe ? localSignalLevel() : remoteSignalLevel(p);
      span.innerHTML = signalIconHtml(lvl);
      row.appendChild(span);
    });
  }

  function signalIconHtml(lvl) {
    const colors = ["#ff3d6a", "#ffd166", "#3dffb0"];
    const c = lvl >= 3 ? colors[2] : lvl === 2 ? colors[1] : colors[0];
    const labels = ["NO SIGNAL", "LAG", "OK", "GOOD"];
    let bars = "";
    for (let i = 0; i < 3; i++) {
      const filled = i + 1 <= lvl;
      const h = 6 + i * 3;
      bars += `<i style="display:inline-block;width:3px;height:${h}px;margin-right:1px;background:${filled ? c : "rgba(255,255,255,.2)"};border-radius:1px;vertical-align:bottom;"></i>`;
    }
    return `<span title="${labels[Math.max(0, Math.min(3, lvl))]}" style="display:inline-flex;align-items:flex-end;gap:4px;color:${c};font-size:10px;letter-spacing:.12em;">${bars}<span style="margin-left:4px;">${labels[Math.max(0, Math.min(3, lvl))]}</span></span>`;
  }

  // Re-decorate lobby periodically so signal levels refresh while waiting
  setInterval(() => {
    if (typeof state !== "undefined" && state.scene === "lobby") {
      // Force a re-render of just the signal cells without rebuilding rows
      const list = document.getElementById("lobbyList");
      if (!list) return;
      const players = [...state.lobby.players.values()].sort(
        (a, b) =>
          Number(!!b.isHost) - Number(!!a.isHost) ||
          String(a.name || "").localeCompare(String(b.name || "")),
      );
      const rows = list.querySelectorAll(".player-row");
      rows.forEach((row, idx) => {
        const p = players[idx];
        if (!p) return;
        const isMe = state.mySessionId && p.id === state.mySessionId;
        const lvl = isMe ? localSignalLevel() : remoteSignalLevel(p);
        let cell = row.querySelector(".ns-signal");
        if (!cell) {
          cell = document.createElement("span");
          cell.className = "ns-signal";
          row.appendChild(cell);
        }
        cell.innerHTML = signalIconHtml(lvl);
      });
    }
  }, 700);

  // ---------- CSS for hint + signal layout ----------
  const enhCss = `
    .ns-host-hint { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; margin:10px 0; background:rgba(34,232,255,0.06); border:1px solid rgba(34,232,255,0.35); border-radius:10px; color:#cfeaff; font-size:12px; line-height:1.5; }
    .ns-host-hint .ns-hint-icon { flex-shrink:0; width:22px; height:22px; border-radius:50%; background:rgba(34,232,255,0.18); color:#22e8ff; border:1px solid rgba(34,232,255,0.6); display:inline-flex; align-items:center; justify-content:center; font-family:'Orbitron',monospace; font-weight:900; font-size:13px; cursor:help; }
    .ns-host-hint .ns-hint-text { flex:1; }
    .player-row { gap:8px !important; flex-wrap:wrap; }
    .player-row .ns-signal { margin-left:auto; }
  `;
  const enhStyle = document.createElement("style");
  enhStyle.textContent = enhCss;
  document.head.appendChild(enhStyle);

  // ===========================================================
  // CPK helpers — slow zones, homing notes, ice slow, silence
  // ===========================================================

  // ---- Slow zones (Kagoya glitch field, Kaitu blizzard) ----
  const slowZones = [];
  window.__nsAddSlowZone = function (zone) {
    // zone: {x, y, r, life, dps, slow, owner, follow?}
    slowZones.push(Object.assign({ life0: zone.life }, zone));
  };
  // Tick at 20Hz: damage + slow enemies inside zones, expire zones
  setInterval(() => {
    if (!slowZones.length) return;
    const dt = 1 / 20;
    const auth =
      typeof canAuthorEnemies === "function" ? canAuthorEnemies() : true;
    for (let i = slowZones.length - 1; i >= 0; i--) {
      const z = slowZones[i];
      z.life -= dt;
      if (z.life <= 0) {
        slowZones.splice(i, 1);
        continue;
      }
      if (z.follow) {
        z.x = z.follow.x;
        z.y = z.follow.y;
      }
      if (!auth || !state || !Array.isArray(state.enemies)) continue;
      for (const e of state.enemies) {
        if (!e || e.dead) continue;
        const d = Math.hypot(e.x - z.x, e.y - z.y);
        if (d < z.r + (e.r || 0)) {
          if (z.dps > 0)
            try {
              damageEnemy(e, z.dps * dt, { id: z.owner });
            } catch (_) {}
          // Stack-safe slow: store strongest active slow until time expires
          const until = performance.now() / 1000 + 0.25; // refresh every tick
          if (
            !e._slowUntil ||
            until > e._slowUntil ||
            z.slow > (e._slowFactor || 0)
          ) {
            e._slowUntil = until;
            e._slowFactor = z.slow;
          }
        }
      }
    }
  }, 50);

  // Apply enemy slow by scaling its velocity each frame. We monkey-patch
  // the global `state.enemies` movement is updated in game.js — we instead
  // read enemy fields used there (e.spd, e.vx/vy). The simplest portable
  // way: scale e.x/e.y delta every tick. But since we don't own that loop,
  // we sample and ADJUST positions — a small per-tick correction.
  setInterval(() => {
    if (!state || !Array.isArray(state.enemies)) return;
    const now = performance.now() / 1000;
    for (const e of state.enemies) {
      if (!e || e.dead) continue;
      if (e._slowUntil && e._slowUntil > now) {
        // Apply position dampening: pull enemy back by its velocity * slow
        // (acts like reducing effective speed). Use stored last position if
        // available so we damp displacement deltas.
        const f = Math.max(0, Math.min(0.85, e._slowFactor || 0.4));
        if (e._lastSlowX != null) {
          const dx = e.x - e._lastSlowX,
            dy = e.y - e._lastSlowY;
          e.x -= dx * f * 0.6;
          e.y -= dy * f * 0.6;
        }
      } else {
        e._slowFactor = 0;
      }
      e._lastSlowX = e.x;
      e._lastSlowY = e.y;
    }
  }, 1000 / 30);

  // ---- Yachiyu homing notes ----
  const homingNotes = [];
  window.__nsTrackHomingNote = function (b) {
    homingNotes.push(b);
  };
  setInterval(() => {
    if (!homingNotes.length) return;
    for (let i = homingNotes.length - 1; i >= 0; i--) {
      const b = homingNotes[i];
      if (
        !b ||
        !state ||
        !Array.isArray(state.bullets) ||
        !state.bullets.includes(b)
      ) {
        homingNotes.splice(i, 1);
        continue;
      }
      // Re-acquire nearest enemy if current target gone
      let t = b.__yachiyuTarget;
      if (!t || t.dead || t.hp <= 0) {
        let best = null,
          bd = Infinity;
        for (const e of state.enemies) {
          const dx = e.x - b.x,
            dy = e.y - b.y,
            d = dx * dx + dy * dy;
          if (d < bd) {
            bd = d;
            best = e;
          }
        }
        t = best;
        b.__yachiyuTarget = t;
      }
      if (t) {
        const dx = t.x - b.x,
          dy = t.y - b.y,
          d = Math.hypot(dx, dy) || 1;
        const desiredVx = (dx / d) * b.__yachiyuSpeed;
        const desiredVy = (dy / d) * b.__yachiyuSpeed;
        // Lerp velocity towards desired (smooth curve)
        b.vx += (desiredVx - b.vx) * 0.18;
        b.vy += (desiredVy - b.vy) * 0.18;
      }
    }
  }, 1000 / 30);

  // ---- Kaitu ice shards: spawn slow on hit ----
  // We piggyback on the homing-note tracker pattern but apply a tiny slow
  // to whichever enemy the shard collides with, by polling shards each
  // tick and checking proximity.
  const iceShards = [];
  window.__nsTrackIceShard = function (b) {
    iceShards.push(b);
  };
  setInterval(() => {
    if (!iceShards.length || !state || !Array.isArray(state.enemies)) return;
    for (let i = iceShards.length - 1; i >= 0; i--) {
      const b = iceShards[i];
      if (!b || !state.bullets.includes(b)) {
        iceShards.splice(i, 1);
        continue;
      }
      for (const e of state.enemies) {
        if (!e || e.dead) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < (e.r || 14) + b.radius + 4) {
          const until = performance.now() / 1000 + 1.8;
          if (!e._slowUntil || until > e._slowUntil) {
            e._slowUntil = until;
            e._slowFactor = 0.5;
          }
          // Tiny ice puff
          state.fx.push({
            x: e.x,
            y: e.y,
            vx: 0,
            vy: 0,
            life: 0.3,
            life0: 0.3,
            color: "#9ad8ff",
            r: 4,
          });
        }
      }
    }
  }, 1000 / 30);

  // ---- Kagoya umbrella: homing chase + on-impact shatter ----
  // Each tick we steer flagged bullets toward their assigned target enemy
  // and detonate them with a glass-shatter burst when they connect.
  const kagoyaUmbs = [];
  window.__nsTrackKagoyaUmb = function (b) {
    kagoyaUmbs.push(b);
  };
  setInterval(() => {
    if (!state || !Array.isArray(state.bullets)) return;
    for (let i = kagoyaUmbs.length - 1; i >= 0; i--) {
      const b = kagoyaUmbs[i];
      if (!b || !state.bullets.includes(b) || b.dead || b.life <= 0) {
        kagoyaUmbs.splice(i, 1);
        continue;
      }
      // Re-pick a target if the original died/expired
      let tgt = b._target;
      if (!tgt || tgt.dead || (tgt.hp != null && tgt.hp <= 0)) {
        let best = Infinity;
        tgt = null;
        for (const e of state.enemies) {
          if (!e || e.dead) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < best) {
            best = d;
            tgt = e;
          }
        }
        b._target = tgt;
      }
      if (tgt) {
        const dx = tgt.x - b.x,
          dy = tgt.y - b.y,
          d = Math.hypot(dx, dy) || 1;
        const speed = 760;
        const desiredVx = (dx / d) * speed;
        const desiredVy = (dy / d) * speed;
        // Tight homing — strong steering so the parasol nearly snaps onto target
        b.vx += (desiredVx - b.vx) * 0.22;
        b.vy += (desiredVy - b.vy) * 0.22;
        // On contact, detonate with shatter burst
        if (d < (tgt.r || 14) + (b.radius || 8) + 2) {
          state.fx.push({
            _wellShatter: true,
            x: b.x,
            y: b.y,
            ang: Math.atan2(b.vy, b.vx),
            color: "#ff7ad9",
            life: 0.5,
            life0: 0.5,
          });
          try {
            particles(b.x, b.y, "#ff7ad9", 14, 280, 0.4, 2.5);
          } catch (_) {}
          b.dead = true;
          kagoyaUmbs.splice(i, 1);
        }
      }
    }
  }, 1000 / 30);

  // ---- Kagoya parasol clone: DoT pulse around its position ----
  setInterval(() => {
    if (!state || !Array.isArray(state.fx) || !Array.isArray(state.enemies))
      return;
    const now = performance.now();
    for (const f of state.fx) {
      if (!f || !f._kagoyaClone || f.life <= 0) continue;
      if (now < (f._nextDot || 0)) continue;
      f._nextDot = now + 380; // ~2.6 ticks/sec
      const r = f._radius || 70;
      let hits = 0;
      for (const e of state.enemies) {
        if (!e || e.dead) continue;
        const d = Math.hypot(e.x - f.x, e.y - f.y);
        if (d <= r + (e.r || 14)) {
          // Damage authored by the clone owner if local; enemies update via host
          if (typeof damageEnemy === "function") {
            damageEnemy(e, f._dmg || 8, f.ownerP || state.player);
          }
          hits++;
        }
      }
      if (hits > 0) {
        // Tiny pulse pop at the clone
        state.fx.push({
          ring: true,
          x: f.x,
          y: f.y,
          color: f.color || "#ff7ad9",
          life: 0.25,
          life0: 0.25,
          r: 0,
          _maxR: r * 0.7,
        });
      }
    }
  }, 200);

  // =========================================================================
  // PATCH playRemoteAction — replace game.js's generic remote visual handler
  // with DLC-aware FX for every hero that has a custom attack visual.
  // This ensures remote players see the REAL sword/scythe/slash animations
  // instead of invisible ghost bullets or the old tiny _centerSwing flash.
  // Covers BOTH atk and abi actions for all heroes.
  // =========================================================================
  (function patchPlayRemoteAction() {
    if (typeof playRemoteAction !== "function") return;
    const _orig = playRemoteAction;
    playRemoteAction = function (other, act, opts) {
      if (!act) return _orig(other, act, opts);
      const h = HEROES[other.heroId];
      if (!h) return _orig(other, act, opts);
      const ang = typeof act.a === "number" ? act.a : other.angle || 0;
      const ox = other.x, oy = other.y;
      const range = h.range;
      const auth = !!(opts && opts.authoritativeProjectiles);

      // ================================================================
      //  ATK actions — visual sync for melee/ranged attacks
      // ================================================================
      if (act.t === "atk") {
        switch (other.heroId) {
          // ---- JAMES: dual X-strike swords ----
          case "james": {
            if (!auth) {
              try { SFX.fireRemote("james"); } catch (_) {}
              other._jamesLead = ((other._jamesLead || 0) ^ 1);
              state.fx.push({ _jamesXSwing: true, ownerP: other, baseAng: ang, range, lead: other._jamesLead, life: 0.22, life0: 0.22 });
              try { particles(ox, oy, h.color, 10, 200, 0.3, 4); } catch (_) {}
            }
            return;
          }

          // ---- JOSEPH: scythe reap swing ----
          case "joseph": {
            try { SFX.fireRemote("joseph"); } catch (_) {}
            const jHalfArc = (Math.PI * 200) / 180 / 2;
            if (!window._josephRemoteDirs) window._josephRemoteDirs = {};
            // Always toggle direction for ALL clients (host and non-host).
            // Initialize to 1 so first toggle yields -1, matching the local
            // handler which starts p._josephSwingDir at -1 on first fire.
            // Previously this was guarded by !auth, causing the host to always
            // see direction 1 (no alternation at all).
            const prevJDir = window._josephRemoteDirs[other.id] ?? 1;
            window._josephRemoteDirs[other.id] = prevJDir === 1 ? -1 : 1;
            const jDir = window._josephRemoteDirs[other.id];
            state.fx.push({ _josephReap: true, ownerP: other, startAng: ang - jHalfArc * jDir, endAng: ang + jHalfArc * jDir, range, life: 0.28, life0: 0.28 });
            try { particles(ox, oy, "#ff2bd6", 10, 200, 0.3, 3); } catch (_) {}
            return;
          }

          // ---- IRUHA: 3-hit combo — machete cleaver (hits 1&2) + crescent finisher ----
          case "iruha": {
            try { SFX.fireRemote("iruha"); } catch (_) {}
            other._iruhaCombo = (other._iruhaCombo || 0) + 1;
            const isFinisher = other._iruhaCombo % 3 === 0;
            const iArc   = isFinisher ? Math.PI : (Math.PI * 100) / 180;
            const iReach = isFinisher ? range * 1.6 : range;
            const iHalf  = iArc / 2;
            if (isFinisher) {
              state.fx.push({ _justinSlash: true, x: ox, y: oy, ang, range: iReach, arc: iArc, color: "#ffffff", life: 0.32, life0: 0.32 });
              state.fx.push({ ring: true, x: ox, y: oy, color: h.color, life: 0.5, life0: 0.5, r: 0, _maxR: iReach });
              // 24 white spark dots at the arc edge (matching local doAttack finisher)
              for (let i = 0; i < 24; i++) {
                const a = ang - iHalf + (i / 23) * iArc;
                state.fx.push({ x: ox + Math.cos(a) * iReach * 0.7, y: oy + Math.sin(a) * iReach * 0.7, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.35, life0: 0.35, color: "#ffffff", r: 3 });
              }
            } else {
              state.fx.push({ _iruhaMachete: true, ownerP: other, ang0: ang, arc: iArc, range: iReach, color: h.color, life: 0.22, life0: 0.22 });
            }
            try { particles(ox, oy, h.color, isFinisher ? 14 : 8, 220, 0.3, 3); } catch (_) {}
            return;
          }

          // ---- KAITU: ice shard bullet + katana slash ----
          case "kaitu": {
            try { SFX.fireRemote("kaitu"); } catch (_) {}
            const kSpeed = 700;
            // auth=true (host) → real bullet with damage; auth=false (guest) → ghost bullet for visual
            const kDmg = auth ? h.dmg * ((other.mods && other.mods.dmg) || 1) : 0;
            const kb = { x: ox + Math.cos(ang) * 16, y: oy + Math.sin(ang) * 16, vx: Math.cos(ang) * kSpeed, vy: Math.sin(ang) * kSpeed, dmg: kDmg, owner: other.id, color: h.color, radius: 6, life: (range / kSpeed) * 1.1, piercing: 2, ghost: !auth, __kaituSlow: true, __kaituOwner: other.id, trail: [] };
            state.bullets.push(kb);
            if (window.__nsTrackIceShard) window.__nsTrackIceShard(kb);
            state.fx.push({ _kaituSlash: true, ownerP: other, ang0: ang, arc: (Math.PI * 80) / 180, range: Math.min(range * 0.55, 120), color: h.color, life: 0.18, life0: 0.18 });
            return;
          }

          // ---- WELL: greatsword swing + slash arc ----
          case "well": {
            try { SFX.fireRemote("well"); } catch (_) {}
            const wReach = 200, wHalf = (Math.PI * 110) / 180 / 2;
            state.fx.push({ _wellGreatsword: true, ownerP: other, ang0: ang, reach: wReach, arc: wHalf * 2, color: "#9be8ff", life: 0.32, life0: 0.32 });
            state.fx.push({ _justinSlash: true, x: ox, y: oy, ang, range: wReach * 0.95, arc: wHalf * 2, color: "#9be8ff", life: 0.22, life0: 0.22 });
            try { particles(ox, oy, "#9be8ff", 10, 200, 0.3, 3); } catch (_) {}
            return;
          }

          // ---- JUSTIN: spirit-blade crescent slash ----
          case "justin": {
            try { SFX.fireRemote("justin"); } catch (_) {}
            const uArc = (Math.PI * 110) / 180;
            state.fx.push({ _justinSlash: true, x: ox, y: oy, ang, range, arc: uArc, color: h.color, life: 0.22, life0: 0.22 });
            for (let i = 0; i < 10; i++) {
              const t = i / 9, a = ang - uArc / 2 + t * uArc, r = range * (0.65 + Math.random() * 0.35);
              try { state.fx.push({ x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 0.24, life0: 0.24, color: h.color, r: 2 }); } catch (_) {}
            }
            return;
          }

          // ---- JIAN: dot-chain laser beam ----
          case "jian": {
            try { SFX.fireRemote("jian"); } catch (_) {}
            for (let i = 0; i < 24; i++) {
              const t = i / 24, r = range * t;
              state.fx.push({ x: ox + Math.cos(ang) * r, y: oy + Math.sin(ang) * r, vx: 0, vy: 0, life: 0.12, life0: 0.12, color: h.color, r: 3 });
            }
            return;
          }

          // ---- JABALLAS: 9-pellet shotgun cone ----
          case "jaballas": {
            try { SFX.fireRemote("jaballas"); } catch (_) {}
            if (!auth) {
              const pellets = 9, spread = 0.6;
              for (let i = 0; i < pellets; i++) {
                const a = ang + (i / (pellets - 1) - 0.5) * spread;
                state.bullets.push({ x: ox + Math.cos(a) * 18, y: oy + Math.sin(a) * 18, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, dmg: 0, owner: other.id, color: h.color, radius: 5, life: (range / 720) * 1.1, piercing: 99, trail: [], ghost: true });
              }
            }
            try { particles(ox, oy, h.color, 12, 220, 0.35, 4); } catch (_) {}
            return;
          }

          // ---- JOSHUA: long-range arrow + every-2nd-shot white side arrow ----
          case "joshua": {
            try { SFX.fireRemote("joshua"); } catch (_) {}
            other._joshuaShots = (other._joshuaShots || 0) + 1;
            if (!auth) {
              // Main arrow ghost — host already gets a real bullet from
              // applyRemoteCombat so we skip it here to avoid duplicates.
              state.bullets.push({ x: ox + Math.cos(ang) * 20, y: oy + Math.sin(ang) * 20, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, dmg: 0, owner: other.id, color: h.color, radius: 4, life: (range / 900) * 1.05, piercing: 99, trail: [], ghost: true });
            }
            // Every 2nd shot: white side-arrow — ALL clients must see this
            // (host + non-host). applyRemoteCombat only spawns a generic main
            // arrow and never spawns the side arrows, so without this the host
            // player never sees them.
            if (other._joshuaShots % 2 === 0) {
              const side = other._joshuaShots % 4 === 0 ? 1 : -1;
              const sideAng = ang + side * Math.PI / 2;
              const sideOx  = ox + Math.cos(sideAng) * 22;
              const sideOy  = oy + Math.sin(sideAng) * 22;
              state.bullets.push({ x: sideOx, y: sideOy, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, dmg: 0, owner: other.id, color: "#ffffff", radius: 4, life: (range / 900) * 1.05, piercing: 99, trail: [], ghost: true });
            }
            try { particles(ox, oy, h.color, 6, 200, 0.3, 2); } catch (_) {}
            return;
          }

          // ---- JAZMINE: explosive plasma bolt (track ghost bullet for explosion FX) ----
          case "jazmine": {
            try { SFX.fireRemote("jazmine"); } catch (_) {}
            if (!auth) {
              const jb = { x: ox + Math.cos(ang) * 14, y: oy + Math.sin(ang) * 14, vx: Math.cos(ang) * 740, vy: Math.sin(ang) * 740, dmg: 0, owner: other.id, color: h.color, radius: 8, life: (range / 740) * 1.05, piercing: 99, trail: [], ghost: true };
              state.bullets.push(jb);
              // Hook into tracker so explosion FX fires on hit/expiry
              if (window.__nsJazTrack) window.__nsJazTrack(jb, other);
            }
            try { particles(ox, oy, h.color, 8, 200, 0.3, 3); } catch (_) {}
            return;
          }

          // ---- KAGOYA: 3 iridescent pixel shards ----
          case "kagoya": {
            try { SFX.fireRemote("kagoya"); } catch (_) {}
            // Always push shards for ALL clients. applyRemoteCombat gives the
            // host only 1 generic bullet (wrong speed/count) — these ghost
            // shards add the correct 3-shard visual on top for the host too.
            {
              const kHues  = ["#ff3df0","#3dffb0","#ffd166","#22e8ff","#ff80df","#aaff00"];
              const kSpeed = 820, kShards = 3, kSpread = 0.18;
              for (let i = 0; i < kShards; i++) {
                const a   = ang + (i / (kShards - 1) - 0.5) * kSpread;
                const col = kHues[Math.floor(Math.random() * kHues.length)];
                state.bullets.push({ x: ox + Math.cos(a) * 16, y: oy + Math.sin(a) * 16, vx: Math.cos(a) * kSpeed, vy: Math.sin(a) * kSpeed, dmg: 0, owner: other.id, color: col, radius: 4, life: (range / kSpeed) * 1.05, piercing: 99, trail: [], ghost: true });
              }
            }
            try { particles(ox, oy, h.color, 6, 200, 0.25, 2); } catch (_) {}
            return;
          }

          // ---- YACHIYU: flying umbrella via _yachiyuUmbs (uses same renderer as local) ----
          case "yachiyu": {
            try { SFX.fireRemote("yachiyu"); } catch (_) {}
            if (window._yachiyuUmbs) {
              const ySpeed = 480;
              const existing = window._yachiyuUmbs.get(other.id);
              const launchX = existing ? existing.x : (ox + Math.cos(ang) * 14);
              const launchY = existing ? existing.y : (oy + Math.sin(ang) * 14);
              if (existing) window._yachiyuUmbs.delete(other.id);
              // auth=true (host): real damage via tick loop; auth=false (guest): visual only
              const yDmg = auth ? h.dmg * ((other.mods && other.mods.dmg) || 1) : 0;
              window._yachiyuUmbs.set(other.id, {
                phase: "flying",
                x: launchX, y: launchY,
                vx: Math.cos(ang) * ySpeed, vy: Math.sin(ang) * ySpeed,
                life: (range / ySpeed) * 1.0, life0: (range / ySpeed) * 1.0,
                dmg: yDmg, charged: false, ownerP: other,
                _nextDot: performance.now() + 400,
              });
            }
            try { particles(ox, oy, h.color, 8, 200, 0.3, 2); } catch (_) {}
            return;
          }

          default:
            return _orig(other, act, opts);
        }
      }

      // ================================================================
      //  ABI (skill) actions — visual sync for abilities
      // ================================================================
      if (act.t === "abi") {
        try { SFX.abilityRemote(other.heroId); } catch (_) {}
        switch (other.heroId) {
          // ---- JAMES: dual-blade whirlwind (skip on host — applyRemoteCombat already added _jamesWhirl) ----
          case "james": {
            if (!auth) {
              state.fx.push({ _jamesWhirl: true, ownerP: other, reach: 160, life: 0.7, life0: 0.7 });
              try { particles(ox, oy, "#22e8ff", 28, 220, 0.5, 3); } catch (_) {}
            }
            return;
          }

          // ---- JOSEPH: soul tether — cast ring + particles + bind nearest enemies (chains visible) ----
          case "joseph": {
            // Ring + particles: applyRemoteCombat already adds these on the HOST,
            // so only spawn them on non-host clients to avoid doubling.
            if (!auth) {
              state.fx.push({ ring: true, x: ox, y: oy, color: "#a020f0", life: 0.5, life0: 0.5, r: 0, _maxR: 144 });
              try { particles(ox, oy, "#ff2bd6", 28, 240, 0.6, 3); } catch (_) {}
            }
            // Tether the 5 nearest enemies so chains are drawn on this screen too
            if (window.__nsAddTethers) {
              const tReach = 360, tMax = 5, tDur = 3.0;
              const tDps  = auth ? h.dmg * 0.55 * ((other.mods && other.mods.dmg) || 1) : 0;
              const tHeal = auth ? h.dmg * 0.1 : 0;
              const cands = [];
              for (const e of (state.enemies || [])) {
                if (!e || e.dead || e.hp <= 0) continue;
                const d = Math.hypot(e.x - ox, e.y - oy);
                if (d <= tReach + (e.r || 0)) cands.push({ e, d });
              }
              cands.sort((a, b) => a.d - b.d);
              const targets = cands.slice(0, tMax).map(c => c.e);
              if (targets.length) window.__nsAddTethers(other, targets, tDur, tDps, tHeal);
            }
            return;
          }

          // ---- JUSTIN: spirit guardian summon — ring + particles + spawn guardian locally ----
          case "justin": {
            // Ring + particles: applyRemoteCombat already adds them on HOST — guard to avoid doubling.
            // Guardian spawn is DLC-exclusive so it always runs on all clients.
            if (!auth) {
              state.fx.push({ ring: true, x: ox, y: oy, color: h.color, life: 0.55, life0: 0.55, r: 0, _maxR: 120 });
              try { particles(ox, oy, h.color, 28, 260, 0.7, 3); } catch (_) {}
            }
            if (window.__nsSpawnGuardian) window.__nsSpawnGuardian(other);
            return;
          }

          // ---- JIAN: overcharge megabeam — 60-dot chain ----
          case "jian": {
            // applyRemoteCombat spawns the same 60-dot beam on HOST — guard to avoid
            // doubling the beam thickness/brightness on the host's screen.
            if (!auth) {
              const jianBL = range * 1.6;
              for (let i = 0; i < 60; i++) {
                const t = i / 60, r = jianBL * t;
                state.fx.push({ x: ox + Math.cos(ang) * r, y: oy + Math.sin(ang) * r, vx: 0, vy: 0, life: 0.5, life0: 0.5, color: h.color, r: 8 });
              }
            }
            return;
          }

          // ---- JABALLAS: slug round — 1 big yellow ghost bullet ----
          case "jaballas": {
            if (!auth) {
              state.bullets.push({ x: ox + Math.cos(ang) * 20, y: oy + Math.sin(ang) * 20, vx: Math.cos(ang) * 820, vy: Math.sin(ang) * 820, dmg: 0, owner: other.id, color: "#ffd166", radius: 14, life: 1.4, piercing: 99, trail: [], ghost: true });
            }
            return;
          }

          // ---- JOSHUA: arrow volley — 12 scattered ghost arrows ----
          case "joshua": {
            const jtx = ox + Math.cos(ang) * 420, jty = oy + Math.sin(ang) * 420;
            for (let i = 0; i < 12; i++) {
              setTimeout(() => {
                const jox = (Math.random() - 0.5) * 240, joy = (Math.random() - 0.5) * 240;
                const tx = jtx + jox, ty = jty + joy;
                if (!auth) {
                  state.bullets.push({ x: tx - Math.cos(ang) * 120, y: ty - Math.sin(ang) * 120, vx: Math.cos(ang) * 800, vy: Math.sin(ang) * 800, dmg: 0, owner: other.id, color: h.color, radius: 4, life: 0.25, piercing: 99, trail: [], ghost: true });
                  // Impact dot: applyRemoteCombat spawns real arrows + dots on HOST,
                  // so only show this on non-host clients to avoid doubling.
                  state.fx.push({ x: tx, y: ty, vx: 0, vy: 0, life: 0.3, life0: 0.3, color: h.color, r: 6 });
                }
              }, i * 70);
            }
            return;
          }

          // ---- JAZMINE: nuclear detonation — 2s charge + massive blast rings ----
          case "jazmine": {
            // applyRemoteCombat handles ALL visuals on the HOST — guard everything
            // with !auth so the host never sees a doubled charge ring + blast rings.
            if (!auth) {
              const jaz_blastR = 420;
              const jaz_warn = { _nukeCharge: true, ring: true, x: ox, y: oy, color: "#ff80df", r: 80, life: 2.0, life0: 2.0 };
              state.fx.push(jaz_warn);
              const jaz_fol = setInterval(() => { jaz_warn.x = other.x; jaz_warn.y = other.y; }, 50);
              setTimeout(() => {
                clearInterval(jaz_fol);
                jaz_warn.life = 0;
                const ex = jaz_warn.x, ey = jaz_warn.y;
                state.fx.push({ _flash: true, color: "#ffffff", life: 0.35, life0: 0.35, x: ex, y: ey, r: 0 });
                state.fx.push({ ring: true, x: ex, y: ey, color: "#ffffff",  life: 0.7, life0: 0.7, r: 0, _maxR: jaz_blastR });
                state.fx.push({ ring: true, x: ex, y: ey, color: "#ff80df", life: 0.9, life0: 0.9, r: 0, _maxR: jaz_blastR * 1.1 });
                state.fx.push({ ring: true, x: ex, y: ey, color: "#ffd166", life: 1.1, life0: 1.1, r: 0, _maxR: jaz_blastR * 1.25 });
                state.fx.push({ ring: true, x: ex, y: ey, color: "#ff3d6a", life: 1.4, life0: 1.4, r: 0, _maxR: jaz_blastR * 1.4 });
                for (let k = 0; k < 4; k++) setTimeout(() => { try { particles(ex, ey, k % 2 ? "#ffd166" : "#ff80df", 60, 300, 0.9, 4); } catch (_) {} }, k * 120);
              }, 2000);
            }
            return;
          }

          // ---- KAGOYA: glitch field — ring + zone at 180 forward ----
          case "kagoya": {
            // applyRemoteCombat already spawns ring+zone for HOST — guard here
            // to prevent the HOST from seeing two overlapping fields.
            if (!auth) {
              const kzx = ox + Math.cos(ang) * 180, kzy = oy + Math.sin(ang) * 180;
              state.fx.push({ ring: true, x: kzx, y: kzy, color: h.color, life: 0.6, life0: 0.6, r: 0, _maxR: 130 });
              state.fx.push({ zone: true, x: kzx, y: kzy, r: 130, color: h.color, life: 4.0, life0: 4.0 });
              try { particles(kzx, kzy, h.color, 28, 220, 0.5, 3); } catch (_) {}
            }
            return;
          }

          // ---- IRUHA: bulwark smash — two rings + particles + persistent shield aura ----
          case "iruha": {
            // Two rings + particles: applyRemoteCombat already spawns these on HOST.
            // Guard here so HOST doesn't see 4 rings. Shield aura is DLC-exclusive
            // so it always spawns on every client.
            if (!auth) {
              state.fx.push({ ring: true, x: ox, y: oy, color: h.color,    life: 0.6, life0: 0.6, r: 0, _maxR: 220 });
              state.fx.push({ ring: true, x: ox, y: oy, color: "#ffffff",  life: 0.4, life0: 0.4, r: 0, _maxR: 154 });
              try { particles(ox, oy, h.color, 50, 300, 0.7, 4); } catch (_) {}
            }
            // Shield aura: pulsing ring around Iruha for the duration of the shield buff (~6s)
            state.fx.push({ _iruhaShieldAura: true, ownerP: other, life: 6.0, life0: 6.0, ring: true, x: ox, y: oy, vx: 0, vy: 0 });
            return;
          }

          // ---- YACHIYU: recall — small white ring + particles ----
          case "yachiyu": {
            // Umbrella recall is idempotent so safe for all clients.
            // Ring + particles: applyRemoteCombat already provides them on HOST,
            // guard to prevent doubling.
            if (window._yachiyuUmbs) window._yachiyuUmbs.delete(other.id);
            if (!auth) {
              state.fx.push({ ring: true, x: ox, y: oy, color: "#ffffff", life: 0.3, life0: 0.3, r: 0, _maxR: 42 });
              try { particles(ox, oy, h.color, 20, 240, 0.5, 3); } catch (_) {}
            }
            return;
          }

          // ---- KAITU: blizzard — zone FX following player ----
          case "kaitu": {
            if (!auth) {
              state.fx.push({ zone: true, x: ox, y: oy, r: 280, color: h.color, life: 3.0, life0: 3.0, _kaituBlizzard: true, ownerP: other });
              const kbFol = setInterval(() => { for (const f of state.fx) { if (f._kaituBlizzard && f.ownerP === other) { f.x = other.x; f.y = other.y; } } }, 50);
              setTimeout(() => clearInterval(kbFol), 3000);
            }
            try { particles(ox, oy, h.color, 60, 300, 0.8, 3); } catch (_) {}
            return;
          }

          // ---- WELL: wis strike — warning ring + delayed flash/blast rings at target ----
          case "well": {
            // applyRemoteCombat handles ALL visuals on the HOST — guard everything
            // so HOST never sees warning ring + blast rings doubled.
            if (!auth) {
              const wtx = ox + Math.cos(ang) * 220, wty = oy + Math.sin(ang) * 220, wsr = 200;
              state.fx.push({ ring: true, x: wtx, y: wty, color: h.color, life: 0.45, life0: 0.45, r: wsr, _maxR: wsr });
              setTimeout(() => {
                state.fx.push({ _flash: true, color: "#c084ff", life: 0.2, life0: 0.2, x: wtx, y: wty, r: 0 });
                state.fx.push({ ring: true, x: wtx, y: wty, color: "#ffffff", life: 0.6, life0: 0.6, r: 0, _maxR: wsr });
                state.fx.push({ ring: true, x: wtx, y: wty, color: h.color,   life: 0.8, life0: 0.8, r: 0, _maxR: wsr * 1.2 });
                for (let i = 0; i < 60; i++) {
                  const a = Math.random() * Math.PI * 2, r = Math.random() * wsr;
                  state.fx.push({ x: wtx + Math.cos(a) * r, y: wty + Math.sin(a) * r, vx: 0, vy: -280 - Math.random() * 120, life: 0.7 + Math.random() * 0.4, life0: 1.1, color: h.color, r: 3 });
                }
              }, 450);
            }
            return;
          }

          // jake, jeb, jeff, joross → fall through to original _orig handler
          default:
            return _orig(other, act, opts);
        }
      }

      return _orig(other, act, opts);
    };
  })();

  // ---- Silence enemy (Yachiyu Q) — temporarily zero out atk damage ----
  window.__nsSilenceEnemy = function (e, secs) {
    if (!e) return;
    e._silencedUntil = performance.now() / 1000 + secs;
    e._origAtkDmg = e._origAtkDmg != null ? e._origAtkDmg : e.dmg || 0;
    e.dmg = 0;
  };
  // Restore after silence expires
  setInterval(() => {
    if (!state || !Array.isArray(state.enemies)) return;
    const now = performance.now() / 1000;
    for (const e of state.enemies) {
      if (!e || !e._silencedUntil) continue;
      if (now > e._silencedUntil) {
        e.dmg = e._origAtkDmg;
        e._silencedUntil = 0;
      }
    }
  }, 200);
})();
