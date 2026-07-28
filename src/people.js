// NPCs: meshes, idle animation, patrols, and everything they say.
import * as THREE from '../vendor/three.module.min.js';
import { labelSprite, bubbleSprite } from './textures.js';

const SKINS = [0xe8c39e, 0xc98d63, 0x8d5a3b, 0xf0d3b4, 0x6f4429, 0xd9a97c];
const TOPS = [0x2f3238, 0x1f4d6b, 0x6b2f3a, 0x3b5c40, 0xd8d2c8, 0x4a3f66, 0x8a4a2b];
const HAIRS = [0x2a1e18, 0x110d0b, 0x6b4a2a, 0xc9a25c, 0x4a3020, 0x8a8a8a];

function figure({ top, skin, hair, bulk = 1, hood = null, seated = false }) {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshLambertMaterial({ color: c });

  const legH = seated ? 0.42 : 0.82;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.3 * bulk, legH, 0.26), m(0x2b2f36));
  legs.position.y = legH / 2;
  g.add(legs);

  const torsoH = 0.62;
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.19 * bulk, torsoH - 0.2, 4, 10),
    m(top)
  );
  torso.position.y = legH + torsoH / 2 - 0.04;
  g.add(torso);

  const armGeo = new THREE.CapsuleGeometry(0.062 * bulk, 0.4, 3, 8);
  const armL = new THREE.Mesh(armGeo, m(skin));
  const armR = new THREE.Mesh(armGeo, m(skin));
  armL.position.set(-0.24 * bulk, legH + 0.3, 0.02);
  armR.position.set(0.24 * bulk, legH + 0.3, 0.02);
  armL.rotation.z = 0.14; armR.rotation.z = -0.14;
  g.add(armL, armR);

  // Everything above the neck lives in one group so it can bob as a unit.
  const HR = 0.17;
  const head = new THREE.Group();
  head.position.y = legH + torsoH + 0.12;
  g.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(HR, 12, 10), m(skin));
  head.add(skull);

  // a face, because a room full of blank capsules is a morgue
  const ink = new THREE.MeshBasicMaterial({ color: 0x2a201c });
  const eyeGeo = new THREE.BoxGeometry(0.03, 0.036, 0.014);
  const eyeL = new THREE.Mesh(eyeGeo, ink);
  const eyeR = new THREE.Mesh(eyeGeo, ink);
  eyeL.position.set(-0.055, -0.012, HR - 0.012);
  eyeR.position.set(0.055, -0.012, HR - 0.012);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.014, 0.014), ink);
  mouth.position.set(0, -0.082, HR - 0.024);
  const blush = new THREE.MeshBasicMaterial({ color: 0xe8907a, transparent: true, opacity: 0.45 });
  const bl = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.02, 0.012), blush);
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.02, 0.012), blush);
  bl.position.set(-0.098, -0.05, HR - 0.055);
  br.position.set(0.098, -0.05, HR - 0.055);
  head.add(eyeL, eyeR, mouth, bl, br);

  // hair sits as a cap so it never swallows the face
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(HR + 0.012, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.46),
    m(hood ?? hair)
  );
  hairMesh.position.y = 0.008;
  head.add(hairMesh);
  const nape = new THREE.Mesh(
    new THREE.SphereGeometry(HR + 0.014, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    m(hood ?? hair)
  );
  nape.position.z = -0.045;
  head.add(nape);

  if (hood) {
    const cowl = new THREE.Mesh(new THREE.SphereGeometry(HR + 0.05, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), m(hood));
    cowl.position.set(0, 0.01, -0.055);
    head.add(cowl);
  }

  g.userData = { head, armL, armR, torso, legH, eyeL, eyeR };
  return g;
}

function corgi() {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshLambertMaterial({ color: c });
  const orange = 0xd98b4a, white = 0xfaf3e8;

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.32, 4, 10), m(orange));
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.2, 0);
  g.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), m(white));
  chest.position.set(0.18, 0.15, 0);
  g.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), m(orange));
  head.position.set(0.3, 0.32, 0);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 8), m(white));
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.41, 0.29, 0);
  g.add(snout);
  const ink = new THREE.MeshBasicMaterial({ color: 0x241c18 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.026, 0.02), ink);
    eye.position.set(0.365, 0.35, s * 0.055);
    g.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.024, 0.034), ink);
  nose.position.set(0.475, 0.295, 0);
  g.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 6), m(orange));
    ear.position.set(0.28, 0.44, s * 0.06);
    g.add(ear);
  }
  for (const [x, z] of [[0.18, 0.09], [0.18, -0.09], [-0.16, 0.09], [-0.16, -0.09]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.14, 6), m(white));
    leg.position.set(x, 0.07, z);
    g.add(leg);
  }
  g.userData = { head };
  return g;
}

// A small green thing perched on the cup boxes with too much hardware strapped to it.
function frogu() {
  const g = new THREE.Group();
  const m = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e ?? 0x000000 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), m(0x5f8a4a));
  body.scale.set(1, 0.78, 0.95);
  body.position.y = 0.13;
  g.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), m(0xc9d8a8));
  belly.scale.set(1, 0.6, 0.7);
  belly.position.set(0, 0.09, 0.09);
  g.add(belly);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.02), m(0x3d5c30));
  mouth.position.set(0, 0.11, 0.155);
  g.add(mouth);

  // camera-lens goggles, strapped on
  for (const s of [-1, 1]) {
    const rig = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.11, 12), m(0x4a4f52));
    rig.rotation.x = Math.PI / 2;
    rig.position.set(s * 0.085, 0.245, 0.055);
    g.add(rig);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), m(0x2a0d0d, 0x8c2020));
    lens.position.set(s * 0.085, 0.245, 0.115);
    g.add(lens);
  }
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.016, 6, 16), m(0x39413f));
  strap.rotation.y = Math.PI / 2;
  strap.position.y = 0.22;
  g.add(strap);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 5), m(0x2c2c2c));
  ant.position.set(0.02, 0.36, -0.02);
  ant.rotation.z = 0.22;
  g.add(ant);

  for (const [x, z] of [[-0.15, 0.1], [0.15, 0.1]]) {
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), m(0x547d42));
    leg.scale.set(1.5, 0.6, 1);
    leg.position.set(x, 0.03, z);
    g.add(leg);
  }

  // the pile of hardware it sits in
  const pile = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.1 + Math.random() * 0.14, 0.04 + Math.random() * 0.06, 0.08 + Math.random() * 0.1),
      m(0x23262b)
    );
    b.position.set((Math.random() - 0.5) * 0.5, 0.02 + Math.random() * 0.05, -0.12 - Math.random() * 0.22);
    b.rotation.y = Math.random() * 3;
    pile.add(b);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5),
      new THREE.MeshBasicMaterial({ color: [0x4cff88, 0xff5a3c, 0x59a9ff][i % 3] }));
    led.position.copy(b.position);
    led.position.y += 0.04;
    pile.add(led);
  }
  g.add(pile);

  g.userData = { lensL: g.children[5], ant };
  return g;
}

/* ------------------------------------------------------------- dialogue --- */
export const DIALOGUE = {
  nico: {
    name: 'NICO',
    sub: 'barista / ceo',
    color: '#ffd9a8',
    intro: [
      "welcome to corgi cafe. open 24/7 — that's not marketing, it's a load-bearing promise.",
      "no, there are no corgis. trudy lives upstairs and she does not do meet and greets.",
      "you want the espresso. everyone at this hour wants the espresso and then orders a mocha.",
      "first one's on the house. wire in.",
    ],
    repeat: [
      ["still here."],
      ["the machine's hot. it's always hot."],
      ["people keep arguing about whether the grind is exaggerated. it's 3am and every seat is taken. that's not a vibe, that's data."],
      ["someone posted that corgi legs were 'net inferior'. banned. nothing personal — structural."],
      ["i sleep upstairs. mattress on the floor. shortest commute in the city."],
      ["if you're here at 4am you're either building something or avoiding something. rent's the same either way."],
      ["sixty percent of the first thirty people here got the tattoo. i'm not going to explain that."],
      ["the retail space was a required add-on to the office lease. i assumed the landlord made that up. he did not. so: here we are."],
    ],
  },

  atlas: {
    name: 'ATLAS',
    sub: 'escaping the permanent underclass',
    color: '#a8e0b0',
    intro: [
      "you've got 'i'll start monday' energy. it's monday.",
      "the permanent underclass isn't a class. it's a default setting. you get opted in by doing nothing.",
      "guys in here will argue open weights versus closed weights for six hours and never once pick up a heavy one.",
    ],
    choice: {
      prompt: "twenty. right now. floor's clean. i'll count.",
      options: [
        { label: 'DO THE SET', tag: 'set' },
        { label: 'NOT RIGHT NOW', tag: 'decline' },
      ],
    },
    after: {
      set: [
        "good. that's the whole escape hatch. it's just reps. reps in the gym, reps in the repo.",
        "come on the pod sometime. we'll do it over steaks. bring an opinion you'd defend sober.",
      ],
      decline: [
        "noted. that's going in the episode.",
      ],
    },
    repeat: [
      ["the smoothie is fourteen dollars and has forty-one grams. staying broke costs more than that and has none."],
      ["creatine's two bucks at the counter. cheapest edge in this building and nobody takes it."],
      ["you cannot out-cardio a bad roadmap."],
      ["sleep is a leverage tool, not a personality. i still don't do it. do as i say."],
      ["we recorded an episode in this room once. nobody noticed. they were all working. that's the whole episode."],
      ["nobody's coming. that's the good news. means nobody's stopping you either."],
      ["still noted."],
    ],
  },

  squirtle: {
    name: 'SQUIRTLE',
    sub: 'tpot',
    color: '#9fd8ff',
    intro: [
      "BREAKING: local man enters cafe at 3am, tells himself it was a choice.",
      "this cafe is an egregore. we're not customers here. we're substrate.",
      "i don't really read anymore. things just sort of arrive now.",
    ],
    choice: {
      prompt: 'anyway. want to go deeper or do you have somewhere to be',
      options: [
        { label: 'GO DEEPER', tag: 'deeper' },
        { label: 'I SHOULD TOUCH GRASS', tag: 'grass' },
      ],
    },
    after: {
      deeperGood: [
        "— and that's why your bug isn't a bug, it's a boundary you drew wrong.",
        "you're welcome. i'll never remember saying this.",
      ],
      deeperBad: [
        "so anyway that's forty replies deep on whether agency is downstream of vibes.",
        "i think we lost some time there. i don't experience time here.",
      ],
      grass: [
        "respected. i'll be here. i'm always here.",
      ],
    },
    repeat: [
      ["BREAKING: the espresso machine has retained counsel."],
      ["BREAKING: sources close to the dog upstairs say she has not been seen in weeks. the family has no comment."],
      ["BREAKING: cafe announces it will close for one hour. cafe immediately denies this. cafe has never closed."],
      ["the timeline is a slot machine that pays out in identity."],
      ["everyone's trying to escape the permanent underclass and nobody's asked what class means when the economy is a language model."],
      ["vibecamp changed me. i can't explain it. that part's load-bearing."],
      ["you should log off. i can't. but you should."],
      ["i'm not a doomer. i'm a doomer with good vibes. completely different thing."],
    ],
  },

  gtm: {
    name: 'GTM POD',
    sub: 'outbound, 3am shift',
    color: '#ffc3d8',
    intro: [
      "hi! quick one — who's handling insurance for your startup right now?",
      "we're the GTM pod. we don't sleep either, we just monetize it.",
      "you're pre-seed? perfect. that is precisely our ICP.",
    ],
    choice: {
      prompt: "give me fifteen minutes and i'll never bother you again. (i will bother you again.)",
      options: [
        { label: 'TAKE THE 15', tag: 'take' },
        { label: "I'M HEADS DOWN", tag: 'no' },
      ],
    },
    after: {
      take: [
        "signed. covered. you can now fail in a fully insured manner.",
        "i'm putting a drink on the house on your tab. don't tell nico. nico knows.",
      ],
      no: [
        "love that. respect the focus. i'll follow up thursday.",
      ],
    },
    repeat: [
      ["it's thursday."],
      ["we're an ai-native carrier. the quote takes ninety seconds. your latte takes longer."],
      ["we're not selling, we're educating. (we're selling.)"],
      ["i closed two founders between 1 and 3am. the graveyard shift converts."],
      ["you look like you're about to say 'send me a deck'. send me a deck."],
      ["my quota resets at midnight. so does the cafe. we understand each other."],
    ],
  },

  vc: {
    name: 'VC',
    sub: 'just here for the coffee',
    color: '#d6c7ff',
    intro: [
      "quick question. are you raising?",
    ],
    choice: {
      prompt: 'i can do fifteen right now. i have nowhere to be, structurally.',
      options: [
        { label: 'TAKE THE MEETING', tag: 'take' },
        { label: "I'M HEADS DOWN", tag: 'no' },
      ],
    },
    after: {
      take: [
        "love the space. love the energy. what's the wedge.",
        "...ok that's actually not stupid. coffee's on me.",
      ],
      no: [
        "love that. following you. following you right now, look.",
      ],
    },
    repeat: [
      ["i'm not investing tonight. i'm in the watering hole. predators drink too."],
      ["everyone in here has a github and a sleep debt. that's a market."],
      ["is the founder here? the one who sleeps upstairs? no reason."],
      ["i'd do a small check. small for me. life-changing for you. isn't that beautiful."],
    ],
  },

  frogu: {
    name: 'FROGU',
    sub: 'observing',
    color: '#8fe08a',
    intro: [
      "you're in the corgi cafe at 3am, anon. that's not a coffee habit. that's a load-bearing identity.",
      "i've had eyes on this room since february. the only thing that ever changes is who's crying at the window at 5am.",
      "there are no corgis. there have never been corgis. it was never about the corgis.",
    ],
    repeat: [
      ["cafemaxxing. you don't live here. you simply never left."],
      ["everyone downstairs is ideamaxxing and nobody is sleeping. the room just watches back."],
      ["the dog upstairs knows. the dog upstairs has always known."],
      ["seat occupancy at 0300 is the only honest metric left in this city, anon."],
      ["someone wrote DAY 148 — STILL OPEN on the side of this box in marker. nobody has corrected the count. nobody has needed to."],
      ["i'm not staff. i'm not a customer. i'm ambient."],
    ],
  },

  trudy: {
    name: 'TRUDY',
    sub: 'chief morale officer',
    color: '#ffcf9a',
    intro: ["(she came downstairs. nobody says anything. everyone in the room is aware.)"],
    repeat: [["(she is still here. the room is still pretending to work.)"]],
  },
};

export const AMBIENT_LINES = [
  "we're pre-revenue but post-vibes",
  "day 41 of sleeping here",
  "i haven't written a line of this myself and honestly it's beautiful",
  "is the wifi password on the wall or is that a koan",
  "there are no corgis",
  "$14 is fine if it's your only meal of the day",
  "i'm not tired, i'm in a different timezone spiritually",
  "yes it's 3am. yes i'm on a call with singapore.",
  "my cofounder and i are aligned. we are aligned. we are aligned.",
  "if i leave now the streak ends",
  "he said 'let's take this offline' and pointed at the door",
  "i'm going to sleep when the round closes",
  "this is my third coffee and my first thought",
  "someone asked the barista where the dogs were and he just closed his eyes",
];

/* ------------------------------------------------------------- builders --- */
export function buildPeople(scene, world) {
  const npcs = [];
  const root = new THREE.Group();
  scene.add(root);

  function addLabel(g, name, sub, color) {
    const l = labelSprite(name, color, sub);
    l.position.y = 2.05;
    g.add(l);
    return l;
  }

  function mk(id, opts, x, z, yaw) {
    const g = figure(opts);
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    root.add(g);
    const d = DIALOGUE[id];
    const npc = {
      id, group: g, name: d?.name ?? id, sub: d?.sub ?? '',
      home: new THREE.Vector2(x, z), yaw,
      talkedTo: false, stage: 0, bubble: null, bubbleT: 0,
      anim: 'idle', animT: Math.random() * 6,
    };
    if (d) npc.label = addLabel(g, d.name, d.sub, d.color);
    npcs.push(npc);
    return npc;
  }

  // NICO — behind the counter
  const nico = mk('nico', { top: 0x24272c, skin: SKINS[0], hair: 0x3a2a1e }, 20.6, 9.9, Math.PI);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.1), new THREE.MeshLambertMaterial({ color: 0xe8552f }));
  apron.position.set(0, 1.02, 0.17);
  nico.group.add(apron);
  nico.fixed = true;

  // ATLAS — by the window, between sets
  const atlas = mk('atlas', { top: 0x2f4429, skin: SKINS[3], hair: HAIRS[3], bulk: 1.55 }, 6.3, 2.95, -0.55);
  atlas.anim = 'flex';

  // SQUIRTLE — far corner, hood up
  const squirtle = mk('squirtle', { top: 0x2b4b7a, skin: SKINS[1], hair: HAIRS[0], hood: 0x3f6db3, seated: true }, 23.2, 1.35, 0.35);
  squirtle.group.position.y = 0.02;
  squirtle.fixed = true;
  squirtle.anim = 'type';

  // GTM POD — three of them, working the room
  // the GTM pod — three of them, deliberately unnamed
  const GTM_NAMES = ['GTM', 'GTM', 'GTM'];
  const gtmPatrol = [
    new THREE.Vector2(3.2, 3.9), new THREE.Vector2(22.6, 3.9),
    new THREE.Vector2(22.8, 7.2), new THREE.Vector2(16.6, 7.6), new THREE.Vector2(3.2, 7.6),
  ];
  const gtm = [];
  GTM_NAMES.forEach((nm, i) => {
    const p = mk('gtm', { top: [0xf0e6da, 0x1c1c22, 0xdfc7d6][i], skin: SKINS[(i * 2) % SKINS.length], hair: HAIRS[i % HAIRS.length] },
      6 + i * 3.5, 3.9, Math.PI / 2);
    p.label && p.group.remove(p.label);
    p.label = addLabel(p.group, nm, 'go-to-market', '#ffc3d8');
    p.patrol = gtmPatrol;
    p.wp = i * 1;
    p.speed = 0.95;
    p.anim = 'walk';
    // clipboard / phone
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.012), new THREE.MeshLambertMaterial({ color: 0x1b1e24 }));
    phone.position.set(0.26, 1.08, 0.14);
    p.group.add(phone);
    gtm.push(p);
  });

  // VC — roams the other loop
  const vc = mk('vc', { top: 0x3a4a63, skin: SKINS[4], hair: HAIRS[5] }, 12, 7.6, -Math.PI / 2);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.3), new THREE.MeshLambertMaterial({ color: 0x2c3646 }));
  vest.position.y = 1.06;
  vc.group.add(vest);
  vc.patrol = [
    new THREE.Vector2(20.4, 7.4), new THREE.Vector2(4.2, 7.4),
    new THREE.Vector2(3.4, 3.9), new THREE.Vector2(20.4, 3.9),
  ];
  vc.wp = 0; vc.speed = 0.8; vc.anim = 'walk';

  // FROGU — perched on the cup boxes, easy to miss
  const frogG = frogu();
  frogG.position.set(24.05, 2.47, 1.58);
  frogG.rotation.y = -2.35;
  frogG.scale.setScalar(1.2);
  root.add(frogG);
  const frog = {
    id: 'frogu', group: frogG, name: 'FROGU', sub: 'observing',
    talkedTo: false, stage: 0, animT: 0, anim: 'watch', fixed: true,
    home: new THREE.Vector2(24.05, 1.58),
  };
  frog.label = labelSprite('FROGU', '#8fe08a', 'observing');
  frog.label.position.y = 0.72;
  frog.label.visible = false;
  frogG.add(frog.label);
  npcs.push(frog);

  // TRUDY — comes down later
  const trudyG = corgi();
  trudyG.position.set(1.2, 0, 5.4);
  trudyG.visible = false;
  root.add(trudyG);
  const trudy = {
    id: 'trudy', group: trudyG, name: 'TRUDY', sub: 'chief morale officer',
    home: new THREE.Vector2(1.2, 5.4), talkedTo: false, stage: 0,
    hidden: true, anim: 'trot', animT: 0,
    patrol: [new THREE.Vector2(4, 6.4), new THREE.Vector2(12, 6.8), new THREE.Vector2(18, 4.2), new THREE.Vector2(6, 3.8)],
    wp: 0, speed: 1.05,
  };
  trudy.label = labelSprite('TRUDY', '#ffcf9a', 'chief morale officer');
  trudy.label.position.y = 0.95;
  trudy.label.visible = false;
  trudyG.add(trudy.label);
  npcs.push(trudy);

  /* ---------------------------------------------- ambient laptop people --- */
  const ambient = [];
  const usedSeats = [];
  const seatPool = world.seats.filter(s => s.pos.x > 3 && !(s.pos.x > 21 && s.pos.z < 3));
  for (let i = 0; i < 11; i++) {
    const idx = (i * 3 + 1) % seatPool.length;
    const s = seatPool[idx];
    if (!s || s.taken) continue;
    s.taken = true;
    usedSeats.push(s);
    const g = figure({
      top: TOPS[i % TOPS.length], skin: SKINS[(i * 3) % SKINS.length],
      hair: HAIRS[(i * 2) % HAIRS.length], seated: true,
      hood: i % 5 === 0 ? TOPS[(i + 2) % TOPS.length] : null,
    });
    g.position.set(s.pos.x, 0.02, s.pos.z);
    g.rotation.y = s.yaw;
    root.add(g);
    ambient.push({
      group: g, animT: Math.random() * 8, line: null,
      lineT: 4 + Math.random() * 30, bubble: null, blinkOff: Math.random() * 4.6,
    });
  }

  return { root, npcs, ambient, nico, atlas, squirtle, gtm, vc, trudy, frogu: frog };
}

/* ------------------------------------------------------------ animation --- */
export function animatePeople(people, dt, t, playerPos) {
  const { npcs, ambient } = people;

  for (const n of npcs) {
    n.animT += dt;
    const ud = n.group.userData;

    if (n.hidden) { n.group.visible = false; continue; }
    n.group.visible = true;

    if (n.id === 'frogu') {
      // tracks the room, and you
      const d = playerPos ? Math.hypot(playerPos.x - 24.05, playerPos.z - 1.58) : 99;
      if (n.label) { n.label.visible = d < 3.6; n.label.material.opacity = 0.95; }
      const want = playerPos && d < 7
        ? Math.atan2(playerPos.x - 24.05, playerPos.z - 1.58)
        : -2.35 + Math.sin(n.animT * 0.22) * 0.55;
      let diff = want - n.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      n.group.rotation.y += diff * Math.min(1, dt * 1.6);
      n.group.position.y = 2.47 + Math.sin(n.animT * 1.7) * 0.006;
      if (n.bubble) {
        n.bubbleT -= dt;
        if (n.bubbleT <= 0) { n.group.remove(n.bubble); n.bubble = null; }
      }
      continue;
    }

    // patrol movement
    if (n.patrol && !n.frozen) {
      const target = n.approach ?? n.patrol[n.wp];
      const dx = target.x - n.group.position.x;
      const dz = target.y - n.group.position.z;
      const dist = Math.hypot(dx, dz);
      const stop = n.approach ? 1.15 : 0.35;
      if (dist > stop) {
        const sp = n.speed * dt;
        n.group.position.x += (dx / dist) * sp;
        n.group.position.z += (dz / dist) * sp;
        const want = Math.atan2(dx, dz);
        let diff = want - n.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        n.group.rotation.y += diff * Math.min(1, dt * 6);
        n.walking = true;
      } else {
        n.walking = false;
        if (!n.approach) n.wp = (n.wp + 1) % n.patrol.length;
      }
    }

    if (ud && ud.armL) {
      if (n.anim === 'flex') {
        // Atlas: slow curls, occasional pushup dip
        const c = Math.sin(n.animT * 1.6);
        ud.armL.rotation.x = -0.6 - c * 0.7;
        ud.armR.rotation.x = -0.6 - Math.sin(n.animT * 1.6 + 0.4) * 0.7;
        n.group.position.y = Math.max(0, Math.sin(n.animT * 0.5) * 0.02);
      } else if (n.anim === 'type') {
        ud.armL.rotation.x = -1.15 + Math.sin(n.animT * 12) * 0.09;
        ud.armR.rotation.x = -1.15 + Math.sin(n.animT * 12 + 1.9) * 0.09;
        ud.head.position.y = ud.legH + 0.62 + 0.12 + Math.sin(n.animT * 1.4) * 0.008;
      } else if (n.walking) {
        const sw = Math.sin(n.animT * 7.5) * 0.5;
        ud.armL.rotation.x = sw; ud.armR.rotation.x = -sw;
        n.group.position.y = Math.abs(Math.sin(n.animT * 7.5)) * 0.035;
      } else {
        ud.armL.rotation.x = Math.sin(n.animT * 1.3) * 0.05;
        ud.armR.rotation.x = Math.sin(n.animT * 1.3 + 1) * 0.05;
        n.group.position.y = Math.sin(n.animT * 1.1) * 0.008;
      }
      if (ud.eyeL) {
        const bs = (n.animT * 0.8) % 5.1 < 0.12 ? 0.12 : 1;
        ud.eyeL.scale.y = bs; ud.eyeR.scale.y = bs;
      }
    }

    if (n.id === 'trudy') {
      n.group.position.y = Math.abs(Math.sin(n.animT * 9)) * 0.03;
      n.group.userData.head.rotation.z = Math.sin(n.animT * 2.2) * 0.12;
    }

    if (n.bubble) {
      n.bubbleT -= dt;
      if (n.bubbleT <= 0) { n.group.remove(n.bubble); n.bubble = null; }
    }

    // labels fade out with distance so the room isn't a wall of nametags
    if (n.label && playerPos) {
      const d = Math.hypot(playerPos.x - n.group.position.x, playerPos.z - n.group.position.z);
      const a = Math.max(0, Math.min(1, (11 - d) / 4));
      n.label.material.opacity = a * 0.95;
      n.label.visible = a > 0.02;
    }
  }

  // ambient typers + speech bubbles
  for (const a of ambient) {
    a.animT += dt;
    const ud = a.group.userData;
    ud.armL.rotation.x = -1.15 + Math.sin(a.animT * 11) * 0.1;
    ud.armR.rotation.x = -1.15 + Math.sin(a.animT * 11 + 2.1) * 0.1;
    ud.head.position.y = ud.legH + 0.74 + Math.sin(a.animT * 1.6) * 0.012;
    ud.head.rotation.x = 0.16 + Math.sin(a.animT * 1.6) * 0.03;   // heads down, always
    // blink
    const bs = (a.animT * 0.7 + a.blinkOff) % 4.6 < 0.12 ? 0.12 : 1;
    ud.eyeL.scale.y = bs; ud.eyeR.scale.y = bs;

    a.lineT -= dt;
    if (a.lineT <= 0) {
      if (a.bubble) { a.group.remove(a.bubble); a.bubble = null; a.lineT = 14 + Math.random() * 40; }
      else {
        const b = bubbleSprite(AMBIENT_LINES[(Math.random() * AMBIENT_LINES.length) | 0]);
        b.position.y = 1.85;
        a.group.add(b);
        a.bubble = b;
        a.lineT = 4.5;
      }
    }
  }
}

export function say(npc, text, dur = 4) {
  if (npc.bubble) npc.group.remove(npc.bubble);
  const b = bubbleSprite(text);
  b.position.y = npc.id === 'trudy' ? 1.1 : 2.45;
  npc.group.add(b);
  npc.bubble = b;
  npc.bubbleT = dur;
}
