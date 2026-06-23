const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
const pressed = new Set();
const startImage = new Image();
startImage.src = "assets/indiemanie-start-screen.png";
const ringImage = new Image();
ringImage.src = "assets/indiemania-ring.png";
const ringFrontImage = new Image();
ringFrontImage.src = "assets/indiemania-ring-front.png";
const johnnyAtlas = new Image();
johnnyAtlas.src = "assets/johnny-toxic-expanded-atlas.png?v=run-row-6-1";
const joeyAtlas = new Image();
joeyAtlas.src = "assets/joey-image-atlas.png?v=full-template-1";
const philAtlas = new Image();
philAtlas.src = "assets/phil-stamper-atlas.png?v=phil-1";
const selectPortraits = {
  toxic: loadImage("assets/johnny-toxic-select.png"),
  image: loadImage("assets/joey-image-select.png"),
  phil: loadImage("assets/phil-stamper-select.png")
};

const arenas = [
  { id: "gym", name: "Brick Hall", image: loadImage("assets/arena.png") },
  { id: "outdoors", name: "Outdoor Show", image: loadImage("assets/arena-outdoors.png") },
  { id: "vfw", name: "VFW Hall", image: loadImage("assets/arena-vfw.png") }
];

const sfx = {
  punch: makeSoundPool(["assets/sfx-punch-1.wav", "assets/sfx-punch-2.wav", "assets/sfx-punch-3.wav"], 0.48),
  kick: makeSoundPool(["assets/sfx-kick-1.wav", "assets/sfx-kick-2.wav", "assets/sfx-kick-3.wav"], 0.52),
  slam: makeSoundPool(["assets/sfx-slam-1.wav", "assets/sfx-slam-2.wav", "assets/sfx-slam-3.wav"], 0.62),
  finisher: makeSoundPool(["assets/sfx-finisher-slam.wav"], 0.72)
};

const SPRITE_CELL = { w: 128, h: 150 };
const JOHNNY_ANIMS = {
  idle: { row: 0, frames: 8, fps: 6 },
  walk: { row: 1, frames: 8, fps: 12 },
  run: { row: 10, frames: 6, fps: 13 },
  punch: { row: 2, frames: 4, fps: 10, once: true },
  kick: { row: 3, frames: 4, fps: 8, once: true },
  grapple: { row: 4, frames: 6, fps: 9, once: true },
  grappleHold: { row: 4, frames: 6, fps: 6 },
  grappled: { row: 4, frames: 6, fps: 6 },
  slam: { row: 5, frames: 4, fps: 7, once: true },
  finisher: { row: 5, frames: 5, fps: 6, once: true },
  pin: { row: 6, frames: 4, fps: 5, once: true },
  down: { row: 7, frames: 5, fps: 4, once: true },
  pinned: { row: 7, frames: 5, fps: 4, once: true },
  rise: { row: 7, frames: 5, fps: 5, once: true },
  whiff: { row: 2, frames: 2, fps: 9, once: true },
  celebrate: { row: 8, frames: 3, fps: 4 },
  irishWhip: { row: 9, frames: 6, fps: 9, once: true },
  whipped: { row: 10, frames: 6, fps: 10 },
  rebound: { row: 11, frames: 6, fps: 11 },
  clothesline: { row: 12, frames: 5, fps: 9, once: true },
  clotheslineTake: { row: 13, frames: 5, fps: 8, once: true },
  bigBoot: { row: 14, frames: 5, fps: 8, once: true },
  bigBootTake: { row: 15, frames: 5, fps: 8, once: true },
  ddt: { row: 16, frames: 6, fps: 8, once: true },
  ddtTake: { row: 17, frames: 6, fps: 8, once: true },
  bodyslam: { row: 18, frames: 6, fps: 8, once: true },
  bodyslamTake: { row: 19, frames: 6, fps: 8, once: true },
  powerbomb: { row: 20, frames: 7, fps: 8, once: true },
  powerbombTake: { row: 21, frames: 7, fps: 8, once: true },
  suplex: { row: 22, frames: 6, fps: 8, once: true },
  suplexTake: { row: 23, frames: 6, fps: 8, once: true }
};

const ANIM_FALLBACKS = {
  grappleHold: "grapple",
  grappled: "grapple",
  irishWhip: "grapple",
  whipped: "run",
  rebound: "run",
  clothesline: "punch",
  clotheslineTake: "down",
  bigBoot: "kick",
  bigBootTake: "down",
  ddt: "slam",
  ddtTake: "down",
  bodyslam: "slam",
  bodyslamTake: "down",
  powerbomb: "finisher",
  powerbombTake: "down",
  suplex: "slam",
  suplexTake: "down"
};

const GRAPPLE_MOVES = {
  ddt: { attack: "ddt", take: "ddtTake", label: "DDT", damage: 16, momentum: 18, stun: 0.45, duration: 1.05, down: 2.2, force: 90 },
  bodyslam: { attack: "bodyslam", take: "bodyslamTake", label: "bodyslam", damage: 18, momentum: 22, stun: 0.55, duration: 1.08, down: 2.7, force: 104 },
  suplex: { attack: "suplex", take: "suplexTake", label: "suplex", damage: 20, momentum: 24, stun: 0.62, duration: 1.18, down: 3.0, force: 96 },
  powerbomb: { attack: "powerbomb", take: "powerbombTake", label: "powerbomb", damage: 25, momentum: 30, stun: 0.8, duration: 1.28, down: 3.6, force: 116, momentumCost: 35 }
};

const state = {
  mode: "start",
  selectedIndex: 0,
  arenaIndex: 0,
  playerChoice: null,
  cpuChoice: null,
  selectStep: "player",
  message: "Hit START to begin",
  shake: 0,
  flash: 0,
  lastTime: performance.now(),
  pin: null,
  grapple: null,
  cpuThink: 0,
  cpuIntent: "circle",
  audioUnlocked: false,
  result: null
};

document.body.dataset.gameMode = state.mode;

const startButton = {
  x: W / 2 - 150,
  y: 506,
  w: 300,
  h: 56
};

const ring = {
  cx: W / 2,
  cy: 414,
  w: 519,
  h: 204,
  skew: 112
};

const ringImageBounds = {
  x: 72,
  y: 137,
  w: 816,
  h: 459
};

const ringPlayBounds = {
  back: -176,
  front: -18,
  backLeft: -166,
  backRight: 268,
  frontLeft: -210,
  frontRight: 210,
  bodyInset: 34
};

const roster = [
  {
    id: "toxic",
    name: "Johnny Toxic",
    finisher: "Toxic Spill",
    primary: "#68bf3d",
    secondary: "#1d2820",
    accent: "#f2e85c",
    sprite: "johnny"
  },
  {
    id: "image",
    name: "Joey Image",
    finisher: "Picture Perfect",
    primary: "#e64d9b",
    secondary: "#273c86",
    accent: "#f6f0ef",
    sprite: "joey"
  },
  {
    id: "phil",
    name: "Phil Stamper",
    finisher: "The Brainbuster",
    primary: "#8f3043",
    secondary: "#1a1c22",
    accent: "#d5d8df",
    sprite: "phil"
  }
];

let player;
let cpu;

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function makeSoundPool(sources, volume) {
  return sources.map((src) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;
    return audio;
  });
}

function unlockAudio() {
  if (state.audioUnlocked) return;
  state.audioUnlocked = true;
  Object.values(sfx).flat().forEach((audio) => {
    audio.load();
  });
}

function playSound(name) {
  if (!state.audioUnlocked || !sfx[name]?.length) return;
  const pool = sfx[name];
  const base = pool[Math.floor(Math.random() * pool.length)];
  const audio = base.cloneNode();
  audio.volume = base.volume;
  audio.play().catch(() => {});
}

function pressGameKey(key) {
  unlockAudio();
  if (!keys.has(key)) pressed.add(key);
  keys.add(key);
}

function releaseGameKey(key) {
  keys.delete(key);
}

window.addEventListener("keydown", (event) => {
  const key = normalizeKey(event);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Shift"].includes(key)) {
    event.preventDefault();
  }
  pressGameKey(key);
});

window.addEventListener("keyup", (event) => {
  releaseGameKey(normalizeKey(event));
});

canvas.addEventListener("click", (event) => {
  unlockAudio();
  if (state.mode !== "start") return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * W;
  const y = ((event.clientY - rect.top) / rect.height) * H;
  if (
    x >= startButton.x &&
    x <= startButton.x + startButton.w &&
    y >= startButton.y &&
    y <= startButton.y + startButton.h
  ) {
    state.mode = "select";
    state.selectStep = "player";
    state.selectedIndex = state.playerChoice ?? 0;
    state.message = "Choose your wrestler";
  }
});

document.querySelectorAll(".touch-control").forEach((button) => {
  if (button.classList.contains("fullscreen")) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      unlockAudio();
      requestGameFullscreen();
    });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    return;
  }

  const key = button.dataset.key;
  const press = (event) => {
    event.preventDefault();
    button.classList.add("is-down");
    pressGameKey(key);
  };
  const release = (event) => {
    event.preventDefault();
    button.classList.remove("is-down");
    releaseGameKey(key);
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

function requestGameFullscreen() {
  const target = document.querySelector(".screen-frame") || document.documentElement;
  if (document.fullscreenElement) return;
  if (target.requestFullscreen) {
    target.requestFullscreen().catch(() => {});
  }
}

function normalizeKey(event) {
  if (event.key === " ") return " ";
  if (event.key === "Shift") return "Shift";
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function makeWrestler(template, side, isPlayer) {
  return {
    ...template,
    isPlayer,
    side,
    x: side === "left" ? -135 : 135,
    y: side === "left" ? -18 : -36,
    vx: 0,
    vy: 0,
    air: 0,
    moveMotion: null,
    face: side === "left" ? 1 : -1,
    stamina: 100,
    momentum: 0,
    recovery: 1,
    strength: 1,
    speed: 1,
    state: "idle",
    action: null,
    actionTime: 0,
    actionDuration: 0,
    animTime: 0,
    stun: 0,
    down: 0,
    block: false,
    kickMash: 0,
    pinCooldown: 0,
    grappleCooldown: 0,
    aiCooldown: 0,
    whip: null,
    whipPivot: null,
    pendingDown: null,
    downHoldTime: 0,
    celebrate: 0
  };
}

function startMatch(choiceIndex) {
  const playerIndex = choiceIndex;
  const cpuIndex = state.cpuChoice ?? nextOpponentIndex(playerIndex);
  const playerTemplate = roster[playerIndex];
  const cpuTemplate = roster[cpuIndex];
  player = makeWrestler(playerTemplate, "left", true);
  cpu = makeWrestler(cpuTemplate, "right", false);
  state.mode = "fight";
  state.playerChoice = playerIndex;
  state.cpuChoice = cpuIndex;
  state.message = `${player.name} vs ${cpu.name}`;
  state.pin = null;
  state.grapple = null;
  state.result = null;
  state.shake = 0;
  state.flash = 0;
}

function gameLoop(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(dt);
  draw();
  pressed.clear();
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  document.body.dataset.gameMode = state.mode;
  state.shake = Math.max(0, state.shake - dt * 18);
  state.flash = Math.max(0, state.flash - dt * 2.5);
  if (state.mode === "start") {
    updateStart();
    return;
  }

  if (state.mode === "select") {
    updateSelect();
    return;
  }

  if (state.mode === "result") {
    player.celebrate += dt;
    cpu.celebrate += dt;
    if (pressed.has("Enter")) returnToMainMenu();
    return;
  }

  if (state.pin) {
    updatePin(dt);
  } else if (state.grapple) {
    updateGrapple(dt);
  } else {
    updateFighterTimers(player, dt);
    updateFighterTimers(cpu, dt);
    updateWhipMotion(player, cpu, dt);
    updateWhipMotion(cpu, player, dt);
    updatePlayer(dt);
    updateCpu(dt);
    resolveMovement(player, cpu, dt);
    resolveMovement(cpu, player, dt);
    separateFighters();
  }
}

function updateStart() {
  if (pressed.has("Enter")) {
    state.mode = "select";
    state.selectStep = "player";
    state.selectedIndex = state.playerChoice ?? 0;
    state.message = "Choose your wrestler";
  }
}

function returnToMainMenu() {
  state.mode = "start";
  state.message = "Hit START to begin";
  state.pin = null;
  state.grapple = null;
  state.result = null;
  state.shake = 0;
  state.flash = 0;
}

function updateSelect() {
  if (pressed.has("ArrowLeft")) {
    moveSelectCursor(-1);
  }
  if (pressed.has("ArrowRight")) {
    moveSelectCursor(1);
  }
  if (pressed.has("Enter") || pressed.has("z") || pressed.has("x")) {
    if (state.selectStep === "player") {
      state.playerChoice = state.selectedIndex;
      state.cpuChoice = nextOpponentIndex(state.playerChoice);
      state.selectedIndex = state.cpuChoice;
      state.selectStep = "cpu";
      state.message = "Choose your opponent";
    } else if (state.selectStep === "cpu") {
      state.cpuChoice = state.selectedIndex;
      state.selectedIndex = state.arenaIndex;
      state.selectStep = "arena";
      state.message = "Choose your arena";
    } else {
      state.arenaIndex = state.selectedIndex;
      startMatch(state.playerChoice ?? 0);
    }
  }
  if (pressed.has("Escape")) {
    if (state.selectStep === "arena") {
      state.selectStep = "cpu";
      state.selectedIndex = state.cpuChoice ?? nextOpponentIndex(state.playerChoice ?? 0);
      state.message = "Choose your opponent";
    } else if (state.selectStep === "cpu") {
      state.selectStep = "player";
      state.selectedIndex = state.playerChoice ?? 0;
      state.message = "Choose your wrestler";
    }
  }
}

function nextOpponentIndex(playerIndex) {
  return (playerIndex + 1) % roster.length;
}

function moveSelectCursor(direction) {
  const listLength = state.selectStep === "arena" ? arenas.length : roster.length;
  do {
    state.selectedIndex = (state.selectedIndex + direction + listLength) % listLength;
  } while (state.selectStep === "cpu" && state.selectedIndex === state.playerChoice);
}

function updateFighterTimers(f, dt) {
  f.actionTime = Math.max(0, f.actionTime - dt);
  f.stun = Math.max(0, f.stun - dt);
  f.pinCooldown = Math.max(0, f.pinCooldown - dt);
  f.grappleCooldown = Math.max(0, f.grappleCooldown - dt);
  f.aiCooldown = Math.max(0, f.aiCooldown - dt);
  f.downHoldTime = Math.max(0, f.downHoldTime - dt);
  f.block = false;
  updateMoveMotion(f);
  updateWhipPivot(f);

  if (f.pendingDown && f.actionTime === 0) {
    f.down = Math.max(f.down, f.pendingDown.duration);
    f.pendingDown = null;
  }

  if (f.down > 0) {
    f.down = Math.max(0, f.down - dt * (0.42 + f.stamina / 145));
    if (f.downHoldTime === 0) f.state = "down";
    f.vx *= 0.9;
    f.vy *= 0.9;
    if (f.down === 0) f.state = "rise";
    return;
  }

  if (f.actionTime === 0 && [
    "punch", "kick", "grapple", "grappleHold", "grappled", "slam", "finisher", "whiff", "rise",
    "irishWhip", "clothesline", "bigBoot", "ddt", "ddtTake", "bodyslam", "bodyslamTake",
    "powerbomb", "powerbombTake", "suplex", "suplexTake", "clotheslineTake", "bigBootTake"
  ].includes(f.state)) {
    f.state = "idle";
    f.action = null;
    f.actionDuration = 0;
    f.whipPivot = null;
  }
}

function canAct(f) {
  return f.actionTime === 0 && f.down === 0 && f.stun === 0 && !state.pin && !state.grapple && !f.whip;
}

function updateMoveMotion(f) {
  if (!f.moveMotion) {
    f.air = Math.max(0, f.air * 0.82);
    return;
  }

  const m = f.moveMotion;
  const elapsed = clamp(m.duration - f.actionTime, 0, m.duration);
  const t = m.duration > 0 ? elapsed / m.duration : 1;
  const eased = easeInOut(t);

  if (m.type === "suplexTake") {
    f.x = lerp(m.startX, m.endX, eased);
    f.y = lerp(m.startY, m.endY, eased);
    f.air = Math.sin(Math.PI * t) * 112;
  } else if (m.type === "powerbombTake") {
    const lift = t < 0.42 ? t / 0.42 : 1 - (t - 0.42) / 0.58;
    f.x = lerp(m.startX, m.endX, eased);
    f.y = lerp(m.startY, m.endY, eased);
    f.air = Math.max(0, lift) * 124;
  }

  f.vx = 0;
  f.vy = 0;

  if (t >= 1) {
    f.air = 0;
    f.vx = m.landingVx;
    f.vy = m.landingVy;
    f.moveMotion = null;
  }
}

function updatePlayer(dt) {
  if (player.down > 0 || player.actionTime > 0 || player.stun > 0) return;
  player.block = keys.has("Shift");

  const input = getMoveInput();
  const running = keys.has("c");
  moveIntent(player, input.x, input.y, running, dt);

  if (pressed.has("z")) running ? tryRunningStrike(player, cpu, "clothesline") : tryPunch(player, cpu);
  if (pressed.has("x")) running ? tryRunningStrike(player, cpu, "bigBoot") : tryKick(player, cpu);
  if (pressed.has("v")) tryGrapple(player, cpu);
  if (pressed.has("s")) tryFinisher(player, cpu);
  if (pressed.has("a")) tryPin(player, cpu);
}

function getMoveInput() {
  let x = 0;
  let y = 0;
  if (keys.has("ArrowLeft")) x -= 1;
  if (keys.has("ArrowRight")) x += 1;
  if (keys.has("ArrowUp")) y -= 1;
  if (keys.has("ArrowDown")) y += 1;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function updateCpu(dt) {
  if (cpu.down > 0 || cpu.actionTime > 0 || cpu.stun > 0) return;

  state.cpuThink -= dt;
  const d = distance(cpu, player);
  const playerCrowded = isNearRingEdge(player) && d < 76;
  const playerRebounding = player.whip?.phase === "return";
  if (state.cpuThink <= 0) {
    state.cpuThink = 0.34 + Math.random() * 0.52;
    if (player.down > 0 && d < 85 && cpu.pinCooldown === 0) state.cpuIntent = "pin";
    else if (cpu.momentum >= 100 && d < 70) state.cpuIntent = "finisher";
    else if (playerRebounding && d < 118) state.cpuIntent = Math.random() < 0.55 ? "clothesline" : "bigBoot";
    else if (playerCrowded && Math.random() < 0.72) state.cpuIntent = "retreat";
    else if (d < 56 && cpu.grappleCooldown === 0 && Math.random() < 0.16) state.cpuIntent = "grapple";
    else if (d < 82 && Math.random() < 0.26) state.cpuIntent = "kick";
    else if (d < 72 && Math.random() < 0.58) state.cpuIntent = "punch";
    else state.cpuIntent = cpu.stamina < 30 && player.stamina > cpu.stamina ? "retreat" : "approach";
  }

  if (state.cpuIntent === "pin") tryPin(cpu, player);
  if (state.cpuIntent === "finisher") tryFinisher(cpu, player);
  if (state.cpuIntent === "grapple") tryGrapple(cpu, player);
  if (state.cpuIntent === "punch") tryPunch(cpu, player);
  if (state.cpuIntent === "kick") tryKick(cpu, player);
  if (state.cpuIntent === "clothesline") tryRunningStrike(cpu, player, "clothesline");
  if (state.cpuIntent === "bigBoot") tryRunningStrike(cpu, player, "bigBoot");

  let tx = player.x - cpu.x;
  let ty = player.y - cpu.y;
  if (state.cpuIntent === "retreat") {
    tx = -tx;
    ty = -ty;
  }
  if (state.cpuIntent === "approach" || state.cpuIntent === "retreat" || state.cpuIntent === "clothesline" || state.cpuIntent === "bigBoot") {
    const len = Math.hypot(tx, ty) || 1;
    moveIntent(cpu, tx / len, ty / len, playerRebounding, dt);
  } else {
    moveIntent(cpu, 0, 0, false, dt);
  }
}

function moveIntent(f, ix, iy, running, dt) {
  const moving = Math.hypot(ix, iy) > 0;
  const topSpeed = (running ? 290 : 112) * f.speed * (f.block ? 0.52 : 1);
  const accel = running ? 760 : 270;
  const drag = moving ? 0.88 : 0.78;

  f.vx = f.vx * drag + ix * accel * dt;
  f.vy = f.vy * drag + iy * accel * dt;
  const speed = Math.hypot(f.vx, f.vy);
  if (speed > topSpeed) {
    f.vx = (f.vx / speed) * topSpeed;
    f.vy = (f.vy / speed) * topSpeed;
  }

  if (moving) {
    f.face = ix !== 0 ? Math.sign(ix) : f.face;
    f.animTime += dt * (running ? 1.85 : 1);
  }
  if (moving && ["idle", "walk", "run"].includes(f.state)) f.state = running ? "run" : "walk";
  if (!moving && ["walk", "run"].includes(f.state)) f.state = "idle";
  if (running && moving) f.stamina = Math.max(0, f.stamina - dt * 2.7);
}

function resolveMovement(f, other, dt) {
  if (f.actionTime > 0 && f.state !== "down" && f.state !== "whipped" && f.state !== "rebound") {
    f.vx *= 0.88;
    f.vy *= 0.88;
  }
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  const limits = ringLimitsForY(f.y, ringPlayBounds.bodyInset);
  f.x = clamp(f.x, limits.left, limits.right);
  f.y = clamp(f.y, ringPlayBounds.back, ringPlayBounds.front);
  if (!isMoveLocked(f)) f.face = other.x >= f.x ? 1 : -1;
}

function updateWhipMotion(f, other, dt) {
  if (!f.whip) return;

  f.whip.timer += dt;
  f.animTime += dt * 1.85;
  f.stun = Math.max(f.stun, 0.08);
  if (f.whip.phase === "windup") {
    const source = f.whip.source || other;
    const side = f.whip.side || Math.sign(f.face || 1);
    const limits = ringLimitsForY(source.y, ringPlayBounds.bodyInset);
    f.x = clamp(source.x + side * 26, limits.left, limits.right);
    f.y = clamp(source.y + 2, ringPlayBounds.back, ringPlayBounds.front);
    f.vx = 0;
    f.vy = 0;
    f.face = side;
    if (f.whip.timer >= f.whip.releaseAt) {
      f.whip.phase = "out";
      f.whip.timer = 0;
      f.vx = side * 430;
      f.vy = 0;
    }
    return;
  }

  const limits = ringLimitsForY(f.y);
  const targetSide = f.whip.side || Math.sign(f.vx || f.face || 1);
  const ropeX = targetSide > 0 ? limits.right : limits.left;
  const hitSide = targetSide > 0 ? f.x >= ropeX - 8 : f.x <= ropeX + 8;

  if (f.whip.phase === "out" && (hitSide || f.whip.timer > 1.18)) {
    f.x = ropeX;
    const target = f.whip.returnTarget || other;
    const tx = target.x - f.x;
    const ty = target.y - f.y;
    const len = Math.hypot(tx, ty) || 1;
    f.whip.phase = "return";
    f.whip.timer = 0;
    f.state = "rebound";
    f.actionTime = 0.3;
    f.actionDuration = 0.3;
    f.vx = (tx / len) * 385;
    f.vy = (ty / len) * 385;
    f.face = Math.sign(f.vx || f.face);
    state.message = `${f.name} rebounds off the ropes`;
    return;
  }

  if (f.whip.phase === "return" && (f.whip.timer > 1.2 || distance(f, other) < 28)) {
    f.whip = null;
    f.state = "idle";
    f.stun = 0;
    f.actionTime = 0;
  }
}

function separateFighters() {
  const d = distance(player, cpu);
  if (d > 0 && d < 34 && player.down === 0 && cpu.down === 0) {
    const push = (34 - d) / 2;
    const nx = (cpu.x - player.x) / d;
    const ny = (cpu.y - player.y) / d;
    player.x -= nx * push;
    player.y -= ny * push;
    cpu.x += nx * push;
    cpu.y += ny * push;
  }
}

function tryPunch(attacker, defender) {
  if (!canAct(attacker)) return;
  attacker.state = "punch";
  attacker.actionTime = 0.44;
  attacker.actionDuration = attacker.actionTime;
  attacker.action = "punch";
  if (inRange(attacker, defender, 58)) {
    const damage = defender.block ? 3 : 8;
    hit(attacker, defender, damage, 14, 0.28, false);
    playSound("punch");
    state.message = `${attacker.name} lands a punch`;
  } else {
    whiff(attacker, `${attacker.name} misses the punch`);
  }
}

function tryKick(attacker, defender) {
  if (!canAct(attacker)) return;
  attacker.state = "kick";
  attacker.actionTime = 0.46;
  attacker.actionDuration = attacker.actionTime;
  attacker.action = "kick";
  if (inRange(attacker, defender, 76)) {
    const damage = defender.block ? 4 : 12;
    hit(attacker, defender, damage, 18, 0.36, false);
    defender.vx += attacker.face * 55;
    playSound("kick");
    state.message = `${attacker.name} lands a kick`;
  } else {
    whiff(attacker, `${attacker.name} misses the kick`);
  }
}

function tryRunningStrike(attacker, defender, type) {
  if (!canAct(attacker)) return;
  const isBoot = type === "bigBoot";
  attacker.state = isBoot ? "bigBoot" : "clothesline";
  attacker.action = attacker.state;
  attacker.actionTime = isBoot ? 0.58 : 0.52;
  attacker.actionDuration = attacker.actionTime;
  const reboundBonus = defender.whip?.phase === "return";
  const range = isBoot ? 86 : 78;
  if (inRange(attacker, defender, range)) {
    const damage = (isBoot ? 15 : 13) + (reboundBonus ? 8 : 0);
    const takeState = isBoot ? "bigBootTake" : "clotheslineTake";
    defender.state = takeState;
    defender.action = takeState;
    defender.actionTime = reboundBonus ? 0.72 : 0.48;
    defender.actionDuration = defender.actionTime;
    defender.pendingDown = reboundBonus ? { duration: 2.6 + (100 - defender.stamina) / 48 } : null;
    defender.whip = null;
    hit(attacker, defender, damage, reboundBonus ? 28 : 18, reboundBonus ? 0.45 : 0.32, false);
    knockAway(attacker, defender, reboundBonus ? 180 : 92);
    playSound(isBoot ? "kick" : "punch");
    state.message = `${attacker.name} hits a ${isBoot ? "big boot" : "clothesline"}`;
  } else {
    whiff(attacker, `${attacker.name} misses the ${isBoot ? "big boot" : "clothesline"}`);
  }
}

function tryGrapple(attacker, defender) {
  if (!canAct(attacker) || attacker.grappleCooldown > 0) return;
  attacker.state = "grapple";
  attacker.actionTime = 1.25;
  attacker.actionDuration = attacker.actionTime;
  attacker.action = "grapple";
  attacker.grappleCooldown = attacker.isPlayer ? 0.45 : 1.65;
  if (inRange(attacker, defender, 78)) {
    defender.state = "grapple";
    defender.action = "grappled";
    defender.actionTime = 1.25;
    defender.actionDuration = defender.actionTime;
    defender.stun = Math.max(defender.stun, 0.5);
    attacker.vx = 0;
    attacker.vy = 0;
    defender.vx = 0;
    defender.vy = 0;
    state.grapple = {
      attacker,
      defender,
      timer: 0,
      resolveAt: attacker.isPlayer ? 0.95 : 0.58,
      move: attacker.isPlayer ? null : chooseCpuGrappleMove(attacker, defender),
      resolved: false
    };
    positionGrapple(attacker, defender);
    state.message = attacker.isPlayer
      ? "Grapple: Z DDT, X bodyslam, V suplex, C whip, S powerbomb"
      : `${attacker.name} locks up`;
  } else {
    whiff(attacker, `${attacker.name} grabs air`);
  }
}

function updateGrapple(dt) {
  const grapple = state.grapple;
  grapple.timer += dt;
  positionGrapple(grapple.attacker, grapple.defender);
  grapple.attacker.actionTime = Math.max(0, grapple.attacker.actionDuration - grapple.timer);
  grapple.defender.actionTime = Math.max(0, grapple.defender.actionDuration - grapple.timer);
  grapple.attacker.state = grapple.resolved ? grapple.attacker.state : "grappleHold";
  grapple.defender.state = grapple.resolved ? grapple.defender.state : "grappled";

  if (!grapple.move && grapple.attacker.isPlayer) {
    if (pressed.has("c") || keys.has("c")) grapple.move = "irishWhip";
    else if (pressed.has("z")) grapple.move = "ddt";
    else if (pressed.has("x")) grapple.move = "bodyslam";
    else if (pressed.has("v")) grapple.move = "suplex";
    else if (pressed.has("s") && grapple.attacker.momentum >= GRAPPLE_MOVES.powerbomb.momentumCost) grapple.move = "powerbomb";
  }

  if (!grapple.resolved && (grapple.move || grapple.timer >= grapple.resolveAt)) {
    grapple.resolved = true;
    resolveGrappleMove(grapple, grapple.move || "bodyslam");
    state.grapple = null;
  }
}

function chooseCpuGrappleMove(attacker, defender) {
  if (attacker.momentum >= 45 && defender.stamina < 55 && Math.random() < 0.35) return "powerbomb";
  if (isNearRingEdge(defender) && Math.random() < 0.45) return "irishWhip";
  const moves = defender.stamina < 45 ? ["ddt", "bodyslam", "suplex"] : ["irishWhip", "ddt", "bodyslam", "suplex"];
  return moves[Math.floor(Math.random() * moves.length)];
}

function resolveGrappleMove(grapple, moveId) {
  const { attacker, defender } = grapple;
  if (moveId === "irishWhip") {
    executeIrishWhip(attacker, defender);
    return;
  }

  const move = GRAPPLE_MOVES[moveId] ?? GRAPPLE_MOVES.bodyslam;
  if (move.momentumCost) attacker.momentum = Math.max(0, attacker.momentum - move.momentumCost);
  attacker.state = move.attack;
  attacker.action = move.attack;
  attacker.actionTime = move.duration;
  attacker.actionDuration = move.duration;
  defender.state = move.take;
  defender.action = move.take;
  defender.actionTime = move.duration;
  defender.actionDuration = move.duration;
  defender.pendingDown = { duration: move.down };
  defender.downHoldTime = move.duration + 0.22;
  defender.moveMotion = createTakeMoveMotion(moveId, attacker, defender, move.duration);
  hit(attacker, defender, move.damage, move.momentum, move.stun, false);
  if (!defender.moveMotion) knockAway(attacker, defender, move.force);
  if (!attacker.isPlayer) attacker.grappleCooldown = 2.4;
  playSound("slam");
  state.message = `${attacker.name} hits a ${move.label}`;
}

function createTakeMoveMotion(moveId, attacker, defender, duration) {
  const side = attacker.face || (defender.x >= attacker.x ? 1 : -1);
  const limits = ringLimitsForY(attacker.y, ringPlayBounds.bodyInset);
  if (moveId === "suplex") {
    return {
      type: "suplexTake",
      duration,
      startX: defender.x,
      startY: defender.y,
      endX: clamp(attacker.x - side * 58, limits.left, limits.right),
      endY: clamp(attacker.y + 4, ringPlayBounds.back, ringPlayBounds.front),
      landingVx: -side * 42,
      landingVy: 0
    };
  }
  if (moveId === "powerbomb") {
    return {
      type: "powerbombTake",
      duration,
      startX: defender.x,
      startY: defender.y,
      endX: clamp(attacker.x + side * 46, limits.left, limits.right),
      endY: clamp(attacker.y + 6, ringPlayBounds.back, ringPlayBounds.front),
      landingVx: side * 56,
      landingVy: 0
    };
  }
  return null;
}

function executeIrishWhip(attacker, defender) {
  const side = -(attacker.face || (defender.x >= attacker.x ? 1 : -1));
  const targetY = clamp(defender.y + (attacker.y - defender.y) * 0.35, ringPlayBounds.back + 18, ringPlayBounds.front - 18);
  attacker.state = "irishWhip";
  attacker.action = "irishWhip";
  attacker.actionTime = 0.62;
  attacker.actionDuration = attacker.actionTime;
  attacker.whipPivot = {
    at: 0.18,
    face: side
  };
  defender.state = "whipped";
  defender.action = "whipped";
  defender.actionTime = 0.78;
  defender.actionDuration = defender.actionTime;
  defender.stun = Math.max(defender.stun, 0.4);
  defender.y = targetY;
  defender.whip = {
    phase: "windup",
    timer: 0,
    releaseAt: 0.18,
    side,
    source: attacker,
    returnTarget: { x: attacker.x, y: attacker.y }
  };
  defender.vx = 0;
  defender.vy = 0;
  defender.face = side;
  if (!attacker.isPlayer) attacker.grappleCooldown = 2.1;
  attacker.momentum = clamp(attacker.momentum + 12, 0, 100);
  state.message = `${attacker.name} sends ${defender.name} to the ropes`;
}

function positionGrapple(attacker, defender) {
  const side = attacker.x <= defender.x ? 1 : -1;
  const midX = (attacker.x + defender.x) / 2;
  const midY = (attacker.y + defender.y) / 2;
  const limits = ringLimitsForY(midY, ringPlayBounds.bodyInset);
  attacker.x = clamp(midX - side * 13, limits.left, limits.right);
  defender.x = clamp(midX + side * 13, limits.left, limits.right);
  attacker.y = clamp(midY - 2, ringPlayBounds.back, ringPlayBounds.front);
  defender.y = clamp(midY + 2, ringPlayBounds.back, ringPlayBounds.front);
  attacker.face = side;
  defender.face = -side;
  attacker.vx = 0;
  attacker.vy = 0;
  defender.vx = 0;
  defender.vy = 0;
}

function isNearRingEdge(f) {
  const limits = ringLimitsForY(f.y, ringPlayBounds.bodyInset);
  return f.x < limits.left + 34 || f.x > limits.right - 34 || f.y < ringPlayBounds.back + 28 || f.y > ringPlayBounds.front - 24;
}

function tryFinisher(attacker, defender) {
  if (!canAct(attacker) || attacker.momentum < 100) return;
  attacker.state = "finisher";
  attacker.actionTime = 0.95;
  attacker.actionDuration = attacker.actionTime;
  attacker.action = "finisher";
  attacker.momentum = 0;
  if (inRange(attacker, defender, 64)) {
    hit(attacker, defender, 34, 0, 1.35, true);
    defender.down = 4.3;
    knockAway(attacker, defender, 210);
    state.shake = 1;
    state.flash = 1;
    playSound("finisher");
    state.message = `${attacker.finisher}!`;
  } else {
    whiff(attacker, `${attacker.name} misses ${attacker.finisher}`);
  }
}

function tryPin(attacker, defender) {
  if (!canAct(attacker) || defender.down <= 0 || !inRange(attacker, defender, 62) || attacker.pinCooldown > 0) return;
  positionPinAttacker(attacker, defender);
  attacker.state = "pin";
  defender.state = "down";
  attacker.vx = 0;
  attacker.vy = 0;
  attacker.air = 0;
  attacker.moveMotion = null;
  defender.vx = 0;
  defender.vy = 0;
  defender.air = 0;
  defender.moveMotion = null;
  state.pin = {
    attacker,
    defender,
    offsetX: attacker.x - defender.x,
    offsetY: attacker.y - defender.y,
    timer: 0,
    count: 0,
    next: 0.92,
    mash: 0
  };
  state.message = `${attacker.name} hooks the leg`;
}

function updatePin(dt) {
  const pin = state.pin;
  pin.timer += dt;
  pin.attacker.x = pin.defender.x + pin.offsetX;
  pin.attacker.y = pin.defender.y + pin.offsetY;
  pin.attacker.vx = 0;
  pin.attacker.vy = 0;
  pin.defender.vx = 0;
  pin.defender.vy = 0;
  pin.attacker.state = "pin";
  pin.defender.state = "down";

  if (pin.defender.isPlayer && pressed.has(" ")) {
    pin.mash = Math.min(28, pin.mash + 3.1);
    pin.defender.kickMash = pin.mash;
  }

  if (pin.timer >= pin.next) {
    if (shouldKickOut(pin.defender, pin.mash, pin.count + 1)) {
      endPin(true);
      return;
    }

    pin.count += 1;
    pin.next += 0.92;
    state.shake = 0.45;
    state.message = pin.count === 1 ? "One!" : pin.count === 2 ? "Two!" : "Three!";

    if (pin.count >= 3) {
      finishMatch(pin.attacker.isPlayer);
    }
  }
}

function positionPinAttacker(attacker, defender) {
  const side = attacker.x <= defender.x ? -1 : 1;
  const limits = ringLimitsForY(defender.y, ringPlayBounds.bodyInset);
  attacker.x = clamp(defender.x + side * 6, limits.left, limits.right);
  attacker.y = clamp(defender.y - 14, ringPlayBounds.back, ringPlayBounds.front);
  attacker.face = side * -1;
  defender.face = side;
}

function shouldKickOut(defender, mash, count) {
  const staminaPart = defender.stamina / 100;
  const countPressure = count === 1 ? 0.26 : 0.53;
  const mashPart = defender.isPlayer ? mash / 40 : Math.random() * 0.34;
  const chance = staminaPart * 0.68 + mashPart + defender.recovery * 0.1 - countPressure;
  return Math.random() < clamp(chance, 0.05, 0.88);
}

function endPin(kickedOut) {
  const pin = state.pin;
  pin.attacker.state = "idle";
  pin.defender.state = "down";
  pin.defender.down = Math.max(0.85, pin.defender.down);
  pin.attacker.pinCooldown = 1.5;
  pin.defender.kickMash = 0;
  state.pin = null;
  state.message = kickedOut ? `${pin.defender.name} kicks out` : "";
}

function finishMatch(playerWon) {
  state.result = playerWon ? "win" : "loss";
  state.mode = "result";
  state.pin.attacker.state = "celebrate";
  state.pin.defender.state = "down";
  state.message = playerWon ? `${player.name} wins by pinfall` : `${cpu.name} wins by pinfall`;
}

function hit(attacker, defender, staminaDamage, momentumGain, stunTime, knockdown) {
  const actual = defender.block ? staminaDamage * 0.45 : staminaDamage;
  defender.stamina = clamp(defender.stamina - actual, 0, 100);
  defender.stun = Math.max(defender.stun, stunTime);
  if (knockdown) defender.down = Math.max(defender.down, 2.2 + (100 - defender.stamina) / 42);
  attacker.momentum = clamp(attacker.momentum + momentumGain, 0, 100);
  defender.momentum = clamp(defender.momentum + actual * 0.22, 0, 100);
  state.shake = Math.max(state.shake, 0.25);
}

function whiff(attacker, message) {
  if (!["punch", "kick", "grapple"].includes(attacker.state)) {
    attacker.state = "whiff";
  }
  attacker.actionTime += 0.24;
  attacker.actionDuration = attacker.actionTime;
  attacker.stamina = Math.max(0, attacker.stamina - 2);
  state.message = message;
}

function knockAway(attacker, defender, force) {
  const dx = defender.x - attacker.x;
  const dy = defender.y - attacker.y;
  const len = Math.hypot(dx, dy) || 1;
  defender.vx += (dx / len) * force;
  defender.vy += (dy / len) * force;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

function inRange(a, b, range) {
  return distance(a, b) <= range && Math.sign(b.x - a.x || a.face) === a.face;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, (a.y - b.y) * 1.18);
}

function drawOrder(a, b) {
  if (state.pin) {
    if (a === state.pin.attacker && b === state.pin.defender) return 1;
    if (a === state.pin.defender && b === state.pin.attacker) return -1;
  }
  return a.y - b.y;
}

function draw() {
  const ox = (Math.random() - 0.5) * state.shake * 8;
  const oy = (Math.random() - 0.5) * state.shake * 8;
  ctx.save();
  ctx.translate(ox, oy);
  drawBackground();
  drawRingBack();

  if (state.mode === "start") {
    drawStart();
  } else if (state.mode === "select") {
    drawRingFront();
    drawSelect();
  } else {
    const fighters = [player, cpu].sort(drawOrder);
    fighters.forEach(drawWrestler);
    drawRingFront();
    drawHud();
    drawMessage();
    if (state.mode === "result") drawResult();
  }

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 238, 164, ${state.flash * 0.22})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function drawBackground() {
  const arena = arenas[state.arenaIndex] ?? arenas[0];
  const arenaImage = arena.image;
  if (arenaImage.complete && arenaImage.naturalWidth > 0) {
    const scale = Math.max(W / arenaImage.naturalWidth, H / arenaImage.naturalHeight);
    const dw = arenaImage.naturalWidth * scale;
    const dh = arenaImage.naturalHeight * scale;
    ctx.drawImage(arenaImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#28171d");
    grd.addColorStop(0.5, "#141719");
    grd.addColorStop(1, "#060606");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
  ctx.fillRect(0, 0, W, H);

  const spotlight = ctx.createRadialGradient(W / 2, 455, 60, W / 2, 455, 390);
  spotlight.addColorStop(0, "rgba(255, 231, 177, 0.34)");
  spotlight.addColorStop(0.5, "rgba(255, 214, 139, 0.12)");
  spotlight.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = spotlight;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(W / 2, H / 2, 210, W / 2, H / 2, 590);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.58)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

function ringPoint(x, y) {
  return {
    x: ring.cx + x + y * 0.34,
    y: ring.cy + y * 0.76
  };
}

function ringCorners() {
  return [
    ringPoint(-ring.w / 2, -ring.h / 2),
    ringPoint(ring.w / 2, -ring.h / 2),
    ringPoint(ring.w / 2, ring.h / 2),
    ringPoint(-ring.w / 2, ring.h / 2)
  ];
}

function ringMat(corners) {
  return corners.map((p) => ({
    x: ring.cx + (p.x - ring.cx) * 0.84,
    y: ring.cy + (p.y - ring.cy) * 0.78
  }));
}

function drawRingBack() {
  drawRingImage(ringImage);
}

function drawRingFront() {
  drawRingFrontLayer();
}

function drawRingImage(image) {
  if (!image.complete || image.naturalWidth === 0) return;
  ctx.drawImage(image, ringImageBounds.x, ringImageBounds.y, ringImageBounds.w, ringImageBounds.h);
}

function drawRingFrontLayer() {
  if (!ringFrontImage.complete || ringFrontImage.naturalWidth === 0) return;
  drawRingFrontSlice(0, 0, ringFrontImage.naturalWidth, 720);
  drawRingFrontSlice(0, 815, ringFrontImage.naturalWidth, ringFrontImage.naturalHeight - 815);
}

function drawRingFrontSlice(sx, sy, sw, sh) {
  const scaleX = ringImageBounds.w / ringFrontImage.naturalWidth;
  const scaleY = ringImageBounds.h / ringFrontImage.naturalHeight;
  ctx.drawImage(
    ringFrontImage,
    sx,
    sy,
    sw,
    sh,
    ringImageBounds.x + sx * scaleX,
    ringImageBounds.y + sy * scaleY,
    sw * scaleX,
    sh * scaleY
  );
}

function drawRingShadow(outer) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  ctx.beginPath();
  outer.map((p) => ({ x: p.x + 10, y: p.y + 24 }))
    .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRingPlatform(outer) {
  const deck = ctx.createLinearGradient(0, outer[0].y, 0, outer[2].y);
  deck.addColorStop(0, "#40464d");
  deck.addColorStop(0.5, "#262b31");
  deck.addColorStop(1, "#151a20");
  ctx.fillStyle = deck;
  ctx.beginPath();
  outer.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#8b96a2";
  ctx.lineWidth = 4;
  ctx.stroke();

  const sideDepth = 24;
  ctx.fillStyle = "#1d2229";
  ctx.beginPath();
  [outer[0], outer[3], { x: outer[3].x, y: outer[3].y + sideDepth }, { x: outer[0].x, y: outer[0].y + 10 }]
    .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#202630";
  ctx.beginPath();
  [outer[1], outer[2], { x: outer[2].x, y: outer[2].y + sideDepth }, { x: outer[1].x, y: outer[1].y + 10 }]
    .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

function drawMat(mat) {
  const matGradient = ctx.createLinearGradient(0, mat[0].y, 0, mat[2].y);
  matGradient.addColorStop(0, "#f4f1e8");
  matGradient.addColorStop(0.55, "#d8d3c7");
  matGradient.addColorStop(1, "#b0a797");
  ctx.fillStyle = matGradient;
  ctx.beginPath();
  mat.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#eef1f2";
  ctx.lineWidth = 5;
  ctx.beginPath();
  mat.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = "rgba(55, 58, 64, 0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  mat.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = "rgba(78, 70, 62, 0.18)";
  ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i += 1) {
    const a = lerpPoint(mat[0], mat[3], (i + 5) / 10);
    const b = lerpPoint(mat[1], mat[2], (i + 5) / 10);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(52, 55, 61, 0.13)";
  for (let i = 0; i < 22; i += 1) {
    const t = (i * 37 % 100) / 100;
    const u = (i * 53 % 100) / 100;
    const left = lerpPoint(mat[0], mat[3], u);
    const right = lerpPoint(mat[1], mat[2], u);
    const p = lerpPoint(left, right, t);
    ctx.fillRect(p.x - 14, p.y - 2, 28 + (i % 3) * 8, 3);
  }
}

function drawFrontApron(outer) {
  const topLeft = outer[3];
  const topRight = outer[2];
  const bottomRight = { x: outer[2].x, y: outer[2].y + 46 };
  const bottomLeft = { x: outer[3].x, y: outer[3].y + 46 };

  const apron = ctx.createLinearGradient(0, topLeft.y, 0, bottomLeft.y);
  apron.addColorStop(0, "#27303b");
  apron.addColorStop(0.45, "#1b222c");
  apron.addColorStop(1, "#090d13");
  ctx.fillStyle = apron;
  ctx.beginPath();
  [topLeft, topRight, bottomRight, bottomLeft]
    .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#768292";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(topLeft.x + 10, topLeft.y + 8);
  ctx.lineTo(topRight.x - 10, topRight.y + 8);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const a = lerpPoint(bottomLeft, bottomRight, i / 7);
    ctx.beginPath();
    ctx.moveTo(a.x + 4, a.y - 7);
    ctx.lineTo(a.x + 38, a.y - 7);
    ctx.stroke();
  }
}

function drawBackPosts(corners) {
  drawPost(corners[0], 0, false);
  drawPost(corners[1], 1, false);
}

function drawFrontPosts(corners) {
  drawPost(corners[3], 3, true);
  drawPost(corners[2], 2, true);
}

function drawPost(p, cornerIndex, front) {
  const postW = front ? 18 : 14;
  const postH = front ? 132 : 112;
  const top = p.y - postH + 12;

  const postGradient = ctx.createLinearGradient(p.x - postW / 2, 0, p.x + postW / 2, 0);
  postGradient.addColorStop(0, "#111722");
  postGradient.addColorStop(0.42, front ? "#4d5867" : "#343b46");
  postGradient.addColorStop(1, "#0a0d12");
  ctx.fillStyle = postGradient;
  ctx.fillRect(p.x - postW / 2, top, postW, postH);
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(p.x - postW / 2 + 3, top + 5, 3, postH - 12);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(p.x + postW / 2 - 4, top + 6, 3, postH - 12);
  ctx.fillStyle = "#dbe4eb";
  ctx.fillRect(p.x - postW / 2 - 4, top - 5, postW + 8, 8);

  const colors = cornerIndex === 1 || cornerIndex === 3
    ? ["#e51f2f", "#e6edf5", "#1f63d8"]
    : ["#1f63d8", "#e6edf5", "#222936"];
  [88, 62, 38].forEach((lift, i) => drawTurnbuckle(p.x, p.y - lift, colors[i], front));
}

function drawTurnbuckle(x, y, color, front) {
  const w = front ? 36 : 30;
  const h = front ? 20 : 16;
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(x - w / 2 + 4, y - h / 2 + 4, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
  ctx.fillRect(x - w / 2 + 4, y - h / 2 + 3, w - 10, 4);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fillRect(x - w / 2, y + h / 2 - 5, w, 5);
}

function drawBackRopes(corners) {
  for (let i = 0; i < 3; i += 1) {
    const lift = 88 - i * 25;
    drawRopeSegment(corners[0], corners[1], lift, ropeColor(i), 4);
    drawRopeSegment(corners[0], corners[3], lift, ropeColor(i), 3);
    drawRopeSegment(corners[1], corners[2], lift, ropeColor(i), 3);
  }
}

function drawFrontRopes(corners) {
  for (let i = 0; i < 3; i += 1) {
    const lift = 88 - i * 25;
    drawRopeSegment(corners[3], corners[2], lift, ropeColor(i), 6);
  }
}

function drawSideRopeCaps(corners) {
  for (let i = 0; i < 3; i += 1) {
    const lift = 88 - i * 25;
    const leftMid = lerpPoint(corners[0], corners[3], 0.55);
    const rightMid = lerpPoint(corners[1], corners[2], 0.55);
    drawRopeSegment(leftMid, corners[3], lift, ropeColor(i), 5);
    drawRopeSegment(rightMid, corners[2], lift, ropeColor(i), 5);
  }
}

function drawRopeSegment(a, b, lift, color, width) {
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.58)";
  ctx.lineWidth = width + 3;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - lift + 3);
  ctx.lineTo(b.x, b.y - lift + 3);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - lift);
  ctx.lineTo(b.x, b.y - lift);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.48)";
  ctx.lineWidth = Math.max(1, width * 0.22);
  ctx.beginPath();
  ctx.moveTo(a.x + 3, a.y - lift - width * 0.24);
  ctx.lineTo(b.x - 3, b.y - lift - width * 0.24);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function ropeColor(index) {
  return index === 0 ? "#f03342" : index === 1 ? "#eef3f8" : "#1f6ee8";
}

function drawRing() {
  drawRingBack();
  drawRingFront();
}

function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function drawStart() {
  if (startImage.complete && startImage.naturalWidth > 0) {
    const scale = Math.max(W / startImage.naturalWidth, H / startImage.naturalHeight);
    const dw = startImage.naturalWidth * scale;
    const dh = startImage.naturalHeight * scale;
    ctx.drawImage(startImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, W, H);
  }

  const pulse = 0.68 + Math.sin(performance.now() / 240) * 0.18;
  ctx.fillStyle = `rgba(0, 0, 0, ${pulse})`;
  ctx.fillRect(startButton.x, startButton.y, startButton.w, startButton.h);
  ctx.strokeStyle = "#f4c44f";
  ctx.lineWidth = 4;
  ctx.strokeRect(startButton.x, startButton.y, startButton.w, startButton.h);

  ctx.textAlign = "center";
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "28px Impact";
  ctx.fillText("Hit START to begin", W / 2 + 3, startButton.y + 38);
  ctx.fillStyle = "#f4c44f";
  ctx.fillText("Hit START to begin", W / 2, startButton.y + 35);
}

function drawSelect() {
  const choosingCpu = state.selectStep === "cpu";
  const choosingArena = state.selectStep === "arena";
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5ead8";
  ctx.font = "30px Impact";
  ctx.fillText(choosingArena ? "Choose Your Arena" : choosingCpu ? "Choose Your Opponent" : "Choose Your Wrestler", W / 2, 116);
  if (choosingArena) {
    ctx.fillStyle = "#f4c44f";
    ctx.font = "18px Arial";
    ctx.fillText(`${roster[state.playerChoice].name} vs ${roster[state.cpuChoice].name}`, W / 2, 144);
    drawArenaSelect();
    return;
  }
  if (choosingCpu && state.playerChoice !== null) {
    ctx.fillStyle = "#f4c44f";
    ctx.font = "18px Arial";
    ctx.fillText(`Player: ${roster[state.playerChoice].name}`, W / 2, 144);
  }

  getVisibleRosterIndexes().forEach((i, visibleSlot) => {
    const r = roster[i];
    const gap = 250;
    const visibleCount = Math.min(roster.length, 3);
    const x = W / 2 - ((visibleCount - 1) * gap) / 2 + visibleSlot * gap;
    const y = 352;
    const isSelected = state.selectedIndex === i;
    const isPlayerChoice = choosingCpu && state.playerChoice === i;
    ctx.fillStyle = isSelected ? "#f4c44f" : isPlayerChoice ? "#46b85a" : "#2a2e32";
    ctx.fillRect(x - 130, y - 124, 260, 248);
    ctx.fillStyle = "#111";
    ctx.fillRect(x - 118, y - 112, 236, 224);
    drawPortrait(r, x, y - 6, isSelected || isPlayerChoice);
    ctx.fillStyle = "#f5ead8";
    ctx.font = "25px Impact";
    ctx.fillText(r.name, x, y + 92);
    if (isPlayerChoice) {
      ctx.fillStyle = "#46b85a";
      ctx.font = "16px Impact";
      ctx.fillText("PLAYER", x, y + 116);
    } else if (choosingCpu && isSelected) {
      ctx.fillStyle = "#e74846";
      ctx.font = "16px Impact";
      ctx.fillText("CPU", x, y + 116);
    }
  });

  ctx.fillStyle = "#f4c44f";
  ctx.font = "18px Arial";
  ctx.fillText(`${state.selectedIndex + 1} / ${roster.length}`, W / 2, 532);
  ctx.fillText(choosingCpu ? "Arrow keys choose opponent. Enter confirms. Esc backs up." : "Arrow keys choose player. Enter confirms.", W / 2, 562);
}

function getVisibleRosterIndexes() {
  if (roster.length <= 3) return roster.map((_, i) => i);
  return [-1, 0, 1].map((offset) => (state.selectedIndex + offset + roster.length) % roster.length);
}

function drawArenaSelect() {
  arenas.forEach((arena, i) => {
    const gap = 280;
    const x = W / 2 - ((arenas.length - 1) * gap) / 2 + i * gap;
    const y = 344;
    const selected = state.selectedIndex === i;
    ctx.fillStyle = selected ? "#f4c44f" : "#2a2e32";
    ctx.fillRect(x - 138, y - 104, 276, 208);
    ctx.fillStyle = "#101317";
    ctx.fillRect(x - 128, y - 94, 256, 164);
    drawArenaPreview(arena, x - 128, y - 94, 256, 164);
    ctx.fillStyle = "#f5ead8";
    ctx.font = "24px Impact";
    ctx.fillText(arena.name, x, y + 104);
  });

  ctx.fillStyle = "#f4c44f";
  ctx.font = "18px Arial";
  ctx.fillText("Arrow keys choose arena. Enter starts. Esc backs up.", W / 2, 562);
}

function drawArenaPreview(arena, x, y, w, h) {
  const image = arena.image;
  if (image.complete && image.naturalWidth > 0) {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (image.naturalWidth - sw) / 2;
    const sy = (image.naturalHeight - sh) / 2;
    ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  } else {
    ctx.fillStyle = "#1a1d22";
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = "rgba(245, 234, 216, 0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawPortrait(r, x, y, selected) {
  const portrait = selectPortraits[r.id];
  if (portrait && portrait.complete && portrait.naturalWidth > 0) {
    drawSelectPortraitImage(portrait, r, x, y, selected);
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath();
  ctx.ellipse(0, 58, 70, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.secondary;
  ctx.fillRect(-34, -2, 68, 78);
  ctx.fillStyle = r.primary;
  ctx.fillRect(-48, 4, 28, 72);
  ctx.fillRect(20, 4, 28, 72);
  ctx.fillStyle = "#d39a70";
  ctx.fillRect(-24, -58, 48, 46);
  ctx.fillStyle = selected ? r.accent : "#f5ead8";
  ctx.fillRect(-30, -16, 60, 18);
  ctx.restore();
}

function drawSelectPortraitImage(image, r, x, y, selected) {
  const w = 176;
  const h = 176;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = selected ? r.primary : "#28303a";
  ctx.fillRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
  ctx.fillStyle = "#101317";
  ctx.fillRect(-w / 2, -h / 2, w, h);

  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  ctx.imageSmoothingEnabled = true;

  ctx.strokeStyle = selected ? "#f4c44f" : "#5f6d7c";
  ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawWrestler(f) {
  const p = ringPoint(f.x, f.y);
  const depth = (f.y - ringPlayBounds.back) / (ringPlayBounds.front - ringPlayBounds.back);
  const scale = 0.88 + depth * 0.22;
  const atlas = getSpriteAtlas(f);
  if (atlas) {
    drawSpriteWrestler(f, p, scale, atlas);
    return;
  }

  drawBlockWrestler(f, p, scale);
}

function getSpriteAtlas(f) {
  const atlas = f.sprite === "johnny" ? johnnyAtlas : f.sprite === "joey" ? joeyAtlas : f.sprite === "phil" ? philAtlas : null;
  return atlas && atlas.complete && atlas.naturalWidth > 0 ? atlas : null;
}

function drawSpriteWrestler(f, p, scale, atlas) {
  const pose = resolveSpritePose(f.state, atlas);
  const anim = JOHNNY_ANIMS[pose];
  const holdLastFrame = ["pin", "pinned", "down", "rise"].includes(pose);
  const loopTime = pose === "walk" || pose === "run" || pose === "rebound" || pose === "whipped"
    ? f.animTime
    : performance.now() / 1000;
  const elapsed = anim.once && f.actionDuration > 0
    ? Math.max(0, f.actionDuration - f.actionTime)
    : loopTime;
  const frame = anim.once && f.actionDuration > 0
    ? Math.min(anim.frames - 1, Math.floor((elapsed / f.actionDuration) * anim.frames))
    : holdLastFrame
      ? anim.frames - 1
      : Math.floor(elapsed * anim.fps) % anim.frames;
  const sx = ((anim.frameOffset || 0) + frame) * SPRITE_CELL.w;
  const sy = anim.row * SPRITE_CELL.h;
  const spriteScale = scale * 1.16;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.36)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 24 * scale, 30 * scale, 9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(p.x, p.y - f.air * scale);
  ctx.scale(f.face, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    atlas,
    sx,
    sy,
    SPRITE_CELL.w,
    SPRITE_CELL.h,
    -SPRITE_CELL.w * spriteScale * 0.5,
    -SPRITE_CELL.h * spriteScale + 40 * scale,
    SPRITE_CELL.w * spriteScale,
    SPRITE_CELL.h * spriteScale
  );
  ctx.imageSmoothingEnabled = true;
  ctx.restore();

  if (f.stun > 0 && f.down === 0) {
    ctx.fillStyle = "#f4c44f";
    ctx.font = "18px Impact";
    ctx.textAlign = "center";
    ctx.fillText("STUN", p.x, p.y - 118 * scale);
  }
}

function resolveSpritePose(stateName, atlas) {
  let pose = JOHNNY_ANIMS[stateName] ? stateName : "idle";
  while (JOHNNY_ANIMS[pose] && (JOHNNY_ANIMS[pose].row + 1) * SPRITE_CELL.h > atlas.naturalHeight) {
    pose = ANIM_FALLBACKS[pose] || "idle";
    if (pose === stateName) return "idle";
    stateName = pose;
  }
  return JOHNNY_ANIMS[pose] ? pose : "idle";
}

function drawBlockWrestler(f, p, scale) {
  const pose = f.state;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 26 * scale, (pose === "down" || pose === "pinned" ? 52 : 30) * scale, 13 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(p.x, p.y - f.air * scale);
  ctx.scale(scale * f.face, scale);

  if (pose === "down" || pose === "pinned") {
    ctx.rotate(-0.08);
    ctx.fillStyle = f.secondary;
    ctx.fillRect(-48, 0, 92, 26);
    ctx.fillStyle = f.primary;
    ctx.fillRect(-28, -16, 50, 24);
    ctx.fillStyle = "#d39a70";
    ctx.fillRect(28, -12, 24, 20);
  } else {
    const bob = pose === "walk" || pose === "run" ? Math.sin(performance.now() / 90) * 2 : 0;
    const attackReach = pose === "punch" ? 24 : pose === "kick" ? 34 : pose === "grapple" || pose === "finisher" ? 18 : 0;
    ctx.fillStyle = f.primary;
    ctx.fillRect(-25, -54 + bob, 50, 58);
    ctx.fillStyle = f.secondary;
    ctx.fillRect(-27, -3, 22, 52);
    ctx.fillRect(5, -3, 22, 52);
    ctx.fillStyle = "#d39a70";
    ctx.fillRect(-20, -92 + bob, 40, 36);
    ctx.fillStyle = f.accent;
    ctx.fillRect(-26, -56 + bob, 52, 10);
    ctx.fillStyle = "#d39a70";
    ctx.fillRect(18, -48 + bob, 18 + attackReach, 16);
    ctx.fillRect(-38, -47 + bob, 18, 16);
    if (pose === "kick") {
      ctx.fillStyle = f.secondary;
      ctx.fillRect(10, 26 + bob, 52, 16);
      ctx.fillStyle = f.primary;
      ctx.fillRect(56, 24 + bob, 20, 18);
    }
    if (pose === "block") {
      ctx.fillStyle = "rgba(244,196,79,.5)";
      ctx.fillRect(18, -74, 8, 72);
    }
  }
  ctx.restore();

  if (f.stun > 0 && f.down === 0) {
    ctx.fillStyle = "#f4c44f";
    ctx.font = "18px Impact";
    ctx.textAlign = "center";
    ctx.fillText("STUN", p.x, p.y - 92);
  }
}

function drawHud() {
  drawBar(34, 28, 330, 18, player.stamina / 100, healthColor(player.stamina / 100), player.name);
  drawBar(34, 54, 330, 12, player.momentum / 100, "#f4c44f", "");
  drawBar(W - 364, 28, 330, 18, cpu.stamina / 100, healthColor(cpu.stamina / 100), cpu.name);
  drawBar(W - 364, 54, 330, 12, cpu.momentum / 100, "#f4c44f", "");

  if (state.pin) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4c44f";
    ctx.font = "64px Impact";
    ctx.fillText(state.pin.count > 0 ? state.pin.count : "PIN", W / 2, 118);
    if (state.pin.defender.isPlayer) {
      ctx.font = "18px Arial";
      ctx.fillStyle = "#f5ead8";
      ctx.fillText("Tap Space to kick out", W / 2, 145);
    }
  }
}

function healthColor(pct) {
  if (pct <= 0.2) return "#d62f2f";
  if (pct < 0.6) return "#f4c44f";
  return "#46b85a";
}

function drawBar(x, y, w, h, pct, fill, label) {
  ctx.fillStyle = "#070707";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 3, y + 3, (w - 6) * clamp(pct, 0, 1), h - 6);
  ctx.strokeStyle = "#f5ead8";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#f5ead8";
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillText(label, x, y - 5);
}

function drawMessage() {
  ctx.textAlign = "center";
  ctx.fillStyle = "#f5ead8";
  ctx.font = "22px Impact";
  ctx.fillText(state.message, W / 2, H - 32);
}

function drawResult() {
  ctx.fillStyle = "rgba(0,0,0,.7)";
  ctx.fillRect(0, 0, W, H);
  drawTitle(180);
  ctx.textAlign = "center";
  ctx.fillStyle = state.result === "win" ? "#f4c44f" : "#e74846";
  ctx.font = "54px Impact";
  ctx.fillText(state.result === "win" ? "Victory by Pinfall" : "Defeat by Pinfall", W / 2, 300);
  ctx.fillStyle = "#f5ead8";
  ctx.font = "22px Arial";
  ctx.fillText("Press Enter / START for main menu", W / 2, 350);
}

function drawTitle(y) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "76px Impact";
  ctx.fillText("RUMBLE64", W / 2 + 5, y + 5);
  ctx.fillStyle = "#f4c44f";
  ctx.fillText("RUMBLE64", W / 2, y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isMoveLocked(f) {
  return f.actionTime > 0 || f.down > 0 || !!f.moveMotion || [
    "down", "pinned", "rise", "irishWhip", "ddt", "ddtTake", "bodyslam", "bodyslamTake", "powerbomb", "powerbombTake", "suplex", "suplexTake"
  ].includes(f.state);
}

function updateWhipPivot(f) {
  if (!f.whipPivot || f.actionDuration <= 0) return;
  const elapsed = f.actionDuration - f.actionTime;
  if (elapsed >= f.whipPivot.at) {
    f.face = f.whipPivot.face;
    f.whipPivot = null;
  }
}

function ringLimitsForY(y, inset = 0) {
  const depth = clamp((y - ringPlayBounds.back) / (ringPlayBounds.front - ringPlayBounds.back), 0, 1);
  return {
    left: lerp(ringPlayBounds.backLeft, ringPlayBounds.frontLeft, depth) + inset,
    right: lerp(ringPlayBounds.backRight, ringPlayBounds.frontRight, depth) - inset
  };
}

requestAnimationFrame(gameLoop);
