// CORGI CAFE SIMULATOR — 9 Claude Ln, 24/7.
// Unofficial fan parody. Menu prices are real; everything else is a joke.
import * as THREE from '../vendor/three.module.min.js?v=24';
import { drawCorgi } from './textures.js?v=24';
import { PHRASES, HANDLE_RE, fetchNotes, pinNote } from './wall.js?v=24';
import { buildCafe, ROOM } from './world.js?v=24';
import { buildPeople, animatePeople, DIALOGUE, say } from './people.js?v=24';
import { MENU, ADDONS, priceOf, rollHelloWorld } from './menu.js?v=24';
import {
  FUNDS, positions as etfPositions, tick as etfTick, buy as etfBuy,
  investedIn, liveValue, pctChange, settle as etfSettle, capTonight, drawTicker,
} from './etf.js?v=24';

const CFG = {
  MIN_PER_SEC: 0.85,      // in-game minutes per real second
  START_MIN: 2 * 60 + 47, // 2:47 AM
  END_MIN: 6 * 60,        // 6:00 AM
  SHIP_BASE: 0.68,        // % per second at neutral stats
  FOC_DRAIN: 1.55,        // focus/sec while coding
  FOC_REGEN: 0.9,         // focus/sec while up and about
  CAF_DECAY: 1.15,
  JITTER_AT: 86,
  SPEED: 3.05,
  SPRINT: 1.62,
  EYE: 1.62,
  RADIUS: 0.26,
};

const S = {
  running: false, over: false,
  min: CFG.START_MIN,
  ship: 0, focus: 70, caf: 0, cash: 40,
  seated: null, mode: 'play',        // play | dialogue | order | celebrate | end
  celebrate: false, confetti: null, confettiT: 0,
  policy: null,                       // {premium, claimsLeft, claims, paidOut, claimTimes}
  sipping: null,                      // {caf, foc, dur, t} — the cup in your hand
  quick: false,                       // EXPRESS shift: sim runs at 2×
  lockin: false,                      // the 5am mood shift, fired once
  wallToasts: null,                   // game-minute marks for wall-note toasts
  trudyVisitAt: 0, trudyPhase: 0, trudyIgnoreT: 0,
  buffs: [],                          // {id,name,t,bad}
  ach: new Set(),
  stats: { drinks: 0, food: 0, spent: 0, peakCaf: 0, met: new Set(), followers: 0, receipt: [], commits: 0 },
  commitT: 2.2,
  pending: null,                      // order in progress
  etfSettle: null,                    // set at 6:00, read by the receipt
  etfOpened: false, etfChecked: -99,  // first-open toast; last position check
  etfHinted: false,                   // the one nudge toward the far wall
  eventT: 22,
  trudyT: 62,                         // game-minutes until Trudy comes down
};

/* ------------------------------------------------------------- three -- */
const app = document.getElementById('app');
// No AA — the whole point is hard pixel edges.
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;
app.appendChild(renderer.domElement);

// The scene renders into a small buffer and gets scaled up by the browser with
// nearest-neighbour, which is what gives everything its chunky pixel edges.
const PIXEL_HEIGHT = 400;
function sizeRenderer() {
  const aspect = Math.max(0.4, innerWidth / Math.max(1, innerHeight));
  const h = PIXEL_HEIGHT;
  const w = Math.max(160, Math.round(h * aspect));
  renderer.setSize(w, h, false);      // false: leave the CSS size alone
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f18);
scene.fog = new THREE.Fog(0x141019, 22, 62);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 200);
sizeRenderer();
const world = buildCafe(scene);
const people = buildPeople(scene, world);

// the terminal's feed — a little canvas the frame loop redraws every couple
// of seconds. alive on the title screen too; the market does not wait for you.
const etfCv = document.createElement('canvas');
etfCv.width = 256; etfCv.height = 160;
drawTicker(etfCv);
const etfTex = new THREE.CanvasTexture(etfCv);
etfTex.colorSpace = THREE.SRGBColorSpace;
world.etfScreen.material.map = etfTex;
world.etfScreen.material.color.set(0xffffff);
world.etfScreen.material.needsUpdate = true;

addEventListener('resize', sizeRenderer);

// Your table. If you've shipped from one of these, your mark is on it —
// visible only to whoever sits close enough to read a tabletop.
(function tableScratch() {
  try {
    const t = JSON.parse(localStorage.getItem('ccs_table') || 'null');
    if (!t) return;
    const h = localStorage.getItem('ccs_handle');
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = 'italic 600 21px Segoe UI, system-ui, sans-serif';
    g.fillStyle = 'rgba(96,70,42,0.9)';
    g.textAlign = 'center';
    g.fillText((h ? '@' + h : 'you') + ' was here', 128, 40);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.11),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = 0.28;
    m.position.set(t.x + 0.18, 0.787, t.z + 0.17);
    scene.add(m);
  } catch { /* no table, no mark */ }
})();

/* ------------------------------------------------------------ player -- */
const P = {
  pos: new THREE.Vector3(1.4, CFG.EYE, 5.4),
  vel: new THREE.Vector3(),
  yaw: -Math.PI / 2, pitch: -0.04,
  bob: 0, sway: 0,
};

const keys = {};
// Map by physical position (e.code) AND typed letter (e.key), so WASD works on
// QWERTY, AZERTY, Dvorak, Colemak, and remapped keyboards alike.
const KEY_ALIAS = {
  w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD',
  e: 'KeyE', m: 'KeyM', shift: 'ShiftLeft',
};
function keyCodes(e) {
  const out = [];
  if (e.code) out.push(e.code);
  const alias = KEY_ALIAS[(e.key || '').toLowerCase()];
  if (alias && !out.includes(alias)) out.push(alias);
  return out;
}
function typingInField(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' ||
    t.tagName === 'SELECT' || t.isContentEditable);
}
addEventListener('keydown', e => {
  // typing in a form field (the pin handle, mainly) — the game keeps its
  // hands off so the letter E can just be the letter E
  if (typingInField(e)) return;
  const codes = keyCodes(e);
  for (const c of codes) keys[c] = true;
  if (codes.includes('KeyE') || e.code === 'Space') { e.preventDefault(); onAction(); }
  if (codes.includes('KeyM')) toggleAudio();
  if (e.code === 'Escape' && S.mode === 'order') closeOrder();
  if (e.code === 'Escape' && S.mode === 'wall') closeWall();
  if (e.code === 'Escape' && S.mode === 'etf') closeEtf();
  if (e.code === 'Escape' && S.mode === 'rsi') closeRsi();
});
addEventListener('keyup', e => { for (const c of keyCodes(e)) keys[c] = false; });
// a stuck key across a focus change is worse than a dropped one
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

let locked = false, dragging = false, dragX = 0, dragY = 0;
const cv = renderer.domElement;

cv.addEventListener('mousedown', e => {
  if (!S.running || (S.mode !== 'play' && S.mode !== 'walkout') || isTouch) return;
  // pointer lock is the good path, but it's blocked in embedded frames —
  // fall back to click-drag so looking around always works.
  if (!locked && cv.requestPointerLock) {
    const r = cv.requestPointerLock();
    if (r && r.catch) r.catch(() => {});
  }
  dragging = true; dragX = e.clientX; dragY = e.clientY;
});
addEventListener('mouseup', () => { dragging = false; });
addEventListener('blur', () => { dragging = false; });

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === cv;
  if (locked) dragging = false;
});
document.addEventListener('pointerlockerror', () => { locked = false; });

document.addEventListener('mousemove', e => {
  if (!S.running || (S.mode !== 'play' && S.mode !== 'celebrate' && S.mode !== 'walkout')) return;
  let dx = 0, dy = 0;
  if (locked) { dx = e.movementX; dy = e.movementY; }
  else if (dragging) { dx = e.clientX - dragX; dy = e.clientY - dragY; dragX = e.clientX; dragY = e.clientY; }
  else return;
  P.yaw -= dx * 0.0024;
  P.pitch -= dy * 0.0024;
  P.pitch = Math.max(-1.2, Math.min(1.1, P.pitch));
});

/* touch */
const isTouch = matchMedia('(pointer:coarse)').matches;
const touchUI = document.getElementById('touch');
let stickVec = { x: 0, y: 0 };
if (isTouch) {
  touchUI.style.display = 'block';
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  let sid = null, sc = { x: 0, y: 0 };
  const R = 52;
  stick.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; sid = t.identifier;
    const r = stick.getBoundingClientRect();
    sc = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    e.preventDefault();
  }, { passive: false });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === sid) {
        let dx = t.clientX - sc.x, dy = t.clientY - sc.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / R);
        stickVec = { x: (dx / d) * k, y: (dy / d) * k };
        knob.style.transform = `translate(${stickVec.x * R}px,${stickVec.y * R}px)`;
      }
    }
  }, { passive: false });
  addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === sid) { sid = null; stickVec = { x: 0, y: 0 }; knob.style.transform = ''; }
    }
  });
  // look drag on the right half
  let lid = null, lx = 0, ly = 0;
  renderer.domElement.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    if (t.clientX > innerWidth * 0.34) { lid = t.identifier; lx = t.clientX; ly = t.clientY; }
  }, { passive: true });
  renderer.domElement.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === lid) {
        P.yaw -= (t.clientX - lx) * 0.0055;
        P.pitch -= (t.clientY - ly) * 0.0045;
        P.pitch = Math.max(-1.2, Math.min(1.1, P.pitch));
        lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: true });
  renderer.domElement.addEventListener('touchend', e => {
    for (const t of e.changedTouches) if (t.identifier === lid) lid = null;
  });
  const act = document.getElementById('tact');
  act.addEventListener('touchstart', e => { e.preventDefault(); onAction(); }, { passive: false });
}

/* ------------------------------------------------------------ audio --- */
let AC = null, audioOn = true, masterGain = null;
function initAudio() {
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  masterGain = AC.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(AC.destination);

  // room tone: filtered noise
  const len = AC.sampleRate * 3;
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const dch = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    dch[i] = last * 3.2;
  }
  const src = AC.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lp = AC.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 420;
  const g = AC.createGain(); g.gain.value = 0.34;
  src.connect(lp); lp.connect(g); g.connect(masterGain);
  src.start();
}
function blip(freq, dur = 0.06, type = 'square', vol = 0.06) {
  if (!AC || !audioOn) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
  o.connect(g); g.connect(masterGain);
  o.start(); o.stop(AC.currentTime + dur);
}
function hiss(dur = 0.7, vol = 0.1) {
  if (!AC || !audioOn) return;
  const len = AC.sampleRate * dur;
  const b = AC.createBuffer(1, len, AC.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = AC.createBufferSource(); s.buffer = b;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.9;
  const g = AC.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(masterGain);
  s.start();
}
function toggleAudio() {
  audioOn = !audioOn;
  if (masterGain) masterGain.gain.value = audioOn ? 0.5 : 0;
  toast(audioOn ? 'sound on' : 'sound off');
}

/* ------------------------------------------------------- the house music -- */
// A cozy procedural lofi loop — warm chords, lazy bass, sparse plucks,
// vinyl crackle. No audio files; it's all synthesized on the fly.
let musicBus = null, musicTimer = null, musicStep = 0, musicNext = 0;
let musicSparse = false;
function musicSetSparse(v) { musicSparse = v; }
const CHORDS = [
  [174.61, 220.0, 261.63, 329.63],   // Fmaj7
  [146.83, 174.61, 220.0, 261.63],   // Dm7
  [116.54, 146.83, 174.61, 220.0],   // Bbmaj7
  [130.81, 164.81, 196.0, 233.08],   // C7
];
const PENTA = [349.23, 392.0, 440.0, 523.25, 587.33, 698.46];

function mnote(freq, t, dur, type, vol, filt) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  if (filt) { g.connect(filt); } else { g.connect(musicBus); }
  o.start(t); o.stop(t + dur + 0.05);
}

function startMusic() {
  if (!AC || musicTimer) return;
  musicBus = AC.createGain();
  musicBus.gain.value = 0.55;
  const lp = AC.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4;
  musicBus.connect(lp); lp.connect(masterGain);

  // vinyl crackle bed
  const len = AC.sampleRate * 2;
  const cb = AC.createBuffer(1, len, AC.sampleRate);
  const ch = cb.getChannelData(0);
  for (let i = 0; i < len; i++) {
    ch[i] = Math.random() < 0.0007 ? (Math.random() * 2 - 1) * 0.5 : 0;
  }
  const crack = AC.createBufferSource();
  crack.buffer = cb; crack.loop = true;
  const cg = AC.createGain(); cg.gain.value = 0.16;
  crack.connect(cg); cg.connect(musicBus);
  crack.start();

  const EIGHTH = 60 / 76 / 2;          // 76 bpm
  musicNext = AC.currentTime + 0.1;
  musicStep = 0;

  musicTimer = setInterval(() => {
    if (!AC) return;
    // if the tab was backgrounded/frozen, skip ahead — never backfill missed
    // notes, or returning to the tab plays them all at once and janks the frame
    if (musicNext < AC.currentTime) {
      musicStep += Math.ceil((AC.currentTime - musicNext) / EIGHTH);
      musicNext = AC.currentTime + 0.08;
    }
    while (musicNext < AC.currentTime + 0.5) {
      const t = musicNext + (musicStep % 2 === 1 ? 0.055 : 0); // swing
      const bar = Math.floor(musicStep / 8) % 4;
      const chord = CHORDS[bar];
      const inBar = musicStep % 8;

      if (inBar === 0) {
        // pad — thinner after the 5am lock-in
        for (const f of chord) mnote(f, t, EIGHTH * 7.6, 'triangle', musicSparse ? 0.028 : 0.05);
        // bass an octave down
        mnote(chord[0] / 2, t, EIGHTH * 3.4, 'sine', 0.16);
      }
      if (inBar === 4) mnote(chord[0] / 2, t, EIGHTH * 2.6, 'sine', 0.12);
      // brush tick on 2 and 4
      if (inBar === 2 || inBar === 6) {
        const n = AC.createBufferSource();
        const nb = AC.createBuffer(1, AC.sampleRate * 0.05, AC.sampleRate);
        const nd = nb.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
        n.buffer = nb;
        const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5200;
        const ng = AC.createGain(); ng.gain.value = 0.05;
        n.connect(f); f.connect(ng); ng.connect(musicBus);
        n.start(t);
      }
      // sparse pentatonic pluck — rarer still once the room locks in
      if (Math.random() < (musicSparse ? 0.06 : 0.24) && inBar !== 0) {
        mnote(PENTA[(Math.random() * PENTA.length) | 0], t, EIGHTH * 1.7, 'triangle', 0.065);
      }
      musicNext += EIGHTH;
      musicStep++;
    }
  }, 180);
}

/* --------------------------------------------------------------- UI --- */
const el = id => document.getElementById(id);
const promptEl = el('prompt'), toastsEl = el('toasts');

function toast(msg, ms = 2600) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.innerHTML = msg;
  toastsEl.appendChild(d);
  setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 420); }, ms);
}

function fmtClock(m) {
  m = Math.floor(m) % 1440;
  let h = Math.floor(m / 60), mm = m % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}:${String(mm).padStart(2, '0')}<span style="font-size:15px"> ${ap}</span>`;
}

function updateHUD() {
  el('clock').innerHTML = fmtClock(S.min) + '<div id="clocksub">' +
    (S.mode === 'rsi' ? 'PAUSED · INSIDE ANOTHER SIMULATION' : '9 CLAUDE LN · OPEN 24/7') + '</div>';
  el('cash').innerHTML = '$' + S.cash.toFixed(2) + '<div id="cashsub">ON THE CARD</div>';
  el('shipv').textContent = S.ship.toFixed(0) + '%';
  el('focv').textContent = Math.round(S.focus) + (S.sipping && S.sipping.foc > 1 ? ' ▲' : '');
  el('cafv').textContent = Math.round(S.caf) + (S.sipping && S.sipping.caf > 1 ? ' ▲' : '');
  el('shipbar').firstElementChild.style.width = S.ship + '%';
  el('focbar').firstElementChild.style.width = S.focus + '%';
  el('cafbar').firstElementChild.style.width = S.caf + '%';
  const b = el('buffs');
  // the drink pipeline shows up alongside the buffs so it's never a mystery
  let extra = '';
  if (S.pending) extra += `<div class="buff brew">☕ BREWING ${Math.ceil(S.pending.t)}s</div>`;
  if (S.sipping) extra += `<div class="buff brew">SIPPING ${Math.ceil(S.sipping.t)}s</div>`;
  b.innerHTML = extra + S.buffs.map(x =>
    `<div class="buff${x.bad ? ' bad' : ''}">${x.name}${x.t != null ? ' ' + Math.ceil(x.t) + 's' : ''}</div>`
  ).join('');
}

function addBuff(id, name, t, bad) {
  const ex = S.buffs.find(b => b.id === id);
  if (ex) { ex.t = t; return; }
  S.buffs.push({ id, name, t, bad });
}
const hasBuff = id => S.buffs.some(b => b.id === id);
const dropBuff = id => { S.buffs = S.buffs.filter(b => b.id !== id); };

// every achievement in the game — the title screen keeps count across runs
const ACH_ALL = [
  'SHIPPED', 'SAW THE SUNRISE', 'THERE ARE NO CORGIS', 'PET THE DOG',
  'GNOSIS', 'TOUCHED GRASS', 'FULLY INSURED',
  'TOOK THE MEETING', 'THE MOAT IS VIBES', 'HEARD THE THESIS', 'HELLO WORLD',
  '$14 BREAKFAST', 'THE PENTAGON', 'WIRED IN', 'ORDERED FOR THE TABLE',
  'CREATINE', 'LOSS RATIO', 'MORAL HAZARD', 'PREFERRED RISK',
  'WENT LONG', 'LEVERAGED', 'VOLATILITY DRAG', 'FULLY BUFFERED', 'HIT THE CAP',
  'RECURSION',
];
function achEarned() {
  try { return new Set(JSON.parse(localStorage.getItem('ccs_ach') || '[]')); }
  catch { return new Set(); }
}
function renderAchBar() {
  const bar = el('achbar');
  if (!bar) return;
  const got = achEarned();
  const n = ACH_ALL.filter(a => got.has(a)).length;
  bar.textContent = n ? `PROOF COLLECTED: ${n}/${ACH_ALL.length}` : '';
}

function ach(id) {
  if (S.ach.has(id)) return;
  S.ach.add(id);
  try {
    const got = achEarned();
    got.add(id);
    localStorage.setItem('ccs_ach', JSON.stringify([...got]));
  } catch { /* private mode keeps no trophies */ }
  toast('★ ' + id);
  blip(880, 0.09, 'triangle', 0.05);
  setTimeout(() => blip(1320, 0.12, 'triangle', 0.045), 90);
}

/* --------------------------------------------------------- dialogue --- */
const dlg = el('dlg');
let dstate = null;

function openDialogue(npc, lines, choice, onChoice) {
  S.mode = 'dialogue';
  document.exitPointerLock?.();
  dstate = { npc, lines: lines.slice(), i: 0, choice, onChoice };
  dlg.style.display = 'block';
  el('dlgname').innerHTML = `${npc.member || npc.name} <span>${npc.member ? 'gtm' : npc.sub}</span>`;
  showLine();
}
function showLine() {
  const d = dstate;
  if (!d) return;
  if (d.i < d.lines.length) {
    el('dlgtext').textContent = d.lines[d.i];
    el('dlgchoices').innerHTML = '';
    el('dlghint').style.display = 'block';
    blip(320 + Math.random() * 60, 0.03, 'square', 0.028);
  } else if (d.choice) {
    el('dlgtext').textContent = d.choice.prompt;
    el('dlghint').style.display = 'none';
    const c = el('dlgchoices');
    c.innerHTML = '';
    d.choice.options.forEach(o => {
      const b = document.createElement('button');
      b.className = 'btn' + (o.tag === 'decline' || o.tag === 'no' || o.tag === 'grass' ? ' ghost' : '');
      b.textContent = o.label;
      b.onclick = (ev) => { ev.stopPropagation(); const cb = d.onChoice; closeDialogue(); cb && cb(o.tag); };
      c.appendChild(b);
    });
  } else {
    closeDialogue();
  }
}
function advanceDialogue() {
  if (!dstate) return;
  if (dstate.i < dstate.lines.length) { dstate.i++; showLine(); }
  else if (!dstate.choice) closeDialogue();
}
function closeDialogue() {
  dlg.style.display = 'none';
  dstate = null;
  if (!S.over) S.mode = S.seated ? 'play' : 'play';
}
dlg.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') advanceDialogue(); });

/* ------------------------------------------------------------ order --- */
let cart = [], selAddons = new Set();

function addToCart(item, large) {
  const line = cart.find(l => l.item === item && l.large === large);
  if (line) line.qty++;
  else cart.push({ item, large, qty: 1 });
  renderCart();
  blip(560, 0.04, 'triangle', 0.03);
}

function buildMenuUI() {
  const w = el('menuwrap');
  w.innerHTML = '';
  MENU.forEach(sec => {
    const d = document.createElement('div');
    d.className = 'sec';
    d.innerHTML = `<h3>${sec.name.toUpperCase()}</h3>`;
    sec.items.forEach(it => {
      const r = document.createElement('div');
      r.className = 'item';
      const pr = it.hi ? `$${it.price.toFixed(2)}–${it.hi.toFixed(2)}` : `$${it.price.toFixed(2)}`;
      r.innerHTML =
        `<span class="nm">${it.name}${it.tag ? ` <span class="tg">· ${it.tag}</span>` : ''}</span>` +
        `<span class="pr">${pr}</span>` +
        `<button class="add" data-l="0">ADD</button>` +
        (it.hi ? `<button class="add" data-l="1">+ LG</button>` : '');
      r.querySelectorAll('.add').forEach(b => {
        b.onclick = (e) => { e.stopPropagation(); addToCart(it, b.dataset.l === '1'); };
      });
      r.onclick = () => addToCart(it, false);
      d.appendChild(r);
    });
    w.appendChild(d);
  });
  const ad = document.createElement('div');
  ad.className = 'sec';
  ad.id = 'addonsec';
  w.appendChild(ad);
  renderAddons();
}

function renderAddons() {
  const ad = el('addonsec');
  if (!ad) return;
  let html = '<h3>ADD-ONS <span style="opacity:.45;letter-spacing:1px">· applied to the whole order</span></h3><div class="addons">';
  ADDONS.forEach(a => {
    html += `<div class="chip${selAddons.has(a.id) ? ' on' : ''}" data-add="${a.id}">${a.name} +$${a.price.toFixed(2)}</div>`;
  });
  html += '</div>';
  ad.innerHTML = html;
  ad.querySelectorAll('.chip').forEach(c => {
    c.onclick = () => {
      const id = c.dataset.add;
      selAddons.has(id) ? selAddons.delete(id) : selAddons.add(id);
      renderAddons(); renderCart();
    };
  });
}

// yc alumni really do get 20% off. verification is vibes-based here too.
let ycAlum = false;
function orderRaw() {
  let t = 0;
  cart.forEach(l => { t += priceOf(l.item, l.large) * l.qty; });
  ADDONS.forEach(a => { if (selAddons.has(a.id)) t += a.price; });
  return t;
}
function orderTotal() { return orderRaw() * (ycAlum ? 0.8 : 1); }

function renderCart() {
  const list = el('cartlist');
  if (!cart.length && !selAddons.size) {
    list.innerHTML = '<span class="empty">tap items to build your order</span>';
  } else {
    list.innerHTML = cart.map((l, i) =>
      `<span class="cartchip">${l.qty > 1 ? l.qty + '× ' : ''}${l.item.name}${l.large ? ' (LG)' : ''}` +
      ` <b>$${(priceOf(l.item, l.large) * l.qty).toFixed(2)}</b><i data-i="${i}">✕</i></span>`
    ).join('') + ADDONS.filter(a => selAddons.has(a.id)).map(a =>
      `<span class="cartchip">+ ${a.name} <b>$${a.price.toFixed(2)}</b></span>`
    ).join('');
    list.querySelectorAll('i[data-i]').forEach(x => {
      x.onclick = () => {
        const i = +x.dataset.i;
        if (cart[i].qty > 1) cart[i].qty--; else cart.splice(i, 1);
        renderCart();
      };
    });
  }
  const t = orderTotal();
  el('ordertotal').innerHTML = '$' + t.toFixed(2) +
    (t > S.cash ? ' <span style="color:#ff6b5c">over budget</span>' : ' <span>TOTAL</span>');
}

function openOrder() {
  S.mode = 'order';
  document.exitPointerLock?.();
  cart = []; selAddons.clear();
  buildMenuUI(); renderCart();
  el('ycchip').classList.toggle('on', ycAlum);
  el('order').classList.add('on');
}
el('ycchip').onclick = () => {
  ycAlum = !ycAlum;
  el('ycchip').classList.toggle('on', ycAlum);
  if (ycAlum && !S.ycToasted) {
    S.ycToasted = true;
    toast('alum rate applied. we verify nothing. the vibes are the kyc.');
  }
  renderCart();
};
function closeOrder() {
  el('order').classList.remove('on');
  if (!S.over) S.mode = 'play';
}
el('ordercancel').onclick = closeOrder;
el('ordergo').onclick = () => {
  if (!cart.length) { toast('pick something. nico is watching.'); return; }
  const total = orderTotal();
  if (total > S.cash) { toast('declined. (the card, not you.)'); blip(140, 0.2, 'sawtooth', 0.05); return; }
  S.cash -= total;
  S.stats.spent += total;

  const addons = ADDONS.filter(a => selAddons.has(a.id));
  const lines = [];
  let prep = 0, units = 0;
  for (const l of cart) {
    S.stats.receipt.push({
      n: l.item.name + (l.large && l.item.hi ? ' (LG)' : ''),
      p: priceOf(l.item, l.large) * l.qty, q: l.qty,
    });
    for (let n = 0; n < l.qty; n++) {
      let served = l.item;
      if (l.item.special === 'random') {
        ach('HELLO WORLD');
        const roll = rollHelloWorld();
        served = { ...roll, name: 'Hello World → ' + roll.name };
      }
      lines.push({ served, base: l.item, large: l.large && !!l.item.hi });
      prep = Math.max(prep, (l.item.prep ?? 5) * (l.large ? 1.15 : 1));
      units++;
      if (l.item.protein) ach('$14 BREAKFAST');
      if (l.item.name === 'The Pentagon') ach('THE PENTAGON');
    }
  }
  addons.forEach(a => S.stats.receipt.push({ n: a.name, p: a.price, q: 1 }));
  if (ycAlum) S.stats.receipt.push({ n: 'YC ALUM −20%', p: -(orderRaw() * 0.2), q: 1 });
  if (units >= 4) ach('ORDERED FOR THE TABLE');
  // one barista, several drinks
  prep += Math.max(0, units - 1) * 1.6;

  S.pending = { lines, addons, t: prep, units };
  closeOrder();
  if (prep <= 0.1) deliver();
  else {
    toast(units > 1
      ? `nico starts your <b>${units} items</b>`
      : `nico starts your <b>${lines[0].served.name}</b>${lines[0].large ? ' (large)' : ''}`);
    hiss(0.9, 0.09);
    say(people.nico, units > 2 ? 'all of it? ok. give me a minute.' : prep > 7 ? 'blender. sorry. everyone, sorry.' : 'on it.', 3);
  }
};

/* ----------------------------------------------------- the terminal --- */
function renderEtf() {
  const sec = (title, funds, note) => `
    <div class="sec"><h3>${title}</h3>
      ${funds.map(f => {
        const c = pctChange(f);
        return `<div class="item">
          <span class="nm"><b>${f.tk}</b> <span class="tg">${f.name} · ${(f.er * 100).toFixed(2)}%${f.type === 'buf' ? '*' : ''}</span></span>
          <span class="fret ${c >= 0 ? 'up' : 'dn'}">${c >= 0 ? '+' : ''}${c.toFixed(2)}%</span>
          <button class="fbuy" data-f="${f.id}" data-a="5">$5</button>
          <button class="fbuy" data-f="${f.id}" data-a="10">$10</button>
          <button class="fbuy" data-f="${f.id}" data-a="20">$20</button>
        </div>`;
      }).join('')}
      ${note ? `<div class="fnote">${note}</div>` : ''}
    </div>`;
  const lev = FUNDS.filter(f => f.type === 'lev');
  const buf = FUNDS.filter(f => f.type === 'buf');
  let pos = '';
  if (etfPositions.length) {
    pos = `<div class="sec"><h3>YOUR POSITIONS</h3>` +
      etfPositions.map(p => {
        const f = FUNDS.find(x => x.id === p.fid);
        const v = liveValue(p), d = v - p.amt;
        return `<div class="item">
          <span class="nm"><b>${f.tk}</b> <span class="tg">$${p.amt.toFixed(2)} in</span></span>
          <span class="fret ${d >= 0 ? 'up' : 'dn'}">$${v.toFixed(2)}</span></div>`;
      }).join('') +
      `<div class="fnote">locked until the 6:00 AM settlement. liquidity is a distraction.</div></div>`;
  }
  el('etfwrap').innerHTML =
    sec('LEVERAGED — 2x DAILY', lev, 'daily reset. resets you too.') +
    sec('BUFFERED — JULY SERIES', buf,
      `absorbs the first 10–15% of losses. tonight it will absorb approximately nothing. ` +
      `max upside by 6:00 AM: about $${(capTonight(buf[2]) * 20).toFixed(2)} on $20. ` +
      `outcome period: jul 1, 2026 – jun 30, 2027. you have until 6:00. ` +
      `*0.40% unitary fee, 0.10% contractually waived. the asterisk is load-bearing.`) +
    pos;
  el('etfcash').innerHTML = '$' + S.cash.toFixed(2) + ' <span>ON THE CARD</span>';
  el('etfwrap').querySelectorAll('.fbuy').forEach(b => {
    if (+b.dataset.a > S.cash) b.disabled = true;
    b.onclick = () => buyEtf(b.dataset.f, +b.dataset.a);
  });
}

function buyEtf(fid, amt) {
  const r = etfBuy(fid, amt, S.cash, S.min);
  if (!r.ok) { toast(r.msg); blip(140, 0.2, 'sawtooth', 0.05); return; }
  S.cash -= amt;
  ach('WENT LONG');
  if (r.f.type === 'lev' && investedIn(fid) >= 30) ach('LEVERAGED');
  toast(`filled: <b>$${amt} → ${r.f.tk}</b>. settles at 6:00 AM.` +
    (r.f.caff ? ' this one can feel you drinking.' : ''));
  blip(880, 0.06, 'triangle', 0.04);
  renderEtf();
}

function openEtf() {
  S.mode = 'etf';
  document.exitPointerLock?.();
  S.min = Math.min(S.min + 2, CFG.END_MIN - 0.1);   // checking is never free
  if (!S.etfOpened) {
    S.etfOpened = true;
    toast('it is 3am. the market is closed. the terminal does not care.');
  }
  // looking at your own p&l does something to you, but not every two minutes
  if (etfPositions.length && S.min - S.etfChecked >= 5) {
    S.etfChecked = S.min;
    const inSum = etfPositions.reduce((s, p) => s + p.amt, 0);
    const now = etfPositions.reduce((s, p) => s + liveValue(p), 0);
    const r = (now - inSum) / inSum;
    if (r >= 0.004) { S.focus = Math.min(100, S.focus + 4); toast("portfolio's green. weirdly, so is your focus."); }
    else if (r <= -0.004) { S.focus = Math.max(0, S.focus - 6); toast('you checked. it cost more than the fee.'); }
  }
  renderEtf();
  el('etf').classList.add('on');
}
function closeEtf() {
  el('etf').classList.remove('on');
  if (!S.over) S.mode = 'play';
}
el('etfclose').onclick = closeEtf;

/* -------------------------------------------------- the old machine --- */
// someone else's simulator, running in the corner. the shift clock stops
// entirely while you're inside — recursion gets one courtesy.
const RSI_URL = 'https://www.paradigm.xyz/research/rsi/game';
function openRsi() {
  S.mode = 'rsi';
  document.exitPointerLock?.();
  P.pos.set(2.6, 1.22, 1.32); P.yaw = 0; P.pitch = -0.12;
  const f = el('rsiframe');
  if (!f.src) f.src = RSI_URL;   // their servers, their game — loaded only when you sit
  ach('RECURSION');
  if (!S.rsiToasted) {
    S.rsiToasted = true;
    toast('the clock stops. you are in someone else\'s simulation now.');
  }
  el('rsi').classList.add('on');
}
function closeRsi() {
  el('rsi').classList.remove('on');
  P.pos.y = CFG.EYE; P.pos.z = 1.55;
  if (!S.over) S.mode = 'play';
}
el('rsiclose').onclick = closeRsi;

function deliver() {
  const o = S.pending; if (!o) return;
  S.pending = null;
  let caf = 0, foc = 0;

  for (const l of o.lines) {
    let c = l.served.caf ?? 0, f = l.served.foc ?? 0;
    if (l.large) { c *= 1.3; f *= 1.2; }
    caf += c; foc += f;
    if (l.served.ship) S.ship = Math.min(100, S.ship + l.served.ship);
    if (l.base.kind === 'food') S.stats.food++; else S.stats.drinks++;
    if (l.base.special === 'shield') addBuff('shield', 'SECURED', null);
    if (l.base.special === 'reset') { dropBuff('jitters'); S.caf = Math.min(S.caf, 70); toast('the jitters are gone. so is your edge, slightly.'); }
    if (l.base.special === 'expense') { S.cash += priceOf(l.base, l.large) * 0.5; toast('expensed. half back. this is what infrastructure feels like.'); }
    if (l.base.protein) { addBuff('protein', 'PROTEIN', 60); S.stats.protein = (S.stats.protein || 0) + l.base.protein; }
  }
  o.addons.forEach(a => { caf += a.caf; foc += a.foc; });
  if (o.addons.some(a => a.id === 'creatine')) { S.stats.creatine = true; ach('CREATINE'); }

  // the cafe keeps a quiet tab of what you order, across every visit
  try {
    const oh = JSON.parse(localStorage.getItem('ccs_orders') || '{}');
    for (const l of o.lines) oh[l.base.name] = (oh[l.base.name] || 0) + 1;
    localStorage.setItem('ccs_orders', JSON.stringify(oh));
  } catch { /* incognito regulars stay strangers */ }

  // First sip hits immediately; the rest lands over the next several seconds
  // while the caffeine bar visibly climbs. No more invisible stat teleports.
  S.caf = Math.min(100, S.caf + caf * 0.3);
  S.focus = Math.min(100, S.focus + foc * 0.3);
  if (caf * 0.7 + foc * 0.7 > 0.5) {
    S.sipping = { caf: caf * 0.7, foc: foc * 0.7, dur: 7, t: 7 };
  }
  if (S.caf >= 100) ach('WIRED IN');

  const gains = [];
  if (caf >= 1) gains.push(`+${Math.round(caf)} caffeine`);
  if (foc >= 1) gains.push(`+${Math.round(foc)} focus`);
  const gainNote = gains.length ? ` <b>${gains.join(', ')}</b> as you drink.` : '';
  toast((o.lines.length > 1
    ? `order up: <b>${o.lines.length} items</b>. you are carrying a tray now.`
    : `order up: <b>${o.lines[0].served.name}</b>.`) + gainNote);
  blip(660, 0.08, 'triangle', 0.05);
  setTimeout(() => blip(990, 0.1, 'triangle', 0.04), 80);
}

/* ------------------------------------------------------- text overlay -- */
// Names and speech bubbles render as DOM at full resolution, projected over
// the pixelated canvas — the world is chunky, the words never are.
const labelLayer = el('labels');
const overlayNodes = new Map();   // key -> {div, kind}
const _pv = new THREE.Vector3();

function overlayNode(key, kind) {
  let n = overlayNodes.get(key);
  if (!n) {
    const div = document.createElement('div');
    div.className = kind;
    labelLayer.appendChild(div);
    n = { div, kind, used: true };
    overlayNodes.set(key, n);
  }
  n.used = true;
  return n;
}

function projectTo(div, wx, wy, wz, fade) {
  _pv.set(wx, wy, wz).project(camera);
  if (_pv.z > 1 || _pv.z < -1) { div.style.opacity = '0'; return false; }
  const sx = (_pv.x * 0.5 + 0.5) * innerWidth;
  const sy = (-_pv.y * 0.5 + 0.5) * innerHeight;
  if (sx < -260 || sx > innerWidth + 260 || sy < -160 || sy > innerHeight + 160) {
    div.style.opacity = '0'; return false;
  }
  div.style.transform = `translate(-50%,-100%) translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
  div.style.opacity = String(fade);
  return true;
}

function updateOverlay() {
  for (const n of overlayNodes.values()) n.used = false;
  const inWorld = S.running && S.mode !== 'end';

  if (inWorld) {
    people.npcs.forEach((n, ni) => {
      if (n.hidden) return;
      const gx = n.group.position.x, gz = n.group.position.z;
      const d = Math.hypot(P.pos.x - gx, P.pos.z - gz);

      if (n.labelInfo) {
        const range = n.labelRange ?? 12;
        const fade = Math.max(0, Math.min(1, (range - d) / 3));
        if (fade > 0.02) {
          const node = overlayNode('lab:' + ni, 'nlabel');
          node.div.innerHTML =
            `<span class="nm" style="color:${n.labelInfo.color}">${n.labelInfo.name}</span>` +
            `<span class="sb">${n.labelInfo.sub}</span>`;
          projectTo(node.div, gx, n.group.position.y + (n.labelH ?? 2.0), gz, fade * 0.95);
        }
      }
      if (n.bubble && d < 15) {
        const node = overlayNode('bub:' + ni, 'nbubble');
        node.div.textContent = n.bubble.text;
        const h = (n.labelH ?? 2.0) + 0.42;
        projectTo(node.div, gx, n.group.position.y + h, gz, Math.min(1, n.bubble.t / 0.3));
      }
    });
    people.ambient.forEach((a, ai) => {
      const gx = a.group.position.x, gz = a.group.position.z;
      const d = Math.hypot(P.pos.x - gx, P.pos.z - gz);
      // ghost patrons: wall pinners, seated and working, named when you're close
      if (a.labelInfo) {
        const range = a.labelRange ?? 5.5;
        const fade = Math.max(0, Math.min(1, (range - d) / 2));
        if (fade > 0.02) {
          const node = overlayNode('amblab:' + ai, 'nlabel');
          node.div.innerHTML =
            `<span class="nm" style="color:${a.labelInfo.color}">${a.labelInfo.name}</span>` +
            `<span class="sb">${a.labelInfo.sub}</span>`;
          projectTo(node.div, gx, 1.62, gz, fade * 0.9);
        }
      }
      if (!a.bubble) return;
      if (d > 13) return;
      const node = overlayNode('amb:' + ai, 'nbubble');
      node.div.textContent = a.bubble.text;
      projectTo(node.div, gx, 1.78, gz, Math.min(1, a.bubble.t / 0.3) * 0.96);
    });
  }

  for (const [key, n] of overlayNodes) {
    if (!n.used) { n.div.remove(); overlayNodes.delete(key); }
  }
}

/* -------------------------------------------------------- interaction -- */
const tmpV = new THREE.Vector3();

function interactables() {
  const list = [];
  const cp = P.pos;
  const near = (x, z, r) => (cp.x - x) ** 2 + (cp.z - z) ** 2 < r * r;

  // counter: the register ends take orders; nico holds the middle, and
  // talking to him includes ordering — so the two prompts never fight.
  const nearNico = near(20.6, 8.6, 3.1);
  if (!nearNico && near(18.0, 7.7, 2.0)) list.push({ kind: 'order', label: 'ORDER AT THE COUNTER', x: 18.0, z: 8.2 });
  if (!nearNico && near(23.2, 7.7, 2.0)) list.push({ kind: 'order', label: 'ORDER AT THE COUNTER', x: 23.2, z: 8.2 });

  for (const n of people.npcs) {
    if (n.hidden) continue;
    const x = n.group.position.x, z = n.group.position.z;
    const range = n.id === 'nico' ? 3.4 : (n.id === 'trudy' || n.id === 'frogu') ? 1.9 : 2.4;
    if (near(x, z, range)) {
      const nm = n.member || n.name;
      list.push({
        kind: 'npc', npc: n, x, z,
        label: n.id === 'trudy' ? 'PET ' + nm
          : n.id === 'nico' ? 'TALK / ORDER — NICO'
          : 'TALK TO ' + nm,
      });
    }
  }

  // seats
  if (!S.seated) {
    let best = null, bd = 1.9;
    for (const s of world.seats) {
      if (s.taken) continue;
      const d = Math.hypot(s.pos.x - cp.x, s.pos.z - cp.z);
      if (d < bd) { bd = d; best = s; }
    }
    if (best) list.push({ kind: 'sit', seat: best, label: 'SIT DOWN AND WORK', x: best.pos.x, z: best.pos.z });
  } else {
    list.push({ kind: 'stand', label: 'STAND UP', x: cp.x, z: cp.z });
  }

  // poster
  if (near(8.6, 1.1, 2.0)) list.push({ kind: 'poster', label: 'READ THE POSTER', x: 8.6, z: 0.6 });
  // the wall by the door
  if (near(1.3, 2.6, 2.1)) list.push({ kind: 'wall', label: 'READ THE WALL', x: 0.3, z: 2.55 });
  // the terminal, under the tagline on the east wall
  if (near(24.45, 6.3, 1.8)) list.push({ kind: 'etf', label: 'CHECK THE TERMINAL', x: 24.95, z: 6.3 });
  // the old machine in the southwest corner
  if (near(2.6, 1.35, 1.7)) list.push({ kind: 'rsi', label: 'SIT DOWN AT THE OLD MACHINE', x: 2.6, z: 0.7 });

  return list;
}

function bestTarget() {
  const list = interactables();
  if (!list.length) return null;
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  let best = null, bs = -1;
  for (const it of list) {
    if (it.kind === 'stand') return it;
    const dx = it.x - P.pos.x, dz = it.z - P.pos.z;
    const d = Math.hypot(dx, dz) || 0.001;
    const dot = (dx / d) * -fx + (dz / d) * -fz;
    const score = dot * 2 - d * 0.25;
    // if you're practically on top of it, facing doesn't matter
    if ((dot > 0.25 || d < 0.85) && score > bs) { bs = score; best = it; }
  }
  return best;
}

let curTarget = null;

function onAction() {
  if (!S.running) { if (S.mode !== 'end') startGame(); return; }
  if (S.mode === 'dialogue') { advanceDialogue(); return; }
  if (S.mode === 'order' || S.mode === 'etf' || S.mode === 'rsi') return;
  if (S.mode !== 'play') return;
  const t = curTarget;
  if (!t) return;

  if (t.kind === 'order') { openOrder(); return; }
  if (t.kind === 'etf') { openEtf(); return; }
  if (t.kind === 'rsi') { openRsi(); return; }
  if (t.kind === 'sit') {
    t.seat.taken = true;
    S.seated = t.seat;
    S.lastSeat = t.seat;
    P.pos.set(t.seat.pos.x, 1.22, t.seat.pos.z);
    P.yaw = t.seat.yaw + Math.PI;
    toast('you are working. focus burns. coffee helps.');
    return;
  }
  if (t.kind === 'stand') {
    S.seated.taken = false;
    S.seated = null;
    P.pos.y = CFG.EYE;
    return;
  }
  if (t.kind === 'poster') {
    ach('THERE ARE NO CORGIS');
    openDialogue({ name: 'THE POSTER', sub: 'laminated' }, [
      "TRUDY, 2 — Chief Morale Officer. Lives upstairs, by the COO's office.",
      'Walks, meals, and moods are coordinated by her telegram bot. She has better infrastructure than you.',
      'Does not do meet-and-greets. Please stop asking the baristas where the corgis are.',
      'There are no corgis in the cafe.',
    ]);
    return;
  }
  if (t.kind === 'wall') { openWall(); return; }
  if (t.kind === 'npc') { talkTo(t.npc); return; }
}

// what you order most, across every visit — the thing a real cafe knows
function theUsual() {
  try {
    const oh = JSON.parse(localStorage.getItem('ccs_orders') || '{}');
    const best = Object.entries(oh).sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] < 2) return null;
    for (const sec of MENU) {
      for (const it of sec.items) {
        if (it.name === best[0] && !it.special) return { item: it, count: best[1] };
      }
    }
  } catch {}
  return null;
}

// nico's choice grows an option once he knows your order
function nicoChoice(d) {
  const u = theUsual();
  if (!u) return d.choice;
  return {
    prompt: 'so. the usual, or are we being adventurous?',
    options: [
      { label: `THE USUAL — ${u.item.name.toUpperCase()} $${priceOf(u.item, false).toFixed(2)}`, tag: 'usual' },
      { label: 'ORDER SOMETHING', tag: 'order' },
      { label: 'JUST TALKING', tag: 'talk' },
    ],
  };
}

function talkTo(n) {
  const d = DIALOGUE[n.id];
  S.stats.met.add(n.member || n.name);
  n.frozen = true;
  setTimeout(() => { n.frozen = false; }, 5000);

  if (n.id === 'trudy') {
    ach('PET THE DOG');
    if (S.trudyPhase === 2) { S.trudyPhase = 3; people.trudy.frozen = false; }
    S.focus = 100;
    addBuff('locked', 'LOCKED IN', 30);
    openDialogue(n, [
      '(she came downstairs. nobody in the room says anything. everyone is aware.)',
      '(you pet the dog. the whole cafe is watching you pet the dog.)',
      '(focus fully restored. this is the most productive thing that will happen tonight.)',
    ]);
    return;
  }

  if (n.id === 'nico') {
    // he keeps count of your conversations, across every visit
    let talks = 0;
    try {
      talks = (+localStorage.getItem('ccs_nico_talks') || 0) + 1;
      localStorage.setItem('ccs_nico_talks', String(talks));
    } catch {}

    if (!n.talkedTo) {
      n.talkedTo = true;
      S.caf = Math.min(100, S.caf + 25);
      S.stats.receipt.push({ n: 'Espresso · on the house', p: 0 });
      ach('THERE ARE NO CORGIS');
      setTimeout(() => toast('free espresso. <b>+25 caffeine</b>'), 400);
      hiss(0.6, 0.08);
      // a regular gets recognized, not pitched
      const intro = shiftNumber() > 1
        ? [
          `back again. shift #${shiftNumber()} for you, i think. i notice things.`,
          'the machine\'s hot.',
        ]
        : d.intro;
      openDialogue(n, intro, nicoChoice(d), tag => resolveChoice(n, tag));
      return;
    }

    // once — exactly once, and only for someone who keeps coming back —
    // he drops the bit. then never mentions it again.
    let hadMoment = false;
    try { hadMoment = !!localStorage.getItem('ccs_nico_moment'); } catch {}
    if (talks >= 5 && !hadMoment) {
      try { localStorage.setItem('ccs_nico_moment', '1'); } catch {}
      openDialogue(n, [
        "honestly? i opened this place because i didn't want to be alone at 3am.",
        'turns out nobody does.',
        'anyway. espresso?',
      ], nicoChoice(d), tag => resolveChoice(n, tag));
      return;
    }

    const pool = d.repeat;
    openDialogue(n, pool[(Math.random() * pool.length) | 0], nicoChoice(d),
      tag => resolveChoice(n, tag));
    return;
  }

  if (!n.talkedTo) {
    n.talkedTo = true;
    openDialogue(n, d.intro, d.choice, tag => resolveChoice(n, tag));
    return;
  }

  const pool = d.repeat;
  const choice = d.choice && !n.choiceDone ? d.choice : null;
  openDialogue(n, pool[(Math.random() * pool.length) | 0], choice,
    choice ? tag => resolveChoice(n, tag) : null);
}

function resolveChoice(n, tag) {
  const d = DIALOGUE[n.id];
  if (n.id === 'nico') {
    if (tag === 'order') { openOrder(); return; }
    if (tag === 'usual') {
      const u = theUsual();
      if (!u) { openOrder(); return; }
      const price = priceOf(u.item, false);
      if (price > S.cash) { toast('declined. (the card, not you.)'); return; }
      S.cash -= price;
      S.stats.spent += price;
      S.stats.receipt.push({ n: u.item.name + ' · the usual', p: price, q: 1 });
      S.pending = { lines: [{ served: u.item, base: u.item, large: false }], addons: [], t: u.item.prep ?? 5, units: 1 };
      toast(`he was already making it. <b>${u.item.name}</b>.`);
      say(people.nico, 'i know. i know what you get.', 4);
      hiss(0.7, 0.08);
      return;
    }
    openDialogue(n, d.after.talk);
    return;
  }
  if (n.id === 'squirtle') {
    if (tag === 'deeper') {
      if (Math.random() < 0.45) {
        ach('GNOSIS');
        n.choiceDone = true;   // gnosis strikes once a night
        S.ship = Math.min(100, S.ship + 11);
        toast('<b>GNOSIS.</b> he said one weird thing and now you understand your own bug. +11%');
        setTimeout(() => openDialogue(n, d.after.deeperGood), 260);
      } else {
        S.min += 16;
        S.focus = Math.max(0, S.focus - 10);
        toast('you lost <b>16 minutes</b> to a thread about agency.');
        setTimeout(() => openDialogue(n, d.after.deeperBad), 260);
      }
    } else {
      ach('TOUCHED GRASS');
      S.focus = Math.min(100, S.focus + 10);
      setTimeout(() => openDialogue(n, d.after.grass), 260);
    }
    return;
  }
  if (n.id === 'gtm') {
    if (tag === 'quote') runQuote(n, d);
    else setTimeout(() => openDialogue(n, d.after.no), 260);
    return;
  }
  if (n.id === 'vc') {
    if (tag === 'no') {
      S.stats.followers += 1;
      toast('he followed you. <b>+1 follower.</b>');
      setTimeout(() => openDialogue(n, d.after.no), 260);
      return;
    }
    if (tag === 'thesis') {
      // you asked. eight minutes later you know about slope and intercept.
      S.min += 8;
      S.stats.followers += 1;
      ach('HEARD THE THESIS');
      toast('<b>8 minutes gone.</b> he followed you, though.');
      setTimeout(() => openDialogue(n, d.after.thesis), 260);
      return;
    }
    if (tag === 'raising') {
      setTimeout(() => openDialogue(n, d.mid.lines, d.mid.choice, t2 => {
        if (t2 === 'painkiller') {
          n.choiceDone = true;
          S.min += 14;
          S.cash += 40;
          S.ship = Math.min(100, S.ship + 2);
          ach('TOOK THE MEETING');
          toast('the check cleared. <b>+$40.</b> the diligence was one question. +2%');
          setTimeout(() => openDialogue(n, d.after.painkiller), 260);
        } else if (t2 === 'vitamin') {
          if (Math.random() < 0.5) {
            S.stats.followers += 2;
            toast('he stole your line. <b>+2 followers.</b>');
            setTimeout(() => openDialogue(n, d.after.vitaminGood), 260);
          } else {
            S.stats.followers += 1;
            toast('supplements are not in thesis. <b>+1 follower</b>, though.');
            setTimeout(() => openDialogue(n, d.after.vitaminBad), 260);
          }
        } else if (t2 === 'vibes') {
          n.choiceDone = true;
          S.min += 6;
          S.cash += 15;
          S.ship = Math.min(100, S.ship + 1);
          ach('THE MOAT IS VIBES');
          toast('conviction check, on the spot. <b>+$15.</b>');
          setTimeout(() => openDialogue(n, d.after.vibes), 260);
        }
      }), 260);
    }
  }
}

/* ---------------------------------------------------------- the wall -- */
let wallCache = null, wallLoadedAt = 0, wallTotal = 0;

function noteStat(n) {
  // every note gets its ledger number — the Nth pin in the wall's history.
  // the personal shift count only appears once it's worth bragging about.
  const t = fmtClock(n.tmin).replace(/<[^>]+>/g, '');
  return `shipped ${n.ship}%${n.won ? '' : ' · sun came up'} · out ${t}` +
    (n.claims ? ` · ${n.claims} claims` : '') +
    ` · no. ${n.id}` +
    (n.shift > 1 ? ` · shift #${n.shift}` : '');
}

async function loadWall(force) {
  if (!force && wallCache && Date.now() - wallLoadedAt < 60000) return wallCache;
  try {
    const { rows, total } = await fetchNotes(0, 100);
    wallCache = rows;
    wallTotal = total;
    wallLoadedAt = Date.now();
    world.drawWall(wallCache.map(n => ({
      h: n.handle, p: PHRASES[n.phrase] ?? '…', stat: noteStat(n),
    })));
    assignGhosts();
  } catch {
    wallCache = wallCache || null;
  }
  return wallCache;
}

// The people typing at the tables are the people from the wall. Pin a note,
// and some night your handle is sitting in here working on something.
function assignGhosts() {
  if (!wallCache || !wallCache.length) return;
  let mine = '';
  try { mine = (localStorage.getItem('ccs_handle') || '').toLowerCase(); } catch {}
  const handles = [...new Set(wallCache.map(n => n.handle))]
    .filter(h => h.toLowerCase() !== mine)
    .slice(0, 8);
  people.ambient.forEach((a, i) => {
    if (i < handles.length && !a.labelInfo) {
      a.labelInfo = { name: '@' + handles[i], sub: 'was here', color: '#cfc4ff' };
      a.labelRange = 5.5;
    }
  });
}

// handle charset is DB-constrained to [A-Za-z0-9_]{1,15}, safe in a URL
const noteHTML = (n) =>
  `<div class="wnote"><a class="wh" href="https://x.com/${n.handle}" target="_blank" rel="noopener noreferrer">@${n.handle} ↗</a>` +
  `<div class="wp">“${PHRASES[n.phrase] ?? '…'}”</div>` +
  `<div class="ws">${noteStat(n)}</div></div>`;

function openWall() {
  S.mode = 'wall';
  document.exitPointerLock?.();
  const list = el('walllist');
  list.innerHTML = '<div class="wempty">reading the wall…</div>';
  el('wallp').classList.add('on');

  let shown = 0;
  const moreBtn = () => {
    const b = document.createElement('button');
    b.className = 'btn ghost';
    b.id = 'wallmore';
    b.style.margin = '4px auto';
    b.textContent = `READ OLDER (${wallTotal - shown} more)`;
    b.onclick = async () => {
      b.disabled = true; b.textContent = 'reading…';
      try {
        const { rows } = await fetchNotes(shown, 100);
        b.remove();
        list.insertAdjacentHTML('beforeend', rows.map(noteHTML).join(''));
        shown += rows.length;
        if (shown < wallTotal) list.appendChild(moreBtn());
      } catch {
        b.disabled = false; b.textContent = 'try again';
      }
    };
    return b;
  };

  loadWall(true).then(notes => {
    if (S.mode !== 'wall') return;
    if (!notes || !notes.length) {
      list.innerHTML = '<div class="wempty">the wall is quiet tonight. finish a shift and be the first.</div>';
      return;
    }
    shown = notes.length;
    list.innerHTML =
      `<div class="wcount">${wallTotal} note${wallTotal === 1 ? '' : 's'} on the wall</div>` +
      notes.map(noteHTML).join('');
    if (shown < wallTotal) list.appendChild(moreBtn());
  });
}
function closeWall() {
  el('wallp').classList.remove('on');
  if (!S.over) S.mode = 'play';
}
el('wallclose').onclick = closeWall;

/* pin form on the end screen */
function setupPinbox() {
  const sel = el('pinphrase');
  if (!sel.options.length) {
    PHRASES.forEach((p, i) => {
      const o = document.createElement('option');
      o.value = i; o.textContent = p;
      sel.appendChild(o);
    });
    sel.selectedIndex = (Math.random() * PHRASES.length) | 0;
    try { el('pinhandle').value = localStorage.getItem('ccs_handle') || ''; } catch {}
  }
  el('pinbtn').disabled = false;
  el('pinbtn').textContent = 'PIN TO THE WALL';
  el('pinstatus').textContent = '';
}

el('pinbtn').onclick = async () => {
  const raw = el('pinhandle').value.trim().replace(/^@/, '');
  if (!HANDLE_RE.test(raw)) {
    el('pinstatus').textContent = 'handle: letters, numbers, _ (max 15)';
    return;
  }
  let last = 0;
  try { last = +localStorage.getItem('ccs_lastpin') || 0; } catch {}
  if (Date.now() - last < 60000) {
    el('pinstatus').textContent = 'one pin a minute. the wall is patient.';
    return;
  }
  el('pinbtn').disabled = true;
  el('pinstatus').textContent = 'pinning…';
  try {
    await pinNote({
      handle: raw, phrase: +el('pinphrase').value,
      ship: S.ship, tmin: Math.min(360, S.min), shift: shiftNumber(),
      won: !!S.lastWon, claims: S.policy ? S.policy.claims : 0,
    });
    try {
      localStorage.setItem('ccs_handle', raw);
      localStorage.setItem('ccs_lastpin', String(Date.now()));
    } catch {}
    el('pinbtn').textContent = 'PINNED ✓';
    el('pinstatus').textContent = 'it\'s on the board by the door.';
    loadWall(true);
  } catch {
    el('pinbtn').disabled = false;
    el('pinstatus').textContent = 'the wall isn\'t taking pins right now.';
  }
};

/* ------------------------------------------------------- the terminal -- */
// The night's work, visible. Commits land faster the more caffeinated you are.
const COMMITS = [
  'fix: remove console.log (14 files)',
  'feat: the thing (final) (2)',
  'revert: revert: revert',
  'wip: do not look at this',
  'fix: off by one (by two)',
  'chore: bump deps, pray',
  'fix: it works locally',
  'refactor: rename utils to helpers',
  'refactor: rename helpers to utils',
  'fix: null check the null check',
  'feat: dark mode (light mode broken)',
  'docs: TODO write docs',
  'fix: race condition (introduced new one)',
  'test: skip flaky test',
  'test: skip all tests',
  'feat: ai integration (an if statement)',
  'perf: removed a sleep(3000). why was it there',
  'style: tabs to spaces (civil war)',
  'fix: works on my machine. shipped my machine',
  'chore: delete node_modules, feel something',
  'feat: onboarding, allegedly',
  'fix: the demo path only',
];
const COMMITS_JITTERS = [
  'fix: typo (again) (again)',
  'revert: everything since the pentagon',
  'wip: hands shaking, code compiling',
];
const COMMITS_LOW_FOCUS = [
  'wip: idk',
  'wip: same file, no changes',
  'chore: stared at it',
];

const termEl = () => el('term');
function pushCommit() {
  S.stats.commits++;
  let pool = COMMITS;
  if (hasBuff('jitters') && Math.random() < 0.4) pool = COMMITS_JITTERS;
  else if (S.focus < 20 && Math.random() < 0.5) pool = COMMITS_LOW_FOCUS;
  const msg = pool[(Math.random() * pool.length) | 0];
  const hash = ((Math.random() * 0xfffffff) | 0).toString(16).padStart(7, '0');
  const lines = el('termlines');
  const d = document.createElement('div');
  d.className = 'cline';
  d.innerHTML = `<b>${hash}</b> ${msg}`;
  lines.appendChild(d);
  while (lines.children.length > 8) lines.removeChild(lines.firstChild);
  [...lines.children].forEach((c, i) => c.classList.toggle('dim', i < lines.children.length - 3));
}

function tickTerminal(dt) {
  const on = S.running && !S.over && S.seated && S.mode === 'play';
  termEl().style.display = on ? 'block' : 'none';
  if (!on) return;
  S.commitT -= dt * (0.55 + (S.caf / 100) * 1.3) * (S.focus > 10 ? 1 : 0.4);
  if (S.commitT <= 0) {
    pushCommit();
    S.commitT = 1.4 + Math.random() * 1.8;
    if (Math.random() < 0.25) blip(1500 + Math.random() * 400, 0.012, 'square', 0.01);
  }
}

/* ----------------------------------------------------- the shift stamp -- */
// YOUR shift count, not the calendar's — first night is #1, and the wall
// ends up reading like tenure. Incremented once per completed run.
function shiftNumber() {
  try { return Math.max(1, +localStorage.getItem('ccs_shifts') || 1); }
  catch { return 1; }
}
function bumpShiftNumber() {
  try {
    localStorage.setItem('ccs_shifts', String((+localStorage.getItem('ccs_shifts') || 0) + 1));
  } catch { /* the untracked shift. lucky. */ }
}

/* ------------------------------------------------------ receipt as PNG -- */
function receiptPNG(won) {
  const rows = [];
  const R = (l, r, style) => rows.push({ l, r, style });
  R('TIME IN', '2:47 AM'); R('TIME OUT', fmtClock(S.min).replace(/<[^>]+>/g, ''));
  R('---');
  if (S.stats.receipt.length) {
    S.stats.receipt.forEach(x => R((x.q > 1 ? x.q + '× ' : '') + x.n, x.p.toFixed(2)));
  } else R('nothing ordered', '0.00');
  R('---');
  R('TOTAL', '$' + S.stats.spent.toFixed(2), 'total');
  if (S.policy) {
    R('---');
    R('CLAIMS FILED', String(S.policy.claims));
    R('PAID OUT', '$' + S.policy.paidOut.toFixed(2));
    R('LOSS RATIO', Math.round(S.policy.paidOut / Math.max(0.01, S.policy.premium) * 100) + '%');
  }
  if (S.etfSettle) {
    R('---');
    R('TERMINAL', 'SETTLED 6:00');
    S.etfSettle.rows.forEach(r => R(r.tk, (r.pnl >= 0 ? '+' : '-') + '$' + Math.abs(r.pnl).toFixed(2)));
    R('MGMT FEES', '$' + S.etfSettle.fees.toFixed(6));
    R('NET P&L', (S.etfSettle.net >= 0 ? '+' : '-') + '$' + Math.abs(S.etfSettle.net).toFixed(2));
  }
  const freebies = [];
  if (S.ach.has('GNOSIS')) freebies.push('GNOSIS ×1');
  if (S.ach.has('PET THE DOG')) freebies.push('DOG ×1');
  if (S.stats.followers) freebies.push(`FOLLOWERS +${S.stats.followers}`);
  if (freebies.length) {
    R('---');
    freebies.forEach(f => R(f, '0.00'));
  }
  R('---');
  R('COMMITS', String(S.stats.commits));
  R('SHIPPED', S.ship.toFixed(0) + '%', 'ship');

  const W = 640, line = 34, pad = 46;
  const head = 240, foot = 300;
  const c = document.createElement('canvas');
  c.width = W; c.height = head + rows.length * line + foot;
  const g = c.getContext('2d');
  g.fillStyle = '#fdf9f0'; g.fillRect(0, 0, W, c.height);

  drawCorgi(g, W / 2 + 30, 74, 0.62, '#e8552f');
  g.fillStyle = '#2b241e';
  g.textAlign = 'center';
  g.font = '800 40px Consolas, Menlo, monospace';
  g.fillText('CORGI CAFE', W / 2, 148);
  g.font = '600 19px Consolas, Menlo, monospace';
  g.fillStyle = '#6b6156';
  g.fillText('9 CLAUDE LN · SAN FRANCISCO', W / 2, 180);
  g.fillText(`OPEN 24/7 · SHIFT #${shiftNumber()}${S.quick ? ' · EXPRESS' : ''}`, W / 2, 206);

  let y = head + 8;
  const dash = () => {
    g.strokeStyle = '#c9bda9'; g.lineWidth = 3; g.setLineDash([9, 8]);
    g.beginPath(); g.moveTo(pad, y - 10); g.lineTo(W - pad, y - 10); g.stroke();
    g.setLineDash([]);
  };
  for (const r of rows) {
    if (r.l === '---') { dash(); y += 14; continue; }
    const big = r.style === 'ship', bold = big || r.style === 'total';
    g.font = `${bold ? 800 : 600} ${big ? 30 : 22}px Consolas, Menlo, monospace`;
    g.fillStyle = big ? '#d94e20' : '#2b241e';
    g.textAlign = 'left'; g.fillText(r.l, pad, y);
    g.textAlign = 'right'; g.fillText(r.r, W - pad, y);
    // dotted leader
    const lw = g.measureText(r.r).width;
    g.textAlign = 'left';
    const start = pad + g.measureText(r.l).width + 12;
    g.strokeStyle = '#cfc3ac'; g.lineWidth = 2; g.setLineDash([2, 7]);
    g.beginPath(); g.moveTo(start, y - 6); g.lineTo(W - pad - lw - 12, y - 6); g.stroke();
    g.setLineDash([]);
    y += big ? line + 10 : line;
  }

  y += 8;
  g.textAlign = 'center';
  g.font = '800 21px Consolas, Menlo, monospace';
  g.fillStyle = '#2b241e';
  if (won) {
    g.fillText('STATUS: SHIPPED.', W / 2, y); y += 26;
    g.font = '600 16px Consolas, Menlo, monospace';
    g.fillStyle = '#6b6156';
    g.fillText('before the sun. barely.', W / 2, y); y += 40;
  } else {
    g.fillText('STATUS: THE SUN CAME UP.', W / 2, y); y += 26;
    g.font = '600 16px Consolas, Menlo, monospace';
    g.fillStyle = '#6b6156';
    g.fillText('the cafe never closes. run it back.', W / 2, y); y += 40;
  }
  // barcode
  let bx = pad + 30;
  g.fillStyle = '#2b241e';
  while (bx < W - pad - 30) {
    const w = 2 + (Math.random() * 4 | 0);
    if (Math.random() > 0.4) g.fillRect(bx, y, w, 44);
    bx += w + 2 + (Math.random() * 4 | 0);
  }
  y += 70;
  g.font = '600 15px Consolas, Menlo, monospace';
  g.fillStyle = '#6b6156';
  g.fillText('THERE ARE NO CORGIS · THANK YOU', W / 2, y);

  // torn bottom edge — punched out to transparency so it reads on any background
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.moveTo(0, c.height);
  for (let x = 0; x <= W; x += 16) {
    g.lineTo(x + 8, c.height - 12);
    g.lineTo(x + 16, c.height);
  }
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';

  return c.toDataURL('image/png');
}

/* --------------------------------------------------------- the policy -- */
// The quote is underwritten off your actual state: caffeine is a surcharge,
// steady focus is a credit, and your questionnaire answers carry risk loads.
// The carrier remembers. Last night's loss ratio follows you to renewal.
const CARRIER_KEY = 'ccs_renewal';
function carrierHistory() {
  try { return JSON.parse(localStorage.getItem(CARRIER_KEY) || 'null'); }
  catch { return null; }
}

function quotePremium(loads) {
  let p = 6;
  p += S.caf * 0.05;                       // wired is a risk class
  if (hasBuff('jitters')) p += 2;
  if (S.focus > 70) p -= 1;                // demonstrated stability credit
  const hist = carrierHistory();
  if (hist) p += hist.lr > 1 ? 2.5 : hist.lr > 0.4 ? 1 : -1.2;
  p += loads;
  p = Math.max(5, Math.min(18, p));
  return Math.round(p * 10) / 10 + 0.4;    // everything ends in .40. house style.
}

function runQuote(n, d) {
  let loads = 0;
  const hist = carrierHistory();
  const ask = (qi) => {
    if (qi < d.quiz.length) {
      const q = d.quiz[qi];
      const opener = qi === 0 && hist
        ? (hist.lr > 1
          ? ["welcome back. this is a renewal, and the model remembers last night. you were... expensive."]
          : hist.claims > 0
            ? ["welcome back. renewal pricing — the model remembers last night. it mostly forgives."]
            : ["welcome back. clean history, zero claims. the model likes loyalty almost as much as it likes data."])
        : [];
      openDialogue(n, opener, {
        prompt: q.prompt,
        options: q.options.map(o => ({ label: o.label, tag: o.tag })),
      }, tag => {
        const opt = q.options.find(o => o.tag === tag);
        loads += opt ? opt.load : 0;
        setTimeout(() => ask(qi + 1), 240);
      });
      return;
    }
    // underwriting complete — present the number with its itemized logic
    const prem = quotePremium(loads);
    const parts = [];
    if (S.caf > 40) parts.push('caffeine surcharge');
    if (hasBuff('jitters')) parts.push('jitters rider');
    if (S.focus > 70) parts.push('stability credit');
    if (hist) {
      if (hist.lr > 1) parts.push('claims-history surcharge');
      else if (hist.claims === 0) { parts.push('no-claims discount'); ach('PREFERRED RISK'); }
    }
    const why = parts.length ? ` (${parts.join(', ')})` : '';
    openDialogue(n, [
      `ok. the model likes you more than it should. $${prem.toFixed(2)}, single-shift named-peril policy${why}.`,
      'form CC-247. effective on bind, expires 6:00 AM. covers three occurrences: interruptions, focus loss, doomscroll events. cash settlement, zero deductible.',
      'exclusions: acts of dog. claims settle in about ninety seconds.',
    ], {
      prompt: `$${prem.toFixed(2)}. three occurrences, per-occurrence limit, zero deductible. do we have a binder?`,
      options: [
        { label: `BIND COVERAGE — $${prem.toFixed(2)}`, tag: 'bind' },
        { label: 'DECLINE THE QUOTE', tag: 'pass' },
      ],
    }, tag => {
      if (tag !== 'bind') {
        setTimeout(() => openDialogue(n, d.after.declined), 240);
        return;
      }
      if (prem > S.cash) {
        setTimeout(() => openDialogue(n, d.after.broke), 240);
        return;
      }
      S.cash -= prem;
      S.stats.spent += prem;
      S.policy = { premium: prem, claimsLeft: 3, claims: 0, paidOut: 0, claimTimes: [] };
      S.stats.receipt.push({ n: 'Named-peril policy · CC-247', p: prem, q: 1 });
      n.choiceDone = true;
      ach('FULLY INSURED');
      addBuff('policy', 'INSURED ×3', null);
      toast(`bound. <b>$${prem.toFixed(2)}</b>. the next three bad things are corgi's problem.`);
      blip(660, 0.08, 'triangle', 0.05);
      setTimeout(() => openDialogue(n, d.after.bound), 260);
    });
  };
  ask(0);
}

function fileClaim(e) {
  // Cash settlement, not stat restoration. The bad thing happened; the
  // adjuster values the loss and the money lands — usually right about
  // espresso price, which is the whole ecosystem.
  // Settlement is delayed, so re-check the occurrence limit at payout time.
  if (!S.policy || S.policy.claimsLeft <= 0) return;
  S.policy.claimsLeft--;
  S.policy.claims++;
  S.policy.claimTimes.push(S.min);
  if (!S.policy.claimsLeft) dropBuff('policy');
  else { dropBuff('policy'); addBuff('policy', 'INSURED ×' + S.policy.claimsLeft, null); }

  const secs = 84 + (Math.random() * 14 | 0);
  let value = (e.foc ? -e.foc * 0.55 : 0) + (e.min ? e.min * 2.2 : 0);
  value = Math.max(2.4, Math.round(value * 20) / 20);
  S.cash += value;
  S.policy.paidOut += value;

  const espressoNote = value >= 3.25 ? " that's an espresso and change." : '';
  toast(`<b>CLAIM APPROVED</b> in ${secs}s — <b>$${value.toFixed(2)}</b> to your card.${espressoNote}`);

  // three claims inside 45 game-minutes is a pattern, and patterns get priced
  const ct = S.policy.claimTimes;
  const hazard = ct.length >= 3 && ct[ct.length - 1] - ct[ct.length - 3] <= 45;
  const agent = people.gtm[(Math.random() * people.gtm.length) | 0];
  if (hazard) {
    ach('MORAL HAZARD');
    say(agent, "three claims in under an hour. approved, obviously. but we're going to need to talk at renewal.", 6);
  } else {
    const lines = DIALOGUE.gtm.claimLines;
    say(agent, lines[(Math.random() * lines.length) | 0], 4);
  }
  blip(880, 0.07, 'triangle', 0.04);
  if (S.policy.claims >= 3) ach('LOSS RATIO');
}

/* ------------------------------------------------------------ events -- */
const EVENTS = [
  { bad: true, t: 'your cofounder: "quick call?" it is never quick.', foc: -9 },
  { bad: true, t: 'someone takes a call on speaker three feet away.', foc: -8 },
  { bad: true, t: 'the grinder goes off like a jet engine.', foc: -5 },
  { bad: true, t: 'the timeline pulls you under for a minute.', foc: -6, min: 4 },
  { bad: true, t: 'a stranger asks if you know where the corgis are.', foc: -4 },
  { bad: false, t: 'a genuinely good idea arrives, unprompted.', ship: 4 },
  { bad: false, t: 'the room goes quiet at exactly the right moment.', foc: 8 },
];

function fireEvent() {
  const roll = Math.random();
  // people-driven interrupts — policyholders get a drive-by instead of a
  // pitch, and after the 5am lock-in nobody works the room at all
  if (roll < 0.34 && !hasBuff('shield') && !S.lockin) {
    const who = Math.random() < 0.55
      ? people.gtm[(Math.random() * people.gtm.length) | 0]
      : people.vc;
    if (who.id === 'gtm' && S.policy) {
      say(who, 'just checking on a valued policyholder. carry on.', 4);
      return;
    }
    who.approach = new THREE.Vector2(P.pos.x, P.pos.z);
    setTimeout(() => { who.approach = null; }, 14000);
    say(who, who.id === 'vc' ? 'hey — quick question.' : 'hi! sorry — one quick thing.', 4);
    toast(`<b>${who.member || who.name}</b> is walking over.`);
    return;
  }
  const e = EVENTS[(Math.random() * EVENTS.length) | 0];
  if (e.bad && hasBuff('shield')) {
    dropBuff('shield');
    toast('something bad tried to happen. SECUR-I-TEA blocked it outright.');
    return;
  }
  if (e.foc) S.focus = Math.max(0, Math.min(100, S.focus + e.foc));
  if (e.ship) S.ship = Math.min(100, S.ship + e.ship);
  if (e.min) S.min += e.min;
  toast(e.t);
  if (e.bad) blip(180, 0.12, 'sawtooth', 0.035);
  // the shield PREVENTS; the policy REIMBURSES. different products. ask nico.
  if (e.bad && S.policy && S.policy.claimsLeft > 0) {
    setTimeout(() => fileClaim(e), 1400);
  }
}

/* -------------------------------------------------------------- loop -- */
const collide = world.colliders;

function move(dt) {
  let ix = 0, iz = 0;
  // arrow keys turn/walk so the game is playable with no mouse at all
  if (keys.ArrowLeft) P.yaw += dt * 1.9;
  if (keys.ArrowRight) P.yaw -= dt * 1.9;
  if (S.seated) {
    // in a chair, A/D turn the view too — dead keys read as broken keys
    if (keys.KeyA) P.yaw += dt * 1.9;
    if (keys.KeyD) P.yaw -= dt * 1.9;
    return false;
  }
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA) ix -= 1;
  if (keys.KeyD) ix += 1;
  if (isTouch) { ix += stickVec.x; iz += stickVec.y; }
  const mag = Math.hypot(ix, iz);
  if (mag > 1) { ix /= mag; iz /= mag; }

  const sp = CFG.SPEED * ((keys.ShiftLeft || keys.ShiftRight) ? CFG.SPRINT : 1)
    * (S.focus < 15 ? 0.72 : 1);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  const rx = -fz, rz = fx;
  const vx = (fx * -iz + rx * ix) * sp;
  const vz = (fz * -iz + rz * ix) * sp;

  // Move, then push out of anything we clipped — circle-vs-box resolution.
  // Unlike per-axis blocking, this slides you along furniture instead of
  // freezing whole directions the moment you brush a table skirt.
  let px = P.pos.x + vx * dt;
  let pz = P.pos.z + vz * dt;
  const r = CFG.RADIUS;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of collide) {
      const cx = Math.max(c.x0, Math.min(px, c.x1));
      const cz = Math.max(c.z0, Math.min(pz, c.z1));
      const dx = px - cx, dz = pz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 === 0) {
        // dead-centre inside a box: exit through the nearest face
        const l = px - c.x0, rt = c.x1 - px, tp = pz - c.z0, bt = c.z1 - pz;
        const m = Math.min(l, rt, tp, bt);
        if (m === l) px = c.x0 - r;
        else if (m === rt) px = c.x1 + r;
        else if (m === tp) pz = c.z0 - r;
        else pz = c.z1 + r;
      } else if (d2 < r * r) {
        const d = Math.sqrt(d2);
        px = cx + (dx / d) * r;
        pz = cz + (dz / d) * r;
      }
    }
  }
  if (S.mode === 'walkout' && px < 0.5) {
    // through the door and onto the lane — the corridor holds you to the doorway
    P.pos.x = Math.max(-6.5, px);
    P.pos.z = Math.max(4.55, Math.min(6.25, pz));
  } else {
    P.pos.x = Math.max(0.4, Math.min(ROOM.x1 - 0.4, px));
    P.pos.z = Math.max(0.5, Math.min(ROOM.z1 - 0.4, pz));
  }

  const moving = mag > 0.05;
  P.bob += dt * (moving ? 9.5 : 0);
  return moving;
}

function blocked(x, z, r) {
  for (const c of collide) {
    if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
  }
  return false;
}

let lastT = performance.now();
let etfDrawT = 1.5;
function frame(now) {
  requestAnimationFrame(frame);
  step(now);
}
function step(now) {
  let dt = (now - lastT) / 1000;
  lastT = now;
  dt = Math.min(dt, 0.05);
  const t = now / 1000;

  // the terminal feed refreshes on its own schedule
  etfDrawT -= dt;
  if (etfDrawT <= 0) {
    etfDrawT = 2.4;
    drawTicker(etfCv);
    etfTex.needsUpdate = true;
    if (S.mode === 'etf') renderEtf();
  }

  if (S.running && !S.over) {
    // EXPRESS shift: the whole simulation runs at double time — identical
    // balance in game-minutes, half the real minutes. Movement stays 1×.
    // inside the old machine the cafe holds its breath — sdt 0 freezes the
    // clock, the market, orders, buffs, caffeine, all of it
    const sdt = S.mode === 'rsi' ? 0 : dt * (S.quick ? 2 : 1);
    const gdt = sdt * CFG.MIN_PER_SEC * (S.mode === 'play' ? 1 : 0.45);
    S.min += gdt;
    etfTick(gdt, S.caf);   // the market dreams along at clock speed
    if (!S.etfHinted && !S.etfOpened && S.min >= CFG.START_MIN + 25) {
      S.etfHinted = true;
      toast('the green screen under the tagline is new. it is not showing the weather.');
    }

    // order prep
    if (S.pending) {
      S.pending.t -= sdt;
      if (S.pending.t <= 0) deliver();
    }

    // buffs
    S.buffs.forEach(b => { if (b.t != null) b.t -= sdt; });
    S.buffs = S.buffs.filter(b => b.t == null || b.t > 0);

    // caffeine + jitters
    // the cup in your hand — stats stream in sip by sip
    if (S.sipping) {
      const sp = S.sipping;
      const k = Math.min(sdt, sp.t) / sp.dur;
      S.caf = Math.min(100, S.caf + sp.caf * k);
      S.focus = Math.min(100, S.focus + sp.foc * k);
      sp.t -= sdt;
      if (sp.t <= 0) S.sipping = null;
      if (S.caf >= 100) ach('WIRED IN');
    }

    S.caf = Math.max(0, S.caf - CFG.CAF_DECAY * sdt);
    S.stats.peakCaf = Math.max(S.stats.peakCaf, S.caf);
    if (S.caf > CFG.JITTER_AT) addBuff('jitters', 'THE JITTERS', null, true);
    else dropBuff('jitters');

    if (S.seated) {
      const cafM = 0.5 + (S.caf / 100) * 1.5;
      const focM = 0.55 + (S.focus / 100) * 0.75;
      const jm = hasBuff('jitters') ? 0.62 : 1;
      S.ship = Math.min(100, S.ship + CFG.SHIP_BASE * cafM * focM * jm * sdt);
      const resist = 1 - S.caf / 260 - (hasBuff('protein') ? 0.35 : 0);
      const lockMul = S.lockin ? 0.8 : 1;   // the 5am room is kind to focus
      if (!hasBuff('locked')) S.focus = Math.max(0, S.focus - CFG.FOC_DRAIN * lockMul * Math.max(0.3, resist) * sdt);
      if (S.focus <= 0 && !S._slumped) {
        S._slumped = true;
        toast('you are staring at the same line. <b>get up. get coffee.</b>');
      }
      if (S.focus > 6) S._slumped = false;
      if (Math.random() < dt * 2.2) blip(1200 + Math.random() * 600, 0.012, 'square', 0.012);

      S.eventT -= sdt;
      if (S.eventT <= 0) { fireEvent(); S.eventT = 17 + Math.random() * 15; }
    } else {
      S.focus = Math.min(100, S.focus + CFG.FOC_REGEN * sdt);
    }

    // cafe flavor: distant cup clinks and the occasional steam wand
    if (Math.random() < dt * 0.07) blip(1700 + Math.random() * 900, 0.04, 'sine', 0.016);
    if (Math.random() < dt * 0.018) hiss(0.5, 0.028);

    // the wall remembers — other people's notes drift through your shift
    if (S.wallToasts && S.wallToasts.length && S.min > S.wallToasts[0] && wallCache && wallCache.length) {
      S.wallToasts.shift();
      const n = wallCache[(Math.random() * wallCache.length) | 0];
      toast(`the wall remembers: <b>@${n.handle}</b> — “${PHRASES[n.phrase] ?? '…'}”`, 4200);
    }

    // 5:00 AM — the room locks in
    if (!S.lockin && S.min >= 300) {
      S.lockin = true;
      toast('<b>5:00 AM.</b> the room locks in.');
      world.coveLights.forEach(l => { l.intensity *= 0.72; });
      people.gtm.forEach(p => { p.speed = 0.45; });
      people.vc.speed = 0.4;
      people.ambient.forEach(a => { a.lineT = 9999; });   // no more chatter
      musicSetSparse(true);
    }

    // Trudy comes down partway through the night
    S.trudyT -= sdt * CFG.MIN_PER_SEC;
    if (S.trudyT <= 0 && people.trudy.hidden) {
      people.trudy.hidden = false;
      toast('<b>a corgi has entered the cafe.</b> nobody is working now.');
      blip(720, 0.1, 'triangle', 0.05);
      setTimeout(() => blip(960, 0.12, 'triangle', 0.045), 110);
      say(people.squirtle, 'BREAKING: she has returned. no comment from the family.', 6);
      setTimeout(() => say(people.nico, 'she is not supposed to be down here.', 5), 2600);
      S.trudyVisitAt = S.min + 26 + Math.random() * 18;
    }

    // sometimes, the chief morale officer makes a house call
    if (S.trudyPhase === 0 && S.trudyVisitAt && S.min > S.trudyVisitAt && S.seated && !people.trudy.hidden) {
      S.trudyPhase = 1;
      people.trudy.approach = new THREE.Vector2(P.pos.x + 0.55, P.pos.z + 0.35);
    }
    if (S.trudyPhase === 1) {
      const td = Math.hypot(people.trudy.group.position.x - P.pos.x, people.trudy.group.position.z - P.pos.z);
      if (td < 1.4) {
        S.trudyPhase = 2;
        S.trudyIgnoreT = 18;
        people.trudy.approach = null;
        people.trudy.frozen = true;
        toast('<b>trudy is at your table.</b>');
        blip(760, 0.08, 'triangle', 0.045);
      }
    }
    if (S.trudyPhase === 2) {
      S.trudyIgnoreT -= dt;
      if (S.trudyIgnoreT <= 0) {
        S.trudyPhase = 3;
        people.trudy.frozen = false;
        say(people.squirtle, 'BREAKING: local founder ignores dog at table. dog remains professional. witnesses shaken.', 7);
      }
    }

    // sunrise ramp over the last 55 minutes
    const dawnT = Math.max(0, Math.min(1, (S.min - (CFG.END_MIN - 55)) / 55));
    world.setDawn(dawnT);
    world.setClock(S.min);
    scene.background.setHSL(0.62 - dawnT * 0.55, 0.5, 0.05 + dawnT * 0.35);

    if (S.ship >= 100) endGame(true);
    else if (S.min >= CFG.END_MIN) endGame(false);
  }

  if (S.running && (S.mode === 'play' || S.mode === 'walkout')) {
    const moving = move(dt);   // handles seated internally (you can still turn)
    if (moving && Math.random() < dt * 3.4) blip(90 + Math.random() * 30, 0.03, 'sine', 0.02);
  }

  // walking out: cross the threshold onto claude lane and the night is done
  if (S.mode === 'walkout') {
    promptEl.style.display = 'block';
    promptEl.innerHTML = '<b>→</b> WALK OUT THE FRONT DOOR';
    if (P.pos.x < -3.2) {
      S.mode = 'end';
      S.running = false;
      el('walkoutbtn').style.display = 'none';
      el('end').classList.add('on');
      document.exitPointerLock?.();
    }
  }

  // camera — steps down as you leave the raised floor for the lane
  const outK = S.mode === 'walkout' || S.mode === 'end'
    ? Math.max(0, Math.min(1, (0.4 - P.pos.x) / 2.2)) : 0;
  const jitterAmp = hasBuff('jitters') ? 0.012 : 0;
  P.sway += dt * 14;
  camera.position.set(
    P.pos.x + Math.sin(P.sway) * jitterAmp,
    (S.seated ? 1.22 : CFG.EYE) - outK * 0.52 + Math.sin(P.bob) * 0.035 + Math.cos(P.sway * 1.7) * jitterAmp,
    P.pos.z + Math.cos(P.sway * 0.9) * jitterAmp
  );
  camera.rotation.set(0, 0, 0);
  camera.rotateY(P.yaw);
  camera.rotateX(P.pitch);

  animatePeople(people, dt, t, P.pos, S.celebrate);
  world.tickAir(dt, t);
  tickConfetti(dt, t);
  tickTerminal(dt * (S.quick ? 2 : 1));
  updateOverlay();

  // face NPC labels + bubbles toward the player (sprites already billboard)
  if (S.running && S.mode === 'play') {
    curTarget = bestTarget();
    if (curTarget) {
      promptEl.style.display = 'block';
      promptEl.innerHTML = `<b>[E]</b> ${curTarget.label}` +
        (S.seated && curTarget.kind === 'stand' ? ' <span style="opacity:.55">· working…</span>' : '');
    } else if (S.seated) {
      // never leave the player wondering why WASD stopped moving them
      promptEl.style.display = 'block';
      promptEl.innerHTML = `<b>[E]</b> STAND UP <span style="opacity:.55">· working…</span>`;
    } else promptEl.style.display = 'none';
  } else if (S.mode !== 'play' && S.mode !== 'walkout') {
    promptEl.style.display = 'none';
  }

  if (S.running) updateHUD();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

/* --------------------------------------------------------- start/end -- */
function startGame() {
  el('title').classList.remove('on');
  el('end').classList.remove('on');
  S.running = true; S.over = false; S.mode = 'play';
  initAudio();
  if (AC && AC.state === 'suspended') AC.resume();
  startMusic();
  loadWall();   // warm the board by the door
  S.wallToasts = [S.min + 22 + Math.random() * 25, S.min + 110 + Math.random() * 50];
  if (!isTouch) renderer.domElement.requestPointerLock();
  toast('2:47 AM. the machine is hot. <b>go.</b>', 3400);
}
el('startbtn').onclick = startGame;

// EXPRESS shift toggle on the title screen — remembered between visits
function renderSpeedBtn() {
  el('speedbtn').innerHTML = S.quick
    ? '<b>CLOCK</b> express · 2×'
    : '<b>CLOCK</b> normal';
  el('speedbtn').style.background = S.quick ? 'rgba(232,85,47,.35)' : '';
}
try { S.quick = localStorage.getItem('ccs_quick') === '1'; } catch {}
el('speedbtn').onclick = () => {
  S.quick = !S.quick;
  try { localStorage.setItem('ccs_quick', S.quick ? '1' : '0'); } catch {}
  renderSpeedBtn();
};
renderSpeedBtn();
renderAchBar();

/* ------------------------------------------------------- the celebration -- */
function celebrate() {
  S.celebrate = true;
  // confetti burst from the ceiling
  const N = 520;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const vel = [];
  const palette = [[0.91, 0.33, 0.18], [1.0, 0.69, 0.36], [0.99, 0.98, 0.96], [0.56, 0.84, 1.0], [0.62, 0.88, 0.54]];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = 1 + Math.random() * 23;
    pos[i * 3 + 1] = 3.1 + Math.random() * 0.8;
    pos[i * 3 + 2] = 0.6 + Math.random() * 9.4;
    const c = palette[(Math.random() * palette.length) | 0];
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    vel.push({ vy: 0.55 + Math.random() * 0.8, ph: Math.random() * 6.28, sw: 0.3 + Math.random() * 0.5 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.13, vertexColors: true, depthWrite: false,
  }));
  scene.add(pts);
  S.confetti = { pts, geo, vel };
  S.confettiT = 6.5;

  // the room reacts
  const cheers = ['SHIPPED!!', 'LFG', 'ring the bell', 'the machine stays hot', 'clapping. actually clapping.', 'ok that deserves a smoothie'];
  people.ambient.slice(0, 6).forEach((a, i) => {
    a.bubble = { text: cheers[i % cheers.length], t: 4.5 };
  });
  say(people.nico, 'on the house. all of it. (not all of it.)', 5);
  if (!people.trudy.hidden) say(people.trudy, '(zoomies)', 4);

  // triumphant little arpeggio
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
    setTimeout(() => blip(f, 0.22, 'triangle', 0.07), i * 105);
  });
  setTimeout(() => hiss(1.2, 0.07), 600);

  // light flare
  world.coveLights.forEach(l => { l.intensity *= 1.8; });
  world.setDawn(0.85);   // golden light floods in, sunrise or not
}

function tickConfetti(dt, t) {
  if (!S.confetti) return;
  S.confettiT -= dt;
  const p = S.confetti.geo.attributes.position;
  const vel = S.confetti.vel;
  for (let i = 0; i < vel.length; i++) {
    const v = vel[i];
    if (p.array[i * 3 + 1] > 0.06) {
      p.array[i * 3 + 1] -= v.vy * dt;
      p.array[i * 3] += Math.sin(t * 2.2 + v.ph) * v.sw * dt;
    }
  }
  p.needsUpdate = true;
  if (S.confettiT <= 0) {
    scene.remove(S.confetti.pts);
    S.confetti.geo.dispose();
    S.confetti = null;
  }
}

function receiptHTML(won) {
  const rows = S.stats.receipt.map(r =>
    `<div class="rrow"><span>${r.q > 1 ? r.q + '× ' : ''}${r.n}</span><i></i><b>${r.p.toFixed(2)}</b></div>`
  ).join('') || '<div class="rrow"><span>nothing ordered</span><i></i><b>0.00</b></div>';

  const free = [];
  if (S.ach.has('GNOSIS')) free.push('GNOSIS ×1');
  if (S.ach.has('PET THE DOG')) free.push('DOG ×1');
  if (S.stats.followers) free.push(`FOLLOWERS +${S.stats.followers}`);

  const policyRows = S.policy ? `
    <div class="rtear"></div>
    <div class="rrow"><span>CLAIMS FILED</span><i></i><b>${S.policy.claims}</b></div>
    <div class="rrow"><span>PAID OUT</span><i></i><b>$${S.policy.paidOut.toFixed(2)}</b></div>
    <div class="rrow"><span>LOSS RATIO</span><i></i><b>${S.policy.premium > 0 ? Math.round(S.policy.paidOut / S.policy.premium * 100) : 0}%</b></div>
    ${S.policy.paidOut > S.policy.premium ? '<div class="rfree">we lost money on you. we\'d bind you again.</div>' : ''}` : '';

  return `
  <div class="receipt">
    <div class="rlogo">🐕</div>
    <div class="rhead">CORGI CAFE</div>
    <div class="rsub">9 CLAUDE LN · SAN FRANCISCO<br>OPEN 24/7 · SHIFT #${shiftNumber()}${S.quick ? ' · EXPRESS' : ''}</div>
    <div class="rtear"></div>
    <div class="rrow"><span>TIME IN</span><i></i><b>2:47 AM</b></div>
    <div class="rrow"><span>TIME OUT</span><i></i><b>${fmtClock(S.min).replace(/<[^>]+>/g, '')}</b></div>
    <div class="rtear"></div>
    ${rows}
    <div class="rtear"></div>
    <div class="rrow rtotal"><span>TOTAL</span><i></i><b>$${S.stats.spent.toFixed(2)}</b></div>
    ${free.length ? `<div class="rfree">NO CHARGE:<br>${free.join('<br>')}</div>` : ''}
    ${!S.etfSettle ? '' : `
    <div class="rtear"></div>
    <div class="rrow"><span>TERMINAL</span><i></i><b>SETTLED 6:00</b></div>
    ${S.etfSettle.rows.map(r =>
      `<div class="rrow"><span>${r.tk}</span><i></i><b class="${r.pnl >= 0 ? 'up' : 'dn'}">${r.pnl >= 0 ? '+' : '-'}$${Math.abs(r.pnl).toFixed(2)}</b></div>`).join('')}
    <div class="rrow"><span>MGMT FEES</span><i></i><b>$${S.etfSettle.fees.toFixed(6)}</b></div>
    <div class="rrow"><span>NET P&L</span><i></i><b class="${S.etfSettle.net >= 0 ? 'up' : 'dn'}">${S.etfSettle.net >= 0 ? '+' : '-'}$${Math.abs(S.etfSettle.net).toFixed(2)}</b></div>`}
    ${policyRows}
    <div class="rtear"></div>
    <div class="rrow"><span>COMMITS</span><i></i><b>${S.stats.commits}</b></div>
    <div class="rrow rship"><span>SHIPPED</span><i></i><b>${S.ship.toFixed(0)}%</b></div>
    <div class="rstatus">${won
      ? 'STATUS: SHIPPED.<br><span>before the sun. barely.</span>'
      : 'STATUS: THE SUN CAME UP.<br><span>good news: the cafe never closes. run it back.</span>'}</div>
    <div class="rbarcode"></div>
    <div class="rfoot">THERE ARE NO CORGIS · THANK YOU</div>
  </div>`;
}

function endGame(won) {
  S.over = true;
  S.lastWon = won;
  bumpShiftNumber();   // this run now has a number of its own

  // 6:00 AM: the terminal settles, whether you shipped or not
  if (etfPositions.length) {
    S.etfSettle = etfSettle(S.min);
    const fl = S.etfSettle.flags;
    if (fl.drag) ach('VOLATILITY DRAG');
    if (fl.capped) ach('HIT THE CAP');
    if (fl.buffered) ach('FULLY BUFFERED');
  }
  el('etf').classList.remove('on');
  // regulars get their table — the one you shipped from
  if (won && S.lastSeat) {
    try {
      localStorage.setItem('ccs_table', JSON.stringify({
        x: S.lastSeat.table.x, z: S.lastSeat.table.z,
      }));
    } catch {}
  }
  document.exitPointerLock?.();
  ach(won ? 'SHIPPED' : 'SAW THE SUNRISE');

  const f = el('flash');
  f.style.transition = 'opacity .1s'; f.style.opacity = won ? '.85' : '.5';
  setTimeout(() => { f.style.transition = 'opacity 1.1s'; f.style.opacity = '0'; }, 110);

  // the carrier files its own paperwork on your way out
  if (S.policy) {
    try {
      localStorage.setItem(CARRIER_KEY, JSON.stringify({
        claims: S.policy.claims,
        lr: S.policy.paidOut / Math.max(0.01, S.policy.premium),
        when: Date.now(),
      }));
    } catch { /* private mode: the carrier forgets. lucky you. */ }
  }

  const showPanel = () => {
    S.running = false; S.mode = 'end'; S.celebrate = false;
    el('endtitle').textContent = won ? 'SHIPPED' : 'THE SUN CAME UP';
    el('endtitle').style.color = won ? '#ff7b3d' : '#8fb8ff';
    el('receiptwrap').innerHTML = receiptHTML(won);
    el('achv').innerHTML = [...S.ach].map(a => `<span class="ach">${a}</span>`).join('');
    setupPinbox();
    el('end').classList.add('on');
  };

  if (won) {
    // let the room have its moment before the receipt prints
    S.mode = 'celebrate';
    celebrate();
    setTimeout(showPanel, 3200);
  } else {
    setTimeout(showPanel, 500);
  }
}

function shareText() {
  const lines = [
    `CORGI CAFE SIMULATOR — 9 Claude Ln, 2:47AM shift`,
    ``,
    `shipped: ${S.ship.toFixed(0)}%`,
    `clocked out: ${fmtClock(S.min).replace(/<[^>]+>/g, '')}`,
    `drinks: ${S.stats.drinks}  ·  spent: $${S.stats.spent.toFixed(2)}`,
    `peak caffeine: ${Math.round(S.stats.peakCaf)}`,
    ...(S.etfSettle ? [`terminal p&l: ${S.etfSettle.net >= 0 ? '+' : '-'}$${Math.abs(S.etfSettle.net).toFixed(2)} overnight`] : []),
    `corgis seen: ${S.ach.has('PET THE DOG') ? 1 : 0}`,
    ``,
    S.ach.has('SHIPPED') ? 'shipped before the sun. barely.' : 'the sun came up. it was not enough.',
  ];
  return lines.join('\n');
}
el('savereceipt').onclick = () => {
  const a = document.createElement('a');
  a.href = receiptPNG(!!S.lastWon);
  a.download = `corgi-cafe-receipt-shift-${shiftNumber()}.png`;
  a.click();
  toast('receipt saved. post it.');
};
el('sharebtn').onclick = () => {
  const url = location.href.split('?')[0];
  const txt = encodeURIComponent(shareText() + '\n\n');
  open(`https://x.com/intent/post?text=${txt}&url=${encodeURIComponent(url)}`, '_blank');
};
el('copybtn').onclick = () => {
  navigator.clipboard?.writeText(shareText() + '\n' + location.href.split('?')[0]);
  toast('copied.');
};
// A live shift is protected from accidental reloads — browser shortcuts,
// extension keybinds (vimium's r!), swipe-back, tab close: all prompt first.
let leavingOnPurpose = false;
addEventListener('beforeunload', e => {
  if (S.running && !S.over && !leavingOnPurpose) {
    e.preventDefault();
    e.returnValue = '';
  }
});
el('againbtn').onclick = () => { leavingOnPurpose = true; location.reload(); };

// the door has been open the whole time
el('walkoutbtn').onclick = () => {
  el('end').classList.remove('on');
  S.mode = 'walkout';
  S.running = true;
  world.setDawn(1);
  toast('the sun is up. the door is open.', 4200);
  blip(523.25, 0.18, 'triangle', 0.05);
};

// expose a little state for debugging in the console
window.CCS = {
  S, P, world, people, CFG, renderer, scene, camera, startGame, toast,
  act: onAction,
  target: () => (curTarget = bestTarget()),
  step, fireEvent,
};
