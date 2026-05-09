// ==============================================================
// NEURAL SURVIVAL: FRACTURE REALM — Colyseus multiplayer build
// + GOD MODE: 10-phase cinematic boss gauntlet (offline + co-op)
// Vanilla canvas. Multiplayer powered by Colyseus.
// ==============================================================

// ---- Friendly error alerts (kept lightweight) ----
// Install error handlers FIRST so any earlier failure (e.g. blocked CDN)
// shows up clearly in the console instead of silently halting boot.
window.onerror = (msg, url, line) => console.error("GAME ERROR:", msg, url+":"+line);
window.onunhandledrejection = (event) => console.error("ASYNC ERROR:", event.reason);

// ---- Colyseus client ----
// The Colyseus UMD bundle is loaded from a CDN; if it's blocked (CSP, offline,
// proxy 404) we still want single-player to work, so fall back to a stub.
let client = null;
let activeRoom = null;
try {
  if (typeof Colyseus !== 'undefined' && Colyseus && Colyseus.Client) {
    const wsProto = (typeof location !== 'undefined' && location.protocol === 'https:') ? 'wss:' : 'ws:';
    const backendHost = (typeof window !== 'undefined' && window.BACKEND_URL && window.BACKEND_URL.length > 0)
      ? new URL(window.BACKEND_URL).host
      : (typeof location !== 'undefined' ? location.host : '');
    client = new Colyseus.Client(`${wsProto}//${backendHost}/api`);
  } else {
    console.warn("Colyseus library not available — multiplayer disabled.");
  }
} catch (e) {
  console.warn("Failed to init Colyseus client — multiplayer disabled:", e);
  client = null;
}

// ---------- Hero defs ----------
const HEROES = {
  james: { name:"James", role:"Sword Tank",   img:"images/heroes/james.png",  hp:1000, speed:270, dmg:100, atkCd:0.30, range:100,  abi:"Whirlwind",   abiCd:7,  color:"#22e8ff", desc:"High HP melee bruiser. Strong cleaving sword and a 360° whirlwind that staggers and damages." },
  jake:  { name:"Jake",  role:"Wand Mage",    img:"images/heroes/jake.png",   hp:95,  speed:215, dmg:22, atkCd:0.85, range:520, abi:"Arcane Nova", abiCd:8,  color:"#ff2bd6", desc:"Slow, powerful magic missiles. Q unleashes a violet nova that detonates outward in a ring." },
  joross:{ name:"Joross",role:"Plasma Gunner",img:"images/heroes/joross.png", hp:70, speed:225, dmg:9,  atkCd:0.10, range:480, abi:"Suppress",    abiCd:6,  color:"#ff8a3d", desc:"Continuous plasma fire. Q triples fire-rate for 3s and pierces lightly armored foes." },
  jeb:   { name:"Jeb",   role:"Cross Healer", img:"images/heroes/jeb.png",    hp:110, speed:215, dmg:14, atkCd:0.55, range:380, abi:"Sanctum",     abiCd:9,  color:"#3dffb0", desc:"Holy bolts and a healing zone." },
  jeff:  { name:"Jeff",  role:"Assassin",     img:"images/heroes/jeff.png",   hp:500,  speed:340, dmg:70, atkCd:0.50, range:80,  abi:"Phase Slash", abiCd:5,  color:"#ff3d6a", desc:"Glass cannon. Tiny HP, blinding speed, lethal twin daggers." },

  // ---- JSquad (free) extra roster ----
  justin:  { name:"Justin",  role:"Marksman",     img:"images/heroes/justin.png",  hp:140, speed:230, dmg:38, atkCd:0.55, range:560, abi:"Pierce Shot",  abiCd:7, color:"#ffd166", desc:"Long-range marksman. Heavy single rounds and a piercing shot that punches through a line of enemies." },
  jian:    { name:"Jian",    role:"Twin Caster",  img:"images/heroes/jian.png",    hp:120, speed:240, dmg:14, atkCd:0.18, range:430, abi:"Spread Volley",abiCd:6, color:"#a3ff3d", desc:"Rapid dual-bolt caster. Q fans a forward spread of arcane bolts." },
  joseph:  { name:"Joseph",  role:"Greatsword",   img:"images/heroes/joseph.png",  hp:1200,speed:240, dmg:120,atkCd:0.45, range:120, abi:"Earthsplit",   abiCd:8, color:"#c97cff", desc:"Heavy greatsword bruiser. Wide cleaving slashes and a 360° earthsplit shockwave." },
  jaballas:{ name:"Jaballas",role:"Heavy Gunner", img:"images/heroes/jaballas.png",hp:240, speed:200, dmg:46, atkCd:0.70, range:460, abi:"Cluster Salvo",abiCd:8, color:"#ff5b8a", desc:"Slow but devastating cannoneer. Q lobs a cluster of impact rounds in a forward arc." },
  joshua:  { name:"Joshua",  role:"Sniper",       img:"images/heroes/joshua.png",  hp:90,  speed:215, dmg:80, atkCd:1.10, range:680, abi:"Focus Beam",   abiCd:9, color:"#7cf0ff", desc:"Patient sniper with the longest range in the squad. Q channels a focused energy beam volley." },
  jazmine: { name:"Jazmine", role:"Spell Archer", img:"images/heroes/jazmine.png", hp:130, speed:250, dmg:24, atkCd:0.32, range:480, abi:"Mystic Storm", abiCd:7, color:"#3dd1ff", desc:"Quick magical bowmaster. Q rains a circular storm of mystic arrows." },

  // ---- CPK (paid) roster ----
  kagoya:  { name:"Kagoya",  role:"Burst Caster", img:"images/heroes/kagoya.png",  hp:160, speed:235, dmg:11, atkCd:0.22, range:470, abi:"Triple Burst", abiCd:6, color:"#ff7ad9", desc:"CPK burst specialist. Rapid magic bolts and a forward triple-burst on Q." },
  iruha:   { name:"Iruha",   role:"Storm Mage",   img:"images/heroes/iruha.png",   hp:130, speed:225, dmg:30, atkCd:0.40, range:500, abi:"Storm Ring",   abiCd:8, color:"#69e6ff", desc:"CPK lightning mage. Charged bolts and a radial storm ring that crackles around her." },
  yachiyu: { name:"Yachiyu", role:"Battle Medic", img:"images/heroes/yachiyu.png", hp:180, speed:225, dmg:18, atkCd:0.45, range:430, abi:"Renewal",      abiCd:9, color:"#aaffd6", desc:"CPK battle medic. Healing-touched bolts and a Renewal pulse that restores health and grants brief regen." },
  kaitu:   { name:"Kaitu",   role:"Reaper",       img:"images/heroes/kaitu.png",   hp:600, speed:320, dmg:90, atkCd:0.40, range:110, abi:"Soul Reap",    abiCd:6, color:"#b56cff", desc:"CPK reaper. Twin scythe slashes and a circular Soul Reap that bites every nearby enemy." },
  well:    { name:"Well",    role:"Channeler",    img:"images/heroes/well.png",    hp:170, speed:220, dmg:22, atkCd:0.30, range:460, abi:"Aether Pulse", abiCd:7, color:"#f0c75a", desc:"CPK aether channeler. Steady energy bolts and a wide Aether Pulse nova that pushes enemies back." },
};
const HERO_IDS = Object.keys(HEROES);

// ---------- Upgrades (used by classic mode + god-mode pickups) ----------
// Each upgrade is also a possible floor drop in God Mode. To make drops feel
// more varied, an upgrade can declare an optional `color` used by the pickup
// sprite — falls back to the default amber if missing.
const UPGRADES = [
  { id:"speed",      name:"Neon Sprint",       desc:"+8% movement speed.",                         color:'#3dffb0', apply:p=>{ p.mods.speed*=1.08; } },
  { id:"cdr",        name:"Overclock",         desc:"-10% all cooldowns.",                         color:'#22e8ff', apply:p=>{ p.mods.cdr*=0.90; } },
  { id:"shield",     name:"Phase Shield",      desc:"+20 HP regenerating shield.",                 color:'#9d5cff', apply:p=>{ p.mods.shieldMax+=20; p.shield=p.mods.shieldMax; } },
  { id:"aura",       name:"Damage Aura",       desc:"Burn nearby enemies for 6 dps.",              color:'#ff8a3d', apply:p=>{ p.mods.aura+=6; } },
  { id:"slow",       name:"Time Dilation",     desc:"Slow nearby enemies by 13%.",                 color:'#7ec8ff', apply:p=>{ p.mods.slow=Math.min(0.6, p.mods.slow+0.13); } },
  { id:"regen",      name:"Bio-Weave",         desc:"Regenerate 2 HP/s.",                          color:'#7dff7d', apply:p=>{ p.mods.regen+=2; } },
  { id:"weapon",     name:"Weapon Tuning",     desc:"+13% damage, +5% range.",                     color:'#ff5577', apply:p=>{ p.mods.dmg*=1.13; p.mods.range*=1.05; } },
  { id:"firerate",   name:"Trigger Discipline",desc:"+13% attack speed.",                          color:'#ffd166', apply:p=>{ p.mods.atkSpd*=1.13; } },
  { id:"vamp",       name:"Vampiric Edge",     desc:"Heal 4% of damage dealt.",                    color:'#ff4060', apply:p=>{ p.mods.lifesteal+=0.04; } },
  { id:"heal",       name:"Stim Shot",         desc:"Restore 25% HP instantly.",                   color:'#ff9eb8', apply:p=>{ p.hp = Math.min(p.hpMax, p.hp + p.hpMax*0.25); } },
  { id:"berserk",    name:"Berserker Pulse",   desc:"+20% damage for the next phase.",             color:'#ff2bd6', apply:p=>{ p.mods.dmg*=1.20; } },
  { id:"hpmax",      name:"Neural Lattice",    desc:"+15 max HP and full heal.",                   color:'#ffe07a', apply:p=>{ p.hpMax+=15; p.hp=p.hpMax; } },
  // ===== NEW DROP TYPES =====
  { id:"sniper",     name:"Sniper Coil",       desc:"+30% range, +5% damage.",                     color:'#22ffe8', apply:p=>{ p.mods.range*=1.30; p.mods.dmg*=1.05; } },
  { id:"hyperedge",  name:"Hyper Edge",        desc:"+25% damage.",                                color:'#ff3b3b', apply:p=>{ p.mods.dmg*=1.25; } },
  { id:"ironwill",   name:"Iron Will",         desc:"+25 max HP.",                                 color:'#ffce5c', apply:p=>{ p.hpMax+=25; p.hp=Math.min(p.hpMax, p.hp+25); } },
  { id:"phoenix",    name:"Phoenix Pact",      desc:"+10 max HP and full heal.",                   color:'#ff7755', apply:p=>{ p.hpMax+=10; p.hp=p.hpMax; } },
  { id:"aegis",      name:"Aegis Pulse",       desc:"+30 instant shield (one-time).",              color:'#a3c9ff', apply:p=>{ p.shield=Math.min((p.mods.shieldMax||0)+30, (p.shield||0)+30); if(p.mods.shieldMax<30) p.mods.shieldMax=30; } },
  { id:"frostbite",  name:"Frostbite Aura",   desc:"+8% slow on nearby enemies.",                 color:'#9ee8ff', apply:p=>{ p.mods.slow=Math.min(0.6, p.mods.slow+0.08); } },
  { id:"plasmahalo", name:"Plasma Halo",       desc:"+9 dps damage aura.",                         color:'#ffaa3d', apply:p=>{ p.mods.aura+=9; } },
  { id:"adrenaline", name:"Adrenaline",        desc:"+10% atk speed, -5% cooldowns.",              color:'#ffe066', apply:p=>{ p.mods.atkSpd*=1.10; p.mods.cdr*=0.95; } },
  { id:"swift",      name:"Burst Sprint",      desc:"+13% move speed.",                            color:'#5dffd0', apply:p=>{ p.mods.speed*=1.13; } },
  { id:"bloodpact",  name:"Blood Pact",        desc:"+6% lifesteal.",                              color:'#cc1140', apply:p=>{ p.mods.lifesteal+=0.06; } },
  { id:"glasscannon",name:"Glass Cannon",      desc:"+35% damage, -10% max HP.",                  color:'#ff2bd6', apply:p=>{ p.mods.dmg*=1.35; p.hpMax=Math.max(20, Math.floor(p.hpMax*0.90)); p.hp=Math.min(p.hpMax, p.hp); } },
  // ===== WAVE 10+ POWER UPGRADES =====
  { id:"warmonger",  name:"Warmonger",         desc:"+30% damage, -10% move speed.",               color:'#ff2200', apply:p=>{ p.mods.dmg*=1.30; p.mods.speed*=0.90; } },
  { id:"tactician",  name:"Tactician",         desc:"+15% CDR, +15% range, +8% atk speed.",        color:'#00ccff', apply:p=>{ p.mods.cdr*=0.85; p.mods.range*=1.15; p.mods.atkSpd*=1.08; } },
  { id:"lifedrain",  name:"Life Drain",        desc:"+9% lifesteal, +8% damage.",                  color:'#cc0055', apply:p=>{ p.mods.lifesteal+=0.09; p.mods.dmg*=1.08; } },
  { id:"fortress",   name:"Fortress",          desc:"+40 max HP, full heal, +25 shield.",          color:'#aaaaff', apply:p=>{ p.hpMax+=40; p.hp=p.hpMax; p.shield=Math.max(p.shield||0,25); if(p.mods.shieldMax<25) p.mods.shieldMax=25; } },
  { id:"overcharge", name:"Overcharge",        desc:"+40% atk speed, +15% damage.",               color:'#ffff00', apply:p=>{ p.mods.atkSpd*=1.40; p.mods.dmg*=1.15; } },
  { id:"blitz",      name:"Blitz Mode",        desc:"+20% speed, +10% damage, +8% atk speed.",    color:'#00ffaa', apply:p=>{ p.mods.speed*=1.20; p.mods.dmg*=1.10; p.mods.atkSpd*=1.08; } },
  { id:"soulbound",  name:"Soulbound",         desc:"+8% lifesteal, +15% damage, -13% max HP.",   color:'#aa00dd', apply:p=>{ p.mods.lifesteal+=0.08; p.mods.dmg*=1.15; p.hpMax=Math.max(20,Math.floor(p.hpMax*0.87)); p.hp=Math.min(p.hpMax,p.hp); } },
  { id:"overclock2", name:"Turbo Core",        desc:"+20% atk speed, -10% CDR, +10% speed.",      color:'#ffcc00', apply:p=>{ p.mods.atkSpd*=1.20; p.mods.cdr*=0.90; p.mods.speed*=1.10; } },
  { id:"shieldwall", name:"Shield Wall",       desc:"+40 max shield that regenerates.",            color:'#77aaff', apply:p=>{ p.mods.shieldMax+=40; p.shield=Math.max(p.shield||0, p.mods.shieldMax); } },
  { id:"overdrive",  name:"Overdrive",         desc:"+18% all stats (damage, speed, CDR).",       color:'#ff8800', apply:p=>{ p.mods.dmg*=1.18; p.mods.speed*=1.18; p.mods.cdr*=0.87; p.mods.atkSpd*=1.10; } },
  // ===== UNIQUE MECHANIC UPGRADES =====
  { id:"resonance",  name:"Resonance Core",    desc:"+10% damage, +8% CDR.",                      color:'#bb99ff', apply:p=>{ p.mods.dmg*=1.10; p.mods.cdr*=0.92; } },
  { id:"venomcoat",  name:"Venom Coat",        desc:"+5% lifesteal, +8 dps aura.",                color:'#55ff88', apply:p=>{ p.mods.lifesteal+=0.05; p.mods.aura+=8; } },
  { id:"splitshot",  name:"Split Coil",        desc:"+20% range, +5% atk speed.",                 color:'#aaffee', apply:p=>{ p.mods.range*=1.20; p.mods.atkSpd*=1.05; } },
  { id:"ironaura",   name:"Iron Aura",         desc:"+25 max HP, +5 dps aura.",                   color:'#ffaa66', apply:p=>{ p.hpMax+=25; p.hp=Math.min(p.hpMax,p.hp+25); p.mods.aura+=5; } },
  { id:"momentum",   name:"Momentum Engine",   desc:"+10% damage, +10% move speed.",              color:'#00eeff', apply:p=>{ p.mods.dmg*=1.10; p.mods.speed*=1.10; } },
  { id:"voltcell",   name:"Volt Cell",         desc:"+13% atk speed, +8% damage, +4 dps aura.",  color:'#ffff55', apply:p=>{ p.mods.atkSpd*=1.13; p.mods.dmg*=1.08; p.mods.aura+=4; } },
  { id:"deathmark",  name:"Death Mark",        desc:"+20% CDR, +5% lifesteal.",                   color:'#cc44ff', apply:p=>{ p.mods.cdr*=0.80; p.mods.lifesteal+=0.05; } },
  { id:"neurallink", name:"Neural Link",       desc:"+8% damage, speed, CDR, and atk speed.",    color:'#88ffdd', apply:p=>{ p.mods.dmg*=1.08; p.mods.speed*=1.08; p.mods.cdr*=0.92; p.mods.atkSpd*=1.08; } },
  { id:"assassin",   name:"Assassin Protocol", desc:"+35% damage, -13% max HP.",                  color:'#ff2244', apply:p=>{ p.mods.dmg*=1.35; p.hpMax=Math.max(20,Math.floor(p.hpMax*0.87)); p.hp=Math.min(p.hpMax,p.hp); } },
  { id:"overclock3", name:"Neural Overdrive",  desc:"+15% atk speed, +15% speed, -5% max HP.",   color:'#22ffcc', apply:p=>{ p.mods.atkSpd*=1.15; p.mods.speed*=1.15; p.hpMax=Math.max(20,Math.floor(p.hpMax*0.95)); p.hp=Math.min(p.hpMax,p.hp); } },
];

// ---------- Globals ----------
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
const _isTouchDev = ('ontouchstart' in window)||(navigator.maxTouchPoints>0)||window.matchMedia('(hover:none) and (pointer:coarse)').matches;
let W=0,H=0,DPR=_isTouchDev ? Math.min(1, window.devicePixelRatio||1) : Math.min(2, window.devicePixelRatio||1);
let ZOOM = 1;
function computeZoom(){
  const minSide = Math.min(W,H);
  // Base zoom by screen size
  if(minSide < 500) ZOOM = 0.6;
  else if(minSide < 800) ZOOM = 0.78;
  else ZOOM = 1;
  // GOD MODE: pull camera back further on mobile/tablet so players can see
  // telegraphs and bosses across the wider arena. Desktop unchanged.
  try {
    if (typeof isGodMode === 'function' && isGodMode()) {
      if (minSide < 500)      ZOOM *= 0.78; // ~0.47 — phones get a much wider view
      else if (minSide < 800) ZOOM *= 0.85; // ~0.66 — tablets
      // desktop untouched
    }
  } catch(_) {}
}
// Recompute zoom whenever scene/mode changes
function refreshZoom(){ try { computeZoom(); } catch(_) {} }
function resize(){
  const vv = window.visualViewport;
  W = Math.round(vv ? vv.width  : window.innerWidth);
  H = Math.round(vv ? vv.height : window.innerHeight);
  DPR = _isTouchDev ? Math.min(1, window.devicePixelRatio||1) : Math.min(2, window.devicePixelRatio||1);
  cvs.width=Math.round(W*DPR); cvs.height=Math.round(H*DPR);
  cvs.style.width=W+'px'; cvs.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  computeZoom();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', ()=>setTimeout(resize,150));
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', resize);
  window.visualViewport.addEventListener('scroll', resize);
}
resize();

// ---------- Wave config (classic mode) ----------
const WAVE_PREP = 10;
const WAVE_ENEMIES = (n)=> 8 + n*4;
const WAVE_SPAWN_INTERVAL = (n)=> Math.max(0.35, 1.2 - n*0.06);

// ==============================================================
// GOD MODE CONFIG — 10 phases of cinematic boss combat
// ==============================================================
// Each boss gets:
//   - name, title (subtitle), color (themed glow), arenaTint (bg overlay)
//   - hpMul (scales with players), radius (grows each phase)
//   - skills: ordered list of skill IDs from BOSS_SKILLS that this boss casts
//   - introMs: how long the cinematic intro lasts before combat begins
// Skills are arrays so each phase ADDS skills on top of the previous (evolution).
const BOSS_SKILLS_LIST = [
  'telegraph_beam',          // dark fade-in glowing line, then beam fires
  'shockwave',               // expanding ring you must outrun
  'bullet_spiral',           // rotating spiral of projectiles
  'homing_orbs',             // slow seeking orbs
  'summon_minions',          // spawns adds
  'teleport_strike',         // disappears, reappears next to player, slashes
  'clone_split',             // spawns 2 fast decoys
  'void_zone',               // persistent ground hazards
  'meteor_rain',             // telegraphed AoE drops
  'laser_sweep',             // rotating beam sweep
  'ground_spikes',           // line of upward spikes
  'dash_strike',             // charges across arena
  'chain_lightning',         // arcing lightning bolts
  'black_hole',              // pulls player toward boss
  'reality_break',           // ultimate combo
  // ===== NEW SKILLS (5) — added in this patch =====
  'prismatic_burst',         // 3-color delayed AoE rings (boss_prismatic_burst.mp3)
  'gravity_well',            // anchored pull + crushing damage tick (boss_gravity_well.mp3)
  'shadow_clones_assault',   // 4 shadow clones each cast a beam at player (boss_shadow_clones_assault.mp3)
  'time_freeze_pulse',       // brief slow-field on player + ring of bullets (boss_time_freeze_pulse.mp3)
  'nova_implosion',          // implode-then-explode 360° projectile blast (boss_nova_implosion.mp3)
  'radial_collapse',         // light-weight nova replacement for phase 10  (boss_radial_collapse.mp3)
  // ===== NEW PHASE-11 NINJA SKILLS — supply matching .mp3 files =====
  'phantom_step',            // chain blink-slash around the player, untouchable mid-blink (boss_phantom_step.mp3)
  'shuriken_storm',          // expanding swirl of curving shuriken in waves         (boss_shuriken_storm.mp3)
  'umbral_dash',             // arena-crossing untouchable dash leaving a slash beam (boss_umbral_dash.mp3)
  'mirror_legion',           // ring of shadow doubles, each dashes the player      (boss_mirror_legion.mp3)
  'eclipse_finale',          // phase 11 ultimate combo (storm + nova + meteors)    (boss_eclipse_finale.mp3)
];

// Global boss damage multiplier — extra nerf so survival is more forgiving
// in both solo and co-op God Mode.
// Applied at every player-take-damage site that originates from a boss
// (contact, hostile bullets, beams, zones, shocks, in-skill direct hits).
const BOSS_DMG_MUL = 0.65;
// Extra nerf specifically for *physical contact* with a boss (boss touching
// the player). Stacks on top of BOSS_DMG_MUL — touch hits were unreasonably
// punishing, especially on phase 11's fast humanoid that closes in constantly.
const BOSS_CONTACT_MUL = 0.55;

// Phase HP buffed ~2.2x across the board — bosses were melting too fast.
// `signature` = the skill that drops on this boss's death as a low-version
// player ability the collector can fire with F (or the mobile SKILL button).
const BOSS_PHASES = [
  { name:"Void Herald",        title:"THE GATE OPENS",         color:"#9d5cff", arenaTint:"rgba(157,92,255,.10)",
    hpMul: 2.2,  radius: 64,  music:"boss1",  signature:'prismatic_burst',
    skills:['telegraph_beam','shockwave','prismatic_burst'] },
  { name:"Crimson Reaper",     title:"BLADE OF THE FIRST KILL",color:"#ff3d6a", arenaTint:"rgba(255,61,106,.10)",
    hpMul: 3.6,  radius: 82,  music:"boss2",  signature:'dash_strike',
    skills:['telegraph_beam','shockwave','dash_strike','prismatic_burst'] },
  { name:"Spectral Weaver",    title:"DREAMS OF GLASS",        color:"#22e8ff", arenaTint:"rgba(34,232,255,.10)",
    hpMul: 5.4,  radius: 100, music:"boss3",  signature:'time_freeze_pulse',
    skills:['telegraph_beam','shockwave','dash_strike','bullet_spiral','homing_orbs','time_freeze_pulse'] },
  { name:"Ironclad Behemoth",  title:"THE WALL THAT WALKS",    color:"#ff8a3d", arenaTint:"rgba(255,138,61,.10)",
    hpMul: 7.6,  radius: 122, music:"boss4",  signature:'nova_implosion',
    skills:['shockwave','bullet_spiral','homing_orbs','ground_spikes','summon_minions','nova_implosion'] },
  { name:"Phase Stalker",      title:"BLINK / KILL / BLINK",   color:"#3dffb0", arenaTint:"rgba(61,255,176,.10)",
    hpMul: 10.2, radius: 138, music:"boss5",  signature:'shadow_clones_assault',
    skills:['telegraph_beam','dash_strike','teleport_strike','homing_orbs','clone_split','shadow_clones_assault'] },
  { name:"Stormcaller Tyrant", title:"BIND THE LIGHTNING",     color:"#ffd166", arenaTint:"rgba(255,209,102,.12)",
    hpMul: 13.4, radius: 158, music:"boss6",  signature:'chain_lightning',
    skills:['shockwave','bullet_spiral','homing_orbs','laser_sweep','chain_lightning','summon_minions','time_freeze_pulse'] },
  { name:"Necrotide Empress",  title:"DROWN THE LIVING",       color:"#9d5cff", arenaTint:"rgba(157,92,255,.16)",
    hpMul: 17.0, radius: 178, music:"boss7",  signature:'void_zone',
    skills:['telegraph_beam','homing_orbs','void_zone','meteor_rain','clone_split','summon_minions','prismatic_burst','nova_implosion'] },
  { name:"Forge of Endings",   title:"WHERE WORLDS ARE UNMADE",color:"#ff8a3d", arenaTint:"rgba(255,138,61,.16)",
    hpMul: 21.0, radius: 204, music:"boss8",  signature:'gravity_well',
    skills:['shockwave','bullet_spiral','meteor_rain','laser_sweep','ground_spikes','gravity_well','nova_implosion','prismatic_burst'] },
  { name:"Archon of Silence",  title:"NO PRAYERS REACH HIM",   color:"#22e8ff", arenaTint:"rgba(34,232,255,.18)",
    hpMul: 27.0, radius: 230, music:"boss9",  signature:'meteor_rain',
    skills:['telegraph_beam','shockwave','dash_strike','teleport_strike','homing_orbs','laser_sweep','chain_lightning','gravity_well','meteor_rain','shadow_clones_assault','time_freeze_pulse'] },
  { name:"OMEGA — The Last God",title:"BURN OR BE REMEMBERED", color:"#ff2bd6", arenaTint:"rgba(255,43,214,.22)",
    hpMul: 36.0, radius: 270, music:"boss10", signature:'reality_break',
    skills:['telegraph_beam','shockwave','dash_strike','teleport_strike','clone_split','void_zone','meteor_rain','laser_sweep','chain_lightning','gravity_well','reality_break','summon_minions','bullet_spiral','homing_orbs','ground_spikes','prismatic_burst','shadow_clones_assault','time_freeze_pulse','radial_collapse'] },
  // ----- Phase 11: humanoid god-form (ninja/assassin) -----
  // After OMEGA falls, the divine essence reforges into a slim humanoid
  // avatar — high movement speed, micro-blinks, and brief untouchable
  // frames during attacks. Every prior skill is in the rotation (they
  // already scale with phase, so they hit harder here) plus the five
  // new ninja-flavored skills.
  { name:"OMEGA REBORN",       title:"INCARNATE GOD-FORM",     color:"#ffffff", arenaTint:"rgba(255,255,255,.12)",
    hpMul: 50.0, radius: 46,  music:"boss11", signature:'phantom_step',
    skills:[
      'phantom_step','shuriken_storm','umbral_dash','mirror_legion',
      'dash_strike','teleport_strike','telegraph_beam','clone_split',
      'shuriken_storm','homing_orbs','laser_sweep','phantom_step',
      'chain_lightning','umbral_dash','meteor_rain','prismatic_burst',
      'mirror_legion','time_freeze_pulse','nova_implosion','eclipse_finale',
    ] },
];

// Display info for each boss signature skill the player can collect.
const PLAYER_BOSS_SKILL_INFO = {
  prismatic_burst:       { name:'Prismatic Burst',  desc:'Three layered bullet rings explode from you.', cdMax: 7 },
  dash_strike:           { name:'Phase Dash',       desc:'Lunge forward and slash everything in front.', cdMax: 6 },
  time_freeze_pulse:     { name:'Chrono Pulse',     desc:'Outward ring that slows nearby enemies.',      cdMax: 7 },
  nova_implosion:        { name:'Nova Implosion',   desc:'Radial bullet nova around you.',               cdMax: 8 },
  shadow_clones_assault: { name:'Phantom Beams',    desc:'Three forward beams in a tight cone.',         cdMax: 6 },
  chain_lightning:       { name:'Chain Lightning',  desc:'Arcs to up to 3 nearest enemies.',             cdMax: 6 },
  void_zone:             { name:'Void Zone',        desc:'Drops a damaging zone where you aim.',         cdMax: 9 },
  gravity_well:          { name:'Singularity',      desc:'Two crush sites detonate where you aim.',      cdMax: 8 },
  meteor_rain:           { name:'Meteor Rain',      desc:'Three meteors slam down where you aim.',       cdMax: 9 },
  reality_break:         { name:'Reality Break',    desc:'Burst + 3 meteors. Omega in your hands.',      cdMax: 12 },
  phantom_step:          { name:'Phantom Step',     desc:'Blink to your aim, slashing nearby enemies.',  cdMax: 6 },
};

// ---------- Pickup table (God Mode) ----------
// Each pickup maps to one of the existing UPGRADES, gets a glyph color,
// and triggers the "collect.mp3" sfx + cinematic banner on pickup.
const PICKUP_RADIUS = 22;
// Drop cadence — slower than the previous patch so the floor isn't littered.
const PICKUP_SPAWN_INTERVAL = 14;    // was 5 — much less frequent
const PICKUP_SPAWN_JITTER   = 4;     // was 1.5 — wider random gap on top
const PICKUP_BASE_PER_CYCLE = 1;     // was 2 — back to one drop per cycle in solo

// ---------- Drop rarity tiers ----------
// Picked at spawn time by weighted random. `stacks` = how many times the
// upgrade's effect is applied on collect, so legendary drops feel huge.
// `ringWidth` and `ringColor` style the floor sprite, and `pillar` controls
// the column-of-light fx so rare+ drops are visible from far away.
const RARITY_TIERS = [
  // Heavily nerfed: epic and legendary are now true scores. ~85% common.
  { id:'common',    label:'Common',    weight:850, stacks:1, ringColor:'#ffffff', ringWidth:1.5, pillar:false, sparkles:false, banner:'',           color:'#ffffff' },
  { id:'rare',      label:'Rare',      weight:130, stacks:2, ringColor:'#5dafff', ringWidth:2.5, pillar:true,  sparkles:false, banner:'★★ RARE',     color:'#5dafff' },
  { id:'epic',      label:'Epic',      weight:18,  stacks:3, ringColor:'#c46bff', ringWidth:3.0, pillar:true,  sparkles:true,  banner:'★★★ EPIC',   color:'#c46bff' },
  { id:'legendary', label:'Legendary', weight:2,   stacks:4, ringColor:'#ffb347', ringWidth:3.5, pillar:true,  sparkles:true,  banner:'★★★★ LEGENDARY', color:'#ffb347' },
];
const RARITY_TOTAL_WEIGHT = RARITY_TIERS.reduce((s,r)=>s+r.weight, 0);
function rollRarity(){
  let n = Math.random() * RARITY_TOTAL_WEIGHT;
  for(const r of RARITY_TIERS){ n -= r.weight; if(n <= 0) return r; }
  return RARITY_TIERS[0];
}
function getRarity(id){ return RARITY_TIERS.find(r=>r.id===id) || RARITY_TIERS[0]; }
// Some upgrades are flat one-shots that would be silly to stack 4×. For
// these, rarity grants a flat bonus instead of running apply() N times.
const NO_STACK_UPGRADES = new Set(['heal','phoenix','glasscannon','aegis','ironwill','hpmax']);

// ---------- SFX engine ----------
const SFX = (() => {
  const BASE = 'sounds/';
  const VOL = { sfx: 0.7, music: 0.35 };
  const pools = {};
  const POOL_SIZE = 4;
  function makePool(src){ const arr=[]; for(let i=0;i<POOL_SIZE;i++){ const a=new Audio(src); a.preload='auto'; a.volume=VOL.sfx; arr.push(a); } return {arr,i:0}; }
  function getPool(key, src){ if(!pools[key]) pools[key]=makePool(src); return pools[key]; }
  function play(key, src, volMul=1){ try{ const p=getPool(key,src); const a=p.arr[p.i]; p.i=(p.i+1)%p.arr.length; a.currentTime=0; a.volume=VOL.sfx*volMul; const pr=a.play(); if(pr&&pr.catch) pr.catch(()=>{});}catch(e){} }
  function fire(h='james'){play('fire_'+h, `${BASE}fire_${h}.mp3`);}
  function ability(h='james'){play('q_'+h, `${BASE}q_${h}.mp3`);}
  function dash(){play('dash', `${BASE}dash.mp3`);}
  function hit(){play('hit', `${BASE}hit.mp3`);}
  function hurt(){play('hurt', `${BASE}hurt.mp3`);}
  // God Mode named sfx — file names match the docs you'll record:
  function collect(){play('collect', `${BASE}collect.mp3`);}
  function bossSkill(name, vol=1){ play('bs_'+name, `${BASE}boss_${name}.mp3`, vol); }
  function fireRemote(h='james'){play('fire_'+h, `${BASE}fire_${h}.mp3`, 0.45);}
  function abilityRemote(h='james'){play('q_'+h, `${BASE}q_${h}.mp3`, 0.5);}
  function dashRemote(){play('dash', `${BASE}dash.mp3`, 0.4);}
  let music=null, currentTrack=null;
  // Separate RAF handles for fade-out and fade-in so they never stomp each other.
  let _fadeOutRaf=null, _fadeInRaf=null;
  // Pre-buffered Audio objects — loaded before the menu so playMusic is instant.
  const _musicPreload = {};
  function prewarmMusic(...tracks){
    for(const t of tracks){
      if(_musicPreload[t]) continue;
      try{
        const a = new Audio(`${BASE}${t}.mp3`);
        a.preload = 'auto'; a.loop = true; a.volume = 0;
        a.load(); // start download without playing (no autoplay restriction)
        _musicPreload[t] = a;
      }catch(e){}
    }
  }
  function _clearFadeOut(){ if(_fadeOutRaf){ cancelAnimationFrame(_fadeOutRaf); _fadeOutRaf=null; } }
  function _clearFadeIn(){  if(_fadeInRaf){  cancelAnimationFrame(_fadeInRaf);  _fadeInRaf=null;  } }
  // Fade a single audio node; rafSlot is either '_fadeOutRaf' or '_fadeInRaf'.
  function _fadeAudio(audio, from, to, ms, rafKey, onDone){
    if(!audio){ if(onDone) onDone(); return; }
    const t0 = performance.now();
    function step(now){
      const t = Math.min(1, (now - t0) / ms);
      const v = from + (to - from) * t;
      try { audio.volume = Math.max(0, Math.min(1, v)); } catch(e){}
      if(t < 1){
        const id = requestAnimationFrame(step);
        if(rafKey === '_fadeOutRaf') _fadeOutRaf = id;
        else _fadeInRaf = id;
      } else {
        if(rafKey === '_fadeOutRaf') _fadeOutRaf = null;
        else _fadeInRaf = null;
        if(onDone) onDone();
      }
    }
    const id = requestAnimationFrame(step);
    if(rafKey === '_fadeOutRaf') _fadeOutRaf = id;
    else _fadeInRaf = id;
  }
  // Crossfade music tracks. fadeMs default 1200ms (per-phase boss themes).
  function playMusic(track, fadeMs){
    fadeMs = (fadeMs == null) ? 1200 : fadeMs;
    if(currentTrack===track && music && !music.paused) return;
    const old = music;
    // Use the pre-warmed Audio if available — avoids the first-play decode delay.
    let next = _musicPreload[track] || null;
    delete _musicPreload[track];
    if(!next){
      try{ next = new Audio(`${BASE}${track}.mp3`); }catch(e){ next = null; }
    }
    if(next){
      try{
        next.loop = true;
        next.currentTime = 0;
        next.volume = 0;
        const pr = next.play(); if(pr && pr.catch) pr.catch(()=>{});
      }catch(e){ next = null; }
    }
    music = next;
    currentTrack = track;
    // Cancel any in-flight fades independently.
    _clearFadeOut();
    _clearFadeIn();
    // Fade old track out, new track in — each on its own RAF slot.
    if(old){
      const startVol = (typeof old.volume === 'number') ? old.volume : VOL.music;
      _fadeAudio(old, startVol, 0, fadeMs, '_fadeOutRaf', ()=>{ try{ old.pause(); }catch(e){} });
    }
    if(next){
      _fadeAudio(next, 0, VOL.music, fadeMs, '_fadeInRaf');
    }
  }
  function stopMusic(fadeMs){
    fadeMs = (fadeMs == null) ? 600 : fadeMs;
    const old = music; music = null; currentTrack = null;
    _clearFadeOut();
    _clearFadeIn();
    if(old){
      const startVol = (typeof old.volume === 'number') ? old.volume : VOL.music;
      _fadeAudio(old, startVol, 0, fadeMs, '_fadeOutRaf', ()=>{ try{ old.pause(); }catch(e){} });
    }
  }
  function unlock(){ if(music && music.paused) music.play().catch(()=>{}); }
  ['pointerdown','touchstart','keydown','click'].forEach(ev=>window.addEventListener(ev, unlock, {passive:true}));
  function preload(key, src){
    return new Promise((resolve)=>{
      try{
        getPool(key, src);
        const a = new Audio(src); a.preload='auto';
        const done=()=>resolve();
        a.addEventListener('canplaythrough', done, {once:true});
        a.addEventListener('error', done, {once:true});
        setTimeout(done, 4500);
        a.load();
      }catch(e){ resolve(); }
    });
  }
  return { fire, ability, dash, hit, hurt, collect, bossSkill, unlock, playMusic, stopMusic, preload, prewarmMusic, fireRemote, abilityRemote, dashRemote };
})();

const state = {
  scene: 'menu',
  mode: 'single',           // 'single' | 'multi' | 'god' | 'godmulti'
  username: localStorage.getItem('ns_user') || '',
  hero: localStorage.getItem('ns_hero') || 'james',
  heroPortraits: {},
  player: null,
  others: new Map(),
  enemies: [], bullets: [], fx: [], pickups: [],
  arena: { w:3200, h:2200 },
  cam: {x:0,y:0,shake:0},
  time: 0, score: 0, kills: 0, fracture: 0,
  // Wave system (classic mode)
  wave: 0,
  wavePhase: 'prep',
  waveTimer: WAVE_PREP,
  waveSpawnTimer: 0,
  waveToSpawn: 0,
  waveEnemiesAlive: 0,
  paused: false, running: false, startedAt: 0,
  roomCode: null,
  isHost: false,
  upgradeOpenForWave: 0,
  upgradeChosenForWave: 0,
  reviveHoldTime: 0,
  reviveTarget: null,
  beingRevivedTime: 0,
  mySessionId: null,
  lobby: { players: new Map(), countdown: 0, phase:'waiting' },
  enemySeq: 1,
  pickupSeq: 1,
  // ---- GOD MODE ----
  god: null,   // populated in startGodMode()
};

async function loadHeroImages(){
  await Promise.all(HERO_IDS.map(id=>new Promise((res)=>{
    const img = new Image(); img.onload=()=>res(); img.onerror=()=>res();
    img.src = HEROES[id].img;
    state.heroPortraits[id] = img;
  })));
}

// ---------- UI helpers ----------
const $ = sel => document.querySelector(sel);
const show = (id, on=true) => { const el=document.getElementById(id); if(!el)return; el.classList[on?'remove':'add']('hidden'); };
function setScene(s){
  state.scene = s;
  ['menu','heroSelect','mpMenu','lobby','leaderScreen','infoScreen','endScreen'].forEach(id=>show(id, id===s));
  show('hud', s==='game');
  const tui = document.getElementById('touchUI');
  if(tui){ tui.classList.toggle('on', IS_TOUCH && s==='game'); }
  // Show the aim-settings icon (not the bar directly) during gameplay
  const aimIcon = document.getElementById('aimSettingsIcon');
  if(aimIcon){ aimIcon.classList.toggle('visible', IS_TOUCH && s==='game'); }
  // Close the aim popup whenever we leave the game scene
  const aimBar = document.getElementById('aimModeBar');
  if(aimBar && s !== 'game'){ aimBar.classList.remove('on'); }
  if(aimIcon && s !== 'game'){ aimIcon.classList.remove('open'); }
  // Hide the connection pill while in-game; show it in menus
  const pill = document.getElementById('connPill');
  if(pill){ pill.style.display = (s === 'game') ? 'none' : ''; }
  // When leaving game, reset aim stick state
  if(s !== 'game' && IS_TOUCH){ touch.aimActive=false; touch.aimMx=0; touch.aimMy=0; touch.aimStickId=-1; touch.attack=false; touch.dragFireLocked=false; touch.dragFireActive=false; touch.dragFireShot=false; touch.dragFireMx=0; touch.dragFireMy=0; touch.fireJoyActive=false; touch.fireJoyMx=0; touch.fireJoyMy=0; mobileAimLocked=false; }
  if(s !== 'leaderScreen') state._prevScene = s;
  if(s==='game'){
    state._leaderMusicActive = false;
    if(isGodMode()) SFX.playMusic('god');
    else SFX.playMusic('bgm_game');
    stopLbBgCanvas();
  } else if(s==='leaderScreen'){
    state._leaderMusicActive = true;
    SFX.playMusic('leaderboard', 800);
    renderLeaderboard();
    startLbBgCanvas();
    // Play the cinematic intro only when arriving from outside the leaderboard area
    // (not when returning from the Info screen which is a sub-page of leaderboard).
    const fromInfo = state._prevScene === 'infoScreen';
    state._prevScene = s;
    try {
      const li = document.getElementById('leaderIntro');
      if (li && !fromInfo) {
        li.classList.remove('hidden');
        li.classList.remove('show');
        void li.offsetWidth;
        li.classList.add('show');
        clearTimeout(setScene._liTimer);
        setScene._liTimer = setTimeout(() => {
          li.classList.remove('show');
          li.classList.add('hidden');
        }, 2100);
      }
    } catch(_){}
  } else {
    stopLbBgCanvas();
    // Once the leaderboard was visited, keep its music playing on all menus.
    if(state._leaderMusicActive){
      SFX.playMusic('leaderboard', 600);
    } else {
      SFX.playMusic('bgm_menu');
    }
  }
  // Hide god-mode-only UI on non-game scenes
  if(s!=='game'){ hideBossBar(); hideGodIntro(); }
}
function toast(msg, ms=1600){
  const t=$('#toast'); t.textContent=msg; t.style.display='block';
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.style.display='none', ms);
}

// ============================================================
// SCORE POINT (SP) SYSTEM — persistent currency across games
// Only tracked for signed-in users (state.username must be set).
// ============================================================
// SP (Survival Points) — always stored in DB, never localStorage.
// In-memory cache + debounced batched writes: display updates
// instantly on every kill, DB is written at most once every 2s.
// ============================================================
let _spCache   = 0;   // current SP shown to player
let _spPending = 0;   // unsaved earnings buffered for next flush
let _spFlushTimer = null;

function getSP(){ return _spCache; }

async function fetchSPFromServer(){
  if(!window.__nsProfileLoggedIn || !state.username) return;
  try{
    const r = await fetch(`${API_BASE}/api/sp?name=${encodeURIComponent(state.username)}`);
    if(r.ok){
      const data = await r.json();
      _spCache = Math.max(0, data.sp || 0);
      refreshSPDisplay();
    }
  }catch(_){}
}

function addSP(n){
  if(!window.__nsProfileLoggedIn || !state.username || n <= 0) return getSP();
  _spCache  = Math.max(0, _spCache  + Math.floor(n));
  _spPending += Math.floor(n);
  refreshSPDisplay();
  // Debounce: flush to DB 2 s after the last addSP call
  if(_spFlushTimer) clearTimeout(_spFlushTimer);
  _spFlushTimer = setTimeout(flushSP, 2000);
  return _spCache;
}

async function flushSP(){
  if(_spFlushTimer){ clearTimeout(_spFlushTimer); _spFlushTimer = null; }
  if(_spPending <= 0 || !window.__nsProfileLoggedIn || !state.username) return;
  const amount = _spPending;
  _spPending = 0;
  try{
    const r = await fetch(`${API_BASE}/api/sp/add`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name: state.username, amount }),
    });
    if(r.ok){
      const data = await r.json();
      // Sync with authoritative server value
      _spCache = Math.max(_spCache, data.sp || 0);
      refreshSPDisplay();
    }
  }catch(_){
    // Network error: put it back so it retries next time
    _spPending += amount;
  }
}

function refreshSPDisplay(){
  const el = document.getElementById('spBadge');
  if(!el) return;
  const loggedIn = !!window.__nsProfileLoggedIn;
  const online = navigator.onLine;
  // SP is only active when the player is both logged in AND online.
  // Offline play never earns SP — show 0 and dim the badge.
  const active = loggedIn && online;
  const offlineNote = document.getElementById('spOfflineNote');
  el.style.display = 'block';
  const spText = active ? `⭐ ${getSP().toLocaleString()} SP` : `⭐ 0 SP`;
  if(offlineNote){
    el.childNodes[0] && el.childNodes[0].nodeType === 3
      ? (el.childNodes[0].textContent = spText)
      : el.insertBefore(document.createTextNode(spText), el.firstChild);
    // Show OFFLINE tag only when logged in but no internet
    offlineNote.style.display = (loggedIn && !online) ? 'inline' : 'none';
  } else {
    el.textContent = spText;
  }
  if(active){
    el.style.opacity = '';
    el.style.filter = '';
    el.title = '';
  } else {
    el.style.opacity = '0.4';
    el.style.filter = 'grayscale(0.7)';
    el.title = online ? 'Sign in to receive SP points' : 'Offline — SP unavailable';
  }
}

// ============================================================
// LEADERBOARD BACKGROUND CANVAS — cycling beautiful scenes
// ============================================================
let _lbBgRaf = null;
const _LB_SCENES = [
  // Each scene: draw(ctx, W, H, t) where t = seconds elapsed in scene
  // 0: Sakura garden — soft pink petals falling, warm pink-blue gradient sky
  function sakura(ctx, W, H, t){
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#1a0a2e'); g.addColorStop(0.4,'#3d1155'); g.addColorStop(1,'#0d0520');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    // Ground mist
    const mg = ctx.createLinearGradient(0, H*0.78, 0, H);
    mg.addColorStop(0,'transparent'); mg.addColorStop(1,'rgba(255,200,230,0.09)');
    ctx.fillStyle = mg; ctx.fillRect(0, H*0.78, W, H*0.22);
    // Distant tree silhouettes
    ctx.fillStyle = 'rgba(80,20,60,0.55)';
    for(let i=0;i<7;i++){
      const tx = (i/6)*W*1.1 - W*0.05, ty = H*(0.55+0.04*Math.sin(i*1.7));
      ctx.beginPath(); ctx.ellipse(tx, ty, W*0.06, H*0.22, 0, 0, Math.PI*2); ctx.fill();
    }
    // Petals
    const nP = 38;
    for(let i=0;i<nP;i++){
      const seed = i*137.508;
      const px = (((seed*0.618+t*0.04*(1+i%3*0.2))%1)*1.1-0.05)*W;
      const py = ((((seed*0.382+t*0.055*(1+(i%5)*0.15))%1)+1)%1)*H;
      const sz = 3+Math.sin(seed)*2;
      const alpha = 0.35+0.45*Math.abs(Math.sin(seed+t*0.3));
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(seed+t*0.6);
      ctx.fillStyle = `rgba(255,${160+Math.floor(Math.sin(seed)*40)},${180+Math.floor(Math.sin(seed*2)*30)},${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(0,0,sz,sz*0.6,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Soft moon
    ctx.save();
    ctx.shadowColor='rgba(255,230,255,0.9)'; ctx.shadowBlur=40;
    ctx.fillStyle='rgba(255,240,255,0.82)';
    ctx.beginPath(); ctx.arc(W*0.78, H*0.15, H*0.045, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  },
  // 1: Starlit ocean — stars over water, gentle wave shimmer
  function ocean(ctx, W, H, t){
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#040818'); g.addColorStop(0.5,'#071428'); g.addColorStop(1,'#0a1e38');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    // Stars
    const nS = 90;
    for(let i=0;i<nS;i++){
      const sx = ((i*97.4+3)%W), sy = ((i*53.2+7)%(H*0.52));
      const br = 0.4+0.55*Math.abs(Math.sin(i*0.8+t*0.9));
      ctx.fillStyle = `rgba(220,240,255,${br.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(sx, sy, 0.8+Math.sin(i)*0.6, 0, Math.PI*2); ctx.fill();
    }
    // Horizon glow
    const hg = ctx.createLinearGradient(0, H*0.5, 0, H*0.56);
    hg.addColorStop(0,'rgba(34,130,255,0.22)'); hg.addColorStop(1,'transparent');
    ctx.fillStyle = hg; ctx.fillRect(0, H*0.5, W, H*0.06);
    // Water surface — ripples
    ctx.save();
    ctx.globalAlpha = 0.28;
    for(let row=0; row<6; row++){
      const wy = H*0.55 + row*(H*0.08);
      ctx.strokeStyle = `rgba(80,${160+row*8},255,0.6)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for(let x=0;x<=W;x+=6){
        const amp = 4-row*0.5;
        const y = wy + amp*Math.sin((x/W)*Math.PI*8 + t*(1.2+row*0.3));
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // Moon reflection
    ctx.save();
    ctx.shadowColor='rgba(80,160,255,0.8)'; ctx.shadowBlur=30;
    ctx.fillStyle='rgba(180,220,255,0.72)';
    ctx.beginPath(); ctx.arc(W*0.5, H*0.12, H*0.042, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  },
  // 2: Northern lights — aurora ribbons swaying across dark sky
  function aurora(ctx, W, H, t){
    ctx.fillStyle='#03050f'; ctx.fillRect(0,0,W,H);
    // Stars
    for(let i=0;i<70;i++){
      const sx=((i*113+7)%W), sy=((i*59+11)%(H*0.65));
      ctx.fillStyle=`rgba(255,255,255,${0.3+0.5*Math.abs(Math.sin(i+t))})`;
      ctx.beginPath(); ctx.arc(sx,sy,0.7,0,Math.PI*2); ctx.fill();
    }
    // Aurora ribbons
    const colors=['#00ffaa','#00e5ff','#44ff88','#88ffcc','#00ccff'];
    for(let band=0; band<3; band++){
      const baseY = H*(0.2+band*0.12);
      const phase = t*(0.4+band*0.15) + band*1.2;
      ctx.save();
      ctx.globalAlpha = 0.18+0.14*Math.sin(t*0.6+band);
      const ag = ctx.createLinearGradient(0,baseY-60,0,baseY+60);
      ag.addColorStop(0,'transparent');
      ag.addColorStop(0.4,colors[band]);
      ag.addColorStop(0.6,colors[(band+1)%colors.length]);
      ag.addColorStop(1,'transparent');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      const pts = 12;
      for(let i=0;i<=pts;i++){
        const x=i/pts*W;
        const amp = H*(0.06+0.04*Math.sin(band+phase));
        const y = baseY + amp*Math.sin((i/pts)*Math.PI*3+phase) + amp*0.4*Math.sin((i/pts)*Math.PI*7+phase*1.3);
        i===0?ctx.moveTo(x,y-40):ctx.lineTo(x,y-40);
      }
      for(let i=pts;i>=0;i--){
        const x=i/pts*W;
        const amp = H*(0.06+0.04*Math.sin(band+phase));
        const y = baseY + amp*Math.sin((i/pts)*Math.PI*3+phase) + amp*0.4*Math.sin((i/pts)*Math.PI*7+phase*1.3);
        ctx.lineTo(x,y+40);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },
  // 3: Golden sunset — warm gradient with distant mountains
  function sunset(ctx, W, H, t){
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#1a0a00'); g.addColorStop(0.3,'#6b1a00'); g.addColorStop(0.6,'#cc5500'); g.addColorStop(0.78,'#ffaa22'); g.addColorStop(1,'#331100');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // Sun glow
    ctx.save();
    ctx.shadowColor='rgba(255,180,30,0.9)'; ctx.shadowBlur=80;
    const sg=ctx.createRadialGradient(W*0.5,H*0.6,0,W*0.5,H*0.6,H*0.22);
    sg.addColorStop(0,'rgba(255,220,80,0.45)'); sg.addColorStop(1,'transparent');
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
    ctx.restore();
    // Mountain silhouettes
    ctx.fillStyle='rgba(15,6,0,0.88)';
    ctx.beginPath();
    ctx.moveTo(0,H);
    const peaks=[0.12,0.28,0.05,0.22,0.35,0.1,0.25,0.18,0.08,0.32,0.15];
    for(let i=0;i<=peaks.length;i++){
      const x=i/peaks.length*W;
      const y=H*(0.72-peaks[i%peaks.length]*0.55);
      i===0?ctx.lineTo(x,H*0.88):ctx.lineTo(x,y);
    }
    ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
    // Rippling water below
    const wg=ctx.createLinearGradient(0,H*0.8,0,H);
    wg.addColorStop(0,'rgba(200,90,0,0.25)'); wg.addColorStop(1,'rgba(80,20,0,0.5)');
    ctx.fillStyle=wg; ctx.fillRect(0,H*0.8,W,H*0.2);
  },
  // 4: Moonlit cherry forest — deep blue-purple, blooming trees
  function moonForest(ctx, W, H, t){
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#070515'); g.addColorStop(0.5,'#120830'); g.addColorStop(1,'#1a0e40');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // Stars
    for(let i=0;i<60;i++){
      const sx=((i*101+5)%W), sy=((i*47+9)%(H*0.55));
      ctx.fillStyle=`rgba(200,220,255,${0.25+0.6*Math.abs(Math.sin(i*0.9+t*0.7))})`;
      ctx.beginPath(); ctx.arc(sx,sy,0.75,0,Math.PI*2); ctx.fill();
    }
    // Moon
    ctx.save();
    ctx.shadowColor='rgba(220,210,255,0.9)'; ctx.shadowBlur=50;
    ctx.fillStyle='rgba(240,235,255,0.88)';
    ctx.beginPath(); ctx.arc(W*0.72,H*0.13,H*0.05,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // Tree trunks
    ctx.strokeStyle='rgba(40,20,60,0.8)'; ctx.lineWidth=8;
    const tpos=[0.1,0.25,0.42,0.58,0.74,0.88];
    for(const tx of tpos){
      ctx.beginPath(); ctx.moveTo(W*tx,H); ctx.lineTo(W*tx,H*0.55); ctx.stroke();
    }
    // Blossom canopies
    for(const tx of tpos){
      ctx.save();
      ctx.globalAlpha=0.55;
      const cg=ctx.createRadialGradient(W*tx,H*0.5,0,W*tx,H*0.5,W*0.1);
      cg.addColorStop(0,'rgba(255,160,200,0.7)'); cg.addColorStop(1,'rgba(180,80,160,0.1)');
      ctx.fillStyle=cg;
      ctx.beginPath(); ctx.arc(W*tx,H*0.5,W*0.09,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Falling petals
    for(let i=0;i<22;i++){
      const seed=i*163;
      const px=(((seed*0.5+t*0.038*(1+i%4*0.2))%1)*1.1-0.05)*W;
      const py=(((seed*0.31+t*0.05)%1)*1.05-0.05)*H;
      const alpha=0.3+0.5*Math.abs(Math.sin(seed+t*0.4));
      ctx.save(); ctx.translate(px,py); ctx.rotate(seed+t*0.5);
      ctx.fillStyle=`rgba(255,170,210,${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(0,0,4,2.5,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
];
let _lbSceneIdx = 0, _lbSceneT = 0, _lbLastNow = 0, _lbFadeAlpha = 0, _lbFading = false, _lbNextIdx = 0;
const LB_SCENE_DUR = 14, LB_FADE_DUR = 2.5;

function startLbBgCanvas(){
  const canvas = document.getElementById('lbBgCanvas');
  if(!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width || window.innerWidth;
  canvas.height = rect.height || window.innerHeight;
  _lbSceneT = 0;
  _lbLastNow = performance.now() / 1000;
  _lbFading = false;
  _lbFadeAlpha = 0;
  if(_lbBgRaf) cancelAnimationFrame(_lbBgRaf);
  function frame(){
    const canvas2 = document.getElementById('lbBgCanvas');
    if(!canvas2){ _lbBgRaf=null; return; }
    // Resize if needed
    const pr = canvas2.parentElement.getBoundingClientRect();
    if(Math.abs(canvas2.width-(pr.width||window.innerWidth))>4 || Math.abs(canvas2.height-(pr.height||window.innerHeight))>4){
      canvas2.width=pr.width||window.innerWidth;
      canvas2.height=pr.height||window.innerHeight;
    }
    const ctx2 = canvas2.getContext('2d');
    const W = canvas2.width, H = canvas2.height;
    const now = performance.now()/1000;
    const dt = Math.min(0.1, now - _lbLastNow); _lbLastNow=now;
    _lbSceneT += dt;
    // Scene transition logic
    if(!_lbFading && _lbSceneT >= LB_SCENE_DUR){
      _lbFading = true;
      _lbFadeAlpha = 0;
      _lbNextIdx = (_lbSceneIdx + 1 + Math.floor(Math.random()*(_LB_SCENES.length-1))) % _LB_SCENES.length;
    }
    if(_lbFading){
      _lbFadeAlpha += dt / LB_FADE_DUR;
      if(_lbFadeAlpha >= 1){
        _lbSceneIdx = _lbNextIdx;
        _lbSceneT = 0;
        _lbFading = false;
        _lbFadeAlpha = 0;
      }
    }
    // Draw current scene
    ctx2.save();
    ctx2.globalAlpha = 1;
    try { _LB_SCENES[_lbSceneIdx](ctx2, W, H, _lbSceneT); } catch(_){}
    ctx2.restore();
    // Cross-fade next scene
    if(_lbFading){
      ctx2.save();
      ctx2.globalAlpha = Math.min(1, _lbFadeAlpha);
      try { _LB_SCENES[_lbNextIdx](ctx2, W, H, 0); } catch(_){}
      ctx2.restore();
    }
    // Subtle dark vignette so content stays readable
    const vg = ctx2.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.75);
    vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.52)');
    ctx2.fillStyle=vg; ctx2.fillRect(0,0,W,H);
    _lbBgRaf = requestAnimationFrame(frame);
  }
  _lbBgRaf = requestAnimationFrame(frame);
}
function stopLbBgCanvas(){
  if(_lbBgRaf){ cancelAnimationFrame(_lbBgRaf); _lbBgRaf=null; }
  const canvas = document.getElementById('lbBgCanvas');
  if(canvas){ const c=canvas.getContext('2d'); c.clearRect(0,0,canvas.width,canvas.height); }
}
function isGodMode(){ return state.mode === 'god' || state.mode === 'godmulti'; }
function isMultiMode(){ return state.mode === 'multi' || state.mode === 'godmulti'; }

function renderHeroGrid(){
  const grid = $('#heroGrid'); grid.innerHTML='';
  HERO_IDS.forEach(id=>{
    const h = HEROES[id];
    const card = document.createElement('div');
    card.className = 'hero-card' + (state.hero===id ? ' selected':'');
    // Full scenery layer behind the portrait. By default everything is
    // STATIC (frozen): a subtle cyber grid, hero-colored corner brackets,
    // 10 decorative "data nodes", 2 ambient orbs, and a diagonal scan
    // beam. Animations only start on hover or when the card is selected.
    const fx = `
      <span class="hero-fx-layer" aria-hidden="true" style="--c: ${h.color}">
        <i class="hf-grid"></i>
        <i class="hf-vignette"></i>
        <i class="hf-corner hf-tl"></i><i class="hf-corner hf-tr"></i>
        <i class="hf-corner hf-bl"></i><i class="hf-corner hf-br"></i>
        <i class="hf hf1"></i><i class="hf hf2"></i><i class="hf hf3"></i>
        <i class="hf hf4"></i><i class="hf hf5"></i><i class="hf hf6"></i>
        <i class="hf hf7"></i><i class="hf hf8"></i><i class="hf hf9"></i>
        <i class="hf hf10"></i>
        <i class="hf-orb hf-orb1"></i><i class="hf-orb hf-orb2"></i>
        <i class="hf-scan"></i>
      </span>`;
    // Faction badge: CPK (paid 5) or JSquad (free 11). Displayed top-left.
    const CPK_IDS = ['kagoya','iruha','yachiyu','kaitu','well'];
    const isCpk = CPK_IDS.includes(id);
    const badgeHtml = `<span class="hero-badge ${isCpk?'cpk':'jsquad'}">${isCpk?'CPK':'JSquad'}</span>`;
    card.innerHTML = `
      ${fx}
      ${badgeHtml}
      <img src="${h.img}" alt="${h.name}" loading="lazy" width="512" height="512" />
      <div class="meta">
        <div class="role">${h.role}</div>
        <h3>${h.name}</h3>
        <div class="stats">
          <div>HP <div class="stat-bar"><i style="width:${Math.min(100, h.hp/2)}%"></i></div></div>
          <div>SPD <div class="stat-bar"><i style="width:${(h.speed-180)/1.2}%"></i></div></div>
          <div>DMG <div class="stat-bar"><i style="width:${Math.min(100, h.dmg*1.6)}%"></i></div></div>
          <div>ABI <div class="stat-bar"><i style="width:${100 - h.abiCd*8}%"></i></div></div>
        </div>
      </div>`;
    card.onclick = ()=>{ state.hero=id; localStorage.setItem('ns_hero', id); renderHeroGrid(); $('#heroDesc').innerHTML = `<b style="color:${h.color}">${h.name} · ${h.role}</b> — ${h.desc}<br/><span style="opacity:.7">Q Ability: <b>${h.abi}</b> (${h.abiCd}s)</span>`; };
    grid.appendChild(card);
  });
  const h = HEROES[state.hero];
  $('#heroDesc').innerHTML = `<b style="color:${h.color}">${h.name} · ${h.role}</b> — ${h.desc}<br/><span style="opacity:.7">Q Ability: <b>${h.abi}</b> (${h.abiCd}s)</span>`;
}

// ---------- Input ----------
const keys = {};
const mouse = { x:0, y:0, down:false, moved:false };
const touch = { active:false, mx:0, my:0, stickId:-1, stickCx:0, stickCy:0, attack:false, dash:false, ability:false, dashEdge:false, abiEdge:false, boss:false, bossEdge:false, aimActive:false, aimMx:0, aimMy:0, aimStickId:-1, aimStickCx:0, aimStickCy:0, fireJoyMx:0, fireJoyMy:0, fireJoyActive:false, fireJoyId:-1, fireJoyCx:0, fireJoyCy:0, dragFireMx:0, dragFireMy:0, dragFireActive:false, dragFireId:-1, dragFireCx:0, dragFireCy:0, dragFireLocked:false, dragFireShot:false };
// Mobile aim mode: 'auto' = auto-aim at nearest enemy (default), 'manual' = right joystick aims + fires
let mobileAimMode = 'auto';
let mobileAimLocked = false; // true when hero forces a specific mode (Yachiyu = dragdrop-only)
function setAimMode(mode){
  mobileAimMode = mode;
  const autoBtn = document.getElementById('btnAutoAim');
  const manualBtn = document.getElementById('btnManualShoot');
  const dragBtn = document.getElementById('btnDragDrop');
  const aimStick = document.getElementById('tAimStick');
  const fireBtn = document.getElementById('tAttack');
  const fireJoy = document.getElementById('tFireJoy');
  const dragFireJoy = document.getElementById('tDragFireJoy');
  // Auto mode = FIRE button visible; Manual/DragFire = fire joystick replaces it
  if(autoBtn){ autoBtn.classList.toggle('active', mode==='auto'); autoBtn.disabled = !!mobileAimLocked; }
  if(manualBtn){ manualBtn.classList.toggle('active', mode==='manual'); manualBtn.disabled = !!mobileAimLocked; }
  if(dragBtn){ dragBtn.classList.toggle('active', mode==='dragdrop'); }
  // The aim stick is no longer used — fire joysticks handle aiming+firing in all modes
  if(aimStick){ aimStick.style.display = 'none'; }
  if(fireBtn){ fireBtn.style.display = (mode==='manual'||mode==='dragdrop') ? 'none' : ''; }
  if(fireJoy){ fireJoy.style.display = mode==='manual' ? 'block' : 'none'; }
  if(dragFireJoy){ dragFireJoy.style.display = mode==='dragdrop' ? 'block' : 'none'; }
  // Clear aim stick state
  touch.aimActive=false; touch.aimMx=0; touch.aimMy=0; touch.aimStickId=-1;
  const aimK=document.getElementById('tAimKnob'); if(aimK) aimK.style.transform='translate(0,0)';
  if(mode!=='manual'){
    touch.fireJoyActive=false; touch.fireJoyMx=0; touch.fireJoyMy=0; touch.fireJoyId=-1;
    if(mode!=='dragdrop') touch.attack=false;
    const k=document.getElementById('tFireKnob'); if(k) k.style.transform='translate(0,0)';
  }
  if(mode!=='dragdrop'){
    touch.dragFireLocked=false; touch.dragFireActive=false; touch.dragFireMx=0; touch.dragFireMy=0; touch.dragFireId=-1; touch.attack=false;
    const k=document.getElementById('tDragFireKnob'); if(k) k.style.transform='translate(0,0)';
    const dj=document.getElementById('tDragFireJoy'); if(dj) dj.classList.remove('locked');
  }
}
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints>0) || window.matchMedia('(hover:none) and (pointer:coarse)').matches;

window.addEventListener('keydown', e=>{ if(!e || typeof e.key!=='string') return; keys[e.key.toLowerCase()] = true; if(e.key===' ') e.preventDefault(); });
window.addEventListener('keyup',   e=>{ if(!e || typeof e.key!=='string') return; keys[e.key.toLowerCase()] = false; });
cvs.addEventListener('mousemove', e=>{ const r=cvs.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top; mouse.moved=true; });
cvs.addEventListener('mousedown', ()=>{ mouse.down=true; });
cvs.addEventListener('mouseup',   ()=>{ mouse.down=false; });
cvs.addEventListener('contextmenu', e=>e.preventDefault());

function initTouchUI(){
  if(!IS_TOUCH) return;
  document.querySelectorAll('.mobile-hint').forEach(el=>el.style.display='inline');
  document.addEventListener('gesturestart', e=>e.preventDefault());
  const stick=$('#tStick'), base=$('#tBase'), knob=$('#tKnob'); const STICK_R=60;
  function updateStickPosition(){ const r=base.getBoundingClientRect(); touch.stickCx=r.left+r.width/2; touch.stickCy=r.top+r.height/2; }
  updateStickPosition(); window.addEventListener('resize', updateStickPosition);
  function moveKnob(cx,cy){ let dx=cx-touch.stickCx, dy=cy-touch.stickCy; const d=Math.hypot(dx,dy); if(d>STICK_R){dx=(dx/d)*STICK_R; dy=(dy/d)*STICK_R;} knob.style.transform=`translate(${dx}px,${dy}px)`; if(Math.hypot(dx,dy)<8){touch.mx=0;touch.my=0;} else {touch.mx=dx/STICK_R; touch.my=dy/STICK_R;} }
  stick.addEventListener('touchstart', e=>{ e.preventDefault(); updateStickPosition(); const t=e.changedTouches[0]; touch.stickId=t.identifier; touch.active=true; moveKnob(t.clientX,t.clientY); }, {passive:false});
  // Track joystick movement on the WHOLE document — players regularly slide
  // their thumb off the stick element while steering, especially toward the
  // bottom-right corner where the action buttons sit. If we only listened on
  // #tStick, the move/end events would fire on whatever element the finger
  // wandered onto, leaving touch.active=true with stale touch.mx/my pointing
  // at the FIRE button — which then locked the player's aim toward the
  // bottom-right of the screen. Listening on document fixes the stuck-aim bug.
  document.addEventListener('touchmove',  e=>{ if(touch.stickId<0) return; for(const t of e.changedTouches){ if(t.identifier===touch.stickId){ e.preventDefault(); moveKnob(t.clientX,t.clientY); } } }, {passive:false});
  function endStick(e){ for(const t of e.changedTouches){ if(t.identifier===touch.stickId){ touch.stickId=-1; touch.active=false; touch.mx=0; touch.my=0; knob.style.transform='translate(0,0)'; } } }
  document.addEventListener('touchend', endStick);
  document.addEventListener('touchcancel', endStick);
  function bindBtn(id,key){ const el=document.getElementById(id); if(!el) return; el.addEventListener('touchstart', e=>{ e.preventDefault(); el.classList.add('pressed'); touch[key]=true; if(key==='dash') touch.dashEdge=true; if(key==='ability') touch.abiEdge=true; if(key==='boss') touch.bossEdge=true; }, {passive:false}); const up=e=>{ e.preventDefault(); el.classList.remove('pressed'); touch[key]=false; }; el.addEventListener('touchend',up); el.addEventListener('touchcancel',up); }
  bindBtn('tAttack','attack'); bindBtn('tDash','dash'); bindBtn('tAbility','ability'); bindBtn('tBossSkill','boss');
  const reviveBtn = document.getElementById('tRevive');
  if(reviveBtn){
    const down = e=>{ e.preventDefault(); reviveBtn.classList.add('pressed'); keys['e'] = true; };
    const up   = e=>{ e.preventDefault(); reviveBtn.classList.remove('pressed'); keys['e'] = false; };
    reviveBtn.addEventListener('touchstart', down, {passive:false});
    reviveBtn.addEventListener('touchend',   up);
    reviveBtn.addEventListener('touchcancel',up);
  }
  // Mobile Leave button — visible only while downed/dead. Wires to the same
  // teardown the desktop top-right Leave button uses.
  const leaveDownedBtn = document.getElementById('tLeaveDowned');
  if(leaveDownedBtn){
    const fire = e=>{
      e.preventDefault();
      leaveDownedBtn.classList.add('pressed');
      try{ if(typeof _saveScoreOnLeave === 'function') _saveScoreOnLeave(); }catch(_){}
      try{ if(typeof clearInGameOverlays === 'function') clearInGameOverlays(); }catch(_){}
      try{ if(typeof leaveLobby === 'function') leaveLobby('menu'); }catch(_){}
    };
    leaveDownedBtn.addEventListener('touchstart', fire, {passive:false});
    leaveDownedBtn.addEventListener('click', fire);
  }
  cvs.addEventListener('touchmove', e=>e.preventDefault(), {passive:false});

  // ---- Aim settings icon + popup ----
  const aimIconEl = document.getElementById('aimSettingsIcon');
  const aimBarEl = document.getElementById('aimModeBar');
  function closeAimPopup(){ if(aimBarEl) aimBarEl.classList.remove('on'); if(aimIconEl) aimIconEl.classList.remove('open'); }
  function toggleAimPopup(e){ e.preventDefault(); const open = aimBarEl && aimBarEl.classList.contains('on'); if(open){ closeAimPopup(); } else { if(aimBarEl) aimBarEl.classList.add('on'); if(aimIconEl) aimIconEl.classList.add('open'); } }
  if(aimIconEl){
    aimIconEl.addEventListener('touchstart', toggleAimPopup, {passive:false});
    aimIconEl.addEventListener('click', toggleAimPopup);
  }
  const autoAimBtn = document.getElementById('btnAutoAim');
  const manualShootBtn = document.getElementById('btnManualShoot');
  if(autoAimBtn){
    autoAimBtn.addEventListener('touchstart', e=>{ e.preventDefault(); if(!mobileAimLocked){ setAimMode('auto'); closeAimPopup(); } }, {passive:false});
    autoAimBtn.addEventListener('click', ()=>{ if(!mobileAimLocked){ setAimMode('auto'); closeAimPopup(); } });
  }
  if(manualShootBtn){
    manualShootBtn.addEventListener('touchstart', e=>{ e.preventDefault(); if(!mobileAimLocked){ setAimMode('manual'); closeAimPopup(); } }, {passive:false});
    manualShootBtn.addEventListener('click', ()=>{ if(!mobileAimLocked){ setAimMode('manual'); closeAimPopup(); } });
  }
  const dragDropBtn = document.getElementById('btnDragDrop');
  if(dragDropBtn){
    dragDropBtn.addEventListener('touchstart', e=>{ e.preventDefault(); setAimMode('dragdrop'); closeAimPopup(); }, {passive:false});
    dragDropBtn.addEventListener('click', ()=>{ setAimMode('dragdrop'); closeAimPopup(); });
  }

  // ---- Right aim joystick (manual shoot mode) ----
  const aimStickEl = document.getElementById('tAimStick');
  const aimBaseEl = document.getElementById('tAimBase');
  const aimKnobEl = document.getElementById('tAimKnob');
  const AIM_R = 60;
  function updateAimStickPos(){ const r=aimBaseEl.getBoundingClientRect(); touch.aimStickCx=r.left+r.width/2; touch.aimStickCy=r.top+r.height/2; }
  if(aimBaseEl) updateAimStickPos();
  window.addEventListener('resize', ()=>{ if(aimBaseEl) updateAimStickPos(); });
  function moveAimKnob(cx,cy){ let dx=cx-touch.aimStickCx, dy=cy-touch.aimStickCy; const d=Math.hypot(dx,dy); if(d>AIM_R){dx=(dx/d)*AIM_R; dy=(dy/d)*AIM_R;} if(aimKnobEl) aimKnobEl.style.transform=`translate(${dx}px,${dy}px)`; if(Math.hypot(dx,dy)<8){touch.aimMx=0;touch.aimMy=0;touch.aimActive=false;touch.attack=false;} else {touch.aimMx=dx/AIM_R; touch.aimMy=dy/AIM_R; touch.aimActive=true; touch.attack=true;} }
  if(aimStickEl){
    aimStickEl.addEventListener('touchstart', e=>{ if(mobileAimMode!=='manual') return; e.preventDefault(); updateAimStickPos(); const t=e.changedTouches[0]; touch.aimStickId=t.identifier; moveAimKnob(t.clientX,t.clientY); }, {passive:false});
  }
  document.addEventListener('touchmove', e=>{ if(touch.aimStickId<0 || mobileAimMode!=='manual') return; for(const t of e.changedTouches){ if(t.identifier===touch.aimStickId){ e.preventDefault(); moveAimKnob(t.clientX,t.clientY); } } }, {passive:false});
  function endAimStick(e){ for(const t of e.changedTouches){ if(t.identifier===touch.aimStickId){ touch.aimStickId=-1; touch.aimActive=false; touch.aimMx=0; touch.aimMy=0; touch.attack=false; if(aimKnobEl) aimKnobEl.style.transform='translate(0,0)'; } } }
  document.addEventListener('touchend', endAimStick);
  document.addEventListener('touchcancel', endAimStick);

  // ---- Fire joystick (manual mode — fires in drag direction) ----
  const fireJoyEl = document.getElementById('tFireJoy');
  const fireBaseEl = document.getElementById('tFireBase');
  const fireKnobEl = document.getElementById('tFireKnob');
  const FIRE_R = 40;
  function updateFireJoyPos(){ if(!fireBaseEl) return; const r=fireBaseEl.getBoundingClientRect(); touch.fireJoyCx=r.left+r.width/2; touch.fireJoyCy=r.top+r.height/2; }
  if(fireBaseEl) updateFireJoyPos();
  window.addEventListener('resize', ()=>{ if(fireBaseEl) updateFireJoyPos(); });
  function moveFireKnob(cx,cy){ let dx=cx-touch.fireJoyCx, dy=cy-touch.fireJoyCy; const d=Math.hypot(dx,dy); if(d>FIRE_R){dx=(dx/d)*FIRE_R; dy=(dy/d)*FIRE_R;} if(fireKnobEl) fireKnobEl.style.transform=`translate(${dx}px,${dy}px)`; if(Math.hypot(dx,dy)<8){touch.fireJoyMx=0;touch.fireJoyMy=0;touch.fireJoyActive=false;touch.attack=false;} else {touch.fireJoyMx=dx/FIRE_R; touch.fireJoyMy=dy/FIRE_R; touch.fireJoyActive=true; touch.attack=true;} }
  if(fireJoyEl){
    fireJoyEl.addEventListener('touchstart', e=>{ if(mobileAimMode!=='manual') return; e.preventDefault(); updateFireJoyPos(); const t=e.changedTouches[0]; touch.fireJoyId=t.identifier; moveFireKnob(t.clientX,t.clientY); }, {passive:false});
  }
  document.addEventListener('touchmove', e=>{ if(touch.fireJoyId<0 || mobileAimMode!=='manual') return; for(const t of e.changedTouches){ if(t.identifier===touch.fireJoyId){ e.preventDefault(); moveFireKnob(t.clientX,t.clientY); } } }, {passive:false});
  function endFireJoy(e){ for(const t of e.changedTouches){ if(t.identifier===touch.fireJoyId){ touch.fireJoyId=-1; touch.fireJoyActive=false; touch.fireJoyMx=0; touch.fireJoyMy=0; touch.attack=false; if(fireKnobEl) fireKnobEl.style.transform='translate(0,0)'; } } }
  document.addEventListener('touchend', endFireJoy);
  document.addEventListener('touchcancel', endFireJoy);

  // ---- Drag-drop fire joystick (dragdrop mode — aims+fires in drag direction) ----
  const dragFireJoyEl = document.getElementById('tDragFireJoy');
  const dragFireBaseEl = document.getElementById('tDragFireBase');
  const dragFireKnobEl = document.getElementById('tDragFireKnob');
  const DRAG_FIRE_R = 40;
  function updateDragFirePos(){ if(!dragFireBaseEl) return; const r=dragFireBaseEl.getBoundingClientRect(); touch.dragFireCx=r.left+r.width/2; touch.dragFireCy=r.top+r.height/2; }
  if(dragFireBaseEl) updateDragFirePos();
  window.addEventListener('resize', ()=>{ if(dragFireBaseEl) updateDragFirePos(); });
  // While dragging: ONLY aims (no attack). Fire happens once on release.
  function moveDragFireKnob(cx,cy){ let dx=cx-touch.dragFireCx, dy=cy-touch.dragFireCy; const d=Math.hypot(dx,dy); if(d>DRAG_FIRE_R){dx=(dx/d)*DRAG_FIRE_R; dy=(dy/d)*DRAG_FIRE_R;} if(dragFireKnobEl) dragFireKnobEl.style.transform=`translate(${dx}px,${dy}px)`; if(Math.hypot(dx,dy)<8){touch.dragFireMx=0;touch.dragFireMy=0;touch.dragFireActive=false;} else {touch.dragFireMx=dx/DRAG_FIRE_R; touch.dragFireMy=dy/DRAG_FIRE_R; touch.dragFireActive=true;} }
  if(dragFireJoyEl){
    // New touch: always clears any existing lock and starts a fresh drag
    dragFireJoyEl.addEventListener('touchstart', e=>{ if(mobileAimMode!=='dragdrop') return; e.preventDefault(); touch.dragFireLocked=false; const dj=document.getElementById('tDragFireJoy'); if(dj) dj.classList.remove('locked'); updateDragFirePos(); const t=e.changedTouches[0]; touch.dragFireId=t.identifier; moveDragFireKnob(t.clientX,t.clientY); }, {passive:false});
  }
  document.addEventListener('touchmove', e=>{ if(touch.dragFireId<0 || mobileAimMode!=='dragdrop') return; for(const t of e.changedTouches){ if(t.identifier===touch.dragFireId){ e.preventDefault(); moveDragFireKnob(t.clientX,t.clientY); } } }, {passive:false});
  // On release: if the knob was dragged to a direction → fire ONCE, then spring back.
  function endDragFireJoy(e){ for(const t of e.changedTouches){ if(t.identifier===touch.dragFireId){ touch.dragFireId=-1; if(touch.dragFireActive&&(Math.abs(touch.dragFireMx)>0.1||Math.abs(touch.dragFireMy)>0.1)){ touch.dragFireShot=true; } touch.dragFireActive=false; touch.dragFireMx=0; touch.dragFireMy=0; touch.attack=false; if(dragFireKnobEl) dragFireKnobEl.style.transform='translate(0,0)'; } } }
  document.addEventListener('touchend', endDragFireJoy);
  document.addEventListener('touchcancel', endDragFireJoy);
}
initTouchUI();

function updateTouchCooldownUI(p){
  if(!IS_TOUCH || !p) return;
  const set = (id,cd,max)=>{ const el=document.getElementById(id); if(!el) return; const pct=max>0?Math.max(0,Math.min(100,(cd/max)*100)):0; el.style.setProperty('--cd', pct+'%'); el.classList.toggle('ready', cd<=0); };
  const h = HEROES[p.heroId];
  set('tAttack', p.atkCd, h.atkCd); set('tDash', p.dashCd, 2); set('tAbility', p.abiCd, h.abiCd);
  // Mobile Leave button auto-appears whenever the local player can no longer
  // play (downed in multi, or fully dead). Hidden again on respawn / revive.
  const leaveDownedBtn = document.getElementById('tLeaveDowned');
  if(leaveDownedBtn){
    const showIt = !!(p.downed || !p.alive);
    leaveDownedBtn.style.display = showIt ? '' : 'none';
  }
  // Boss-skill button: only visible when the player has acquired one.
  const bsBtn = document.getElementById('tBossSkill');
  if(bsBtn){
    if(p.bossSkill){
      bsBtn.style.display = '';
      bsBtn.style.borderColor = p.bossSkill.color;
      bsBtn.style.boxShadow = `0 0 22px ${p.bossSkill.color}aa, inset 0 0 14px ${p.bossSkill.color}55`;
      const lbl = bsBtn.querySelector('.bsLabel');
      if(lbl) lbl.textContent = p.bossSkill.name.length > 10 ? 'SKILL' : p.bossSkill.name;
      set('tBossSkill', p.bossSkill.cd, p.bossSkill.cdMax);
    } else {
      bsBtn.style.display = 'none';
    }
  }
}

function makeDefaultMods(){
  return { speed:1, cdr:1, dmg:1, range:1, atkSpd:1, shieldMax:0, aura:0, slow:0, regen:0, lifesteal:0 };
}

function makePlayer(heroId, x, y, isLocal=true, id=null){
  const h = HEROES[heroId];
  return {
    id: id || ('p'+Math.random().toString(36).slice(2,8)),
    name: state.username || 'Operator',
    heroId, isLocal, x, y, vx:0, vy:0,
    hp: h.hp, hpMax: h.hp, shield:0, angle:0,
    dashCd:0, atkCd:0, abiCd:0, dashing:0,
    score:0, kills:0, alive:true,
    mods: makeDefaultMods(),
    abiState: 0,
    // Boss-skill drop slot. null when empty; otherwise:
    // {id, name, color, phase, cd, cdMax}
    bossSkill: null,
  };
}

function canAuthorEnemies(){
  return !isMultiMode() || state.isHost;
}

// ============================================================================
// MULTIPLAYER BOSS-DAMAGE / FX REPLICATION HELPERS
// ----------------------------------------------------------------------------
// Boss AI runs only on the host (see canAuthorEnemies / bossAITick). Without
// these helpers, a joiner would never see boss skill telegraphs/beams/zones
// and would never take damage from them. The fix is two-pronged:
//   1) Host passively broadcasts every newly-pushed hostile fx + every newly-
//      spawned hostile bullet so joiners can render + simulate them locally.
//      Their existing updateFx / updateBullets logic will then naturally
//      damage the joiner's own state.player when the player intersects them.
//   2) For boss skills that apply damage *directly* (not via fx — e.g. the
//      teleport_strike / phantom_step / radial_collapse / dash_strike land
//      hits), the host iterates ALL players (local + remotes) for the radius
//      check and sends a 'bossHit' message to any non-local player it hits.
// ============================================================================
function _hitPlayer(p, dmg, opts){
  if(!p || p.alive===false || p.downed) return;
  if(p === state.player){
    let rem = +dmg || 0;
    if(p.shield > 0){ const a = Math.min(p.shield, rem); p.shield -= a; rem -= a; }
    p.hp -= rem;
    SFX.hurt();
    if(opts && opts.shake) shake(opts.shake);
    if(opts && opts.fx)    particles(p.x, p.y, opts.fx, 8, 220, 0.4, 2);
  } else if(state.isHost && activeRoom && p.id){
    try{
      activeRoom.send('bossHit', {
        targetId: p.id,
        dmg: +dmg || 0,
        shake: (opts && opts.shake) || 0,
      });
    }catch(e){}
  }
}
function _hitPlayersInRadius(x, y, r, dmg, opts){
  if(!canAuthorEnemies()) return;
  const lp = state.player;
  if(lp && lp.alive !== false && !lp.downed && Math.hypot(lp.x-x, lp.y-y) < r){
    _hitPlayer(lp, dmg, opts);
  }
  if(state.isHost && state.others && state.others.size){
    for(const o of state.others.values()){
      if(!o || o.alive===false || o.downed) continue;
      if(Math.hypot((o.x||0)-x, (o.y||0)-y) < r) _hitPlayer(o, dmg, opts);
    }
  }
}
function _hitPlayersInAnnulus(x, y, rMin, rMax, dmg, opts){
  if(!canAuthorEnemies()) return;
  const all = [];
  if(state.player) all.push(state.player);
  if(state.isHost && state.others) for(const o of state.others.values()) all.push(o);
  for(const p of all){
    if(!p || p.alive===false || p.downed) continue;
    const d = Math.hypot((p.x||0)-x, (p.y||0)-y);
    if(d >= rMin && d <= rMax) _hitPlayer(p, dmg, opts);
  }
}
// Passive scan: at end of host's update tick, broadcast any newly-pushed
// hostile fx the joiner hasn't seen yet. We mark each fx with `_sent=true`.
let _lastBossFxBroadcast = 0;
function broadcastHostileFx(dt){
  if(!activeRoom || !state.isHost || !state.fx || !state.fx.length) return;
  _lastBossFxBroadcast += dt || 0;
  if(_lastBossFxBroadcast < 0.05) return;
  _lastBossFxBroadcast = 0;
  const out = [];
  for(const f of state.fx){
    if(f._sent) continue;
    f._sent = true;
    // Skip player-owned/healing fx and pure cosmetic particles.
    if(f.heal || f._enemyZone || f.owner) continue;
    if(!f.warn && !f.beam && !f.ring && !f.zone && !f._shock && !f._pull && !f._flash) continue;
    out.push({
      warn:!!f.warn, beam:!!f.beam, ring:!!f.ring, zone:!!f.zone,
      _shock:!!f._shock, _pull:!!f._pull, _flash:!!f._flash, _shrink:!!f._shrink,
      x:f.x, y:f.y, ax:f.ax, ay:f.ay, bx:f.bx, by:f.by,
      r:f.r, _maxR:f._maxR, color:f.color,
      life:f.life, life0:f.life0,
      beamFireAt:f.beamFireAt, beamWidth:f.beamWidth,
      dmg:f.dmg, dps:f.dps,
      bossId: f._bossRef ? f._bossRef.id : undefined,
    });
  }
  if(out.length){ try{ activeRoom.send('bossFx', { fx: out }); }catch(e){} }
}
// Passive scan: same idea for hostile bullets spawned by boss skills.
let _lastBossBulletBroadcast = 0;
function broadcastHostileBullets(dt){
  if(!activeRoom || !state.isHost || !state.bullets || !state.bullets.length) return;
  _lastBossBulletBroadcast += dt || 0;
  if(_lastBossBulletBroadcast < 0.05) return;
  _lastBossBulletBroadcast = 0;
  const out = [];
  for(const b of state.bullets){
    if(b._sent) continue;
    b._sent = true;
    if(!b.hostile) continue;
    out.push({
      x:b.x, y:b.y, vx:b.vx, vy:b.vy,
      color:b.color, radius:b.radius,
      life:b.life, dmg:b.dmg,
      hostile: true,
    });
  }
  if(out.length){ try{ activeRoom.send('bossBullets', { bullets: out }); }catch(e){} }
}
function broadcastPurgeFx(){
  if(!activeRoom || !state.isHost) return;
  try{ activeRoom.send('purgeFx', {}); }catch(e){}
}

function makeEnemy(data){
  return {
    id: data.id || ('e'+(state.enemySeq++)),
    type: data.type,
    x: data.x,
    y: data.y,
    rx: data.x,
    ry: data.y,
    hp: data.hp,
    hpMax: data.hpMax,
    sp: data.sp,
    r: data.r,
    dmg: data.dmg,
    col: data.col,
    cd: data.cd || 0,
    jitter: data.jitter || 0,
    fromWave: data.fromWave || state.wave,
    isBoss: !!data.isBoss,
    isMinion: !!data.isMinion,
    bossPhase: data.bossPhase || 0,
  };
}

// ---------- Enemies / bullets / fx ----------
function spawnEnemy(){
  const a=state.arena, side=Math.floor(Math.random()*4); let x,y;
  if(side===0){x=Math.random()*a.w;y=-20;} else if(side===1){x=a.w+20;y=Math.random()*a.h;}
  else if(side===2){x=Math.random()*a.w;y=a.h+20;} else {x=-20;y=Math.random()*a.h;}
  const tier=Math.min(20, state.wave);
  const w = state.wave;
  // Weighted type pool that expands with wave number (waves 1-99)
  const pool = [
    // Wave 1+ (core starters)
    { t:'drone',      w:36 },
    { t:'brute',      w:22 },
    // Wave 3+
    { t:'charger',    w: w>=3  ? 14 : 0 },
    // Wave 4+
    { t:'phantom',    w: w>=4  ? 16 : 0 },
    { t:'swarm',      w: w>=4  ? 13 : 0 },
    // Wave 5+
    { t:'sniper',     w: w>=5  ? 12 : 0 },
    // Wave 6+
    { t:'bomber',     w: w>=6  ? 10 : 0 },
    // Wave 7+
    { t:'tank',       w: w>=7  ? 10 : 0 },
    // Wave 8+
    { t:'ripper',     w: w>=8  ? 11 : 0 },
    // Wave 9+
    { t:'specter',    w: w>=9  ? 8  : 0 },
    // Wave 10+
    { t:'healer',     w: w>=10 ? 9  : 0 },
    { t:'shielder',   w: w>=10 ? 8  : 0 },
    // Wave 12+
    { t:'lurker',     w: w>=12 ? 9  : 0 },
    { t:'crawler',    w: w>=12 ? 10 : 0 },
    // Wave 14+
    { t:'nova',       w: w>=14 ? 8  : 0 },
    // Wave 15+
    { t:'burst',      w: w>=15 ? 9  : 0 },
    { t:'parasite',   w: w>=15 ? 7  : 0 },
    // Wave 17+
    { t:'juggernaut', w: w>=17 ? 7  : 0 },
    // Wave 18+
    { t:'assassin',   w: w>=18 ? 10 : 0 },
    { t:'stalker',    w: w>=18 ? 8  : 0 },
    // Wave 20+
    { t:'leech',      w: w>=20 ? 7  : 0 },
    { t:'reaver',     w: w>=20 ? 8  : 0 },
    // Wave 22+
    { t:'colossus',   w: w>=22 ? 6  : 0 },
    { t:'corruptor',  w: w>=22 ? 7  : 0 },
    // Wave 25+
    { t:'voidling',   w: w>=25 ? 8  : 0 },
    { t:'wraith',     w: w>=25 ? 7  : 0 },
    // Wave 28+
    { t:'pulsebomb',  w: w>=28 ? 6  : 0 },
    // Wave 30+
    { t:'splitter',   w: w>=30 ? 6  : 0 },
    { t:'dreadnought',w: w>=30 ? 5  : 0 },
    // Wave 35+
    { t:'mimic',      w: w>=35 ? 6  : 0 },
    { t:'eclipse',    w: w>=35 ? 5  : 0 },
    // Wave 40+
    { t:'harbinger',  w: w>=40 ? 5  : 0 },
    { t:'decimator',  w: w>=40 ? 4  : 0 },
    // Wave 45+
    { t:'abomination',w: w>=45 ? 4  : 0 },
    { t:'nullcaster',  w: w>=45 ? 5  : 0 },
    // Wave 50+
    { t:'apex',       w: w>=50 ? 4  : 0 },
    { t:'revenant',   w: w>=50 ? 4  : 0 },
    // Wave 60+
    { t:'godspawn',   w: w>=60 ? 4  : 0 },
    // Wave 75+
    { t:'terminus',   w: w>=75 ? 3  : 0 },
    // Wave 90+
    { t:'oblivion',   w: w>=90 ? 3  : 0 },
  ].filter(e=>e.w>0);
  const totalW = pool.reduce((s,e)=>s+e.w, 0);
  let rng = Math.random()*totalW, type='drone';
  for(const e of pool){ rng-=e.w; if(rng<=0){ type=e.t; break; } }

  const bases = {
    // --- Original types ---
    drone:      {hp:35,  sp:100, r:11, dmg:10,  col:'#22e8ff'},
    brute:      {hp:90,  sp:70,  r:18, dmg:18,  col:'#ff3d6a'},
    phantom:    {hp:55,  sp:130, r:13, dmg:14,  col:'#9d5cff'},
    swarm:      {hp:20,  sp:190, r:7,  dmg:8,   col:'#c8ff00'},
    sniper:     {hp:45,  sp:85,  r:12, dmg:22,  col:'#ff2bd6'},
    bomber:     {hp:160, sp:55,  r:21, dmg:14,  col:'#ff8a3d'},
    tank:       {hp:220, sp:60,  r:20, dmg:26,  col:'#b84a2a'},
    specter:    {hp:40,  sp:155, r:11, dmg:12,  col:'#7fffca'},
    charger:    {hp:28,  sp:260, r:9,  dmg:20,  col:'#ff5500'},
    healer:     {hp:70,  sp:65,  r:13, dmg:6,   col:'#00ff88'},
    lurker:     {hp:60,  sp:80,  r:12, dmg:18,  col:'#5500aa'},
    burst:      {hp:55,  sp:110, r:14, dmg:22,  col:'#ffaa00'},
    assassin:   {hp:30,  sp:290, r:8,  dmg:25,  col:'#ff00aa'},
    colossus:   {hp:500, sp:30,  r:28, dmg:35,  col:'#884400'},
    voidling:   {hp:45,  sp:170, r:10, dmg:16,  col:'#220055'},
    splitter:   {hp:80,  sp:90,  r:16, dmg:14,  col:'#55aaff'},
    // --- New wave 8-20 types ---
    ripper:     {hp:50,  sp:200, r:10, dmg:28,  col:'#ff4477'},  // fast razor slasher
    shielder:   {hp:180, sp:45,  r:19, dmg:20,  col:'#4488ff'},  // high def, front shield
    crawler:    {hp:35,  sp:240, r:8,  dmg:15,  col:'#88ff44'},  // hugs ground, erratic
    nova:       {hp:65,  sp:75,  r:14, dmg:18,  col:'#ff88ff'},  // explodes in nova on death
    parasite:   {hp:40,  sp:120, r:10, dmg:12,  col:'#aaff00'},  // latches & drains HP
    juggernaut: {hp:350, sp:50,  r:24, dmg:30,  col:'#cc6600'},  // armored walking fortress
    stalker:    {hp:45,  sp:150, r:11, dmg:20,  col:'#553399'},  // cloaks until close range
    // --- New wave 20-35 types ---
    leech:      {hp:55,  sp:100, r:12, dmg:10,  col:'#dd0055'},  // heals off nearby enemies
    reaver:     {hp:75,  sp:130, r:13, dmg:24,  col:'#ff6622'},  // berserks below 50% hp
    corruptor:  {hp:90,  sp:70,  r:15, dmg:14,  col:'#9900cc'},  // debuffs player move speed
    wraith:     {hp:50,  sp:200, r:11, dmg:20,  col:'#aaccff'},  // semi-transparent, teleports
    pulsebomb:  {hp:120, sp:55,  r:18, dmg:12,  col:'#ffdd00'},  // EMP pulse on death
    dreadnought:{hp:600, sp:25,  r:30, dmg:40,  col:'#553322'},  // ultra-tank, area stomp
    // --- New wave 35-50 types ---
    mimic:      {hp:65,  sp:160, r:13, dmg:22,  col:'#22ffcc'},  // copies player hero color
    eclipse:    {hp:80,  sp:110, r:14, dmg:26,  col:'#000066'},  // darkens local arena
    harbinger:  {hp:100, sp:90,  r:16, dmg:28,  col:'#ff0033'},  // calls reinforcements
    decimator:  {hp:400, sp:40,  r:26, dmg:45,  col:'#992200'},  // carpet-bombs path
    // --- New wave 45-60 types ---
    abomination:{hp:700, sp:35,  r:32, dmg:50,  col:'#446600'},  // mutating multi-phase mini-boss
    nullcaster: {hp:70,  sp:100, r:13, dmg:20,  col:'#6600cc'},  // silences nearby upgrade auras
    apex:       {hp:90,  sp:180, r:12, dmg:35,  col:'#ff2200'},  // evolved assassin, near-instant
    revenant:   {hp:55,  sp:140, r:11, dmg:18,  col:'#ccccff'},  // respawns once on death
    // --- New wave 60-99 types ---
    godspawn:   {hp:250, sp:120, r:20, dmg:40,  col:'#ffcc00'},  // fractal god-realm enemy
    terminus:   {hp:900, sp:20,  r:36, dmg:60,  col:'#ff0000'},  // wave-99 titan, boss-tier
    oblivion:   {hp:1200,sp:15,  r:40, dmg:80,  col:'#110022'},  // final tier, reality-shredder
  };
  const base = bases[type] || bases.drone;

  if(type==='swarm'){
    // Spawn cluster of 3 swarm enemies
    for(let i=0;i<3;i++){
      const sx=x+(Math.random()-0.5)*70, sy=y+(Math.random()-0.5)*70;
      const e=makeEnemy({type,x:sx,y:sy,hp:base.hp*(1+tier*0.18),hpMax:base.hp*(1+tier*0.18),sp:base.sp*(1+tier*0.05),r:base.r,dmg:base.dmg*(1+tier*0.12),col:base.col,cd:0,jitter:Math.random()*Math.PI*2,fromWave:w});
      state.enemies.push(e); state.waveEnemiesAlive++;
    }
    return;
  }
  const enemy = makeEnemy({type,x,y,hp:base.hp*(1+tier*0.22),hpMax:base.hp*(1+tier*0.22),sp:base.sp*(1+tier*0.07),r:base.r,dmg:base.dmg*(1+tier*0.13),col:base.col,cd:0,jitter:Math.random()*Math.PI*2,fromWave:w});
  state.enemies.push(enemy);
  state.waveEnemiesAlive++;
  return enemy;
}
function serializeEnemy(e){
  return { id:e.id, type:e.type, x:e.x|0, y:e.y|0, hp:+e.hp.toFixed(2), hpMax:e.hpMax, sp:e.sp, r:e.r, dmg:e.dmg, col:e.col, cd:+e.cd.toFixed(3), jitter:+e.jitter.toFixed(3), fromWave:e.fromWave, isBoss:!!e.isBoss, isMinion:!!e.isMinion, bossPhase:e.bossPhase||0 };
}
function spawnBullet(o){ state.bullets.push(Object.assign({life:1.2,radius:5,piercing:0,trail:[]}, o)); }
function particles(x,y,color,count=12,spd=180,life=0.5,radius=2){
  for(let i=0;i<count;i++){ const a=Math.random()*Math.PI*2, s=spd*(0.4+Math.random()*0.8); state.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,life0:life,color,r:radius*(0.6+Math.random()*0.8)}); }
}
function shake(amt){ state.cam.shake = Math.min(20, state.cam.shake + amt); }

// ---------- Game lifecycle ----------
function startGame(mode='single'){
  state.mode = mode;
  state.enemies.length=0; state.bullets.length=0; state.fx.length=0; state.pickups.length=0;
  state.pickupSeq = 1;
  if(activeRoom && state.isHost){ try{ activeRoom.send('pickupClear', {}); }catch(e){} }
  state.others.clear();
  state.time=0; state.score=0; state.kills=0; state.fracture=0;
  state.wave=0; state.wavePhase='prep'; state.waveTimer=WAVE_PREP;
  state.waveSpawnTimer=0; state.waveToSpawn=0; state.waveEnemiesAlive=0;
  state.upgradeChosenForWave = 0; state.upgradeOpenForWave = 0;
  state.reviveHoldTime = 0; state.reviveTarget = null; state.beingRevivedTime = 0;
  state.paused=false; state.running=true;
  state.cam.shake=0;
  state.enemySeq = 1;
  lastEnemyBroadcast = 0;
  state.god = null;
  const a = state.arena;
  state.player = makePlayer(state.hero, a.w/2, a.h/2, true);
  state.player.name = state.username || 'Operator';
  state.startedAt = performance.now();
  // Yachiyu forces manual shoot mode; all other heroes default to auto aim
  if(IS_TOUCH){
    if(state.hero === 'yachiyu'){
      mobileAimLocked = true;
      setAimMode('dragdrop');
    } else {
      mobileAimLocked = false;
      setAimMode('auto');
    }
  }
  setScene('game');
  hideUpgrade();
  $('#hpName').textContent = HEROES[state.hero].name.toUpperCase();
  $('#pillRoom').textContent = isMultiMode() ? `ROOM ${state.roomCode}` : (isGodMode() ? '⚡ GOD MODE' : 'SOLO RUN');
  $('#pillAlive').textContent = '';
  if(isGodMode()){
    refreshZoom();   // wider FOV in God Mode (mobile)
    GOD.start();
  } else {
    refreshZoom();
    startWavePrep(1);
  }
}

function endGame(victory=false){
  state.running=false; setScene('endScreen');
  clearInGameOverlays();
  $('#endTitle').textContent = victory ? (isGodMode() ? 'YOU SLEW THE LAST GOD' : 'Victory') : 'You Died';
  $('#endScore').textContent = state.score|0;
  const t=state.time|0;
  const phaseLabel = isGodMode() ? `Reached Phase ${state.god ? state.god.phase : 1}/10` : `Wave ${state.wave}`;
  $('#endStats').innerHTML = `Survived ${Math.floor(t/60)}m ${t%60}s · ${state.kills} kills · ${phaseLabel}`;
  try{ hideBossBar(); }catch(e){}
  // Save score to online leaderboard
  saveLBEntry({
    name: state.username || 'Operator',
    hero: (HEROES[state.hero] || {}).name || state.hero,
    score: state.score|0,
    wave: state.wave || 0,
    time: `${Math.floor(t/60)}m ${t%60}s`,
    mode: state.mode,
  }).catch(()=>{});
  // Flush any per-kill SP that was buffered during this game run
  try{ flushSP(); }catch(_){}
  // Notify server that the game has ended so it resets phase → waiting,
  // allowing players to ready-up for a new game without reconnecting.
  if(isMultiMode() && activeRoom){
    try{ activeRoom.send('gameEnd', { score: state.score|0 }); }catch(e){}
    // Final score sync for leaderboard purposes
    try{ activeRoom.send('scoreSync', { score: state.score|0 }); }catch(_){}
  }
}

// ---------- Wave logic (classic) ----------
function showWaveBanner(big, sub, ms=2200){
  const el = document.getElementById('waveBanner');
  if(!el) return;
  document.getElementById('waveBigText').textContent = big;
  document.getElementById('waveSubText').textContent = sub || '';
  document.getElementById('waveCount').textContent = '';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(showWaveBanner._t);
  showWaveBanner._t = setTimeout(()=>el.classList.remove('show'), ms);
}
function _skipCountdownBtn(){
  let btn = document.getElementById('skipCountdownBtn');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'skipCountdownBtn';
    btn.textContent = 'skip countdown';
    Object.assign(btn.style, {
      position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)',
      zIndex:'9999', padding:'6px 18px', fontSize:'12px', fontFamily:'inherit',
      background:'rgba(255,255,255,0.08)', color:'#aee', border:'1px solid rgba(100,220,255,0.35)',
      borderRadius:'20px', cursor:'pointer', letterSpacing:'0.05em', backdropFilter:'blur(4px)',
      display:'none', transition:'opacity 0.2s',
    });
    btn.addEventListener('click', ()=>{
      if(isMultiMode() && activeRoom){
        try{ activeRoom.send('skipWaveCountdown', {}); }catch(_){}
      } else {
        _hideSkipBtn();
        try{ startWaveActive(); }catch(_){}
      }
    });
    document.body.appendChild(btn);
  }
  return btn;
}
function _showSkipBtn(){
  if(isGodMode()) return;
  const btn = _skipCountdownBtn();
  btn.style.display = 'block';
  btn.style.opacity = '1';
}
function _hideSkipBtn(){
  const btn = document.getElementById('skipCountdownBtn');
  if(btn) btn.style.display = 'none';
}
function updateWaveCountdown(n){
  const el = document.getElementById('waveBanner');
  if(!el) return;
  el.style.display='block';
  document.getElementById('waveBigText').textContent = `WAVE ${state.wave}`;
  document.getElementById('waveSubText').textContent = 'INCOMING IN';
  document.getElementById('waveCount').textContent = n>0 ? String(n) : 'GO!';
  if(n > 0) _showSkipBtn(); else _hideSkipBtn();
}
function hideWaveBanner(){
  const el = document.getElementById('waveBanner');
  if(el){ el.classList.remove('show'); el.style.display='none'; }
  _hideSkipBtn();
}
function startWavePrep(n){
  state.wave = n;
  state.wavePhase = 'prep';
  state.waveTimer = WAVE_PREP;
  state.waveToSpawn = WAVE_ENEMIES(n);
  state.waveEnemiesAlive = 0;
  state.waveSpawnTimer = 0;
  state.upgradeChosenForWave = 0;
  state.upgradeOpenForWave = 0;
  showWaveBanner(`WAVE ${n}`, 'PREPARE', 2200);
  toast(`Wave ${n} incoming in ${WAVE_PREP}s`, 1800);
}
function startWaveActive(){
  state.wavePhase = 'active';
  _hideSkipBtn();
  hideWaveBanner();
  showWaveBanner(`WAVE ${state.wave}`, 'FIGHT!', 1400);
  shake(6);
}
function endWave(){
  if(state.wave % 5 === 0 && !isGodMode()){
    spawnEndlessBoss();
    return;
  }
  state.wavePhase = 'upgrade';
  showWaveBanner(`WAVE ${state.wave} CLEARED`, 'CHOOSE UPGRADE', 1800);
  showUpgradePicker();
}

function spawnEndlessBoss(){
  // Phase index 0-10 from BOSS_PHASES; cycles after phase 11 (index 10).
  // wave 5 → phase 1 (idx 0), wave 10 → phase 2 (idx 1), …, wave 55+ → two bosses.
  const cycle = Math.floor(state.wave / 5) - 1;
  const phaseIdx = cycle % 11;
  const bossCount = cycle >= 11 ? 2 : 1;
  const phaseDef = BOSS_PHASES[phaseIdx];
  state.wavePhase = 'boss_wave';
  state.endlessBossCount = bossCount;
  state.endlessBossKills = 0;
  showWaveBanner(`WAVE ${state.wave} — BOSS!`, phaseDef.name.toUpperCase(), 2000);
  shake(18);
  // Keep classic mode BGM — don't override with boss theme in endless waves
  const a = state.arena;
  for(let i = 0; i < bossCount; i++){
    const baseHp = 700 * phaseDef.hpMul;
    const sp = phaseIdx === 10 ? 270 : (50 + (phaseIdx + 1) * 4);
    const offsetX = bossCount === 1 ? 0 : (i === 0 ? -110 : 110);
    const e = makeEnemy({
      type: 'boss',
      x: a.w / 2 + offsetX, y: 120,
      hp: baseHp, hpMax: baseHp,
      sp, r: phaseDef.radius,
      dmg: Math.round((22 + (phaseIdx + 1) * 5) * BOSS_DMG_MUL),
      col: phaseDef.color,
      cd: 0,
      isBoss: true,
      bossPhase: phaseIdx + 1,
    });
    // makeEnemy() only copies whitelisted fields — set DLC-style properties
    // directly so endlessBossAITick / damageEnemy / death handler can find them.
    e._endlessBoss = true;
    e._phaseIdx = phaseIdx;
    state.enemies.push(e);
    particles(e.x, e.y, phaseDef.color, 80, 400, 1.0, 4);
    state.fx.push({x: e.x, y: e.y, vx: 0, vy: 0, life: 0.9, life0: 0.9, color: phaseDef.color, r: phaseDef.radius * 2.5, ring: true});
  }
  showBossBar(phaseDef.name);
}

function endlessBossAITick(boss, dt, target){
  if(!boss || boss.dead || boss.invincible) return;
  // Reuse the God mode boss AI by spoofing state.god temporarily
  const savedGod = state.god;
  const savedMode = state.mode;
  const phaseIdx = boss._phaseIdx || 0;
  boss._ebSkillCooldowns = boss._ebSkillCooldowns || {};
  if(boss._ebTelegraphCd === undefined) boss._ebTelegraphCd = 3.0;
  boss._ebSkillIdx = boss._ebSkillIdx || 0;
  state.mode = 'god';
  state.god = {
    phase: phaseIdx + 1,
    skillCooldowns: boss._ebSkillCooldowns,
    bossTelegraphCooldown: boss._ebTelegraphCd,
    skillIndex: boss._ebSkillIdx,
    mode: 'fight',
    boss: boss,
    pickupTimer: 99, pickupSpawnCount: 0,
  };
  GOD.bossAITick(boss, dt, target);
  boss._ebTelegraphCd = state.god.bossTelegraphCooldown;
  boss._ebSkillIdx = state.god.skillIndex;
  boss._ebSkillCooldowns = state.god.skillCooldowns;
  state.mode = savedMode;
  state.god = savedGod;
}

let lastT = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now-lastT)/1000); lastT=now;
  if(state.scene==='game' && state.running && !state.paused) update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt){
  state.time += dt;
  const stage = Math.min(5, Math.floor(state.wave/2));
  if(stage>state.fracture && !isGodMode()){ state.fracture=stage; toast(`FRACTURE STAGE ${stage}`, 1600); shake(6); }

  const waveAuthority = canAuthorEnemies();

  if(isGodMode()){
    GOD.update(dt, waveAuthority);
  } else if(waveAuthority){
    if(state.wavePhase === 'prep'){
      state.waveTimer -= dt;
      const remaining = Math.ceil(state.waveTimer);
      updateWaveCountdown(remaining);
      if(state.waveTimer <= 0) startWaveActive();
    } else if(state.wavePhase === 'active'){
      if(state.waveToSpawn > 0){
        state.waveSpawnTimer -= dt;
        if(state.waveSpawnTimer <= 0){
          state.waveSpawnTimer = WAVE_SPAWN_INTERVAL(state.wave);
          spawnEnemy();
          state.waveToSpawn--;
        }
      } else if(state.waveEnemiesAlive <= 0){
        endWave();
      }
    }
  } else if(state.wavePhase === 'prep'){
    updateWaveCountdown(Math.max(0, Math.ceil(state.waveTimer)));
  }

  updatePlayer(state.player, dt, true);
  if(waveAuthority){
    updateEnemies(dt);
    // Safety: if all endless bosses are gone but wavePhase is still boss_wave, advance
    if(!isGodMode() && state.wavePhase === 'boss_wave' && !state.enemies.some(e => e._endlessBoss)){
      hideBossBar();
      state.wavePhase = 'upgrade';
      if(state.upgradeChosenForWave !== state.wave){
        showWaveBanner(`WAVE ${state.wave} CLEARED`, 'CHOOSE UPGRADE', 1800);
        showUpgradePicker();
      }
    }
  } else {
    interpolateEnemies(dt);
    updateEnemyContacts(dt);
  }
  updateBullets(dt); updateFx(dt);
  if(isGodMode()) updatePickups(dt);

  const viewW = W / ZOOM, viewH = H / ZOOM;
  const tx = Math.max(0, Math.min(state.arena.w - viewW, state.player.x - viewW / 2));
  const ty = Math.max(0, Math.min(state.arena.h - viewH, state.player.y - viewH / 2));
  state.cam.x += (tx-state.cam.x)*0.22; state.cam.y += (ty-state.cam.y)*0.22;
  state.cam.x = Math.max(0, Math.min(Math.max(0, state.arena.w - viewW), state.cam.x));
  state.cam.y = Math.max(0, Math.min(Math.max(0, state.arena.h - viewH), state.cam.y));
  state.cam.shake *= 0.85;

  // God mode: score earned by defeating boss phases (see onBossDefeated).
  // Classic/multi: kills only — no time bonus (time is shown separately in the timer pill).
  if(!isGodMode()){
    state.score = state.kills * 25;
  }

  const p = state.player;
  $('#hpVal').textContent = `${Math.max(0,Math.ceil(p.hp))}${p.shield>0?'+'+Math.ceil(p.shield):''}/${Math.ceil(p.hpMax)}`;
  $('#hpBar').style.width = (Math.max(0,p.hp)/p.hpMax*100)+'%';
  const mins=Math.floor(state.time/60), secs=Math.floor(state.time%60);
  $('#pillTime').textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  // SP pill — always visible; grayed out + hint icon when not signed in
  (function(){
    const loggedIn = !!window.__nsProfileLoggedIn;
    const pill = $('#pillScore');
    const txt = document.getElementById('pillScoreText');
    const hint = document.getElementById('pillScoreHint');
    if(txt) txt.textContent = loggedIn ? `SP ${state.score}` : 'SP 0';
    if(hint){
      hint.style.display = loggedIn ? 'none' : 'inline-block';
      if(!hint._wired){ hint._wired=true; hint.addEventListener('click', e=>{ e.stopPropagation(); try{ toast('Sign in to receive SP points', 2200); }catch(_){} if(window.__nsShowAccountModal) window.__nsShowAccountModal(); }); }
    }
    pill.style.opacity   = loggedIn ? '' : '0.45';
    pill.style.filter    = loggedIn ? '' : 'grayscale(0.6)';
    pill.style.display = '';
    pill.style.flexDirection = 'row';
    pill.style.alignItems = 'center';
    pill.style.gap = '0';
  })();
  $('#pillKills').textContent = `KILLS ${state.kills}`;
  if(isGodMode() && state.god){
    $('#pillFract').textContent = `PHASE ${state.god.phase}/10`;
  } else {
    $('#pillFract').textContent = `WAVE ${state.wave}`;
  }
  $('#cdDash').className='k'+(p.dashCd<=0?' ready':''); $('#cdDash').textContent = p.dashCd<=0?'DASH':'DASH '+p.dashCd.toFixed(1);
  $('#cdAtk').className ='k'+(p.atkCd<=0?' ready':'');  $('#cdAtk').textContent  = p.atkCd<=0?'LMB':'LMB '+p.atkCd.toFixed(1);
  $('#cdAbi').className ='k'+(p.abiCd<=0?' ready':'');  $('#cdAbi').textContent  = p.abiCd<=0?'Q':'Q '+p.abiCd.toFixed(1);
  updateTouchCooldownUI(p);

  if(isMultiMode()){
    interpolateOthers(dt);
    // Continuously ensure every lobby player is in state.others.
    // This is a cheap O(n) check that fixes any missed seed or delayed join.
    state.lobby.players.forEach((p, id) => {
      if(id === state.mySessionId) return;
      if(!state.others.has(id)){
        const heroId = safeHeroId(p.heroId);
        state.others.set(id, {
          id, heroId, name: p.name||'Player',
          x: state.arena.w/2, y: state.arena.h/2,
          rx: state.arena.w/2, ry: state.arena.h/2,
          angle: 0, hp: HEROES[heroId].hp, hpMax: HEROES[heroId].hp,
          alive: true, downed: false, mods: makeDefaultMods()
        });
      }
    });
    $('#pillAlive').textContent = `ALIVE ${1 + state.others.size}`;
    broadcastTick(dt);
    if(state.isHost){
      broadcastEnemyState(dt);
      // Replicate boss skill visuals + damage to joiners.
      broadcastHostileFx(dt);
      broadcastHostileBullets(dt);
    }
  }

  if(p.hp<=0 && p.alive){
    p.alive=false; particles(p.x,p.y,'#ff3d6a',40,260,0.9,3); shake(14);
    if(isMultiMode()){
      p.downed = true; p.hp = 0; p.vx = 0; p.vy = 0;
      // Save SP/score to DB immediately on death so it's not lost if teammates survive
      try{
        const _t=state.time|0, _m=Math.floor(_t/60), _s=_t%60;
        saveLBEntry({ name: state.username||'Operator', hero:(HEROES[state.hero]||{}).name||state.hero, score: state.score|0, wave: state.wave||0, mode: state.mode||'multi', time:`${String(_m).padStart(2,'0')}m ${String(_s).padStart(2,'0')}s` }).catch(()=>{});
        try{ flushSP(); }catch(_){} // flush any pending kill SP
      }catch(_){}
      toast('YOU ARE DOWN — wait for a teammate to revive (E)', 2400);
      try{ broadcastTick(1); }catch(e){}
      setTimeout(()=>{
        const anyAliveOther = [...state.others.values()].some(o => o && o.alive !== false && !o.downed);
        if(!anyAliveOther) endGame(false);
      }, 600);
    } else {
      setTimeout(()=>endGame(false), 400);
    }
  }
  if(isMultiMode()){ updateReviveInteraction(state.player, dt); }
}

function updatePlayer(p, dt, isLocal){
  const h = HEROES[p.heroId];
  if(p.downed){ p.vx = 0; p.vy = 0; return; }
  let mx = touch.active ? touch.mx : ((keys['d']?1:0)-(keys['a']?1:0));
  let my = touch.active ? touch.my : ((keys['s']?1:0)-(keys['w']?1:0));
  if(!isLocal){ mx=0; my=0; }
  const len=Math.hypot(mx,my)||1; mx/=len; my/=len;
  // fracture drift removed — was causing uncontrollable player movement at fracture ≥ 3
  // time_freeze_pulse skill applies a 50% slow until p.timeFreezeUntil expires.
  const tfSlow = (p.timeFreezeUntil && state.time < p.timeFreezeUntil) ? 0.5 : 1.0;
  const speed = h.speed*p.mods.speed*(p.dashing>0?2.6:1)*((state.fracture>=4 && !isGodMode())?(1+Math.sin(state.time*2)*0.15):1) * tfSlow;
  p.vx=mx*speed; p.vy=my*speed;
  p.x+=p.vx*dt; p.y+=p.vy*dt;
  p.x=Math.max(20,Math.min(state.arena.w-20,p.x)); p.y=Math.max(20,Math.min(state.arena.h-20,p.y));
  if(isLocal){
    if(IS_TOUCH){
      if(mobileAimMode === 'manual'){
        // MANUAL: fire joystick aims + fires in the drag direction
        if(touch.fireJoyActive && (touch.fireJoyMx || touch.fireJoyMy)){
          p.angle = Math.atan2(touch.fireJoyMy, touch.fireJoyMx);
        }
        // else: keep previous angle (no snap when not dragging)
      } else if(mobileAimMode === 'dragdrop'){
        // DRAG FIRE: while dragging = aim, on release = fire once (dragFireShot)
        if(touch.dragFireActive && (touch.dragFireMx || touch.dragFireMy)){
          p.angle = Math.atan2(touch.dragFireMy, touch.dragFireMx);
        }
        if(touch.dragFireShot){ touch.dragFireShot=false; if(p.atkCd<=0) doAttack(p); }
        // else: keep previous angle
      } else {
      // AUTO AIM: aim at nearest visible enemy, fallback to joystick direction
      // MOBILE aim. Never falls back to mouse coords (they default to 0,0
      // and can be spuriously updated by synthesized touch events on the
      // bottom-right action buttons, which would yank the slash toward
      // the FIRE button). Priority:
      //   1) Nearest enemy actually visible on screen — feels intuitive,
      //      and melee/short-range heroes always hit what you can see.
      //   2) Joystick direction if the player is actively steering and no
      //      visible enemy is around.
      //   3) Otherwise keep the previous facing (no snap).
      const viewW = W / ZOOM, viewH = H / ZOOM;
      const halfW = viewW * 0.5 + 60, halfH = viewH * 0.5 + 60;
      let best=null, bd=Infinity;
      for(const e of state.enemies){
        const dx=e.x-p.x, dy=e.y-p.y;
        if(Math.abs(dx) > halfW || Math.abs(dy) > halfH) continue;
        const d = dx*dx + dy*dy;
        if(d < bd){ bd=d; best=e; }
      }
      if(best){
        p.angle = Math.atan2(best.y - p.y, best.x - p.x);
      } else {
        if(touch.active && (touch.mx || touch.my)){
          p.angle = Math.atan2(touch.my, touch.mx);
        }
        // else: keep previous angle
      }
      }
    } else if(!mouse.moved){
      // DESKTOP idle: auto-aim at nearest enemy until the player moves the mouse
      let best=null,bd=Infinity;
      for(const e of state.enemies){ const dx=e.x-p.x,dy=e.y-p.y,d=dx*dx+dy*dy; if(d<bd){bd=d;best=e;} }
      if(best){ p.angle=Math.atan2(best.y-p.y,best.x-p.x); }
    } else {
      const wx=mouse.x/ZOOM+state.cam.x, wy=mouse.y/ZOOM+state.cam.y;
      p.angle=Math.atan2(wy-p.y,wx-p.x);
    }
  }
  p.dashCd=Math.max(0,p.dashCd-dt); p.atkCd=Math.max(0,p.atkCd-dt); p.abiCd=Math.max(0,p.abiCd-dt); p.dashing=Math.max(0,p.dashing-dt);
  if(p.bossSkill){ p.bossSkill.cd = Math.max(0, p.bossSkill.cd - dt); }
  if(isLocal && (keys[' ']||touch.dashEdge) && p.dashCd<=0){ p.dashCd=2*p.mods.cdr; p.dashing=0.18; SFX.dash(); particles(p.x,p.y,h.color,16,220,0.4,2); queueAction({t:'dash'}); }
  touch.dashEdge=false;
  if(isLocal && (mouse.down||touch.attack) && p.atkCd<=0) doAttack(p);
  if(isLocal && (keys['q']||touch.abiEdge) && p.abiCd<=0) doAbility(p);
  touch.abiEdge=false;
  if(isLocal && (keys['f']||touch.bossEdge) && p.bossSkill && p.bossSkill.cd<=0) castPlayerBossSkill(p);
  touch.bossEdge=false;
  if(p.mods.regen>0) p.hp=Math.min(p.hpMax, p.hp+p.mods.regen*dt);
  if(p.mods.shieldMax>0) p.shield=Math.min(p.mods.shieldMax, p.shield+6*dt);
  if(p.mods.aura>0 && canAuthorEnemies()){ for(const e of state.enemies){ if(e.dead) continue; const dx=e.x-p.x,dy=e.y-p.y,d2=dx*dx+dy*dy; if(d2<130*130){ e.hp-=p.mods.aura*dt; if(Math.random()<0.2) particles(e.x,e.y,'#ff8a3d',1,40,0.3,2); if(e.hp<=0 && !e.dead) damageEnemy(e, 0, p); } } }
}

function doAttack(p){
  const h=HEROES[p.heroId]; p.atkCd=h.atkCd/p.mods.atkSpd; SFX.fire(p.heroId);
  const dmg=h.dmg*p.mods.dmg, range=h.range*p.mods.range, ang=p.angle;
  const authoritative = canAuthorEnemies();
  queueAction({t:'atk', a:+ang.toFixed(2)});
  if(p.heroId==='james'){
    // James: full 360° centered sword sweep anchored to the hero. The visual
    // is rendered as a tight pulsing flash directly ON the hero's body —
    // small enough that it can never visually extend toward the FIRE button
    // on a mobile screen, regardless of facing or range modifiers. The
    // hitbox uses the modified `range` (so range upgrades still feel good),
    // but the visual radius is clamped small and tied to the hero so it
    // stays glued to the character on every screen size.
    let hit=0;
    if(authoritative){
      for(const e of state.enemies){
        const d = Math.hypot(e.x-p.x, e.y-p.y);
        if(d < range + (e.r||0)){ damageEnemy(e, dmg, p); hit++; }
      }
    }
    state.fx.push({_centerSwing:true, owner:p, ownerId:p.id, x:p.x, y:p.y, vx:0, vy:0, color:h.color, life:0.28, life0:0.28});
    particles(p.x, p.y, h.color, 22, 240, 0.4, 5);
    if(hit>0) shake(3);
  } else if(p.heroId==='joseph' || p.heroId==='kaitu'){
    // Wide cleaving melee: hits enemies within a forward arc.
    // Kaitu: extra-wide arc, big slow on hit. Joseph: unchanged.
    const arc = (p.heroId==='joseph') ? 1.2 : 1.5;
    const visualRadius = (p.heroId==='kaitu') ? range*1.15 : range*0.85;
    let hit=0;
    if(authoritative){ for(const e of state.enemies){ const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy); if(d<range+(e.r||0)){ const a=Math.atan2(dy,dx); let da=Math.atan2(Math.sin(a-ang),Math.cos(a-ang)); if(Math.abs(da)<arc){ damageEnemy(e,dmg,p); hit++;
        // Kaitu sword applies a heavy slow on hit
        if(p.heroId==='kaitu'){ e._slowUntil=(state.time||0)+1.6; e._slowFactor=0.3; }
      } } } }
    state.fx.push({_swing:true, owner:p, ang, arc, radius:visualRadius, color:h.color, life:0.25, life0:0.25});
    particles(p.x, p.y, h.color, 14, 240, 0.35, 5);
    if(hit>0) shake(3);
  } else if(p.heroId==='jeff'){
    let hit=0;
    if(authoritative){ for(const e of state.enemies){ const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy); if(d<range+(e.r||0)){ const a=Math.atan2(dy,dx); let da=Math.atan2(Math.sin(a-ang),Math.cos(a-ang)); if(Math.abs(da)<0.7){ damageEnemy(e,dmg,p); hit++; } } } }
    state.fx.push({_swing:true, owner:p, ang, arc:0.7, radius:range*0.95, color:h.color, life:0.18, life0:0.18, thin:true});
    particles(p.x, p.y, h.color, 10, 240, 0.3, 4);
    if(hit>0) shake(2);
  } else if(p.heroId === 'jian'){
    // Jian: continuous laser beam — a glowing line FX instead of bullets.
    // The FX has a short life so back-to-back casts look like a sustained beam.
    const len = range;
    state.fx.push({_laser:true, x:p.x, y:p.y, ang, len, color:h.color, life:0.16, life0:0.16, owner:p.id, vx:0, vy:0});
    // Host deals damage along the laser path
    if(authoritative){
      const ex=p.x+Math.cos(ang)*len, ey=p.y+Math.sin(ang)*len;
      for(const e of state.enemies){
        if(e.dead||e.invincible) continue;
        const dx=ex-p.x, dy=ey-p.y, len2=dx*dx+dy*dy;
        const t=Math.max(0,Math.min(1,((e.x-p.x)*dx+(e.y-p.y)*dy)/len2));
        const px2=p.x+dx*t, py2=p.y+dy*t;
        if(Math.hypot(e.x-px2,e.y-py2)<(e.r||10)+6) damageEnemy(e,dmg,p);
      }
    }
  } else {
    // Per-hero ranged bullet tuning.
    const SPEED = { joross:720, jake:520, jaballas:480, joshua:780, justin:680, jazmine:620, kagoya:660, iruha:600, yachiyu:560, well:600 };
    const RADIUS = { jake:9, jeb:7, jaballas:11, joshua:7, justin:7, jazmine:6, kagoya:5, iruha:8, yachiyu:6, well:7 };
    const speed = SPEED[p.heroId] ?? 600;
    const radius = RADIUS[p.heroId] ?? 5;
    const piercing = (p.heroId==='jake' || p.heroId==='joshua') ? 1 : 0;
    const heal = (authoritative && (p.heroId==='jeb' || p.heroId==='yachiyu')) ? dmg*0.4 : 0;
    spawnBullet({x:p.x+Math.cos(ang)*18,y:p.y+Math.sin(ang)*18,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,dmg:authoritative?dmg:0,owner:p.id,color:h.color,radius,life:range/speed*1.05,piercing,heal,ghost:!authoritative});
  }
}

function doAbility(p){
  const h=HEROES[p.heroId]; p.abiCd=h.abiCd*p.mods.cdr; SFX.ability(p.heroId);
  const authoritative = canAuthorEnemies();
  queueAction({t:'abi', a:+p.angle.toFixed(2)});
  if(p.heroId==='james' || p.heroId==='joseph'){ const r = (p.heroId==='joseph') ? 170 : 140; if(authoritative){ for(const e of state.enemies){ if(Math.hypot(e.x-p.x,e.y-p.y)<r+(e.r||0)) damageEnemy(e,h.dmg*1.4*p.mods.dmg,p); } } particles(p.x,p.y,h.color,40,300,0.6,3); state.fx.push({ring:true,x:p.x,y:p.y,color:h.color,life:0.5,life0:0.5,r:0,_maxR:r}); shake(8); }
  else if(p.heroId==='kaitu'){ if(authoritative){ for(const e of state.enemies){ if(Math.hypot(e.x-p.x,e.y-p.y)<160+(e.r||0)){ damageEnemy(e,h.dmg*1.1*p.mods.dmg,p); e._slowUntil=(state.time||0)+2.0; e._slowFactor=0.25; } } } particles(p.x,p.y,h.color,36,260,0.6,3); state.fx.push({ring:true,x:p.x,y:p.y,color:h.color,life:0.5,life0:0.5,r:0,_maxR:160}); shake(6); }
  else if(p.heroId==='jake'){ const ring=24; for(let i=0;i<ring;i++){ const a=(i/ring)*Math.PI*2; spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,dmg:authoritative?h.dmg*1.2*p.mods.dmg:0,owner:p.id,color:h.color,radius:8,life:0.9,piercing:2,ghost:!authoritative}); } particles(p.x,p.y,h.color,40,260,0.7,3); shake(6); }
  else if(p.heroId==='joross'){ const orig=p.mods.atkSpd; p.mods.atkSpd*=3; toast('SUPPRESS!'); setTimeout(()=>{p.mods.atkSpd=orig;},3000); }
  else if(p.heroId==='jeb'){ p.hp=Math.min(p.hpMax,p.hp+h.hp*0.35); particles(p.x,p.y,'#3dffb0',60,220,0.9,3); state.fx.push({x:p.x,y:p.y,vx:0,vy:0,life:4,life0:4,color:'#3dffb0',r:160,ring:true,heal:true,owner:p.id}); }
  else if(p.heroId==='jeff'){ const dx=Math.cos(p.angle)*180, dy=Math.sin(p.angle)*180; if(authoritative){ for(const e of state.enemies){ const ax=e.x-p.x,ay=e.y-p.y; const t=Math.max(0,Math.min(1,(ax*dx+ay*dy)/(dx*dx+dy*dy))); const px=p.x+dx*t, py=p.y+dy*t; if(Math.hypot(e.x-px,e.y-py)<40+(e.r||0)) damageEnemy(e,h.dmg*1.8*p.mods.dmg,p); } } particles(p.x,p.y,h.color,18,260,0.4,3); p.x+=dx; p.y+=dy; p.x=Math.max(20,Math.min(state.arena.w-20,p.x)); p.y=Math.max(20,Math.min(state.arena.h-20,p.y)); particles(p.x,p.y,h.color,18,260,0.4,3); shake(8); }
  else if(p.heroId==='justin'){ const ang=p.angle; spawnBullet({x:p.x,y:p.y,vx:Math.cos(ang)*900,vy:Math.sin(ang)*900,dmg:authoritative?h.dmg*2.5*p.mods.dmg:0,owner:p.id,color:h.color,radius:9,life:1.0,piercing:5,ghost:!authoritative}); shake(4); }
  else if(p.heroId==='jian'){ const ang=p.angle; for(let i=-2;i<=2;i++){ const a=ang+i*0.18; spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*640,vy:Math.sin(a)*640,dmg:authoritative?h.dmg*1.0*p.mods.dmg:0,owner:p.id,color:h.color,radius:5,life:0.7,ghost:!authoritative}); } }
  else if(p.heroId==='jaballas'){ const ang=p.angle; for(let i=-1;i<=1;i++){ const a=ang+i*0.22; spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,dmg:authoritative?h.dmg*1.6*p.mods.dmg:0,owner:p.id,color:h.color,radius:12,life:1.0,piercing:1,ghost:!authoritative}); } shake(5); }
  else if(p.heroId==='joshua'){ const ang=p.angle; for(let i=0;i<3;i++){ setTimeout(()=>{ if(p && !p.dead) spawnBullet({x:p.x,y:p.y,vx:Math.cos(ang)*1000,vy:Math.sin(ang)*1000,dmg:authoritative?h.dmg*1.4*p.mods.dmg:0,owner:p.id,color:h.color,radius:12,life:0.9,piercing:6,ghost:!authoritative}); }, i*120); } }
  else if(p.heroId==='jazmine'){ const arrows=14; for(let i=0;i<arrows;i++){ const a=(i/arrows)*Math.PI*2; spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*380,vy:Math.sin(a)*380,dmg:authoritative?h.dmg*0.9*p.mods.dmg:0,owner:p.id,color:h.color,radius:5,life:0.9,ghost:!authoritative}); } particles(p.x,p.y,h.color,30,220,0.6,2); }
  else if(p.heroId==='kagoya'){ const ang=p.angle; for(let i=0;i<3;i++){ setTimeout(()=>{ if(p && !p.dead) spawnBullet({x:p.x,y:p.y,vx:Math.cos(ang)*700,vy:Math.sin(ang)*700,dmg:authoritative?h.dmg*1.0*p.mods.dmg:0,owner:p.id,color:h.color,radius:7,life:0.7,piercing:1,ghost:!authoritative}); }, i*90); } }
  else if(p.heroId==='iruha'){ const ring=12; for(let i=0;i<ring;i++){ const a=(i/ring)*Math.PI*2; spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*460,vy:Math.sin(a)*460,dmg:authoritative?h.dmg*1.1*p.mods.dmg:0,owner:p.id,color:h.color,radius:7,life:0.7,piercing:1,ghost:!authoritative}); } state.fx.push({ring:true,x:p.x,y:p.y,color:h.color,life:0.5,life0:0.5,r:0,_maxR:180}); shake(5); }
  else if(p.heroId==='yachiyu'){ p.hp=Math.min(p.hpMax,p.hp+h.hp*0.30); particles(p.x,p.y,'#aaffd6',50,220,0.8,3); state.fx.push({x:p.x,y:p.y,vx:0,vy:0,life:3,life0:3,color:'#aaffd6',r:150,ring:true,heal:true,owner:p.id}); state.fx.push({ring:true,x:p.x,y:p.y,color:'#aaffd6',life:0.5,life0:0.5,r:0,_maxR:200}); state.fx.push({ring:true,x:p.x,y:p.y,color:'#ffffff',life:0.3,life0:0.3,r:0,_maxR:180}); if(authoritative){ for(const e of state.enemies){ if(Math.hypot(e.x-p.x,e.y-p.y)<200+(e.r||0)) damageEnemy(e,h.dmg*0.6*p.mods.dmg,p); } } shake(5); }
  else if(p.heroId==='well'){ const ring=10; for(let i=0;i<ring;i++){ const a=(i/ring)*Math.PI*2; spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*500,vy:Math.sin(a)*500,dmg:authoritative?h.dmg*1.2*p.mods.dmg:0,owner:p.id,color:h.color,radius:8,life:0.8,ghost:!authoritative}); } state.fx.push({ring:true,x:p.x,y:p.y,color:h.color,life:0.6,life0:0.6,r:0,_maxR:200}); shake(5); }
}

// ---------- Player boss-skill cast (low-version of acquired boss skill) ----------
// Triggered by F (desktop) or the SKILL touch button (mobile) once the player
// has collected a boss-skill drop. All variants are deliberately weaker than
// the boss's own version: smaller AoE, fewer projectiles, no telegraphed
// double-fire, etc. Damage scales lightly with the player's existing dmg mod.
function castPlayerBossSkill(p){
  const bs = p.bossSkill; if(!bs || bs.cd > 0) return;
  const authoritative = canAuthorEnemies();
  const ang = p.angle;
  const col = bs.color || '#ffd166';
  const dm  = (p.mods && p.mods.dmg) ? p.mods.dmg : 1;
  const dealAt = (x,y,r,dmg) => {
    if(!authoritative) return;
    for(const e of state.enemies){
      if(e.dead || e.invincible) continue;
      if(Math.hypot(e.x-x, e.y-y) < r + (e.r||0)) damageEnemy(e, dmg, p);
    }
  };
  switch(bs.id){
    case 'prismatic_burst': {
      for(let layer=0; layer<3; layer++){
        setTimeout(()=>{
          for(let i=0;i<8;i++){
            const a=(i/8)*Math.PI*2 + layer*0.2;
            spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*340,vy:Math.sin(a)*340,dmg:authoritative?22*dm:0,owner:p.id,color:col,radius:6,life:0.7,piercing:1,ghost:!authoritative});
          }
        }, layer*120);
      }
      break;
    }
    case 'dash_strike': {
      const dx=Math.cos(ang)*180, dy=Math.sin(ang)*180;
      p.x+=dx; p.y+=dy;
      p.x=Math.max(20,Math.min(state.arena.w-20,p.x));
      p.y=Math.max(20,Math.min(state.arena.h-20,p.y));
      dealAt(p.x, p.y, 80, 60*dm);
      state.fx.push({ring:true,x:p.x,y:p.y,color:col,life:0.5,life0:0.5,r:0,_maxR:90});
      shake(8);
      break;
    }
    case 'time_freeze_pulse': {
      for(let i=0;i<12;i++){
        const a=(i/12)*Math.PI*2;
        spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*300,vy:Math.sin(a)*300,dmg:authoritative?16*dm:0,owner:p.id,color:col,radius:7,life:0.9,piercing:0,ghost:!authoritative});
      }
      if(authoritative){
        for(const e of state.enemies){ if(Math.hypot(e.x-p.x,e.y-p.y)<170){ e.sp = Math.max(20, e.sp*0.5); setTimeout(()=>{ if(e && !e.dead) e.sp = e.sp*2; }, 1500); } }
      }
      state.fx.push({ring:true,x:p.x,y:p.y,color:col,life:0.6,life0:0.6,r:0,_maxR:170});
      break;
    }
    case 'nova_implosion': {
      for(let i=0;i<10;i++){
        const a=(i/10)*Math.PI*2;
        spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*380,vy:Math.sin(a)*380,dmg:authoritative?20*dm:0,owner:p.id,color:col,radius:8,life:0.8,piercing:1,ghost:!authoritative});
      }
      state.fx.push({ring:true,x:p.x,y:p.y,color:col,life:0.5,life0:0.5,r:0,_maxR:200});
      shake(6);
      break;
    }
    case 'shadow_clones_assault': {
      for(let i=-1;i<=1;i++){
        const a=ang + i*0.25;
        spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*640,vy:Math.sin(a)*640,dmg:authoritative?34*dm:0,owner:p.id,color:col,radius:9,life:1.0,piercing:3,ghost:!authoritative});
      }
      break;
    }
    case 'chain_lightning': {
      let last = {x:p.x, y:p.y};
      const hit = new Set();
      let chains = 3;
      while(chains > 0){
        let best=null, bd=380;
        for(const e of state.enemies){
          if(hit.has(e) || e.dead || e.invincible) continue;
          const d=Math.hypot(e.x-last.x, e.y-last.y);
          if(d<bd){ bd=d; best=e; }
        }
        if(!best) break;
        if(authoritative) damageEnemy(best, 38*dm, p);
        hit.add(best);
        state.fx.push({warn:true, ax:last.x, ay:last.y, bx:best.x, by:best.y, color:col, life:0.3, life0:0.3, beamWidth:10});
        last = {x:best.x, y:best.y};
        chains--;
      }
      break;
    }
    case 'void_zone': {
      const zx = p.x + Math.cos(ang)*180, zy = p.y + Math.sin(ang)*180;
      const dur = 3.0;
      state.fx.push({ring:true,x:zx,y:zy,color:col,life:dur,life0:dur,r:120,_maxR:120});
      state.fx.push({_enemyZone:true, x:zx, y:zy, life:dur, life0:dur, color:col, r:120, dps: 36*dm});
      particles(zx, zy, col, 30, 220, 0.7, 3);
      break;
    }
    case 'gravity_well': {
      for(let i=0;i<2;i++){
        const sx = p.x + Math.cos(ang + (i?0.6:-0.6))*200;
        const sy = p.y + Math.sin(ang + (i?0.6:-0.6))*200;
        state.fx.push({ring:true,x:sx,y:sy,color:col,life:0.5,life0:0.5,r:80,_maxR:80});
        setTimeout(()=>{
          dealAt(sx, sy, 90, 50*dm);
          state.fx.push({ring:true,x:sx,y:sy,color:col,life:0.4,life0:0.4,r:0,_maxR:120});
          particles(sx,sy,col,30,260,0.6,3);
          shake(5);
        }, 500);
      }
      break;
    }
    case 'meteor_rain': {
      for(let i=0;i<3;i++){
        const tx = p.x + Math.cos(ang)*120 + (Math.random()*220-110);
        const ty = p.y + Math.sin(ang)*120 + (Math.random()*220-110);
        const delay = 350 + i*180;
        state.fx.push({ring:true,x:tx,y:ty,color:col,life:delay/1000,life0:delay/1000,r:60,_maxR:60});
        setTimeout(()=>{
          dealAt(tx, ty, 75, 55*dm);
          state.fx.push({ring:true,x:tx,y:ty,color:col,life:0.4,life0:0.4,r:0,_maxR:90});
          particles(tx,ty,col,30,260,0.6,3); shake(4);
        }, delay);
      }
      break;
    }
    case 'reality_break': {
      for(let i=0;i<12;i++){
        const a=(i/12)*Math.PI*2;
        spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*360,vy:Math.sin(a)*360,dmg:authoritative?20*dm:0,owner:p.id,color:col,radius:7,life:0.8,piercing:1,ghost:!authoritative});
      }
      for(let i=0;i<3;i++){
        const tx = p.x + (Math.random()*280-140);
        const ty = p.y + (Math.random()*280-140);
        const delay = 350 + i*180;
        state.fx.push({ring:true,x:tx,y:ty,color:col,life:delay/1000,life0:delay/1000,r:60,_maxR:60});
        setTimeout(()=>{
          dealAt(tx, ty, 75, 50*dm);
          state.fx.push({ring:true,x:tx,y:ty,color:col,life:0.4,life0:0.4,r:0,_maxR:90});
        }, delay);
      }
      shake(8);
      break;
    }
    default: {
      for(let i=0;i<10;i++){
        const a=(i/10)*Math.PI*2;
        spawnBullet({x:p.x,y:p.y,vx:Math.cos(a)*350,vy:Math.sin(a)*350,dmg:authoritative?20*dm:0,owner:p.id,color:col,radius:6,life:0.7,piercing:1,ghost:!authoritative});
      }
    }
  }
  bs.cd = bs.cdMax * (p.mods && p.mods.cdr ? p.mods.cdr : 1);
  try{ SFX.ability(p.heroId); }catch(e){}
  particles(p.x, p.y, col, 28, 260, 0.5, 3);
  // Queue as a player-state action so the existing playerState relay
  // broadcasts it to every other client without needing a new server handler.
  queueAction({ t:'bsc', id: bs.id, col: col, a: +ang.toFixed(3) });
}

// Visual-only replay of a remote player's boss-skill cast.
// Renders rings, particles AND ghost bullets/beams so every client sees the
// same projectiles the caster sees. Ghost bullets carry no damage and are
// owned by the remote player id, so they never collide with enemies and the
// authoritative host's hit detection is unaffected.
function applyRemotePlayerSkillCast(msg){
  if(!msg) return;
  const x = msg.x, y = msg.y, ang = msg.angle || 0, col = msg.color || '#ffd166';
  const id = msg.skillId || '';
  const ownerId = msg.from || msg.ownerId || 'remote';
  // Ghost-bullet helper — same visual params the caster used in
  // castPlayerBossSkill, but ghosted so it only renders.
  const gb = (vx, vy, radius, life, piercing) => {
    spawnBullet({
      x, y, vx, vy,
      dmg: 0, owner: ownerId, color: col,
      radius, life, piercing: piercing || 0,
      ghost: true
    });
  };
  // Generic cast flash present for every skill
  particles(x, y, col, 28, 260, 0.5, 3);
  state.fx.push({ring:true, x, y, color:col, life:0.5, life0:0.5, r:0, _maxR:120});
  // Skill-specific visual additions
  if(id === 'prismatic_burst'){
    for(let layer=0; layer<3; layer++){
      setTimeout(()=>{
        for(let i=0;i<8;i++){
          const a=(i/8)*Math.PI*2 + layer*0.2;
          gb(Math.cos(a)*340, Math.sin(a)*340, 6, 0.7, 1);
        }
      }, layer*120);
    }
  } else if(id === 'time_freeze_pulse'){
    for(let i=0;i<12;i++){
      const a=(i/12)*Math.PI*2;
      gb(Math.cos(a)*300, Math.sin(a)*300, 7, 0.9, 0);
    }
    state.fx.push({ring:true, x, y, color:col, life:0.6, life0:0.6, r:0, _maxR:170});
  } else if(id === 'nova_implosion'){
    for(let i=0;i<10;i++){
      const a=(i/10)*Math.PI*2;
      gb(Math.cos(a)*380, Math.sin(a)*380, 8, 0.8, 1);
    }
    state.fx.push({ring:true, x, y, color:col, life:0.5, life0:0.5, r:0, _maxR:200});
  } else if(id === 'shadow_clones_assault'){
    for(let i=-1;i<=1;i++){
      const a=ang + i*0.25;
      gb(Math.cos(a)*640, Math.sin(a)*640, 9, 1.0, 3);
    }
  } else if(id === 'reality_break'){
    for(let i=0;i<12;i++){
      const a=(i/12)*Math.PI*2;
      gb(Math.cos(a)*360, Math.sin(a)*360, 7, 0.8, 1);
    }
    for(let i=0;i<3;i++){
      const tx = x + (Math.random()*280-140);
      const ty = y + (Math.random()*280-140);
      const delay = 350 + i*180;
      state.fx.push({ring:true, x:tx, y:ty, color:col, life:delay/1000, life0:delay/1000, r:60, _maxR:60});
      setTimeout(()=>{ state.fx.push({ring:true, x:tx, y:ty, color:col, life:0.4, life0:0.4, r:0, _maxR:90}); }, delay);
    }
  } else if(id === 'void_zone'){
    const zx = x + Math.cos(ang)*180, zy = y + Math.sin(ang)*180;
    state.fx.push({ring:true, x:zx, y:zy, color:col, life:3.0, life0:3.0, r:120, _maxR:120});
    particles(zx, zy, col, 30, 220, 0.7, 3);
  } else if(id === 'meteor_rain'){
    for(let i=0;i<3;i++){
      const tx = x + Math.cos(ang)*120 + (Math.random()*220-110);
      const ty = y + Math.sin(ang)*120 + (Math.random()*220-110);
      const delay = 350 + i*180;
      state.fx.push({ring:true, x:tx, y:ty, color:col, life:delay/1000, life0:delay/1000, r:60, _maxR:60});
      setTimeout(()=>{ state.fx.push({ring:true, x:tx, y:ty, color:col, life:0.4, life0:0.4, r:0, _maxR:90}); particles(tx, ty, col, 30, 260, 0.6, 3); }, delay);
    }
  } else if(id === 'gravity_well'){
    for(let i=0;i<2;i++){
      const sx = x + Math.cos(ang + (i?0.6:-0.6))*200, sy = y + Math.sin(ang + (i?0.6:-0.6))*200;
      state.fx.push({ring:true, x:sx, y:sy, color:col, life:0.5, life0:0.5, r:80, _maxR:80});
      setTimeout(()=>{ state.fx.push({ring:true, x:sx, y:sy, color:col, life:0.4, life0:0.4, r:0, _maxR:120}); particles(sx, sy, col, 30, 260, 0.6, 3); }, 500);
    }
  } else if(id === 'dash_strike'){
    state.fx.push({ring:true, x:x+Math.cos(ang)*180, y:y+Math.sin(ang)*180, color:col, life:0.4, life0:0.4, r:0, _maxR:90});
  } else if(id === 'chain_lightning'){
    // Best-effort visual: short beam fan in the cast direction so the
    // arc-lightning is visible even though we don't know the actual chain
    // targets on the remote client.
    state.fx.push({ring:true, x, y, color:col, life:0.3, life0:0.3, r:0, _maxR:80});
    for(let i=-1;i<=1;i++){
      const a = ang + i*0.4;
      const bx = x + Math.cos(a)*220, by = y + Math.sin(a)*220;
      state.fx.push({warn:true, ax:x, ay:y, bx, by, color:col, life:0.3, life0:0.3, beamWidth:10});
    }
  } else {
    // Default fallback skill visualization (10 outward bullets)
    for(let i=0;i<10;i++){
      const a=(i/10)*Math.PI*2;
      gb(Math.cos(a)*350, Math.sin(a)*350, 6, 0.7, 1);
    }
  }
}

function damageEnemy(e,dmg,p){
  if(!canAuthorEnemies() || e.dead) return;
  // Bosses become invincible during the evolution cinematic.
  if(e.invincible) { particles(e.x, e.y, '#ffffff', 2, 80, 0.2, 2); return; }
  // Specters are immune while phased
  if(e._phased) { particles(e.x, e.y, e.col, 2, 60, 0.2, 2); return; }
  e.hp-=dmg;
  if(e._endlessBoss) updateBossBarFill(Math.max(0, e.hp), e.hpMax);
  if(p&&p.heroId) SFX.hit();
  if(p&&p.mods&&p.mods.lifesteal>0) p.hp=Math.min(p.hpMax,p.hp+dmg*p.mods.lifesteal);
  particles(e.x,e.y,e.col,4,140,0.3,2);
  if(e.hp<=0){
    // Boss "death" → enter cinematic evolving phase, do NOT kill yet.
    if(e.isBoss && isGodMode()){
      e.hp = 1;          // keep visible/non-dead
      e.invincible = true;
      GOD.onBossDefeated(e);
      return;
    }
    if(e.isBoss && e._endlessBoss){
      state.kills++;
      if(p) p.kills++;
      // Award bonus SP for slaying an endless boss (not tracked in leaderboard score)
      try{ addSP(100 * (e.bossPhase || 1)); }catch(_){}
      particles(e.x, e.y, e.col, 80, 420, 1.4, 5);
      shake(16);
      e.dead = true;
      hideBossBar();
      state.endlessBossKills = (state.endlessBossKills || 0) + 1;
      if(state.endlessBossKills >= state.endlessBossCount){
        state.wavePhase = 'upgrade';
        showWaveBanner(`WAVE ${state.wave} CLEARED`, 'CHOOSE UPGRADE', 1800);
        showUpgradePicker();
      }
      return;
    }
    state.kills++;
    if(p) p.kills++;
    // Award SP per kill — badge updates instantly, DB write is debounced
    try{ addSP(e.isBoss ? 50 : 5); }catch(_){}
    particles(e.x,e.y,e.col,e.isBoss?80:18,e.isBoss?420:240,e.isBoss?1.4:0.7,e.isBoss?5:3);
    shake(e.isBoss?16:2);
    e.dead=true;
    if(e.type==='bomber' && canAuthorEnemies()){
      const BLAST_R=135;
      particles(e.x,e.y,'#ff8a3d',50,400,0.9,6);
      shake(14);
      _hitPlayersInRadius(e.x,e.y,BLAST_R,e.dmg*3.5,{shake:8,fx:'#ff8a3d'});
      state.fx.push({x:e.x,y:e.y,vx:0,vy:0,life:0.45,life0:0.45,color:'#ff8a3d',r:BLAST_R,ring:true,_enemyZone:true});
    }
    if(e.type==='burst' && canAuthorEnemies()){
      const BLAST_R=100;
      particles(e.x,e.y,'#ffaa00',35,350,0.8,5);
      shake(8);
      _hitPlayersInRadius(e.x,e.y,BLAST_R,e.dmg*2.2,{shake:5,fx:'#ffaa00'});
      state.fx.push({x:e.x,y:e.y,vx:0,vy:0,life:0.35,life0:0.35,color:'#ffaa00',r:BLAST_R,ring:true,_enemyZone:true});
    }
    if(e.type==='splitter' && canAuthorEnemies() && !e._isSplit){
      for(let si=0;si<2;si++){
        const sa=Math.random()*Math.PI*2;
        const child=makeEnemy({type:'drone',x:e.x+Math.cos(sa)*20,y:e.y+Math.sin(sa)*20,hp:e.hpMax*0.35,hpMax:e.hpMax*0.35,sp:e.sp*1.4,r:7,dmg:e.dmg*0.6,col:'#55aaff',cd:0,jitter:Math.random()*Math.PI*2,fromWave:e.fromWave});
        child._isSplit=true; state.enemies.push(child);
      }
    }
    if(state.waveEnemiesAlive>0 && !e.isBoss) state.waveEnemiesAlive--;
    if(e.isBoss && isGodMode()){ GOD.onBossDefeated(e); }
  }
}

function updateEnemies(dt){
  const p=state.player;
  const players = [p, ...state.others.values()].filter(cand => cand && cand.alive !== false);
  for(const e of state.enemies){
    let target=p;
    if(isMultiMode()){
      let best=p,bd=Infinity;
      for(const cand of players){ const d2=(cand.x-e.x)**2+(cand.y-e.y)**2; if(d2<bd){bd=d2;best=cand;} }
      target=best||p;
    }
    const dx=target.x-e.x, dy=target.y-e.y, d=Math.hypot(dx,dy)||1;
    let sp=e.sp*((state.fracture>=2 && !isGodMode())?1+state.fracture*0.06:1);
    if(p.mods.slow>0 && Math.hypot(p.x-e.x,p.y-e.y)<160) sp*=(1-p.mods.slow);
    // Kaitu sword slow / other debuffs
    if(e._slowUntil && state.time < e._slowUntil) sp *= (e._slowFactor ?? 0.3);
    if(e.isBoss){
      // Stop moving + stop melee contact damage during evolution / dodge frames.
      if(e.evolving || e.invincible){
        // float gently in place
      } else if(e.bossPhase === 11){
        // Aggressive ninja chase: closes distance fast & weaves side-to-side
        // so it's hard to line up. Speed already very high in spawnBoss().
        const tt = (e._weaveT = (e._weaveT||0) + dt);
        const closeDist = 70;
        if(d > closeDist){
          e.x += dx/d * sp * 1.0 * dt;
          e.y += dy/d * sp * 1.0 * dt;
        }
        // Perpendicular weave so it doesn't sit still when in-range
        const px = -dy/d, py = dx/d;
        const wv = Math.sin(tt * 5);
        e.x += px * wv * sp * 0.45 * dt;
        e.y += py * wv * sp * 0.45 * dt;
      } else {
        if(d>200) { e.x+=dx/d*sp*0.4*dt; e.y+=dy/d*sp*0.4*dt; }
      }
      if(isGodMode()) GOD.bossAITick(e, dt, target);
      else if(e._endlessBoss) endlessBossAITick(e, dt, target);
    } else if(e.type==='phantom'){ e.jitter+=dt*4; const px=-dy/d, py=dx/d; e.x+=(dx/d*sp+px*Math.sin(e.jitter)*sp*0.6)*dt; e.y+=(dy/d*sp+py*Math.sin(e.jitter)*sp*0.6)*dt; }
    else if(e.type==='sniper'){
      const standoff=290; const px=-dy/d, py=dx/d;
      if(d>standoff+50){ e.x+=dx/d*sp*dt; e.y+=dy/d*sp*dt; }
      else if(d<standoff-50){ e.x-=dx/d*sp*0.8*dt; e.y-=dy/d*sp*0.8*dt; }
      e.jitter+=dt*1.4; e.x+=px*sp*0.6*dt; e.y+=py*sp*0.6*dt;
      e._shootTimer=(e._shootTimer||0)-dt;
      if(e._shootTimer<=0 && canAuthorEnemies()){
        e._shootTimer=2.0+Math.random()*1.2;
        const ang=Math.atan2(target.y-e.y,target.x-e.x);
        state.bullets.push({x:e.x+Math.cos(ang)*22,y:e.y+Math.sin(ang)*22,vx:Math.cos(ang)*400,vy:Math.sin(ang)*400,dmg:e.dmg*0.85,owner:'enemy',color:e.col,radius:6,life:1.5,piercing:0,trail:[],hostile:true,_sent:false});
      }
    } else if(e.type==='specter'){
      e._phaseTimer=(e._phaseTimer||0)+dt;
      e._phased=(e._phaseTimer%3.8)<1.3;
      if(!e._phased){ e.jitter+=dt*3; const px=-dy/d,py=dx/d; e.x+=(dx/d*sp+px*Math.sin(e.jitter)*sp*0.35)*dt; e.y+=(dy/d*sp+py*Math.sin(e.jitter)*sp*0.35)*dt; }
    } else if(e.type==='charger'){
      // Sprint directly at player; briefly pause when in contact range
      if(d>e.r+20){ e.x+=dx/d*sp*dt; e.y+=dy/d*sp*dt; }
    } else if(e.type==='healer'){
      // Kite backwards, periodically heal nearby allies
      if(d<250){ e.x-=dx/d*sp*0.8*dt; e.y-=dy/d*sp*0.8*dt; }
      else { e.x+=dx/d*sp*0.3*dt; e.y+=dy/d*sp*0.3*dt; }
      e._healTimer=(e._healTimer||0)-dt;
      if(e._healTimer<=0 && canAuthorEnemies()){
        e._healTimer=2.5;
        for(const n of state.enemies){ if(n!==e && Math.hypot(n.x-e.x,n.y-e.y)<120 && !n.dead) n.hp=Math.min(n.hpMax,n.hp+n.hpMax*0.08); }
        particles(e.x,e.y,'#00ff88',10,80,0.5,3);
      }
    } else if(e.type==='lurker'){
      // Slow until close, then sprint
      const burstThresh=180;
      if(d>burstThresh){ e.x+=dx/d*sp*0.35*dt; e.y+=dy/d*sp*0.35*dt; }
      else { e.x+=dx/d*sp*2.2*dt; e.y+=dy/d*sp*2.2*dt; }
    } else if(e.type==='burst'){
      // Normal chase; on death explode (handled in damageEnemy)
      e.x+=dx/d*sp*dt; e.y+=dy/d*sp*dt;
    } else if(e.type==='assassin'){
      // Ultra-fast direct chase
      e.x+=dx/d*sp*dt; e.y+=dy/d*sp*dt;
    } else if(e.type==='colossus'){
      // Slow unstoppable charge
      e.x+=dx/d*sp*dt; e.y+=dy/d*sp*dt;
    } else if(e.type==='voidling'){
      // Blink short distances every 1.5s
      e.jitter+=dt*2; e.x+=(dx/d*sp+(-dy/d)*Math.sin(e.jitter)*sp*0.5)*dt; e.y+=(dy/d*sp+(dx/d)*Math.sin(e.jitter)*sp*0.5)*dt;
      e._blinkTimer=(e._blinkTimer||0)-dt;
      if(e._blinkTimer<=0){ e._blinkTimer=1.5+Math.random()*1.0; const ba=Math.random()*Math.PI*2; const bd2=50+Math.random()*80; e.x+=Math.cos(ba)*bd2; e.y+=Math.sin(ba)*bd2; particles(e.x,e.y,'#220055',6,120,0.3,2); }
    } else if(e.type==='splitter'){
      // Normal movement; splits on death (handled in damageEnemy)
      e.x+=dx/d*sp*dt; e.y+=dy/d*sp*dt;
    } else { e.x+=dx/d*sp*dt; e.y+=dy/d*sp*dt; }
    e.cd=Math.max(0,e.cd-dt);
    const localDist = Math.hypot(p.x-e.x,p.y-e.y);
    const touchingAny = players.some(cand => Math.hypot(cand.x-e.x,cand.y-e.y) < e.r + 18);
    if(touchingAny && e.cd<=0 && !(e.isBoss && (e.evolving || e.invincible)) && !e._phased){
      if(localDist<e.r+18 && p.alive && !p.downed){ const dmgIn = e.isBoss ? e.dmg * BOSS_CONTACT_MUL : e.dmg; let rem=dmgIn; if(p.shield>0){ const a=Math.min(p.shield,rem); p.shield-=a; rem-=a; } p.hp-=rem; SFX.hurt(); shake(4); particles(p.x,p.y,'#ff3d6a',8,180,0.4,2); }
      e.cd = e.isBoss ? 0.85 : 0.6;
    }
  }
  state.enemies = state.enemies.filter(e=>!e.dead);
}

function interpolateEnemies(dt){
  const k = 1 - Math.exp(-dt * 20);
  for(const e of state.enemies){
    if(e.rx === undefined){ e.rx = e.x; e.ry = e.y; }
    e.x += (e.rx - e.x) * k;
    e.y += (e.ry - e.y) * k;
  }
}

function updateEnemyContacts(dt){
  const p=state.player;
  for(const e of state.enemies){
    e.cd=Math.max(0,e.cd-dt);
    if(Math.hypot(p.x-e.x,p.y-e.y)<e.r+18 && e.cd<=0 && p.alive && !p.downed && !(e.isBoss && (e.evolving || e.invincible))){ const dmgIn = e.isBoss ? e.dmg * BOSS_CONTACT_MUL : e.dmg; let rem=dmgIn; if(p.shield>0){ const a=Math.min(p.shield,rem); p.shield-=a; rem-=a; } p.hp-=rem; SFX.hurt(); e.cd = e.isBoss ? 0.85 : 0.6; shake(4); particles(p.x,p.y,'#ff3d6a',8,180,0.4,2); }
  }
}

function updateBullets(dt){
  for(const b of state.bullets){
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    b.trail.push({x:b.x,y:b.y}); if(b.trail.length>8) b.trail.shift();
    // Boss-owned bullets ALWAYS damage the local player (treated as hostile environment)
    if(b.hostile){
      const p = state.player;
      if(p && p.alive && !p.downed){
        if(Math.hypot(p.x-b.x,p.y-b.y) < (p.hp ? 16 : 0) + b.radius){
          const dmgIn = (b.dmg||0) * BOSS_DMG_MUL; let rem=dmgIn;
          if(p.shield>0){ const a=Math.min(p.shield,rem); p.shield-=a; rem-=a; }
          p.hp -= rem; SFX.hurt(); shake(4); particles(p.x,p.y,'#ff3d6a',8,180,0.4,2);
          if(!b.piercing){ b.dead=true; continue; } else b.piercing--;
        }
      }
      continue;
    }
    if(b.ghost || !canAuthorEnemies()) continue;
    for(const e of state.enemies){ if(Math.hypot(e.x-b.x,e.y-b.y)<e.r+b.radius){ damageEnemy(e,b.dmg,state.player); if(b.heal && state.player) state.player.hp=Math.min(state.player.hpMax, state.player.hp+b.heal); if(b.piercing>0){ b.piercing--; } else { b.dead=true; break; } } }
  }
  state.bullets = state.bullets.filter(b=>!b.dead && b.life>0);
}

function updateFx(dt){
  for(const f of state.fx){
    // If this fx is anchored to a boss that has died/disappeared, kill it now.
    // This stops void zones, gravity wells, _pull and rings from continuing
    // to damage / drag the player around an empty arena (the wave-8 bug).
    if(f._bossRef && (!f._bossRef.hp || f._bossRef.hp <= 0 || f._bossRef.dead)){
      f.life = 0;
      continue;
    }
    if(f._bossRef){
      f.x = f._bossRef.x;
      f.y = f._bossRef.y;
    }
    f.life-=dt;
    if(!f.ring && !f.beam && !f.warn && !f.zone){ f.x+=f.vx*dt; f.y+=f.vy*dt; f.vx*=0.92; f.vy*=0.92; }
    if(f.heal && state.player){ const d=Math.hypot(state.player.x-f.x, state.player.y-f.y); if(d<f.r) state.player.hp=Math.min(state.player.hpMax, state.player.hp+18*dt); }
    // Damaging zones (boss void zones, gravity-well core)
    if(f.zone && state.player){
      const p=state.player;
      if(p.alive && !p.downed && Math.hypot(p.x-f.x, p.y-f.y) < f.r){
        const dmgIn = (f.dps||0)*dt * BOSS_DMG_MUL;
        let rem = dmgIn;
        if(p.shield>0){ const a=Math.min(p.shield,rem); p.shield-=a; rem-=a; }
        p.hp -= rem;
      }
    }
    // Player-owned boss-skill zones (from collected drops) — damage enemies, not the player.
    if(f._enemyZone){
      for(const e of state.enemies){
        if(e.dead || e.invincible) continue;
        if(Math.hypot(e.x-f.x, e.y-f.y) < f.r){
          damageEnemy(e, (f.dps||0)*dt, state.player);
        }
      }
    }
    if(f._shock){
      const t = 1 - Math.max(0, f.life / f.life0);
      const r = f._maxR * t;
      const p = state.player;
      if(p && p.alive && !p.downed && !f._hit){
        const d = Math.hypot(p.x-f.x, p.y-f.y);
        if(d > r-30 && d < r+30){
          f._hit = true;
          const dmgIn = (f.dmg||20) * BOSS_DMG_MUL; let rem=dmgIn;
          if(p.shield>0){ const a2=Math.min(p.shield,rem); p.shield-=a2; rem-=a2; }
          p.hp -= rem; SFX.hurt(); shake(7);
        }
      }
    }
    if(f._pull && state.player){
      const p = state.player;
      if(p.alive && !p.downed){
        const dx = f.x-p.x, dy=f.y-p.y, d=Math.hypot(dx,dy)||1;
        if(d < f.r){
          const force = 220 * (1 - d/f.r);
          p.x += (dx/d)*force*dt;
          p.y += (dy/d)*force*dt;
          p.x = Math.max(20,Math.min(state.arena.w-20,p.x));
          p.y = Math.max(20,Math.min(state.arena.h-20,p.y));
        }
      }
    }
    // Beam strike: when warning ends and beam fires this frame, deal damage along the line
    if(f.beam && !f.beamFired && f.life <= f.beamFireAt){
      f.beamFired = true;
      const p = state.player;
      if(p && p.alive && !p.downed){
        const dx=f.bx-f.ax, dy=f.by-f.ay;
        const t = Math.max(0,Math.min(1, ((p.x-f.ax)*dx+(p.y-f.ay)*dy)/(dx*dx+dy*dy)));
        const px = f.ax+dx*t, py = f.ay+dy*t;
        if(Math.hypot(p.x-px, p.y-py) < (f.beamWidth||30)){
          const dmgIn = (f.dmg||30) * BOSS_DMG_MUL; let rem=dmgIn;
          if(p.shield>0){ const a=Math.min(p.shield,rem); p.shield-=a; rem-=a; }
          p.hp -= rem; SFX.hurt(); shake(8); particles(p.x,p.y,'#ff3d6a',16,260,0.6,3);
        }
      }
      shake(6);
    }
  }
  state.fx = state.fx.filter(f=>f.life>0);
}

// ---------- Pickups (God Mode) ----------
function updatePickups(dt){
  const p = state.player;
  if(!p) return;
  for(const pk of state.pickups){
    pk.t += dt;
    // Boss-skill drops have a bigger collection radius (more dramatic prize).
    const collectR = pk.bossSkill ? PICKUP_RADIUS + 10 : PICKUP_RADIUS;
    if(p.alive && !p.downed && Math.hypot(p.x-pk.x, p.y-pk.y) < collectR){
      // collect!
      pk.dead = true;
      // Tell every other client to remove this floor sprite. The collector
      // applies the upgrade to themselves locally below; remotes do nothing
      // except erase the pickup.
      if(activeRoom && pk.pid != null){
        try{ activeRoom.send('pickupCollect', { pid: pk.pid }); }catch(e){}
      }
      if(pk.bossSkill){
        // Boss-skill drop: equip on the local player only. Other players
        // can't claim it because it's removed from state.pickups now.
        const info = PLAYER_BOSS_SKILL_INFO[pk.skillId] || {name:pk.skillName||'Boss Skill', desc:'A fragment of the fallen boss.', cdMax:8};
        p.bossSkill = {
          id: pk.skillId,
          name: info.name,
          color: pk.color || '#ffd166',
          phase: pk.phase || 0,
          cd: 0,
          cdMax: info.cdMax,
        };
        SFX.collect();
        showPickupBanner('★ ' + info.name + ' ACQUIRED', info.desc + ' [F / SKILL button]');
        particles(pk.x, pk.y, pk.color || '#ffd166', 70, 380, 1.1, 4);
        shake(10);
      } else {
        const upg = UPGRADES.find(u=>u.id===pk.id) || UPGRADES[0];
        const rarity = getRarity(pk.rarity);
        try {
          if(NO_STACK_UPGRADES.has(upg.id)){
            // Run apply once, then award a flat rarity bonus on top.
            upg.apply(p);
            const bonus = rarity.stacks - 1;
            if(bonus > 0){
              if(upg.id === 'heal' || upg.id === 'phoenix'){
                p.hpMax += 10 * bonus; p.hp = p.hpMax;
              } else if(upg.id === 'aegis'){
                p.shield = (p.shield||0) + 30 * bonus;
                if(p.mods.shieldMax < p.shield) p.mods.shieldMax = p.shield;
              } else if(upg.id === 'ironwill' || upg.id === 'hpmax'){
                p.hpMax += 25 * bonus; p.hp = Math.min(p.hpMax, p.hp + 25 * bonus);
              } else if(upg.id === 'glasscannon'){
                // legendary glass cannon: extra +30% dmg per tier, no extra HP loss
                p.mods.dmg *= (1 + 0.30 * bonus);
              }
            }
          } else {
            for(let s=0; s<rarity.stacks; s++) upg.apply(p);
          }
        } catch(e){}
        SFX.collect();
        const namePrefix = rarity.banner ? `${rarity.banner} — ` : '';
        showPickupBanner(namePrefix + upg.name, upg.desc);
        const pColor = rarity.id === 'common' ? (upg.color || '#ffd166') : rarity.color;
        const pN = rarity.id === 'common' ? 30 : (rarity.id === 'rare' ? 50 : (rarity.id === 'epic' ? 80 : 130));
        particles(pk.x, pk.y, pColor, pN, 320, 0.9, 3);
        if(rarity.id !== 'common'){
          state.fx.push({ring:true, x:pk.x, y:pk.y, color:rarity.color, life:0.5, life0:0.5, r:0, _maxR: rarity.id === 'legendary' ? 180 : 110});
          if(rarity.id === 'legendary') shake(8); else if(rarity.id === 'epic') shake(4);
        }
      }
    }
  }
  state.pickups = state.pickups.filter(pk=>!pk.dead);
}
function showPickupBanner(name, desc){
  const el = document.getElementById('pickupToast');
  if(!el) return;
  document.getElementById('pickupName').textContent = name;
  document.getElementById('pickupDesc').textContent = desc;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(showPickupBanner._t);
  showPickupBanner._t = setTimeout(()=>el.classList.remove('show'), 1400);
}

// ==============================================================
// GOD MODE — boss gauntlet controller
// ==============================================================
const GOD = (() => {
  // Track every setTimeout queued by skills so we can cancel them when the
  // boss dies / phase ends. Without this, lingering callbacks (dash_strike,
  // teleport_strike, meteor_rain, laser_sweep, ground_spikes) keep firing
  // after the boss is gone — that's the wave-8 bug: boss "centers" because
  // its position got nuked by `_pull`, then dies, but ground hazards & pull
  // fx keep ticking on a non-existent boss while the player has no anchor
  // and no contact damage to trigger.
  const _pendingTimeouts = new Set();
  function _schedule(fn, ms){
    const id = setTimeout(()=>{ _pendingTimeouts.delete(id); try{ fn(); }catch(e){} }, ms);
    _pendingTimeouts.add(id);
    return id;
  }
  function _clearAllScheduled(){
    for(const id of _pendingTimeouts) clearTimeout(id);
    _pendingTimeouts.clear();
  }
  function _purgeHostileFx(){
    // Remove every fx that can damage / move the player after a boss dies.
    state.fx = state.fx.filter(f => !(f.warn || f.beam || f.zone || f._shock || f._pull || f._flash));
    state.bullets = state.bullets.filter(b => !b.hostile);
    // Tell joiners to do the same so they don't keep getting hit by stale fx.
    if(typeof broadcastPurgeFx === 'function') broadcastPurgeFx();
  }

  function start(){
    state.god = {
      phase: 0,
      boss: null,
      mode: 'intro',             // 'intro' | 'fight' | 'transition' | 'evolving' | 'victory'
      timer: 0,
      pickupTimer: 4,
      skillCooldowns: {},
      skillIndex: 0,
      bossTelegraphCooldown: 0,
    };
    const a = state.arena;
    state.player.x = a.w/2; state.player.y = a.h/2;
    beginPhase(1);
  }

  function beginPhase(n){
    const phaseDef = BOSS_PHASES[n-1];
    if(!phaseDef){
      state.god.mode = 'victory';
      state.god.timer = 3;
      showGodIntro('VICTORY', 'THE LAST GOD HAS FALLEN', '★★★', '');
      SFX.stopMusic(1500);
      return;
    }
    // Always start a phase from a clean slate — kills the wave-8 lingering hazards.
    _clearAllScheduled();
    _purgeHostileFx();
    state.god.phase = n;
    state.god.mode = 'intro';
    state.god.timer = 4.2;
    state.god.skillCooldowns = {};
    state.god.skillIndex = 0;
    state.god.bossTelegraphCooldown = 1.5;
    state.god.pickupTimer = 4;
    state.god.boss = null;
    for(const e of state.enemies){ e.dead = true; }
    const totalPhases = BOSS_PHASES.length;
    const rank = n>=11 ? 'EX // OMEGA' : (n>=8 ? 'S++ BOSS' : (n>=5 ? 'S+ BOSS' : 'S BOSS'));
    showGodIntro(`PHASE ${n} / ${totalPhases}`, phaseDef.name, phaseDef.title, rank);
    SFX.bossSkill('intro_roar', 1);
    // Crossfade into this phase's theme (fade-in, previous track fades out)
    SFX.playMusic(phaseDef.music || 'god', 1500);
    shake(12);
  }

  function spawnBoss(){
    const phaseDef = BOSS_PHASES[state.god.phase-1];
    const a = state.arena;
    const playerCount = 1 + state.others.size;
    // Beefier bosses: previously 600 base × hpMul; now 700 base + extra solo handicap.
    // Combined with the doubled hpMul values above, bosses now last ~3-4× longer.
    const soloBuff = (playerCount === 1) ? 1.15 : 1.0;
    const baseHp = 700 * phaseDef.hpMul * (1 + (playerCount-1)*0.4) * soloBuff;
    // Phase 11 humanoid is much faster than the lumbering earlier phases.
    const isP11 = state.god.phase === 11;
    const sp = isP11 ? 270 : (50 + state.god.phase*4);
    const e = makeEnemy({
      type: 'boss',
      x: a.w/2, y: 120,
      hp: baseHp, hpMax: baseHp,
      sp,
      r: phaseDef.radius,
      dmg: Math.round((22 + state.god.phase*5) * BOSS_DMG_MUL),
      col: phaseDef.color,
      cd: 0,
      isBoss: true,
      bossPhase: state.god.phase,
    });
    state.enemies.push(e);
    state.god.boss = e;
    showBossBar(phaseDef.name);
    // Big slam landing fx
    particles(e.x, e.y, phaseDef.color, 80, 400, 1.0, 4);
    state.fx.push({x:e.x, y:e.y, vx:0, vy:0, life:0.9, life0:0.9, color:phaseDef.color, r: phaseDef.radius*2.5, ring:true});
    shake(18);
  }

  function update(dt, authority){
    const g = state.god; if(!g) return;
    if(g.mode === 'intro'){
      g.timer -= dt;
      if(g.timer <= 2.0 && !g.boss && authority){
        spawnBoss();
      }
      if(g.timer <= 0){
        g.mode = 'fight';
        hideGodIntro();
      }
      return;
    }
    if(g.mode === 'victory'){
      g.timer -= dt;
      if(g.timer <= 0){ endGame(true); }
      return;
    }
    if(g.mode === 'evolving'){
      // Boss is invincible & visible. Plays the "evolution" cinematic before
      // it explodes & we transition to the next phase. This is the death
      // animation the user asked for.
      g.timer -= dt;
      if(g.boss){
        // Slight upward float + heavy aura while evolving
        g.boss.evoT = (g.boss.evoT || 0) + dt;
        g.boss._evoFlash = (Math.sin(g.boss.evoT * 22) + 1) * 0.5;
        // Spawn evolving particles every ~80ms
        if(!g.boss._evoNext || performance.now() > g.boss._evoNext){
          g.boss._evoNext = performance.now() + 80;
          const pd = BOSS_PHASES[g.phase-1];
          particles(g.boss.x, g.boss.y, pd?pd.color:'#ffffff', 18, 320, 0.8, 3);
        }
        updateBossBarFill(g.boss.hp, g.boss.hpMax);
      }
      if(g.timer <= 0){
        // End of evolution: actually destroy the boss & enter transition
        if(g.boss){
          const b = g.boss;
          const pd = BOSS_PHASES[g.phase-1];
          particles(b.x, b.y, pd?pd.color:'#ffd166', 160, 560, 1.8, 6);
          shake(24);
          state.fx.push({x:b.x, y:b.y, vx:0, vy:0, life:1.2, life0:1.2, color:pd?pd.color:'#ffffff', r: b.r*4, ring:true, _maxR: b.r*4});
          b.dead = true; b.hp = 0;
        }
        _clearAllScheduled();
        _purgeHostileFx();
        hideBossBar();
        g.boss = null;
        g.mode = 'transition';
        g.timer = 2.4;
      }
      return;
    }
    if(g.mode === 'transition'){
      g.timer -= dt;
      if(g.timer <= 0){
        beginPhase(g.phase + 1);
      }
      return;
    }
    // FIGHT phase
    // Bar update needs to survive host migration: when the original host dies,
    // the server promotes a joiner to host (server index.js migrateHost). That
    // promoted client never ran spawnBoss() so g.boss is null — leaving the
    // top-of-screen boss HP bar frozen even though damageEnemy is still
    // decrementing the boss in state.enemies. Re-anchor g.boss here from the
    // live enemy list so the bar always reflects the real fight.
    if(!g.boss){
      const liveBoss = state.enemies.find(en => en && en.isBoss);
      if(liveBoss) g.boss = liveBoss;
    }
    if(g.boss){
      updateBossBarFill(g.boss.hp, g.boss.hpMax);
    }
    if(authority){
      g.pickupTimer -= dt;
      if(g.pickupTimer <= 0){
        // Scale floor-pickup drops with player count: more players → more drops
        // per cycle AND a slightly faster cycle. Solo behavior is unchanged.
        const playerCount = 1 + state.others.size;
        const drops = PICKUP_BASE_PER_CYCLE + (playerCount - 1);
        for(let i=0;i<drops;i++) spawnPickup();
        const intervalMul = 1 / Math.max(1, Math.sqrt(playerCount));
        g.pickupTimer = PICKUP_SPAWN_INTERVAL * intervalMul + Math.random()*PICKUP_SPAWN_JITTER;
      }
    }
  }

  function bossAITick(boss, dt, target){
    if(!isGodMode() || !state.god || state.god.mode !== 'fight') return;
    if(!boss || boss.invincible || boss.evolving || boss.dead) return;
    const g = state.god;
    const phaseDef = BOSS_PHASES[g.phase-1];
    if(!phaseDef) return;
    // Tick down all skill cooldowns
    for(const k in g.skillCooldowns){ g.skillCooldowns[k] = Math.max(0, g.skillCooldowns[k]-dt); }
    g.bossTelegraphCooldown -= dt;
    if(g.bossTelegraphCooldown > 0) return;
    // Pick next skill (round-robin through this phase's skill list)
    const skillId = phaseDef.skills[g.skillIndex % phaseDef.skills.length];
    g.skillIndex++;
    castSkill(boss, skillId, target);
    // Bosses cast faster as phase progresses
    g.bossTelegraphCooldown = Math.max(1.4, 3.6 - g.phase*0.22);
  }

  function castSkill(boss, id, target){
    if(!boss || boss.hp <= 0) return;
    const phaseDef = BOSS_PHASES[state.god.phase-1];
    const col = phaseDef.color;
    SFX.bossSkill(id, 0.85);
    switch(id){
      case 'telegraph_beam': {
        // Multi-beam fan that scales aggressively with phase.
        // Phase 1: 1 wide beam.   Phase 2: 2 beams.    Phase 3: 3 beams.
        // Phase 4: 4 beams.       Phase 5: 5 beams.    Phase 6: 6 beams.
        // Phase 7: 7 beams.       Phase 8+: 8-9 beams + retarget salvo + ring of beams.
        const ph = state.god.phase;
        const beams = ph >= 10 ? 9 : ph >= 8 ? 8 : ph >= 7 ? 7 : ph >= 6 ? 6 : ph >= 5 ? 5 : ph >= 4 ? 4 : ph >= 3 ? 3 : ph >= 2 ? 2 : 1;
        const spread = beams === 1 ? 0 : (Math.PI/8) * (beams-1); // wider fan
        const baseAng = Math.atan2(target.y-boss.y, target.x-boss.x);
        const len = 1600;
        const warnLife = Math.max(0.32, 1.05 - ph*0.085);
        const beamWidth = 40 + Math.min(60, ph*6);
        const dmg = 32 + ph*6;
        for(let b=0; b<beams; b++){
          const t = beams===1 ? 0 : (b/(beams-1)) - 0.5;
          const ang = baseAng + t*spread;
          const ax = boss.x, ay = boss.y;
          const bx = boss.x + Math.cos(ang)*len, by = boss.y + Math.sin(ang)*len;
          state.fx.push({warn:true, ax,ay,bx,by, color:col, life:warnLife, life0:warnLife, beamWidth});
          const beamLife = warnLife + 0.40;
          state.fx.push({beam:true, ax,ay,bx,by, color:col, life:beamLife, life0:beamLife, beamFireAt: 0.32, beamWidth: beamWidth+8, dmg});
        }
        // Phase 7+: a second salvo that retargets the player after first volley.
        if(ph >= 7){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            const p = state.player; if(!p) return;
            const ang2 = Math.atan2(p.y-boss.y, p.x-boss.x);
            const ax = boss.x, ay = boss.y;
            const bx = boss.x + Math.cos(ang2)*len, by = boss.y + Math.sin(ang2)*len;
            state.fx.push({warn:true, ax,ay,bx,by, color:col, life:0.38, life0:0.38, beamWidth: beamWidth+14});
            state.fx.push({beam:true, ax,ay,bx,by, color:col, life:0.7, life0:0.7, beamFireAt: 0.28, beamWidth: beamWidth+20, dmg: dmg+12});
          }, (warnLife+0.45)*1000);
        }
        // Phase 9+: full 360° ring of beams after the fan, almost no safe gap.
        if(ph >= 9){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            const ringBeams = ph >= 10 ? 14 : 10;
            for(let i=0;i<ringBeams;i++){
              const ang = (i/ringBeams)*Math.PI*2 + Math.random()*0.05;
              const ax = boss.x, ay = boss.y;
              const bx = boss.x + Math.cos(ang)*len, by = boss.y + Math.sin(ang)*len;
              state.fx.push({warn:true, ax,ay,bx,by, color:col, life:0.45, life0:0.45, beamWidth: beamWidth-6});
              state.fx.push({beam:true, ax,ay,bx,by, color:col, life:0.8, life0:0.8, beamFireAt: 0.35, beamWidth: beamWidth, dmg: dmg-4});
            }
          }, (warnLife+1.1)*1000);
        }
        break;
      }
      case 'shockwave': {
        // Multi-pulse expanding rings; later phases add follow-up pulses you must keep dodging
        const ph = state.god.phase;
        const pulses = ph >= 9 ? 6 : ph >= 7 ? 5 : ph >= 5 ? 4 : ph >= 3 ? 3 : ph >= 2 ? 2 : 1;
        const baseR = 380 + ph*36;
        const life = Math.max(0.5, 0.9 - ph*0.04);
        const dmg = 24 + ph*5;
        const cadence = Math.max(220, 420 - ph*22);
        for(let k=0;k<pulses;k++){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            const maxR = baseR + k*70;
            state.fx.push({ring:true, x:boss.x, y:boss.y, color:col, life, life0:life, r:0, _maxR:maxR});
            state.fx.push({_shock:true, x:boss.x, y:boss.y, life, life0:life, color:col, r:0, _maxR:maxR, dmg, vx:0,vy:0});
            shake(6);
          }, k*cadence);
        }
        break;
      }
      case 'bullet_spiral': {
        // More arms, faster bullets, longer barrage, and a counter-rotating second layer at higher phases
        const ph = state.god.phase;
        const arms = 4 + Math.min(10, ph*2);
        const waves = 6 + Math.min(10, ph);
        const speed = 320 + ph*22;
        const dmg = 12 + ph*3;
        const offset = Math.random()*Math.PI*2;
        const interval = Math.max(55, 120 - ph*7);
        for(let s=0; s<waves; s++){
          _schedule(()=>{
            if(!boss || boss.dead || boss.invincible) return;
            for(let a=0;a<arms;a++){
              const ang = offset + s*0.3 + (a/arms)*Math.PI*2;
              spawnHostileBullet(boss.x, boss.y, ang, speed, col, dmg);
            }
            // Counter-rotating layer for phase 5+
            if(ph >= 5){
              for(let a=0;a<arms;a++){
                const ang = -offset - s*0.35 + (a/arms)*Math.PI*2 + Math.PI/arms;
                spawnHostileBullet(boss.x, boss.y, ang, speed*0.85, col, dmg);
              }
            }
          }, s*interval);
        }
        break;
      }
      case 'homing_orbs': {
        // More orbs, bigger, faster, longer-lived seeking — relentless at high phases
        const ph = state.god.phase;
        const n = 3 + ph;
        const speed = 180 + ph*20;
        const radius = 10 + Math.min(8, Math.floor(ph/2));
        const dmg = 18 + ph*3;
        for(let i=0;i<n;i++){
          const ang = (i/n)*Math.PI*2 + Math.random()*0.4;
          state.bullets.push({
            x:boss.x, y:boss.y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed,
            color:col, radius, life: 6.0 + ph*0.3, hostile:true,
            dmg, trail:[], _homing:true,
          });
        }
        break;
      }
      case 'summon_minions': {
        // Bigger swarms of tougher, faster minions at high phases.
        const tier = state.god.phase;
        const n = 2 + tier;
        for(let i=0;i<n;i++){
          const ang = Math.random()*Math.PI*2, d=120;
          const x = boss.x+Math.cos(ang)*d, y = boss.y+Math.sin(ang)*d;
          const m = makeEnemy({ type:'phantom', x, y,
            hp:60*(1+tier*0.45), hpMax:60*(1+tier*0.45),
            sp:140 + tier*14, r:13 + Math.min(8, Math.floor(tier/2)),
            dmg:12+tier*3, col:col, isMinion:true });
          state.enemies.push(m);
          particles(x,y,col,16,180,0.6,3);
        }
        // Phase 7+: a second wave from the opposite ring.
        if(tier >= 7){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            for(let i=0;i<n;i++){
              const ang = Math.random()*Math.PI*2, d=180;
              const x = boss.x+Math.cos(ang)*d, y = boss.y+Math.sin(ang)*d;
              const m = makeEnemy({ type:'phantom', x, y,
                hp:60*(1+tier*0.45), hpMax:60*(1+tier*0.45),
                sp:160 + tier*14, r:14, dmg:12+tier*3, col:col, isMinion:true });
              state.enemies.push(m);
              particles(x,y,col,14,180,0.5,3);
            }
          }, 700);
        }
        break;
      }
      case 'teleport_strike': {
        // Chain teleport-slash. High phases hop multiple times, faster each strike.
        const ph = state.god.phase;
        const hops = ph >= 9 ? 4 : ph >= 7 ? 3 : ph >= 5 ? 2 : 1;
        const warnLife = Math.max(0.32, 0.6 - ph*0.03);
        const dmg = 28 + ph*5;
        const radius = 100 + Math.min(40, ph*4);
        const doHop = (idx)=>{
          if(!boss || boss.dead) return;
          const p = state.player; if(!p) return;
          particles(boss.x, boss.y, col, 24, 240, 0.5, 3);
          const ang = Math.random()*Math.PI*2;
          const nx = p.x + Math.cos(ang)*60, ny = p.y + Math.sin(ang)*60;
          // Telegraph cross at landing spot
          state.fx.push({warn:true, ax:nx-50, ay:ny, bx:nx+50, by:ny, color:col, life:warnLife, life0:warnLife, beamWidth:radius});
          state.fx.push({warn:true, ax:nx, ay:ny-50, bx:nx, by:ny+50, color:col, life:warnLife, life0:warnLife, beamWidth:radius});
          _schedule(()=>{
            if(!boss || boss.dead) return;
            boss.x = nx; boss.y = ny;
            particles(nx, ny, col, 40, 280, 0.7, 3);
            state.fx.push({ring:true, x:nx, y:ny, color:col, life:0.5, life0:0.5, r:radius, _maxR:radius});
            _hitPlayersInRadius(nx, ny, radius, dmg * BOSS_DMG_MUL, {shake:10, fx:'#ff3d6a'});
            if(idx+1 < hops){ _schedule(()=>doHop(idx+1), 280); }
          }, warnLife*1000);
        };
        doHop(0);
        break;
      }
      case 'clone_split': {
        const tier = state.god.phase;
        const clones = tier >= 9 ? 5 : tier >= 6 ? 4 : tier >= 4 ? 3 : 2;
        for(let i=0;i<clones;i++){
          const ang = (i/clones)*Math.PI*2 + Math.random()*0.3;
          const x = boss.x + Math.cos(ang)*90, y = boss.y + Math.sin(ang)*90;
          const c = makeEnemy({type:'phantom', x, y,
            hp:120*(1+tier*0.35), hpMax:120*(1+tier*0.35),
            sp:200 + tier*16, r:18 + Math.min(8, Math.floor(tier/2)),
            dmg:18+tier*3, col:col, isMinion:true});
          state.enemies.push(c);
        }
        particles(boss.x, boss.y, col, 30, 260, 0.5, 3);
        break;
      }
      case 'void_zone': {
        // More zones, bigger, more damage at higher phases.
        const ph = state.god.phase;
        const n = 3 + Math.floor(ph/2);
        const radius = 90 + Math.min(60, ph*6);
        const dps = 22 + ph*5;
        for(let i=0;i<n;i++){
          const a = state.arena;
          const x = 100 + Math.random()*(a.w-200), y = 100 + Math.random()*(a.h-200);
          state.fx.push({zone:true, x, y, color:col, life:7, life0:7, r:radius, dps});
          state.fx.push({ring:true, x, y, color:col, life:0.6, life0:0.6, r:radius, _maxR:radius});
        }
        // Phase 8+: drop one zone directly under the player to force movement.
        if(ph >= 8){
          const p = state.player;
          if(p){
            state.fx.push({zone:true, x:p.x, y:p.y, color:col, life:7, life0:7, r:radius, dps:dps+6});
            state.fx.push({ring:true, x:p.x, y:p.y, color:col, life:0.6, life0:0.6, r:radius, _maxR:radius});
          }
        }
        break;
      }
      case 'meteor_rain': {
        // More meteors, faster cadence, faster impact, and player-tracked drops at high phases
        const ph = state.god.phase;
        const n = 4 + ph*2;
        const cadence = Math.max(70, 180 - ph*12);
        const impactDelay = Math.max(450, 900 - ph*55);
        const dmg = 25 + ph*4;
        const radius = 70 + Math.min(30, ph*3);
        for(let i=0;i<n;i++){
          _schedule(()=>{
            const a = state.arena;
            const p = state.player;
            let x, y;
            // Phase 5+: half the meteors target the player's predicted location
            if(ph >= 5 && p && (i % 2 === 0)){
              x = p.x + (Math.random()-0.5)*120;
              y = p.y + (Math.random()-0.5)*120;
              x = Math.max(80, Math.min(a.w-80, x));
              y = Math.max(80, Math.min(a.h-80, y));
            } else {
              x = 100 + Math.random()*(a.w-200);
              y = 100 + Math.random()*(a.h-200);
            }
            state.fx.push({ring:true, x, y, color:col, life:0.9, life0:0.9, r:radius-10, _maxR:radius-10});
            _schedule(()=>{
              _hitPlayersInRadius(x, y, radius, dmg * BOSS_DMG_MUL, {shake:8, fx:'#ff3d6a'});
              particles(x, y, col, 40, 320, 0.7, 4);
              state.fx.push({ring:true, x, y, color:col, life:0.4, life0:0.4, r:radius+20, _maxR:radius+20});
            }, impactDelay);
          }, i*cadence);
        }
        break;
      }
      case 'laser_sweep': {
        // Faster sweep, wider arc, more ticks, and a 4-way cross at phase 7+
        const ph = state.god.phase;
        const startAng = Math.atan2(target.y-boss.y, target.x-boss.x);
        const sweepDur = Math.max(0.8, 1.6 - ph*0.08);
        const ticks = 12 + Math.min(18, ph*2);
        const arc = Math.PI*1.2 + Math.min(Math.PI*0.6, ph*0.08);
        const beamWidth = 24 + Math.min(20, ph*2);
        const dmg = 14 + ph*3;
        const beams = ph >= 7 ? 4 : ph >= 4 ? 2 : 1;
        for(let i=0;i<ticks;i++){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            const t = (i/ticks)*arc - arc/2;
            for(let b=0;b<beams;b++){
              const ang = startAng + t + b*(Math.PI*2/beams);
              const ax=boss.x, ay=boss.y, bx=boss.x+Math.cos(ang)*1200, by=boss.y+Math.sin(ang)*1200;
              state.fx.push({beam:true, ax,ay,bx,by, color:col, life:0.18, life0:0.18, beamFireAt:0.16, beamWidth, dmg});
            }
          }, i*(sweepDur*1000/ticks));
        }
        break;
      }
      case 'ground_spikes': {
        // Single line at low phases grows into a fan of spike-lines at high phases
        const ph = state.god.phase;
        const baseAng = Math.atan2(target.y-boss.y, target.x-boss.x);
        const lines = ph >= 7 ? 5 : ph >= 5 ? 3 : ph >= 3 ? 2 : 1;
        const n = 8 + Math.min(6, ph);
        const spread = lines === 1 ? 0 : (Math.PI/6) * (lines-1);
        const dmg = 20 + ph*3;
        const radius = 50 + Math.min(20, ph*2);
        const delay = Math.max(400, 800 - ph*40);
        for(let l=0; l<lines; l++){
          const t = lines===1 ? 0 : (l/(lines-1)) - 0.5;
          const ang = baseAng + t*spread;
          for(let i=1;i<=n;i++){
            const x = boss.x + Math.cos(ang)*i*70, y = boss.y + Math.sin(ang)*i*70;
            state.fx.push({ring:true, x, y, color:col, life:0.8, life0:0.8, r:40, _maxR:40});
            _schedule(()=>{
              _hitPlayersInRadius(x, y, radius, dmg * BOSS_DMG_MUL, {shake:6, fx:'#ff3d6a'});
              particles(x,y,col,18,260,0.5,3);
            }, delay + i*30);
          }
        }
        break;
      }
      case 'dash_strike': {
        // Multi-dash chain that retargets the player each hop; tighter telegraph at high phases
        const ph = state.god.phase;
        const dashes = ph >= 10 ? 4 : ph >= 8 ? 3 : ph >= 5 ? 2 : 1;
        const warnLife = Math.max(0.32, 0.7 - ph*0.04);
        const dmg = 35 + ph*5;
        const dashStep = (dashIdx)=>{
          if(!boss || boss.dead) return;
          const p = state.player; if(!p) return;
          const ang = Math.atan2(p.y-boss.y, p.x-boss.x);
          const ax=boss.x, ay=boss.y, bx=boss.x+Math.cos(ang)*900, by=boss.y+Math.sin(ang)*900;
          state.fx.push({warn:true, ax,ay,bx,by, color:col, life:warnLife, life0:warnLife, beamWidth:80});
          _schedule(()=>{
            if(!boss || boss.dead) return;
            boss.x += Math.cos(ang)*600; boss.y += Math.sin(ang)*600;
            boss.x = Math.max(80, Math.min(state.arena.w-80, boss.x));
            boss.y = Math.max(80, Math.min(state.arena.h-80, boss.y));
            particles(boss.x, boss.y, col, 50, 360, 0.7, 4);
            shake(10);
            _hitPlayersInRadius(boss.x, boss.y, 110, dmg * BOSS_DMG_MUL, {fx:'#ff3d6a'});
            if(dashIdx+1 < dashes){
              _schedule(()=>dashStep(dashIdx+1), 220);
            }
          }, warnLife*1000);
        };
        dashStep(0);
        break;
      }
      case 'chain_lightning': {
        // NERFED: fewer bolts, lower per-bolt damage, and the second arc only
        // appears at very high phases. Boss chain lightning was hitting too
        // hard — now it's a threat instead of a one-shot.
        const ph = state.god.phase;
        const p = state.player; if(!p) break;
        const bolts = 3 + Math.min(4, Math.floor(ph/2));   // was 5 + min(8, ph)
        const beamW = 12 + Math.min(12, ph);                // was 16 + min(20, ph*2)
        const dmg = 6 + ph*1.5;                             // was 12 + ph*3
        let prevX = boss.x, prevY = boss.y;
        for(let i=0;i<bolts;i++){
          const tx = p.x + (Math.random()-0.5)*240;
          const ty = p.y + (Math.random()-0.5)*240;
          state.fx.push({beam:true, ax:prevX, ay:prevY, bx:tx, by:ty, color:'#ffd166', life:0.5, life0:0.5, beamFireAt:0.45, beamWidth:beamW, dmg});
          prevX = tx; prevY = ty;
        }
        // Second arc only at phase 9+, and weaker than before.
        if(ph >= 9){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            const pp = state.player; if(!pp) return;
            let px = boss.x, py = boss.y;
            for(let i=0;i<bolts;i++){
              const tx = pp.x + (Math.random()-0.5)*260;
              const ty = pp.y + (Math.random()-0.5)*260;
              state.fx.push({beam:true, ax:px, ay:py, bx:tx, by:ty, color:'#ffd166', life:0.45, life0:0.45, beamFireAt:0.40, beamWidth:beamW, dmg:dmg+1});
              px = tx; py = ty;
            }
          }, 700);
        }
        break;
      }
      case 'black_hole': {
        // Pulls player toward boss for 2s. Auto-cancels when boss dies.
        const life = 2.0;
        state.fx.push({_pull:true, x:boss.x, y:boss.y, life, life0:life, color:'#000', r:200, _bossRef:boss});
        state.fx.push({ring:true, x:boss.x, y:boss.y, color:col, life, life0:life, r:200, _maxR:200, _bossRef:boss});
        break;
      }
      case 'reality_break': {
        shake(20);
        state.fx.push({_flash:true, life:0.8, life0:0.8, color:'#fff'});
        for(let s=0;s<4;s++){
          _schedule(()=>{ if(!boss||boss.dead) return; castSkill(boss,'bullet_spiral',target); }, s*200);
        }
        _schedule(()=>{ if(!boss||boss.dead) return; castSkill(boss,'meteor_rain',target); }, 400);
        _schedule(()=>{ if(!boss||boss.dead) return; castSkill(boss,'shockwave',target); }, 800);
        break;
      }
      // ===================================================================
      // NEW SKILLS (this patch)
      // ===================================================================
      case 'prismatic_burst': {
        // Staggered rings, more layers + faster cadence at higher phases.
        const ph = state.god.phase;
        const colors = ['#22e8ff', '#ff2bd6', '#ffd166', '#9d5cff', '#3dffb0'];
        const layers = ph >= 9 ? 5 : ph >= 6 ? 4 : 3;
        const cadence = Math.max(140, 260 - ph*14);
        const dmg = 20 + ph*3;
        for(let i=0;i<layers;i++){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            const c = colors[i % colors.length];
            const maxR = 240 + ph*26 + i*60;
            const life = 0.85;
            state.fx.push({ring:true, x:boss.x, y:boss.y, color:c, life, life0:life, r:0, _maxR:maxR});
            state.fx.push({_shock:true, x:boss.x, y:boss.y, life, life0:life, color:c, r:0, _maxR:maxR, dmg, vx:0, vy:0});
          }, i*cadence);
        }
        shake(8);
        break;
      }
      case 'gravity_well': {
        // REWORKED: previously this used a _pull effect anchored to the boss
        // via _bossRef which on phase 8 (the Forge of Endings, who never moves
        // from arena center) would yank the player into the stationary boss
        // body and lock them inside it — the camera/player could end up
        // visually frozen on top of the boss and the map appeared to vanish.
        //
        // New behavior: "Singularity Crush" — three telegraphed crush sites
        // erupt around the player. No player teleporting, no _pull, no
        // _bossRef — completely safe and even more punishing on dodging.
        const ph = state.god.phase;
        const sites = ph >= 9 ? 5 : ph >= 7 ? 4 : ph >= 5 ? 3 : 2;
        const radius = 110 + Math.min(50, ph*5);
        const dmg = 32 + ph*5;
        const warnLife = Math.max(0.55, 1.0 - ph*0.05);
        const p0 = state.player;
        const px0 = p0 ? p0.x : boss.x;
        const py0 = p0 ? p0.y : boss.y;
        for(let i=0;i<sites;i++){
          const ang = (i/sites)*Math.PI*2 + Math.random()*0.4;
          const dist = i === 0 ? 0 : 90 + Math.random()*120;
          const sx = px0 + Math.cos(ang)*dist;
          const sy = py0 + Math.sin(ang)*dist;
          // Telegraph: pulsing ring + warning crosshair
          state.fx.push({ring:true, x:sx, y:sy, color:col, life:warnLife, life0:warnLife, r:radius, _maxR:radius});
          state.fx.push({warn:true, ax:sx-radius, ay:sy, bx:sx+radius, by:sy, color:col, life:warnLife, life0:warnLife, beamWidth:radius*2});
          state.fx.push({warn:true, ax:sx, ay:sy-radius, bx:sx, by:sy+radius, color:col, life:warnLife, life0:warnLife, beamWidth:radius*2});
          // Detonation: shockwave + flash damage at center
          _schedule(()=>{
            shake(10);
            particles(sx, sy, col, 50, 360, 0.7, 4);
            state.fx.push({ring:true, x:sx, y:sy, color:col, life:0.55, life0:0.55, r:0, _maxR:radius+30});
            state.fx.push({_shock:true, x:sx, y:sy, life:0.55, life0:0.55, color:col, r:0, _maxR:radius+30, dmg:dmg-6, vx:0, vy:0});
            _hitPlayersInRadius(sx, sy, radius, dmg * BOSS_DMG_MUL, {fx:'#ff3d6a'});
          }, warnLife*1000 + i*120);
        }
        shake(10);
        break;
      }
      case 'shadow_clones_assault': {
        // More clones, tighter ring, faster beams at high phases.
        const ph = state.god.phase;
        const cloneCount = ph >= 9 ? 8 : ph >= 6 ? 6 : 4;
        const cloneRad = 240;
        const warnLife = Math.max(0.45, 0.8 - ph*0.04);
        const dmg = 24 + ph*4;
        const beamW = 30 + Math.min(20, ph*2);
        for(let i=0;i<cloneCount;i++){
          const ang0 = (i/cloneCount)*Math.PI*2;
          const cx = boss.x + Math.cos(ang0)*cloneRad;
          const cy = boss.y + Math.sin(ang0)*cloneRad;
          state.fx.push({ring:true, x:cx, y:cy, color:'#9d5cff', life:0.6, life0:0.6, r:30, _maxR:30});
          particles(cx, cy, '#9d5cff', 24, 220, 0.6, 3);
          _schedule(()=>{
            const p = state.player; if(!p) return;
            const ang = Math.atan2(p.y-cy, p.x-cx);
            const len = 1100;
            const ax=cx, ay=cy, bx=cx+Math.cos(ang)*len, by=cy+Math.sin(ang)*len;
            state.fx.push({warn:true, ax,ay,bx,by, color:'#9d5cff', life:warnLife, life0:warnLife, beamWidth:26});
            _schedule(()=>{
              state.fx.push({beam:true, ax,ay,bx,by, color:'#9d5cff', life:0.35, life0:0.35, beamFireAt:0.20, beamWidth:beamW, dmg});
            }, warnLife*1000);
          }, 500 + i*60);
        }
        // Phase 8+: clones fire a second salvo retargeting the player.
        if(ph >= 8){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            for(let i=0;i<cloneCount;i++){
              const ang0 = (i/cloneCount)*Math.PI*2;
              const cx = boss.x + Math.cos(ang0)*cloneRad;
              const cy = boss.y + Math.sin(ang0)*cloneRad;
              const p = state.player; if(!p) return;
              const ang = Math.atan2(p.y-cy, p.x-cx);
              const len = 1100;
              const ax=cx, ay=cy, bx=cx+Math.cos(ang)*len, by=cy+Math.sin(ang)*len;
              state.fx.push({warn:true, ax,ay,bx,by, color:'#9d5cff', life:0.4, life0:0.4, beamWidth:26});
              _schedule(()=>{
                state.fx.push({beam:true, ax,ay,bx,by, color:'#9d5cff', life:0.32, life0:0.32, beamFireAt:0.18, beamWidth:beamW, dmg:dmg+4});
              }, 400);
            }
          }, 1800);
        }
        break;
      }
      case 'time_freeze_pulse': {
        // Longer freeze, denser bullet ring, plus a follow-up wave at high phase.
        const ph = state.god.phase;
        const p = state.player;
        const freezeDur = 1.6 + ph*0.12;
        if(p){ p.timeFreezeUntil = state.time + freezeDur; }
        state.fx.push({ring:true, x:boss.x, y:boss.y, color:'#22e8ff', life:0.6, life0:0.6, r:0, _maxR:140 + ph*10});
        const arms = 18 + Math.min(18, ph*2);
        const dmg = 16 + ph*3;
        for(let a=0;a<arms;a++){
          const ang = (a/arms)*Math.PI*2;
          spawnHostileBullet(boss.x, boss.y, ang, 240 + ph*15, '#22e8ff', dmg);
        }
        // Phase 6+: counter-rotating second ring.
        if(ph >= 6){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            for(let a=0;a<arms;a++){
              const ang = (a/arms)*Math.PI*2 + Math.PI/arms;
              spawnHostileBullet(boss.x, boss.y, ang, 200 + ph*12, '#22e8ff', dmg);
            }
          }, 350);
        }
        state.fx.push({_flash:true, life:0.35, life0:0.35, color:'#22e8ff'});
        break;
      }
      case 'radial_collapse': {
        // OPTIMIZED nova replacement (used on phase 10). Same implode→explode
        // *feeling* as nova_implosion but spawns ZERO bullets — just a few
        // ring fx + telegraphed beam spokes + 2 timed damage bands. Cheap.
        const ph = state.god.phase;
        const dmgIn  = (32 + ph*3) * BOSS_DMG_MUL;
        const dmgOut = (28 + ph*3) * BOSS_DMG_MUL;
        const ringR  = 360 + ph*8;
        const implodeMs = 850;
        // 1) Implosion telegraph: contracting ring + 6 warning spokes.
        state.fx.push({ring:true, x:boss.x, y:boss.y, color:col, life:implodeMs/1000, life0:implodeMs/1000, r:ringR, _maxR:ringR, _shrink:true, _bossRef:boss});
        const spokes = 6;
        for(let i=0;i<spokes;i++){
          const ang = (i/spokes)*Math.PI*2;
          const ax = boss.x, ay = boss.y;
          const bx = boss.x + Math.cos(ang)*ringR;
          const by = boss.y + Math.sin(ang)*ringR;
          state.fx.push({warn:true, ax,ay,bx,by, color:col, life:implodeMs/1000, life0:implodeMs/1000, beamWidth:14});
        }
        // 2) Implosion hit: damage anyone close to boss.
        _schedule(()=>{
          if(!boss || boss.dead) return;
          shake(10);
          state.fx.push({_flash:true, life:0.25, life0:0.25, color:col});
          state.fx.push({ring:true, x:boss.x, y:boss.y, color:col, life:0.35, life0:0.35, r:0, _maxR:120});
          _hitPlayersInRadius(boss.x, boss.y, 110, dmgIn, {fx:col});
        }, implodeMs);
        // 3) Outward shockwave: single big expanding ring + 2 timed damage
        // bands at known radii. No bullets — much lighter than nova.
        const explodeAt = implodeMs + 120;
        const finalR = 380 + ph*16;
        _schedule(()=>{
          if(!boss || boss.dead) return;
          shake(16);
          state.fx.push({_flash:true, life:0.40, life0:0.40, color:col});
          state.fx.push({ring:true, x:boss.x, y:boss.y, color:col, life:0.85, life0:0.85, r:0, _maxR:finalR});
          // Slim outer halo for extra readability without extra bullets.
          state.fx.push({ring:true, x:boss.x, y:boss.y, color:'#ffffff', life:0.65, life0:0.65, r:0, _maxR:finalR*0.92});
        }, explodeAt);
        // Two bands: inner band ~250ms after explosion, outer ~550ms.
        const checkBand = (delay, rMin, rMax)=>{
          _schedule(()=>{
            if(!boss || boss.dead) return;
            _hitPlayersInAnnulus(boss.x, boss.y, rMin, rMax, dmgOut, {fx:col});
          }, delay);
        };
        checkBand(explodeAt + 240, 100, finalR*0.55);
        checkBand(explodeAt + 540, finalR*0.50, finalR);
        break;
      }
      case 'nova_implosion': {
        // Implode: inward ring of bullets, then a 360° outward blast.
        // Higher phases = more bullets, faster, plus a third "echo" wave.
        const ph = state.god.phase;
        const ringR = 360 + ph*10;
        const inN = 16 + Math.min(20, ph*2);
        const inSpeed = 260 + ph*18;
        const outArms = 24 + Math.min(24, ph*2);
        const outSpeed = 360 + ph*22;
        const inDmg = 18 + ph*3;
        const outDmg = 20 + ph*3;
        const implodeDelay = Math.max(900, 1500 - ph*60);
        for(let a=0;a<inN;a++){
          const ang = (a/inN)*Math.PI*2;
          const sx = boss.x + Math.cos(ang)*ringR;
          const sy = boss.y + Math.sin(ang)*ringR;
          spawnHostileBullet(sx, sy, ang + Math.PI, inSpeed, col, inDmg);
        }
        // Outward blast
        _schedule(()=>{
          if(!boss || boss.dead) return;
          shake(14);
          state.fx.push({_flash:true, life:0.4, life0:0.4, color:col});
          for(let a=0;a<outArms;a++){
            const ang = (a/outArms)*Math.PI*2;
            spawnHostileBullet(boss.x, boss.y, ang, outSpeed, col, outDmg);
          }
          state.fx.push({ring:true, x:boss.x, y:boss.y, color:col, life:0.7, life0:0.7, r:0, _maxR:300 + ph*15});
        }, implodeDelay);
        // Phase 7+: echo wave — rotated, slower, bigger AoE.
        if(ph >= 7){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            for(let a=0;a<outArms;a++){
              const ang = (a/outArms)*Math.PI*2 + Math.PI/outArms;
              spawnHostileBullet(boss.x, boss.y, ang, outSpeed*0.8, col, outDmg-2);
            }
            state.fx.push({ring:true, x:boss.x, y:boss.y, color:col, life:0.7, life0:0.7, r:0, _maxR:360});
          }, implodeDelay + 450);
        }
        break;
      }
      // ===================================================================
      // PHASE-11 NINJA SKILLS (new in this patch). Boss flips brief invuln
      // frames during blinks/dashes for an "untouchable" feel.
      // ===================================================================
      case 'phantom_step': {
        // Chain blink-slash: boss teleports around the player up to 7 times,
        // each blink is a tight cross telegraph followed by a slash. Boss
        // is briefly untouchable for the whole sequence.
        const ph = state.god.phase;
        const hops = ph >= 11 ? 6 : Math.max(3, Math.floor(ph/2));
        const dmg = 28 + ph*5;
        const radius = 90;
        const warnLife = 0.20;
        boss.invincible = true;
        const doStep = (idx)=>{
          if(!boss || boss.dead){ if(boss) boss.invincible = false; return; }
          const p = state.player;
          if(!p){ boss.invincible = false; return; }
          const ang = Math.random()*Math.PI*2;
          const nx = Math.max(80, Math.min(state.arena.w-80, p.x + Math.cos(ang)*70));
          const ny = Math.max(80, Math.min(state.arena.h-80, p.y + Math.sin(ang)*70));
          // Telegraph cross at landing spot
          state.fx.push({warn:true, ax:nx-radius*0.7, ay:ny, bx:nx+radius*0.7, by:ny, color:'#ffffff', life:warnLife, life0:warnLife, beamWidth:radius});
          state.fx.push({warn:true, ax:nx, ay:ny-radius*0.7, bx:nx, by:ny+radius*0.7, color:'#ffffff', life:warnLife, life0:warnLife, beamWidth:radius});
          _schedule(()=>{
            if(!boss || boss.dead) return;
            particles(boss.x, boss.y, '#ffffff', 18, 220, 0.4, 3);
            boss.x = nx; boss.y = ny;
            particles(nx, ny, '#ffffff', 30, 280, 0.6, 3);
            state.fx.push({ring:true, x:nx, y:ny, color:'#ffffff', life:0.4, life0:0.4, r:0, _maxR:radius});
            _hitPlayersInRadius(nx, ny, radius, dmg * BOSS_DMG_MUL, {shake:8, fx:'#ff3d6a'});
            if(idx+1 < hops){
              _schedule(()=>doStep(idx+1), 160);
            } else {
              _schedule(()=>{ if(boss && !boss.dead) boss.invincible = false; }, 280);
            }
          }, warnLife*1000);
        };
        doStep(0);
        break;
      }
      case 'shuriken_storm': {
        // Multiple waves of curving shuriken sprayed in sweeping arcs.
        const ph = state.god.phase;
        const waves = 5 + Math.min(8, Math.floor(ph/2));
        const arms = 14 + Math.min(14, ph);
        const dmg = 14 + ph*3;
        const speed = 280 + ph*16;
        for(let s=0; s<waves; s++){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            const sweep = (s%2===0) ? 1 : -1;
            for(let a=0; a<arms; a++){
              const ang = (a/arms)*Math.PI*2 + sweep*s*0.42;
              spawnHostileBullet(boss.x, boss.y, ang, speed, '#ffffff', dmg);
            }
          }, s*120);
        }
        // Phase 11 follow-up: a second, denser ring tracking the player.
        if(ph >= 11){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            const p = state.player; if(!p) return;
            const baseAng = Math.atan2(p.y-boss.y, p.x-boss.x);
            const denseArms = arms + 6;
            for(let a=0; a<denseArms; a++){
              const ang = baseAng + (a/denseArms)*Math.PI*2;
              spawnHostileBullet(boss.x, boss.y, ang, speed*1.05, '#ffffff', dmg+2);
            }
          }, waves*120 + 200);
        }
        break;
      }
      case 'umbral_dash': {
        // Boss is briefly untouchable, dashes across the arena leaving a
        // damaging slash beam. Up to 3 chained dashes at high phases.
        const ph = state.god.phase;
        const dashes = ph >= 11 ? 3 : (ph >= 7 ? 2 : 1);
        const dmg = 36 + ph*5;
        const dashStep = (idx)=>{
          if(!boss || boss.dead){ if(boss) boss.invincible = false; return; }
          const p = state.player;
          if(!p){ boss.invincible = false; return; }
          const ang = Math.atan2(p.y-boss.y, p.x-boss.x) + (Math.random()-0.5)*0.35;
          const len = 720;
          const ax = boss.x, ay = boss.y;
          const bx = boss.x + Math.cos(ang)*len, by = boss.y + Math.sin(ang)*len;
          state.fx.push({warn:true, ax,ay,bx,by, color:'#ffffff', life:0.24, life0:0.24, beamWidth:60});
          boss.invincible = true;
          _schedule(()=>{
            if(!boss || boss.dead){ boss.invincible = false; return; }
            // Slash beam stays as the dash trail
            state.fx.push({beam:true, ax,ay,bx,by, color:'#ffffff', life:0.40, life0:0.40, beamFireAt:0.22, beamWidth:70, dmg});
            boss.x = Math.max(80, Math.min(state.arena.w-80, bx));
            boss.y = Math.max(80, Math.min(state.arena.h-80, by));
            particles(boss.x, boss.y, '#ffffff', 50, 360, 0.7, 4);
            shake(10);
            _schedule(()=>{ if(boss && !boss.dead) boss.invincible = false; }, 200);
            if(idx+1 < dashes){ _schedule(()=>dashStep(idx+1), 380); }
          }, 240);
        };
        dashStep(0);
        break;
      }
      case 'mirror_legion': {
        // Ring of telegraphed shadow doubles, each fires a dash-slash beam
        // at the player from a different angle. Hard to dodge in the open.
        const ph = state.god.phase;
        const clones = ph >= 11 ? 6 : (ph >= 7 ? 5 : 4);
        const dmg = 26 + ph*4;
        const ringR = 240;
        for(let i=0; i<clones; i++){
          _schedule(()=>{
            if(!boss || boss.dead) return;
            const ang0 = (i/clones)*Math.PI*2 + Math.random()*0.2;
            const cx = boss.x + Math.cos(ang0)*ringR;
            const cy = boss.y + Math.sin(ang0)*ringR;
            particles(cx, cy, '#ffffff', 24, 220, 0.6, 3);
            state.fx.push({ring:true, x:cx, y:cy, color:'#ffffff', life:0.45, life0:0.45, r:0, _maxR:38});
            const p = state.player; if(!p) return;
            const ang2 = Math.atan2(p.y-cy, p.x-cx);
            const len = 900;
            const ax=cx, ay=cy, bx=cx+Math.cos(ang2)*len, by=cy+Math.sin(ang2)*len;
            state.fx.push({warn:true, ax,ay,bx,by, color:'#ffffff', life:0.45, life0:0.45, beamWidth:36});
            _schedule(()=>{
              state.fx.push({beam:true, ax,ay,bx,by, color:'#ffffff', life:0.32, life0:0.32, beamFireAt:0.18, beamWidth:56, dmg});
            }, 450);
          }, i*150);
        }
        break;
      }
      case 'eclipse_finale': {
        // Phase 11 ultimate combo. Heavier than reality_break — interleaves
        // a shuriken storm, a prismatic burst, a nova, meteors and lightning.
        shake(24);
        state.fx.push({_flash:true, life:1.0, life0:1.0, color:'#ffffff'});
        _schedule(()=>{ if(!boss||boss.dead) return; castSkill(boss, 'shuriken_storm', target); }, 100);
        _schedule(()=>{ if(!boss||boss.dead) return; castSkill(boss, 'prismatic_burst',  target); }, 700);
        _schedule(()=>{ if(!boss||boss.dead) return; castSkill(boss, 'nova_implosion',   target); }, 1300);
        _schedule(()=>{ if(!boss||boss.dead) return; castSkill(boss, 'meteor_rain',      target); }, 2200);
        _schedule(()=>{ if(!boss||boss.dead) return; castSkill(boss, 'chain_lightning',  target); }, 2700);
        _schedule(()=>{ if(!boss||boss.dead) return; castSkill(boss, 'phantom_step',     target); }, 3300);
        break;
      }
      default: break;
    }
  }

  function spawnHostileBullet(x,y,ang,speed,color,dmg){
    state.bullets.push({
      x, y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed,
      color, radius:9, life:3.5, hostile:true, dmg, trail:[],
    });
  }

  function _nextPid(){
    // Salt with the host's session id (last 4 chars) so a host migration
    // doesn't accidentally collide pids with the previous host's history.
    const salt = (state.mySessionId || 'host').slice(-4);
    return `${salt}-${state.pickupSeq++}`;
  }

  function spawnPickup(){
    const a = state.arena;
    const x = 120 + Math.random()*(a.w-240);
    const y = 120 + Math.random()*(a.h-240);
    const upg = UPGRADES[Math.floor(Math.random()*UPGRADES.length)];
    const rarity = rollRarity();
    const pk = { pid:_nextPid(), id:upg.id, name:upg.name, rarity:rarity.id, color:(upg.color||rarity.color), x, y, t:0 };
    state.pickups.push(pk);
    broadcastPickupSpawn(pk);
    // Spawn fx scales with rarity — legendary is unmissable.
    const sparkColor = rarity.id === 'common' ? (upg.color || '#ffd166') : rarity.color;
    const sparkN = rarity.id === 'common' ? 12 : (rarity.id === 'rare' ? 24 : (rarity.id === 'epic' ? 40 : 70));
    const sparkSpd = rarity.id === 'common' ? 140 : 240;
    particles(x, y, sparkColor, sparkN, sparkSpd, 0.7, 2);
    if(rarity.id !== 'common'){
      // Drop-in shockwave ring so the player notices a special drop landing.
      const r0 = rarity.id === 'legendary' ? 110 : (rarity.id === 'epic' ? 80 : 55);
      state.fx.push({ring:true, x, y, color:rarity.color, life:0.55, life0:0.55, r:0, _maxR:r0});
    }
  }

  // Special drop: when a boss dies, drop a fragment of its signature skill.
  // Anyone can collect it — but only the first to walk over it claims it.
  function spawnBossSkillPickup(boss, phaseDef){
    if(!phaseDef || !phaseDef.signature) return;
    const info = PLAYER_BOSS_SKILL_INFO[phaseDef.signature];
    const pk = {
      pid: _nextPid(),
      bossSkill: true,
      skillId: phaseDef.signature,
      skillName: info ? info.name : phaseDef.signature,
      color: phaseDef.color,
      phase: state.god ? state.god.phase : 0,
      x: boss.x, y: boss.y,
      t: 0,
    };
    state.pickups.push(pk);
    broadcastPickupSpawn(pk);
    // Big flashy spawn fx so players notice the special drop.
    particles(boss.x, boss.y, phaseDef.color, 60, 320, 0.9, 4);
    state.fx.push({ring:true, x:boss.x, y:boss.y, color:phaseDef.color, life:0.9, life0:0.9, r:0, _maxR:140});
  }

  function onBossDefeated(boss){
    const g = state.god; if(!g) return;
    // Already evolving? ignore re-trigger.
    if(g.mode === 'evolving' || g.mode === 'transition') return;
    // Award score + SP for this phase kill: bigger phase = more points.
    const phaseBonus = g.phase * 200;
    state.score = (state.score || 0) + phaseBonus;
    try { addSP(g.phase * 100); } catch(_){}
    try { toast(`PHASE ${g.phase} SLAIN  +${phaseBonus} PTS  +${g.phase*100} SP`, 2200); } catch(_){}
    const phaseDef = BOSS_PHASES[g.phase-1];
    // CINEMATIC EVOLUTION: boss is invincible, plays evolving animation,
    // crossfades to next phase music if there's a next phase.
    boss.invincible = true;
    boss.evolving = true;
    boss.evoT = 0;
    g.mode = 'evolving';
    g.timer = 2.6;                 // evolution length
    // Cancel any in-flight skill timeouts so the dying boss stops attacking.
    _clearAllScheduled();
    // Wipe damaging fx so the player isn't killed during the cinematic.
    _purgeHostileFx();
    // Heal player a bit + clear pickups stacking
    if(state.player){ state.player.hp = Math.min(state.player.hpMax, state.player.hp + state.player.hpMax*0.25); }
    spawnPickup();
    // Drop the boss's signature skill as a special pickup — first player to
    // walk over it acquires a low-version of that skill on the F button.
    spawnBossSkillPickup(boss, phaseDef);
    showWaveBanner(`PHASE ${g.phase} EVOLVING…`, (phaseDef ? phaseDef.name.toUpperCase() : 'BOSS') + ' BREAKING DOWN', 2400);
    // Crossfade to next phase music early so the audio carries the transition.
    const nextDef = BOSS_PHASES[g.phase];   // next phase or undefined
    if(nextDef && nextDef.music){
      SFX.playMusic(nextDef.music, 1800);
    } else {
      // Final boss → fade music out for the victory beat
      SFX.stopMusic(1500);
    }
    SFX.bossSkill('intro_roar', 0.7);
    shake(22);
    particles(boss.x, boss.y, phaseDef ? phaseDef.color : '#ffd166', 100, 380, 1.2, 4);
    state.fx.push({x:boss.x, y:boss.y, vx:0, vy:0, life:0.9, life0:0.9, color: phaseDef?phaseDef.color:'#ffffff', r: boss.r*2.5, ring:true, _maxR: boss.r*2.5});
  }

  return { start, beginPhase, update, bossAITick, onBossDefeated };
})();

// ---------- God Mode UI ----------
function showGodIntro(phaseTxt, name, title, rank){
  const el = document.getElementById('godIntro');
  if(!el) return;
  document.getElementById('gPhaseText').textContent = phaseTxt;
  document.getElementById('gNameText').textContent  = name;
  document.getElementById('gTitleText').textContent = title;
  document.getElementById('gRankText').textContent  = rank;
  // restart animations
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(showGodIntro._t);
  showGodIntro._t = setTimeout(()=>el.classList.remove('show'), 4000);
}
function hideGodIntro(){
  const el = document.getElementById('godIntro');
  if(el) el.classList.remove('show');
}
function showBossBar(name){
  const el = document.getElementById('bossBar'); if(!el) return;
  document.getElementById('bossBarName').textContent = name;
  document.getElementById('bossBarFill').style.width = '100%';
  el.classList.add('show');
}
function updateBossBarFill(hp, hpMax){
  const f = document.getElementById('bossBarFill'); if(!f) return;
  const pct = Math.max(0, Math.min(100, hp/hpMax*100));
  f.style.width = pct + '%';
}
function hideBossBar(){
  const el = document.getElementById('bossBar'); if(el) el.classList.remove('show');
}

// ---------- Render ----------
function render(){
  ctx.clearRect(0,0,W,H);
  drawBackground();
  if(state.scene!=='game') return;
  ctx.save();
  const sx=(Math.random()-0.5)*state.cam.shake, sy=(Math.random()-0.5)*state.cam.shake;
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-state.cam.x+sx, -state.cam.y+sy);
  // Arena tint for current god-mode phase
  if(isGodMode() && state.god && state.god.phase>0){
    const pd = BOSS_PHASES[state.god.phase-1];
    if(pd){
      ctx.fillStyle = pd.arenaTint;
      ctx.fillRect(0,0,state.arena.w,state.arena.h);
    }
  }
  ctx.strokeStyle='rgba(157,92,255,.6)'; ctx.lineWidth=2; ctx.shadowColor='#9d5cff'; ctx.shadowBlur=18;
  ctx.strokeRect(0,0,state.arena.w,state.arena.h); ctx.shadowBlur=0;

  // Pickups
  for(const pk of state.pickups){
    const pulse = 1 + Math.sin(pk.t*5)*0.18;
    ctx.save();
    ctx.translate(pk.x, pk.y);
    if(pk.bossSkill){
      // Boss-skill drop: bigger, phase-colored, with a rotating star + ring.
      const c = pk.color || '#ffd166';
      const r = (PICKUP_RADIUS + 8) * pulse;
      ctx.shadowColor = c; ctx.shadowBlur = 36;
      ctx.fillStyle = withAlpha(c, 0.28);
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill();
      // 5-point star outline rotating slowly
      ctx.rotate(pk.t*1.6);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i=0;i<5;i++){
        const a = (i/5)*Math.PI*2 - Math.PI/2;
        const rr = i%2===0 ? r*0.9 : r*0.45;
        const px = Math.cos(a)*rr, py = Math.sin(a)*rr;
        if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        const a2 = ((i+0.5)/5)*Math.PI*2 - Math.PI/2;
        ctx.lineTo(Math.cos(a2)*r*0.45, Math.sin(a2)*r*0.45);
      }
      ctx.closePath(); ctx.stroke();
    } else {
      // Color-coded drop: each upgrade type has its own glow color so the
      // player can tell at a glance what's on the floor. The OUTER ring +
      // optional pillar of light are tinted by RARITY so rare+ drops pop.
      const upgDef = UPGRADES.find(u=>u.id===pk.id);
      const c = (upgDef && upgDef.color) ? upgDef.color : '#ffd166';
      const rarity = getRarity(pk.rarity);
      const isCommon = rarity.id === 'common';
      // Pillar of light for rare+ drops — vertical taper above the pickup.
      if(rarity.pillar){
        const pillarH = rarity.id === 'legendary' ? 220 : (rarity.id === 'epic' ? 160 : 110);
        const pillarW = rarity.id === 'legendary' ? 30 : (rarity.id === 'epic' ? 22 : 16);
        const grad = ctx.createLinearGradient(0, -pillarH, 0, 0);
        grad.addColorStop(0,    withAlpha(rarity.color, 0));
        grad.addColorStop(0.55, withAlpha(rarity.color, 0.22 + 0.10*Math.sin(pk.t*3)));
        grad.addColorStop(1,    withAlpha(rarity.color, 0.55));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-pillarW*0.25, -pillarH);
        ctx.lineTo( pillarW*0.25, -pillarH);
        ctx.lineTo( pillarW*0.5,    0);
        ctx.lineTo(-pillarW*0.5,    0);
        ctx.closePath();
        ctx.fill();
      }
      // Ambient sparkles for epic/legendary
      if(rarity.sparkles && Math.random() < (rarity.id === 'legendary' ? 0.5 : 0.25)){
        particles(pk.x, pk.y - 10 - Math.random()*30, rarity.color, 1, 50, 0.5, 2);
      }
      // Inner glow + core dot (upgrade color)
      ctx.shadowColor = c; ctx.shadowBlur = isCommon ? 24 : 32;
      ctx.fillStyle = withAlpha(c, 0.25);
      ctx.beginPath(); ctx.arc(0,0,PICKUP_RADIUS*pulse,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // Outer ring tinted by rarity, with extra rotating ring for epic+
      ctx.strokeStyle = rarity.ringColor; ctx.lineWidth = rarity.ringWidth;
      ctx.beginPath(); ctx.arc(0,0,PICKUP_RADIUS,0,Math.PI*2); ctx.stroke();
      if(!isCommon){
        ctx.save();
        ctx.rotate(pk.t * (rarity.id === 'legendary' ? 2.5 : 1.6));
        ctx.strokeStyle = withAlpha(rarity.color, 0.85);
        ctx.lineWidth = 1.8;
        const seg = rarity.id === 'legendary' ? 4 : (rarity.id === 'epic' ? 3 : 2);
        for(let i=0;i<seg;i++){
          const a0 = (i/seg)*Math.PI*2;
          const a1 = a0 + Math.PI*2/(seg*2);
          ctx.beginPath(); ctx.arc(0,0,PICKUP_RADIUS+5, a0, a1); ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // FX (warnings, beams, rings, shockwaves, particles, zones)
  for(const f of state.fx){
    const a=Math.max(0,f.life/f.life0);
    if(f.warn){
      // Pulsing warning line
      const pulse = 0.5 + 0.5*Math.sin((1-a)*30);
      ctx.save();
      ctx.strokeStyle = withAlpha(f.color, 0.25 + 0.4*pulse);
      ctx.lineWidth = (f.beamWidth||30) * (0.5 + 0.5*pulse);
      ctx.shadowColor = f.color; ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.moveTo(f.ax,f.ay); ctx.lineTo(f.bx,f.by); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if(f.beam){
      // Solid beam fires near end of life
      ctx.save();
      const fired = f.beamFired;
      ctx.strokeStyle = fired ? withAlpha('#ffffff', a*0.95) : withAlpha(f.color, 0.6*a);
      ctx.lineWidth = (f.beamWidth||30) * (fired?1.1:0.7);
      ctx.shadowColor = f.color; ctx.shadowBlur = 35;
      ctx.beginPath(); ctx.moveTo(f.ax,f.ay); ctx.lineTo(f.bx,f.by); ctx.stroke();
      // outer glow
      ctx.strokeStyle = withAlpha(f.color, 0.35*a);
      ctx.lineWidth = (f.beamWidth||30)*1.8;
      ctx.beginPath(); ctx.moveTo(f.ax,f.ay); ctx.lineTo(f.bx,f.by); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if(f.zone){
      ctx.save();
      ctx.fillStyle = withAlpha(f.color, 0.25*a);
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = withAlpha(f.color, 0.7*a); ctx.lineWidth = 3;
      ctx.shadowColor = f.color; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if(f.ring){
      // Expanding ring (shockwave-style)
      const t = 1 - a;
      if(f._maxR){ f.r = (f._maxR) * t; }
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
      ctx.strokeStyle=withAlpha(f.color,0.6*a); ctx.lineWidth=6;
      ctx.shadowColor=f.color; ctx.shadowBlur=30; ctx.stroke();
      ctx.shadowBlur=0;
    } else if(f._centerSwing){
      // Tight pulsing flash centered DIRECTLY on the hero's body. Designed
      // to be small enough that it never visually leaks off the character —
      // on a small mobile screen the user sees an obvious bright burst on
      // the hero, and nothing extending toward the FIRE button.
      let o = null;
      if(f.ownerId === state.mySessionId) o = state.player;
      else if(f.ownerId) o = state.others.get(f.ownerId);
      // For remote attacks with stale owner reference, always prefer ID lookup
      if(!o && f.owner && !f.ownerId) o = f.owner;
      
      // Get position: prefer live owner, else use stored position
      let px = (o && o.x !== undefined) ? o.x : f.x;
      let py = (o && o.y !== undefined) ? o.y : f.y;
      const shouldRender = (o && o.alive) || (!o && f.x !== undefined && f.y !== undefined);
      if(shouldRender){
        const t = 1 - a; // 0 -> 1 over swing
        // Hard-coded small visual radius (~18 world units, roughly the
        // hero sprite size). Hitbox uses the gameplay range — this is
        // purely the readable "I swung" flash.
        const R = 22 + 12 * t;
        ctx.save();
        ctx.translate(px, py);
        // Solid bright disk on the hero
        ctx.shadowColor = f.color; ctx.shadowBlur = 28;
        ctx.fillStyle = withAlpha(f.color, 0.55 * a);
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI*2); ctx.fill();
        // Inner white core
        ctx.shadowBlur = 14;
        ctx.fillStyle = withAlpha('#ffffff', 0.85 * a);
        ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, Math.PI*2); ctx.fill();
        // Spinning star — 4 short bright spokes through the hero center
        const spin = t * Math.PI * 1.5;
        ctx.shadowBlur = 22;
        ctx.strokeStyle = withAlpha(f.color, 0.95 * a);
        ctx.lineWidth = 4;
        for(let i=0; i<4; i++){
          const ang2 = spin + i * (Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang2) * R * 1.1, Math.sin(ang2) * R * 1.1);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    } else if(f._swing){
      // Big visible melee sword sweep, anchored to the swinging hero so it
      // stays glued to them as they move during the brief animation. The
      // arc sweeps from one side of the facing direction to the other over
      // the lifetime, with a thick glowing edge so it's clearly visible
      // even at low mobile zoom levels.
      const o = f.owner;
      if(o && o.alive){
        const t = 1 - a; // 0 -> 1 over the swing
        const half = f.arc;
        const sweep = -half + t*half*2; // sweeps across the arc
        const a0 = f.ang + sweep - 0.45;
        const a1 = f.ang + sweep + 0.45;
        ctx.save();
        ctx.translate(o.x, o.y);
        // Outer glow halo
        ctx.shadowColor = f.color; ctx.shadowBlur = 32;
        ctx.strokeStyle = withAlpha(f.color, 0.95 * a);
        ctx.lineWidth = f.thin ? 8 : 14;
        ctx.beginPath(); ctx.arc(0, 0, f.radius, a0, a1); ctx.stroke();
        // Inner bright core
        ctx.shadowBlur = 12;
        ctx.strokeStyle = withAlpha('#ffffff', 0.9 * a);
        ctx.lineWidth = f.thin ? 3 : 5;
        ctx.beginPath(); ctx.arc(0, 0, f.radius, a0, a1); ctx.stroke();
        // Trailing fan from hero center to the leading swing edge
        ctx.shadowBlur = 0;
        ctx.fillStyle = withAlpha(f.color, 0.18 * a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, f.radius, a0, a1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if(f._laser){
      // Jian continuous laser beam — bright glowing line from origin in direction `ang`
      ctx.save();
      const ex2 = f.x + Math.cos(f.ang)*f.len;
      const ey2 = f.y + Math.sin(f.ang)*f.len;
      // Outer wide glow
      ctx.shadowColor = f.color; ctx.shadowBlur = 24;
      ctx.strokeStyle = withAlpha(f.color, 0.45 * a);
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(ex2, ey2); ctx.stroke();
      // Mid glow
      ctx.strokeStyle = withAlpha(f.color, 0.7 * a);
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(ex2, ey2); ctx.stroke();
      // Bright core
      ctx.strokeStyle = withAlpha('#ffffff', 0.9 * a);
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(ex2, ey2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.restore();
    } else if(f._shock || f._pull){
      // Gameplay for shock rings and black-hole pull runs in updateFx.
    } else if(f._flash){
      ctx.save(); ctx.setTransform(DPR,0,0,DPR,0,0);
      ctx.fillStyle = withAlpha(f.color, 0.7*a);
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    } else {
      ctx.fillStyle=withAlpha(f.color,a);
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();
    }
  }

  // Enemies (regular + bosses + minions)
  for(const e of state.enemies){
    if(e.isBoss){
      drawBoss(e);
    } else {
      ctx.save(); ctx.translate(e.x,e.y);
      if(e._phased) ctx.globalAlpha=0.18;
      ctx.shadowColor=e.col; ctx.shadowBlur=e.type==='bomber'?22:16; ctx.fillStyle=e.col;
      if(e.type==='brute'||e.type==='tank') ctx.fillRect(-e.r,-e.r,e.r*2,e.r*2);
      else if(e.type==='phantom'){ ctx.beginPath(); ctx.moveTo(0,-e.r); ctx.lineTo(e.r,0); ctx.lineTo(0,e.r); ctx.lineTo(-e.r,0); ctx.closePath(); ctx.fill(); }
      else if(e.type==='bomber'){ ctx.beginPath(); for(let i=0;i<5;i++){ const a=(i/5)*Math.PI*2-Math.PI/2; i===0?ctx.moveTo(Math.cos(a)*e.r,Math.sin(a)*e.r):ctx.lineTo(Math.cos(a)*e.r,Math.sin(a)*e.r); } ctx.closePath(); ctx.fill(); }
      else if(e.type==='sniper'){ ctx.beginPath(); ctx.moveTo(0,-e.r*1.3); ctx.lineTo(e.r*0.85,e.r*0.8); ctx.lineTo(-e.r*0.85,e.r*0.8); ctx.closePath(); ctx.fill(); }
      else if(e.type==='specter'){ ctx.beginPath(); ctx.moveTo(0,-e.r*1.15); ctx.lineTo(e.r*0.75,0); ctx.lineTo(0,e.r*1.15); ctx.lineTo(-e.r*0.75,0); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0,0,e.r,0,Math.PI*2); ctx.fill(); }
      ctx.globalAlpha=1; ctx.restore();
      if(!e._phased && e.hp<e.hpMax){ ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(e.x-e.r,e.y-e.r-8,e.r*2,3); ctx.fillStyle=e.col; ctx.fillRect(e.x-e.r,e.y-e.r-8,(e.r*2)*Math.max(0,e.hp/e.hpMax),3); }
    }
  }

  // Bullets
  for(const b of state.bullets){
    // Homing logic for boss orbs
    if(b._homing && state.player){
      const dx = state.player.x-b.x, dy = state.player.y-b.y, d=Math.hypot(dx,dy)||1;
      const targetVx = (dx/d)*220, targetVy = (dy/d)*220;
      b.vx += (targetVx-b.vx)*0.04;
      b.vy += (targetVy-b.vy)*0.04;
    }
    for(let i=0;i<b.trail.length;i++){ const t=i/b.trail.length; ctx.fillStyle=withAlpha(b.color,0.15+0.5*t); ctx.beginPath(); ctx.arc(b.trail[i].x,b.trail[i].y,b.radius*(0.5+t*0.6),0,Math.PI*2); ctx.fill(); }
    ctx.shadowColor=b.color; ctx.shadowBlur=18; ctx.fillStyle=b.color; ctx.beginPath(); ctx.arc(b.x,b.y,b.radius,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  }
  if(isMultiMode()){ for(const o of state.others.values()) drawPlayer(o,false); }
  drawPlayer(state.player, true);
  ctx.restore();
}

// ===========================================================================
// BOSS RENDERING — 10 unique themed silhouettes (one per phase).
// Each model has its own geometry, transforms and motion. Phase index drives
// which renderer is used. The `evolving` flag adds a glowing white halo &
// flicker so the player can see the cinematic transition.
// ===========================================================================
function drawBoss(e){
  const t = state.time;
  const r = e.r;
  const phase = e.bossPhase || 1;
  ctx.save();
  ctx.translate(e.x, e.y);

  // EVOLVING aura (drawn beneath the model)
  if(e.evolving){
    const flick = 0.7 + 0.3 * Math.sin((e.evoT||0) * 28);
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 90;
    ctx.fillStyle = withAlpha('#ffffff', 0.18 * flick);
    ctx.beginPath(); ctx.arc(0, 0, r * (2.4 + 0.3*Math.sin((e.evoT||0)*8)), 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = withAlpha(e.col, 0.30 * flick);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  // UNTOUCHABLE flicker (mid-fight invuln frames during ninja blink/dash)
  if(e.invincible && !e.evolving){
    const flick = 0.45 + 0.55 * Math.sin(t * 38);
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 35;
    ctx.fillStyle = withAlpha('#ffffff', 0.22 * flick);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.45 + 0.5 * flick;
  }

  // Outer halo shared by all phases
  const pulse = 1 + Math.sin(t*3)*0.06;
  ctx.shadowColor = e.col; ctx.shadowBlur = 50;
  ctx.fillStyle = withAlpha(e.col, 0.18);
  ctx.beginPath(); ctx.arc(0,0, r*1.55*pulse, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  // Dispatch to a phase-specific drawer
  switch(phase){
    case 1:  drawBoss_VoidHerald(e, t, r); break;
    case 2:  drawBoss_CrimsonReaper(e, t, r); break;
    case 3:  drawBoss_SpectralWeaver(e, t, r); break;
    case 4:  drawBoss_IroncladBehemoth(e, t, r); break;
    case 5:  drawBoss_PhaseStalker(e, t, r); break;
    case 6:  drawBoss_StormcallerTyrant(e, t, r); break;
    case 7:  drawBoss_NecrotideEmpress(e, t, r); break;
    case 8:  drawBoss_ForgeOfEndings(e, t, r); break;
    case 9:  drawBoss_ArchonOfSilence(e, t, r); break;
    case 10: drawBoss_OmegaLastGod(e, t, r); break;
    case 11: drawBoss_OmegaReborn(e, t, r); break;
    default: drawBoss_VoidHerald(e, t, r);
  }
  ctx.restore();
}

// ---- Phase 1: Void Herald — floating obelisk with rotating runic ring
function drawBoss_VoidHerald(e, t, r){
  ctx.rotate(t*0.5);
  // Outer rune ring
  for(let i=0;i<10;i++){
    const ang = (i/10)*Math.PI*2;
    const x = Math.cos(ang)*r*1.25, y = Math.sin(ang)*r*1.25;
    ctx.fillStyle = withAlpha(e.col, 0.85);
    ctx.shadowColor = e.col; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(x, y, r*0.10, 0, Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.rotate(-t*0.5);
  // Vertical obelisk diamond
  ctx.fillStyle = '#0a0414';
  ctx.strokeStyle = e.col; ctx.lineWidth = 4;
  ctx.shadowColor = e.col; ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.moveTo(0,-r*1.15); ctx.lineTo(r*0.55,0); ctx.lineTo(0,r*1.15); ctx.lineTo(-r*0.55,0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Inner glyph
  ctx.shadowBlur = 0;
  ctx.fillStyle = withAlpha('#ffffff', 0.95);
  ctx.beginPath(); ctx.arc(0,0,r*0.15,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = e.col;
  ctx.beginPath(); ctx.arc(0,0,r*0.08,0,Math.PI*2); ctx.fill();
}

// ---- Phase 2: Crimson Reaper — armored skull body w/ orbiting blade
function drawBoss_CrimsonReaper(e, t, r){
  // Orbiting blade
  ctx.save();
  ctx.rotate(t*1.4);
  ctx.translate(r*1.35, 0);
  ctx.fillStyle = withAlpha(e.col, 0.95);
  ctx.shadowColor = e.col; ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.moveTo(-r*0.4, -r*0.06); ctx.lineTo(r*0.5, 0); ctx.lineTo(-r*0.4, r*0.06);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;
  // Skull body (wider hex)
  ctx.fillStyle = '#150208';
  ctx.strokeStyle = e.col; ctx.lineWidth = 4;
  ctx.shadowColor = e.col; ctx.shadowBlur = 28;
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2 + Math.PI/6;
    const x = Math.cos(a)*r, y = Math.sin(a)*r*0.85;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Two glowing eyes
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-r*0.28, -r*0.12, r*0.10, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( r*0.28, -r*0.12, r*0.10, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = e.col;
  ctx.beginPath(); ctx.arc(-r*0.28, -r*0.12, r*0.05, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( r*0.28, -r*0.12, r*0.05, 0, Math.PI*2); ctx.fill();
  // Fanged jaw
  ctx.strokeStyle = withAlpha(e.col, 0.9); ctx.lineWidth = 3;
  ctx.beginPath();
  for(let i=0;i<5;i++){
    const x = -r*0.35 + (i*r*0.18);
    ctx.moveTo(x, r*0.1); ctx.lineTo(x + r*0.06, r*0.32);
  }
  ctx.stroke();
}

// ---- Phase 3: Spectral Weaver — crystalline shards orbiting a prism
function drawBoss_SpectralWeaver(e, t, r){
  // Orbiting shards
  ctx.save();
  ctx.rotate(t*0.7);
  for(let i=0;i<8;i++){
    ctx.save();
    ctx.rotate((i/8)*Math.PI*2);
    ctx.translate(r*1.25, 0);
    ctx.rotate(Math.sin(t*1.2 + i)*0.5);
    ctx.fillStyle = withAlpha(e.col, 0.8);
    ctx.shadowColor = e.col; ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(-r*0.18, 0); ctx.lineTo(0, -r*0.14); ctx.lineTo(r*0.32, 0); ctx.lineTo(0, r*0.14);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.shadowBlur = 0;
  // Prism core (octagon)
  ctx.fillStyle = '#020a14';
  ctx.strokeStyle = e.col; ctx.lineWidth = 4;
  ctx.shadowColor = e.col; ctx.shadowBlur = 30;
  ctx.beginPath();
  for(let i=0;i<8;i++){
    const a = (i/8)*Math.PI*2 + t*0.3;
    const rr = r * (i%2===0 ? 1.0 : 0.78);
    const x = Math.cos(a)*rr, y = Math.sin(a)*rr;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Inner refracting eye
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(0,0,r*0.22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = e.col;
  ctx.beginPath(); ctx.arc(Math.cos(t*2)*r*0.08, Math.sin(t*2)*r*0.08, r*0.10, 0, Math.PI*2); ctx.fill();
}

// ---- Phase 4: Ironclad Behemoth — armored brute with shoulder pauldrons
function drawBoss_IroncladBehemoth(e, t, r){
  const sway = Math.sin(t*1.6)*0.06;
  ctx.rotate(sway);
  // Pauldrons
  ctx.fillStyle = withAlpha(e.col, 0.9);
  ctx.shadowColor = e.col; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.arc(-r*0.95, -r*0.55, r*0.45, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( r*0.95, -r*0.55, r*0.45, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  // Body — armored block
  ctx.fillStyle = '#1a0d04';
  ctx.strokeStyle = e.col; ctx.lineWidth = 5;
  ctx.shadowColor = e.col; ctx.shadowBlur = 20;
  roundRect(-r*0.85, -r*0.55, r*1.7, r*1.4, r*0.18);
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // Plates / ridges
  for(let i=0;i<3;i++){
    ctx.fillStyle = withAlpha(e.col, 0.5);
    ctx.fillRect(-r*0.7, -r*0.30 + i*r*0.30, r*1.4, r*0.06);
  }
  // Visor (glowing slit)
  ctx.shadowColor = e.col; ctx.shadowBlur = 30;
  ctx.fillStyle = e.col;
  ctx.fillRect(-r*0.55, -r*0.46, r*1.1, r*0.10);
  ctx.shadowBlur = 0;
}

// ---- Phase 5: Phase Stalker — flickering ghost-shadow with twin daggers
function drawBoss_PhaseStalker(e, t, r){
  const phase = ((Math.sin(t*7) + 1) * 0.5);
  // Echo trails (3 copies fading)
  for(let i=3;i>=1;i--){
    const off = Math.sin(t*4 + i)* r*0.35;
    ctx.fillStyle = withAlpha(e.col, 0.10 * i);
    ctx.beginPath(); ctx.arc(off, 0, r*0.95, 0, Math.PI*2); ctx.fill();
  }
  // Body — stretched hex
  ctx.fillStyle = '#001f12';
  ctx.strokeStyle = e.col; ctx.lineWidth = 4;
  ctx.shadowColor = e.col; ctx.shadowBlur = 30 + phase*15;
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const x = Math.cos(a)*r*0.95, y = Math.sin(a)*r*1.1;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // Twin glowing daggers crossed
  ctx.save();
  ctx.rotate(Math.PI/4 + Math.sin(t*2)*0.2);
  ctx.fillStyle = withAlpha(e.col, 0.95);
  ctx.fillRect(-r*0.04, -r*1.25, r*0.08, r*2.5);
  ctx.rotate(-Math.PI/2);
  ctx.fillRect(-r*0.04, -r*1.25, r*0.08, r*2.5);
  ctx.restore();
  // Hollow eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(0,0,r*0.16,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(0,0,r*0.07,0,Math.PI*2); ctx.fill();
}

// ---- Phase 6: Stormcaller Tyrant — crowned electric sun with arcs
function drawBoss_StormcallerTyrant(e, t, r){
  // Crown spikes
  ctx.save();
  ctx.rotate(t*0.4);
  for(let i=0;i<12;i++){
    ctx.save();
    ctx.rotate((i/12)*Math.PI*2);
    ctx.fillStyle = withAlpha(e.col, 0.9);
    ctx.shadowColor = e.col; ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(0, -r*1.0);
    ctx.lineTo(r*0.10, -r*1.45);
    ctx.lineTo(-r*0.10, -r*1.45);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.shadowBlur = 0;
  // Body
  ctx.fillStyle = '#1a1100';
  ctx.strokeStyle = e.col; ctx.lineWidth = 4;
  ctx.shadowColor = e.col; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // Lightning arcs across body
  ctx.strokeStyle = withAlpha('#ffffff', 0.85);
  ctx.lineWidth = 2;
  for(let i=0;i<3;i++){
    ctx.beginPath();
    let x = -r*0.7, y = (Math.random()-0.5)*r*0.4;
    ctx.moveTo(x, y);
    for(let s=0;s<6;s++){ x += r*0.25; y += (Math.random()-0.5)*r*0.3; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // Bright core
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(0,0,r*0.20,0,Math.PI*2); ctx.fill();
}

// ---- Phase 7: Necrotide Empress — tentacled core with floating veil
function drawBoss_NecrotideEmpress(e, t, r){
  // Tentacles (6 wavy arms)
  ctx.strokeStyle = withAlpha(e.col, 0.85);
  ctx.lineWidth = r*0.10;
  ctx.shadowColor = e.col; ctx.shadowBlur = 20;
  for(let i=0;i<6;i++){
    const baseAng = (i/6)*Math.PI*2 + t*0.3;
    ctx.beginPath();
    let prevX=0, prevY=0;
    ctx.moveTo(prevX, prevY);
    for(let s=1;s<=8;s++){
      const wave = Math.sin(t*3 + i + s*0.6);
      const ang = baseAng + wave*0.25;
      const dist = r*0.25 * s;
      prevX = Math.cos(ang)*dist; prevY = Math.sin(ang)*dist;
      ctx.lineTo(prevX, prevY);
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // Core
  ctx.fillStyle = '#0c001f';
  ctx.strokeStyle = e.col; ctx.lineWidth = 4;
  ctx.shadowColor = e.col; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(0,0,r*0.85,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // Floating crown of dots
  for(let i=0;i<8;i++){
    const a = (i/8)*Math.PI*2 - t*0.6;
    ctx.fillStyle = withAlpha(e.col, 0.9);
    ctx.beginPath(); ctx.arc(Math.cos(a)*r*0.55, Math.sin(a)*r*0.55, r*0.06, 0, Math.PI*2); ctx.fill();
  }
  // Multi-eye cluster
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(0,0, r*0.18, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = e.col;
  for(let i=0;i<3;i++){
    const a = (i/3)*Math.PI*2 + t*1.2;
    ctx.beginPath(); ctx.arc(Math.cos(a)*r*0.07, Math.sin(a)*r*0.07, r*0.05, 0, Math.PI*2); ctx.fill();
  }
}

// ---- Phase 8: Forge of Endings — anvil colossus with rotating gears
function drawBoss_ForgeOfEndings(e, t, r){
  // Outer gear teeth ring
  ctx.save(); ctx.rotate(t*0.5);
  ctx.fillStyle = withAlpha(e.col, 0.85);
  ctx.shadowColor = e.col; ctx.shadowBlur = 22;
  const teeth = 18;
  for(let i=0;i<teeth;i++){
    ctx.save(); ctx.rotate((i/teeth)*Math.PI*2);
    ctx.fillRect(-r*0.06, -r*1.32, r*0.12, r*0.20);
    ctx.restore();
  }
  ctx.restore();
  ctx.shadowBlur = 0;
  // Anvil body (top trapezoid + base)
  ctx.fillStyle = '#1a0a00';
  ctx.strokeStyle = e.col; ctx.lineWidth = 4;
  ctx.shadowColor = e.col; ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.moveTo(-r*0.95, -r*0.55);
  ctx.lineTo( r*0.95, -r*0.55);
  ctx.lineTo( r*0.65,  r*0.10);
  ctx.lineTo( r*0.85,  r*0.85);
  ctx.lineTo(-r*0.85,  r*0.85);
  ctx.lineTo(-r*0.65,  r*0.10);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // Forge mouth (glowing horizontal slot)
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 30;
  roundRect(-r*0.55, -r*0.35, r*1.1, r*0.30, r*0.08);
  ctx.fill();
  // Inner inferno glints
  ctx.fillStyle = '#fff';
  for(let i=0;i<5;i++){
    const x = -r*0.5 + i*r*0.25 + Math.sin(t*4+i)*r*0.05;
    ctx.beginPath(); ctx.arc(x, -r*0.20, r*0.04, 0, Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  // Two side hammer-spikes
  ctx.fillStyle = withAlpha(e.col, 0.9);
  ctx.beginPath();
  ctx.moveTo(-r*1.05, r*0.4); ctx.lineTo(-r*0.7, r*0.55); ctx.lineTo(-r*1.05, r*0.7);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo( r*1.05, r*0.4); ctx.lineTo( r*0.7, r*0.55); ctx.lineTo( r*1.05, r*0.7);
  ctx.closePath(); ctx.fill();
}

// ---- Phase 9: Archon of Silence — winged halo with star-of-spokes
function drawBoss_ArchonOfSilence(e, t, r){
  // Wings (two arcs)
  ctx.strokeStyle = withAlpha(e.col, 0.9);
  ctx.lineWidth = r*0.10;
  ctx.shadowColor = e.col; ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(-r*0.6, 0, r*1.3, -Math.PI*0.45, Math.PI*0.45, true); ctx.stroke();
  ctx.beginPath();
  ctx.arc( r*0.6, 0, r*1.3, Math.PI - Math.PI*0.45, Math.PI + Math.PI*0.45); ctx.stroke();
  ctx.shadowBlur = 0;
  // Halo
  ctx.save(); ctx.rotate(t*0.35);
  ctx.strokeStyle = withAlpha('#ffffff', 0.85);
  ctx.lineWidth = 3;
  ctx.shadowColor = e.col; ctx.shadowBlur = 28;
  ctx.beginPath(); ctx.arc(0, -r*1.05, r*0.45, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
  ctx.shadowBlur = 0;
  // Body — tall hex
  ctx.fillStyle = '#001a1f';
  ctx.strokeStyle = e.col; ctx.lineWidth = 4;
  ctx.shadowColor = e.col; ctx.shadowBlur = 32;
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.lineTo(r*0.8, -r*0.4); ctx.lineTo(r*0.7, r*0.85);
  ctx.lineTo(-r*0.7, r*0.85); ctx.lineTo(-r*0.8, -r*0.4); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // Star of spokes inside
  ctx.save(); ctx.rotate(-t*0.6);
  for(let i=0;i<8;i++){
    ctx.save(); ctx.rotate((i/8)*Math.PI*2);
    ctx.strokeStyle = withAlpha(e.col, 0.7); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, -r*0.55); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // Sealed eye (vertical slit)
  ctx.fillStyle = e.col; ctx.shadowColor = e.col; ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.ellipse(0, 0, r*0.06, r*0.20, 0, 0, Math.PI*2); ctx.fill();
}

// ---- Phase 10: OMEGA — radiant 8-pointed star with rotating ring + counter-ring
function drawBoss_OmegaLastGod(e, t, r){
  // Two counter-rotating spike rings
  for(let layer=0; layer<2; layer++){
    ctx.save();
    ctx.rotate((layer===0 ? 1 : -1) * t * (0.5 + layer*0.4));
    const rings = 14;
    for(let i=0;i<rings;i++){
      ctx.save();
      ctx.rotate((i/rings)*Math.PI*2);
      ctx.fillStyle = withAlpha(e.col, layer===0 ? 0.85 : 0.6);
      ctx.shadowColor = e.col; ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.moveTo(r*1.05, 0);
      ctx.lineTo(r*(1.55+layer*0.2), -r*0.10);
      ctx.lineTo(r*(1.55+layer*0.2),  r*0.10);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.shadowBlur = 0;
  // 8-pointed star body
  ctx.fillStyle = '#15001a';
  ctx.strokeStyle = e.col; ctx.lineWidth = 5;
  ctx.shadowColor = e.col; ctx.shadowBlur = 35;
  ctx.beginPath();
  const pts = 16;
  for(let i=0;i<pts;i++){
    const a = (i/pts)*Math.PI*2 + t*0.3;
    const rr = (i%2===0) ? r : r*0.55;
    const x = Math.cos(a)*rr, y = Math.sin(a)*rr;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // Inner sigil
  ctx.save(); ctx.rotate(-t*1.2);
  for(let i=0;i<6;i++){
    ctx.rotate(Math.PI/3);
    ctx.strokeStyle = withAlpha('#ffffff', 0.85); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(r*0.55, 0); ctx.stroke();
  }
  ctx.restore();
  // Burning core (white→pink)
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 50;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(0,0,r*0.22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = e.col;
  ctx.beginPath(); ctx.arc(0,0,r*0.13,0,Math.PI*2); ctx.fill();
}

// ---- Phase 11: OMEGA REBORN — humanoid god-form (ninja/assassin)
// Slightly larger than a hero (player r is ~16, this draws around r=46) but
// distinctly NOT a player look-alike: head + tapered torso, cape, pauldrons,
// glowing visor, halo crown, sword arm aimed at the player.
function drawBoss_OmegaReborn(e, t, r){
  const bob = Math.sin(t*3) * r * 0.06;
  ctx.translate(0, bob);

  // Soft inner aura
  const aFlick = 0.55 + 0.45 * Math.sin(t * 7);
  ctx.shadowColor = e.col; ctx.shadowBlur = 60;
  ctx.fillStyle = withAlpha(e.col, 0.18 * aFlick);
  ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  // Cape behind the body — bottom hem sways
  ctx.fillStyle = withAlpha('#10001a', 0.92);
  ctx.beginPath();
  ctx.moveTo(-r*0.55, -r*0.20);
  ctx.lineTo( r*0.55, -r*0.20);
  ctx.lineTo( r*0.85,  r*1.40 + Math.sin(t*4    ) * r*0.10);
  ctx.lineTo(-r*0.85,  r*1.40 + Math.sin(t*4 + 1) * r*0.10);
  ctx.closePath(); ctx.fill();

  // Legs
  ctx.fillStyle = withAlpha(e.col, 0.85);
  ctx.shadowColor = e.col; ctx.shadowBlur = 18;
  ctx.fillRect(-r*0.32, r*0.45, r*0.22, r*0.85);
  ctx.fillRect( r*0.10, r*0.45, r*0.22, r*0.85);
  ctx.shadowBlur = 0;

  // Torso (tapered trapezoid)
  ctx.fillStyle = '#0a0210';
  ctx.strokeStyle = e.col; ctx.lineWidth = 3;
  ctx.shadowColor = e.col; ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(-r*0.45, -r*0.20);
  ctx.lineTo( r*0.45, -r*0.20);
  ctx.lineTo( r*0.36,  r*0.55);
  ctx.lineTo(-r*0.36,  r*0.55);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  // Sash / belt accent
  ctx.fillStyle = withAlpha(e.col, 0.85);
  ctx.fillRect(-r*0.40, r*0.30, r*0.80, r*0.07);

  // Shoulder pauldrons (small triangles)
  ctx.fillStyle = withAlpha(e.col, 0.95);
  ctx.shadowColor = e.col; ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(-r*0.55, -r*0.25); ctx.lineTo(-r*0.30, -r*0.25); ctx.lineTo(-r*0.42, -r*0.05);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo( r*0.55, -r*0.25); ctx.lineTo( r*0.30, -r*0.25); ctx.lineTo( r*0.42, -r*0.05);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;

  // Off-hand arm (simple line down)
  ctx.strokeStyle = withAlpha(e.col, 0.9);
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r*0.40, -r*0.05); ctx.lineTo(-r*0.55, r*0.40); ctx.stroke();

  // Sword arm — angled toward the player so the blade tracks them
  let aimAng = 0;
  if(state.player){ aimAng = Math.atan2(state.player.y - e.y, state.player.x - e.x); }
  ctx.save();
  ctx.translate(r*0.40, -r*0.05);
  ctx.rotate(aimAng);
  // Arm
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r*0.65, 0); ctx.stroke();
  // Hilt + guard
  ctx.fillStyle = e.col;
  ctx.fillRect(r*0.55, -r*0.10, r*0.10, r*0.20);
  // Blade
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.moveTo(r*0.65, -r*0.06);
  ctx.lineTo(r*1.55, -r*0.025);
  ctx.lineTo(r*1.70,  0);
  ctx.lineTo(r*1.55,  r*0.025);
  ctx.lineTo(r*0.65,  r*0.06);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Head (small circle)
  ctx.fillStyle = '#08010c';
  ctx.strokeStyle = e.col; ctx.lineWidth = 2.5;
  ctx.shadowColor = e.col; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.arc(0, -r*0.45, r*0.30, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  // Glowing horizontal visor
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 22;
  ctx.fillRect(-r*0.20, -r*0.50, r*0.40, r*0.07);
  ctx.shadowBlur = 0;

  // Floating halo crown above the head
  ctx.save();
  ctx.translate(0, -r*0.95);
  ctx.rotate(t * 0.8);
  ctx.strokeStyle = withAlpha('#ffffff', 0.9);
  ctx.lineWidth = 2;
  ctx.shadowColor = e.col; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(0, 0, r*0.34, 0, Math.PI*2); ctx.stroke();
  // Halo notches
  for(let i=0;i<4;i++){
    const a = (i/4)*Math.PI*2;
    const x = Math.cos(a)*r*0.34, y = Math.sin(a)*r*0.34;
    ctx.fillStyle = withAlpha('#ffffff', 0.95);
    ctx.beginPath(); ctx.arc(x, y, r*0.05, 0, Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  // Trailing afterimage echoes (only when invincible / blinking)
  if(e.invincible){
    for(let i=1;i<=3;i++){
      const off = Math.sin(t*5 + i)*r*0.4;
      ctx.fillStyle = withAlpha('#ffffff', 0.06 * (4-i));
      ctx.beginPath(); ctx.arc(off, 0, r*0.55, 0, Math.PI*2); ctx.fill();
    }
  }
}

// Small helper used by some boss models
function roundRect(x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y,   x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x,   y+h, rr);
  ctx.arcTo(x,   y+h, x,   y,   rr);
  ctx.arcTo(x,   y,   x+w, y,   rr);
  ctx.closePath();
}

function drawPlayer(p, local){
  if(!p) return;
  const h = HEROES[p.heroId]; if(!h) return;
  if(p.downed){
    ctx.save();
    ctx.strokeStyle = withAlpha('#ff3d6a', 0.85);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = withAlpha('#ff3d6a', 0.18);
    ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font='bold 11px ui-monospace,monospace'; ctx.textAlign='center';
    ctx.fillText('DOWN', p.x, p.y+4);
    ctx.fillText(p.name||'P', p.x, p.y-26);
    if(!local && state.reviveTarget === p && state.reviveHoldTime > 0){
      const t = Math.min(1, state.reviveHoldTime / REVIVE_HOLD_SECONDS);
      ctx.strokeStyle = '#3dffb0'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p.x, p.y, 24, -Math.PI/2, -Math.PI/2 + t*Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#3dffb0'; ctx.font='10px ui-monospace,monospace';
      ctx.fillText('REVIVING…', p.x, p.y+34);
    } else if(local){
      ctx.fillStyle = '#ff8a3d'; ctx.font='10px ui-monospace,monospace';
      ctx.fillText('WAITING FOR REVIVE', p.x, p.y+34);
    } else {
      ctx.fillStyle = '#ffd166'; ctx.font='10px ui-monospace,monospace';
      ctx.fillText('HOLD E TO REVIVE', p.x, p.y+34);
    }
    ctx.restore();
    return;
  }
  if(p.dashing>0){ for(let i=0;i<6;i++){ ctx.fillStyle=withAlpha(h.color,0.06+i*0.02); ctx.beginPath(); ctx.arc(p.x-Math.cos(p.angle)*i*4,p.y-Math.sin(p.angle)*i*4,16,0,Math.PI*2); ctx.fill(); } }
  ctx.save(); ctx.translate(p.x,p.y); ctx.shadowColor=h.color; ctx.shadowBlur=22;
  ctx.fillStyle = local ? h.color : '#ffffff';
  ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.rotate(p.angle); ctx.strokeStyle=h.color; ctx.lineWidth=3; ctx.shadowColor=h.color; ctx.shadowBlur=14;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(28,0); ctx.stroke(); ctx.shadowBlur=0;
  ctx.restore();
  if(p.shield>0){ ctx.strokeStyle=withAlpha('#22e8ff',0.7); ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,20,0,Math.PI*2); ctx.stroke(); }
  ctx.fillStyle='#fff'; ctx.font='12px ui-monospace,monospace'; ctx.textAlign='center';
  ctx.fillText(p.name||'P', p.x, p.y-26);
  const w=36; ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(p.x-w/2,p.y+22,w,3);
  ctx.fillStyle = local ? '#3dffb0' : '#ff8a3d'; ctx.fillRect(p.x-w/2,p.y+22,w*Math.max(0,(p.hp||0)/(p.hpMax||1)),3);
}

function drawBackground(){
  const step=56; const offX=-((state.cam.x*0.6)%step); const offY=-((state.cam.y*0.6)%step);
  ctx.save(); ctx.globalAlpha=0.5; ctx.strokeStyle='rgba(157,92,255,.18)'; ctx.lineWidth=1;
  for(let x=offX; x<W; x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=offY; y<H; y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();
  if(!isGodMode() && state.fracture>=1){ const a=Math.min(0.18,0.04*state.fracture); ctx.fillStyle=`rgba(255,43,214,${a})`; ctx.fillRect(0,0,W,H); }
}

function withAlpha(hex,a){ if(!hex) return `rgba(255,255,255,${a})`; const m=hex.replace('#',''); const r=parseInt(m.slice(0,2),16),g=parseInt(m.slice(2,4),16),b=parseInt(m.slice(4,6),16); return `rgba(${r},${g},${b},${a})`; }

// ---------- Upgrade picker (classic mode only) ----------
function showUpgradePicker(){
  if(isGodMode()) return; // God Mode uses floor pickups instead
  const modal = document.getElementById('upgrade');
  if(!modal) return;
  if(state.upgradeChosenForWave === state.wave) return;
  if(state.upgradeOpenForWave === state.wave && modal.style.display === 'flex') return;
  state.upgradeOpenForWave = state.wave;
  const waveAtOpen = state.wave;
  const choices = pickN(UPGRADES, 3);
  const wrap = $('#ucards'); wrap.innerHTML='';
  choices.forEach(u=>{
    const el=document.createElement('div');
    el.className='ucard';
    el.innerHTML=`<h4>${u.name}</h4><p>${u.desc}</p>`;
    el.onclick=()=>{
      u.apply(state.player);
      state.upgradeChosenForWave = waveAtOpen;
      hideUpgrade();
      toast(`Acquired: ${u.name}`);
      if(canAuthorEnemies()){
        startWavePrep(state.wave + 1);
      } else if(isMultiMode() && activeRoom){
        try{ activeRoom.send('upgradeChosen', {}); }catch(_){}
      }
    };
    wrap.appendChild(el);
  });
  modal.classList.remove('hidden');
  modal.classList.add('show');
  modal.style.display='flex';
  /* Hide touch controls entirely so they don't visually overlap upgrade cards */
  const _tui = document.getElementById('touchUI');
  if(_tui) _tui.style.display = 'none';
}
function hideUpgrade(){
  const modal = document.getElementById('upgrade');
  if(!modal) return;
  modal.classList.remove('show');
  modal.classList.add('hidden');
  modal.style.display='none';
  state.upgradeOpenForWave = 0;
  /* Restore touch controls */
  const _tui = document.getElementById('touchUI');
  if(_tui) _tui.style.display = '';
}

// ---------- Revive system (multiplayer) ----------
const REVIVE_HOLD_SECONDS = 2.5;
const REVIVE_RANGE = 38;

function findDownedTeammateNear(p){
  let best = null, bd = Infinity;
  for(const o of state.others.values()){
    if(!o || !o.downed) continue;
    const d = Math.hypot((o.x||0) - p.x, (o.y||0) - p.y);
    if(d < REVIVE_RANGE && d < bd){ best = o; bd = d; }
  }
  return best;
}

function updateReviveInteraction(p, dt){
  if(!p || !p.alive || p.downed){
    state.reviveTarget = null; state.reviveHoldTime = 0;
    const rb = document.getElementById('tRevive'); if(rb) rb.style.display = 'none';
    return;
  }
  const target = findDownedTeammateNear(p);
  const rb = document.getElementById('tRevive');
  if(rb && IS_TOUCH) rb.style.display = target ? 'flex' : 'none';
  if(!target){ state.reviveTarget = null; state.reviveHoldTime = 0; return; }
  if(keys['e']){
    if(state.reviveTarget !== target){ state.reviveTarget = target; state.reviveHoldTime = 0; }
    state.reviveHoldTime += dt;
    if(Math.random() < 0.5) particles(target.x, target.y, '#3dffb0', 1, 60, 0.4, 2);
    if(state.reviveHoldTime >= REVIVE_HOLD_SECONDS){
      try{ activeRoom && activeRoom.send('revive', { targetId: target.id }); }catch(e){}
      target.downed = false; target.alive = true;
      target.hp = Math.max(target.hp || 0, (target.hpMax||100) * 0.5);
      toast(`Revived ${target.name||'teammate'}`);
      state.reviveTarget = null; state.reviveHoldTime = 0;
    }
  } else { state.reviveHoldTime = 0; state.reviveTarget = target; }
}

function handleReviveMessage(msg){
  if(!msg || !msg.targetId) return;
  if(msg.targetId === state.mySessionId){
    const p = state.player;
    if(p){
      p.downed = false; p.alive = true;
      p.hp = Math.max(1, (p.hpMax||100) * 0.5);
      state.beingRevivedTime = 1.2;
      toast('You were revived!');
      try{ broadcastTick(1); }catch(e){}
    }
    return;
  }
  const o = state.others.get(msg.targetId);
  if(o){ o.downed = false; o.alive = true; o.hp = Math.max(o.hp||0, (o.hpMax||100) * 0.5); }
}
function pickN(arr,n){ const a=arr.slice(),out=[]; while(out.length<n && a.length){ out.push(a.splice(Math.floor(Math.random()*a.length),1)[0]); } return out; }

// ============================================================
// COLYSEUS MULTIPLAYER
// ============================================================
function applyRemoteCombat(other, act){
  if(!state.isHost || !other || !act) return;
  const h = HEROES[other.heroId] || HEROES.james;
  const mods = Object.assign(makeDefaultMods(), other.mods || {});
  const ang = (typeof act.a === 'number') ? act.a : (other.angle || 0);
  const ox = other.x, oy = other.y;
  const dmg = h.dmg * mods.dmg;
  const range = h.range * mods.range;

  if(act.t === 'atk'){
    if(other.heroId==='james'){
      other._jamesLead = ((other._jamesLead || 0) ^ 1);
      state.fx.push({_jamesXSwing:true, ownerP:other, baseAng:ang, range, lead:other._jamesLead, life:0.22, life0:0.22});
      for(const e of state.enemies){ if(Math.hypot(e.x-ox,e.y-oy)<range+(e.r||0)) damageEnemy(e,dmg,other); }
    } else if(other.heroId==='joseph' || other.heroId==='kaitu'){
      const arc = other.heroId==='kaitu' ? 1.5 : 1.2;
      for(const e of state.enemies){ const dx=e.x-ox,dy=e.y-oy,d=Math.hypot(dx,dy); if(d<range+(e.r||0)){ const a=Math.atan2(dy,dx); if(Math.abs(Math.atan2(Math.sin(a-ang),Math.cos(a-ang)))<arc){ damageEnemy(e,dmg,other); if(other.heroId==='kaitu'){ e._slowUntil=(state.time||0)+1.6; e._slowFactor=0.3; } } } }
    } else if(other.heroId==='jeff'){
      for(const e of state.enemies){ const dx=e.x-ox,dy=e.y-oy,d=Math.hypot(dx,dy); if(d<range+(e.r||0)){ const a=Math.atan2(dy,dx); if(Math.abs(Math.atan2(Math.sin(a-ang),Math.cos(a-ang)))<0.7) damageEnemy(e,dmg,other); } }
    } else if(other.heroId==='justin'){
      // Spirit Blade — 110° arc melee, no bullet (DLC override). Must be
      // explicit here so the generic spawnBullet fallthrough is NOT reached,
      // which would create a stray projectile visible only on the host's screen.
      const justinArc=(Math.PI*110)/180/2;
      for(const e of state.enemies){ if(!e||e.dead) continue; const dx=e.x-ox,dy=e.y-oy,d=Math.hypot(dx,dy); if(d>range+(e.r||0)) continue; const a=Math.atan2(dy,dx); if(Math.abs(Math.atan2(Math.sin(a-ang),Math.cos(a-ang)))<=justinArc) damageEnemy(e,dmg,other); }
    } else if(other.heroId==='jian'){
      // Laser line damage
      const ex=ox+Math.cos(ang)*range, ey=oy+Math.sin(ang)*range;
      const ldx=ex-ox, ldy=ey-oy, ll=ldx*ldx+ldy*ldy;
      for(const e of state.enemies){ if(e.dead||e.invincible) continue; const t=Math.max(0,Math.min(1,((e.x-ox)*ldx+(e.y-oy)*ldy)/ll)); const px=ox+ldx*t, py=oy+ldy*t; if(Math.hypot(e.x-px,e.y-py)<(e.r||10)+6) damageEnemy(e,dmg,other); }
    } else if(other.heroId==='jaballas'){
      // 9-pellet shotgun matching DLC local visual (was 3 big bullets)
      const jab_spread=0.6,jab_pc=9;
      for(let i=0;i<jab_pc;i++){ const a=ang+(i/(jab_pc-1)-0.5)*jab_spread; spawnBullet({x:ox+Math.cos(a)*18,y:oy+Math.sin(a)*18,vx:Math.cos(a)*720,vy:Math.sin(a)*720,dmg:dmg/3,owner:other.id,color:h.color,radius:5,life:range/720*1.1,piercing:0}); }
    } else if(other.heroId==='jazmine'){
      // Jazmine: push bullet directly so we hold the reference for explosion tracking
      const jb={x:ox+Math.cos(ang)*14,y:oy+Math.sin(ang)*14,vx:Math.cos(ang)*740,vy:Math.sin(ang)*740,dmg,owner:other.id,color:h.color,radius:8,life:range/740*1.05,piercing:0,trail:[]};
      state.bullets.push(jb);
      if(window.__nsJazTrack) window.__nsJazTrack(jb, other);
    } else if(other.heroId==='yachiyu'){
      // Umbrella mechanic — damage + tick are handled by _yachiyuUmbs (set up in playRemoteAction).
      // Do NOT spawnBullet here; that would show a stray projectile on the host player's screen.
    } else {
      const speed = {joross:720,jake:520,joshua:780,justin:680,jazmine:620,kagoya:660,iruha:600,yachiyu:560,well:600}[other.heroId] ?? 600;
      const radius = {jake:9,jeb:7,joshua:7,justin:7,jazmine:6,kagoya:5,iruha:8,yachiyu:6,well:7}[other.heroId] ?? 5;
      const piercing = (other.heroId==='jake'||other.heroId==='joshua') ? 1 : 0;
      const heal = (other.heroId==='jeb'||other.heroId==='yachiyu') ? dmg*0.4 : 0;
      spawnBullet({x:ox+Math.cos(ang)*18,y:oy+Math.sin(ang)*18,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,dmg,owner:other.id,color:h.color,radius,life:range/speed*1.05,piercing,heal});
    }

  } else if(act.t === 'abi'){
    if(other.heroId==='james'){
      // Whirlwind — spinning dual blades + tick damage (DLC override)
      state.fx.push({_jamesWhirl:true, ownerP:other, reach:160, life:0.7, life0:0.7});
      particles(ox,oy,'#22e8ff',36,240,0.55,3);
      const jwDmg=h.dmg*1.4*mods.dmg/8, jwN=0; let jwTick=0;
      const jwInt=setInterval(()=>{ jwTick++; for(const e of state.enemies){ if(Math.hypot(e.x-other.x,e.y-other.y)<160+(e.r||0)) damageEnemy(e,jwDmg,other); } if(jwTick>=8) clearInterval(jwInt); }, 87);
    } else if(other.heroId==='joseph'){
      // Soul tether — ring cast + particles (chains not re-synced on host)
      particles(ox,oy,'#ff2bd6',40,300,0.6,3);
      state.fx.push({ring:true,x:ox,y:oy,color:'#a020f0',life:0.5,life0:0.5,r:0,_maxR:144});
      for(const e of state.enemies){ if(Math.hypot(e.x-ox,e.y-oy)<360+(e.r||0)) damageEnemy(e,h.dmg*0.55*mods.dmg,other); }
    } else if(other.heroId==='kaitu'){
      // Blizzard — zone FX + tick damage (DLC override)
      // No ring push here — non-host clients see zone only (from DLC remote
      // handler). Adding a ring here would make the HOST see zone+ring while
      // others see zone only, which the user perceives as a "double" visual.
      const kbR=280, kbDur=3.0, kbTicks=6;
      state.fx.push({zone:true,x:ox,y:oy,r:kbR,color:h.color,life:kbDur,life0:kbDur,_kaituBlizzard:true,ownerP:other});
      if(window.__nsAddSlowZone) window.__nsAddSlowZone({x:ox,y:oy,r:kbR,life:kbDur,dps:0,slow:0.55,owner:other.id,follow:other});
      let kbN=0; const kbInt=setInterval(()=>{ kbN++; for(const e of state.enemies){ if(Math.hypot(e.x-other.x,e.y-other.y)<kbR+(e.r||0)) damageEnemy(e,h.dmg*3*mods.dmg/kbTicks,other); } if(kbN>=kbTicks) clearInterval(kbInt); }, kbDur*1000/kbTicks);
      const kbFol=setInterval(()=>{ for(const f of state.fx){ if(f._kaituBlizzard&&f.ownerP===other){f.x=other.x;f.y=other.y;} } },50); setTimeout(()=>clearInterval(kbFol),kbDur*1000);
    } else if(other.heroId==='jake'){
      const ring=24; for(let i=0;i<ring;i++){ const a=(i/ring)*Math.PI*2; spawnBullet({x:ox,y:oy,vx:Math.cos(a)*420,vy:Math.sin(a)*420,dmg:h.dmg*1.2*mods.dmg,owner:other.id,color:h.color,radius:8,life:0.9,piercing:2}); }
    } else if(other.heroId==='jeff'){
      const dx=Math.cos(ang)*180, dy=Math.sin(ang)*180;
      for(const e of state.enemies){ const ax=e.x-ox,ay=e.y-oy; const t2=Math.max(0,Math.min(1,(ax*dx+ay*dy)/(dx*dx+dy*dy))); const px=ox+dx*t2, py=oy+dy*t2; if(Math.hypot(e.x-px,e.y-py)<40+(e.r||0)) damageEnemy(e,h.dmg*1.8*mods.dmg,other); }
    } else if(other.heroId==='justin'){
      // Spirit guardian summon — ring + particles (mob spawned on host via __nsSpawnGuardian)
      particles(ox,oy,h.color,36,280,0.7,3);
      state.fx.push({ring:true,x:ox,y:oy,color:h.color,life:0.55,life0:0.55,r:0,_maxR:120});
      if(window.__nsSpawnGuardian) window.__nsSpawnGuardian(other);
    } else if(other.heroId==='jian'){
      // Overcharge — 60-dot megabeam + hitscan damage (DLC override)
      const jianBL=h.range*1.6, jianHW=36;
      for(let i=0;i<60;i++){ const t=i/60,r=jianBL*t; state.fx.push({x:ox+Math.cos(ang)*r,y:oy+Math.sin(ang)*r,vx:0,vy:0,life:0.5,life0:0.5,color:h.color,r:8}); }
      for(const e of state.enemies){ const dx=e.x-ox,dy=e.y-oy; const along=dx*Math.cos(ang)+dy*Math.sin(ang); const perp=-dx*Math.sin(ang)+dy*Math.cos(ang); if(along>0&&along<jianBL&&Math.abs(perp)<jianHW+(e.r||0)) damageEnemy(e,h.dmg*4*mods.dmg,other); }
    } else if(other.heroId==='jaballas'){
      // Slug round — single big yellow piercing projectile (DLC override)
      spawnBullet({x:ox+Math.cos(ang)*20,y:oy+Math.sin(ang)*20,vx:Math.cos(ang)*820,vy:Math.sin(ang)*820,dmg:h.dmg*1.0*mods.dmg,owner:other.id,color:'#ffd166',radius:14,life:1.4,piercing:99});
    } else if(other.heroId==='joshua'){
      // Arrow volley — 12 rain arrows scattered around target point (DLC override)
      const jtx=ox+Math.cos(ang)*420, jty=oy+Math.sin(ang)*420;
      for(let i=0;i<12;i++){ setTimeout(()=>{ const jox=(Math.random()-0.5)*240,joy=(Math.random()-0.5)*240; const tx=jtx+jox,ty=jty+joy; spawnBullet({x:tx-Math.cos(ang)*120,y:ty-Math.sin(ang)*120,vx:Math.cos(ang)*800,vy:Math.sin(ang)*800,dmg:h.dmg*1.0*mods.dmg,owner:other.id,color:h.color,radius:4,life:0.25,piercing:1}); state.fx.push({x:tx,y:ty,vx:0,vy:0,life:0.3,life0:0.3,color:h.color,r:6}); }, i*70); }
    } else if(other.heroId==='jazmine'){
      // Nuclear detonation — 2s charge ring + massive blast (DLC override)
      const jaz_blastR=420, jaz_blastDmg=h.dmg*8*mods.dmg;
      const jaz_warn={_nukeCharge:true,ring:true,x:ox,y:oy,color:'#ff80df',r:80,life:2.0,life0:2.0};
      state.fx.push(jaz_warn);
      const jaz_fol=setInterval(()=>{jaz_warn.x=other.x;jaz_warn.y=other.y;},50);
      setTimeout(()=>{
        clearInterval(jaz_fol); jaz_warn.life=0;
        const ex=jaz_warn.x,ey=jaz_warn.y;
        state.fx.push({_flash:true,color:'#ffffff',life:0.35,life0:0.35,x:ex,y:ey,r:0});
        state.fx.push({ring:true,x:ex,y:ey,color:'#ffffff',life:0.7,life0:0.7,r:0,_maxR:jaz_blastR});
        state.fx.push({ring:true,x:ex,y:ey,color:'#ff80df',life:0.9,life0:0.9,r:0,_maxR:jaz_blastR*1.1});
        state.fx.push({ring:true,x:ex,y:ey,color:'#ffd166',life:1.1,life0:1.1,r:0,_maxR:jaz_blastR*1.25});
        state.fx.push({ring:true,x:ex,y:ey,color:'#ff3d6a',life:1.4,life0:1.4,r:0,_maxR:jaz_blastR*1.4});
        for(const e of state.enemies){ const d=Math.hypot(e.x-ex,e.y-ey); if(d<jaz_blastR+(e.r||0)) damageEnemy(e,jaz_blastDmg,other); else if(d<jaz_blastR*1.5) damageEnemy(e,jaz_blastDmg*0.4,other); }
      }, 2000);
    } else if(other.heroId==='kagoya'){
      // Glitch field — ring + zone at 180 forward (DLC override)
      const kzx=ox+Math.cos(ang)*180,kzy=oy+Math.sin(ang)*180,kzR=130,kzDur=4.0;
      state.fx.push({ring:true,x:kzx,y:kzy,color:h.color,life:0.6,life0:0.6,r:0,_maxR:kzR});
      state.fx.push({zone:true,x:kzx,y:kzy,r:kzR,color:h.color,life:kzDur,life0:kzDur});
      if(window.__nsAddSlowZone) window.__nsAddSlowZone({x:kzx,y:kzy,r:kzR,life:kzDur,dps:(h.dmg*0.6*mods.dmg)/0.18,slow:0.45,owner:other.id});
    } else if(other.heroId==='iruha'){
      // Bulwark smash — two rings + knockback damage (DLC override)
      const iR=220;
      state.fx.push({ring:true,x:ox,y:oy,color:h.color,life:0.6,life0:0.6,r:0,_maxR:iR});
      state.fx.push({ring:true,x:ox,y:oy,color:'#ffffff',life:0.4,life0:0.4,r:0,_maxR:iR*0.7});
      for(const e of state.enemies){ const dx=e.x-ox,dy=e.y-oy,d=Math.hypot(dx,dy); if(d<iR+(e.r||0)){ damageEnemy(e,h.dmg*1.8*mods.dmg,other); const a=Math.atan2(dy,dx); e.x+=Math.cos(a)*120; e.y+=Math.sin(a)*120; } }
    } else if(other.heroId==='yachiyu'){
      // Recall — remove umbrella from this client's tracker so it disappears visually
      if(window._yachiyuUmbs) window._yachiyuUmbs.delete(other.id);
      state.fx.push({ring:true,x:ox,y:oy,color:'#ffffff',life:0.3,life0:0.3,r:0,_maxR:42});
      particles(ox,oy,h.color,26,250,0.5,3);
    } else if(other.heroId==='well'){
      // Well Strike — warning ring at target + delayed flash + blast rings (DLC override)
      const wtx=ox+Math.cos(ang)*220,wty=oy+Math.sin(ang)*220,wsr=200;
      state.fx.push({ring:true,x:wtx,y:wty,color:h.color,life:0.45,life0:0.45,r:wsr,_maxR:wsr});
      setTimeout(()=>{
        state.fx.push({_flash:true,color:'#c084ff',life:0.2,life0:0.2,x:wtx,y:wty,r:0});
        state.fx.push({ring:true,x:wtx,y:wty,color:'#ffffff',life:0.6,life0:0.6,r:0,_maxR:wsr});
        state.fx.push({ring:true,x:wtx,y:wty,color:h.color,life:0.8,life0:0.8,r:0,_maxR:wsr*1.2});
        for(let i=0;i<60;i++){ const a=Math.random()*Math.PI*2,r=Math.random()*wsr; state.fx.push({x:wtx+Math.cos(a)*r,y:wty+Math.sin(a)*r,vx:0,vy:-280-Math.random()*120,life:0.7+Math.random()*0.4,life0:1.1,color:h.color,r:3}); }
        for(const e of state.enemies){ if(Math.hypot(e.x-wtx,e.y-wty)<wsr+(e.r||0)) damageEnemy(e,h.dmg*7*mods.dmg,other); }
      }, 450);
    } else if(other.heroId==='joross'){
      // Speed buff — no damage, handled locally
    }
  }
}

let lastEnemyBroadcast = 0;
function broadcastEnemyState(dt){
  if(!activeRoom || !state.isHost) return;
  lastEnemyBroadcast += dt;
  if(lastEnemyBroadcast < 0.05) return;
  lastEnemyBroadcast = 0;
  try{
    activeRoom.send('enemyState', {
      wave: state.wave,
      wavePhase: state.wavePhase,
      waveTimer: +state.waveTimer.toFixed(2),
      waveToSpawn: state.waveToSpawn,
      waveEnemiesAlive: state.waveEnemiesAlive,
      fracture: state.fracture,
      enemies: state.enemies.map(serializeEnemy),
      // GOD MODE sync
      god: isGodMode() && state.god ? { phase: state.god.phase, mode: state.god.mode, timer: +state.god.timer.toFixed(2) } : null,
    });
  }catch(e){}
}

function applyEnemyState(msg){
  if(!msg || state.isHost) return;
  const prevPhase = state.wavePhase;
  const prevWave = state.wave;
  if(typeof msg.wave === 'number') state.wave = msg.wave;
  if(typeof msg.wavePhase === 'string') state.wavePhase = msg.wavePhase;
  if(typeof msg.waveTimer === 'number') state.waveTimer = msg.waveTimer;
  if(typeof msg.waveToSpawn === 'number') state.waveToSpawn = msg.waveToSpawn;
  if(typeof msg.waveEnemiesAlive === 'number') state.waveEnemiesAlive = msg.waveEnemiesAlive;
  if(typeof msg.fracture === 'number') state.fracture = msg.fracture;

  // God Mode sync (joiner side)
  if(msg.god && isGodMode()){
    if(!state.god){ state.god = { phase:1, boss:null, mode:'fight', timer:0, pickupTimer:99, skillCooldowns:{}, skillIndex:0, bossTelegraphCooldown:99 }; }
    const prevP = state.god.phase;
    state.god.phase = msg.god.phase;
    if(state.god.mode !== msg.god.mode){
      const newMode = msg.god.mode;
      if(newMode === 'intro' && msg.god.phase !== prevP){
        const pd = BOSS_PHASES[msg.god.phase-1];
        if(pd){ showGodIntro(`PHASE ${msg.god.phase} / 10`, pd.name, pd.title, msg.god.phase>=8?'S++ BOSS':(msg.god.phase>=5?'S+ BOSS':'S BOSS')); SFX.playMusic(pd.music||'god'); }
      }
      state.god.mode = newMode;
    }
    state.god.timer = msg.god.timer;
  }

  const existing = new Map(state.enemies.map(e => [e.id, e]));
  const next = [];
  const incoming = Array.isArray(msg.enemies) ? msg.enemies : [];
  for(const raw of incoming){
    let e = existing.get(raw.id);
    if(!e){
      e = makeEnemy(raw);
      e.x = raw.x; e.y = raw.y; e.rx = raw.x; e.ry = raw.y;
      // Show boss bar for ANY boss when it first appears on this client —
      // previously gated to isGodMode() only, so the endless boss bar was
      // never shown to joiners in endless mode.
      if(e.isBoss){
        const pd = BOSS_PHASES[(e.bossPhase||1)-1];
        if(pd) showBossBar(pd.name);
      }
    } else {
      e.type = raw.type || e.type;
      e.hp = raw.hp;
      e.hpMax = raw.hpMax;
      e.sp = raw.sp;
      e.r = raw.r;
      e.dmg = raw.dmg;
      e.col = raw.col;
      e.cd = raw.cd || 0;
      e.jitter = raw.jitter || 0;
      e.fromWave = raw.fromWave;
      e.isBoss = !!raw.isBoss;
      e.isMinion = !!raw.isMinion;
      e.bossPhase = raw.bossPhase || 0;
      const gap = Math.hypot((raw.x||0)-e.x, (raw.y||0)-e.y);
      if(gap > 180){ e.x = raw.x; e.y = raw.y; }
      e.rx = raw.x; e.ry = raw.y;
    }
    if(e.isBoss) updateBossBarFill(e.hp, e.hpMax);
    next.push(e);
  }
  // Detect boss disappearing -> hide bar
  const hadBoss = state.enemies.some(e=>e.isBoss);
  const hasBoss = next.some(e=>e.isBoss);
  if(hadBoss && !hasBoss) hideBossBar();
  state.enemies = next;

  if(state.scene !== 'game') return;
  if(state.wave > prevWave){
    if(state.upgradeChosenForWave && state.upgradeChosenForWave < state.wave){
      state.upgradeChosenForWave = 0;
    }
    state.upgradeOpenForWave = 0;
  }
  if(!isGodMode() && (prevPhase !== state.wavePhase || prevWave !== state.wave)){
    if(state.wavePhase === 'prep'){
      // Only close the upgrade picker if the player already dismissed it
      // themselves. If it's still open they haven't chosen yet — let them
      // finish. The modal will close once they click a card. If the wave goes
      // active before they choose, the 'active' branch below force-closes it.
      const upgradeModal = document.getElementById('upgrade');
      const upgradeIsOpen = upgradeModal && upgradeModal.style.display === 'flex';
      if(!upgradeIsOpen) hideUpgrade();
      showWaveBanner(`WAVE ${state.wave}`, 'PREPARE', 1200);
    } else if(state.wavePhase === 'active'){
      // Only hide upgrade if player already closed it themselves. If it's still
      // open they're mid-selection — let them pick while the wave runs.
      const upgradeModalActive = document.getElementById('upgrade');
      if(!upgradeModalActive || upgradeModalActive.style.display !== 'flex') hideUpgrade();
      hideWaveBanner();
      showWaveBanner(`WAVE ${state.wave}`, 'FIGHT!', 1200);
    } else if(state.wavePhase === 'upgrade'){
      showWaveBanner(`WAVE ${state.wave} CLEARED`, 'CHOOSE UPGRADE', 1500);
      if(state.upgradeChosenForWave !== state.wave){
        const modal = document.getElementById('upgrade');
        if(modal && modal.style.display !== 'flex') showUpgradePicker();
      }
    } else if(state.wavePhase === 'boss_wave'){
      // Boss arriving — show boss bar for the joiner using the first boss
      // enemy that was just synced into state.enemies.
      const bossEnemy = state.enemies.find(e => e.isBoss);
      if(bossEnemy){
        const pd = BOSS_PHASES[(bossEnemy.bossPhase||1)-1];
        if(pd) showBossBar(pd.name);
      }
    }
  }
}

// ----------------------------------------------------------------------------
// JOINER-SIDE handlers for boss skill replication (see broadcast helpers).
// ----------------------------------------------------------------------------
function applyBossFxMessage(msg){
  if(state.isHost) return;
  if(!msg || !Array.isArray(msg.fx)) return;
  for(const raw of msg.fx){
    // CRITICAL: default vx/vy to 0. The broadcast payload omits velocity, so
    // without this any fx that isn't ring/beam/warn/zone (i.e. _shock, _pull,
    // _flash) would do `f.x += undefined * dt` → NaN, breaking distance
    // checks and silently disabling damage on joiners. That's why telegraph
    // beams hurt the joiner but shockwaves / void zones / pulls didn't.
    const f = Object.assign({ vx:0, vy:0 }, raw, { _sent: true });
    if(typeof f.vx !== 'number') f.vx = 0;
    if(typeof f.vy !== 'number') f.vy = 0;
    // Re-link _bossRef to the local mirror of that boss so anchored fx
    // (e.g. radial_collapse contracting ring, gravity_well rings) follow
    // the boss on the joiner's screen too.
    if(raw.bossId && Array.isArray(state.enemies)){
      const boss = state.enemies.find(e => e && e.id === raw.bossId);
      if(boss) f._bossRef = boss;
    }
    state.fx.push(f);
  }
}
function applyBossBulletsMessage(msg){
  if(state.isHost) return;
  if(!msg || !Array.isArray(msg.bullets)) return;
  for(const raw of msg.bullets){
    state.bullets.push({
      x: raw.x, y: raw.y, vx: raw.vx, vy: raw.vy,
      color: raw.color, radius: raw.radius || 9,
      life: raw.life || 3.5, dmg: raw.dmg || 0,
      hostile: true, trail: [], _sent: true,
    });
  }
}
function applyBossHitMessage(msg){
  if(state.isHost) return;
  if(!msg || msg.targetId !== state.mySessionId) return;
  const p = state.player;
  if(!p || !p.alive || p.downed) return;
  let rem = +msg.dmg || 0;
  if(p.shield > 0){ const a = Math.min(p.shield, rem); p.shield -= a; rem -= a; }
  p.hp -= rem;
  SFX.hurt();
  if(msg.shake) shake(msg.shake);
  particles(p.x, p.y, '#ff3d6a', 8, 220, 0.4, 2);
}
function applyPurgeFxMessage(){
  if(state.isHost) return;
  state.fx = state.fx.filter(f => !(f.warn || f.beam || f.zone || f._shock || f._pull || f._flash));
  state.bullets = state.bullets.filter(b => !b.hostile);
}

// ----------------------------------------------------------------------------
// PICKUP REPLICATION (host-authoritative spawn, anyone-can-collect).
// Without this, joiners can't see floor drops or boss-skill drops at all.
// ----------------------------------------------------------------------------
function applyPickupSpawnMessage(msg){
  if(state.isHost) return;
  if(!msg || msg.pid == null) return;
  // De-dupe in case of stray re-broadcasts.
  if(state.pickups.some(pk => pk.pid === msg.pid)) return;
  const pk = Object.assign({}, msg, { t: 0, _sent: true });
  state.pickups.push(pk);
  // Match the host's spawn-fx so the joiner sees the same drop-in.
  const sparkColor = pk.color || (pk.bossSkill ? '#ffd166' : '#ffd166');
  const isLegendary = pk.rarity === 'legendary';
  const isEpic = pk.rarity === 'epic';
  const isRare = pk.rarity === 'rare';
  const sparkN = pk.bossSkill ? 60 : (isLegendary ? 70 : isEpic ? 40 : isRare ? 24 : 12);
  const sparkSpd = (pk.bossSkill || isLegendary || isEpic || isRare) ? 320 : 140;
  particles(pk.x, pk.y, sparkColor, sparkN, sparkSpd, 0.9, 4);
  if(pk.bossSkill){
    state.fx.push({ring:true, x:pk.x, y:pk.y, color:sparkColor, life:0.9, life0:0.9, r:0, _maxR:140});
  } else if(isLegendary || isEpic || isRare){
    const r0 = isLegendary ? 110 : isEpic ? 80 : 55;
    state.fx.push({ring:true, x:pk.x, y:pk.y, color:sparkColor, life:0.55, life0:0.55, r:0, _maxR:r0});
  }
}
function applyPickupCollectMessage(msg){
  if(!msg || msg.pid == null) return;
  // Just remove the pickup from our local world — the collector applied the
  // upgrade to their own player locally before sending this message.
  state.pickups = state.pickups.filter(pk => pk.pid !== msg.pid);
}
function applyPickupClearMessage(){
  if(state.isHost) return;
  state.pickups.length = 0;
}
function broadcastPickupSpawn(pk){
  if(!activeRoom || !state.isHost) return;
  try{
    activeRoom.send('pickupSpawn', {
      pid: pk.pid,
      x: pk.x|0, y: pk.y|0,
      id: pk.id, name: pk.name, rarity: pk.rarity,
      bossSkill: !!pk.bossSkill, skillId: pk.skillId, skillName: pk.skillName,
      color: pk.color, phase: pk.phase,
    });
  }catch(e){}
}

function setCountdownText(text){
  const el = document.getElementById('countdown');
  if(el) el.textContent = text;
  const status = document.getElementById('lobbyStatus');
  if(status && text) status.textContent = `STARTING IN ${text}…`;
}

function renderLobby(){
  const list = $('#lobbyList'); list.innerHTML='';
  const players = [...state.lobby.players.values()].sort((a,b)=> Number(!!b.isHost) - Number(!!a.isHost) || String(a.name||'').localeCompare(String(b.name||'')));
  for(const p of players){
    const row = document.createElement('div');
    row.className = 'player-row' + (p.ready ? ' ready' : '');
    const sigLabel = `<span style="color:var(--green);font-size:10px;font-weight:700">✓ CONNECTED</span>`;
    row.innerHTML = `<div class="dot"></div><div class="name">${escapeHtml(p.name||'Player')}${p.isHost?' <span style="color:var(--cyan)">★</span>':''}</div><div class="hero">${(HEROES[p.heroId]||{}).name||'?'}</div>${sigLabel}`;
    list.appendChild(row);
  }
  if(state.lobby.phase === 'starting'){
    $('#lobbyStatus').textContent = `STARTING IN ${state.lobby.countdown}…`;
  } else {
    $('#lobbyStatus').textContent = `WAITING (${players.length}/8)`;
  }
}

async function joinRoom(roomName, options = {}){
  try{
    const opts = { name: state.username || 'Operator', heroId: state.hero, ...options };
    console.log('[net] joining', roomName, opts);
    if(activeRoom){ try{ await activeRoom.leave(); }catch(e){} activeRoom=null; }
    activeRoom = await client.joinOrCreate(roomName, opts);
    state.roomCode = activeRoom.id;
    state.mySessionId = activeRoom.sessionId;
    state.lobby.players.clear();
    state.lobby.phase = 'waiting';
    state.lobby.countdown = 0;
    setScene('lobby');
    $('#lobbyCode').textContent = '· ' + (roomName === 'battle_room' || roomName === 'battle_room_god' ? activeRoom.id : roomName);
    setCountdownText('');
    bindRoomHandlers();

    activeRoom.onLeave(() => { console.log('[net] left room'); });
    activeRoom.onError((code, message) => { console.error('[net] room error', code, message); alert('Room error: '+message); });

  } catch(e){
    console.error('Connection error:', e);
    alert("Can\u0027t connect to the game server. It may be waking up — try again in a few seconds.\n\nDetails: "+e.message);
    setScene('mpMenu');
  }
}

async function quickJoinPublic(){
  const rm = state.mode === 'godmulti' ? 'battle_room_god' : 'battle_room';
  await joinRoom(rm, {});
  if(activeRoom) toast('Joined public room ' + activeRoom.id, 2500);
}

const PENDING_ACTIONS = [];
function queueAction(a){
  if(!isMultiMode() || !activeRoom) return;
  PENDING_ACTIONS.push(a);
  if(PENDING_ACTIONS.length>32) PENDING_ACTIONS.splice(0, PENDING_ACTIONS.length-32);
}
let lastBroadcast = 0;
function broadcastTick(dt){
  if(!activeRoom) return;
  lastBroadcast += dt;
  if(lastBroadcast < 0.05 && PENDING_ACTIONS.length === 0) return;
  lastBroadcast = 0;
  const p = state.player;
  try{
    const payload = {
      id: state.mySessionId,
      name: p.name, heroId: p.heroId,
      x: p.x|0, y: p.y|0, angle: +p.angle.toFixed(2),
      hp: Math.ceil(p.hp), hpMax: p.hpMax, alive: p.alive, downed: !!p.downed,
      shield: Math.ceil(p.shield || 0),
      dashing: p.dashing>0 ? 1 : 0,
      mods: p.mods,
      ts: Date.now(),
    };
    if(PENDING_ACTIONS.length){ payload.actions = PENDING_ACTIONS.slice(); PENDING_ACTIONS.length = 0; }
    activeRoom.send('playerState', payload);
  }catch(e){}
}

function playRemoteAction(other, act, opts={}){
  if(!other || !act) return;
  const h = HEROES[other.heroId] || HEROES.james;
  const ang = (typeof act.a === 'number') ? act.a : (other.angle||0);
  const auth = !!opts.authoritativeProjectiles; // host sees authoritative bullets; guests see ghost ones
  const ox = other.x, oy = other.y;

  if(act.t === 'dash'){
    SFX.dashRemote();
    particles(ox, oy, h.color, 14, 200, 0.4, 2);

  } else if(act.t === 'atk'){
    SFX.fireRemote(other.heroId);
    const range = h.range;
    const speed = {joross:720,jake:520,jaballas:480,joshua:780,justin:680,jazmine:620,kagoya:660,iruha:600,yachiyu:560,well:600}[other.heroId] ?? 600;
    const radius = {jake:9,jeb:7,jaballas:11,joshua:7,justin:7,jazmine:6,kagoya:5,iruha:8,yachiyu:6,well:7}[other.heroId] ?? 5;
    const ghostBullet = (extra={})=>{ if(!auth) state.bullets.push({x:ox+Math.cos(ang)*18,y:oy+Math.sin(ang)*18,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,dmg:0,owner:other.id,color:h.color,radius,life:range/speed*1.05,piercing:99,trail:[],ghost:true,...extra}); };

    if(other.heroId==='james'){
      state.fx.push({_centerSwing:true, ownerId:other.id, x:ox, y:oy, vx:0, vy:0, color:h.color, life:0.28, life0:0.28});
      particles(ox, oy, h.color, 12, 220, 0.3, 4);
    } else if(other.heroId==='joseph' || other.heroId==='kaitu'){
      const arc = other.heroId==='kaitu' ? 1.5 : 1.2;
      const vr = other.heroId==='kaitu' ? range*1.15 : range*0.85;
      state.fx.push({_swing:true, owner:other, ang, arc, radius:vr, color:h.color, life:0.25, life0:0.25});
      particles(ox, oy, h.color, 10, 220, 0.3, 4);
    } else if(other.heroId==='jeff'){
      state.fx.push({_swing:true, owner:other, ang, arc:0.7, radius:range*0.95, color:h.color, life:0.18, life0:0.18, thin:true});
      particles(ox, oy, h.color, 8, 200, 0.25, 3);
    } else if(other.heroId==='jian'){
      // Laser beam visual only (no bullets)
      state.fx.push({_laser:true, x:ox, y:oy, ang, len:range, color:h.color, life:0.16, life0:0.16, owner:other.id, vx:0, vy:0});
      particles(ox, oy, h.color, 8, 200, 0.25, 2);
    } else if(other.heroId==='jake'){
      // Single magic missile — matches the one bullet jake fires on host side
      ghostBullet({ radius:9, piercing:99 });
      particles(ox, oy, h.color, 12, 220, 0.3, 3);
    } else if(other.heroId==='jaballas'){
      // Spread cannon fire
      if(!auth){ for(let i=-1;i<=1;i++){ const a=ang+i*0.22; state.bullets.push({x:ox+Math.cos(a)*18,y:oy+Math.sin(a)*18,vx:Math.cos(a)*480,vy:Math.sin(a)*480,dmg:0,owner:other.id,color:h.color,radius:11,life:range/480*1.05,piercing:99,trail:[],ghost:true}); } }
      particles(ox, oy, h.color, 14, 220, 0.35, 4);
    } else if(other.heroId==='joross'){
      // Plasma fire
      ghostBullet();
      particles(ox, oy, h.color, 12, 220, 0.3, 3);
    } else if(other.heroId==='jeb'){
      // Holy bolts
      ghostBullet();
      particles(ox, oy, h.color, 10, 220, 0.3, 2);
    } else if(other.heroId==='joshua'){
      // Sniper shots
      ghostBullet();
      particles(ox, oy, h.color, 10, 220, 0.3, 3);
    } else if(other.heroId==='justin'){
      // Marksman shots
      ghostBullet();
      particles(ox, oy, h.color, 10, 220, 0.3, 2);
    } else if(other.heroId==='jazmine'){
      // Spell arrows
      ghostBullet();
      particles(ox, oy, h.color, 10, 220, 0.3, 3);
    } else if(other.heroId==='kagoya'){
      // Burst shots
      ghostBullet();
      particles(ox, oy, h.color, 8, 220, 0.3, 2);
    } else if(other.heroId==='iruha'){
      // Storm bolts
      ghostBullet();
      particles(ox, oy, h.color, 12, 220, 0.3, 3);
    } else if(other.heroId==='yachiyu'){
      // Healing bolts
      ghostBullet();
      particles(ox, oy, h.color, 10, 220, 0.3, 2);
    } else if(other.heroId==='well'){
      // Aether bolts
      ghostBullet();
      particles(ox, oy, h.color, 10, 220, 0.3, 2);
    } else {
      ghostBullet();
      particles(ox, oy, h.color, 8, 220, 0.3, 2);
    }

  } else if(act.t === 'abi'){
    SFX.abilityRemote(other.heroId);
    const range = h.range;
    const ghostBulletAbi = (vx,vy,r,extra={})=>{ if(!auth) state.bullets.push({x:ox,y:oy,vx,vy,dmg:0,owner:other.id,color:h.color,radius:r,life:range/Math.hypot(vx,vy)*1.05,piercing:99,trail:[],ghost:true,...extra}); };

    if(other.heroId==='james' || other.heroId==='joseph'){
      const r = other.heroId==='joseph'?170:140;
      particles(ox,oy,h.color,40,300,0.6,3);
      state.fx.push({ring:true,x:ox,y:oy,color:h.color,life:0.5,life0:0.5,r:0,_maxR:r});
    } else if(other.heroId==='kaitu'){
      particles(ox,oy,h.color,36,260,0.6,3);
      state.fx.push({ring:true,x:ox,y:oy,color:h.color,life:0.5,life0:0.5,r:0,_maxR:160});
    } else if(other.heroId==='jake'){
      if(!auth){ const rn=24; for(let i=0;i<rn;i++){ const a=(i/rn)*Math.PI*2; state.bullets.push({x:ox,y:oy,vx:Math.cos(a)*420,vy:Math.sin(a)*420,dmg:0,owner:other.id,color:h.color,radius:8,life:0.9,piercing:99,trail:[],ghost:true}); } }
      particles(ox,oy,h.color,40,260,0.7,3);
    } else if(other.heroId==='jeb'){
      particles(ox,oy,'#3dffb0',60,220,0.9,3);
      state.fx.push({x:ox,y:oy,vx:0,vy:0,life:4,life0:4,color:'#3dffb0',r:160,ring:true,heal:true,owner:other.id});
    } else if(other.heroId==='jeff'){
      particles(ox,oy,h.color,18,260,0.4,3);
      // Teleport — position gets updated via playerState; just show particles at destination
    } else if(other.heroId==='joross'){
      particles(ox,oy,h.color,30,220,0.5,3);
      state.fx.push({ring:true,x:ox,y:oy,color:h.color,life:0.4,life0:0.4,r:0,_maxR:80});
    } else if(other.heroId==='justin'){
      // Big piercing shot visual
      if(!auth) state.bullets.push({x:ox+Math.cos(ang)*18,y:oy+Math.sin(ang)*18,vx:Math.cos(ang)*900,vy:Math.sin(ang)*900,dmg:0,owner:other.id,color:h.color,radius:9,life:1.0,piercing:99,trail:[],ghost:true});
      particles(ox,oy,h.color,14,260,0.4,3);
    } else if(other.heroId==='jian'){
      // Fan of 5 laser blasts + fan laser effect
      for(let i=-2;i<=2;i++){ const a=ang+i*0.18; if(!auth) state.bullets.push({x:ox,y:oy,vx:Math.cos(a)*640,vy:Math.sin(a)*640,dmg:0,owner:other.id,color:h.color,radius:5,life:0.7,piercing:99,trail:[],ghost:true}); }
      state.fx.push({_laser:true,x:ox,y:oy,ang,len:range,color:h.color,life:0.35,life0:0.35,owner:other.id,vx:0,vy:0});
      particles(ox,oy,h.color,18,240,0.4,3);
    } else if(other.heroId==='jaballas'){
      for(let i=-1;i<=1;i++){ const a=ang+i*0.22; ghostBulletAbi(Math.cos(a)*520,Math.sin(a)*520,12,{life:1.0}); }
      particles(ox,oy,h.color,20,260,0.5,3);
    } else if(other.heroId==='joshua'){
      for(let i=0;i<3;i++){ setTimeout(()=>{ if(!auth) state.bullets.push({x:ox+Math.cos(ang)*18,y:oy+Math.sin(ang)*18,vx:Math.cos(ang)*1000,vy:Math.sin(ang)*1000,dmg:0,owner:other.id,color:h.color,radius:6,life:0.9,piercing:99,trail:[],ghost:true}); }, i*120); }
      particles(ox,oy,h.color,20,260,0.5,3);
    } else if(other.heroId==='jazmine'){
      const ar=14; for(let i=0;i<ar;i++){ const a=(i/ar)*Math.PI*2; ghostBulletAbi(Math.cos(a)*380,Math.sin(a)*380,5,{life:0.9}); }
      particles(ox,oy,h.color,30,220,0.6,2);
    } else if(other.heroId==='kagoya'){
      for(let i=0;i<3;i++){ setTimeout(()=>{ if(!auth) state.bullets.push({x:ox+Math.cos(ang)*18,y:oy+Math.sin(ang)*18,vx:Math.cos(ang)*700,vy:Math.sin(ang)*700,dmg:0,owner:other.id,color:h.color,radius:7,life:0.7,piercing:99,trail:[],ghost:true}); }, i*90); }
      particles(ox,oy,h.color,18,220,0.4,2);
    } else if(other.heroId==='iruha'){
      const rn=12; for(let i=0;i<rn;i++){ const a=(i/rn)*Math.PI*2; ghostBulletAbi(Math.cos(a)*460,Math.sin(a)*460,7,{life:0.7}); }
      state.fx.push({ring:true,x:ox,y:oy,color:h.color,life:0.5,life0:0.5,r:0,_maxR:180});
      particles(ox,oy,h.color,24,240,0.5,3);
    } else if(other.heroId==='yachiyu'){
      particles(ox,oy,'#aaffd6',50,220,0.8,3);
      state.fx.push({x:ox,y:oy,vx:0,vy:0,life:3,life0:3,color:'#aaffd6',r:150,ring:true,heal:true,owner:other.id});
      state.fx.push({ring:true,x:ox,y:oy,color:'#aaffd6',life:0.5,life0:0.5,r:0,_maxR:200});
      state.fx.push({ring:true,x:ox,y:oy,color:'#ffffff',life:0.3,life0:0.3,r:0,_maxR:180});
    } else if(other.heroId==='well'){
      const rn=10; for(let i=0;i<rn;i++){ const a=(i/rn)*Math.PI*2; ghostBulletAbi(Math.cos(a)*500,Math.sin(a)*500,8,{life:0.8}); }
      state.fx.push({ring:true,x:ox,y:oy,color:h.color,life:0.6,life0:0.6,r:0,_maxR:200});
      particles(ox,oy,h.color,22,240,0.5,3);
    } else {
      // Generic ability — ring + particles
      particles(ox,oy,h.color,30,260,0.5,3);
      state.fx.push({ring:true,x:ox,y:oy,color:h.color,life:0.5,life0:0.5,r:0,_maxR:140});
    }

  } else if(act.t === 'bsc'){
    applyRemotePlayerSkillCast({ skillId: act.id, x: other.x, y: other.y, angle: (typeof act.a === 'number' ? act.a : other.angle||0), color: act.col });
    try{ SFX.ability(other.heroId); }catch(e){}
  }
}

function applyRemoteState(msg){
  if(!msg || !msg.id || msg.id === state.mySessionId) return;
  const ex = state.others.get(msg.id) || { id: msg.id, x: msg.x||0, y: msg.y||0, rx: msg.x||0, ry: msg.y||0, alive: true, downed: false, mods: makeDefaultMods() };
  ex.heroId = safeHeroId(msg.heroId || ex.heroId);
  ex.name = msg.name || ex.name || 'Player';
  ex.angle = (typeof msg.angle === 'number') ? msg.angle : (ex.angle||0);
  ex.hp = (typeof msg.hp === 'number') ? msg.hp : ex.hp;
  ex.hpMax = msg.hpMax || ex.hpMax || 100;
  ex.alive = msg.alive !== false;
  ex.downed = !!msg.downed;
  ex.dashing = msg.dashing ? 0.18 : (ex.dashing||0);
  ex.shield = (typeof msg.shield === 'number') ? msg.shield : (ex.shield||0);
  ex.mods = Object.assign(makeDefaultMods(), ex.mods || {}, msg.mods || {});
  const dx = (msg.x||0) - (ex.rx||0), dy = (msg.y||0) - (ex.ry||0);
  if(Math.hypot(dx,dy) > 400){ ex.x = msg.x; ex.y = msg.y; }
  ex.rx = msg.x; ex.ry = msg.y;
  if(ex.x === undefined){ ex.x = msg.x; ex.y = msg.y; }
  state.others.set(msg.id, ex);
  if(Array.isArray(msg.actions)){
    if(state.isHost){ for(const a of msg.actions) applyRemoteCombat(ex, a); }
    for(const a of msg.actions) playRemoteAction(ex, a, { authoritativeProjectiles: state.isHost });
  }
}

function interpolateOthers(dt){
  const k = 1 - Math.exp(-dt * 18);
  for(const o of state.others.values()){
    if(o.rx === undefined) continue;
    o.x += (o.rx - o.x) * k;
    o.y += (o.ry - o.y) * k;
    if(o.dashing>0) o.dashing = Math.max(0, o.dashing - dt);
  }
}

async function leaveLobby(targetScene='menu'){
  if(activeRoom){ try{ await activeRoom.leave(); }catch(e){} activeRoom=null; }
  state.roomCode=null; state.isHost=false; state.mySessionId=null;
  state.lobby.players.clear(); state.lobby.phase='waiting'; state.lobby.countdown=0;
  setCountdownText('');
  if(targetScene) setScene(targetScene);
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

// ============================================================
// LEADERBOARD (online — backed by /api/leaderboard)
// ============================================================
const API_BASE = (() => {
  if (typeof window !== 'undefined' && window.BACKEND_URL && window.BACKEND_URL.length > 0) {
    return window.BACKEND_URL.replace(/\/$/, '');
  }
  const base = (typeof import_meta_env !== 'undefined' && import_meta_env.BASE_URL) || '/';
  return base.replace(/\/$/, '');
})();

async function saveLBEntry(entry){
  try {
    await fetch(`${API_BASE}/api/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch(e){ console.warn('leaderboard save failed:', e); }
}

async function renderLeaderboard(){
  const tbody = document.getElementById('leaderBody');
  if(!tbody) return;
  // Fail fast when offline — no need to attempt a fetch
  if(!navigator.onLine){
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:24px">&#128245; Offline — leaderboard unavailable.<br><span style="font-size:11px;opacity:0.6">Connect to see scores.</span></td></tr>';
    return;
  }
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:24px">Loading…</td></tr>';
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    if(!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const entries = data.entries || [];
    if(!entries.length){
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:24px">No scores yet. Play a game to appear here!</td></tr>';
      return;
    }
    tbody.innerHTML = entries.map((e,i)=>`<tr>
      <td>${i+1}</td>
      <td>${escapeHtml(e.name||'?')}</td>
      <td>${(e.score||0)|0}</td>
    </tr>`).join('');
  } catch(err){
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:24px">Could not load scores.</td></tr>';
  }
}

// ============================================================
// UI WIRING
// ============================================================
$('#username').value = state.username;
$('#username').addEventListener('input', e=>{ state.username = e.target.value.slice(0,16); localStorage.setItem('ns_user', state.username); });

// Sub-menu toggle helper
function toggleSubMenu(openId, closeId){
  const open  = document.getElementById(openId);
  const close = document.getElementById(closeId);
  if(!open) return;
  const isOpen = open.classList.contains('open');
  open.classList.toggle('open', !isOpen);
  if(close) close.classList.remove('open');
}
$('#btnQuickPlayer').onclick = ()=>{ toggleSubMenu('subQuick','subMulti'); };
$('#btnMultiplayer').onclick = ()=>{ toggleSubMenu('subMulti','subQuick'); };

$('#btnSingle').onclick = ()=>{ state.mode='single'; setScene('heroSelect'); renderHeroGrid(); $('#heroConfirm').disabled = false; $('#heroConfirm').onclick = ()=> startGame('single'); };
$('#btnMulti').onclick  = ()=>{ if(!state.username){ toast('Enter a callsign first'); return; } state.mode='multi'; setScene('mpMenu'); };
// GOD MODE buttons:
$('#btnGodSolo').onclick = ()=>{
  if(!state.username){ toast('Enter a callsign first'); return; }
  state.mode='god';
  setScene('heroSelect'); renderHeroGrid();
  $('#heroConfirm').onclick = ()=> startGame('god');
};
$('#btnGodMulti').onclick = ()=>{
  if(!state.username){ toast('Enter a callsign first'); return; }
  state.mode='godmulti';
  setScene('mpMenu');
};
$('#btnLeader').onclick = ()=>{ setScene('leaderScreen'); };
$('#btnLeaderInfo').onclick = ()=>{ setScene('infoScreen'); };
$('#infoBack').onclick = ()=>{ setScene('leaderScreen'); };

$('#heroBack').onclick = ()=>{ $('#heroConfirm').disabled = false; setScene(isMultiMode() ? 'mpMenu' : 'menu'); };

$('#mpBack').onclick = ()=> setScene('menu');

$('#btnQuick').onclick = ()=>{
  setScene('heroSelect'); renderHeroGrid();
  $('#heroConfirm').disabled = false;
  $('#heroConfirm').onclick = async ()=>{
    const btn = $('#heroConfirm'); btn.disabled = true;
    try{ await quickJoinPublic(); } catch(e){ btn.disabled = false; throw e; }
  };
};
$('#btnCreate').onclick = ()=>{
  setScene('heroSelect'); renderHeroGrid();
  $('#heroConfirm').disabled = false;
  $('#heroConfirm').onclick = async ()=>{
    const btn = $('#heroConfirm'); btn.disabled = true;
    try{
      await joinRoom(state.mode === 'godmulti' ? 'battle_room_god' : 'battle_room', {});
      if(activeRoom) toast('Room created: '+activeRoom.id, 3000);
    } catch(e){ btn.disabled = false; throw e; }
  };
};
$('#btnJoin').onclick = ()=>{
  const code = $('#roomCode').value.trim();
  if(!code){ toast('Enter a room code'); return; }
  setScene('heroSelect'); renderHeroGrid();
  $('#heroConfirm').disabled = false;
  $('#heroConfirm').onclick = async ()=>{
    const btn = $('#heroConfirm'); btn.disabled = true;
    try{
      if(activeRoom){ try{ await activeRoom.leave(); }catch(e){} activeRoom=null; }
      activeRoom = await client.joinById(code, { name: state.username || 'Operator', heroId: state.hero });
      state.roomCode = activeRoom.id; state.mySessionId = activeRoom.sessionId;
      state.lobby.players.clear(); state.lobby.phase = 'waiting'; state.lobby.countdown = 0;
      bindRoomHandlers();
      setScene('lobby');
      $('#lobbyCode').textContent = '· '+activeRoom.id;
    } catch(e){
      console.warn('joinById failed, falling back:', e.message);
      try{ await joinRoom(state.mode === 'godmulti' ? 'battle_room_god' : 'battle_room', {}); } catch(e2){ btn.disabled = false; }
    }
  };
};

function safeHeroId(id){ return (id && HEROES[id]) ? id : 'james'; }

function seedOthersFromRoom(){
  // Use state.lobby.players — a plain JS Map built by refresh() — for
  // reliable iteration (avoids Colyseus MapSchema quirks).
  state.lobby.players.forEach((p, id) => {
    if(id === state.mySessionId) return;
    const heroId = safeHeroId(p.heroId);
    state.others.set(id, {
      id, heroId, name: p.name || 'Player',
      x: state.arena.w/2, y: state.arena.h/2,
      rx: state.arena.w/2, ry: state.arena.h/2,
      angle: 0,
      hp: HEROES[heroId].hp, hpMax: HEROES[heroId].hp,
      alive: true, downed: false, mods: makeDefaultMods()
    });
  });
}

function bindRoomHandlers(){
  if(!activeRoom) return;

  // Primary lobby sync via explicit lobbyUpdate messages (reliable across all Colyseus versions).
  // The server broadcasts lobbyUpdate on every join/leave/ready change, and we also request
  // a snapshot right after registering the listener so we never miss the initial state.
  activeRoom.onMessage('lobbyUpdate', (msg) => {
    if(!msg) return;
    const m = new Map();
    for(const p of (msg.players || [])){
      m.set(p.id, { id: p.id, name: p.name, heroId: p.heroId, ready: !!p.ready, isHost: !!p.isHost });
    }
    state.lobby.players = m;
    state.isHost = (msg.hostId === state.mySessionId);
    state.lobby.phase = msg.phase || 'waiting';
    renderLobby();
  });

  // Fallback: schema state changes (covers edge cases)
  try {
    activeRoom.onStateChange(() => {
      if(!activeRoom || !activeRoom.state || !activeRoom.state.players) return;
      const m = new Map();
      activeRoom.state.players.forEach((p, id) => {
        m.set(id, { id, name: p.name, heroId: p.heroId, ready: !!p.ready, isHost: !!p.isHost });
      });
      if(m.size > 0) { state.lobby.players = m; state.isHost = (activeRoom.state.hostId === state.mySessionId); renderLobby(); }
    });
  } catch(_){}

  // Clean up ghost entities when a player disconnects mid-game
  activeRoom.onMessage('playerLeft', (msg) => {
    if(!msg || !msg.id) return;
    if(state.others && state.others.has(msg.id)){
      if(state.reviveTarget && state.reviveTarget.id === msg.id){ state.reviveTarget = null; state.reviveHoldTime = 0; }
      state.others.delete(msg.id);
    }
  });
  activeRoom.onMessage('countdown', (msg)=>{ state.lobby.countdown = msg.n||0; if(msg.cancelled||!msg.n){ setCountdownText(''); renderLobby(); } else setCountdownText(msg.n>0?msg.n:'GO'); });
  activeRoom.onMessage('startGame', ()=>{
    setCountdownText('');
    try{
      startGame(state.mode === 'godmulti' ? 'godmulti' : 'multi');
      seedOthersFromRoom();
    }catch(e){ console.error(e); }
  });
  activeRoom.onMessage('playerState', (msg)=> applyRemoteState(msg));
  activeRoom.onMessage('enemyState', (msg)=> applyEnemyState(msg));
  activeRoom.onMessage('bossFx', (msg)=> applyBossFxMessage(msg));
  activeRoom.onMessage('bossBullets', (msg)=> applyBossBulletsMessage(msg));
  activeRoom.onMessage('bossHit', (msg)=> applyBossHitMessage(msg));
  activeRoom.onMessage('purgeFx', ()=> applyPurgeFxMessage());
  activeRoom.onMessage('pickupSpawn', (msg)=> applyPickupSpawnMessage(msg));
  activeRoom.onMessage('pickupCollect', (msg)=> applyPickupCollectMessage(msg));
  activeRoom.onMessage('pickupClear', ()=> applyPickupClearMessage());
  activeRoom.onMessage('playerSkillCast', (msg)=> applyRemotePlayerSkillCast(msg));
  activeRoom.onMessage('hostMigrated', (msg)=>{
    const wasHost = state.isHost;
    state.isHost = (msg && msg.hostId === state.mySessionId);
    if(state.isHost && !wasHost){
      state.bullets = state.bullets.filter(b => b.owner !== state.player.id);
      toast('You are now the host', 1800);
      // The promoted host inherited interpolated enemies but never ran
      // spawnBoss(), so state.god.boss is null. Re-anchor it (and reset boss
      // skill bookkeeping) so the boss HP bar keeps updating and the boss can
      // continue using skills under the new authority.
      if(isGodMode() && state.god){
        const liveBoss = state.enemies.find(en => en && en.isBoss);
        if(liveBoss){
          state.god.boss = liveBoss;
          state.god.skillCooldowns = state.god.skillCooldowns || {};
          state.god.bossTelegraphCooldown = 1.5;
        }
      }
    }
  });
  activeRoom.onMessage('revive', (msg)=> handleReviveMessage(msg));
  activeRoom.onMessage('skipWaveCountdown', ()=>{ _hideSkipBtn(); try{ startWaveActive(); }catch(_){} });
  activeRoom.onMessage('upgradeChosen', ()=>{ if(canAuthorEnemies() && state.wavePhase === 'upgrade'){ try{ startWavePrep(state.wave + 1); }catch(_){} } });
  // When the host ends the game (victory/defeat), non-host clients clear all enemies
  // so Justin's minions and leftover enemies don't linger for other players.
  activeRoom.onMessage('gameEnd', (msg)=>{
    if(msg && typeof msg.score === 'number'){
      state.score = Math.max(state.score|0, msg.score|0);
    }
    state.running = false;
    setScene('endScreen');
    clearInGameOverlays();
    const endScore = document.getElementById('endScore');
    if(endScore) endScore.textContent = state.score|0;
    const endTitle = document.getElementById('endTitle');
    const endStats = document.getElementById('endStats');
    if(endTitle) endTitle.textContent = 'You Died';
    if(endStats){
      const t = state.time|0;
      const phaseLabel = isGodMode() ? `Reached Phase ${state.god ? state.god.phase : 1}/10` : `Wave ${state.wave}`;
      endStats.innerHTML = `Survived ${Math.floor(t/60)}m ${t%60}s · ${state.kills} kills · ${phaseLabel}`;
    }
    // Save joiner's local score to leaderboard so it appears in the LB screen
    try {
      const t2 = state.time|0;
      saveLBEntry({
        name: state.username || 'Operator',
        hero: (HEROES[state.hero] || {}).name || state.hero,
        score: state.score|0,
        time: `${Math.floor(t2/60)}m ${t2%60}s`,
        mode: state.mode,
        ts: Date.now()
      });
    } catch(_){}
    if(!canAuthorEnemies() && state.enemies){ state.enemies.forEach(e=>{ e.dead=true; }); state.enemies=[]; }
  });

  // Receive all players' final scores from the server and display them on the end screen
  activeRoom.onMessage('allScores', (msg)=>{
    const scores = (msg && Array.isArray(msg.scores)) ? msg.scores : [];
    const el = document.getElementById('multiScores');
    if(!el || scores.length === 0) return;
    el.innerHTML = '<div style="font-size:11px;letter-spacing:0.12em;color:var(--cyan);text-transform:uppercase;margin-bottom:6px">All Players</div>' +
      scores.map((s, i) => {
        const medal = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `${i+1}.`;
        return `<div style="display:flex;justify-content:space-between;gap:16px;padding:4px 0;border-bottom:1px solid rgba(157,92,255,0.15)"><span>${medal} ${escapeHtml(s.name||'?')}</span><span style="color:var(--green);font-weight:700">${(s.score||0)|0}</span></div>`;
      }).join('');
    el.style.display = 'block';
  });

  // Ask server for current lobby snapshot — this is the primary mechanism to
  // populate the lobby since the schema state patch may race with the join.
  try{ activeRoom.send('requestLobby', {}); } catch(_){}
}

$('#lobbyLeave').onclick = ()=> leaveLobby('mpMenu');
$('#lobbyReady').onclick = ()=>{ if(activeRoom) activeRoom.send('toggleReady'); };

$('#leaderBack').onclick = ()=> setScene('menu');
$('#btnRestart').onclick = ()=>{
  clearInGameOverlays();
  if(state.mode==='multi' || state.mode==='godmulti') setScene('lobby');
  else if(state.mode==='god') startGame('god');
  else startGame('single');
};
// Hide every transient in-game overlay so leftovers (wave banner, boss bar,
// pickup toast, god intro, mobile boss-skill button, downed Leave button)
// don't ghost on the menu after the player leaves the game.
function clearInGameOverlays(){
  state.running = false;
  _hideSkipBtn();
  // Wave banner — kill its scheduled re-hide too, otherwise the timeout can
  // re-show it after we've already left.
  const wb = document.getElementById('waveBanner');
  if(wb){ wb.classList.remove('show'); wb.style.display = 'none'; }
  if(typeof showWaveBanner !== 'undefined' && showWaveBanner._t){
    clearTimeout(showWaveBanner._t); showWaveBanner._t = null;
  }
  if(typeof showPickupBanner !== 'undefined' && showPickupBanner._t){
    clearTimeout(showPickupBanner._t); showPickupBanner._t = null;
  }
  // God Mode chrome
  try{ hideBossBar(); }catch(e){}
  try{ hideGodIntro(); }catch(e){}
  // Toasts / pickup popup
  const pkt = document.getElementById('pickupToast'); if(pkt) pkt.classList.remove('show');
  const tst = document.getElementById('toast'); if(tst) tst.style.display = 'none';
  // Mobile downed Leave + revive prompt + boss-skill button
  const tDown = document.getElementById('tLeaveDowned'); if(tDown) tDown.style.display = 'none';
  const tRev  = document.getElementById('tRevive');      if(tRev)  tRev.style.display  = 'none';
  const tBs   = document.getElementById('tBossSkill');   if(tBs)   tBs.style.display   = 'none';
  // Upgrade modal (in case it's open)
  const upg = document.getElementById('upgrade'); if(upg) upg.style.display = '';
  const end = document.getElementById('endScreen');
  if(end) end.style.pointerEvents = 'auto';
  for(const id of ['btnHome','btnLeaveEnd','btnLeaveGame']){
    const el = document.getElementById(id);
    if(el){
      el.style.pointerEvents = 'auto';
      el.style.position = 'relative';
      el.style.zIndex = '9999';
    }
  }
}

function _saveScoreOnLeave(){
  if(!state || !(state.score|0)) return;
  const t=state.time|0;
  saveLBEntry({
    name: state.username || 'Operator',
    hero: (HEROES[state.hero] || {}).name || state.hero,
    score: state.score|0,
    wave: state.wave || 0,
    time: `${Math.floor(t/60)}m ${t%60}s`,
    mode: state.mode,
  }).catch(()=>{});
  // Flush any pending kill SP
  try{ flushSP(); }catch(_){}
}
$('#btnHome').onclick      = ()=>{ clearInGameOverlays(); leaveLobby('menu'); };
$('#btnLeaveEnd').onclick  = ()=>{ clearInGameOverlays(); leaveLobby('menu'); };
$('#btnLeaveGame').onclick = ()=>{ _saveScoreOnLeave(); clearInGameOverlays(); leaveLobby('menu'); };

// ---------- Boot / Preloader ----------
async function bootPreload(){
  const loadEl = document.getElementById('loadingScreen');
  const barEl  = document.getElementById('loadBar');
  const pctEl  = document.getElementById('loadPct');
  const taskEl = document.getElementById('loadTask');
  const setProgress = (done, total, label) => {
    try{
      const pct = total>0 ? Math.floor((done/total)*100) : 0;
      if(barEl) barEl.style.width = pct+'%';
      if(pctEl) pctEl.textContent = pct+'%';
      if(taskEl && label) taskEl.textContent = label;
    }catch(_){}
  };
  function dismissLoader(){
    try{ setScene('menu'); }catch(e){ console.warn('setScene failed',e); }
    if(loadEl){ loadEl.classList.add('hide'); setTimeout(()=>{ try{ if(loadEl.parentNode) loadEl.parentNode.removeChild(loadEl); }catch(_){} }, 700); }
  }
  // Hard safety: if anything goes wrong, show the menu within 9 seconds.
  const safetyTimer = setTimeout(dismissLoader, 9000);

  // Critical: hero portraits (so the menu cards render). Audio is non-critical
  // and continues loading in the background after the menu opens.
  const critical = [];
  for(const id of HERO_IDS){
    critical.push({ label:`HERO ${HEROES[id].name.toUpperCase()}`, run: ()=> new Promise((res)=>{
      const img = new Image();
      img.onload = ()=>{ state.heroPortraits[id]=img; res(); };
      img.onerror = ()=>{ state.heroPortraits[id]=img; res(); };
      img.src = HEROES[id].img;
      setTimeout(res, 2500);
    })});
  }
  const background = [];
  for(const id of HERO_IDS){
    background.push(()=> SFX.preload('fire_'+id, `sounds/fire_${id}.mp3`));
    background.push(()=> SFX.preload('q_'+id,    `sounds/q_${id}.mp3`));
  }
  background.push(()=> SFX.preload('dash', 'sounds/dash.mp3'));
  background.push(()=> SFX.preload('hit',  'sounds/hit.mp3'));
  background.push(()=> SFX.preload('hurt', 'sounds/hurt.mp3'));
  background.push(()=> SFX.preload('collect', 'sounds/collect.mp3'));
  background.push(()=> SFX.preload('music_god', 'sounds/god.mp3'));
  for(let i=1;i<=10;i++){
    background.push(()=> SFX.preload('music_boss'+i, `sounds/boss${i}.mp3`));
  }
  ['intro_roar', ...BOSS_SKILLS_LIST].forEach(name=>{
    background.push(()=> SFX.preload('bs_'+name, `sounds/boss_${name}.mp3`));
  });

  // Run critical loads with progress, but cap the wait at 3s so the player
  // is never stuck on the loader (e.g. one slow image won't hold the menu).
  try {
    let done = 0;
    const total = critical.length;
    setProgress(0, total, 'LOADING ASSETS…');
    const criticalPromise = Promise.all(critical.map(t => t.run().then(()=>{
      done++; setProgress(done, total, t.label);
    })));
    const timeoutPromise = new Promise(res => setTimeout(res, 3000));
    await Promise.race([criticalPromise, timeoutPromise]);
    setProgress(total, total, 'READY');
  } catch(err){
    console.error('bootPreload critical error:', err);
  }
  clearTimeout(safetyTimer);
  // Pre-warm menu and leaderboard music BEFORE showing the menu so the first
  // playback is instant and has no decode stutter.
  try { SFX.prewarmMusic('bgm_menu', 'leaderboard'); } catch(_){}
  dismissLoader();
  refreshSPDisplay();

  // Kick off background audio preload after the menu is visible.
  for(const task of background){ try { task(); } catch(_){} }
}
bootPreload();

window.addEventListener('beforeunload', ()=>{ if(activeRoom){ try{ activeRoom.leave(); }catch(e){} } });
// Keep SP badge in sync when connectivity changes
window.addEventListener('online',  ()=>{ refreshSPDisplay(); });
window.addEventListener('offline', ()=>{ refreshSPDisplay(); });
