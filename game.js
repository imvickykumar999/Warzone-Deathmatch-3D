/**
 * Ursina TCP Deathmatch - Browser Client
 * Fullscreen 3D FPS playable in browser with keyboard and mouse.
 * Exact UI/UX replica of Ursina desktop client with 100% protocol compatibility.
 */

import * as THREE from './three.module.js';

// --- GAME CONSTANTS ---
const MAX_HEALTH = 250;
const MAGAZINE_SIZE = 15;
const RELOAD_TIME = 2.0;
const PLAYER_SPEED = 7.0;
const JUMP_FORCE = 8.5;
const GRAVITY = 22.0;
const BULLET_SPEED = 40.0;
const NETWORK_TICK_RATE = 1000 / 30; // 30 updates per second

// Color palette matching desktop enemy.py
const COLOR_PALETTE = {
  "Blue": [52, 152, 219],
  "Green": [46, 204, 113],
  "Orange": [230, 126, 34],
  "Purple": [155, 89, 182],
  "Yellow": [241, 196, 15],
  "Red": [231, 76, 60],
  "Turquoise": [26, 188, 156],
  "Pink": [236, 64, 122],
  "Cyan": [0, 188, 212],
  "Lime": [139, 195, 74]
};
const COLOR_NAMES = Object.keys(COLOR_PALETTE);

// Spawn points matching desktop player.py (Z negated for Three.js -Z forward)
const SPAWN_POINTS = [
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(12, 1, 0),
  new THREE.Vector3(0, 1, -12),
  new THREE.Vector3(12, 1, -12),
  new THREE.Vector3(-6, 1, 6),
  new THREE.Vector3(6, 1, 6),
  new THREE.Vector3(0, 6, -14),
  new THREE.Vector3(0, 6, 14),
  new THREE.Vector3(16, 6, 0),
  new THREE.Vector3(-16, 6, 0)
];

// Helper to convert RGB array to hex number
function rgbToHex(rgb) {
  return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}

// Helper to convert RGB array to CSS string
function rgbToCss(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

// Map identifier or username to color
function getPlayerColor(id, username) {
  if (username) {
    const clean = username.trim().toLowerCase();
    for (const [name, rgb] of Object.entries(COLOR_PALETTE)) {
      if (name.toLowerCase() === clean) return rgb;
    }
    for (const [name, rgb] of Object.entries(COLOR_PALETTE)) {
      if (clean.includes(name.toLowerCase())) return rgb;
    }
  }
  const num = parseInt(id, 10);
  if (!isNaN(num)) {
    const idx = Math.abs(num - 1) % COLOR_NAMES.length;
    return COLOR_PALETTE[COLOR_NAMES[idx]];
  }
  let hash = 0;
  const s = String(username || id || 'player');
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
  }
  const idx = Math.abs(hash) % COLOR_NAMES.length;
  return COLOR_PALETTE[COLOR_NAMES[idx]];
}

// DOM Elements
const $ = (id) => document.getElementById(id);
const connectScreen = $('connect-screen');
const gameScreen = $('game-screen');
const canvas = $('game-canvas');
const usernameInput = $('username');
const serverInput = $('server');
const portInput = $('port');
const bridgeInput = $('bridge');
const colorIndicator = $('color-indicator');
const connectError = $('connect-error');
const btnPlay = $('btn-play');
const btnClose = $('btn-close');
const healthbarFill = $('healthbar-fill');
const healthText = $('health-text');
const ammoText = $('ammo-text');
const reloadText = $('reload-text');
const deathScreen = $('death-screen');
const respawnButton = $('respawn-button');
const timerText = $('timer-text');
const fullscreenButton = $('fullscreen-button');
const audioToggleButton = $('audio-toggle-button');
const lobbyMusic = $('lobby-music');

// --- GAME STATE ---
const state = {
  username: '',
  server: '',
  port: 8888,
  id: '',
  colorRgb: [52, 152, 219],
  health: MAX_HEALTH,
  ammo: MAGAZINE_SIZE,
  isReloading: false,
  reloadTimer: 0.0,
  isDead: false,
  respawnTimer: 0.0,
  
  // Controls & Movement
  keys: new Set(),
  yaw: 0.0, // Radians
  pitch: 0.0, // Radians
  playerPos: new THREE.Vector3(0, 1, 0),
  velocityY: 0.0,
  isGrounded: true,
  isZoomed: false,
  cPressTime: 0,
  
  // Networking
  socket: null,
  lastNetworkSendTime: 0,
  prevPos: new THREE.Vector3(),
  prevYaw: 0,
  
  // Entities
  enemies: new Map(), // id -> { id, username, health, mesh, targetPos, targetYaw, nameTag }
  bullets: [], // { mesh, velocity, damage, lifetime, isSlave }
  obstacles: [], // AABB array: { minX, maxX, minY, maxY, minZ, maxZ }
  
  // Audio
  audioCtx: null,
  gunAudioBuffer: null,
  musicMuted: false
};

// --- AUDIO SETUP ---
function initAudio() {
  try {
    if (!state.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioCtx();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }

    if (!state.gunAudioBuffer) {
      fetch('assets/bullet.mp3')
        .then(res => res.arrayBuffer())
        .then(buffer => state.audioCtx.decodeAudioData(buffer))
        .then(decoded => { state.gunAudioBuffer = decoded; })
        .catch(err => console.warn('Could not load bullet audio buffer:', err));
    }

    // Play lobby music
    if (lobbyMusic && !state.musicMuted) {
      lobbyMusic.volume = 0.3;
      lobbyMusic.play().catch(() => {});
    }
  } catch (e) {
    console.warn('Audio init error:', e);
  }
}

function playGunSound() {
  if (state.audioCtx && state.gunAudioBuffer) {
    try {
      const source = state.audioCtx.createBufferSource();
      source.buffer = state.gunAudioBuffer;
      const gainNode = state.audioCtx.createGain();
      gainNode.gain.value = 0.8;
      source.connect(gainNode);
      gainNode.connect(state.audioCtx.destination);
      source.start(0);
      return;
    } catch (e) {
      // Fallback
    }
  }
  const audio = $('bullet-audio');
  if (audio) {
    const clone = audio.cloneNode();
    clone.volume = 0.6;
    clone.play().catch(() => {});
  }
}

// --- TEXTURE LOADER ---
const textureLoader = new THREE.TextureLoader();
function loadTexture(url, repeatX = 1, repeatY = 1) {
  const tex = textureLoader.load(url);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

// Procedural bordered texture for players matching enemy.py create_player_texture
function createPlayerTexture(rgb) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');

  // Fill inner
  ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  ctx.fillRect(0, 0, 64, 64);

  // Border shading
  const borderR = Math.max(0, Math.floor(rgb[0] * 0.65));
  const borderG = Math.max(0, Math.floor(rgb[1] * 0.65));
  const borderB = Math.max(0, Math.floor(rgb[2] * 0.65));
  ctx.fillStyle = `rgb(${borderR}, ${borderG}, ${borderB})`;
  ctx.fillRect(0, 0, 64, 3);
  ctx.fillRect(0, 61, 64, 3);
  ctx.fillRect(0, 0, 3, 64);
  ctx.fillRect(61, 0, 3, 64);

  const texture = new THREE.CanvasTexture(c);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

// --- THREE.JS SCENE SETUP ---
let scene, camera, renderer, clock;
let localGunMesh = null;
let wallTexture, floorTexture, skyTexture;

function setupThree() {
  if (renderer) {
    onWindowResize();
    return;
  }

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 1200);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Preload textures
  wallTexture = loadTexture('assets/wall.png');
  floorTexture = loadTexture('assets/floor.png');
  skyTexture = textureLoader.load('assets/sky.png');

  // Sky Sphere (Exact scale match to Ursina sky)
  const skyGeo = new THREE.SphereGeometry(600, 32, 32);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
  dirLight.position.set(-20, 40, -20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 120;
  dirLight.shadow.camera.left = -30;
  dirLight.shadow.camera.right = 30;
  dirLight.shadow.camera.top = 30;
  dirLight.shadow.camera.bottom = -30;
  scene.add(dirLight);

  // Build the Map and Arena
  buildArena();

  // Create First-Person Gun attached to Camera
  createFirstPersonGun();

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Add solid obstacle for collision detection
function addObstacle(minX, maxX, minY, maxY, minZ, maxZ, isFloor = false) {
  state.obstacles.push({
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY),
    maxY: Math.max(minY, maxY),
    minZ: Math.min(minZ, maxZ),
    maxZ: Math.max(minZ, maxZ),
    isFloor
  });
}

// Helper to create a textured box mesh and register collision
function createBoxEntity(x, y, z, sx, sy, sz, texture, tileX = 1, tileY = 1, registerCollision = true) {
  let mat;
  if (texture) {
    const tex = texture.clone();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(tileX, tileY);
    tex.needsUpdate = true;
    mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 });
  } else {
    mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.85 });
  }

  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  if (registerCollision) {
    addObstacle(x - sx / 2, x + sx / 2, y - sy / 2, y + sy / 2, z - sz / 2, z + sz / 2);
  }
  return mesh;
}

// --- BUILD ARENA ---
function buildArena() {
  // 1. Ground Floor Checkerboard (from -20 to 20 in steps of 2)
  // In Ursina, cube scale 2 centered at y=0 has top surface at y=1.0
  const groundTex1 = loadTexture('assets/floor.png', 1, 1);
  const groundTex2 = loadTexture('assets/floor.png', 1, 1);

  // Checkerboard materials with identical tint as Ursina
  // Darker: hsv(0, 0.2, 0.8), Lighter: hsv(0, 0.2, 1.0)
  const matLighter = new THREE.MeshStandardMaterial({ map: groundTex1, color: 0xffe6e6, roughness: 0.9 });
  const matDarker = new THREE.MeshStandardMaterial({ map: groundTex2, color: 0xccb8b8, roughness: 0.9 });
  const cubeGeo = new THREE.BoxGeometry(2, 2, 2);

  let dark1 = true;
  for (let z = -20; z < 20; z += 2) {
    let dark2 = !dark1;
    for (let x = -20; x < 20; x += 2) {
      const tile = new THREE.Mesh(cubeGeo, dark2 ? matDarker : matLighter);
      tile.position.set(x + 1, 0, z + 1);
      tile.receiveShadow = true;
      scene.add(tile);
      dark2 = !dark2;
    }
    dark1 = !dark1;
  }

  // 2. 1st Floor (Upper Deck) Platforms (matching client/floor.py with -Z as North)
  // Standing height y = 6.0, slab thickness 0.5, center y = 5.75
  const floorY = 5.75;
  const slabThick = 0.5;

  // North platform: (0, 5.75, -13), scale (40, 0.5, 14)
  createBoxEntity(0, floorY, -13, 40, slabThick, 14, floorTexture, 20, 7, false);
  addObstacle(-20, 20, 5.5, 6.0, -20, -6, true);

  // South platform: (0, 5.75, 13), scale (40, 0.5, 14)
  createBoxEntity(0, floorY, 13, 40, slabThick, 14, floorTexture, 20, 7, false);
  addObstacle(-20, 20, 5.5, 6.0, 6, 20, true);

  // East walkway: (16, 5.75, 0), scale (8, 0.5, 12)
  createBoxEntity(16, floorY, 0, 8, slabThick, 12, floorTexture, 4, 6, false);
  addObstacle(12, 20, 5.5, 6.0, -6, 6, true);

  // West walkway: (-16, 5.75, 0), scale (8, 0.5, 12)
  createBoxEntity(-16, floorY, 0, 8, slabThick, 12, floorTexture, 4, 6, false);
  addObstacle(-20, -12, 5.5, 6.0, -6, 6, true);

  // 3. Stairs (East & West)
  // Stair 1 (East flank at x = 8.5): climbs -Z from ground (z = 4.0, y = 1.0) to North 1st floor (z = -6.0, y = 6.0)
  for (let i = 0; i < 10; i++) {
    createBoxEntity(8.5, 1.25 + i * 0.5, 3.5 - i * 1.0, 3.5, 0.5, 1.0, floorTexture, 2, 1, false);
  }
  // Stair 1 Railings
  const deltaZ = 10.0;
  const deltaY = 5.0;
  const angle = Math.atan2(deltaY, deltaZ);
  const hypotLen = Math.hypot(deltaZ, deltaY);

  const railGeo = new THREE.BoxGeometry(0.2, 0.8, hypotLen);
  const railMat = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.85 });

  const rail1L = new THREE.Mesh(railGeo, railMat);
  rail1L.position.set(6.65, 3.9, -1.0);
  rail1L.rotation.x = angle;
  rail1L.castShadow = true;
  scene.add(rail1L);

  const rail1R = new THREE.Mesh(railGeo, railMat);
  rail1R.position.set(10.35, 3.9, -1.0);
  rail1R.rotation.x = angle;
  rail1R.castShadow = true;
  scene.add(rail1R);

  // Stair 2 (West flank at x = -8.5): climbs +Z from ground (z = -4.0, y = 1.0) to South 1st floor (z = 6.0, y = 6.0)
  for (let i = 0; i < 10; i++) {
    createBoxEntity(-8.5, 1.25 + i * 0.5, -3.5 + i * 1.0, 3.5, 0.5, 1.0, floorTexture, 2, 1, false);
  }
  // Stair 2 Railings
  const rail2L = new THREE.Mesh(railGeo, railMat);
  rail2L.position.set(-6.65, 3.9, 1.0);
  rail2L.rotation.x = -angle;
  rail2L.castShadow = true;
  scene.add(rail2L);

  const rail2R = new THREE.Mesh(railGeo, railMat);
  rail2R.position.set(-10.35, 3.9, 1.0);
  rail2R.rotation.x = -angle;
  rail2R.castShadow = true;
  scene.add(rail2R);

  // 4. Support Pillars (scale 1, 5, 1)
  const pillars = [
    [12, 3.5, 6],
    [12, 3.5, -6],
    [-12, 3.5, 6],
    [-12, 3.5, -6]
  ];
  for (const [px, py, pz] of pillars) {
    createBoxEntity(px, py, pz, 1, 5, 1, wallTexture, 1, 2.5);
  }

  // 5. Railings along 1st floor atrium
  createBoxEntity(12, 6.5, 0, 0.4, 1.0, 12, wallTexture, 1, 6);
  createBoxEntity(-12, 6.5, 0, 0.4, 1.0, 12, wallTexture, 1, 6);
  // North atrium railings (leaving stair opening at x = 8.5)
  createBoxEntity(-2.625, 6.5, -6, 18.75, 1.0, 0.4, wallTexture, 9, 1);
  createBoxEntity(11.125, 6.5, -6, 1.75, 1.0, 0.4, wallTexture, 1, 1);
  // South atrium railings (leaving stair opening at x = -8.5)
  createBoxEntity(2.625, 6.5, 6, 18.75, 1.0, 0.4, wallTexture, 9, 1);
  createBoxEntity(-11.125, 6.5, 6, 1.75, 1.0, 0.4, wallTexture, 1, 1);

  // 6. 1st Floor Tactical Cover Barricades
  createBoxEntity(0, 7.5, -15, 4, 3.0, 1.0, wallTexture, 2, 1.5);
  createBoxEntity(0, 7.5, 15, 4, 3.0, 1.0, wallTexture, 2, 1.5);

  // 7. Tactical Cover Walls from client/map.py (Exact positions and dimensions)
  // In Ursina: origin_y = -0.5 means bottom at y=1.0, so centerY = 1.0 + sy/2
  const wallsData = [
    // Top-Right (+X, -Z) corner hiding bunker
    { pos: [16, 3, -13], scale: [1.5, 4, 6] },
    { pos: [13, 3, -16], scale: [6, 4, 1.5] },

    // Top-Left (-X, -Z) corner hiding bunker
    { pos: [-16, 3, -13], scale: [1.5, 4, 6] },
    { pos: [-13, 3, -16], scale: [6, 4, 1.5] },

    // Bottom-Left (-X, +Z) corner hiding bunker
    { pos: [-16, 3, 13], scale: [1.5, 4, 6] },
    { pos: [-13, 3, 16], scale: [6, 4, 1.5] },

    // Bottom-Right (+X, +Z) corner hiding bunker
    { pos: [16, 3, 13], scale: [1.5, 4, 6] },
    { pos: [13, 3, 16], scale: [6, 4, 1.5] },

    // Perimeter mid-lane cover
    { pos: [-15, 2.75, 0], scale: [1.5, 3.5, 4] },
    { pos: [0, 2.75, 15], scale: [4, 3.5, 1.5] },

    // Center tactical barricades
    { pos: [-4, 2.5, -3], scale: [3.5, 3, 1.2] },
    { pos: [4, 2.5, 3], scale: [3.5, 3, 1.2] },
  ];

  for (const w of wallsData) {
    const [x, y, z] = w.pos;
    const [sx, sy, sz] = w.scale;
    const tx = Math.max(1.0, Math.max(sx, sz) / 2.0);
    const ty = Math.max(1.0, sy / 2.0);
    createBoxEntity(x, y, z, sx, sy, sz, wallTexture, tx, ty);
  }
}

// --- FIRST-PERSON GUN MODEL ---
function createFirstPersonGun() {
  const hex = rgbToHex(state.colorRgb);
  const gunGeo = new THREE.BoxGeometry(0.1, 0.2, 0.65);
  const gunMat = new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.4,
    metalness: 0.2
  });

  localGunMesh = new THREE.Mesh(gunGeo, gunMat);
  // Match Ursina: position (0.6, -0.45) in camera UI coordinates
  localGunMesh.position.set(0.32, -0.24, -0.55);
  localGunMesh.rotation.set(
    THREE.MathUtils.degToRad(-20),
    THREE.MathUtils.degToRad(-20),
    THREE.MathUtils.degToRad(-5)
  );
  camera.add(localGunMesh);
  scene.add(camera);
}

function updateGunColor() {
  if (localGunMesh) {
    const hex = rgbToHex(state.colorRgb);
    localGunMesh.material.color.setHex(hex);
  }
}

// --- ENEMY MODEL CREATION ---
function createEnemyMesh(id, username) {
  const group = new THREE.Group();
  const colorRgb = getPlayerColor(id, username);
  const hex = rgbToHex(colorRgb);

  // Body cube scale (1, 2, 1), bottom at y=0, top at y=2
  const bodyGeo = new THREE.BoxGeometry(1, 2, 1);
  const bodyTex = createPlayerTexture(colorRgb);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: bodyTex,
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.1
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 1.0;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Attached gun: position (0.55, 1.5, -0.6) on right side facing forward (-Z)
  const gunGeo = new THREE.BoxGeometry(0.1, 0.2, 0.65);
  const gunMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4 });
  const gunMesh = new THREE.Mesh(gunGeo, gunMat);
  gunMesh.position.set(0.55, 1.5, -0.6);
  gunMesh.castShadow = true;
  group.add(gunMesh);

  // 3D Billboard Name Tag
  const canvasTag = document.createElement('canvas');
  canvasTag.width = 384;
  canvasTag.height = 96;
  const ctx = canvasTag.getContext('2d');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.roundRect ? ctx.roundRect(0, 0, 384, 96, 12) : ctx.fillRect(0, 0, 384, 96);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${username || 'Player ' + id} [${MAX_HEALTH}/${MAX_HEALTH}]`, 192, 48);

  const tagTex = new THREE.CanvasTexture(canvasTag);
  const tagMat = new THREE.SpriteMaterial({ map: tagTex, transparent: true });
  const tagSprite = new THREE.Sprite(tagMat);
  tagSprite.scale.set(3.2, 0.8, 1);
  tagSprite.position.set(0, 2.7, 0);
  group.add(tagSprite);

  group.userData = {
    bodyMesh,
    gunMesh,
    tagSprite,
    canvasTag,
    ctxTag: ctx,
    tagTex,
    baseColorRgb: colorRgb
  };

  return group;
}

function updateEnemyTag(enemy) {
  const ud = enemy.mesh.userData;
  if (!ud || !ud.ctxTag) return;
  const ctx = ud.ctxTag;
  ctx.clearRect(0, 0, 384, 96);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.roundRect ? ctx.roundRect(0, 0, 384, 96, 12) : ctx.fillRect(0, 0, 384, 96);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hp = Math.max(0, Math.round(enemy.health));
  ctx.fillText(`${enemy.username || 'Player ' + enemy.id} [${hp}/${MAX_HEALTH}]`, 192, 48);
  ud.tagTex.needsUpdate = true;

  // Turn redder as health drops matching Ursina
  const sat = Math.max(0, Math.min(1.0, 1.0 - enemy.health / MAX_HEALTH));
  const redColor = new THREE.Color().setHSL(0, sat, 1.0 - sat * 0.3);
  ud.bodyMesh.material.color = redColor;
}

// --- ACCURATE ARENA SURFACE & FLOOR DETECTION ---
// Ground Floor: 40x40 from X: [-20, 20], Z: [-20, 20] at height y = 1.0
// 1st Floor (Upper Deck): height y = 6.0 (ceiling at y = 5.5)
//   North Platform: X: [-20, 20], Z: [-20.0, -6.0]
//   South Platform: X: [-20, 20], Z: [6.0, 20.0]
//   East Walkway:   X: [12.0, 20.0], Z: [-6.0, 6.0]
//   West Walkway:   X: [-20.0, -12.0], Z: [-6.0, 6.0]
// East Stair 1: X: [6.75, 10.25], Z: [-6.0, 4.0], slope y = 1.0 + ((4.0 - z) / 10.0) * 5.0
// West Stair 2: X: [-10.25, -6.75], Z: [-4.0, 6.0], slope y = 1.0 + ((z - (-4.0)) / 10.0) * 5.0

function getCandidateFloors(x, z) {
  const floors = [];

  // 1. Ground Floor: 40x40 area centered at (0, 0)
  if (x >= -20 && x <= 20 && z >= -20 && z <= 20) {
    floors.push(1.0);
  }

  // 2. 1st Floor Platforms (Upper Deck at y = 6.0)
  const onNorth = (x >= -20 && x <= 20 && z >= -20.0 && z <= -6.0);
  const onSouth = (x >= -20 && x <= 20 && z >= 6.0 && z <= 20.0);
  const onEast = (x >= 12.0 && x <= 20.0 && z >= -6.0 && z <= 6.0);
  const onWest = (x >= -20.0 && x <= -12.0 && z >= -6.0 && z <= 6.0);
  if (onNorth || onSouth || onEast || onWest) {
    floors.push(6.0);
  }

  // 3. East Stair 1: climbs -Z from z = 4.0 (y = 1.0) to z = -6.0 (y = 6.0)
  if (x >= 6.75 && x <= 10.25 && z >= -6.0 && z <= 4.0) {
    const rampY = 1.0 + ((4.0 - z) / 10.0) * 5.0;
    floors.push(rampY);
  }

  // 4. West Stair 2: climbs +Z from z = -4.0 (y = 1.0) to z = 6.0 (y = 6.0)
  if (x >= -10.25 && x <= -6.75 && z >= -4.0 && z <= 6.0) {
    const rampY = 1.0 + ((z - (-4.0)) / 10.0) * 5.0;
    floors.push(rampY);
  }

  // 5. Tops of solid obstacles / barricades
  for (const obs of state.obstacles) {
    if (!obs.isFloor && x >= obs.minX && x <= obs.maxX && z >= obs.minZ && z <= obs.maxZ) {
      floors.push(obs.maxY);
    }
  }

  return floors;
}

function getFloorHeightBelow(x, currentY, z, isGrounded) {
  const candidates = getCandidateFloors(x, z);
  if (candidates.length === 0) return -999.0;

  // If grounded, allow small step up (0.55 units) matching Ursina
  const maxAllowedY = isGrounded ? (currentY + 0.55) : (currentY + 0.1);
  let best = -999.0;
  for (const f of candidates) {
    if (f <= maxAllowedY && f > best) {
      best = f;
    }
  }

  // Safety fallback: if player is within the 40x40 ground footprint and near ground level,
  // ensure ground floor at 1.0 is recognized so player never falls through
  if (best < 0 && x >= -20 && x <= 20 && z >= -20 && z <= 20 && currentY >= -0.5) {
    best = 1.0;
  }

  return best;
}

function getCeilingHeightAbove(x, currentY, z) {
  let minCeiling = Infinity;

  // 1. Check 1st floor slabs bottom (ceiling at y = 5.5)
  if (
    (x >= -20 && x <= 20 && z >= -20.0 && z <= -6.0) ||
    (x >= -20 && x <= 20 && z >= 6.0 && z <= 20.0) ||
    (x >= 12.0 && x <= 20.0 && z >= -6.0 && z <= 6.0) ||
    (x >= -20.0 && x <= -12.0 && z >= -6.0 && z <= 6.0)
  ) {
    if (currentY < 5.5) {
      minCeiling = Math.min(minCeiling, 5.5);
    }
  }

  // 2. Underside of East Stair 1 (x in [6.75, 10.25], z in [-6.0, 4.0])
  if (x >= 6.75 && x <= 10.25 && z >= -6.0 && z <= 4.0) {
    const rampY = 1.0 + ((4.0 - z) / 10.0) * 5.0;
    const underside = rampY - 0.25;
    if (currentY < underside) {
      minCeiling = Math.min(minCeiling, underside);
    }
  }

  // 3. Underside of West Stair 2 (x in [-10.25, -6.75], z in [-4.0, 6.0])
  if (x >= -10.25 && x <= -6.75 && z >= -4.0 && z <= 6.0) {
    const rampY = 1.0 + ((z - (-4.0)) / 10.0) * 5.0;
    const underside = rampY - 0.25;
    if (currentY < underside) {
      minCeiling = Math.min(minCeiling, underside);
    }
  }

  return minCeiling;
}

function resolvePlayerCollisions(pos, radius = 0.5) {
  for (const obs of state.obstacles) {
    if (obs.isFloor) continue; // Floor/ceiling collisions handled by vertical physics

    // Only test obstacles at current height level; skip if player is standing on top
    if (pos.y + 1.8 < obs.minY || pos.y >= obs.maxY - 0.1) continue;

    const closestX = Math.max(obs.minX, Math.min(pos.x, obs.maxX));
    const closestZ = Math.max(obs.minZ, Math.min(pos.z, obs.maxZ));

    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius && distSq > 0.00001) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      pos.x += (dx / dist) * overlap;
      pos.z += (dz / dist) * overlap;
    } else if (distSq <= 0.00001) {
      // Inside box, push out along shortest axis
      const pushLeft = Math.abs(pos.x - obs.minX);
      const pushRight = Math.abs(pos.x - obs.maxX);
      const pushDown = Math.abs(pos.z - obs.minZ);
      const pushUp = Math.abs(pos.z - obs.maxZ);
      const minPush = Math.min(pushLeft, pushRight, pushDown, pushUp);
      if (minPush === pushLeft) pos.x = obs.minX - radius;
      else if (minPush === pushRight) pos.x = obs.maxX + radius;
      else if (minPush === pushDown) pos.z = obs.minZ - radius;
      else pos.z = obs.maxZ + radius;
    }
  }

  // --- DYNAMIC STAIR & RAILING COLLISION RESOLUTION ---
  // East Stair 1: x in [6.75, 10.25], z in [-6.0, 4.0]
  if (pos.z >= -6.5 && pos.z <= 4.5) {
    const clampedZ = Math.max(-6.0, Math.min(pos.z, 4.0));
    const rampY = 1.0 + ((4.0 - clampedZ) / 10.0) * 5.0;

    if (pos.y >= rampY - 0.4) {
      // Player is walking ON Stair 1: railings keep player within stair edges
      if (pos.z >= -5.8 && pos.z <= 3.8) {
        if (pos.x < 6.75 + radius && pos.x > 6.75 - radius) pos.x = 6.75 + radius;
        else if (pos.x > 10.25 - radius && pos.x < 10.25 + radius) pos.x = 10.25 - radius;
      }
    } else {
      // Player is UNDER Stair 1 (pos.y < rampY - 0.4)
      // Solid low-headroom wedge where headroom < 1.85m (z in [-0.2, 4.2])
      const wedgeMinX = 6.75;
      const wedgeMaxX = 10.25;
      const wedgeMinZ = -0.2;
      const wedgeMaxZ = 4.2;

      if (pos.x + radius > wedgeMinX && pos.x - radius < wedgeMaxX &&
          pos.z + radius > wedgeMinZ && pos.z - radius < wedgeMaxZ) {
        const pushLeft = Math.abs(pos.x - (wedgeMinX - radius));
        const pushRight = Math.abs(pos.x - (wedgeMaxX + radius));
        const pushBack = Math.abs(pos.z - (wedgeMinZ - radius));
        const pushFront = Math.abs(pos.z - (wedgeMaxZ + radius));
        const minPush = Math.min(pushLeft, pushRight, pushBack, pushFront);
        if (minPush === pushLeft) pos.x = wedgeMinX - radius;
        else if (minPush === pushRight) pos.x = wedgeMaxX + radius;
        else if (minPush === pushBack) pos.z = wedgeMinZ - radius;
        else pos.z = wedgeMaxZ + radius;
      }
    }
  }

  // West Stair 2: x in [-10.25, -6.75], z in [-4.0, 6.0]
  if (pos.z >= -4.5 && pos.z <= 6.5) {
    const clampedZ = Math.max(-4.0, Math.min(pos.z, 6.0));
    const rampY = 1.0 + ((clampedZ - (-4.0)) / 10.0) * 5.0;

    if (pos.y >= rampY - 0.4) {
      // Player is walking ON Stair 2: railings keep player within stair edges
      if (pos.z >= -3.8 && pos.z <= 5.8) {
        if (pos.x < -10.25 + radius && pos.x > -10.25 - radius) pos.x = -10.25 + radius;
        else if (pos.x > -6.75 - radius && pos.x < -6.75 + radius) pos.x = -6.75 - radius;
      }
    } else {
      // Player is UNDER Stair 2 (pos.y < rampY - 0.4)
      // Solid low-headroom wedge where headroom < 1.85m (z in [-4.2, 0.2])
      const wedgeMinX = -10.25;
      const wedgeMaxX = -6.75;
      const wedgeMinZ = -4.2;
      const wedgeMaxZ = 0.2;

      if (pos.x + radius > wedgeMinX && pos.x - radius < wedgeMaxX &&
          pos.z + radius > wedgeMinZ && pos.z - radius < wedgeMaxZ) {
        const pushLeft = Math.abs(pos.x - (wedgeMinX - radius));
        const pushRight = Math.abs(pos.x - (wedgeMaxX + radius));
        const pushBack = Math.abs(pos.z - (wedgeMinZ - radius));
        const pushFront = Math.abs(pos.z - (wedgeMaxZ + radius));
        const minPush = Math.min(pushLeft, pushRight, pushBack, pushFront);
        if (minPush === pushLeft) pos.x = wedgeMinX - radius;
        else if (minPush === pushRight) pos.x = wedgeMaxX + radius;
        else if (minPush === pushBack) pos.z = wedgeMinZ - radius;
        else pos.z = wedgeMaxZ + radius;
      }
    }
  }

  // NOTE: Outer perimeter clamping has been removed completely to match Ursina desktop client!
  // Players can walk off the outer edge and fall into the void (-20 death limit).
}

// --- PLAYER MOVEMENT UPDATE ---
function updatePlayer(delta) {
  if (state.isDead) return;

  // Check fall death (below -20 matching Ursina player.py line 293)
  if (state.playerPos.y < -20) {
    state.health = 0;
    updateHealthUI();
    triggerDeath();
    return;
  }

  // Calculate forward/strafe inputs based on yaw
  let moveForward = 0;
  let moveRight = 0;
  if (state.keys.has('KeyW') || state.keys.has('ArrowUp')) moveForward += 1;
  if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) moveForward -= 1;
  if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) moveRight -= 1;
  if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) moveRight += 1;

  if (moveForward !== 0 || moveRight !== 0) {
    const len = Math.hypot(moveForward, moveRight);
    const nf = moveForward / len;
    const nr = moveRight / len;

    // In Three.js coordinates with camera rotation (pitch, yaw, 0, 'YXZ'):
    // At yaw = 0, camera faces -Z (North) and camera right is +X (East).
    // Forward vector in horizontal plane: (-sin(yaw), 0, -cos(yaw))
    // Right vector in horizontal plane:   ( cos(yaw), 0, -sin(yaw))
    const sinY = Math.sin(state.yaw);
    const cosY = Math.cos(state.yaw);
    const dx = (-nf * sinY + nr * cosY) * PLAYER_SPEED * delta;
    const dz = (-nf * cosY - nr * sinY) * PLAYER_SPEED * delta;

    state.playerPos.x += dx;
    state.playerPos.z += dz;
  }

  // Apply Obstacle Collisions
  resolvePlayerCollisions(state.playerPos);

  // Vertical Floor & Gravity Detection
  const targetFloorY = getFloorHeightBelow(
    state.playerPos.x,
    state.playerPos.y,
    state.playerPos.z,
    state.isGrounded
  );

  // Ceiling collision (e.g. 1st floor underside at y = 5.5, or stair underside)
  const ceilingY = getCeilingHeightAbove(
    state.playerPos.x,
    state.playerPos.y,
    state.playerPos.z
  );
  if (state.playerPos.y + 1.8 > ceilingY) {
    // Keep feet on floor: ceiling must NEVER push player below floor height
    const safeMinY = (targetFloorY > -900) ? targetFloorY : 1.0;
    state.playerPos.y = Math.max(safeMinY, ceilingY - 1.8);
    if (state.velocityY > 0) state.velocityY = 0;
  }

  // Safety floor check: anywhere inside the 40x40 arena bounds, ground floor at 1.0 is solid!
  if (state.playerPos.x >= -20 && state.playerPos.x <= 20 && state.playerPos.z >= -20 && state.playerPos.z <= 20) {
    if (state.playerPos.y < 1.0) {
      state.playerPos.y = 1.0;
      state.velocityY = 0;
      state.isGrounded = true;
    }
  }

  if (state.isGrounded) {
    if (targetFloorY > -900) {
      const stepDiff = targetFloorY - state.playerPos.y;
      if (stepDiff >= 0 && stepDiff <= 0.55) {
        state.playerPos.y = targetFloorY;
        state.velocityY = 0;
      } else if (stepDiff < 0 && stepDiff >= -0.65) {
        state.playerPos.y = targetFloorY;
        state.velocityY = 0;
      } else if (stepDiff < -0.65) {
        // Walked off high ledge (e.g. into atrium)
        state.isGrounded = false;
      }
    } else {
      // Walked off arena outer edge into void
      state.isGrounded = false;
    }
  }

  if (!state.isGrounded) {
    state.velocityY -= GRAVITY * delta;
    state.playerPos.y += state.velocityY * delta;

    if (targetFloorY > -900 && state.playerPos.y <= targetFloorY) {
      state.playerPos.y = targetFloorY;
      state.velocityY = 0;
      state.isGrounded = true;
    }
  }

  // Check fall death after movement & gravity
  if (state.playerPos.y < -20) {
    state.health = 0;
    updateHealthUI();
    triggerDeath();
    return;
  }

  // Zoom Aim Smoothing (Field of View)
  const targetFov = state.isZoomed ? 32 : 75;
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(1.0, delta * 15.0));
    camera.updateProjectionMatrix();
  }

  // Gun Position & Aim Alignment (ADS)
  if (localGunMesh) {
    const targetGunX = state.isZoomed ? 0.0 : 0.32;
    const targetGunY = state.isZoomed ? -0.17 : -0.24;
    const targetGunZ = state.isZoomed ? -0.42 : -0.55;
    const targetRotX = state.isZoomed ? THREE.MathUtils.degToRad(0) : THREE.MathUtils.degToRad(-5);
    const targetRotY = state.isZoomed ? THREE.MathUtils.degToRad(0) : THREE.MathUtils.degToRad(-15);
    const targetRotZ = state.isZoomed ? THREE.MathUtils.degToRad(0) : THREE.MathUtils.degToRad(-5);

    localGunMesh.position.x = THREE.MathUtils.lerp(localGunMesh.position.x, targetGunX, Math.min(1.0, delta * 15.0));
    localGunMesh.position.y = THREE.MathUtils.lerp(localGunMesh.position.y, targetGunY, Math.min(1.0, delta * 15.0));
    localGunMesh.position.z = THREE.MathUtils.lerp(localGunMesh.position.z, targetGunZ, Math.min(1.0, delta * 15.0));
    localGunMesh.rotation.x = THREE.MathUtils.lerp(localGunMesh.rotation.x, targetRotX, Math.min(1.0, delta * 15.0));
    localGunMesh.rotation.y = THREE.MathUtils.lerp(localGunMesh.rotation.y, targetRotY, Math.min(1.0, delta * 15.0));
    localGunMesh.rotation.z = THREE.MathUtils.lerp(localGunMesh.rotation.z, targetRotZ, Math.min(1.0, delta * 15.0));
  }

  // Update Camera Position & Rotation
  // Camera eye level is player standing position + 1.7 units
  camera.position.set(state.playerPos.x, state.playerPos.y + 1.7, state.playerPos.z);
  camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');

  // Network position synchronization
  syncPlayerNetwork();
}

// --- SHOOTING & WEAPONS ---
function fireBullet() {
  if (state.isDead || state.isReloading) return;

  if (state.ammo <= 0) {
    startReload();
    return;
  }

  state.ammo -= 1;
  updateAmmoUI();

  // Play audio sound effect
  playGunSound();

  // Gun recoil animation
  if (localGunMesh) {
    localGunMesh.position.z += 0.08;
  }

  // Bullet spawn: player position + eye offset
  const bulletPos = camera.position.clone();
  const dirEuler = new THREE.Euler(state.pitch, state.yaw, 0, 'YXZ');
  const bulletDir = new THREE.Vector3(0, 0, -1).applyEuler(dirEuler).normalize();

  // Bullet velocity matching Three.js forward direction
  const velocity = bulletDir.clone().multiplyScalar(BULLET_SPEED);
  const ursinaYawDeg = (-THREE.MathUtils.radToDeg(state.yaw) % 360 + 360) % 360;
  const pitchDeg = THREE.MathUtils.radToDeg(state.pitch);

  // Spawn visual bullet
  spawnVisualBullet(bulletPos, velocity, 10, false);

  // Send bullet packet over network (Z negated for server protocol)
  sendPacket({
    object: 'bullet',
    position: [bulletPos.x, bulletPos.y, -bulletPos.z],
    damage: 10,
    direction: ursinaYawDeg,
    x_direction: pitchDeg
  });

  if (state.ammo <= 0) {
    startReload();
  }
}

function startReload() {
  if (state.isDead || state.isReloading || state.ammo === MAGAZINE_SIZE) return;
  state.isReloading = true;
  state.reloadTimer = RELOAD_TIME;
  reloadText.hidden = false;
  reloadText.style.display = 'block';
  reloadText.textContent = `Reloading... ${RELOAD_TIME.toFixed(1)}s`;
}

function updateReload(delta) {
  if (!state.isReloading) return;
  state.reloadTimer -= delta;

  // Tilt gun downwards during reload matching Ursina
  if (localGunMesh) {
    const defaultZ = THREE.MathUtils.degToRad(-5);
    const tilt = THREE.MathUtils.degToRad((RELOAD_TIME - state.reloadTimer) * 18);
    localGunMesh.rotation.z = defaultZ - tilt;
  }

  if (state.reloadTimer > 0) {
    reloadText.textContent = `Reloading... ${Math.max(0, state.reloadTimer).toFixed(1)}s`;
  } else {
    state.isReloading = false;
    state.ammo = MAGAZINE_SIZE;
    state.reloadTimer = 0;
    reloadText.hidden = true;
    reloadText.style.display = 'none';
    updateAmmoUI();
    if (localGunMesh) {
      localGunMesh.rotation.z = THREE.MathUtils.degToRad(-5);
    }
  }
}

function spawnVisualBullet(position, velocity, damage = 10, isSlave = false) {
  const geo = new THREE.SphereGeometry(0.12, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe87c });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  scene.add(mesh);

  state.bullets.push({
    mesh,
    velocity,
    damage,
    lifetime: 2.0,
    isSlave
  });
}

function updateBullets(delta) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.lifetime -= delta;

    if (b.lifetime <= 0) {
      scene.remove(b.mesh);
      state.bullets.splice(i, 1);
      continue;
    }

    const prevPos = b.mesh.position.clone();
    b.mesh.position.addScaledVector(b.velocity, delta);
    const currPos = b.mesh.position;

    // Check hit against obstacles/walls and floor slabs
    let hitObstacle = false;
    for (const obs of state.obstacles) {
      if (
        currPos.x >= obs.minX && currPos.x <= obs.maxX &&
        currPos.y >= obs.minY && currPos.y <= obs.maxY &&
        currPos.z >= obs.minZ && currPos.z <= obs.maxZ
      ) {
        hitObstacle = true;
        break;
      }
    }
    if (!hitObstacle && currPos.y <= 1.0 && currPos.x >= -20 && currPos.x <= 20 && currPos.z >= -20 && currPos.z <= 20) {
      hitObstacle = true;
    }

    // Check hit against stair ramps
    if (!hitObstacle) {
      if (currPos.x >= 6.75 && currPos.x <= 10.25 && currPos.z >= -6.0 && currPos.z <= 4.0) {
        const rampY = 1.0 + ((4.0 - currPos.z) / 10.0) * 5.0;
        if (Math.abs(currPos.y - rampY) <= 0.35 || (currPos.z > -0.1 && currPos.y <= rampY)) {
          hitObstacle = true;
        }
      } else if (currPos.x >= -10.25 && currPos.x <= -6.75 && currPos.z >= -4.0 && currPos.z <= 6.0) {
        const rampY = 1.0 + ((currPos.z - (-4.0)) / 10.0) * 5.0;
        if (Math.abs(currPos.y - rampY) <= 0.35 || (currPos.z < 0.1 && currPos.y <= rampY)) {
          hitObstacle = true;
        }
      }
    }

    if (hitObstacle || currPos.y < -50) {
      scene.remove(b.mesh);
      state.bullets.splice(i, 1);
      continue;
    }

    // Check enemy hit if this is a locally fired bullet
    if (!b.isSlave) {
      let hitEnemy = false;
      for (const enemy of state.enemies.values()) {
        if (enemy.health <= 0) continue;
        const ePos = enemy.mesh.position;
        // Enemy AABB: x in [ePos.x - 0.5, ePos.x + 0.5], y in [ePos.y, ePos.y + 2], z in [ePos.z - 0.5, ePos.z + 0.5]
        if (
          currPos.x >= ePos.x - 0.6 && currPos.x <= ePos.x + 0.6 &&
          currPos.y >= ePos.y - 0.2 && currPos.y <= ePos.y + 2.2 &&
          currPos.z >= ePos.z - 0.6 && currPos.z <= ePos.z + 0.6
        ) {
          hitEnemy = true;
          enemy.health = Math.max(0, enemy.health - b.damage);
          updateEnemyTag(enemy);
          if (enemy.health <= 0) {
            enemy.mesh.visible = false;
          }
          // Send health update to server
          sendPacket({
            object: 'health_update',
            id: enemy.id,
            health: enemy.health
          });
          break;
        }
      }
      if (hitEnemy) {
        scene.remove(b.mesh);
        state.bullets.splice(i, 1);
        continue;
      }
    }
  }
}

// --- DEATH & RESPAWN ---
function triggerDeath() {
  if (state.isDead) return;
  state.isDead = true;
  state.respawnTimer = 5.0;

  // Release mouse cursor
  document.exitPointerLock?.();

  // Show Death Screen
  deathScreen.hidden = false;
  deathScreen.style.display = 'flex';
  timerText.textContent = `Auto-respawn in 5s...`;

  // Hide local gun
  if (localGunMesh) localGunMesh.visible = false;

  // Spectator camera matching Ursina client/player.py: world_position = Vec3(0, 7, -35) -> (0, 7, 35) in Three.js looking North (-Z)
  state.playerPos.set(0, 7, 35);
  state.yaw = 0;
  state.pitch = THREE.MathUtils.degToRad(-15);
  state.velocityY = 0;
  state.isGrounded = false;
  state.isZoomed = false;
  camera.fov = 75;
  camera.updateProjectionMatrix();
  updateCrosshairZoomUI();
  camera.position.set(0, 7, 35);
  camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');

  // Send player state to server with 0 health
  sendPlayerState(true);
}

function respawnPlayer() {
  if (!state.isDead && state.health > 0) return;

  state.isDead = false;
  state.health = MAX_HEALTH;
  state.ammo = MAGAZINE_SIZE;
  state.isReloading = false;
  state.reloadTimer = 0;
  state.velocityY = 0;
  state.isGrounded = true;
  state.isZoomed = false;
  camera.fov = 75;
  camera.updateProjectionMatrix();
  updateCrosshairZoomUI();

  // Hide death screen
  deathScreen.hidden = true;
  deathScreen.style.display = 'none';
  reloadText.hidden = true;
  reloadText.style.display = 'none';

  // Pick random spawn point
  const spawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
  state.playerPos.copy(spawn);
  state.yaw = 0;
  state.pitch = 0;
  camera.position.set(state.playerPos.x, state.playerPos.y + 1.7, state.playerPos.z);
  camera.rotation.set(0, 0, 0, 'YXZ');

  // Unhide local gun
  if (localGunMesh) {
    localGunMesh.visible = true;
    localGunMesh.rotation.z = THREE.MathUtils.degToRad(-5);
  }

  // Update UI
  updateHealthUI();
  updateAmmoUI();

  // Notify server of respawn (Z negated for server protocol)
  sendPacket({
    object: 'respawn',
    id: state.id,
    position: [spawn.x, spawn.y, -spawn.z],
    health: MAX_HEALTH
  });

  sendPlayerState(true);

  // Re-lock pointer
  canvas.requestPointerLock?.();
}

// --- UI UPDATERS ---
function updateHealthUI() {
  const hp = Math.max(0, Math.round(state.health));
  healthText.textContent = `${hp} / ${MAX_HEALTH} HP`;
  const pct = Math.max(0, Math.min(100, (state.health / MAX_HEALTH) * 100));
  healthbarFill.style.width = `${pct}%`;

  if (state.health <= 0 && !state.isDead) {
    triggerDeath();
  }
}

function updateAmmoUI() {
  ammoText.textContent = `${state.ammo} / ${MAGAZINE_SIZE}`;
}

// --- NETWORKING ---
function connectToServer(bridgeUrl, serverHost, serverPort) {
  try {
    const wsUrl = `${bridgeUrl}?server=${encodeURIComponent(serverHost)}&port=${serverPort}`;
    console.log(`Connecting via WebSocket bridge: ${wsUrl}`);
    state.socket = new WebSocket(wsUrl);

    state.socket.onopen = () => {
      console.log('WebSocket connected. Sending handshake...');
      state.socket.send(JSON.stringify({ username: state.username }));
    };

    state.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (err) {
        console.warn('Packet parse error:', err, event.data);
      }
    };

    state.socket.onclose = (e) => {
      console.log('WebSocket connection closed.', e);
      connectError.textContent = 'Disconnected from server.';
    };

    state.socket.onerror = (e) => {
      console.error('WebSocket error:', e);
      connectError.textContent = 'Connection error. Ensure bridge is running.';
    };
  } catch (err) {
    connectError.textContent = `Failed to connect: ${err.message}`;
  }
}

function sendPacket(data) {
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    state.socket.send(JSON.stringify(data));
  }
}

function sendPlayerState(force = false) {
  const now = performance.now();
  if (!force && (now - state.lastNetworkSendTime) < NETWORK_TICK_RATE) return;

  const posDiff = state.playerPos.distanceTo(state.prevPos);
  const rotDiff = Math.abs(state.yaw - state.prevYaw);

  if (force || posDiff > 0.01 || rotDiff > 0.01) {
    const ursinaRotation = (-THREE.MathUtils.radToDeg(state.yaw) % 360 + 360) % 360;
    sendPacket({
      object: 'player',
      id: state.id,
      position: [state.playerPos.x, state.playerPos.y, -state.playerPos.z],
      rotation: ursinaRotation,
      health: state.health,
      joined: false,
      left: false
    });
    state.prevPos.copy(state.playerPos);
    state.prevYaw = state.yaw;
    state.lastNetworkSendTime = now;
  }
}

function syncPlayerNetwork() {
  if (!state.isDead) {
    sendPlayerState();
  }
}

function handleServerMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  // Handshake welcome
  if (msg.type === 'welcome') {
    state.id = String(msg.id);
    console.log(`Assigned Player ID: ${state.id}`);
    state.colorRgb = getPlayerColor(state.id, state.username);
    updateGunColor();
    sendPlayerState(true);
    return;
  }

  const objType = msg.object;

  if (objType === 'player') {
    const enemyId = String(msg.id);
    if (enemyId === String(state.id)) return;

    if (msg.left) {
      const enemy = state.enemies.get(enemyId);
      if (enemy) {
        scene.remove(enemy.mesh);
        state.enemies.delete(enemyId);
      }
      return;
    }

    let enemy = state.enemies.get(enemyId);
    if (!enemy) {
      const username = msg.username || `Player ${enemyId}`;
      const mesh = createEnemyMesh(enemyId, username);
      scene.add(mesh);
      enemy = {
        id: enemyId,
        username,
        health: msg.health ?? MAX_HEALTH,
        mesh,
        targetPos: new THREE.Vector3(),
        targetYaw: 0
      };
      state.enemies.set(enemyId, enemy);
    }

    if (msg.position) {
      enemy.targetPos.set(msg.position[0], msg.position[1], -msg.position[2]);
    }
    if (msg.rotation != null) {
      enemy.targetYaw = -THREE.MathUtils.degToRad(msg.rotation);
    }
    if (msg.health != null) {
      enemy.health = msg.health;
      updateEnemyTag(enemy);
      enemy.mesh.visible = enemy.health > 0;
    }
  } else if (objType === 'player_respawn' || objType === 'respawn') {
    const enemyId = String(msg.id);
    if (enemyId === String(state.id)) return;

    const enemy = state.enemies.get(enemyId);
    if (enemy) {
      if (msg.position) {
        enemy.targetPos.set(msg.position[0], msg.position[1], -msg.position[2]);
        enemy.mesh.position.set(msg.position[0], msg.position[1], -msg.position[2]);
      }
      enemy.health = msg.health ?? MAX_HEALTH;
      enemy.mesh.visible = true;
      updateEnemyTag(enemy);
    }
  } else if (objType === 'bullet') {
    // Bullet fired by another player
    if (msg.position) {
      const yawRad = THREE.MathUtils.degToRad(msg.direction || 0);
      const pitchRad = THREE.MathUtils.degToRad(msg.x_direction || 0);
      // In Ursina: vx = sin(yaw)*cos(pitch), vy = sin(pitch), vz = cos(yaw)*cos(pitch)
      // In Three.js: x = vx, y = vy, z = -vz
      const velocity = new THREE.Vector3(
        Math.sin(yawRad) * Math.cos(pitchRad),
        Math.sin(pitchRad),
        -Math.cos(yawRad) * Math.cos(pitchRad)
      ).multiplyScalar(BULLET_SPEED);

      const spawnPos = new THREE.Vector3(msg.position[0], msg.position[1], -msg.position[2]);
      spawnVisualBullet(spawnPos, velocity, msg.damage || 10, true);
      playGunSound();
    }
  } else if (objType === 'health_update') {
    const targetId = String(msg.id);
    if (targetId === String(state.id)) {
      state.health = msg.health;
      updateHealthUI();
    } else {
      const enemy = state.enemies.get(targetId);
      if (enemy) {
        enemy.health = msg.health;
        updateEnemyTag(enemy);
        if (enemy.health <= 0) {
          enemy.mesh.visible = false;
        }
      }
    }
  }
}

// --- MAIN GAME LOOP ---
function mainLoop() {
  requestAnimationFrame(mainLoop);

  const delta = Math.min(clock.getDelta(), 0.05);

  // Update Player Movement & Camera
  updatePlayer(delta);

  // Update Reload Timer
  updateReload(delta);

  // Update Bullets
  updateBullets(delta);

  // Smoothly interpolate enemy positions and rotations
  for (const enemy of state.enemies.values()) {
    enemy.mesh.position.lerp(enemy.targetPos, Math.min(1.0, delta * 14.0));
    enemy.mesh.rotation.y = THREE.MathUtils.lerp(enemy.mesh.rotation.y, enemy.targetYaw, Math.min(1.0, delta * 14.0));
  }

  // Update Death Countdown
  if (state.isDead) {
    state.respawnTimer -= delta;
    const sec = Math.max(1, Math.ceil(state.respawnTimer));
    timerText.textContent = `Auto-respawn in ${sec}s...`;
    if (state.respawnTimer <= 0) {
      respawnPlayer();
    }
  }

  renderer.render(scene, camera);
}

// --- LAUNCH GAME ---
let gameStarted = false;
function launchGame() {
  if (gameStarted) return;
  gameStarted = true;

  initAudio();

  const uname = usernameInput.value.trim() || 'Blue';
  const server = serverInput.value.trim() || '127.0.0.1';
  const port = parseInt(portInput.value, 10) || 8888;
  const bridge = bridgeInput.value.trim() || `ws://${window.location.hostname || 'localhost'}:8765`;

  state.username = uname;
  state.server = server;
  state.port = port;
  state.colorRgb = getPlayerColor('1', uname);

  // Strictly hide connect screen and display game screen
  connectScreen.hidden = true;
  connectScreen.style.display = 'none';
  gameScreen.hidden = false;
  gameScreen.style.display = 'block';

  setupThree();
  onWindowResize();
  connectToServer(bridge, server, port);

  // Request Fullscreen on Play
  try {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  } catch (e) {}

  // Request Pointer Lock on Play
  setTimeout(() => {
    canvas.requestPointerLock?.();
  }, 120);

  requestAnimationFrame(mainLoop);
}

// --- EVENT HANDLERS ---
function updateColorPreview() {
  const val = usernameInput.value.trim();
  const titleVal = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();

  if (COLOR_PALETTE[titleVal]) {
    const rgb = COLOR_PALETTE[titleVal];
    colorIndicator.textContent = `● Player Color: ${titleVal}`;
    colorIndicator.style.color = rgbToCss(rgb);
  } else {
    let found = false;
    for (const [cname, rgb] of Object.entries(COLOR_PALETTE)) {
      if (cname.toLowerCase().includes(val.toLowerCase()) && val.length > 0) {
        colorIndicator.textContent = `● Player Color: ${cname}`;
        colorIndicator.style.color = rgbToCss(rgb);
        found = true;
        break;
      }
    }
    if (!found) {
      colorIndicator.textContent = '● Custom Username';
      colorIndicator.style.color = 'lightblue';
    }
  }
}

usernameInput.addEventListener('input', updateColorPreview);

// Pick default random color matching desktop client
const defaultColor = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
usernameInput.value = defaultColor;
updateColorPreview();

// Set default server and bridge host matching current environment
serverInput.value = 'game.24x7stream.shop';
bridgeInput.value = `ws://${window.location.hostname || 'localhost'}:8765`;

// Play Button
btnPlay.addEventListener('click', launchGame);

// Close Button
btnClose.addEventListener('click', () => {
  window.close();
  // Fallback if window.close is blocked by browser
  document.body.innerHTML = '<div style="display:flex;height:100vh;align-items:center;justify-content:center;font-size:24px;color:#aaa;">Game closed. You can close this tab.</div>';
});

// Respawn Button
respawnButton.addEventListener('click', respawnPlayer);

// Fullscreen Button
fullscreenButton.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

// Audio Toggle Button
audioToggleButton.addEventListener('click', () => {
  state.musicMuted = !state.musicMuted;
  if (lobbyMusic) {
    lobbyMusic.muted = state.musicMuted;
  }
  audioToggleButton.textContent = state.musicMuted ? '🔇' : '🎵';
});

// Pointer Lock & Mouse Look
canvas.addEventListener('click', () => {
  if (document.pointerLockElement !== canvas && !state.isDead && connectScreen.hidden) {
    initAudio();
    canvas.requestPointerLock?.();
  }
});

window.addEventListener('mousedown', (e) => {
  if (connectScreen.hidden && !state.isDead) {
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    } else if (e.button === 0) {
      fireBullet();
    }
  }
});

function updateCrosshairZoomUI() {
  const ch = $('crosshair');
  if (ch) {
    if (state.isZoomed) {
      ch.classList.add('zoomed');
    } else {
      ch.classList.remove('zoomed');
    }
  }
}

window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas || state.isDead) return;
  const zoomFactor = (camera ? camera.fov : 75) / 75;
  const sens = 0.0022 * zoomFactor;
  state.yaw -= e.movementX * sens;
  state.pitch -= e.movementY * sens;
  // Clamp pitch between -85 deg and +85 deg
  state.pitch = THREE.MathUtils.clamp(state.pitch, -1.48, 1.48);
});

// Keyboard Controls
window.addEventListener('keydown', (e) => {
  initAudio();

  // Launcher Enter key
  if (!connectScreen.hidden && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
    launchGame();
    return;
  }

  // Respawn hotkeys matching Ursina
  if (state.isDead) {
    if (e.code === 'KeyR' || e.code === 'Space' || e.code === 'Enter') {
      respawnPlayer();
    }
    return;
  }

  state.keys.add(e.code);

  // Press C to Zoom Aim (toggle on tap, or hold)
  if (e.code === 'KeyC' && !state.isDead && connectScreen.hidden) {
    if (!e.repeat) {
      state.cPressTime = performance.now();
      state.isZoomed = !state.isZoomed;
      updateCrosshairZoomUI();
    }
  }

  // Jump
  if (e.code === 'Space' && state.isGrounded && !state.isDead) {
    state.velocityY = JUMP_FORCE;
    state.isGrounded = false;
  }

  // Reload hotkeys (R or E) matching Ursina
  if ((e.code === 'KeyR' || e.code === 'KeyE') && !state.isDead) {
    startReload();
  }

  // Release mouse cursor
  if (e.code === 'Escape') {
    document.exitPointerLock?.();
  }
});

window.addEventListener('keyup', (e) => {
  state.keys.delete(e.code);

  // Release C unzooms if held for more than 280ms
  if (e.code === 'KeyC') {
    if (state.cPressTime && (performance.now() - state.cPressTime > 280)) {
      state.isZoomed = false;
      updateCrosshairZoomUI();
    }
    state.cPressTime = 0;
  }
});

// First user interaction auto-starts audio
window.addEventListener('click', initAudio, { once: true });
window.addEventListener('keydown', initAudio, { once: true });

// Explicit initial screen states
deathScreen.hidden = true;
deathScreen.style.display = 'none';
reloadText.hidden = true;
reloadText.style.display = 'none';
gameScreen.hidden = true;
gameScreen.style.display = 'none';
connectScreen.hidden = false;
connectScreen.style.display = 'flex';
