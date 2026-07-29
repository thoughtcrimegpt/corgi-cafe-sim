// Procedural canvas textures. No external image assets — everything is drawn at runtime.
import * as THREE from '../vendor/three.module.min.js?v=6';

export const PAL = {
  orange:  '#e8552f',
  orangeL: '#f26b3f',
  cream:   '#efe2d4',
  wood:    '#c79a6a',
  ink:     '#241d1a',
  white:   '#fdf9f4',
};

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tex(canvas, repeat) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  // chunky on purpose — everything is meant to read as pixel art
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.anisotropy = 1;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Deterministic RNG so the mural looks the same every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------------------------------------------------------- corgi logo ---- */
// Stylized corgi + coffee cup, drawn as a white silhouette on transparent.
export function drawCorgi(g, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = color;

  // body
  g.beginPath();
  g.moveTo(-46, 6);
  g.bezierCurveTo(-40, -18, 10, -22, 34, -12);
  g.bezierCurveTo(50, -6, 54, 10, 48, 18);
  g.lineTo(-42, 18);
  g.closePath();
  g.fill();

  // rear haunch
  g.beginPath();
  g.ellipse(36, 4, 18, 17, 0, 0, Math.PI * 2);
  g.fill();

  // stubby legs
  for (const lx of [-30, -12, 26, 42]) {
    g.fillRect(lx - 5, 14, 10, 14);
  }

  // head
  g.beginPath();
  g.ellipse(-48, -12, 17, 15, -0.15, 0, Math.PI * 2);
  g.fill();

  // snout
  g.beginPath();
  g.moveTo(-60, -8);
  g.lineTo(-76, -2);
  g.lineTo(-58, 3);
  g.closePath();
  g.fill();

  // ears
  g.beginPath();
  g.moveTo(-56, -24); g.lineTo(-62, -50); g.lineTo(-42, -28); g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(-40, -24); g.lineTo(-40, -50); g.lineTo(-24, -26); g.closePath(); g.fill();

  g.restore();
}

export function drawCup(g, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = color;
  // saucer
  g.beginPath(); g.ellipse(0, 22, 30, 6, 0, 0, Math.PI * 2); g.fill();
  // cup
  g.beginPath();
  g.moveTo(-20, -4); g.lineTo(20, -4);
  g.bezierCurveTo(18, 16, 12, 18, 0, 18);
  g.bezierCurveTo(-12, 18, -18, 16, -20, -4);
  g.closePath(); g.fill();
  // handle
  g.lineWidth = 5; g.strokeStyle = color;
  g.beginPath(); g.arc(24, 3, 9, -1.2, 1.2); g.stroke();
  // steam
  g.lineWidth = 4; g.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.moveTo(i * 10, -12);
    g.quadraticCurveTo(i * 10 + 7, -22, i * 10, -32);
    g.stroke();
  }
  g.restore();
}

/* ------------------------------------------------------------- the sign ---- */
export function signTexture() {
  const c = cv(1024, 512), g = c.getContext('2d');
  g.fillStyle = PAL.orange; g.fillRect(0, 0, 1024, 512);
  drawCorgi(g, 545, 168, 1.35, PAL.white);
  drawCup(g, 415, 168, 1.25, PAL.white);
  g.fillStyle = PAL.white;
  g.textAlign = 'center';
  g.font = 'bold 92px Helvetica, Arial, sans-serif';
  g.fillText('CORGI CAFE', 512, 350);
  g.font = '44px Helvetica, Arial, sans-serif';
  g.fillText('—  OPEN 24/7  —', 512, 412);
  return tex(c);
}

export function bladeSignTexture() {
  const c = cv(256, 768), g = c.getContext('2d');
  g.fillStyle = PAL.orangeL; g.fillRect(0, 0, 256, 768);
  drawCorgi(g, 128, 150, 1.0, PAL.white);
  g.save();
  g.translate(128, 470);
  g.fillStyle = PAL.white;
  g.textAlign = 'center';
  g.font = 'bold 150px Helvetica, Arial, sans-serif';
  g.fillText('Corgi', 0, 0);
  g.restore();
  return tex(c);
}

/* ------------------------------------------------------------ menu board --- */
// A hero board, not the whole menu — the game renders at 328p, so every line
// here is sized to survive that. The full menu lives in the order screen.
export function menuBoardTexture() {
  const c = cv(1024, 1024), g = c.getContext('2d');
  g.fillStyle = '#1b1512'; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = PAL.orangeL; g.lineWidth = 10;
  g.strokeRect(16, 16, 992, 992);

  g.fillStyle = PAL.orangeL;
  g.textAlign = 'center';
  g.font = 'bold 96px Helvetica, Arial, sans-serif';
  g.fillText('MENU', 512, 128);

  const line = (txt, price, x, y, w) => {
    g.textAlign = 'left';
    g.fillStyle = '#f6efe6';
    g.font = 'bold 44px Helvetica, Arial, sans-serif';
    g.fillText(txt, x, y);
    g.textAlign = 'right';
    g.fillStyle = PAL.orangeL;
    g.font = 'bold 44px Helvetica, Arial, sans-serif';
    g.fillText(price, x + w, y);
  };

  const L = 66, R = 546, W = 412;
  let y = 262;
  g.fillStyle = PAL.orangeL; g.textAlign = 'left';
  g.font = 'bold 40px Helvetica, Arial, sans-serif';
  g.fillText('COFFEE', L, y - 46);
  line('ESPRESSO', '3.25', L, y + 26, W); y += 96;
  line('LATTE', '6.00', L, y + 26, W); y += 96;
  line('MOCHA', '6.50', L, y + 26, W); y += 96;
  line('COLD BREW', '5.50', L, y + 26, W); y += 96;
  line('CHAI LATTE', '5.30', L, y + 26, W); y += 96;

  y = 262;
  g.fillStyle = PAL.orangeL;
  g.font = 'bold 40px Helvetica, Arial, sans-serif';
  g.fillText('THE EXCLUSIVES', R, y - 46);
  line('ELEVENLATTE', '5.80', R, y + 26, W); y += 96;
  line('BREXSPRESSO', '7.50', R, y + 26, W); y += 96;
  line('THE PENTAGON', '14', R, y + 26, W); y += 96;
  line('SMOOTHIES', '14', R, y + 26, W); y += 96;
  line('CROISSANT', '5.25', R, y + 26, W); y += 96;

  // footer strip
  g.fillStyle = PAL.orange;
  g.fillRect(16, 900, 992, 108);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = 'bold 44px Helvetica, Arial, sans-serif';
  g.fillText('FULL MENU AT THE COUNTER · YC ALUMNI 20% OFF', 512, 966);
  return tex(c);
}

/* --------------------------------------------------------------- poster ---- */
export function trudyPosterTexture() {
  const c = cv(512, 720), g = c.getContext('2d');
  g.fillStyle = '#fbf6f0'; g.fillRect(0, 0, 512, 720);
  g.fillStyle = PAL.orange; g.fillRect(0, 0, 512, 14);

  // photo block
  g.fillStyle = '#d98b4a'; g.fillRect(48, 60, 416, 300);
  g.save();
  g.beginPath(); g.rect(48, 60, 416, 300); g.clip();
  g.fillStyle = '#c8763a';
  g.beginPath(); g.arc(256, 320, 190, 0, Math.PI * 2); g.fill();
  drawCorgi(g, 300, 250, 2.2, '#fbf6f0');
  g.restore();

  g.fillStyle = PAL.ink;
  g.font = 'bold 64px Helvetica, Arial, sans-serif';
  g.fillText('Trudy, 2', 48, 442);
  g.font = 'bold 34px Helvetica, Arial, sans-serif';
  g.fillStyle = '#4c423a';
  const lines = [
    'Chief Morale Officer.',
    'Lives upstairs.',
    'No meet-and-greets.',
    '',
    'There are no corgis',
    'in the cafe.',
  ];
  lines.forEach((t, i) => g.fillText(t, 48, 496 + i * 40));
  return tex(c);
}

export function noticeTexture(title, body) {
  const c = cv(512, 384), g = c.getContext('2d');
  g.fillStyle = '#fbf6f0'; g.fillRect(0, 0, 512, 384);
  g.strokeStyle = '#ddd0c2'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 368);
  g.fillStyle = PAL.orange;
  g.font = 'bold 52px Helvetica, Arial, sans-serif';
  g.fillText(title, 30, 84);
  g.fillStyle = '#453c35';
  g.font = 'bold 34px Helvetica, Arial, sans-serif';
  body.forEach((t, i) => g.fillText(t, 30, 156 + i * 52));
  return tex(c);
}

/* ---------------------------------------------------------------- mural ---- */
// The alley wall opposite the windows: big blue/red graffiti ribbons.
export function muralTexture() {
  const c = cv(2048, 1024), g = c.getContext('2d');
  g.fillStyle = '#171a26'; g.fillRect(0, 0, 2048, 1024);

  const r = rng(90210);
  const cols = ['#2b3d9e', '#1c2a7a', '#c0392b', '#8e1f2f', '#3f51c4', '#6b1f6b'];
  for (let i = 0; i < 26; i++) {
    const y = 120 + r() * 780;
    const x = -200 + r() * 2200;
    const w = 220 + r() * 520;
    const h = 60 + r() * 180;
    g.fillStyle = cols[(r() * cols.length) | 0];
    g.globalAlpha = 0.85;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + w * 0.3, y - h, x + w * 0.7, y + h, x + w, y - h * 0.3);
    g.lineTo(x + w, y + h * 0.6);
    g.bezierCurveTo(x + w * 0.7, y + h * 1.4, x + w * 0.3, y + h * 0.2, x, y + h * 0.9);
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
  // highlight strokes
  g.lineWidth = 10; g.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)';
    const x = r() * 2048, y = r() * 1024;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 160 - r() * 320, y + 200 - r() * 400, x + 300 - r() * 600, y + 120 - r() * 240);
    g.stroke();
  }
  // grimy base
  const grad = g.createLinearGradient(0, 700, 0, 1024);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.65)');
  g.fillStyle = grad; g.fillRect(0, 700, 2048, 324);
  return tex(c);
}

/* ------------------------------------------------------------ cup boxes ---- */
export function cupBoxTexture() {
  const c = cv(512, 512), g = c.getContext('2d');
  g.fillStyle = '#c9b394'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = 'rgba(0,0,0,0.05)';
  for (let i = 0; i < 512; i += 8) g.fillRect(0, i, 512, 2);
  g.fillStyle = '#2e2620';
  g.font = 'bold 58px Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('CLEAR PET', 256, 120);
  g.font = 'bold 52px Helvetica, Arial, sans-serif';
  g.fillText('COLD CUPS', 256, 184);
  g.strokeStyle = '#2e2620'; g.lineWidth = 8;
  g.beginPath(); g.moveTo(206, 240); g.lineTo(228, 380); g.lineTo(284, 380); g.lineTo(306, 240); g.closePath(); g.stroke();
  g.font = 'bold 46px Helvetica, Arial, sans-serif';
  g.fillText('1000 ct', 256, 456);
  return tex(c);
}

/* -------------------------------------------------- corgis with careers ---- */
// Riff on the site's corgi-in-professional-roles footer illustrations.
export function jobPosterTexture(role) {
  const c = cv(512, 640), g = c.getContext('2d');
  const bgs = ['#f6ecdf', '#e8552f', '#2b3a52', '#f0dfc8'];
  const fgs = ['#e8552f', '#fdf9f4', '#f6b73c', '#3a6b46'];
  g.fillStyle = bgs[role % 4]; g.fillRect(0, 0, 512, 640);
  const fg = fgs[role % 4];

  drawCorgi(g, 290, 300, 1.9, fg);

  g.fillStyle = fg;
  if (role === 0) {
    // THE BUILDER — laptop under the snout
    g.fillRect(90, 330, 150, 14);
    g.save(); g.translate(96, 330); g.rotate(-0.5); g.fillRect(0, -96, 130, 10); g.restore();
    g.fillRect(96, 236, 4, 96);
  } else if (role === 1) {
    // THE FOUNDER — a tie
    g.beginPath(); g.moveTo(178, 268); g.lineTo(206, 300); g.lineTo(178, 380); g.lineTo(152, 300); g.closePath(); g.fill();
  } else if (role === 2) {
    // THE CHEF — a hat
    g.beginPath(); g.ellipse(160, 158, 62, 40, -0.1, 0, Math.PI * 2); g.fill();
    g.fillRect(112, 160, 96, 44);
  } else {
    // THE DOCTOR — stethoscope
    g.strokeStyle = fg; g.lineWidth = 9;
    g.beginPath(); g.arc(210, 372, 46, -0.4, 2.4); g.stroke();
    g.beginPath(); g.arc(258, 408, 16, 0, Math.PI * 2); g.fill();
  }

  g.fillStyle = role === 1 || role === 2 ? '#fdf9f4' : '#2e2620';
  g.textAlign = 'center';
  g.font = 'bold 64px Helvetica, Arial, sans-serif';
  g.fillText(['THE BUILDER', 'THE FOUNDER', 'THE CHEF', 'THE DOCTOR'][role % 4], 256, 520);
  g.font = 'bold 30px Helvetica, Arial, sans-serif';
  g.globalAlpha = 0.75;
  g.fillText('CORGI CAFE · EST 2025', 256, 586);
  g.globalAlpha = 1;
  return tex(c);
}

// The Artist in Residence triptych — three flying corgis, eyes closed,
// riffing on the residency announcement art: cape, doctor coat, beanie.
function drawFlyingCorgi(g, x, y, s, item) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  const fur = '#e0995c', cream = '#f7ead8', ink = '#3a2c22';

  // cape flows out behind first so the body overlaps it
  if (item === 'cape') {
    g.fillStyle = '#a83226';
    g.beginPath();
    g.moveTo(-30, -18);
    g.bezierCurveTo(-90, -52, -128, -10, -108, 26);
    g.bezierCurveTo(-96, 2, -74, 30, -52, 12);
    g.bezierCurveTo(-44, 24, -34, 16, -30, 4);
    g.closePath();
    g.fill();
  }

  // body — long and horizontal, mid-leap
  g.fillStyle = fur;
  g.beginPath();
  g.ellipse(0, 0, 62, 26, -0.06, 0, Math.PI * 2);
  g.fill();
  // cream belly
  g.fillStyle = cream;
  g.beginPath();
  g.ellipse(-4, 12, 46, 13, -0.05, 0, Math.PI * 2);
  g.fill();

  // trailing back legs, front legs reaching
  g.fillStyle = fur;
  for (const [lx, ly, a] of [[-52, 18, 0.7], [-40, 22, 0.5], [46, 16, -0.4], [56, 10, -0.55]]) {
    g.save(); g.translate(lx, ly); g.rotate(a);
    g.beginPath(); g.ellipse(0, 0, 17, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = cream;
    g.beginPath(); g.ellipse(item === 'coat' && lx > 0 ? 0 : 12, 0, 5, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = fur;
    g.restore();
  }

  // doctor coat drapes over the torso
  if (item === 'coat') {
    g.fillStyle = '#fdfbf6';
    g.beginPath();
    g.moveTo(-30, -24); g.lineTo(34, -22);
    g.lineTo(40, 20); g.lineTo(-38, 24);
    g.closePath(); g.fill();
    g.strokeStyle = '#d8d2c4'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(4, -22); g.lineTo(0, 22); g.stroke();
    // stethoscope
    g.strokeStyle = '#3d4148'; g.lineWidth = 4;
    g.beginPath(); g.arc(26, 2, 16, 0.5, 2.6); g.stroke();
    g.fillStyle = '#3d4148';
    g.beginPath(); g.arc(14, 16, 6, 0, Math.PI * 2); g.fill();
  }
  // plain white tee
  if (item === 'tee') {
    g.fillStyle = '#fdfbf6';
    g.beginPath();
    g.moveTo(-26, -24); g.lineTo(30, -22);
    g.lineTo(34, 18); g.lineTo(-30, 22);
    g.closePath(); g.fill();
  }

  // head, forward and slightly up
  g.fillStyle = fur;
  g.beginPath();
  g.ellipse(70, -14, 24, 20, -0.12, 0, Math.PI * 2);
  g.fill();
  // snout
  g.fillStyle = cream;
  g.beginPath();
  g.ellipse(88, -8, 16, 11, -0.1, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = ink;
  g.beginPath();
  g.ellipse(102, -10, 6.5, 5.5, 0, 0, Math.PI * 2);
  g.fill();

  // ears — pointed, or a beanie over them
  if (item === 'beanie') {
    g.fillStyle = '#2c2f33';
    g.beginPath();
    g.ellipse(64, -30, 20, 13, -0.15, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(45, -32, 39, 8);
  } else {
    g.fillStyle = fur;
    g.beginPath(); g.moveTo(52, -26); g.lineTo(46, -52); g.lineTo(64, -32); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(66, -30); g.lineTo(68, -54); g.lineTo(80, -32); g.closePath(); g.fill();
  }

  // closed happy eye + smile
  g.strokeStyle = ink; g.lineWidth = 2.6; g.lineCap = 'round';
  g.beginPath(); g.arc(72, -16, 5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.beginPath(); g.arc(88, -2, 7, 0.1 * Math.PI, 0.7 * Math.PI); g.stroke();

  g.restore();
}

export function residencyTexture() {
  const c = cv(1536, 512), g = c.getContext('2d');
  g.fillStyle = '#f6eeda'; g.fillRect(0, 0, 1536, 512);

  // scattered background doodles: stars, paw prints, a coffee cup
  const r = rng(2026);
  g.fillStyle = 'rgba(224,160,80,0.4)';
  for (let i = 0; i < 26; i++) {
    const x = r() * 1536, y = r() * 512, s = 3 + r() * 5;
    g.save(); g.translate(x, y);
    if (r() > 0.5) {
      // four-point star
      g.beginPath();
      g.moveTo(0, -s * 2); g.quadraticCurveTo(0, 0, s * 2, 0);
      g.quadraticCurveTo(0, 0, 0, s * 2); g.quadraticCurveTo(0, 0, -s * 2, 0);
      g.quadraticCurveTo(0, 0, 0, -s * 2);
      g.fill();
    } else {
      g.beginPath(); g.ellipse(0, s, s * 1.3, s * 1.5, 0, 0, Math.PI * 2); g.fill();
      for (const [tx, ty] of [[-s * 1.2, -s], [0, -s * 1.6], [s * 1.2, -s]]) {
        g.beginPath(); g.arc(tx, ty, s * 0.55, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
  }
  // dotted flight trails behind each corgi
  g.strokeStyle = 'rgba(200,140,70,0.5)'; g.lineWidth = 3; g.setLineDash([2, 12]);
  for (const [x, y] of [[70, 300], [580, 290], [1090, 300]]) {
    g.beginPath();
    g.moveTo(x - 60, y + 30);
    g.bezierCurveTo(x, y - 40, x + 90, y + 40, x + 160, y - 20);
    g.stroke();
  }
  g.setLineDash([]);

  drawFlyingCorgi(g, 250, 230, 1.7, 'cape');
  drawFlyingCorgi(g, 762, 230, 1.7, 'coat');
  drawFlyingCorgi(g, 1274, 230, 1.7, 'beanie');

  // little plaque strip
  g.fillStyle = '#3a2c22';
  g.textAlign = 'center';
  g.font = 'bold 40px Helvetica, Arial, sans-serif';
  g.fillText('ARTIST IN RESIDENCE', 768, 468);
  return tex(c);
}

// The site's line, big enough to read across the room.
export function taglineTexture() {
  const c = cv(2048, 512), g = c.getContext('2d');
  g.fillStyle = PAL.orange; g.fillRect(0, 0, 2048, 512);
  g.fillStyle = '#fdf9f4';
  g.textAlign = 'center';
  g.font = 'bold 120px Helvetica, Arial, sans-serif';
  g.fillText("THE WORLD'S GREATEST WORK", 1024, 200);
  g.fillText("DOESN'T STOP @ 5:00", 1024, 348);
  g.font = 'bold 52px Helvetica, Arial, sans-serif';
  g.globalAlpha = 0.8;
  g.fillText('— A CAFE OPEN 24/7 FOR THE BUILDERS —', 1024, 452);
  g.globalAlpha = 1;
  return tex(c);
}

export function smoothiePosterTexture() {
  const c = cv(512, 700), g = c.getContext('2d');
  g.fillStyle = '#fdf6ec'; g.fillRect(0, 0, 512, 700);
  g.fillStyle = PAL.orange;
  g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = 'bold 52px Helvetica, Arial, sans-serif';
  g.fillText('CORGI SMOOTHIES', 256, 64);

  const cups = [
    ['THE FIDI', '#6b4a2f'], ['OCEAN BEACH', '#3f74c9'],
    ['THE SUNSET', '#d95c8a'], ['HAYES VALLEY', '#5f9a4a'],
  ];
  cups.forEach(([nm, col], i) => {
    const x = 128 + (i % 2) * 256, y = 210 + Math.floor(i / 2) * 240;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x - 52, y - 62); g.lineTo(x + 52, y - 62);
    g.lineTo(x + 38, y + 66); g.lineTo(x - 38, y + 66);
    g.closePath(); g.fill();
    // straw + lid
    g.fillStyle = '#2e2620';
    g.fillRect(x - 58, y - 74, 116, 12);
    g.save(); g.translate(x + 8, y - 74); g.rotate(-0.22); g.fillRect(0, -58, 12, 58); g.restore();
    g.fillStyle = '#2e2620';
    g.font = 'bold 30px Helvetica, Arial, sans-serif';
    g.fillText(nm, x, y + 112);
  });

  g.fillStyle = PAL.orange;
  g.font = 'bold 40px Helvetica, Arial, sans-serif';
  g.fillText('41g PROTEIN · $14', 256, 660);
  return tex(c);
}

/* ------------------------------------------------------------ paw prints --- */
export function pawTrailTexture() {
  const c = cv(256, 1024), g = c.getContext('2d');
  g.clearRect(0, 0, 256, 1024);
  g.fillStyle = 'rgba(122,86,52,0.42)';
  const paw = (x, y, a, s) => {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
    g.beginPath(); g.ellipse(0, 8, 13, 16, 0, 0, Math.PI * 2); g.fill();
    for (const [tx, ty] of [[-12, -12], [0, -18], [12, -12]]) {
      g.beginPath(); g.arc(tx, ty, 6, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  };
  const r = rng(51);
  let y = 40;
  let phase = 0;
  while (y < 990) {
    const wob = Math.sin(phase) * 46;
    paw(104 + wob, y, Math.sin(phase) * 0.5, 1);
    paw(152 + wob, y + 34, Math.sin(phase + 0.3) * 0.5, 1);
    y += 78; phase += 0.55;
  }
  return tex(c);
}

export function doormatTexture() {
  const c = cv(512, 320), g = c.getContext('2d');
  g.fillStyle = '#8a4a2b'; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = '#c98d4c'; g.lineWidth = 14;
  g.strokeRect(16, 16, 480, 288);
  g.fillStyle = '#f2d8b8';
  g.textAlign = 'center';
  g.font = 'bold 74px Helvetica, Arial, sans-serif';
  g.fillText('WIPE YOUR', 256, 132);
  g.fillText('PAWS', 256, 224);
  // bristle noise
  g.globalAlpha = 0.12; g.fillStyle = '#000';
  for (let i = 0; i < 300; i++) g.fillRect(Math.random() * 512, Math.random() * 320, 3, 3);
  g.globalAlpha = 1;
  return tex(c);
}

// Little neon corgi for the window — glows at the street.
export function neonCorgiTexture() {
  const c = cv(512, 384), g = c.getContext('2d');
  g.clearRect(0, 0, 512, 384);
  g.fillStyle = 'rgba(16,10,8,0.88)';
  g.fillRect(26, 26, 460, 332);
  g.shadowColor = '#ff9a3d'; g.shadowBlur = 26;
  g.strokeStyle = '#ffb15c'; g.lineWidth = 10; g.lineJoin = 'round';
  // outline corgi: body arc, ears, stub tail
  g.beginPath();
  g.moveTo(150, 240);
  g.bezierCurveTo(150, 180, 210, 160, 280, 164);
  g.lineTo(330, 150);
  g.lineTo(352, 108);
  g.lineTo(382, 146);
  g.lineTo(412, 112);
  g.lineTo(428, 156);
  g.bezierCurveTo(438, 190, 420, 232, 380, 244);
  g.closePath();
  g.stroke();
  for (const lx of [190, 240, 340, 388]) {
    g.beginPath(); g.moveTo(lx, 244); g.lineTo(lx, 288); g.stroke();
  }
  g.beginPath(); g.arc(140, 210, 16, 0, Math.PI * 2); g.stroke(); // tail nub
  g.shadowBlur = 18;
  g.strokeStyle = '#ff7b3d';
  g.font = 'bold 56px Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.shadowColor = '#ff6a2a';
  g.fillStyle = '#ffd9a8';
  g.fillText('OPEN 24/7', 288, 330);
  g.shadowBlur = 0;
  return tex(c);
}

/* ------------------------------------------------------------ wall art ---- */
export function artTexture(i) {
  const c = cv(512, 384), g = c.getContext('2d');
  const r = rng(1000 + i * 77);
  g.fillStyle = ['#f3e8dc', '#1f1a17', '#e8552f'][i % 3];
  g.fillRect(0, 0, 512, 384);
  const pal = ['#e8552f', '#f2b134', '#2b3d9e', '#f3e8dc', '#1f1a17'];
  if (i % 3 === 2) {
    drawCorgi(g, 300, 200, 2.0, '#fdf9f4');
    drawCup(g, 130, 200, 1.6, '#fdf9f4');
  } else {
    for (let k = 0; k < 9; k++) {
      g.fillStyle = pal[(r() * pal.length) | 0];
      g.globalAlpha = 0.9;
      if (r() > 0.5) {
        g.beginPath();
        g.arc(60 + r() * 400, 60 + r() * 260, 25 + r() * 80, 0, Math.PI * 2);
        g.fill();
      } else {
        g.save();
        g.translate(60 + r() * 400, 60 + r() * 260);
        g.rotate(r() * 3);
        g.fillRect(-60, -20, 40 + r() * 130, 16 + r() * 40);
        g.restore();
      }
    }
  }
  g.globalAlpha = 1;
  return tex(c);
}

export function clockFaceTexture() {
  const c = cv(256, 256), g = c.getContext('2d');
  g.fillStyle = '#fbf6f0';
  g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#241d1a'; g.lineWidth = 8;
  g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#241d1a';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const big = i % 3 === 0;
    g.save();
    g.translate(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100);
    g.rotate(a);
    g.fillRect(-3, -(big ? 12 : 7), 6, big ? 24 : 14);
    g.restore();
  }
  g.fillStyle = PAL.orange;
  g.font = 'bold 20px Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('24/7', 128, 186);
  return tex(c);
}

/* ------------------------------------------------------- laptop screens ---- */
export function screenTexture(variant) {
  const c = cv(256, 160), g = c.getContext('2d');
  g.fillStyle = variant % 3 === 0 ? '#12161f' : '#0e1116';
  g.fillRect(0, 0, 256, 160);
  const r = rng(variant * 7717 + 3);
  const cols = ['#7fd6a5', '#e8a05c', '#8fb8ff', '#d98cc4', '#e0e0e0'];
  for (let i = 0; i < 16; i++) {
    g.fillStyle = cols[(r() * cols.length) | 0];
    g.globalAlpha = 0.55 + r() * 0.45;
    g.fillRect(12 + (r() * 30 | 0), 12 + i * 9, 20 + r() * 190, 4);
  }
  g.globalAlpha = 1;
  return tex(c);
}

/* ---------------------------------------------------------- name labels ---- */
export function labelSprite(text, color = '#ffffff', sub = '') {
  const pad = 18;
  const c = cv(512, sub ? 160 : 112), g = c.getContext('2d');
  g.font = 'bold 54px Helvetica, Arial, sans-serif';
  const nameW = g.measureText(text).width;
  // shrink the subtitle until it fits the sprite
  let subSize = 30;
  if (sub) {
    g.font = `${subSize}px Helvetica, Arial, sans-serif`;
    while (g.measureText(sub).width > 452 && subSize > 13) {
      subSize -= 1;
      g.font = `${subSize}px Helvetica, Arial, sans-serif`;
    }
  }
  const subW = sub ? g.measureText(sub).width : 0;
  g.font = 'bold 54px Helvetica, Arial, sans-serif';
  const w = Math.max(nameW, subW) + pad * 2;
  g.fillStyle = 'rgba(18,14,12,0.72)';
  const bx = 256 - w / 2;
  g.beginPath();
  const rr = 16, bh = sub ? 116 : 76;
  g.moveTo(bx + rr, 12); g.lineTo(bx + w - rr, 12);
  g.quadraticCurveTo(bx + w, 12, bx + w, 12 + rr);
  g.lineTo(bx + w, 12 + bh - rr);
  g.quadraticCurveTo(bx + w, 12 + bh, bx + w - rr, 12 + bh);
  g.lineTo(bx + rr, 12 + bh);
  g.quadraticCurveTo(bx, 12 + bh, bx, 12 + bh - rr);
  g.lineTo(bx, 12 + rr);
  g.quadraticCurveTo(bx, 12, bx + rr, 12);
  g.fill();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.font = 'bold 54px Helvetica, Arial, sans-serif';
  g.fillText(text, 256, 70);
  if (sub) {
    g.fillStyle = 'rgba(255,255,255,0.62)';
    g.font = `${subSize}px Helvetica, Arial, sans-serif`;
    g.fillText(sub, 256, 112);
  }
  const t = tex(c);
  const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, opacity: 0.95 });
  const s = new THREE.Sprite(m);
  s.scale.set(1.12, sub ? 0.35 : 0.245, 1);
  s.renderOrder = 900;
  return s;
}

/* ------------------------------------------------------- bubble sprites ---- */
export function bubbleSprite(text) {
  const c = cv(640, 200), g = c.getContext('2d');
  g.font = '28px Helvetica, Arial, sans-serif';
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if (g.measureText(line + w).width > 560) { lines.push(line); line = ''; }
    line += w + ' ';
  }
  lines.push(line);
  const h = 34 + lines.length * 34;
  g.fillStyle = 'rgba(253,249,244,0.94)';
  const bw = 600, bx = 20, by = (200 - h) / 2;
  g.beginPath();
  const rr = 18;
  g.moveTo(bx + rr, by); g.lineTo(bx + bw - rr, by);
  g.quadraticCurveTo(bx + bw, by, bx + bw, by + rr);
  g.lineTo(bx + bw, by + h - rr);
  g.quadraticCurveTo(bx + bw, by + h, bx + bw - rr, by + h);
  g.lineTo(bx + rr, by + h);
  g.quadraticCurveTo(bx, by + h, bx, by + h - rr);
  g.lineTo(bx, by + rr);
  g.quadraticCurveTo(bx, by, bx + rr, by);
  g.fill();
  g.fillStyle = '#2a221d';
  g.textAlign = 'center';
  lines.forEach((l, i) => g.fillText(l.trim(), 320, by + 40 + i * 34));
  const t = tex(c);
  const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false });
  const s = new THREE.Sprite(m);
  s.scale.set(2.4, 0.75, 1);
  s.renderOrder = 950;
  return s;
}

/* ---------------------------------------------------------- chalkboards ---- */
export function chalkTexture(lines, doodle) {
  const c = cv(512, 640), g = c.getContext('2d');
  g.fillStyle = '#26312c'; g.fillRect(0, 0, 512, 640);
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 5;
  g.strokeRect(22, 22, 468, 596);
  g.fillStyle = '#f4f0e4';
  g.textAlign = 'center';
  lines.forEach((t, i) => {
    g.font = `bold ${i === 0 ? 52 : 34}px Helvetica, Arial, sans-serif`;
    g.fillText(t, 256, 110 + i * 60);
  });
  if (doodle) drawCorgi(g, 300, 470, 1.5, 'rgba(244,240,228,0.85)');
  // chalk smudge
  g.globalAlpha = 0.06; g.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 512, Math.random() * 640, 40, 3);
  g.globalAlpha = 1;
  return tex(c);
}

export function counterSignTexture() {
  const c = cv(512, 256), g = c.getContext('2d');
  g.fillStyle = '#26312c'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 4;
  g.strokeRect(16, 16, 480, 224);
  g.fillStyle = '#f4f0e4';
  g.textAlign = 'center';
  g.font = 'bold 62px Helvetica, Arial, sans-serif';
  g.fillText('NO CORGIS', 256, 110);
  g.font = 'bold 40px Helvetica, Arial, sans-serif';
  g.fillText('WE KNOW.', 256, 178);
  return tex(c);
}

/* ------------------------------------------------------ steam and motes ---- */
export function puffTexture() {
  const c = cv(64, 64), g = c.getContext('2d');
  // chunky pixel puff, drawn on a 16x16 grid then scaled up
  const s = 4;
  const cells = [
    [6, 2], [7, 2], [8, 2], [9, 2],
    [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3],
    [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],
    [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],
    [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
    [6, 7], [7, 7], [8, 7], [9, 7],
  ];
  g.fillStyle = '#ffffff';
  cells.forEach(([x, y]) => g.fillRect(x * s, y * s, s, s));
  const t = tex(c);
  return t;
}

/* ---------------------------------------------------- the alley outside ---- */
// The orange road paint on Claude Lane.
export function roadPaintTexture() {
  const c = cv(1024, 512), g = c.getContext('2d');
  g.fillStyle = '#d9552c'; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = '#fbf4ea'; g.lineWidth = 12;
  g.strokeRect(22, 22, 980, 468);

  g.save();
  g.translate(512, 250);
  g.fillStyle = 'rgba(251,244,234,0.95)';
  g.textAlign = 'center';
  g.font = 'bold 150px Helvetica, Arial, sans-serif';
  g.fillText('CORGI', 0, -30);
  g.font = 'bold 92px Helvetica, Arial, sans-serif';
  g.fillText('CAFE  24/7', 0, 78);
  g.restore();

  drawCorgi(g, 170, 400, 1.05, 'rgba(251,244,234,0.9)');
  drawCorgi(g, 860, 400, 1.05, 'rgba(251,244,234,0.9)');
  // worn asphalt showing through
  g.globalAlpha = 0.14; g.fillStyle = '#2c2c30';
  for (let i = 0; i < 60; i++) {
    g.fillRect(Math.random() * 1024, Math.random() * 512, 6 + Math.random() * 60, 3 + Math.random() * 12);
  }
  g.globalAlpha = 1;
  return tex(c);
}

// The building across the lane: sash windows, fire escapes, a cafe awning.
export function facadeTexture() {
  const c = cv(1024, 1024), g = c.getContext('2d');
  g.fillStyle = '#b9a08a'; g.fillRect(0, 0, 1024, 1024);
  // stone banding
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < 1024; y += 64) g.fillRect(0, y, 1024, 3);

  // ground floor: dark shopfronts with a red awning
  g.fillStyle = '#3a2a24'; g.fillRect(0, 760, 1024, 264);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = '#14161c'; g.fillRect(48 + i * 250, 800, 180, 180);
    g.fillStyle = 'rgba(255,196,120,0.30)'; g.fillRect(48 + i * 250, 800, 180, 180);
  }
  g.fillStyle = '#8e2c22';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(30 + i * 250, 770); g.lineTo(250 + i * 250, 770);
    g.lineTo(238 + i * 250, 806); g.lineTo(42 + i * 250, 806);
    g.closePath(); g.fill();
  }

  // upper sash windows, some lit
  const r = rng(777);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 64 + col * 190, y = 90 + row * 170;
      g.fillStyle = '#6d5c4c'; g.fillRect(x - 8, y - 8, 136, 156);
      const lit = r() > 0.55;
      g.fillStyle = lit ? '#ffcf8a' : '#1b2030';
      g.fillRect(x, y, 120, 140);
      g.strokeStyle = '#3a3128'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x, y + 70); g.lineTo(x + 120, y + 70); g.stroke();
      g.beginPath(); g.moveTo(x + 60, y); g.lineTo(x + 60, y + 140); g.stroke();
    }
  }

  // fire escape: verticals, landings, diagonal stair
  g.strokeStyle = '#20242a'; g.lineWidth = 7;
  for (const x of [40, 980]) { g.beginPath(); g.moveTo(x, 60); g.lineTo(x, 780); g.stroke(); }
  for (let row = 0; row < 4; row++) {
    const y = 230 + row * 170;
    g.fillStyle = '#20242a'; g.fillRect(30, y, 960, 9);
    g.lineWidth = 4;
    for (let x = 40; x < 990; x += 34) { g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x, y); g.stroke(); }
    g.lineWidth = 8;
    g.beginPath(); g.moveTo(180, y); g.lineTo(420, y + 170); g.stroke();
  }
  return tex(c);
}

// A generic pink neon sign across the lane.
export function neonTexture() {
  const c = cv(128, 448), g = c.getContext('2d');
  g.clearRect(0, 0, 128, 448);
  g.fillStyle = 'rgba(20,14,18,0.9)';
  g.fillRect(28, 20, 72, 408);
  g.strokeStyle = '#ff4d6a'; g.lineWidth = 7;
  g.strokeRect(38, 34, 52, 380);
  g.fillStyle = '#ff7d95';
  g.textAlign = 'center';
  g.font = 'bold 44px Helvetica, Arial, sans-serif';
  'OPEN'.split('').forEach((ch, i) => g.fillText(ch, 64, 110 + i * 68));
  g.fillStyle = '#ffd0da';
  g.font = 'bold 26px Helvetica, Arial, sans-serif';
  g.fillText('BAR', 64, 390);
  return tex(c);
}

/* ------------------------------------------------------------- skyline ---- */
// Seen through the far windows / above the alley wall.
export function skylineTexture(night) {
  const c = cv(1024, 512), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  if (night) {
    grad.addColorStop(0, '#0a1020'); grad.addColorStop(1, '#1b2438');
  } else {
    grad.addColorStop(0, '#8fbce6'); grad.addColorStop(1, '#f2c69a');
  }
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  const r = rng(4242);
  for (let i = 0; i < 22; i++) {
    const w = 50 + r() * 110, x = r() * 1024, h = 120 + r() * 320;
    g.fillStyle = night ? '#12182a' : '#c9c2bd';
    g.fillRect(x, 512 - h, w, h);
    if (night) {
      for (let yy = 512 - h + 14; yy < 500; yy += 22) {
        for (let xx = x + 8; xx < x + w - 10; xx += 18) {
          if (r() > 0.55) { g.fillStyle = 'rgba(255,214,140,0.75)'; g.fillRect(xx, yy, 7, 10); }
        }
      }
    }
  }
  return tex(c);
}

export { tex as _tex };
