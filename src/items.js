import * as THREE from 'three';

// Small helper — every item is a THREE.Group of these boxes.
function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  return mesh;
}

const M = {
  bronze: 0xba7a3a,
  bronzeDark: 0x6a4020,
  iron: 0x8a8c90,
  ironDark: 0x54565a,
  steel: 0xd8dce0,
  steelBright: 0xf0f2f4,
  gold: 0xf0c840,
  goldDark: 0xa07820,
  silver: 0xdcdce6,
  wood: 0x6a4520,
  darkWood: 0x3a2818,
  leather: 0x7a5030,
  leatherDark: 0x40281a,
  cloth: 0xa08050,
  mage: 0x4030a0,
  magePurple: 0x7238a8,
  purple: 0x8030a0,
  bone: 0xe8e0c4,
  boneDark: 0xa89870,
  dark: 0x141618,
  flesh: 0xd8b090,
  redGem: 0xe22a2a,
  blueGem: 0x3a80ff,
  greenGem: 0x22c060,
  yellowGem: 0xf6d848,
  dragonGreen: 0x2a6a2a,
  dragonGreenLight: 0x54a054,
  dragonSpine: 0x143014,
  claw: 0xdcd0a0,
  redTrim: 0xa42020,
};

// ─── SWORDS ──────────────────────────────────────────────────────
export function bronzeShortSword() {
  const g = new THREE.Group();
  const y = 0.05;
  // Tapered blade — three shrinking segments so it points.
  g.add(box(0.14, 0.04, 0.14, M.bronze, 0, y, 0.28));
  g.add(box(0.11, 0.04, 0.2, M.bronze, 0, y, 0.15));
  g.add(box(0.09, 0.04, 0.14, M.bronze, 0, y, -0.02));
  // Crossguard.
  g.add(box(0.28, 0.06, 0.06, M.bronzeDark, 0, y, -0.11));
  // Grip: wood wrapped in dark leather bands.
  g.add(box(0.07, 0.07, 0.2, M.wood, 0, y, -0.24));
  g.add(box(0.075, 0.075, 0.03, M.darkWood, 0, y, -0.19));
  g.add(box(0.075, 0.075, 0.03, M.darkWood, 0, y, -0.29));
  // Pommel — round-ish bronze cap.
  g.add(box(0.11, 0.11, 0.09, M.bronzeDark, 0, y, -0.4));
  return g;
}

export function ironLongsword() {
  const g = new THREE.Group();
  const y = 0.06;
  // Longer, thinner blade with a fuller (dark stripe down the middle).
  g.add(box(0.11, 0.05, 0.14, M.steel, 0, y, 0.42)); // point
  g.add(box(0.12, 0.05, 0.55, M.steel, 0, y, 0.12));
  g.add(box(0.05, 0.052, 0.55, M.ironDark, 0, y + 0.001, 0.12)); // fuller
  // Straight crossguard with rounded tips.
  g.add(box(0.36, 0.07, 0.07, M.iron, 0, y, -0.2));
  g.add(box(0.06, 0.09, 0.05, M.ironDark, -0.18, y, -0.2));
  g.add(box(0.06, 0.09, 0.05, M.ironDark, 0.18, y, -0.2));
  // Leather-wrapped grip with three visible wraps.
  g.add(box(0.07, 0.07, 0.24, M.leatherDark, 0, y, -0.35));
  g.add(box(0.075, 0.075, 0.02, M.wood, 0, y, -0.28));
  g.add(box(0.075, 0.075, 0.02, M.wood, 0, y, -0.35));
  g.add(box(0.075, 0.075, 0.02, M.wood, 0, y, -0.42));
  // Disc pommel.
  g.add(box(0.14, 0.12, 0.06, M.iron, 0, y, -0.5));
  return g;
}

export function twoHandedSword() {
  const g = new THREE.Group();
  const y = 0.07;
  // Very long broad blade.
  g.add(box(0.14, 0.06, 0.18, M.steelBright, 0, y, 0.62)); // point
  g.add(box(0.18, 0.06, 0.72, M.steelBright, 0, y, 0.2));
  g.add(box(0.07, 0.063, 0.72, M.ironDark, 0, y + 0.001, 0.2)); // fuller
  // Wide swept guard.
  g.add(box(0.5, 0.08, 0.09, M.iron, 0, y, -0.2));
  g.add(box(0.08, 0.1, 0.08, M.gold, -0.25, y, -0.2));
  g.add(box(0.08, 0.1, 0.08, M.gold, 0.25, y, -0.2));
  // Long two-hand grip.
  g.add(box(0.08, 0.08, 0.4, M.leatherDark, 0, y, -0.42));
  for (let i = 0; i < 5; i++) {
    g.add(box(0.09, 0.085, 0.02, M.wood, 0, y, -0.28 - i * 0.07));
  }
  // Big lobed pommel.
  g.add(box(0.16, 0.14, 0.09, M.iron, 0, y, -0.65));
  g.add(box(0.06, 0.06, 0.03, M.gold, 0, y + 0.05, -0.65));
  return g;
}

export function magicSword() {
  const g = new THREE.Group();
  const y = 0.06;
  // Glowing blue blade — use MeshBasic so the color pops.
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0x7ab8ff });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.62), bladeMat);
  blade.position.set(0, y, 0.16);
  g.add(blade);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.14), bladeMat);
  tip.position.set(0, y, 0.5);
  g.add(tip);
  // Gold crescent guard.
  g.add(box(0.42, 0.08, 0.08, M.gold, 0, y, -0.2));
  g.add(box(0.08, 0.1, 0.05, M.gold, -0.2, y + 0.03, -0.2));
  g.add(box(0.08, 0.1, 0.05, M.gold, 0.2, y + 0.03, -0.2));
  // Blue gem in the guard center.
  g.add(box(0.09, 0.09, 0.06, M.blueGem, 0, y + 0.04, -0.2));
  // Purple grip.
  g.add(box(0.07, 0.07, 0.24, M.magePurple, 0, y, -0.35));
  g.add(box(0.08, 0.08, 0.02, M.gold, 0, y, -0.28));
  g.add(box(0.08, 0.08, 0.02, M.gold, 0, y, -0.42));
  // Star pommel: cross + gem.
  g.add(box(0.13, 0.06, 0.06, M.gold, 0, y, -0.5));
  g.add(box(0.06, 0.06, 0.13, M.gold, 0, y, -0.5));
  g.add(box(0.06, 0.07, 0.06, M.blueGem, 0, y + 0.03, -0.5));
  return g;
}

// ─── SHIELDS ─────────────────────────────────────────────────────
export function woodenBuckler() {
  const g = new THREE.Group();
  const y = 0.05;
  // Round-ish wood face — three stacked plates for a shallow disc.
  g.add(box(0.6, 0.06, 0.6, M.wood, 0, y, 0));
  g.add(box(0.5, 0.07, 0.5, M.darkWood, 0, y + 0.005, 0));
  // Iron rim (four short bars around the edge).
  g.add(box(0.62, 0.09, 0.06, M.iron, 0, y + 0.01, -0.3));
  g.add(box(0.62, 0.09, 0.06, M.iron, 0, y + 0.01, 0.3));
  g.add(box(0.06, 0.09, 0.62, M.iron, -0.3, y + 0.01, 0));
  g.add(box(0.06, 0.09, 0.62, M.iron, 0.3, y + 0.01, 0));
  // Iron boss center.
  g.add(box(0.16, 0.12, 0.16, M.iron, 0, y + 0.05, 0));
  g.add(box(0.06, 0.14, 0.06, M.ironDark, 0, y + 0.06, 0));
  return g;
}

export function ironShield() {
  const g = new THREE.Group();
  const y = 0.05;
  // Rectangular-ish body with a triangular bottom (kite shield vibes).
  g.add(box(0.65, 0.08, 0.7, M.iron, 0, y, 0));
  g.add(box(0.5, 0.09, 0.55, M.ironDark, 0, y + 0.005, 0));
  // Rim.
  g.add(box(0.68, 0.1, 0.05, M.steel, 0, y + 0.01, -0.35));
  g.add(box(0.68, 0.1, 0.05, M.steel, 0, y + 0.01, 0.35));
  g.add(box(0.05, 0.1, 0.75, M.steel, -0.34, y + 0.01, 0));
  g.add(box(0.05, 0.1, 0.75, M.steel, 0.34, y + 0.01, 0));
  // Cross emblem in the center.
  g.add(box(0.08, 0.12, 0.34, M.steelBright, 0, y + 0.05, 0));
  g.add(box(0.28, 0.12, 0.08, M.steelBright, 0, y + 0.05, -0.05));
  return g;
}

export function dragonShield() {
  const g = new THREE.Group();
  const y = 0.06;
  // Green base with scale-like alternating tiles.
  g.add(box(0.7, 0.08, 0.7, M.dragonGreen, 0, y, 0));
  for (let iz = -2; iz <= 2; iz++) {
    for (let ix = -2; ix <= 2; ix++) {
      if ((ix + iz) & 1) continue;
      g.add(box(0.12, 0.09, 0.12, M.dragonGreenLight, ix * 0.13, y + 0.005, iz * 0.13));
    }
  }
  // Iron rim.
  g.add(box(0.74, 0.11, 0.05, M.ironDark, 0, y + 0.01, -0.36));
  g.add(box(0.74, 0.11, 0.05, M.ironDark, 0, y + 0.01, 0.36));
  g.add(box(0.05, 0.11, 0.77, M.ironDark, -0.36, y + 0.01, 0));
  g.add(box(0.05, 0.11, 0.77, M.ironDark, 0.36, y + 0.01, 0));
  // Dragon-head boss: snout, eyes, horns.
  g.add(box(0.24, 0.16, 0.22, M.dragonGreen, 0, y + 0.06, 0));
  g.add(box(0.18, 0.1, 0.14, M.dragonGreenLight, 0, y + 0.06, 0.12));
  g.add(box(0.05, 0.05, 0.03, M.yellowGem, -0.06, y + 0.13, 0.05));
  g.add(box(0.05, 0.05, 0.03, M.yellowGem, 0.06, y + 0.13, 0.05));
  g.add(box(0.05, 0.13, 0.05, M.dark, -0.09, y + 0.12, -0.06));
  g.add(box(0.05, 0.13, 0.05, M.dark, 0.09, y + 0.12, -0.06));
  return g;
}

export function towerShield() {
  const g = new THREE.Group();
  const y = 0.06;
  // Tall narrow steel body.
  g.add(box(0.55, 0.08, 0.9, M.steel, 0, y, 0));
  g.add(box(0.42, 0.09, 0.78, M.iron, 0, y + 0.005, 0));
  // Vertical ridge down the middle.
  g.add(box(0.09, 0.12, 0.86, M.steelBright, 0, y + 0.03, 0));
  // Studded corners.
  for (const [x, z] of [[-0.22, -0.4], [0.22, -0.4], [-0.22, 0.4], [0.22, 0.4]]) {
    g.add(box(0.07, 0.11, 0.07, M.ironDark, x, y + 0.02, z));
  }
  // Rim.
  g.add(box(0.58, 0.1, 0.05, M.ironDark, 0, y + 0.01, -0.45));
  g.add(box(0.58, 0.1, 0.05, M.ironDark, 0, y + 0.01, 0.45));
  return g;
}

// ─── HELMETS ─────────────────────────────────────────────────────
export function ironHelm() {
  const g = new THREE.Group();
  const y = 0.14;
  // Dome — three stacked boxes narrowing at the top.
  g.add(box(0.42, 0.14, 0.42, M.iron, 0, y, 0));
  g.add(box(0.4, 0.14, 0.4, M.iron, 0, y + 0.13, 0));
  g.add(box(0.28, 0.08, 0.28, M.iron, 0, y + 0.23, 0));
  // Face slot: dark T-shape.
  g.add(box(0.3, 0.05, 0.02, M.dark, 0, y + 0.06, 0.21));
  g.add(box(0.05, 0.14, 0.02, M.dark, 0, y + 0.02, 0.21));
  // Rim.
  g.add(box(0.44, 0.04, 0.44, M.ironDark, 0, y - 0.06, 0));
  return g;
}

export function steelHelm() {
  const g = new THREE.Group();
  const y = 0.14;
  g.add(box(0.44, 0.16, 0.42, M.steel, 0, y, 0));
  g.add(box(0.4, 0.16, 0.4, M.steelBright, 0, y + 0.14, 0));
  g.add(box(0.24, 0.1, 0.24, M.steel, 0, y + 0.26, 0));
  // Eye slits (two separate).
  g.add(box(0.11, 0.04, 0.02, M.dark, -0.08, y + 0.08, 0.21));
  g.add(box(0.11, 0.04, 0.02, M.dark, 0.08, y + 0.08, 0.21));
  // Nose guard.
  g.add(box(0.06, 0.14, 0.05, M.steelBright, 0, y - 0.02, 0.22));
  // Cheek guards.
  g.add(box(0.05, 0.16, 0.2, M.steel, -0.2, y - 0.02, 0.05));
  g.add(box(0.05, 0.16, 0.2, M.steel, 0.2, y - 0.02, 0.05));
  // Red plume mount + short plume.
  g.add(box(0.06, 0.1, 0.06, M.gold, 0, y + 0.34, 0));
  g.add(box(0.1, 0.06, 0.28, M.redTrim, 0, y + 0.36, -0.12));
  return g;
}

export function dragonHelm() {
  const g = new THREE.Group();
  const y = 0.15;
  g.add(box(0.44, 0.16, 0.44, M.dragonGreen, 0, y, 0));
  g.add(box(0.42, 0.14, 0.42, M.dragonGreenLight, 0, y + 0.14, 0));
  // Snarling brow ridge over the eyes.
  g.add(box(0.42, 0.06, 0.06, M.dragonSpine, 0, y + 0.14, 0.19));
  // Yellow slit eyes.
  g.add(box(0.09, 0.04, 0.02, M.yellowGem, -0.11, y + 0.07, 0.22));
  g.add(box(0.09, 0.04, 0.02, M.yellowGem, 0.11, y + 0.07, 0.22));
  // Two swept-back horns.
  g.add(box(0.08, 0.28, 0.08, M.dragonSpine, -0.15, y + 0.28, -0.05));
  g.add(box(0.08, 0.28, 0.08, M.dragonSpine, 0.15, y + 0.28, -0.05));
  // Spine crest on top: three shrinking blocks.
  g.add(box(0.06, 0.14, 0.09, M.dragonSpine, 0, y + 0.28, 0.08));
  g.add(box(0.06, 0.12, 0.09, M.dragonSpine, 0, y + 0.27, -0.02));
  g.add(box(0.06, 0.1, 0.09, M.dragonSpine, 0, y + 0.26, -0.12));
  return g;
}

export function goldenCrown() {
  const g = new THREE.Group();
  const y = 0.06;
  // Gold band with 5 spikes and gems between.
  g.add(box(0.44, 0.12, 0.44, M.gold, 0, y, 0));
  g.add(box(0.4, 0.12, 0.4, M.goldDark, 0, y + 0.005, 0));
  // Spikes at the corners and mid-front.
  g.add(box(0.08, 0.24, 0.08, M.gold, -0.18, y + 0.18, 0.18));
  g.add(box(0.08, 0.24, 0.08, M.gold, 0.18, y + 0.18, 0.18));
  g.add(box(0.08, 0.24, 0.08, M.gold, -0.18, y + 0.18, -0.18));
  g.add(box(0.08, 0.24, 0.08, M.gold, 0.18, y + 0.18, -0.18));
  g.add(box(0.1, 0.3, 0.1, M.gold, 0, y + 0.22, 0.18));
  // Gems set into the band.
  g.add(box(0.07, 0.07, 0.04, M.redGem, 0, y + 0.06, 0.23));
  g.add(box(0.05, 0.06, 0.04, M.greenGem, -0.14, y + 0.06, 0.23));
  g.add(box(0.05, 0.06, 0.04, M.blueGem, 0.14, y + 0.06, 0.23));
  return g;
}

// ─── ARMORS (chestpieces) ────────────────────────────────────────
export function leatherArmor() {
  const g = new THREE.Group();
  const y = 0.1;
  // Vest torso.
  g.add(box(0.5, 0.2, 0.35, M.leather, 0, y, 0));
  g.add(box(0.5, 0.24, 0.3, M.leather, 0, y + 0.16, 0));
  // Shoulder pads.
  g.add(box(0.18, 0.16, 0.24, M.leatherDark, -0.28, y + 0.12, 0));
  g.add(box(0.18, 0.16, 0.24, M.leatherDark, 0.28, y + 0.12, 0));
  // Belt with buckle.
  g.add(box(0.55, 0.06, 0.36, M.darkWood, 0, y + 0.03, 0));
  g.add(box(0.1, 0.08, 0.06, M.bronze, 0, y + 0.03, 0.19));
  // Stitching hint down the front.
  g.add(box(0.03, 0.28, 0.03, M.leatherDark, 0, y + 0.14, 0.16));
  return g;
}

export function chainMail() {
  const g = new THREE.Group();
  const y = 0.1;
  g.add(box(0.52, 0.4, 0.34, M.iron, 0, y + 0.06, 0));
  // Woven chain pattern approximated by rows of small offset blocks.
  for (let iy = 0; iy < 5; iy++) {
    for (let ix = -2; ix <= 2; ix++) {
      const off = (iy & 1) ? 0.04 : 0;
      g.add(box(0.06, 0.06, 0.03, M.steel,
        ix * 0.1 + off - 0.02, y + 0.05 + iy * 0.07, 0.18));
    }
  }
  // Shoulder caps.
  g.add(box(0.18, 0.14, 0.28, M.ironDark, -0.3, y + 0.14, 0));
  g.add(box(0.18, 0.14, 0.28, M.ironDark, 0.3, y + 0.14, 0));
  // Leather belt at the waist.
  g.add(box(0.55, 0.06, 0.36, M.leatherDark, 0, y + 0.02, 0));
  return g;
}

export function plateArmor() {
  const g = new THREE.Group();
  const y = 0.1;
  // Bright breastplate with a curved center ridge.
  g.add(box(0.54, 0.42, 0.34, M.steelBright, 0, y + 0.08, 0));
  g.add(box(0.12, 0.44, 0.35, M.steel, 0, y + 0.08, 0));
  // Abdomen ridges.
  for (let iy = 0; iy < 3; iy++) {
    g.add(box(0.5, 0.03, 0.36, M.iron, 0, y + iy * 0.07, 0));
  }
  // Pauldrons.
  g.add(box(0.22, 0.2, 0.28, M.steelBright, -0.32, y + 0.18, 0));
  g.add(box(0.22, 0.2, 0.28, M.steelBright, 0.32, y + 0.18, 0));
  g.add(box(0.06, 0.06, 0.06, M.gold, -0.32, y + 0.28, 0.02));
  g.add(box(0.06, 0.06, 0.06, M.gold, 0.32, y + 0.28, 0.02));
  // Red trim collar.
  g.add(box(0.36, 0.06, 0.34, M.redTrim, 0, y + 0.32, 0));
  // Gold buckle-crest.
  g.add(box(0.1, 0.1, 0.04, M.gold, 0, y + 0.14, 0.18));
  return g;
}

export function dragonScaleArmor() {
  const g = new THREE.Group();
  const y = 0.1;
  g.add(box(0.54, 0.44, 0.34, M.dragonGreen, 0, y + 0.08, 0));
  // Scale rows on the front.
  for (let iy = 0; iy < 6; iy++) {
    for (let ix = -2; ix <= 2; ix++) {
      const off = (iy & 1) ? 0.05 : 0;
      g.add(box(0.08, 0.05, 0.03, M.dragonGreenLight,
        ix * 0.1 + off - 0.025, y + iy * 0.07, 0.18));
    }
  }
  // Spine ridge down the back.
  for (let i = 0; i < 5; i++) {
    g.add(box(0.06, 0.09, 0.06, M.dragonSpine, 0, y + 0.02 + i * 0.08, -0.17));
  }
  // Pauldrons with claws.
  g.add(box(0.2, 0.18, 0.28, M.dragonGreen, -0.32, y + 0.18, 0));
  g.add(box(0.2, 0.18, 0.28, M.dragonGreen, 0.32, y + 0.18, 0));
  g.add(box(0.06, 0.1, 0.04, M.claw, -0.32, y + 0.22, 0.15));
  g.add(box(0.06, 0.1, 0.04, M.claw, 0.32, y + 0.22, 0.15));
  return g;
}

// ─── LEGS ────────────────────────────────────────────────────────
function twoLegs(color, extras) {
  const g = new THREE.Group();
  const y = 0.08;
  g.add(box(0.16, 0.4, 0.2, color, -0.11, y + 0.14, 0));
  g.add(box(0.16, 0.4, 0.2, color, 0.11, y + 0.14, 0));
  // Belt across the top.
  g.add(box(0.4, 0.06, 0.24, M.leatherDark, 0, y + 0.34, 0));
  if (extras) extras(g, y);
  return g;
}

export function leatherLegs() {
  return twoLegs(M.leather, (g, y) => {
    // Simple stitching lines.
    g.add(box(0.02, 0.36, 0.02, M.leatherDark, -0.11, y + 0.14, 0.1));
    g.add(box(0.02, 0.36, 0.02, M.leatherDark, 0.11, y + 0.14, 0.1));
  });
}

export function chainLegs() {
  return twoLegs(M.iron, (g, y) => {
    // Chain pattern on the outside faces.
    for (let leg of [-0.11, 0.11]) {
      for (let iy = 0; iy < 4; iy++) {
        for (let ix = -1; ix <= 1; ix++) {
          const off = (iy & 1) ? 0.03 : 0;
          g.add(box(0.05, 0.05, 0.02, M.steel,
            leg + ix * 0.05 + off - 0.015, y + 0.02 + iy * 0.08, 0.1));
        }
      }
    }
  });
}

export function plateLegs() {
  return twoLegs(M.steelBright, (g, y) => {
    // Knee plates + shin ridges.
    g.add(box(0.19, 0.1, 0.08, M.steel, -0.11, y + 0.14, 0.11));
    g.add(box(0.19, 0.1, 0.08, M.steel, 0.11, y + 0.14, 0.11));
    g.add(box(0.14, 0.04, 0.22, M.iron, -0.11, y + 0.02, 0));
    g.add(box(0.14, 0.04, 0.22, M.iron, 0.11, y + 0.02, 0));
    g.add(box(0.06, 0.06, 0.04, M.gold, 0, y + 0.34, 0.13));
  });
}

export function dragonLegs() {
  return twoLegs(M.dragonGreen, (g, y) => {
    // Scale rows.
    for (let leg of [-0.11, 0.11]) {
      for (let iy = 0; iy < 5; iy++) {
        for (let ix = -1; ix <= 1; ix++) {
          const off = (iy & 1) ? 0.04 : 0;
          g.add(box(0.06, 0.04, 0.02, M.dragonGreenLight,
            leg + ix * 0.055 + off - 0.02, y + 0.02 + iy * 0.07, 0.1));
        }
      }
    }
    // Small spikes running down the outside.
    for (let leg of [-0.19, 0.19]) {
      for (let iy = 0; iy < 3; iy++) {
        g.add(box(0.05, 0.05, 0.05, M.dragonSpine, leg, y + 0.06 + iy * 0.1, 0));
      }
    }
  });
}

// ─── BOOTS ──────────────────────────────────────────────────────
function bootPair(color, extras) {
  const g = new THREE.Group();
  const y = 0.05;
  for (const bx of [-0.12, 0.12]) {
    g.add(box(0.18, 0.14, 0.28, color, bx, y + 0.05, 0.02)); // foot
    g.add(box(0.18, 0.18, 0.14, color, bx, y + 0.14, -0.08)); // ankle
    g.add(box(0.2, 0.03, 0.3, M.dark, bx, y - 0.02, 0.02)); // sole
  }
  if (extras) extras(g, y);
  return g;
}

export function leatherBoots() {
  return bootPair(M.leather, (g, y) => {
    for (const bx of [-0.12, 0.12]) {
      g.add(box(0.19, 0.03, 0.14, M.leatherDark, bx, y + 0.24, -0.08)); // cuff
      g.add(box(0.03, 0.05, 0.03, M.bronze, bx, y + 0.16, -0.02)); // buckle
    }
  });
}

export function steelBoots() {
  return bootPair(M.steel, (g, y) => {
    for (const bx of [-0.12, 0.12]) {
      g.add(box(0.2, 0.06, 0.3, M.steelBright, bx, y + 0.14, 0.02)); // top plate
      g.add(box(0.19, 0.16, 0.06, M.steel, bx, y + 0.14, 0.16)); // toe cap
      g.add(box(0.05, 0.04, 0.04, M.gold, bx, y + 0.2, -0.02)); // rivet
    }
  });
}

export function dragonBoots() {
  return bootPair(M.dragonGreen, (g, y) => {
    for (const bx of [-0.12, 0.12]) {
      // Scale strip.
      for (let iy = 0; iy < 3; iy++) {
        g.add(box(0.16, 0.03, 0.02, M.dragonGreenLight, bx, y + 0.06 + iy * 0.05, 0.16));
      }
      // Three claws poking from the toe.
      for (let ci = -1; ci <= 1; ci++) {
        g.add(box(0.03, 0.04, 0.06, M.claw, bx + ci * 0.05, y + 0.02, 0.2));
      }
    }
  });
}

export function wizardBoots() {
  return bootPair(M.magePurple, (g, y) => {
    for (const bx of [-0.12, 0.12]) {
      // Curled toe — tapered upturn.
      g.add(box(0.14, 0.08, 0.1, M.magePurple, bx, y + 0.08, 0.2));
      g.add(box(0.1, 0.1, 0.06, M.magePurple, bx, y + 0.14, 0.24));
      g.add(box(0.06, 0.06, 0.04, M.gold, bx, y + 0.2, 0.24)); // bell/tassel
      g.add(box(0.05, 0.04, 0.14, M.gold, bx, y + 0.14, -0.08)); // gold trim on cuff
    }
  });
}

// ─── AMULETS ────────────────────────────────────────────────────
function amuletBase(cordColor, pendantBuild) {
  const g = new THREE.Group();
  const y = 0.05;
  // Cord: two arcs approximating a loop.
  for (let i = -2; i <= 2; i++) {
    g.add(box(0.05, 0.04, 0.05, cordColor, i * 0.06, y, -0.16));
  }
  for (let i = -2; i <= 2; i++) {
    g.add(box(0.05, 0.04, 0.05, cordColor,
      i * 0.06, y, 0.08 + Math.abs(i) * 0.03));
  }
  pendantBuild(g, y);
  return g;
}

export function boneAmulet() {
  return amuletBase(M.leather, (g, y) => {
    // Bone claw pendant.
    g.add(box(0.1, 0.06, 0.16, M.bone, 0, y + 0.02, 0.2));
    g.add(box(0.06, 0.05, 0.1, M.bone, 0.03, y + 0.02, 0.3));
    g.add(box(0.03, 0.06, 0.04, M.leatherDark, 0, y + 0.03, 0.12)); // binding
  });
}

export function goldAmulet() {
  return amuletBase(M.gold, (g, y) => {
    // Sun pendant: gold disc with rays.
    g.add(box(0.14, 0.05, 0.14, M.gold, 0, y + 0.02, 0.22));
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const rx = Math.cos(ang) * 0.11;
      const rz = Math.sin(ang) * 0.11 + 0.22;
      g.add(box(0.04, 0.05, 0.04, M.gold, rx, y + 0.02, rz));
    }
    g.add(box(0.05, 0.06, 0.05, M.redGem, 0, y + 0.04, 0.22));
  });
}

export function magicAmulet() {
  return amuletBase(M.silver, (g, y) => {
    // Silver frame around a blue gem.
    g.add(box(0.14, 0.06, 0.14, M.silver, 0, y + 0.02, 0.22));
    g.add(box(0.1, 0.09, 0.1, M.blueGem, 0, y + 0.04, 0.22));
    // Small silver studs at the cardinals.
    g.add(box(0.04, 0.05, 0.03, M.silver, 0, y + 0.03, 0.32));
    g.add(box(0.04, 0.05, 0.03, M.silver, 0, y + 0.03, 0.12));
    g.add(box(0.03, 0.05, 0.04, M.silver, -0.08, y + 0.03, 0.22));
    g.add(box(0.03, 0.05, 0.04, M.silver, 0.08, y + 0.03, 0.22));
  });
}

export function dragonAmulet() {
  return amuletBase(M.dragonGreen, (g, y) => {
    // Gold-set red gem shaped like a dragon eye.
    g.add(box(0.16, 0.05, 0.16, M.gold, 0, y + 0.02, 0.22));
    g.add(box(0.11, 0.08, 0.11, M.redGem, 0, y + 0.04, 0.22));
    g.add(box(0.03, 0.09, 0.09, M.dark, 0, y + 0.05, 0.22)); // slit pupil
    // Tiny dragon claws either side.
    g.add(box(0.04, 0.05, 0.06, M.claw, -0.12, y + 0.02, 0.22));
    g.add(box(0.04, 0.05, 0.06, M.claw, 0.12, y + 0.02, 0.22));
  });
}

// ─── SHOWROOM LAYOUT ────────────────────────────────────────────
// Rows are categories, columns are variants — 7 x 4 = 28 items.
// Coordinates are RELATIVE to the showroom origin tile.
export const SHOWROOM = [
  // row 0: swords
  [0, 0, bronzeShortSword, 'Bronze Short Sword'],
  [1, 0, ironLongsword, 'Iron Longsword'],
  [2, 0, twoHandedSword, 'Two-Handed Sword'],
  [3, 0, magicSword, 'Magic Sword'],
  // row 1: shields
  [0, 1, woodenBuckler, 'Wooden Buckler'],
  [1, 1, ironShield, 'Iron Shield'],
  [2, 1, dragonShield, 'Dragon Shield'],
  [3, 1, towerShield, 'Tower Shield'],
  // row 2: helmets
  [0, 2, ironHelm, 'Iron Helm'],
  [1, 2, steelHelm, 'Steel Helm'],
  [2, 2, dragonHelm, 'Dragon Helm'],
  [3, 2, goldenCrown, 'Golden Crown'],
  // row 3: armors
  [0, 3, leatherArmor, 'Leather Armor'],
  [1, 3, chainMail, 'Chain Mail'],
  [2, 3, plateArmor, 'Plate Armor'],
  [3, 3, dragonScaleArmor, 'Dragon Scale Armor'],
  // row 4: legs
  [0, 4, leatherLegs, 'Leather Legs'],
  [1, 4, chainLegs, 'Chain Legs'],
  [2, 4, plateLegs, 'Plate Legs'],
  [3, 4, dragonLegs, 'Dragon Legs'],
  // row 5: boots
  [0, 5, leatherBoots, 'Leather Boots'],
  [1, 5, steelBoots, 'Steel Boots'],
  [2, 5, dragonBoots, 'Dragon Boots'],
  [3, 5, wizardBoots, 'Wizard Boots'],
  // row 6: amulets
  [0, 6, boneAmulet, 'Bone Amulet'],
  [1, 6, goldAmulet, 'Gold Amulet'],
  [2, 6, magicAmulet, 'Magic Amulet'],
  [3, 6, dragonAmulet, 'Dragon Amulet'],
];
