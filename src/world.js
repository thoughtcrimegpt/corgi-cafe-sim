// The cafe itself: geometry, colliders, seats, props.
import * as THREE from '../vendor/three.module.min.js?v=21';
import * as T from './textures.js?v=21';

export const ROOM = { x0: 0, x1: 25, z0: 0, z1: 10.5, h: 3.5 };

const C = {
  wall:   0xf6e3cb,
  wall2:  0xecd2b4,
  ceil:   0xfdf1e2,
  wood:   0xe0a865,
  wood2:  0xc98d4c,
  chair:  0xff7a3d,
  chair2: 0xe85520,
  table:  0xfffaf2,
  dark:   0x3a2b26,
  metal:  0x9a9aa2,
  plant:  0x5f9a4a,
};

const M = {};
function mat(name, opts) {
  if (!M[name]) M[name] = new THREE.MeshLambertMaterial(opts);
  return M[name];
}

export function buildCafe(scene) {
  const colliders = [];   // {x0,z0,x1,z1}
  const seats = [];       // {pos:Vector3, yaw, table:Vector3, taken:false}
  const props = [];       // things that need per-frame updates
  const root = new THREE.Group();
  scene.add(root);

  const box = (w, h, d, m, x, y, z, ry = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    root.add(mesh);
    return mesh;
  };
  const collide = (x, z, w, d) => colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });

  /* ------------------------------------------------------------- shell --- */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.x1, ROOM.z1),
    mat('floor', { color: C.wood })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(ROOM.x1 / 2, 0, ROOM.z1 / 2);
  floor.receiveShadow = true;
  root.add(floor);

  // plank seams
  const seam = mat('seam', { color: C.wood2 });
  for (let z = 0.6; z < ROOM.z1; z += 1.2) {
    box(ROOM.x1, 0.005, 0.03, seam, ROOM.x1 / 2, 0.004, z);
  }

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x1, ROOM.z1), mat('ceil', { color: C.ceil }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(ROOM.x1 / 2, ROOM.h, ROOM.z1 / 2);
  root.add(ceil);

  const wallMat = mat('wall', { color: C.wall });
  // north wall (back)
  box(ROOM.x1, ROOM.h, 0.3, wallMat, ROOM.x1 / 2, ROOM.h / 2, ROOM.z1 + 0.15);
  // east wall
  box(0.3, ROOM.h, ROOM.z1, wallMat, ROOM.x1 + 0.15, ROOM.h / 2, ROOM.z1 / 2);
  // west wall with entry gap (door at z 4.4..6.4)
  box(0.3, ROOM.h, 4.4, wallMat, -0.15, ROOM.h / 2, 2.2);
  box(0.3, ROOM.h, 4.1, wallMat, -0.15, ROOM.h / 2, 8.45);
  // south wall: solid up to x=4, then glazing
  box(4, ROOM.h, 0.3, wallMat, 2, ROOM.h / 2, -0.15);

  colliders.push({ x0: -0.6, x1: 0.05, z0: -1, z1: 4.4 });
  colliders.push({ x0: -0.6, x1: 0.05, z0: 6.4, z1: 11.5 });
  colliders.push({ x0: -1, x1: 26, z0: ROOM.z1 - 0.02, z1: ROOM.z1 + 1 });
  colliders.push({ x0: ROOM.x1 - 0.02, x1: ROOM.x1 + 1, z0: -1, z1: 11.5 });
  colliders.push({ x0: -1, x1: 26, z0: -1, z1: 0.28 });

  /* ------------------------------------------------- glazing + the alley --- */
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xbcd0d8, transparent: true, opacity: 0.16, roughness: 0.05,
    metalness: 0, side: THREE.DoubleSide,
  });
  const frame = mat('frame', { color: 0x6a6f74 });

  // sill + head + mullions along the south face
  box(21, 0.9, 0.22, mat('sill', { color: C.wall2 }), 14.5, 0.45, 0.05);
  box(21, 0.35, 0.26, wallMat, 14.5, ROOM.h - 0.17, 0.05);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(21, 2.15), glass);
  pane.position.set(14.5, 1.97, 0.02);
  root.add(pane);
  for (let x = 4.5; x <= 25; x += 2.4) box(0.09, 2.2, 0.16, frame, x, 1.97, 0.04);
  // structural piers between windows (as in the room photo)
  for (const px of [8.6, 14.6, 20.6]) {
    box(0.62, ROOM.h, 0.5, mat('pier', { color: C.wall2 }), px, ROOM.h / 2, 0.25);
    collide(px, 0.25, 0.62, 0.5);
  }

  // alley: ground, mural wall opposite, sky
  const alley = new THREE.Mesh(new THREE.PlaneGeometry(60, 26), mat('alley', { color: 0x3a3a3e }));
  alley.rotation.x = -Math.PI / 2;
  alley.position.set(12, -0.12, -8);
  root.add(alley);

  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 9),
    new THREE.MeshBasicMaterial({ map: T.muralTexture(), color: 0x8c8c8c })
  );
  mural.position.set(13, 4.2, -7.5);
  root.add(mural);
  // upper storeys of the opposite building
  box(46, 12, 1.2, mat('bldg', { color: 0x6d6257 }), 13, 14.5, -7.9);

  const skyNight = T.skylineTexture(true);
  const skyDawn = T.skylineTexture(false);
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 46),
    new THREE.MeshBasicMaterial({ map: skyNight })
  );
  sky.position.set(12, 14, -24);
  root.add(sky);

  /* ------------------------------------------------------ entrance area --- */
  // glass door + the exterior banner, seen on the way in
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.5), glass);
  door.rotation.y = Math.PI / 2;
  door.position.set(-0.02, 1.25, 5.4);
  root.add(door);

  const stoop = box(2.4, 0.15, 2.6, mat('stoop', { color: 0x9a9187 }), -1.4, -0.07, 5.4);
  for (let i = 0; i < 3; i++) box(2.4, 0.06, 0.34, mat('step', { color: 0x8f877d }), -2.7 - i * 0.34, -0.1 - i * 0.14, 5.4);

  /* ------------------------------------------- CLAUDE LANE, outside the door */
  // asphalt
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(34, 44), mat('lane', { color: 0x33333a }));
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(-16, -0.62, 5);
  root.add(lane);

  // the orange street graphic painted down the middle of the lane
  const paint = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 4.6),
    new THREE.MeshBasicMaterial({ map: T.roadPaintTexture(), color: 0x8f8f8f })
  );
  paint.rotation.x = -Math.PI / 2;
  paint.rotation.z = Math.PI / 2;
  paint.position.set(-7.5, -0.6, 5.2);
  root.add(paint);

  // the building across the lane — self-lit so it reads at 3am
  const facadeMat = new THREE.MeshBasicMaterial({ map: T.facadeTexture(), color: 0x9d9d9d });
  // kept low so the fire escapes and sash windows land inside the doorway view
  const across = new THREE.Mesh(new THREE.PlaneGeometry(40, 9.4), facadeMat);
  across.rotation.y = Math.PI / 2;
  across.position.set(-12.5, 4.1, 5);
  root.add(across);
  box(3, 18, 40, mat('acrossmass', { color: 0x584c42 }), -14.2, 8, 5);

  // our own building continuing above the door, same side of the lane
  const ourFace = new THREE.Mesh(new THREE.PlaneGeometry(40, 9.4), facadeMat);
  ourFace.rotation.y = -Math.PI / 2;
  ourFace.position.set(-0.02, 4.3, 5);
  root.add(ourFace);

  // lit shopfronts opposite, and a neon sign — the alley is never fully dark
  for (let i = 0; i < 4; i++) {
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 1.9),
      new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffc98a : 0xf0b070 })
    );
    win.rotation.y = Math.PI / 2;
    win.position.set(-12.44, 1.5, -1.5 + i * 3.4);
    root.add(win);
    const spill = new THREE.PointLight(0xffb877, 0.9, 12, 2);
    spill.position.set(-11.4, 1.8, -1.5 + i * 3.4);
    scene.add(spill);
  }
  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 1.7),
    new THREE.MeshBasicMaterial({ map: T.neonTexture(), transparent: true })
  );
  neon.rotation.y = Math.PI / 2;
  neon.position.set(-12.3, 3.5, 3.2);
  root.add(neon);
  const neonGlow = new THREE.PointLight(0xff4d6a, 1.4, 9, 2);
  neonGlow.position.set(-11.8, 3.5, 3.2);
  scene.add(neonGlow);

  // low fog rolling through the lane
  const fogTex = T.puffTexture();
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Sprite(new THREE.SpriteMaterial({
      map: fogTex, transparent: true, opacity: 0.09, depthWrite: false, color: 0xcfd8e8,
    }));
    f.scale.setScalar(5 + Math.random() * 5);
    f.position.set(-4 - Math.random() * 12, 1.2 + Math.random() * 2.2, -2 + Math.random() * 14);
    root.add(f);
  }

  // string lights across the alley (they hang over Claude Ln)
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd79a });
  const wireMat = mat('wire', { color: 0x18181c });
  for (let s = 0; s < 4; s++) {
    const z = 1.4 + s * 2.6;
    const span = 13.2, sag = 0.85;
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      pts.push(new THREE.Vector3(-0.4 - u * span, 5.2 - Math.sin(u * Math.PI) * sag, z));
    }
    const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.018, 4), wireMat);
    root.add(wire);
    for (let i = 1; i < 12; i += 2) {
      const p = pts[i];
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), bulbMat);
      b.position.set(p.x, p.y - 0.08, p.z);
      root.add(b);
    }
  }
  const alleyGlow = new THREE.PointLight(0xffbd7a, 2.2, 26, 2);
  alleyGlow.position.set(-6, 4.4, 5.2);
  scene.add(alleyGlow);

  // FiDi towers at the end of the lane
  const towerNight = T.skylineTexture(true), towerDawn = T.skylineTexture(false);
  const towers = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 40),
    new THREE.MeshBasicMaterial({ map: towerNight })
  );
  towers.rotation.y = Math.PI / 2;
  towers.position.set(-32, 15, 5);
  root.add(towers);
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.53),
    new THREE.MeshBasicMaterial({ map: T.signTexture() })
  );
  banner.rotation.y = Math.PI / 2;
  banner.position.set(-1.75, 3.75, 5.4);
  root.add(banner);

  const blade = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 1.65),
    new THREE.MeshBasicMaterial({ map: T.bladeSignTexture(), side: THREE.DoubleSide })
  );
  blade.position.set(-2.6, 3.2, 4.2);
  root.add(blade);

  /* --------------------------------------------------------- the counter --- */
  const CX0 = 16.6, CX1 = 24.2, CZ0 = 8.15, CZ1 = 9.35;
  const counterTop = box(CX1 - CX0, 0.09, CZ1 - CZ0, mat('ctop', { color: 0xf1ece4 }),
    (CX0 + CX1) / 2, 1.06, (CZ0 + CZ1) / 2);
  box(CX1 - CX0, 1.02, CZ1 - CZ0 - 0.1, mat('cbody', { color: C.chair2 }),
    (CX0 + CX1) / 2, 0.51, (CZ0 + CZ1) / 2);
  collide((CX0 + CX1) / 2, (CZ0 + CZ1) / 2, CX1 - CX0, CZ1 - CZ0);

  // back bar + espresso machine + cup stacks
  box(7.6, 1.0, 0.55, mat('backbar', { color: 0xdcd2c6 }), 20.4, 0.5, 10.0);
  collide(20.4, 10.0, 7.6, 0.55);
  const espresso = box(1.5, 0.62, 0.5, mat('esp', { color: C.metal }), 21.6, 1.31, 9.98);
  box(1.6, 0.08, 0.55, mat('esp2', { color: 0x55585c }), 21.6, 1.66, 9.98);
  for (let i = 0; i < 3; i++) box(0.1, 0.26, 0.1, mat('esp3', { color: 0x3a3d40 }), 21.1 + i * 0.5, 1.05, 9.72);

  const menuBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.0),
    new THREE.MeshBasicMaterial({ map: T.menuBoardTexture() })
  );
  menuBoard.position.set(20.6, 2.5, 10.32);
  menuBoard.rotation.y = Math.PI;
  root.add(menuBoard);

  // pastry case
  const caseMat = new THREE.MeshPhysicalMaterial({ color: 0xdff0f4, transparent: true, opacity: 0.22, roughness: 0.06 });
  const pcase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.7), caseMat);
  pcase.position.set(17.6, 1.36, 8.75);
  root.add(pcase);
  for (let i = 0; i < 4; i++) {
    box(0.22, 0.1, 0.16, mat('pastry', { color: 0xc98f4e }), 17.1 + i * 0.34, 1.2, 8.75);
  }

  // cup stacks on the counter
  for (let i = 0; i < 3; i++) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.038, 0.13, 10),
      mat('cup', { color: 0xfaf6f0 })
    );
    cup.position.set(23.2, 1.17, 8.45 + i * 0.3);
    root.add(cup);
  }

  // stacked boxes of cups in the corner (as in the photo)
  const boxTex = T.cupBoxTexture();
  const boxMat = new THREE.MeshLambertMaterial({ map: boxTex });
  for (let i = 0; i < 3; i++) {
    box(0.85, 0.8, 0.85, boxMat, 24.2, 0.4 + i * 0.82, 1.3);
  }
  collide(24.2, 1.3, 0.85, 0.85);

  /* -------------------------------------------------------- the banquette --- */
  const benchMat = mat('bench', { color: C.chair });
  box(12.4, 0.45, 0.72, benchMat, 8.8, 0.225, 10.05);
  box(12.4, 0.5, 0.14, mat('benchback', { color: C.chair2 }), 8.8, 0.68, 10.37);
  // wood cap rail + picture ledge above the banquette
  box(12.6, 0.07, 0.24, mat('rail', { color: C.wood2 }), 8.8, 0.96, 10.32);
  box(12.6, 0.06, 0.2, mat('rail2', { color: C.wood2 }), 8.8, 1.72, 10.33);
  collide(8.8, 10.1, 12.4, 0.85);

  // framed corgi career posters on the back wall (a riff on the site's footer corgis)
  [3.6, 6.6, 9.8, 13.0].forEach((x, i) => {
    box(0.86, 1.06, 0.05, mat('frame' + i, { color: i % 2 ? 0x2a2320 : 0xd8cabb }), x, 2.35, 10.31);
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.95),
      new THREE.MeshBasicMaterial({ map: T.jobPosterTexture(i) })
    );
    art.position.set(x, 2.35, 10.27);
    art.rotation.y = Math.PI;
    root.add(art);
  });

  // the tagline, painted big on the east wall
  const tagline = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 1.7),
    new THREE.MeshBasicMaterial({ map: T.taglineTexture() })
  );
  tagline.rotation.y = -Math.PI / 2;
  tagline.position.set(24.83, 2.3, 4.6);
  root.add(tagline);

  /* ---- THE WALL: a cork board by the door where players leave proof ---- */
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 1024; wallCanvas.height = 704;
  const wallTex = new THREE.CanvasTexture(wallCanvas);
  wallTex.colorSpace = THREE.SRGBColorSpace;
  wallTex.magFilter = THREE.NearestFilter;
  const wallBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(1.95, 1.34),
    new THREE.MeshBasicMaterial({ map: wallTex, color: 0xcccccc })
  );
  wallBoard.rotation.y = Math.PI / 2;
  wallBoard.position.set(0.18, 1.72, 2.55);
  root.add(wallBoard);
  box(0.06, 1.46, 2.08, mat('wallframe', { color: 0x5c4630 }), 0.13, 1.72, 2.55);
  const wallSpot = new THREE.PointLight(0xffe0b8, 0.8, 4.5, 2);
  wallSpot.position.set(1.3, 2.6, 2.55);
  scene.add(wallSpot);

  // items: [{h, p, stat}] — all strings prepared by the caller
  function drawWall(items) {
    const g = wallCanvas.getContext('2d');
    g.fillStyle = '#9c7a52'; g.fillRect(0, 0, 1024, 704);
    // cork speckle
    g.globalAlpha = 0.14; g.fillStyle = '#6b532f';
    for (let i = 0; i < 400; i++) g.fillRect(Math.random() * 1024, Math.random() * 704, 4, 3);
    g.globalAlpha = 1;
    g.fillStyle = '#2e2620';
    g.fillRect(0, 0, 1024, 86);
    g.fillStyle = '#f4e8d8';
    g.textAlign = 'center';
    g.font = 'bold 46px Helvetica, Arial, sans-serif';
    g.fillText('THE WALL', 512, 44);
    g.font = 'bold 22px Helvetica, Arial, sans-serif';
    g.globalAlpha = 0.7;
    g.fillText('LEAVE PROOF · [E] TO READ', 512, 72);
    g.globalAlpha = 1;

    if (!items.length) {
      g.fillStyle = 'rgba(46,38,32,0.75)';
      g.font = 'bold 30px Helvetica, Arial, sans-serif';
      g.fillText('no notes yet. be first.', 512, 380);
    }
    items.slice(0, 6).forEach((n, i) => {
      const cx = 30 + (i % 2) * 500, cy = 112 + Math.floor(i / 2) * 194;
      g.save();
      g.translate(cx + 232, cy + 86);
      g.rotate((i % 3 - 1) * 0.035);
      g.translate(-232, -86);
      g.fillStyle = '#fdf6ea';
      g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 12; g.shadowOffsetY = 5;
      g.fillRect(0, 0, 464, 172);
      g.shadowBlur = 0; g.shadowOffsetY = 0;
      g.fillStyle = '#e8552f';
      g.beginPath(); g.arc(232, 14, 8, 0, Math.PI * 2); g.fill();
      g.textAlign = 'left';
      g.fillStyle = '#c2491c';
      g.font = 'bold 27px Helvetica, Arial, sans-serif';
      g.fillText('@' + n.h, 22, 52);
      g.fillStyle = '#33291f';
      g.font = 'bold 25px Helvetica, Arial, sans-serif';
      // wrap the phrase to two lines
      const words = n.p.split(' ');
      let line = '', ly = 92;
      for (const w of words) {
        if (g.measureText(line + w).width > 420 && line) {
          g.fillText(line.trim(), 22, ly); ly += 32; line = '';
          if (ly > 124) break;
        }
        line += w + ' ';
      }
      if (ly <= 124) g.fillText(line.trim(), 22, ly);
      g.fillStyle = '#8a7c68';
      g.font = 'bold 19px Helvetica, Arial, sans-serif';
      g.fillText(n.stat, 22, 154);
      g.restore();
    });
    wallTex.needsUpdate = true;
  }
  drawWall([]);

  // Artist in Residence triptych — three flying corgis on the west wall,
  // first thing you can turn and see after walking in
  box(0.05, 1.12, 2.84, mat('resframe', { color: 0x2a2320 }), 0.14, 1.85, 8.45);
  const residency = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 0.9),
    new THREE.MeshBasicMaterial({ map: T.residencyTexture() })
  );
  residency.rotation.y = Math.PI / 2;
  residency.position.set(0.18, 1.85, 8.45);
  root.add(residency);
  const resLight = new THREE.PointLight(0xffe0b8, 0.9, 5, 2);
  resLight.position.set(1.2, 2.5, 8.45);
  scene.add(resLight);

  // smoothie poster beside the menu board
  const smoothie = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 1.34),
    new THREE.MeshBasicMaterial({ map: T.smoothiePosterTexture() })
  );
  smoothie.rotation.y = Math.PI;
  smoothie.position.set(16.6, 2.3, 10.31);
  root.add(smoothie);

  // paw prints wandering in from the door — nobody has ever seen the dog down here
  const pawMat = new THREE.MeshBasicMaterial({ map: T.pawTrailTexture(), transparent: true, depthWrite: false });
  const paw1 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 4.2), pawMat);
  paw1.rotation.x = -Math.PI / 2;
  paw1.rotation.z = Math.PI / 2;
  paw1.position.set(3.6, 0.012, 5.15);
  root.add(paw1);
  const paw2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 3.4), pawMat);
  paw2.rotation.x = -Math.PI / 2;
  paw2.rotation.z = Math.PI * 0.72;
  paw2.position.set(7.2, 0.012, 6.3);
  root.add(paw2);

  // doormat
  const matD = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.94),
    new THREE.MeshLambertMaterial({ map: T.doormatTexture() })
  );
  matD.rotation.x = -Math.PI / 2;
  matD.rotation.z = Math.PI / 2;
  matD.position.set(1.05, 0.011, 5.4);
  root.add(matD);

  // neon corgi glowing in the window bay by the door
  const neonC = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.9),
    new THREE.MeshBasicMaterial({ map: T.neonCorgiTexture(), transparent: true, side: THREE.DoubleSide })
  );
  neonC.position.set(5.9, 1.85, 0.16);
  root.add(neonC);
  const neonCGlow = new THREE.PointLight(0xff9a4a, 1.1, 6, 2);
  neonCGlow.position.set(5.9, 1.85, 0.8);
  scene.add(neonCGlow);

  // the clock — it is always 24/7 o'clock
  const clockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 24), mat('clockb', { color: 0x2a2320 }));
  clockBody.rotation.x = Math.PI / 2;
  clockBody.position.set(16.0, 2.45, 10.3);
  root.add(clockBody);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 24),
    new THREE.MeshBasicMaterial({ map: T.clockFaceTexture() })
  );
  face.position.set(16.0, 2.45, 10.25);
  face.rotation.y = Math.PI;
  root.add(face);
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.15, 0.012), mat('hand', { color: 0x241d1a }));
  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.22, 0.012), mat('hand', { color: 0x241d1a }));
  hourHand.position.set(16.0, 2.45, 10.22);
  minHand.position.set(16.0, 2.45, 10.21);
  hourHand.geometry.translate(0, 0.075, 0);
  minHand.geometry.translate(0, 0.11, 0);
  root.add(hourHand, minHand);

  /* -------------------------------------------------- tables + chairs ------ */
  const tableTop = new THREE.BoxGeometry(1.15, 0.06, 0.72);
  const tableMat = mat('table', { color: C.table });
  const legMat = mat('leg', { color: C.dark });

  function chair(x, z, yaw, seatOut) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.46), mat('chairseat', { color: C.chair }));
    seat.position.y = 0.44; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.1), mat('chairback', { color: C.chair2 }));
    back.position.set(0, 0.73, -0.19); back.rotation.x = -0.11; g.add(back);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 6), legMat);
      l.position.set(lx, 0.22, lz); g.add(l);
    }
    root.add(g);
    if (seatOut) seatOut.push(g);
    return g;
  }

  function table(x, z, w = 1.15, d = 0.72) {
    const t = new THREE.Mesh(w === 1.15 ? tableTop : new THREE.BoxGeometry(w, 0.06, d), tableMat);
    t.position.set(x, 0.75, z);
    root.add(t);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), legMat);
    ped.position.set(x, 0.36, z); root.add(ped);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.04, 12), legMat);
    base.position.set(x, 0.02, z); root.add(base);
    // collider deliberately smaller than the tabletop — with the player's
    // radius added back it lands right at the visible edge, no phantom walls
    collide(x, z, w * 0.78, d * 0.78);
    return t;
  }

  // laptop prop; screens glow
  let screenN = 0;
  function laptop(x, z, yaw) {
    const g = new THREE.Group();
    g.position.set(x, 0.78, z);
    g.rotation.y = yaw;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.24), mat('lapbase', { color: 0x9ea3a8 }));
    g.add(base);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.23, 0.012), mat('laplid', { color: 0x8f949a }));
    lid.position.set(0, 0.11, -0.12); lid.rotation.x = 0.28; g.add(lid);
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.31, 0.2),
      new THREE.MeshBasicMaterial({ map: T.screenTexture(screenN++) })
    );
    scr.position.set(0, 0.11, -0.113); scr.rotation.x = 0.28; g.add(scr);
    root.add(g);
    return g;
  }

  function cupProp(x, z, color = 0xfaf6f0) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.12, 10), mat('cupp' + color, { color }));
    c.position.set(x, 0.84, z);
    root.add(c);
    return c;
  }

  const TABLES = [];
  function makeSeat(x, z, yaw, tx, tz) {
    seats.push({
      pos: new THREE.Vector3(x, 0, z), yaw,
      table: new THREE.Vector3(tx, 0.78, tz), taken: false,
    });
  }

  // window row
  for (const x of [5.2, 11.4, 17.4, 23.0]) {
    table(x, 2.15);
    TABLES.push([x, 2.15]);
    chair(x - 0.05, 2.95, Math.PI);
    makeSeat(x - 0.05, 2.95, Math.PI, x, 2.15);
    chair(x - 0.05, 1.35, 0);
    makeSeat(x - 0.05, 1.35, 0, x, 2.15);
  }
  // middle row (bigger tables)
  for (const x of [6.4, 11.0, 15.6, 20.2]) {
    table(x, 5.6, 1.5, 0.85);
    TABLES.push([x, 5.6]);
    chair(x - 0.35, 6.5, Math.PI); makeSeat(x - 0.35, 6.5, Math.PI, x, 5.6);
    chair(x + 0.35, 6.5, Math.PI); makeSeat(x + 0.35, 6.5, Math.PI, x, 5.6);
    chair(x - 0.35, 4.7, 0); makeSeat(x - 0.35, 4.7, 0, x, 5.6);
    chair(x + 0.35, 4.7, 0); makeSeat(x + 0.35, 4.7, 0, x, 5.6);
  }
  // banquette row
  for (const x of [4.2, 7.4, 10.6, 13.4]) {
    table(x, 9.3, 1.0, 0.66);
    TABLES.push([x, 9.3]);
    chair(x, 8.45, 0); makeSeat(x, 8.45, 0, x, 9.3);
    makeSeat(x, 9.95, Math.PI, x, 9.3); // banquette side, no chair mesh
  }

  // scatter laptops + cups on most tables
  const rand = (() => { let s = 7; return () => (s = (s * 48271) % 2147483647) / 2147483647; })();
  TABLES.forEach(([x, z], i) => {
    if (i % 4 !== 3) laptop(x + (rand() - 0.5) * 0.3, z + (rand() - 0.5) * 0.2, rand() * 0.6 - 0.3);
    if (rand() > 0.35) cupProp(x + 0.42, z + 0.12, rand() > 0.5 ? 0xfaf6f0 : 0xe8552f);
  });

  /* ------------------------------------------------------------- details --- */
  // Trudy poster on the first pier
  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 1.0),
    new THREE.MeshBasicMaterial({ map: T.trudyPosterTexture() })
  );
  poster.position.set(8.6, 1.85, 0.51);
  root.add(poster);

  const notice = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.45),
    new THREE.MeshBasicMaterial({ map: T.noticeTexture('HOUSE RULES', ['Open 24/7. Always.', 'YC alumni: 20% off.', 'Be normal about the wifi.']) })
  );
  notice.position.set(14.6, 1.9, 0.51);
  root.add(notice);

  // plants
  function plant(x, z) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.28, 10), mat('pot', { color: 0xd8cdc0 }));
    pot.position.set(x, 0.14, z); root.add(pot);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 6, 5), mat('leaf', { color: C.plant }));
      leaf.position.set(x + (Math.random() - 0.5) * 0.42, 0.38 + Math.random() * 0.34, z + (Math.random() - 0.5) * 0.42);
      root.add(leaf);
    }
    collide(x, z, 0.36, 0.36);
  }
  plant(16.2, 0.7); plant(2.2, 9.6); plant(24.2, 6.0);

  // hanging pothos over the window bays — the real place has vines everywhere
  function hanger(x, z) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.2, 8), mat('hpot', { color: 0xe0d3c2 }));
    pot.position.set(x, 3.1, z);
    root.add(pot);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), mat('cord', { color: 0x6b5a48 }));
    cord.position.set(x, 3.35, z);
    root.add(cord);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const drop = 0.2 + (i % 3) * 0.28;
      for (let k = 0; k < 3; k++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.055 + (k === 0 ? 0.03 : 0), 5, 4), mat('leaf2', { color: 0x5f9a4a }));
        leaf.position.set(
          x + Math.cos(a) * (0.1 + k * 0.045),
          3.0 - k * (drop / 3),
          z + Math.sin(a) * (0.1 + k * 0.045)
        );
        root.add(leaf);
      }
    }
  }
  hanger(11.6, 0.85); hanger(17.8, 0.85); hanger(5.6, 0.85);

  // A-frame chalkboard by the door
  const chalkTex = T.chalkTexture(['OPEN', 'still. always.', 'yes, right now.'], true);
  for (const s of [-1, 1]) {
    const bd = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.86),
      new THREE.MeshBasicMaterial({ map: chalkTex, side: THREE.DoubleSide, color: 0xb4b4b4 })
    );
    bd.position.set(2.15 + s * 0.12, 0.55, 3.3);
    bd.rotation.y = Math.PI / 2;
    bd.rotation.z = s * 0.13;
    root.add(bd);
  }
  collide(2.15, 3.3, 0.5, 0.75);

  // counter sign
  const csign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.22),
    new THREE.MeshBasicMaterial({ map: T.counterSignTexture(), side: THREE.DoubleSide, color: 0xbdbdbd })
  );
  csign.position.set(19.0, 1.24, 8.3);
  csign.rotation.y = Math.PI;
  csign.rotation.x = -0.22;
  root.add(csign);

  // tip jar
  const jar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.065, 0.17, 10),
    new THREE.MeshPhysicalMaterial({ color: 0xdff0f4, transparent: true, opacity: 0.35, roughness: 0.1 })
  );
  jar.position.set(18.4, 1.19, 8.45);
  root.add(jar);
  for (let i = 0; i < 4; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 8), mat('coin', { color: 0xc9a75a }));
    coin.position.set(18.4 + (Math.random() - 0.5) * 0.06, 1.13 + i * 0.012, 8.45 + (Math.random() - 0.5) * 0.06);
    root.add(coin);
  }

  /* ------------------------------------------------- air: motes and steam --- */
  // dust drifting through the warm light — the room should feel lived-in
  const moteCount = 130;
  const mpos = new Float32Array(moteCount * 3);
  const mseed = [];
  for (let i = 0; i < moteCount; i++) {
    mpos[i * 3] = 1 + Math.random() * 23;
    mpos[i * 3 + 1] = 0.4 + Math.random() * 2.7;
    mpos[i * 3 + 2] = 0.5 + Math.random() * 9.5;
    mseed.push({ p: Math.random() * 99, s: 0.1 + Math.random() * 0.22 });
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    color: 0xffd9a0, size: 0.035, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  root.add(motes);

  // steam curling off the cups
  const puff = T.puffTexture();
  const steams = [];
  const steamSpots = [[17.6, 8.6, 1.2], [23.2, 8.6, 1.2], [21.6, 9.7, 1.7]];
  TABLES.slice(0, 8).forEach(([x, z], i) => { if (i % 2 === 0) steamSpots.push([x + 0.42, z + 0.12, 0.9]); });
  for (const [sx, sz, sy] of steamSpots) {
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: puff, transparent: true, opacity: 0.3, depthWrite: false, color: 0xfff3e2,
      }));
      s.scale.setScalar(0.13);
      s.position.set(sx, sy, sz);
      root.add(s);
      steams.push({ s, base: sy, x: sx, z: sz, t: Math.random() * 2.2 });
    }
  }

  /* -------------------------------------------------------------- lights --- */
  const hemi = new THREE.HemisphereLight(0xffe9d2, 0x7a5c48, 1.15);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffe3c8, 0.75);
  scene.add(amb);

  // streetlight in the alley so the mural and the glass read at night
  const street = new THREE.PointLight(0x9fb6e0, 1.6, 40, 2);
  street.position.set(12, 5.5, -3.5);
  scene.add(street);

  // warm ceiling cove along the north side (the orange strip in the photo)
  const cove = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.1, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xff7b3d })
  );
  cove.position.set(13, ROOM.h - 0.16, 8.6);
  root.add(cove);
  const cove2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.1, 8.4),
    new THREE.MeshBasicMaterial({ color: 0xff7b3d })
  );
  cove2.position.set(24.2, ROOM.h - 0.16, 5.0);
  root.add(cove2);

  const coveLights = [];
  for (const [lx, lz] of [[6, 8.4], [13, 8.4], [20, 8.4], [23.6, 4.0]]) {
    const p = new THREE.PointLight(0xff8a4a, 1.9, 20, 2);
    p.position.set(lx, ROOM.h - 0.35, lz);
    scene.add(p);
    coveLights.push(p);
  }

  // track lights over the window row
  const trackLights = [];
  for (let x = 4; x <= 24; x += 3.2) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.16, 8), mat('can', { color: 0x3c3a38 }));
    can.position.set(x, ROOM.h - 0.12, 2.2); root.add(can);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0b2 }));
    bulb.position.set(x, ROOM.h - 0.21, 2.2); root.add(bulb);
  }
  for (const [lx, lz, inten] of [[5, 3.0, 1.35], [12, 3.0, 1.35], [19, 3.0, 1.35], [24, 3.0, 1.0], [8.5, 6.2, 1.2], [16, 6.2, 1.2]]) {
    const p = new THREE.PointLight(0xffd9a8, inten, 22, 2);
    p.position.set(lx, ROOM.h - 0.85, lz);
    scene.add(p);
  }
  const counterLight = new THREE.PointLight(0xffcf9a, 1.8, 14, 2); counterLight.position.set(20.5, 2.6, 9.0); scene.add(counterLight);

  // daylight that ramps in at sunrise
  const dawn = new THREE.DirectionalLight(0xffb87a, 0.0);
  dawn.position.set(10, 8, -14);
  scene.add(dawn);

  return {
    root, colliders, seats, props, drawWall,
    counter: { x0: CX0, x1: CX1, z0: CZ0, z1: CZ1 },
    sky, skyNight, skyDawn, dawn, hemi, amb, coveLights, mural,
    tickAir(dt, t) {
      const p = moteGeo.attributes.position;
      for (let i = 0; i < moteCount; i++) {
        const m = mseed[i];
        p.array[i * 3 + 1] += m.s * dt * 0.35;
        p.array[i * 3] += Math.sin(t * 0.5 + m.p) * dt * 0.08;
        if (p.array[i * 3 + 1] > 3.2) p.array[i * 3 + 1] = 0.35;
      }
      p.needsUpdate = true;

      for (const st of steams) {
        st.t += dt * 0.55;
        if (st.t > 2.2) { st.t = 0; }
        const u = st.t / 2.2;
        st.s.position.y = st.base + u * 0.75;
        st.s.position.x = st.x + Math.sin(u * 5 + st.base) * 0.06;
        st.s.material.opacity = 0.34 * (1 - u) * (u < 0.15 ? u / 0.15 : 1);
        st.s.scale.setScalar(0.1 + u * 0.22);
      }
    },
    setClock(min) {
      // wall clock faces -Z, so hands rotate about Z from the wall's point of view
      // the wall clock faces -Z, so +Z rotation reads as clockwise from the room
      const m = (min % 60) / 60, h = ((min / 60) % 12) / 12;
      minHand.rotation.z = m * Math.PI * 2;
      hourHand.rotation.z = h * Math.PI * 2;
    },
    setDawn(t) {
      // t: 0 = deep night, 1 = full sunrise
      dawn.intensity = t * 1.5;
      hemi.intensity = 0.62 + t * 0.5;
      hemi.color.setHSL(0.08, 0.6 - t * 0.2, 0.55 + t * 0.2);
      sky.material.map = t > 0.45 ? skyDawn : skyNight;
      sky.material.needsUpdate = true;
      towers.material.map = t > 0.45 ? towerDawn : towerNight;
      towers.material.needsUpdate = true;
      mural.material.color.setScalar(0.55 + t * 0.75);
    },
  };
}
